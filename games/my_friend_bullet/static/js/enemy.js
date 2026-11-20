const ENEMY_TYPES = {
    grunt: {
        hp: 1, scale: 1, speed: 150, weapon: 'pistol',
        aimTime: 0.85, cooldown: [1.6, 2.6], burst: 1, bulletSpeed: 520, range: 900,
        look: { body: '#4b4f5c', pants: '#2a2c33', skin: '#d9a77c', eyes: '#000', hat: null, gun: '#9aa0ab' },
    },
    runner: {
        hp: 1, scale: 0.95, speed: 330, weapon: 'knife',
        look: { body: '#c23b3b', pants: '#2a2c33', skin: '#c98b64', eyes: '#fff', hat: '#1a1a1a', gun: '#ccc' },
    },
    heavy: {
        hp: 4, scale: 1.25, speed: 85, weapon: 'rifle',
        aimTime: 1.0, cooldown: [2.2, 3.0], burst: 3, bulletSpeed: 480, range: 1000,
        look: { body: '#3f5a3a', pants: '#252b22', skin: '#b98a62', eyes: '#ffcc00', hat: '#2b3a27', helmet: true, gun: '#7d838f' },
    },
}

class Enemy extends Fighter {
    constructor({ id, type, side, spawnX }) {
        const config = ENEMY_TYPES[type]
        const scale = config.scale

        let position
        if (side === 'left') position = { x: -40 * scale, y: 640 - 66 * scale }
        else if (side === 'right') position = { x: WORLD.width + 10, y: 640 - 66 * scale }
        else position = { x: 80 + spawnX * (WORLD.width - 160), y: -150 }

        super({ position, scale, look: { ...config.look, weapon: config.weapon } })

        this.id = id
        this.type = type
        this.config = config
        this.side = side
        this.hp = config.hp

        this.aliveTime = 0
        this.state = 'enter'
        this.aiming = 0
        this.cooldown = randomRange(0.6, 1.4)
        this.burstLeft = 0
        this.burstTimer = 0
        this.preferredDistance = randomRange(220, 460)
        this.hurtFlash = 0

        this.dead = false
        this.deadTime = 0
        this.spin = 0
        this.rotation = 0

        this.attackCooldown = 0
    }

    // enemies can't be hit right after they spawn, they're still off screen
    get hittable() {
        return !this.dead && this.aliveTime > 0.3
    }

    update(dt, player, level, sounds) {
        const shots = []
        this.aliveTime += dt
        this.hurtFlash = Math.max(0, this.hurtFlash - dt)

        if (this.dead) {
            this.deadTime += dt
            this.rotation += this.spin * dt
            this.spin *= this.onGround ? 0.8 : 1
            if (this.onGround) {
                this.velocity.x *= 0.85
                this.rotation = lerp(this.rotation, Math.round(this.rotation / Math.PI * 2) * Math.PI / 2, 0.15)
            }
            this.applyPhysics(dt, level)
            return shots
        }

        const me = this.center
        const target = player.center
        const dx = target.x - me.x
        const dy = target.y - me.y
        const distance = Math.hypot(dx, dy)

        if (this.state === 'enter') {
            // walk in through the door
            if (this.side === 'left') this.velocity.x = this.config.speed
            else if (this.side === 'right') this.velocity.x = -this.config.speed
            else this.velocity.x = 0

            const inside = this.position.x > 20 && this.position.x + this.width < WORLD.width - 20
            if (inside && (this.side !== 'top' || this.onGround)) {
                this.state = 'fight'
            }
        }
        else if (this.config.weapon === 'knife') {
            this.#runnerAI(dt, dx, dy, level, player, sounds)
        }
        else {
            this.#gunnerAI(dt, dx, dy, distance, player, shots, sounds)
        }

        // aim at the player (slowly, so you can dodge)
        const targetAngle = Math.atan2(target.y - (this.position.y + 27 * this.scale), dx)
        let diff = targetAngle - this.aimAngle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        const turnSpeed = this.aiming > 0 ? 2.2 : 6
        this.aimAngle += clamp(diff, -turnSpeed * dt, turnSpeed * dt)

        this.applyPhysics(dt, level)
        if (this.state !== 'enter') {
            this.position.x = clamp(this.position.x, 0, WORLD.width - this.width)
        }

        return shots
    }

    #gunnerAI(dt, dx, dy, distance, player, shots, sounds) {
        // keep some distance from the player
        const absDx = Math.abs(dx)
        let move = 0
        if (this.aiming <= 0 && this.burstLeft <= 0) {
            if (absDx > this.preferredDistance + 60) move = Math.sign(dx)
            else if (absDx < this.preferredDistance - 60) move = -Math.sign(dx)
        }
        this.velocity.x = lerp(this.velocity.x, move * this.config.speed, clamp(8 * dt, 0, 1))

