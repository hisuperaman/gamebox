// Builds www/ (what Capacitor ships inside the app) from the shared game in the gamebox repo.
// The game's code is never copied by hand: always edit it in gamebox, then run `npm run build`.
//
//   gameDir/index.html     Flask/Jinja page -> plain www/index.html (url_for() calls become relative paths)
//   gameDir/static/**      -> www/**
//   sharedStaticDir/...    -> www/shared/...  (only what index.html uses: tux.js, fonts, nipplejs, lucide)
//   native.js              -> www/native.js   (android-only glue, e.g. the back button)
//
// Paths in game.config.json are relative to this folder.
// The app is offline-only: the page gets no leaderboard server, so main.js turns off the
// leaderboard and the name box (the website keeps its global leaderboard).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(fs.readFileSync(path.join(here, 'game.config.json'), 'utf8'))
const gameDir = path.resolve(here, config.gameDir)
const sharedDir = path.resolve(here, config.sharedStaticDir)
const out = path.join(here, 'www')

const noJunk = { recursive: true, filter: (src) => !['.DS_Store', 'Thumbs.db'].includes(path.basename(src)) }
const fail = (msg) => { console.error(`build-www: ${msg}`); process.exit(1) }
if (!fs.existsSync(path.join(gameDir, 'index.html'))) fail(`no index.html in gameDir (${gameDir}); fix game.config.json`)
if (!fs.existsSync(sharedDir)) fail(`sharedStaticDir not found (${sharedDir}); fix game.config.json`)

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

// 1. the game's own files
fs.cpSync(path.join(gameDir, 'static'), out, noJunk)

// 2. the page: render the few Jinja expressions it uses, refuse anything else
const shared = new Set()
let html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8')
    .replace(/\{\{\s*url_for\('\.static',\s*filename='([^']*)'\)\s*\}\}/g, (_, file) => file)
    .replace(/\{\{\s*url_for\('static',\s*filename='([^']*)'\)\s*\}\}/g, (_, file) => {
        shared.add(file)
        return `shared/${file}`
    })
    .replace(/\{\{\s*api_base or '[^']*'\s*\}\}/g, '') // offline: no leaderboard server
const leftover = html.match(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/)
if (leftover) fail(`index.html uses Jinja this script doesn't understand: ${leftover[0]} - teach build-www.mjs about it`)

// 3. shared files the page uses (whole library folder for vendor/<lib>/..., since css/js load siblings)
for (const file of shared) {
    const parts = file.split('/')
    const rel = parts[0] === 'vendor' && parts.length > 2 ? parts.slice(0, 2).join('/') : file
    const src = path.join(sharedDir, rel)
    if (!fs.existsSync(src)) fail(`index.html needs static/${file}, which doesn't exist`)
    fs.cpSync(src, path.join(out, 'shared', rel), noJunk)
}

// 4. android glue
fs.copyFileSync(path.join(here, 'native.js'), path.join(out, 'native.js'))
if (!html.includes('</body>')) fail('index.html has no </body>')
html = html.replace('</body>', '    <script src="native.js"></script>\n</body>')

fs.writeFileSync(path.join(out, 'index.html'), html)
console.log(`build-www: www/ built from ${path.relative(here, gameDir)} (offline, no leaderboard)`)
