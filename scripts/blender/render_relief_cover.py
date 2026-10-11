"""Realistic side-section for topic-02 „זיהוי תבליט ותכסית בשטח” (ReliefCoverTerrain.tsx).

Same render language as the slope side-cuts (render_slope_profiles.py): a cut slab —
topsoil over layered limestone — under the lesson-1 studio light, with the repo's CC0
photo textures. Every layer of the interaction is its own transparent pass, all from ONE
orthographic camera locked to the SVG viewBox (0 0 640 390), so the live overlay (relief
pins, highlighted stretches, callouts, hit areas) lands exactly where it did on the
papercut version (archived as ReliefCoverTerrainV1.tsx):

    far       the hazy ridge and the land behind the slab           (relief layer)
    relief    the bare slab; its front edge IS groundY(x)            (relief layer)
    shadow-*  what each land-cover item casts on the ground (shown when both are on)
    grove · shrubs · houses · orchard · road · power
              one pass per land-cover item; the ground is a holdout, so each object is
              cut exactly where the slope hides it

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_relief_cover.py -- [pass ...]
    node scripts/blender/package_relief_cover.cjs

Quick look: RC_PX=1 RC_SAMPLES=0.25 renders a 640 × 390 draft.
Keep the geometry block below in sync with ReliefCoverTerrain.tsx. No network.
"""
import bpy, bmesh, math, os, random, sys
import numpy as np
from mathutils import Vector, Matrix, noise
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/relief-cover-blender')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
LIMESTONE = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-density/limestone-section.webp')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)

# ── Shared with ReliefCoverTerrain.tsx ──────────────────────────────────────
W, H, BASE = 640, 390, 306


def bump(x, c, a, s):
    return a * math.exp(-((x - c) ** 2) / (2 * s * s))


def height_at(x):
    return bump(x, 178, 96, 44) + bump(x, 318, 150, 46) + bump(x, 470, 60, 32)


def ground_y(x):
    return BASE - height_at(x)


def far_ridge_y(x):
    return 288 - (bump(x, 30, 34, 70) + bump(x, 250, 36, 60) + bump(x, 430, 50, 70) + bump(x, 640, 30, 60))


#         x   trunk  r    back
GROVE = [(131, 12, 12, True), (170, 15, 14, True), (207, 12, 12, True),
         (114, 6, 10, False), (145, 8, 14, False), (188, 8, 15.5, False), (224, 5, 9.5, False)]
SHRUBS = [(256, 9, 7), (272, 7, 5.5), (289, 9.5, 7.5), (345, 9, 7), (360, 7, 5.5)]   # x, rx, ry
HOUSES = [(20, 24, 17, False), (49, 22, 27, True), (79, 25, 16, False)]               # x, w, h, flat
ORCHARD = [438, 459, 480, 501]
ORCHARD_R, ORCHARD_T = 9, 7
PYLONS = [546, 606]
PYLON_H = 62
CAR_X = 576

# ── Camera: orthographic, pitched down by TILT, framing the 640 × 390 board ──
# A point at depth d (svg units behind the cut face) and height h ("h units" =
# world z / S) lands on svg y = BASE − (d·sinT + h·cosT): the cut face (d = 0)
# reads in exact svg units, and the land behind it rises by d·sinT.
TILT = math.radians(10)
SIN_T, COS_T = math.sin(TILT), math.cos(TILT)
S = 0.02                                         # world units per svg unit
PX = float(os.environ.get('RC_PX', 2.5))         # 1600 × 975
SAMPLE_SCALE = float(os.environ.get('RC_SAMPLES', 1))
DEPTH = 52                                       # slab depth behind the cut face


