"""Datum field challenge — the fixed terrain diorama (Cycles) + generated projection data.

Topic-02 #scene-coordinates → "הדמיה: מה קורה כשהדאטום לא תואם?". Same render language as
the reference-bodies landscape (render_measurement_landscape.py): Cycles, the repo's CC0
textures used for light and shade only, one fixed oblique camera, a thin pale cut base and a
contact shadow. The page draws every marker, line and label live from the camera matrix
written to src/components/lessons/topic-02/datum-field/datumFieldTerrain.data.ts, so they
land exactly on these pixels.

The ground is built around the three landmarks in datumField.data.ts (datum-A metres):
a small stone bridge over a narrow stream in a wadi bed, a dirt-road crossroads on a terrace,
and a distinct rocky summit at the end of a ridge. Each landmark's displaced point
(A + shift — where its numbers land when read in the wrong datum) is kept clear of plants
and roads, and the camera must see it.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_datum_field.py
    node scripts/blender/package_datum_field.cjs

Quick look: DF_PX=0.5 DF_SAMPLES=0.25 renders a 1000 × 560 draft. DF_SS=2 renders the master
at twice the frame (the packager downsamples it and cuts the thumbnails from it).
`-- --no-render` only rewrites the data. No network.
"""
import bpy, bmesh, json, math, os, re, sys
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/datum-field')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
FIELD_TS = os.path.join(ROOT, 'src/components/lessons/topic-02/datum-field/datumField.data.ts')
DATA_TS = os.path.join(ROOT, 'src/components/lessons/topic-02/datum-field/datumFieldTerrain.data.ts')
os.makedirs(OUT, exist_ok=True)

PX = float(os.environ.get('DF_PX', 1))              # 1 → the 2000 × 1120 frame
SS = float(os.environ.get('DF_SS', 1))              # supersampled master (× frame)
SAMPLE_SCALE = float(os.environ.get('DF_SAMPLES', 1))
IMG_W, IMG_H = 2000, 1120                           # 25 : 14

# ── Model ───────────────────────────────────────────────────────────────────
CELL = 1.0                  # mesh spacing (m)
MPU = 50.0                  # metres per Blender unit
VE = float(os.environ.get('DF_VE', 1.6))   # vertical exaggeration
KZ = VE / MPU               # BU per metre of height
BASE_UNDER = 8.0            # cut base below the lowest ground (m)
SIDE_W = 48.0               # the valley's side slopes (m)
DECK_UP = 2.6               # bridge deck above the bed (m)
SPAN = 30.0                 # bridge length along the road (m)
BRIDGE_BED = 6.5            # half-width of the bed where the bridge spans it (m)
CONTOUR_M = 10.0            # contour interval (m of real height)


def read_field():
    src = open(FIELD_TS, encoding='utf-8').read()
    block = re.search(r'/\* field:begin \*/\s*const FIELD\s*=\s*(\{.*?\})\s*as const;\s*/\* field:end \*/', src, re.S).group(1)
    return json.loads(block)


FIELD = read_field()
SHIFT = FIELD['shift']
FR = FIELD['frame']
LM = {l['id']: l['a'] for l in FIELD['landmarks']}
BR, JN, SM = LM['bridge'], LM['junction'], LM['summit']
E_C, N_C = (FR['e0'] + FR['e1']) / 2, (FR['n0'] + FR['n1']) / 2
SH_LEN = math.hypot(SHIFT['e'], SHIFT['n'])
SH_DIR = (SHIFT['e'] / SH_LEN, SHIFT['n'] / SH_LEN)


def displaced(p):
    """Where the A numbers land when read as datum B: P + shift."""
    return dict(e=p['e'] + SHIFT['e'], n=p['n'] + SHIFT['n'])


# ── Fields ──────────────────────────────────────────────────────────────────
def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def value_noise(x, y, scale, seed, octaves=4, gain=.5):
    """Smooth fractal value noise in [-1, 1] (deterministic, numpy)."""
    rng = np.random.default_rng(seed)
    total = np.zeros(np.shape(x)); amp = 1.0; norm = 0.0
    for o in range(octaves):
        s = scale / (2 ** o)
        g = rng.standard_normal((512, 512))
        u = np.asarray(x) / s + 211.3 * o; v = np.asarray(y) / s + 97.1 * o
        i0 = np.floor(u).astype(int); j0 = np.floor(v).astype(int)
        fu = u - i0; fv = v - j0
        fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
        i0 %= 511; j0 %= 511
        n00 = g[j0, i0]; n10 = g[j0, i0 + 1]; n01 = g[j0 + 1, i0]; n11 = g[j0 + 1, i0 + 1]
        total += amp * ((n00 * (1 - fu) + n10 * fu) * (1 - fv) + (n01 * (1 - fu) + n11 * fu) * fv)
        norm += amp; amp *= gain
    return np.clip(total / norm / 0.6, -1, 1)


def blur(a, r):
    """Separable box blur ×3 (≈ Gaussian), edge-clamped. r in cells."""
    r = int(max(1, r))
    for _ in range(3):
        for axis in (0, 1):
            p = np.pad(a, [(r, r) if k == axis else (0, 0) for k in (0, 1)], mode='edge')
            c = np.cumsum(p, axis=axis)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
            hi = np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis)
            lo = np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)
            a = (hi - lo) / (2 * r + 1)
    return a


def catmull(points, step=1.0):
    """Uniform Catmull-Rom through the points (passes through every one), sampled ≈ every `step` m."""
    P = np.array(points, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(np.linalg.norm(p2 - p1) / step))
        t = np.linspace(0, 1, n, endpoint=False)[:, None]
        out.append(.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2][None])
    return np.vstack(out)


def nearest_on(line, X, Y, chunk=5000):
    """Distance from every (X, Y) to a dense polyline, and the index of its nearest vertex."""
    pts = np.stack([X.ravel(), Y.ravel()], -1)
    d = np.empty(len(pts)); k = np.empty(len(pts), int)
    for i in range(0, len(pts), chunk):
        q = pts[i:i + chunk]
        dd = ((q[:, None, :] - line[None, :, :]) ** 2).sum(-1)
        k[i:i + chunk] = dd.argmin(1)
        d[i:i + chunk] = np.sqrt(dd[np.arange(len(q)), k[i:i + chunk]])
    return d.reshape(X.shape), k.reshape(X.shape)


