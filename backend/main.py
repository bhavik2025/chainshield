"""
ChainShield -- FastAPI Backend
Run with: python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import engine, SessionLocal, Base
import models
from seed import seed
from routers import auth, shipments, disruptions, notifications, admin, chat, gemini
from services.risk_engine import scan_all

load_dotenv()

# Build CORS origins list from env (comma-separated) + always include localhost
_cors_env = os.getenv("CORS_ORIGINS", "")
_cors_list = [u.strip() for u in _cors_env.split(",") if u.strip()]
ALLOWED_ORIGINS = list({
    *_cors_list,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
})


async def run_risk_scan():
    db = SessionLocal()
    try:
        found = await scan_all(db)
        if found:
            print(f"[Risk Engine] {len(found)} new disruption(s) detected")
    except Exception as e:
        print(f"[Risk Engine] Error: {e}")
    finally:
        db.close()


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    scheduler.add_job(run_risk_scan, "interval", seconds=60, id="risk_scan")
    scheduler.start()
    print("[ChainShield] Backend started. Risk scanner active (60s interval).")
    yield
    scheduler.shutdown()
    print("[ChainShield] Backend stopped.")


app = FastAPI(
    title="ChainShield API",
    description="Smart Supply Chain Disruption Detection & Dynamic Route Optimization",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

app.include_router(auth.router)
app.include_router(shipments.router)
app.include_router(disruptions.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(gemini.router)


@app.get("/")
def root():
    return {"service": "ChainShield API", "version": "1.0.0", "status": "running", "docs": "/docs"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
