"""
Headless Blender build for the topic-02 topography scene (#scene-topography):
ONE terrain rendered three ways — 3D model, aerial photo, topographic map.
Run with:

  blender --background --python scripts/blender/build_topography_terrain.py [-- --fast]

(on this machine: "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")
--fast builds the heights, runs the self-checks and writes the data module
only (no albedo, no GLB) — for tuning the terrain.

The composition is the scene's former topographic map (spec §5.1,
docs/superpowers/specs/2026-09-28-topography-scene-redesign-design.md):
a 412 m summit with a rocky S-running spur, a footpath from a 2×2 building
cluster up the gentle SW flank, a dirt road across the south, two more
buildings in the SE, an orchard (SW), sparse woodland (E) and woodland (NW).

Everything is procedural (numpy + bpy); no external downloads. One height
field, one feature layout, three outputs that therefore cannot drift:

  public/assets/lessons/topic02/topography-terrain/terrain.glb   (Draco)
      glTF Y-up, 1 unit = 350 m horizontally, heights (h − 280 m) × 2 / 350.
      Nodes, all with their origin at the world origin:
        Terrain    heightfield (5 m cells), planar UV over the sheet
                   (glTF v = 0 at the north edge → load albedo with flipY=false)
        Walls      diorama plinth, vertex-colour strata
        Trees      ~1.5k low-poly crowns + trunks, vertex colour, spherical normals
        Buildings  six flat-roofed farm buildings, vertex colour
  .../topography-terrain/albedo.jpg   ground colour, 2048×1536, row 0 = north
  src/components/lessons/topic-02/topographyTerrain.data.ts   (GENERATED)
      contours (exact iso-lines of the same triangles), road, path,
      buildings, vegetation, grid, label anchors, stack guides — sheet units.

Coordinate conventions (must match topographyLayout.ts):
  metres  X east, Y north, origin = sheet centre, X ∈ ±700, Y ∈ ±525
  sheet   x east 0–100, y SOUTH 0–75, 1 unit = 14 m
"""

import math
import os
import sys

import bpy
import numpy as np

# ---------------------------------------------------------------- constants

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'lessons', 'topic02', 'topography-terrain')
OUT_DATA_TS = os.path.join(ROOT, 'src', 'components', 'lessons', 'topic-02', 'topographyTerrain.data.ts')
FAST = '--fast' in sys.argv

SHEET_W_M, SHEET_H_M = 1400.0, 1050.0
HALF_W, HALF_H = SHEET_W_M / 2, SHEET_H_M / 2
M_PER_SHEET = 14.0
M_PER_UNIT = 350.0          # = topographyLayout WORLD.mPerUnit
VE = 2.0                    # = WORLD.ve (3D only; see design/docs/assumptions.md)
DATUM_M = 280.0             # = WORLD.datumM
CELL_M = 2.5                 # 560 × 420 cells — crisp ravine edges and ridgelines
NX, NY = int(SHEET_W_M / CELL_M), int(SHEET_H_M / CELL_M)   # 280 × 210 cells
BASE_DEPTH_U = 0.12         # plinth bottom below y = 0
ALB_W, ALB_H = 3072, 2304   # 0.456 m per pixel

BASE_M, PEAK_M = 288.0, 412.0
LEVELS_M = list(range(300, 411, 10))
INDEX_EVERY = 50

BUDGET = {'terrain.glb': 2.5e6, 'albedo.jpg': 1.5e6, 'total': 4.0e6}

# Sampled from the former aerial image (TOPIC02-TOPO-PHOTO.png) — sRGB.
PALETTE = {
    'grass': '#8E8260', 'grass_lush': '#858057', 'grass_dry': '#A09274', 'plain': '#978A69',
    'gully': '#79754F', 'rock': '#A39B89', 'rock_dark': '#7E7766', 'scree': '#A89C82',
    'shrub': '#5A5838', 'shrub_dry': '#6B6644', 'road': '#C3AF8D', 'rut': '#AD9A79',
    'path': '#B8A785', 'woodland_floor': '#6E6749', 'orchard_soil': '#9C8666', 'orchard_row': '#8B7A5A',
    'sparse_floor': '#847A58', 'yard': '#B5A787',
}

# ---------------------------------------------------------------- feature layout (sheet units)

SUMMIT_S = (55.9, 28.4)
ROAD_S = [(-2, 64.0), (12, 64.4), (26, 64.6), (40, 65.0), (55, 64.4), (68, 62.8), (80, 60.4), (92, 58.6), (102, 57.6)]
PATH_S = [(26.2, 59.4), (31.0, 54.2), (36.4, 49.0), (41.2, 44.1), (45.9, 39.4), (50.4, 34.3), (53.8, 30.6), (55.6, 28.9)]
BUILDINGS_S = [  # centre x, y, footprint w × h (sheet units), yaw (deg, clockwise on the map)
    (19.0, 55.6, 2.0, 1.3, -4), (24.2, 55.2, 2.0, 1.3, -4), (19.4, 59.2, 2.0, 1.3, -4), (24.6, 58.8, 2.0, 1.3, -4),
    (80.6, 57.2, 2.1, 1.35, -9), (86.0, 55.9, 2.1, 1.35, -9),
]
WOODLAND_S = [(2.0, 4.5), (9, 2.4), (18, 3.0), (24.5, 7.5), (25.5, 13.5), (21, 18.8), (12, 20.2), (4, 17.5), (1.2, 11)]
ORCHARD_S = [(1.8, 46.5), (15.8, 46.0), (16.4, 60.2), (2.2, 60.6)]
SPARSE_S = [(78.5, 41.0), (90, 38.8), (98.8, 42.5), (99.0, 53.0), (90.5, 54.4), (80.0, 53.2), (77.2, 47.0)]
VEG_LABELS = {'orchard': ('מטע', 8.8, 53.4), 'sparse': ('חורש דליל', 85.6, 47.0), 'woodland': None}
CONTOUR_LABEL_AT = {300: (5.5, 36.0), 350: (40.0, 44.0), 400: (53.0, 26.6)}

# Radius (m) of the 300 m ring from the summit along each axis, from the former map.
R_E, R_W, R_N, R_S = 465.0, 714.0, 347.0, 612.0
SPUR_BEARING = math.radians(170.0)   # compass: the rocky spur runs S by E


def sheet_to_m(x, y):
    return np.asarray(x) * M_PER_SHEET - HALF_W, HALF_H - np.asarray(y) * M_PER_SHEET


def m_to_sheet(X, Y):
    return (np.asarray(X) + HALF_W) / M_PER_SHEET, (HALF_H - np.asarray(Y)) / M_PER_SHEET


def z_units(h_m):
    return (np.asarray(h_m) - DATUM_M) * VE / M_PER_UNIT


def srgb(hex_color):
    """Hex → linear RGB (Blender vertex-colour space)."""
    h = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return np.array(out, dtype=np.float32)


def hex01(hex_color):
    """Hex → sRGB 0–1 (texture authoring space)."""
    h = hex_color.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


SX, SY = (float(v) for v in sheet_to_m(*SUMMIT_S))
GX = np.linspace(-HALF_W, HALF_W, NX + 1)          # mesh vertex columns, W→E
GY = np.linspace(-HALF_H, HALF_H, NY + 1)          # mesh vertex rows, row 0 = south
SPUR_U = (math.sin(SPUR_BEARING), math.cos(SPUR_BEARING))    # along the spur (east, north)
SPUR_N = (-SPUR_U[1], SPUR_U[0])                              # its east-side normal

# ---------------------------------------------------------------- noise (verbatim from build_contour_mountain.py @ HEAD)


class Perlin:
    def __init__(self, seed):
        rng = np.random.default_rng(seed)
        p = rng.permutation(256)
        self.perm = np.concatenate([p, p]).astype(np.int64)
        ang = rng.uniform(0, 2 * np.pi, 256)
        self.gx = np.cos(ang)
        self.gy = np.sin(ang)

    def __call__(self, x, y):
        x0 = np.floor(x)
        y0 = np.floor(y)
        xf = x - x0
        yf = y - y0
        xi = x0.astype(np.int64) & 255
        yi = y0.astype(np.int64) & 255
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
        v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)

        def g(ix, iy, dx, dy):
            h = self.perm[self.perm[ix] + iy]
            return self.gx[h] * dx + self.gy[h] * dy

        n00 = g(xi, yi, xf, yf)
        n10 = g(xi + 1, yi, xf - 1, yf)
        n01 = g(xi, yi + 1, xf, yf - 1)
        n11 = g(xi + 1, yi + 1, xf - 1, yf - 1)
        nx0 = n00 + u * (n10 - n00)
        nx1 = n01 + u * (n11 - n01)
        return (nx0 + v * (nx1 - nx0)) * 1.41


PN = [Perlin(s) for s in (211, 223, 237, 241, 253, 267, 271, 283, 297, 301, 313)]