def stream_e(N):
    """E of the wadi's centre line at northing N: from the back left to the front right,
    square to the road at the bridge."""
    v = N - BR['n']
    return BR['e'] - 0.40 * v + 7.0 * np.sin(v / 42.0)


def _slope(N):
    v = N - BR['n']
    return -0.40 + 7.0 / 42.0 * np.cos(v / 42.0)


def stream_dist(E, N):
    return np.abs(E - stream_e(N)) / np.sqrt(1 + _slope(N) ** 2)


def bed_half(N):
    """The bed narrows and widens; it is even where the bridge spans it."""
    w = 6.4 + 2.4 * value_noise(np.full_like(np.asarray(N, float), 3.0), np.asarray(N, float), 46, 51, 2)
    near = smoothstep(26, 12, np.abs(np.asarray(N, float) - BR['n']))
    return w * (1 - near) + BRIDGE_BED * near


def channel_dist(E, N):
    """The low-water channel meanders inside the bed."""
    v = N - BR['n']
    off = .5 * bed_half(N) * np.sin(v / 16.0 + .4) + 1.2 * value_noise(np.full_like(N, 9.0), N, 12, 52, 2)
    return np.abs(E - stream_e(N) - off) / np.sqrt(1 + _slope(N) ** 2)


def bed_floor(N):
    """The wadi bed falls gently toward the viewer."""
    return 6.0 + 0.02 * (N - BR['n'])


# Roads (datum-A metres). Each passes exactly through its landmarks; the main road crosses the
# wadi square to it on the bridge.
ROAD_DIR = np.array([1.0, 0.233]) / math.hypot(1.0, 0.233)   # along the bridge
_K = ROAD_DIR[1] / ROAD_DIR[0]
ROADS = {
    'main': dict(w=5.0, pts=[
        (FR['e0'] - 12, JN['n'] + 11), (JN['e'] - 45, JN['n'] + 6), (JN['e'], JN['n']), (JN['e'] + 30, JN['n'] + 11),
        (JN['e'] + 56, JN['n'] + 32), (BR['e'] - 28, BR['n'] - 28 * _K), (BR['e'], BR['n']), (BR['e'] + 28, BR['n'] + 28 * _K),
        (BR['e'] + 58, BR['n'] - 4), (BR['e'] + 98, BR['n'] - 26), (BR['e'] + 150, BR['n'] - 40), (FR['e1'] + 14, BR['n'] - 44)]),
    'south': dict(w=4.2, pts=[(JN['e'], JN['n']), (JN['e'] - 3, JN['n'] - 22), (JN['e'] - 9, JN['n'] - 40), (JN['e'] - 14, FR['n0'] - 14)]),
    'north': dict(w=4.2, pts=[(JN['e'], JN['n']), (JN['e'] + 2, JN['n'] + 26), (JN['e'] - 5, JN['n'] + 60), (JN['e'] - 16, JN['n'] + 100),
                              (JN['e'] - 22, FR['n1'] + 14)]),
}


def build_fields():
    es = np.arange(FR['e0'], FR['e1'] + 1e-6, CELL); ns = np.arange(FR['n0'], FR['n1'] + 1e-6, CELL)
    E, N = np.meshgrid(es, ns)
    # ── rolling hills (domain-warped), rising toward the back
    de, dn = E - SM['e'], N - SM['n']
    r = np.hypot(de, dn)
    calm = .2 + .8 * smoothstep(8, 42, r)                                               # no bumps on the summit itself
    we = E + 22 * value_noise(E, N, 95, 41, 3); wn = N + 22 * value_noise(E, N, 95, 42, 3)
    H = 9.0 + 0.05 * (N - BR['n']) + (4.2 * value_noise(we, wn, 120, 2, 4) + 1.5 * value_noise(E, N, 32, 3, 3) + .45 * value_noise(E, N, 9, 4, 2)) * calm
    # the summit: the top of a ridge that runs toward the north-east (so its displaced point stays up on the crest)
    along = de * SH_DIR[0] + dn * SH_DIR[1]; across = -de * SH_DIR[1] + dn * SH_DIR[0]
    r_ridge = np.sqrt((along / np.where(along > 0, 3.6, 1.0)) ** 2 + (across * 1.05) ** 2)
    H = H + 48.0 / (1 + (r_ridge / 46.0) ** 2.2) + 4.0 * np.clip(1 - r / 26.0, 0, None)
    # the hills at the back left (a saddle between them takes the north road), a low knoll front right
    for (ce, cn, h, se, sn) in ((1030, 895, 22.0, 66, 40), (1142, 928, 13.0, 44, 36), (1392, 738, 6.0, 55, 40)):
        H = H + h * np.exp(-(((E - ce) / se) ** 2 + ((N - cn) / sn) ** 2))
    # the junction sits on a level terrace
    rj = np.hypot(E - JN['e'], N - JN['n'])
    t = smoothstep(44, 20, rj)
    H = H * (1 - t) + 12.5 * t
    # ── the wadi: a gravel bed of varying width, concave side slopes, a low cut bank, a low-water channel
    d = stream_dist(E, N)
    bh = bed_half(N)
    fl = bed_floor(N) + .25 * value_noise(E, N, 6, 53, 2)
    side = np.clip((d - bh) / SIDE_W, 0, 1) ** .6
    bank = 1.0 * smoothstep(bh + 2.6, bh + .3, d) * (d > bh)
    H = np.where(d < bh, fl, fl + (np.maximum(H, fl + 1) - fl) * side + bank * (1 - side))
    dc = channel_dist(E, N)
    H = H - 1.1 * (1 - smoothstep(1.1, 2.6, dc)) * (d < bh + .4)
    # ── roads: each follows its own smoothed profile; the main road rides up onto the bridge deck
    deck_z = float(bed_floor(BR['n'])) + DECK_UP
    road_mask = np.zeros_like(H); road_core = np.zeros_like(H)
    for name, rd in ROADS.items():
        line = catmull(rd['pts'])
        dist, k = nearest_on(line, E, N)
        s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))])
        prof = np.array([sample(H, E, N, *p) for p in line])
        prof = np.convolve(np.pad(prof, 22, mode='edge'), np.ones(45) / 45, mode='valid')
        if name == 'main':
            sb = s[np.argmin(np.hypot(line[:, 0] - BR['e'], line[:, 1] - BR['n']))]
            off = np.abs(s - sb)
            prof = np.where(off < SPAN / 2, deck_z, np.maximum(prof, deck_z - 0.10 * (off - SPAN / 2)))
            under = np.abs(s[k] - sb) < SPAN / 2 + 1.0
        else:
            under = np.zeros_like(H, bool)
        half = rd['w'] / 2
        wgt = smoothstep(half + 5.5, half + .6, dist) * ~under
        H = H * (1 - wgt) + (prof[k] - .12 * smoothstep(half, half * .3, dist)) * wgt
        road_mask = np.maximum(road_mask, smoothstep(half + .9, half - .5, dist) * ~under)
        road_core = np.maximum(road_core, (smoothstep(half * .75, half * .35, dist) - smoothstep(half * .3, 0, dist) * .6) * ~under)
    # ── rock where the ground is steep or crested, limestone ledges, the summit's rocky cap
    gy, gx = np.gradient(H, CELL)
    slope = np.degrees(np.arctan(np.hypot(gx, gy) * VE))
    relief = H - blur(H, 10)
    ledge = smoothstep(.5, .85, np.abs(((H + 3 * value_noise(E, N, 30, 8, 3)) / 3.2) % 1.0 - .5) * 2)
    rock = smoothstep(19, 34, slope) * (.55 + .45 * ledge)
    rock += smoothstep(1.0, 3.5, relief) * .45
    rock += smoothstep(30, 8, r) * .55 * smoothstep(-.5, .2, value_noise(E, N, 7, 6, 3))
    rock *= smoothstep(-.3, .25, value_noise(E, N, 28, 7, 4))
    rock = np.clip(rock, 0, 1) * (1 - road_mask) * smoothstep(bh + .5, bh + 4, d)
    ridged = 1 - np.abs(value_noise(E, N, 6, 11, 3))
    cap = smoothstep(7, 14, r)                                                           # keep the very top smooth
    H = H + rock * (ridged ** 2 - .3) * 1.2 * cap
    gy, gx = np.gradient(H, CELL)
    slope = np.degrees(np.arctan(np.hypot(gx, gy) * VE))
    return dict(E=E, N=N, H=H, d=d, bh=bh, dc=dc, slope=slope, rock=rock, r=r,
                road=road_mask, road_core=np.clip(road_core, 0, 1), deck_z=deck_z, grad=np.hypot(gx, gy))


