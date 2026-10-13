"""The look of the live "בשטח" model of „אותה גבעה, שלושה נופים” (ReliefCover3D.tsx).

Same render language as the lesson's other realistic boards (render_relief_cover.py,
render_measurement_landscape.py): Cycles, CC0 photo textures, leaf-card trees, one sun.
Everything is built from export_relief_cover_model.mjs's files — the same heights, trees,
shrubs and houses the page's map is drawn from — in true metres with the ground VEX× high,
exactly as the live mesh (reliefCoverMesh.ts). Blender: X east, Y north, Z up.

Straight-down orthographic renders, draped UNLIT on the live mesh (like the globe's imagery):
    outer         the whole ground out to the horizon, 4 m/px            (bare)
    mid           a ring around the sheet, 0.5 m/px                      (bare)
    bare · grove · built · quarry
                  the sheet's GROUND, 0.25 m/px — one per state: the shadows its land cover
                  casts (the objects hidden from the camera); the quarried ground in `quarry`
    objects       the tops of every tree, shrub and house (RGBA, ground cut out): the page
                  builds them in 3D and drapes this on their crowns and roofs
Regions: DRAPE in reliefCoverMesh.ts. Sun: SUN_AZ / SUN_EL below (the page has no lights).

    node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/blender/export_relief_cover_model.mjs
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_relief_cover_model.py -- [pass ...]
    node scripts/blender/package_relief_cover_model.mjs

Ground textures: Poly Haven (CC0) — rocky_terrain_03, dry_ground_rocks, rock_face — fetched once into qa-output/relief-cover-model/polyhaven/.
Quick look: RCM_PX=0.25 RCM_SAMPLES=0.25 renders small drafts. `look` renders a small
oblique preview of the sheet (look-dev only).
"""
import bpy, json, math, os, random, sys, urllib.request, zlib
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render_relief_cover as rc  # material helpers, leaf atlases, leaf-card crowns

ROOT = os.path.abspath(os.path.join(HERE, '../..'))
DATA = os.path.join(ROOT, 'qa-output/relief-cover-model')
PH = os.path.join(DATA, 'polyhaven')
OUT = os.path.join(DATA, 'renders')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PH, exist_ok=True)

PXF = float(os.environ.get('RCM_PX', 1))
SAMPLE_SCALE = float(os.environ.get('RCM_SAMPLES', 1))
# from north, clockwise; degrees above the horizon. A late-morning aerial: high enough that no
# slope of the VEX-high hill falls into its own black shadow, from the south-west so the slopes
# facing the page's opening view are lit and the relief still reads by light and shade.
SUN_AZ, SUN_EL = 225.0, 55.0

M = json.load(open(os.path.join(DATA, 'model.json'), encoding='utf-8'))
VEX, DATUM = M['vex'], M['datum']
CX, CY = M['center']['x'], M['center']['y']
GX = np.array(M['grid']['xs'], np.float64)
GY = np.array(M['grid']['ys'], np.float64)
GROUND = np.fromfile(os.path.join(DATA, 'ground.bin'), np.float32).reshape(len(GY), len(GX), 3)


def W(x, y, h, lift=0.0):
    """Sheet point (x east, y south) at ground height h (m), `lift` true metres above it."""
    return Vector((x - CX, -(y - CY), (h - DATUM) * VEX + lift))


# ── Textures ────────────────────────────────────────────────────────────────
PH_SETS = {'rocky_terrain_03': 90.0, 'dry_ground_rocks': 4.0, 'rock_face': 2.38}   # tile size (m)


def ph(name):
    path = os.path.join(PH, f'{name}_diff_2k.jpg')
    if not os.path.exists(path):
        url = f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/{name}/{name}_diff_2k.jpg'
        print('fetching', url, flush=True)
        urllib.request.urlretrieve(url, path)
    return path


# ── Node helpers (on top of render_relief_cover's) ──────────────────────────
def uv_vec(ns, lk, tile, deg=0.0, off=(0.0, 0.0)):
    """The ground's metre UV, scaled to one tile of `tile` metres, turned and shifted."""
    u = ns.new('ShaderNodeUVMap'); u.uv_map = 'uv'
    v = u.outputs[0]
    if deg:
        r = ns.new('ShaderNodeVectorRotate'); r.rotation_type = 'Z_AXIS'; r.inputs['Angle'].default_value = math.radians(deg)
        lk.new(v, r.inputs['Vector']); v = r.outputs[0]
    m = ns.new('ShaderNodeMapping')
    m.inputs['Scale'].default_value = (1 / tile, 1 / tile, 1)
    m.inputs['Location'].default_value = (off[0], off[1], 0)
    lk.new(v, m.inputs['Vector'])
    return m.outputs[0]


