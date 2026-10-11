"""Measurement mission landscape — layered Cycles renders + generated layout data.

Topic-02 #scene-coordinates → "אליפסואיד, גיאואיד וגליות". Same render language as the
relief/cover and land-cover renders: Cycles, the repo's CC0 textures, one fixed camera,
one transparent pass per layer the page shows or hides. The live overlay (station pins,
selection rings, the dashed survey line, the lines on the cut face, links to the
section) is drawn by the page from the camera matrix written to
src/components/lessons/topic-02/measurementLandscape.data.ts, so it lands exactly on
these pixels.

The ground is real: SRTM 1″ heights of a Mediterranean coastal range (the crop in
scripts/blender/data/measurement-dem.*), scaled by S_H and drawn VE× high. The sea and
its coastline are shaped here, and three stations get small local corrections so the
ground stands exactly H = h − N above the geoid (values in measurementMission.data.ts).
The model stands on the geoid: every point is lifted by its N (drawn NX× higher than
the land), the smooth ellipsoid is a flat level beneath, and the section on the page
samples the same fields along the survey line.

    land         the whole diorama: terrain, vegetation, sea, cut base, contact shadow
    land-cut     the same, with the slab in front of the survey line taken away — its
                 cut face is the section along that line
    geoid        the geoid sheet where it is not inside the land (over the sea, beyond
                 the model's sides)
    geoid-cut    the same sheet with the slab open: it runs on beneath the land
    ellipsoid-cut  the flat ellipsoid sheet in the open slab
    tripod-A/B/C the GNSS receiver at each station (holdout ground), and tripod-shadow-A/B/C
                 its cast shadow alone (shadow catcher); the packager puts them together

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_measurement_landscape.py -- [pass ...]
    node scripts/blender/package_measurement_landscape.cjs

Quick look: ML_PX=0.5 ML_SAMPLES=0.25 renders a 700 × 400 draft. No network.
"""
import bpy, bmesh, json, math, os, re, sys
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/measurement-landscape')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
SKY = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/env/sky.hdr')
DEM = os.path.join(ROOT, 'scripts/blender/data/measurement-dem')
MISSION_TS = os.path.join(ROOT, 'src/components/lessons/topic-02/measurementMission.data.ts')
DATA_TS = os.path.join(ROOT, 'src/components/lessons/topic-02/measurementLandscape.data.ts')
os.makedirs(OUT, exist_ok=True)

PX = float(os.environ.get('ML_PX', 1))              # 1 → 1400 × 800
SAMPLE_SCALE = float(os.environ.get('ML_SAMPLES', 1))
IMG_W, IMG_H = 1400, 800

# ── Model ───────────────────────────────────────────────────────────────────
LATC, LONC = 32.70959, 34.9828      # model centre; +x = west (toward the sea), +y = south (away from the viewer)
W_M, D_M = 4500.0, 2300.0           # footprint (m)
DEM_OY = 450.0                      # model y + DEM_OY = metres south of (LATC, LONC)
CELL = 5.0                          # mesh spacing (m)
MPU = 500.0                         # metres per Blender unit
VE = float(os.environ.get('ML_VE', 2.5))   # vertical exaggeration of the land
NX = 1.0                            # N on the land's own vertical scale, so h = H + N holds on the model too
KZ = VE / MPU                       # BU per metre of H
KN = KZ * NX                        # BU per metre of N
S_H = 0.8696                        # real heights × S_H (B's spur top → 120 m)
Y_T = -700.0                        # the survey line and the cut plane (m)
N_FAR, N_SIGMA = -6.0, 700.0        # the geoid far from the stations; reach of each station
SEA_FLOOR = -38.0                   # deepest sea (m below the geoid)
BASE_UNDER = 0.07                   # base plate under the deepest seabed (BU)
SHEET_MARGIN = 0.0                  # sheets reach this far beyond the model's sides (BU)
TRIPOD_DX, TRIPOD_DY = 200.0, -15.0  # the receiver stands just right of its station's pin (m)


def stations():
    src = open(MISSION_TS, encoding='utf-8').read()
    block = re.search(r'/\* stations:begin \*/\s*const STATION_LIST[^=]*=\s*(\[.*?\]);\s*/\* stations:end \*/', src, re.S).group(1)
    return {s['id']: s for s in json.loads(block)}


ST = stations()
for s in ST.values():
    s['H'] = s['h'] - s['N']
    assert abs(s['y'] - Y_T) < 1e-9, f"{s['id']} must stand on the survey line y = {Y_T}"


# ── Fields ──────────────────────────────────────────────────────────────────
def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def n_weights():
    ids = ['C', 'B', 'A']
    P = np.array([[ST[i]['x'], ST[i]['y']] for i in ids])
    d2 = ((P[:, None, :] - P[None, :, :]) ** 2).sum(-1)
    M = np.exp(-d2 / N_SIGMA ** 2)
    b = np.array([ST[i]['N'] - N_FAR for i in ids])
    return ids, P, np.linalg.solve(M, b)


N_IDS, N_P, N_W = n_weights()


def undulation(x, y):
    """Geoid undulation N (m) — one smooth field, exact at the three stations."""
    n = np.full(np.shape(x), N_FAR, dtype=np.float64)
    for (px, py), w in zip(N_P, N_W):
        n += w * np.exp(-((x - px) ** 2 + (y - py) ** 2) / N_SIGMA ** 2)
    return n


def geoid_z(x, y):
    return undulation(x, y) * KN


def coast_x(y):
    """Coastline: x of the waterline at y (m) — a gentle curve, the sea widening toward the viewer."""
    return 1700 + 0.2 * (y - Y_T) + 55 * np.sin(y / 380 + 0.6) + 22 * np.sin(y / 150 + 2.1)


