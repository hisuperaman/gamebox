// Android-only glue, added to www/ by build-www.mjs (the website never loads this).
// Uses the hooks main.js exposes on window.myFriendBullet.
(function () {
    const cap = window.Capacitor
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return
    // the app already runs fullscreen, so tux.js's fullscreen toggle (touch dock) is pointless here,
    // and the menu's keyboard/mouse help (A/D, Mouse, Shift...) means nothing on a phone
    const style = document.createElement('style')
    style.textContent = '#tux-btn-fullscreen, .tux-help { display: none !important; }'
    document.head.appendChild(style)

    const App = cap.Plugins && cap.Plugins.App
    if (!App) return

    // back button: leaderboard -> menu, playing -> pause, paused -> resume, menu / game over -> leave the app
    App.addListener('backButton', () => {
        const mfb = window.myFriendBullet
        if (!mfb) return App.exitApp()
        const { game, arcade } = mfb

        if (arcade.screens.current === 'board') arcade.screens.show('menu')
        else if (game.state === 'playing') game.pause()
        else if (game.state === 'paused') game.resume()
        else if (game.state === 'dying') return
        else App.exitApp()
    })

    // leaving the app (home button, phone call...) pauses the run
    App.addListener('pause', () => {
        const mfb = window.myFriendBullet
        if (mfb && mfb.game.state === 'playing') mfb.game.pause()
    })
})()