def img(ns, lk, path, vec, proj='FLAT'):
    t = ns.new('ShaderNodeTexImage'); t.image = rc.image(path); t.projection = proj
    if proj == 'BOX':
        t.projection_blend = .35
    t.interpolation = 'Cubic'
    lk.new(vec, t.inputs['Vector'])
    return t.outputs['Color']


def lum(ns, lk, col):
    b = ns.new('ShaderNodeRGBToBW'); lk.new(col, b.inputs[0])
    return b.outputs[0]


def palette(ns, lk, fac, stops):
    """Map a 0…1 value onto a colour ramp [(pos, hex), …]: the texture gives the light and dark,
    the palette the colour — so every source photo lands in the same dry Mediterranean range."""
    cr = ns.new('ShaderNodeValToRGB')
    el = cr.color_ramp.elements
    while len(el) > 1:
        el.remove(el[-1])
    el[0].position, el[0].color = stops[0][0], rc.rgba(stops[0][1])
    for p, c in stops[1:]:
        e = el.new(p); e.color = rc.rgba(c)
    lk.new(fac, cr.inputs[0])
    return cr.outputs[0]


def noise(ns, lk, scale_m, detail=4.0, rough=.55, w=0.0):
    tc = ns.new('ShaderNodeTexCoord')
    n = ns.new('ShaderNodeTexNoise'); n.noise_dimensions = '4D'
    n.inputs['Scale'].default_value = 1 / scale_m; n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough; n.inputs['W'].default_value = w
    lk.new(tc.outputs['Object'], n.inputs['Vector'])
    return n.outputs['Fac']


def math_(ns, lk, op, a, b=None, c=None, clamp=False):
    m = ns.new('ShaderNodeMath'); m.operation = op; m.use_clamp = clamp
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            lk.new(v, m.inputs[i])
    return m.outputs[0]