def fbm(p, x, y, octaves, gain=0.5):
    s = 0.0
    a = 1.0
    norm = 0.0
    for o in range(octaves):
        f = 2.0 ** o
        s = s + a * p(x * f + 17.3 * o, y * f - 9.1 * o)
        norm += a
        a *= gain
    return s / norm


def ridged(p, x, y, octaves):
    """Ridged multifractal in ~[0, 1] — sharp crests, for rock and crags."""
    s = 0.0
    a = 0.5
    w = 1.0
    norm = 0.0
    for o in range(octaves):
        f = 2.0 ** o
        n = 1.0 - np.abs(p(x * f + 5.3 * o, y * f + 1.7 * o))
        n = n * n * w
        w = np.clip(n * 1.8, 0.0, 1.0)
        s = s + n * a
        norm += a
        a *= 0.5
    return s / norm


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _window(t, a, b):
    u = np.clip((t - a) / (b - a), 0.0, 1.0)
    return np.sin(np.pi * u) ** 2


def box_blur(a, radius_px):
    """Separable box blur ×2 (≈ gaussian), edge-clamped."""
    k = max(1, int(radius_px))
    out = a
    for _ in range(2):
        for axis in (0, 1):
            pad = [(0, 0)] * out.ndim
            pad[axis] = (k + 1, k)
            p = np.pad(out, pad, mode='edge')
            cs = np.cumsum(p, axis=axis, dtype=np.float64)
            if axis == 0:
                out = (cs[2 * k + 1:] - cs[:-2 * k - 1]) / (2 * k + 1)
            else:
                out = (cs[:, 2 * k + 1:] - cs[:, :-2 * k - 1]) / (2 * k + 1)
    return out.astype(np.float32)


# ---------------------------------------------------------------- polylines & polygons (sheet units)

def catmull_rom(pts, step):
    """Open Catmull-Rom spline through pts, sampled every ~step units."""
    P = np.asarray(pts, dtype=np.float64)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(math.ceil(np.hypot(*(p2 - p1)) / step)))
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def chaikin_closed(pts, iterations=3):
    P = np.asarray(pts, dtype=np.float64)
    for _ in range(iterations):
        Q = np.roll(P, -1, axis=0)
        P = np.stack([0.75 * P + 0.25 * Q, 0.25 * P + 0.75 * Q], axis=1).reshape(-1, 2)
    return P


def round_corners(pts, r):
    """A field boundary: straight edges, corners cut back by r (sheet units)."""
    P = np.asarray(pts, dtype=np.float64)
    out = []
    n = len(P)
    for i in range(n):
        prev, cur, nxt = P[i - 1], P[i], P[(i + 1) % n]
        a = (prev - cur) / np.hypot(*(prev - cur))
        b = (nxt - cur) / np.hypot(*(nxt - cur))
        for t in np.linspace(0, 1, 4):          # quadratic Bézier through the corner
            p0, p2 = cur + a * r, cur + b * r
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * cur + t * t * p2)
    return np.array(out)


