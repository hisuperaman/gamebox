class Level {
    constructor() {
        this.groundY = 640

        // one way platforms: you can jump up through them and stand on top
        this.platforms = [
            { x: 90, y: 480, width: 300, height: 16 },
            { x: 890, y: 480, width: 300, height: 16 },
            { x: 465, y: 335, width: 350, height: 16 },
            { x: 0, y: 220, width: 220, height: 16 },
            { x: 1060, y: 220, width: 220, height: 16 },
        ]

        // scenery reaches this far past the arena for wide screens (fit: 'extend')
        this.sceneryMargin = 640
        this.skyline = this.#buildSkyline()
        this.time = 0
    }

    update(dt) {
        this.time += dt
    }

    #buildSkyline() {
        const layers = []
        const colors = ['#1b1430', '#251a3d', '#2f2049']
        for (let l = 0; l < 3; l++) {
            const buildings = []
            let x = -this.sceneryMargin
            while (x < WORLD.width + this.sceneryMargin) {
                const width = getRandomInt(50, 130)
                const height = getRandomInt(120, 380) - l * 70
                const windows = []
                for (let wy = 12; wy < height - 20; wy += 22) {
                    for (let wx = 10; wx < width - 12; wx += 18) {
                        if (Math.random() < 0.35) {
                            windows.push({ x: wx, y: wy, flicker: Math.random() * 10 })
                        }
                    }
                }
                buildings.push({ x, width, height, windows })
                x += width + getRandomInt(4, 20)
            }
            layers.push({ color: colors[l], buildings, windowAlpha: 0.15 + l * 0.12 })
        }
        return layers
    }

    // view: the visible area in world units, can reach past the arena on each side
    drawBackground(ctx, view) {
        // sky
        const sky = ctx.createLinearGradient(0, 0, 0, this.groundY)
        sky.addColorStop(0, '#0b0717')
        sky.addColorStop(0.6, '#3a1a4a')
        sky.addColorStop(1, '#ff6a4a')
        ctx.fillStyle = sky
        ctx.fillRect(view.x, view.y, view.width, view.height)

        // moon
        ctx.save()
        ctx.fillStyle = '#ffe9c4'
        ctx.shadowColor = '#ffb88a'
        ctx.shadowBlur = 40
        ctx.beginPath()
        ctx.arc(1010, 120, 46, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // city
        this.skyline.forEach((layer) => {
            ctx.fillStyle = layer.color
            layer.buildings.forEach((b) => {
                const top = this.groundY - b.height
                ctx.fillRect(b.x, top, b.width, b.height)

                b.windows.forEach((w) => {
                    const on = Math.sin(this.time * 0.5 + w.flicker) > -0.8
                    if (!on) return
                    ctx.fillStyle = `rgba(255, 210, 120, ${layer.windowAlpha})`
                    ctx.fillRect(b.x + w.x, top + w.y, 8, 10)
                })
                ctx.fillStyle = layer.color
            })
        })

        // warehouse back wall frame
        ctx.fillStyle = 'rgba(10, 8, 20, 0.55)'
        ctx.fillRect(view.x, view.y, view.width, 40 - view.y)
        for (let x = Math.floor(view.x / 160) * 160; x < view.x + view.width; x += 160) {
            ctx.fillRect(x, 0, 14, this.groundY)
        }
    }

    drawForeground(ctx, view) {
        // platforms
        this.platforms.forEach((p) => {
            ctx.fillStyle = '#121019'
            ctx.fillRect(p.x, p.y, p.width, p.height)
            ctx.fillStyle = '#e0a040'
            ctx.fillRect(p.x, p.y, p.width, 3)

            // hazard stripes underneath
            ctx.save()
            ctx.beginPath()
            ctx.rect(p.x, p.y + 6, p.width, p.height - 6)
            ctx.clip()
            ctx.fillStyle = '#2a2433'
            for (let x = p.x - 20; x < p.x + p.width; x += 20) {
                ctx.beginPath()
                ctx.moveTo(x, p.y + p.height)
                ctx.lineTo(x + 10, p.y + 6)
                ctx.lineTo(x + 18, p.y + 6)
                ctx.lineTo(x + 8, p.y + p.height)
                ctx.fill()
            }
            ctx.restore()

            // supports
            ctx.fillStyle = '#121019'
            if (p.x > 0) ctx.fillRect(p.x + 20, p.y + p.height, 8, 30)
            if (p.x + p.width < WORLD.width) ctx.fillRect(p.x + p.width - 28, p.y + p.height, 8, 30)
        })

        // floor
        const floorBottom = view.y + view.height
        ctx.fillStyle = '#0d0b12'
        ctx.fillRect(view.x, this.groundY, view.width, floorBottom - this.groundY)
        ctx.fillStyle = '#e0a040'
        ctx.fillRect(view.x, this.groundY, view.width, 3)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        for (let x = Math.floor(view.x / 64) * 64; x < view.x + view.width; x += 64) {
            ctx.fillRect(x, this.groundY + 3, 2, floorBottom - this.groundY)
        }

        // side doors where enemies come in
        ;[0, WORLD.width - 18].forEach((x) => {
            ctx.fillStyle = '#05040a'
            ctx.fillRect(x, this.groundY - 110, 18, 110)
            ctx.fillStyle = 'rgba(255, 60, 60, 0.6)'
            ctx.fillRect(x, this.groundY - 118, 18, 6)
        })
    }
}