# ── Materials ───────────────────────────────────────────────────────────────
def ground_material():
    """Summer hill country: straw-dry grass, patches of terra-rossa soil, grey limestone
    breaking through on the steeper ground — no green (inside this lesson green means
    vegetation). Where the quarry cut (attribute 'rock'): fresh pale limestone and a dusty yard."""
    m = rc.new_material('Ground', '#B9A57A', rough=.95)
    ns, lk, bs = rc.nodes(m)
    soil_p = ph('dry_ground_rocks'); out_p = ph('rocky_terrain_03'); face_p = ph('rock_face')
    # dry grass. From the model's distance the ground reads by its 10–200 m variation, not its
    # grain: broad noise sets the tone, the photos (two scales, turned) only add grain, softly,
    # so no tile repeat shows.
    # grain: procedural, never a photo — over a 500 m sheet any photo tile shows as a grid.
    # Stones: the near cells of a fine Voronoi.
    tc_g = ns.new('ShaderNodeTexCoord')
    # (at 0.25 m/px only detail of a metre or more survives the render)
    vor = ns.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 1 / 2.4; vor.inputs['Randomness'].default_value = 1
    lk.new(tc_g.outputs['Object'], vor.inputs['Vector'])
    stones = rc.ramp(ns, lk, vor.outputs['Distance'], .2, .08)
    grain = math_(ns, lk, 'MULTIPLY_ADD', stones, .2, math_(ns, lk, 'MULTIPLY', noise(ns, lk, 2.6, 8, .7, 6.6), .75))
    broad = noise(ns, lk, 70, 4, .55, 1.7)
    mid_ = noise(ns, lk, 14, 5, .6, 3.3)
    t = math_(ns, lk, 'MULTIPLY_ADD', broad, .5, 0.0)
    t = math_(ns, lk, 'MULTIPLY_ADD', mid_, .45, math_(ns, lk, 'SUBTRACT', t, .2))
    t = math_(ns, lk, 'MULTIPLY_ADD', grain, .55, math_(ns, lk, 'SUBTRACT', t, .2))
    # tussocks and stones at the metre scale — what a close look finds
    fine = noise(ns, lk, 1.2, 6, .7, 2.9)
    t = math_(ns, lk, 'MULTIPLY_ADD', fine, .3, math_(ns, lk, 'SUBTRACT', t, .15))
    straw = palette(ns, lk, t, [(0.0, '#6B624F'), (.3, '#8C7F64'), (.55, '#A59577'), (.8, '#BBAC8C'), (1.0, '#CBBEA0')])
    # soil: terra rossa with pebbles, in grazed patches and along gentle ground
    s1 = img(ns, lk, soil_p, uv_vec(ns, lk, 4.0, 11))
    s_l = rc.ramp(ns, lk, lum(ns, lk, s1), .09, .33)
    soil = palette(ns, lk, math_(ns, lk, 'MULTIPLY_ADD', s_l, .4, math_(ns, lk, 'MULTIPLY', mid_, .6)),
                   [(0.0, '#625446'), (.4, '#82705E'), (.75, '#9C8B77'), (1.0, '#B4A691')])
    # outcrops: the rock slabs of rocky_terrain_03 (where its red beats its green), turned grey
    o = img(ns, lk, out_p, uv_vec(ns, lk, 42.0, -21, (.17, .4)))
    sep = ns.new('ShaderNodeSeparateColor'); lk.new(o, sep.inputs[0])
    slab = rc.ramp(ns, lk, math_(ns, lk, 'SUBTRACT', sep.outputs[0], sep.outputs[1]), .005, .05)
    o_l = rc.ramp(ns, lk, lum(ns, lk, o), .02, .15)
    stone = palette(ns, lk, o_l, [(0.0, '#57534B'), (.35, '#7B766B'), (.7, '#958F82'), (1.0, '#A9A396')])
    # where each goes: steep ground (the VEX-high mesh's own normal) and broad noise
    geo = ns.new('ShaderNodeNewGeometry')
    nz = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Normal'], nz.inputs[0])
    steep = rc.ramp(ns, lk, nz.outputs['Z'], .97, .8)
    patch = noise(ns, lk, 30, 6, .6, 1.3)
    soil_m = math_(ns, lk, 'MULTIPLY', rc.ramp(ns, lk, patch, .6, .74), rc.ramp(ns, lk, steep, .9, .2))
    rock_n = noise(ns, lk, 26, 5, .6, 4.1)
    rock_f = math_(ns, lk, 'MULTIPLY_ADD', steep, .45, math_(ns, lk, 'SUBTRACT', rock_n, .42))
    rock_m = math_(ns, lk, 'MULTIPLY', math_(ns, lk, 'MULTIPLY', slab, .6), rc.ramp(ns, lk, rock_f, .36, .6))
    # limestone ledges: broken bands that follow the contours on the slopes (bedding outcrops, as
    # on any Judean hillside) — relief, not cover
    pz = ns.new('ShaderNodeSeparateXYZ'); lk.new(geo.outputs['Position'], pz.inputs[0])
    wob = math_(ns, lk, 'MULTIPLY_ADD', noise(ns, lk, 18, 3, .5, 5.2), 2.2, pz.outputs['Z'])
    band = math_(ns, lk, 'PINGPONG', wob, 3.2)
    ledge = rc.ramp(ns, lk, band, 1.3, .5)
    ledge = math_(ns, lk, 'MULTIPLY', ledge, rc.ramp(ns, lk, noise(ns, lk, 13, 4, .6, 7.3), .48, .62))
    ledge = math_(ns, lk, 'MULTIPLY', ledge, rc.ramp(ns, lk, steep, .12, .5))
    ledge_c = palette(ns, lk, math_(ns, lk, 'MULTIPLY_ADD', fine, .5, math_(ns, lk, 'MULTIPLY', o_l, .5)), [(0.0, '#857F73'), (.5, '#9E988B'), (1.0, '#B7B1A4')])
    col = rc.mix_rgb(ns, lk, soil_m, straw, soil)
    col = rc.mix_rgb(ns, lk, rock_m, col, stone)
    col = rc.mix_rgb(ns, lk, math_(ns, lk, 'MULTIPLY', ledge, .75), col, ledge_c)
    # the quarry: a dusty yard, then freshly cut limestone — tool-marked, stained, darker in the
    # corners of the benches (occlusion, below)
    rock = rc.attr(ns, 'rock')
    tc_f = ns.new('ShaderNodeTexCoord')
    def face_at(tile, off):
        mp = ns.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / tile,) * 3; mp.inputs['Location'].default_value = off
        lk.new(tc_f.outputs['Object'], mp.inputs['Vector'])
        return rc.ramp(ns, lk, lum(ns, lk, img(ns, lk, face_p, mp.outputs[0], 'BOX')), .04, .105)
    f_l = rc.mix_rgb(ns, lk, rc.ramp(ns, lk, noise(ns, lk, 12, 3, .5, 6.1), .35, .65), face_at(5.0, (0, 0, 0)), face_at(8.3, (.37, .71, .13)))
    f_l = rc.mix_rgb(ns, lk, .55, f_l, noise(ns, lk, 3, 6, .7, 9.4))
    stain = noise(ns, lk, 9, 5, .6, 8.8)
    fresh = palette(ns, lk, math_(ns, lk, 'MULTIPLY_ADD', f_l, .55, math_(ns, lk, 'MULTIPLY', stain, .45)),
                    [(0.0, '#777164'), (.35, '#9D9585'), (.65, '#B8B0A0'), (1.0, '#CEC7B7')])
    dust = palette(ns, lk, math_(ns, lk, 'MULTIPLY_ADD', s_l, .5, math_(ns, lk, 'MULTIPLY', stain, .5)), [(0.0, '#857C6D'), (1.0, '#B1A897')])
    col = rc.mix_rgb(ns, lk, rc.ramp(ns, lk, rock, .02, .3), col, dust)
    col = rc.mix_rgb(ns, lk, rc.ramp(ns, lk, rock, .35, .85), col, fresh)
    # occlusion: hollows, bench corners, the feet of walls and trees
    ao = ns.new('ShaderNodeAmbientOcclusion'); ao.samples = 8; ao.inputs['Distance'].default_value = 5.0
    lk.new(col, ao.inputs['Color'])
    col = rc.mix_rgb(ns, lk, .55, col, ao.outputs['Color'], 'MIX')
    lk.new(col, bs.inputs['Base Color'])
    # relief of the surface itself: slab edges, bench faces (soft — a sharp bump repeats with its tile)
    h = math_(ns, lk, 'MULTIPLY_ADD', rock_m, o_l, math_(ns, lk, 'MULTIPLY', rc.ramp(ns, lk, rock, .35, .85), f_l))
    rc.bump_from(ns, lk, bs, h, .35, .03)
    return m


