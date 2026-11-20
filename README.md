# GameBox

A collection of small browser games, served by one Flask app. Pick a game on the home page and it opens in a new tab.

## Games

| Game | Folder |
| --- | --- |
| My Friend Bullet | `games/my_friend_bullet` |
| Zig Zag | `games/zigzag` |
| Lost King | `games/lost_king` |
| Dodge Racing 2 | `games/dodge_racing_2` |
| Self Driving Car | `games/self_driving_car` |
| Retro Shooter | `games/retro_shooter` |
| Stick Hero | `games/stick_hero` |
| Flappy Bird | `games/flappy_bird` |
| Dodge Racing | `games/dodge_racing` |
| Tic Tac Toe (New) | `games/tic_tac_toe_new` |
| Snake Game | `games/snake_game` |
| Tic Tac Toe | `games/tic_tac_toe` |
| Snake Water Gun | `games/swg` |
| Flappy Block | `games/flappy_block` |

**My Friend Bullet** is a slow-motion side-scrolling shooter built with [tux.js](static/vendor/tuxjs/tux.js), a small canvas game kit. It has an online leaderboard, and the server re-checks every submitted score. It also ships as an offline Android app (no leaderboard, just your own high score), built from the same game code: see [`my_friend_bullet_android/`](my_friend_bullet_android/README.md).

## Running locally

Requires Python 3.10+.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app app run --debug
```

Then open <http://127.0.0.1:5000>.

The leaderboard database is created automatically at `data/gamebox.db` the first time it is used. The `data/` folder is git-ignored.

## Project structure

```
gamebox/
├── app.py              # Flask app: finds and registers every game in games/
├── requirements.txt
├── templates/          # home page + shared base layout
├── static/             # shared files: home page css/js, favicon, vendor libs (tux.js)
└── games/
    └── <name>/
        ├── game.json   # title, thumbnail, position on the home page
        ├── index.html  # the game page, served at /game/<name>
        ├── backend.py  # optional Flask blueprint for games that need a server
        └── static/     # the game's js, css, assets and thumbnail,
                        # served at /game/<name>/static/
```

Each game is self-contained: everything it needs lives in its own folder.

## Adding a game

1. Create `games/<name>/` (use `snake_case`, since the folder name becomes the URL).
2. Add a `game.json`:

   ```json
   {
       "title": "My New Game",
       "thumbnail": "thumb.png",
       "order": 15
   }
   ```

   `thumbnail` is a path inside the game's `static/` folder. `order` sets the position on the home page (lower comes first).
3. Add `index.html` and load the game's files with `url_for('.static', ...)`:

   ```html
   <script src="{{ url_for('.static', filename='js/main.js') }}"></script>
   ```

   Shared files (favicon, tux.js) use the app-wide `url_for('static', ...)`.
   In JavaScript, refer to assets by absolute path: `/game/<name>/static/assets/...`.
4. Optional: add a `backend.py` that defines a Flask `Blueprint` named `bp`. It is registered automatically. Give the blueprint a unique name (e.g. `<name>_api`) and a URL prefix like `/api/<name>`.
5. Restart the server. The game appears on the home page.

## Deployment

`POST /webhook` pulls the latest `main` branch from GitHub onto the server. Point a GitHub push webhook at it, and restart the app after pulls that change Python code.

## License

The code is released under the [MIT License](LICENSE).

Some games include third-party art, sound and fonts, which remain under their own licenses. See the credits files inside each game's folder where present (for example [`games/my_friend_bullet/static/assets/CREDITS.txt`](games/my_friend_bullet/static/assets/CREDITS.txt)).
