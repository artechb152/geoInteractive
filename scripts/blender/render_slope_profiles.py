"""Realistic side views for the 4 slope types (LandformsScene → "4 סוגי מדרונות").

Each slope is a papercut-diorama slab in the lesson-1 render style: a cut rock
face (topsoil over layered limestone) whose top edge is EXACTLY the lesson's
profile curve, with scrub, grass and rocks on the surface behind it.

The orthographic camera is locked to the SVG board of SlopeProfile
(viewBox 0 0 200 60), so the front edge of the slab lands on the same
coordinates the component uses for its crossings, drop lines and labels:

    svg x = 30 + 144·d            (d = 0 foot → 1 crest)
    svg y = 46 − 30·e             (e = 0 foot → 1 crest, 5 equal intervals)

Keep SLOPE_GEO, the board constants and the monotone cubic in sync with
src/components/lessons/topic-02/LandformsVisuals.tsx.

& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
    --python scripts/blender/render_slope_profiles.py -- [even|convex|concave|shoulder]
node scripts/blender/package_slope_profiles.cjs

Photo textures are the existing CC0 Poly Haven sets already in the repo. No network.
"""
import bpy, math, os, random, sys
from mathutils import Vector, noise
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/slope-blender')
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
os.makedirs(OUT, exist_ok=True)

# ── Shared with LandformsVisuals.tsx ────────────────────────────────────────
SLOPE_GEO = {
    'even': [(0, 0), (0.2, 0.2), (0.4, 0.4), (0.6, 0.6), (0.8, 0.8), (1, 1)],
    'convex': [(0, 0), (0.04, 0.2), (0.16, 0.4), (0.36, 0.6), (0.64, 0.8), (1, 1)],
    'concave': [(0, 0), (0.36, 0.2), (0.64, 0.4), (0.84, 0.6), (0.96, 0.8), (1, 1)],
    'shoulder': [(0, 0), (0.1, 0.2), (0.2, 0.4), (0.75, 0.6), (0.86, 0.8), (1, 1)],
}
VB_W, VB_H = 200, 60
SX0, SXW = 30, 144          # sx(d) = SX0 + SXW·d
GROUND, RISE = 46, 30       # py(e) = GROUND − RISE·e
LEFT, RIGHT = 18, 190       # slab ends (svg x)
BOTTOM = 53                 # slab underside at the cut face (svg y)
DEPTH = 18                  # slab depth behind the cut face (svg units)
TILT = math.radians(16)     # camera pitch below horizontal
S = 0.02                    # world units per svg unit
PX_PER_UNIT = 10            # 2000 × 600 render


def monotone_slopes(pts):
    """Fritsch–Carlson tangents — identical to monotoneSegments() in the TSX."""
    n = len(pts)
    h = [pts[i + 1][0] - pts[i][0] for i in range(n - 1)]
    delta = [(pts[i + 1][1] - pts[i][1]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0] = delta[0]
    m[n - 1] = delta[n - 2]
    for i in range(1, n - 1):
        m[i] = 0 if delta[i - 1] * delta[i] <= 0 else (delta[i - 1] + delta[i]) / 2
    for i in range(n - 1):
        if delta[i] == 0:
            m[i] = m[i + 1] = 0
            continue
        a = m[i] / delta[i]
        b = m[i + 1] / delta[i]
        s = a * a + b * b
        if s > 9:
            t = 3 / math.sqrt(s)
            m[i] = t * a * delta[i]
            m[i + 1] = t * b * delta[i]
    return h, m


def profile_fn(pts):
    """e(d). The TSX Bézier has its d-controls at thirds, so d(τ) is linear and
    each segment is exactly the cubic Hermite below."""
    h, m = monotone_slopes(pts)

    def e_of(d):
        if d <= 0:
            return 0.0
        if d >= 1:
            return 1.0
        for i in range(len(pts) - 1):
            if d <= pts[i + 1][0]:
                t = (d - pts[i][0]) / h[i]
                p0, p1 = pts[i][1], pts[i + 1][1]
                c1 = p0 + m[i] * h[i] / 3
                c2 = p1 - m[i + 1] * h[i] / 3
                u = 1 - t
                return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p1
        return 1.0

    return e_of


# ── svg ↔ world ────────────────────────────────────────────────────────────
COS_T = math.cos(TILT)
wx = lambda x: (x - 100) * S                        # svg x → world x
wz = lambda y: (GROUND - y) * S / COS_T             # svg y (on the cut face) → world z
wy = lambda depth: depth * S                         # svg depth → world y (away from camera)
d_of = lambda x: (x - SX0) / SXW


def rgba(hx):
    rgb = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)