def materials():
    imgs = {k: rc.leaf_atlas(k) for k in ('oak', 'olive', 'scrub')}
    return {
        'ground': ground_material(),
        'bark': rc.bark_material('Bark', '#4A3F33'),
        'bark_olive': rc.bark_material('Olive bark', '#6A6455'),
        'leaves_oak': rc.leaf_material('Oak leaves', imgs['oak'], '#5E6B2E'),
        'leaves_olive': rc.leaf_material('Olive leaves', imgs['olive'], '#7C8456'),
        'leaves_scrub': rc.leaf_material('Scrub leaves', imgs['scrub'], '#5A6430'),
        'core_oak': rc.tinted_material('Oak crown core', '#24301A', .9),
        'core_pine': rc.tinted_material('Pine crown core', '#1C2615', .9),
        'core_olive': rc.tinted_material('Olive crown core', '#3F4733', .9),
        'core_scrub': rc.tinted_material('Scrub core', '#29331C', .9),
        'stone_a': rc.stone_wall_material('Stone cladding A', '#C6B898', '#BBAC8C'),
        'plaster': rc.plaster_material('Plaster', '#D2CABA'),
        'roof': rc.plaster_material('Roof slab', '#A9A396'),
        'tiles': rc.new_material('Roof tiles', '#A35B3B', .72),
        'concrete': rc.new_material('Concrete', '#9D978B', .9),
        'metal': rc.new_material('Galvanised steel', '#9EA2A3', .45, .8),
        'tank': rc.new_material('Water tank', '#C9C9C4', .35),
        'panel': rc.new_material('Solar collector', '#1F2D3D', .15, .2),
    }


# ── Ground ──────────────────────────────────────────────────────────────────
def build_ground(coll, mat, quarried):
    ny, nx = len(GY), len(GX)
    X, Y = np.meshgrid(GX, GY)
    Z = (GROUND[:, :, 1 if quarried else 0] - DATUM) * VEX
    co = np.stack([X - CX, -(Y - CY), Z], axis=-1).reshape(-1, 3).astype(np.float32)
    i = np.arange(nx - 1)[None, :] + (np.arange(ny - 1) * nx)[:, None]
    i = i.ravel()
    # quads wound counter-clockwise seen from above (+Z): sheet y runs south = −Y
    quads = np.stack([i, i + nx, i + nx + 1, i + 1], axis=-1).astype(np.int32)
    me = bpy.data.meshes.new('Ground quarried' if quarried else 'Ground')
    me.vertices.add(len(co)); me.vertices.foreach_set('co', co.ravel())
    me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(quads), 4, np.int32))
    me.update(calc_edges=True)
    me.validate()
    uv = me.uv_layers.new(name='uv')
    uv.data.foreach_set('uv', co[quads.ravel(), :2].ravel())
    a = me.attributes.new('rock', 'FLOAT', 'POINT')
    a.data.foreach_set('value', (GROUND[:, :, 2] if quarried else np.zeros((ny, nx), np.float32)).ravel())
    me.shade_smooth()
    me.materials.append(mat)
    ob = bpy.data.objects.new(me.name, me)
    coll.objects.link(ob)
    return ob


