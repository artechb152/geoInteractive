"""Realistic top-down render for topic-02 „זיהוי סוגי תכסית בשטח” (LandCoverMap.tsx).

Same render language as the relief/cover side-section (render_relief_cover.py): Cycles,
the repo's CC0 photo textures, procedural leaf atlases, one warm sun. Here the camera
looks straight down, orthographic, locked 1:1 to the map tile (0 0 400 250, 1 unit ≈ 1 m),
so the live overlay of the papercut version (archived as LandCoverMapV1.tsx) — region
hulls, hover/selection outlines, name tags and hit areas — lands exactly where it did.

    ground-<season>     the bare land between the regions (full frame, opaque)
    <region>[-<season>] one transparent pass per selectable region: its own floor and
                        objects, with the shadows they cast on each other baked in
    shadow-<region>     what a raised region casts on the land around it (shown under
                        every raised region, dimmed with its own region on the page)

Seasonal regions (ground, grove, garrigue, batha, terraces, fields) render their winter
look only (the page has no season switch; the summer material values stay unused).
Planted forest, orchard and the rest render once.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_land_cover.py -- [pass ...]
    node scripts/blender/package_land_cover.cjs

Quick look: LC_PX=1 LC_SAMPLES=0.25 renders a 400 × 250 draft.
Keep the geometry block below in sync with LandCoverMap.tsx. No network.
"""
import bpy, bmesh, math, os, random, re, sys
import numpy as np
from mathutils import Vector, Matrix, noise
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/land-cover-blender')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
TRF = os.path.join(ROOT, 'public/assets/lessons/topic04/trafficability-drive/textures')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)

PX = float(os.environ.get('LC_PX', 3))           # 1200 × 750
SAMPLE_SCALE = float(os.environ.get('LC_SAMPLES', 1))

# ── Shared with LandCoverMap.tsx ────────────────────────────────────────────
W, H = 400, 250