def dem_reader():
    meta = json.load(open(DEM + '.json'))
    a = np.fromfile(DEM + '.i16', dtype='<i2').reshape(meta['rows'], meta['cols']).astype(np.float64)
    kx = 111320 * math.cos(math.radians(LATC)); ky = 110900.0

    def cubic_w(t):
        t2, t3 = t * t, t * t * t
        return np.stack([-.5 * t3 + t2 - .5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + .5 * t, .5 * t3 - .5 * t2], -1)

    def sample(xm, ym):
        lon = LONC - xm / kx; lat = LATC - ym / ky
        c = (lon - meta['lon_west']) / meta['step_deg']; r = (meta['lat_north'] - lat) / meta['step_deg']
        c0 = np.floor(c).astype(int); r0 = np.floor(r).astype(int)
        assert c0.min() >= 1 and r0.min() >= 1 and c0.max() < meta['cols'] - 2 and r0.max() < meta['rows'] - 2
        wc = cubic_w(c - c0); wr = cubic_w(r - r0)
        out = np.zeros(np.shape(xm))
        for i in range(4):
            for j in range(4):
                out += a[r0 - 1 + i, c0 - 1 + j] * wr[..., i] * wc[..., j]
        return out
    return sample


def value_noise(x, y, scale, seed, octaves=4, gain=.5):
    """Smooth fractal value noise in [-1, 1] (deterministic, numpy)."""
    rng = np.random.default_rng(seed)
    total = np.zeros(np.shape(x)); amp = 1.0; norm = 0.0
    for o in range(octaves):
        s = scale / (2 ** o)
        g = rng.standard_normal((512, 512))
        u = x / s + 211.3 * o; v = y / s + 97.1 * o
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


def build_fields():
    xs = np.arange(-W_M / 2, W_M / 2 + 1e-6, CELL); ys = np.arange(-D_M / 2, D_M / 2 + 1e-6, CELL)
    X, Y = np.meshgrid(xs, ys)
    sample = dem_reader()
    H = sample(X, Y + DEM_OY) * S_H
    # coast: signed distance to the waterline, + inland
    xc = coast_x(Y)
    d = (xc - X) / math.sqrt(1 + 0.2 ** 2)
    beach = 1.2 + 0.035 * np.clip(d, 0, None)
    land = smoothstep(30, 260, d)
    H = H * land + beach * (1 - land)
    sea_depth = np.clip(2.0 + 0.055 * -d, 0, -SEA_FLOOR) * (1 + 0.15 * value_noise(X, Y, 260, 7, 3))
    H = np.where(d < 0, -sea_depth, H)
    H = np.where((d >= 0) & (d < 30), beach * smoothstep(0, 30, d) + (-2.0) * (1 - smoothstep(0, 30, d)), H)
    # micro-relief only where rock shows (steep or sharp ground)
    gy, gx = np.gradient(H, CELL)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    relief = H - blur(H, 12)                         # + on crests, − in hollows (60 m scale)
    ledge = smoothstep(.55, .8, np.abs(((H + 6 * value_noise(X, Y, 80, 4, 3)) / 7.0) % 1.0 - .5) * 2)
    rock = smoothstep(14, 26, slope) * (.35 + .65 * ledge) + smoothstep(6, 14, relief) * smoothstep(8, 16, slope) * .5
    rock *= smoothstep(-.35, .25, value_noise(X, Y, 60, 3, 4))
    rock = np.clip(rock, 0, 1) * (d > 120)
    ridged = 1 - np.abs(value_noise(X, Y, 45, 11, 3))
    H = H + rock * (ridged ** 2 - .35) * 3.2
    # stations: tiny local corrections so the ground is exactly H there
    for sid, s in ST.items():
        for _ in range(3):
            got = float(sample_grid(H, s['x'], s['y']))
            H = H + (s['H'] - got) * np.exp(-((X - s['x']) ** 2 + (Y - s['y']) ** 2) / (2 * 70 ** 2))
        s['delta'] = float(s['H'] - sample(np.array([s['x']]), np.array([s['y'] + DEM_OY]))[0] * S_H)
    gy, gx = np.gradient(H, CELL)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    relief = H - blur(H, 12)
    N = undulation(X, Y)
    return dict(xs=xs, ys=ys, X=X, Y=Y, H=H, N=N, d=d, slope=slope, relief=relief, rock=rock, sample=sample)


def sample_grid(G, x, y):
    """Bilinear sample of a model-grid field at (x, y) metres."""
    fx = (x + W_M / 2) / CELL; fy = (y + D_M / 2) / CELL
    i = int(np.floor(fx)); j = int(np.floor(fy)); u = fx - i; v = fy - j
    i = min(max(i, 0), G.shape[1] - 2); j = min(max(j, 0), G.shape[0] - 2)
    return (G[j, i] * (1 - u) + G[j, i + 1] * u) * (1 - v) + (G[j + 1, i] * (1 - u) + G[j + 1, i + 1] * u) * v


