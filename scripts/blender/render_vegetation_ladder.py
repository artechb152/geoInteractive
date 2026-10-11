"""Realistic side view for topic-02 „תצורות הצומח וגובהן” (VegetationLadder, LandCoverVisuals.tsx).

Same render language as the relief/cover side-section (render_relief_cover.py): a cut slab —
bare soil over terra-rossa and limestone — under the lessons' warm studio light, the repo's
CC0 photo textures and procedural leaf atlases. One orthographic camera, pitched down by
TILT, is locked to the ladder's viewBox (0 0 500 206): every formation stands on the ladder's
ground line (y = 184) in the middle of its 100-unit column and reaches exactly its schematic
height (16 / 34 / 70 / 112 / 164 units above the line), so the live height lines, the planted
frame and the hover columns of the papercut version (archived as VegetationLadderV1.tsx) still
fit.

    land          the slab: land surface behind the line + the cut face below it
    shadow-<k>    what formation k casts on the land (dimmed with its column on the page)
    herbaceous · batha · garrigue · grove · planted
                  one pass per formation; the land is a holdout

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_vegetation_ladder.py -- [pass ...]
    node scripts/blender/package_vegetation_ladder.cjs

Quick look: VL_PX=1 VL_SAMPLES=0.25 renders a 500 × 206 draft.
Keep the geometry block below in sync with LandCoverVisuals.tsx. No network.
"""
import bpy, bmesh, math, os, random, sys
import numpy as np
from mathutils import Vector, Matrix, noise
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/vegetation-ladder-blender')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
LIMESTONE = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-density/limestone-section.webp')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)

# ── Shared with LandCoverVisuals.tsx ────────────────────────────────────────
W, H = 500, 206
GROUND = 184                                   # the line the formations stand on
COL = 100
LADDER_H = [16, 34, 70, 112, 164]              # herbaceous, batha, garrigue, grove, planted


def cx(i):
    """Column centre — index 0 at the inline-start (right), like the label list."""
    return W - COL / 2 - i * COL


# ── Camera: orthographic, pitched down by TILT ──────────────────────────────
# A point at depth d (svg units behind the cut face) and height h (world z / S) lands on
# svg y = BASE − (d·sinT + h·cosT). The cut face is at BASE; the formations stand at depth DP,
# exactly on GROUND.
TILT = math.radians(10)
SIN_T, COS_T = math.sin(TILT), math.cos(TILT)
BASE = 194
DP = (BASE - GROUND) / SIN_T                   # ≈ 57.6
DEPTH = 100
S = 0.02
PX = float(os.environ.get('VL_PX', 2.5))       # 1250 × 515
SAMPLE_SCALE = float(os.environ.get('VL_SAMPLES', 1))


def up(svg_h):
    """World height (in svg units) whose projection is svg_h units tall."""
    return svg_h / COS_T


def h_for(y, d):
    return (BASE - y - d * SIN_T) / COS_T


def world(p):
    return Vector(((p[0] - W / 2) * S, p[1] * S, p[2] * S))


# ── Colour + material helpers (as in render_relief_cover.py) ────────────────
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


def ground_material():
    """Bare land: dry soil with pebbles and a few limestone patches. No grass — grass is a formation."""
    m = new_material('Bare ground', '#A88D6B', rough=.95)
    ns, lk, bs = nodes(m)
    tc, v = obj_coords(ns, lk, 1.7)
    soil = box_tex(ns, lk, os.path.join(TEX, 'dry_diff.jpg'), v)
    _, v2 = obj_coords(ns, lk, 1.1)
    rock = box_tex(ns, lk, os.path.join(TEX, 'rock_diff.jpg'), v2)
    patches = ns.new('ShaderNodeTexNoise'); patches.inputs['Scale'].default_value = 5; patches.inputs['Detail'].default_value = 4
    lk.new(tc.outputs['Object'], patches.inputs['Vector'])
    rmix = ramp(ns, lk, patches.outputs['Fac'], .6, .75)
    soil_c = hsv(ns, lk, soil.outputs['Color'], h=.49, s=.95, v=1.02)
    rock_c = hsv(ns, lk, rock.outputs['Color'], s=.45, v=1.12)
    lk.new(mix_rgb(ns, lk, rmix, soil_c, rock_c), bs.inputs['Base Color'])
    detail = ns.new('ShaderNodeTexNoise'); detail.inputs['Scale'].default_value = 140; detail.inputs['Detail'].default_value = 5
    lk.new(tc.outputs['Object'], detail.inputs['Vector'])
    bump_from(ns, lk, bs, detail.outputs['Fac'], .45, .01)
    return m


