"""
AI Assistant — answers operations questions grounded in live ChainShield data.

With GEMINI_API_KEY set, the question plus a snapshot of the live database
(shipments, risk scores, open disruptions and their ranked route options) is
sent to Google Gemini. Without a key — or if the API call fails — a
rule-based offline engine answers from the same data, so the feature always
works in a demo even without internet.
"""
import re

from flask import current_app

from app.models import Shipment, Disruption, Hub

FIELD_OPERATOR_ROLES = ["captain", "pilot", "driver", "loco_pilot"]
SYSTEM_PROMPT = (
    "You are ChainShield Assistant, an operations co-pilot inside a supply-chain disruption "
    "monitoring system for Indian logistics. Answer ONLY from the live data snapshot provided. "
    "Be concise (under 150 words), use short bullet points where helpful, cite tracking numbers, "
    "and when asked what to do, recommend the ranked option #1 unless the data suggests otherwise, "
    "explaining the trade-off (extra time, extra cost in ₹, residual risk). If the data does not "
    "contain the answer, say so plainly."
)


def _shipments_for(user):
    q = Shipment.query
    if user.role in FIELD_OPERATOR_ROLES:
        q = q.filter_by(assigned_operator_id=user.id)
    return q.all()


def build_context(user) -> str:
    """Compact plain-text snapshot of the live data this user may see."""
    shipments = _shipments_for(user)
    ids = {s.id for s in shipments}
    active = [s for s in shipments if s.status != "Delivered"]
    open_d = [d for d in Disruption.query.filter_by(status="Open").all() if d.shipment_id in ids]

    lines = [
        "RISK MODEL: score = 0.40*weather + 0.25*congestion + 0.20*cargo sensitivity + 0.15*lane history; "
        "HIGH>=70, MEDIUM>=50, AT-RISK>=30, else LOW.",
        f"TOTALS: {len(shipments)} shipments, {len(active)} active, "
        f"{sum(1 for s in shipments if s.status == 'Delivered')} delivered, {len(open_d)} open disruptions.",
        "SHIPMENTS (tracking | route | mode | cargo | status | risk | value ₹ | operator):",
    ]
    for s in sorted(shipments, key=lambda s: s.risk_score or 0, reverse=True)[:40]:
        lines.append(
            f"- {s.tracking_no} | {s.origin}->{s.destination} | {s.transport_mode} | "
            f"{s.cargo_type.name if s.cargo_type else '-'} | {s.status} | {s.risk_level} {s.risk_score} | "
            f"{s.cargo_value or 0:,.0f} | {s.assigned_operator.name if s.assigned_operator else 'unassigned'}"
        )
    lines.append("OPEN DISRUPTIONS with ranked route options (#1 = recommended):")
    for d in sorted(open_d, key=lambda d: d.risk_score or 0, reverse=True)[:15]:
        lines.append(f"- {d.shipment.tracking_no}: {d.severity} ({d.risk_score}), dominant factor {d.type}")
        for sol in sorted(d.solutions, key=lambda x: x.option_no):
            lines.append(
                f"    #{sol.option_no} {sol.description} — +{sol.extra_time_hours}h, "
                f"+₹{sol.extra_cost:,.0f}, residual risk {sol.risk_score}"
            )
    lines.append("HUBS: " + ", ".join(h.name for h in Hub.query.order_by(Hub.name).all()))
    return "\n".join(lines)


# Result of the most recent Gemini call, shown on Admin > System Config so a
# key that is set but not working is visible (instead of just "Configured").
GEMINI_STATUS = {"ok": None, "detail": "Not called yet", "at": None}

GEMINI_ENDPOINTS = {
    # Google AI Studio keys (usually "AIza...")
    "ai_studio": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    # Vertex AI express-mode keys (usually "AQ....")
    "vertex": "https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent",
}


def ask(user, question: str, history=None) -> dict:
    question = (question or "").strip()
    if not question:
        return {"answer": "Please type a question.", "source": "offline"}

    api_key = (current_app.config.get("GEMINI_API_KEY") or "").strip()
    if api_key:
        try:
            answer = _ask_gemini(api_key, user, question, history or [])
            _set_status(True, "Last call succeeded")
            return {"answer": answer, "source": "gemini"}
        except Exception as exc:  # network down, bad key, quota, model retired...
            current_app.logger.warning("Gemini call failed, using offline engine: %s", exc)
            _set_status(False, str(exc)[:600])
            answer = offline_answer(user, question)
            return {"answer": answer + "\n\n(Gemini unavailable — answered by the offline engine.)", "source": "offline"}
    return {"answer": offline_answer(user, question), "source": "offline"}


def _set_status(ok, detail):
    from datetime import datetime

    GEMINI_STATUS.update(ok=ok, detail=detail, at=datetime.utcnow())


