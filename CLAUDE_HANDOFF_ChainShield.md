# ChainShield — Full Handoff for the Next Claude

*Written 5 Oct 2026 by the previous Claude for Bhavik Visani. Read this file first, then explore the folder.*

---

## 0. TL;DR (read this if nothing else)

- **Owner:** Bhavik Visani (MCA student, LJ University, Ahmedabad; GitHub user `bhavik2025` for this repo, personal handle `EIWOUP`).
- **Project:** **ChainShield Transportation System**: it predicts logistics disruptions and recommends route options.
- **Origin:** Built first for **Google Solution Challenge 2026** (Smart Supply Chains track) as a FastAPI + React + Firebase prototype.
- **Now:** It was **rebuilt from scratch** as the **MCA Semester 3 group project** (Group 59) in Flask, in the folder `chainshield-mca/`. **All modules are built, tested (101 automated checks) and documented.** The final report and PPT (v2) were revised on 30 Sep per the guide's review.
- **Direction:** It is **no longer for the Solution Challenge**. It's the MCA project **plus Bhavik's personal product** that he wants to put live at a real logistics company.
- **What's left:** final submission and viva (date per university schedule, plan says late Oct to mid Nov). Git cleanup and push. Optional work: better Gemini answers and production hardening.
- **Hard rule:** **Never modify the old prototype** (`backend/`, `frontend/`, and the root files). All new work goes in `chainshield-mca/`.

---

## 1. The Hackathon: Google Solution Challenge 2026

Source: https://promptwars.in/solutionchallenge2026.html

| Item | Detail |
|---|---|
| Organizer | Hack2Skill with Google for Developers (GDG India) |
| Eligibility | 18+, enrolled in an Indian college, teams of 1–4, one submission per team |
| Timeline | 6 Mar to early Jul 2026. Phase 1 was prototype submission, Phase 2 was the Top 106 "Product Vault", Phase 3 was a virtual Grand Finale with 14 finalists |
| Phase 1 submission | Problem statement, solution overview, **live MVP link**, deck, **public GitHub repo**, demo video |
| Judging (prototype) | Technical Merit 40%, Alignment with Cause 25%, Innovation 25%, UX 10% |
| Prizes | ₹10,00,000 pool, plus People's Choice and Best Usage of AI |
| Google tech expected | Flutter, Firebase, Google Cloud, AI/ML APIs (Gemini) |
| Tracks | Digital Asset Protection, Rapid Crisis Response, **Smart Supply Chains (chosen)**, Unbiased AI Decision, Smart Resource Allocation, plus Open Innovation |

**Chosen problem: Smart Supply Chains** (Resilient Logistics and Dynamic Supply Chain Optimization)
> Global supply chains handle millions of shipments at once over volatile transport networks. Disruptions such as weather and hidden bottlenecks are usually found only after delivery timelines are already compromised. **Objective:** design a scalable system that continuously analyses multifaceted transit data to preemptively detect and flag disruptions, and that instantly executes or recommends optimized route adjustments before local bottlenecks cascade.

Side note: Bhavik also explored the **"Unbiased AI Decision"** track earlier (Python + .NET ASP.NET Core + Flutter + SQL, mapped to the Sem 3 syllabus). It was **not** pursued.

The previous Claude does not know whether the team advanced past Phase 1. Ask Bhavik if it matters.

---

## 2. Full Timeline (what happened when)

