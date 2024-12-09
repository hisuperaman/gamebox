from flask import Flask, render_template, redirect, request, url_for

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game/<name>')
def game(name):
    return render_template(f'games/{name}.html') 

if __name__=='__main__':
    app.run(debug=True)