# ── Trees, shrubs, houses ───────────────────────────────────────────────────
class Builder(rc.Builder):
    """render_relief_cover's mesh builder, in world metres (no svg transform)."""

    def vert(self, p):
        self.v.append(Vector(p))
        return len(self.v) - 1


def ring_lobes(rng, cx, cy, cz, r, rz, n, spread, size, lift=(-.25, .25)):
    out = []
    a0 = rng.uniform(0, 2 * math.pi)
    for k in range(n):
        a = a0 + 2 * math.pi * k / n + rng.uniform(-.35, .35)
        d = spread * r * rng.uniform(.8, 1.1)
        s = size * rng.uniform(.85, 1.15)
        out.append((cx + math.cos(a) * d, cy + math.sin(a) * d, cz + rng.uniform(*lift) * rz, s * r, s * r, s * rz))
    return out


def tree(bl, t, mi_bark, mi_leaf, mi_core):
    """One tree from the data (r crown radius, tall height): Aleppo pine — an open umbrella of
    clumps high on a bare trunk; oak — a broad dense dome; olive — a rounded silver crown."""
    rng = random.Random(zlib.crc32(t['id'].encode()))
    base = W(t['x'], t['y'], t['ground'])
    r, T = t['r'], t['tall']
    tone = t['tone']
    if t['kind'] == 'pine':
        hz = T * .2
        cz = base.z + T - hz
        lobes = [(base.x, base.y, cz + .1 * hz, .62 * r, .62 * r, .75 * hz)] + ring_lobes(rng, base.x, base.y, cz, r, hz, 5, .52, .5, (-.5, .3))
        trunk_top = Vector((base.x + rng.uniform(-.6, .6), base.y + rng.uniform(-.6, .6), cz - .6 * hz))
        tint = (.72 + .1 * tone, .82 + .08 * tone, .66 + .06 * tone)
        card, dens = 1.1, 2.4
    else:
        olive = t['kind'] == 'olive'
        hz = T * .42
        cz = base.z + T - hz
        lobes = [(base.x, base.y, cz, .8 * r, .8 * r, .8 * hz)] + ring_lobes(rng, base.x, base.y, cz, r, hz, 6 if not olive else 4, .48, .55, (-.35, .35))
        trunk_top = Vector((base.x, base.y, cz - .2 * hz))
        tint = ((.95 + .1 * tone, 1.0 + .06 * tone, .9) if not olive else (1.0 + .06 * tone,) * 3)
        card, dens = (1.0, 2.4) if not olive else (.75, 2.6)
    rt = .18 + .05 * r
    rc.stem(bl, rng, [tuple(base - Vector((0, 0, .5))), tuple(trunk_top)], rt, rt * .6, mi_bark)
    for lb in lobes[1:]:
        end = Vector(lb[:3]).lerp(trunk_top, .35)
        rc.stem(bl, rng, [tuple(trunk_top), tuple(end)], rt * .5, rt * .25, mi_bark, 5)
    rc.crown(bl, rng, lobes, card, dens, tint, mi_leaf, mi_core, .3)


def build_trees(coll, mats, trees, name, kind):
    bl = Builder()
    for t in trees:
        tree(bl, t, 0, 1, 2)
    if kind == 'olive':
        ms = [mats['bark_olive'], mats['leaves_olive'], mats['core_olive']]
    else:
        ms = [mats['bark'], mats['leaves_oak'], mats['core_oak']]
    return bl.build(name, ms, coll)


def build_pines_and_oaks(coll, mats, trees):
    # pines get their own darker core; the leaf atlas is shared, the per-card tint darkens them
    pines = [t for t in trees if t['kind'] == 'pine']
    oaks = [t for t in trees if t['kind'] != 'pine']
    a = build_trees(coll, mats, oaks, 'Grove oaks', 'oak')
    bl = Builder()
    for t in pines:
        tree(bl, t, 0, 1, 2)
    b = bl.build('Grove pines', [mats['bark'], mats['leaves_oak'], mats['core_pine']], coll)
    return [a, b]


