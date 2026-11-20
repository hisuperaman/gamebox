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

    // phones: fixed move stick, floating aim stick on the right half, slow-mo toggle
    const touch = new Tux.TouchControls({ input: game.input })
    touch.addMoveStick()
    touch.addAimStick({ hint: 'Move your thumb here<br>to aim &amp; shoot' })
    touch.addButton({
        id: 'slowmo', icon: 'hourglass', label: 'Slow motion',
        type: 'toggle', action: 'slowmo', ring: true, // tap on / tap off, ring = focus left
        position: { right: 150, bottom: 110 },
    })
    game.touch = touch

    new Tux.Arcade({
        game,
        id: 'my_friend_bullet',
        storagePrefix: 'my-friend-bullet',
        // our own flask endpoints (backend.py) re-check every score
        leaderboard: Tux.leaderboard.http('/api/my_friend_bullet'),
        title: 'My Friend <span>Bullet</span>',
        tagline: 'Slow down time. Dance through the bullets. Survive.',
        help: [
            ['A / D', 'move'],
            ['W / Space', 'jump (x2)'],
            ['S', 'drop down'],
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
})