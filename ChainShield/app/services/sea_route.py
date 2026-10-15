"""
Sea lanes — keeps Sea shipments on water instead of a straight line over land.

Ships follow a fixed coastal lane (west coast, around Sri Lanka, up the east
coast to the Hooghly). A Sea route is: origin hub -> nearest lane point ->
along the lane -> lane point nearest the destination -> destination hub.
Road, Rail and Air keep the straight origin -> destination line.

Distances here are in plain degrees, the same unit as MOVEMENT_STEP_DEG.
"""
import math

# Offshore waypoints, ordered north-west -> south -> north-east.
SEA_LANE = [
    (22.6, 69.9),   # Gulf of Kutch (Kandla)
    (21.5, 69.3),   # off Porbandar
    (20.6, 70.9),   # off Diu
    (20.6, 72.2),   # Gulf of Khambhat mouth (Surat / Hazira)
    (18.9, 72.6),   # off Mumbai
    (15.4, 73.5),   # off Goa
    (12.9, 74.5),   # off Mangaluru
    (9.9, 75.9),    # off Kochi
    (7.6, 77.2),    # off Kanyakumari
    (6.3, 79.6),    # off Colombo
    (5.6, 80.6),    # south of Sri Lanka (Dondra Head)
    (6.3, 82.0),    # off Hambantota
    (7.8, 82.0),    # off Batticaloa
    (9.0, 81.6),    # off Trincomalee
    (10.5, 80.6),   # off Point Pedro
    (13.1, 80.5),   # off Chennai
    (15.8, 81.6),   # off Krishna delta
    (17.6, 83.6),   # off Visakhapatnam
    (19.5, 86.0),   # off Puri
    (20.6, 87.6),   # off Dhamra
    (21.3, 88.1),   # Sandheads, Hooghly mouth
    (21.8, 88.05),  # Sagar Island
    (22.2, 88.15),  # Diamond Harbour
    (22.4, 88.25),  # up the Hooghly to Kolkata
]


def _dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _nearest_lane_index(point):
    return min(range(len(SEA_LANE)), key=lambda i: _dist(point, SEA_LANE[i]))


def route_path(mode, origin, dest):
    """List of (lat, lng) points from origin to dest for this transport mode."""
    if origin is None or dest is None:
        return [p for p in (origin, dest) if p is not None]
    if mode != "Sea":
        return [origin, dest]
    i, j = _nearest_lane_index(origin), _nearest_lane_index(dest)
    lane = SEA_LANE[i:j + 1] if i <= j else SEA_LANE[j:i + 1][::-1]
    return [tuple(origin)] + list(lane) + [tuple(dest)]


def project(path, pos):
    """Snap pos onto the path. Returns (segment index, snapped point)."""
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
            return (cur[0] + (target[0] - cur[0]) * f, cur[1] + (target[1] - cur[1]) * f), False
        remaining -= d
        cur = target
    return tuple(path[-1]), True
