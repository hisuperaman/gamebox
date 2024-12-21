document.addEventListener('DOMContentLoaded', (e) => {

    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');

    const canvasSize = {};

    const TARGET_FPS = 60;

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;

        const width = 64 * 16;
        const height = 64 * 9;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // canvas.style.width = width + 'px';
        // canvas.style.height = height + 'px';
        

        canvasSize['width'] = width;
        canvasSize['height'] = height;

        ctx.scale(dpr, dpr)
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const game = new Game(ctx, canvasSize, TARGET_FPS);
    window.onload = () => {
        document.getElementById('loadingScreen').style.display = 'none';
        // document.getElementById('mainContent').style.display = 'block';
        game.start()
    }

});