import importlib
import json
from pathlib import Path

from flask import Blueprint, Flask, render_template, request
from git import Repo
from jinja2 import ChoiceLoader, FileSystemLoader

GAMES_DIR = Path(__file__).resolve().parent / 'games'

app = Flask(__name__)
# game pages are rendered as '<name>/index.html' straight out of games/
app.jinja_loader = ChoiceLoader([app.jinja_loader, FileSystemLoader(GAMES_DIR)])


def register_games():
    """Every games/<name>/ folder with a game.json is a game:
        game.json     {"title": ..., "thumbnail": "thumb.png", "order": n}  (order = homepage position)
        index.html    the page, served at /game/<name>
        static/       served at /game/<name>/static/ (url_for('.static', filename=...) in index.html)
        backend.py    optional; must define a Blueprint `bp`, which gets registered as-is
    """
    games = []
    for folder in sorted(GAMES_DIR.iterdir()):
        meta_file = folder / 'game.json'
        if not meta_file.is_file():
            continue
        name = folder.name
        bp = Blueprint(name, __name__, url_prefix=f'/game/{name}',
                       static_folder=str(folder / 'static'), static_url_path='/static')
        bp.add_url_rule('', 'page', lambda name=name: render_template(f'{name}/index.html'))
        app.register_blueprint(bp)

        if (folder / 'backend.py').is_file():
            app.register_blueprint(importlib.import_module(f'games.{name}.backend').bp)

        games.append({'id': name, **json.loads(meta_file.read_text())})
    return sorted(games, key=lambda g: g.get('order', float('inf')))


GAMES = register_games()


@app.route('/webhook', methods=['POST'])
def webhook():
    if request.method == 'POST':
        repo = Repo('.')
        git = repo.git
        git.checkout('main')
        git.stash()
        git.pull('origin', 'main', rebase=True)
        return '', 200
    else:
        return '', 400


@app.route('/')
def index():
    return render_template('index.html', games=GAMES)

# if __name__=='__main__':
#     app.run(debug=True)