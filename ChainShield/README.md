# ChainShield Transportation System

Real-time disruption prediction and route optimisation for logistics teams. ChainShield continuously
scores every in-transit shipment for disruption risk, flags problems **before**
delivery timelines are hit, and recommends optimized route adjustments — with a
live map, real-time alerts, team chat and an AI assistant.

Built to be deployed by any logistics company on its own server: one Docker
container, no paid services required.

## Stack

Python 3.10 · Flask · Flask-SQLAlchemy · SQLite · Flask-Login · Flask-WTF ·
Flask-SocketIO · APScheduler · Jinja2 · Bootstrap 5 · Leaflet.js · Chart.js ·
Google Gemini · OpenWeatherMap · Docker (Gunicorn + eventlet)

Front-end libraries are bundled in `app/static/vendor/`, so everything except the
map tiles works **offline** — useful on sites with unreliable internet.

## Features

| Module | What it does |
|---|---|
| **Risk engine** (`services/risk_engine.py`) | Every `RISK_SCAN_INTERVAL_SECONDS` (APScheduler) scores each in-transit shipment: `0.40·weather + 0.25·congestion + 0.20·cargo sensitivity + 0.15·lane history` → LOW / AT-RISK (≥30) / MEDIUM (≥50) / HIGH (≥70). Opens a disruption at AT-RISK+, escalates it if risk keeps rising. |
| **Route solver** (`services/route_solver.py`) | Builds hold / continue / reroute-via-hub (haversine detour) / mode-switch options and ranks them by `0.60·risk + 0.25·time + 0.15·cost`. Option #1 = recommended. |
| **Shipments** | Full CRUD (Flask-WTF validation), detail page with mini-map, on-demand risk scan, status updates by the assigned operator. |
| **Live map** | Leaflet map of shipments (colored by risk), hubs, routes and shaded disruption zones (radius by severity); refreshes over Socket.IO after every scan. |
| **Disruptions** | Ranked route options per disruption; managers apply one and the assigned operator is notified. |
| **Dashboards** | Admin overview (KPIs, 4 Chart.js charts, activity), role dashboard for managers/operators. Charts update live. |
| **Notifications** | Stored per user + pushed live (toast + bell badge) via Socket.IO rooms. |
| **Chat** | Direct messages between users, persisted and delivered instantly over Socket.IO. |
| **AI assistant** | Gemini answers grounded in a live data snapshot; built-in offline engine when no key / no internet. |
| **Admin panel** | Users (add, change role, deactivate), hubs (add/edit/delete), cargo types (CRUD with sensitivity weights), shipments, system config, activity log. |
| **Reports** | Disruption summary, resolution time per decision-maker, activity audit log and shipment risk report — date-range filter and CSV export (admin + manager). |
| **Demo mode** | "Trigger demo disruption" injects a severe weather event so a HIGH disruption appears instantly; `flask reset-demo` restores the demo data. |
| **Roles** | admin · manager · captain · pilot · driver · loco_pilot. Field operators only see their assigned shipments. Admin can't be self-registered. |

## Run locally (Windows)

```bat
cd chainshield-mca
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          &:: first time only; add GEMINI_API_KEY for Gemini
flask init-db
flask seed-db
python wsgi.py                  &:: or: flask run
```

Open http://localhost:5000. Use `python wsgi.py` for real websockets; `flask run` also works because Socket.IO falls back to polling.

## Run with Docker

```bash
docker compose up --build
docker compose exec web flask init-db
docker compose exec web flask seed-db
```

## Demo accounts (password `demo1234`)

| Email | Role | Sees |
|---|---|---|
| admin@chainshield.com | admin | everything + admin panel |
| manisha@chainshield.com | manager | all shipments, resolves disruptions |
| suresh@chainshield.com | driver | Road shipments assigned to him |
| ajay@chainshield.com | loco_pilot | Rail shipments |
| rohit@chainshield.com | pilot | Air shipments |
| karan@chainshield.com | captain | Sea shipments |

## CLI commands

| Command | Purpose |
|---|---|
| `flask init-db` | Create tables (+ additive schema patches) |
| `flask seed-db` | Demo users, 10 hubs, cargo types, 6 shipments with operators (safe to re-run) |
| `flask scan-risk` | Run one risk scan immediately |
| `flask reset-demo` | Move demo shipments back to their origin hubs, clear disruptions/notifications. Run this before a demo. |

## Configuration (`.env`)

`SECRET_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`),
`OPENWEATHER_API_KEY`, `RISK_SCAN_INTERVAL_SECONDS` (default 60),
`SIMULATE_MOVEMENT` (default true: shipments move toward their destination each
scan), `MOVEMENT_STEP_DEG` (default 0.15).

## Layout

```
app/
├── __init__.py        app factory, scheduler, CLI commands
├── config.py          dev / testing / production config
├── extensions.py      db, login, csrf, socketio, scheduler
├── models.py          User, Hub, CargoType, Shipment, Disruption,
│                      RouteSolution, Notification, Message, ActivityLog
├── forms.py           Flask-WTF forms
├── sockets.py         Socket.IO connect → per-user rooms
├── blueprints/        main (dashboards + admin), auth, shipments (+ live map),
│                      disruptions, notifications, chat, assistant
├── services/          risk_engine, route_solver, weather, notifier, stats, assistant
├── templates/
└── static/            css, js, vendor/ (bootstrap, leaflet, chart.js, socket.io)
```
