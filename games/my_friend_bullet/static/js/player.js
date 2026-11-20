class Player extends Fighter {
    constructor({ position }) {
        super({
            position,
            look: {
                body: '#1fb5a6',
                pants: '#1d1f2b',
                pantsDark: '#14151d',
                skin: '#f1c9a0',
                band: '#ff3b5c',
                eyes: '#111',
                gun: '#d6d9e0',
            },
        })

        this.maxHp = 5
        this.hp = this.maxHp
        this.invulnerable = 0
        this.hurtFlash = 0

        this.moveSpeed = 390
        this.jumpVelocity = 830
        this.maxJumps = 2
        this.jumpsLeft = this.maxJumps
        this.normalMaxFall = this.maxFall
        this.fastFallSpeed = 2300
        this.fastFallAccel = 4200

        this.magazineSize = 14
        this.ammo = this.magazineSize
        this.reloadTime = 1.0
        this.reloading = 0
        this.fireRate = 0.12
        this.fireCooldown = 0

        this.dead = false
        this.flips = 0 // spin on double jump
    }

    // dt here is the player's own (less slowed) time
    update(dt, input, level, aimPoint, sounds) {
        const shots = []

        if (this.dead) {
            this.velocity.x *= 0.95
            this.applyPhysics(dt, level)
            return shots
        }

        // aim
        const shoulderX = this.position.x + this.width / 2
        const shoulderY = this.position.y + 27
        this.aimAngle = Math.atan2(aimPoint.y - shoulderY, aimPoint.x - shoulderX)

        // move
        let direction = 0
        if (input.isDown('left')) direction -= 1
        if (input.isDown('right')) direction += 1
        const targetSpeed = direction * this.moveSpeed
        const accel = this.onGround ? 14 : 7
        this.velocity.x = lerp(this.velocity.x, targetSpeed, clamp(accel * dt, 0, 1))

        if (this.onGround) {
            this.jumpsLeft = this.maxJumps
            this.flips = 0
        }

        // a press always jumps; holding jump also jumps on landing and air-jumps at the top of the arc
        const jumpPressed = input.consume('jump')
        const jumpHeld = input.isDown('jump') && (this.onGround || this.velocity.y >= 0)
        if ((jumpPressed || jumpHeld) && this.jumpsLeft > 0) {
            if (!this.onGround && this.jumpsLeft === this.maxJumps) {
                // walked off a ledge, only the air jump is left
                this.jumpsLeft--
            }
            this.velocity.y = -this.jumpVelocity * (this.jumpsLeft === this.maxJumps ? 1 : 0.9)
            if (this.jumpsLeft < this.maxJumps) {
                this.flips = Math.PI * 2 * (this.velocity.x >= 0 ? 1 : -1)
            }
            this.jumpsLeft--
            this.onGround = false
        }

        if (input.isDown('down') && this.standingOnPlatform(level)) {
            this.dropDown()
        }

        // fast fall: holding down in the air cancels the rise and pulls you to the ground quicker
        const fastFalling = input.isDown('down') && !this.onGround
        this.maxFall = fastFalling ? this.fastFallSpeed : this.normalMaxFall
        if (fastFalling) {
            this.velocity.y = Math.max(this.velocity.y, 0) + this.fastFallAccel * dt
        }

        this.applyPhysics(dt, level)
        this.clampX(0, WORLD.width)

        if (this.flips !== 0) {
            const step = Math.sign(this.flips) * Math.min(Math.abs(this.flips), dt * 14)
            this.flips -= step
        }

        // timers
        this.invulnerable = Math.max(0, this.invulnerable - dt)
        this.hurtFlash = Math.max(0, this.hurtFlash - dt)
        this.fireCooldown = Math.max(0, this.fireCooldown - dt)

        // weapon
        if (this.reloading > 0) {
            this.reloading -= dt
            if (this.reloading <= 0) {
                this.reloading = 0
                this.ammo = this.magazineSize
            }
        }
        else if (input.consume('reload') && this.ammo < this.magazineSize) {
            this.#startReload(sounds)
        }

        // a press is one shot (touch taps / releases, quick clicks), holding is automatic fire
        const shootPressed = input.consume('shoot')
        if ((shootPressed || input.isDown('shoot')) && this.reloading <= 0 && this.fireCooldown <= 0) {
            if (this.ammo > 0) {
                this.ammo--
                this.fireCooldown = this.fireRate
                this.recoil = 1

                const tip = this.gunTip
                const spread = (Math.random() - 0.5) * 0.03
                shots.push({ position: { x: tip.x, y: tip.y }, angle: this.aimAngle + spread })

                if (this.ammo === 0) {
                    this.#startReload(sounds)
                }
            }
        }

        return shots
    }

    #startReload(sounds) {
        this.reloading = this.reloadTime
        sounds.play('reload')
    }

    hit(damage) {
        if (this.invulnerable > 0 || this.dead) return false

        this.hp -= damage
        this.invulnerable = 0.9
        this.hurtFlash = 0.15

        if (this.hp <= 0) {
            this.hp = 0
            this.dead = true
            this.velocity.y = -500
        }
        return true
    }

    draw(ctx) {
        ctx.save()

        // spin when double jumping
        if (this.flips !== 0) {
            const c = this.center
            ctx.translate(c.x, c.y)
            ctx.rotate(this.flips)
            ctx.translate(-c.x, -c.y)
        }
        if (this.dead) {
            const c = this.center
            ctx.translate(c.x, c.y + 20)
            ctx.rotate(Math.PI / 2 * -this.facing)
            ctx.translate(-c.x, -c.y - 20)
        }

        const blink = this.invulnerable > 0 && Math.floor(this.invulnerable * 20) % 2 === 0
        this.drawFigure(ctx, { alpha: blink ? 0.4 : 1, flash: this.hurtFlash > 0 })

        // reload bar
        if (this.reloading > 0) {
            const progress = 1 - this.reloading / this.reloadTime
            ctx.fillStyle = 'rgba(0,0,0,0.6)'
            ctx.fillRect(this.position.x - 6, this.position.y - 16, 40, 5)
            ctx.fillStyle = '#ffd35c'
            ctx.fillRect(this.position.x - 6, this.position.y - 16, 40 * progress, 5)
        }

        ctx.restore()
    }
}