class GeminiHTTPError(RuntimeError):
    def __init__(self, kind, status, msg):
        super().__init__(f"{kind} HTTP {status}: {msg}")
        self.status = status


# Busy or rate-limited: worth retrying, or trying another model.
RETRYABLE = {429, 500, 503, 504}
_model_cache = {}


def _call_endpoint(kind, api_key, model, prompt):
    import requests

    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    resp = requests.post(GEMINI_ENDPOINTS[kind].format(model=model), json=body,
                         headers={"x-goog-api-key": api_key}, timeout=20)
    if resp.status_code != 200:
        try:
            msg = resp.json().get("error", {}).get("message", "")
        except ValueError:
            msg = resp.text[:150]
        raise GeminiHTTPError(kind, resp.status_code, msg)
    data = resp.json()
    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError(f"{kind}: empty response")
    return text


def _backup_models(api_key, primary, limit=3):
    """Other "flash" models this key can use (asked from Google once, then cached).
    Used when the configured model is overloaded (HTTP 503) or rate-limited (429)."""
    import requests

    if "list" not in _model_cache:
        names = []
        try:
            resp = requests.get("https://generativelanguage.googleapis.com/v1beta/models",
                                headers={"x-goog-api-key": api_key}, params={"pageSize": 200}, timeout=10)
            for m in resp.json().get("models", []):
                name = m.get("name", "").replace("models/", "")
                if ("generateContent" in m.get("supportedGenerationMethods", [])
                        and "flash" in name and not any(x in name for x in ("image", "tts", "audio", "live", "exp"))):
                    names.append(name)
        except Exception:
            names = []
        # Newest first: higher version numbers sort later alphabetically.
        _model_cache["list"] = sorted(set(names), reverse=True)
    return [n for n in _model_cache["list"] if n != primary][:limit]


def _ask_gemini(api_key, user, question, history) -> str:
    import time

    model = current_app.config.get("GEMINI_MODEL", "gemini-3.8-flash")
    convo = "\n".join(f"{h.get('role', 'user').upper()}: {h.get('text', '')}" for h in history[-6:]
                      if isinstance(h, dict))
    prompt = (
        f"LIVE DATA SNAPSHOT (user: {user.name}, role: {user.role})\n{build_context(user)}\n\n"
        f"RECENT CONVERSATION:\n{convo or '(none)'}\n\nQUESTION: {question}"
    )
    errors = []
    # 1) The configured model on Google AI Studio (AI Studio keys start "AIza..." or "AQ....").
    try:
        return _call_endpoint("ai_studio", api_key, model, prompt)
    except GeminiHTTPError as exc:
        errors.append(f"{model}: {exc}")
        busy = exc.status in RETRYABLE
    except Exception as exc:
        errors.append(f"{model}: {exc}")
        busy = False
    # 2) Overloaded: wait a moment and retry once, then try other flash models.
    if busy:
        time.sleep(1.5)
        for m in [model] + _backup_models(api_key, model):
            try:
                answer = _call_endpoint("ai_studio", api_key, m, prompt)
                if m != model:
                    current_app.logger.info("Gemini %s busy, answered with %s", model, m)
                return answer
            except Exception as exc:
                errors.append(f"{m}: {exc}")
    # 3) Vertex AI express keys use a different endpoint.
    try:
        return _call_endpoint("vertex", api_key, model, prompt)
    except Exception as exc:
        errors.append(f"vertex: {exc}")
    raise RuntimeError(" | ".join(errors))


# ------------------------------------------------------------ offline engine
def _fmt_shipment(s) -> str:
    out = (f"{s.tracking_no}: {s.origin} → {s.destination} by {s.transport_mode}, "
           f"{s.cargo_type.name if s.cargo_type else 'cargo'} worth ₹{s.cargo_value or 0:,.0f}. "
           f"Status {s.status}, risk {s.risk_level} ({s.risk_score}).")
    if s.assigned_operator:
        out += f" Operator: {s.assigned_operator.name}."
    return out


def _fmt_disruption(d) -> str:
    sols = sorted(d.solutions, key=lambda x: x.option_no)
    out = f"{d.shipment.tracking_no} — {d.severity} ({d.risk_score}), driven by {d.type}."
    if sols:
        best = sols[0]
        out += (f"\n  Recommended: {best.description} (+{best.extra_time_hours}h, +₹{best.extra_cost:,.0f}, "
                f"residual risk {best.risk_score}).")
        if len(sols) > 1:
            out += f" {len(sols) - 1} other option(s) on the Disruptions page."
    return out


