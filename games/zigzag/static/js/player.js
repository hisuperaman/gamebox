class Player {
    constructor({ position }) {
        this.position = position

        this.width = 25
        this.height = 25

        this.direction = -1

        this.speed = 3
        this.maxSpeed = 12

        this.controls = new Controls()

        this.crashed = false

        this.trail = []

        this.trailParticleRate = 200
        this.lastParticleTime = 0
    }

    update(track, timestamp) {
        this.#handleCollision(track)

        this.trail.forEach((particle, index) => {
            particle.update()
        })
        this.trail = this.trail.filter(p => !p.isDead());


        if (this.direction == 1) {
            this.position.y += this.speed
        }
        else {
            this.position.x += this.speed
        }

        if (this.controls.consumeAction()) {
            this.direction = this.direction == 1 ? -1 : 1
        }

        const delta = timestamp - this.lastParticleTime
        if (delta >= this.trailParticleRate) {
            for (let i = 0; i < 5; i++) {
                const x = this.position.x + this.width / 2;
                const y = this.position.y + this.height/2 // tail position

                const particle = new Particle({
                    position: { x, y }
                })
                this.trail.push(particle)
            }

            this.lastParticleTime = timestamp
        }
    }

    draw(ctx) {
        ctx.save()
        ctx.fillStyle = 'black'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        ctx.restore()

        this.trail.forEach((particle) => {
            particle.draw(ctx)
        })
    }

    #handleCollision(track) {
        const fullyInsideAny = track.rectangles.some(rectangle => this.#isFullyInside(rectangle));
        if (!fullyInsideAny) {
            this.crashed = true
        }
    }

    #isFullyInside(rect) {
        const playerLeft = this.position.x;
        const playerRight = this.position.x + this.width;
        const playerTop = this.position.y;
        const playerBottom = this.position.y + this.height;

        const rectLeft = rect.position.x;
        const rectRight = rect.position.x + rect.width;
        const rectTop = rect.position.y;
        const rectBottom = rect.position.y + rect.height;

        return (
            playerLeft >= rectLeft &&
            playerRight <= rectRight &&
            playerTop >= rectTop &&
            playerBottom <= rectBottom
        );
    }

}