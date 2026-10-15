"""
OpenWeatherMap integration.
Fetches current weather conditions at a lat/lng coordinate.
Falls back to a simulated response if no API key is configured.
"""
import os, httpx, random
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


async def get_weather(lat: float, lng: float) -> dict | None:
    """
    Returns OpenWeatherMap 'current weather' response dict, or None on failure.
    Falls back to a realistic simulation when no API key is set.
    """
    if not API_KEY or API_KEY == "your_openweathermap_api_key_here":
        return _simulate_weather(lat, lng)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(BASE_URL, params={
                "lat": lat, "lon": lng, "appid": API_KEY, "units": "metric"
            })
            if resp.status_code == 200:
                return resp.json()
            return _simulate_weather(lat, lng)
    except Exception:
        return _simulate_weather(lat, lng)


def _simulate_weather(lat: float, lng: float) -> dict:
    """
    Produces a plausible simulated weather reading based on location.
    High-lat / Pacific positions get stormier weather for realism.
    """
    # Higher latitudes or mid-Pacific → more chance of bad weather
    is_rough_zone = abs(lat) > 45 or (120 < abs(lng) < 180)

    if is_rough_zone and random.random() < 0.35:
        # Storm conditions
        weather_id   = random.choice([200, 201, 202, 212, 221])  # thunderstorm
        wind_speed   = random.uniform(18, 35)  # m/s (~35-68 knots)
        description  = "thunderstorm with heavy rain"
        temp         = random.uniform(10, 20)
    elif is_rough_zone and random.random() < 0.4:
        # Heavy rain / squall
        weather_id   = random.choice([502, 503, 504, 522])
        wind_speed   = random.uniform(12, 20)
        description  = "heavy intensity rain"
        temp         = random.uniform(12, 22)
    else:
        # Clear / partly cloudy
        weather_id   = random.choice([800, 801, 802, 500])
        wind_speed   = random.uniform(2, 10)
        description  = "clear sky" if weather_id == 800 else "few clouds"
        temp         = random.uniform(18, 30)

    return {
        "weather": [{"id": weather_id, "description": description}],
        "main":    {"temp": round(temp, 1), "humidity": random.randint(40, 90)},
        "wind":    {"speed": round(wind_speed, 1)},
        "coord":   {"lat": lat, "lon": lng},
        "_simulated": True,
    }


def weather_summary(data: dict) -> dict:
    """Extract the key fields we care about from a weather response."""
    if not data:
        return {}
    return {
        "condition":   data["weather"][0]["description"],
        "weather_id":  data["weather"][0]["id"],
        "temp_c":      data["main"]["temp"],
        "wind_ms":     data["wind"]["speed"],
        "wind_knots":  round(data["wind"]["speed"] * 1.944, 1),
        "simulated":   data.get("_simulated", False),
    }
