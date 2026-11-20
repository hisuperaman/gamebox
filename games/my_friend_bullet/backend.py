"""Backend for the My Friend Bullet game: play sessions, score verification and leaderboard.

The game itself is built with tux.js (frontend only). tux.js talks to these endpoints
through its http leaderboard adapter: Tux.leaderboard.http('/api/my_friend_bullet').

No login. A player gets a one-time session (with a random seed) when a run starts.
The seed decides the exact enemy spawn schedule, which the client and the server
both generate with the same PRNG (mulberry32, same as Tux.rng.mulberry32). On game
over the client sends its kill log and the server re-computes the score from it,
rejecting anything impossible:

  * a session can only be submitted once, and expires after SESSION_TTL
  * game time can't be longer than the real (wall clock) time the session was open
  * every kill must point at an enemy that exists in the seed's schedule,
    may only be killed once, and only after it actually spawned
  * the score is calculated here - the client's own score is never trusted

Only the TOP_N best scores are kept; everything below is deleted.
"""

import math
import os
import re
import secrets
import sqlite3
import time

from flask import Blueprint, jsonify, request

bp = Blueprint('my_friend_bullet_api', __name__, url_prefix='/api/my_friend_bullet')

# repo root (games/<name>/backend.py -> ../../)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(ROOT_DIR, 'data', 'gamebox.db')

TOP_N = 20
SESSION_TTL = 3 * 60 * 60          # seconds a run can last before it can't be submitted
MAX_OPEN_SESSIONS_PER_IP = 30
MAX_KILLS = 3000
NAME_RE = re.compile(r'^[A-Za-z0-9 _.\-]{1,16}$')

# ---- game rules (must match games/my_friend_bullet/static/js/rules.js) ----
POINTS = {'grunt': 100, 'runner': 150, 'heavy': 300}
HEADSHOT_MULT = 1.5
COMBO_WINDOW = 2.5      # seconds of game time between kills to keep a combo going
COMBO_STEP = 0.25
COMBO_MAX_STEPS = 8
MIN_ALIVE_TIME = 0.25   # enemy can't die sooner than this after spawning
TIME_TOLERANCE = 2.0    # seconds of slack between game time and wall time

UINT32 = 0xFFFFFFFF


def mulberry32(seed):
    a = seed & UINT32

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & UINT32
        t = ((a ^ (a >> 15)) * (1 | a)) & UINT32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & UINT32)) & UINT32) ^ t
        return ((t ^ (t >> 14)) & UINT32) / 4294967296

    return rnd


def build_spawn_schedule(seed, count):
    """Same as nextEnemy() in rules.js, run through Tux.SeededSchedule."""
    rng = mulberry32(seed)
    t = 1.5
    schedule = []
    for i in range(count):
        r_type = rng()
        r_interval = rng()
        rng()  # side - only used by the client
        rng()  # x position - only used by the client

        heavy_chance = min(0.25, 0.04 + i * 0.004)
        runner_chance = min(0.3, 0.1 + i * 0.005)
        if i >= 8 and r_type < heavy_chance:
            enemy_type = 'heavy'
        elif i >= 4 and r_type < heavy_chance + runner_chance:
            enemy_type = 'runner'
        else:
            enemy_type = 'grunt'

        schedule.append({'t': t, 'type': enemy_type})

        interval = max(0.6, 2.4 - i * 0.03) * (0.75 + r_interval * 0.5)
        t += interval
    return schedule


def kill_score(enemy_type, headshot, streak):
    mult = 1 + COMBO_STEP * min(streak, COMBO_MAX_STEPS)
    base = POINTS[enemy_type] * (HEADSHOT_MULT if headshot else 1)
    # round half up like JS Math.round (python's round(262.5) would give 262, JS gives 263)
    return math.floor(base * mult + 0.5)