# ── Surface masks (per vertex) ─────────────────────────────────────────────
def masks(F):
    X, Y, H, d, slope, relief = F['X'], F['Y'], F['H'], F['d'], F['slope'], F['relief']
    rock = np.clip(F['rock'] * 1.15, 0, 1)
    plain = smoothstep(55, 32, H) * smoothstep(8, 3, slope) * (d > 40)
    plain = blur(plain, 3)
    sand = smoothstep(55, 15, d) * (d > -4)
    # vegetation: maquis and pine on the slopes, thicker in hollows, open on crests and rock
    n1 = value_noise(X, Y, 360, 21, 4); n2 = value_noise(X, Y, 110, 22, 3)
    gy, gx = np.gradient(H, CELL)
    facing = np.clip(gy * 4, -1, 1)               # + where the ground rises away from the viewer
    veg = .6 + .5 * n1 + .2 * n2 - smoothstep(2, 14, relief) * .4 + smoothstep(-2, -16, relief) * .35 + .12 * facing
    veg = np.clip(veg, 0, 1) * (1 - rock * .9) * (1 - plain) * smoothstep(35, 90, d)
    # fields on the plain: tilted plots, each its own crop
    th = math.radians(9)
    u = X * math.cos(th) + Y * math.sin(th); v = -X * math.sin(th) + Y * math.cos(th)
    rng = np.random.default_rng(5)
    ucuts = np.cumsum(rng.uniform(90, 190, 80)) - 3000; vcuts = np.cumsum(rng.uniform(70, 150, 80)) - 3000
    iu = np.searchsorted(ucuts, u); iv = np.searchsorted(vcuts, v)
    du = np.minimum(u - ucuts[np.clip(iu - 1, 0, 79)], ucuts[np.clip(iu, 0, 79)] - u)
    dv = np.minimum(v - vcuts[np.clip(iv - 1, 0, 79)], vcuts[np.clip(iv, 0, 79)] - v)
    hedge = 1 - smoothstep(2.5, 6.0, np.minimum(du, dv))
    fid = (iu * 7919 + iv * 104729) % 997
    palette = np.array([[.25, .29, .12], [.33, .35, .16], [.47, .42, .27], [.38, .31, .21], [.29, .32, .14], [.43, .40, .24], [.23, .26, .11]])
    fcol = palette[fid % len(palette)] * (0.92 + 0.16 * ((fid * 31) % 17) / 17)[..., None]
    orchard = ((fid % 9) == 0).astype(float)
    # the coastal road at the foot of the slope
    road_x = 1265 + 45 * np.sin(Y / 420 + .3) + 0.12 * Y
    road = 1 - smoothstep(3.5, 6.5, np.abs(X - road_x))
    road *= plain > .3
    return dict(rock=rock, plain=plain, sand=sand, veg=veg, hedge=hedge * plain, fcol=fcol, orchard=orchard * plain, road=road)


# ── Blender helpers ─────────────────────────────────────────────────────────
def lin(hx):
    c = int(hx[1:3], 16) / 255, int(hx[3:5], 16) / 255, int(hx[5:7], 16) / 255
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def rgba(hx):
    return (*lin(hx), 1.0)


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


# ── Materials ───────────────────────────────────────────────────────────────
T_SCALE = MPU / 34.0        # one texture tile ≈ 34 m


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


