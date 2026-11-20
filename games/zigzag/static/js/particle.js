class Particle {
    constructor({ position }) {
        this.position = position
        this.radius = Math.random() * 2 + 3;
        this.alpha = 1;

        this.alphaReduceRate = 0.02

        const angle = Math.random() * Math.PI * 2;
        this.speed = {
            x: Math.cos(angle) * 1,
            y: Math.sin(angle) * 1,
        };
    }

    update() {
        this.alpha -= this.alphaReduceRate;

        this.position.x += this.speed.x;
        this.position.y += this.speed.y;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}
