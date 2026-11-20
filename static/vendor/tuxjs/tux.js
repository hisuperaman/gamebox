/*!
 * tux.js v1.1.0 - a small canvas game kit
 * by hisuperaman - https://hisuperaman.me
 */

// ---------- core.js ----------
/*
 * tux.js - a small canvas game kit
 * by hisuperaman - https://hisuperaman.me
 *
 * Every library file adds itself to the global `Tux` object and keeps
 * everything else private, so games can freely name their own classes
 * (Game, Player, Particle...) without clashing with the library.
 */
const Tux = {
    version: '1.1.0',
    author: 'hisuperaman',
    url: 'https://hisuperaman.me',
}

// lets tux.css style the page (full screen, no scroll); add class="tux-page" to <html> to avoid a flash
// also reachable as window.Tux (a top-level const alone isn't on window)
if (typeof window !== 'undefined') window.Tux = Tux

if (typeof document !== 'undefined') document.documentElement.classList.add('tux-page')

// ---------- math ----------
Tux.math = {
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    },

    lerp(a, b, t) {
        return a + (b - a) * t
    },

    randomRange(min, max) {
        return min + Math.random() * (max - min)
    },

    randomInt(min, max, step = 1) {
        const range = Math.floor((max - min) / step) + 1
        return min + Math.floor(Math.random() * range) * step
    },

    // shortest signed difference between two angles
    angleDiff(from, to) {
        let diff = to - from
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        return diff
    },
}

// ---------- collisions ----------
Tux.collide = {
    rects(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    },

    pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
    },

    pointInCircle(px, py, cx, cy, r) {
        const dx = px - cx
        const dy = py - cy
        return dx * dx + dy * dy <= r * r
    },
}

// ---------- formatting ----------
Tux.format = {
    time(seconds) {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    },

    number(n) {
        return Number(n).toLocaleString()
    },
}

// ---------- localStorage that never throws (private mode, blocked storage...) ----------
Tux.storage = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(key)
            return value === null ? fallback : value
        }
        catch (err) {
            return fallback
        }
    },

    getInt(key, fallback = 0) {
        const value = parseInt(Tux.storage.get(key), 10)
        return Number.isNaN(value) ? fallback : value
    },

    set(key, value) {
        try {
            localStorage.setItem(key, value)
        }
        catch (err) { }
    },
}

// ---------- seeded random ----------
// mulberry32 - the python side (tuxjs/rng.py) produces the exact same numbers,
// so the server can rebuild anything the client generated from a seed
Tux.rng = {
    mulberry32(seed) {
        let a = seed >>> 0
        return function () {
            a = (a + 0x6D2B79F5) | 0
            let t = Math.imul(a ^ (a >>> 15), 1 | a)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    },

    randomSeed() {
        return Math.floor(Math.random() * 4294967296)
    },
}

// ---------- device ----------
Tux.device = {
    isTouch() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia('(pointer: coarse)').matches
        )
    },
}

;(() => {
    // tiny event emitter, Tux.Game and others extend it
    class Emitter {
        #handlers = {}

        on(event, handler) {
            (this.#handlers[event] ||= []).push(handler)
            return this
        }

        off(event, handler) {
            this.#handlers[event] = (this.#handlers[event] || []).filter((h) => h !== handler)
            return this
        }

        emit(event, ...args) {
            (this.#handlers[event] || []).forEach((h) => h(...args))
        }
    }

    // A list that is built lazily, item by item, from a seed.
    // generate(rng, index, previousItem) returns the next item.
    // Great for spawn plans the server must be able to rebuild.
    class SeededSchedule {
        constructor(seed, generate) {
            this.rng = Tux.rng.mulberry32(seed)
            this.generate = generate
            this.list = []
        }

        get(i) {
            while (this.list.length <= i) {
                const index = this.list.length
                const previous = index > 0 ? this.list[index - 1] : null
                this.list.push(this.generate(this.rng, index, previous))
            }
            return this.list[i]
        }
    }

    Tux.Emitter = Emitter
    Tux.SeededSchedule = SeededSchedule
})()

// ---------- input.js ----------
;(() => {
    /*
     * Action based input.
     *
     *   const input = new Tux.Input({
     *       target: canvas,
     *       bindings: {
     *           left: ['KeyA', 'ArrowLeft'],
     *           jump: ['Space', 'KeyW'],
     *           shoot: ['Mouse0'],          // Mouse0 = left, Mouse1 = middle, Mouse2 = right
     *       },
     *   })
     *
     *   input.isDown('left')    // held right now (or toggled on)
     *   input.consume('jump')   // true once per press
     *
     * Touch controls (and your own code) feed the same actions with
     * hold(), press() and toggle(), so game code doesn't care where input came from.
     */
    class Input {
        constructor({ target = document, bindings = {}, preventDefault = ['Space', 'ArrowUp', 'ArrowDown'] } = {}) {
            this.target = target
            this.bindings = {}
            this.preventDefault = new Set(preventDefault)

            this.held = new Map()   // action -> Set of sources holding it
            this.pressed = new Set() // one-shot presses waiting to be consumed
            this.toggled = new Set()

            // pointer position in screen pixels, and an optional aim angle (from a touch stick)
            this.pointer = { x: 0, y: 0 }
            this.aimAngle = null

            this.touch = Tux.device.isTouch()

            Object.entries(bindings).forEach(([action, codes]) => this.bind(action, codes))

            this.#listen()
        }

        bind(action, codes) {
            this.bindings[action] = [...(this.bindings[action] || []), ...codes]
        }

        unbind(action) {
            delete this.bindings[action]
            this.held.delete(action)
        }

        // ---------- reading ----------

        isDown(action) {
            return this.isHeld(action) || this.toggled.has(action)
        }

        isHeld(action) {
            const sources = this.held.get(action)
            return !!sources && sources.size > 0
        }

        isToggled(action) {
            return this.toggled.has(action)
        }

        consume(action) {
            const was = this.pressed.has(action)
            this.pressed.delete(action)
            return was
        }

        // ---------- writing (touch controls, custom ui, tests) ----------

        press(action) {
            this.pressed.add(action)
        }

        hold(action, down = true, source = 'api') {
            if (!this.held.has(action)) this.held.set(action, new Set())
            const sources = this.held.get(action)
            if (down) sources.add(source)
            else sources.delete(source)
        }

        toggle(action, value = !this.toggled.has(action)) {
            if (value) this.toggled.add(action)
            else this.toggled.delete(action)
            return value
        }

        setAimAngle(angle) {
            this.aimAngle = angle
        }

        reset() {
            this.held.clear()
            this.pressed.clear()
            this.toggled.clear()
        }

        // ---------- dom ----------

        #actionsFor(code) {
            return Object.keys(this.bindings).filter((action) => this.bindings[action].includes(code))
        }

        #down(code, e) {
            const actions = this.#actionsFor(code)
            actions.forEach((action) => {
                if (!this.isHeld(action)) this.press(action)
                this.hold(action, true, code)
            })
            if (actions.length && this.preventDefault.has(code) && e) e.preventDefault()
        }

        #up(code) {
            this.#actionsFor(code).forEach((action) => this.hold(action, false, code))
        }

        #listen() {
            const typing = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)

            document.addEventListener('keydown', (e) => {
                if (typing(e) || e.repeat) return
                this.#down(e.code, e)
            })
            document.addEventListener('keyup', (e) => this.#up(e.code))

            const target = this.target
            target.addEventListener('mousemove', (e) => {
                this.pointer.x = e.clientX
                this.pointer.y = e.clientY
                this.aimAngle = null
            })
            target.addEventListener('mousedown', (e) => this.#down(`Mouse${e.button}`, e))
            document.addEventListener('mouseup', (e) => this.#up(`Mouse${e.button}`))
            target.addEventListener('contextmenu', (e) => e.preventDefault())

            window.addEventListener('blur', () => this.reset())
        }
    }

    Tux.Input = Input
})()

