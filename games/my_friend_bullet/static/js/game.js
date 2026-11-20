// the game itself; loop, scaling, input, pause and shake come from Tux.Game
class MyFriendBullet extends Tux.Game {
    constructor({ sounds, touch = null }) {
        super({
            world: WORLD,
            fit: 'extend', // wide phones see the city around the arena instead of black bars
            bindings: {
                left: ['KeyA', 'ArrowLeft'],
                right: ['KeyD', 'ArrowRight'],
                down: ['KeyS', 'ArrowDown'],
                jump: ['KeyW', 'ArrowUp', 'Space'],
                shoot: ['Mouse0'],
                slowmo: ['ShiftLeft', 'ShiftRight', 'Mouse2'],
                reload: ['KeyR'],
            },
        })

        this.sounds = sounds
        this.touch = touch
        this.level = new Level()

        this.highscore = Tux.storage.getInt('my-friend-bullet-highscore', 0)

        this.slowmo = new Tux.SlowMotion({
            slowScale: 0.25,
            pulseScale: 0.3,
            subjectSlowScale: 0.55, // the player is slowed less than the world, that's the whole trick
            drain: 28,
            regen: 5,
            unlockAt: 15,
            onEnter: () => this.sounds.play('slowmo', 0.5),
            // meter ran dry: turn the touch toggle off too
            onLock: () => this.input.toggle('slowmo', false),
        })

        this.fx = new Tux.ParticleSystem({ max: 700 })

        this.reset({ seed: 1 })
    }

    // ---------- Tux.Game hooks ----------

    reset({ seed }) {
        this.schedule = new Tux.SeededSchedule(seed, nextEnemy)
        this.nextSpawn = 0

        this.player = new Player({ position: { x: WORLD.width / 2 - 14, y: 400 } })
        this.enemies = []
        this.bullets = []
        this.fx.clear()
        this.slowmo.reset()

        this.gameTime = 0     // slowed world time, what the server checks
        this.score = 0
        this.kills = []       // kill log sent to the server
        this.streak = 0
        this.lastKillTime = null
        this.comboTimer = 0

        this.dyingTimer = 0
    }

    idle(realDt) {
        // keep the city alive behind the menus
        this.level.update(realDt)
    }