def sample(G, E, N, e, n):
    """Bilinear sample of a grid field at (e, n) metres."""
    fx = (e - E[0, 0]) / CELL; fy = (n - N[0, 0]) / CELL
    i = int(np.clip(np.floor(fx), 0, G.shape[1] - 2)); j = int(np.clip(np.floor(fy), 0, G.shape[0] - 2))
    u = min(max(fx - i, 0), 1); v = min(max(fy - j, 0), 1)
    return (G[j, i] * (1 - u) + G[j, i + 1] * u) * (1 - v) + (G[j + 1, i] * (1 - u) + G[j + 1, i + 1] * u) * v


# ── Surface masks (per vertex) ─────────────────────────────────────────────
def keep_clear(E, N, r_landmark=10.0, r_displaced=13.0):
    """1 where plants may grow: off the landmarks and off their displaced points."""
    m = np.ones_like(E, float)
    for p in LM.values():
        m *= smoothstep(r_landmark, r_landmark + 4, np.hypot(E - p['e'], N - p['n']))
        q = displaced(p)
        m *= smoothstep(r_displaced, r_displaced + 5, np.hypot(E - q['e'], N - q['n']))
    return m


def masks(F):
    E, N, H, d, bh, slope = F['E'], F['N'], F['H'], F['d'], F['bh'], F['slope']
    bed = smoothstep(bh + .7, bh - .5, d)
    wet = smoothstep(bh + 8, bh + 1.2, d) * (1 - bed)                                   # the green strip along the banks
    hollow = smoothstep(.3, -1.8, H - blur(H, 14))
    patch = value_noise(E, N, 24, 21, 3); broad = value_noise(E, N, 80, 22, 3)
    green = np.clip(.3 + .3 * broad + .55 * wet + .4 * hollow - .3 * smoothstep(18, 32, slope), 0, 1)
    shrub = np.clip(.12 + .55 * smoothstep(-.15, .55, patch) + .2 * broad + .6 * wet + .35 * hollow - .7 * F['rock'], 0, 1)
    clear = keep_clear(E, N) * (1 - F['road']) * (1 - bed)
    return dict(bed=bed, green=green * (1 - bed), shrub=shrub * clear, rock=F['rock'], road=F['road'],
                rut=F['road_core'], wet=wet * clear, height=H)


# ── Blender helpers ─────────────────────────────────────────────────────────
def lin(hx):
    c = int(hx[1:3], 16) / 255, int(hx[3:5], 16) / 255, int(hx[5:7], 16) / 255
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def rgba(hx):
    return (*lin(hx), 1.0)


def mixhex(a, b, t, k=1.0):
    """A natural mix of two palette colours (linear), optionally darkened by k."""
    ca, cb = lin(a), lin(b)
    return tuple((x * (1 - t) + y * t) * k for x, y in zip(ca, cb)) + (1.0,)