        // fire burst
        if (this.burstLeft > 0) {
            this.burstTimer -= dt
            if (this.burstTimer <= 0) {
                this.#fire(shots, sounds)
                this.burstLeft--
                this.burstTimer = 0.14
            }
            return
        }

        if (this.aiming > 0) {
            this.aiming -= dt
            if (this.aiming <= 0) {
                this.burstLeft = this.config.burst
                this.burstTimer = 0
                this.cooldown = randomRange(...this.config.cooldown)
            }
            return
        }

        this.cooldown -= dt
        if (this.cooldown <= 0 && distance < this.config.range && !player.dead) {
            this.aiming = this.config.aimTime
        }
    }

    #fire(shots, sounds) {
        const tip = this.gunTip
        const spread = (Math.random() - 0.5) * (this.type === 'heavy' ? 0.12 : 0.05)
        shots.push({ position: { x: tip.x, y: tip.y }, angle: this.aimAngle + spread, speed: this.config.bulletSpeed })
        this.recoil = 1
        sounds.play('enemyShoot', 0.45)
    }

    #runnerAI(dt, dx, dy, level, player, sounds) {
        const dir = Math.sign(dx) || 1
        this.velocity.x = lerp(this.velocity.x, dir * this.config.speed, clamp(6 * dt, 0, 1))

        // chase up/down platforms
        if (this.onGround && dy < -90 && Math.abs(dx) < 260) {
            this.velocity.y = -1000
        }
        if (this.onGround && dy > 90 && this.standingOnPlatform(level)) {
            this.dropDown()
        }

        this.attackCooldown = Math.max(0, this.attackCooldown - dt)
        if (this.attackCooldown <= 0 && isCollision(this.body, player.body) && !player.dead) {
            if (player.hit(1)) {
                player.velocity.x = dir * 500
                player.velocity.y = -350
                sounds.play('hurt')
            }
            this.attackCooldown = 0.8
            this.velocity.x = -dir * 300
        }
    }

    // returns 'head', 'body' or null
    hitTest(x, y) {
        if (!this.hittable) return null
        const head = this.head
        if (pointInCircle(x, y, head.x, head.y, head.radius + 1)) return 'head'
        if (pointInRect(x, y, this.body)) return 'body'
        return null
    }

    damage(part, bulletVelocity) {
        this.hurtFlash = 0.08
        this.hp -= part === 'head' ? 99 : 1
        this.velocity.x += Math.sign(bulletVelocity.x) * 60

        if (this.hp <= 0) {
            this.dead = true
            this.velocity.x = bulletVelocity.x * 0.25
            this.velocity.y = -380 + bulletVelocity.y * 0.15
            this.spin = Math.sign(bulletVelocity.x) * randomRange(6, 10)
            this.aiming = 0
            return true
        }
        return false
    }

    isGone() {
        return this.dead && this.deadTime > 3
    }

    drawLaser(ctx) {
        if (this.dead || this.aiming <= 0) return
        const tip = this.gunTip
        const charge = 1 - this.aiming / this.config.aimTime
        const length = 1600

        ctx.save()
        ctx.strokeStyle = `rgba(255, 40, 40, ${0.15 + charge * 0.6})`
        ctx.lineWidth = 1 + charge * 2
        ctx.setLineDash(charge > 0.75 ? [] : [12, 8])
        ctx.beginPath()
        ctx.moveTo(tip.x, tip.y)
        ctx.lineTo(tip.x + Math.cos(this.aimAngle) * length, tip.y + Math.sin(this.aimAngle) * length)
        ctx.stroke()
        ctx.restore()
    }

    draw(ctx) {
        const alpha = this.dead ? clamp(1 - (this.deadTime - 2) , 0, 1) : 1

        ctx.save()
        if (this.dead) {
            const c = this.center
            ctx.translate(c.x, c.y)
            ctx.rotate(this.rotation)
            ctx.translate(-c.x, -c.y)
        }
        this.drawFigure(ctx, { alpha, flash: this.hurtFlash > 0 })
        ctx.restore()

        // heavy health pips
        if (!this.dead && this.config.hp > 1) {
            for (let i = 0; i < this.config.hp; i++) {
                ctx.fillStyle = i < this.hp ? '#ff5a5a' : 'rgba(255,255,255,0.2)'
                ctx.fillRect(this.position.x + i * 9 - 1, this.position.y - 10, 7, 4)
            }
        }
    }
}