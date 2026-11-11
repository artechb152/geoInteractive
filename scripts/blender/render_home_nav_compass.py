"""
Homepage chapter card 03 („ניווטים”): an olive-painted pocket compass lying open on the route map,
shot like a product photograph from almost straight above.

  node scripts/blender/home_map_table_maps.cjs navmap          # route map print + placement (navcompass.json)
  node scripts/blender/home_nav_compass_print.cjs              # the ivory dial's print (navcompass-gold-dial.png)
  blender --background --python scripts/blender/render_home_nav_compass.py
  node scripts/blender/package_home_map_table.cjs navigation   # -> public/assets/home/map-table/chapter-navigation.webp

Renders qa-output/home-map-table/render/nav-compass.png: a 1400² card-sized RGBA layer holding ONLY the
instrument and its contact shadow (shadow catcher, black at shadow strength) on transparency. The packager
lays it over the printed map.

The instrument: a flat-backed case and a thick bezel in olive paint over metal (matte-satin: a faint orange
peel, a soft sheen, a little shade in the joints and a hint of wear on the most exposed edges), a recessed
ivory dial under a thin, very clear glass, and a raised red / dark-steel needle on a brass pivot. The bezel is a
real turned profile (a rounded bead, a soft inner lip down to the glass) and meets the case at a fine seam.
A crown and bail sit on one side; on the other, a three-knuckle hinge, the lid laid back until it rests on
the map.

Light: the scene's one light — high beyond the card's far edge, a little to the right, like the sheet's sun
(render_home_map_table.py lights()) — so the contact shadow falls toward the viewer and slightly left. Reflections
come from a studio HDRI that only glossy rays see (Poly Haven „studio_small_08”, CC0, in
qa-output/home-map-table/src/hdri).

Seen almost straight down (HNC_TILT, a few degrees toward the viewer): the dial reads nearly round, and only
the near side of the body shows its thickness.
Draft: HNC_SAMPLES=64 HNC_SCALE=0.5.
"""
import bpy, bmesh, json, math, os
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
WORK = os.path.join(ROOT, 'qa-output/home-map-table')
MAPS = os.path.join(WORK, 'maps')
OUT = os.environ.get('HNC_OUT') or os.path.join(WORK, 'render', 'nav-compass.png')
SPEC = json.load(open(os.path.join(MAPS, 'navcompass.json')))
HDRI = os.path.join(WORK, 'src', 'hdri', os.environ.get('HNC_HDRI', 'studio_small_08_2k.hdr'))
SAMPLES = int(os.environ.get('HNC_SAMPLES', '640'))
SCALE = float(os.environ.get('HNC_SCALE', '1'))

TILT = math.radians(float(os.environ.get('HNC_TILT', '7')))     # camera tilt from straight down, toward the viewer
LENS = 85.0
# The card face is shown posed on the table (MapTableHome.module.css .card: rotateX(21deg) in a perspective), which
# squashes it to ~0.845 of its width on screen. The instrument is pre-stretched vertically to make up most of that
# (anamorphic pixels; horizontal scale and placement unchanged), so on the page its dial reads nearly round while
# the flat map print under it keeps the card's pose. 1 = a plain render.
# Measured on the page (1920×910, chapter 03's slot): the posed card shows the art at ~0.95 of its height, so 1.05
# brings the dial back to round (1.16 left it ~6% too tall and the ring looked swollen).
ANAMORPH = float(os.environ.get('HNC_ANAMORPH', '1.05'))
# placement on the card (fractions): case centre and case radius. The card's copy zone is top-right, so the
# lid opens toward the left and runs off the card's edge.
PLACE = json.loads(os.environ.get('HNC_PLACE', 'null')) or {'cx': 0.35, 'cy': 0.66, 'r': 0.25}
HINGE = math.radians(float(os.environ.get('HNC_HINGE', '168')))  # hinge direction (world, CCW from +x; +y = card up)
OPEN = os.environ.get('HNC_OPEN')                                # lid opening angle (deg); default: laid back onto the map
DIAL_ROT = float(os.environ.get('HNC_DIAL', '-6'))               # dial print turned (deg, clockwise on the card)
NEEDLE = float(os.environ.get('HNC_NEEDLE', '14'))               # needle bearing on the card (deg, clockwise)
WEAR = float(os.environ.get('HNC_WEAR', '0.35'))                 # paint wear on the most exposed edges (0 = none)