def image(name):
    return bpy.data.images.load(os.path.join(TEX, name), check_existing=True)


def new_material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = rgba(color)
    bs.inputs['Roughness'].default_value = .9
    return m


def tex_node(ns, lk, filename, vector):
    tx = ns.new('ShaderNodeTexImage')
    tx.image = image(filename)
    tx.projection = 'BOX'
    tx.projection_blend = .35
    lk.new(vector, tx.inputs['Vector'])
    return tx


def surface_material():
    """Top of the slab: dry grass and scrub litter on gentle ground, bare soil
    and rock where it is steep (reads the same way on a real hillside)."""
    m = new_material('Hillside surface', '#8A9163')
    nt = m.node_tree; ns = nt.nodes; lk = nt.links; bs = ns.get('Principled BSDF')
    tc = ns.new('ShaderNodeTexCoord')
    sc = ns.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs[3].default_value = 2.2
    lk.new(tc.outputs['Object'], sc.inputs[0])
    grass = tex_node(ns, lk, 'forest_diff.jpg', sc.outputs[0])
    moss = tex_node(ns, lk, 'grass_diff.jpg', sc.outputs[0])
    soil = tex_node(ns, lk, 'dry_diff.jpg', sc.outputs[0])
    rock = tex_node(ns, lk, 'rock_diff.jpg', sc.outputs[0])
    patches = ns.new('ShaderNodeTexNoise'); patches.inputs['Scale'].default_value = 6; patches.inputs['Detail'].default_value = 3
    lk.new(tc.outputs['Object'], patches.inputs['Vector'])
    pr = ns.new('ShaderNodeMapRange'); pr.clamp = True; pr.inputs['From Min'].default_value = .38; pr.inputs['From Max'].default_value = .62
    lk.new(patches.outputs['Fac'], pr.inputs['Value'])
    veg = ns.new('ShaderNodeMixRGB'); lk.new(pr.outputs[0], veg.inputs[0]); lk.new(grass.outputs['Color'], veg.inputs[1]); lk.new(moss.outputs['Color'], veg.inputs[2])
    bare = ns.new('ShaderNodeMixRGB'); lk.new(pr.outputs[0], bare.inputs[0]); lk.new(soil.outputs['Color'], bare.inputs[1]); lk.new(rock.outputs['Color'], bare.inputs[2])
    geom = ns.new('ShaderNodeNewGeometry'); sep = ns.new('ShaderNodeSeparateXYZ'); lk.new(geom.outputs['Normal'], sep.inputs[0])
    steep = ns.new('ShaderNodeMapRange'); steep.clamp = True
    steep.inputs['From Min'].default_value = .93; steep.inputs['From Max'].default_value = .72
    lk.new(sep.outputs['Z'], steep.inputs['Value'])
    mix = ns.new('ShaderNodeMixRGB'); lk.new(steep.outputs[0], mix.inputs[0]); lk.new(veg.outputs[0], mix.inputs[1]); lk.new(bare.outputs[0], mix.inputs[2])
    hsv = ns.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = .78; hsv.inputs['Value'].default_value = 1.0
    lk.new(mix.outputs[0], hsv.inputs['Color']); lk.new(hsv.outputs[0], bs.inputs['Base Color'])
    detail = ns.new('ShaderNodeTexNoise'); detail.inputs['Scale'].default_value = 160; detail.inputs['Detail'].default_value = 5
    lk.new(tc.outputs['Object'], detail.inputs['Vector'])
    bump = ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .5; bump.inputs['Distance'].default_value = .01
    lk.new(detail.outputs['Fac'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value = .95
    return m


def section_material():
    """Cut face: dark topsoil band following the surface, over layered rock.
    `depth` (svg units below the surface) is a per-vertex attribute."""
    m = new_material('Cut face — topsoil over limestone', '#C9B892')
    nt = m.node_tree; ns = nt.nodes; lk = nt.links; bs = ns.get('Principled BSDF')
    tc = ns.new('ShaderNodeTexCoord'); sep = ns.new('ShaderNodeSeparateXYZ'); comb = ns.new('ShaderNodeCombineXYZ')
    lk.new(tc.outputs['Object'], sep.inputs[0])
    lk.new(sep.outputs['X'], comb.inputs['X']); lk.new(sep.outputs['Z'], comb.inputs['Y'])

    def mapped(sx, sy, ox, oy):
        mp = ns.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (sx, sy, 1); mp.inputs['Location'].default_value = (ox, oy, 0)
        lk.new(comb.outputs[0], mp.inputs['Vector'])
        return mp.outputs[0]

    # Long limestone beds (one tile ≈ the whole slab, so nothing visibly repeats),
    # with the crackled rock photo overlaid for close-up detail.
    beds = ns.new('ShaderNodeTexImage'); beds.image = bpy.data.images.load(
        os.path.join(ROOT, 'public/assets/lessons/topic02/contour-density/limestone-section.webp'), check_existing=True)
    lk.new(mapped(.3, 1.25, .45, .22), beds.inputs['Vector'])
    rock = ns.new('ShaderNodeTexImage'); rock.image = image('rock_diff.jpg'); lk.new(mapped(.55, 1.5, .13, .4), rock.inputs['Vector'])
    rock_grey = ns.new('ShaderNodeHueSaturation'); rock_grey.inputs['Saturation'].default_value = .35
    lk.new(rock.outputs['Color'], rock_grey.inputs['Color'])
    detail = ns.new('ShaderNodeMixRGB'); detail.blend_type = 'OVERLAY'; detail.inputs[0].default_value = .55
    lk.new(beds.outputs['Color'], detail.inputs[1]); lk.new(rock_grey.outputs[0], detail.inputs[2])
    soil = ns.new('ShaderNodeTexImage'); soil.image = image('dry_diff.jpg'); lk.new(mapped(3, 3, 0, 0), soil.inputs['Vector'])
    soil_dark = ns.new('ShaderNodeHueSaturation'); soil_dark.inputs['Value'].default_value = .5; soil_dark.inputs['Saturation'].default_value = .95
    lk.new(soil.outputs['Color'], soil_dark.inputs['Color'])
    rock_tone = ns.new('ShaderNodeHueSaturation'); rock_tone.inputs['Saturation'].default_value = .85; rock_tone.inputs['Value'].default_value = 1.08
    lk.new(detail.outputs[0], rock_tone.inputs['Color'])
    attr = ns.new('ShaderNodeAttribute'); attr.attribute_name = 'depth'
    wob = ns.new('ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 22; wob.inputs['Detail'].default_value = 4
    lk.new(tc.outputs['Object'], wob.inputs['Vector'])
    wobs = ns.new('ShaderNodeMath'); wobs.operation = 'MULTIPLY_ADD'; wobs.inputs[1].default_value = 1.6; wobs.inputs[2].default_value = -.8
    lk.new(wob.outputs['Fac'], wobs.inputs[0])
    d = ns.new('ShaderNodeMath'); d.operation = 'ADD'; lk.new(attr.outputs['Fac'], d.inputs[0]); lk.new(wobs.outputs[0], d.inputs[1])
    band = ns.new('ShaderNodeMapRange'); band.clamp = True; band.inputs['From Min'].default_value = 1.3; band.inputs['From Max'].default_value = 2.3
    lk.new(d.outputs[0], band.inputs['Value'])
    mix = ns.new('ShaderNodeMixRGB'); lk.new(band.outputs[0], mix.inputs[0]); lk.new(soil_dark.outputs[0], mix.inputs[1]); lk.new(rock_tone.outputs[0], mix.inputs[2])
    lk.new(mix.outputs[0], bs.inputs['Base Color'])
    bump = ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .6; bump.inputs['Distance'].default_value = .02
    lk.new(rock.outputs['Color'], bump.inputs['Height']); lk.new(bump.outputs[0], bs.inputs['Normal'])
    return m


def card_material(name, filename, tint):
    m = new_material(name, tint)
    ns = m.node_tree.nodes; lk = m.node_tree.links; bs = ns.get('Principled BSDF')
    tx = ns.new('ShaderNodeTexImage'); tx.image = image(filename)
    hsv = ns.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = .72; hsv.inputs['Value'].default_value = .8
    lk.new(tx.outputs['Color'], hsv.inputs['Color']); lk.new(hsv.outputs[0], bs.inputs['Base Color'])
    lk.new(tx.outputs['Alpha'], bs.inputs['Alpha'])
    bs.inputs['Roughness'].default_value = .8
    return m


def mesh(name, verts, faces, mat, smooth=True, uvs=None, attrs=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if uvs is not None:
        layer = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            for li in p.loop_indices:
                layer.data[li].uv = uvs[me.loops[li].vertex_index]
    for key, values in (attrs or {}).items():
        a = me.attributes.new(name=key, type='FLOAT', domain='POINT')
        for i, v in enumerate(values):
            a.data[i].value = v
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); me.materials.append(mat)
    return ob


def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        # Only probe OptiX: probing every backend crashes in the oneAPI loader here.
        devices = prefs.get_devices_for_type('OPTIX')
        for dev in devices:
            dev.use = True
        if any(dev.type == 'OPTIX' for dev in devices):
            sc.cycles.device = 'GPU'
    except Exception as exc:  # CPU fallback keeps the script portable
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.samples = int(os.environ.get('SLOPE_SAMPLES', 160))
    sc.cycles.use_denoising = True
    sc.render.resolution_x = VB_W * PX_PER_UNIT
    sc.render.resolution_y = VB_H * PX_PER_UNIT
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('Sky'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (.8, .82, .86, 1); bg.inputs[1].default_value = .7
    # Warm key from the front-left and above (same side as the lesson dioramas).
    sun_dir = Vector((-.38, -.72, .58)).normalized()
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
    sun.rotation_euler = sun_dir.to_track_quat('Z', 'Y').to_euler()
    sun.data.energy = 4.3; sun.data.angle = math.radians(4); sun.data.color = (1, .95, .86)
    # Camera: orthographic, pitched down by TILT, framing the 200 × 60 board.
    cam_data = bpy.data.cameras.new('Board camera'); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = VB_W * S; cam_data.sensor_fit = 'HORIZONTAL'; cam_data.clip_end = 200
    cam = bpy.data.objects.new('Board camera', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    look = Vector((0, math.cos(TILT), -math.sin(TILT)))
    centre = Vector((0, 0, wz(VB_H / 2)))
    cam.location = centre - look * 30
    cam.rotation_euler = (math.pi / 2 - TILT, 0, 0)
    return sc


def svg_of(co):
    sc = bpy.context.scene
    p = world_to_camera_view(sc, sc.camera, Vector(co))
    return (p.x * VB_W, (1 - p.y) * VB_H)


def build(kind):
    rng = random.Random(4242 + len(kind))
    e_of = profile_fn(SLOPE_GEO[kind])
    zsurf_front = lambda x: wz(GROUND - RISE * e_of(d_of(x)))

    def zsurf(x, depth):
        # Real ground is never a perfect extrusion: gentle undulation that fades
        # in behind the cut face so the front edge stays exactly on the profile.
        fade = min(1.0, depth / 3.0)
        n = noise.fractal(Vector((x * .09, depth * .12, 1.7)), .55, 2.0, 4)
        drift = .9 * math.sin(depth * .21 + x * .013)  # the slope wanders slightly with depth
        return zsurf_front(x + drift * fade) + n * .55 * S * fade

    # Top surface grid (finer rows near the cut edge).
    xs = [LEFT + i * .5 for i in range(int((RIGHT - LEFT) / .5) + 1)]
    ds = [0, .15, .35, .6, .9, 1.3, 1.8, 2.4] + [3 + i * .75 for i in range(int((DEPTH - 3) / .75) + 1)]
    verts = [(wx(x), wy(dp), zsurf(x, dp)) for dp in ds for x in xs]
    nx = len(xs)
    faces = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(len(ds) - 1) for i in range(nx - 1)]
    mesh('Hillside ' + kind, verts, faces, surface_material())

    # Cut face — two vertices per column (surface edge, underside), depth attribute in svg units.
    fx = [LEFT + i * .25 for i in range(int((RIGHT - LEFT) / .25) + 1)]
    fverts, depth = [], []
    for x in fx:
        top = zsurf_front(x)
        fverts += [(wx(x), 0, top), (wx(x), 0, wz(BOTTOM))]
        depth += [0.0, (top - wz(BOTTOM)) / (S / COS_T)]
    ffaces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(fx) - 1)]
    mesh('Cut face ' + kind, fverts, ffaces, section_material(), smooth=False, attrs={'depth': depth})
    # Underside + back + ends close the slab so shadows and bounce light are right.
    base = [(wx(LEFT), 0, wz(BOTTOM)), (wx(RIGHT), 0, wz(BOTTOM)), (wx(RIGHT), wy(DEPTH), wz(BOTTOM)), (wx(LEFT), wy(DEPTH), wz(BOTTOM))]
    mesh('Underside', base, [(0, 3, 2, 1)], new_material('Underside', '#6B5A42'), smooth=False)
    back = [(wx(x), wy(DEPTH), zsurf(x, DEPTH)) for x in xs] + [(wx(x), wy(DEPTH), wz(BOTTOM)) for x in xs]
    mesh('Back', back, [(i, i + 1, nx + i + 1, nx + i) for i in range(nx - 1)], new_material('Back', '#6B5A42'), smooth=False)
    for x in (LEFT, RIGHT):
        end = [(wx(x), wy(dp), zsurf(x, dp)) for dp in ds] + [(wx(x), wy(dp), wz(BOTTOM)) for dp in ds]
        n = len(ds)
        mesh('End', end, [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)], section_material(), smooth=False,
             attrs={'depth': [0.0] * n + [(zsurf(x, dp) - wz(BOTTOM)) / (S / COS_T) for dp in ds]})

    # Contact shadow on the page: a shadow catcher under the slab. It stops at the
    # slab ends, so the side shadow never smears across the board margins.
    x0, x1 = wx(LEFT - 3), wx(RIGHT)
    bpy.ops.mesh.primitive_plane_add(size=1, location=((x0 + x1) / 2, 0, wz(BOTTOM) - .0005))
    catcher = bpy.context.object; catcher.scale = (x1 - x0, 1.2, 1); catcher.is_shadow_catcher = True

    scatter(kind, zsurf, e_of, rng)


def scatter(kind, zsurf, e_of, rng):
    """Scrub, grass tufts and rocks — scrub thins out and rock takes over on
    steep ground. Nothing stands in front of the cut edge, so the crossings on
    the profile are never covered."""
    leaves = card_material('Scrub leaves', 'leaves.png', '#55613C')
    grass = card_material('Grass tufts', 'grass.png', '#8A9163')
    rock_mat = new_material('Limestone boulders', '#BDB39A')
    rock_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .85
    # Slope (svg units of rise per unit run) at x, from the profile itself.
    grad = lambda x: RISE * (e_of(d_of(x + .4)) - e_of(d_of(x - .4))) / .8

    bverts, bfaces, buvs = [], [], []
    gverts, gfaces, guvs = [], [], []

    def card(vs, fs, uvs, cx, cy, cz, w, h, ang, quad):
        u0, v0 = quad
        dx, dy = math.cos(ang) * w / 2, math.sin(ang) * w / 2
        j = len(vs)
        vs += [(cx - dx, cy - dy, cz), (cx + dx, cy + dy, cz), (cx + dx, cy + dy, cz + h), (cx - dx, cy - dy, cz + h)]
        fs.append((j, j + 1, j + 2, j + 3))
        uvs += [(u0, v0), (u0 + .5, v0), (u0 + .5, v0 + .5), (u0, v0 + .5)]

    # Scrub bushes: 3 crossed leaf cards + a dark core for volume.
    cores = []
    for _ in range(620):
        x = rng.uniform(LEFT + 1, RIGHT - 1)
        size = rng.uniform(.9, 2.1)
        dp = rng.uniform(size * .6 + .4, DEPTH - 1)
        g = grad(x)
        # Mediterranean scrub grows in clumps, thinning out on steep ground.
        clump = .5 + .5 * noise.noise(Vector((x * .07, dp * .16, 3.1)))
        if rng.random() < min(.85, g * .75) or rng.random() > clump * 1.35:
            continue
        cx, cy, cz = wx(x), wy(dp), zsurf(x, dp) - .15 * S
        w = size * S * rng.uniform(1.1, 1.5); h = size * S
        quad = (rng.choice((0, .5)), rng.choice((0, .5)))
        for k in range(3):
            card(bverts, bfaces, buvs, cx, cy, cz, w, h, rng.random() * math.pi / 3 + k * math.pi / 3, quad)
        cores.append((cx, cy, cz + h * .38, h * .36))
    if bverts:
        mesh('Scrub', bverts, bfaces, leaves, smooth=False, uvs=buvs)
    core_mat = new_material('Scrub core', '#3E4A2C')
    for (cx, cy, cz, r) in cores:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(cx, cy, cz))
        ob = bpy.context.object; ob.scale = (r * 1.25, r * 1.1, r * .9); ob.data.materials.append(core_mat)

    # Grass tufts everywhere it is not too steep, including along the cut edge.
    for _ in range(2600):
        x = rng.uniform(LEFT + .5, RIGHT - .5)
        size = rng.uniform(.45, .95)
        dp = rng.uniform(size * .35 + .15, DEPTH - .5)
        if rng.random() < min(.9, grad(x) * .9):
            continue
        cx, cy, cz = wx(x), wy(dp), zsurf(x, dp) - .05 * S
        quad = (rng.choice((0, .5)), 0)
        for k in range(2):
            card(gverts, gfaces, guvs, cx, cy, cz, size * S * 1.2, size * S, rng.random() * math.pi + k * math.pi / 2, quad)
    if gverts:
        # grass.png holds two tufts side by side over the full height
        guvs = [(u, 0 if v == 0 else 1) for (u, v) in guvs]
        mesh('Grass', gverts, gfaces, grass, smooth=False, uvs=guvs)

    # Rocks: many on steep ground, a few on gentle ground.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    proto = bpy.context.object; rock_mesh = proto.data.copy(); bpy.data.objects.remove(proto, do_unlink=True)
    for v in rock_mesh.vertices:
        v.co *= 1 + .28 * noise.noise(v.co * 1.7)
    rock_mesh.materials.append(rock_mat)
    for _ in range(900):
        x = rng.uniform(LEFT + 1, RIGHT - 1)
        size = rng.uniform(.3, 1.1)
        dp = rng.uniform(size + .3, DEPTH - .6)
        if rng.random() > .12 + min(.85, grad(x) * .6):
            continue
        ob = bpy.data.objects.new('Rock', rock_mesh); bpy.context.collection.objects.link(ob)
        r = size * S * .55
        ob.location = (wx(x), wy(dp), zsurf(x, dp))
        ob.scale = (r * rng.uniform(1, 1.6), r * rng.uniform(.8, 1.2), r * rng.uniform(.45, .75))
        ob.rotation_euler = (rng.random() * .4, rng.random() * .4, rng.random() * math.pi)


def verify(kind):
    """The cut edge must land on the TSX crossings (sub-pixel)."""
    e_of = profile_fn(SLOPE_GEO[kind])
    worst = 0
    for d, e in SLOPE_GEO[kind]:
        x = SX0 + SXW * d
        got = svg_of((wx(x), 0, wz(GROUND - RISE * e_of(d))))
        worst = max(worst, abs(got[0] - x), abs(got[1] - (GROUND - RISE * e)))
    print(f'{kind}: max crossing error {worst:.4f} svg units', flush=True)
    assert worst < .05, 'camera does not match the SVG board'


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for kind in (args or list(SLOPE_GEO)):
        sc = setup()
        build(kind)
        bpy.context.view_layer.update()
        verify(kind)
        sc.render.filepath = os.path.join(OUT, kind + '.png')
        bpy.ops.render.render(write_still=True)
    print('SLOPE PROFILE RENDERS COMPLETE', flush=True)
