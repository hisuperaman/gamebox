const { clamp, lerp, randomRange, randomInt: getRandomInt } = Tux.math
const { rects: isCollision, pointInRect, pointInCircle } = Tux.collide
const formatTime = Tux.format.time

// logical world size, the canvas is scaled to fit the screen
const WORLD = { width: 1280, height: 720 }

// ---- game rules (must match backend.py on the server) ----
const POINTS = { grunt: 100, runner: 150, heavy: 300 }
const HEADSHOT_MULT = 1.5
const COMBO_WINDOW = 2.5
const COMBO_STEP = 0.25
const COMBO_MAX_STEPS = 8

// One enemy of the spawn plan. The server rebuilds the same list from the
// seed (build_spawn_schedule in backend.py) to check our kills - keep them in sync.
function nextEnemy(rng, i, previous) {
    const rType = rng()
    const rInterval = rng()
    const rSide = rng()
    const rX = rng()

    const heavyChance = Math.min(0.25, 0.04 + i * 0.004)
    const runnerChance = Math.min(0.3, 0.1 + i * 0.005)

    let type = 'grunt'
    if (i >= 8 && rType < heavyChance) {
        type = 'heavy'
    }
    else if (i >= 4 && rType < heavyChance + runnerChance) {
        type = 'runner'
    }

    const side = rSide < 0.4 ? 'left' : rSide < 0.8 ? 'right' : 'top'

    const t = previous ? previous.nextT : 1.5
    const interval = Math.max(0.6, 2.4 - i * 0.03) * (0.75 + rInterval * 0.5)
    return { id: i, t, type, side, x: rX, nextT: t + interval }
}

function killScore(type, headshot, streak) {
    const mult = 1 + COMBO_STEP * Math.min(streak, COMBO_MAX_STEPS)
    const base = POINTS[type] * (headshot ? HEADSHOT_MULT : 1)
    return Math.round(base * mult)
}