// wires My Friend Bullet into the tux.js arcade shell (menus, leaderboard, touch, branding)
document.addEventListener('DOMContentLoaded', () => {

    const sounds = new Tux.SoundBank({
        basePath: document.body.dataset.sfxPath,
        sounds: {
            shoot: 'sfx_shoot.mp3',
            enemyShoot: 'sfx_enemy_shoot.mp3',
            reload: 'sfx_reload.mp3',
            hit: 'sfx_hit.mp3',
            kill: 'sfx_kill.mp3',
            hurt: 'sfx_hurt.mp3',
            slowmo: 'sfx_slowmo.mp3',
        },
        music: 'bgm.mp3',
        muteKey: 'my-friend-bullet-muted',
    })

    const game = new MyFriendBullet({ sounds })

    // phones: fixed move stick, floating aim stick on the right half, slow-mo toggle, reload
    const touch = new Tux.TouchControls({ input: game.input })
    touch.addMoveStick()
    touch.addAimStick({ hint: 'Move your thumb here<br>to aim &amp; shoot' })
    touch.addButton({
        id: 'slowmo', icon: 'hourglass', label: 'Slow motion',
        type: 'toggle', action: 'slowmo', ring: true, // tap on / tap off, ring = focus left
        position: { right: 150, bottom: 110 },
    })
    touch.addButton({
        id: 'reload', icon: 'rotate-ccw', label: 'Reload',
        action: 'reload', ring: true, // ring = ammo left / reload progress
        position: { right: 60, bottom: 200 },
    })
    game.touch = touch

    // website: verified global leaderboard on our flask server (index.html sets the url).
    // android app (built with no server url): fully offline - no leaderboard, no name, just score + high score.
    const apiBase = document.body.dataset.apiBase
    const offline = !apiBase

    const arcade = new Tux.Arcade({
        game,
        id: 'my_friend_bullet',
        storagePrefix: 'my-friend-bullet',
        // our own flask endpoints (backend.py) re-check every score
        leaderboard: offline ? false : withTimeouts(Tux.leaderboard.http(apiBase)),
        title: 'My Friend <span>Bullet</span>',
        tagline: 'Slow down time. Dance through the bullets. Survive.',
        help: [
            ['A / D', 'move'],
            ['W / Space', 'jump (x2)'],
            ['S', 'drop down · fast fall'],
            ['Mouse', 'aim & shoot'],
            ['Shift / Right click', 'slow-mo'],
            ['R', 'reload · P pause'],
        ],
        note: 'Headshots & quick kill streaks score more. Kills refill focus.',
        sounds,
        touch,
        payload: (result) => ({ duration: result.duration, kills: result.kills }),
        stats: (result) => `${result.kills.length} kills · survived ${formatTime(result.duration)} · best ${game.highscore.toLocaleString()}`,
        detail: (row) => `${row.kills} kills · ${formatTime(row.duration)}`,
    })

    if (offline) {
        // no leaderboard means no use for a name: hide the box and start straight away.
        // tux.js still wants a valid name internally, so give it a fixed one.
        arcade.nameInput.value = 'Player'
        document.querySelectorAll('label[for="tux-name"], #tux-name, .tux-error-text').forEach((el) => { el.hidden = true; el.style.display = 'none' })
    }

    // hooks for app wrappers (the android build's back button uses these); harmless on the web
    window.myFriendBullet = { game, arcade }
})

// Don't keep players staring at a disabled Play button when the leaderboard server is slow or
// unreachable (no signal on a phone, server down): give up after a few seconds and play offline.
// tux.js already treats a failed startRun as "offline - score not submitted".
function withTimeouts(adapter, { start = 4000, top = 8000, submit = 15000 } = {}) {
    const limit = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Leaderboard server not reachable')), ms)),
    ])
    return {
        ...adapter,
        startRun: (...args) => limit(adapter.startRun(...args), start),
        top: (...args) => limit(adapter.top(...args), top),
        submit: (...args) => limit(adapter.submit(...args), submit),
    }
}
