from flask import Flask, render_template

app = Flask(__name__, static_folder='static', template_folder='templates')

# Try to register API blueprint if present
try:
    from api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
except Exception as e:
    print('API blueprint not registered:', e)


# Page routes
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/grade5')
def grade5():
    return render_template('grades/grade5.html')


@app.route('/grade6')
def grade6():
    return render_template('grades/grade6.html')


@app.route('/grade7')
def grade7():
    return render_template('grades/grade7.html')


@app.route('/grade8')
def grade8():
    return render_template('grades/grade8.html')


@app.route('/reading')
def reading():
    return render_template('reading.html')


@app.route('/practice-speaking')
def practice_speaking():
    return render_template('practice-speaking.html')


@app.route('/speaking')
def speaking():
    return render_template('speaking.html')


@app.route('/speaking-beautiful')
def speaking_beautiful():
    return render_template('speaking-beautiful.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