    update(realDt) {
        const player = this.player

        this.slowmo.update(realDt, {
            want: this.input.isDown('slowmo') && !player.dead,
            target: this.state === 'dying' ? 0.15 : null,
        })
        this.sounds.setRate(this.slowmo.scale)
        this.#updateTouchUi()

        const dt = realDt * this.slowmo.scale
        const playerDt = realDt * this.slowmo.subjectScale

        this.gameTime += dt
        this.level.update(dt)
        this.comboTimer = Math.max(0, this.comboTimer - dt)

        this.#spawnEnemies()

        // player
        const playerShots = player.update(playerDt, this.input, this.level, this.#aimPoint(), this.sounds)
        playerShots.forEach((shot) => {
            this.bullets.push(new Tux.Projectile({
                position: shot.position, angle: shot.angle, speed: 1900, owner: 'player',
                color: '255, 220, 120', radius: 3, trail: 6, width: 4, bounds: WORLD,
            }))
            this.#muzzleFlash(shot.position, shot.angle, '#ffe38a')
            this.#ejectCasing()
            this.sounds.play('shoot', 0.5)
            this.shake(2.5)
        })

        // enemies
        this.enemies.forEach((enemy) => {
            enemy.update(dt, player, this.level, this.sounds).forEach((shot) => {
                this.bullets.push(new Tux.Projectile({
                    position: shot.position, angle: shot.angle, speed: shot.speed, owner: 'enemy',
                    color: '255, 70, 70', radius: 4.5, trail: 10, width: 5, bounds: WORLD,
                }))
                this.#muzzleFlash(shot.position, shot.angle, '#ff7a5a')
            })
        })
        this.enemies = this.enemies.filter((e) => !e.isGone())

        // bullets (the player's move in the player's faster time)
        this.bullets.forEach((bullet) => {
            const bulletDt = bullet.owner === 'player' ? playerDt : dt
            bullet.update(bulletDt, (x, y) => this.#bulletHit(bullet, x, y))
        })
        this.bullets = this.bullets.filter((b) => !b.dead)

        this.fx.update(dt, realDt, this.level.groundY)

        // death: slow death cam, then game over
        if (player.dead && this.state === 'playing') {
            this.state = 'dying'
            this.dyingTimer = 1.8
            this.sounds.play('slowmo', 0.6)
        }
        if (this.state === 'dying') {
            this.dyingTimer -= realDt
            if (this.dyingTimer <= 0) this.#gameOver()
        }
    }

    render(ctx) {
        const inRun = this.state !== 'menu'

        const view = this.viewport
        this.level.drawBackground(ctx, view)
        this.level.drawForeground(ctx, view)
        this.#dimOutsideArena(ctx, view)

        if (inRun) {
            this.enemies.forEach((e) => e.dead && e.draw(ctx))
            this.fx.drawParticles(ctx)
            this.enemies.forEach((e) => !e.dead && e.draw(ctx))
        }

        // slow motion: drain the colour out of the world...
        const slow = this.slowmo.amount
        ctx.save()
        ctx.translate(view.x, view.y)
        Tux.draw.desaturate(ctx, view.width, view.height, slow)
        ctx.restore()

        // ...but keep bullets, lasers and the player in full colour
        if (inRun) {
            this.enemies.forEach((e) => e.drawLaser(ctx))
            this.bullets.forEach((b) => b.draw(ctx, { long: slow > 0.3 }))
            this.player.draw(ctx)
            this.fx.drawTexts(ctx)
        }

        ctx.save()
        ctx.translate(view.x, view.y)
        Tux.draw.vignette(ctx, view.width, view.height, slow)
        Tux.draw.flash(ctx, view.width, view.height, '255, 0, 40', this.player.hurtFlash * 2)
        ctx.restore()

        if (this.state === 'playing' || this.state === 'paused' || this.state === 'dying') {
            this.#drawHud(ctx)
            if (this.state !== 'dying') this.#drawCrosshair(ctx)
        }
    }

    // ---------- game logic ----------

    #updateTouchUi() {
        if (!this.touch) return
        const slowmo = this.touch.buttons.slowmo
        if (slowmo) {
            slowmo.setActive(this.input.isToggled('slowmo'))
            slowmo.setLocked(this.slowmo.locked)
            slowmo.setProgress(this.slowmo.ratio)
        }
        // reload: ring shows ammo left (or reload progress); dimmed while the magazine is full
        const reload = this.touch.buttons.reload
        const p = this.player
        if (reload && p) {
            const reloading = p.reloading > 0
            reload.setActive(reloading)
            reload.setLocked(!reloading && p.ammo >= p.magazineSize)
            reload.setProgress(reloading ? 1 - p.reloading / p.reloadTime : p.ammo / p.magazineSize)
        }
    }

    #spawnEnemies() {
        const maxAlive = Math.min(9, 4 + Math.floor(this.gameTime / 30))
        const alive = this.enemies.filter((e) => !e.dead).length

        // a spawn may come late if the arena is full, never early
        const next = this.schedule.get(this.nextSpawn)
        if (next.t <= this.gameTime && alive < maxAlive) {
            this.enemies.push(new Enemy({ id: next.id, type: next.type, side: next.side, spawnX: next.x }))
            this.nextSpawn++
        }
    }

    #bulletHit(bullet, x, y) {
        if (bullet.owner === 'player') {
            for (const enemy of this.enemies) {
                const part = enemy.hitTest(x, y)
                if (!part) continue

                this.#blood(x, y, bullet.velocity, part === 'head' ? 18 : 10)
                if (enemy.damage(part, bullet.velocity)) {
                    this.#registerKill(enemy, part === 'head')
                }
                else {
                    this.sounds.play('hit', 0.5)
                }
                return true
            }
            return false
        }

