"""
Weather signal service — wraps the OpenWeatherMap API, with a simulated
fallback when OPENWEATHER_API_KEY is not set (see .env.example).
"""
import random

import requests
from flask import current_app


def get_weather_severity(lat: float, lng: float) -> float:
    """Return a 0-100 weather severity score for a given position."""
    api_key = current_app.config.get("OPENWEATHER_API_KEY")

    if not api_key:
        # Simulated fallback so the app is fully demoable without an API key.
        return round(random.uniform(10, 90), 2)

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lng, "appid": api_key, "units": "metric"}
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        wind_speed = data.get("wind", {}).get("speed", 0)
        severity = min(100, wind_speed * 5)  # simple heuristic, refined in next phase
        return round(severity, 2)
    except requests.RequestException:
        return round(random.uniform(10, 90), 2)