// ---------- touch.js ----------
;(() => {
    // css offset from a screen edge that respects the iPhone notch / home bar
    function edge(side, px) {
        return `calc(max(16px, env(safe-area-inset-${side})) + ${px}px)`
    }

    function applyPosition(el, position = {}) {
        Object.entries(position).forEach(([side, value]) => {
            el.style[side] = typeof value === 'number' ? edge(side, value) : value
        })
    }

    /*
     * On-screen controls for phones. Only built on touch devices, and only
     * visible while a run is going (body.tux-in-game).
     *
     *   const touch = new Tux.TouchControls({ input })
     *   touch.addMoveStick()                      // fixed stick: left/right/down + up to jump
     *   touch.addAimStick({ hint: 'Move your thumb here<br>to aim &amp; shoot' })
     *   touch.addAimStick({ fire: 'release' })    // drag to aim, lift to fire once, tap to shoot a spot
     *   touch.addButton({ id: 'slowmo', icon: 'hourglass', type: 'toggle', action: 'slowmo', ring: true,
     *                     position: { right: 150, bottom: 110 } })
     *   touch.addButton({ id: 'pause', icon: 'pause', dock: true, onPress: () => game.pause() })
     *
     * Needs nipplejs for sticks and lucide for icons (tux_scripts() adds both).
     */
    class TouchControls {
        constructor({ input, enabled = Tux.device.isTouch() } = {}) {
            this.input = input
            this.enabled = enabled
            this.sticks = {}
            this.buttons = {}

            if (!enabled) return

            this.root = document.createElement('div')
            this.root.className = 'tux-touch'
            document.body.appendChild(this.root)

            this.dock = document.createElement('div')
            this.dock.className = 'tux-touch-dock'
            this.root.appendChild(this.dock)
        }

        /*
         * mode: 'fixed' (always in one place) or 'floating' (appears where the thumb lands)
         * area: css box for the touch zone, e.g. { left: 0, bottom: 0, width: 170, height: 170 }
         *       numbers are px from the safe edge, strings are used as-is
         * hint: html shown over the zone by showHint(), e.g. on the first seconds of a run
         */
        addStick({ id, mode = 'fixed', area, size = 110, color = 'white', hint = null, hintColor = '255, 40, 60', hintPosition = { top: '26%', left: '40%' }, hintIcon = 'crosshair', onStart, onMove, onEnd }) {
            if (!this.enabled) return null

            const zone = document.createElement('div')
            zone.className = `tux-stick-zone tux-stick-${mode}${'left' in area ? ' tux-stick-left' : ''}`
            zone.id = `tux-stick-${id}`
            applyPosition(zone, area)
            zone.style.setProperty('--tux-hint-rgb', hintColor)
            this.root.appendChild(zone)

            let hintEl = null
            if (hint) {
                hintEl = document.createElement('div')
                hintEl.className = 'tux-stick-hint'
                Object.assign(hintEl.style, hintPosition)
                if (hintIcon) {
                    const i = document.createElement('i')
                    i.setAttribute('data-lucide', hintIcon)
                    hintEl.appendChild(i)
                }
                const text = document.createElement('span')
                text.innerHTML = hint // hint text comes from the game's own code
                hintEl.appendChild(text)
                zone.appendChild(hintEl)
                Tux.icons.render()
            }

            const nipple = nipplejs.create({
                zone,
                mode: mode === 'fixed' ? 'static' : 'dynamic',
                position: mode === 'fixed' ? { left: '50%', top: '50%' } : undefined,
                size,
                color,
            })

            const stick = { id, zone, nipple, hintTimer: null }

            stick.showHint = (ms = 4000) => {
                if (!hintEl) return
                zone.classList.add('tux-hinting')
                clearTimeout(stick.hintTimer)
                stick.hintTimer = setTimeout(stick.hideHint, ms)
            }
            stick.hideHint = () => {
                clearTimeout(stick.hintTimer)
                zone.classList.remove('tux-hinting')
            }

            nipple.on('start', (evt, data) => {
                stick.hideHint()
                // where the thumb landed, in client pixels like input.pointer
                if (onStart) onStart({ x: data.position.x - window.scrollX, y: data.position.y - window.scrollY })
            })
            nipple.on('move', (evt, data) => {
                if (!onMove) return
                // x right, y up, force 0..~2, angle in canvas space (y down)
                onMove({
                    x: Math.cos(data.angle.radian) * data.force,
                    y: Math.sin(data.angle.radian) * data.force,
                    force: data.force,
                    angle: -data.angle.radian,
                })
            })
            nipple.on('end', () => {
                if (onEnd) onEnd()
            })

            this.sticks[id] = stick
            return stick
        }

        // movement stick: holds left/right/down actions; up presses jump once and holds it while kept up.
        // mode 'floating' with a bigger area (e.g. the left half) lets the thumb land anywhere.
        addMoveStick({ id = 'move', mode = 'fixed', left = 'left', right = 'right', down = 'down', jump = 'jump', area = { left: 0, bottom: 0, width: '170px', height: '170px' }, ...options } = {}) {
            const input = this.input
            let jumpArmed = true

            return this.addStick({
                id, mode, area, ...options,
                onMove: ({ x, y }) => {
                    input.hold(left, x < -0.3, 'touch')
                    input.hold(right, x > 0.3, 'touch')
                    if (down) input.hold(down, y < -0.7, 'touch')
                    if (jump) input.hold(jump, y > 0.6, 'touch')

                    if (jump && y > 0.6 && jumpArmed) {
                        input.press(jump)
                        jumpArmed = false
                    }
                    if (y < 0.4) jumpArmed = true
                },
                onEnd: () => {
                    input.hold(left, false, 'touch')
                    input.hold(right, false, 'touch')
                    if (down) input.hold(down, false, 'touch')
                    if (jump) input.hold(jump, false, 'touch')
                    jumpArmed = true
                },
            })
        }

        /*
         * floating aim stick over the right half, sets input.aimAngle past the dead zone (fireAt).
         * fire: 'hold'    - holds `shoot` while dragged past the dead zone (automatic fire)
         *       'release' - dragging only aims; lifting the thumb presses `shoot` once, using the aim
         *                   from just before the lift so the thumb leaving the glass doesn't skew it.
         *                   Drag back into the dead zone to cancel. A quick tap points input.pointer
         *                   at the tapped spot and presses `shoot` once.
         * Switch later with stick.setFire('hold' | 'release'), read it with stick.fire.
         */
        addAimStick({ id = 'aim', shoot = 'shoot', fire = 'hold', fireAt = 0.3, tapMs = 250, color = 'red', area = { top: '0', right: '0', bottom: '0', width: '50%' }, ...options } = {}) {
            const checkFire = (mode) => {
                if (!['hold', 'release'].includes(mode)) throw new Error(`addAimStick: fire must be 'hold' or 'release', got '${mode}'`)
            }
            checkFire(fire)
            const input = this.input
            const settleMs = 60
            let touchStart = null // { time, x, y } in client pixels
            let samples = []      // recent { time, angle, force }, for the pre-lift aim
            let dragged = false

            const stick = this.addStick({
                id, mode: 'floating', area, color, ...options,
                onStart: ({ x, y }) => {
                    touchStart = { time: performance.now(), x, y }
                    samples = []
                    dragged = false
                },
                onMove: ({ angle, force }) => {
                    if (fire === 'hold') {
                        input.setAimAngle(angle)
                        if (shoot) input.hold(shoot, force > fireAt, 'touch')
                        return
                    }
                    const now = performance.now()
                    samples.push({ time: now, angle, force })
                    samples = samples.filter((s) => now - s.time < 300)
                    if (force > fireAt) {
                        dragged = true
                        input.setAimAngle(angle)
                    }
                },
                onEnd: () => {
                    if (fire === 'hold') {
                        if (shoot) input.hold(shoot, false, 'touch')
                        return
                    }
                    if (!shoot || !touchStart) return

                    const now = performance.now()
                    if (dragged) {
                        const last = samples[samples.length - 1]
                        const armed = samples.filter((s) => s.force > fireAt)
                        const settled = armed.filter((s) => now - s.time >= settleMs)
                        const aim = settled[settled.length - 1] || armed[0]
                        if (aim && last.force > fireAt) {
                            input.setAimAngle(aim.angle)
                            input.press(shoot)
                        }
                    }
                    else if (now - touchStart.time <= tapMs) {
                        input.pointer.x = touchStart.x
                        input.pointer.y = touchStart.y
                        input.setAimAngle(null)
                        input.press(shoot)
                    }
                    touchStart = null
                },
            })
            if (!stick) return null

            stick.fire = fire
            stick.setFire = (mode) => {
                checkFire(mode)
                fire = stick.fire = mode
                if (shoot) input.hold(shoot, false, 'touch') // don't leave automatic fire stuck on
                touchStart = null // a touch already in progress doesn't fire on release
            }
            return stick
        }

        /*
         * type: 'tap' (press once), 'hold' (held while touched) or 'toggle' (tap on / tap off)
         * action: input action to drive, and/or onPress(button) for custom behaviour
         * ring: show a progress ring around the button, set with button.setProgress(0..1)
         * dock: put it in the small bottom-centre row instead of `position`
         */
        addButton({ id, icon, label = '', type = 'tap', action = null, onPress = null, position = {}, size = null, ring = false, dock = false, className = '' }) {
            if (!this.enabled) return null
            const input = this.input

            const el = document.createElement('button')
            el.className = `tux-touch-btn ${ring ? 'tux-btn-ring' : ''} ${dock ? 'tux-btn-small' : ''} ${className}`
            el.id = `tux-btn-${id}`
            el.setAttribute('aria-label', label || id)
            if (size) {
                el.style.width = el.style.height = size
            }
            if (!dock) applyPosition(el, position)

            const button = {
                el,
                setIcon: (name) => {
                    el.innerHTML = ''
                    const i = document.createElement('i')
                    i.setAttribute('data-lucide', name)
                    el.appendChild(i)
                    Tux.icons.render()
                },
                setActive: (on) => el.classList.toggle('tux-active', on),
                setLocked: (on) => el.classList.toggle('tux-locked', on),
                setProgress: (ratio) => el.style.setProperty('--tux-progress', `${Math.round(Tux.math.clamp(ratio, 0, 1) * 360)}deg`),
                hide: () => { el.style.display = 'none' },
            }
            if (icon) button.setIcon(icon)

            el.addEventListener('pointerdown', (e) => {
                e.preventDefault()
                if (action) {
                    if (type === 'toggle') button.setActive(input.toggle(action))
                    else if (type === 'hold') input.hold(action, true, `btn-${id}`)
                    else input.press(action)
                }
                if (onPress) onPress(button)
            })
            if (type === 'hold' && action) {
                const release = () => input.hold(action, false, `btn-${id}`)
                el.addEventListener('pointerup', release)
                el.addEventListener('pointerleave', release)
                el.addEventListener('pointercancel', release)
            }

            ;(dock ? this.dock : this.root).appendChild(el)
            this.buttons[id] = button
            return button
        }

        showHints(ms) {
            Object.values(this.sticks).forEach((s) => s.showHint(ms))
        }

        hideHints() {
            Object.values(this.sticks).forEach((s) => s.hideHint())
        }
    }

    Tux.TouchControls = TouchControls
})()