def mesh_from(name, verts, faces, coll=None, smooth=True):
    verts = np.asarray(verts, np.float32); faces = np.asarray(faces, np.int32)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
    k = faces.shape[1]
    me.loops.add(faces.size); me.loops.foreach_set('vertex_index', faces.ravel())
    me.polygons.add(len(faces))
    me.polygons.foreach_set('loop_start', (np.arange(len(faces)) * k).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(faces), k, np.int32))
    me.update(); me.validate()
    me.polygons.foreach_set('use_smooth', np.full(len(faces), smooth, bool))
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def add_attr(ob, name, values, kind='FLOAT'):
    me = ob.data
    if kind == 'COLOR':
        a = me.color_attributes.new(name, 'FLOAT_COLOR', 'POINT')
        v = np.asarray(values, np.float32).reshape(-1, 3)
        a.data.foreach_set('color', np.concatenate([v, np.ones((len(v), 1), np.float32)], 1).ravel())
    else:
        a = me.attributes.new(name, 'FLOAT', 'POINT')
        a.data.foreach_set('value', np.asarray(values, np.float32).ravel())


def grid_faces(ny, nx, offset=0):
    idx = np.arange(ny * nx).reshape(ny, nx) + offset
    return np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)


def nodes(m):
    nt = m.node_tree
    return nt.nodes, nt.links


def image(path, non_color=False):
    img = bpy.data.images.load(path, check_existing=True)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def attr(ns, name, out='Fac'):
    a = ns.new('ShaderNodeAttribute'); a.attribute_name = name
    return a.outputs[out]


def math_node(ns, lk, op, a, b=None, clamp=False):
    m = ns.new('ShaderNodeMath'); m.operation = op; m.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            lk.new(v, m.inputs[i])
    return m.outputs[0]


def mix(ns, lk, fac, a, b, blend='MIX'):
    m = ns.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend; m.clamp_result = True
    for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v
        else:
            lk.new(v, sock)
    return m.outputs[2]


def box_tex(ns, lk, path, scale, non_color=False, blend=.25):
    tc = ns.new('ShaderNodeTexCoord'); mp = ns.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    lk.new(tc.outputs['Object'], mp.inputs['Vector'])
    t = ns.new('ShaderNodeTexImage'); t.image = image(path, non_color)
    t.projection = 'BOX'; t.projection_blend = blend
    lk.new(mp.outputs[0], t.inputs['Vector'])
    return t


def noise(ns, lk, scale, detail=4, rough=.55):
    tc = ns.new('ShaderNodeTexCoord')
    n = ns.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
    lk.new(tc.outputs['Object'], n.inputs['Vector'])
    return n


def ramp(ns, lk, fac, lo, hi):
    r = ns.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = lo; r.inputs['From Max'].default_value = hi
    r.clamp = True
    lk.new(fac, r.inputs['Value'])
    return r.outputs[0]


def detail(ns, lk, tex, lo=.72, hi=1.28):
    """A texture's light and shade only (its hue is not ours), as a multiplier around 1."""
    bw = ns.new('ShaderNodeRGBToBW'); lk.new(tex.outputs['Color'], bw.inputs[0])
    r = ns.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = .18; r.inputs['From Max'].default_value = .62
    r.inputs['To Min'].default_value = lo; r.inputs['To Max'].default_value = hi
    lk.new(bw.outputs[0], r.inputs['Value'])
    c = ns.new('ShaderNodeCombineColor')
    for i in range(3):
        lk.new(r.outputs[0], c.inputs[i])
    return c.outputs[0]


def tone(ns, lk, color, det):
    return mix(ns, lk, 1.0, color, det, 'MULTIPLY')


# ── Materials ───────────────────────────────────────────────────────────────
# Illustration palette only (design-spec.md §3 / referenceBodiesStyle.ts): olive greens
# #6E7A4E / #55613C / #8A9163, water #7FB4C6, base rims #E8DCC4 / #C9B892 — and natural mixes
# of them. Contours in the site's warm brown #8A6F4D.
T_SCALE = MPU / 8.0         # one texture tile ≈ 8 m