def build_shrubs(coll, mats):
    bl = Builder()
    for s in M['shrubs']:
        rng = random.Random(zlib.crc32(s['id'].encode()))
        c = W(s['x'], s['y'], s['ground'])
        r = s['r']
        cz = c.z + .45 * r
        lobes = [(c.x, c.y, cz, .8 * r, .75 * r, .55 * r)] + ring_lobes(rng, c.x, c.y, cz, r, .55 * r, 4, .5, .55, (-.3, .3))
        k = .9 + .2 * s['tone']
        rc.crown(bl, rng, lobes, .55, 2.6, (k, k, k * .95), 1, 2, .35)
    return bl.build('Shrubs', [mats['bark'], mats['leaves_scrub'], mats['core_scrub']], coll)


FLOOR_H = 3.2


def build_houses(coll, mats):
    """Village houses on their own footprints: walls from just below the lowest corner, flat
    concrete roofs with a parapet and a solar water heater (as on any Israeli roof), or a
    tiled hip roof."""
    bl = Builder()
    MI = {'stone_a': 0, 'plaster': 1, 'roof': 2, 'tiles': 3, 'concrete': 4, 'metal': 5, 'tank': 6, 'panel': 7}
    for h in M['houses']:
        t = math.radians(h['angle'])
        c, s = math.cos(t), math.sin(t)
        z0 = (h['lo'] - DATUM) * VEX - .3
        z1 = (h['hi'] - DATUM) * VEX + h['floors'] * FLOOR_H

        def P(a, b, z, h=h, c=c, s=s):
            # house frame (a along w, b along d, map orientation) → world
            return Vector((h['x'] + a * c - b * s - CX, -(h['y'] + a * s + b * c - CY), z))

        def box(a0, a1, b0, b1, za, zb, mi, top_mi=None, P=P):
            q = [(a0, b0), (a1, b0), (a1, b1), (a0, b1)]
            for k in range(4):
                (pa, pb), (qa, qb) = q[k], q[(k + 1) % 4]
                bl.quad([P(pa, pb, za), P(qa, qb, za), P(qa, qb, zb), P(pa, pb, zb)][::-1], mi)
            bl.quad([P(a, b, zb) for a, b in q][::-1], mi if top_mi is None else top_mi)

        hw, hd = h['w'] / 2, h['d'] / 2
        wall = MI['stone_a'] if h['tone'] < .5 else MI['plaster']
        if h['roof'] == 'flat':
            box(-hw, hw, -hd, hd, z0, z1, wall, MI['roof'])
            p = .25
            for (a0, a1, b0, b1) in ((-hw, hw, -hd, -hd + p), (-hw, hw, hd - p, hd), (-hw, -hw + p, -hd, hd), (hw - p, hw, -hd, hd)):
                box(a0, a1, b0, b1, z1, z1 + .9, MI['concrete'])
            # solar water heater: tank on a frame, collector tilted to the south (map +b ≈ south)
            ax = hw * .35
            bz = -hd * .25
            tank = [P(ax - 1.1, bz - .6, z1 + 1.5), P(ax + 1.1, bz - .6, z1 + 1.5)]
            bl.prism(tank[0], tank[1], .32, .32, 12, MI['tank'], caps=True)
            pa, pb = bz - .2, bz + 1.7
            bl.quad([P(ax - 1.1, pb, z1 + .4), P(ax + 1.1, pb, z1 + .4), P(ax + 1.1, pa, z1 + 1.6), P(ax - 1.1, pa, z1 + 1.6)], MI['panel'])
            bl.quad([P(ax - 1.1, pa, z1 + 1.6), P(ax + 1.1, pa, z1 + 1.6), P(ax + 1.1, pb, z1 + .4), P(ax - 1.1, pb, z1 + .4)], MI['metal'])
            if h['floors'] == 2:   # the stair room onto the roof
                box(-hw + .5, -hw + 3.4, hd - 3.6, hd - .5, z1, z1 + 2.5, wall, MI['roof'])
            # an air-conditioner unit or two
            for k in range(1 + int(h['tone'] * 2)):
                a = -hw * .2 + k * 1.6
                box(a, a + .9, -hd + .6, -hd + 1.2, z1, z1 + .65, MI['concrete'])
        else:
            box(-hw, hw, -hd, hd, z0, z1, wall)
            o = .5
            L, S = (hw + o, hd + o)
            rh = 2.8
            if L >= S:
                ridge = max(0.0, L - S)
                e = [P(-L, -S, z1), P(L, -S, z1), P(L, S, z1), P(-L, S, z1)]
                r0, r1 = P(-ridge, 0, z1 + rh), P(ridge, 0, z1 + rh)
                bl.quad([e[0], e[1], r1, r0][::-1], MI['tiles'])
                bl.quad([e[2], e[3], r0, r1][::-1], MI['tiles'])
                bl.face([bl.vert(e[1]), bl.vert(e[2]), bl.vert(r1)][::-1], None, (1, 1, 1), MI['tiles'])
                bl.face([bl.vert(e[3]), bl.vert(e[0]), bl.vert(r0)][::-1], None, (1, 1, 1), MI['tiles'])
            else:
                ridge = max(0.0, S - L)
                e = [P(-L, -S, z1), P(L, -S, z1), P(L, S, z1), P(-L, S, z1)]
                r0, r1 = P(0, -ridge, z1 + rh), P(0, ridge, z1 + rh)
                bl.quad([e[1], e[2], r1, r0][::-1], MI['tiles'])
                bl.quad([e[3], e[0], r0, r1][::-1], MI['tiles'])
                bl.face([bl.vert(e[0]), bl.vert(e[1]), bl.vert(r0)][::-1], None, (1, 1, 1), MI['tiles'])
                bl.face([bl.vert(e[2]), bl.vert(e[3]), bl.vert(r1)][::-1], None, (1, 1, 1), MI['tiles'])
    order = sorted(MI, key=MI.get)
    return bl.build('Houses', [mats[k] for k in order], coll)