// ---------- audio.js ----------
;(() => {
    /*
     * Sound effects + background music, with slow motion pitch-down and a remembered mute.
     *
     *   const sounds = new Tux.SoundBank({
     *       basePath: '/static/assets/my_game/sfx/',
     *       sounds: { shoot: 'shoot.mp3', hit: 'hit.mp3' },
     *       music: 'bgm.mp3',
     *       muteKey: 'my-game-muted',
     *   })
     *   sounds.play('shoot', 0.5)
     *   sounds.setRate(timeScale)   // 1 = normal, lower = slowed + pitched down
     */
    class SoundBank {
        constructor({ basePath = '', sounds = {}, music = null, musicVolume = 0.35, muteKey = 'tux-muted', minRate = 0.45 } = {}) {
            const load = (file) => {
                const audio = new window.Audio(basePath + file)
                audio.preload = 'auto'
                return audio
            }

            this.sfx = {}
            Object.entries(sounds).forEach(([name, file]) => {
                this.sfx[name] = load(file)
            })

            this.music = music ? load(music) : null
            if (this.music) {
                this.music.loop = true
                this.music.volume = musicVolume
            }

            this.rate = 1
            this.minRate = minRate
            this.muteKey = muteKey
            this.muted = Tux.storage.get(muteKey) === '1'
        }

        add(name, audioOrUrl) {
            this.sfx[name] = typeof audioOrUrl === 'string' ? new window.Audio(audioOrUrl) : audioOrUrl
        }

        // slow motion pitches everything down
        setRate(rate) {
            this.rate = rate
            if (this.music) {
                this.music.preservesPitch = false
                this.music.playbackRate = Tux.math.clamp(0.5 + rate * 0.5, 0.5, 1)
            }
        }

        play(name, volume = 0.7) {
            if (this.muted || !this.sfx[name]) return
            const sfx = this.sfx[name].cloneNode()
            sfx.volume = volume
            sfx.preservesPitch = false
            sfx.playbackRate = Tux.math.clamp(this.minRate + this.rate * (1 - this.minRate), this.minRate, 1)
            sfx.play().catch(() => { })
        }

        startMusic() {
            if (this.muted || !this.music) return
            this.music.currentTime = 0
            this.music.play().catch(() => { })
        }

        resumeMusic() {
            if (this.muted || !this.music) return
            this.music.play().catch(() => { })
        }

        stopMusic() {
            if (this.music) this.music.pause()
        }

        toggleMute() {
            this.muted = !this.muted
            Tux.storage.set(this.muteKey, this.muted ? '1' : '0')
            if (this.muted) this.stopMusic()
            return this.muted
        }
    }

    Tux.SoundBank = SoundBank
})()

// ---------- render.js ----------
// fonts used by canvas text, change them with Tux.theme.font = "'My Font', Arial"
Tux.theme = {
    font: "'Bungee', Arial",
}

;(() => {
    // drawing helpers for HUDs and screen effects, all in world coordinates
    const draw = {
        // outlined text that reads on any background
        text(ctx, text, x, y, { size = 20, color = 'white', align = 'center', font = Tux.theme.font, outline = 'rgba(0,0,0,0.8)' } = {}) {
            ctx.save()
            ctx.font = `${size}px ${font}`
            ctx.textAlign = align
            ctx.textBaseline = 'middle'
            if (outline) {
                ctx.lineWidth = Math.max(3, size / 8)
                ctx.strokeStyle = outline
                ctx.strokeText(text, x, y)
            }
            ctx.fillStyle = color
            ctx.fillText(text, x, y)
            ctx.restore()
        },

        heart(ctx, x, y, color, scale = 1) {
            ctx.save()
            ctx.fillStyle = color
            ctx.translate(x, y)
            ctx.scale(scale, scale)
            ctx.beginPath()
            ctx.moveTo(0, 8)
            ctx.bezierCurveTo(-14, -2, -8, -14, 0, -6)
            ctx.bezierCurveTo(8, -14, 14, -2, 0, 8)
            ctx.fill()
            ctx.restore()
        },

        // filled bar, ratio 0..1
        bar(ctx, x, y, width, height, ratio, { color = '#3fa9f5', background = 'rgba(0,0,0,0.5)', padding = 2 } = {}) {
            ctx.fillStyle = background
            ctx.fillRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
            ctx.fillStyle = color
            ctx.fillRect(x, y, width * Tux.math.clamp(ratio, 0, 1), height)
        },

        crosshair(ctx, x, y, { radius = 10, color = 'white', dot = '#ff3b5c' } = {}) {
            const r = radius
            ctx.save()
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.shadowColor = 'black'
            ctx.shadowBlur = 4
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(x - r - 6, y); ctx.lineTo(x - r + 4, y)
            ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 6, y)
            ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - r + 4)
            ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 6)
            ctx.stroke()
            if (dot) {
                ctx.fillStyle = dot
                ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
            }
            ctx.restore()
        },

        // dark edges, stronger with `strength` 0..1
        vignette(ctx, width, height, strength = 0) {
            const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.7)
            g.addColorStop(0, 'rgba(0,0,0,0)')
            g.addColorStop(1, `rgba(0,0,0,${0.35 + strength * 0.45})`)
            ctx.fillStyle = g
            ctx.fillRect(0, 0, width, height)
        },

        // drains colour from everything drawn so far (slow motion look). amount 0..1
        desaturate(ctx, width, height, amount, { tint = '#1a3a6a', tintAlpha = 0.25, strength = 0.85 } = {}) {
            if (amount <= 0.01) return
            ctx.save()
            ctx.globalCompositeOperation = 'saturation'
            ctx.globalAlpha = amount * strength
            ctx.fillStyle = 'hsl(0, 0%, 50%)'
            ctx.fillRect(-20, -20, width + 40, height + 40)
            ctx.globalCompositeOperation = 'source-over'
            if (tint) {
                ctx.globalAlpha = amount * tintAlpha
                ctx.fillStyle = tint
                ctx.fillRect(-20, -20, width + 40, height + 40)
            }
            ctx.restore()
        },

        // full screen colour flash, e.g. red when hurt
        flash(ctx, width, height, rgb, alpha) {
            if (alpha <= 0) return
            ctx.fillStyle = `rgba(${rgb}, ${alpha})`
            ctx.fillRect(0, 0, width, height)
        },
    }

    Tux.draw = draw
})()