def offline_answer(user, question: str) -> str:
    q = question.lower()
    shipments = _shipments_for(user)
    ids = {s.id for s in shipments}
    active = [s for s in shipments if s.status != "Delivered"]
    open_d = sorted([d for d in Disruption.query.filter_by(status="Open").all() if d.shipment_id in ids],
                    key=lambda d: d.risk_score or 0, reverse=True)

    m = re.search(r"cs-?\s?(\d+)", q)
    if m:
        s = next((x for x in shipments if x.tracking_no.upper() == f"CS-{m.group(1)}"), None)
        if not s:
            return f"I couldn't find shipment CS-{m.group(1)} among the shipments you can see."
        out = _fmt_shipment(s)
        d = next((d for d in open_d if d.shipment_id == s.id), None)
        out += "\n\nOpen disruption: " + _fmt_disruption(d) if d else "\n\nNo open disruption on this shipment."
        return out

    if any(k in q for k in ("formula", "calculat", "computed", "score work", "explain", "how is the risk",
                            "how does the risk", "how do you score", "risk engine")):
        return ("Each in-transit shipment is scored every scan cycle:\n"
                "• 40% weather severity at its current position (OpenWeatherMap or simulated)\n"
                "• 25% congestion for its transport mode\n"
                "• 20% cargo sensitivity (e.g. Hazardous 0.9, Perishable 0.7)\n"
                "• 15% disruption history on the same lane (last 90 days)\n"
                "≥70 HIGH, ≥50 MEDIUM, ≥30 AT-RISK, else LOW. At MEDIUM or above a disruption is opened (and escalated at HIGH) "
                "and the route solver ranks hold / reroute / mode-switch options by risk, time and cost.")

    if any(k in q for k in ("recommend", "what should", "suggest", "reroute", "action", "do now", "priority")):
        if not open_d:
            return "No open disruptions — no action needed right now."
        return "Highest-priority decisions:\n" + "\n".join("• " + _fmt_disruption(d) for d in open_d[:3])

    if "disrupt" in q or "alert" in q or "issue" in q or "problem" in q:
        if not open_d:
            return "There are no open disruptions right now."
        return f"{len(open_d)} open disruption(s):\n" + "\n".join("• " + _fmt_disruption(d) for d in open_d[:5])

    if any(k in q for k in ("value", "worth", "money", "cost", "₹", "rupee")):
        total = sum(s.cargo_value or 0 for s in active)
        at_risk = sum(s.cargo_value or 0 for s in active if s.risk_level in ("HIGH", "MEDIUM", "AT-RISK"))
        return f"Active cargo value ₹{total:,.0f}; value currently at risk ₹{at_risk:,.0f}."

    if any(k in q for k in ("high risk", "risky", "at risk", "at-risk", "danger", "worst", "riskiest")):
        risky = sorted([s for s in active if s.risk_level in ("HIGH", "MEDIUM", "AT-RISK")],
                       key=lambda s: s.risk_score or 0, reverse=True)
        if not risky:
            return "All active shipments are currently LOW risk."
        return f"{len(risky)} shipment(s) at risk:\n" + "\n".join("• " + _fmt_shipment(s) for s in risky[:5])

    if "deliver" in q:
        done = [s for s in shipments if s.status == "Delivered"]
        return (f"{len(done)} delivered: " + ", ".join(s.tracking_no for s in done)) if done else "Nothing delivered yet."

    if "hub" in q:
        hubs = Hub.query.order_by(Hub.name).all()
        return f"{len(hubs)} logistics hubs: " + ", ".join(h.name for h in hubs) + "."

    for mode in ("road", "rail", "sea", "air"):
        if mode in q:
            ms = [s for s in active if (s.transport_mode or "").lower() == mode]
            return (f"{len(ms)} active {mode} shipment(s):\n" + "\n".join("• " + _fmt_shipment(s) for s in ms[:6])
                    if ms else f"No active {mode} shipments.")

    if re.search(r"\b(summary|summari[sz]e|overview|status|situation|report|hi|hello|hey)\b", q) or "how are" in q:
        high = sum(1 for s in active if s.risk_level == "HIGH")
        med = sum(1 for s in active if s.risk_level == "MEDIUM")
        atr = sum(1 for s in active if s.risk_level == "AT-RISK")
        out = (f"Operations summary: {len(active)} active shipment(s) — {high} HIGH, {med} MEDIUM, {atr} AT-RISK; "
               f"{len(open_d)} open disruption(s).")
        if open_d:
            out += "\nTop priority: " + _fmt_disruption(open_d[0])
        return out

    return ("I can answer from live data. Try:\n• \"Give me a summary\"\n• \"Which shipments are high risk?\"\n"
            "• \"What should I do about open disruptions?\"\n• \"Tell me about CS-1003\"\n"
            "• \"How is the risk score calculated?\"\n• \"How much cargo value is at risk?\"")