| Date (2026) | Event |
|---|---|
| Mar–May | Built the **ChainShield prototype** for the Solution Challenge (FastAPI + React/Vite + Firebase + Gemini + SQLite). Frontend deployed on **Vercel** at `chainshield-eight.vercel.app`; backend set up for **Render** (`render.yaml`) and also has a `cloudbuild.yaml` (GCP). Last root-repo commit was "final Commit" around 23 May. A LinkedIn carousel PDF was made on 23 May. |
| 13 Aug | **Pivot:** the project was repurposed as the **MCA Sem 3 academic project**, to be rebuilt from scratch on a simpler, viva-friendly stack (Flask/Jinja2/Bootstrap/SQLite). |
| 15 Aug | Cover-page details confirmed. Rule set: **don't touch the old prototype**, build in a new folder, and use Docker. |
| 16 Aug | Environment and Docker scaffold created in `chainshield-mca/` (app factory, blueprints, models, auth working). |
| 15–19 Aug | First project report (`ChainShield_MCA_Sem3_Documentation.docx/.pdf`). |
| 25 Aug | SRS (`ChainShield_SRS.docx`) and first presentation (`ChainShield_MCA_Presentation.pptx`). |
| 7 Sep | First git commit of `chainshield-mca`. A status report was written (`Claude outputs/ChainShield_MCA_Status_Report.md`). **That report is now outdated**: it says the modules are stubs, but they have all been built since. |
| 7–20 Sep | All modules built: risk engine loop, route solver, disruptions, shipments CRUD, live map, dashboards and charts, Socket.IO notifications and chat, AI assistant, admin CRUD, reports with CSV, demo mode. |
| 21 Sep | Hack in Hills '26 PPT made (`Claude outputs/ChainShield_HackInHills26_PPT.pptx`, 8 slides, describes the **old** React/FastAPI prototype). See §9. |
| 21–22 Sep | Testing: **101 automated checks, 0 failures**. Docker deployment verified (per the report). |
| 22–24 Sep | Premium UI redesign: sidebar shell, light/dark themes, motion, mobile drawer. |
| 24 Sep | Docs and PPT v2/v3. Bhavik stated that **ChainShield will NOT be used for Hack in Hills**. It is only the MCA project. |
| 25 Sep | Removed all Solution Challenge branding and repositioned it as a deployable logistics product. Final docs: `*_Final.docx/pdf`, SRS_Final. |
| 30 Sep | **Guide (Prof. Dhaval Shah) reviewed the work, and docs were revised to `*_Final_v2`.** These are the latest. |
| 5 Oct | This handoff. |

---

## 3. Team and Academic Details (exact, as used in the documents)

