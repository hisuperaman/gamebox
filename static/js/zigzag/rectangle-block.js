class RectangleBlock {
    constructor({ position, width, height }) {
        this.position = position
        this.width = width
        this.height = height
    }

    draw(ctx) {
        ctx.save()

        ctx.fillStyle = 'white'
        ctx.fillRect(this.position.x-1, this.position.y-1, this.width+2, this.height+2)

        ctx.restore()
    }

    has(rect) {
        const rect1 = { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
        const rect2 = { x: rect.position.x , y: rect.position.y, width: rect.width, height: rect.height };

        return isCollision(rect1, rect2);
    }
}