def ground_material():
    m = bpy.data.materials.new('Ground'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .95
    grass = detail(ns, lk, box_tex(ns, lk, f'{TEX}/grass_diff.jpg', T_SCALE), .74, 1.24)
    dry = detail(ns, lk, box_tex(ns, lk, f'{TEX}/dry_diff.jpg', T_SCALE * .8), .76, 1.22)
    rock_t = box_tex(ns, lk, f'{TEX}/rock_diff.jpg', T_SCALE * 1.3)
    rock = detail(ns, lk, rock_t, .62, 1.22)
    big = noise(ns, lk, 7, 3, .5); mid = noise(ns, lk, 38, 3, .55); fine = noise(ns, lk, 160, 2, .6)
    # dry batha between the shrubs: olive-khaki, from the palette's light olive toward the pale stone
    open_c = mix(ns, lk, big.outputs['Fac'], mixhex('#8A9163', '#C9B892', .58, .8), mixhex('#8A9163', '#C9B892', .36, .76))
    open_c = mix(ns, lk, ramp(ns, lk, mid.outputs['Fac'], .5, .7), open_c, mixhex('#8A9163', '#6E7A4E', .55, .8))
    open_c = mix(ns, lk, ramp(ns, lk, fine.outputs['Fac'], .55, .75), open_c, mixhex('#C9B892', '#8A9163', .3, .78))
    open_c = tone(ns, lk, open_c, dry)
    green_c = tone(ns, lk, mix(ns, lk, big.outputs['Fac'], mixhex('#6E7A4E', '#8A9163', .35, .82), mixhex('#6E7A4E', '#55613C', .3, .82)), grass)
    ground = mix(ns, lk, attr(ns, 'green'), open_c, green_c)
    # pale limestone, a little grey
    rock_c = tone(ns, lk, mix(ns, lk, mid.outputs['Fac'], mixhex('#E8DCC4', '#C9B892', .45, .7), mixhex('#E8DCC4', '#8A9163', .3, .64)), rock)
    rn = noise(ns, lk, 110, 4, .6)
    rmask = ramp(ns, lk, math_node(ns, lk, 'ADD', attr(ns, 'rock'), math_node(ns, lk, 'SUBTRACT', rn.outputs['Fac'], .5)), .36, .6)
    ground = mix(ns, lk, rmask, ground, rock_c)
    # dark litter under the shrub patches (the crowns stand on it)
    ground = mix(ns, lk, math_node(ns, lk, 'MULTIPLY', attr(ns, 'shrub'), .3), ground, mixhex('#55613C', '#6E7A4E', .3, .75))
    # wadi bed: pale gravel with darker damp patches
    gravel = mix(ns, lk, ramp(ns, lk, noise(ns, lk, 220, 2, .6).outputs['Fac'], .4, .62), mixhex('#C9B892', '#E8DCC4', .3, .82), mixhex('#C9B892', '#8A9163', .3, .68))
    gravel = tone(ns, lk, gravel, rock)
    ground = mix(ns, lk, attr(ns, 'bed'), ground, gravel)
    # dirt roads: warm tan, paler in the wheel tracks
    road_c = mix(ns, lk, attr(ns, 'rut'), mixhex('#C9B892', '#E8DCC4', .35, .86), mixhex('#E8DCC4', '#C9B892', .25, .92))
    road_c = tone(ns, lk, road_c, dry)
    ground = mix(ns, lk, attr(ns, 'road'), ground, road_c)
    # contours every CONTOUR_M of real height, a constant ≈ 0.9 m wide on the ground
    h = attr(ns, 'height'); g = attr(ns, 'grad')
    frac = math_node(ns, lk, 'PINGPONG', math_node(ns, lk, 'ADD', h, CONTOUR_M / 2), CONTOUR_M / 2)
    dist_h = math_node(ns, lk, 'SUBTRACT', CONTOUR_M / 2, frac)                       # m of height to the nearest contour
    band = math_node(ns, lk, 'MULTIPLY', g, .45)                                      # half-width (m) × slope → m of height
    contour = math_node(ns, lk, 'LESS_THAN', dist_h, band)
    contour = math_node(ns, lk, 'MULTIPLY', contour, math_node(ns, lk, 'SUBTRACT', 1.0, attr(ns, 'road')))
    contour = math_node(ns, lk, 'MULTIPLY', contour, math_node(ns, lk, 'SUBTRACT', 1.0, attr(ns, 'bed')))
    contour = math_node(ns, lk, 'MULTIPLY', contour, float(os.environ.get('DF_CONTOUR', .6)))
    ground = mix(ns, lk, contour, ground, mixhex('#8A6F4D', '#55613C', .2, .9))
    lk.new(ground, bs.inputs['Base Color'])
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .003; bump.inputs['Strength'].default_value = .6
    bw = ns.new('ShaderNodeRGBToBW'); lk.new(rock_t.outputs['Color'], bw.inputs[0])
    lk.new(math_node(ns, lk, 'MULTIPLY', bw.outputs[0], math_node(ns, lk, 'ADD', rmask, math_node(ns, lk, 'MULTIPLY', attr(ns, 'bed'), .7))), bump.inputs['Height'])
    lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def tree_material():
    m = bpy.data.materials.new('Plants'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .86
    n = noise(ns, lk, 180, 2, .5)
    c = mix(ns, lk, .25, attr(ns, 'tint', 'Color'), n.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    bs.inputs['Subsurface Weight'].default_value = .06
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .008; bump.inputs['Strength'].default_value = .7
    lk.new(n.outputs['Fac'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def water_material():
    m = bpy.data.materials.new('Stream'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']
    c = mix(ns, lk, ramp(ns, lk, attr(ns, 'depth'), .05, .6), mixhex('#7FB4C6', '#C9B892', .35), rgba('#7FB4C6'))
    lk.new(c, bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .12
    bs.inputs['Specular IOR Level'].default_value = .4
    n = noise(ns, lk, 80, 3, .6)
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .002; bump.inputs['Strength'].default_value = .2
    lk.new(n.outputs['Fac'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def stone_material(name, t=.4, k=.86):
    m = bpy.data.materials.new(name); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .8
    rock = detail(ns, lk, box_tex(ns, lk, f'{TEX}/rock_diff.jpg', T_SCALE * 3), .84, 1.12)
    c = mix(ns, lk, noise(ns, lk, 30, 3, .5).outputs['Fac'], mixhex('#E8DCC4', '#8A9163', t * .5, k), mixhex('#E8DCC4', '#C9B892', t, k * .95))
    lk.new(tone(ns, lk, c, rock), bs.inputs['Base Color'])
    return m


def cut_material(name):
    """The cut edge: a thin topsoil band over plain pale ground in the site's ground tone."""
    m = bpy.data.materials.new(name); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .95
    geo = ns.new('ShaderNodeNewGeometry')
    sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Position'], sep.inputs[0])
    depth = math_node(ns, lk, 'SUBTRACT', attr(ns, 'ztop'), sep.outputs['Z'])
    mottle = noise(ns, lk, 24, 3, .6)
    stone = mix(ns, lk, ramp(ns, lk, mottle.outputs['Fac'], .35, .65), rgba('#E8DCC4'), rgba('#DCCCAB'))
    stone = mix(ns, lk, ramp(ns, lk, depth, .02, .3), rgba('#C9B892'), stone)
    band = ramp(ns, lk, depth, .018, .009)
    c = mix(ns, lk, band, stone, mixhex('#8A6F4D', '#55613C', .35, .8))
    lk.new(c, bs.inputs['Base Color'])
    return m


# ── Geometry ────────────────────────────────────────────────────────────────
def wx(e):
    return (e - E_C) / MPU


def wy(n):
    return (n - N_C) / MPU


def build_terrain(F, Mk, mats, coll):
    E, N, H = F['E'], F['N'], F['H']
    ny, nx = H.shape
    Z = H * KZ
    terrain = mesh_from('Terrain', np.stack([wx(E), wy(N), Z], -1).reshape(-1, 3), grid_faces(ny, nx), coll)
    for k in ('bed', 'green', 'shrub', 'rock', 'road', 'rut', 'height'):
        add_attr(terrain, k, Mk[k])
    add_attr(terrain, 'grad', np.clip(F['grad'], .015, 3.0))
    terrain.data.materials.append(mats['ground'])
    # the stream: a water sheet along the channel, trimmed to where it is above the ground
    lvl = bed_floor(N) - .45
    water = mesh_from('Stream', np.stack([wx(E), wy(N), lvl * KZ], -1).reshape(-1, 3), grid_faces(ny, nx), coll)
    add_attr(water, 'depth', np.clip(lvl - H, 0, None))
    water.data.materials.append(mats['water'])
    bm = bmesh.new(); bm.from_mesh(water.data)
    wet = ((H < lvl + .02) & (F['d'] < F['bh'] + 1)).ravel()
    dead = [f for f in bm.faces if not any(wet[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(water.data); bm.free()
    # the cut base: four walls down to one flat bottom
    z_base = (float(H.min()) - BASE_UNDER) * KZ
    sides = [(E[0], N[0], Z[0], False), (E[-1], N[-1], Z[-1], True), (E[:, 0], N[:, 0], Z[:, 0], True), (E[:, -1], N[:, -1], Z[:, -1], False)]
    V, Fc, top = [], [], []
    for se, sn, sz, flip in sides:
        o = len(V)
        for i in range(len(se)):
            V += [(wx(se[i]), wy(sn[i]), z_base), (wx(se[i]), wy(sn[i]), sz[i])]
            top += [sz[i], sz[i]]
        for i in range(len(se) - 1):
            a, b = o + 2 * i, o + 2 * i + 2
            f = (a, b, b + 1, a + 1)
            Fc.append(f[::-1] if flip else f)
    walls = mesh_from('Cut', V, Fc, coll, smooth=False)
    add_attr(walls, 'ztop', top)
    walls.data.materials.append(mats['cut'])
    return dict(terrain=terrain, water=water, walls=walls, z_base=z_base)


def box(bm, center, size, rot, mi):
    """An oriented box (size in m: along, across, up) at a world centre."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    S = Matrix.Diagonal((size[0] / MPU, size[1] / MPU, size[2] * KZ, 1.0))
    bmesh.ops.transform(bm, matrix=Matrix.Translation(center) @ Matrix.Rotation(rot, 4, 'Z') @ S, verts=r['verts'])
    for f in {f for v in r['verts'] for f in v.link_faces}:
        f.material_index = mi
    return r


def build_bridge(F, mats, coll):
    """A small stone bridge, square across the bed: deck with parapets, two piers, abutments."""
    bm = bmesh.new()
    rot = math.atan2(ROAD_DIR[1], ROAD_DIR[0])
    deck = F['deck_z']
    fl = float(bed_floor(BR['n']))

    def c(along, across=0.0, z=0.0):
        return Vector((wx(BR['e'] + ROAD_DIR[0] * along - ROAD_DIR[1] * across),
                       wy(BR['n'] + ROAD_DIR[1] * along + ROAD_DIR[0] * across), z * KZ))
    box(bm, c(0, 0, deck - .4), (SPAN, 6.4, .8), rot, 0)                                   # deck slab
    for side in (-1, 1):
        box(bm, c(0, side * 3.0, deck + .4), (SPAN, .45, .8), rot, 0)                      # parapets
    for along in (-SPAN / 6, SPAN / 6):
        box(bm, c(along, 0, (fl - 1.3 + deck - .8) / 2), (1.5, 5.4, deck - .8 - fl + 1.3), rot, 1)   # piers
    for side in (-1, 1):
        box(bm, c(side * (SPAN / 2 - 1.8), 0, (fl - 1.0 + deck) / 2), (3.6, 7.6, deck - fl + 1.0), rot, 1)  # abutments
    me = bpy.data.meshes.new('Bridge'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('Bridge', me); coll.objects.link(ob)
    ob.data.materials.append(mats['stone']); ob.data.materials.append(mats['stone_dark'])
    return ob


def plant_templates(k=6, seed=3):
    rng = np.random.default_rng(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    V0 = np.array([v.co[:] for v in bm.verts]); Fc = np.array([[v.index for v in f.verts] for f in bm.faces]); bm.free()
    out = []
    for _ in range(k):
        V = V0 * (1 + rng.normal(0, 1, (len(V0),))[:, None] * .13)
        V[:, 2] = V[:, 2] * .78 + .6
        V[:, 2] = np.maximum(V[:, 2], .05)
        out.append(V)
    return out, Fc


def place_plants(F, Mk, seed=17):
    """Sparse garrigue in patches, a few small trees, a denser line along the banks."""
    rng = np.random.default_rng(seed)
    E, N = F['E'], F['N']
    out = []
    for sp, kind in ((2.6, 'shrub'), (8.5, 'tree')):
        gx = np.arange(FR['e0'] + sp / 2, FR['e1'] - sp / 2, sp); gy = np.arange(FR['n0'] + sp / 2, FR['n1'] - sp / 2, sp)
        PE, PN = np.meshgrid(gx, gy)
        PE = (PE + rng.uniform(-.48, .48, PE.shape) * sp).ravel(); PN = (PN + rng.uniform(-.48, .48, PN.shape) * sp).ravel()
        fx = np.clip(((PE - FR['e0']) / CELL).round().astype(int), 0, E.shape[1] - 1)
        fy = np.clip(((PN - FR['n0']) / CELL).round().astype(int), 0, E.shape[0] - 1)
        shrub = Mk['shrub'][fy, fx]; wet = Mk['wet'][fy, fx]
        if kind == 'shrub':
            dens = smoothstep(.12, .75, shrub) * .7 + wet * .3
        else:
            dens = smoothstep(.35, .9, shrub) * .32 * smoothstep(-.2, .5, value_noise(PE, PN, 40, 33, 2)) + wet * .55 * (shrub > .05)
        keep = rng.uniform(0, 1, dens.shape) < dens
        PE, PN, fx, fy = PE[keep], PN[keep], fx[keep], fy[keep]
        n = len(PE)
        if kind == 'shrub':
            r = rng.uniform(.6, 1.5, n) * (1 + .35 * Mk['wet'][fy, fx])
            base = np.where(rng.uniform(0, 1, n)[:, None] < .6, np.array(lin('#55613C')) * .78, np.array(lin('#6E7A4E')) * .74)
        else:
            r = rng.uniform(1.8, 3.2, n)
            base = np.where(rng.uniform(0, 1, n)[:, None] < .55, np.array(lin('#55613C')) * .6, np.array(lin('#6E7A4E')) * .66)
        tint = base * rng.uniform(.8, 1.2, (n, 1)) * rng.uniform(.93, 1.07, (n, 3))
        out.append(dict(e=PE, n=PN, r=r, tint=tint, var=rng.integers(0, 6, n)))
    T = {k: np.concatenate([o[k] for o in out]) for k in out[0]}
    T['z'] = np.array([sample(F['H'], E, N, e, n) for e, n in zip(T['e'], T['n'])]) * KZ
    return T


def plant_mesh(name, T, mats, coll):
    tpl, Fc = plant_templates()
    V, Fs, C = [], [], []
    off = 0
    for k, Vt in enumerate(tpl):
        ids = np.where(T['var'] == k)[0]
        if not len(ids):
            continue
        r = T['r'][ids]
        hz = r * 1.3 / MPU                       # crowns at 1.3× height, not at the land's VE
        v = Vt[None, :, :] * np.stack([r / MPU, r / MPU, hz], -1)[:, None, :]
        v = v + np.stack([wx(T['e'][ids]), wy(T['n'][ids]), T['z'][ids] - .25 * hz], -1)[:, None, :]
        V.append(v.reshape(-1, 3))
        Fs.append((Fc[None, :, :] + (off + np.arange(len(ids)) * len(Vt))[:, None, None]).reshape(-1, 3))
        C.append(np.repeat(T['tint'][ids], len(Vt), 0))
        off += len(ids) * len(Vt)
    ob = mesh_from(name, np.concatenate(V), np.concatenate(Fs), coll)
    add_attr(ob, 'tint', np.concatenate(C), 'COLOR')
    ob.data.materials.append(mats['plants'])
    return ob


# ── Scene ───────────────────────────────────────────────────────────────────
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        for dev in prefs.get_devices_for_type('OPTIX'):
            dev.use = True
        sc.cycles.device = 'GPU'
    except Exception as exc:
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.resolution_x = round(IMG_W * PX * SS); sc.render.resolution_y = round(IMG_H * PX * SS)
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'
    for name in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Base Contrast', 'None'):
        try:
            sc.view_settings.look = name
            break
        except TypeError:
            pass
    sc.view_settings.exposure = float(os.environ.get('DF_EXPOSURE', .28))
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    w = bpy.data.worlds.new('Sky'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (.78, .83, .92, 1); bg.inputs[1].default_value = float(os.environ.get('DF_SKY', .55))
    sun_d = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_d); sc.collection.objects.link(sun)
    sun.rotation_euler = Vector((-.74, -.2, .6)).normalized().to_track_quat('Z', 'Y').to_euler()
    sun_d.energy = float(os.environ.get('DF_SUN', 4.4)); sun_d.angle = math.radians(3.5); sun_d.color = (1, .95, .86)
    return sc


CAM_ELEV = float(os.environ.get('DF_ELEV', 55)); CAM_AZ = float(os.environ.get('DF_AZ', 4)); CAM_LENS = float(os.environ.get('DF_LENS', 60))


def camera(sc, fit_pts, z_mid):
    """Fixed oblique view; target and distance solved so the fit points fill the frame window."""
    cd = bpy.data.cameras.new('Camera'); cd.lens = CAM_LENS; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    cam = bpy.data.objects.new('Camera', cd); sc.collection.objects.link(cam); sc.camera = cam
    el, az = math.radians(CAM_ELEV), math.radians(CAM_AZ)
    dirv = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    rot = (-dirv).to_track_quat('-Z', 'Y')
    R = rot.to_matrix(); right_v = R @ Vector((1, 0, 0)); up_v = R @ Vector((0, 1, 0)); fwd = -dirv
    tw = 18 / CAM_LENS; th = tw * IMG_H / IMG_W
    # frame window in NDC: a little room above the back edge, at the sides, and below for the shadow
    U0, U1, V0, V1 = -.975, .975, -.94, .88
    tgt = Vector((0, 0, z_mid)); dist = 20.0
    for _ in range(400):
        C = tgt + dirv * dist
        us, vs = [], []
        for p in fit_pts:
            d = p - C; z = d.dot(fwd)
            us.append(d.dot(right_v) / z / tw); vs.append(d.dot(up_v) / z / th)
        u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
        k = max((u1 - u0) / (U1 - U0), (v1 - v0) / (V1 - V0))
        tgt = tgt + right_v * ((u0 + u1) / 2 - (U0 + U1) / 2) * tw * dist * .5 + up_v * ((v0 + v1) / 2 - (V0 + V1) / 2) * th * dist * .5
        dist *= 1 + (k - 1) * .5
    cam.location = tgt + dirv * dist; cam.rotation_euler = rot.to_euler()
    bpy.context.view_layer.update()
    P = [world_to_camera_view(sc, cam, p) for p in fit_pts]
    print('camera fit: x %.3f–%.3f  y %.3f–%.3f  dist %.2f' % (min(p.x for p in P), max(p.x for p in P), min(p.y for p in P), max(p.y for p in P), dist))
    return cam


def project(sc, cam, p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return (v.x * IMG_W, (1 - v.y) * IMG_H)


def main():
    F = build_fields()
    Mk = masks(F)
    sc = setup()
    coll = sc.collection
    mats = dict(ground=ground_material(), plants=tree_material(), water=water_material(), cut=cut_material('Cut'),
                stone=stone_material('Bridge stone', .35, .9), stone_dark=stone_material('Bridge piers', .6, .74))
    T = build_terrain(F, Mk, mats, coll)
    bridge = build_bridge(F, mats, coll)
    plants = place_plants(F, Mk)
    plant_ob = plant_mesh('Plants', plants, mats, coll)
    print('plants', len(plants['e']))
    z_base = T['z_base']
    table = mesh_from('Table', [(-30, -30, z_base - .002), (30, -30, z_base - .002), (30, 30, z_base - .002), (-30, 30, z_base - .002)], [(0, 1, 2, 3)], coll)
    table.is_shadow_catcher = True
    # camera: frame the base corners and the whole top edge
    H, E, N = F['H'], F['E'], F['N']
    fit = [Vector((wx(e), wy(n), z_base)) for e in (FR['e0'], FR['e1']) for n in (FR['n0'], FR['n1'])]
    for e in np.linspace(FR['e0'], FR['e1'], 41):
        for n in (FR['n0'], FR['n1']):
            fit.append(Vector((wx(e), wy(n), sample(H, E, N, e, n) * KZ)))
    for n in np.linspace(FR['n0'], FR['n1'], 25):
        for e in (FR['e0'], FR['e1']):
            fit.append(Vector((wx(e), wy(n), sample(H, E, N, e, n) * KZ)))
    cam = camera(sc, fit, float(H.mean()) * KZ)
    if '--no-render' not in sys.argv:
        sc.cycles.samples = max(16, int(320 * SAMPLE_SCALE))
        sc.render.filepath = os.path.join(OUT, 'terrain-base.png')
        bpy.ops.render.render(write_still=True)
        print('rendered terrain-base')
    write_data(sc, cam, F, [T['terrain'], T['water'], T['walls'], bridge, plant_ob], [T['terrain'], bridge])


# ── Generated data for the page ─────────────────────────────────────────────
PATH_SAMPLES = 25


def surface_z(sc, dg, ground, e, n):
    """Top of the ground or the bridge deck at (e, n): a ray straight down, plants and water ignored."""
    o = Vector((wx(e), wy(n), 50.0))
    hit, loc, nor, idx, ob, mtx = sc.ray_cast(dg, o, Vector((0, 0, -1)))
    while hit and ob not in ground:
        o = loc + Vector((0, 0, -1e-4))
        hit, loc, nor, idx, ob, mtx = sc.ray_cast(dg, o, Vector((0, 0, -1)))
    assert hit, f'no ground at {e}, {n}'
    return loc.z


def seen(sc, dg, cam, p, solid):
    """Whether the camera sees world point p (a ray from the lens; only `solid` objects block)."""
    o = cam.matrix_world.translation.copy()
    d = (p - o).normalized()
    while True:
        hit, loc, nor, idx, ob, mtx = sc.ray_cast(dg, o, d, distance=(p - o).length - .003)
        if not hit:
            return True
        if ob in solid:
            return False
        o = loc + d * 1e-4


def write_data(sc, cam, F, solid, ground):
    dg = bpy.context.evaluated_depsgraph_get()
    proj = cam.calc_matrix_camera(dg, x=IMG_W, y=IMG_H)
    M = proj @ cam.matrix_world.inverted()
    marks, report = {}, {}
    for lid, a in LM.items():
        q = displaced(a)
        ts = np.linspace(0, 1, PATH_SAMPLES)
        # t = 0 at the displayed point (A read as B), t = 1 at the requested point (the landmark)
        pts = [(q['e'] + (a['e'] - q['e']) * t, q['n'] + (a['n'] - q['n']) * t) for t in ts]
        zs = [surface_z(sc, dg, ground, e, n) + .004 for e, n in pts]
        vis = ['1' if seen(sc, dg, cam, Vector((wx(e), wy(n), z + .01)), solid) else '0' for (e, n), z in zip(pts, zs)]
        assert vis[0] == '1' and vis[-1] == '1', f'{lid}: the camera must see both ends ({vis})'
        marks[lid] = dict(z=[round(z, 5) for z in zs], visible=''.join(vis))
        pa = project(sc, cam, (wx(a['e']), wy(a['n']), zs[-1])); pq = project(sc, cam, (wx(q['e']), wy(q['n']), zs[0]))
        report[lid] = dict(anchor=pa, displaced=pq, gap_px=math.hypot(pa[0] - pq[0], pa[1] - pq[1]))
        print(f"{lid}: anchor px {pa[0]:.0f},{pa[1]:.0f}  displaced px {pq[0]:.0f},{pq[1]:.0f}  gap {report[lid]['gap_px']:.0f} px  visible {''.join(vis)}")
    # the summit landmark must be the hill's top
    H, E, N = F['H'], F['E'], F['N']
    near = np.hypot(E - SM['e'], N - SM['n']) < 40
    j, i = np.unravel_index(np.argmax(np.where(near, H, -1e9)), H.shape)
    top_off = math.hypot(E[j, i] - SM['e'], N[j, i] - SM['n'])
    print(f'summit top {top_off:.1f} m from the landmark, {H[j, i]:.1f} m high; ground max {H.max():.1f} m')
    assert top_off <= 3.0, 'the summit landmark must sit on the hill top'
    assert H[j, i] >= H.max() - 1e-6, 'the summit must be the highest ground of the model'
    json.dump(dict(frame=[IMG_W, IMG_H], landmarks=report), open(os.path.join(OUT, 'frame.json'), 'w'), indent=1)
    rows = ',\n    '.join('[' + ', '.join(f'{v:.6f}' for v in M[i]) + ']' for i in range(4))
    ts = f'''// AUTO-GENERATED by scripts/blender/render_datum_field.py — do not edit by hand.
// One fixed camera rendered public/assets/lessons/topic02/datum-field-challenge/terrain-base.webp;
// these numbers place the live overlay (requested and displayed locations, the line between
// them) on its pixels. Read through datumFieldProjection.ts.

export const DATUM_FIELD_TERRAIN = {{
  /** Rendered frame (px); the page scales it uniformly. */
  image: {{ w: {IMG_W}, h: {IMG_H} }},
  /** world → clip, row-major (Blender world: x = east, y = north, z up; 1 unit = {MPU:g} m). */
  camera: [
    {rows},
  ] as const,
  /** Datum-A metres → world: x = (e − eC) / mPerUnit, y = (n − nC) / mPerUnit. */
  eC: {E_C:g},
  nC: {N_C:g},
  mPerUnit: {MPU:g},
  /** Heights are drawn ve× high. */
  ve: {VE:g},
  /** The shift the terrain was built with (must equal DATUM_SHIFT). */
  shift: {json.dumps(SHIFT)},
  /** Per landmark: world z of the ground (or the bridge deck) along the straight path from the
      displayed point (t = 0, A + shift) to the requested point (t = 1), every 1/{PATH_SAMPLES - 1};
      and whether the camera sees each sample. */
  paths: {json.dumps(marks)},
}} as const;
'''
    open(DATA_TS, 'w', encoding='utf-8').write(ts)
    print('wrote', DATA_TS)


main()
