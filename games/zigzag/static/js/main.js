document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('myCanvas')
    const ctx = canvas.getContext('2d')

    const canvasSize = {}

    function resizeCanvas(e) {
        const dpr = window.devicePixelRatio || 1

        const width = window.innerWidth
        const height = window.innerHeight

        canvas.width = width * dpr
        canvas.height = height * dpr

        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'

        canvasSize.width = width
        canvasSize.height = height

        ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    window.onload = () => {
        const game = new Game({ ctx, canvasSize, fps: 60 })
        game.start()


        document.addEventListener('click', (e) => {
            if (game.gameover) {
                game.restart()
            }
        })

        document.addEventListener('keydown', (e) => {
            const key = e.key

            if (key === ' ') {
                if (game.gameover) {
                    game.restart()
                }
            }
        })
    }
})