# ---- db ----

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS bb_sessions (
        id TEXT PRIMARY KEY,
        seed INTEGER NOT NULL,
        ip TEXT,
        created_at REAL NOT NULL
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS bb_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        duration REAL NOT NULL,
        created_at REAL NOT NULL
    )''')
    return db


def top_scores(db):
    rows = db.execute(
        'SELECT name, score, kills, duration, created_at FROM bb_scores '
        'ORDER BY score DESC, created_at ASC LIMIT ?', (TOP_N,)
    ).fetchall()
    return [dict(r) for r in rows]


def client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    return forwarded.split(',')[0].strip() or request.remote_addr or ''


def bad(message, code=400):
    return jsonify({'ok': False, 'error': message}), code


# ---- routes ----

@bp.route('/session', methods=['POST'])
def new_session():
    now = time.time()
    ip = client_ip()
    db = get_db()
    try:
        with db:
            db.execute('DELETE FROM bb_sessions WHERE created_at < ?', (now - SESSION_TTL,))
            open_count = db.execute('SELECT COUNT(*) FROM bb_sessions WHERE ip = ?', (ip,)).fetchone()[0]
            if open_count >= MAX_OPEN_SESSIONS_PER_IP:
                # drop this ip's oldest session instead of blocking the player
                db.execute('DELETE FROM bb_sessions WHERE id = (SELECT id FROM bb_sessions WHERE ip = ? '
                           'ORDER BY created_at ASC LIMIT 1)', (ip,))

            session_id = secrets.token_urlsafe(18)
            seed = secrets.randbelow(2 ** 32)
            db.execute('INSERT INTO bb_sessions (id, seed, ip, created_at) VALUES (?, ?, ?, ?)',
                       (session_id, seed, ip, now))
    finally:
        db.close()
    return jsonify({'ok': True, 'session_id': session_id, 'seed': seed})


@bp.route('/leaderboard', methods=['GET'])
def leaderboard():
    db = get_db()
    try:
        return jsonify({'ok': True, 'leaderboard': top_scores(db)})
    finally:
        db.close()


@bp.route('/score', methods=['POST'])
def submit_score():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return bad('Invalid request')

    session_id = data.get('session_id')
    name = data.get('name')
    duration = data.get('duration')
    kills = data.get('kills')

    if not isinstance(session_id, str) or not isinstance(name, str):
        return bad('Invalid request')
    name = ' '.join(name.split())
    if not NAME_RE.match(name):
        return bad('Name must be 1-16 letters, numbers, spaces or _ . -')
    if not isinstance(duration, (int, float)) or isinstance(duration, bool) or duration < 0:
        return bad('Invalid duration')
    if not isinstance(kills, list) or len(kills) > MAX_KILLS:
        return bad('Invalid kills')

    now = time.time()
    db = get_db()
    try:
        return _verify_and_store(db, now, session_id, name, duration, kills)
    finally:
        db.close()


def _verify_and_store(db, now, session_id, name, duration, kills):
    with db:
        session = db.execute('SELECT seed, created_at FROM bb_sessions WHERE id = ?', (session_id,)).fetchone()
        if session is None:
            return bad('Session not found or already used', 403)
        # one submit per session, whatever the outcome
        db.execute('DELETE FROM bb_sessions WHERE id = ?', (session_id,))

    wall_time = now - session['created_at']
    if wall_time > SESSION_TTL:
        return bad('Session expired', 403)
    if duration > wall_time + TIME_TOLERANCE:
        return bad('Score rejected: run is longer than real time', 403)

    # validate kill log
    parsed = []
    seen = set()
    for k in kills:
        if not isinstance(k, dict):
            return bad('Invalid kill entry')
        enemy_id, t, head = k.get('id'), k.get('t'), k.get('h', False)
        if not isinstance(enemy_id, int) or isinstance(enemy_id, bool) or not 0 <= enemy_id < MAX_KILLS:
            return bad('Invalid kill entry')
        if not isinstance(t, (int, float)) or isinstance(t, bool) or t < 0 or t > duration + 0.001:
            return bad('Score rejected: kill outside run time', 403)
        if enemy_id in seen:
            return bad('Score rejected: enemy killed twice', 403)
        seen.add(enemy_id)
        parsed.append((float(t), enemy_id, bool(head)))

    schedule = build_spawn_schedule(session['seed'], max(seen) + 1 if seen else 0)

    parsed.sort()
    score = 0
    streak = 0
    last_t = None
    for t, enemy_id, head in parsed:
        enemy = schedule[enemy_id]
        if t < enemy['t'] + MIN_ALIVE_TIME:
            return bad('Score rejected: enemy killed before it spawned', 403)
        streak = streak + 1 if last_t is not None and t - last_t <= COMBO_WINDOW else 0
        last_t = t
        score += kill_score(enemy['type'], head, streak)

    if score > 0:
        name_key = name.lower()
        with db:
            existing = db.execute('SELECT score FROM bb_scores WHERE name_key = ?', (name_key,)).fetchone()
            if existing is None:
                db.execute('INSERT INTO bb_scores (name, name_key, score, kills, duration, created_at) '
                           'VALUES (?, ?, ?, ?, ?, ?)', (name, name_key, score, len(parsed), duration, now))
            elif score > existing['score']:
                db.execute('UPDATE bb_scores SET name = ?, score = ?, kills = ?, duration = ?, created_at = ? '
                           'WHERE name_key = ?', (name, score, len(parsed), duration, now, name_key))
            # keep only the top N
            db.execute('DELETE FROM bb_scores WHERE id NOT IN '
                       '(SELECT id FROM bb_scores ORDER BY score DESC, created_at ASC LIMIT ?)', (TOP_N,))

    # where this name stands now (their best run may be an older one)
    scores = top_scores(db)
    rank = best = None
    for i, row in enumerate(scores):
        if row['name'].lower() == name.lower():
            rank, best = i + 1, row['score']
            break

    return jsonify({'ok': True, 'score': score, 'kills': len(parsed), 'rank': rank, 'best': best,
                    'leaderboard': scores})