// ---------- particles.js ----------
;(() => {
    const { clamp, randomRange } = Tux.math

    /*
     * type: 'dot' | 'spark' (streak along velocity) | 'casing' (spinning shell) | 'ring' (expanding)
     * or pass draw(ctx, particle, alpha) for your own look.
     * gravity particles bounce and settle on `groundY` passed to update().
     */
    class Particle {
        constructor({ position, velocity = { x: 0, y: 0 }, color = 'white', radius = 3, life = 0.6, gravity = 0, type = 'dot', drag = 0, draw = null }) {
            this.position = position
            this.velocity = velocity
            this.color = color
            this.radius = radius
            this.gravity = gravity
            this.drag = drag
            this.type = type
            this.customDraw = draw

            this.life = life
            this.maxLife = life

            this.rotation = Math.random() * Math.PI * 2
            this.spin = randomRange(-15, 15)
        }

        update(dt, groundY = Infinity) {
            this.life -= dt

            this.velocity.y += this.gravity * dt
            if (this.drag) {
                const d = Math.max(0, 1 - this.drag * dt)
                this.velocity.x *= d
                this.velocity.y *= d
            }

            this.position.x += this.velocity.x * dt
            this.position.y += this.velocity.y * dt
            this.rotation += this.spin * dt

            if (this.gravity && this.position.y > groundY) {
                this.position.y = groundY
                this.velocity.y *= -0.3
                this.velocity.x *= 0.6
                this.spin *= 0.5
            }
        }

        draw(ctx) {
            const alpha = clamp(this.life / this.maxLife, 0, 1)

            ctx.save()
            ctx.globalAlpha = alpha
            ctx.fillStyle = this.color
            ctx.strokeStyle = this.color

            if (this.customDraw) {
                this.customDraw(ctx, this, alpha)
            }
            else if (this.type === 'casing') {
                ctx.translate(this.position.x, this.position.y)
                ctx.rotate(this.rotation)
                ctx.fillRect(-3, -1.5, 6, 3)
            }
            else if (this.type === 'spark') {
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(this.position.x, this.position.y)
                ctx.lineTo(this.position.x - this.velocity.x * 0.03, this.position.y - this.velocity.y * 0.03)
                ctx.stroke()
            }
            else if (this.type === 'ring') {
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.arc(this.position.x, this.position.y, this.radius * (1 + (1 - alpha) * 4), 0, Math.PI * 2)
                ctx.stroke()
            }
            else {
                ctx.beginPath()
                ctx.arc(this.position.x, this.position.y, this.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.restore()
        }

        isDead() {
            return this.life <= 0
        }
    }

    // floating "+150" style text that rises and fades
    class FloatingText {
        constructor({ position, text, color = 'white', size = 22, life = 1.1, rise = 50, font = null }) {
            this.position = position
            this.text = text
            this.color = color
            this.size = size
            this.life = life
            this.maxLife = life
            this.rise = rise
            this.font = font
        }

        update(dt) {
            this.life -= dt
            this.position.y -= this.rise * dt
        }

        draw(ctx) {
            ctx.save()
            ctx.globalAlpha = clamp(this.life / this.maxLife * 1.5, 0, 1)
            ctx.font = `bold ${this.size}px ${this.font || Tux.theme.font}`
            ctx.textAlign = 'center'
            ctx.lineWidth = 4
            ctx.strokeStyle = 'black'
            ctx.strokeText(this.text, this.position.x, this.position.y)
            ctx.fillStyle = this.color
            ctx.fillText(this.text, this.position.x, this.position.y)
            ctx.restore()
        }

        isDead() {
            return this.life <= 0
        }
    }

    /*
     * Holds particles + floating texts, with a cap so big fights don't tank the frame rate.
     *
     *   fx.burst({ x, y, angle, spread: 0.35, count: 6, speed: [200, 600], color: '#ffe38a', life: 0.12, type: 'spark' })
     *   fx.text({ x, y, text: '+100' })
     */
    class ParticleSystem {
        constructor({ max = 700 } = {}) {
            this.max = max
            this.particles = []
            this.texts = []
        }

        add(particle) {
            this.particles.push(particle instanceof Particle ? particle : new Particle(particle))
        }

        // many particles from one point, fanned around `angle`
        burst({ x, y, angle = 0, spread = Math.PI, count = 8, speed = [100, 300], ...options }) {
            for (let i = 0; i < count; i++) {
                const a = angle + randomRange(-spread, spread)
                const v = Array.isArray(speed) ? randomRange(speed[0], speed[1]) : speed
                const opts = { ...options }
                // allow [min, max] ranges for radius and life
                if (Array.isArray(opts.radius)) opts.radius = randomRange(...opts.radius)
                if (Array.isArray(opts.life)) opts.life = randomRange(...opts.life)
                if (Array.isArray(opts.color)) opts.color = opts.color[Math.floor(Math.random() * opts.color.length)]
                this.add({ ...opts, position: { x, y }, velocity: { x: Math.cos(a) * v, y: Math.sin(a) * v } })
            }
        }

        text(options) {
            const { x, y, ...rest } = options
            this.texts.push(new FloatingText({ position: { x, y }, ...rest }))
        }

        // particles move in world time (slowed), texts in real time so they stay readable
        update(dt, realDt = dt, groundY = Infinity) {
            this.particles.forEach((p) => p.update(dt, groundY))
            this.particles = this.particles.filter((p) => !p.isDead())
            if (this.particles.length > this.max) this.particles.splice(0, this.particles.length - this.max)

            this.texts.forEach((t) => t.update(realDt))
            this.texts = this.texts.filter((t) => !t.isDead())
        }

        drawParticles(ctx) {
            this.particles.forEach((p) => p.draw(ctx))
        }

        drawTexts(ctx) {
            this.texts.forEach((t) => t.draw(ctx))
        }

        clear() {
            this.particles = []
            this.texts = []
        }
    }

    Tux.Particle = Particle
    Tux.FloatingText = FloatingText
    Tux.ParticleSystem = ParticleSystem
})()

// ---------- physics.js ----------
;(() => {
    /*
     * A box that falls, lands on the ground and on one-way platforms
     * (you can jump up through them and stand on top, or drop down through them).
     *
     *   const world = { groundY: 640, platforms: [{ x, y, width, height }] }
     *   body.applyPhysics(dt, world)
     *
     * Extend it for players and enemies:  class Hero extends Tux.Body { ... }
     */
    class Body {
        constructor({ position, width = 32, height = 32, gravity = 2200, maxFall = 1400 } = {}) {
            this.position = position
            this.width = width
            this.height = height

            this.velocity = { x: 0, y: 0 }
            this.gravity = gravity
            this.maxFall = maxFall

            this.onGround = false
            this.dropThrough = 0
        }

        get center() {
            return { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 }
        }

        get feet() {
            return { x: this.position.x + this.width / 2, y: this.position.y + this.height }
        }

        get rect() {
            return { x: this.position.x, y: this.position.y, width: this.width, height: this.height }
        }

        applyPhysics(dt, world) {
            const prevBottom = this.position.y + this.height

            this.velocity.y += this.gravity * dt
            this.velocity.y = Math.min(this.velocity.y, this.maxFall)

            this.position.x += this.velocity.x * dt
            this.position.y += this.velocity.y * dt

            if (this.dropThrough > 0) this.dropThrough -= dt

            this.onGround = false
            const bottom = this.position.y + this.height

            if (this.velocity.y >= 0 && this.dropThrough <= 0) {
                for (const p of world.platforms || []) {
                    const overlapX = this.position.x + this.width > p.x && this.position.x < p.x + p.width
                    if (overlapX && prevBottom <= p.y + 1 && bottom >= p.y) {
                        this.position.y = p.y - this.height
                        this.velocity.y = 0
                        this.onGround = true
                        break
                    }
                }
            }

            if (world.groundY !== undefined && this.position.y + this.height >= world.groundY) {
                this.position.y = world.groundY - this.height
                this.velocity.y = 0
                this.onGround = true
            }
        }

        standingOnPlatform(world) {
            if (!this.onGround) return false
            return world.groundY === undefined || this.position.y + this.height < world.groundY - 1
        }

        // fall through the platform you're standing on
        dropDown(seconds = 0.25) {
            this.dropThrough = seconds
            this.position.y += 2
        }

        clampX(min, max) {
            this.position.x = Tux.math.clamp(this.position.x, min, max - this.width)
        }
    }

    Tux.Body = Body
})()

// ---------- projectile.js ----------
;(() => {
    /*
     * Fast projectile with a fading trail. It moves in small steps so it can't
     * skip through thin targets, asking hitTest(x, y) at every step.
     *
     *   const p = new Tux.Projectile({ position, angle, speed: 1900, owner: 'player', color: '255, 220, 120' })
     *   p.update(dt, (x, y) => hitSomething(x, y))   // return true to stop the projectile
     *   p.draw(ctx, { long: slowmo })
     */
    class Projectile {
        constructor({ position, angle, speed, owner = null, damage = 1, color = '255, 255, 255', radius = 3, trail = 6, width = 4, life = 3, bounds = null, step = 8 }) {
            this.position = position
            this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
            this.owner = owner
            this.damage = damage

            this.color = color // "r, g, b"
            this.radius = radius
            this.width = width
            this.maxTrail = trail
            this.trail = [{ x: position.x, y: position.y }]

            this.life = life
            this.bounds = bounds // { width, height } - dies when it leaves (with 50px margin)
            this.step = step
            this.dead = false
        }

        update(dt, hitTest = null) {
            this.life -= dt
            if (this.life <= 0) {
                this.dead = true
                return
            }

            const dx = this.velocity.x * dt
            const dy = this.velocity.y * dt
            const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / this.step))

            for (let i = 0; i < steps; i++) {
                this.position.x += dx / steps
                this.position.y += dy / steps
                if (hitTest && hitTest(this.position.x, this.position.y)) {
                    this.dead = true
                    break
                }
            }

            this.trail.push({ x: this.position.x, y: this.position.y })
            if (this.trail.length > this.maxTrail) this.trail.shift()

            const b = this.bounds
            if (b && (this.position.x < -50 || this.position.x > b.width + 50 || this.position.y < -50 || this.position.y > b.height + 50)) {
                this.dead = true
            }
        }

        draw(ctx, { long = false } = {}) {
            const color = this.color

            ctx.save()
            ctx.lineCap = 'round'

            for (let i = 1; i < this.trail.length; i++) {
                const a = this.trail[i - 1]
                const b = this.trail[i]
                ctx.strokeStyle = `rgba(${color}, ${(i / this.trail.length) * (long ? 0.9 : 0.5)})`
                ctx.lineWidth = (i / this.trail.length) * this.width
                ctx.beginPath()
                ctx.moveTo(a.x, a.y)
                ctx.lineTo(b.x, b.y)
                ctx.stroke()
            }

            ctx.fillStyle = `rgb(${color})`
            ctx.shadowColor = `rgb(${color})`
            ctx.shadowBlur = 10
            ctx.beginPath()
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
            ctx.fill()

            ctx.restore()
        }
    }

    Tux.Projectile = Projectile
})()

