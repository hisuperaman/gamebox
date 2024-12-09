from flask import Flask, render_template, redirect, request, url_for
from git import Repo

app = Flask(__name__)

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
    return render_template('index.html')

@app.route('/game/<name>')
def game(name):
    return render_template(f'games/{name}.html') 

# if __name__=='__main__':
#     app.run(debug=True)