# ── Scene ───────────────────────────────────────────────────────────────────
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
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 6
    sc.render.film_transparent = False
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '8'
    # a photo's tone curve (the drape is shown as is, unlit): faithful colour, no filmic wash
    try:
        sc.view_settings.view_transform = os.environ.get('RCM_VIEW', 'Standard')
    except TypeError:
        sc.view_settings.view_transform = 'AgX'
    sc.view_settings.exposure = float(os.environ.get('RCM_EXP', -0.9))
    world = bpy.data.worlds.new('Sky'); sc.world = world; world.use_nodes = True
    ns, lk = world.node_tree.nodes, world.node_tree.links
    env = ns.new('ShaderNodeTexEnvironment'); env.image = rc.image(os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/env/sky.hdr'))
    bg = ns['Background']; bg.inputs[1].default_value = float(os.environ.get('RCM_SKY', .6))
    lk.new(env.outputs[0], bg.inputs[0])
    az, el = math.radians(SUN_AZ), math.radians(SUN_EL)
    to_sun = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
    sun_data = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_data)
    sc.collection.objects.link(sun)
    sun.rotation_euler = to_sun.to_track_quat('Z', 'Y').to_euler()
    sun_data.energy = float(os.environ.get('RCM_SUN', 3.2)); sun_data.angle = math.radians(1.2); sun_data.color = (1, .95, .87)
    # skylight from the side away from the sun (no shadows): shade is never black outdoors
    fill_d = bpy.data.lights.new('Sky fill', 'SUN'); fill = bpy.data.objects.new('Sky fill', fill_d)
    sc.collection.objects.link(fill)
    away = Vector((-to_sun.x, -to_sun.y, 1.3)).normalized()
    fill.rotation_euler = away.to_track_quat('Z', 'Y').to_euler()
    fill_d.energy = float(os.environ.get('RCM_FILL', 1.5)); fill_d.angle = math.radians(40); fill_d.color = (.86, .91, 1.0)
    fill_d.use_shadow = False
    cam_data = bpy.data.cameras.new('Drape'); cam_data.type = 'ORTHO'; cam_data.clip_end = 4000
    cam = bpy.data.objects.new('Drape', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    return sc


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def build():
    mats = materials()
    g = {}
    g['ground'] = [build_ground(collection('ground'), mats['ground'], False)]
    g['ground_q'] = [build_ground(collection('ground quarried'), mats['ground'], True)]
    print('ground built', flush=True)
    keep = set(M['cover']['quarry']['orchard'])
    g['grove'] = build_pines_and_oaks(collection('grove'), mats, M['grove'])
    g['shrubs'] = [build_shrubs(collection('shrubs'), mats)]
    g['orchard_keep'] = [build_trees(collection('orchard kept'), mats, [t for t in M['orchard'] if t['id'] in keep], 'Orchard (kept)', 'olive')]
    g['orchard_cut'] = [build_trees(collection('orchard cut'), mats, [t for t in M['orchard'] if t['id'] not in keep], 'Orchard (quarried away)', 'olive')]
    g['houses'] = [build_houses(collection('houses'), mats)]
    print('objects built', flush=True)
    return g


# what each state shows — checked against the page's COVER below
STATE_GROUPS = {
    'bare': ['ground'],
    'grove': ['ground', 'grove', 'shrubs'],
    'built': ['ground', 'orchard_keep', 'orchard_cut', 'houses'],
    'quarry': ['ground_q', 'orchard_keep', 'houses'],
}


def check_cover():
    ids = {'grove': {t['id'] for t in M['grove']}, 'shrubs': {s['id'] for s in M['shrubs']}, 'houses': {h['id'] for h in M['houses']}}
    keep = set(M['cover']['quarry']['orchard'])
    allo = {t['id'] for t in M['orchard']}
    have = {'orchard_keep': keep, 'orchard_cut': allo - keep}
    for st, groups in STATE_GROUPS.items():
        cv = M['cover'][st]
        want = {'grove': set(cv['grove']), 'shrubs': set(cv['shrubs']), 'houses': set(cv['houses']), 'orchard': set(cv['orchard'])}
        got = {'grove': ids['grove'] if 'grove' in groups else set(), 'shrubs': ids['shrubs'] if 'shrubs' in groups else set(),
               'houses': ids['houses'] if 'houses' in groups else set(),
               'orchard': set().union(*[have[k] for k in ('orchard_keep', 'orchard_cut') if k in groups])}
        assert want == got, f'state {st}: render groups do not match COVER'


GROUND_GROUPS = ('ground', 'ground_q')


def show(groups, names, objects_seen=True, holdout_ground=False):
    """Which groups render. objects_seen=False: the objects only cast their shadows (and shade the
    ground's sky) — the page draws them in 3D. holdout_ground: the ground is cut out (transparent)."""
    for k, obs in groups.items():
        for ob in obs:
            ob.hide_render = k not in names
            ob.visible_camera = objects_seen if k not in GROUND_GROUPS else True
            ob.is_holdout = holdout_ground and k in GROUND_GROUPS


def aim(sc, region):
    w, h = region['x1'] - region['x0'], region['y1'] - region['y0']
    sc.render.resolution_x = round(w / region['px'] * PXF)
    sc.render.resolution_y = round(h / region['px'] * PXF)
    cam = sc.camera
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = 'AUTO'
    cam.data.ortho_scale = max(w, h)
    cam.location = Vector(((region['x0'] + region['x1']) / 2 - CX, -((region['y0'] + region['y1']) / 2 - CY), 1500))
    cam.rotation_euler = (0, 0, 0)


def look(sc):
    """Look-dev only: the page's opening view (from the south, 32° down) of the sheet."""
    sc.render.resolution_x, sc.render.resolution_y = round(1000 * PXF), round(680 * PXF)
    cam = sc.camera
    cam.data.type = 'PERSP'; cam.data.sensor_fit = 'VERTICAL'; cam.data.angle = math.radians(31)
    tgt = Vector((0, -8, 30))
    p = math.radians(58)
    cam.location = tgt + Vector((0, -590 * math.sin(p), 590 * math.cos(p)))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()


SAMPLES = {'outer': 48, 'mid': 96, 'sheet': 160, 'objects': 160, 'look': 96}
# the sheet passes are the GROUND of each state (with its objects' shadows); 'objects' is the
# tops of every object of every state, alone on a transparent ground, which the page's 3D crowns
# and roofs wear (objects of different states never stand in the same place)
PASSES = ('outer', 'mid', 'bare', 'grove', 'built', 'quarry', 'objects')

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    todo = args or list(PASSES)
    check_cover()
    sc = setup()
    groups = build()
    for name in todo:
        state = name.split(':')[-1] if name.startswith('look') else name
        if name.startswith('look'):
            look(sc)
            show(groups, STATE_GROUPS.get(state if state != 'look' else 'built', STATE_GROUPS['built']))
            kind = 'look'
        elif name in ('outer', 'mid'):
            aim(sc, M['drape'][name]); show(groups, STATE_GROUPS['bare']); kind = name
        elif name == 'objects':
            aim(sc, M['drape']['sheet'])
            show(groups, ['ground', 'grove', 'shrubs', 'orchard_keep', 'orchard_cut', 'houses'], True, True)
            kind = 'objects'
        else:
            aim(sc, M['drape']['sheet']); show(groups, STATE_GROUPS[name], False); kind = 'sheet'
        sc.render.film_transparent = kind == 'objects'
        sc.render.image_settings.color_mode = 'RGBA' if kind == 'objects' else 'RGB'
        sc.cycles.samples = max(8, int(SAMPLES[kind] * SAMPLE_SCALE))
        sc.render.filepath = os.path.join(OUT, name.replace(':', '-') + '.png')
        bpy.ops.render.render(write_still=True)
        print('PASS', name, sc.render.resolution_x, sc.render.resolution_y, flush=True)
