from flask import Flask, render_template, send_from_directory

app = Flask(__name__, static_folder='static', template_folder='templates')
import os
import shutil

# Try to register API blueprint if present
try:
    from api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
except Exception as e:
    print('API blueprint not registered:', e)


def _ensure_static_assets():
    """
    Ensure required assets exist under static/ so Render (gunicorn) can serve them:
    - Copy images/ -> static/images/ (non-destructive)
    - Copy lessons/*.json -> static/lessons/
    - Copy gradeX-lessons.js -> static/
    This runs at import time as well so it works under gunicorn (no __main__ needed).
    """
    base_dir = os.path.dirname(__file__)

    # Images
    src_images = os.path.join(base_dir, 'images')
    dst_images = os.path.join(base_dir, 'static', 'images')
    if os.path.isdir(src_images):
        os.makedirs(dst_images, exist_ok=True)
        for name in os.listdir(src_images):
            src = os.path.join(src_images, name)
            dst = os.path.join(dst_images, name)
            if os.path.isfile(src) and not os.path.exists(dst):
                try:
                    shutil.copy2(src, dst)
                except Exception:
                    pass

    # Lessons JSON
    src_lessons = os.path.join(base_dir, 'lessons')
    dst_lessons = os.path.join(base_dir, 'static', 'lessons')
    if os.path.isdir(src_lessons):
        os.makedirs(dst_lessons, exist_ok=True)
        for name in os.listdir(src_lessons):
            if not name.lower().endswith('.json'):
                continue
            src = os.path.join(src_lessons, name)
            dst = os.path.join(dst_lessons, name)
            if os.path.isfile(src) and not os.path.exists(dst):
                try:
                    shutil.copy2(src, dst)
                except Exception:
                    pass

    # Grade JS files
    grade_js_files = [
        'grade5-lessons.js',
        'grade6-lessons.js',
        'grade7-lessons.js',
        'grade8-lessons.js',
    ]
    for js_name in grade_js_files:
        src = os.path.join(base_dir, js_name)
        dst = os.path.join(base_dir, 'static', js_name)
        if os.path.isfile(src) and not os.path.exists(dst):
            try:
                shutil.copy2(src, dst)
            except Exception:
                pass

    # Other root JS files used by templates
    root_js_files = [
        'speaking-beautiful.js',
        'speaking.js',
        'speaking-new.js',
        'reading.js',
        'dashboard.js',
        'lessons.js',
        'script.js',
    ]
    for js_name in root_js_files:
        src = os.path.join(base_dir, js_name)
        dst = os.path.join(base_dir, 'static', js_name)
        if os.path.isfile(src) and not os.path.exists(dst):
            try:
                shutil.copy2(src, dst)
            except Exception:
                pass

    # Root CSS files used by templates
    root_css_files = [
        'dashboard.css',
        'lessons.css',
        'style.css',
        'speaking-minimal.css',
        'grade-styles.css',
    ]
    for css_name in root_css_files:
        src = os.path.join(base_dir, css_name)
        dst = os.path.join(base_dir, 'static', css_name)
        if os.path.isfile(src) and not os.path.exists(dst):
            try:
                shutil.copy2(src, dst)
            except Exception:
                pass


# Page routes
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/grades/grade5')
@app.route('/grades/grade5.html')
def grade5():
    return render_template('grades/grade5.html')


@app.route('/grades/grade6')
@app.route('/grades/grade6.html')
def grade6():
    return render_template('grades/grade6.html')


@app.route('/grades/grade7')
@app.route('/grades/grade7.html')
def grade7():
    return render_template('grades/grade7.html')


@app.route('/grades/grade8')
@app.route('/grades/grade8.html')
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

# Convenience routes for legacy links
@app.route('/dashboard.html')
def dashboard_legacy():
    return render_template('dashboard.html')

@app.route('/lessons')
@app.route('/lessons.html')
def lessons_page():
    return render_template('lessons.html')

# Static alias routes so legacy relative paths still work (Render)
@app.route('/images/<path:filename>')
def images_alias(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'images'), filename)

@app.route('/lessons/<path:filename>')
def lessons_alias(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'lessons'), filename)


# Run asset preparation at import time so it works on Render/gunicorn
_ensure_static_assets()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