# profile heights, case radius R = 1: a thick body you could hold
Z_SEAT = 0.40      # top of the bezel / where the lid closes
Z_GLASS = 0.352
Z_DIAL = 0.206
# LIP: how far the bezel's inner lip, the glass and the dial are pushed outward — a slimmer ring, a larger face
LIP = float(os.environ.get('HNC_LIP', '0.034'))
DIAL_R = 0.822 + LIP
Z_NEEDLE = Z_DIAL + 0.082   # the needle floats well clear of the dial and casts its own small shadow

OLIVE = os.environ.get('HNC_OLIVE', '#474d37')       # paint, before light
OLIVE_DARK = '#393e2d'


def lin(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (a,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'OPTIX'
        devices = prefs.get_devices_for_type('OPTIX')
        for dev in devices:
            dev.use = True
        if any(dev.type == 'OPTIX' for dev in devices):
            sc.cycles.device = 'GPU'
    except Exception as exc:
        print('GPU unavailable, rendering on CPU:', exc)
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 12
    sc.cycles.glossy_bounces = 8
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.4
    sc.view_settings.view_transform = os.environ.get('HNC_VIEW', 'AgX')
    sc.view_settings.look = os.environ.get('HNC_LOOK', 'AgX - Medium High Contrast')
    sc.view_settings.exposure = float(os.environ.get('HNC_EXPOSURE', '0.25'))
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = int(SPEC['card'] * SCALE)
    sc.render.resolution_percentage = 100
    sc.render.pixel_aspect_x = ANAMORPH   # each pixel covers more width: the image stretches vertically by ANAMORPH
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '16'
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    return sc


# ── node helpers ────────────────────────────────────────────────────────────────
def sock(node, ident, out=False):
    for s in (node.outputs if out else node.inputs):
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def nodes(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes['Principled BSDF']


def math_node(nt, op, a=None, b=None, c=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def mix_rgb(nt, fac, a, b, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend
    for ident, v in (('A_Color', a), ('B_Color', b)):
        if isinstance(v, tuple):
            sock(n, ident).default_value = v
        else:
            nt.links.new(v, sock(n, ident))
    if isinstance(fac, (int, float)):
        sock(n, 'Factor_Float').default_value = fac
    else:
        nt.links.new(fac, sock(n, 'Factor_Float'))
    return sock(n, 'Result_Color', out=True)


def obj_coords(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    return tc.outputs['Object']


def radius_of(nt, co):
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(co, sep.inputs[0])
    x2 = math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X'])
    y2 = math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])
    return math_node(nt, 'SQRT', math_node(nt, 'ADD', x2, y2))


def ramp(nt, value, p0, p1):
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = p0; cr.color_ramp.elements[1].position = p1
    nt.links.new(value, cr.inputs['Fac'])
    return cr.outputs['Color']


# ── materials ───────────────────────────────────────────────────────────────────
def mat_paint(name, base=OLIVE, rough=0.46, wear=WEAR, grooves=(), shade=0.55):
    """Olive paint over metal, matte-satin. A soft tone drift, a fine orange peel, a little shade where parts
    meet (local AO) and, on the most exposed convex edges only, the paint rubbed a shade lighter.
    grooves: (radius, half-width) fine turned lines cut into a lathed face (object radius)."""
    m, nt, b = nodes(name)
    co = obj_coords(nt)
    b.inputs['Metallic'].default_value = 0.0
    b.inputs['Specular IOR Level'].default_value = 0.42
    b.inputs['Coat Weight'].default_value = float(os.environ.get('HNC_COAT', '0.22'))
    b.inputs['Coat Roughness'].default_value = float(os.environ.get('HNC_COAT_ROUGH', '0.22'))
    # tone: the paint is never one flat colour
    tone = nt.nodes.new('ShaderNodeTexNoise'); tone.inputs['Scale'].default_value = 2.4; tone.inputs['Detail'].default_value = 4.0
    nt.links.new(co, tone.inputs['Vector'])
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY_ADD', tone.outputs['Fac'], 0.7, -0.05, clamp=True), lin(base), lin(OLIVE_DARK))
    fleck = nt.nodes.new('ShaderNodeTexNoise'); fleck.inputs['Scale'].default_value = 70.0; fleck.inputs['Detail'].default_value = 8.0
    nt.links.new(co, fleck.inputs['Vector'])
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', ramp(nt, fleck.outputs['Fac'], 0.45, 0.75), 0.12), col, lin('#555b44'))
    # wear: convex edges a shade lighter, broken up so it never reads as an outline
    if wear > 0:
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        edge = ramp(nt, geo.outputs['Pointiness'], 0.515, 0.56)
        brk = nt.nodes.new('ShaderNodeTexNoise'); brk.inputs['Scale'].default_value = 26.0; brk.inputs['Detail'].default_value = 6.0
        nt.links.new(co, brk.inputs['Vector'])
        edge = math_node(nt, 'MULTIPLY', edge, ramp(nt, brk.outputs['Fac'], 0.42, 0.62))
        col = mix_rgb(nt, math_node(nt, 'MULTIPLY', edge, wear), col, lin('#6f7259'))
    # a touch of shade in joints and grooves, never black
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.samples = 12; ao.inputs['Distance'].default_value = 0.05
    shaded = mix_rgb(nt, ao.outputs['AO'], lin('#232819'), col)
    nt.links.new(mix_rgb(nt, shade, col, shaded), b.inputs['Base Color'])
    # roughness: satin with a soft drift
    rv = nt.nodes.new('ShaderNodeTexNoise'); rv.inputs['Scale'].default_value = 11.0; rv.inputs['Detail'].default_value = 5.0
    nt.links.new(co, rv.inputs['Vector'])
    nt.links.new(math_node(nt, 'MULTIPLY_ADD', rv.outputs['Fac'], 0.10, rough - 0.05), b.inputs['Roughness'])
    # orange peel + any turned grooves
    peel = nt.nodes.new('ShaderNodeTexNoise'); peel.inputs['Scale'].default_value = 340.0; peel.inputs['Detail'].default_value = 2.0
    nt.links.new(co, peel.inputs['Vector'])
    height = math_node(nt, 'MULTIPLY', peel.outputs['Fac'], 0.25)
    if grooves:
        rad = radius_of(nt, co)
        for r0, hw in grooves:
            d = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', rad, r0))
            g = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'DIVIDE', d, hw), clamp=True)
            height = math_node(nt, 'SUBTRACT', height, math_node(nt, 'MULTIPLY', math_node(nt, 'POWER', g, 0.6), 1.0))
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.22 if grooves else 0.05
    bump.inputs['Distance'].default_value = 0.0012
    nt.links.new(height, bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_metal(name, hexc, rough=0.3, aniso=0.0):
    m, nt, b = nodes(name)
    b.inputs['Base Color'].default_value = lin(hexc)
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    b.inputs['Anisotropic'].default_value = aniso
    return m


def mat_dial():
    m, nt, b = nodes('dial')
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Specular IOR Level'].default_value = 0.3
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Location'].default_value = (0.5, 0.5, 0)
    mp.inputs['Scale'].default_value = (0.5 / DIAL_R, 0.5 / DIAL_R, 1)
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(DIAL_ROT))
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    img = nt.nodes.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(os.path.join(MAPS, 'navcompass-gold-dial.png'), check_existing=True)
    img.image.alpha_mode = 'STRAIGHT'; img.interpolation = 'Cubic'; img.extension = 'CLIP'
    nt.links.new(mp.outputs['Vector'], img.inputs['Vector'])
    # ivory stock, a faint warm mottling toward the rim
    rad = radius_of(nt, tc.outputs['Object'])
    edge = math_node(nt, 'POWER', math_node(nt, 'DIVIDE', rad, DIAL_R, clamp=True), 6.0)
    stock = mix_rgb(nt, math_node(nt, 'MULTIPLY', edge, 0.45), lin('#f2e6cb'), lin('#e2d0aa'))
    col = mix_rgb(nt, img.outputs['Alpha'], stock, img.outputs['Color'])
    nt.links.new(col, b.inputs['Base Color'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900.0; nz.inputs['Detail'].default_value = 6.0
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.04; bump.inputs['Distance'].default_value = 0.0004
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_enamel(name, hexc, rough=0.3, coat=0.35):
    m, nt, b = nodes(name)
    b.inputs['Base Color'].default_value = lin(hexc)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.12
    return m


def mat_glass():
    """Thin mineral glass, very clear: a faint Fresnel reflection over plain see-through; never a shadow on the dial."""
    m = bpy.data.materials.new('glass'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.1
    fac = math_node(nt, 'MULTIPLY_ADD', lw.outputs['Fresnel'], float(os.environ.get('HNC_GLASS', '0.34')), 0.012)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.03
    gl.inputs['Color'].default_value = (1, 1, 1, 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = (0.995, 0.993, 0.985, 1)
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fac, mix.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], mix.inputs[1]); nt.links.new(gl.outputs['BSDF'], mix.inputs[2])
    lp = nt.nodes.new('ShaderNodeLightPath')
    sh = nt.nodes.new('ShaderNodeMixShader'); tr2 = nt.nodes.new('ShaderNodeBsdfTransparent')
    nt.links.new(lp.outputs['Is Shadow Ray'], sh.inputs['Fac']); nt.links.new(mix.outputs['Shader'], sh.inputs[1]); nt.links.new(tr2.outputs['BSDF'], sh.inputs[2])
    nt.links.new(sh.outputs['Shader'], out.inputs['Surface'])
    return m


def mat_paper():
    m, nt, b = nodes('paper')   # what the shadow catcher bounces / mirrors back into the instrument
    b.inputs['Base Color'].default_value = lin('#e9d3ad')
    b.inputs['Roughness'].default_value = 0.95
    return m


# Reflectors only reflections see — a studio's window strips, mirrored in the glass and the bezel's clear coat.
# Each: [offset x, offset y, roll°, strength, width, edge feather]. The offsets tip the strip away from the glass's
# mirror direction; on the glass a strip lands about 0.47 R out per 0.1 of offset. The strip's
# orientation on the glass follows both its roll and its offset — tune by render, not by formula.
#   1. the main window: a soft wash over the dial's left half, its edge just short of the needle
#   2. a thin bright strip near the lower-right rim, the second edge a domed glass always shows
SOFTBOXES = json.loads(os.environ.get('HNC_SOFTBOXES', '[[-0.074, 0.074, -135, 15, 1.4, 0.16], [0.112, -0.112, -45, 22, 0.22, 0.3]]'))


def softbox(strength, width, edge):
    """A feathered strip of light that only reflections see. It never lights the scene."""
    bpy.ops.mesh.primitive_plane_add(size=1)
    ob = bpy.context.active_object; ob.name = 'softbox'
    ob.scale = (7.0, width, 1)
    m = bpy.data.materials.new('softbox'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    fall = []
    for axis, edge in (('X', 0.22), ('Y', edge)):
        mr = nt.nodes.new('ShaderNodeMath'); mr.operation = 'PINGPONG'; mr.inputs[1].default_value = 0.5
        nt.links.new(sep.outputs[axis], mr.inputs[0])
        sm = nt.nodes.new('ShaderNodeMapRange'); sm.interpolation_type = 'SMOOTHERSTEP'
        sm.inputs['From Min'].default_value = 0.0; sm.inputs['From Max'].default_value = edge
        nt.links.new(mr.outputs['Value'], sm.inputs['Value']); fall.append(sm)
    mul = math_node(nt, 'MULTIPLY', fall[0].outputs['Result'], fall[1].outputs['Result'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.985, 0.95, 1)
    nt.links.new(math_node(nt, 'MULTIPLY', mul, strength), em.inputs['Strength'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    ob.data.materials.append(m)
    ob.visible_camera = False; ob.visible_diffuse = False; ob.visible_shadow = False
    ob.visible_transmission = False; ob.visible_volume_scatter = False
    return ob


# ── geometry ────────────────────────────────────────────────────────────────────
def link_ob(name, me, mat, smooth=True):
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    me.materials.append(mat)
    return ob


def rounded(profile, steps=4):
    """Round every interior corner of an (r, z, radius) profile with a small arc (radius 0 keeps it crisp)."""
    out = []
    pts = [(p[0], p[1]) for p in profile]
    for k, p in enumerate(profile):
        rad = p[2] if len(p) > 2 else 0
        if rad <= 0 or k == 0 or k == len(profile) - 1:
            out.append(pts[k]); continue
        a, c, b = Vector(pts[k - 1]), Vector(pts[k]), Vector(pts[k + 1])
        u, v = (a - c), (b - c)
        lu, lv = u.length, v.length
        t = min(rad, lu * 0.45, lv * 0.45)
        p0, p1 = c + u.normalized() * t, c + v.normalized() * t
        for i in range(steps + 1):   # quadratic Bézier through the corner: a smooth, tangent-continuous fillet
            s = i / steps
            q = (1 - s) ** 2 * p0 + 2 * (1 - s) * s * c + s * s * p1
            out.append((q.x, q.y))
    return out


def lathe(name, profile, mat, segments=384, ribs=None, sharp_deg=32):
    """Revolve an open (r, z) profile around Z (a profile point on the axis closes it there).
    ribs = (count, depth, z0, z1): reeding that pulls the radius in between the ribs inside [z0, z1]."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            rr = r
            if ribs and ribs[2] <= z <= ribs[3]:
                rr = r * (1 - ribs[1] * (1 - abs(math.cos(ribs[0] * a / 2))) ** 0.6)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.edges.ensure_lookup_table()
    for k in range(1, len(profile) - 1):
        if len(rings[k]) == 1:
            continue
        (r0, z0), (r1, z1), (r2, z2) = profile[k - 1], profile[k], profile[k + 1]
        u, v = Vector((r1 - r0, z1 - z0)).normalized(), Vector((r2 - r1, z2 - z1)).normalized()
        if u.dot(v) < math.cos(math.radians(sharp_deg)):
            ring = set(rings[k])
            for e in bm.edges:
                if e.verts[0] in ring and e.verts[1] in ring:
                    e.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link_ob(name, me, mat)


def place_on_axis(ob, origin, direction):
    """A part built around +Z at the origin, set so its Z axis runs along `direction` from `origin`."""
    q = Vector(direction).normalized().to_track_quat('Z', 'Y')
    ob.matrix_world = Matrix.Translation(Vector(origin)) @ q.to_matrix().to_4x4()
    return ob


def needle(mat_n, mat_s):
    """Two-tone needle: a slim ridged lozenge; its flat facets catch the light one at a time."""
    L, W, H, T = 0.6, 0.05, 0.016, 0.007
    out = []
    for nm, sign, mat in (('needle-n', 1, mat_n), ('needle-s', -1, mat_s)):
        bm = bmesh.new()
        tip_t = bm.verts.new((0, sign * L, Z_NEEDLE + 0.001))
        tip_b = bm.verts.new((0, sign * L, Z_NEEDLE - T))
        l_t = bm.verts.new((-W, 0, Z_NEEDLE)); r_t = bm.verts.new((W, 0, Z_NEEDLE))
        l_b = bm.verts.new((-W, 0, Z_NEEDLE - T)); r_b = bm.verts.new((W, 0, Z_NEEDLE - T))
        spine = bm.verts.new((0, 0, Z_NEEDLE + H))
        bm.faces.new((tip_t, l_t, spine)); bm.faces.new((tip_t, spine, r_t))
        bm.faces.new((tip_b, l_b, l_t, tip_t)); bm.faces.new((tip_b, tip_t, r_t, r_b))
        bm.faces.new((tip_b, r_b, l_b)); bm.faces.new((l_b, r_b, r_t, spine, l_t))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free()
        ob = link_ob(nm, me, mat, smooth=False)
        bev = ob.modifiers.new('bevel', 'BEVEL'); bev.width = 0.0016; bev.segments = 2; bev.limit_method = 'ANGLE'
        ob.rotation_euler.z = math.radians(-NEEDLE)   # card clockwise → Blender counter-clockwise
        out.append(ob)
    return out


def cylinder(name, mat, radius, depth, verts=64, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth)
    ob = bpy.context.active_object; ob.name = name
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.data.materials.append(mat)
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 4; bv.limit_method = 'ANGLE'
    ob.modifiers.new('ws', 'WEIGHTED_NORMAL')
    return ob


def box(name, mat, size, bevel=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object; ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 4
    ob.modifiers.new('ws', 'WEIGHTED_NORMAL')
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def lowest_z(obs, m):
    dg = bpy.context.evaluated_depsgraph_get()
    z = 1e9
    for ob in obs:
        ev = ob.evaluated_get(dg); me = ev.to_mesh()
        mw = m @ ob.matrix_world
        for v in me.vertices:
            z = min(z, (mw @ v.co).z)
        ev.to_mesh_clear()
    return z


def build():
    sc = reset()

    paint_case = mat_paint('case')
    # the bezel: the same paint, a touch more sheen, with one fine turned line on its crown
    paint_bezel = mat_paint('bezel', rough=0.4, grooves=((0.936, 0.0018),))
    paint_inner = mat_paint('inner-wall', base='#353a2a', rough=0.55, wear=0.0, shade=0.85)
    paint_lid = mat_paint('lid', rough=0.44)
    paint_lid_in = mat_paint('lid-inner', base='#535c40', rough=0.5, wear=0.0, grooves=((0.80, 0.0028),))
    paint_small = mat_paint('fittings', rough=0.42)
    steel = mat_metal('steel', '#9a9a94', rough=0.32)
    brass = mat_metal('brass', '#c9a35e', rough=0.26)

    # case: a flat back that sits on the map, a full rounded wall, then a fine step in to the bezel seam
    lathe('case', rounded([
        (0, 0.0), (0.90, 0.0), (0.985, 0.012, 0.03), (1.0, 0.07, 0.03), (1.0, 0.232, 0.03), (0.978, 0.262, 0.025),
        (0.963, 0.268), (0.963, 0.282),
    ]), paint_case, sharp_deg=50)
    # bezel: a separate turned ring — a straight outer wall, a broad crown band that falls very slightly inward,
    # all edges softly rounded (machined, not moulded), then a small chamfer and a short lip down to the glass
    lathe('bezel', rounded([
        (0.963, 0.282), (0.978, 0.283), (0.992, 0.293, 0.008), (0.994, 0.372, 0.018), (0.978, Z_SEAT, 0.016),
        (0.884 + LIP, Z_SEAT - 0.004, 0.012), (0.864 + LIP, 0.385, 0.008), (0.854 + LIP, Z_GLASS + 0.016, 0.005), (0.852 + LIP, Z_GLASS + 0.006, 0.003), (0.846 + LIP, Z_GLASS + 0.004),
    ], steps=6), paint_bezel, sharp_deg=70)
    lathe('inner-wall', [(r + LIP, z) for r, z in [(0.846, Z_GLASS + 0.004), (0.838, Z_GLASS - 0.006), (0.832, Z_GLASS - 0.04), (0.828, Z_DIAL + 0.012), (0.826, Z_DIAL - 0.004)]], paint_inner)
    # dial
    lathe('dial', [(0, Z_DIAL), (DIAL_R + 0.004, Z_DIAL), (DIAL_R + 0.004, Z_DIAL - 0.02)], mat_dial())
    # pivot: a post up from the dial, a brass cap over the needle
    lathe('pivot', [(0, Z_NEEDLE + 0.026), (0.014, Z_NEEDLE + 0.024), (0.026, Z_NEEDLE + 0.017), (0.032, Z_NEEDLE + 0.006),
                    (0.032, Z_NEEDLE - 0.004), (0.016, Z_NEEDLE - 0.01), (0.011, Z_NEEDLE - 0.02), (0.011, Z_DIAL + 0.006),
                    (0.024, Z_DIAL + 0.001), (0.026, Z_DIAL)], brass, segments=128, sharp_deg=50)
    needle(mat_enamel('needle-red', '#bf3a2b', rough=0.32, coat=0.3), mat_enamel('needle-dark', '#2d3133', rough=0.36, coat=0.25))
    # glass: thin and gently domed, seated under the bezel lip
    lathe('glass', [(0, Z_GLASS + 0.014), (0.5, Z_GLASS + 0.011), (0.8 + LIP, Z_GLASS + 0.004), (0.844 + LIP, Z_GLASS),
                    (0.844 + LIP, Z_GLASS - 0.006), (0.8 + LIP, Z_GLASS - 0.002), (0.5, Z_GLASS + 0.005), (0, Z_GLASS + 0.008)], mat_glass(), segments=256)

    # ── crown and bail, opposite the hinge
    uc = Vector((math.cos(HINGE + math.pi), math.sin(HINGE + math.pi), 0))
    tc = Vector((-uc.y, uc.x, 0))
    zc = 0.17
    stem = lathe('stem', rounded([(0, 0.0), (0.05, 0.0), (0.052, 0.04, 0.01), (0.042, 0.06, 0.01), (0.042, 0.1), (0.048, 0.118, 0.006), (0, 0.12)]), paint_small, segments=96)
    place_on_axis(stem, uc * 0.975 + Vector((0, 0, zc)), uc)
    crown = lathe('crown', rounded([(0, 0.0), (0.07, 0.0), (0.09, 0.012, 0.008), (0.094, 0.03), (0.094, 0.072), (0.088, 0.088, 0.01), (0.058, 0.096, 0.01), (0, 0.098)]),
                  paint_small, segments=192, ribs=(30, 0.045, 0.026, 0.074))
    place_on_axis(crown, uc * 1.09 + Vector((0, 0, zc)), uc)
    eye = lathe('eye', [(0.026, -0.011), (0.042, -0.011), (0.042, 0.011), (0.026, 0.011)], steel, segments=96)
    place_on_axis(eye, uc * 1.2 + Vector((0, 0, zc)), tc)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.022, major_segments=128, minor_segments=32)
    bail = bpy.context.active_object; bail.name = 'bail'
    for p in bail.data.polygons:
        p.use_smooth = True
    bail.data.materials.append(steel)
    near = uc * 1.2 + Vector((0, 0, zc))
    far_r = 1.2 + 2 * 0.15 * math.cos(math.asin((zc - 0.022) / (2 * 0.15)))
    far = uc * far_r + Vector((0, 0, 0.022))
    center = (near + far) / 2
    incline = math.atan2(zc - 0.022, far_r - 1.2)
    bail.matrix_world = Matrix.Translation(center) @ Matrix.Rotation(incline, 4, tc) @ Matrix.Identity(4)

    # ── hinge (three knuckles) and the lid, laid back on it until it rests on the map
    u = Vector((math.cos(HINGE), math.sin(HINGE), 0))
    t = Vector((-u.y, u.x, 0))
    pivot = u * 1.03 + Vector((0, 0, Z_SEAT - 0.014))
    kr = 0.034
    for name, a, b in (('knuckle-a', -0.24, -0.085), ('knuckle-c', 0.085, 0.24)):
        k = cylinder(name, paint_small, kr, b - a - 0.008, bevel=0.012)
        place_on_axis(k, pivot + t * ((a + b) / 2), t)
        leaf = box(name + '-leaf', paint_small, (0.06, b - a - 0.012, 0.05))
        leaf.matrix_world = Matrix.Translation(u * 0.99 + t * ((a + b) / 2) + Vector((0, 0, Z_SEAT - 0.05))) @ Matrix.Rotation(HINGE, 4, 'Z')
    pin = cylinder('hinge-pin', steel, 0.012, 0.52, verts=32, bevel=0.005)
    place_on_axis(pin, pivot, t)

    lid_parts = []
    lid_parts.append(lathe('lid-shell', rounded([
        (0, Z_SEAT + 0.15), (0.5, Z_SEAT + 0.144), (0.75, Z_SEAT + 0.128), (0.9, Z_SEAT + 0.102, 0.03), (0.975, Z_SEAT + 0.07, 0.03),
        (0.997, Z_SEAT + 0.03, 0.02), (0.99, Z_SEAT + 0.004, 0.006), (0.952, Z_SEAT),
    ], steps=6), paint_lid, sharp_deg=60))
    lid_parts.append(lathe('lid-inner', rounded([
        (0.952, Z_SEAT), (0.948, Z_SEAT + 0.02, 0.006), (0.92, Z_SEAT + 0.034, 0.01), (0.895, Z_SEAT + 0.06, 0.01),
        (0.82, Z_SEAT + 0.082), (0.6, Z_SEAT + 0.096), (0.3, Z_SEAT + 0.101), (0, Z_SEAT + 0.102),
    ]), paint_lid_in, sharp_deg=40))
    k = cylinder('knuckle-b', paint_small, kr, 0.162, bevel=0.01)
    place_on_axis(k, pivot, t)
    lid_parts.append(k)
    leaf = box('knuckle-b-leaf', paint_small, (0.07, 0.15, 0.04))
    leaf.matrix_world = Matrix.Translation(u * 0.985 + Vector((0, 0, Z_SEAT + 0.022))) @ Matrix.Rotation(HINGE, 4, 'Z')
    lid_parts.append(leaf)
    catch = box('lid-catch', paint_small, (0.05, 0.11, 0.026), bevel=0.01)
    catch.matrix_world = Matrix.Translation(-u * 1.005 + Vector((0, 0, Z_SEAT + 0.018))) @ Matrix.Rotation(HINGE, 4, 'Z')
    lid_parts.append(catch)
    bpy.context.view_layer.update()

    def open_m(deg):
        return Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(deg), 4, t) @ Matrix.Translation(-pivot)
    if OPEN:
        angle = float(OPEN)
    else:   # open it as far as it goes: until the lid's rim rests on the map
        angle = 90.0
        while angle < 179 and lowest_z(lid_parts, open_m(angle + 0.25)) > 0.002:
            angle += 0.25
    print('lid open', angle)
    for ob in lid_parts:
        ob.matrix_world = open_m(angle) @ ob.matrix_world

    # the map: shadow catcher (keeps only the shadow), warm paper for what it bounces and mirrors back
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    ground = bpy.context.active_object; ground.is_shadow_catcher = True
    ground.data.materials.append(mat_paper())

    # key: the scene's one light — high beyond the far edge, a little to the right (render_home_map_table.py
    # lights(): sun tipped 32° toward the viewer, 10° from the right) — so the shadow falls toward the viewer
    # and a little left, like the cards' and the sheet's. A large disk keeps its edge soft.
    key = bpy.data.lights.new('key', 'AREA'); key.shape = 'DISK'; key.size = float(os.environ.get('HNC_KEY_SIZE', '4.2'))
    key.energy = float(os.environ.get('HNC_KEY', '950')); key.color = (1.0, 0.95, 0.88)
    k = bpy.data.objects.new('key', key); sc.collection.objects.link(k)
    d = Vector((math.sin(math.radians(10)), math.sin(math.radians(32)), math.cos(math.radians(32)))).normalized()
    k.location = 9.2 * d
    k.rotation_euler = (-k.location).to_track_quat('-Z', 'Y').to_euler()
    k.visible_glossy = os.environ.get('HNC_KEY_GLOSSY') == '1'   # reflections come from the studio HDRI; the key only lights and casts the shadow
    fill = bpy.data.lights.new('fill', 'AREA'); fill.size = 9; fill.energy = 110; fill.color = (0.96, 0.97, 1.0)
    f = bpy.data.objects.new('fill', fill); sc.collection.objects.link(f)
    f.location = Vector((-3.5, -5.0, 6.0)); f.rotation_euler = (-f.location).to_track_quat('-Z', 'Y').to_euler()
    f.visible_glossy = False

    # world: the studio HDRI for reflections (glossy rays only), a soft warm ambience for everything else
    wt = sc.world.node_tree; wt.nodes.clear()
    wo = wt.nodes.new('ShaderNodeOutputWorld')
    co = wt.nodes.new('ShaderNodeTexCoord')
    mp = wt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(float(os.environ.get('HNC_HDRI_ROT', '200'))))
    if not os.path.exists(HDRI):   # CC0 studio HDRI from Poly Haven, fetched once into the work folder
        import urllib.request
        os.makedirs(os.path.dirname(HDRI), exist_ok=True)
        urllib.request.urlretrieve('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/' + os.path.basename(HDRI), HDRI)
    env = wt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
    wt.links.new(co.outputs['Generated'], mp.inputs['Vector']); wt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    warm = wt.nodes.new('ShaderNodeMix'); warm.data_type = 'RGBA'; warm.blend_type = 'MULTIPLY'
    sock(warm, 'Factor_Float').default_value = 0.15; sock(warm, 'B_Color').default_value = (1.0, 0.86, 0.66, 1)
    wt.links.new(env.outputs['Color'], sock(warm, 'A_Color'))
    refl = wt.nodes.new('ShaderNodeBackground'); refl.inputs['Strength'].default_value = float(os.environ.get('HNC_ENV', '1.2'))
    wt.links.new(sock(warm, 'Result_Color', out=True), refl.inputs['Color'])
    amb = wt.nodes.new('ShaderNodeBackground'); amb.inputs['Color'].default_value = lin('#fff1dc'); amb.inputs['Strength'].default_value = float(os.environ.get('HNC_AMB', '0.6'))
    lp = wt.nodes.new('ShaderNodeLightPath')
    mx = wt.nodes.new('ShaderNodeMixShader')
    wt.links.new(lp.outputs['Is Glossy Ray'], mx.inputs['Fac']); wt.links.new(amb.outputs['Background'], mx.inputs[1]); wt.links.new(refl.outputs['Background'], mx.inputs[2])
    wt.links.new(mx.outputs['Shader'], wo.inputs['Surface'])

    # camera: aimed at the case from almost straight above; lens shift puts it where the card wants it
    cam = bpy.data.cameras.new('cam'); cam.lens = LENS; cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36
    frame_w = 1.0 / PLACE['r']                       # card width in case radii at the compass
    target = Vector((0, 0, 0.2))
    dist = frame_w * LENS / cam.sensor_width
    co_ = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co_); sc.camera = co_
    co_.location = target + dist * Vector((0, -math.sin(TILT), math.cos(TILT)))
    co_.rotation_euler = (target - co_.location).to_track_quat('-Z', 'Y').to_euler()
    cam.shift_x = 0.5 - PLACE['cx']
    cam.shift_y = (PLACE['cy'] - 0.5) / ANAMORPH   # shift is in frame widths; the frame now spans 1/ANAMORPH as much height
    cam.clip_start = 0.1; cam.clip_end = 200
    # each strip sits beyond the glass's mirror direction (camera ray reflected), tipped by its offset
    for ox, oy, roll, strength, width, edge in SOFTBOXES:
        w = softbox(strength, width, edge)
        d = Vector((ox, math.sin(TILT) + oy, math.cos(TILT))).normalized()
        w.location = Vector((0, 0, Z_GLASS)) + 8.0 * d
        w.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        w.rotation_euler.rotate_axis('Z', math.radians(roll))

    if os.environ.get('HNC_BLEND'):
        bpy.ops.wm.save_as_mainfile(filepath=os.environ['HNC_BLEND'])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print('wrote', OUT)


build()