def smoothstep(e0, e1, v):
    t = min(1.0, max(0.0, (v - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def h_front(x):
    return height_at(x) / COS_T


def h_for(y, d):
    """Height whose projection at depth d lands on svg y."""
    return (BASE - y - d * SIN_T) / COS_T


def world(p):
    return Vector(((p[0] - W / 2) * S, p[1] * S, p[2] * S))


# Road: leaves the slab through the cut face near x ≈ 506 (the papercut road's start)
# and runs along the plain to the right edge.
ROAD_HW = 9.0


def road_centre(x):
    return -10 + 22 * smoothstep(492, 560, x)


def road_mask(x, d):
    return (1 - smoothstep(ROAD_HW + 1, ROAD_HW + 5, abs(d - road_centre(x)))) * smoothstep(486, 498, x)


def surf_h(x, d):
    """Ground surface. Exactly the profile at the cut face; gentle undulation fades in
    behind it (never under the road)."""
    fade = min(1.0, d / 4.0) * (1 - road_mask(x, d))
    n = noise.fractal(Vector((x * .05, d * .07, 2.3)), .6, 2.0, 4)
    return h_front(x) + n * 1.3 * fade


def slope_at(x):
    return abs(height_at(x + 1) - height_at(x - 1)) / 2


# ── Colour + material helpers ───────────────────────────────────────────────
def lin(hx):
    rgb = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)


def rgba(hx):
    return lin(hx) + (1,)


def image(path):
    return bpy.data.images.load(path, check_existing=True)


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


def obj_coords(ns, lk, scale):
    tc = ns.new('ShaderNodeTexCoord')
    sc = ns.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs[3].default_value = scale
    lk.new(tc.outputs['Object'], sc.inputs[0])
    return tc, sc.outputs[0]


def box_tex(ns, lk, path, vector, blend=.3):
    tx = ns.new('ShaderNodeTexImage'); tx.image = image(path)
    tx.projection = 'BOX'; tx.projection_blend = blend
    lk.new(vector, tx.inputs['Vector'])
    return tx


def mix_rgb(ns, lk, fac, a, b, blend='MIX'):
    mx = ns.new('ShaderNodeMixRGB'); mx.blend_type = blend
    if isinstance(fac, float):
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


def attr(ns, name, out='Fac'):
    a = ns.new('ShaderNodeAttribute'); a.attribute_name = name
    return a.outputs[out]


def bump_from(ns, lk, bs, height, strength=.4, dist=.01):
    b = ns.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = dist
    lk.new(height, b.inputs['Height']); lk.new(b.outputs[0], bs.inputs['Normal'])


def ground_material(name):
    """Bare ground: dry soil with pebbles, pale limestone breaking through where the
    profile is steep (per-vertex 'rock'). No grass — grass is land cover."""
    m = new_material(name, '#A88D6B', rough=.95)
    ns, lk, bs = nodes(m)
    tc, v = obj_coords(ns, lk, 1.7)
    soil = box_tex(ns, lk, os.path.join(TEX, 'dry_diff.jpg'), v)
    _, v2 = obj_coords(ns, lk, 1.1)
    rock = box_tex(ns, lk, os.path.join(TEX, 'rock_diff.jpg'), v2)
    patches = ns.new('ShaderNodeTexNoise'); patches.inputs['Scale'].default_value = 5; patches.inputs['Detail'].default_value = 4
    lk.new(tc.outputs['Object'], patches.inputs['Vector'])
    rf = ns.new('ShaderNodeMath'); rf.operation = 'ADD'
    lk.new(attr(ns, 'rock'), rf.inputs[0])
    pf = ns.new('ShaderNodeMath'); pf.operation = 'MULTIPLY_ADD'; pf.inputs[1].default_value = .9; pf.inputs[2].default_value = -.45
    lk.new(patches.outputs['Fac'], pf.inputs[0]); lk.new(pf.outputs[0], rf.inputs[1])
    rmix = ramp(ns, lk, rf.outputs[0], .45, .75)
    soil_c = hsv(ns, lk, soil.outputs['Color'], h=.49, s=.95, v=1.02)
    rock_c = hsv(ns, lk, rock.outputs['Color'], s=.45, v=1.12)
    col = mix_rgb(ns, lk, rmix, soil_c, rock_c)
    lk.new(col, bs.inputs['Base Color'])
    detail = ns.new('ShaderNodeTexNoise'); detail.inputs['Scale'].default_value = 140; detail.inputs['Detail'].default_value = 5
    lk.new(tc.outputs['Object'], detail.inputs['Vector'])
    bump_from(ns, lk, bs, detail.outputs['Fac'], .45, .01)
    return m


def section_material():
    """Cut face: terra-rossa topsoil following the surface, a broken weathered zone,
    then limestone beds that bow gently under the hills (attributes from the mesh:
    'below' = svg units under the surface, 'bed' = bedding coordinate, 'u' = svg x)."""
    m = new_material('Cut face — topsoil over limestone', '#C9B892', rough=.92)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord')

    def uv(su, sv, ou=0.0, ov=0.0, vname='bed'):
        comb = ns.new('ShaderNodeCombineXYZ')
        mu = ns.new('ShaderNodeMath'); mu.operation = 'MULTIPLY_ADD'; mu.inputs[1].default_value = su; mu.inputs[2].default_value = ou
        mv = ns.new('ShaderNodeMath'); mv.operation = 'MULTIPLY_ADD'; mv.inputs[1].default_value = sv; mv.inputs[2].default_value = ov
        lk.new(attr(ns, 'u'), mu.inputs[0]); lk.new(attr(ns, vname), mv.inputs[0])
        lk.new(mu.outputs[0], comb.inputs['X']); lk.new(mv.outputs[0], comb.inputs['Y'])
        return comb.outputs[0]

    beds = ns.new('ShaderNodeTexImage'); beds.image = image(LIMESTONE); beds.extension = 'MIRROR'
    lk.new(uv(1 / 300, 1 / 100, .13, .31), beds.inputs['Vector'])
    rock = ns.new('ShaderNodeTexImage'); rock.image = image(os.path.join(TEX, 'rock_diff.jpg')); rock.extension = 'MIRROR'
    lk.new(uv(1 / 70, 1 / 55, .4, .1), rock.inputs['Vector'])
    rock_grey = hsv(ns, lk, rock.outputs['Color'], s=.3)
    stone = mix_rgb(ns, lk, .5, beds.outputs['Color'], rock_grey, 'OVERLAY')
    # broad marl / limestone alternation so the 235-unit face never reads as one tile
    band = ns.new('ShaderNodeTexWave'); band.wave_type = 'BANDS'; band.bands_direction = 'Y'
    band.inputs['Scale'].default_value = 1.0; band.inputs['Distortion'].default_value = 3.0; band.inputs['Detail'].default_value = 2
    lk.new(uv(1 / 900, 1 / 140, 0, 0), band.inputs['Vector'])
    marl = ramp(ns, lk, band.outputs['Fac'], .25, .9)
    stone = mix_rgb(ns, lk, marl, hsv(ns, lk, stone, s=.9, v=.86), hsv(ns, lk, stone, s=.8, v=1.06))
    soil = ns.new('ShaderNodeTexImage'); soil.image = image(os.path.join(TEX, 'dry_diff.jpg')); soil.extension = 'MIRROR'
    lk.new(uv(1 / 34, 1 / 34, 0, 0, 'below'), soil.inputs['Vector'])
    soil_c = hsv(ns, lk, soil.outputs['Color'], h=.495, s=.85, v=.58)
    wob = ns.new('ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 26; wob.inputs['Detail'].default_value = 5
    lk.new(tc.outputs['Object'], wob.inputs['Vector'])
    wd = ns.new('ShaderNodeMath'); wd.operation = 'MULTIPLY_ADD'; wd.inputs[1].default_value = 5; wd.inputs[2].default_value = -2.5
    lk.new(wob.outputs['Fac'], wd.inputs[0])
    dep = ns.new('ShaderNodeMath'); dep.operation = 'ADD'
    lk.new(attr(ns, 'below'), dep.inputs[0]); lk.new(wd.outputs[0], dep.inputs[1])
    # rock fragments float in the lower soil: the weathered zone
    frag = ns.new('ShaderNodeTexVoronoi'); frag.inputs['Scale'].default_value = 90
    lk.new(tc.outputs['Object'], frag.inputs['Vector'])
    fz = ramp(ns, lk, frag.outputs['Distance'], .42, .2)
    weathered = mix_rgb(ns, lk, fz, soil_c, hsv(ns, lk, stone, v=.92))
    top = mix_rgb(ns, lk, ramp(ns, lk, dep.outputs[0], 2.5, 5.5), soil_c, weathered)
    col = mix_rgb(ns, lk, ramp(ns, lk, dep.outputs[0], 8.0, 15.0), top, stone)
    col = mix_rgb(ns, lk, ramp(ns, lk, attr(ns, 'below'), 50.0, 240.0), col, hsv(ns, lk, col, v=.8))
    lk.new(col, bs.inputs['Base Color'])
    hb = mix_rgb(ns, lk, .5, rock.outputs['Color'], beds.outputs['Color'])
    bump_from(ns, lk, bs, hb, .5, .02)
    return m


def leaf_material(name, img, translucent='#6E7C42'):
    m = bpy.data.materials.new(name); m.use_nodes = True
    ns, lk, bs = nodes(m)
    out = ns.get('Material Output')
    tx = ns.new('ShaderNodeTexImage'); tx.image = img; tx.interpolation = 'Cubic'
    col = mix_rgb(ns, lk, 1.0, tx.outputs['Color'], attr(ns, 'tint', 'Color'), 'MULTIPLY')
    lk.new(col, bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .62
    tr = ns.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = rgba(translucent)
    leafy = ns.new('ShaderNodeMixShader'); leafy.inputs[0].default_value = .18
    lk.new(bs.outputs[0], leafy.inputs[1]); lk.new(tr.outputs[0], leafy.inputs[2])
    clear = ns.new('ShaderNodeBsdfTransparent')
    cut = ns.new('ShaderNodeMixShader')
    lk.new(tx.outputs['Alpha'], cut.inputs[0]); lk.new(clear.outputs[0], cut.inputs[1]); lk.new(leafy.outputs[0], cut.inputs[2])
    lk.new(cut.outputs[0], out.inputs['Surface'])
    return m


def tinted_material(name, color, rough=.8):
    """Plain colour × per-vertex 'tint' (cores of crowns, bark variation)."""
    m = new_material(name, color, rough)
    ns, lk, bs = nodes(m)
    lk.new(mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'), bs.inputs['Base Color'])
    return m


def bark_material(name, color):
    m = new_material(name, color, .9)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord')
    wave = ns.new('ShaderNodeTexWave'); wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 140
    wave.inputs['Distortion'].default_value = 9; wave.inputs['Detail'].default_value = 3
    lk.new(tc.outputs['Object'], wave.inputs['Vector'])
    c = mix_rgb(ns, lk, ramp(ns, lk, wave.outputs['Fac'], .2, .9), hsv(ns, lk, mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'), v=.62),
                mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY'))
    lk.new(c, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, wave.outputs['Fac'], .6, .004)
    return m


def stone_wall_material(name, c1, c2):
    """Dressed limestone cladding (the common Israeli village façade)."""
    m = new_material(name, c1, .88)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord'); sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(tc.outputs['Object'], sep.inputs[0])
    add = ns.new('ShaderNodeMath'); add.operation = 'ADD'; lk.new(sep.outputs['X'], add.inputs[0]); lk.new(sep.outputs['Y'], add.inputs[1])
    comb = ns.new('ShaderNodeCombineXYZ'); lk.new(add.outputs[0], comb.inputs['X']); lk.new(sep.outputs['Z'], comb.inputs['Y'])
    br = ns.new('ShaderNodeTexBrick'); br.offset = .5
    br.inputs['Scale'].default_value = 9.0; br.inputs['Mortar Size'].default_value = .012
    br.inputs['Brick Width'].default_value = .52; br.inputs['Row Height'].default_value = .2
    br.inputs['Color1'].default_value = rgba(c1); br.inputs['Color2'].default_value = rgba(c2)
    br.inputs['Mortar'].default_value = rgba('#E6DECC'); br.inputs['Bias'].default_value = 0
    lk.new(comb.outputs[0], br.inputs['Vector'])
    grain = ns.new('ShaderNodeTexNoise'); grain.inputs['Scale'].default_value = 300; grain.inputs['Detail'].default_value = 6
    lk.new(tc.outputs['Object'], grain.inputs['Vector'])
    c = mix_rgb(ns, lk, .18, br.outputs['Color'], grain.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    inv = ns.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
    lk.new(br.outputs['Fac'], inv.inputs[1])
    bump_from(ns, lk, bs, inv.outputs[0], .35, .003)
    return m


def plaster_material(name, color):
    m = new_material(name, color, .9)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord')
    n = ns.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 60; n.inputs['Detail'].default_value = 6
    lk.new(tc.outputs['Object'], n.inputs['Vector'])
    stain = ramp(ns, lk, n.outputs['Fac'], .45, .75)
    c = mix_rgb(ns, lk, stain, rgba(color), rgba('#CFC6B3'))
    lk.new(c, bs.inputs['Base Color'])
    fine = ns.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 900
    lk.new(tc.outputs['Object'], fine.inputs['Vector'])
    bump_from(ns, lk, bs, fine.outputs['Fac'], .25, .002)
    return m


def tile_material(name):
    """Terracotta roof tiles: rows parallel to the ridge (object Y), stepping up the slope."""
    m = new_material(name, '#9A5A3D', .7)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord'); sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(tc.outputs['Object'], sep.inputs[0])
    comb = ns.new('ShaderNodeCombineXYZ'); lk.new(sep.outputs['Y'], comb.inputs['X']); lk.new(sep.outputs['Z'], comb.inputs['Y'])
    br = ns.new('ShaderNodeTexBrick'); br.offset = .5
    br.inputs['Scale'].default_value = 11.0; br.inputs['Mortar Size'].default_value = .02
    br.inputs['Brick Width'].default_value = .5; br.inputs['Row Height'].default_value = .25
    br.inputs['Color1'].default_value = rgba('#A3603F'); br.inputs['Color2'].default_value = rgba('#8A4B31')
    br.inputs['Mortar'].default_value = rgba('#4A2A1C')
    lk.new(comb.outputs[0], br.inputs['Vector'])
    lk.new(br.outputs['Color'], bs.inputs['Base Color'])
    bump_from(ns, lk, bs, br.outputs['Fac'], .6, .004)
    return m


def asphalt_material():
    m = new_material('Asphalt', '#4B4C49', .88)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord')
    sp = ns.new('ShaderNodeTexNoise'); sp.inputs['Scale'].default_value = 700; sp.inputs['Detail'].default_value = 2
    lk.new(tc.outputs['Object'], sp.inputs['Vector'])
    wear = ns.new('ShaderNodeTexNoise'); wear.inputs['Scale'].default_value = 18; wear.inputs['Detail'].default_value = 4
    lk.new(tc.outputs['Object'], wear.inputs['Vector'])
    base = mix_rgb(ns, lk, ramp(ns, lk, wear.outputs['Fac'], .35, .7), rgba('#3F403E'), rgba('#5A5A55'))
    c = mix_rgb(ns, lk, .35, base, sp.outputs['Color'], 'OVERLAY')
    lk.new(c, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, sp.outputs['Fac'], .3, .002)
    return m


def paint_material(color, rough=.32, metal=.55):
    m = new_material('Car paint', color, rough, metal)
    _, _, bs = nodes(m)
    try:
        bs.inputs['Coat Weight'].default_value = .6
        bs.inputs['Coat Roughness'].default_value = .08
    except KeyError:
        pass
    return m


def glass_material(color='#1E2629'):
    m = new_material('Glass', color, .06, .0)
    _, _, bs = nodes(m)
    try:
        bs.inputs['Specular IOR Level'].default_value = .9
    except KeyError:
        pass
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
    # leaves per cell, leaf length px, width/length, palette, (silver underside share, colour)
    'oak':   dict(n=60, a=(48, 78), b=(.42, .58), greens=('#2F3B1D', '#3A4724', '#45532A', '#4F5E31', '#5B6A37'), under=(.12, '#6F7B4A')),
    'olive': dict(n=90, a=(55, 85), b=(.16, .22), greens=('#55603F', '#606B49', '#6B7553', '#4C573A'), under=(.38, '#A3A890')),
    'scrub': dict(n=70, a=(38, 60), b=(.42, .6), greens=('#46512D', '#525D36', '#5E683F', '#6A7347'), under=(.18, '#868C66')),
}


def leaf_atlas(kind, size=1024):
    p = ATLAS[kind]
    rng = np.random.default_rng({'oak': 3, 'olive': 5, 'scrub': 7}[kind])
    C = np.zeros((size, size, 3), np.float32)
    A = np.zeros((size, size), np.float32)
    cell = size // 2
    greens = [hex01(c) for c in p['greens']]
    for ci in range(4):
        ox, oy = (ci % 2) * cell, (ci // 2) * cell
        for _ in range(p['n']):
            ang = rng.uniform(0, 2 * np.pi)
            rad = cell * 0.43 * rng.uniform(0, 1) ** 0.55
            cx = ox + cell / 2 + rad * math.cos(ang)
            cy = oy + cell / 2 + rad * math.sin(ang)
            a = rng.uniform(*p['a'])
            b = a * rng.uniform(*p['b'])
            rot = ang + rng.normal(0, 0.9)
            if rng.uniform() < p['under'][0]:
                base = hex01(p['under'][1]) * rng.uniform(.9, 1.08)
            else:
                base = greens[rng.integers(len(greens))] * rng.uniform(.85, 1.15)
            shade = (0.7 + 0.3 * rad / (cell * 0.43)) * (1.1 - 0.25 * (cy - oy) / cell)
            x0, x1 = int(max(ox, cx - a - 2)), int(min(ox + cell, cx + a + 3))
            y0, y1 = int(max(oy, cy - a - 2)), int(min(oy + cell, cy + a + 3))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
            lx = (xx - cx) * math.cos(rot) + (yy - cy) * math.sin(rot)
            ly = -(xx - cx) * math.sin(rot) + (yy - cy) * math.cos(rot)
            taper = np.clip(1.0 - 0.5 * (lx / a) ** 2, 0.15, 1.0)
            d = np.sqrt((lx / a) ** 2 + (ly / (b * taper)) ** 2)
            al = np.clip((1.0 - d) * b * 0.9, 0, 1)
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


# ── Mesh builder (all coordinates in svg space: x, depth, height) ───────────
class Builder:
    def __init__(self):
        self.v, self.f, self.uv, self.tint, self.mi = [], [], [], [], []
        self.xf = None                      # optional transform of svg-space points

    def vert(self, p):
        p = Vector(p)
        if self.xf:
            p = self.xf(p)
        self.v.append(world(p))
        return len(self.v) - 1

    def face(self, idx, uvs=None, tint=(1, 1, 1), mi=0):
        self.f.append(tuple(idx))
        self.uv.append(uvs or [(0, 0)] * len(idx))
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

    # primitives -------------------------------------------------------------
    def box(self, x0, x1, d0, d1, h0, h1, mi=0, tint=(1, 1, 1), skip=()):
        q = {
            'front': [(x0, d0, h0), (x1, d0, h0), (x1, d0, h1), (x0, d0, h1)],
            'back': [(x1, d1, h0), (x0, d1, h0), (x0, d1, h1), (x1, d1, h1)],
            'left': [(x0, d1, h0), (x0, d0, h0), (x0, d0, h1), (x0, d1, h1)],
            'right': [(x1, d0, h0), (x1, d1, h0), (x1, d1, h1), (x1, d0, h1)],
            'top': [(x0, d0, h1), (x1, d0, h1), (x1, d1, h1), (x0, d1, h1)],
            'bottom': [(x0, d1, h0), (x1, d1, h0), (x1, d0, h0), (x0, d0, h0)],
        }
        for k, pts in q.items():
            if k not in skip:
                self.quad(pts, mi, tint)

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

    def blob(self, c, rx, rd, rh, mi=0, tint=(1, 1, 1), rough=.25, seed=0.0):
        for f in ICO_F:
            idx = []
            for vi in f:
                v = ICO_V[vi]
                k = 1 + rough * noise.noise(Vector((v[0] * 1.7 + seed, v[1] * 1.7, v[2] * 1.7)))
                idx.append(self.vert((c[0] + v[0] * rx * k, c[1] + v[1] * rd * k, c[2] + v[2] * rh * k)))
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
    """Leaf-cluster cards on the shell of each lobe (x, d, h, rx, rd, rh) + a dark core."""
    for (cx, cd, ch, rx, rd, rh) in lobes:
        n = int(dens * ellipsoid_area(rx, rd, rh) / (card * card))
        for _ in range(n):
            z = rng.uniform(-1, 1); t = rng.uniform(0, 2 * math.pi); s = math.sqrt(1 - z * z)
            dvec = Vector((s * math.cos(t), s * math.sin(t), z))
            f = .6 + .4 * rng.random() ** .6
            p = Vector((cx + dvec.x * rx * f, cd + dvec.y * rd * f, ch + dvec.z * rh * f))
            nrm = (dvec + Vector((rng.gauss(0, .7), rng.gauss(0, .7), rng.gauss(0, .7)))).normalized()
            light = (1 - light_bias) + light_bias * (dvec.z * .5 + .5)
            k = light * (.72 + .28 * f) * rng.uniform(.86, 1.12)
            bl.card(p, nrm, card * rng.uniform(.75, 1.3), (rng.choice((0, .5)), rng.choice((0, .5))),
                    (tint[0] * k, tint[1] * k, tint[2] * k), leaf_mi, rng.uniform(0, 2 * math.pi))
        bl.blob((cx, cd, ch), rx * .74, rd * .74, rh * .72, core_mi, (1, 1, 1), .3, rng.uniform(0, 50))


def stem(bl, rng, pts, r0, r1, mi, sides=7):
    n = len(pts) - 1
    for i in range(n):
        bl.prism(pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, sides, mi,
                 (rng.uniform(.85, 1.1),) * 3)


# ── Scene ───────────────────────────────────────────────────────────────────
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        devices = prefs.get_devices_for_type('OPTIX')   # only probe OptiX (oneAPI probe crashes here)
        for dev in devices:
            dev.use = True
        if any(dev.type == 'OPTIX' for dev in devices):
            sc.cycles.device = 'GPU'
    except Exception as exc:
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 96
    sc.cycles.max_bounces = 8
    sc.render.resolution_x = round(W * PX)
    sc.render.resolution_y = round(H * PX)
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'AgX'
    world_ = bpy.data.worlds.new('Sky'); sc.world = world_; world_.use_nodes = True
    bg = world_.node_tree.nodes['Background']
    bg.inputs[0].default_value = (.8, .82, .86, 1); bg.inputs[1].default_value = .7
    # Warm key from the front-left and above — the lesson dioramas' light.
    sun_dir = Vector((-.42, -.7, .58)).normalized()
    sun_data = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_data)
    sc.collection.objects.link(sun)
    sun.rotation_euler = sun_dir.to_track_quat('Z', 'Y').to_euler()
    sun_data.energy = 4.2; sun_data.angle = math.radians(3); sun_data.color = (1, .95, .86)
    cam_data = bpy.data.cameras.new('Board camera'); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = W * S; cam_data.sensor_fit = 'HORIZONTAL'; cam_data.clip_end = 400
    cam = bpy.data.objects.new('Board camera', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    look = Vector((0, COS_T, -SIN_T))
    cam.location = world((W / 2, 0, h_for(H / 2, 0))) - look * 60
    cam.rotation_euler = (math.pi / 2 - TILT, 0, 0)
    return sc


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def build_slab(coll, mats):
    xs = [-6 + i for i in range(W + 13)]
    ds = [0, .25, .6, 1, 1.6, 2.4, 3.4, 4.6, 6, 7.6, 9.5, 11.8, 14.5, 17.5, 21, 25, 29.5, 34.5, 40, 46, DEPTH]
    nx = len(xs)
    bl = Builder()
    for d in ds:
        for x in xs:
            bl.vert((x, d, surf_h(x, d)))
    for j in range(len(ds) - 1):
        for i in range(nx - 1):
            bl.face([j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i])
    top = bl.build('Ground surface', [mats['ground']], coll, smooth=True)
    a = top.data.attributes.new('rock', 'FLOAT', 'POINT')
    rock = []
    for d in ds:
        for x in xs:
            n = noise.noise(Vector((x * .06, d * .09, 7.7)))
            rock.append(max(0.0, min(1.0, (slope_at(x) - .55) * .9 + .25 * n)))
    a.data.foreach_set('value', rock)

    # Cut face: two vertices per column, down past the frame bottom.
    fx = [-6 + i * .5 for i in range(int((W + 12) / .5) + 1)]
    hb = h_for(H + 10, 0)
    bf = Builder()
    below, bed, u = [], [], []
    for x in fx:
        ht = h_front(x)
        bf.vert((x, 0, ht)); bf.vert((x, 0, hb))
        below += [0.0, (ht - hb) * COS_T]
        bed += [ht * COS_T - .15 * height_at(x), hb * COS_T - .15 * height_at(x)]
        u += [x, x]
    for i in range(len(fx) - 1):
        bf.face([2 * i + 1, 2 * i + 3, 2 * i + 2, 2 * i])
    face = bf.build('Cut face', [mats['section']], coll)
    for name, vals in (('below', below), ('bed', bed), ('u', u)):
        at = face.data.attributes.new(name, 'FLOAT', 'POINT'); at.data.foreach_set('value', vals)

    # Stones and small outcrops on the surface (more where it is steep); none on the road
    # or under a house, where they would punch through those objects' holdout.
    rng = random.Random(11)
    br = Builder()
    for _ in range(1400):
        x = rng.uniform(-4, W + 4)
        if rng.random() > .18 + min(.8, slope_at(x) * .45):
            continue
        size = rng.uniform(.35, 1.0) * (1 + 1.2 * rng.random() ** 4)
        d = rng.uniform(size + .3, DEPTH - 1)
        if road_mask(x, d) > .01 or (x < 96 and d < 30):
            continue
        hgt = surf_h(x, d)
        br.blob((x, d, hgt + size * .1), size * rng.uniform(1, 1.7), size * rng.uniform(.8, 1.3), size * rng.uniform(.45, .8),
                0, (rng.uniform(.82, 1.08),) * 3, .3, rng.uniform(0, 99))
    stones = br.build('Stones', [mats['stone']], coll, smooth=True)
    return [top, face, stones]


def build_far(coll, mats):
    """Land behind the slab rising to the hazy ridge. Its skyline is solved per column
    so it projects exactly onto farRidgeY(x)."""
    Dc = 112.0
    ds = [48 + 2.5 * i for i in range(int((Dc + 70 - 48) / 2.5) + 1)]
    xs = [-10 + 2 * i for i in range(int((W + 20) / 2) + 1)]

    def g(d):
        s = 30.0 if d < Dc else 22.0
        return math.exp(-((d - Dc) / s) ** 2)

    def base_h(d):
        return -2.0 if d <= Dc else -2.0 - (d - Dc) * .5

    G = [g(d) for d in ds]
    B = [base_h(d) for d in ds]

    heights = {}
    for x in xs:
        N = [1.1 * noise.fractal(Vector((x * .03, d * .05, 9.1)), .6, 2.0, 4) for d in ds]
        top = lambda A: max(d * SIN_T + (b_ + A * g_ + n_) * COS_T for d, b_, g_, n_ in zip(ds, B, G, N))
        target = BASE - far_ridge_y(x)
        if top(0.0) >= target:
            A = 0.0
        else:
            lo, hi = 0.0, 200.0
            for _ in range(36):
                mid = (lo + hi) / 2
                if top(mid) > target:
                    hi = mid
                else:
                    lo = mid
            A = (lo + hi) / 2
        for d, b_, g_, n_ in zip(ds, B, G, N):
            heights[(x, d)] = b_ + A * g_ + n_
    bl = Builder()
    for d in ds:
        for x in xs:
            bl.vert((x, d, heights[(x, d)]))
    nx = len(xs)
    for j in range(len(ds) - 1):
        for i in range(nx - 1):
            bl.face([j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i])
    ob = bl.build('Far land', [mats['ground']], coll, smooth=True)
    a = ob.data.attributes.new('rock', 'FLOAT', 'POINT')
    a.data.foreach_set('value', [.15 + .2 * noise.noise(Vector((x * .05, d * .05, 3.3))) for d in ds for x in xs])
    return [ob]


def build_grove(coll, mats):
    rng = random.Random(21)
    bl = Builder()
    for (x, trunk, r, back) in GROVE:
        d = r + 3 + (3 / SIN_T if back else 0)      # the papercut "back row" sat 3 units higher
        hb = surf_h(x, d)
        ch = hb + (trunk + r - 1.5) / COS_T
        lobes = [(x, d, ch, r, r * rng.uniform(.85, 1.0), r * .88)]
        for (dx, dy, rr) in ((-.62, .28, .64), (.6, .32, .58), (.12, -.52, .56)):
            lobes.append((x + dx * r, d + rng.uniform(-.35, .35) * r, ch - dy * r / COS_T, rr * r, rr * r * rng.uniform(.85, 1.05), rr * r * .9))
        for _ in range(2):  # volume toward the back
            lobes.append((x + rng.uniform(-.4, .4) * r, d + rng.uniform(.3, .55) * r, ch + rng.uniform(-.2, .2) * r, .55 * r, .55 * r, .5 * r))
        base = (x + rng.uniform(-.5, .5), d, hb - 1.5)
        top = (x + rng.uniform(-1, 1), d + rng.uniform(-1, 1), ch - .2 * r)
        mid = ((base[0] + top[0]) / 2 + rng.uniform(-.8, .8), d, (base[2] + top[2]) / 2)
        rt = max(.9, r * .085)
        stem(bl, rng, [base, mid, top], rt, rt * .6, 0)
        for lb in lobes[1:4]:
            start = Vector(mid).lerp(Vector(top), rng.uniform(.3, .8))
            end = Vector((lb[0], lb[1], lb[2])).lerp(start, .25)
            stem(bl, rng, [tuple(start), tuple(end)], rt * .5, rt * .25, 0, 5)
        tint = (rng.uniform(.92, 1.06), rng.uniform(.95, 1.08), rng.uniform(.9, 1.0))
        crown(bl, rng, lobes, 4.2, 2.3, tint, 1, 2)
    return [bl.build('Grove', [mats['bark'], mats['leaves_oak'], mats['core_oak']], coll)]


def build_orchard(coll, mats):
    """Planted olives: identical trees (one seed), one straight row, fixed spacing."""
    bl = Builder()
    for x in ORCHARD:
        rng = random.Random(77)
        d = 13.0
        hb = surf_h(x, d)
        ch = hb + (ORCHARD_T + ORCHARD_R - 1.5) / COS_T
        r = ORCHARD_R
        lobes = [(x, d, ch, r * 1.05, r, r * .82),
                 (x - .45 * r, d - .2 * r, ch - .15 * r, .55 * r, .55 * r, .5 * r),
                 (x + .5 * r, d + .15 * r, ch - .1 * r, .55 * r, .55 * r, .5 * r),
                 (x + .05 * r, d + .1 * r, ch + .38 * r, .5 * r, .5 * r, .42 * r)]
        base = (x, d, hb - 1.5)
        fork = (x + .4, d, hb + 3.2)
        stem(bl, rng, [base, fork], 1.55, 1.25, 0, 8)
        stem(bl, rng, [fork, (x - 2.6, d - .6, ch - 1.5)], 1.0, .55, 0, 6)
        stem(bl, rng, [fork, (x + 2.8, d + .7, ch - 1.0)], .95, .5, 0, 6)
        crown(bl, rng, lobes, 3.4, 2.4, (1, 1, 1), 1, 2, .25)
    return [bl.build('Orchard', [mats['bark_olive'], mats['leaves_olive'], mats['core_olive']], coll)]


def build_shrubs(coll, mats):
    rng = random.Random(31)
    bl = Builder()
    for (x, rx, ry) in SHRUBS:
        d = rx + 2.5
        hb = surf_h(x, d)
        ch = hb + (ry * .38) / COS_T
        lobes = [(x, d, ch, rx, rx * .85, ry * .78), (x - .72 * rx, d + rng.uniform(-.3, .3) * rx, ch - .28 * ry, .62 * rx, .6 * rx, .58 * ry),
                 (x + .35 * rx, d + .55 * rx, ch - .12 * ry, .6 * rx, .55 * rx, .52 * ry)]
        for _ in range(4):   # ragged top
            lobes.append((x + rng.uniform(-.9, .7) * rx, d + rng.uniform(-.3, .5) * rx, ch + rng.uniform(.1, .45) * ry,
                          .32 * rx, .3 * rx, .3 * ry))
        crown(bl, rng, lobes, 2.2, 2.6, (rng.uniform(.95, 1.08),) * 3, 1, 2, .35)
    return [bl.build('Shrubs', [mats['bark'], mats['leaves_scrub'], mats['core_scrub']], coll)]


def build_houses(coll, mats):
    # materials: 0 stone A, 1 plaster, 2 stone C, 3 tiles, 4 glass, 5 frame, 6 door, 7 concrete, 8 metal, 9 tank, 10 panel
    bl = Builder()
    walls = [0, 1, 2]
    for i, (x, w, hgt, flat) in enumerate(HOUSES):
        D = 18.0 if not flat else 16.0
        d0 = 4.0
        l, r = x - w / 2, x + w / 2
        gy = max(ground_y(l), ground_y(r)) + 1
        hb = h_for(gy, d0) - .6
        top = h_for(gy - hgt, d0)
        dc = d0 + D / 2
        yaw = math.radians(-12)
        rot = Matrix.Rotation(yaw, 3, 'Z')
        bl.xf = lambda p, rot=rot, x=x, dc=dc: rot @ (p - Vector((x, dc, 0))) + Vector((x, dc, 0))
        wm = walls[i]
        bl.box(l, r, d0, d0 + D, hb, top, wm, skip=('bottom',) + (() if flat else ('top',)))
        # plinth band
        bl.box(l - .25, r + .25, d0 - .25, d0 + D + .25, hb, hb + 1.6, 7, skip=('bottom', 'top'))
        if flat:
            # parapet, roof slab, solar water heater (tank + tilted collector)
            t = .8
            for (a0, a1, b0, b1) in ((l - .3, r + .3, d0 - .3, d0 + t), (l - .3, r + .3, d0 + D - t, d0 + D + .3),
                                     (l - .3, l + t, d0, d0 + D), (r - t, r + .3, d0, d0 + D)):
                bl.box(a0, a1, b0, b1, top, top + 3.0 / COS_T, 7, skip=('bottom',))
            cx = x + 2.5
            bl.prism((cx - 3.5, d0 + D * .62, top + 5.4), (cx + 3.5, d0 + D * .62, top + 5.4), 1.55, 1.55, 14, 9, caps=True)
            for sx in (-2.8, 2.8):
                bl.prism((cx + sx, d0 + D * .62, top), (cx + sx, d0 + D * .62, top + 4.2), .22, .22, 5, 8)
            # collector: tilted plate leaning back
            p0, p1 = (cx - 4, d0 + D * .3, top + .4), (cx + 4, d0 + D * .3, top + .4)
            q1, q0 = (cx + 4, d0 + D * .52, top + 4.6), (cx - 4, d0 + D * .52, top + 4.6)
            bl.quad([p0, p1, q1, q0], 10)
            bl.quad([q0, q1, p1, p0], 8)
        else:
            ridge = top + 10 / COS_T
            he = top - .5 / COS_T
            xl, xr = l - 2.5, r + 2.5
            dA, dB = d0 - 1.8, d0 + D + 1.8
            th = .9
            # gable wall up to the ridge
            bl.quad([(l, d0, top), (r, d0, top), (x, d0, ridge - th)], wm)
            bl.quad([(r, d0 + D, top), (l, d0 + D, top), (x, d0 + D, ridge - th)], wm)
            # roof slopes (tiles on top, fascia edge at the front)
            bl.quad([(xl, dA, he), (x, dA, ridge), (x, dB, ridge), (xl, dB, he)], 3)
            bl.quad([(x, dA, ridge), (xr, dA, he), (xr, dB, he), (x, dB, ridge)], 3)
            bl.quad([(xl, dA, he - th), (x, dA, ridge - th), (x, dA, ridge), (xl, dA, he)], 7)
            bl.quad([(x, dA, ridge - th), (xr, dA, he - th), (xr, dA, he), (x, dA, ridge)], 7)
            bl.quad([(xl, dB, he - th), (xl, dA, he - th), (x, dA, ridge - th), (x, dB, ridge - th)], 7)
            bl.quad([(x, dB, ridge - th), (x, dA, ridge - th), (xr, dA, he - th), (xr, dB, he - th)], 7)
        # windows and door on the front face
        f = d0 - .02

        def window(wx0, wz0, ww, wh):
            bl.quad([(wx0, f, wz0), (wx0 + ww, f, wz0), (wx0 + ww, f, wz0 + wh), (wx0, f, wz0 + wh)], 4)
            fr = .45
            bl.box(wx0 - fr, wx0 + ww + fr, f - .35, f, wz0 + wh, wz0 + wh + fr, 5, skip=('back',))
            bl.box(wx0 - fr, wx0, f - .35, f, wz0, wz0 + wh, 5, skip=('back',))
            bl.box(wx0 + ww, wx0 + ww + fr, f - .35, f, wz0, wz0 + wh, 5, skip=('back',))
            bl.box(wx0 + ww / 2 - .12, wx0 + ww / 2 + .12, f - .2, f, wz0, wz0 + wh, 5, skip=('back',))
            bl.box(wx0 - .8, wx0 + ww + .8, f - .9, f, wz0 - .6, wz0, 7, skip=('back',))   # sill

        story = (top - hb) / (2 if flat else 1)
        for s in range(2 if flat else 1):
            z = hb + s * story
            if flat:
                window(l + 2.6, z + story * .42, 5.0, 5.2)
                if s == 1:
                    window(x + 2.2, z + story * .42, 5.0, 5.2)
            else:
                window(l + 2.6, z + story * .42, 5.2, 5.0)
                window(r - 7.8, z + story * .42, 5.2, 5.0)
        dx0 = x - 2.2 if not flat else x + 2.4
        bl.quad([(dx0, f, hb + 1.0), (dx0 + 4.4, f, hb + 1.0), (dx0 + 4.4, f, hb + 9.2), (dx0, f, hb + 9.2)], 6)
        bl.box(dx0 - .45, dx0 + 4.85, f - .3, f, hb + 9.2, hb + 9.7, 5, skip=('back',))
        bl.box(dx0 - 1.2, dx0 + 5.6, f - 2.2, f, hb + .3, hb + 1.0, 7, skip=('back',))   # step
        bl.xf = None
    ob = bl.build('Houses', [mats['stone_a'], mats['plaster'], mats['stone_c'], mats['tiles'], mats['glass'], mats['frame'],
                             mats['door'], mats['concrete'], mats['metal'], mats['tank'], mats['panel']], coll)
    return [ob]


def build_road(coll, mats):
    xs = [496 + .5 * i for i in range(int((W + 10 - 496) / .5) + 1)]
    bl = Builder()       # asphalt
    sh = Builder()       # gravel shoulders
    dash = Builder()     # centre line
    edge = Builder()     # asphalt section where the cut face slices the road

    def span(x):
        c = road_centre(x)
        return c - ROAD_HW, c + ROAD_HW

    lift = .35
    rows = []
    for x in xs:
        a, b = span(x)
        if b <= 0:
            rows.append(None); continue
        a0 = max(0.0, a)
        rows.append([(x, a0 + (b - a0) * k / 8, h_front(x) + lift) for k in range(9)])
    for i in range(len(xs) - 1):
        r0, r1 = rows[i], rows[i + 1]
        if r0 is None or r1 is None:
            continue
        for k in range(8):
            bl.quad([r1[k], r0[k], r0[k + 1], r1[k + 1]][::-1], 0)
    # shoulders: 2.4 units of gravel beside the far edge (and the near edge once it is on the slab)
    for i in range(len(xs) - 1):
        x0, x1 = xs[i], xs[i + 1]
        for side in (-1, 1):
            pts = []
            for x in (x0, x1):
                a, b = span(x)
                e = b if side > 0 else a
                lo, hi = (e, e + 2.4) if side > 0 else (e - 2.4, e)
                lo, hi = max(0.0, lo), max(0.0, hi)
                pts.append((x, lo, hi))
            if pts[0][2] - pts[0][1] < .05 or pts[1][2] - pts[1][1] < .05:
                continue
            (xa, la, ha), (xb, lb, hb_) = pts
            sh.quad([(xa, la, h_front(xa) + .18), (xb, lb, h_front(xb) + .18), (xb, hb_, h_front(xb) + .18), (xa, ha, h_front(xa) + .18)], 0)
    # the road's own section on the cut plane: a thin dark asphalt line on the soil
    for i in range(len(xs) - 1):
        x0, x1 = xs[i], xs[i + 1]
        a0, b0 = span(x0); a1, b1 = span(x1)
        if a0 < 0 < b0 and a1 < 0 < b1:
            edge.quad([(x0, -.01, h_front(x0) - .6), (x1, -.01, h_front(x1) - .6), (x1, -.01, h_front(x1) + lift), (x0, -.01, h_front(x0) + lift)], 0)
    # centre dashes (6 on, 5 off — the papercut road's dash)
    x = 520.0
    while x < W + 8:
        pts = []
        for xx in (x, x + 6):
            c = road_centre(xx)
            pts.append((xx, c, h_front(xx) + lift + .06))
        (xa, ca, za), (xb, cb, zb) = pts
        if ca - .4 > 0:
            dash.quad([(xa, ca - .4, za), (xb, cb - .4, zb), (xb, cb + .4, zb), (xa, ca + .4, za)], 0)
        x += 11
    out = [bl.build('Road', [mats['asphalt']], coll), sh.build('Shoulders', [mats['gravel']], coll),
           dash.build('Road paint', [mats['road_paint']], coll)]
    if edge.f:
        out.append(edge.build('Road section', [mats['asphalt_dark']], coll))
    out.append(build_car(coll, mats, CAR_X, road_centre(CAR_X) - 4.6, h_front(CAR_X) + lift))
    return out


def build_car(coll, mats, x, d, hr):
    """Small sedan heading +x on the near (right-hand) lane; side profile from the papercut car."""
    halfw = 4.7
    body = [(-12.3, 2.4), (-10.3, 2.4)] + [(-7 + 3.15 * math.cos(a), 2.6 + 3.15 * math.sin(a)) for a in np.linspace(math.pi, 0, 9)] + \
        [(-3.85, 2.4), (4.35, 2.4)] + [(7.5 + 3.15 * math.cos(a), 2.6 + 3.15 * math.sin(a)) for a in np.linspace(math.pi, 0, 9)] + \
        [(10.65, 2.4), (12.5, 2.6), (12.75, 4.6), (12.4, 6.6), (11.2, 7.8), (8.6, 8.35), (-6.2, 8.6), (-11.0, 8.4), (-12.2, 7.4), (-12.5, 5.2)]
    cabin = [(-6.4, 8.3), (8.7, 8.2), (5.0, 12.7), (-3.1, 12.9), (-6.4, 8.6)]

    def extrude(name, prof, w, mat_side, mat_slope=None):
        bm = bmesh.new()
        vs = [bm.verts.new(world((x + px, d - w, hr + pz))) for (px, pz) in prof]
        f = bm.faces.new(vs)
        bmesh.ops.recalc_face_normals(bm, faces=[f])
        r = bmesh.ops.extrude_face_region(bm, geom=[f])
        nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, verts=nv, vec=Vector((0, 2 * w * S, 0)))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        me.materials.append(mats[mat_side])
        if mat_slope:
            me.materials.append(mats[mat_slope])
            for p in me.polygons:
                n = p.normal
                if abs(n.y) < .5 and n.z > .25 and abs(n.x) > .3:
                    p.material_index = 1
        ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
        bev = ob.modifiers.new('Bevel', 'BEVEL'); bev.width = .55 * S; bev.segments = 3; bev.limit_method = 'ANGLE'
        bev.angle_limit = math.radians(40)
        for p in me.polygons:
            p.use_smooth = True
        try:
            ob.modifiers.new('WN', 'WEIGHTED_NORMAL')
        except Exception:
            pass
        return ob

    parts = [extrude('Car body', body, halfw, 'paint'), extrude('Car cabin', cabin, halfw - .75, 'paint', 'glass')]
    bl = Builder()
    # side windows on both flanks, B-pillar, lights, mirrors, tyres
    win = [(-5.3, 8.95), (7.3, 8.9), (4.5, 12.05), (-2.7, 12.25)]
    for side in (-1, 1):
        y = d + side * (halfw - .72)
        pts = [(x + px, y, hr + pz) for (px, pz) in win]
        bl.quad(pts if side < 0 else pts[::-1], 0)
        yp = y + side * .012
        pil = [(x + .55, yp, hr + 8.9), (x + 1.25, yp, hr + 8.9), (x + 1.25, yp, hr + 12.2), (x + .55, yp, hr + 12.2)]
        bl.quad(pil if side < 0 else pil[::-1], 1)
    bl.box(x + 12.45, x + 12.85, d - halfw + .5, d - halfw + 2.4, hr + 5.3, hr + 6.4, 2, skip=('back',))
    bl.box(x + 12.45, x + 12.85, d + halfw - 2.4, d + halfw - .5, hr + 5.3, hr + 6.4, 2, skip=('back',))
    bl.box(x - 12.75, x - 12.4, d - halfw + .5, d - halfw + 2.2, hr + 5.6, hr + 6.8, 3, skip=('front',))
    bl.box(x + 7.0, x + 8.2, d - halfw - 1.1, d - halfw + .2, hr + 8.6, hr + 9.6, 1)
    for wx in (-7.0, 7.5):
        for side in (-1, 1):
            y0 = d + side * (halfw - .35)
            y1 = d + side * (halfw - 2.2)
            bl.prism((x + wx, y0, hr + 2.6), (x + wx, y1, hr + 2.6), 2.6, 2.6, 24, 4, caps=True)
            bl.prism((x + wx, y0 + side * -.02, hr + 2.6), (x + wx, y0 + side * .05, hr + 2.6), 1.55, 1.55, 18, 5, caps=True)
    parts.append(bl.build('Car details', [mats['glass'], mats['paint'], mats['headlight'], mats['taillight'], mats['tyre'], mats['rim']], coll, smooth=True))
    return parts


def build_power(coll, mats):
    bl = Builder()
    ins = Builder()
    arm_dir = Vector((math.cos(math.radians(35)), math.sin(math.radians(35)), 0))
    dP = 36.0
    tips = {}
    for px in PYLONS:
        hb = surf_h(px, dP) - 1.2
        ht = h_for(ground_y(px) - PYLON_H, dP)
        Hp = ht - hb
        half = lambda h: 8 - 6 * (h - hb) / Hp                     # 8 at the ground → 2 at the top
        corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
        P = lambda c, h: Vector((px + c[0] * half(h), dP + c[1] * half(h), h))
        for c in corners:
            bl.prism(P(c, hb), P(c, ht), .62, .42, 6, 0)
            bl.box(px + c[0] * 8 - 1.5, px + c[0] * 8 + 1.5, dP + c[1] * 8 - 1.5, dP + c[1] * 8 + 1.5, hb - .5, hb + 1.4, 1)
        levels = [ht - 8 / COS_T - (Hp - 8 / COS_T) * i / 5 for i in range(6)]
        levels = sorted(levels + [ht])
        for i in range(len(levels)):
            h = levels[i]
            for k in range(4):
                bl.prism(P(corners[k], h), P(corners[(k + 1) % 4], h), .26, .26, 4, 0)
            if i < len(levels) - 1:
                h2 = levels[i + 1]
                for k in range(4):
                    c0, c1 = corners[k], corners[(k + 1) % 4]
                    bl.prism(P(c0, h), P(c1, h2), .22, .22, 4, 0)
                    bl.prism(P(c1, h), P(c0, h2), .22, .22, 4, 0)
        # earth-wire peak
        apex = Vector((px, dP, ht + 5 / COS_T))
        for c in corners:
            bl.prism(P(c, ht), apex, .3, .2, 4, 0)
        # cross-arms (top: 15 out, lower: 11 out, as on the papercut pylon) seen obliquely
        for (drop, reach) in ((8, 15), (20, 11)):
            ha = ht - drop / COS_T
            for s in (-1, 1):
                tip = Vector((px, dP, ha)) + arm_dir * (s * reach / arm_dir.x)
                side = Vector((-arm_dir.y, arm_dir.x, 0)) * 1.0
                root = Vector((px, dP, ha)) + arm_dir * (s * half(ha))
                for o in (-1, 1):
                    bl.prism(root + side * o, tip, .26, .2, 4, 0)
                    bl.prism(root + side * o + Vector((0, 0, 2.6)), tip + Vector((0, 0, .3)), .22, .18, 4, 0)
                for t in (.3, .6):
                    a = root.lerp(tip, t)
                    bl.prism(a, root.lerp(tip, t + .25) + Vector((0, 0, 2.6 * (1 - t - .25))), .16, .16, 4, 0)
                # insulator string: rod + glass discs, hanging 4 units
                hang = tip - Vector((0, 0, 4.0 / COS_T))
                ins.prism(tip, hang, .12, .12, 5, 1)
                for kk in range(6):
                    zc = tip.z - .5 - kk * .55
                    ins.prism(Vector((tip.x, tip.y, zc)), Vector((tip.x, tip.y, zc - .22)), .75, .75, 10, 0, caps=True)
                tips[(px, drop, s)] = hang
    # conductors: catenaries between the pylons, then off the right edge
    wires = Builder()

    def catenary(p0, p1, sag, n=48):
        prev = None
        for i in range(n + 1):
            t = i / n
            p = p0.lerp(p1, t) - Vector((0, 0, 4 * sag * t * (1 - t)))
            if prev is not None:
                wires.prism(prev, p, .3, .3, 5, 0)
            prev = p
    a, b = PYLONS
    for drop in (8, 20):
        for s in (-1, 1):
            pa, pb = tips[(a, drop, s)], tips[(b, drop, s)]
            catenary(pa, pb, 4.5 / COS_T)
            catenary(pb, Vector((W + 14, pb.y, pb.z - 4.0)), 2.5 / COS_T, 32)
    return [bl.build('Pylons', [mats['steel'], mats['concrete']], coll), ins.build('Insulators', [mats['insulator'], mats['steel']], coll, smooth=True),
            wires.build('Conductors', [mats['wire']], coll, smooth=True)]


def materials():
    imgs = {k: leaf_atlas(k) for k in ATLAS}
    return {
        'ground': ground_material('Bare ground'),
        'section': section_material(),
        'stone': tinted_material('Field stones', '#B9AE95', .85),
        'bark': bark_material('Bark', '#4A3F33'),
        'bark_olive': bark_material('Olive bark', '#6A6455'),
        'leaves_oak': leaf_material('Oak leaves', imgs['oak'], '#5E6B2E'),
        'leaves_olive': leaf_material('Olive leaves', imgs['olive'], '#7C8456'),
        'leaves_scrub': leaf_material('Scrub leaves', imgs['scrub'], '#5A6430'),
        'core_oak': tinted_material('Oak crown core', '#24301A', .9),
        'core_olive': tinted_material('Olive crown core', '#3F4733', .9),
        'core_scrub': tinted_material('Scrub core', '#29331C', .9),
        'stone_a': stone_wall_material('Stone cladding A', '#D6C9AC', '#CBBC9C'),
        'stone_c': stone_wall_material('Stone cladding C', '#CDBE9F', '#C2B291'),
        'plaster': plaster_material('Plaster', '#E8E2D5'),
        'tiles': tile_material('Roof tiles'),
        'glass': glass_material(),
        'frame': new_material('Window frames', '#E4E2DC', .5),
        'door': new_material('Door', '#5E4634', .6),
        'concrete': new_material('Concrete', '#BDB6A8', .9),
        'metal': new_material('Galvanised steel', '#9EA2A3', .45, .8),
        'tank': new_material('Water tank', '#EDEDE8', .35),
        'panel': new_material('Solar collector', '#1F2D3D', .15, .2),
        'asphalt': asphalt_material(),
        'asphalt_dark': new_material('Asphalt section', '#2E2F2D', .9),
        'gravel': tinted_material('Gravel shoulder', '#A69C88', .95),
        'road_paint': new_material('Road paint', '#E6E2D8', .6),
        'paint': paint_material('#7FA4B4'),
        'headlight': new_material('Headlight', '#F2F0E6', .15),
        'taillight': new_material('Tail light', '#8E1E1A', .3),
        'tyre': new_material('Tyre', '#1C1C1C', .8),
        'rim': new_material('Rim', '#B9BCBE', .3, .9),
        'steel': new_material('Pylon steel', '#7F8589', .5, .7),
        'insulator': glass_material('#5C7470'),
        'wire': new_material('Conductor', '#3E4245', .45, .7),
    }


COVER = ('grove', 'shrubs', 'houses', 'orchard', 'road', 'power')
PASSES = ('far', 'relief') + tuple('shadow-' + k for k in COVER) + COVER
SAMPLES = {'far': 64, 'relief': 128, 'shadow': 96, 'grove': 256, 'shrubs': 256, 'orchard': 256, 'houses': 160, 'road': 160, 'power': 160}


def build():
    mats = materials()
    groups = {'far': build_far(collection('far'), mats), 'relief': build_slab(collection('relief'), mats)}
    builders = {'grove': build_grove, 'shrubs': build_shrubs, 'houses': build_houses, 'orchard': build_orchard,
                'road': build_road, 'power': build_power}
    for k in COVER:
        obs = []
        for o in builders[k](collection(k), mats):
            obs += o if isinstance(o, list) else [o]
        groups[k] = obs
    return groups


def configure(groups, name):
    for objs in groups.values():
        for ob in objs:
            ob.hide_render = True
            ob.is_holdout = False
            ob.is_shadow_catcher = False
            ob.visible_camera = True
            ob.visible_shadow = True
    if name in ('far', 'relief'):
        for ob in groups[name]:
            ob.hide_render = False
    elif name.startswith('shadow-'):
        # what one land-cover item casts on the bare ground (dimmed with its item on the page)
        for ob in groups['relief']:
            ob.hide_render = False
            ob.is_shadow_catcher = True
        for ob in groups[name[len('shadow-'):]]:
            ob.hide_render = False
            ob.visible_camera = False
            # flat road layers sit on the ground: they cast nothing worth showing
            if ob.name in ('Road', 'Shoulders', 'Road paint', 'Road section'):
                ob.visible_shadow = False
    else:
        for ob in groups['relief']:
            ob.hide_render = False
            ob.is_holdout = True
        for ob in groups[name]:
            ob.hide_render = False


def svg_of(co):
    sc = bpy.context.scene
    p = world_to_camera_view(sc, sc.camera, co)
    return (p.x * W, (1 - p.y) * H)


def verify():
    worst = 0
    for x in (0, 120, 178, 236, 318, 414, 470, 598, 640):
        gx, gy = svg_of(world((x, 0, h_front(x))))
        worst = max(worst, abs(gx - x), abs(gy - ground_y(x)))
    print(f'cut edge vs groundY: max error {worst:.4f} svg units', flush=True)
    assert worst < .05, 'camera does not match the SVG board'


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    todo = args or list(PASSES)
    sc = setup()
    groups = build()
    bpy.context.view_layer.update()
    verify()
    for name in todo:
        configure(groups, name)
        sc.cycles.samples = max(8, int(SAMPLES[name.split('-')[0]] * SAMPLE_SCALE))
        sc.render.filepath = os.path.join(OUT, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('PASS', name, flush=True)
    print('RELIEF COVER RENDERS COMPLETE', flush=True)
