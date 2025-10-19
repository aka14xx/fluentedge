Fluent Edge — Omani English Tutor

This repository contains a static-ish Flask-backed site for practicing speaking and lessons.

Quick setup (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python .\webApp.py
```

To prepare for Render:

- Ensure `templates/` and `static/` exist (they do).
- `Procfile` should contain: `web: gunicorn webApp:app --workers 2`
- `requirements.txt` should list required packages (flask, flask-cors, gunicorn...)

Git push example (replace YOURUSERNAME):

```powershell
git init
git add .
git commit -m "Initial commit for Render deploy"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/fluentedge.git
git push -u origin main
```