// ---------- slowmo.js ----------
;(() => {
    const { clamp, lerp } = Tux.math

    /*
     * Bullet time with a meter.
     *
     *   const slowmo = new Tux.SlowMotion({ slowScale: 0.25, drain: 28, regen: 5 })
     *
     *   // every frame (real seconds):
     *   slowmo.update(realDt, { want: input.isDown('slowmo') })
     *   const dt = realDt * slowmo.scale              // world time
     *   const heroDt = realDt * slowmo.subjectScale   // the hero is slowed less
     *
     *   slowmo.pulse(0.35)    // short free slow-mo, e.g. on a headshot
     *   slowmo.refill(10)     // e.g. on a kill
     *
     * When the meter runs dry it locks until it refills past `unlockAt`
     * and the player lets go - onLock / onEnter callbacks let you react.
     */
    class SlowMotion {
        constructor({ slowScale = 0.25, pulseScale = 0.3, subjectSlowScale = 0.55, smoothing = 12, meterMax = 100, drain = 28, regen = 5, unlockAt = 15, onEnter = null, onLock = null } = {}) {
            Object.assign(this, { slowScale, pulseScale, subjectSlowScale, smoothing, meterMax, drain, regen, unlockAt, onEnter, onLock })
            this.reset()
        }

        reset() {
            this.scale = 1
            this.meter = this.meterMax
            this.locked = false
            this.active = false
            this.pulseTime = 0
            this.pulseCooldown = 0
        }

        // 0 = normal speed, 1 = fully slowed
        get amount() {
            return clamp((1 - this.scale) / (1 - this.slowScale), 0, 1)
        }

        // time scale for the hero, who stays faster than the world
        get subjectScale() {
            return lerp(1, this.subjectSlowScale, this.amount)
        }

        get ratio() {
            return this.meter / this.meterMax
        }

        // want: player is asking for slow-mo. blocked: not allowed right now.
        // target: force a time scale (e.g. 0.15 for a death cam), ignores the meter
        update(realDt, { want = false, blocked = false, target = null } = {}) {
            if (this.meter <= 0 && !this.locked) {
                this.locked = true
                if (this.onLock) this.onLock()
            }
            if (this.locked && this.meter > this.unlockAt && !want) this.locked = false

            const active = want && !this.locked && !blocked
            if (active && !this.active && this.onEnter) this.onEnter()
            this.active = active

            if (active) this.meter = Math.max(0, this.meter - this.drain * realDt)
            else this.meter = Math.min(this.meterMax, this.meter + this.regen * realDt)

            this.pulseTime = Math.max(0, this.pulseTime - realDt)
            this.pulseCooldown = Math.max(0, this.pulseCooldown - realDt)

            let goal = 1
            if (active) goal = this.slowScale
            else if (this.pulseTime > 0) goal = this.pulseScale
            if (target !== null) goal = target

            this.scale = lerp(this.scale, goal, clamp(realDt * this.smoothing, 0, 1))
        }

        pulse(duration = 0.35, cooldown = 1.5) {
            if (this.pulseCooldown > 0 || this.active) return false
            this.pulseTime = duration
            this.pulseCooldown = cooldown
            return true
        }

        refill(amount) {
            this.meter = Math.min(this.meterMax, this.meter + amount)
        }
    }

    Tux.SlowMotion = SlowMotion
})()

// ---------- ui.js ----------
;(() => {
    // ---------- tiny dom builder ----------
    // Tux.el('button', { className: 'tux-btn', onclick: fn }, [Tux.icon('play'), 'Play'])
    // strings become text nodes (safe), use { html: '...' } only for your own markup
    function el(tag, props = {}, children = []) {
        const node = document.createElement(tag)
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'html') node.innerHTML = value
            else if (key === 'dataset') Object.assign(node.dataset, value)
            else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value)
            else if (key in node) node[key] = value
            else node.setAttribute(key, value)
        })
        ;[].concat(children).forEach((child) => {
            if (child === null || child === undefined || child === false) return
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
        })
        return node
    }

    // ---------- lucide icons ----------
    const icons = {
        strokeWidth: 2.25,

        // swaps every <i data-lucide="name"> for an svg
        render() {
            if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': icons.strokeWidth } })
        },

        // makes an <i data-lucide> placeholder, call render() after adding it to the page
        make(name) {
            const i = document.createElement('i')
            i.setAttribute('data-lucide', name)
            return i
        },

        // sets an element to [icon] text, text is always set safely
        set(element, name, text = null) {
            element.innerHTML = ''
            element.appendChild(icons.make(name))
            if (text !== null) {
                const span = document.createElement('span')
                span.textContent = text
                element.appendChild(span)
            }
            icons.render()
        },
    }

    // ---------- overlay screens ----------
    // only one overlay shows at a time; show(null) = back to the game
    class Screens {
        constructor(map = {}) {
            this.map = {}
            this.current = null
            Object.entries(map).forEach(([name, element]) => this.add(name, element))
        }

        add(name, element) {
            this.map[name] = element
            element.classList.add('tux-hidden')
        }

        show(name) {
            this.current = name
            Object.entries(this.map).forEach(([key, element]) => {
                element.classList.toggle('tux-hidden', key !== name)
            })
            document.body.classList.toggle('tux-in-game', name === null)
        }
    }

    // ---------- fullscreen / platform ----------
    const root = document.documentElement
    const fullscreen = {
        get supported() {
            return !!(root.requestFullscreen || root.webkitRequestFullscreen)
        },

        // running from the home screen (already fullscreen, no browser bar)
        get standalone() {
            return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true
        },

        // iPhone safari can't fullscreen a page, only "Add to Home Screen" can
        get isIOS() {
            return /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !fullscreen.supported)
        },

        get active() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement)
        },

        // must be called from inside a tap / click
        async enter({ landscape = true } = {}) {
            if (!fullscreen.supported || fullscreen.active) return
            try {
                if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
                else root.webkitRequestFullscreen()
                if (landscape && screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape').catch(() => { })
                }
            }
            catch (err) {
                // browser said no, keep playing in the page
            }
        },

        exit() {
            if (!fullscreen.active) return
            if (document.exitFullscreen) document.exitFullscreen().catch(() => { })
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
        },

        toggle(options) {
            if (fullscreen.active) fullscreen.exit()
            else fullscreen.enter(options)
        },

        onChange(handler) {
            document.addEventListener('fullscreenchange', handler)
            document.addEventListener('webkitfullscreenchange', handler)
        },
    }

    // ---------- "rotate your phone" ----------
    function orientationGuard(message = 'Please switch to landscape mode for the best experience.') {
        const warning = el('div', { className: 'tux-orientation' }, [message])
        document.body.appendChild(warning)
        const check = () => {
            warning.style.display = window.innerHeight > window.innerWidth ? 'flex' : 'none'
        }
        check()
        window.addEventListener('resize', check)
        return warning
    }

    Tux.el = el
    Tux.icons = icons
    Tux.Screens = Screens
    Tux.fullscreen = fullscreen
    Tux.orientationGuard = orientationGuard
})()

