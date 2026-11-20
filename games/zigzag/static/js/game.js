class Game {
    constructor({ ctx, canvasSize, fps }) {
        this.ctx = ctx
        this.canvasSize = canvasSize

        this.targetFrameTime = Math.floor(1000 / fps);
        this.lastPaintTime = 0;

        this.controls = new Controls()

        this.gameover = false

        this.track = new Track({ canvasSize })

        this.player = new Player({
            position: { x: 25, y: 50 }
        })

        this.score = 0
        this.showScoreDuration = 500
        this.lastShowScore = 0

        this.speedIncreaseScoreRate = 20

        this.highscore = localStorage.getItem('zig-zag-highscore') ? parseInt(localStorage.getItem('zig-zag-highscore')) : 0
    }


    restart() {
        this.gameover = false

        this.track = new Track({ canvasSize: this.canvasSize })
        this.score = 0
        this.highscore = localStorage.getItem('zig-zag-highscore') ? parseInt(localStorage.getItem('zig-zag-highscore')) : 0
        this.player = new Player({
            position: { x: 25, y: 50 }
        })


        this.start()
    }

    start() {
        console.log('Started')
        this.animationId = requestAnimationFrame(this.#gameLoop);
    }

    #gameLoop = (timestamp) => {
        if (this.gameover) {
            cancelAnimationFrame(this.animationId)
            return
        }
        this.animationId = requestAnimationFrame(this.#gameLoop)

        if ((timestamp - this.lastPaintTime) < this.targetFrameTime) {
            return;
        }

        this.gameEngine(timestamp);
        this.lastPaintTime = timestamp;
    }

    gameEngine(timestamp) {
        // update
        this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height)
        this.player.update(this.track, timestamp)
        this.track.update(this.player)


        this.#updateScore()


        // draw
        this.ctx.save()
        this.ctx.translate(this.canvasSize.width / 2, this.canvasSize.height - 200)
        this.ctx.rotate(-3 * Math.PI / 4)

        this.ctx.translate(-this.player.position.x, -this.player.position.y)
        this.track.draw(this.ctx)
        this.player.draw(this.ctx)

        this.ctx.restore()

        if (this.score % this.speedIncreaseScoreRate == 0) {
            this.lastShowScore = timestamp
        }

        if ((timestamp - this.lastShowScore) < this.showScoreDuration) {
            if (!this.player.crashed) {
                this.#drawScore()
            }
        }


        if (this.player.crashed) {
            this.#drawGameOver()

            const localHighscore = localStorage.getItem('zig-zag-highscore') ? parseInt(localStorage.getItem('zig-zag-highscore')) : 0
            if (this.highscore > localHighscore) {
                localStorage.setItem('zig-zag-highscore', this.highscore)
            }

            this.gameover = true
        }
    }

    #updateScore() {
        let currentRectangle = null
        for (let i = 0; i < this.track.rectangles.length; i++) {
            const rectangle = this.track.rectangles[i]

            if (rectangle.has(this.player)) {
                if (this.track.lastRectangle != rectangle) {
                    currentRectangle = rectangle
                    break
                }

            }
        }

        if (currentRectangle && currentRectangle !== this.lastRectangle) {
            if (!this.lastRectangle || !this.lastRectangle.has(this.player)) {
                this.score++;

                if (this.score > this.highscore) {
                    this.highscore = this.score
                }

                if (this.score % this.speedIncreaseScoreRate == 0) {
                    if (this.player.speed < this.player.maxSpeed) {
                        this.player.speed += 1
                    }
                }

                this.lastRectangle = currentRectangle;
            }
        }
    }

    #drawScore() {
        this.ctx.save();

        const x = this.canvasSize.width / 2;
        const y = this.canvasSize.height / 2;
        const fontSize = 120;

        this.ctx.fillStyle = "blue";
        this.ctx.globalAlpha = 0.5;
        this.ctx.font = `${fontSize}px Arial`;

        const text = this.score.toString();
        const textWidth = this.ctx.measureText(text).width;

        this.ctx.fillText(text, x - textWidth / 2, y);

        this.ctx.restore();
    }
    #drawGameOver() {
        this.ctx.save();
        this.ctx.fillStyle = "red";
        this.ctx.font = "60px Arial";
        this.ctx.textAlign = "center";

        const centerX = this.canvasSize.width / 2;
        const centerY = this.canvasSize.height / 2;

        this.#drawTextWithBackground(this.ctx, "Game Over", centerX, centerY, {
            font: "60px Arial",
            bgColor: "red",
            textColor: "white",
            padding: 10
        });

        this.ctx.fillStyle = "";
        this.ctx.font = "40px Arial";

        this.#drawTextWithBackground(this.ctx, `Score: ${this.score}`, centerX, centerY + 70, {
            font: "25px Arial",
            bgColor: "white",
            textColor: "black",
            padding: 10
        });
        this.#drawTextWithBackground(this.ctx, `HighScore: ${this.highscore}`, centerX, centerY + 80 + 40, {
            font: "25px Arial",
            bgColor: "white",
            textColor: "black",
            padding: 10
        });

        this.ctx.restore();
    }

    #drawTextWithBackground(ctx, text, x, y, options = {}) {
        ctx.save();

        ctx.font = options.font || "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const padding = options.padding || 10;
        const textMetrics = ctx.measureText(text);
        const width = textMetrics.width + padding * 2;
        const height = parseInt(ctx.font) + padding * 2;

        ctx.fillStyle = options.bgColor || "black";
        ctx.fillRect(x - width / 2, y - height / 2, width, height);

        ctx.fillStyle = options.textColor || "white";
        ctx.fillText(text, x, y);

        ctx.restore();
    }




    playSFX(audio) {
        const sfx = audio.cloneNode();
        sfx.play();
    }
}