class Track {
    constructor({ canvasSize }) {
        this.shortSide = 100
        this.longSide = 300

        this.rectangles = []



        this.left = 0
        this.top = 0

        this.index = 0

        this.initialMaxRectangles = 10

        while (this.index < this.initialMaxRectangles) {
            this.#addRectangle()
        }

        this.canvasSize = canvasSize

        this.lastRectangle = null
    }

    update(player) {
        for (let i = 0; i < this.rectangles.length; i++) {
            const rectangle = this.rectangles[i]

            if (rectangle.has(player)) {
                if (i > this.rectangles.length / 3) {
                    this.#removeRectangle()
                    this.#addRectangle()
                    return
                }
            }
        }
    }

    draw(ctx) {
        this.rectangles.forEach((path) => {
            path.draw(ctx)
        })
    }

    #addRectangle() {
        let rectangle

        const randNum = getRandomInt(-100, 50, 10)
        this.shortSide = 100
        this.longSide = 300 + randNum

        if (this.index % 2 == 0) {
            const [width, height] = [this.longSide, this.shortSide]
            rectangle = new RectangleBlock({
                position: { x: this.left, y: this.top },
                width: width,
                height: height
            })
            this.left += width - this.shortSide
        }
        else {
            const [width, height] = [this.shortSide, this.longSide]
            rectangle = new RectangleBlock({
                position: { x: this.left, y: this.top },
                width: width,
                height: height
            })
            this.top += height - this.shortSide
        }
        this.rectangles.push(rectangle)

        this.index = (this.index + 1) % (this.initialMaxRectangles + 2)
    }

    #generateRectangles(n) {
        while (this.index < n) {
            this.#addRectangle()
        }
    }

    #removeRectangle() {
        this.rectangles.shift()
    }
}