def section_material():
    """Cut face: terra-rossa topsoil, a broken weathered zone, then limestone beds
    (attributes from the mesh: 'below' = svg units under the surface, 'u' = svg x)."""
    m = new_material('Cut face — topsoil over limestone', '#C9B892', rough=.92)
    ns, lk, bs = nodes(m)
    tc = ns.new('ShaderNodeTexCoord')

    def uv(su, sv, ou=0.0, ov=0.0):
        comb = ns.new('ShaderNodeCombineXYZ')
        mu = ns.new('ShaderNodeMath'); mu.operation = 'MULTIPLY_ADD'; mu.inputs[1].default_value = su; mu.inputs[2].default_value = ou
        mv = ns.new('ShaderNodeMath'); mv.operation = 'MULTIPLY_ADD'; mv.inputs[1].default_value = sv; mv.inputs[2].default_value = ov
        lk.new(attr(ns, 'u'), mu.inputs[0]); lk.new(attr(ns, 'below'), mv.inputs[0])
        lk.new(mu.outputs[0], comb.inputs['X']); lk.new(mv.outputs[0], comb.inputs['Y'])
        return comb.outputs[0]

    beds = ns.new('ShaderNodeTexImage'); beds.image = image(LIMESTONE); beds.extension = 'MIRROR'
    lk.new(uv(1 / 300, 1 / 100, .13, .31), beds.inputs['Vector'])
    rock = ns.new('ShaderNodeTexImage'); rock.image = image(os.path.join(TEX, 'rock_diff.jpg')); rock.extension = 'MIRROR'
    lk.new(uv(1 / 70, 1 / 55, .4, .1), rock.inputs['Vector'])
    stone = mix_rgb(ns, lk, .5, beds.outputs['Color'], hsv(ns, lk, rock.outputs['Color'], s=.3), 'OVERLAY')
    soil = ns.new('ShaderNodeTexImage'); soil.image = image(os.path.join(TEX, 'dry_diff.jpg')); soil.extension = 'MIRROR'
    lk.new(uv(1 / 34, 1 / 34), soil.inputs['Vector'])
    soil_c = hsv(ns, lk, soil.outputs['Color'], h=.495, s=.85, v=.58)
    wob = ns.new('ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 26; wob.inputs['Detail'].default_value = 5
    lk.new(tc.outputs['Object'], wob.inputs['Vector'])
    wd = ns.new('ShaderNodeMath'); wd.operation = 'MULTIPLY_ADD'; wd.inputs[1].default_value = 3; wd.inputs[2].default_value = -1.5
    lk.new(wob.outputs['Fac'], wd.inputs[0])
    dep = ns.new('ShaderNodeMath'); dep.operation = 'ADD'
    lk.new(attr(ns, 'below'), dep.inputs[0]); lk.new(wd.outputs[0], dep.inputs[1])
    frag = ns.new('ShaderNodeTexVoronoi'); frag.inputs['Scale'].default_value = 90
    lk.new(tc.outputs['Object'], frag.inputs['Vector'])
    fz = ramp(ns, lk, frag.outputs['Distance'], .42, .2)
    weathered = mix_rgb(ns, lk, fz, soil_c, hsv(ns, lk, stone, v=.92))
    top = mix_rgb(ns, lk, ramp(ns, lk, dep.outputs[0], 2.0, 4.0), soil_c, weathered)
    col = mix_rgb(ns, lk, ramp(ns, lk, dep.outputs[0], 6.5, 10.0), top, stone)
    lk.new(col, bs.inputs['Base Color'])
    bump_from(ns, lk, bs, mix_rgb(ns, lk, .5, rock.outputs['Color'], beds.outputs['Color']), .5, .02)
    return m


def leaf_material(name, img, translucent='#6E7C42'):
    m = bpy.data.materials.new(name); m.use_nodes = True
    ns, lk, bs = nodes(m)
    out = ns.get('Material Output')
    tx = ns.new('ShaderNodeTexImage'); tx.image = img; tx.interpolation = 'Cubic'
    lk.new(mix_rgb(ns, lk, 1.0, tx.outputs['Color'], attr(ns, 'tint', 'Color'), 'MULTIPLY'), bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .62
    tr = ns.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = rgba(translucent)
    leafy = ns.new('ShaderNodeMixShader'); leafy.inputs[0].default_value = .18
    lk.new(bs.outputs[0], leafy.inputs[1]); lk.new(tr.outputs[0], leafy.inputs[2])
    clear = ns.new('ShaderNodeBsdfTransparent')
    cut = ns.new('ShaderNodeMixShader')
    lk.new(tx.outputs['Alpha'], cut.inputs[0]); lk.new(clear.outputs[0], cut.inputs[1]); lk.new(leafy.outputs[0], cut.inputs[2])
    lk.new(cut.outputs[0], out.inputs['Surface'])
    return m


def blade_material():
    """Grass blades: per-vertex tint, a lighter tip (uv v), translucent in the light."""
    m = new_material('Grass blades', '#6E7A3E', .7)
    ns, lk, bs = nodes(m)
    out = ns.get('Material Output')
    uvn = ns.new('ShaderNodeUVMap')
    sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(uvn.outputs[0], sep.inputs[0])
    base = mix_rgb(ns, lk, 1.0, rgba('#FFFFFF'), attr(ns, 'tint', 'Color'), 'MULTIPLY')
    col = mix_rgb(ns, lk, ramp(ns, lk, sep.outputs['Y'], .55, 1.0), base, hsv(ns, lk, base, s=.8, v=1.35))
    col = mix_rgb(ns, lk, ramp(ns, lk, sep.outputs['Y'], .25, 0.0), col, hsv(ns, lk, base, v=.6))
    lk.new(col, bs.inputs['Base Color'])
    tr = ns.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = rgba('#9AA850')
    mx = ns.new('ShaderNodeMixShader'); mx.inputs[0].default_value = .22
    lk.new(bs.outputs[0], mx.inputs[1]); lk.new(tr.outputs[0], mx.inputs[2])
    lk.new(mx.outputs[0], out.inputs['Surface'])
    return m


def tinted_material(name, color, rough=.8):
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
    tinted = mix_rgb(ns, lk, 1.0, rgba(color), attr(ns, 'tint', 'Color'), 'MULTIPLY')
    lk.new(mix_rgb(ns, lk, ramp(ns, lk, wave.outputs['Fac'], .2, .9), hsv(ns, lk, tinted, v=.62), tinted), bs.inputs['Base Color'])
    bump_from(ns, lk, bs, wave.outputs['Fac'], .6, .004)
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
    'oak':   dict(n=60, a=(48, 78), b=(.42, .58), greens=('#2F3B1D', '#3A4724', '#45532A', '#4F5E31', '#5B6A37'), under=(.12, '#6F7B4A')),
    'scrub': dict(n=70, a=(38, 60), b=(.42, .6), greens=('#46512D', '#525D36', '#5E683F', '#6A7347'), under=(.18, '#868C66')),
    'batha': dict(n=110, a=(22, 34), b=(.45, .6), greens=('#6A7350', '#757E5A', '#808866', '#8C9270'), under=(.3, '#A5A88E')),
    'pine':  dict(n=34, a=(150, 210), b=(.035, .05), greens=('#34452A', '#3D4F31', '#475A39', '#516443'), under=(.0, '#6E7C5A'), tufts=True),
}


def leaf_atlas(kind, size=1024):
    p = ATLAS[kind]
    rng = np.random.default_rng({'oak': 3, 'scrub': 7, 'batha': 13, 'pine': 11}[kind])
    C = np.zeros((size, size, 3), np.float32)
    A = np.zeros((size, size), np.float32)
    cell = size // 2
    greens = [hex01(c) for c in p['greens']]
    for ci in range(4):
        ox, oy = (ci % 2) * cell, (ci // 2) * cell
        centres = [(ox + cell / 2 + rng.normal(0, cell * .12), oy + cell / 2 + rng.normal(0, cell * .12)) for _ in range(5)] if p.get('tufts') else None
        for _ in range(p['n'] * (5 if centres else 1)):
            if centres:
                tcx, tcy = centres[rng.integers(len(centres))]
                ang = rng.uniform(0, 2 * np.pi)
                a = rng.uniform(*p['a']) * .5
                cx_, cy_ = tcx + math.cos(ang) * a, tcy + math.sin(ang) * a
                rot = ang
                rad = math.hypot(cx_ - ox - cell / 2, cy_ - oy - cell / 2)
            else:
                ang = rng.uniform(0, 2 * np.pi)
                rad = cell * 0.43 * rng.uniform(0, 1) ** 0.55
                cx_ = ox + cell / 2 + rad * math.cos(ang)
                cy_ = oy + cell / 2 + rad * math.sin(ang)
                a = rng.uniform(*p['a'])
                rot = ang + rng.normal(0, 0.9)
            b = a * rng.uniform(*p['b'])
            if rng.uniform() < p['under'][0]:
                base = hex01(p['under'][1]) * rng.uniform(.9, 1.08)
            else:
                base = greens[rng.integers(len(greens))] * rng.uniform(.85, 1.15)
            shade = (0.7 + 0.3 * min(1, rad / (cell * 0.43))) * (1.1 - 0.25 * (cy_ - oy) / cell)
            x0, x1 = int(max(ox, cx_ - a - 2)), int(min(ox + cell, cx_ + a + 3))
            y0, y1 = int(max(oy, cy_ - a - 2)), int(min(oy + cell, cy_ + a + 3))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
            lx = (xx - cx_) * math.cos(rot) + (yy - cy_) * math.sin(rot)
            ly = -(xx - cx_) * math.sin(rot) + (yy - cy_) * math.cos(rot)
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


# ── Mesh builder (all coordinates in svg space: x, depth, height) ───────────
class Builder:
    def __init__(self):
        self.v, self.f, self.uv, self.tint, self.mi = [], [], [], [], []

    def vert(self, p):
        self.v.append(world(p))
        return len(self.v) - 1

    def face(self, idx, uvs=None, tint=(1, 1, 1), mi=0):
        self.f.append(tuple(idx))
        self.uv.append(uvs or [(0, 0)] * len(idx))
        self.tint.append(tuple(tint) + (1,))
        self.mi.append(mi)

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

    def prism(self, p0, p1, r0, r1, sides=6, mi=0, tint=(1, 1, 1)):
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

    def blade(self, base, height, lean, width, tint, mi=0, segs=4):
        """One grass blade: a tapered ribbon bending along lean (a horizontal vector)."""
        side = Vector((-lean.y, lean.x, 0)).normalized() if lean.length > 1e-6 else Vector((1, 0, 0))
        prev = None
        for k in range(segs + 1):
            t = k / segs
            c = Vector(base) + Vector((0, 0, height * t)) + lean * (t * t) * height
            w = width * (1 - t) * .5
            pair = (self.vert(c - side * w), self.vert(c + side * w))
            if prev:
                self.face([prev[0], prev[1], pair[1], pair[0]], [(0, (k - 1) / segs), (1, (k - 1) / segs), (1, t), (0, t)], tint, mi)
            prev = pair


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
    for (x, d, h, rx, rd, rh) in lobes:
        n = int(dens * ellipsoid_area(rx, rd, rh) / (card * card))
        for _ in range(n):
            z = rng.uniform(-1, 1); t = rng.uniform(0, 2 * math.pi); s = math.sqrt(1 - z * z)
            dvec = Vector((s * math.cos(t), s * math.sin(t), z))
            f = .6 + .4 * rng.random() ** .6
            p = Vector((x + dvec.x * rx * f, d + dvec.y * rd * f, h + dvec.z * rh * f))
            nrm = (dvec + Vector((rng.gauss(0, .7), rng.gauss(0, .7), rng.gauss(0, .7)))).normalized()
            light = (1 - light_bias) + light_bias * (dvec.z * .5 + .5)
            k = light * (.72 + .28 * f) * rng.uniform(.86, 1.12)
            bl.card(p, nrm, card * rng.uniform(.75, 1.3), (rng.choice((0, .5)), rng.choice((0, .5))),
                    (tint[0] * k, tint[1] * k, tint[2] * k), leaf_mi, rng.uniform(0, 2 * math.pi))
        bl.blob((x, d, h), rx * .74, rd * .74, rh * .72, core_mi, (1, 1, 1), .3, rng.uniform(0, 50))


def clumpy(lobes, rng, n=3, k=.48):
    """Break each lobe's clean ellipsoid outline with smaller lobes on its shell."""
    out = list(lobes)
    for (x, d, h, rx, rd, rh) in lobes:
        for _ in range(n):
            a = rng.uniform(0, 2 * math.pi); z = rng.uniform(-.2, .9)
            s = math.sqrt(1 - z * z)
            out.append((x + math.cos(a) * s * rx * .72, d + math.sin(a) * s * rd * .72, h + z * rh * .62,
                        rx * k * rng.uniform(.8, 1.1), rd * k, rh * k * rng.uniform(.8, 1.1)))
    return out


def conifer(bl, rng, x, d, h0, h1, r0, tiers, card, leaf_mi, core_mi, dens=2.6):
    """Needle-cluster cards on a tiered cone (svg heights h0 → h1 above the line, base radius r0):
    each tier flares at its foot and narrows to the next one, like whorled pine branches."""
    span = h1 - h0
    step = span / tiers

    def radius(h):
        t = (h - h0) / span
        tier = ((h - h0) % step) / step                  # 0 at a tier's foot → 1 at its top
        return r0 * (1 - t) ** .85 * (1 - .38 * tier) + .6

    n = int(dens * math.pi * r0 * span * .55 / (card * card))
    for _ in range(n):
        h = h0 + span * rng.random() ** 1.15
        a = rng.uniform(0, 2 * math.pi)
        f = .55 + .45 * rng.random() ** .5
        r = radius(h) * f
        p = Vector((x + math.cos(a) * r, d + math.sin(a) * r, up(h)))
        out = Vector((math.cos(a), math.sin(a), .35))
        nrm = (out + Vector((rng.gauss(0, .6), rng.gauss(0, .6), rng.gauss(0, .6)))).normalized()
        k = (.78 + .22 * f) * rng.uniform(.86, 1.12) * (.85 + .15 * (h - h0) / span)
        bl.card(p, nrm, card * rng.uniform(.75, 1.25), (rng.choice((0, .5)), rng.choice((0, .5))), (k, k, k), leaf_mi, rng.uniform(0, 2 * math.pi))
    for i in range(tiers):
        ha, hb = h0 + i * step, h0 + (i + 1) * step
        bl.prism((x, d, up(ha)), (x, d, up(hb)), radius(ha) * .42, radius(hb - .01) * .32, 10, core_mi)


def stem(bl, rng, pts, r0, r1, mi, sides=7):
    n = len(pts) - 1
    for i in range(n):
        bl.prism(pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, sides, mi, (rng.uniform(.85, 1.1),) * 3)


def lobe(x, svg_centre, rx, svg_rh, rd=None, d=DP):
    """A crown lobe given in the ladder's own terms: centre and vertical radius as svg heights
    above the ground line (so the papercut lobes carry over), depth radius = rx by default."""
    return (x, d, up(svg_centre), rx, rd if rd is not None else rx, up(svg_rh))


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
    # Warm key from the front-left and above — the lesson dioramas' light (render_relief_cover.py).
    sun_dir = Vector((-.42, -.7, .58)).normalized()
    sun_data = bpy.data.lights.new('Sun', 'SUN'); sun = bpy.data.objects.new('Sun', sun_data)
    sc.collection.objects.link(sun)
    sun.rotation_euler = sun_dir.to_track_quat('Z', 'Y').to_euler()
    sun_data.energy = 4.2; sun_data.angle = math.radians(3); sun_data.color = (1, .95, .86)
    cam_data = bpy.data.cameras.new('Ladder camera'); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = W * S; cam_data.sensor_fit = 'HORIZONTAL'; cam_data.clip_end = 400
    cam = bpy.data.objects.new('Ladder camera', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    look = Vector((0, COS_T, -SIN_T))
    cam.location = world((W / 2, 0, h_for(H / 2, 0))) - look * 60
    cam.rotation_euler = (math.pi / 2 - TILT, 0, 0)
    return sc


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def build_land(coll, M):
    xs = [-10 + 2 * i for i in range(int((W + 20) / 2) + 1)]
    ds = [0, .5, 1.2, 2.2, 3.6, 5.5, 8, 11, 15, 20, 26, 33, 41, 50, 60, 70, 80, 90, DEPTH]
    nx = len(xs)
    bl = Builder()
    for d in ds:
        for x in xs:
            # a breath of undulation behind the line only (bases stay on GROUND)
            n = noise.fractal(Vector((x * .04, d * .06, 3.1)), .6, 2.0, 4) * min(1.0, max(0.0, (d - DP - 8) / 20))
            bl.vert((x, d, n * 1.2))
    for j in range(len(ds) - 1):
        for i in range(nx - 1):
            bl.face([j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i])
    top = bl.build('Land surface', [M['ground']], coll, smooth=True)
    hb = h_for(H + 10, 0)
    bf = Builder()
    below, u = [], []
    for x in xs:
        bf.vert((x, 0, 0)); bf.vert((x, 0, hb))
        below += [0.0, -hb * COS_T]
        u += [x, x]
    for i in range(nx - 1):
        bf.face([2 * i + 1, 2 * i + 3, 2 * i + 2, 2 * i])
    face = bf.build('Cut face', [M['section']], coll)
    for name, vals in (('below', below), ('u', u)):
        at = face.data.attributes.new(name, 'FLOAT', 'POINT'); at.data.foreach_set('value', vals)
    return [top, face]


def tuft(bl, rng, x, d, top, n=12, tint=(1, 1, 1), spread=1.6):
    """A grass tuft whose tallest blade reaches svg height `top` above the line."""
    for k in range(n):
        h = up(top) * rng.uniform(.55, 1.0) * (1.0 if k else 1.0)
        ang = rng.uniform(0, 2 * math.pi)
        lean = Vector((math.cos(ang), math.sin(ang), 0)) * rng.uniform(.08, .32)
        base = (x + rng.uniform(-spread, spread), d + rng.uniform(-spread, spread), -.3)
        k_ = rng.uniform(.85, 1.15)
        bl.blade(base, h, lean, rng.uniform(.6, 1.0), (tint[0] * k_, tint[1] * k_, tint[2] * k_))


GRASS_TINT = (.43, .5, .22)


def build_herbaceous(coll, M):
    x0 = cx(0)
    rng = random.Random(3)
    bl = Builder()
    for _ in range(70):
        x = x0 + rng.uniform(-42, 42)
        d = DP + rng.uniform(-6, 6)
        top = LADDER_H[0] - max(0.0, (d - DP)) * SIN_T - rng.uniform(0, 4)
        tuft(bl, rng, x, d, top, 12, (GRASS_TINT[0] * rng.uniform(.9, 1.15), GRASS_TINT[1] * rng.uniform(.92, 1.1), GRASS_TINT[2]))
    # a few low herbs among the grass
    leaves = Builder()
    for _ in range(9):
        x = x0 + rng.uniform(-38, 38)
        crown(leaves, rng, [lobe(x, 4, rng.uniform(3, 4.5), 3.5, d=DP + rng.uniform(-4, 4))], 1.6, 2.4, (1.1, 1.15, 1.0), 0, 1, .3)
    return [bl.build('Grass', [M['blade']], coll), leaves.build('Herbs', [M['leaves_scrub'], M['core_scrub']], coll)]


def build_batha(coll, M):
    x0 = cx(1)
    rng = random.Random(5)
    bl = Builder()
    #  dx   top  rx    — dwarf shrubs (low cushions); the tallest reaches the 34-unit top
    for (dx, top, rx) in ((-21, 25, 13), (19, 34, 14), (-3, 17, 8.5), (37, 16, 8), (-39, 13, 6.5)):
        x = x0 + dx
        rh = top / 2
        lobes = [lobe(x, rh, rx, rh * .98, rx * .9)]
        for _ in range(3):
            lobes.append(lobe(x + rng.uniform(-.5, .5) * rx, rh + rng.uniform(.1, .45) * rh, rx * .45, rh * .42, d=DP + rng.uniform(-.3, .3) * rx))
        crown(bl, rng, clumpy(lobes, rng, 2, .4), 2.0, 2.6, (rng.uniform(.95, 1.06),) * 3, 0, 1, .35)
    grass = Builder()
    for dx in (-36, 3, 40, -12, 28):
        tuft(grass, rng, x0 + dx, DP + rng.uniform(-3, 3), rng.uniform(8, 11), 10, GRASS_TINT)
    return [bl.build('Batha shrubs', [M['leaves_batha'], M['core_batha']], coll), grass.build('Batha grass', [M['blade']], coll)]


def build_garrigue(coll, M):
    x0 = cx(2)
    rng = random.Random(9)
    bl = Builder()
    # two multi-stemmed shrubs; the tall one reaches 70, the other ~46 (the papercut lobes)
    shrubs = [
        [(-17, 17, 16, 14), (-25, 32, 13, 12), (-10, 46, 15, 13), (-17, 60, 10, 9)],
        [(15, 13, 14, 12), (22, 28, 13, 11), (12, 37, 11, 9)],
    ]
    for parts in shrubs:
        lobes = [lobe(x0 + dx, h, rx, rh, rx * rng.uniform(.8, 1.0), d=DP + rng.uniform(-3, 3)) for (dx, h, rx, rh) in parts]
        base_x = sum(p[0] for p in parts) / len(parts) + x0
        for lb in lobes:
            stem(bl, rng, [(base_x + rng.uniform(-3, 3), DP, -.5), (lb[0], lb[1], lb[2] - lb[5] * .3)], .9, .4, 0, 5)
        crown(bl, rng, clumpy(lobes, rng), 3.0, 2.4, (rng.uniform(.95, 1.06),) * 3, 1, 2, .3)
    grass = Builder()
    for dx in (-40, 40, 2):
        tuft(grass, rng, x0 + dx, DP + rng.uniform(-3, 3), rng.uniform(8, 10), 10, GRASS_TINT)
    return [bl.build('Garrigue shrubs', [M['bark'], M['leaves_scrub'], M['core_scrub']], coll), grass.build('Garrigue grass', [M['blade']], coll)]


def build_grove(coll, M):
    x0 = cx(3)
    rng = random.Random(21)
    bl = Builder()
    trees = [
        (x0 - 14, [(-28, 70, 15), (-2, 72, 16), (-20, 88, 17), (-6, 93, 18.5), (-16, 76, 14)]),
        (x0 + 26, [(16, 58, 12), (34, 60, 12), (25, 72, 14)]),
    ]
    for (tx, parts) in trees:
        lobes = [lobe(x0 + dx, h, r, r * .92, r * rng.uniform(.85, 1.0), d=DP + rng.uniform(-3, 3)) for (dx, h, r) in parts]
        low = min(p[1] - p[2] for p in parts)
        fork = (tx + rng.uniform(-1, 1), DP, up(low * .85))
        stem(bl, rng, [(tx, DP, -1.0), ((tx + fork[0]) / 2 + rng.uniform(-.8, .8), DP, fork[2] / 2), fork], 3.0, 2.1, 0)
        for lb in lobes:
            end = Vector((lb[0], lb[1], lb[2])).lerp(Vector(fork), .3)
            stem(bl, rng, [fork, tuple(end)], 1.5, .6, 0, 5)
        crown(bl, rng, clumpy(lobes, rng, 4, .42), 4.0, 2.3, (rng.uniform(.94, 1.04), rng.uniform(.96, 1.06), rng.uniform(.9, 1.0)), 1, 2)
    under = Builder()
    for (dx, h, r) in ((2, 12, 12), (10, 20, 11), (-36, 9, 9)):
        crown(under, rng, [lobe(x0 + dx, h, r, r * .9, d=DP + rng.uniform(-6, -2))], 2.6, 2.4, (1.0, 1.02, .98), 0, 1, .3)
    return [bl.build('Grove trees', [M['bark'], M['leaves_oak'], M['core_oak']], coll),
            under.build('Grove understory', [M['leaves_scrub'], M['core_scrub']], coll)]


def build_planted(coll, M):
    x0 = cx(4)
    bl = Builder()
    # three identical pines (one seed): straight trunks, bare below, tiered cones to 164
    for dx in (-28, 0, 28):
        rng = random.Random(55)
        x = x0 + dx
        stem(bl, rng, [(x, DP, -1.0), (x, DP, up(158))], 1.9, .5, 0, 8)
        for h in range(34, 140, 14):   # whorled branches reaching into the needles
            for a in (rng.uniform(0, 2 * math.pi) + k * 2.1 for k in range(3)):
                r = 13 * (1 - (h - 28) / 136)
                bl.prism((x, DP, up(h)), (x + math.cos(a) * r * .8, DP + math.sin(a) * r * .8, up(h + 3)), .5, .2, 4, 0)
        conifer(bl, rng, x, DP, 28, 164, 15.5, 7, 3.6, 1, 2, dens=7.0)
    return [bl.build('Planted pines', [M['bark_pine'], M['leaves_pine'], M['core_pine']], coll)]


def materials():
    imgs = {k: leaf_atlas(k) for k in ATLAS}
    return {
        'ground': ground_material(),
        'section': section_material(),
        'blade': blade_material(),
        'bark': bark_material('Bark', '#4A3F33'),
        'bark_pine': bark_material('Pine bark', '#5A4636'),
        'leaves_oak': leaf_material('Oak leaves', imgs['oak'], '#5E6B2E'),
        'core_oak': tinted_material('Oak crown core', '#24301A', .9),
        'leaves_scrub': leaf_material('Scrub leaves', imgs['scrub'], '#5A6430'),
        'core_scrub': tinted_material('Scrub core', '#29331C', .9),
        'leaves_batha': leaf_material('Batha leaves', imgs['batha'], '#7C8456'),
        'core_batha': tinted_material('Batha core', '#3F4733', .9),
        'leaves_pine': leaf_material('Pine needles', imgs['pine'], '#4A5A36'),
        'core_pine': tinted_material('Pine crown core', '#1F2A18', .9),
    }


FORMATIONS = ('herbaceous', 'batha', 'garrigue', 'grove', 'planted')
PASSES = ('land',) + tuple('shadow-' + k for k in FORMATIONS) + FORMATIONS
SAMPLES = {'land': 128, 'shadow': 96, 'herbaceous': 192, 'batha': 256, 'garrigue': 256, 'grove': 256, 'planted': 256}


def build():
    M = materials()
    groups = {'land': build_land(collection('land'), M)}
    for k, f in zip(FORMATIONS, (build_herbaceous, build_batha, build_garrigue, build_grove, build_planted)):
        groups[k] = f(collection(k), M)
    return groups


def configure(groups, name):
    for objs in groups.values():
        for ob in objs:
            ob.hide_render = True
            ob.is_holdout = False
            ob.is_shadow_catcher = False
            ob.visible_camera = True
    if name == 'land':
        for ob in groups['land']:
            ob.hide_render = False
    elif name.startswith('shadow-'):
        for ob in groups['land']:
            ob.hide_render = False
            ob.is_shadow_catcher = True
        for ob in groups[name[len('shadow-'):]]:
            ob.hide_render = False
            ob.visible_camera = False
    else:
        for ob in groups['land']:
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
    for i, top in enumerate(LADDER_H):
        x = cx(i)
        for (h, y) in ((0, GROUND), (up(top), GROUND - top)):
            gx, gy = svg_of(world((x, DP, h)))
            worst = max(worst, abs(gx - x), abs(gy - y))
    gx, gy = svg_of(world((0, 0, 0)))
    worst = max(worst, abs(gx), abs(gy - BASE))
    print(f'ground line and heights vs viewBox: max error {worst:.4f} svg units', flush=True)
    assert worst < .05, 'camera does not match the ladder viewBox'


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
    print('VEGETATION LADDER RENDERS COMPLETE', flush=True)
