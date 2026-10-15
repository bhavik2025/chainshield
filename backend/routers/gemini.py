"""
ChainShield — Gemini AI Assistant Router
POST /api/gemini/chat   — natural-language Q&A about shipments & disruptions
GET  /api/gemini/status — check if Gemini is configured
"""
import os, json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
import models
from auth import require_any

router = APIRouter(prefix="/api/gemini", tags=["gemini"])

# ── Schema ────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role:    str     # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message:  str
    history:  Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply:      str
    model:      str
    configured: bool


# ── System prompt builder ─────────────────────────────────────────────────────
def _build_system_prompt(db: Session) -> str:
    shipments   = db.query(models.Shipment).filter(
        models.Shipment.status != "delivered"
    ).all()
    disruptions = db.query(models.Disruption).all()

    ship_lines = []
    for s in shipments:
        risk_label = "🔴 Critical" if s.risk_score >= 70 else "🟡 Medium" if s.risk_score >= 40 else "🟢 Low"
        ship_lines.append(
            f"  • {s.id} | {s.name} | {s.mode.upper()} | {s.origin_city}→{s.dest_city} "
            f"| Status: {s.status} | Risk: {s.risk_score}/100 ({risk_label}) "
            f"| Progress: {s.progress}% | ETA: {s.eta or 'unknown'} | Cargo: {s.cargo}"
        )

    dis_lines = []
    for d in disruptions:
        dis_lines.append(
            f"  • [{d.severity.upper()}] {d.title} — {d.description[:120]}... "
            f"| Delay: +{d.estimated_delay_hours}h | Affects: {', '.join(d.affected_shipments)}"
        )

    ships_text = "\n".join(ship_lines) if ship_lines else "  (No active shipments)"
    dis_text   = "\n".join(dis_lines)  if dis_lines  else "  (No active disruptions)"

    return f"""You are ChainShield AI — a smart logistics assistant embedded in a real-time supply chain management platform.

## Your Capabilities
- Analyse live shipment risk scores (0-100) using a 4-factor model: Weather (40%) + Congestion (25%) + Cargo Sensitivity (20%) + Historic Delay (15%)
- Explain disruptions in plain language and recommend the best route alternatives
- Answer questions about ETAs, cost impacts, risk levels, and operational decisions
- Help managers triage multiple disruptions quickly

## Current Shipments (live data)
{ships_text}

## Active Disruptions
{dis_text}

## Risk Score Scale
- 0–29: LOW (no action needed)
- 30–49: MEDIUM (monitor closely, shipment flagged at-risk)
- 50–69: HIGH (disruption created, manager action recommended)
- 70–84: CRITICAL (immediate rerouting strongly advised)
- 85–100: SEVERE (all hands — halt and reroute now)

## Instructions
- Be concise and actionable — logistics managers are busy
- When asked about a specific shipment, reference its live data above
- Always state risk scores numerically when relevant
- Suggest specific solutions when disruptions are present
- If something is outside your data, say so honestly rather than guessing
- Use shipping/logistics terminology naturally
"""


# ── Gemini call ───────────────────────────────────────────────────────────────
def _call_gemini(system_prompt: str, history: List[ChatMessage], message: str) -> tuple[str, str]:
    """Returns (reply_text, model_name). Raises on API error."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key in ("your_gemini_api_key_here", ""):
        return _fallback_response(message), "fallback"

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
        )
        # Build conversation history
        gemini_history = []
        for msg in (history or []):
            gemini_history.append({
                "role": "user"  if msg.role == "user" else "model",
                "parts": [msg.content],
            })
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(message)
        return response.text, "gemini-1.5-flash"
    except ImportError:
        return _fallback_response(message), "fallback"
    except Exception as e:
        err = str(e)
        if "API_KEY_INVALID" in err or "invalid" in err.lower():
            return "⚠️ Gemini API key is invalid. Please check your GEMINI_API_KEY environment variable.", "error"
        if "quota" in err.lower():
            return "⚠️ Gemini API quota exceeded. Please check your usage limits.", "error"
        return f"⚠️ Gemini unavailable: {err}", "error"


def _fallback_response(message: str) -> str:
    """Smart rule-based fallback when Gemini API key is not configured."""
    msg = message.lower()
    if any(k in msg for k in ["risk", "score", "dangerous", "critical"]):
        return ("Based on the live risk engine data, I can see shipment risk scores ranging 0-100. "
                "Scores ≥70 trigger critical disruptions. Check the Manager Dashboard for colour-coded "
                "risk badges on each shipment card. 🔴 Red = critical, 🟡 Yellow = at-risk, 🟢 Green = safe.")
    if any(k in msg for k in ["disruption", "alert", "delay", "problem"]):
        return ("Active disruptions are flagged by the 4-factor risk engine (Weather 40% + Congestion 25% "
                "+ Cargo 20% + Historic Delay 15%). Each disruption comes with 2–3 ranked route alternatives. "
                "Open the alert modal to review and apply a solution.")
    if any(k in msg for k in ["route", "reroute", "alternate", "solution"]):
        return ("The ChainShield route optimiser generates 2–3 ranked alternatives for each disruption, "
                "ordered by risk score, ETA impact, and cost delta. The recommended option balances "
                "speed and cost. Open the disruption modal and click 'View Solutions' to compare.")
    if any(k in msg for k in ["weather", "storm", "wind", "rain"]):
        return ("Weather is the highest-weighted factor (40%) in ChainShield's risk engine. "
                "Live data from OpenWeatherMap is fetched at each shipment's current position. "
                "Thunderstorms add 40 risk points; heavy rain adds 22; clear skies add 0.")
    if any(k in msg for k in ["eta", "time", "when", "deliver"]):
        return ("ETA information is shown on each shipment card. Disruptions add estimated delay hours "
                "based on severity: Critical = +72h, High = +36h, Medium = +18h. "
                "After a manager applies a solution, the ETA adjusts by the solution's extra-time value.")
    if any(k in msg for k in ["cost", "price", "money", "expense"]):
        return ("Each re-route solution includes an extraCostUSD estimate. The recommended solution "
                "typically balances risk reduction with minimal cost overhead. "
                "Total cost-at-risk across the fleet is shown in the KPI dashboard.")
    return ("I'm ChainShield AI — your logistics intelligence assistant. I can help with:\n"
            "• Risk score explanations and thresholds\n"
            "• Disruption analysis and recommended solutions\n"
            "• Route optimisation options\n"
            "• Weather and congestion impact\n"
            "• ETA and cost delta analysis\n\n"
            "*(Add your GEMINI_API_KEY to .env to enable full AI-powered responses)*")


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/status")
def gemini_status(current_user: models.User = Depends(require_any)):
    api_key = os.getenv("GEMINI_API_KEY", "")
    configured = bool(api_key) and api_key not in ("your_gemini_api_key_here", "")
    return {"configured": configured, "model": "gemini-1.5-flash" if configured else "fallback"}


@router.post("/chat", response_model=ChatResponse)
def gemini_chat(
    body:         ChatRequest,
    current_user: models.User = Depends(require_any),
    db:           Session     = Depends(get_db),
):
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    system_prompt = _build_system_prompt(db)
    reply, model_name = _call_gemini(system_prompt, body.history or [], body.message)

    api_key     = os.getenv("GEMINI_API_KEY", "")
    configured  = bool(api_key) and api_key not in ("your_gemini_api_key_here", "")
    return ChatResponse(reply=reply, model=model_name, configured=configured)
