# ChainShield Transportation System — MCA Sem 3 Rebuild

Resilient logistics & dynamic supply chain optimization. This is a fresh,
from-scratch rebuild of the ChainShield concept for MCA Semester 3 (Group 59),
on a Flask + SQLite + Docker stack. It is fully independent of the original
FastAPI/React prototype, which remains untouched in the `backend/` and
`frontend/` folders one level up.

## Stack

Flask · Flask-SQLAlchemy · SQLite · Flask-Login · Flask-SocketIO ·
APScheduler · Flask-WTF · Jinja2 · Bootstrap 5 · Docker

## Run with Docker (recommended)

```bash
cd chainshield-mca
cp .env.example .env        # fill in SECRET_KEY at minimum
docker compose up --build
```

The app will be available at **http://localhost:5000**. The SQLite database
is persisted to `./instance/chainshield.db` on the host via a volume mount,
so it survives container rebuolds.

On first run, initialise and seed the database inside the running container:

```bash
docker compose exec web flask init-db
docker compose exec web flask seed-db   # creates admin@chainshield.com / demo1234
```

## Run locally without Docker

```bash
cd chainshield-mca
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
flask init-db
flask seed-db
flask run
```

## Project layout

```
chainshield-mca/
├── app/
│   ├── __init__.py          # application factory
│   ├── config.py            # environment-based configuration
│   ├── extensions.py        # db, login_manager, socketio, scheduler, csrf
│   ├── models.py            # SQLAlchemy models (matches the Data Dictionary
│   │                          in MCA_Sem3_Documentation)
│   ├── blueprints/          # auth, main, shipments, disruptions, admin,
│   │                          notifications, chat, assistant
│   ├── services/             # risk_engine.py, route_solver.py, weather.py
│   ├── templates/
│   └── static/
├── instance/                 # chainshield.db lives here (gitignored)
├── wsgi.py                   # entry point for flask run / gunicorn / Docker
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Status

Environment and Docker setup complete: the app boots, serves a login/register
flow backed by SQLite, and exposes a `/health` check. The risk engine,
disruption dashboards, route solver, live map, chat, and AI assistant are
placeholder blueprints/services — implemented in the next development phase.
