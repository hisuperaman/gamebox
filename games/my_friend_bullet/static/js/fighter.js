// player + enemies: tux.js Body physics (gravity, one-way platforms) + the stick figure drawing
class Fighter extends Tux.Body {
    constructor({ position, scale = 1, look }) {
        super({ position, width: 28 * scale, height: 66 * scale, gravity: 2200, maxFall: 1400 })
        this.scale = scale

        this.facing = 1
        this.aimAngle = 0
        this.runPhase = 0
        this.recoil = 0

        this.look = look
    }

    get head() {
        return {
            x: this.position.x + this.width / 2,
            y: this.position.y + 11 * this.scale,
            radius: 11 * this.scale,
        }
    }

    get body() {
        return {
            x: this.position.x,
            y: this.position.y + 20 * this.scale,
            width: this.width,
            height: this.height - 20 * this.scale,
        }
    }

    get gunTip() {
        const shoulder = this.#shoulder()
        const length = 34 * this.scale
        return {
            x: shoulder.x + Math.cos(this.aimAngle) * length,
            y: shoulder.y + Math.sin(this.aimAngle) * length,
        }
    }

    #shoulder() {
        return { x: this.position.x + this.width / 2, y: this.position.y + 27 * this.scale }
    }

    applyPhysics(dt, level) {
        super.applyPhysics(dt, level)

        // run cycle
        if (this.onGround && Math.abs(this.velocity.x) > 10) {
            this.runPhase += dt * Math.abs(this.velocity.x) * 0.045
        }
        else if (this.onGround) {
            this.runPhase = lerp(this.runPhase, Math.round(this.runPhase / Math.PI) * Math.PI, 0.2)
        }

        this.recoil = Math.max(0, this.recoil - dt * 8)
    }

    drawFigure(ctx, { alpha = 1, flash = false } = {}) {
        const s = this.scale
        const look = this.look
        const feet = this.feet

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(feet.x, feet.y)

        const facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1
        this.facing = facing

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const hipY = -30 * s
        const shoulderY = -39 * s

        // legs
        const swing = this.onGround ? Math.sin(this.runPhase) * 0.7 : 0.5
        const drawLeg = (phase, color) => {
            const thigh = phase
            const knee = { x: Math.sin(thigh) * 15 * s, y: hipY + Math.cos(thigh) * 15 * s }
            const shin = thigh - (this.onGround ? Math.max(0, Math.sin(this.runPhase + (phase > 0 ? 0 : Math.PI))) * 0.9 : 0.9) * facing
            const foot = { x: knee.x + Math.sin(shin) * 15 * s, y: knee.y + Math.cos(shin) * 15 * s }

            ctx.strokeStyle = color
            ctx.lineWidth = 7 * s
            ctx.beginPath()
            ctx.moveTo(0, hipY)
            ctx.lineTo(knee.x, knee.y)
            ctx.lineTo(foot.x, foot.y)
            ctx.stroke()

            ctx.fillStyle = '#111'
            ctx.fillRect(foot.x - 3 * s + facing * 2 * s, foot.y - 3 * s, 9 * s * (facing > 0 ? 1 : 1), 4 * s)
        }
        drawLeg(-swing * facing, look.pantsDark || look.pants)
        drawLeg(swing * facing, look.pants)

        // torso
        ctx.fillStyle = flash ? 'white' : look.body
        ctx.beginPath()
        ctx.roundRect(-9 * s, shoulderY - 6 * s, 18 * s, 22 * s, 5 * s)
        ctx.fill()

        // head
        const headY = -55 * s
        ctx.fillStyle = flash ? 'white' : look.skin
        ctx.beginPath()
        ctx.arc(0, headY, 10 * s, 0, Math.PI * 2)
        ctx.fill()

        if (look.hat) {
            ctx.fillStyle = look.hat
            ctx.beginPath()
            ctx.arc(0, headY - 1 * s, 10.5 * s, Math.PI, Math.PI * 2)
            ctx.fill()
            if (look.helmet) {
                ctx.fillRect(-12 * s, headY - 2 * s, 24 * s, 3 * s)
            }
        }
        if (look.band) {
            ctx.fillStyle = look.band
            ctx.fillRect(-10 * s, headY - 5 * s, 20 * s, 4 * s)
            // band tails flowing behind
            ctx.strokeStyle = look.band
            ctx.lineWidth = 3 * s
            const wave = Math.sin(this.runPhase * 1.3) * 3 * s
            ctx.beginPath()
            ctx.moveTo(-facing * 9 * s, headY - 3 * s)
            ctx.quadraticCurveTo(-facing * 18 * s, headY - 6 * s + wave, -facing * 26 * s, headY + wave)
            ctx.stroke()
        }
        if (look.eyes) {
            ctx.fillStyle = look.eyes
            ctx.fillRect(facing > 0 ? 1 * s : -9 * s, headY - 1 * s, 8 * s, 3 * s)
        }

        // arm + gun pointing at aim
        const shoulder = { x: 0, y: shoulderY }
        const recoilBack = this.recoil * 5 * s
        const armLength = 18 * s - recoilBack
        const hand = {
            x: shoulder.x + Math.cos(this.aimAngle) * armLength,
            y: shoulder.y + Math.sin(this.aimAngle) * armLength,
        }

        ctx.strokeStyle = flash ? 'white' : look.body
        ctx.lineWidth = 6 * s
        ctx.beginPath()
        ctx.moveTo(shoulder.x, shoulder.y)
        ctx.lineTo(hand.x, hand.y)
        ctx.stroke()

        if (look.weapon !== 'knife') {
            ctx.save()
            ctx.translate(hand.x, hand.y)
            ctx.rotate(this.aimAngle - this.recoil * 0.4 * facing)
            ctx.fillStyle = look.gun || '#222'
            const gunLength = (look.weapon === 'rifle' ? 26 : 16) * s
            ctx.fillRect(0, -3 * s, gunLength, 5 * s)
            ctx.fillRect(1 * s, 0, 5 * s, 8 * s * (facing > 0 ? 1 : -1))
            ctx.restore()
        }
        else {
            // knife: held tilted up (so it never reads as a gun barrel), slashes down right after a hit
            const slash = clamp(((this.attackCooldown || 0) - 0.55) / 0.25, 0, 1)
            ctx.save()
            ctx.translate(hand.x, hand.y)
            ctx.rotate(this.aimAngle - facing * (0.8 - slash * 1.8))
            ctx.scale(s, s * facing) // local units, edge always on the bottom
            // handle + guard
            ctx.fillStyle = '#3b2a20'
            ctx.beginPath()
            ctx.roundRect(-8, -2.5, 11, 5, 1.5)
            ctx.fill()
            ctx.fillStyle = '#8a8f99'
            ctx.fillRect(2.5, -5, 2.5, 10)
            // blade: straight spine on top, curved edge up to the point
            ctx.fillStyle = flash ? 'white' : '#d9dee6'
            ctx.beginPath()
            ctx.moveTo(5, -2.8)
            ctx.lineTo(19, -2.8)
            ctx.lineTo(26, -1.2)
            ctx.quadraticCurveTo(18, 4.2, 5, 2.8)
            ctx.closePath()
            ctx.fill()
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(7, 1.8)
            ctx.quadraticCurveTo(17, 2.6, 23.5, -0.6)
            ctx.stroke()
            ctx.strokeStyle = '#8f97a3'
            ctx.beginPath()
            ctx.moveTo(6, -1.4)
            ctx.lineTo(18, -1.4)
            ctx.stroke()
            ctx.restore()
        }

        ctx.fillStyle = flash ? 'white' : look.skin
        ctx.beginPath()
        ctx.arc(hand.x, hand.y, 3.5 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }
}