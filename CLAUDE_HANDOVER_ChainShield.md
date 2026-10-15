# CLAUDE HANDOVER — ChainShield Transportation System
*Written 5 Oct 2026 by the previous Claude session, for the next Claude. Read this fully before touching anything.*

---

## 0. TL;DR (read this if nothing else)

- **User:** Bhavik A. Visani — MCA Semester 3 student, LJ Institute of Computer Application (LJK University), Ahmedabad. Leader of **Group No. 59**.
- **Project:** **ChainShield Transportation System** — a Flask web app that scores every in-transit shipment's disruption risk every 60 s, auto-opens disruptions, recommends ranked reroute options, and notifies people in real time.
- **What it is FOR right now:** the **MCA Sem 3 academic submission** (and Bhavik's own product he wants to deploy at a logistics company). It is **no longer** a Google Solution Challenge entry, and Bhavik said (24 Sep 2026) it is **not** his Hack in Hills '26 project.
- **Code:** `Solution Challenge/chainshield-mca/` — **complete, tested (101 automated checks), Docker-verified on Windows.**
- **Latest documents (submit these):** `MCA_Sem3_Documentation/ChainShield_Documentation_Final_v2.docx/.pdf` (53 pages) and `ChainShield_Presentation_Final_v2.pptx/.pdf` (48 slides). These include all 10 changes the guide (ma'am) asked for on ~30 Sep 2026.
- **Biggest open items:** git branch has diverged from GitHub (see §9); viva/submission date unknown; a few small doc caveats (see §8).
- **How Bhavik wants you to talk:** direct, informal, concise, logic first then code. He prefers honest correction over confident-but-wrong answers. He swears casually — no need to mirror it.

---

## 1. People & academic details (exact spellings — used on cover pages)

| Item | Value |
|---|---|
| Group | **Group No. 59** |
| Member 1 (leader) | **Bhavik A. Visani** — Roll **D51** — Enrollment **25004401110170** |
| Member 2 | **Diya Shah** — Roll **D36** — Enrollment **25003401110017** |
| Member 3 | **Shruti Somani** — Roll **D42** — Enrollment **25004401110259** |
| Project guide | **Prof. Dhaval Shah** |
| Institute | **LJ Institute of Computer Application** (LJICA) |
| University | **LJK University** ("Affiliated to LJK University") |
| Program | Master of Computer Application (MCA), **Semester 3** |
| Academic year | **2026-27** |
| Project title (on record, class tracker sheet) | **"ChainShield Transportation System"** |
| Cover subtitle | "Real-Time Disruption Prediction & Route Optimisation for Logistics" |
| Domain | Logistics & Supply Chain Management |
| Place (declaration) | Ahmedabad |
| Bhavik's GitHub | EIWOUP (but the repo remote is `github.com/bhavik2025/chainshield`) |

"Ma'am" in Bhavik's messages = the faculty reviewing the documentation (gave the 10-point change list, §7).

**Class tracker sheet technology string** (agreed wording, chosen to stand out against other groups' plain HTML/Django/MySQL CRUD apps):
`Python, Flask, SQLite, Bootstrap, Leaflet.js (Live Maps), Flask-SocketIO (Real-time Alerts), Gemini AI, APScheduler`

---

## 2. History — how we got here (timeline)

| Date | What happened |
|---|---|
| Apr–May 2026 | Original **ChainShield** prototype built for **Google Solution Challenge 2026 / PromptWars** (https://promptwars.in/solutionchallenge2026.html), track **"Smart Supply Chains — Resilient Logistics and Dynamic Supply Chain Optimization"**. Stack: **FastAPI + React/Vite + Firebase + Gemini + SQLite**. Lives in `backend/` + `frontend/`. Frontend deployed on Vercel (chainshield-eight.vercel.app), backend set up for Render (`render.yaml`). Also a LinkedIn carousel PDF. |
| Aug 2026 | Bhavik also explored "Unbiased AI Decision" (bias detection) for the Solution Challenge — **dropped / unrelated**, ignore. |
| 13 Aug 2026 | **Pivot:** project repurposed as the MCA Sem 3 submission, **rebuilt from scratch** in Flask. Stack decided. |
| 15 Aug | Cover/document details confirmed. **Hard rule set: the old prototype (`backend/`, `frontend/`) must NOT be modified in any way.** |
| 15–19 Aug | First report (requirements + design). |
| 16 Aug | `chainshield-mca/` scaffolded (app factory, blueprints, Docker). |
| 16–25 Aug | Auth + base UI. 25 Aug: SRS + first presentation. |
| 7 Sep | Status report written (`Claude outputs/ChainShield_MCA_Status_Report.md` — **now outdated**, it describes the scaffold-only stage). |
| 7–8 Sep | Risk engine scan loop, route solver, disruptions, admin panel. |
| 9–16 Sep | Shipment CRUD, live map, dashboards/charts, real-time notifications, chat, AI assistant. |
| 17–20 Sep | Reports + CSV export, cargo/hub/user management, demo mode. |
| 21 Sep | A Hack in Hills '26 PPT was made (`Claude outputs/ChainShield_HackInHills26_PPT.pptx`). |
| 21–22 Sep | Testing (101 automated checks), Docker verified on Windows. |
| 22–24 Sep | Premium UI redesign (sidebar shell, light/dark themes, animations, mobile). |
| 24 Sep | Bhavik: ChainShield is **only** for MCA Sem 3, **not** Hack in Hills. |
| 24–25 Sep | Docs v2/v3 then **`*_Final`** (report 39 pp, SRS 19 pp, PPT 19 slides). **All Solution Challenge branding removed** from code and docs — it's positioned as a deployable logistics product. |
| ~30 Sep | Ma'am's review → 10 changes → **`*_Final_v2`** report (53 pp) + PPT (48 slides). |
| 5 Oct | This handover. |

### Hack in Hills '26 (separate hackathon — know this so you don't mix them up)
- Offline hackathon in **Manali**, listed via Galgotias University on Unstop (partners Web3 India / BuilderBase / Nexido).
- Team **TeamAlpha**: Bhavik (leader), **Harshad Baldaniya**, **Diya Shah**.
- Dates: Idea & PPT submission + Prototype round **due 20 Oct 2026**; Social Pitch & Outreach **22–25 Oct**; Grand Finale **20–21 Nov 2026** in Manali.
- ⚠️ Conflict in records: an older note says ChainShield was the HiH project (and a HiH PPT exists), but Bhavik's **latest statement (24 Sep)** is that ChainShield is NOT for HiH. **If HiH comes up, ask him what the HiH project is** — don't assume.

---

## 3. Folder map (`Solution Challenge/`)

```
Solution Challenge/                 ← root is its own git repo (OLD prototype), remote github.com/bhavik2025/chainshield
├── backend/            OLD FastAPI prototype (git submodule)   — DO NOT TOUCH
├── frontend/           OLD React/Vite prototype (git submodule)— DO NOT TOUCH
├── README.md, HOW_TO_RUN.md, render.yaml   OLD prototype docs/deploy — DO NOT TOUCH
├── backend.env, vercel.env   ⚠️ secrets for the old deploy — never commit, never print
├── ChainShield_LinkedIn_Carousel.pdf, test.txt, test_chain.pdf   old leftovers
├── chainshield-mca/    ★ THE MCA PROJECT (own git repo, same remote URL!)
├── MCA_Sem3_Documentation/   ★ all reports/SRS/PPTs (versions below)
└── Claude outputs/     working outputs from Claude sessions (status report, screenshots, HiH PPT,
                        copies of the v2 docs, this handover, doc generator kit)
```
Also note `backend/serviceAccountKey.json` exists (Firebase secret) — it's gitignored; never open/commit/print it.

### Document versions in `MCA_Sem3_Documentation/` — which is current
| File | Status |
|---|---|
| **ChainShield_Documentation_Final_v2.docx / .pdf** | ★ **CURRENT report** (53 pp, all guide changes) |
| **ChainShield_Presentation_Final_v2.pptx / .pdf** | ★ **CURRENT PPT** (48 slides, mirrors the report) |
| ChainShield_SRS_Final.docx / .pdf | Current SRS (19 pp, 25 Sep) — NOT yet updated for ma'am's changes (she didn't ask for SRS changes as far as we know) |
| ChainShield_Documentation_Final(_updated).docx/.pdf, Presentation_Final.* | Previous final (25 Sep), superseded |
| *_v2, *_v3, MCA_Presentation*, MCA_Sem3_Documentation*, SRS.docx, SRS_v2/v3 | Older drafts — keep, don't use |

---

## 4. The application (`chainshield-mca/`) — technical detail

### Stack (pinned in requirements.txt)
Python **3.10** · Flask 3.0.3 · Werkzeug 3.0.3 · Flask-SQLAlchemy 3.1.1 · SQLite · Flask-Login 0.6.3 · Flask-WTF 1.2.1 · Flask-SocketIO 5.3.6 · APScheduler 3.10.4 · python-dotenv 1.0.1 · requests 2.32.3 · google-generativeai 0.7.2 · gunicorn 22.0.0 · eventlet 0.36.1 · simple-websocket 1.0.0.
Front end: Jinja2 + Bootstrap 5 + Bootstrap Icons + Inter font + vanilla JS + Leaflet.js + Chart.js + Socket.IO client — **all bundled locally in `app/static/vendor/`** (works offline except map tiles).
Explicitly **NOT** used (belongs to the old prototype): FastAPI, React, Firebase, JWT. Don't reintroduce unless asked.

### Layout
```
app/__init__.py      create_app() factory, APScheduler start, error pages (403/404), /health, CLI commands
app/config.py        Development / Testing (in-memory DB, CSRF off) / Production configs; risk weights live here
app/extensions.py    db, login_manager, csrf, socketio, scheduler
app/models.py        9 models (below)
app/forms.py         ShipmentForm (origin≠destination, lat/lng ranges), StatusUpdateForm
app/sockets.py       on connect → join room user_<id>
app/blueprints/      main (dashboards + admin panel + reports + CSV), auth, shipments (+ live map + api/live),
                     disruptions, notifications, chat, assistant
app/services/        risk_engine, route_solver, weather, notifier, stats, assistant
app/templates/       base.html shell, _macros.html (risk_badge, status_badge, mode_icon, field, kpi, page_head), pages
app/static/          css/style.css (design tokens, both themes), js/main.js (theme, sidebar, ripples, count-up, toasts)
wsgi.py, Dockerfile (python:3.10-slim, gunicorn eventlet -w 1, port 5000), docker-compose.yml (service "web",
container "chainshield", ./instance volume, env_file .env, FLASK_CONFIG=production)
```

### Database — 9 tables (SQLite `instance/chainshield.db`)
users (id, name, email UNIQUE, password_hash, role, phone, is_active, created_at) ·
hubs (id, name, location, lat, lng) ·
cargo_types (id, name UNIQUE, sensitivity_weight 0–1) ·
shipments (id, tracking_no UNIQUE CS-xxxx, origin, destination, cargo_type_id FK, transport_mode Road/Rail/Sea/Air, status In-transit/Delayed/On-hold/Delivered, current_lat, current_lng, risk_score, risk_level, cargo_value ₹, assigned_operator_id FK users, hub_id FK, created_at) ·
disruptions (id, shipment_id FK, type Weather/Congestion/Cargo/History, severity MEDIUM/HIGH, risk_score, status Open/Resolved, detected_at, resolved_at, resolved_by FK) ·
route_solutions (id, disruption_id FK cascade, option_no 1=recommended, description, extra_time_hours, extra_cost ₹, risk_score residual, selected) ·
notifications (id, user_id, message, is_read, created_at) ·
messages (id, sender_id, receiver_id, chat_id "lowerId-higherId", content, sent_at) ·
activity_log (id, user_id, action, timestamp).
Demo DB currently: 10 users, 11 hubs, 4 cargo types (General 0.3, Perishable 0.7, Hazardous 0.9, Electronics 0.6), 6 shipments CS-1001…CS-1006 (all Delivered now — run `flask reset-demo` before any demo), 6 disruptions, 26 route solutions, 91 notifications, 7 messages, 33 log rows.

### Core logic (numbers matter — they are quoted in the docs and the viva)
- **Risk score** = **0.40·weather + 0.25·congestion + 0.20·cargo sensitivity + 0.15·lane history** (each 0–100). Scan every **60 s** (`RISK_SCAN_INTERVAL_SECONDS`).
- **Levels:** ≥70 HIGH · ≥50 MEDIUM · ≥30 AT-RISK · else LOW.
- **Disruption opens at MEDIUM (≥50)**, escalates to HIGH (≥70) with re-planned options. AT-RISK is only watched.
- Weather: OpenWeatherMap if key set, else simulated (mostly calm, occasional storm). Lane history = disruptions on same origin→destination lane in last 90 days. Demo mode moves shipments toward the destination each scan (`SIMULATE_MOVEMENT`, `MOVEMENT_STEP_DEG=0.15`), marks Delivered on arrival.
- **Route solver:** hold at nearest hub · continue (baseline) · reroute via the 2 hubs with smallest haversine detour · mode switch for remaining leg. Each option has extra time, extra cost (₹, per-km mode rates), residual risk; ranked by **0.60·risk + 0.25·norm time + 0.15·norm cost**. Option 1 = recommended.
- **Real time:** Socket.IO personal rooms `user_<id>`; broadcast events `shipments_updated`, `disruption_new` refresh map/dashboards/charts.
- **AI assistant:** Gemini (`GEMINI_MODEL=gemini-2.5-flash`) on a snapshot of data the user may see; rule-based offline fallback without key/internet.
- **Map zones:** radius by severity — AT-RISK 40 km, MEDIUM 70 km, HIGH 110 km.
- **Security:** Werkzeug (scrypt) hashes, Flask-Login sessions (8 h), CSRF on all forms + AJAX, `admin_required` / `manager_required` decorators, deactivation logs user out, no admin self-registration.

### Roles
admin · manager · captain (sea) · pilot (air) · driver (road) · loco_pilot (rail). Field operators see only their assigned shipments. Admin ⊃ Manager ⊃ Field Operator (this generalization is how the use case diagram is drawn).

### Demo accounts (password `demo1234`)
admin@chainshield.com (admin) · manisha@chainshield.com (Manisha Patel, manager) · suresh@chainshield.com (Suresh Yadav, driver) · ajay@chainshield.com (Ajay Kumar, loco_pilot) · rohit@chainshield.com (Rohit Mehta, pilot) · karan@chainshield.com (Karan Shah, captain). The DB also has some extra accounts the team created while testing.

### Run it
```
Local (Windows):  cd chainshield-mca && .venv\Scripts\activate && pip install -r requirements.txt
                  copy .env.example .env   (first time)   →  flask init-db  →  flask seed-db  →  python wsgi.py
Docker:           docker compose up --build   (ALWAYS --build after code changes)
                  docker compose exec web flask init-db / flask seed-db
CLI:              flask init-db | flask seed-db | flask scan-risk | flask reset-demo  (run reset-demo before every demo)
```
Open http://localhost:5000. `.env` keys: SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL, OPENWEATHER_API_KEY, RISK_SCAN_INTERVAL_SECONDS, SIMULATE_MOVEMENT, MOVEMENT_STEP_DEG, PORT. **A real `.env` exists in chainshield-mca — never print or commit it.**

### Git state of chainshield-mca (checked 5 Oct)
Working tree clean. Branches: `main` (local) and `sem3-complete-features`.
Local `main` commits: 4e667d9 Initial → e162c87 Complete all Sem 3 modules → 74d8ffa Admin CRUD/reports/demo → dd07a27 Tune risk/open at MEDIUM → 6dff7e5 Premium UI → 8e39aef Remove Solution Challenge branding → **8b4089e** Align comments.
⚠️ **`origin/main` = cd95860 "Update README.md"** (edited on GitHub after e162c87). So local main and origin/main have **diverged** — a plain `git push` will be rejected. Fix: `git pull --rebase origin main` (expect a README.md conflict; keep the local version, which has the current text), then push. **Ask Bhavik before pushing.**
⚠️ The root `Solution Challenge` repo (old prototype) and `chainshield-mca` both point to the **same remote URL**. Bhavik hasn't decided whether the MCA project should get its own repo — ask before pushing.

---

## 5. Documentation content (what's inside the current report — PPT mirrors it 1:1)

Front matter: Cover → Declaration → Certificate → Preface → Acknowledgement → Index (page numbers).
1 Introduction: 1.1 Problem Definition · 1.2 Objective · 1.3 Core Components (7) · 1.4 Project Profile · 1.5 Need · 1.6 Scope · 1.7 Advantages & Limitations · 1.8 Proposed Time Line Chart · 1.9 Targeted Users
2 Requirement Determination & Analysis: 2.1 Determination · 2.2 Specification (13 FRs, 6 NFRs, HW/SW table)
3 System Design: 3.1 Use Case Diagram (+ architecture Fig 3.2) · 3.2 Data Dictionary · 3.3 UI Design (admin panel) · 3.4 Report Design
4 Development: 4.1 Coding Standards (9) · 4.2 Implementation Details · 4.3 Output Screens (15)
5 Testing: 5.1 Test Cases (13: TC001–TC013, all Pass)
6 Proposed Enhancement · 7 Conclusion · 8 Bibliography

Fonts: **Times New Roman everywhere**; H1 16 pt, H2 14 pt, body 12 pt, justified, 1.5 spacing, A4. Header: title + "MCA Semester 3 | LJ Institute of Computer Application"; footer: "Prepared By: Bhavik A. Visani, Diya Shah, Shruti Somani (Group 59) … Page N".
Figures: Fig 1.1 Gantt · 3.1 use case · 3.2 architecture · 3.3–3.8 admin panel · 3.9 reports · 4.1–4.9 code screenshots · 4.10–4.24 output screens. Tables: 1.1 profile · 1.2 actual progress · 1.3 users/access · 2.1 HW/SW · 3.1–3.9 data dictionary · 3.10–3.13 report layouts.

---

## 6. Rules ma'am gave earlier (keep following them)
- **The PPT and the documentation must have the SAME content.** Report = descriptive paragraphs; PPT = the same topics as short point-to-point bullets, in the same order.

## 7. Ma'am's 10 changes (~30 Sep) and exactly how they were done in Final_v2
| # | Her note | Done as |
|---|---|---|
| 1 | Your name in project profile | Profile table has Group 59 + 3 members with roll + enrollment, guide, domain, front/back end, DB, tools, platform, duration (Aug–Nov 2026), academic year |
| 2 | Timeline chart: phases vs Aug/Sep/Oct/Nov split W1–W4, Document bar across | Native Word/PPT table Gantt. Phases: Requirement Gathering (Aug W2) · Analysis & SRS (Aug W2–W3) · System Design (Aug W3–W4) · Env & Docker (Aug W3) · Coding (Aug W3–Sep W3) · UI Enhancement (Sep W3–W4) · Testing (Sep W3–Oct W1) · Implementation/Deployment (Oct W1–W2) · **Documentation (Aug W2–Nov W1)** · Final Review/Submission/Viva (Oct W4–Nov W2 — **assumed**). Plus Table 1.2 actual milestones |
| 3 | Targeted users in detail | Full paragraphs: Admin, Manager, Field Operators (Driver/Loco Pilot/Pilot/Captain), Scheduler (system actor), indirect beneficiaries + access table |
| 4 | Use case: no overlaps, straight lines, one include + one extend example | Redrawn (matplotlib, portrait). Generalization Admin→Manager→Field Operator so no lines cross. **«include»: Detect & Escalate Disruption → Generate Route Solutions. «extend»: Export Report (CSV) → View Reports.** Both explained in text |
| 5 | Data dictionary with sample (id 1 example) | Every table has a "Sample (id = 1)" column |
| 6 | UI design: screenshots of admin panel → report design | 3.3 = 6 admin panel screenshots (Overview, Users, Hubs, Cargo, Config, Activity Log) each with description; 3.4 = reports screenshot + layout tables of the 4 reports |
| 7 | Coding standards: 2 lines + screenshot & example both | 9 standards, each: 2-line description, **Example:** line, real code screenshot (rendered from repo files with line numbers) |
| 8 | Content in detail must be covered | All sections rewritten descriptively |
| 9 | Font Roman, size 16–14 | Times New Roman; 16 headings / 14 sub-headings / 12 body |
| 10 | Word content = PPT point-wise | PPT rebuilt section-by-section from the same content source |

## 8. Known caveats / things to tell Bhavik if relevant
1. **Viva/submission date unknown** → Gantt last row (Oct W4–Nov W2) is an assumption. Update when he knows.
2. **Some sample values in the data dictionary/report layouts are illustrative**, not from the DB (e.g. phone 9876543210, resolved_by "5 (Manisha Patel)" — DB actually has NULL, cargo_value 85000, current_lat 21.17, resolution-time 0.61 h). Labelled as sample data.
3. **Index page numbers** were computed from a LibreOffice render. Word may paginate ±1 page → after opening in Word, verify the Index. Same for the PDFs (made with LibreOffice).
4. **chainshield-mca/README.md has one stale line:** says the engine "Opens a disruption at AT-RISK+" — actual behaviour (and all docs) = opens at **MEDIUM**. Fix if editing README.
5. The SRS_Final was not revised for ma'am's changes (fonts/use case differ from the report). If she checks consistency, regenerate it.
6. `Claude outputs/ChainShield_MCA_Status_Report.md` (7 Sep) is **outdated** — ignore its "scaffold only" claims; everything is built now.

## 9. Pending / next steps
- [ ] Bhavik reviews Final_v2 report + PPT, prints/submits; viva prep (likely questions: risk formula, why weights, include vs extend, generalization, Socket.IO rooms, why SQLite, Docker).
- [ ] Resolve git divergence and decide the repo (own repo for chainshield-mca vs shared URL), then push — **with his permission**.
- [ ] Fix README stale line (§8.4).
- [ ] Optional: update SRS to match.
- [ ] Future product work (in Proposed Enhancement): better Gemini answers, PostgreSQL, real GPS/telematics, HTTPS, backups, SMS/WhatsApp alerts, PWA, ML risk model, multi-tenant, PDF reports.

## 10. How the v2 docs were generated (so you can edit/regenerate instead of hand-editing)
`Claude outputs/ChainShield_doc_generator_kit.zip` contains:
- `content.py` — **single source of truth** for all report + PPT text (each section has `doc` blocks and `ppt` points, data dictionary, coding standards, test cases, Gantt rows). Edit here, rebuild both.
- `build_docx.py` (python-docx; TNR styles, header/footer, Gantt table, index from `pages.json`), `build_pptx.py` (python-pptx; 16:9, navy/teal, TNR).
- `pages.py` + `cycle.sh` — build → convert to PDF with LibreOffice → read heading pages → rebuild so the Index numbers are filled.
- `usecase.py` (use case diagram), `codeshots.py` (code screenshots from repo files), `img/` (all 33 images incl. screenshots).
- ⚠️ Paths are hard-coded to `/home/claude/w/...` (img in `/home/claude/w/img/`, repo source in `/home/claude/w/src/chainshield-mca/`). Unzip there or change `IMG`/`SRC` constants. Needs python-docx, python-pptx, matplotlib, pygments, Pillow, LibreOffice.

## 11. Working rules with Bhavik (learned)
- Never modify the old prototype (`backend/`, `frontend/`, root README/HOW_TO_RUN/render.yaml).
- Don't overwrite his existing files — write new versions (`_v2`, `_v3` …) beside them.
- Ask before git push / anything irreversible. Never expose `.env`, `backend.env`, `vercel.env`, `serviceAccountKey.json`.
- Docs first, code only when he says start (that was the original rule; code is done now).
- He likes concise answers, honest pushback, logic before code. Keep "Solution Challenge" branding OUT of the MCA code/docs.
