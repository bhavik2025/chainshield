"""
Sea routes — Sea shipments follow the shortest shipping route over water.

The route comes from the searoute package: a shortest-path (Dijkstra) search
over Eurostat's MARNET global maritime network of shipping lanes, straits and
canals. So a ship from Mumbai to Sydney goes round Sri Lanka and through the
Indonesian straits, and one to Rotterdam goes through Suez, without crossing
land. It works for any hub in the world and needs no internet connection.
A Sea route is: origin hub -> shipping lanes -> destination hub.
Road, Rail and Air keep the straight origin -> destination line.

Distances here are in plain degrees, the same unit as MOVEMENT_STEP_DEG.
"""
import math
from functools import lru_cache

import searoute


def _dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _wrap(lng):
    """Longitude in [-180, 180)."""
    return (lng + 180) % 360 - 180


def _near(lng, ref):
    """lng shifted by whole turns so it is within 180 degrees of ref."""
    return lng - 360 * round((lng - ref) / 360)


@lru_cache(maxsize=256)
def _sea_path(origin, dest):
    """Shortest sea route as (lat, lng) points, cached per origin/destination pair."""
    try:
        line = searoute.searoute((origin[1], origin[0]), (dest[1], dest[0]))
        lanes = [(lat, lng) for lng, lat in line["geometry"]["coordinates"]]
    except Exception:  # no route found in the network: fall back to a straight line
        lanes = []
    # Keep each longitude within 180 degrees of the previous point, so a route
    # across the Pacific doesn't jump from +180 to -180 on the map.
    path = [origin]
    for lat, lng in lanes + [dest]:
        path.append((lat, _near(lng, path[-1][1])))
    return path


def route_path(mode, origin, dest):
    """List of (lat, lng) points from origin to dest for this transport mode."""
    if origin is None or dest is None:
        return [p for p in (origin, dest) if p is not None]
    if mode != "Sea":
        return [origin, dest]
    return list(_sea_path((origin[0], origin[1]), (dest[0], dest[1])))


def project(path, pos):
    """Snap pos onto the path. Returns (segment index, snapped point)."""
    # Positions are stored in [-180, 180); a route across the Pacific runs past 180.
    pos = min(((pos[0], pos[1] + s) for s in (0, 360, -360)), key=lambda p: min(_dist(p, v) for v in path))
    best = (float("inf"), 0, tuple(path[0]))
    for k in range(len(path) - 1):
        a, b = path[k], path[k + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        seg2 = dx * dx + dy * dy
        t = 0.0 if seg2 == 0 else max(0.0, min(1.0, ((pos[0] - a[0]) * dx + (pos[1] - a[1]) * dy) / seg2))
        q = (a[0] + t * dx, a[1] + t * dy)
        d = _dist(pos, q)
        if d < best[0]:
            best = (d, k, q)
    return best[1], best[2]


def split_at(path, pos):
    """(travelled, remaining) point lists, split at pos snapped onto the path."""
    if len(path) < 2:
        return [], []
    k, q = project(path, pos)
    return list(path[:k + 1]) + [q], [q] + list(path[k + 1:])


def advance(path, pos, step):
    """Move `step` degrees along the path from pos. Returns ((lat, lng), arrived)."""
    k, cur = project(path, pos)
    remaining = step
    for target in path[k + 1:]:
        d = _dist(cur, target)
        if d > remaining:
            f = remaining / d
            return (cur[0] + (target[0] - cur[0]) * f, _wrap(cur[1] + (target[1] - cur[1]) * f)), False
        remaining -= d
        cur = target
    return (path[-1][0], _wrap(path[-1][1])), True
