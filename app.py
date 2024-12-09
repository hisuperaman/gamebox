from flask import Flask, render_template, redirect, request, url_for
import git

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
    def webhook():
        if request.method == 'POST':
            repo = git.Repo('./gamebox')
            origin = repo.remotes.origin
            repo.create_head('main', 
        origin.refs.main).set_tracking_branch(origin.refs.main).checkout()
            origin.pull()
            return '', 200
        else:
            return '', 400

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game/<name>')
def game(name):
    return render_template(f'games/{name}.html') 

if __name__=='__main__':
    app.run(debug=True)