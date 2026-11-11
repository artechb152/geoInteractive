"""Homepage map-table art (MapTableHome.tsx), rendered from scratch in Cycles.

Reference: design/mockups/home-directions-2026-11-11/03-tactile-mission-table-v2-clean.png (materials,
light, perspective) + the 2026-11-11 follow-up brief (a large map sheet that fills the window).

Passes (each writes PNGs to qa-output/home-map-table/render):

    felt          the dark green felt desk, full-bleed plate (cover-fitted by CSS)
    sheet-a..d    the folded map sheet + its contact shadow, RGBA, one per window-shape frame
                  (home_map_table_sheets.json): matte stone-olive stock with its topographic print
                  (maps/sheet-ink-*.png from home_map_table_sheet_ink.cjs)
    terrain       chapter 01: Mount Hermon from the air (RGBA + a view-distance pass for haze)
    cardstock     the cream board the chapter cards are printed on

    node scripts/blender/fetch_home_map_table_sources.mjs
    node scripts/blender/home_map_table_maps.cjs
    node scripts/blender/home_map_table_sheet_ink.cjs
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_home_map_table.py -- felt sheet-a sheet-b sheet-c sheet-d terrain cardstock
    node scripts/blender/package_home_map_table.cjs

Chapter 02/03 art is drawn by home_map_table_maps.cjs (03 reuses the lesson-6 compass body render).
Draft: HMT_SCALE=0.5 HMT_SAMPLES=0.25.
"""
import bpy, math, os, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
WORK = os.path.join(ROOT, 'qa-output/home-map-table')
SRC = os.path.join(WORK, 'src')
OUT = os.path.join(WORK, 'render')
TEX = os.path.join(WORK, 'tex')
for d in (OUT, TEX):
    os.makedirs(d, exist_ok=True)

SCALE = float(os.environ.get('HMT_SCALE', '1'))
SAMPLES = float(os.environ.get('HMT_SAMPLES', '1'))
STAGE_W, STAGE_H = 1487, 1058
U = 0.01  # Blender units per stage px


def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hex_lin(h, a=1.0):
    h = h.lstrip('#')
    rgb = srgb_to_lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    return (*rgb, a)


# ── numpy helpers ───────────────────────────────────────────────────────────
def box_blur(a, r):
    """Separable box blur with radius r (pixels), edge-clamped."""
    r = int(max(1, round(r)))
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r + 1, r)
        p = np.pad(a, pad, mode='edge')
        c = np.cumsum(p, axis=axis)
        if axis == 0:
            a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        else:
            a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return a


def gauss(a, sigma):
    r = max(1, int(round(sigma * 0.93)))  # 3 box passes ~ gaussian
    for _ in range(3):
        a = box_blur(a, r)
    return a


def value_noise(shape, cell, seed):
    """Smooth value noise sampled on a (h, w) pixel grid with feature size `cell` px."""
    rng = np.random.default_rng(seed)
    h, w = shape
    gh, gw = int(h / cell) + 3, int(w / cell) + 3
    g = rng.random((gh, gw))
    y = np.arange(h) / cell
    x = np.arange(w) / cell
    y0 = np.floor(y).astype(int); x0 = np.floor(x).astype(int)
    fy = y - y0; fx = x - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(shape, cell, seed, octaves=4, gain=0.5):
    out = np.zeros(shape); amp = 1.0; tot = 0.0
    for o in range(octaves):
        out += amp * (value_noise(shape, max(1.5, cell / 2 ** o), seed + o * 17) - 0.5)
        tot += amp; amp *= gain
    return out / tot


def noise1d(n, period, seed):
    rng = np.random.default_rng(seed)
    k = int(n / period) + 3
    g = rng.random(k) - 0.5
    t = np.arange(n) / period
    i = np.floor(t).astype(int); f = t - i
    f = f * f * (3 - 2 * f)
    return g[i] + (g[i + 1] - g[i]) * f


def resample_closed(poly, step):
    pts = np.asarray(poly + [poly[0]], dtype=np.float64)
    seg = np.diff(pts, axis=0)
    L = np.hypot(seg[:, 0], seg[:, 1])
    cum = np.concatenate([[0], np.cumsum(L)])
    s = np.arange(0, cum[-1], step)
    x = np.interp(s, cum, pts[:, 0]); y = np.interp(s, cum, pts[:, 1])
    return np.stack([x, y], 1)


def chaikin_closed(p, it=2):
    for _ in range(it):
        q = np.roll(p, -1, axis=0)
        p = np.concatenate([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], axis=1).reshape(-1, 2)
    return p