HULL = {
    'grove': 'M14,20 C22,6 48,3 66,8 C84,3 110,5 122,15 C132,28 129,46 125,58 C129,72 117,88 97,86 C78,90 58,84 40,88 C22,90 7,78 10,62 C4,48 8,32 14,20 Z',
    'garrigue': 'M12,124 C30,113 60,117 80,115 C100,111 124,116 128,130 C132,146 124,164 104,166 C84,170 60,164 40,168 C20,170 8,158 10,144 C8,136 8,128 12,124 Z',
    'terraces': 'M12,186 C40,173 96,172 127,182 C134,200 133,226 125,245 C90,251 40,251 12,245 C5,226 5,204 12,186 Z',
    'batha': 'M270,212 C290,202 330,206 356,204 C378,202 394,210 394,222 C396,236 386,246 366,246 C340,248 300,246 280,244 C266,240 262,222 270,212 Z',
    'planted': 'M150,10 H236 V86 H150 Z',
    'fields': 'M147,115 H241 V183 H147 Z',
    'reservoir': 'M160,193 H226 Q237,193 237,204 V232 Q237,243 226,243 H160 Q149,243 149,232 V204 Q149,193 160,193 Z',
    'village': 'M268,8 C300,3 360,3 389,9 C397,30 397,62 391,85 C356,92 300,92 266,87 C259,62 259,30 268,8 Z',
    'orchard': 'M270,126 H388 V196 H270 Z',
}
ROAD = 'M-6,108 C80,97 160,113 250,102 S362,90 406,94'
TRACK = 'M249,103 C247,132 251,150 249,172 S247,222 249,256 M249,160 H268'
POWER_X = 139
PYLONS = [22, 72, 122, 172, 222]
FENCE = 'M268,156 V124 H390 V198 H268 V164'
PLANTED = [(160 + (i % 5) * 16.5, 20.5 + (i // 5) * 18.5) for i in range(20)]
ORCHARD_ROWS = [139, 156, 173, 189]
ORCHARD = [(283 + i * 19.4, y) for y in ORCHARD_ROWS for i in range(6)]
FIELD_PLOTS = [(148, 116, 45, 66, 'v'), (196, 116, 44, 31, 'h'), (196, 150, 44, 32, 'd')]
TERRACE_TOPS = [178, 189, 200, 211, 222, 233, 244]
HOUSES = [
    (271, 13, 11, 8), (286, 11, 10, 9), (301, 14, 12, 8), (318, 10, 10, 8), (333, 12, 11, 9), (349, 10, 12, 8), (366, 14, 10, 9), (379, 24, 9, 10),
    (268, 29, 10, 10), (283, 31, 11, 8), (270, 49, 10, 9), (285, 51, 12, 9), (268, 67, 12, 9), (285, 69, 10, 8),
    (357, 29, 11, 9), (373, 33, 11, 8), (358, 50, 10, 10), (374, 52, 11, 9), (356, 69, 12, 8), (373, 70, 10, 9),
    (297, 65, 11, 9), (310, 71, 10, 8), (338, 70, 10, 8),
]
YARD_TREES = [(281, 24, 2.2), (297, 26, 2), (345, 24, 2.3), (365, 45, 2), (281, 62, 2.2), (300, 80, 2), (352, 82, 2.1), (384, 64, 2.2), (277, 83, 1.9)]
LANES = ['M326,58 L327,97', 'M262,44 H304', 'M348,44 H396']
LANE_RING = (300, 28, 52, 32, 6)
SQUARE = (305, 33, 42, 22, 3)


# ── SVG path sampling (absolute M L H V C S Q Z — all the map uses) ──────────
def sample_path(d, step=1.0):
    toks = re.findall(r'[MLHVCSQZ]|-?\d*\.?\d+', d)
    subs, cur, pos, start, last_c, i, cmd = [], [], None, None, None, 0, None

    def take(n):
        nonlocal i
        v = [float(t) for t in toks[i:i + n]]
        i += n
        return v

    def bez(pts):
        n = max(2, int(sum((Vector(pts[k + 1]) - Vector(pts[k])).length for k in range(len(pts) - 1)) / step) + 1)
        out = []
        for k in range(1, n + 1):
            t = k / n
            if len(pts) == 4:
                p = [(1 - t) ** 3 * pts[0][j] + 3 * (1 - t) ** 2 * t * pts[1][j] + 3 * (1 - t) * t * t * pts[2][j] + t ** 3 * pts[3][j] for j in (0, 1)]
            elif len(pts) == 3:
                p = [(1 - t) ** 2 * pts[0][j] + 2 * (1 - t) * t * pts[1][j] + t * t * pts[2][j] for j in (0, 1)]
            else:
                p = [pts[0][j] + (pts[1][j] - pts[0][j]) * t for j in (0, 1)]
            out.append(tuple(p))
        return out

    while i < len(toks):
        if re.match('[A-Z]', toks[i]):
            cmd = toks[i]; i += 1
        if cmd == 'M':
            if cur:
                subs.append(cur)
            pos = tuple(take(2)); start = pos; cur = [pos]; last_c = None; cmd = 'L'
        elif cmd == 'L':
            p = tuple(take(2)); cur += bez([pos, p]); pos = p; last_c = None
        elif cmd == 'H':
            p = (take(1)[0], pos[1]); cur += bez([pos, p]); pos = p; last_c = None
        elif cmd == 'V':
            p = (pos[0], take(1)[0]); cur += bez([pos, p]); pos = p; last_c = None
        elif cmd == 'C':
            v = take(6); c1, c2, p = (v[0], v[1]), (v[2], v[3]), (v[4], v[5])
            cur += bez([pos, c1, c2, p]); last_c = c2; pos = p
        elif cmd == 'S':
            v = take(4)
            c1 = (2 * pos[0] - last_c[0], 2 * pos[1] - last_c[1]) if last_c else pos
            c2, p = (v[0], v[1]), (v[2], v[3])
            cur += bez([pos, c1, c2, p]); last_c = c2; pos = p
        elif cmd == 'Q':
            v = take(4); c, p = (v[0], v[1]), (v[2], v[3])
            cur += bez([pos, c, p]); pos = p; last_c = None
        elif cmd == 'Z':
            if pos != start:
                cur += bez([pos, start])
            pos = start
            subs.append(cur); cur = []
    if cur:
        subs.append(cur)
    return [np.array(s, np.float64) for s in subs]


def poly_of(d):
    return sample_path(d, .5)[0]


def signed_distance(P, poly):
    """Distance from points P (N × 2) to a closed polygon; positive inside."""
    A = poly
    B = np.roll(poly, -1, axis=0)
    best = np.full(len(P), np.inf)
    inside = np.zeros(len(P), bool)
    for a, b in zip(A, B):
        ab = b - a
        t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
        q = a + t[:, None] * ab
        best = np.minimum(best, np.hypot(*(P - q).T))
        cond = ((a[1] > P[:, 1]) != (b[1] > P[:, 1]))
        xint = a[0] + (P[:, 1] - a[1]) * (b[0] - a[0]) / ((b[1] - a[1]) or 1e-12)
        inside ^= cond & (P[:, 0] < xint)
    return np.where(inside, best, -best)


def polyline_frame(pts):
    """Tangent and cumulative length along a sampled polyline."""
    seg = np.diff(pts, axis=0)
    L = np.concatenate([[0], np.cumsum(np.hypot(*seg.T))])
    tan = np.gradient(pts, axis=0)
    tan /= np.maximum(np.hypot(*tan.T), 1e-9)[:, None]
    return L, tan


def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def world(p):
    """svg (x, y) + height → Blender (x right, y north, z up)."""
    return Vector((p[0], -p[1], p[2] if len(p) > 2 else 0.0))


# ── Colour + material helpers (as in render_relief_cover.py) ────────────────
def lin(hx):
    rgb = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)


def rgba(hx):
    return lin(hx) + (1,)


def image(path, non_color=False):
    """Colour and data reads of one file are separate datablocks: switching a shared image
    to Non-Color would bleach every colour use of it."""
    if not non_color:
        return bpy.data.images.load(path, check_existing=True)
    key = os.path.basename(path) + ' (data)'
    img = bpy.data.images.get(key)
    if img is None:
        img = bpy.data.images.load(path, check_existing=False)
        img.name = key
        img.colorspace_settings.name = 'Non-Color'
    return img


def new_material(name, color, rough=.85, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = rgba(color)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    return m


def nodes(m):
    nt = m.node_tree
    return nt.nodes, nt.links, nt.nodes.get('Principled BSDF')


def coords(ns, lk, scale=1.0, rot=0.0, offset=(0, 0, 0)):
    """Object (= world, objects sit at the origin) coordinates, scaled and turned."""
    tc = ns.new('ShaderNodeTexCoord')
    mp = ns.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    mp.inputs['Rotation'].default_value = (0, 0, rot)
    mp.inputs['Location'].default_value = offset
    lk.new(tc.outputs['Object'], mp.inputs['Vector'])
    return mp.outputs[0]


def tex(ns, lk, path, vector, non_color=False):
    tx = ns.new('ShaderNodeTexImage'); tx.image = image(path, non_color); tx.interpolation = 'Cubic'
    lk.new(vector, tx.inputs['Vector'])
    return tx


def mix_rgb(ns, lk, fac, a, b, blend='MIX'):
    mx = ns.new('ShaderNodeMixRGB'); mx.blend_type = blend
    if isinstance(fac, (int, float)):
        mx.inputs[0].default_value = fac
    else:
        lk.new(fac, mx.inputs[0])
    for i, v in ((1, a), (2, b)):
        if isinstance(v, tuple):
            mx.inputs[i].default_value = v
        else:
            lk.new(v, mx.inputs[i])
    return mx.outputs[0]


def hsv(ns, lk, color, h=.5, s=1.0, v=1.0):
    n = ns.new('ShaderNodeHueSaturation')
    n.inputs['Hue'].default_value = h; n.inputs['Saturation'].default_value = s; n.inputs['Value'].default_value = v
    lk.new(color, n.inputs['Color'])
    return n.outputs[0]


def ramp(ns, lk, fac, lo, hi):
    mr = ns.new('ShaderNodeMapRange'); mr.clamp = True
    mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi
    lk.new(fac, mr.inputs['Value'])
    return mr.outputs[0]


def math_node(ns, lk, op, a, b=None, clamp=False):
    n = ns.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    for k, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[k].default_value = v
        else:
            lk.new(v, n.inputs[k])
    return n.outputs[0]


def attr(ns, name, out='Fac'):
    a = ns.new('ShaderNodeAttribute'); a.attribute_name = name
    return a.outputs[out]


def noise_tex(ns, lk, vector, scale, detail=4, rough=.55):
    n = ns.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
    lk.new(vector, n.inputs['Vector'])
    return n


def bump_from(ns, lk, bs, height, strength=.4, dist=.05):
    b = ns.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = dist
    lk.new(height, b.inputs['Height']); lk.new(b.outputs[0], bs.inputs['Normal'])


# Season switch: every seasonal material reads one Value node (0 = winter, 1 = summer).
SEASON_NODES = []


def season(ns):
    v = ns.new('ShaderNodeValue'); v.outputs[0].default_value = 0.0
    SEASON_NODES.append(v)
    return v.outputs[0]


def set_season(s):
    for v in SEASON_NODES:
        v.outputs[0].default_value = 1.0 if s == 'summer' else 0.0


def cut_out(m, ns, lk, bs, alpha):
    """Feathered edge: mix to Transparent by a 0–1 socket."""
    out = ns.get('Material Output')
    clear = ns.new('ShaderNodeBsdfTransparent')
    mx = ns.new('ShaderNodeMixShader')
    lk.new(alpha, mx.inputs[0]); lk.new(clear.outputs[0], mx.inputs[1]); lk.new(bs.outputs[0], mx.inputs[2])
    lk.new(mx.outputs[0], out.inputs['Surface'])


def soil_base(ns, lk, tone=1.0):
    """Pale limestone soil (dry soil × pebbles × macro patches) — the land of the map."""
    v1 = coords(ns, lk, 1 / 16)
    v2 = coords(ns, lk, 1 / 23, 1.1, (.37, .21, 0))
    soil = mix_rgb(ns, lk, .5, tex(ns, lk, os.path.join(TEX, 'dry_diff.jpg'), v1).outputs['Color'],
                   tex(ns, lk, os.path.join(TEX, 'dry_diff.jpg'), v2).outputs['Color'])
    soil = hsv(ns, lk, soil, h=.5, s=.62, v=1.4 * tone)
    rock = hsv(ns, lk, tex(ns, lk, os.path.join(TEX, 'rock_diff.jpg'), coords(ns, lk, 1 / 19, .6)).outputs['Color'], s=.4, v=1.25 * tone)
    macro = noise_tex(ns, lk, coords(ns, lk, 1.0), .035, 5, .6)
    rk = ramp(ns, lk, macro.outputs['Fac'], .55, .72)
    return mix_rgb(ns, lk, rk, soil, rock), macro


def veg_mix(ns, lk, base, amount, winter, summer):
    """Low grass over the soil: green in winter, straw in summer (texture-driven)."""
    g1 = tex(ns, lk, os.path.join(TEX, 'grass_diff.jpg'), coords(ns, lk, 1 / 14, .4)).outputs['Color']
    sea = season(ns)
    tint = mix_rgb(ns, lk, sea, rgba(winter), rgba(summer))
    grass = mix_rgb(ns, lk, .85, g1, tint, 'COLOR')
    grass = mix_rgb(ns, lk, .55, grass, tint, 'MULTIPLY')
    grass = hsv(ns, lk, grass, v=2.0)
    return mix_rgb(ns, lk, amount, base, grass)


# ── Land materials ──────────────────────────────────────────────────────────
def ground_material():
    m = new_material('Land', '#C9BB9A', .95)
    ns, lk, bs = nodes(m)
    base, macro = soil_base(ns, lk)
    patch = noise_tex(ns, lk, coords(ns, lk, 1.0, 0, (13, 7, 0)), .06, 6, .65)
    amt = ramp(ns, lk, patch.outputs['Fac'], .36, .6)
    sea = season(ns)
    amt = math_node(ns, lk, 'MULTIPLY', amt, mix_rgb(ns, lk, sea, (.92, .92, .92, 1), (.7, .7, .7, 1)))
    col = veg_mix(ns, lk, base, amt, '#7C8C42', '#C8A86A')
    lk.new(col, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, tex(ns, lk, os.path.join(TEX, 'dry_diff.jpg'), coords(ns, lk, 1 / 16), True).outputs['Color'], .25, .08)
    return m


def floor_material(name, winter, summer, cover, litter=0.0, rocky=0.0, patchy=(.3, .62)):
    """Region floors: soil + seasonal low vegetation (+ forest litter, + rock outcrops)."""
    m = new_material(name, '#B8AA88', .95)
    ns, lk, bs = nodes(m)
    base, macro = soil_base(ns, lk, .95)
    if rocky:
        hard = tex(ns, lk, os.path.join(TRF, 'hard', 'diffuse.webp'), coords(ns, lk, 1 / 22, .3)).outputs['Color']
        hard = hsv(ns, lk, hard, s=.6, v=1.25)
        base = mix_rgb(ns, lk, rocky, base, hard)
    if litter:
        lit = tex(ns, lk, os.path.join(TEX, 'forest_diff.jpg'), coords(ns, lk, 1 / 12, .9)).outputs['Color']
        sea = season(ns)
        lit = hsv(ns, lk, lit, s=.85, v=1.15)
        lit = mix_rgb(ns, lk, mix_rgb(ns, lk, sea, (.0, .0, .0, 1), (.55, .55, .55, 1)), lit, hsv(ns, lk, lit, h=.53, s=.55, v=1.25))
        base = mix_rgb(ns, lk, litter, base, lit)
    patch = noise_tex(ns, lk, coords(ns, lk, 1.0, 0, (5, 3, 0)), .12, 6, .6)
    amt = math_node(ns, lk, 'MULTIPLY', ramp(ns, lk, patch.outputs['Fac'], *patchy), cover)
    col = veg_mix(ns, lk, base, amt, winter, summer)
    lk.new(col, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, tex(ns, lk, os.path.join(TEX, 'forest_diff.jpg'), coords(ns, lk, 1 / 12), True).outputs['Color'], .3, .08)
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def terrace_material():
    m = floor_material('Terrace soil', '#7A8A3E', '#C4A362', .95, patchy=(.05, .4))
    ns, lk, bs = nodes(m)
    # every other terrace a touch darker (the papercut's two tones), from the band index
    band = attr(ns, 'band')
    odd = math_node(ns, lk, 'MODULO', band, 2.0)
    shade = mix_rgb(ns, lk, odd, (1, 1, 1, 1), (.8, .78, .74, 1))
    src = bs.inputs['Base Color'].links[0].from_socket
    lk.new(mix_rgb(ns, lk, 1.0, src, shade, 'MULTIPLY'), bs.inputs['Base Color'])
    return m


def field_material():
    """Three plots, rows in three directions; winter = young crops, summer = stubble / ploughed."""
    m = new_material('Field crops', '#9AA860', .9)
    ns, lk, bs = nodes(m)
    sea = season(ns)
    plot = attr(ns, 'plot')         # 0, 1, 2
    rowc = attr(ns, 'row')          # coordinate across the rows (units)
    # row profile: crop band with soil between
    sn = math_node(ns, lk, 'SINE', math_node(ns, lk, 'MULTIPLY', rowc, 2 * math.pi / 3.6))
    rowm = ramp(ns, lk, sn, -.35, .55)
    jit = noise_tex(ns, lk, coords(ns, lk, 1.0), .9, 5, .7)
    rowm = math_node(ns, lk, 'MULTIPLY', rowm, ramp(ns, lk, jit.outputs['Fac'], .25, .55))
    grass = tex(ns, lk, os.path.join(TEX, 'grass_diff.jpg'), coords(ns, lk, 1 / 9, .2)).outputs['Color']
    soilt = tex(ns, lk, os.path.join(TRF, 'mud', 'diffuse.webp'), coords(ns, lk, 1 / 18)).outputs['Color']
    soil_w = hsv(ns, lk, soilt, h=.51, s=.45, v=1.25)
    soil_s = hsv(ns, lk, soilt, h=.505, s=.6, v=1.6)
    soil = mix_rgb(ns, lk, sea, soil_w, soil_s)

    def per_plot(a, b, c):
        p1 = ramp(ns, lk, plot, .5, .6)
        p2 = ramp(ns, lk, plot, 1.5, 1.6)
        return mix_rgb(ns, lk, p2, mix_rgb(ns, lk, p1, rgba(a), rgba(b)), rgba(c))

    crop_w = per_plot('#6E8A3A', '#88A04A', '#9DAE5E')
    crop_s = per_plot('#D2B46E', '#B89A6B', '#C9A462')
    crop_t = mix_rgb(ns, lk, sea, crop_w, crop_s)
    crop = mix_rgb(ns, lk, .8, grass, crop_t, 'COLOR')
    crop = hsv(ns, lk, mix_rgb(ns, lk, .5, crop, crop_t, 'MULTIPLY'), v=2.2)
    # summer: the middle plot is ploughed (rows = furrows of bare soil)
    plough = math_node(ns, lk, 'MULTIPLY', sea, math_node(ns, lk, 'MULTIPLY', ramp(ns, lk, plot, .5, .6), ramp(ns, lk, plot, 1.6, 1.5)))
    rowm2 = mix_rgb(ns, lk, plough, (0, 0, 0, 1), (1, 1, 1, 1))
    rowm = math_node(ns, lk, 'MULTIPLY', rowm, math_node(ns, lk, 'SUBTRACT', 1.0, math_node(ns, lk, 'MULTIPLY', plough, .75)))
    col = mix_rgb(ns, lk, rowm, mix_rgb(ns, lk, math_node(ns, lk, 'MULTIPLY', sea, .55), soil, crop), crop)
    col = mix_rgb(ns, lk, math_node(ns, lk, 'MULTIPLY', rowm2, math_node(ns, lk, 'SUBTRACT', 1.0, rowm)), col, hsv(ns, lk, soil, v=.8))
    var = noise_tex(ns, lk, coords(ns, lk, 1.0, 0, (3, 9, 0)), .08, 4, .5)
    col = mix_rgb(ns, lk, .22, col, var.outputs['Color'], 'OVERLAY')
    lk.new(col, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, rowm, .35, .15)
    return m


def track_material():
    m = new_material('Dirt track', '#CDB48A', .95)
    ns, lk, bs = nodes(m)
    uvn = ns.new('ShaderNodeUVMap'); uvn.uv_map = 'UVMap'
    sand = tex(ns, lk, os.path.join(TRF, 'sand', 'diffuse.webp'), uvn.outputs[0]).outputs['Color']
    col = hsv(ns, lk, sand, h=.505, s=1.2, v=1.0)
    col = mix_rgb(ns, lk, .6, col, rgba('#C29E68'), 'MULTIPLY')
    col = hsv(ns, lk, col, v=1.62)
    # two wheel ruts, darker and packed, and a grassy hump between them
    ac = math_node(ns, lk, 'ABSOLUTE', attr(ns, 'across'))
    rut = ramp(ns, lk, math_node(ns, lk, 'ABSOLUTE', math_node(ns, lk, 'SUBTRACT', ac, 1.1)), .55, .1)
    col = mix_rgb(ns, lk, math_node(ns, lk, 'MULTIPLY', rut, .6), col, hsv(ns, lk, col, s=1.2, v=.62))
    hump = ramp(ns, lk, ac, .5, .15)
    col = mix_rgb(ns, lk, math_node(ns, lk, 'MULTIPLY', hump, .35), col, rgba('#8F8F5C'))
    lk.new(col, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, tex(ns, lk, os.path.join(TRF, 'sand', 'diffuse.webp'), uvn.outputs[0], True).outputs['Color'], .5, .1)
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def asphalt_material():
    m = new_material('Asphalt', '#4B4C49', .88)
    ns, lk, bs = nodes(m)
    v = coords(ns, lk, 1.0)
    sp = noise_tex(ns, lk, v, 9, 2)
    wear = noise_tex(ns, lk, v, .15, 4)
    base = mix_rgb(ns, lk, ramp(ns, lk, wear.outputs['Fac'], .35, .7), rgba('#4A4B48'), rgba('#63635E'))
    # tyre-polished wheel paths, lighter
    wp = attr(ns, 'across')
    tracks = math_node(ns, lk, 'MULTIPLY', ramp(ns, lk, math_node(ns, lk, 'ABSOLUTE', math_node(ns, lk, 'SUBTRACT', math_node(ns, lk, 'ABSOLUTE', wp), 1.75)), .7, .2), .25)
    base = mix_rgb(ns, lk, tracks, base, rgba('#77756E'))
    c = mix_rgb(ns, lk, .3, base, sp.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, sp.outputs['Fac'], .25, .02)
    return m


def tinted_material(name, color, rough=.8):
    m = new_material(name, color, rough)
    ns, lk, bs = nodes(m)
    lk.new(mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'), bs.inputs['Base Color'])
    return m


def seasonal_tint_material(name, winter, summer, rough=.85):
    m = new_material(name, winter, rough)
    ns, lk, bs = nodes(m)
    c = mix_rgb(ns, lk, season(ns), rgba(winter), rgba(summer))
    lk.new(mix_rgb(ns, lk, 1.0, c, attr(ns, 'tint', 'Color'), 'MULTIPLY'), bs.inputs['Base Color'])
    return m


def stone_material(name='Field stones', color='#C7BEA9'):
    m = new_material(name, color, .9)
    ns, lk, bs = nodes(m)
    rock = tex(ns, lk, os.path.join(TEX, 'rock_diff.jpg'), coords(ns, lk, 1 / 4)).outputs['Color']
    c = mix_rgb(ns, lk, .55, hsv(ns, lk, rock, s=.2, v=1.6), mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'), 'MULTIPLY')
    lk.new(hsv(ns, lk, c, v=1.6), bs.inputs['Base Color'])
    bump_from(ns, lk, bs, tex(ns, lk, os.path.join(TEX, 'rock_diff.jpg'), coords(ns, lk, 1 / 4), True).outputs['Color'], .6, .05)
    return m


def roof_material(name, color):
    """Flat concrete roof: bitumen / whitewash stains, a little grit."""
    m = new_material(name, color, .9)
    ns, lk, bs = nodes(m)
    v = coords(ns, lk, 1.0)
    st = noise_tex(ns, lk, v, .45, 6, .6)
    stain = ramp(ns, lk, st.outputs['Fac'], .5, .75)
    c = mix_rgb(ns, lk, stain, mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'), rgba('#A79F90'))
    grit = noise_tex(ns, lk, v, 14, 3)
    c = mix_rgb(ns, lk, .15, c, grit.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, grit.outputs['Fac'], .2, .02)
    return m


def paver_material():
    m = new_material('Square pavers', '#D9CFBC', .85)
    ns, lk, bs = nodes(m)
    br = ns.new('ShaderNodeTexBrick'); br.offset = .5
    br.inputs['Scale'].default_value = 1.6; br.inputs['Mortar Size'].default_value = .03
    br.inputs['Brick Width'].default_value = .6; br.inputs['Row Height'].default_value = .3
    br.inputs['Color1'].default_value = rgba('#DCD2BF'); br.inputs['Color2'].default_value = rgba('#CFC3AC')
    br.inputs['Mortar'].default_value = rgba('#A99E89')
    lk.new(coords(ns, lk, 1.0), br.inputs['Vector'])
    lk.new(br.outputs['Color'], bs.inputs['Base Color'])
    bump_from(ns, lk, bs, br.outputs['Fac'], .3, .02)
    return m


def water_material():
    m = new_material('Reservoir water', '#3F6E76', .08)
    ns, lk, bs = nodes(m)
    v = coords(ns, lk, 1.0)
    depth = attr(ns, 'depth')
    col = mix_rgb(ns, lk, ramp(ns, lk, depth, 0, 1), rgba('#4C7F86'), rgba('#28525B'))
    lk.new(col, bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .12
    rip = noise_tex(ns, lk, coords(ns, lk, 1.0, .4), 1.4, 3, .5)
    bump_from(ns, lk, bs, rip.outputs['Fac'], .12, .02)
    return m


def chain_link_material():
    m = new_material('Chain link', '#8A8F8C', .5, .7)
    ns, lk, bs = nodes(m)
    uvn = ns.new('ShaderNodeUVMap')
    w1 = ns.new('ShaderNodeTexWave'); w1.wave_type = 'BANDS'; w1.bands_direction = 'DIAGONAL'; w1.inputs['Scale'].default_value = 1.0
    sx = ns.new('ShaderNodeVectorMath'); sx.operation = 'SCALE'; sx.inputs[3].default_value = 12
    lk.new(uvn.outputs[0], sx.inputs[0])
    lk.new(sx.outputs[0], w1.inputs['Vector'])
    flip = ns.new('ShaderNodeMapping'); flip.inputs['Scale'].default_value = (-12, 12, 1)
    lk.new(uvn.outputs[0], flip.inputs['Vector'])
    w2 = ns.new('ShaderNodeTexWave'); w2.wave_type = 'BANDS'; w2.bands_direction = 'DIAGONAL'; w2.inputs['Scale'].default_value = 1.0
    lk.new(flip.outputs[0], w2.inputs['Vector'])
    a = math_node(ns, lk, 'MAXIMUM', ramp(ns, lk, w1.outputs['Fac'], .82, .95), ramp(ns, lk, w2.outputs['Fac'], .82, .95))
    cut_out(m, ns, lk, bs, a)
    return m


def leaf_material(name, img, translucent, summer=None):
    """Leaf-cluster cards × per-vertex tint; summer = (saturation, value) the foliage fades to."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    ns, lk, bs = nodes(m)
    out = ns.get('Material Output')
    tx = ns.new('ShaderNodeTexImage'); tx.image = img; tx.interpolation = 'Cubic'
    col = mix_rgb(ns, lk, 1.0, tx.outputs['Color'], attr(ns, 'tint', 'Color'), 'MULTIPLY')
    if summer:
        col = mix_rgb(ns, lk, season(ns), col, hsv(ns, lk, col, s=summer[0], v=summer[1]))
    lk.new(col, bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .6
    tr = ns.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = rgba(translucent)
    leafy = ns.new('ShaderNodeMixShader'); leafy.inputs[0].default_value = .15
    lk.new(bs.outputs[0], leafy.inputs[1]); lk.new(tr.outputs[0], leafy.inputs[2])
    clear = ns.new('ShaderNodeBsdfTransparent')
    cut = ns.new('ShaderNodeMixShader')
    lk.new(tx.outputs['Alpha'], cut.inputs[0]); lk.new(clear.outputs[0], cut.inputs[1]); lk.new(leafy.outputs[0], cut.inputs[2])
    lk.new(cut.outputs[0], out.inputs['Surface'])
    return m


# ── Procedural leaf atlases (2 × 2 cells of leaf clusters, straight alpha) ──
def blur1(a, r, axis):
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def box_blur(a, r):
    return blur1(blur1(a, r, 0), r, 1)


def hex01(hx):
    return np.array([int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)


ATLAS = {
    # leaves per cell, leaf length px, width/length, palette, (silver underside share, colour), needles?
    'oak':    dict(n=60, a=(48, 78), b=(.42, .58), greens=('#2F3B1D', '#3A4724', '#45532A', '#4F5E31', '#5B6A37'), under=(.12, '#6F7B4A')),
    'scrub':  dict(n=70, a=(38, 60), b=(.42, .6), greens=('#46512D', '#525D36', '#5E683F', '#6A7347'), under=(.18, '#868C66')),
    'citrus': dict(n=70, a=(52, 74), b=(.4, .5), greens=('#24381A', '#2C4420', '#355026', '#3E5B2C'), under=(.1, '#5E7A3E')),
    'pine':   dict(n=34, a=(150, 210), b=(.035, .05), greens=('#34452A', '#3D4F31', '#475A39', '#516443'), under=(.0, '#6E7C5A'), tufts=True),
}


def leaf_atlas(kind, size=1024):
    p = ATLAS[kind]
    rng = np.random.default_rng({'oak': 3, 'scrub': 7, 'citrus': 9, 'pine': 11}[kind])
    C = np.zeros((size, size, 3), np.float32)
    A = np.zeros((size, size), np.float32)
    cell = size // 2
    greens = [hex01(c) for c in p['greens']]
    for ci in range(4):
        ox, oy = (ci % 2) * cell, (ci // 2) * cell
        centres = [(ox + cell / 2 + rng.normal(0, cell * .12), oy + cell / 2 + rng.normal(0, cell * .12)) for _ in range(5)] if p.get('tufts') else None
        for _ in range(p['n'] * (5 if centres else 1)):
            if centres:
                # pine: needles radiate from a few tuft centres
                tcx, tcy = centres[rng.integers(len(centres))]
                ang = rng.uniform(0, 2 * np.pi)
                a = rng.uniform(*p['a']) * .5
                cx, cy = tcx + math.cos(ang) * a, tcy + math.sin(ang) * a
                rot = ang
                rad = math.hypot(cx - ox - cell / 2, cy - oy - cell / 2)
            else:
                ang = rng.uniform(0, 2 * np.pi)
                rad = cell * 0.43 * rng.uniform(0, 1) ** 0.55
                cx = ox + cell / 2 + rad * math.cos(ang)
                cy = oy + cell / 2 + rad * math.sin(ang)
                a = rng.uniform(*p['a'])
                rot = ang + rng.normal(0, 0.9)
            b = a * rng.uniform(*p['b'])
            if rng.uniform() < p['under'][0]:
                base = hex01(p['under'][1]) * rng.uniform(.9, 1.08)
            else:
                base = greens[rng.integers(len(greens))] * rng.uniform(.85, 1.15)
            shade = (0.7 + 0.3 * min(1, rad / (cell * 0.43))) * (1.1 - 0.25 * (cy - oy) / cell)
            x0, x1 = int(max(ox, cx - a - 2)), int(min(ox + cell, cx + a + 3))
            y0, y1 = int(max(oy, cy - a - 2)), int(min(oy + cell, cy + a + 3))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
            lx = (xx - cx) * math.cos(rot) + (yy - cy) * math.sin(rot)
            ly = -(xx - cx) * math.sin(rot) + (yy - cy) * math.cos(rot)
            taper = np.clip(1.0 - 0.5 * (lx / a) ** 2, 0.15, 1.0)
            d = np.sqrt((lx / a) ** 2 + (ly / (b * taper)) ** 2)
            al = np.clip((1.0 - d) * max(b, 3.0) * 0.9, 0, 1)
            vein = 1 - 0.18 * np.exp(-(ly / (0.12 * b + .5)) ** 2) * (np.abs(lx) < a * .85)
            tone = shade * (0.88 + 0.16 * (1 - np.clip(np.abs(ly) / b, 0, 1))) * vein
            rgb = base[None, None, :] * tone[..., None]
            C[y0:y1, x0:x1] = rgb * al[..., None] + C[y0:y1, x0:x1] * (1 - al[..., None])
            A[y0:y1, x0:x1] = al + A[y0:y1, x0:x1] * (1 - al)
    blurC = box_blur(C, 10)
    blurA = box_blur(A, 10)
    straight = np.where(A[..., None] > 0.02, C / np.maximum(A[..., None], 1e-4), blurC / np.maximum(blurA[..., None], 1e-4))
    rgba_ = np.concatenate([np.clip(straight, 0, 1), A[..., None]], axis=2)
    img = bpy.data.images.new(f'leaves_{kind}', size, size, alpha=True)
    img.alpha_mode = 'STRAIGHT'
    img.pixels.foreach_set(np.flipud(rgba_).astype(np.float32).ravel())
    img.filepath_raw = os.path.join(OUT, 'tex', f'leaves_{kind}.png'); img.file_format = 'PNG'
    img.save()
    img.update()
    return img


# ── Mesh builder (all coordinates in svg space: x, y (down), height) ─────────
class Builder:
    def __init__(self):
        self.v, self.f, self.uv, self.tint, self.mi = [], [], [], [], []

    def vert(self, p):
        self.v.append(world(p))
        return len(self.v) - 1

    def face(self, idx, uvs=None, tint=(1, 1, 1), mi=0):
        # svg y points down: reverse the winding so normals face up/out in Blender space
        self.f.append(tuple(reversed(idx)))
        self.uv.append(list(reversed(uvs)) if uvs else [(0, 0)] * len(idx))
        self.tint.append(tuple(tint) + (1,))
        self.mi.append(mi)

    def quad(self, pts, mi=0, tint=(1, 1, 1), uvs=None):
        self.face([self.vert(p) for p in pts], uvs, tint, mi)

    def build(self, name, mats, coll, smooth=False):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in self.v], [], self.f)
        me.update()
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', [c for f in self.uv for uv in f for c in uv])
        col = me.color_attributes.new('tint', 'FLOAT_COLOR', 'CORNER')
        col.data.foreach_set('color', [c for f, t in zip(self.f, self.tint) for _ in f for c in t])
        me.polygons.foreach_set('material_index', self.mi)
        me.polygons.foreach_set('use_smooth', [smooth] * len(self.f))
        for m in mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        coll.objects.link(ob)
        return ob

    def box(self, x0, x1, y0, y1, h0, h1, mi=0, tint=(1, 1, 1), skip=()):
        q = {
            'n': [(x0, y0, h0), (x1, y0, h0), (x1, y0, h1), (x0, y0, h1)],
            's': [(x1, y1, h0), (x0, y1, h0), (x0, y1, h1), (x1, y1, h1)],
            'w': [(x0, y1, h0), (x0, y0, h0), (x0, y0, h1), (x0, y1, h1)],
            'e': [(x1, y0, h0), (x1, y1, h0), (x1, y1, h1), (x1, y0, h1)],
            'top': [(x0, y1, h1), (x1, y1, h1), (x1, y0, h1), (x0, y0, h1)],
        }
        for k, pts in q.items():
            if k not in skip:
                self.quad(pts[::-1] if k == 'top' else pts, mi, tint)

    def prism(self, p0, p1, r0, r1, sides=6, mi=0, tint=(1, 1, 1), caps=False):
        p0, p1 = Vector(p0), Vector(p1)
        axis = (p1 - p0)
        if axis.length < 1e-6:
            return
        axis.normalize()
        a = axis.orthogonal().normalized(); b = axis.cross(a)
        ring = lambda c, r: [self.vert(c + (a * math.cos(2 * math.pi * k / sides) + b * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)]
        r0i, r1i = ring(p0, r0), ring(p1, r1)
        for k in range(sides):
            k1 = (k + 1) % sides
            self.face([r0i[k], r0i[k1], r1i[k1], r1i[k]], [(k / sides, 0), ((k + 1) / sides, 0), ((k + 1) / sides, 1), (k / sides, 1)], tint, mi)
        if caps:
            self.face(list(reversed(r0i)), None, tint, mi)
            self.face(r1i, None, tint, mi)

    def blob(self, c, rx, ry, rh, mi=0, tint=(1, 1, 1), rough=.25, seed=0.0):
        for f in ICO_F:
            idx = []
            for vi in f:
                v = ICO_V[vi]
                k = 1 + rough * noise.noise(Vector((v[0] * 1.7 + seed, v[1] * 1.7, v[2] * 1.7)))
                idx.append(self.vert((c[0] + v[0] * rx * k, c[1] + v[1] * ry * k, c[2] + v[2] * rh * k)))
            self.face(idx, None, tint, mi)

    def card(self, c, nrm, size, quad, tint, mi, spin):
        u = nrm.orthogonal().normalized()
        u = Matrix.Rotation(spin, 3, nrm) @ u
        v = nrm.cross(u)
        hs = size / 2
        u0, v0 = quad
        pts = [c - u * hs - v * hs, c + u * hs - v * hs, c + u * hs + v * hs, c - u * hs + v * hs]
        self.face([self.vert(p) for p in pts], [(u0, v0), (u0 + .5, v0), (u0 + .5, v0 + .5), (u0, v0 + .5)], tint, mi)


def _ico(sub=2):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    v = [tuple(x.co) for x in bm.verts]
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    return v, f


ICO_V, ICO_F = _ico(2)


def ellipsoid_area(a, b, c):
    p = 1.6075
    return 4 * math.pi * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p)


def crown(bl, rng, lobes, card, dens, tint, leaf_mi, core_mi, light_bias=.3):
    """Leaf-cluster cards on the shell of each lobe (x, y, h, rx, ry, rh) + a dark core."""
    for (cx, cy, ch, rx, ry, rh) in lobes:
        n = int(dens * ellipsoid_area(rx, ry, rh) / (card * card))
        for _ in range(n):
            z = rng.uniform(-.25, 1); t = rng.uniform(0, 2 * math.pi); s = math.sqrt(1 - z * z)
            dvec = Vector((s * math.cos(t), s * math.sin(t), z))
            f = .6 + .4 * rng.random() ** .6
            p = Vector((cx + dvec.x * rx * f, cy + dvec.y * ry * f, ch + dvec.z * rh * f))
            nrm = (dvec + Vector((rng.gauss(0, .7), rng.gauss(0, .7), rng.gauss(0, .7)))).normalized()
            light = (1 - light_bias) + light_bias * (dvec.z * .5 + .5)
            k = light * (.72 + .28 * f) * rng.uniform(.86, 1.12)
            bl.card(p, nrm, card * rng.uniform(.75, 1.3), (rng.choice((0, .5)), rng.choice((0, .5))),
                    (tint[0] * k, tint[1] * k, tint[2] * k), leaf_mi, rng.uniform(0, 2 * math.pi))
        bl.blob((cx, cy, ch), rx * .74, ry * .74, rh * .72, core_mi, (1, 1, 1), .3, rng.uniform(0, 50))


def area_floor(name, poly, mats, coll, feather=0.0, ragged=0.0, res=1.0, z=0.04, zfn=None, attrs=None, seed=0.0, pad=0.0):
    """Region floor: a grid over the hull with a per-vertex alpha 'a' (1 inside, a
    ragged feather across the hull line for natural regions, a hard edge otherwise)."""
    x0, y0 = poly.min(axis=0) - feather - pad - 1
    x1, y1 = poly.max(axis=0) + feather + pad + 1
    xs = np.arange(x0, x1 + res, res)
    ys = np.arange(y0, y1 + res, res)
    gx, gy = np.meshgrid(xs, ys)
    P = np.stack([gx.ravel(), gy.ravel()], 1)
    sd = signed_distance(P, poly) + pad
    if ragged:
        sd = sd + np.array([noise.noise(Vector((p[0] * .09, p[1] * .09, seed))) for p in P]) * ragged
    if feather:
        a = smoothstep(-feather * .5, feather * .5, sd)
    else:
        a = (sd >= 0).astype(np.float64)
    nx = len(xs)
    keep = a.reshape(len(ys), nx) > 0
    me = bpy.data.meshes.new(name)
    zs = zfn(P) if zfn else np.full(len(P), z)
    verts = [world((p[0], p[1], h)) for p, h in zip(P, zs)]
    faces = []
    for j in range(len(ys) - 1):
        for i in range(nx - 1):
            if keep[j, i] or keep[j, i + 1] or keep[j + 1, i] or keep[j + 1, i + 1]:
                k = j * nx + i
                faces.append((k, k + nx, k + nx + 1, k + 1))
    me.from_pydata(verts, [], faces)
    me.update()
    at = me.attributes.new('a', 'FLOAT', 'POINT'); at.data.foreach_set('value', a.astype(np.float32))
    for k, vals in (attrs or {}).items():
        at = me.attributes.new(k, 'FLOAT', 'POINT'); at.data.foreach_set('value', np.asarray(vals(P), np.float32))
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set('use_smooth', [True] * len(faces))
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    # drop loose vertices so the mesh stays light
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me); bm.free()
    return ob


def ribbon(name, pts, half, mats, coll, z=.06, feather=0.0, uv_len=1.0, attrs_across=False, closed=False):
    """A strip along a polyline (roads, lanes, tracks); UV u = along / uv_len, v = across."""
    L, tan = polyline_frame(pts)
    nrm = np.stack([-tan[:, 1], tan[:, 0]], 1)
    cols = np.linspace(-1, 1, 9)
    bl_v, faces, uvs, a_vals, across = [], [], [], [], []
    for i, (p, n) in enumerate(zip(pts, nrm)):
        for c in cols:
            w = half + (feather if feather else 0)
            q = p + n * c * w
            bl_v.append(world((q[0], q[1], z)))
            uvs.append((c * .5 + .5, L[i] / uv_len))
            d = abs(c) * w
            a_vals.append(float(smoothstep(half + feather * .5, half - feather * .5, d)) if feather else 1.0)
            across.append(c * w)
    nc = len(cols)
    for i in range(len(pts) - 1):
        for k in range(nc - 1):
            a0 = i * nc + k
            faces.append((a0, a0 + 1, a0 + nc + 1, a0 + nc))
    me = bpy.data.meshes.new(name)
    me.from_pydata(bl_v, [], faces)
    me.update()
    uvl = me.uv_layers.new(name='UVMap')
    loop_uv = []
    for f in faces:
        for vi in f:
            loop_uv += uvs[vi]
    uvl.data.foreach_set('uv', loop_uv)
    at = me.attributes.new('a', 'FLOAT', 'POINT'); at.data.foreach_set('value', a_vals)
    at = me.attributes.new('across', 'FLOAT', 'POINT'); at.data.foreach_set('value', across)
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def scatter(n, cx, cy, rx, ry, rmin, rmax, seed, spacing, inside=None):
    """Irregular (non-grid) scatter inside an ellipse with a loose minimum spacing."""
    r = random.Random(seed)
    out = []
    tries = 0
    while len(out) < n and tries < n * 200:
        tries += 1
        a = r.random() * 2 * math.pi
        d = math.sqrt(r.random())
        x = cx + math.cos(a) * d * rx
        y = cy + math.sin(a) * d * ry
        rad = rmin + r.random() * (rmax - rmin)
        if inside is not None and signed_distance(np.array([[x, y]]), inside)[0] < rad * .55:
            continue
        if any(math.hypot(b[0] - x, b[1] - y) < (b[2] + rad) * spacing for b in out):
            continue
        out.append((x, y, rad))
    return out


def clusters(centres, per, spread, rmin, rmax, seed, spacing, inside=None):
    r = random.Random(seed)
    out = []
    for (cx, cy) in centres:
        placed = 0
        tries = 0
        while placed < per and tries < per * 80:
            tries += 1
            gx = (r.random() + r.random() + r.random() - 1.5) * spread
            gy = (r.random() + r.random() + r.random() - 1.5) * spread * .8
            rad = rmin + r.random() * (rmax - rmin)
            x, y = cx + gx, cy + gy
            if inside is not None and signed_distance(np.array([[x, y]]), inside)[0] < rad * .4:
                continue
            if any(math.hypot(b[0] - x, b[1] - y) < (b[2] + rad) * spacing for b in out):
                continue
            out.append((x, y, rad)); placed += 1
    return out


# ── Scene ───────────────────────────────────────────────────────────────────
SUN_DIR = Vector((-.5, .45, .74)).normalized()     # toward the sun: north-west, ~48° up


def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        devices = prefs.get_devices_for_type('OPTIX')
        for dev in devices:
            dev.use = True
        if any(dev.type == 'OPTIX' for dev in devices):
            sc.cycles.device = 'GPU'
    except Exception as exc:
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 96
    sc.cycles.max_bounces = 6
    sc.render.resolution_x = round(W * PX)
    sc.render.resolution_y = round(H * PX)
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'AgX'
    for look in ('AgX - Punchy', 'Punchy'):
        try:
            sc.view_settings.look = look
            break
        except TypeError:
            pass
    world_ = bpy.data.worlds.new('Sky'); sc.world = world_; world_.use_nodes = True
    bg = world_.node_tree.nodes['Background']
    bg.inputs[0].default_value = (.72, .8, .92, 1); bg.inputs[1].default_value = .55
    sun_data = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_data)
    sc.collection.objects.link(sun)
    sun.rotation_euler = SUN_DIR.to_track_quat('Z', 'Y').to_euler()
    sun_data.energy = 3.2; sun_data.angle = math.radians(1.5); sun_data.color = (1, .95, .87)
    cam_data = bpy.data.cameras.new('Map camera'); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = W; cam_data.sensor_fit = 'HORIZONTAL'; cam_data.clip_end = 400
    cam = bpy.data.objects.new('Map camera', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (W / 2, -H / 2, 150)
    cam.rotation_euler = (0, 0, 0)
    return sc


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


# ── Regions ─────────────────────────────────────────────────────────────────
def build_ground(coll, M):
    bl = Builder()
    n = 4
    for j in range(-6, H + 7, n):
        for i in range(-6, W + 7, n):
            bl.quad([(i, j, 0), (i + n, j, 0), (i + n, j + n, 0), (i, j + n, 0)])
    return {'floor': [bl.build('Land', [M['ground']], coll)], 'objects': []}


def build_grove(coll, M):
    poly = poly_of(HULL['grove'])
    floor = area_floor('Grove floor', poly, [M['floor_grove']], coll, feather=7, ragged=3, res=.75, seed=1.3)
    rng = random.Random(21)
    bl = Builder()
    shrubs = scatter(22, 68, 47, 56, 37, 1.8, 3.2, 29, 1.1, poly)
    for (x, y, r) in shrubs:
        lobes = [(x, y, r * .5, r, r * .9, r * .55)]
        for _ in range(2):
            a = rng.uniform(0, 2 * math.pi)
            lobes.append((x + math.cos(a) * r * .5, y + math.sin(a) * r * .5, r * .45, r * .6, r * .6, r * .45))
        crown(bl, rng, lobes, 1.5, 2.4, (rng.uniform(.92, 1.06),) * 3, 1, 2, .35)
    trees = scatter(30, 68, 46, 54, 35, 5, 9.5, 11, .72, poly)
    for (x, y, r) in trees:
        ch = 3.2 + r * .55
        lobes = [(x, y, ch, r, r * rng.uniform(.85, 1.0), r * .55)]
        for _ in range(3):
            a = rng.uniform(0, 2 * math.pi); d = r * rng.uniform(.35, .6)
            rr = r * rng.uniform(.5, .7)
            lobes.append((x + math.cos(a) * d, y + math.sin(a) * d, ch + rng.uniform(-.4, .6) * r * .3, rr, rr * rng.uniform(.85, 1.05), rr * .6))
        stem(bl, rng, [(x, y, 0), (x + rng.uniform(-.6, .6), y + rng.uniform(-.6, .6), ch)], max(.4, r * .07), .3, 0)
        tint = (rng.uniform(.9, 1.06), rng.uniform(.93, 1.08), rng.uniform(.88, 1.0))
        crown(bl, rng, lobes, 2.6, 2.2, tint, 3, 4)
    obj = bl.build('Grove', [M['bark'], M['leaves_scrub'], M['core_scrub'], M['leaves_oak'], M['core_oak']], coll)
    return {'floor': [floor], 'objects': [obj]}


def stem(bl, rng, pts, r0, r1, mi, sides=6):
    n = len(pts) - 1
    for i in range(n):
        bl.prism(pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, sides, mi, (rng.uniform(.85, 1.1),) * 3)


def build_garrigue(coll, M):
    poly = poly_of(HULL['garrigue'])
    floor = area_floor('Garrigue floor', poly, [M['floor_garrigue']], coll, feather=6, ragged=3, res=.75, seed=2.1)
    rng = random.Random(8)
    bl = Builder()
    blobs = clusters([(26, 131), (53, 143), (86, 128), (110, 148), (33, 157), (76, 158), (113, 126), (58, 124)], 7, 8, 2.2, 4, 7, .8, poly)
    for (x, y, r) in blobs:
        h = .5 + r * .25
        lobes = [(x, y, h, r, r * rng.uniform(.8, 1.0), r * .45)]
        for _ in range(2):
            a = rng.uniform(0, 2 * math.pi); d = r * rng.uniform(.3, .55)
            lobes.append((x + math.cos(a) * d, y + math.sin(a) * d, h * .9, r * .6, r * .55, r * .4))
        crown(bl, rng, lobes, 1.7, 2.5, (rng.uniform(.9, 1.08),) * 3, 0, 1, .35)
    # limestone rocks between the clumps
    stones = Builder()
    for (x, y, r) in scatter(40, 70, 141, 58, 25, .5, 1.2, 41, 2.0, poly):
        stones.blob((x, y, 0), r, r * rng.uniform(.6, .9), r * .45, 0, (rng.uniform(.9, 1.05),) * 3, .3, rng.uniform(0, 50))
    return {'floor': [floor], 'objects': [bl.build('Garrigue', [M['leaves_scrub_s'], M['core_scrub_s']], coll),
                                          stones.build('Garrigue rocks', [M['stone']], coll, smooth=True)]}


def build_batha(coll, M):
    poly = poly_of(HULL['batha'])
    floor = area_floor('Batha floor', poly, [M['floor_batha']], coll, feather=6, ragged=2.5, res=.75, seed=3.7)
    rng = random.Random(5)
    bl = Builder()
    # dwarf shrubs (thorny burnet cushions) and grass tufts: low, scattered, no trees
    for (x, y, r) in scatter(42, 331, 225, 56, 16, 1.1, 2.0, 17, 1.25, poly):
        crown(bl, rng, [(x, y, .3, r, r * rng.uniform(.8, 1.0), .42)], .9, 2.6, (rng.uniform(1.25, 1.45),) * 3, 0, 1, .35)
    for (x, y, r) in scatter(140, 331, 225, 58, 17, .6, 1.2, 5, 1.2, poly):
        bl.blob((x, y, .05), r * .7, r * .65, .3, 2, (rng.uniform(.88, 1.1),) * 3, .4, rng.uniform(0, 50))
    stones = Builder()
    for (x, y, r) in scatter(26, 331, 226, 56, 16, .4, .9, 43, 2.0, poly):
        stones.blob((x, y, 0), r, r * .75, r * .4, 0, (rng.uniform(.9, 1.05),) * 3, .3, rng.uniform(0, 50))
    return {'floor': [floor], 'objects': [bl.build('Batha', [M['leaves_scrub_s'], M['core_scrub_s'], M['tuft']], coll),
                                          stones.build('Batha stones', [M['stone']], coll, smooth=True)]}


def build_planted(coll, M):
    poly = poly_of(HULL['planted'])
    floor = area_floor('Planted floor', poly, [M['floor_planted']], coll, res=.5,
                       attrs={'edge': lambda P: signed_distance(P, poly)})
    bl = Builder()
    for (x, y) in PLANTED:
        rng = random.Random(55)          # identical trees: the planted-by-man cue
        r = 6.6
        ch = 8.5
        lobes = [(x, y, ch, r * .95, r * .95, r * .42)]
        for k in range(5):
            a = k * 2 * math.pi / 5 + .3
            lobes.append((x + math.cos(a) * r * .5, y + math.sin(a) * r * .5, ch - .6, r * .5, r * .5, r * .32))
        stem(bl, rng, [(x, y, 0), (x, y, ch)], .45, .3, 0)
        crown(bl, rng, lobes, 2.4, 2.1, (1, 1, 1), 1, 2, .35)
    return {'floor': [floor], 'objects': [bl.build('Planted pines', [M['bark'], M['leaves_pine'], M['core_pine']], coll)]}


def terrace_wall_y(x, y):
    t = x / 140
    return y - 22 * t * (1 - t)


def build_terraces(coll, M):
    poly = poly_of(HULL['terraces'])
    walls = TERRACE_TOPS[1:-1]
    STEP = 1.5

    def band(P):
        b = np.zeros(len(P))
        for yw in walls:
            b += (P[:, 1] > terrace_wall_y(P[:, 0], yw)).astype(np.float64)
        return b

    def z(P):
        h = np.zeros(len(P))
        for yw in walls:
            h += STEP * smoothstep(.25, -.25, P[:, 1] - terrace_wall_y(P[:, 0], yw))
        return h + .05

    floor = area_floor('Terraces', poly, [M['terrace']], coll, feather=5, ragged=2.5, res=.35, zfn=z, attrs={'band': band}, seed=4.4)
    rng = random.Random(61)
    stones = Builder()
    sd_poly = poly
    for yw in walls:
        x = 2.0
        while x < 138:
            y = terrace_wall_y(x, yw)
            r = rng.uniform(.6, 1.05)
            if signed_distance(np.array([[x, y]]), sd_poly)[0] > -1.5:
                top = (len(walls) - walls.index(yw)) * STEP + .05
                stones.blob((x, y - .15, top - .15), r, r * .75, r * .55, 0, (rng.uniform(.88, 1.06),) * 3, .3, rng.uniform(0, 50))
            x += r * 1.3
    return {'floor': [floor, stones.build('Terrace walls', [M['stone']], coll, smooth=True)], 'objects': []}


def build_fields(coll, M):
    poly = poly_of(HULL['fields'])
    # the dirt paths between plots = the hull floor; plots sit on top
    paths = area_floor('Field paths', poly, [M['field_path']], coll, res=1)
    bl_v, faces, plot_v, row_v = [], [], [], []
    for pi, (x, y, w, h, kind) in enumerate(FIELD_PLOTS):
        nx, ny = int(w / .5), int(h / .5)
        base = len(bl_v)
        for j in range(ny + 1):
            for i in range(nx + 1):
                px, py = x + w * i / nx, y + h * j / ny
                bl_v.append(world((px, py, .08)))
                plot_v.append(pi)
                row_v.append(px if kind == 'v' else py if kind == 'h' else (px + py) / math.sqrt(2) * 1.4)
        for j in range(ny):
            for i in range(nx):
                k = base + j * (nx + 1) + i
                faces.append((k, k + nx + 1, k + nx + 2, k + 1))
    me = bpy.data.meshes.new('Field plots')
    me.from_pydata(bl_v, [], faces); me.update()
    for name, vals in (('plot', plot_v), ('row', row_v)):
        at = me.attributes.new(name, 'FLOAT', 'POINT'); at.data.foreach_set('value', vals)
    me.materials.append(M['fields'])
    ob = bpy.data.objects.new('Field plots', me); coll.objects.link(ob)
    return {'floor': [paths, ob], 'objects': []}


def build_village(coll, M):
    poly = poly_of(HULL['village'])
    floor = area_floor('Village yards', poly, [M['yard']], coll, feather=2.5, ragged=1.2, res=.75, seed=5.5)
    flat = []
    for i, d in enumerate(LANES):
        flat.append(ribbon(f'Lane {i}', sample_path(d, .5)[0], 1.8, [M['lane']], coll, z=.09, feather=.6))
    x, y, w, h, r = LANE_RING
    ring = sample_path(f'M{x + r},{y} H{x + w - r} Q{x + w},{y} {x + w},{y + r} V{y + h - r} Q{x + w},{y + h} {x + w - r},{y + h} '
                       f'H{x + r} Q{x},{y + h} {x},{y + h - r} V{y + r} Q{x},{y} {x + r},{y} Z', .5)[0]
    flat.append(ribbon('Lane ring', ring, 1.8, [M['lane']], coll, z=.1, feather=.6))
    sx, sy, sw, sh, _ = SQUARE
    sq = Builder()
    sq.quad([(sx, sy, .12), (sx + sw, sy, .12), (sx + sw, sy + sh, .12), (sx, sy + sh, .12)])
    flat.append(sq.build('Square', [M['pavers']], coll))
    # houses: flat concrete roofs with a parapet, solar water heaters on every third
    bl = Builder()
    rng = random.Random(14)
    roofs = ['#EEE9DE', '#E2DACB', '#D6CDBB', '#CFC6B4']
    for i, (hx, hy, hw, hh) in enumerate(HOUSES):
        top = rng.choice((3.4, 3.6, 6.6, 6.9))
        tint = (rng.uniform(.96, 1.03),) * 3
        rm = i % 4
        bl.box(hx, hx + hw, hy, hy + hh, 0, top, 4, tint)
        t = .35
        for (a0, a1, b0, b1) in ((hx, hx + hw, hy, hy + t), (hx, hx + hw, hy + hh - t, hy + hh), (hx, hx + t, hy, hy + hh), (hx + hw - t, hx + hw, hy, hy + hh)):
            bl.box(a0, a1, b0, b1, top, top + .7, 4, tint)
        # roof slab
        bl.quad([(hx + t, hy + t, top + .02), (hx + hw - t, hy + t, top + .02), (hx + hw - t, hy + hh - t, top + .02), (hx + t, hy + hh - t, top + .02)], rm, tint)
        if i % 3 == 0:
            # collector panel (tilted toward the south) + white tank behind it
            cx, cy = hx + hw - 2.4, hy + 2.1
            p0 = (cx - 1.2, cy + .9, top + .3); p1 = (cx + 1.2, cy + .9, top + .3)
            q1 = (cx + 1.2, cy - .6, top + 1.4); q0 = (cx - 1.2, cy - .6, top + 1.4)
            bl.quad([p0, p1, q1, q0][::-1], 5)
            bl.prism((cx - 1.2, cy - 1.1, top + 1.6), (cx + 1.2, cy - 1.1, top + 1.6), .42, .42, 12, 6, caps=True)
        elif i % 3 == 1:
            # black water tank
            tx_, ty_ = hx + 2.2, hy + hh - 2.2
            bl.prism((tx_, ty_, top), (tx_, ty_, top + 1.0), .6, .6, 12, 7, caps=True)
    houses = bl.build('Houses', [M['roof0'], M['roof1'], M['roof2'], M['roof3'], M['wall'], M['panel'], M['tank'], M['tank_black']], coll)
    trees = Builder()
    for (tx_, ty_, r) in YARD_TREES + [(326, 44, 3.2)]:
        rng2 = random.Random(int(tx_ * 7 + ty_))
        ch = 2.4 + r * .6
        lobes = [(tx_, ty_, ch, r, r * .92, r * .6), (tx_ + r * .35, ty_ - r * .3, ch + .2, r * .6, r * .6, r * .4)]
        stem(trees, rng2, [(tx_, ty_, 0), (tx_, ty_, ch)], .25, .18, 0)
        crown(trees, rng2, lobes, 1.6, 2.4, (rng2.uniform(.95, 1.08),) * 3, 1, 2, .35)
    return {'floor': [floor] + flat, 'objects': [houses, trees.build('Yard trees', [M['bark'], M['leaves_citrus'], M['core_citrus']], coll)]}


def build_orchard(coll, M):
    poly = poly_of(HULL['orchard'])
    floor = area_floor('Orchard floor', poly, [M['floor_orchard']], coll, res=.5,
                       attrs={'rowd': lambda P: np.min(np.abs(P[:, 1:2] - np.array(ORCHARD_ROWS)[None, :]), axis=1)})
    bl = Builder()
    for (x, y) in ORCHARD:
        rng = random.Random(77)          # identical trees, fixed spacing
        r = 5.0
        ch = 2.6
        lobes = [(x, y, ch, r, r * .96, r * .62),
                 (x - .4 * r, y - .2 * r, ch + .3, .58 * r, .55 * r, .42 * r),
                 (x + .35 * r, y + .25 * r, ch + .4, .55 * r, .55 * r, .4 * r)]
        stem(bl, rng, [(x, y, 0), (x, y, ch)], .3, .22, 0)
        crown(bl, rng, lobes, 1.9, 2.6, (1, 1, 1), 1, 2, .3)
    return {'floor': [floor], 'objects': [bl.build('Citrus', [M['bark'], M['leaves_citrus'], M['core_citrus']], coll)]}


def build_reservoir(coll, M):
    poly = poly_of(HULL['reservoir'])
    inner = poly_of('M161,197 H225 Q233,197 233,205 V231 Q233,239 225,239 H161 Q153,239 153,231 V205 Q153,197 161,197 Z')
    water = poly_of('M162.5,201 H223.5 Q229,201 229,206.5 V229.5 Q229,235 223.5,235 H162.5 Q157,235 157,229.5 V206.5 Q157,201 162.5,201 Z')

    def z(P):
        so = signed_distance(P, poly)
        si = signed_distance(P, inner)
        crest = 1.6 * smoothstep(0, 2.6, so)                    # outer slope up to the crest
        return np.where(si > 0, 1.6 - 1.4 * smoothstep(0, 4, si), crest) + .03

    bank = area_floor('Embankment', poly, [M['embankment']], coll, res=.4, zfn=z, attrs={'inner': lambda P: signed_distance(P, inner)})
    wv = area_floor('Water', water, [M['water']], coll, res=.5, z=.32, attrs={'depth': lambda P: np.clip(signed_distance(P, water) / 6, 0, 1)}, pad=.6)
    pipe = Builder()
    pipe.prism((170, 194.5, .55), (170, 182, .3), .42, .42, 8, 0)
    return {'floor': [bank, wv], 'objects': [pipe.build('Pipe', [M['pipe']], coll, smooth=True)], 'cast': [bank]}


def build_road(coll, M):
    pts = sample_path(ROAD, .5)[0]
    sh = ribbon('Road shoulders', pts, 4.7, [M['gravel']], coll, z=.05, feather=1.2)
    asp = ribbon('Road', pts, 3.5, [M['asphalt']], coll, z=.08)
    L, tan = polyline_frame(pts)
    dash = Builder()
    s = 0.0
    while s < L[-1]:
        i0, i1 = np.searchsorted(L, s), np.searchsorted(L, min(s + 5, L[-1]))
        seg = pts[i0:i1 + 1]
        if len(seg) >= 2:
            _, t = polyline_frame(seg)
            for k in range(len(seg) - 1):
                n0 = np.array([-t[k][1], t[k][0]]) * .17
                n1 = np.array([-t[k + 1][1], t[k + 1][0]]) * .17
                a, b = seg[k], seg[k + 1]
                dash.quad([(*(a - n0), .1), (*(b - n1), .1), (*(b + n1), .1), (*(a + n0), .1)])
        s += 9
    return {'floor': [sh, asp, dash.build('Road paint', [M['road_paint']], coll)], 'objects': []}


def build_track(coll, M):
    out = []
    for i, pts in enumerate(sample_path(TRACK, .5)):
        out.append(ribbon(f'Track {i}', pts, 2.3, [M['track']], coll, z=.04 + i * .005, feather=1.4, uv_len=9))
    return {'floor': out, 'objects': []}


def build_power(coll, M):
    bl = Builder()
    ins = Builder()
    Hp = 15.0
    tips = {}
    for py in PYLONS:
        px = POWER_X
        half = lambda h: 2.6 - 1.75 * h / Hp
        corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
        P = lambda c, h: Vector((px + c[0] * half(h), py + c[1] * half(h), h))
        for c in corners:
            bl.prism(P(c, 0), P(c, Hp), .2, .14, 5, 0)
            bl.box(px + c[0] * 2.6 - .55, px + c[0] * 2.6 + .55, py + c[1] * 2.6 - .55, py + c[1] * 2.6 + .55, 0, .45, 1)
        levels = [Hp * k / 6 for k in range(7)]
        for i in range(len(levels)):
            h = levels[i]
            for k in range(4):
                bl.prism(P(corners[k], h), P(corners[(k + 1) % 4], h), .09, .09, 4, 0)
            if i < len(levels) - 1:
                h2 = levels[i + 1]
                for k in range(4):
                    c0, c1 = corners[k], corners[(k + 1) % 4]
                    bl.prism(P(c0, h), P(c1, h2), .07, .07, 4, 0)
        # cross-arm (east–west, across the line) + earth-wire peak
        ha = Hp - .4
        for o in (-.5, .5):
            bl.prism(Vector((px - 6.5, py + o, ha)), Vector((px + 6.5, py + o, ha)), .14, .14, 4, 0)
            bl.prism(Vector((px - 6.5, py + o, ha)), Vector((px - half(ha), py + o, ha + 1.6)), .1, .1, 4, 0)
            bl.prism(Vector((px + 6.5, py + o, ha)), Vector((px + half(ha), py + o, ha + 1.6)), .1, .1, 4, 0)
        apex = Vector((px, py, Hp + 2.6))
        for c in corners:
            bl.prism(P(c, Hp), apex, .12, .08, 4, 0)
        for dx in (-3.5, 3.5):
            tip = Vector((px + dx, py, ha))
            hang = tip - Vector((0, 0, 1.6))
            ins.prism(tip, hang, .06, .06, 5, 1)
            for kk in range(5):
                zc = tip.z - .25 - kk * .26
                ins.prism(Vector((tip.x, tip.y, zc)), Vector((tip.x, tip.y, zc - .1)), .3, .3, 10, 0, caps=True)
            tips[(py, dx)] = hang
        tips[(py, 0)] = apex
    wires = Builder()

    def catenary(p0, p1, sag, r, n=40):
        prev = None
        for i in range(n + 1):
            t = i / n
            p = p0.lerp(p1, t) - Vector((0, 0, 4 * sag * t * (1 - t)))
            if prev is not None:
                wires.prism(prev, p, r, r, 5, 0)
            prev = p
    for dx in (-3.5, 0, 3.5):
        r = .2 if dx else .13
        ends = [tips[(py, dx)] for py in PYLONS]
        first = ends[0] + Vector((0, 30, 0)); last = ends[-1] + Vector((0, -36, 0))   # beyond the frame (svg y −8 / 258)
        chain = [first] + ends + [last]
        for a, b in zip(chain, chain[1:]):
            catenary(a, b, 2.2, r)
    return {'floor': [], 'objects': [bl.build('Pylons', [M['steel'], M['concrete']], coll),
                                     ins.build('Insulators', [M['insulator'], M['steel']], coll, smooth=True),
                                     wires.build('Conductors', [M['wire']], coll, smooth=True)]}


def build_fence(coll, M):
    pts = sample_path(FENCE, .5)[0]
    L, tan = polyline_frame(pts)
    mesh = Builder()
    Hf = 1.8
    for k in range(len(pts) - 1):
        a, b = pts[k], pts[k + 1]
        mesh.quad([(a[0], a[1], 0), (b[0], b[1], 0), (b[0], b[1], Hf), (a[0], a[1], Hf)],
                  0, uvs=[(L[k] / 2, 0), (L[k + 1] / 2, 0), (L[k + 1] / 2, Hf / 2), (L[k] / 2, Hf / 2)])
    posts = Builder()
    pp = []
    for y in range(126, 197, 10):
        pp.append((390, y))
    for x in range(278, 381, 10):
        pp += [(x, 124), (x, 198)]
    for y in range(134, 189, 10):
        if y < 154 or y > 166:
            pp.append((268, y))
    pp += [(268, 124), (390, 124), (390, 198), (268, 198)]
    for (x, y) in pp:
        posts.box(x - .3, x + .3, y - .3, y + .3, 0, Hf + .15, 0)
    for (x, y) in ((268, 156), (268, 164)):     # gate posts
        posts.box(x - .55, x + .55, y - .55, y + .55, 0, Hf + .3, 0)
    rail = Builder()
    for k in range(len(pts) - 1):
        a, b = pts[k], pts[k + 1]
        rail.prism((a[0], a[1], Hf), (b[0], b[1], Hf), .16, .16, 6, 0)
    return {'floor': [], 'objects': [mesh.build('Fence mesh', [M['chain']], coll), posts.build('Fence posts', [M['post']], coll),
                                     rail.build('Fence rail', [M['post']], coll, smooth=True)]}


def materials():
    imgs = {k: leaf_atlas(k) for k in ATLAS}
    return {
        'ground': ground_material(),
        'floor_grove': floor_material('Grove floor', '#7F8E48', '#BFA36C', .7, litter=.55),
        'floor_garrigue': floor_material('Garrigue floor', '#8A9650', '#C9AE78', .45, rocky=.55),
        'floor_batha': floor_material('Batha floor', '#97A35A', '#D7BD82', .8, rocky=.55),
        'floor_planted': planted_floor_material(),
        'floor_orchard': orchard_floor_material(),
        'terrace': terrace_material(),
        'fields': field_material(),
        'field_path': floor_material('Field paths', '#A9A673', '#D2BB8A', .15),
        'yard': yard_material(),
        'lane': lane_material(),
        'pavers': paver_material(),
        'embankment': embankment_material(),
        'water': water_material(),
        'track': track_material(),
        'asphalt': asphalt_material(),
        'gravel': gravel_material(),
        'road_paint': new_material('Road paint', '#E9E6DC', .6),
        'stone': stone_material(color='#B7AE9B'),
        'bark': tinted_material('Bark', '#4A3F33', .9),
        'leaves_oak': leaf_material('Oak leaves', imgs['oak'], '#5E6B2E', (.8, 1.08)),
        'core_oak': seasonal_tint_material('Oak crown core', '#24301A', '#2B321F', .9),
        'leaves_scrub': leaf_material('Grove scrub', imgs['scrub'], '#5A6430', (.6, 1.3)),
        'core_scrub': seasonal_tint_material('Grove scrub core', '#29331C', '#34362A', .9),
        'leaves_scrub_s': leaf_material('Garrigue scrub', imgs['scrub'], '#5A6430', (.25, 2.1)),
        'core_scrub_s': seasonal_tint_material('Garrigue scrub core', '#29331C', '#66665A', .9),
        'leaves_pine': leaf_material('Pine needles', imgs['pine'], '#4A5A36'),
        'core_pine': tinted_material('Pine crown core', '#1F2A18', .9),
        'leaves_citrus': leaf_material('Citrus leaves', imgs['citrus'], '#4E6B30'),
        'core_citrus': tinted_material('Citrus crown core', '#16240F', .9),
        'dwarf': seasonal_tint_material('Dwarf shrub', '#6A7449', '#9B977C', .9),
        'tuft': seasonal_tint_material('Grass tuft', '#7E8C4E', '#C6A866', .95),
        'roof0': roof_material('Roof A', '#E2DCD0'),
        'roof1': roof_material('Roof B', '#D5CDBE'),
        'roof2': roof_material('Roof C', '#C9C0AE'),
        'roof3': roof_material('Roof D', '#BDB4A3'),
        'wall': tinted_material('Walls', '#DCD3C1', .9),
        'panel': new_material('Solar collector', '#1F2D3D', .2, .3),
        'tank': new_material('Water heater tank', '#F1F0EB', .35),
        'tank_black': new_material('Water tank', '#1E1F1E', .5),
        'pipe': new_material('Pipe', '#8C9396', .45, .6),
        'steel': new_material('Pylon steel', '#8B9194', .45, .75),
        'concrete': new_material('Concrete', '#BDB6A8', .9),
        'insulator': new_material('Insulators', '#5C7470', .1),
        'wire': new_material('Conductor', '#3A3E41', .45, .7),
        'chain': chain_link_material(),
        'post': new_material('Fence posts', '#9EA3A3', .4, .7),
    }


def planted_floor_material():
    """Pine-needle litter, a pale dirt firebreak just inside the plantation edge."""
    m = new_material('Planted floor', '#B49A72', .95)
    ns, lk, bs = nodes(m)
    lit = tex(ns, lk, os.path.join(TEX, 'forest_diff.jpg'), coords(ns, lk, 1 / 10, .7)).outputs['Color']
    lit = hsv(ns, lk, lit, h=.52, s=.6, v=1.05)
    soil, _ = soil_base(ns, lk, 1.0)
    e = attr(ns, 'edge')
    fb = math_node(ns, lk, 'MULTIPLY', ramp(ns, lk, e, .2, 1.0), ramp(ns, lk, e, 3.4, 2.6))
    col = mix_rgb(ns, lk, fb, lit, soil)
    lk.new(col, bs.inputs['Base Color'])
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def orchard_floor_material():
    """Cultivated strips under the tree rows; mown cover crop between them."""
    m = new_material('Orchard floor', '#B6A57E', .95)
    ns, lk, bs = nodes(m)
    soil, _ = soil_base(ns, lk, .92)
    soilt = tex(ns, lk, os.path.join(TRF, 'mud', 'diffuse.webp'), coords(ns, lk, 1 / 18)).outputs['Color']
    strip = hsv(ns, lk, soilt, h=.505, s=.5, v=1.8)
    g = tex(ns, lk, os.path.join(TEX, 'grass_diff.jpg'), coords(ns, lk, 1 / 12, .3)).outputs['Color']
    cover = hsv(ns, lk, mix_rgb(ns, lk, .7, g, rgba('#A3A46A'), 'COLOR'), v=1.6)
    between = mix_rgb(ns, lk, .55, soil, cover)
    d = attr(ns, 'rowd')
    col = mix_rgb(ns, lk, ramp(ns, lk, d, 4.2, 5.8), strip, between)
    lk.new(col, bs.inputs['Base Color'])
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def yard_material():
    m = floor_material('Village yards', '#9AA060', '#C7B184', .2)
    return m


def lane_material():
    m = new_material('Village lane', '#BDB8AC', .9)
    ns, lk, bs = nodes(m)
    v = coords(ns, lk, 1.0)
    n = noise_tex(ns, lk, v, .4, 5)
    c = mix_rgb(ns, lk, ramp(ns, lk, n.outputs['Fac'], .4, .7), rgba('#B7B2A6'), rgba('#9F9A8F'))
    lk.new(mix_rgb(ns, lk, .2, c, noise_tex(ns, lk, v, 12, 2).outputs['Color'], 'OVERLAY'), bs.inputs['Base Color'])
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def embankment_material():
    """Compacted earth crest and slopes; a dark liner where the inner slope meets the water."""
    m = new_material('Embankment', '#C7B48E', .95)
    ns, lk, bs = nodes(m)
    soil, _ = soil_base(ns, lk, 1.05)
    si = attr(ns, 'inner')
    liner = ramp(ns, lk, si, 1.4, 3.0)
    col = mix_rgb(ns, lk, liner, soil, rgba('#3B3C38'))
    lk.new(col, bs.inputs['Base Color'])
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def gravel_material():
    m = new_material('Gravel shoulder', '#B9AE96', .95)
    ns, lk, bs = nodes(m)
    soil, _ = soil_base(ns, lk, 1.08)
    lk.new(hsv(ns, lk, soil, s=.6), bs.inputs['Base Color'])
    cut_out(m, ns, lk, bs, attr(ns, 'a'))
    return m


def build():
    M = materials()
    builders = {'ground': build_ground, 'grove': build_grove, 'garrigue': build_garrigue, 'batha': build_batha,
                'planted': build_planted, 'terraces': build_terraces, 'fields': build_fields, 'village': build_village,
                'orchard': build_orchard, 'reservoir': build_reservoir, 'track': build_track, 'road': build_road,
                'power': build_power, 'fence': build_fence}
    return {k: f(collection(k), M) for k, f in builders.items()}


# Seasonal regions render their winter look only (the page shows winter); raised regions get a cast-shadow pass onto the land.
SEASONAL = ('ground', 'grove', 'garrigue', 'batha', 'terraces', 'fields')
REGIONS = ('grove', 'garrigue', 'batha', 'planted', 'terraces', 'fields', 'village', 'orchard', 'reservoir', 'track', 'road', 'power', 'fence')
RAISED = ('grove', 'garrigue', 'planted', 'village', 'orchard', 'reservoir', 'power', 'fence')
SAMPLES = {'ground': 64, 'shadow': 96, 'grove': 192, 'garrigue': 160, 'batha': 128, 'planted': 192, 'terraces': 96,
           'fields': 64, 'village': 160, 'orchard': 192, 'reservoir': 96, 'track': 64, 'road': 64, 'power': 128, 'fence': 128}


def passes():
    out = []
    for k in ('ground',) + REGIONS:
        out += [f'{k}-winter'] if k in SEASONAL else [k]
    out += ['shadow-' + k for k in RAISED]
    return out


def configure(groups, name):
    for g in groups.values():
        for ob in g['floor'] + g['objects']:
            ob.hide_render = True
            ob.is_holdout = False
            ob.is_shadow_catcher = False
            ob.visible_camera = True
            ob.visible_shadow = True
    land = groups['ground']['floor']
    if name.startswith('shadow-'):
        k = name[len('shadow-'):]
        for ob in land:
            ob.hide_render = False
            ob.is_shadow_catcher = True
        for ob in groups[k]['objects'] + groups[k].get('cast', []):
            ob.hide_render = False
            ob.visible_camera = False
        return
    k = name.rsplit('-', 1)[0] if name.endswith(('-winter', '-summer')) else name
    for ob in groups[k]['floor'] + groups[k]['objects']:
        ob.hide_render = False
    if k != 'ground':
        # the land is there for bounce light only
        for ob in land:
            ob.hide_render = False
            ob.visible_camera = False
            ob.visible_shadow = False


def verify():
    sc = bpy.context.scene
    worst = 0
    for (x, y) in ((0, 0), (400, 0), (0, 250), (400, 250), (139, 122), (329, 160)):
        p = world_to_camera_view(sc, sc.camera, world((x, y, 0)))
        worst = max(worst, abs(p.x * W - x), abs((1 - p.y) * H - y))
    print(f'camera vs map units: max error {worst:.4f}', flush=True)
    assert worst < .05, 'camera does not match the map tile'


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    todo = args or passes()
    sc = setup()
    groups = build()
    bpy.context.view_layer.update()
    verify()
    for name in todo:
        configure(groups, name)
        set_season('summer' if name.endswith('-summer') else 'winter')
        key = name.split('-')[0]
        sc.cycles.samples = max(8, int(SAMPLES[key] * SAMPLE_SCALE))
        sc.render.filepath = os.path.join(OUT, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('PASS', name, flush=True)
    print('LAND COVER RENDERS COMPLETE', flush=True)