// ---------- leaderboard.js ----------
;(() => {
    /*
     * Leaderboards in tux.js are adapters: plain objects that Tux.Arcade calls.
     * tux.js has no backend of its own - plug in whatever you have.
     *
     *   const adapter = {
     *       verifies: true,                         // does a server re-check scores? (changes wording only)
     *       async startRun() { return { seed } },   // when a run starts; `seed` (optional) goes to game.start()
     *       async submit(run, name, payload, result) {
     *           return { score, rank, best, leaderboard: rows }   // rows: [{ name, score, ...extra }]
     *       },
     *       async top() { return rows },
     *   }
     *
     * Throwing from startRun() puts the run in offline mode (playable, not submitted).
     * Two ready-made adapters: Tux.leaderboard.http(...) and Tux.leaderboard.local(...).
     */

    // ---------- your own API ----------
    /*
     *   Tux.leaderboard.http('/api/my_game')
     *
     * Default endpoints (change any with `paths`, or the whole request with the hooks):
     *   POST {base}/session      -> { session_id, seed }
     *   POST {base}/score        body: { ...payload, session_id, name }
     *                            -> { score, rank, best, leaderboard }
     *   GET  {base}/leaderboard  -> { leaderboard }
     * Responses may include { ok: false, error: 'message' } to show an error.
     *
     * Hooks: headers (object or () => object), submitBody(run, name, payload) => body,
     *        parseRun(json) => run, parseSubmit(json) => result, parseTop(json) => rows
     */
    function http(base, {
        paths = {},
        headers = {},
        verifies = true,
        submitBody = (run, name, payload) => ({ ...payload, session_id: run.id, name }),
        parseRun = (data) => ({ ...data, id: data.session_id, seed: data.seed }),
        parseSubmit = (data) => data,
        parseTop = (data) => data.leaderboard,
    } = {}) {
        base = base.replace(/\/$/, '')
        const url = { start: '/session', submit: '/score', top: '/leaderboard', ...paths }

        async function request(path, options = {}) {
            const extra = typeof headers === 'function' ? headers() : headers
            const res = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...extra, ...(options.headers || {}) } })
            let data = null
            try {
                data = await res.json()
            }
            catch (err) {
                throw new Error(`Server error (${res.status})`)
            }
            if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`)
            return data
        }

        return {
            verifies,
            async startRun() {
                return parseRun(await request(url.start, { method: 'POST' }))
            },
            async submit(run, name, payload) {
                return parseSubmit(await request(url.submit, { method: 'POST', body: JSON.stringify(submitBody(run, name, payload)) }))
            },
            async top() {
                return parseTop(await request(url.top))
            },
        }
    }

    // ---------- no server: scores saved in this browser ----------
    /*
     *   Tux.leaderboard.local({ key: 'my-game-scores', size: 20 })
     * One entry per name (their best), top `size` kept. Not verified - anyone can edit localStorage.
     */
    function local({ key = 'tux-scores', size = 20 } = {}) {
        const load = () => {
            try {
                return JSON.parse(Tux.storage.get(key, '[]')) || []
            }
            catch (err) {
                return []
            }
        }
        const sorted = (rows) => rows.sort((a, b) => b.score - a.score || a.created_at - b.created_at).slice(0, size)

        return {
            verifies: false,
            async startRun() {
                return { id: null, seed: Tux.rng.randomSeed() }
            },
            async submit(run, name, payload, result) {
                const score = Math.floor(result.score) || 0
                let rows = load()
                if (score > 0) {
                    const existing = rows.find((r) => r.name.toLowerCase() === name.toLowerCase())
                    if (!existing) rows.push({ ...payload, name, score, created_at: Date.now() / 1000 })
                    else if (score > existing.score) Object.assign(existing, payload, { name, score, created_at: Date.now() / 1000 })
                    rows = sorted(rows)
                    Tux.storage.set(key, JSON.stringify(rows))
                }
                const index = rows.findIndex((r) => r.name.toLowerCase() === name.toLowerCase())
                return { score, rank: index >= 0 ? index + 1 : null, best: index >= 0 ? rows[index].score : null, leaderboard: rows }
            },
            async top() {
                return sorted(load())
            },
        }
    }

    /*
     * Fills a <tbody>: rank, name, score, and an optional detail column.
     * detail(row) gets the row with your game's extra fields, e.g. row.kills
     */
    function render(tbody, rows, { highlightName = null, detail = null, emptyText = 'No scores yet. Be the first!' } = {}) {
        tbody.innerHTML = ''

        if (!rows || !rows.length) {
            tbody.appendChild(Tux.el('tr', {}, [Tux.el('td', { colSpan: 4, className: 'tux-empty' }, [emptyText])]))
            return
        }

        rows.forEach((row, i) => {
            const me = highlightName && row.name.toLowerCase() === highlightName.toLowerCase()
            const cells = [`#${i + 1}`, row.name, Tux.format.number(row.score), detail ? detail(row) : '']
            // textContent only, so names can't inject html
            tbody.appendChild(Tux.el('tr', { className: me ? 'tux-me' : '' }, cells.map((text) => Tux.el('td', {}, [String(text)]))))
        })
    }

    Tux.leaderboard = { http, local, render }
})()

// ---------- branding.js ----------
;(() => {
    // the tux.js mark: a penguin on a warm amber-to-coral badge (reads on dark and light backgrounds)
    const LOGO_SVG = `
<svg class="tux-logo" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
        <linearGradient id="tux-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffc23d"/>
            <stop offset="1" stop-color="#ff5a3c"/>
        </linearGradient>
        <linearGradient id="tux-logo-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#tux-logo-bg)"/>
    <rect x="2" y="2" width="60" height="30" rx="17" fill="url(#tux-logo-shine)"/>
    <!-- penguin -->
    <path d="M32 11c-9 0-14.5 7.5-14.5 17 0 4-1.8 7.5-3.6 11.5-1.6 3.6-.6 8 3.6 10.2C21 51.8 26 53.5 32 53.5s11-1.7 14.5-3.8c4.2-2.2 5.2-6.6 3.6-10.2-1.8-4-3.6-7.5-3.6-11.5C46.5 18.5 41 11 32 11z" fill="#1b1528"/>
    <path d="M32 26c-6.2 0-9.5 5.6-9.5 12.2S26.4 50.5 32 50.5s9.5-5.7 9.5-12.3S38.2 26 32 26z" fill="#fff7ea"/>
    <circle cx="27.2" cy="20.5" r="3.6" fill="#fff7ea"/>
    <circle cx="36.8" cy="20.5" r="3.6" fill="#fff7ea"/>
    <circle cx="28" cy="21.2" r="1.8" fill="#1b1528"/>
    <circle cx="36" cy="21.2" r="1.8" fill="#1b1528"/>
    <path d="M27.5 25.6Q32 23.4 36.5 25.6L32 30.4Z" fill="#ffb020" stroke="#1b1528" stroke-width="1" stroke-linejoin="round"/>
    <path d="M21.5 52.5h8.5c.8 0 1 1.3 0 1.8-2.2 1-6.2 1-8.5 0-1-.5-.8-1.8 0-1.8zM34 52.5h8.5c.8 0 1 1.3 0 1.8-2.3 1-6.3 1-8.5 0-1-.5-.8-1.8 0-1.8z" fill="#1b1528"/>
</svg>`

    const branding = {
        logoSvg: LOGO_SVG,

        // "tux.js" wordmark with the logo
        wordmark() {
            return Tux.el('div', { className: 'tux-wordmark', html: `${LOGO_SVG}<span>tux<b>.js</b></span>` })
        },

        // small "Powered by tux.js · by hisuperaman" line for menus
        badge() {
            return Tux.el('a', {
                className: 'tux-badge',
                href: Tux.url,
                target: '_blank',
                rel: 'noopener',
                html: `${LOGO_SVG}<span>Powered by <b>tux.js</b> · by ${Tux.author}</span>`,
            })
        },

        // full screen intro, tap to skip. resolves when it's gone
        splash({ duration = 1600 } = {}) {
            return new Promise((resolve) => {
                const splash = Tux.el('div', { className: 'tux-splash' }, [
                    Tux.el('div', { className: 'tux-splash-inner' }, [
                        branding.wordmark(),
                        Tux.el('div', { className: 'tux-splash-by' }, [`by ${Tux.author}`]),
                        Tux.el('div', { className: 'tux-splash-bar' }, [Tux.el('i')]),
                    ]),
                ])
                splash.style.setProperty('--tux-splash-time', `${duration}ms`)
                document.body.appendChild(splash)

                let done = false
                const close = () => {
                    if (done) return
                    done = true
                    splash.classList.add('tux-splash-out')
                    setTimeout(() => {
                        splash.remove()
                        resolve()
                    }, 400)
                }
                splash.addEventListener('pointerdown', close)
                setTimeout(close, duration)
            })
        },
    }

    Tux.branding = branding
})()

