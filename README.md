# ChainShield — Smart Supply Chain Optimizer
### Solution Challenge 2026 | Smart Supply Chains Track

> **Real-time disruption detection and dynamic route optimization for global supply chains.**

ChainShield continuously scores every active shipment across a 4-factor risk model, automatically flags disruptions before they cascade, and instantly generates optimized rerouting solutions for managers to deploy — all with in-app notifications to field operators.

---

## The Problem

Modern global supply chains manage millions of concurrent shipments across volatile transportation networks. Critical transit disruptions — from sudden weather events to hidden operational bottlenecks — are chronically identified *only after* delivery timelines are already compromised.

## Our Solution

ChainShield's **Risk Engine v2** scores every shipment every 60 seconds using four weighted factors:

| Factor | Weight | Signal |
|---|---|---|
| Weather Severity | 40% | Live OpenWeatherMap data at current shipment position |
| Route Congestion | 25% | Trade-lane baseline + shipment-specific variance |
| Cargo Sensitivity | 20% | High-risk cargo types (Pharma, Electronics, Hazmat…) |
| Historic Delay Probability | 15% | Destination country + transport mode history |

Composite score thresholds:
- **≥ 70 → CRITICAL/HIGH** — Disruption auto-created, solutions generated, manager alerted
- **≥ 50 → MEDIUM** — Disruption flagged, solutions provided
- **≥ 30 → AT RISK** — Shipment marked at-risk, monitored closely
- **< 30 → LOW** — No action, score updated silently

---

## Key Features

- **Live Risk Scanning** — Background scheduler runs every 60 seconds across all active shipments
- **Dynamic Route Solutions** — 2 ranked alternatives generated per disruption (reroute vs. hold), with extra time, extra cost, and risk score for each
- **Role-Based Dashboards** — Separate UIs for Admin, Manager, and 4 types of Field Operators (Captain, Pilot, Driver, Loco Pilot)
- **In-App Notifications** — When a manager resolves a disruption, the assigned field operator is notified instantly
- **Gemini AI Assistant** — Ask the ChainShield AI assistant anything about your supply chain
- **Live World Map** — Leaflet map with animated disruption zones, shipment routes, and real-time positions
- **Chat System** — Direct messaging between users via 5-digit chat IDs
- **Admin Panel** — Full user management, logistics hub configuration, cargo type management, and activity audit log
- **Demo Mode** — One-click "Trigger Demo Disruption" simulates a Port Strike at Rotterdam

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Leaflet.js, Lucide icons |
| Backend | FastAPI (Python), SQLAlchemy, SQLite |
| Auth | JWT (local dev) + Firebase Auth (production) |
| AI | Google Gemini API |
| Real-time | Firebase Firestore (disruption sync) |
| Scheduling | APScheduler (background risk scan) |
| Weather | OpenWeatherMap API (with simulation fallback) |
| Deployment | Frontend → Vercel, Backend → Render (Docker) |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1 · Backend (FastAPI)

```bash
cd "Solution Challenge/backend"

# Install Python dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn main:app --reload --port 8000
```

API live at **http://localhost:8000** · Docs at **http://localhost:8000/docs**

> Optional: add `OPENWEATHER_API_KEY=your_key` to `.env` for live weather data.  
> Without a key the risk engine uses realistic simulation — fully functional.

### 2 · Frontend (React + Vite)

```bash
cd "Solution Challenge/frontend"

# Install Node dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

App live at **http://localhost:5173**

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@chainshield.com | demo1234 |
| Manager | manager@chainshield.com | demo1234 |
| Captain (Field) | captain@chainshield.com | demo1234 |
| Pilot (Field) | pilot@chainshield.com | demo1234 |
| Driver (Field) | driver@chainshield.com | demo1234 |
| Loco Pilot (Field) | loco@chainshield.com | demo1234 |

---

## Demo Walkthrough

1. Log in as **Manager** (`manager@chainshield.com / demo1234`)
2. Click **"Trigger Demo Disruption"** — simulates a Port Strike at Rotterdam
3. The disruption appears on the map and in the Alerts panel
4. Click **"View & Resolve"** → choose a solution (e.g. Divert to Antwerp)
5. Switch to a **Field Operator** account — they receive an instant in-app notification with the selected solution
6. Log in as **Admin** to see the full activity audit trail

---

## Project Structure

```
Solution Challenge/
├── backend/                    FastAPI Python backend
│   ├── main.py                 App entry point + scheduler setup
│   ├── models.py               SQLAlchemy DB models
│   ├── schemas.py              Pydantic request/response schemas
│   ├── seed.py                 DB seed (demo accounts + lookup data)
│   ├── auth.py                 JWT + Firebase auth middleware
│   ├── services/
│   │   ├── risk_engine.py      4-Factor risk scoring + disruption creation
│   │   ├── weather.py          OpenWeatherMap integration
│   │   └── route.py            Waypoint builder + position interpolation
│   └── routers/
│       ├── shipments.py        Shipment CRUD + operator status updates
│       ├── disruptions.py      Disruption detection + resolution
│       ├── admin.py            User, hub, cargo management + activity log
│       ├── notifications.py    In-app notification delivery
│       ├── chat.py             Direct messaging between users
│       └── gemini.py           Gemini AI assistant endpoint
│
└── frontend/                   React + Vite dashboard
    └── src/
        ├── pages/
        │   ├── AdminDashboard.jsx      Full admin control panel
        │   ├── ManagerDashboard.jsx    Shipment map + disruption resolution
        │   ├── FieldDashboard.jsx      Operator view + status updates
        │   └── NewTransportPage.jsx    Create new shipment form
        ├── components/
        │   ├── MapView.jsx             Leaflet world map (live shipments + disruptions)
        │   ├── KPICards.jsx            Dashboard summary metrics
        │   ├── ShipmentList.jsx        Filterable shipment table
        │   ├── AlertModal.jsx          Disruption resolution modal with solutions
        │   ├── GeminiAssistant.jsx     AI chat assistant
        │   ├── ChatModal.jsx           Direct messaging UI
        │   └── NotificationPanel.jsx   In-app notification feed
        ├── context/
        │   ├── AppContext.jsx           Global state + API polling (30s refresh)
        │   └── AuthContext.jsx          Auth state + JWT management
        └── utils/
            └── api.js                  API client (JWT bearer auth)
```

---

## Deployment

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set env var: `VITE_API_URL=https://<your-render-url>`
4. Deploy

### Backend → Render
1. Push `backend/` to GitHub
2. Create new Web Service on [render.com](https://render.com) using the included `Dockerfile`
3. Set env vars: `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `CORS_ORIGINS`
4. Deploy

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Manager Dashboard  │  Admin Panel  │  Field Operator Dashboard  │
│         └─────── 30s polling + real-time Firestore sync ────────┤
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JWT)
┌────────────────────────────▼────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │ Risk Engine │   │ Route Solver │   │   Gemini AI (chat)   │  │
│  │  (60s scan) │   │  (waypoints) │   │                      │  │
│  └──────┬──────┘   └──────────────┘   └──────────────────────┘  │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │              SQLite DB  (shipments, disruptions,         │    │
│  │               users, notifications, messages, logs)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │                           │
┌────────▼────────┐        ┌─────────▼────────┐
│  OpenWeatherMap │        │  Firebase/Firestore│
│  (live weather) │        │  (real-time sync)  │
└─────────────────┘        └──────────────────┘
```

---

*Built for Google Solution Challenge 2026 — Smart Supply Chains Track*
