# ChainShield Transportation System — MCA Sem 3 Status Report
*Group 59 · Bhavik Visani, Diya Shah, Shruti Somani · as of September 7, 2026*

## Where things actually stand

The original Solution Challenge idea (Smart Supply Chains — a FastAPI/React/Firebase prototype called ChainShield) was set aside for academic submission on August 13, and the project is being rebuilt from scratch as your MCA Semester 3 deliverable, in a brand-new folder called `chainshield-mca` that sits alongside the old `backend/` and `frontend/` folders. The old prototype hasn't been touched, exactly as intended.

Real building started on August 16 with the environment and Docker setup, and the last actual code change on disk was to the login and register templates on August 24–25 — alongside the SRS document and the presentation, which were also finished around that date. Since then, for the last roughly two weeks, no further code has been written. The `chainshield-mca` folder is also not yet tracked in git (`git status` shows it as a completely untracked directory) — worth committing once you're back in it, so the work is actually version-controlled rather than just sitting on disk.

So in one line: the skeleton is built and working, authentication is real and tested, and the seven feature modules that make this project stand out (risk engine, disruption dashboards, route solver, live map, chat, AI assistant, admin panel) are scaffolded but not yet implemented.

## The manual — what's actually built, module by module

The app follows a standard Flask application-factory layout under `chainshield-mca/app/`. `create_app()` wires up the database, login manager, CSRF protection, and Socket.IO, then registers eight blueprints and exposes a `/health` endpoint. Two CLI commands exist for setup: `flask init-db` creates the tables, and `flask seed-db` creates a demo admin account (`admin@chainshield.com` / `demo1234`).

Authentication (`auth` blueprint) is the one fully working feature: register, login, logout, and a protected dashboard route, all backed by Flask-Login and Werkzeug password hashing, and you've actually tested it — there's a real `instance/chainshield.db` file (53 KB) that was written to as recently as August 25, which lines up with when you were testing register/login. The `main` blueprint serves the landing page.

The other six blueprints — `shipments`, `disruptions`, `admin`, `notifications`, `chat`, and `assistant` — exist as real Python files and are registered in the app, but each one currently just returns `{"module": "<name>", "status": "scaffolded"}` from a single stub route. There's no real logic, no database queries, and no templates behind any of them yet.

On the data side, `models.py` is genuinely complete and well thought out — it already defines `User`, `Hub`, `CargoType`, `Shipment`, `Disruption`, `RouteSolution`, `Notification`, `Message`, and `ActivityLog`, with the relationships between them (a shipment belongs to a hub and an operator, a disruption belongs to a shipment and can have multiple route solutions, and so on) already wired up. This is ahead of the blueprints — the schema is ready for the features to be built against.

On the services side, `risk_engine.py` has the actual scoring formula implemented and unit-testable (the weighted composite: 40% weather, 25% congestion, 20% cargo sensitivity, 15% history, with HIGH/MEDIUM/AT-RISK/LOW thresholds) — but the function that would actually scan all shipments and use it, `scan_all_shipments()`, is a deliberate placeholder that raises `NotImplementedError` until shipment data exists to score. `weather.py` is more built-out than the others: it calls OpenWeatherMap when an API key is configured and falls back to simulated severity values when it isn't, so the app is fully demoable without external keys. `route_solver.py` is a bare stub.

On the frontend side, only four templates exist: `base.html`, `index.html`, and the login/register pages. There are no templates yet for shipments, disruptions, the live map, chat, or the admin panel — so right now, a logged-in user can only see the landing page, since none of the feature pages have views to render.

Docker is set up and looks complete: a `Dockerfile` (Python 3.11-slim, Gunicorn with an eventlet worker for Socket.IO) and a `docker-compose.yml` that persists the SQLite file to the host. Per the project notes, the Docker build itself hasn't been verified end-to-end on your machine yet (only the underlying Flask app was confirmed working) — worth running `docker compose up --build` once to confirm it actually boots clean.

## Tech stack check

Here's the full pinned stack from `requirements.txt`, plus how it collaborates:

| Layer | Choice | Version |
|---|---|---|
| Language | Python | 3.10 (local dev venv) / 3.11 (Docker image) |
| Web framework | Flask | 3.0.3 |
| WSGI utilities | Werkzeug | 3.0.3 |
| ORM | Flask-SQLAlchemy | 3.1.1 |
| Database | SQLite | (bundled with Python) |
| Auth | Flask-Login | 0.6.3 |
| CSRF/forms | Flask-WTF | 1.2.1 |
| Real-time | Flask-SocketIO | 5.3.6 |
| Background jobs | APScheduler | 3.10.4 |
| AI assistant | google-generativeai | 0.7.2 |
| HTTP client | requests | 2.32.3 |
| Config | python-dotenv | 1.0.1 |
| App server | gunicorn + eventlet | 22.0.0 / 0.36.1 |
| Frontend | Jinja2 + Bootstrap 5 (CDN) | — |

The core of this is solid and standard — Flask 3.0.3 wants Werkzeug 3.x, and you have 3.0.3; Flask-SQLAlchemy 3.1.1, Flask-Login 0.6.3, and Flask-WTF 1.2.1 are all current releases built for Flask 3, and none of them conflict with each other or with the others' dependencies. There isn't a version clash in the pinned list.

There is one real inconsistency worth fixing, though, not in the library versions but in how Socket.IO is configured. `app/extensions.py` sets up `SocketIO()`, and `app/__init__.py` initializes it with `async_mode="threading"` — but your `Dockerfile` runs it in production under Gunicorn with `--worker-class eventlet`. Those two settings are aimed at different concurrency models: forcing `threading` mode means Flask-SocketIO won't use eventlet's greenlets even though the eventlet worker is what's actually hosting it, which typically means Socket.IO falls back to long-polling instead of real websockets in production, undercutting the "real-time chat and disruption alerts" pitch that's part of what's supposed to make this project stand out on the group tracker. The fix is simple: either drop the `async_mode` argument entirely (Flask-SocketIO auto-detects eventlet since it's installed) or set it explicitly to `"eventlet"` to match the Gunicorn worker.

The other thing to tidy up, more a consistency issue than a functional clash: local development is running on Python 3.10 (per the `.pyc` files in `__pycache__`) while the Docker image is built on Python 3.11. Nothing in the current code depends on a 3.11-only feature, so it isn't breaking anything today, but it's worth aligning the two — either bump the local venv to 3.11 or pin the Dockerfile to 3.10-slim — so "works on my machine" and "works in Docker" stay the same claim, especially since a viva demo might run on a different machine than the one that built it.

Everything else — Leaflet.js and Chart.js for the map and charts, both pulled from CDN with no build step — introduces no backend dependency at all and can't clash with the Python side.

## What's left before this looks like the pitched project

The scaffold and the data model are done; the actual feature logic is the remaining work. In rough order of what unlocks what: shipment CRUD and a dashboard template (so there's data for the risk engine to act on), the risk engine's scheduled scan loop plus wiring `scan_all_shipments()` into APScheduler, the disruption list/detail views and the route solver's ranking logic, the live map view (Leaflet.js) showing shipment positions, real-time notifications and chat over the already-installed Flask-SocketIO (once the async_mode fix above is made), the Gemini-backed assistant, and finally the admin panel. The Docker build should also get one real end-to-end run to confirm it boots outside the sandbox it was scaffolded in.
