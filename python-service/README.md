# Python service (Flask)

Path: `python-service` (copied from the original `Nova pasta`).

## Setup
1. `cd python-service`
2. `python -m venv .venv`
3. `./.venv/Scripts/activate`  (Windows)
4. `pip install -r requirements.txt`

## Run (dev)
```
$env:FLASK_SECRET_KEY="change-me"      # defaut is csc-change-me
$env:DB_PATH="app.db"                  # optional; default is app.db in this folder
python app.py                           # listens on 127.0.0.1:5000
```

## Run (prod style)
```
./.venv/Scripts/activate
pip install gunicorn
$env:PORT=5000
$env:FLASK_SECRET_KEY="change-me"
gunicorn app:app
```

## Notes
- SQLite file is `app.db` in this folder (ignored by .gitignore).
- Static/uploads stay under `python-service/static/uploads/` (already ignored).
- Env vars reference in `render.yaml`: SMTP_* , MASTER_ADMIN_*, AUTH_ALLOW_PUBLIC_SIGNUP, GOOGLE_*.
- Uses Flask, Pillow, OpenPyXL, cryptography, reportlab.
