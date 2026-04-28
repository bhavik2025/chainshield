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

---

## 2 · Frontend (React + Vite)

Open a **second terminal**:

```bash
cd "Solution Challenge/chainshield"

# Install Node dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

App is now live at **http://localhost:5173**

---

## Demo Accounts

| Role        | Email                        | Password   |
|-------------|------------------------------|------------|
| Admin       | admin@chainshield.com        | demo1234   |
| Manager     | manager@chainshield.com      | demo1234   |
| Captain     | captain@chainshield.com      | demo1234   |
| Pilot       | pilot@chainshield.com        | demo1234   |
| Driver      | driver@chainshield.com       | demo1234   |
| Loco Pilot  | loco@chainshield.com         | demo1234   |

---

## How It Works

1. **Risk scanner** runs every 60 seconds in the background — it checks every active shipment's live weather + congestion + geo-political risk and auto-creates disruptions when the score ≥ 40.
2. **Manager** can also click "Trigger Demo Disruption" to instantly simulate a Port Strike at Rotterdam.
3. **Manager** selects a resolution solution → affected field operator receives an in-app notification instantly.
4. **Admin** manages users, logistics hubs, cargo types, and sees the full audit trail.