def wobble_closed(pts, amp, seed, spacing=0.5):
    """Irregular natural edge: densify a smooth ring and push each point along
    its normal by a sum of random sines (sheet units)."""
    P = chaikin_closed(pts, 3)
    seg = np.hypot(*np.diff(np.vstack([P, P[:1]]), axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    L = s[-1]
    u = np.linspace(0, L, int(L / spacing), endpoint=False)
    X = np.interp(u, s, np.append(P[:, 0], P[0, 0]))
    Y = np.interp(u, s, np.append(P[:, 1], P[0, 1]))
    rng = np.random.default_rng(seed)
    off = np.zeros_like(u)
    for k, f in enumerate((2, 3, 5, 8, 13)):
        off += amp / (1 + 0.6 * k) * np.sin(2 * np.pi * f * u / L + rng.uniform(0, 2 * np.pi))
    tx = np.roll(X, -1) - np.roll(X, 1)
    ty = np.roll(Y, -1) - np.roll(Y, 1)
    tl = np.hypot(tx, ty)
    nx, ny = ty / tl, -tx / tl                     # outward for a clockwise-on-screen ring
    if np.mean((X - X.mean()) * nx + (Y - Y.mean()) * ny) < 0:
        nx, ny = -nx, -ny
    return np.stack([X + nx * off, Y + ny * off], axis=1)


def inside_polygon(x, y, poly):
    """Even-odd point-in-polygon, vectorised over x/y arrays."""
    x = np.asarray(x)
    y = np.asarray(y)
    inside = np.zeros(x.shape, dtype=bool)
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        cond = (y1 > y) != (y2 > y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xint = (x2 - x1) * (y - y1) / (y2 - y1) + x1
        inside ^= cond & (x < xint)
    return inside


def nearest_on_polyline(X, Y, pts_m, max_d, with_arc=False):
    """Distance to a polyline (metres) and the nearest point on it, for points
    within the polyline's bbox + max_d; elsewhere dist = inf. with_arc also
    returns the arc length (m from the first vertex) of that nearest point."""
    X = np.asarray(X, dtype=np.float64)
    Y = np.asarray(Y, dtype=np.float64)
    dist = np.full(X.shape, np.inf)
    PX = np.zeros(X.shape)
    PY = np.zeros(X.shape)
    ARC = np.zeros(X.shape)
    lo = pts_m.min(axis=0) - max_d
    hi = pts_m.max(axis=0) + max_d
    sel = (X >= lo[0]) & (X <= hi[0]) & (Y >= lo[1]) & (Y <= hi[1])
    if not sel.any():
        return (dist, PX, PY, ARC) if with_arc else (dist, PX, PY)
    xs, ys = X[sel], Y[sel]
    d_sel = np.full(xs.shape, np.inf)
    px_sel = np.zeros(xs.shape)
    py_sel = np.zeros(xs.shape)
    arc_sel = np.zeros(xs.shape)
    run = 0.0
    for k in range(len(pts_m) - 1):
        ax, ay = pts_m[k]
        bx, by = pts_m[k + 1]
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy
        if L2 == 0:
            continue
        t = np.clip(((xs - ax) * vx + (ys - ay) * vy) / L2, 0, 1)
        qx, qy = ax + t * vx, ay + t * vy
        d = np.hypot(xs - qx, ys - qy)
        better = d < d_sel
        d_sel = np.where(better, d, d_sel)
        px_sel = np.where(better, qx, px_sel)
        py_sel = np.where(better, qy, py_sel)
        arc_sel = np.where(better, run + t * math.sqrt(L2), arc_sel)
        run += math.sqrt(L2)
    dist[sel] = d_sel
    PX[sel] = px_sel
    PY[sel] = py_sel
    ARC[sel] = arc_sel
    return (dist, PX, PY, ARC) if with_arc else (dist, PX, PY)


def meander(line, amp, seed):
    """A worn trail never runs ruler-straight: push the densified line sideways
    by a sum of sines, pinned to zero at both ends (sheet units)."""
    seg = np.hypot(*np.diff(line, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    u = s / s[-1]
    rng = np.random.default_rng(seed)
    off = np.zeros_like(u)
    for k, f in enumerate((3, 5, 9, 14)):
        off += amp / (1 + 0.7 * k) * np.sin(np.pi * f * u + rng.uniform(0, 2 * np.pi))
    off *= np.sin(np.pi * u) ** 0.5
    t = np.gradient(line, axis=0)
    t /= np.hypot(t[:, 0], t[:, 1])[:, None]
    return line + np.stack([-t[:, 1], t[:, 0]], axis=1) * off[:, None]


ROAD_D = catmull_rom(ROAD_S, 0.5)                       # sheet units
PATH_D = meander(catmull_rom(PATH_S, 0.3), 0.32, 12)
ROAD_M = np.stack(sheet_to_m(ROAD_D[:, 0], ROAD_D[:, 1]), axis=1)
PATH_M = np.stack(sheet_to_m(PATH_D[:, 0], PATH_D[:, 1]), axis=1)
WOODLAND_P = wobble_closed(WOODLAND_S, 1.0, 5)
ORCHARD_P = round_corners(ORCHARD_S, 0.6)
SPARSE_P = wobble_closed(SPARSE_S, 1.3, 8)


def building_frames():
    """Each building: centre (m), half-size (m), yaw (rad, math convention)."""
    out = []
    for x, y, w, h, yaw in BUILDINGS_S:
        cx, cy = sheet_to_m(x, y)
        # sheet yaw is clockwise on the map (y down) → counter-clockwise in metres is the negative.
        out.append((float(cx), float(cy), w * M_PER_SHEET / 2, h * M_PER_SHEET / 2, -math.radians(yaw)))
    return out


BUILDINGS_M = building_frames()


def box_distance(X, Y, b):
    """Signed-ish distance outside a rotated rectangle (0 inside)."""
    cx, cy, hw, hh, a = b
    dx, dy = X - cx, Y - cy
    lx = dx * math.cos(a) + dy * math.sin(a)
    ly = -dx * math.sin(a) + dy * math.cos(a)
    ox = np.maximum(np.abs(lx) - hw, 0)
    oy = np.maximum(np.abs(ly) - hh, 0)
    return np.hypot(ox, oy)


# ---------------------------------------------------------------- height field (metres)

_lE, _lW, _lN, _lS = (math.log(v) for v in (R_E, R_W, R_N, R_S))
_A0 = (_lE + _lW + _lN + _lS) / 4
_A1 = (_lE - _lW) / 2
_B1 = (_lN - _lS) / 2
_A2 = ((_lE + _lW) - (_lN + _lS)) / 4


def ring_radius(dx, dy):
    """Direction-dependent radius of the 300 m ring: a smooth periodic
    (log-Fourier) curve through the four axis radii — no corners."""
    th = np.arctan2(dy, dx)
    return np.exp(_A0 + _A1 * np.cos(th) + _B1 * np.sin(th) + _A2 * np.cos(2 * th))


def spur_frame(X, Y):
    dx, dy = X - SX, Y - SY
    t = dx * SPUR_U[0] + dy * SPUR_U[1]
    s = dx * SPUR_N[0] + dy * SPUR_N[1]
    return dx, dy, t, s


def base_height(X, Y):
    """Landform before erosion: a broad dome with a steep summit cone, a spur
    running S by E whose east flank drops away, on a gently undulating plain."""
    dx, dy, t, s = spur_frame(X, Y)
    r = np.hypot(dx, dy)
    rho = r / ring_radius(dx, dy)
    # A rounded crown, not a needle: soften ρ over the top ~15–20 m.
    rho_c = np.sqrt(rho * rho + 0.03 ** 2) - 0.03
    f = 0.52 * np.exp(-(rho_c / 0.16) ** 1.45) + 0.48 * np.exp(-(rho / 0.78) ** 2.1)
    h = BASE_M + (PEAK_M - BASE_M) * f
    h = h + 18.0 * np.exp(-(s / 60.0) ** 2) * _window(t, 40.0, 520.0)          # the spur crest
    h = h - 12.0 * smoothstep(40.0, 170.0, s) * _window(t, 10.0, 470.0)         # steep east flank
    h = h + 1.5 * fbm(PN[0], X / 90.0, Y / 90.0, 3) + 0.6 * fbm(PN[1], X / 22.0, Y / 22.0, 2)
    return h


# ---------------------------------------------------------------- drainage (traced, not painted)
#
# Ravines are the paths water actually takes: each one is traced downhill
# along the gradient of the landform (with a little inertia and meander),
# then carved with a V profile that deepens and widens downstream. Main
# ravines are traced first; tributaries are traced on the surface the main
# ravines have already cut, so they bend into them — a dendritic pattern.

def _grid_sampler(Hg):
    def f(x, y):
        fi = min(max((x + HALF_W) / CELL_M, 0.0), NX - 1e-6)
        fj = min(max((y + HALF_H) / CELL_M, 0.0), NY - 1e-6)
        i, j = int(fi), int(fj)
        u, v = fi - i, fj - j
        return ((1 - u) * (1 - v) * Hg[j, i] + u * (1 - v) * Hg[j, i + 1]
                + (1 - u) * v * Hg[j + 1, i] + u * v * Hg[j + 1, i + 1])
    return f


def _trace(h, x, y, rng, step=4.0, max_len=420.0, min_grad=0.018, floor_m=299.0):
    """Follow the steepest descent until the channel reaches the plain."""
    pts = [(x, y)]
    pdx = pdy = 0.0
    for n in range(int(max_len / step)):
        if h(x, y) < floor_m:
            break
        e = 3.0
        gx = (h(x + e, y) - h(x - e, y)) / (2 * e)
        gy = (h(x, y + e) - h(x, y - e)) / (2 * e)
        g = math.hypot(gx, gy)
        if g < min_grad:
            break
        dx, dy = -gx / g, -gy / g
        if n:
            dx, dy = 0.65 * dx + 0.35 * pdx, 0.65 * dy + 0.35 * pdy
            wig = rng.normal(0, 0.12)
            dx, dy = dx - wig * dy, dy + wig * dx
            L = math.hypot(dx, dy)
            dx, dy = dx / L, dy / L
        x, y = x + dx * step, y + dy * step
        if abs(x) > HALF_W - 25 or abs(y) > HALF_H - 25:
            break
        pts.append((x, y))
        pdx, pdy = dx, dy
    return np.array(pts)


def _carve(X, Y, traces):
    carve = np.zeros(np.shape(X))
    for tr in traces:
        pts, depth = tr['pts'], tr['depth']
        if len(pts) < 6:
            continue
        arcs = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
        total = float(arcs[-1])
        d, _, _, arc = nearest_on_polyline(X, Y, pts, 30.0, with_arc=True)
        near = np.isfinite(d)
        if not near.any():
            continue
        a = arc[near]
        w = tr['w0'] + 0.035 * a                                    # widens downstream
        # Channels shallow out toward the plain (they build a fan, not a canyon).
        above = np.interp(a, arcs, tr['hb']) - 297.0
        amp = depth * smoothstep(0.0, 70.0, a) * (1.0 - smoothstep(0.72 * total, total, a)) * smoothstep(0.0, 16.0, above)
        prof = np.clip(1.0 - d[near] / w, 0.0, 1.0) ** 1.35           # V-shaped
        carve[near] = np.maximum(carve[near], amp * prof)
    return carve


def _drainage():
    rng = np.random.default_rng(17)
    Xg, Yg = np.meshgrid(GX, GY)
    Hb = base_height(Xg, Yg)
    h = _grid_sampler(Hb)
    ux, uy = SPUR_U
    nx, ny = SPUR_N
    traces = []
    # East flank of the spur: the deep, rocky ravines.
    for t in (70, 128, 183, 240, 292, 347, 402, 452):
        t += rng.uniform(-10, 10)
        x0, y0 = SX + ux * t + nx * 24, SY + uy * t + ny * 24
        traces.append({'pts': _trace(h, x0, y0, rng, max_len=rng.uniform(260, 420)),
                       'depth': rng.uniform(5.0, 8.5), 'w0': rng.uniform(5.5, 8.0)})
    # The summit cone: shorter gullies all round.
    for a in (20, 62, 105, 140, 200, 238, 280):
        a = math.radians(a + rng.uniform(-8, 8))
        r0 = rng.uniform(62, 80)                    # gullies head below the summit, not in it
        traces.append({'pts': _trace(h, SX + r0 * math.cos(a), SY + r0 * math.sin(a), rng, max_len=rng.uniform(150, 280)),
                       'depth': rng.uniform(2.0, 3.4), 'w0': rng.uniform(5.0, 7.0)})
    # Gentle west flank: shallow swales.
    for t in (110, 225, 335):
        x0, y0 = SX + ux * t - nx * 30, SY + uy * t - ny * 30
        traces.append({'pts': _trace(h, x0, y0, rng, max_len=rng.uniform(220, 360)),
                       'depth': rng.uniform(1.6, 2.6), 'w0': rng.uniform(7.0, 10.0)})
    for tr in traces:
        tr['hb'] = np.array([h(x, y) for x, y in tr['pts']])
    # Tributaries, traced on the surface the main ravines have already cut.
    Hc = Hb - _carve(Xg, Yg, traces)
    hc = _grid_sampler(Hc)
    mains = list(traces[:8])
    for k in range(len(mains) - 1):
        for side in (0.35, 0.7):
            t = 70 + (k + side) * 55 + rng.uniform(-6, 6)
            s0 = rng.uniform(70, 150)
            x0, y0 = SX + ux * t + nx * s0, SY + uy * t + ny * s0
            pts = _trace(hc, x0, y0, rng, max_len=rng.uniform(80, 170))
            traces.append({'pts': pts, 'depth': rng.uniform(2.0, 3.6), 'w0': rng.uniform(3.5, 5.0),
                           'hb': np.array([h(x, y) for x, y in pts])})
    print(f'DRAINAGE: {len(traces)} lines')
    return traces


DRAINAGE = _drainage()


def natural_height(X, Y):
    """The land before roads, paths and building pads: the landform, cut by
    its drainage, with crags where the east flank is steep."""
    h = base_height(X, Y) - _carve(X, Y, DRAINAGE)
    _, _, t, s = spur_frame(X, Y)
    rocky = smoothstep(45.0, 110.0, s) * _window(t, 30.0, 460.0)
    return h + rocky * 0.9 * (ridged(PN[3], X / 16.0, Y / 16.0, 3) - 0.45)


def shaped_height(X, Y):
    """natural_height + building pads, the road bench and the worn path."""
    X = np.asarray(X, dtype=np.float64)
    Y = np.asarray(Y, dtype=np.float64)
    h = natural_height(X, Y)
    for b in BUILDINGS_M:
        pad = float(natural_height(np.array([b[0]]), np.array([b[1]]))[0])
        w = 1.0 - smoothstep(0.0, 7.0, box_distance(X, Y, b))
        h = h + (pad - h) * w
    d, PX, PY = nearest_on_polyline(X, Y, ROAD_M, 12.0)
    near = np.isfinite(d)
    if near.any():
        level = natural_height(PX[near], PY[near]) - 0.35 * (1.0 - smoothstep(2.5, 4.0, d[near]))
        w = 1.0 - smoothstep(4.0, 9.0, d[near])
        h[near] = h[near] + (level - h[near]) * w
    d, PX, PY = nearest_on_polyline(X, Y, PATH_M, 6.0)
    near = np.isfinite(d)
    if near.any():
        level = shaped_centerline(PX[near], PY[near]) - 0.15
        w = 0.6 * (1.0 - smoothstep(1.5, 4.0, d[near]))
        h[near] = h[near] + (level - h[near]) * w
    return h


def shaped_centerline(X, Y):
    """Height on the path's centreline (pads/road can't reach it; natural is enough)."""
    return natural_height(X, Y)


def eval_rows(xs, ys, fn, chunk=128):
    """fn over the grid xs × ys (ys row order kept), chunked by rows."""
    parts = []
    for r0 in range(0, len(ys), chunk):
        Xc, Yc = np.meshgrid(xs, ys[r0:r0 + chunk])
        parts.append(fn(Xc, Yc).astype(np.float64))
    return np.concatenate(parts, axis=0)


# ---------------------------------------------------------------- mesh grid + exact sampling


def surface_triangles():
    """Alternating-diagonal triangulation, CCW seen from +z (as build_contour_mountain)."""
    n1 = NX + 1
    j, i = np.meshgrid(np.arange(NY), np.arange(NX), indexing='ij')
    a = (j * n1 + i).ravel()
    b = a + 1
    c = a + n1 + 1
    d = a + n1
    even = ((i + j) % 2 == 0).ravel()
    t1 = np.where(even[:, None], np.stack([a, b, c], 1), np.stack([a, b, d], 1))
    t2 = np.where(even[:, None], np.stack([a, c, d], 1), np.stack([b, c, d], 1))
    return np.concatenate([t1, t2], axis=0).astype(np.int64)


def sample_mesh(H, X, Y):
    """Height on the triangulated surface itself (same diagonals as surface_triangles)."""
    X = np.asarray(X, dtype=np.float64)
    Y = np.asarray(Y, dtype=np.float64)
    fi = np.clip((X + HALF_W) / CELL_M, 0, NX - 1e-9)
    fj = np.clip((Y + HALF_H) / CELL_M, 0, NY - 1e-9)
    i = np.floor(fi).astype(np.int64)
    j = np.floor(fj).astype(np.int64)
    u = fi - i
    v = fj - j
    ha, hb, hc, hd = H[j, i], H[j, i + 1], H[j + 1, i + 1], H[j + 1, i]
    even = (i + j) % 2 == 0
    e1 = ha + u * (hb - ha) + v * (hc - hb)
    e2 = ha + u * (hc - hd) + v * (hd - ha)
    o1 = ha + u * (hb - ha) + v * (hd - ha)
    o2 = hc + (1 - u) * (hd - hc) + (1 - v) * (hb - hc)
    return np.where(even, np.where(u >= v, e1, e2), np.where(u + v <= 1, o1, o2))


# ---------------------------------------------------------------- contours (verbatim helpers @ HEAD)

def extract_contour(xy, zs, tris, level_z):
    """Exact iso-line of the triangle surface at z = level_z → list of loops."""
    above = zs[tris] > level_z
    cnt = above.sum(axis=1)
    mixed = np.nonzero((cnt == 1) | (cnt == 2))[0]
    adj = {}
    pts = {}

    def cross(a, b):
        key = (a, b) if a < b else (b, a)
        if key not in pts:
            za, zb = zs[a], zs[b]
            t = (level_z - za) / (zb - za)
            pts[key] = xy[a] + t * (xy[b] - xy[a])
        return key

    for ti in mixed:
        a, b, c = (int(v) for v in tris[ti])
        keys = []
        for p, q in ((a, b), (b, c), (c, a)):
            if (zs[p] > level_z) != (zs[q] > level_z):
                keys.append(cross(p, q))
        if len(keys) == 2:
            k0, k1 = keys
            adj.setdefault(k0, []).append(k1)
            adj.setdefault(k1, []).append(k0)

    loops = []
    seen = set()
    for start in adj:
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        closed = False
        while True:
            nxt = [k for k in adj[cur] if k != prev]
            if not nxt:
                break
            if nxt[0] == start:
                closed = True
                break
            if nxt[0] in seen:
                break
            loop.append(nxt[0])
            seen.add(nxt[0])
            prev, cur = cur, nxt[0]
        loops.append((np.array([pts[k] for k in loop]), closed))
    loops.sort(key=lambda lc: len(lc[0]), reverse=True)
    return loops


def douglas_peucker(points, tol):
    pts = np.asarray(points)
    if len(pts) < 3:
        return pts
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        if e <= s + 1:
            continue
        a, b = pts[s], pts[e]
        ab = b - a
        seg = pts[s + 1:e] - a
        L = np.hypot(*ab)
        d = np.hypot(seg[:, 0], seg[:, 1]) if L == 0 else np.abs(ab[0] * seg[:, 1] - ab[1] * seg[:, 0]) / L
        k = int(np.argmax(d))
        if d[k] > tol:
            m = s + 1 + k
            keep[m] = True
            stack.append((s, m))
            stack.append((m, e))
    return pts[keep]


def simplify_closed(loop_map, tol):
    pts = np.asarray(loop_map)
    far = int(np.argmax(np.hypot(pts[:, 0] - pts[0, 0], pts[:, 1] - pts[0, 1])))
    a = douglas_peucker(pts[:far + 1], tol)
    b = douglas_peucker(np.vstack([pts[far:], pts[:1]]), tol)
    return np.vstack([a, b[1:-1]])


def tangent_angle(pts, k, closed=True):
    n = len(pts)
    a = pts[(k - 2) % n] if closed else pts[max(0, k - 2)]
    b = pts[(k + 2) % n] if closed else pts[min(n - 1, k + 2)]
    ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))   # sheet: y down → SVG rotate()
    if ang > 90:
        ang -= 180
    elif ang <= -90:
        ang += 180
    return ang


def build_contours(H, tris):
    xs, ys = np.meshgrid(GX, GY)
    xy = np.stack([xs.ravel(), ys.ravel()], axis=1)
    zs = H.ravel()
    levels = []
    for L in LEVELS_M:
        rings = []
        for lp, closed in extract_contour(xy, zs, tris, float(L)):
            if len(lp) < 12:
                continue
            sx, sy = m_to_sheet(lp[:, 0], lp[:, 1])
            ring = np.stack([sx, sy], axis=1)
            if not closed or np.any((ring[:, 0] < 0.05) | (ring[:, 0] > 99.95) | (ring[:, 1] < 0.05) | (ring[:, 1] > 74.95)):
                raise RuntimeError(f'contour {L} m is open or touches the sheet edge')
            rings.append(simplify_closed(ring, 0.04))
        label = None
        if L in CONTOUR_LABEL_AT and rings:
            px, py = CONTOUR_LABEL_AT[L]
            ring = rings[0]
            k = int(np.argmin(np.hypot(ring[:, 0] - px, ring[:, 1] - py)))
            label = (float(ring[k, 0]), float(ring[k, 1]), tangent_angle(ring, k))
        levels.append({'heightM': L, 'index': L % INDEX_EVERY == 0, 'rings': rings, 'label': label})
    return levels


# ---------------------------------------------------------------- self-checks

def check(cond, msg):
    if not cond:
        raise RuntimeError('SELF-CHECK FAILED: ' + msg)


def check_heights(H):
    k = int(np.argmax(H))
    j, i = divmod(k, NX + 1)
    sx, sy = m_to_sheet(GX[i], GY[j])
    check(abs(H.max() - PEAK_M) <= 0.5, f'max height {H.max():.1f} ≠ {PEAK_M}')
    check(math.hypot(sx - SUMMIT_S[0], sy - SUMMIT_S[1]) <= 1.5, f'summit at ({sx:.1f}, {sy:.1f}) ≠ {SUMMIT_S}')
    return float(sx), float(sy)


def bbox(ring):
    return ring[:, 0].min(), ring[:, 1].min(), ring[:, 0].max(), ring[:, 1].max()


def check_contours(levels):
    by = {lv['heightM']: lv for lv in levels}
    r300 = by[300]['rings']
    check(len(r300) == 1, f'300 m contour has {len(r300)} rings (want exactly 1)')
    x0, y0, x1, y1 = bbox(r300[0])
    check(min(x0, y0, 100 - x1, 75 - y1) >= 1.0, f'300 m ring too close to the edge: bbox {x0:.1f},{y0:.1f},{x1:.1f},{y1:.1f}')
    for got, want, name in ((x0, 5, 'W'), (y0, 4, 'N'), (x1, 89, 'E'), (y1, 72.5, 'S')):
        check(abs(got - want) <= 4.0, f'300 m ring {name} extent {got:.1f} ≠ {want} ± 4')
    x0, y0, x1, y1 = bbox(by[350]['rings'][0])
    cx, cy, w = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0
    check(abs(cx - 53) <= 4 and abs(cy - 34) <= 4 and 18 <= w <= 32, f'350 m ring bbox centre ({cx:.1f},{cy:.1f}) width {w:.1f}')
    r400 = by[400]['rings']
    check(len(r400) >= 1 and inside_polygon(np.array([SUMMIT_S[0]]), np.array([SUMMIT_S[1]]), r400[0])[0], '400 m ring must contain the summit')
    for lv in levels:
        print(f'CONTOUR {lv["heightM"]} m: {len(lv["rings"])} ring(s) {[len(r) for r in lv["rings"]]} pts')


def check_resample(H, levels):
    worst = 0.0
    for lv in levels:
        for ring in lv['rings']:
            X, Y = sheet_to_m(ring[:, 0], ring[:, 1])
            worst = max(worst, float(np.abs(sample_mesh(H, X, Y) - lv['heightM']).max()))
    check(worst <= 0.5, f'contour vertex off its level by {worst:.2f} m')
    print(f'CHECK resample: worst {worst:.3f} m')


def check_path(H):
    h = sample_mesh(H, PATH_M[:, 0], PATH_M[:, 1])
    running = np.maximum.accumulate(h)
    dip = float((running - h).max())
    check(dip <= 1.0, f'path loses {dip:.2f} m on the way up')
    end = PATH_M[-1]
    check(math.hypot(end[0] - SX, end[1] - SY) <= 20.0, 'path does not reach the summit')
    print(f'CHECK path: {h[0]:.1f} m → {h[-1]:.1f} m, worst dip {dip:.2f} m')


def check_pads(H):
    for n, b in enumerate(BUILDINGS_M):
        cx, cy, hw, hh, a = b
        u, v = np.meshgrid(np.linspace(-hw, hw, 9), np.linspace(-hh, hh, 7))
        X = cx + u * math.cos(a) - v * math.sin(a)
        Y = cy + u * math.sin(a) + v * math.cos(a)
        z = sample_mesh(H, X, Y)
        check(z.max() - z.min() < 0.6, f'building {n} pad varies {z.max() - z.min():.2f} m')


def check_budget():
    total = 0
    for name in ('terrain.glb', 'albedo.jpg'):
        size = os.path.getsize(os.path.join(OUT_DIR, name))
        total += size
        check(size <= BUDGET[name], f'{name} is {size / 1e6:.2f} MB > {BUDGET[name] / 1e6} MB')
    check(total <= BUDGET['total'], f'assets total {total / 1e6:.2f} MB')
    print(f'CHECK budget: {total / 1e6:.2f} MB')


# ---------------------------------------------------------------- blender mesh helpers

MATS = ['Terrain', 'Wall', 'Leaves', 'Bark', 'Roof', 'BuildingWall']
MI = {n: i for i, n in enumerate(MATS)}


def new_material(name, vertex_color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.9
    if vertex_color:
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Color'
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def build_mesh(name, co, tris, mats, face_mat=None, corner_col=None, corner_nrm=None, corner_uv=None, smooth=True):
    co = np.asarray(co, dtype=np.float32)
    tris = np.asarray(tris, dtype=np.int32)
    F = len(tris)
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(co))
    mesh.vertices.foreach_set('co', co.ravel())
    mesh.loops.add(F * 3)
    mesh.loops.foreach_set('vertex_index', tris.ravel())
    mesh.polygons.add(F)
    mesh.polygons.foreach_set('loop_start', (np.arange(F) * 3).astype(np.int32))
    mesh.update(calc_edges=True)
    for m in mats:
        mesh.materials.append(m)
    if face_mat is not None:
        mesh.polygons.foreach_set('material_index', np.asarray(face_mat, dtype=np.int32))
    mesh.polygons.foreach_set('use_smooth', np.full(F, smooth, dtype=bool))
    if corner_uv is not None:
        uvl = mesh.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', np.asarray(corner_uv, dtype=np.float32).ravel())
    if corner_col is not None:
        col = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
        col.data.foreach_set('color', np.asarray(corner_col, dtype=np.float32).ravel())
        # Make it THE colour attribute — otherwise the glTF exporter writes a
        # blank white COLOR_0 and pushes these colours to COLOR_1.
        mesh.color_attributes.active_color_name = 'Color'
        mesh.color_attributes.default_color_name = 'Color'
    if corner_nrm is not None:
        mesh.normals_split_custom_set(np.asarray(corner_nrm, dtype=np.float32).reshape(-1, 3))
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def vertex_normals(co, tris):
    fn = np.cross(co[tris[:, 1]] - co[tris[:, 0]], co[tris[:, 2]] - co[tris[:, 0]])
    vn = np.zeros_like(co)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def _ico():
    t = (1 + 5 ** 0.5) / 2
    v = np.array([(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t),
                  (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)], dtype=np.float64)
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    f = np.array([(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2),
                  (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5),
                  (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)], dtype=np.int64)
    return v[:, [0, 2, 1]], f[:, [0, 2, 1]]     # to z-up, keep outward winding


ICO_V, ICO_F = _ico()


class Deco:
    """Accumulates triangle soup (units, z-up) with per-vertex colour / normal
    and a per-face material — merged into one mesh at the end."""

    def __init__(self):
        self.co, self.tris, self.col, self.nrm, self.mat = [], [], [], [], []
        self.n = 0

    def add(self, co, tris, mat, col, nrm=None):
        co = np.asarray(co, np.float64)
        tris = np.asarray(tris, np.int64)
        V = len(co)
        self.co.append(co)
        self.tris.append(tris + self.n)
        self.n += V
        col = np.asarray(col, np.float64)
        self.col.append(np.broadcast_to(col, (V, 4)) if col.ndim == 1 else col)
        self.nrm.append(vertex_normals(co, tris) if nrm is None else np.asarray(nrm, np.float64))
        self.mat.append(np.full(len(tris), MI[mat]))

    def build(self, name, mats):
        co = np.vstack(self.co)
        tris = np.vstack(self.tris)
        loops = tris.ravel()
        col = np.vstack(self.col)[loops]
        nrm = np.vstack(self.nrm)[loops]
        return build_mesh(name, co, tris, [mats[m] for m in MATS], np.concatenate(self.mat), col, nrm)


# ---------------------------------------------------------------- geometry: terrain, walls, buildings, trees

def terrain_object(H, mats):
    xs, ys = np.meshgrid(GX, GY)
    co = np.stack([xs.ravel() / M_PER_UNIT, ys.ravel() / M_PER_UNIT, z_units(H.ravel())], axis=1)
    tris = surface_triangles()
    loops = tris.ravel()
    uv = np.stack([(xs.ravel() + HALF_W) / SHEET_W_M, (ys.ravel() + HALF_H) / SHEET_H_M], axis=1)[loops]
    return build_mesh('Terrain', co, tris, [mats['Terrain']], None, None, None, uv)


def walls_object(H, mats):
    n1 = NX + 1
    ring = [i for i in range(n1)]                                   # south, W→E
    ring += [j * n1 + NX for j in range(1, NY + 1)]                 # east, S→N
    ring += [NY * n1 + i for i in range(NX - 1, -1, -1)]            # north, E→W
    ring += [j * n1 for j in range(NY - 1, 0, -1)]                  # west, N→S
    ring = np.array(ring)
    xs, ys = np.meshgrid(GX, GY)
    top = np.stack([xs.ravel()[ring] / M_PER_UNIT, ys.ravel()[ring] / M_PER_UNIT, z_units(H.ravel()[ring])], axis=1)
    soil = top.copy()
    soil[:, 2] = top[:, 2] - 0.022
    bottom = top.copy()
    bottom[:, 2] = -BASE_DEPTH_U
    rn = len(ring)
    co = np.vstack([top, soil, bottom])
    k = np.arange(rn)
    k1 = (k + 1) % rn
    # outward-facing quads (ring runs counter-clockwise seen from above)
    upper = np.concatenate([np.stack([k, k1, rn + k1], 1), np.stack([k, rn + k1, rn + k], 1)])
    lower = np.concatenate([np.stack([rn + k, rn + k1, 2 * rn + k1], 1), np.stack([rn + k, 2 * rn + k1, 2 * rn + k], 1)])
    # bottom cap as a fan around its centroid
    co = np.vstack([co, [[0.0, 0.0, -BASE_DEPTH_U]]])
    c = len(co) - 1
    cap = np.stack([np.full(rn, c), 2 * rn + k1, 2 * rn + k], 1)
    tris = np.concatenate([upper, lower, cap])
    soil_c = np.append(srgb('#6B5A40'), 1.0)
    earth_c = np.append(srgb('#8A7353'), 1.0)
    base_c = np.append(srgb('#5E4E38'), 1.0)
    face_col = np.concatenate([np.repeat([soil_c], len(upper), 0), np.repeat([earth_c], len(lower), 0), np.repeat([base_c], len(cap), 0)])
    corner_col = np.repeat(face_col, 3, axis=0)
    fn = np.cross(co[tris[:, 1]] - co[tris[:, 0]], co[tris[:, 2]] - co[tris[:, 0]])
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    corner_nrm = np.repeat(fn, 3, axis=0)
    # flip if the winding came out inward (the bottom must face -z)
    if fn[-1, 2] > 0:
        tris = tris[:, [0, 2, 1]]
        corner_nrm = -corner_nrm
    return build_mesh('Walls', co, tris, [mats['Wall']], None, corner_col, corner_nrm, smooth=False)


def buildings_object(H, mats):
    deco = Deco()
    rng = np.random.default_rng(7)
    for cx, cy, hw, hh, a in BUILDINGS_M:
        base = float(sample_mesh(H, np.array([cx]), np.array([cy]))[0])
        z0, z1 = float(z_units(base)) - 0.4 / M_PER_UNIT, float(z_units(base)) + 5.4 / M_PER_UNIT
        corners = np.array([(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)])
        rot = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        xy = (corners @ rot.T + np.array([cx, cy])) / M_PER_UNIT
        wall = np.append(srgb('#D8D1C2') * rng.uniform(0.94, 1.04), 1.0)
        roof = np.append(srgb('#BDB4A3') * rng.uniform(0.92, 1.05), 1.0)
        for q in range(4):                                             # four walls, flat-shaded
            p, r = xy[q], xy[(q + 1) % 4]
            co = np.array([[p[0], p[1], z0], [r[0], r[1], z0], [r[0], r[1], z1], [p[0], p[1], z1]])
            nrm2 = np.array([r[1] - p[1], -(r[0] - p[0]), 0.0])
            nrm2 /= np.linalg.norm(nrm2)
            deco.add(co, [(0, 1, 2), (0, 2, 3)], 'BuildingWall', wall, np.repeat([nrm2], 4, 0))
        top = np.column_stack([xy, np.full(4, z1)])
        deco.add(top, [(0, 1, 2), (0, 2, 3)], 'Roof', roof, np.repeat([[0.0, 0.0, 1.0]], 4, 0))
    return deco.build('Buildings', mats)


SPECIES = {
    #          crown colour  trunk m       crown radius m  lumps  squash  lift
    'pine':  ('#3A4A2D', (5.0, 8.0), (3.0, 4.4), (3, 4), 0.55, 0.15),
    'oak':   ('#4C5B31', (1.4, 2.4), (2.4, 3.4), (3, 4), 0.85, 0.55),
    'olive': ('#6E7955', (1.0, 1.6), (1.9, 2.5), (2, 3), 0.80, 0.50),
    'shrub': ('#56623B', (0.0, 0.0), (1.1, 1.9), (2, 3), 0.60, 0.40),
}


def tree_geometry(t, deco, rng):
    col_hex, trunk_rng, crown_rng, lump_rng, squash, lift = SPECIES[t['species']]
    x, y = t['x'] / M_PER_UNIT, t['y'] / M_PER_UNIT
    z0 = float(z_units(t['h']))
    cr = rng.uniform(*crown_rng) / M_PER_UNIT
    trunk_h = rng.uniform(*trunk_rng) / M_PER_UNIT if trunk_rng[1] > 0 else 0.0
    leaf = srgb(col_hex) * rng.uniform(0.82, 1.14)
    center = np.array([x, y, z0 + trunk_h + cr * lift])
    if trunk_h > 0:
        r0 = 0.22 / M_PER_UNIT
        n = 5
        ang = np.arange(n) * 2 * math.pi / n + rng.uniform(0, 1)
        bot = np.stack([x + r0 * np.cos(ang), y + r0 * np.sin(ang), np.full(n, z0 - 0.3 / M_PER_UNIT)], 1)
        top = np.stack([x + 0.6 * r0 * np.cos(ang), y + 0.6 * r0 * np.sin(ang), np.full(n, center[2])], 1)
        co = np.vstack([bot, top])
        tris = []
        for k in range(n):
            k1 = (k + 1) % n
            tris += [(k, k1, n + k1), (k, n + k1, n + k)]
        nrm = co - np.array([x, y, 0.0])
        nrm[:, 2] = 0
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
        deco.add(co, tris, 'Bark', np.append(srgb('#4A3B2C') * rng.uniform(0.8, 1.2), 1.0), nrm)
    for _ in range(rng.integers(lump_rng[0], lump_rng[1] + 1)):
        a = rng.uniform(0, 2 * math.pi)
        d = cr * rng.uniform(0.1, 0.5)
        c = center + np.array([d * math.cos(a), d * math.sin(a), rng.uniform(-0.15, 0.2) * cr])
        r = cr * rng.uniform(0.6, 0.85)
        co = c + ICO_V * r * np.array([1.0, 1.0, squash]) * rng.uniform(0.9, 1.1, (len(ICO_V), 1))
        nrm = co - (center - np.array([0.0, 0.0, 0.3 * cr]))
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
        shade = np.clip(0.72 + 0.28 * (co[:, 2] - c[2]) / (r * squash + 1e-9), 0.55, 1.05)[:, None]
        col = np.hstack([leaf[None, :] * shade, np.ones((len(co), 1))])
        deco.add(co, ICO_F, 'Leaves', col, nrm)


def place_trees(H):
    rng = np.random.default_rng(99)
    trees = []

    def keep_clear(X, Y):
        ok = np.ones(X.shape, dtype=bool)
        d, _, _ = nearest_on_polyline(X, Y, ROAD_M, 10.0)
        ok &= ~(d < 8.0)
        d, _, _ = nearest_on_polyline(X, Y, PATH_M, 5.0)
        ok &= ~(d < 3.5)
        for b in BUILDINGS_M:
            ok &= box_distance(X, Y, b) > 6.0
        return ok

    def scatter(poly_s, spacing, jitter, skip, species_p, inset_m=0.0):
        xs, ys = sheet_to_m(poly_s[:, 0], poly_s[:, 1])
        g = np.arange(xs.min(), xs.max(), spacing)
        h = np.arange(ys.min(), ys.max(), spacing)
        X, Y = np.meshgrid(g, h)
        X = X.ravel() + rng.uniform(-jitter, jitter, X.size)
        Y = Y.ravel() + rng.uniform(-jitter, jitter, Y.size)
        sx, sy = m_to_sheet(X, Y)
        ok = inside_polygon(sx, sy, poly_s) & keep_clear(X, Y) & (rng.uniform(0, 1, X.size) >= skip)
        if inset_m > 0:
            ok &= _polygon_inset_ok(sx, sy, poly_s, inset_m / M_PER_SHEET)
        names = list(species_p)
        pick = rng.choice(len(names), size=X.size, p=list(species_p.values()))
        for x, y, k in zip(X[ok], Y[ok], pick[ok]):
            trees.append({'x': float(x), 'y': float(y), 'species': names[k]})

    scatter(WOODLAND_P, 11.0, 3.0, 0.0, {'pine': 0.7, 'oak': 0.3})
    scatter(SPARSE_P, 26.0, 9.0, 0.35, {'oak': 0.6, 'shrub': 0.4})

    # Orchard: rows along the polygon's long (N–S) edge, 7.5 m apart.
    xs, ys = sheet_to_m(ORCHARD_P[:, 0], ORCHARD_P[:, 1])
    g = np.arange(xs.min() + 3, xs.max() - 3, 7.5)
    h = np.arange(ys.min() + 3, ys.max() - 3, 7.5)
    X, Y = np.meshgrid(g, h)
    X = X.ravel() + rng.normal(0, 0.4, X.size)
    Y = Y.ravel() + rng.normal(0, 0.4, Y.size)
    sx, sy = m_to_sheet(X, Y)
    ok = inside_polygon(sx, sy, ORCHARD_P) & _polygon_inset_ok(sx, sy, ORCHARD_P, 4.0 / M_PER_SHEET) & keep_clear(X, Y)
    for x, y in zip(X[ok], Y[ok]):
        trees.append({'x': float(x), 'y': float(y), 'species': 'olive'})

    # Scrub in the ravines of the rocky east flank.
    for _ in range(4000):
        if sum(1 for t in trees if t.get('scrub')) >= 45:
            break
        X = np.array([rng.uniform(SX - 60, SX + 320)])
        Y = np.array([rng.uniform(SY - 480, SY - 40)])
        _, _, t, s = spur_frame(X, Y)
        if not (40 < s[0] < 240 and 60 < t[0] < 450):
            continue
        cav = float(natural_height(X, Y)[0] - np.mean([natural_height(X + dx, Y + dy)[0] for dx, dy in ((12, 0), (-12, 0), (0, 12), (0, -12))]))
        if cav < -0.6 and keep_clear(X, Y)[0]:
            trees.append({'x': float(X[0]), 'y': float(Y[0]), 'species': 'shrub', 'scrub': True})

    # The wobbled woodland edges can bulge past the sheet: nothing grows off the diorama.
    sx, sy = m_to_sheet(np.array([t['x'] for t in trees]), np.array([t['y'] for t in trees]))
    trees = [t for t, a, b in zip(trees, sx, sy) if 0.8 < a < 99.2 and 0.8 < b < 74.2]
    X = np.array([t['x'] for t in trees])
    Y = np.array([t['y'] for t in trees])
    hs = sample_mesh(H, X, Y)
    for t, h in zip(trees, hs):
        t['h'] = float(h)
    return trees


def _polygon_inset_ok(sx, sy, poly, inset):
    ok = np.ones(np.shape(sx), dtype=bool)
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % n]
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy
        t = np.clip(((sx - ax) * vx + (sy - ay) * vy) / L2, 0, 1)
        ok &= np.hypot(sx - ax - t * vx, sy - ay - t * vy) > inset
    return ok


def trees_object(trees, mats):
    deco = Deco()
    rng = np.random.default_rng(1234)
    for t in trees:
        tree_geometry(t, deco, rng)
    return deco.build('Trees', mats)


# ---------------------------------------------------------------- albedo (the "aerial photo" ground)

def build_albedo(scale):
    px = HALF_W * 2 / ALB_W
    ax = (np.arange(ALB_W) + 0.5) * px - HALF_W
    ay = HALF_H - (np.arange(ALB_H) + 0.5) * px                 # row 0 = north
    H = BASE_M + (eval_rows(ax, ay, shaped_height) - BASE_M) * scale
    X, Y = np.meshgrid(ax, ay)

    d_row, dHdx = np.gradient(H, px)
    dHdy = -d_row
    slope = np.hypot(dHdx, dHdy)
    south = np.clip(dHdy / (slope + 1e-6), -1, 1) * smoothstep(0.03, 0.2, slope)
    north = -south
    cav = box_blur(H, 9.0 / px) - H
    m = np.clip((H - BASE_M) / (PEAK_M - BASE_M), 0, 1)
    _, _, t, s = spur_frame(X, Y)

    def mix(a, b, w):
        return a + (b - a) * np.asarray(w, np.float32)[..., None]

    C = lambda k: hex01(PALETTE[k])[None, None, :]                 # noqa: E731

    field = fbm(PN[5], X / 160.0, Y / 160.0, 3)
    dry = np.clip(0.35 + 0.35 * m + 0.35 * south + 0.5 * field, 0, 1)
    img = mix(np.broadcast_to(C('grass_lush'), X.shape + (3,)), C('grass_dry'), dry)
    img = mix(img, C('plain'), 0.35 * (1 - smoothstep(0.0, 0.25, m)))
    img = img * (1 + 0.07 * fbm(PN[6], X / 45.0, Y / 45.0, 3))[..., None]
    img = mix(img, C('grass_dry'), 0.45 * smoothstep(0.12, 0.5, fbm(PN[10], X / 32.0, Y / 32.0, 3)))  # dry patches
    img = img * (1 + 0.07 * fbm(PN[7], X / 4.0, Y / 4.0, 2))[..., None]      # grass clumps
    img = img * (1 + 0.09 * fbm(PN[4], X / 1.3, Y / 1.3, 2))[..., None]      # blades / soil at pixel scale

    gully = smoothstep(0.4, 3.0, cav)
    img = mix(img, C('gully'), 0.65 * gully)

    east = smoothstep(45.0, 110.0, s) * _window(t, 30.0, 460.0)
    crag = ridged(PN[3], X / 16.0, Y / 16.0, 3)
    rock = np.clip(smoothstep(0.38, 0.75, slope) + 0.8 * east * smoothstep(0.58, 0.78, crag) * smoothstep(0.18, 0.4, slope), 0, 1)
    # Pale limestone with darker joints — bright on the summit, as in the old photo.
    rock_col = mix(np.broadcast_to(C('rock'), X.shape + (3,)), C('rock_dark'),
                   np.clip(0.15 + 0.55 * fbm(PN[8], X / 5.0, Y / 5.0, 3), 0, 1))
    scree = np.clip(box_blur(rock, 6.0 / px) * 1.4 - rock, 0, 1) * smoothstep(0.2, 0.5, slope)
    img = mix(img, C('scree'), 0.6 * scree)
    img = mix(img, rock_col, rock)

    sx, sy = m_to_sheet(X, Y)
    wood = box_blur(inside_polygon(sx, sy, WOODLAND_P).astype(np.float32), 4.0 / px)
    orch = box_blur(inside_polygon(sx, sy, ORCHARD_P).astype(np.float32), 2.0 / px)
    sparse = box_blur(inside_polygon(sx, sy, SPARSE_P).astype(np.float32), 6.0 / px)
    img = mix(img, C('woodland_floor'), 0.85 * wood)
    img = mix(img, C('sparse_floor'), 0.45 * sparse)
    rows = 0.5 + 0.5 * np.cos(2 * np.pi * (X - ax[0]) / 7.5)            # tree rows run N–S
    orchard = mix(np.broadcast_to(C('orchard_soil'), X.shape + (3,)), C('orchard_row'), smoothstep(0.55, 0.95, rows))
    img = mix(img, orchard, 0.92 * orch)

    for b in BUILDINGS_M:
        yard = 1.0 - smoothstep(1.5, 6.0, box_distance(X, Y, b))
        img = mix(img, C('yard'), 0.55 * yard)

    d, _, _ = nearest_on_polyline(X, Y, ROAD_M, 12.0)
    road = 1.0 - smoothstep(2.6, 3.8, d)
    ruts = (1.0 - smoothstep(0.25, 0.7, np.abs(d - 1.1))) * road
    img = mix(img, C('road'), 0.95 * road)
    img = mix(img, C('rut'), 0.5 * ruts)
    d, _, _ = nearest_on_polyline(X, Y, PATH_M, 6.0)
    img = mix(img, C('path'), 0.85 * (1.0 - smoothstep(0.55, 1.2, d)))
    clear = (d > 3.0) & (road < 0.05)

    # Garrigue: scattered dark shrub dots — the telltale texture of aerial
    # photos of Mediterranean hills. Denser on cool north faces and gullies.
    rng = np.random.default_rng(31)
    n_try = 90000
    cx = rng.uniform(0, ALB_W, n_try)
    cy = rng.uniform(0, ALB_H, n_try)
    ci, ri = cx.astype(int), cy.astype(int)
    clump = smoothstep(-0.05, 0.35, fbm(PN[9], cx * px / 55.0, cy * px / 55.0, 3))   # garrigue grows in patches
    dens = ((0.08 + 0.6 * clump) * (1 + 0.8 * np.clip(north[ri, ci], 0, 1)) + 0.6 * gully[ri, ci]) * (1 - rock[ri, ci]) ** 2
    dens *= (1 - wood[ri, ci]) * (1 - orch[ri, ci]) * clear[ri, ci] * (1 - 0.6 * smoothstep(0.0, 0.2, m[ri, ci]) * (1 - np.clip(north[ri, ci], 0, 1)))
    keep = rng.uniform(0, 1, n_try) < np.clip(dens, 0, 1) * 0.55
    shrub = hex01(PALETTE['shrub'])
    shrub_dry = hex01(PALETTE['shrub_dry'])
    for x0, y0 in zip(cx[keep], cy[keep]):
        rad = rng.uniform(0.8, 2.0) / px
        R = int(rad) + 2
        c0, c1 = max(0, int(x0) - R), min(ALB_W, int(x0) + R + 1)
        r0, r1 = max(0, int(y0) - R), min(ALB_H, int(y0) + R + 1)
        yy, xx = np.mgrid[r0:r1, c0:c1]
        dd = np.hypot(xx + 0.5 - x0, yy + 0.5 - y0) / rad
        a = np.clip(1.25 - dd, 0, 1)[..., None] * 0.85
        col = shrub + (shrub_dry - shrub) * rng.uniform(0, 1)
        img[r0:r1, c0:c1] = img[r0:r1, c0:c1] * (1 - a) + col * a
    print(f'ALBEDO shrubs: {int(keep.sum())}')

    ao = np.clip(1.0 - 0.06 * cav, 0.82, 1.05)
    img = np.clip(img * ao[..., None], 0, 1)
    path = os.path.join(OUT_DIR, 'albedo.jpg')
    save_jpeg_from_array(path, img.astype(np.float32), 86)
    print(f'WROTE_ALBEDO:{path} ({os.path.getsize(path) // 1024} KB)')


def save_jpeg_from_array(path, rgb, quality):
    """Encode an sRGB float array (row 0 = top) as JPEG through Blender."""
    h, w, _ = rgb.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = rgb
    img.pixels.foreach_set(rgba[::-1].ravel())
    img.file_format = 'JPEG'
    img.save(filepath=path, quality=quality)
    bpy.data.images.remove(img)


# ---------------------------------------------------------------- data module

def fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s


def pts_ts(pts):
    return '[' + ', '.join(f'[{fmt(x)}, {fmt(y)}]' for x, y in pts) + ']'


def along_label(line, at_x=None, offset=2.0, side='south'):
    k = int(np.argmin(np.abs(line[:, 0] - at_x))) if at_x is not None else len(line) // 2
    a = line[max(0, k - 3)]
    b = line[min(len(line) - 1, k + 3)]
    tx, ty = b - a
    L = math.hypot(tx, ty)
    nx, ny = -ty / L, tx / L
    if (side == 'south' and ny < 0) or (side == 'west' and nx > 0):
        nx, ny = -nx, -ny
    return (float(line[k, 0] + nx * offset), float(line[k, 1] + ny * offset), tangent_angle(line, k, closed=False))


def write_data_ts(levels, summit_s, H):
    road = douglas_peucker(ROAD_D, 0.05)
    path = douglas_peucker(PATH_D, 0.04)
    rl = along_label(ROAD_D, at_x=64.0, offset=2.6, side='south')
    pl = along_label(PATH_D, offset=2.2, side='west')

    def ground(x, y):
        X, Y = sheet_to_m(x, y)
        return float(sample_mesh(H, np.array([X]), np.array([Y]))[0])

    sw = np.mean([(b[0], b[1]) for b in BUILDINGS_S[:4]], axis=0)
    se = np.mean([(b[0], b[1]) for b in BUILDINGS_S[4:]], axis=0)
    L = []
    L.append('// AUTO-GENERATED by scripts/blender/build_topography_terrain.py — do not edit by hand.')
    L.append('// Everything below comes from the same height field and feature layout that')
    L.append('// built terrain.glb and albedo.jpg: contours are exact iso-lines of the GLB')
    L.append('// terrain triangles. Sheet units: x east 0–100, y SOUTH 0–75, 1 unit = 14 m.')
    L.append('')
    L.append('export type SheetPoint = readonly [number, number];')
    L.append('export type Anchor = { readonly x: number; readonly y: number; readonly angle: number };')
    L.append('export type Contour = {')
    L.append('  readonly heightM: number;')
    L.append('  /** Every 50 m — drawn heavier and labelled. */')
    L.append('  readonly index: boolean;')
    L.append('  readonly rings: readonly (readonly SheetPoint[])[];')
    L.append('  readonly label: Anchor | null;')
    L.append('};')
    L.append('export type Building = {')
    L.append('  readonly x: number; readonly y: number; readonly w: number; readonly h: number;')
    L.append('  /** Clockwise on the map, degrees. */')
    L.append('  readonly angle: number;')
    L.append('  readonly heightM: number;')
    L.append('};')
    L.append("export type VegArea = { readonly kind: 'woodland' | 'orchard' | 'sparse'; readonly ring: readonly SheetPoint[]; readonly label: { readonly text: string; readonly x: number; readonly y: number } | null };")
    L.append('')
    L.append('export const TOPO = {')
    L.append(f'  groundY: {float(z_units(300.0)):.4f},')
    L.append(f'  summit: {{ x: {fmt(summit_s[0])}, y: {fmt(summit_s[1])}, heightM: {int(round(H.max()))}, yUnits: {float(z_units(H.max())):.4f} }},')
    L.append('  contours: [')
    for lv in levels:
        lab = 'null' if lv['label'] is None else f"{{ x: {fmt(lv['label'][0])}, y: {fmt(lv['label'][1])}, angle: {lv['label'][2]:.1f} }}"
        L.append(f"    {{ heightM: {lv['heightM']}, index: {'true' if lv['index'] else 'false'}, label: {lab}, rings: [")
        for ring in lv['rings']:
            L.append('      ' + pts_ts(ring) + ',')
        L.append('    ] },')
    L.append('  ] as readonly Contour[],')
    L.append(f'  road: {pts_ts(road)} as readonly SheetPoint[],')
    L.append(f'  roadLabel: {{ x: {fmt(rl[0])}, y: {fmt(rl[1])}, angle: {rl[2]:.1f} }} as Anchor,')
    L.append(f'  path: {pts_ts(path)} as readonly SheetPoint[],')
    L.append(f'  pathLabel: {{ x: {fmt(pl[0])}, y: {fmt(pl[1])}, angle: {pl[2]:.1f} }} as Anchor,')
    L.append('  buildings: [')
    for (x, y, w, h, yaw) in BUILDINGS_S:
        L.append(f'    {{ x: {fmt(x)}, y: {fmt(y)}, w: {fmt(w)}, h: {fmt(h)}, angle: {fmt(yaw)}, heightM: {fmt(ground(x, y))} }},')
    L.append('  ] as readonly Building[],')
    L.append('  vegetation: [')
    for kind, poly in (('woodland', WOODLAND_P), ('orchard', ORCHARD_P), ('sparse', SPARSE_P)):
        lab = VEG_LABELS[kind]
        lab_ts = 'null' if lab is None else f"{{ text: '{lab[0]}', x: {fmt(lab[1])}, y: {fmt(lab[2])} }}"
        L.append(f"    {{ kind: '{kind}', label: {lab_ts}, ring: {pts_ts(douglas_peucker(np.vstack([poly, poly[:1]]), 0.05)[:-1])} }},")
    L.append('  ] as readonly VegArea[],')
    e_lines = [(float(m_to_sheet(e * 1000.0 - 201700.0 - HALF_W, 0)[0]), str(e)) for e in (202, 203)]
    n_lines = [(float(m_to_sheet(0, n * 1000.0 - 691300.0 - HALF_H)[1]), str(n)) for n in (692,)]
    L.append('  grid: {')
    L.append('    e: [' + ', '.join(f"{{ x: {fmt(x)}, label: '{t}' }}" for x, t in e_lines) + '],')
    L.append('    n: [' + ', '.join(f"{{ y: {fmt(y)}, label: '{t}' }}" for y, t in n_lines) + '],')
    L.append('  },')
    L.append('  guides: [')
    for x, y in ((summit_s[0], summit_s[1]), (sw[0], sw[1]), (se[0], se[1])):
        L.append(f'    {{ x: {fmt(x)}, y: {fmt(y)}, heightM: {fmt(ground(x, y))} }},')
    L.append('  ],')
    L.append('} as const;')
    L.append('')
    with open(OUT_DATA_TS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L))
    print(f'WROTE_DATA:{OUT_DATA_TS} ({os.path.getsize(OUT_DATA_TS) // 1024} KB)')


# ---------------------------------------------------------------- main

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    raw = eval_rows(GX, GY, shaped_height)
    scale = (PEAK_M - BASE_M) / (raw.max() - BASE_M)
    H = BASE_M + (raw - BASE_M) * scale
    print(f'HEIGHTS: {H.min():.1f}–{H.max():.1f} m (relief scale {scale:.3f})')

    summit_s = check_heights(H)
    tris = surface_triangles()
    levels = build_contours(H, tris)
    check_contours(levels)
    check_resample(H, levels)
    check_path(H)
    check_pads(H)
    write_data_ts(levels, summit_s, H)
    if FAST:
        print('SELF-CHECKS OK (fast: no albedo / GLB)')
        return

    build_albedo(scale)

    mats = {n: new_material(n, n != 'Terrain') for n in MATS}
    objs = [terrain_object(H, mats), walls_object(H, mats), buildings_object(H, mats)]
    trees = place_trees(H)
    print(f'TREES: {len(trees)} ({", ".join(f"{k} {sum(t["species"] == k for t in trees)}" for k in SPECIES)})')
    objs.append(trees_object(trees, mats))

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    out_glb = os.path.join(OUT_DIR, 'terrain.glb')
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_materials='EXPORT',
        export_image_format='NONE',
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=16,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=14,
        export_draco_color_quantization=8,
    )
    tri_total = sum(len(o.data.polygons) for o in objs)
    print(f'WROTE_GLB:{out_glb} ({os.path.getsize(out_glb) // 1024} KB, {tri_total} tris)')
    check_budget()
    print('SELF-CHECKS OK')


main()