// ---------- game.js ----------
;(() => {
    /*
     * Base class for a canvas game. It owns the canvas, the loop, the
     * world-to-screen scaling, input, pause and screen shake.
     *
     *   class MyGame extends Tux.Game {
     *       reset(options) { ... }          // new run (options from start())
     *       update(realDt) { ... }          // while playing / dying
     *       idle(realDt) { ... }            // behind menus
     *       render(ctx) { ... }             // draw in world units (world.width x world.height)
     *   }
     *
     * fit: 'letterbox' keeps black bars where the screen's shape differs from the world's,
     *      'extend' shows the area around the world instead; draw scenery over this.viewport there.
     *      The world itself (gameplay) stays the same size either way.
     *
     *   const game = new MyGame({ world: { width: 1280, height: 720 }, bindings: { ... } })
     *   game.on('gameover', (result) => ...)
     *   game.start({ seed })
     *
     * States: menu -> playing -> (paused) -> dying -> over
     * Events: start, pause, resume, quit, gameover
     */
    class Game extends Tux.Emitter {
        constructor({ canvas = null, world = { width: 1280, height: 720 }, fit = 'letterbox', fps = 60, background = 'black', bindings = {}, pauseAction = 'pause', pauseOnHide = true, pauseDim = 0.45 } = {}) {
            super()

            this.canvas = canvas || document.body.appendChild(Tux.el('canvas', { className: 'tux-canvas' }))
            this.canvas.classList.add('tux-canvas')
            this.ctx = this.canvas.getContext('2d')

            if (!['letterbox', 'extend'].includes(fit)) throw new Error(`Tux.Game: fit must be 'letterbox' or 'extend', got '${fit}'`)
            this.world = world
            this.fit = fit
            this.background = background
            this.pauseAction = pauseAction
            this.pauseDim = pauseDim

            this.size = { width: 0, height: 0 }
            this.view = { scale: 1, x: 0, y: 0 }
            this.viewport = { x: 0, y: 0, width: world.width, height: world.height } // whole screen, in world units

            this.input = new Tux.Input({ target: this.canvas, bindings: { [pauseAction]: ['KeyP', 'Escape'], ...bindings } })

            this.state = 'menu'
            this.shakeAmount = 0
            this.shakeDecay = 30

            this.targetFrameTime = Math.floor(1000 / fps)
            this.lastPaintTime = 0

            this.#resize()
            window.addEventListener('resize', () => this.#resize())

            if (pauseOnHide) {
                // switching apps / tabs pauses the run
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) this.pause()
                })
            }

            requestAnimationFrame(this.#loop)
        }

        // ---------- override these ----------
        reset(options) { }
        update(realDt) { }
        idle(realDt) { }
        render(ctx) { }

        // ---------- lifecycle ----------

        get isPlaying() {
            return this.state === 'playing' || this.state === 'dying'
        }

        start(options = {}) {
            this.reset(options)
            this.input.reset()
            this.shakeAmount = 0
            this.state = 'playing'
            this.emit('start', options)
        }

        pause() {
            if (this.state !== 'playing') return
            this.state = 'paused'
            this.input.reset()
            this.emit('pause')
        }

        resume() {
            if (this.state !== 'paused') return
            this.state = 'playing'
            this.input.reset()
            this.emit('resume')
        }

        // leave the run without finishing it
        quit() {
            this.state = 'menu'
            this.input.reset()
            this.emit('quit')
        }

        // end of the run, result goes to 'gameover' listeners (e.g. Tux.Arcade submits it)
        finish(result) {
            this.state = 'over'
            this.emit('gameover', result)
        }

        // ---------- helpers ----------

        shake(amount) {
            this.shakeAmount = Math.max(this.shakeAmount, amount)
        }

        screenToWorld(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect()
            return {
                x: (clientX - rect.left - this.view.x) / this.view.scale,
                y: (clientY - rect.top - this.view.y) / this.view.scale,
            }
        }

        get pointer() {
            return this.screenToWorld(this.input.pointer.x, this.input.pointer.y)
        }

        // ---------- internals ----------

        #resize() {
            const dpr = window.devicePixelRatio || 1
            const width = window.innerWidth
            const height = window.innerHeight

            this.canvas.width = width * dpr
            this.canvas.height = height * dpr
            this.canvas.style.width = width + 'px'
            this.canvas.style.height = height + 'px'
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            this.size.width = width
            this.size.height = height

            // fit the world in the screen, letterboxed
            const scale = Math.min(width / this.world.width, height / this.world.height)
            this.view = {
                scale,
                x: (width - this.world.width * scale) / 2,
                y: (height - this.world.height * scale) / 2,
            }
            this.viewport = {
                x: -this.view.x / scale,
                y: -this.view.y / scale,
                width: width / scale,
                height: height / scale,
            }
        }

        #loop = (timestamp) => {
            requestAnimationFrame(this.#loop)

            if ((timestamp - this.lastPaintTime) < this.targetFrameTime - 1) return

            // real seconds since last frame, capped so a hidden tab doesn't jump
            const realDt = this.lastPaintTime ? Math.min((timestamp - this.lastPaintTime) / 1000, 1 / 20) : 1 / 60
            this.lastPaintTime = timestamp

            this.#frame(realDt)
        }

        #frame(realDt) {
            if (this.input.consume(this.pauseAction)) {
                if (this.state === 'playing') this.pause()
                else if (this.state === 'paused') this.resume()
            }

            if (this.isPlaying) {
                this.update(realDt)
                this.shakeAmount = Math.max(0, this.shakeAmount - realDt * this.shakeDecay)
            }
            else if (this.state === 'menu' || this.state === 'over') {
                this.idle(realDt)
            }

            this.#draw()
        }

        #draw() {
            const ctx = this.ctx
            const { width, height } = this.world

            ctx.fillStyle = this.background
            ctx.fillRect(0, 0, this.size.width, this.size.height)

            ctx.save()
            ctx.translate(this.view.x, this.view.y)
            ctx.scale(this.view.scale, this.view.scale)
            const clip = this.fit === 'extend' ? this.viewport : { x: 0, y: 0, width, height }
            ctx.beginPath()
            ctx.rect(clip.x, clip.y, clip.width, clip.height)
            ctx.clip()

            if (this.shakeAmount > 0) {
                const s = this.shakeAmount
                ctx.translate(Tux.math.randomRange(-s, s), Tux.math.randomRange(-s, s))
            }

            this.render(ctx)

            if (this.state === 'paused' && this.pauseDim) {
                ctx.fillStyle = `rgba(0,0,0,${this.pauseDim})`
                ctx.fillRect(clip.x - 50, clip.y - 50, clip.width + 100, clip.height + 100)
            }

            ctx.restore()
        }
    }

    Tux.Game = Game
})()