**MCA Semester 3 group project**
- **Group No.:** 59
- **Bhavik A. Visani**: Roll **D51**, Enrollment **25004401110170**. Team leader and main developer.
- **Diya Shah**: Roll **D36**, Enrollment **25003401110017**. Has GitHub access (pushed a README update on 25 Sep).
- **Shruti Somani**: Roll **D42**, Enrollment **25004401110259**
- **Guide:** Prof. Dhaval Shah
- **Institute:** LJ Institute of Computer Application (LJICA), affiliated to **LJK University**, Ahmedabad
- **Program:** MCA Semester 3, **Academic Year 2026-27**
- **Duration on record:** Aug–Nov 2026
- **Title on the class tracker sheet:** "ChainShield Transportation System"
- **Tech string on the class tracker sheet** (agreed exact phrasing, chosen to stand out from peer groups' plain CRUD apps):
  `Python, Flask, SQLite, Bootstrap, Leaflet.js (Live Maps), Flask-SocketIO (Real-time Alerts), Gemini AI, APScheduler`

The previous Claude does not know how work is split among the three MCA members beyond Bhavik leading. Ask if needed for the viva.

**Hack in Hills '26 team (separate hackathon, see §9):** TeamAlpha. Bhavik (leader: backend, DB, API), Diya Shah (research and pitch), Harshad Baldaniya (UI/UX and research).

---

## 4. Folder Map: `C:\BHAVIK VISANI\bhavik\Solution Challenge`

```
Solution Challenge/
├── .git/                     OLD prototype repo (origin: github.com/bhavik2025/chainshield)
├── README.md, HOW_TO_RUN.md  OLD prototype docs (Solution Challenge branding)
├── render.yaml               OLD backend deploy config (Render, Docker)
├── backend/                  OLD FastAPI backend (it has its own nested .git)  ⛔ DO NOT TOUCH
│   └── serviceAccountKey.json  Firebase service-account SECRET, never print or commit it
├── frontend/                 OLD React 18 + Vite frontend                     ⛔ DO NOT TOUCH
├── backend.env, vercel.env   OLD env files containing REAL KEYS (Gemini, OWM, Firebase, JWT)
│                             ⚠ untracked and NOT covered by .gitignore, so never `git add .` at the root
├── ChainShield_LinkedIn_Carousel.pdf, test.txt, test_chain.pdf   leftovers from the old prototype
├── chainshield-mca/          ✅ THE CURRENT PROJECT (Flask), with its own git repo
├── MCA_Sem3_Documentation/   all report, SRS and PPT versions (latest = *_Final_v2)
└── Claude outputs/           copies of the latest docx/pptx, HackInHills PPT, screenshots, old status report
```

### Which document is current?
| Document | Latest file | Notes |
|---|---|---|
| Project report | `MCA_Sem3_Documentation/ChainShield_Documentation_Final_v2.docx` / `.pdf` | 53 pages, the guide-reviewed version |
| Presentation | `MCA_Sem3_Documentation/ChainShield_Presentation_Final_v2.pptx` / `.pdf` | 48 slides, mirrors the report section by section |
| SRS | `MCA_Sem3_Documentation/ChainShield_SRS_Final.docx` / `.pdf` | 25 Sep |
| Older versions | `*_Sem3_Documentation(_v2,_v3)`, `*_MCA_Presentation(_v2,_v3)`, `*_Final`, `*_Final_updated`, `SRS(_v2,_v3)` | Keep them, but don't edit them |
| Copies | `Claude outputs/ChainShield_Documentation_Final_v2.docx`, `..._Presentation_Final_v2.pptx` | Same as the v2 files |

⚠ The Python generators that built the v2 docs (`content.py`, `build_docx.py`, `build_pptx.py`) **only existed in the previous Claude's session and are lost.** Any further doc change must edit the .docx/.pptx directly, or rebuild the generators.

---

## 5. The App: `chainshield-mca/` (current product)

### 5.1 Stack (pinned in `requirements.txt`)
Python **3.10** (both the local venv and the Docker image `python:3.10-slim`), Flask 3.0.3, Werkzeug 3.0.3, Flask-SQLAlchemy 3.1.1, **SQLite**, Flask-Login 0.6.3, Flask-WTF 1.2.1 (CSRF), Flask-SocketIO 5.3.6 with simple-websocket 1.0.0, APScheduler 3.10.4, google-generativeai 0.7.2 (model `gemini-2.5-flash`), requests, python-dotenv, gunicorn 22 with an eventlet 0.36.1 worker.
Frontend: Jinja2 + Bootstrap 5 + vanilla JS, Leaflet.js, Chart.js, Bootstrap Icons, Inter font, all **vendored** in `app/static/vendor/`, so it works offline except for the map tiles.
**Do not reintroduce FastAPI, React or Firebase** in this folder.

### 5.2 Layout
```
chainshield-mca/
├── wsgi.py              entry point (loads .env; `python wsgi.py` runs the Socket.IO dev server)
├── Dockerfile           python:3.10-slim, gunicorn --worker-class eventlet -w 1, port 5000
├── docker-compose.yml   service "web", container "chainshield", ./instance mounted as a volume
├── .env / .env.example  .env has real keys (gitignored)
├── instance/chainshield.db   SQLite DB (gitignored)
└── app/
    ├── __init__.py      create_app(), extensions, scheduler start, blueprints, schema patches, CLI
    ├── config.py        Development / Testing (in-memory, no CSRF) / Production configs
    ├── extensions.py    db, login_manager, csrf, socketio, scheduler
    ├── models.py        9 tables (below)
    ├── forms.py         Flask-WTF forms (e.g. ShipmentForm: origin≠destination, lat range)
    ├── sockets.py       on connect, each user joins room user_<id>
    ├── blueprints/      main (dashboards, admin, reports), auth, shipments (+ live map),
    │                    disruptions, notifications, chat, assistant
    ├── services/        risk_engine, route_solver, weather, notifier, stats, assistant
    ├── templates/       base.html shell, _macros.html (risk_badge), dashboard/*, shipments/*, etc.
    └── static/          css/style.css (design system), js/main.js, vendor/
```

### 5.3 Database: 9 tables (`app/models.py`)
- **users**: id, name, email (unique), password_hash, role (`admin | manager | captain | pilot | driver | loco_pilot`), phone, is_active, created_at
- **hubs**: id, name, location, lat, lng
- **cargo_types**: id, name (unique), sensitivity_weight (0.0–1.0)
- **shipments**: id, tracking_no (unique, `CS-1001`…), origin, destination, cargo_type_id, transport_mode (Road/Rail/Sea/Air), status (In-transit/Delivered…), current_lat/lng, risk_score, risk_level, cargo_value, assigned_operator_id → users, hub_id → hubs, created_at
- **disruptions**: id, shipment_id, type (dominant factor: Weather/Congestion/Cargo/History), severity (MEDIUM/HIGH), risk_score, status (Open/Resolved), detected_at, resolved_at, resolved_by
- **route_solutions**: id, disruption_id, option_no (1 = recommended), description, extra_time_hours, extra_cost (₹), risk_score, selected. These are deleted together with their disruption.
- **notifications**: id, user_id, message, is_read, created_at
- **messages**: id, sender_id, receiver_id, chat_id (`lowerId-higherId`), content, sent_at
- **activity_log**: id, user_id, action, timestamp

### 5.4 Core logic
**Risk engine** (`services/risk_engine.py`, run by APScheduler every `RISK_SCAN_INTERVAL_SECONDS`, default 60):
- `score = 0.40·weather + 0.25·congestion + 0.20·cargo + 0.15·history`, with each factor on a 0–100 scale
- **≥70 HIGH, ≥50 MEDIUM, ≥30 AT-RISK, otherwise LOW**
- Weather comes from OpenWeatherMap at the shipment position, with a simulated fallback when there's no key.
- Congestion is simulated with a mode bias (Road 35, Rail 25, Sea 15, Air 10), plus a 10% chance of a severe jam (70–100).
- Cargo uses `sensitivity_weight × 100`.
- History is `15 + 12 × (disruptions on the same origin→destination lane in the last 90 days)`, capped at 100.
- Each scan does four things:
  1. It moves the shipment `MOVEMENT_STEP_DEG` (0.15°) toward its destination hub. This is the simulated GPS. On arrival the shipment is marked Delivered.
  2. It re-scores the shipment.
  3. At **MEDIUM or above**, it opens a Disruption and generates route solutions. If an open disruption's level rises (e.g. MEDIUM→HIGH), it **escalates** it and re-plans the options.
  4. It notifies admins, managers and the assigned operator, and broadcasts `shipments_updated` / `disruption_new` over Socket.IO.
- AT-RISK shipments are only flagged.

**Route solver** (`services/route_solver.py`):
- Candidates:
  - Hold at the nearest hub (₹800/hr, residual risk 15%)
  - Continue (baseline, full risk)
  - Reroute via the 2 hubs with the smallest haversine detour (+1 h handling, +₹1500, residual risk 30%/38%)
  - Mode switch (Road↔Rail, Sea→Rail)
- Speeds in km/h: Road 50, Rail 60, Sea 30, Air 600. Cost per km in ₹: Road 45, Rail 25, Sea 15, Air 180.
- Ranking: `0.60·risk + 0.25·time_norm + 0.15·cost_norm`, lowest score wins. Option 1 is the recommended one.
- Nothing is applied automatically. A manager or admin picks an option, and the operator is then notified.

**AI assistant** (`services/assistant.py`): sends the question plus a role-scoped live data snapshot to Gemini. If there's no key or no internet, a rule-based offline engine answers instead.

**Security:**
- Werkzeug hashing, Flask-Login sessions (8 h), and CSRF on every form and AJAX call.
- Role decorators: `admin_required`, `manager_or_admin_required`, `manager_required`.
- No self-registration as admin. Deactivated users are logged out on their next request.
- Field operators see only their own shipments (other operators' shipments return 404).

### 5.5 Feature list / pages
- Landing page, login and register
- Role dashboards: admin overview with KPIs, 4 Chart.js charts and recent activity; a simple dashboard for managers and operators
- Shipments: list, create, edit, delete, detail with mini-map, scan now, operator status update
- **Live map** (`/shipments/map`): risk-coloured markers, hubs, routes and shaded disruption zones
- Disruptions (`/disruptions`): ranked options, resolve, "Scan now", **"Trigger demo disruption"**
- Notifications: feed with bell badge and toasts
- Chat: direct messages, live over Socket.IO
- AI assistant: chat UI with suggested questions
- Admin tabs: Overview, Users (add, change role, deactivate), Shipments, Base Cities (hubs CRUD), Cargo Types (CRUD, weight validated to 0–1), Reports, System Config, Activity Log
- **Reports** (`/reports`, admin and manager), all with a date filter:
  1. Disruption Summary (CSV)
  2. Resolution Time by Decision-maker
  3. Activity Audit Log (CSV)
  4. Shipment Risk Report (CSV)
- UI: Inter font, indigo/teal palette, risk colours (green LOW, amber AT-RISK, orange MEDIUM, red HIGH), light and dark themes, a mobile drawer with no sideways scroll at 390px, and reduced-motion support

### 5.6 Run it
```bat
cd chainshield-mca
.venv\Scripts\activate
pip install -r requirements.txt
flask init-db
flask seed-db
flask reset-demo      &:: before any demo
python wsgi.py        &:: http://localhost:5000 (real websockets)
```
To run in Docker: `docker compose up --build`, then `docker compose exec web flask init-db`, then `docker compose exec web flask seed-db`.

CLI commands:
- `init-db` creates the tables and applies additive patches.
- `seed-db` is idempotent.
- `scan-risk` runs one scan now.
- `reset-demo` moves CS-10xx back to their origins and clears disruptions and notifications.

`.env` keys: `FLASK_CONFIG, SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL, OPENWEATHER_API_KEY, RISK_SCAN_INTERVAL_SECONDS, PORT, SIMULATE_MOVEMENT, MOVEMENT_STEP_DEG, SOCKETIO_ASYNC_MODE` (threading in dev, eventlet in prod), `DATABASE_URL` (optional).

### 5.7 Demo data (password for all accounts: `demo1234`)
| Email | Role | Sees |
|---|---|---|
| admin@chainshield.com | admin | everything and the admin panel |
| manisha@chainshield.com (Manisha Patel) | manager | all shipments, resolves disruptions |
| suresh@chainshield.com (Suresh Yadav) | driver | Road shipments |
| ajay@chainshield.com (Ajay Kumar) | loco_pilot | Rail |
| rohit@chainshield.com (Rohit Mehta) | pilot | Air |
| karan@chainshield.com (Karan Shah) | captain | Sea |

- **Hubs (10):** Ahmedabad, Mumbai, Delhi, Bengaluru, Chennai, Kolkata, Pune, Hyderabad, Surat, Jaipur
- **Cargo types:** General 0.3, Perishable 0.7, Hazardous 0.9, Electronics 0.6
- **Shipments:**
  - CS-1001: Ahmedabad→Mumbai, Road, Perishable
  - CS-1002: Mumbai→Delhi, Rail, General
  - CS-1003: Delhi→Ahmedabad, Road, Hazardous
  - CS-1004: Bengaluru→Chennai, Air, Electronics
  - CS-1005: Surat→Kolkata, Sea, General
  - CS-1006: Jaipur→Ahmedabad, Road, Perishable

**Demo script for the viva:**
1. Run `flask reset-demo`.
2. Log in as manisha and click **Trigger demo disruption**. A HIGH disruption, a map zone and a toast appear.
3. Open the disruption and pick Option 1.
4. Log in as the operator (e.g. suresh) in a second browser and show the live notification.
5. Log in as admin and show the Activity Log, the Reports and a CSV export.
6. Open the AI assistant and ask "Give me a summary".

### 5.8 Use case (as in the report)
- **Actors:** Admin, Manager, Field Operator, and the Scheduler (a system actor).
- **Generalization:** Admin → Manager → Field Operator.
- **«include»:** Detect & Escalate Disruption includes Generate Route Solutions.
- **«extend»:** Export Report (CSV) extends View Reports.

---

## 6. Git State (checked 5 Oct). ⚠ Needs attention

**`chainshield-mca/` repo**
- Branch `main`, remote `origin = https://github.com/bhavik2025/chainshield.git`.
- It is **ahead 5, behind 1**: 5 local commits are unpushed, and the remote has `cd95860 "Update README.md"` by **Diya Shah** (25 Sep).
- The working tree was clean when checked.
- Extra local branch: `sem3-complete-features` (at e162c87).
- Local commits:
  - 8b4089e: Align model comments and risk-engine docstring with actual behaviour (25 Sep)
  - 8e39aef: Remove Solution Challenge branding; position as a deployable logistics product (25 Sep)
  - 6dff7e5: Premium UI redesign: sidebar shell, light/dark themes, motion (24 Sep)
  - dd07a27: Tune risk simulation; open disruptions from MEDIUM; fix demo trigger (24 Sep)
  - 74d8ffa: Add admin CRUD, reports with CSV export, demo mode and map zones (24 Sep)
  - e162c87 and 4e667d9 are already on the remote.
- **To do:** `git pull --rebase origin main`, resolve any README conflict (Diya changed the README, and local also changed it in 8e39aef), then `git push`. **Ask Bhavik before pushing.**
- ⚠ **Stale lock file:** `chainshield-mca/.git/index.lock` (0 bytes) was left on 5 Oct by the previous Claude's `git status` check, because the session had no delete permission. **Delete it first** (ask Bhavik for delete permission, or have him delete it). Otherwise every git command will fail with "index.lock exists".

**Root repo (old prototype)**
- It has the **same remote URL**, with local commits up to `72a7eb8 final Commit`.
- It shows `backend`/`frontend` as modified (they are nested repos) and lots of untracked files.
- The remote `main` now holds the MCA history, so the old prototype's history effectively lives only locally plus on Vercel/Render.
- **Do not push from the root.** If Bhavik wants a clean split, suggest a separate repo (e.g. `chainshield-prototype`) for the old code. That needs his OK.

---

## 7. Old Prototype (reference only, don't modify)
- **Stack:**
  - Frontend: React 18 + Vite, Leaflet, Lucide
  - Backend: FastAPI + SQLAlchemy + SQLite
  - Auth: JWT (local) and Firebase Auth (production)
  - Real-time: Firestore sync, with 30 s polling
  - Other: Gemini, APScheduler, OpenWeatherMap
- **Deployment:** Vercel (frontend, `chainshield-eight.vercel.app`) and Render (backend, Docker, `render.yaml`). There is also a GCP `cloudbuild.yaml`.
- **Demo accounts:** admin@, manager@, captain@, pilot@, driver@, loco@chainshield.com, all with password demo1234.
- **Demo:** "Port Strike at Rotterdam", resolved via "Divert to Antwerp". It had 2 route alternatives and a chat that used 5-digit chat IDs.
- Same 4-factor risk model (weather, congestion, cargo, historic delay by destination country and mode).

---

## 8. Pending / Next Steps (priority order)
1. **Final submission and viva.** The date is per the university schedule. The report's Gantt chart puts it at Oct W4 to Nov W2, so update the timeline row with the real date when Bhavik knows it. Also prepare viva answers: why Flask over FastAPI/React, the risk formula, include vs extend, generalization, and SQLite vs PostgreSQL.
2. **Git:** remove `index.lock`, pull and rebase Diya's README commit, then push the 5 commits (with Bhavik's OK).
3. **Product hardening** (for "go live at a logistics company"):
   - PostgreSQL via `DATABASE_URL`
   - a real GPS/telematics feed in place of the simulated movement
   - HTTPS / reverse proxy and backups
   - a real congestion data source
   - multi-tenant support later
4. **Improve the Gemini assistant:** better prompts, conversation memory and suggested actions.
5. **Proposed enhancements in the report:** ML risk model, PWA for field operators, SMS/WhatsApp alerts, customs/port APIs, PDF reports and scheduled emails.

---

## 9. Hack in Hills '26 (separate hackathon, conflicting info, ask Bhavik)
- Offline hackathon in Manali, listed via Galgotias University on Unstop.
- Team: **TeamAlpha** (Bhavik leader, Diya Shah, Harshad Baldaniya).
- **Dates:**
  - Idea & PPT submission **due 20 Oct 2026**
  - Prototype round through 20 Oct
  - Social Pitch & Outreach 22–25 Oct
  - **Grand Finale 20–21 Nov 2026 in Manali**
- An 8-slide PPT was made on 21 Sep (`Claude outputs/ChainShield_HackInHills26_PPT.pptx`) **using ChainShield (the old prototype)**.
- **However, on 24 Sep Bhavik said ChainShield will NOT be used for Hack in Hills.** Confirm with him which project goes to Hack in Hills before touching that PPT. Don't mix it with the MCA work.

---

## 10. How Bhavik Likes to Work (important for the next Claude)
- Direct and informal. He wants **honest, corrective feedback**, not confident-but-wrong answers.
- **Concise, logic-first explanations before code.**
- **Don't start coding or rebuilding until he explicitly says so.** Documentation came first in this project.
- He prefers working on files **in place in his folder** (via the device shell) rather than uploading and downloading copies.
- Never print or commit secrets: `backend/serviceAccountKey.json`, `backend.env`, `vercel.env`, `chainshield-mca/.env`.
- Keep old document versions. Write new ones as new files (e.g. `_v3`) rather than overwriting the guide-approved v2.
- Report formatting rules (from the guide): Times New Roman throughout (H1 16 pt, H2 14 pt, body 12 pt), descriptive content, and the PPT mirrors the report section by section in short points.

### Guide's review checklist (30 Sep), all done in v2
1. Project profile with names, roll and enrollment numbers, group, DB, platform, duration and academic year
2. Gantt timeline Aug–Nov with weekly columns W1–W4, and Documentation running across all phases
3. Detailed targeted users plus an access table
4. Use case with straight, non-overlapping lines, the generalization, one include and one extend
5. Data dictionary with a "Sample (id = 1)" column on all 9 tables
6. UI design: 6 admin screenshots (3.3), plus the reports screenshot and the layout of each report (3.4)
7. 9 coding standards, each with a 2-line description, an example and a code screenshot
8. Descriptive content
9. Fonts as above
10. PPT mirrors the report

### Report structure (Final_v2)
1. **Introduction:** 1.1 Problem, 1.2 Objectives, 1.3 Core Components (7), 1.4 Project Profile, 1.5 Need, 1.6 Scope, 1.7 Advantages and Limitations, 1.8 Timeline (Gantt + actual-progress table), 1.9 Targeted Users
2. **Requirements:** 2.1 Determination (7 key requirements), 2.2 Specification (13 FR, NFRs, HW/SW table)
3. **Design:** 3.1 Use Case + Architecture, 3.2 Data Dictionary, 3.3 UI Design, 3.4 Report Design
4. **Development:** 4.1 Coding Standards (9), 4.2 Implementation, 4.3 Output Screens (Figs 4.10–4.24)
5. **Testing:** 13 test cases, TC001–TC013, all pass; 101 automated checks
6. **Proposed Enhancement**
7. **Conclusion**
8. **Bibliography:** Grinberg, Matthes, Elmasri & Navathe, Sommerville, plus 13 web references

---

## 11. Other Sources
- claude.ai Project **"Solution Challenge"** doc: `claude/chainshield-mca-status.md` (status as of 30 Sep)
- `chainshield-mca/README.md` is the authoritative technical readme for the current app.
- `Claude outputs/ChainShield_MCA_Status_Report.md` is **outdated** (7 Sep, from before the modules were built). Ignore its "stubs" claims.