        // enemy bullet
        const player = this.player
        if (player.dead || player.invulnerable > 0) return false
        const head = player.head
        if (pointInCircle(x, y, head.x, head.y, head.radius) || pointInRect(x, y, player.body)) {
            if (player.hit(1)) {
                this.#blood(x, y, bullet.velocity, 12)
                this.sounds.play('hurt', 0.8)
                this.shake(10)
            }
            return true
        }
        return false
    }

    #registerKill(enemy, headshot) {
        const t = Math.round(this.gameTime * 1000) / 1000

        if (this.lastKillTime !== null && t - this.lastKillTime <= COMBO_WINDOW) this.streak++
        else this.streak = 0
        this.lastKillTime = t
        this.comboTimer = COMBO_WINDOW

        const points = killScore(enemy.type, headshot, this.streak)
        this.score += points
        this.kills.push({ id: enemy.id, t, h: headshot })

        this.slowmo.refill(headshot ? 16 : 10)

        const c = enemy.head
        this.fx.text({
            x: c.x, y: c.y - 20,
            text: headshot ? `HEADSHOT +${points}` : `+${points}`,
            color: headshot ? '#ffd35c' : 'white',
            size: headshot ? 22 : 18,
        })

        this.sounds.play('kill', 0.7)
        this.shake(6)

        // short free bullet-time moment on headshots
        if (headshot && !this.input.isDown('slowmo')) this.slowmo.pulse(0.35, 1.5)
    }

    #gameOver() {
        if (this.score > this.highscore) {
            this.highscore = this.score
            Tux.storage.set('my-friend-bullet-highscore', this.highscore)
        }

        this.finish({
            score: this.score,
            duration: Math.round(this.gameTime * 1000) / 1000,
            kills: this.kills,
        })
    }

    // ---------- effects ----------

    #muzzleFlash(position, angle, color) {
        this.fx.burst({ x: position.x, y: position.y, angle, spread: 0.35, count: 6, speed: [200, 600], color, life: 0.12, type: 'spark' })
    }

    #ejectCasing() {
        const p = this.player
        this.fx.add({
            position: { x: p.center.x, y: p.position.y + 27 },
            velocity: { x: -p.facing * randomRange(80, 180), y: randomRange(-380, -240) },
            color: '#e8b04a', life: 1.6, gravity: 1800, type: 'casing',
        })
    }

    #blood(x, y, velocity, count) {
        this.fx.burst({
            x, y, angle: Math.atan2(velocity.y, velocity.x), spread: 0.6, count, speed: [100, 450],
            color: ['#b3122e', '#7a0b1f'], radius: [2, 4.5], life: [0.6, 1.4], gravity: 1400, drag: 1,
        })
    }

    // the scenery past the side doors is only for show: darken it so the arena edges read
    #dimOutsideArena(ctx, view) {
        ctx.fillStyle = 'rgba(5, 4, 10, 0.5)'
        if (view.x < 0) ctx.fillRect(view.x, view.y, -view.x, view.height)
        const right = view.x + view.width
        if (right > WORLD.width) ctx.fillRect(WORLD.width, view.y, right - WORLD.width, view.height)
    }

    // ---------- aim + hud ----------

    #aimPoint() {
        const p = this.player
        const shoulder = { x: p.position.x + p.width / 2, y: p.position.y + 27 }

        // touch stick gives an angle, the mouse gives a point
        if (this.input.aimAngle !== null) {
            return {
                x: shoulder.x + Math.cos(this.input.aimAngle) * 180,
                y: shoulder.y + Math.sin(this.input.aimAngle) * 180,
            }
        }
        return this.pointer
    }

    #drawHud(ctx) {
        const p = this.player
        const text = (str, x, y, size, color, align) => Tux.draw.text(ctx, str, x, y, { size, color, align })

        // hearts
        for (let i = 0; i < p.maxHp; i++) {
            Tux.draw.heart(ctx, 34 + i * 34, 34, i < p.hp ? '#ff3b5c' : 'rgba(255,255,255,0.15)')
        }

        // ammo
        for (let i = 0; i < p.magazineSize; i++) {
            ctx.fillStyle = i < p.ammo ? '#ffd35c' : 'rgba(255,255,255,0.15)'
            ctx.fillRect(20 + i * 11, 60, 7, 16)
        }
        if (p.reloading > 0) {
            text('RELOADING', 20 + p.magazineSize * 11 + 10, 69, 13, '#ffd35c', 'left')
        }

        // focus (slow-mo) meter
        const focusColor = this.slowmo.locked ? '#555' : (this.slowmo.amount > 0.2 ? '#7fd4ff' : '#3fa9f5')
        Tux.draw.bar(ctx, 20, 88, 220, 12, this.slowmo.ratio, { color: focusColor })
        text('FOCUS', 252, 95, 13, '#7fd4ff', 'left')

        // score + combo
        text(this.score.toLocaleString(), WORLD.width / 2, 44, 40, 'white')
        if (this.comboTimer > 0 && this.streak > 0) {
            const mult = 1 + COMBO_STEP * Math.min(this.streak, COMBO_MAX_STEPS)
            text(`COMBO x${mult.toFixed(2)}`, WORLD.width / 2, 80, 20, '#ffd35c')
            ctx.fillStyle = '#ffd35c'
            const w = 140 * (this.comboTimer / COMBO_WINDOW)
            ctx.fillRect(WORLD.width / 2 - w / 2, 94, w, 4)
        }

        // time + kills + best
        text(formatTime(this.gameTime), WORLD.width - 20, 34, 22, 'white', 'right')
        text(`${this.kills.length} KILLS`, WORLD.width - 20, 62, 16, '#ddd', 'right')
        text(`BEST ${Math.max(this.highscore, this.score).toLocaleString()}`, WORLD.width - 20, 86, 14, '#999', 'right')
    }

    #drawCrosshair(ctx) {
        if (this.input.touch && this.input.aimAngle === null) return
        const aim = this.#aimPoint()
        Tux.draw.crosshair(ctx, aim.x, aim.y, { radius: 10 + this.player.recoil * 6 })
    }
}