def rasterize(poly, w, h, ss=1.0):
    """Even-odd scanline fill of a closed polygon given in output pixels."""
    x1, y1 = poly[:, 0], poly[:, 1]
    x2, y2 = np.roll(x1, -1), np.roll(y1, -1)
    mask = np.zeros((h, w), dtype=np.float32)
    xs = np.arange(w) + 0.5
    for row in range(h):
        yc = row + 0.5
        hit = ((y1 <= yc) & (y2 > yc)) | ((y2 <= yc) & (y1 > yc))
        if not hit.any():
            continue
        xi = np.sort(x1[hit] + (yc - y1[hit]) * (x2[hit] - x1[hit]) / (y2[hit] - y1[hit]))
        for a, b in zip(xi[0::2], xi[1::2]):
            # anti-aliased horizontal coverage
            mask[row] += np.clip(np.minimum(xs + 0.5, b) - np.maximum(xs - 0.5, a), 0, 1)
    return np.clip(mask, 0, 1)


# ── Blender helpers ─────────────────────────────────────────────────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'OPTIX'
        devices = prefs.get_devices_for_type('OPTIX')  # only probe OptiX (the oneAPI probe crashes here)
        for dev in devices:
            dev.use = True
        if any(dev.type == 'OPTIX' for dev in devices):
            sc.cycles.device = 'GPU'
    except Exception as exc:
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '16'
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    return sc


def np_image(name, arr, colorspace='Non-Color'):
    """arr: (h, w) or (h, w, 3|4) float, row 0 = TOP of the picture."""
    arr = np.asarray(arr, dtype=np.float32)
    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr, np.ones_like(arr)], -1)
    elif arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones(arr.shape[:2] + (1,), np.float32)], -1)
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True, float_buffer=True)
    img.colorspace_settings.name = colorspace
    img.pixels.foreach_set(np.ascontiguousarray(arr[::-1]).ravel())
    img.pack()
    return img


def load_image(path, colorspace='sRGB'):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    return img


def grid_mesh(name, x0, y0, x1, y1, step, height=None):
    """Quad grid in stage px (y down). height(xs, ys) -> z in stage px."""
    xs = np.arange(x0, x1 + 1e-6, step); ys = np.arange(y0, y1 + 1e-6, step)
    nx, ny = len(xs), len(ys)
    X, Y = np.meshgrid(xs, ys)
    Z = height(X, Y) if height else np.zeros_like(X)
    verts = np.stack([X * U, -Y * U, Z * U], -1).reshape(-1, 3)
    idx = np.arange(nx * ny).reshape(ny, nx)
    quads = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.astype(np.int32).ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set('loop_start', (np.arange(len(quads)) * 4).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(quads), 4, np.int32))
    uv = me.uv_layers.new(name='UVMap')
    vx = (X.ravel() - x0) / (x1 - x0); vy = 1 - (Y.ravel() - y0) / (y1 - y0)
    uvs = np.stack([vx, vy], -1)[quads.ravel()]
    uv.data.foreach_set('uv', uvs.astype(np.float32).ravel())
    me.update(calc_edges=True)
    me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def ortho_camera(cx, cy, width_px, res_w, res_h):
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = width_px * U
    cam.clip_start = 0.01; cam.clip_end = 100
    ob = bpy.data.objects.new('cam', cam); sc.collection.objects.link(ob)
    ob.location = (cx * U, -cy * U, 20)
    sc.camera = ob
    sc.render.resolution_x = int(round(res_w * SCALE)); sc.render.resolution_y = int(round(res_h * SCALE))
    sc.render.resolution_percentage = 100
    return ob


def nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt


def add(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs.keys() and not isinstance(v, str):
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def link(nt, a, b):
    nt.links.new(a, b)


# ── The desk ────────────────────────────────────────────────────────────────
FELT_DARK, FELT_LIGHT = '#0a0d05', '#334429'


def felt_material(shadow_catcher_only=False):
    mat = bpy.data.materials.new('felt')
    nt = nodes(mat)
    out = add(nt, 'ShaderNodeOutputMaterial')
    tc = add(nt, 'ShaderNodeTexCoord')
    mp = add(nt, 'ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 13.0, 1 / 13.0, 1)  # one 4k scan tile = 1300 stage px
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    diff = add(nt, 'ShaderNodeTexImage'); diff.image = load_image(os.path.join(SRC, 'caban/caban_diff_4k.jpg'))
    nor = add(nt, 'ShaderNodeTexImage'); nor.image = load_image(os.path.join(SRC, 'caban/caban_nor_gl_4k.jpg'), 'Non-Color')
    for t in (diff, nor):
        t.interpolation = 'Cubic'
        link(nt, mp.outputs['Vector'], t.inputs['Vector'])
    bw = add(nt, 'ShaderNodeRGBToBW'); link(nt, diff.outputs['Color'], bw.inputs['Color'])
    # stretch the scan's luminance to a felt-like spread before tinting it green
    rng = add(nt, 'ShaderNodeMapRange'); rng.inputs['From Min'].default_value = 0.16; rng.inputs['From Max'].default_value = 0.42
    link(nt, bw.outputs['Val'], rng.inputs['Value'])
    ramp = add(nt, 'ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = hex_lin(FELT_DARK); ramp.color_ramp.elements[1].color = hex_lin(FELT_LIGHT)
    link(nt, rng.outputs['Result'], ramp.inputs['Fac'])
    nm = add(nt, 'ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.9
    link(nt, nor.outputs['Color'], nm.inputs['Color'])
    bs = add(nt, 'ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Sheen Weight'].default_value = 0.0
    bs.inputs['Specular IOR Level'].default_value = 0.0
    link(nt, ramp.outputs['Color'], bs.inputs['Base Color'])
    link(nt, nm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    return mat


def lights():
    sc = bpy.context.scene
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = hex_lin('#fff4e2')
    bg.inputs['Strength'].default_value = 0.32
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 2.35; sun.angle = math.radians(38); sun.color = (1.0, 0.965, 0.91)
    ob = bpy.data.objects.new('sun', sun); sc.collection.objects.link(ob)
    # high warm key from the far (top) edge, slightly from the right: shadows fall toward the viewer
    ob.rotation_euler = (math.radians(-32), math.radians(10), 0)


def felt_plane(margin=900):
    ob = grid_mesh('felt', -margin, -margin, STAGE_W + margin, STAGE_H + margin, (STAGE_W + 2 * margin) / 4)
    ob.data.materials.append(felt_material())
    return ob


# ── Paper (the map sheet and the card stock share one material) ────────────────
# The map sheet's stock (base colour, before light): a light, muted, neutral-warm stone. Under the warm desk light
# it lands near #CDC6BB — between olive.muted #8A8873 and paper.page #F3E9DC — so the cream cards read clearly
# against it. (First pass #C9C7B9 read too green — user feedback 2026-11-11.)
MAP_STONE = os.environ.get('HMT_STONE', '#d2d0cd')


def paper_material(mask_img, near_img, mask_extension='CLIP', ink_img=None, map_paper=False):
    mat = bpy.data.materials.new('paper')
    nt = nodes(mat)
    out = add(nt, 'ShaderNodeOutputMaterial')
    tc = add(nt, 'ShaderNodeTexCoord')
    uvm = add(nt, 'ShaderNodeUVMap'); uvm.uv_map = 'UVMap'
    tm = add(nt, 'ShaderNodeTexImage'); tm.image = mask_img; tm.interpolation = 'Cubic'; tm.extension = mask_extension
    tn = add(nt, 'ShaderNodeTexImage'); tn.image = near_img; tn.interpolation = 'Cubic'; tn.extension = 'EXTEND'
    link(nt, uvm.outputs['UV'], tm.inputs['Vector']); link(nt, uvm.outputs['UV'], tn.inputs['Vector'])
    ob = tc.outputs['Object']

    def noise_layer(scale, detail, rough, sx=1, sy=1, rot=0.0, w=0.0):
        mp = add(nt, 'ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (sx, sy, 1); mp.inputs['Rotation'].default_value = (0, 0, rot)
        link(nt, ob, mp.inputs['Vector'])
        nz = add(nt, 'ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = detail
        nz.inputs['Roughness'].default_value = rough
        if 'Distortion' in nz.inputs.keys():
            nz.inputs['Distortion'].default_value = w
        link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
        return nz.outputs['Fac']

    def ramp(fac, a, b, pa, pb):
        r = add(nt, 'ShaderNodeMapRange'); r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b
        r.inputs['To Min'].default_value = pa; r.inputs['To Max'].default_value = pb
        link(nt, fac, r.inputs['Value'])
        return r.outputs['Result']

    def mathop(op, a, b):
        m = add(nt, 'ShaderNodeMath'); m.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                m.inputs[i].default_value = v
            else:
                link(nt, v, m.inputs[i])
        return m.outputs['Value']

    sep = add(nt, 'ShaderNodeSeparateColor'); link(nt, tn.outputs['Color'], sep.inputs['Color'])
    lipf = ramp(sep.outputs['Green'], 0.5, 0.9, 1.0, 0.0)
    # 1 BU = 100 stage px. Mottling (~2 BU), cloudy formation (~0.4 BU), fibres (long, thin, 3 directions), grain.
    # Map paper is a clean, matte printing stock: a trace of formation cloud, no mottling or age stains.
    mm = 0.16 if map_paper else 1.0
    mott = ramp(noise_layer(0.55, 3, 0.55), 0.3, 0.7, -0.05 * mm, 0.05 * mm)
    cloud = ramp(noise_layer(3.2, 6, 0.6), 0.35, 0.65, -0.03 * mm, 0.03 * mm)
    fib = None
    for i, rot in enumerate((0.35, 1.45, 2.6)):
        f = ramp(noise_layer(9.0, 2, 0.5, sx=26, sy=3.2, rot=rot, w=0.6), 0.56, 0.74, 0.0, 1.0)
        f = mathop('POWER', f, 2.0)
        fib = f if fib is None else mathop('MAXIMUM', fib, f)
    grain = ramp(noise_layer(60.0, 2, 0.6), 0.3, 0.7, -0.018, 0.018)
    # fine crinkle of handmade paper: thin ridged veins (~25 stage px cells)
    wmp = add(nt, 'ShaderNodeMapping'); link(nt, ob, wmp.inputs['Vector'])
    warp = add(nt, 'ShaderNodeTexNoise'); warp.inputs['Scale'].default_value = 2.0; warp.inputs['Detail'].default_value = 3
    link(nt, ob, warp.inputs['Vector'])
    wv = add(nt, 'ShaderNodeVectorMath'); wv.operation = 'MULTIPLY_ADD'
    link(nt, warp.outputs['Color'], wv.inputs[0]); wv.inputs[1].default_value = (0.22, 0.22, 0.0)
    link(nt, ob, wv.inputs[2])
    vor = add(nt, 'ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 5.0
    if 'Detail' in vor.inputs.keys():
        vor.inputs['Detail'].default_value = 2.0; vor.inputs['Roughness'].default_value = 0.45
    link(nt, wv.outputs['Vector'], vor.inputs['Vector'])
    crk = ramp(vor.outputs['Distance'], 0.0, 0.05, 1.0, 0.0)   # 1 on a crinkle ridge, 0 inside a facet
    crk = mathop('POWER', crk, 1.6)
    # map paper is a smoother, better sheet than the hand-made card stock: less fibre and crinkle
    shade = mathop('ADD', mathop('ADD', mott, cloud), mathop('ADD', grain, mathop('MULTIPLY', fib, 0.022 if map_paper else 0.045)))
    shade = mathop('ADD', shade, mathop('MULTIPLY', crk, 0.0 if map_paper else 0.014))
    # card stock: a lighter pressed lip all round. The map sheet gets its edge from geometry-true shading
    # instead (the edge-roll bump below), so its lit and shaded edges follow the one sun.
    shade = mathop('ADD', shade, mathop('MULTIPLY', lipf, 0.0 if map_paper else 0.09))
    # card stock: an aged rim, a touch darker/warmer within a few px of the edge (none on the map sheet)
    rim = ramp(sep.outputs['Red'], 0.5, 0.92, 1.0, 0.0)
    base = add(nt, 'ShaderNodeMix'); base.data_type = 'RGBA'; base.blend_type = 'MIX'
    if map_paper:
        # light, muted stone (MAP_STONE); the base is a little cooler than the result because the desk light is warm
        base.inputs['A'].default_value = hex_lin(MAP_STONE); base.inputs['B'].default_value = hex_lin(MAP_STONE)
    else:
        base.inputs['A'].default_value = hex_lin('#eddbc3'); base.inputs['B'].default_value = hex_lin('#d6bc98')
    link(nt, mathop('MULTIPLY', rim, 0.0 if map_paper else 0.42), base.inputs['Factor'])
    if ink_img is not None:
        # the printed layer (straight alpha, sRGB) sits in the paper: ink colour, faded by its alpha
        ti = add(nt, 'ShaderNodeTexImage'); ti.image = ink_img; ti.interpolation = 'Cubic'; ti.extension = 'EXTEND'
        link(nt, uvm.outputs['UV'], ti.inputs['Vector'])
        inked = add(nt, 'ShaderNodeMix'); inked.data_type = 'RGBA'; inked.blend_type = 'MIX'
        link(nt, base.outputs['Result'], inked.inputs['A']); link(nt, ti.outputs['Color'], inked.inputs['B'])
        link(nt, ti.outputs['Alpha'], inked.inputs['Factor'])
        base = inked
    bright = add(nt, 'ShaderNodeMix'); bright.data_type = 'RGBA'; bright.blend_type = 'ADD'
    link(nt, base.outputs['Result'], bright.inputs['A'])
    comb = add(nt, 'ShaderNodeCombineColor')
    for ch in ('Red', 'Green', 'Blue'):
        link(nt, shade, comb.inputs[ch])
    link(nt, comb.outputs['Color'], bright.inputs['B']); bright.inputs['Factor'].default_value = 1.0
    bump_h = mathop('ADD', mathop('ADD', mathop('MULTIPLY', fib, 0.25), mathop('MULTIPLY', grain, 3.0)), mathop('MULTIPLY', crk, 0.3))
    bump = add(nt, 'ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35 if map_paper else 0.5; bump.inputs['Distance'].default_value = 0.01
    link(nt, bump_h, bump.inputs['Height'])
    normal = bump.outputs['Normal']
    if map_paper:
        # the cut edge rolls over (the sheet's own thickness): its far/right edges catch the sun and its
        # near/left edges turn away from it, from the same light as everything else
        edge = add(nt, 'ShaderNodeBump'); edge.inputs['Strength'].default_value = 1.0; edge.inputs['Distance'].default_value = 0.03
        link(nt, sep.outputs['Green'], edge.inputs['Height']); link(nt, normal, edge.inputs['Normal'])
        normal = edge.outputs['Normal']
    bs = add(nt, 'ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = 0.96 if map_paper else 0.88
    bs.inputs['Sheen Weight'].default_value = 0.0 if map_paper else 0.15
    if map_paper:
        bs.inputs['Specular IOR Level'].default_value = 0.22   # matte, uncoated stock
    bs.inputs['Subsurface Weight'].default_value = 0.04
    bs.inputs['Subsurface Radius'].default_value = (0.02, 0.015, 0.01)
    link(nt, bright.outputs['Result'], bs.inputs['Base Color'])
    link(nt, normal, bs.inputs['Normal'])
    tr = add(nt, 'ShaderNodeBsdfTransparent')
    mix = add(nt, 'ShaderNodeMixShader')
    link(nt, tm.outputs['Color'], mix.inputs['Fac'])
    link(nt, tr.outputs['BSDF'], mix.inputs[1]); link(nt, bs.outputs['BSDF'], mix.inputs[2])
    link(nt, mix.outputs['Shader'], out.inputs['Surface'])
    return mat


def render(name):
    sc = bpy.context.scene
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', sc.render.filepath)


def pass_felt():
    sc = reset()
    sc.cycles.samples = max(16, int(160 * SAMPLES))
    felt_plane()
    lights()
    # 2240 x 1400 stage px around the stage centre -> 3584 x 2240 px (1.6 px per stage px)
    ortho_camera(STAGE_W / 2, STAGE_H / 2, 2240, 3584, 2240)
    render('felt')


# ── The map sheet (one render per window-shape frame) ──────────────────────────
# A large map folded in quarters and opened out on the desk. Physically: the first fold (the
# vertical centre line) is a valley; the second fold went through two layers facing opposite
# ways, so the horizontal centre fold is a ridge on one half and a valley on the other. Each
# quarter bows a little, the machine-cut edges are straight with light wear, the near-left
# corner curls up a touch. Printed marks come from home_map_table_maps.cjs (sheet-ink-*.png).
import json
SPEC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'home_map_table_sheets.json'), encoding='utf8'))


def sheet_rotation(v):
    th = math.radians(SPEC['rotateDeg']); c, s = math.cos(th), math.sin(th)
    cx, cy = v['w'] / 2, v['h'] / 2
    fwd = lambda x, y: (cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c)
    inv = lambda x, y: (cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c)
    return fwd, inv


def sheet_outline(v):
    x0, y0, x1, y1, r = v['ex'], v['ey'], v['w'] - v['ex'], v['h'] - v['ey'], 5.0
    pts = []
    for (cx, cy, a0) in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(7):
            a = math.radians(a0 + 15 * k)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    out = resample_closed(pts, 1.0)
    n = len(out)
    nxt, prv = np.roll(out, -1, 0), np.roll(out, 1, 0)
    tan = nxt - prv; tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    nor = np.stack([tan[:, 1], -tan[:, 0]], 1)
    # cut edge: near-straight, light wear, a few tiny nicks
    wob = 0.55 * noise1d(n, 60, 3) + 0.3 * noise1d(n, 11, 7) + 0.18 * noise1d(n, 2.5, 5)
    rng = np.random.default_rng(4)
    s = np.arange(n)
    for c in rng.choice(n, 9, replace=False):
        d = np.minimum(np.abs(s - c), n - np.abs(s - c))
        wob -= 1.1 * np.exp(-(d / 3.5) ** 2)
    out = out + nor * wob[:, None]
    fwd, _ = sheet_rotation(v)
    return np.array([fwd(x, y) for x, y in out])


def sheet_height_fn(v):
    W, H, x0, y0, x1, y1 = v['w'], v['h'], v['ex'], v['ey'], v['w'] - v['ex'], v['h'] - v['ey']
    _, inv = sheet_rotation(v)
    # fold lines (home_map_table_sheets.json): the vertical one through the gap in the brand row, the
    # horizontal one behind the card row, well below 'פרקי הקורס'
    mx, my = W / 2 + SPEC.get('foldXOffset', 0), v.get('foldY', H / 2)

    def fold(d, amp, half):
        if amp > 0:
            return amp * np.exp(-(d / half) ** 2) + 0.45 * np.exp(-d / 1.5)
        return -amp * (1 - np.exp(-(d / half) ** 2)) - 0.45 * np.exp(-d / 1.5) + 0.45

    def height(X, Y):
        lx, ly = inv(X, Y)
        z = np.full(X.shape, 0.9)
        # a hand-made crease is never ruler-straight: it wanders a little and is not equally sharp along its length
        dv = np.abs(lx - mx - 1.4 * np.sin(ly / 150 + 0.7) - 0.5 * np.sin(ly / 41 + 2.1))
        dh = np.abs(ly - my - 1.2 * np.sin(lx / 170 + 1.9) - 0.45 * np.sin(lx / 47))
        sharp_v = 1 + 0.25 * np.sin(ly / 230 + 0.4)
        sharp_h = 1 + 0.25 * np.sin(lx / 260 + 2.2)
        z += fold(dv, -2.0, 12 * sharp_v)
        left = lx < mx
        # the horizontal fold flips from ridge to valley where it crosses the vertical one
        blend = np.clip((lx - mx) / 30 + 0.5, 0, 1)
        z += fold(dh, 2.1, 10 * sharp_h) * (1 - blend) + fold(dh, -1.4, 10 * sharp_h) * blend
        # every quarter bows a little
        u = np.where(left, (lx - x0) / (mx - x0), (lx - mx) / (x1 - mx))
        w = np.where(ly < my, (ly - y0) / (my - y0), (ly - my) / (y1 - my))
        z += 1.5 * np.sin(np.clip(u, 0, 1) * math.pi) * np.sin(np.clip(w, 0, 1) * math.pi)
        z += 0.8 * np.sin(lx / 520 + 0.4) * np.cos(ly / 380 - 0.2)
        # edges lift off the desk; the near-left corner curls, the far-right one a little
        de = np.minimum(np.minimum(lx - x0, x1 - lx), np.minimum(ly - y0, y1 - ly))
        z += np.exp(-np.clip(de, 0, None) / 24) * 2.2
        z += 7.5 * np.exp(-np.hypot(lx - x0, ly - y1) / 95) + 3.0 * np.exp(-np.hypot(lx - x1, ly - y0) / 80)
        return z
    return height


def pass_sheet(key):
    v = SPEC['variants'][key]
    W, H = v['w'], v['h']
    sc = reset()
    sc.cycles.samples = max(16, int(256 * SAMPLES))
    sc.render.film_transparent = True
    px = SPEC['pxPerU'] * SCALE
    w, h = int(round(W * px)), int(round(H * px))
    edge = sheet_outline(v) * px
    mask = rasterize(edge, w, h)
    mask = gauss(mask, 0.35 * px) if px > 1 else mask
    near = gauss(mask, 6 * px); lip = gauss(mask, 1.0 * px)
    for f in os.listdir(TEX):
        if f.startswith(f'sheet-mask-{key}-'):
            os.remove(os.path.join(TEX, f))
    mask.astype(np.float32).tofile(os.path.join(TEX, f'sheet-mask-{key}-{w}x{h}.f32'))
    mask_img = np_image(f'sheet-mask-{key}', mask)
    near_img = np_image(f'sheet-near-{key}', np.stack([near, lip, np.zeros_like(near)], -1))
    ink = load_image(os.path.join(WORK, f'maps/sheet-ink-{key}.png'))
    ink.alpha_mode = 'STRAIGHT'
    felt = grid_mesh('felt', -600, -600, W + 600, H + 600, (W + 1200) / 4); felt.data.materials.append(felt_material())
    felt.is_shadow_catcher = True
    sheet = grid_mesh('sheet', 0, 0, W, H, 1.0 / max(1, px / 2), sheet_height_fn(v))
    sheet.data.materials.append(paper_material(mask_img, near_img, ink_img=ink, map_paper=True))
    lights()
    ortho_camera(W / 2, H / 2, W, W * SPEC['pxPerU'], H * SPEC['pxPerU'])
    render(f'sheet-{key}')


# ── Chapter 01: the mountain massif ─────────────────────────────────────────
def terrain_material():
    mat = bpy.data.materials.new('terrain')
    nt = nodes(mat)
    out = add(nt, 'ShaderNodeOutputMaterial')
    geo = add(nt, 'ShaderNodeNewGeometry')
    sepn = add(nt, 'ShaderNodeSeparateXYZ'); link(nt, geo.outputs['Normal'], sepn.inputs['Vector'])
    tc = add(nt, 'ShaderNodeTexCoord')
    nz = add(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9; nz.inputs['Detail'].default_value = 8
    link(nt, tc.outputs['Object'], nz.inputs['Vector'])
    nz2 = add(nt, 'ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 60; nz2.inputs['Detail'].default_value = 4
    link(nt, tc.outputs['Object'], nz2.inputs['Vector'])
    # flatness -> grass, steepness -> warm rock; noise breaks the boundary into patches
    # convex crests (pointiness) and steep faces read as warm bare rock; hollows and gentle slopes stay green
    pt = add(nt, 'ShaderNodeMapRange'); pt.inputs['From Min'].default_value = 0.47; pt.inputs['From Max'].default_value = 0.56
    pt.inputs['To Min'].default_value = 0.06; pt.inputs['To Max'].default_value = -0.10
    link(nt, geo.outputs['Pointiness'], pt.inputs['Value'])
    alt = add(nt, 'ShaderNodeMapRange'); alt.inputs['From Min'].default_value = 4.0; alt.inputs['From Max'].default_value = 8.0
    alt.inputs['To Min'].default_value = 0.0; alt.inputs['To Max'].default_value = -0.12
    sepp = add(nt, 'ShaderNodeSeparateXYZ'); link(nt, geo.outputs['Position'], sepp.inputs['Vector'])
    link(nt, sepp.outputs['Z'], alt.inputs['Value'])
    flat0 = add(nt, 'ShaderNodeMath'); flat0.operation = 'MULTIPLY_ADD'
    link(nt, nz.outputs['Fac'], flat0.inputs[0]); flat0.inputs[1].default_value = 0.16; link(nt, sepn.outputs['Z'], flat0.inputs[2])
    flat1 = add(nt, 'ShaderNodeMath'); flat1.operation = 'ADD'; link(nt, flat0.outputs['Value'], flat1.inputs[0]); link(nt, pt.outputs['Result'], flat1.inputs[1])
    flat = add(nt, 'ShaderNodeMath'); flat.operation = 'ADD'; link(nt, flat1.outputs['Value'], flat.inputs[0]); link(nt, alt.outputs['Result'], flat.inputs[1])
    ramp = add(nt, 'ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position = 0.55; els[0].color = hex_lin('#a07e57')
    els[1].position = 1.05; els[1].color = hex_lin('#93a442')
    for pos, col in ((0.68, '#d2ab70'), (0.76, '#bba268'), (0.82, '#94a04a'), (0.90, '#71902f')):
        e = els.new(pos); e.color = hex_lin(col)
    link(nt, flat.outputs['Value'], ramp.inputs['Fac'])
    var = add(nt, 'ShaderNodeMix'); var.data_type = 'RGBA'; var.blend_type = 'OVERLAY'
    var.inputs['Factor'].default_value = 0.22
    link(nt, ramp.outputs['Color'], var.inputs['A']); link(nt, nz2.outputs['Color'], var.inputs['B'])
    bs = add(nt, 'ShaderNodeBsdfPrincipled'); bs.inputs['Roughness'].default_value = 0.95
    bs.inputs['Specular IOR Level'].default_value = 0.2
    ao = add(nt, 'ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.6; ao.samples = 8
    aor = add(nt, 'ShaderNodeMapRange'); aor.inputs['To Min'].default_value = 0.55; link(nt, ao.outputs['AO'], aor.inputs['Value'])
    dark = add(nt, 'ShaderNodeMix'); dark.data_type = 'RGBA'; dark.blend_type = 'MULTIPLY'; dark.inputs['Factor'].default_value = 1.0
    link(nt, var.outputs['Result'], dark.inputs['A']); link(nt, aor.outputs['Result'], dark.inputs['B'])
    link(nt, dark.outputs['Result'], bs.inputs['Base Color'])
    bump = add(nt, 'ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.002
    link(nt, nz2.outputs['Fac'], bump.inputs['Height']); link(nt, bump.outputs['Normal'], bs.inputs['Normal'])
    attr = add(nt, 'ShaderNodeAttribute'); attr.attribute_name = 'fade'
    tr = add(nt, 'ShaderNodeBsdfTransparent'); mx = add(nt, 'ShaderNodeMixShader')
    link(nt, attr.outputs['Fac'], mx.inputs['Fac']); link(nt, tr.outputs['BSDF'], mx.inputs[1]); link(nt, bs.outputs['BSDF'], mx.inputs[2])
    link(nt, mx.outputs['Shader'], out.inputs['Surface'])
    return mat


def pass_terrain():
    sc = reset()
    sc.cycles.samples = max(16, int(192 * SAMPLES))
    sc.render.film_transparent = True
    # Real relief: Mount Hermon from the Terrarium DEM tiles (SRTM-derived, zoom 13, ~16 m/px),
    # stitched by fetch_home_map_table_sources.mjs. 1 BU = 1 km.
    W, H = 3072, 3584                                 # tiles x 4908..4919, y 3281..3294
    h = np.fromfile(os.path.join(SRC, f'dem/hermon13-{W}x{H}.f32'), np.float32).reshape(H, W).astype(np.float64)
    px_km = 0.01595
    ox, oy = 1024, 2048                               # world origin pixel (the framing below is measured from it)
    h = h[::-1]                                       # row 0 = south so +Y is north
    sm = gauss(h, 1.5)
    h = np.where(np.abs(h - sm) > 120, sm, h)          # despike DEM voids / spikes
    zs = float(os.environ.get('HMT_ZS', '3.2')) / 1000.0
    X, Y = np.meshgrid((np.arange(W) - ox) * px_km, (oy - (H - 1 - np.arange(H))) * px_km)
    verts = np.stack([X, Y, (h - 300.0) * zs], -1).reshape(-1, 3)
    idx = np.arange(W * H).reshape(H, W)
    quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    me = bpy.data.meshes.new('terrain')
    me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.astype(np.int32).ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set('loop_start', (np.arange(len(quads)) * 4).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(quads), 4, np.int32))
    me.update(calc_edges=True)
    me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
    # land beyond the main crest (seen from the camera side) fades out, so the summit ridge
    # meets an empty cream sky like the reference instead of the ranges behind it
    cam_xyz = [float(v) for v in os.environ.get('HMT_CAM', '29.7,12.1,18.9').split(',')]
    dist = np.hypot(X - cam_xyz[0], Y - cam_xyz[1])
    cut = float(os.environ.get('HMT_CUT', '36'))
    fade = np.clip((cut - dist) / 4.0, 0, 1)
    at = me.attributes.new('fade', 'FLOAT', 'POINT'); at.data.foreach_set('value', fade.ravel().astype(np.float32))
    ob = bpy.data.objects.new('terrain', me); sc.collection.objects.link(ob)
    ob.data.materials.append(terrain_material())
    # light: low warm sun from the right, cool sky fill (blue-green shadows of the reference)
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = hex_lin('#8fb3c4'); bg.inputs['Strength'].default_value = 0.42
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 5.2; sun.angle = math.radians(2.0); sun.color = (1.0, 0.84, 0.6)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(float(os.environ.get('HMT_SUN_TILT', '68'))), 0, math.radians(float(os.environ.get('HMT_SUN_AZ', '150'))))
    cam = bpy.data.cameras.new('cam'); cam.lens = float(os.environ.get('HMT_LENS', '55')); cam.clip_start = 0.05; cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    cx, cy, cz = (float(v) for v in os.environ.get('HMT_CAM', '29.7,12.1,18.9').split(','))
    tx, ty, tz = (float(v) for v in os.environ.get('HMT_TGT', '-6.0,7.6,-2.1').split(','))
    co.location = (cx, cy, cz)
    direction = np.array([tx - cx, ty - cy, tz - cz])
    from mathutils import Vector
    from mathutils import Quaternion
    q = Vector(direction).to_track_quat('-Z', 'Y')
    roll = Quaternion(Vector(direction).normalized(), math.radians(float(os.environ.get('HMT_ROLL', '-10'))))
    co.rotation_euler = (roll @ q).to_euler()
    sc.render.resolution_x = sc.render.resolution_y = int(1400 * SCALE)
    render('terrain')
    # distance pass for the aerial haze: emission = normalised view distance (no lights needed)
    dmat = bpy.data.materials.new('dist'); nt = nodes(dmat)
    camd = add(nt, 'ShaderNodeCameraData')
    rngd = add(nt, 'ShaderNodeMapRange'); rngd.inputs['From Min'].default_value = 30.0; rngd.inputs['From Max'].default_value = 90.0
    link(nt, camd.outputs['View Distance'], rngd.inputs['Value'])
    em = add(nt, 'ShaderNodeEmission'); link(nt, rngd.outputs['Result'], em.inputs['Strength'])
    em.inputs['Color'].default_value = (1, 1, 1, 1)
    outd = add(nt, 'ShaderNodeOutputMaterial')
    fa = add(nt, 'ShaderNodeAttribute'); fa.attribute_name = 'fade'
    trd = add(nt, 'ShaderNodeBsdfTransparent'); mxd = add(nt, 'ShaderNodeMixShader')
    link(nt, fa.outputs['Fac'], mxd.inputs['Fac']); link(nt, trd.outputs['BSDF'], mxd.inputs[1]); link(nt, em.outputs['Emission'], mxd.inputs[2])
    link(nt, mxd.outputs['Shader'], outd.inputs['Surface'])
    ob.data.materials[0] = dmat
    sun.energy = 0; bg.inputs['Strength'].default_value = 0
    sc.cycles.samples = 16; sc.cycles.use_denoising = False
    render('terrain-dist')


# ── Card stock: the cream board the chapter cards are printed on ───────────────
def pass_cardstock():
    sc = reset()
    sc.cycles.samples = max(16, int(160 * SAMPLES))
    white = np_image('one', np.ones((64, 64)))
    ob = grid_mesh('card', 0, 0, 700, 700, 7)
    m = paper_material(white, white, 'EXTEND')
    ob.data.materials.append(m)
    lights()
    ortho_camera(350, 350, 700, 1400, 1400)
    render('cardstock')


PASSES = {'felt': pass_felt, 'terrain': pass_terrain, 'cardstock': pass_cardstock}
for _k in SPEC['variants']:
    PASSES['sheet-' + _k] = (lambda k: lambda: pass_sheet(k))(_k)

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(PASSES)
    for p in argv:
        PASSES[p]()
