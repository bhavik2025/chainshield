# ChainShield — How to Run Locally

## Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

---

## 1 · Backend (FastAPI)

```bash
cd "Solution Challenge/backend"

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Add your OpenWeatherMap key for live weather data
# Edit .env and set:  OPENWEATHER_API_KEY=your_key_here
# Without a key the risk engine uses realistic simulation — still fully functional.

# Start the server
python -m uvicorn main:app --reload --port 8000
```

The API is now live at **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs**

On first start, the backend automatically seeds the database with all demo accounts and lookup data.

---

## 2 · Frontend (React + Vite)

Open a **second terminal**:

```bash
cd "Solution Challenge/frontend"

# Install Node dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

App is now live at **http://localhost:5173**

---

## Demo Accounts

All passwords are `demo1234`

| Role | Email | What you can do |
|---|---|---|
| **Admin** | admin@chainshield.com | Manage users, hubs, cargo types, view full audit log |
| **Manager** | manager@chainshield.com | View map, resolve disruptions, create shipments, trigger demo |
| **Captain** | captain@chainshield.com | Field operator — update shipment status, receive notifications |
| **Pilot** | pilot@chainshield.com | Field operator — air freight |
| **Driver** | driver@chainshield.com | Field operator — road freight |
| **Loco Pilot** | loco@chainshield.com | Field operator — rail freight |

---

## Quick Demo Flow

1. Log in as **Manager** (`manager@chainshield.com / demo1234`)
2. Click **"Trigger Demo Disruption"** in the Alerts panel
3. A Port Strike at Rotterdam appears on the map and alert feed
4. Click **"View & Resolve"** → pick a solution (e.g. Divert to Antwerp)
5. Open a new tab, log in as **Captain** → see the instant in-app notification
6. Log in as **Admin** → check the full activity audit trail

---

## How It Works

1. **Risk scanner** runs every 60 seconds — checks every active shipment's live weather + congestion + cargo sensitivity + historic delay probability. Auto-creates disruptions when composite score ≥ 50.
2. **Manager** can also click "Trigger Demo Disruption" to instantly simulate a Port Strike at Rotterdam.
3. **Manager** selects a resolution solution → affected field operator receives an in-app notification instantly.
4. **Admin** manages users, logistics hubs, cargo types, and sees the full audit trail.

---

## Environment Variables (Backend)

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_API_KEY` | Optional | Live weather data (simulation used if missing) |
| `GEMINI_API_KEY` | Optional | Powers the AI assistant chat |
| `JWT_SECRET` | Auto-generated | Token signing secret |
| `CORS_ORIGINS` | Production only | Comma-separated list of allowed frontend URLs |