// ---------- arcade.js ----------
;(() => {
    const el = Tux.el
    const icon = (name) => Tux.icons.make(name)

    /*
     * The ready-made game shell: start menu with a name box (no login), pause menu,
     * game over screen and a top-N leaderboard (see Tux.leaderboard for adapters).
     * It builds all the html itself, so a game page only needs its canvas code.
     *
     *   new Tux.Arcade({
     *       game,                                   // your Tux.Game
     *       id: 'my_game',                          // used for the saved name / local scores
     *       leaderboard: Tux.leaderboard.http('/api/my_game'),   // or .local(), your own adapter, or false
     *       title: 'My <span>Game</span>',
     *       tagline: 'One line about it.',
     *       help: [['A / D', 'move'], ['Space', 'jump']],
     *       sounds, touch,                          // optional Tux.SoundBank / Tux.TouchControls
     *       payload: (result) => ({ duration: result.duration, kills: result.kills }),
     *       stats: (result) => `${result.kills.length} kills`,
     *       detail: (row) => `${row.kills} kills`,  // extra leaderboard column
     *   })
     *
     * The game calls game.finish({ score, ...anything }) when the run ends.
     * Customise further with onMenu(panel) / onGameOver(panel, result), or add your
     * own overlays with arcade.screens.add(name, element).
     */
    class Arcade {
        constructor({
            game, id, leaderboard = undefined, storagePrefix = null,
            title = 'Game', tagline = '', help = [], note = '',
            sounds = null, touch = null,
            payload = null, stats = null, detail = null,
            boardSize = 20, namePattern = /^[A-Za-z0-9 _.\-]{1,16}$/, namePlaceholder = 'e.g. Ace',
            splash = true, fullscreenOnPlay = true, orientationGuard = true, touchHintMs = 4000,
            onMenu = null, onGameOver = null,
        }) {
            this.game = game
            this.id = id
            this.prefix = storagePrefix || id
            // no adapter given: keep scores in this browser. false: no leaderboard at all
            this.leaderboard = leaderboard === undefined ? Tux.leaderboard.local({ key: `${this.prefix}-scores`, size: boardSize }) : leaderboard
            this.sounds = sounds
            this.touch = touch
            this.payload = payload || (({ score, ...rest }) => rest)
            this.stats = stats
            this.detail = detail
            this.boardSize = boardSize
            this.namePattern = namePattern
            this.fullscreenOnPlay = fullscreenOnPlay
            this.touchHintMs = touchHintMs
            this.onGameOver = onGameOver

            this.run = null
            this.playerName = Tux.storage.get(`${this.prefix}-name`, '')

            this.#buildScreens({ title, tagline, help, note, namePlaceholder })
            if (onMenu) onMenu(this.menuPanel)

            this.screens = new Tux.Screens({ menu: this.menu, over: this.over, pause: this.pauseScreen, board: this.board })
            this.screens.show('menu')
            Tux.icons.render()

            this.#wireGame()
            this.#wireTouch()
            if (orientationGuard) Tux.orientationGuard()
            if (splash) Tux.branding.splash()
        }

        // ---------- building ----------

        #panel(wide, children) {
            return el('div', { className: 'tux-overlay' }, [
                el('div', { className: `tux-panel ${wide ? 'tux-wide' : ''}` }, children),
            ])
        }

        #button(label, iconName, onClick, primary = false) {
            return el('button', { className: `tux-btn ${primary ? 'tux-primary' : ''}`, onclick: onClick }, [icon(iconName), label])
        }

        #buildScreens({ title, tagline, help, note, namePlaceholder }) {
            // menu
            this.nameInput = el('input', { type: 'text', maxLength: 16, placeholder: namePlaceholder, autocomplete: 'off', spellcheck: false, value: this.playerName, id: 'tux-name' })
            this.nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.play()
            })
            this.nameError = el('div', { className: 'tux-error-text' })
            this.playButton = this.#button('Play', 'play', () => this.play(), true)
            this.muteButton = el('button', { className: 'tux-btn tux-small', onclick: () => this.#toggleMute() })

            const iosHint = Tux.fullscreen.isIOS && !Tux.fullscreen.standalone && Tux.device.isTouch()
                ? el('p', { className: 'tux-ios-hint' }, [icon('share'), el('span', { html: 'For fullscreen: tap Share, then <b>Add to Home Screen</b>, and play from there.' })])
                : null

            this.menu = this.#panel(false, [
                el('h1', { html: title }),
                tagline ? el('p', { className: 'tux-tagline' }, [tagline]) : null,
                el('label', { htmlFor: 'tux-name' }, ['Your name']),
                this.nameInput,
                this.nameError,
                this.playButton,
                this.leaderboard ? this.#button('Leaderboard', 'trophy', () => this.openLeaderboard()) : null,
                help.length ? el('div', { className: 'tux-help' }, help.map(([keys, text]) => el('div', {}, [el('b', {}, [keys]), ` ${text}`]))) : null,
                note ? el('p', { className: 'tux-note' }, [note]) : null,
                iosHint,
                this.sounds ? this.muteButton : null,
                Tux.branding.badge(),
            ])
            this.menuPanel = this.menu.firstChild
            this.#updateMuteButton()

            // game over
            this.finalScore = el('div', { className: 'tux-big-score' }, ['0'])
            this.finalStats = el('div', { className: 'tux-stats' })
            this.status = el('div', { className: 'tux-status' })
            this.overBoard = el('tbody')
            this.againButton = this.#button('Play again', 'rotate-ccw', () => this.play(), true)
            this.over = this.#panel(true, [
                el('h2', {}, ['Game Over']),
                this.finalScore,
                this.finalStats,
                this.status,
                el('table', { className: 'tux-board' }, [this.overBoard]),
                el('div', { className: 'tux-row' }, [this.againButton, this.#button('Menu', 'house', () => this.screens.show('menu'))]),
                Tux.branding.badge(),
            ])
            this.overPanel = this.over.firstChild

            // pause
            this.pauseScreen = this.#panel(false, [
                el('h2', {}, [icon('pause'), 'Paused']),
                this.#button('Resume', 'play', () => this.game.resume(), true),
                this.#button('Restart', 'rotate-ccw', () => {
                    this.run = null // the old run is dropped, play() starts a fresh one
                    this.play()
                }),
                this.#button('Menu', 'house', () => {
                    this.run = null
                    this.game.quit()
                    this.screens.show('menu')
                }),
                el('p', { className: 'tux-note' }, ['Restarting or leaving ends this run without saving the score.']),
            ])

            // leaderboard
            this.boardBody = el('tbody')
            this.board = this.#panel(true, [
                el('h2', {}, [icon('trophy'), `Top ${this.boardSize}`]),
                el('table', { className: 'tux-board' }, [this.boardBody]),
                this.#button('Back', 'arrow-left', () => this.screens.show('menu')),
            ])

            ;[this.menu, this.over, this.pauseScreen, this.board].forEach((s) => document.body.appendChild(s))
        }

        #updateMuteButton() {
            if (!this.sounds) return
            const muted = this.sounds.muted
            Tux.icons.set(this.muteButton, muted ? 'volume-x' : 'volume-2', muted ? 'Sound off' : 'Sound on')
        }

        #toggleMute() {
            this.sounds.toggleMute()
            this.#updateMuteButton()
        }

        // ---------- wiring ----------

        #wireGame() {
            const game = this.game
            const sounds = this.sounds

            game.on('start', () => {
                if (sounds) sounds.startMusic()
                if (this.touch && this.touch.enabled) this.touch.showHints(this.touchHintMs)
            })
            game.on('pause', () => {
                if (sounds) sounds.stopMusic()
                if (this.touch && this.touch.enabled) this.touch.hideHints()
                this.screens.show('pause')
            })
            game.on('resume', () => {
                if (sounds) sounds.resumeMusic()
                this.screens.show(null)
            })
            game.on('quit', () => {
                if (sounds) {
                    sounds.stopMusic()
                    sounds.setRate(1)
                }
                if (this.touch && this.touch.enabled) this.touch.hideHints()
            })
            game.on('gameover', (result) => {
                if (sounds) {
                    sounds.stopMusic()
                    sounds.setRate(1)
                }
                this.#handleGameOver(result)
            })
        }

        #wireTouch() {
            const touch = this.touch
            if (!touch || !touch.enabled) return

            touch.addButton({ id: 'pause', icon: 'pause', label: 'Pause', dock: true, onPress: () => this.game.pause() })

            if (Tux.fullscreen.supported && !Tux.fullscreen.standalone) {
                const fs = touch.addButton({ id: 'fullscreen', icon: 'maximize', label: 'Fullscreen', dock: true, onPress: () => Tux.fullscreen.toggle() })
                Tux.fullscreen.onChange(() => fs.setIcon(Tux.fullscreen.active ? 'minimize' : 'maximize'))
            }
        }

        // ---------- flow ----------

        setStatus(kind, text) {
            const icons = { ok: 'circle-check', error: 'circle-alert', loading: 'loader-circle' }
            this.status.className = `tux-status tux-${kind}`
            Tux.icons.set(this.status, icons[kind], text)
        }

        async play() {
            const name = this.nameInput.value.trim().replace(/\s+/g, ' ')
            if (!this.namePattern.test(name)) {
                this.nameError.textContent = 'Enter a name: 1-16 letters, numbers, spaces or _ . -'
                this.screens.show('menu')
                this.nameInput.focus()
                return
            }
            this.nameError.textContent = ''
            this.playerName = name
            Tux.storage.set(`${this.prefix}-name`, name)

            // has to happen right inside the tap, browsers only allow fullscreen from a user gesture
            if (this.fullscreenOnPlay && Tux.device.isTouch()) Tux.fullscreen.enter()

            this.playButton.disabled = this.againButton.disabled = true

            let seed = null
            this.run = null
            if (this.leaderboard) {
                try {
                    this.run = (await this.leaderboard.startRun()) || {}
                    seed = this.run.seed
                }
                catch (err) {
                    // backend down: still playable, just not submitted
                    this.run = null
                }
            }
            if (seed === null || seed === undefined) seed = Tux.rng.randomSeed()

            this.playButton.disabled = this.againButton.disabled = false
            if (document.activeElement) document.activeElement.blur()

            this.screens.show(null)
            this.game.start({ seed, name })
        }

        async #handleGameOver(result) {
            this.screens.show('over')
            this.finalScore.textContent = Tux.format.number(result.score)
            this.finalStats.textContent = this.stats ? this.stats(result) : ''
            this.overBoard.innerHTML = ''
            if (this.onGameOver) this.onGameOver(this.overPanel, result)

            if (!this.leaderboard) {
                this.status.className = 'tux-status tux-hidden'
                return
            }
            if (!this.run) {
                this.setStatus('error', 'Offline - score was not submitted')
                return
            }

            const verifies = this.leaderboard.verifies
            this.setStatus('loading', verifies ? 'Verifying score...' : 'Saving score...')
            try {
                const res = await this.leaderboard.submit(this.run, this.playerName, this.payload(result), result)
                const score = Tux.format.number(res.score)
                const word = verifies ? 'Verified' : 'Saved'
                if (!res.score) this.setStatus('ok', 'Nothing scored, nothing to rank')
                else if (res.rank && res.best > res.score) this.setStatus('ok', `${word} ${score} - your best (${Tux.format.number(res.best)}) is #${res.rank}`)
                else if (res.rank) this.setStatus('ok', `${word} ${score} - you're #${res.rank} on the leaderboard!`)
                else this.setStatus('ok', `${word} ${score} - not in the top ${this.boardSize} (yet)`)
                Tux.leaderboard.render(this.overBoard, res.leaderboard, { highlightName: this.playerName, detail: this.detail })
            }
            catch (err) {
                this.setStatus('error', err.message)
            }
            finally {
                this.run = null
            }
        }

        async openLeaderboard() {
            this.screens.show('board')
            this.boardBody.innerHTML = ''
            this.boardBody.appendChild(el('tr', {}, [el('td', { colSpan: 4, className: 'tux-empty' }, ['Loading...'])]))
            try {
                Tux.leaderboard.render(this.boardBody, await this.leaderboard.top(), { highlightName: this.playerName, detail: this.detail })
            }
            catch (err) {
                this.boardBody.innerHTML = ''
                this.boardBody.appendChild(el('tr', {}, [el('td', { colSpan: 4, className: 'tux-empty' }, ['Could not load leaderboard'])]))
            }
        }
    }

    Tux.Arcade = Arcade
})()
