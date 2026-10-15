"""
Route optimization helpers.
Provides alternate waypoints when a disruption is resolved.
"""
import math


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    """Great-circle distance between two coordinates in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def interpolate_position(origin: dict, destination: dict, progress: int) -> dict:
    """
    Return the estimated current lat/lng based on progress percentage.
    Simple linear interpolation along the great-circle path.
    """
    t = progress / 100
    lat = origin["lat"] + (destination["lat"] - origin["lat"]) * t
    lng = origin["lng"] + (destination["lng"] - origin["lng"]) * t
    return {"lat": round(lat, 4), "lng": round(lng, 4)}


def build_waypoints(origin: dict, destination: dict, mode: str) -> list[dict]:
    """
    Generate a list of waypoints for a route.
    For sea routes, adds realistic intermediate ocean waypoints.
    """
    o_lat, o_lng = origin["lat"], origin["lng"]
    d_lat, d_lng = destination["lat"], destination["lng"]

    if mode == "sea":
        # Add a mid-ocean waypoint for long sea routes
        mid_lat = (o_lat + d_lat) / 2
        mid_lng = (o_lng + d_lng) / 2
        # Push mid-point slightly off the direct line (nautical channel)
        mid_lat += (d_lat - o_lat) * 0.1
        return [
            {"lat": o_lat, "lng": o_lng},
            {"lat": round(mid_lat, 4), "lng": round(mid_lng, 4)},
            {"lat": d_lat, "lng": d_lng},
        ]
    elif mode == "air":
        # Great-circle arc: add single midpoint
        mid_lat = (o_lat + d_lat) / 2 + 3  # slight arc upward
        mid_lng = (o_lng + d_lng) / 2
        return [
            {"lat": o_lat, "lng": o_lng},
            {"lat": round(mid_lat, 4), "lng": round(mid_lng, 4)},
            {"lat": d_lat, "lng": d_lng},
        ]
    else:
        # Road / rail: direct with single midpoint
        return [
            {"lat": o_lat, "lng": o_lng},
            {"lat": round((o_lat+d_lat)/2, 4), "lng": round((o_lng+d_lng)/2, 4)},
            {"lat": d_lat, "lng": d_lng},
        ]


def estimate_eta_days(distance_km: float, mode: str) -> float:
    """Rough ETA in days based on mode average speed."""
    speeds_kmh = {"sea": 35, "air": 750, "road": 80, "rail": 100}
    speed = speeds_kmh.get(mode, 60)
    return distance_km / speed / 24
