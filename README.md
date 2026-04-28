# LogiSense — Smart Supply Chain Optimizer
### Solution Challenge 2026 | Smart Supply Chains Track

Real-time disruption detection and dynamic route optimization for global supply chains.

---

## Quick Start (Local Development)

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # add your OpenWeatherMap key (optional)
uvicorn main:app --reload   # runs at http://localhost:8000
```
API docs available at: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev                 # runs at http://localhost:3000
```

> The frontend works fully offline using built-in mock data — no backend required.

---

## Deployment

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set env var: `VITE_API_URL=https://<your-render-url>/api`
4. Deploy

### Backend → Render
1. Push `backend/` to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set env var: `OPENWEATHER_API_KEY=<your-key>`
4. Deploy

---

## Project Structure

```
├── frontend/                  React + Vite dashboard
│   └── src/
│       ├── components/
│       │   ├── MapView.jsx    Leaflet world map with live shipments
│       │   ├── KPICards.jsx   Dashboard summary metrics
│       │   ├── AlertPanel.jsx Disruption alert feed
│       │   ├── ShipmentTable.jsx  Shipment list with risk scores
│       │   ├── RerouteModal.jsx   Route optimization modal
│       │   └── RiskChart.jsx  Risk score bar chart
│       ├── data/mockData.js   Offline fallback data
│       └── utils/api.js       API client with graceful fallback
│
└── backend/                   FastAPI Python backend
    ├── main.py                API routes & CORS
    ├── risk_engine.py         Disruption risk scoring algorithm
    └── data/shipments.py      Shipment & disruption datasets
```

---

## How It Works

1. **Risk Engine** scores every shipment (0–100) using 4 weighted factors:
   - Weather severity at current position (40%)
   - Proximity to congestion hotspots (25%)
   - Cargo sensitivity (20%)
   - Historical delay probability by mode (15%)

2. **Disruption Detection** flags shipments when composite score exceeds thresholds (≥70 = Critical)

3. **Route Optimizer** generates 2–3 ranked alternative routes for disrupted shipments, scored by risk, ETA impact, and cost delta

4. **Live Weather** integrates OpenWeatherMap API for real-time weather risk (fallback to heuristics when no key provided)