def ground_material():
    m = bpy.data.materials.new('Ground'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .93
    grass = detail(ns, lk, box_tex(ns, lk, f'{TEX}/grass_diff.jpg', T_SCALE))
    dry = detail(ns, lk, box_tex(ns, lk, f'{TEX}/dry_diff.jpg', T_SCALE * .8))
    rock_t = box_tex(ns, lk, f'{TEX}/rock_diff.jpg', T_SCALE * 1.6)
    rock = detail(ns, lk, rock_t, .6, 1.35)
    forest = detail(ns, lk, box_tex(ns, lk, f'{TEX}/forest_diff.jpg', T_SCALE * 1.2))
    big = noise(ns, lk, 3.5, 3, .5); mid = noise(ns, lk, 22, 3, .55)
    # open batha: dry grass and bare soil between the shrubs
    open_c = mix(ns, lk, big.outputs['Fac'], (0.27, 0.27, 0.16, 1), (0.33, 0.31, 0.19, 1))
    open_c = mix(ns, lk, ramp(ns, lk, mid.outputs['Fac'], .4, .7), open_c, (0.22, 0.25, 0.12, 1))
    open_c = tone(ns, lk, open_c, dry)
    under = tone(ns, lk, (0.065, 0.08, 0.038, 1), forest)
    ground = mix(ns, lk, attr(ns, 'veg'), open_c, under)
    rock_c = tone(ns, lk, (0.56, 0.545, 0.5, 1), rock)
    rn = noise(ns, lk, 180, 4, .6)
    rmask = ramp(ns, lk, math_node(ns, lk, 'ADD', attr(ns, 'rock'), math_node(ns, lk, 'SUBTRACT', rn.outputs['Fac'], .5)), .4, .65)
    ground = mix(ns, lk, rmask, ground, rock_c)
    # plain: fields, hedges, orchards
    field = tone(ns, lk, attr(ns, 'fcol', 'Color'), grass)
    field = mix(ns, lk, attr(ns, 'hedge'), field, (0.08, 0.10, 0.045, 1))
    ground = mix(ns, lk, attr(ns, 'plain'), ground, field)
    ground = mix(ns, lk, attr(ns, 'road'), ground, (0.31, 0.30, 0.28, 1))
    sand = tone(ns, lk, (0.70, 0.64, 0.51, 1), dry)
    ground = mix(ns, lk, attr(ns, 'sand'), ground, sand)
    lk.new(ground, bs.inputs['Base Color'])
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .002; bump.inputs['Strength'].default_value = .7
    bw = ns.new('ShaderNodeRGBToBW'); lk.new(rock_t.outputs['Color'], bw.inputs[0])
    lk.new(math_node(ns, lk, 'MULTIPLY', bw.outputs[0], rmask), bump.inputs['Height'])
    lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def tree_material():
    m = bpy.data.materials.new('Trees'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .85
    n = noise(ns, lk, 900, 2, .5)
    c = mix(ns, lk, .25, attr(ns, 'tint', 'Color'), n.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    bs.inputs['Subsurface Weight'].default_value = .08
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .0015; bump.inputs['Strength'].default_value = .6
    lk.new(n.outputs['Fac'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def water_material():
    m = bpy.data.materials.new('Sea'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']
    depth = attr(ns, 'depth')
    shallow, deep = rgba('#74B2B3'), rgba('#3A7590')
    c = mix(ns, lk, ramp(ns, lk, depth, 0, 22), shallow, deep)
    foam = ramp(ns, lk, depth, 1.6, .4)
    c = mix(ns, lk, math_node(ns, lk, 'MULTIPLY', foam, .75), c, (0.85, 0.88, 0.86, 1))
    lk.new(c, bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .16
    bs.inputs['Specular IOR Level'].default_value = .45
    n = noise(ns, lk, 260, 3, .6)
    bump = ns.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = .0008; bump.inputs['Strength'].default_value = .25
    lk.new(n.outputs['Fac'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def cut_material(name, top_soil=True):
    """The cut edge: a thin topsoil band over plain pale ground in the site's ground tone — no strata, so
    nothing on the face reads as a layer except the lines the page draws on it."""
    m = bpy.data.materials.new(name); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .95
    geo = ns.new('ShaderNodeNewGeometry')
    sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Position'], sep.inputs[0])
    depth = math_node(ns, lk, 'SUBTRACT', attr(ns, 'ztop'), sep.outputs['Z'])
    mottle = noise(ns, lk, 14, 3, .6)
    stone = mix(ns, lk, ramp(ns, lk, mottle.outputs['Fac'], .35, .65), rgba('#E8DCC4'), rgba('#DCCCAB'))
    stone = mix(ns, lk, ramp(ns, lk, depth, .05, .9), rgba('#C9B48D'), stone)
    soil = rgba('#5E4E3A')
    band = ramp(ns, lk, depth, .03, .018) if top_soil else 0.0
    c = mix(ns, lk, band, stone, soil)
    lk.new(c, bs.inputs['Base Color'])
    return m


def water_cut_material():
    m = bpy.data.materials.new('Sea cut'); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Roughness'].default_value = .3
    geo = ns.new('ShaderNodeNewGeometry')
    sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Position'], sep.inputs[0])
    depth = math_node(ns, lk, 'SUBTRACT', attr(ns, 'zsea'), sep.outputs['Z'])
    c = mix(ns, lk, ramp(ns, lk, depth, 0, .22), rgba('#6FB0B8'), rgba('#356F8C'))
    lk.new(c, bs.inputs['Base Color'])
    return m


def sheet_material(name, hx, grid_m=250.0, line_m=7.0, fill=.22, line=.7, edge_y=-D_M / 2 / MPU, x_fade=(-W_M / 2 / MPU, W_M / 2 / MPU)):
    """A virtual reference surface: a faint fill, a thin analytic grid, fading out past the model's sides."""
    m = bpy.data.materials.new(name); ns, lk = nodes(m)
    for n in list(ns):
        if n.type != 'OUTPUT_MATERIAL':
            ns.remove(n)
    out = [n for n in ns if n.type == 'OUTPUT_MATERIAL'][0]
    geo = ns.new('ShaderNodeNewGeometry')
    sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Position'], sep.inputs[0])
    g = grid_m / MPU; half = line_m / MPU / 2

    def lines(coord):
        # distance to the nearest grid line, in BU → 1 on the line
        f = math_node(ns, lk, 'PINGPONG', math_node(ns, lk, 'ADD', coord, g / 2), g / 2)
        return math_node(ns, lk, 'LESS_THAN', math_node(ns, lk, 'SUBTRACT', g / 2, f), half)
    gx = lines(sep.outputs['X']); gy = lines(sep.outputs['Y'])
    grid = math_node(ns, lk, 'MAXIMUM', gx, gy)
    # the sheet's own front edge, drawn firmer: where it meets the open slab you see its shape
    edge = math_node(ns, lk, 'LESS_THAN', math_node(ns, lk, 'ABSOLUTE', math_node(ns, lk, 'SUBTRACT', sep.outputs['Y'], edge_y + half * 1.6)), half * 1.6)
    grid = math_node(ns, lk, 'MAXIMUM', grid, math_node(ns, lk, 'MULTIPLY', edge, 1.3))
    # fade beyond the model's sides
    ax = math_node(ns, lk, 'ABSOLUTE', sep.outputs['X'])
    fade = ramp(ns, lk, ax, x_fade[1] + SHEET_MARGIN + .02, x_fade[1] + min(SHEET_MARGIN, .02))
    alpha = math_node(ns, lk, 'MINIMUM', math_node(ns, lk, 'MULTIPLY', math_node(ns, lk, 'ADD', fill, math_node(ns, lk, 'MULTIPLY', grid, line - fill)), fade), .95)
    em = ns.new('ShaderNodeEmission'); em.inputs['Color'].default_value = rgba(hx); em.inputs['Strength'].default_value = 1
    tr = ns.new('ShaderNodeBsdfTransparent')
    mx = ns.new('ShaderNodeMixShader')
    lk.new(alpha, mx.inputs[0]); lk.new(tr.outputs[0], mx.inputs[1]); lk.new(em.outputs[0], mx.inputs[2])
    lk.new(mx.outputs[0], out.inputs['Surface'])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m


def simple_material(name, hx, rough=.6, metal=0.0):
    m = bpy.data.materials.new(name); ns, lk = nodes(m)
    bs = ns['Principled BSDF']; bs.inputs['Base Color'].default_value = rgba(hx)
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    return m


# ── Geometry ────────────────────────────────────────────────────────────────
def world_z(F, H, N):
    return N * KN + H * KZ


def build_diorama(F, Mk, mats, y_front, coll, tag):
    """Terrain from y_front to the back edge, the sea on the geoid, and the cut walls around it."""
    xs, ys = F['xs'], F['ys']
    j0 = int(round((y_front + D_M / 2) / CELL))
    Ys = ys[j0:]; nx, ny = len(xs), len(Ys)
    H = F['H'][j0:]; N = F['N'][j0:]
    Z = world_z(F, H, N)
    Zg = N * KN
    X = F['X'][j0:]; Y = F['Y'][j0:]
    verts = np.stack([X / MPU, Y / MPU, Z], -1).reshape(-1, 3)
    terrain = mesh_from(f'Terrain {tag}', verts, grid_faces(ny, nx), coll)
    for k in ('rock', 'plain', 'sand', 'veg', 'hedge', 'road', 'orchard'):
        add_attr(terrain, k, Mk[k][j0:])
    add_attr(terrain, 'fcol', Mk['fcol'][j0:], 'COLOR')
    terrain.data.materials.append(mats['ground'])
    # sea: the geoid surface where the ground is below it
    sea_rows = Zg.copy()
    sea_v = np.stack([X / MPU, Y / MPU, sea_rows], -1).reshape(-1, 3)
    sea = mesh_from(f'Sea {tag}', sea_v, grid_faces(ny, nx)[::1], coll)
    add_attr(sea, 'depth', np.clip(-H, 0, None))
    sea.data.materials.append(mats['water'])
    # trim the sea quads that lie wholly inside the land (keeps the mesh light)
    bm = bmesh.new(); bm.from_mesh(sea.data)
    under = (H < 0.5).ravel()
    dead = [f for f in bm.faces if not any(under[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(sea.data); bm.free()
    # walls: four sides, the front one at y_front
    z_base = SEA_FLOOR * KZ + N_FAR * KN - BASE_UNDER
    walls = []
    sides = [
        ('front', X[0], Y[0], Z[0], Zg[0], False),
        ('back', X[-1], Y[-1], Z[-1], Zg[-1], True),
        ('left', X[:, 0], Y[:, 0], Z[:, 0], Zg[:, 0], True),
        ('right', X[:, -1], Y[:, -1], Z[:, -1], Zg[:, -1], False),
    ]
    earth_v, earth_f, earth_top = [], [], []
    water_v, water_f, water_top = [], [], []
    for name, sx, sy, sz, sg, flip in sides:
        n = len(sx)
        o = len(earth_v)
        for i in range(n):
            earth_v += [(sx[i] / MPU, sy[i] / MPU, z_base), (sx[i] / MPU, sy[i] / MPU, sz[i])]
            earth_top += [sz[i], sz[i]]
        for i in range(n - 1):
            a, b = o + 2 * i, o + 2 * i + 2
            f = (a, b, b + 1, a + 1)
            earth_f.append(f[::-1] if flip else f)
        for i in range(n - 1):
            if sz[i] < sg[i] - 1e-6 or sz[i + 1] < sg[i + 1] - 1e-6:
                o2 = len(water_v)
                for k in (i, i + 1):
                    top = max(sg[k], sz[k])
                    water_v += [(sx[k] / MPU, sy[k] / MPU, sz[k]), (sx[k] / MPU, sy[k] / MPU, top)]
                    water_top += [sg[k], sg[k]]
                f = (o2, o2 + 2, o2 + 3, o2 + 1)
                water_f.append(f[::-1] if flip else f)
    earth = mesh_from(f'Cut {tag}', earth_v, earth_f, coll, smooth=False)
    add_attr(earth, 'ztop', earth_top)
    earth.data.materials.append(mats['cut'])
    walls.append(earth)
    if water_f:
        water = mesh_from(f'Sea cut {tag}', water_v, water_f, coll, smooth=False)
        add_attr(water, 'zsea', water_top)
        water.data.materials.append(mats['water_cut'])
        walls.append(water)
    return dict(terrain=terrain, sea=sea, walls=walls, z_base=z_base)


def tree_templates(k=5, seed=3):
    rng = np.random.default_rng(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    V0 = np.array([v.co[:] for v in bm.verts]); Fc = np.array([[v.index for v in f.verts] for f in bm.faces]); bm.free()
    out = []
    for _ in range(k):
        lobes = rng.normal(0, 1, (len(V0),)) * .1
        V = V0 * (1 + lobes[:, None])
        V[:, 2] = V[:, 2] * .78 + .62           # crown sits above the ground
        V[:, 2] = np.maximum(V[:, 2], .05)
        out.append(V)
    return out, Fc


def place_trees(F, Mk, seed=17):
    """Pine and oak maquis in clumps, low shrubs scattered through the open batha, orchard rows on the plain."""
    rng = np.random.default_rng(seed)
    out = []
    for sp, kind in ((7.5, 'tree'), (11.0, 'shrub')):
        gx = np.arange(-W_M / 2 + sp, W_M / 2 - sp, sp); gy = np.arange(-D_M / 2 + sp, D_M / 2 - sp, sp)
        PX_, PY_ = np.meshgrid(gx, gy)
        PX_ = (PX_ + rng.uniform(-.48, .48, PX_.shape) * sp).ravel(); PY_ = (PY_ + rng.uniform(-.48, .48, PY_.shape) * sp).ravel()
        fx = np.clip(((PX_ + W_M / 2) / CELL).round().astype(int), 0, F['H'].shape[1] - 1)
        fy = np.clip(((PY_ + D_M / 2) / CELL).round().astype(int), 0, F['H'].shape[0] - 1)
        veg = Mk['veg'][fy, fx]
        clump = value_noise(PX_, PY_, 38, 31 if kind == 'tree' else 32, 2)
        if kind == 'tree':
            dens = smoothstep(.12, .6, veg) * (.6 + .4 * smoothstep(-.6, .3, clump))
            dens = np.maximum(dens, Mk['orchard'][fy, fx] * .7 * ((np.round(PX_ / 7.5) % 2) == 0))
        else:
            dens = (1 - smoothstep(.2, .55, veg)) * .7 * (1 - Mk['rock'][fy, fx] * .5) * (Mk['plain'][fy, fx] < .3) * (F['d'][fy, fx] > 80)
        keep = rng.uniform(0, 1, dens.shape) < dens
        for s in ST.values():
            keep &= (PX_ - s['x']) ** 2 + (PY_ - s['y']) ** 2 > 70 ** 2
            keep &= (PX_ - s['x'] - TRIPOD_DX) ** 2 + (PY_ - s['y'] - TRIPOD_DY) ** 2 > 40 ** 2
        PX_, PY_, fx, fy = PX_[keep], PY_[keep], fx[keep], fy[keep]
        n = len(PX_)
        if kind == 'tree':
            r = rng.uniform(3.6, 8.0, n) ** 1.0 * (1 - .4 * Mk['orchard'][fy, fx])
            pine = rng.uniform(0, 1, n) < .5
            base = np.where(pine[:, None], [.05, .08, .035], [.10, .14, .05])
        else:
            r = rng.uniform(2.8, 4.8, n)
            base = np.tile([.13, .15, .085], (n, 1))
        tint = base * rng.uniform(.75, 1.25, (n, 1)) * rng.uniform(.9, 1.1, (n, 3))
        out.append(dict(x=PX_, y=PY_, r=r, tint=tint, var=rng.integers(0, 5, n)))
    T = {k: np.concatenate([o[k] for o in out]) for k in out[0]}
    Hs = np.array([sample_grid(F['H'], x, y) for x, y in zip(T['x'], T['y'])])
    T['z'] = Hs * KZ + undulation(T['x'], T['y']) * KN
    return T


def tree_mesh(name, T, sel, mats, coll):
    tpl, Fc = tree_templates()
    V, Fs, C = [], [], []
    off = 0
    for k, Vt in enumerate(tpl):
        ids = np.where(sel & (T['var'] == k))[0]
        if not len(ids):
            continue
        r = T['r'][ids]
        hz = r * 1.25 / MPU                 # crowns read at 1.25× height, not at the land's VE
        v = Vt[None, :, :] * np.stack([r / MPU, r / MPU, hz], -1)[:, None, :]
        v = v + np.stack([T['x'][ids] / MPU, T['y'][ids] / MPU, T['z'][ids] - .25 * hz], -1)[:, None, :]
        V.append(v.reshape(-1, 3))
        Fs.append((Fc[None, :, :] + (off + np.arange(len(ids)) * len(Vt))[:, None, None]).reshape(-1, 3))
        C.append(np.repeat(T['tint'][ids], len(Vt), 0))
        off += len(ids) * len(Vt)
    ob = mesh_from(name, np.concatenate(V), np.concatenate(Fs), coll)
    add_attr(ob, 'tint', np.concatenate(C), 'COLOR')
    ob.data.materials.append(mats['trees'])
    return ob


def sheet_mesh(name, F, z_of, y0, y1, mat, coll, step=25.0):
    xs = np.arange(-W_M / 2 - SHEET_MARGIN * MPU, W_M / 2 + SHEET_MARGIN * MPU + 1e-6, step)
    ys = np.arange(y0, y1 + 1e-6, step)
    X, Y = np.meshgrid(xs, ys)
    Z = z_of(X, Y)
    ob = mesh_from(name, np.stack([X / MPU, Y / MPU, Z], -1).reshape(-1, 3), grid_faces(len(ys), len(xs)), coll)
    ob.data.materials.append(mat)
    ob.visible_shadow = False
    return ob


def tripod(name, x, y, z, mats, coll):
    """A survey tripod with a GNSS antenna — a symbol about 30 px tall on the page, just right of its
    station's pin: wooden legs, a dark head and pole, a white antenna (reads against the forest)."""
    bm = bmesh.new()
    s = .62                                        # height (BU)
    head = Vector((x, y, z + s))

    def part(geom, mi):
        for f in {f for v in geom['verts'] for f in v.link_faces}:
            f.material_index = mi
    for k in range(3):
        a = math.radians(90 + k * 120 + 20)
        foot = Vector((x + math.cos(a) * s * .34, y + math.sin(a) * s * .34, z))
        d = head - foot
        cyl = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=.014, radius2=.011, depth=d.length)
        rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation((foot + head) / 2) @ rot, verts=cyl['verts'])
        part(cyl, 0)
    cap = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=.03, radius2=.03, depth=.03)
    bmesh.ops.translate(bm, vec=head, verts=cap['verts']); part(cap, 1)
    pole = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=.014, radius2=.014, depth=.09)
    bmesh.ops.translate(bm, vec=head + Vector((0, 0, .055)), verts=pole['verts']); part(pole, 1)
    ant = bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=.062, radius2=.044, depth=.034)
    bmesh.ops.translate(bm, vec=head + Vector((0, 0, .115)), verts=ant['verts']); part(ant, 2)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    for m in (mats['tripod_legs'], mats['tripod'], mats['antenna']):
        ob.data.materials.append(m)
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
    sc.cycles.transparent_max_bounces = 16
    sc.render.resolution_x = round(IMG_W * PX); sc.render.resolution_y = round(IMG_H * PX)
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.view_settings.exposure = .25
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    w = bpy.data.worlds.new('Sky'); sc.world = w; w.use_nodes = True
    ns, lk = w.node_tree.nodes, w.node_tree.links
    # an even sky (the HDR in the repo carries its own sun, which would fight the key light)
    bg = ns['Background']; bg.inputs[0].default_value = (.76, .82, .92, 1); bg.inputs[1].default_value = float(os.environ.get('ML_SKY', .5))
    sun_d = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_d); sc.collection.objects.link(sun)
    sun.rotation_euler = Vector((-.8, .03, .6)).normalized().to_track_quat('Z', 'Y').to_euler()
    sun_d.energy = float(os.environ.get('ML_SUN', 5.4)); sun_d.angle = math.radians(3); sun_d.color = (1, .94, .84)
    return sc


def look(sc, agx=True):
    if agx:
        sc.view_settings.view_transform = 'AgX'
        for name in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Base Contrast', 'None'):
            try:
                sc.view_settings.look = name
                break
            except TypeError:
                pass
    else:
        sc.view_settings.view_transform = 'Standard'
        sc.view_settings.look = 'None'


CAM_ELEV = float(os.environ.get('ML_ELEV', 55)); CAM_AZ = float(os.environ.get('ML_AZ', 4)); CAM_LENS = 70.0


def camera(sc, fit_pts, z_mid):
    """Fixed oblique view; target and distance solved so the fit points fill the frame window."""
    cd = bpy.data.cameras.new('Camera'); cd.lens = CAM_LENS; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    cam = bpy.data.objects.new('Camera', cd); sc.collection.objects.link(cam); sc.camera = cam
    el, az = math.radians(CAM_ELEV), math.radians(CAM_AZ)
    dirv = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    rot = (-dirv).to_track_quat('-Z', 'Y')
    R = rot.to_matrix(); right_v = R @ Vector((1, 0, 0)); up_v = R @ Vector((0, 1, 0)); fwd = -dirv
    tw = 18 / CAM_LENS; th = tw * IMG_H / IMG_W
    # frame window in NDC: room above for the pins, a little at the sides and below for the shadow
    U0, U1, V0, V1 = -.975, .975, -.94, .84
    tgt = Vector((0, 0, z_mid)); dist = 15.0
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


def render(sc, name, samples):
    sc.cycles.samples = max(8, int(samples * SAMPLE_SCALE))
    sc.render.filepath = os.path.join(OUT, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)


def show(objs, on=(), holdout=(), catcher=()):
    for o in objs:
        o.hide_render = o not in on and o not in holdout and o not in catcher
        o.is_holdout = o in holdout
        o.is_shadow_catcher = o in catcher


def main():
    want = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    F = build_fields()
    Mk = masks(F)
    for sid, s in ST.items():
        print(f"station {sid}: H {s['H']} m, local correction {s['delta']:+.1f} m")
        assert abs(s['delta']) < 12, f'{sid} needs too large a correction'
    sc = setup()
    coll = bpy.context.scene.collection
    mats = dict(ground=ground_material(), trees=tree_material(), water=water_material(), cut=cut_material('Cut'),
                water_cut=water_cut_material(), tripod=simple_material('Tripod', '#3A3F38', .45, .3),
                tripod_legs=simple_material('Tripod legs', '#C29455', .55), antenna=simple_material('Antenna', '#F4F2EC', .35))
    mats['geoid'] = sheet_material('Geoid sheet', '#8A6F4D', fill=.3, line=.8)
    mats['ellipsoid'] = sheet_material('Ellipsoid sheet', '#5B7C5C', grid_m=500.0, fill=.1, line=.42)
    full = build_diorama(F, Mk, mats, -D_M / 2, coll, 'full')
    cut = build_diorama(F, Mk, mats, Y_T, coll, 'cut')
    T = place_trees(F, Mk)
    front = T['y'] < Y_T
    edge = (T['y'] >= Y_T) & (T['y'] < Y_T + T['r'] + 2)
    back = ~front & ~edge
    trees_front = tree_mesh('Trees front', T, front | edge, mats, coll)
    trees_back = tree_mesh('Trees back', T, back, mats, coll)
    print('trees', int(front.sum() + edge.sum()), int(back.sum()))
    z_base = full['z_base']
    table = mesh_from('Table', [(-12, -9, z_base - .002), (12, -9, z_base - .002), (12, 9, z_base - .002), (-12, 9, z_base - .002)], [(0, 1, 2, 3)], coll)
    table.is_shadow_catcher = True
    geoid = sheet_mesh('Geoid', F, lambda x, y: geoid_z(x, y) + .004, -D_M / 2, D_M / 2, mats['geoid'], coll)
    ell = sheet_mesh('Ellipsoid', F, lambda x, y: np.zeros_like(x), -D_M / 2, Y_T, mats['ellipsoid'], coll)
    tri = {sid: tripod(f'Tripod {sid}', (s['x'] + TRIPOD_DX) / MPU, (s['y'] + TRIPOD_DY) / MPU,
                       float(sample_grid(F['H'], s['x'] + TRIPOD_DX, s['y'] + TRIPOD_DY) * KZ + undulation(np.array(s['x'] + TRIPOD_DX), np.array(s['y'] + TRIPOD_DY)) * KN), mats, coll)
           for sid, s in ST.items()}
    # camera: frame the whole diorama with its highest ground
    Zmax = float((F['H'] * KZ + F['N'] * KN).max())
    top = np.maximum(F['H'] * KZ + F['N'] * KN, F['N'] * KN)
    fit = [Vector((x / MPU, y / MPU, z_base)) for x in (-W_M / 2, W_M / 2) for y in (-D_M / 2, D_M / 2)]
    for x in np.linspace(-W_M / 2, W_M / 2, 31):
        for y in (-D_M / 2, D_M / 2):
            fit.append(Vector((x / MPU, y / MPU, float(sample_grid(top, x, y)))))
    for y in np.linspace(-D_M / 2, D_M / 2, 17):
        for x in (-W_M / 2, W_M / 2):
            fit.append(Vector((x / MPU, y / MPU, float(sample_grid(top, x, y)))))
    cam = camera(sc, fit, Zmax * .35)

    everything = [full['terrain'], full['sea'], *full['walls'], cut['terrain'], cut['sea'], *cut['walls'],
                  trees_front, trees_back, table, geoid, ell, *tri.values()]
    land_full = [full['terrain'], full['sea'], *full['walls'], trees_front, trees_back]
    land_cut = [cut['terrain'], cut['sea'], *cut['walls'], trees_back]
    passes = {
        'land': lambda: (show(everything, on=land_full, catcher=[table]), look(sc, True), render(sc, 'land', 384)),
        'land-cut': lambda: (show(everything, on=land_cut, catcher=[table]), look(sc, True), render(sc, 'land-cut', 384)),
        'geoid': lambda: (show(everything, on=[geoid], holdout=[full['terrain'], *full['walls'], trees_front, trees_back]), look(sc, False), render(sc, 'geoid', 64)),
        'geoid-cut': lambda: (show(everything, on=[geoid], holdout=[cut['terrain'], *cut['walls'], trees_back]), look(sc, False), render(sc, 'geoid-cut', 64)),
        'ellipsoid-cut': lambda: (show(everything, on=[ell], holdout=[cut['terrain'], *cut['walls'], trees_back]), look(sc, False), render(sc, 'ellipsoid-cut', 64)),
    }
    def tripod_pass(sid, shadow):
        ground = [full['terrain'], trees_front, trees_back, *full['walls']]
        if shadow:
            show(everything, on=[tri[sid]], catcher=ground)
            tri[sid].visible_camera = False
        else:
            show(everything, on=[tri[sid]], holdout=ground)
        look(sc, True)
        render(sc, f"tripod-{'shadow-' if shadow else ''}{sid}", 128)
        tri[sid].visible_camera = True
    for sid in ST:
        passes[f'tripod-{sid}'] = lambda sid=sid: tripod_pass(sid, False)
        passes[f'tripod-shadow-{sid}'] = lambda sid=sid: tripod_pass(sid, True)
    for name, run in passes.items():
        if not want or name in want:
            run()
    # what the camera sees of the closed model: only its own surfaces may hide the survey line
    for o in everything:
        o.hide_set(o not in land_full)
    write_data(sc, cam, F, full, T, z_base)


# ── Generated data for the page ─────────────────────────────────────────────
def write_data(sc, cam, F, full, T, z_base):
    dg = bpy.context.evaluated_depsgraph_get()
    proj = cam.calc_matrix_camera(dg, x=IMG_W, y=IMG_H)
    view = cam.matrix_world.inverted()
    M = proj @ view
    # transect samples: every 10 m along y = Y_T, with what the camera sees of the closed model
    step = 10.0
    xs = np.arange(-W_M / 2, W_M / 2 + 1e-6, step)
    Hs = np.array([sample_grid(F['H'], x, Y_T) for x in xs])
    Ns = undulation(xs, np.full_like(xs, Y_T))
    Zs = Hs * KZ + Ns * KN
    vis = []
    origin = cam.matrix_world.translation
    for x, z, h, n in zip(xs, Zs, Hs, Ns):
        top = max(z, n * KN)                       # over the sea the line rides the water
        p = Vector((x / MPU, Y_T / MPU, top + .003))
        d = p - origin
        hit, loc, *_ = sc.ray_cast(dg, origin, d.normalized(), distance=d.length - .01)
        vis.append('0' if hit else '1')
    stations = {}
    for sid, s in ST.items():
        z = float(sample_grid(F['H'], s['x'], s['y']) * KZ + undulation(np.array(s['x']), np.array(s['y'])) * KN)
        stations[sid] = dict(x=s['x'] / MPU, y=s['y'] / MPU, z=round(z, 5), s=s['x'] + W_M / 2,
                             heightM=round(float(sample_grid(F['H'], s['x'], s['y'])), 3))
        px, py = project(sc, cam, (s['x'] / MPU, s['y'] / MPU, z))
        print(f'station {sid} at image px {px:.0f},{py:.0f}')
    # anchors for the surface view's place names: the range's top at the back left, the wadi the
    # survey line crosses between C and B, and open sea
    zf = F['H'] * KZ + F['N'] * KN
    j, i = np.unravel_index(np.argmax(np.where((F['X'] > -1600) & (F['X'] < -700) & (F['Y'] > 250) & (F['Y'] < 800), F['H'], -1e9)), F['H'].shape)
    seg = (xs > ST['C']['x']) & (xs < ST['B']['x'])
    kv = int(np.argmin(np.where(seg, Hs, 1e9)))
    sx, sy = 2030.0, Y_T + 650.0
    assert sample_grid(F['H'], sx, sy) < 0, 'the sea anchor must be in the sea'
    feats = dict(ridge=[F['X'][j, i] / MPU, F['Y'][j, i] / MPU, zf[j, i]], valley=[xs[kv] / MPU, Y_T / MPU, Zs[kv]],
                 sea=[sx / MPU, sy / MPU, float(undulation(np.array(sx), np.array(sy)) * KN)])
    feats = {k: [round(float(v), 4) for v in p] for k, p in feats.items()}
    rows = ',\n    '.join('[' + ', '.join(f'{v:.6f}' for v in M[i]) + ']' for i in range(4))
    fmt = lambda a, d=2: '[' + ', '.join(f'{v:.{d}f}' for v in a) + ']'
    ts = f'''// AUTO-GENERATED by scripts/blender/render_measurement_landscape.py — do not edit by hand.
// One camera rendered every layer in public/reference-assets/measurement-mission/; these
// numbers place the live overlay (pins, rings, survey line, cut-face lines, section) on them.

export const MEASUREMENT_LANDSCAPE = {{
  /** Rendered layer size (px); the page scales it uniformly. */
  image: {{ w: {IMG_W}, h: {IMG_H} }},
  /** world → clip, row-major (Blender world: x toward the sea, y away from the viewer, z up; 1 unit = {MPU:g} m). */
  camera: [
    {rows},
  ] as const,
  mPerUnit: {MPU:g},
  /** Land heights are drawn ve× high; N another nx× on top. */
  ve: {VE:g},
  nx: {NX:g},
  width: {W_M / MPU:g},
  depth: {D_M / MPU:g},
  baseZ: {z_base:.5f},
  /** The survey line, and the plane the cut opens along (world y). */
  lineY: {Y_T / MPU:g},
  /** The geoid far from the stations and each station's reach (m); weights solve N exactly at C, B, A. */
  nField: {{ far: {N_FAR:g}, sigma: {N_SIGMA:g}, ids: {json.dumps(N_IDS)} as const, weights: {fmt(N_W, 6)} }},
  stations: {json.dumps(stations)},
  /** World points for the surface view's place names (a ridge top, the wadi on the survey line, the sea). */
  features: {json.dumps(feats)},
  /** Samples along the survey line, every {step:g} m from the model's left edge: H and N (m), and whether the camera sees the line on the closed model. */
  line: {{
    step: {step:g},
    H: {fmt(Hs, 2)},
    N: {fmt(Ns, 3)},
    visible: '{''.join(vis)}',
  }},
}} as const;
'''
    open(DATA_TS, 'w', encoding='utf-8').write(ts)
    print('wrote', DATA_TS)


if __name__ == '__main__':  # export_measurement_model.py imports the fields, materials and geometry
    main()
