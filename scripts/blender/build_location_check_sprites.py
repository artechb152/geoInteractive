"""
Vegetation cards of the lesson-6 location check ("באיזה אזור אתם נמצאים?").

The observation's camera never moves — it only turns and zooms at one point —
so a plant drawn as a card that faces the eye shows exactly what the scanned
plant would. This script renders each scan (Poly Haven CC0, downloaded by
scripts/build-location-check-assets.mjs) from the side, orthographic, in two
passes that the scene lights itself:

  <name>_albedo.png  base colour × baked ambient occlusion (the crown's inside
                     and underside darker), sRGB, coverage in alpha
  <name>_normal.png  the surface normal in camera space (x right, y up, z
                     towards the eye) as 0–1 — the card's tangent-space normal

and cells.json: for each render the plant's root inside the frame, the frame's
side in metres and the plant's own width and height. The atlas step of
build-location-check-assets.mjs packs them.

  trees   island_tree_01, island_tree_02 — three azimuths each, seen 3° from
          above (the groves stand 117–400 m away, a few metres above the eye)
  shrubs  searsia_burchellii (3 bushes), searsia_lucida (a–e), seen 14° from
          above (the near scrub, 4–60 m from the eye): the whole bush from one
          azimuth, and for the five larger bushes their dense crown alone from
          two ("mound": everything below a ragged cut at ~42 % of the height
          left out, the frame's lower edge at the cut, which the scene buries)
          — the low, wide cushions of the garrigue
  grass   three dense tussocks, each a dozen of grass_medium_02's single
          tufts scattered, turned and scaled; 10° from above; the scene grades
          them to summer straw

Run (headless):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/blender/build_location_check_sprites.py
"""
import bpy
import json
import math
import os
import tempfile
import numpy as np
from mathutils import Vector

SRC = os.path.join(tempfile.gettempdir(), 'geo-location-check-src')
OUT = os.path.join(SRC, 'sprites')
RES = 512

TREES = {'island_tree_01': [20, 140, 260], 'island_tree_02': [0, 120, 240]}
SHRUBS = {'searsia_burchellii': [15, 195], 'searsia_lucida': [30, 210]}
MOUNDS = {'searsia_burchellii_large_LOD0', 'searsia_burchellii_medium_LOD0', 'searsia_burchellii_small_LOD0', 'searsia_lucida_a_LOD0', 'searsia_lucida_b_LOD0'}
GRASS = {'grass_medium_02': [0]}
TUSSOCKS = 3
SKIP = {'searsia_lucida_f_LOD0', 'searsia_lucida_g_LOD0'}  # tiny sprigs
MOUND_CUT = 0.42


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons.get('cycles')
    if prefs and not os.environ.get('LC_CPU'):
        cp = prefs.preferences
        for kind in ('OPTIX', 'CUDA'):
            try:
                cp.compute_device_type = kind
                cp.get_devices()
                if any(d.type == kind for d in cp.devices):
                    for d in cp.devices:
                        d.use = True
                    scene.cycles.device = 'GPU'
                    break
            except Exception:
                pass
    scene.render.film_transparent = True
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.dither_intensity = 0
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new('none')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[1].default_value = 0
    scene.world = world
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.clip_start = 0.01
    cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam)
    scene.collection.objects.link(co)
    scene.camera = co
    return scene, co


def rewire(mat, ao_dist):
    """Two emission outputs per material — albedo × AO and the camera-space normal — each through the material's own alpha."""
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    p = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    out = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if p is None or out is None:
        return None

    def src(name):
        s = p.inputs[name]
        return s.links[0].from_socket if s.is_linked else None

    base, alpha, nrm = src('Base Color'), src('Alpha'), src('Normal')
    geo = nodes.new('ShaderNodeNewGeometry')
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = ao_dist
    ao.samples = 16
    if nrm:
        links.new(nrm, ao.inputs['Normal'])
    # albedo × (0.28 + 0.72 · AO)
    aomap = nodes.new('ShaderNodeMapRange')
    aomap.inputs['To Min'].default_value = 0.28
    links.new(ao.outputs['AO'], aomap.inputs['Value'])
    mul = nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1
    if base:
        links.new(base, mul.inputs['A'])
    else:
        mul.inputs['A'].default_value = p.inputs['Base Color'].default_value
    links.new(aomap.outputs['Result'], mul.inputs['B'])
    e_alb = nodes.new('ShaderNodeEmission')
    links.new(mul.outputs['Result'], e_alb.inputs['Color'])
    # camera-space normal, flipped to face the eye, as 0–1
    vt = nodes.new('ShaderNodeVectorTransform')
    vt.vector_type = 'NORMAL'
    vt.convert_from = 'WORLD'
    vt.convert_to = 'CAMERA'
    links.new(nrm if nrm else geo.outputs['Normal'], vt.inputs['Vector'])
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(vt.outputs['Vector'], sep.inputs['Vector'])
    sgn = nodes.new('ShaderNodeMath')
    sgn.operation = 'SIGN'
    add = nodes.new('ShaderNodeMath')
    add.operation = 'ADD'
    add.inputs[1].default_value = 1e-4
    links.new(sep.outputs['Z'], add.inputs[0])
    links.new(add.outputs[0], sgn.inputs[0])
    flip = nodes.new('ShaderNodeVectorMath')
    flip.operation = 'SCALE'
    links.new(vt.outputs['Vector'], flip.inputs[0])
    links.new(sgn.outputs[0], flip.inputs['Scale'])
    enc = nodes.new('ShaderNodeVectorMath')
    enc.operation = 'MULTIPLY_ADD'
    links.new(flip.outputs[0], enc.inputs[0])
    enc.inputs[1].default_value = (0.5, 0.5, 0.5)
    enc.inputs[2].default_value = (0.5, 0.5, 0.5)
    e_nrm = nodes.new('ShaderNodeEmission')
    links.new(enc.outputs[0], e_nrm.inputs['Color'])

    # Coverage: the material's alpha, and nothing below the cut height (a mound's crown alone).
    # The cut is ragged: its height varies by ± rag / 2 with a noise over the position.
    cut = nodes.new('ShaderNodeValue')
    cut.outputs[0].default_value = -1e9
    rag = nodes.new('ShaderNodeValue')
    rag.outputs[0].default_value = 0
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.5
    noise.inputs['Detail'].default_value = 3
    links.new(geo.outputs['Position'], noise.inputs['Vector'])
    centred = nodes.new('ShaderNodeMath')
    centred.operation = 'SUBTRACT'
    centred.inputs[1].default_value = 0.5
    links.new(noise.outputs['Fac'], centred.inputs[0])
    level = nodes.new('ShaderNodeMath')
    level.operation = 'MULTIPLY_ADD'
    links.new(centred.outputs[0], level.inputs[0])
    links.new(rag.outputs[0], level.inputs[1])
    links.new(cut.outputs[0], level.inputs[2])
    pos = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], pos.inputs['Vector'])
    above = nodes.new('ShaderNodeMath')
    above.operation = 'GREATER_THAN'
    links.new(pos.outputs['Z'], above.inputs[0])
    links.new(level.outputs[0], above.inputs[1])
    cover = above.outputs[0]
    if alpha is not None:
        both = nodes.new('ShaderNodeMath')
        both.operation = 'MULTIPLY'
        links.new(alpha, both.inputs[0])
        links.new(above.outputs[0], both.inputs[1])
        cover = both.outputs[0]

    def through_alpha(shader):
        tr = nodes.new('ShaderNodeBsdfTransparent')
        mix = nodes.new('ShaderNodeMixShader')
        links.new(cover, mix.inputs['Fac'])
        links.new(tr.outputs[0], mix.inputs[1])
        links.new(shader.outputs[0], mix.inputs[2])
        return mix.outputs[0]

    return {'out': out.inputs['Surface'], 'albedo': through_alpha(e_alb), 'normal': through_alpha(e_nrm), 'links': links, 'cut': cut, 'rag': rag}


def use_pass(wired, which):
    for w in wired:
        w['links'].new(w[which], w['out'])


def frame(co, verts, root, elev, az, floor=False):
    """Aim the ortho camera from azimuth/elevation so the plant fills the frame; return the cell's geometry.
    With floor, the frame's lower edge runs through the root (a mound: its cut is the edge)."""
    el, a = math.radians(elev), math.radians(az)
    back = Vector((math.cos(el) * math.sin(a), -math.cos(el) * math.cos(a), math.sin(el)))  # target → camera
    right = (-back).cross(Vector((0, 0, 1))).normalized()
    up = right.cross(-back).normalized()
    px = verts @ np.array(right)
    py = verts @ np.array(up)
    w, h = px.max() - px.min(), py.max() - py.min()
    size = max(w, h) * 1.04
    cx, cy = (px.max() + px.min()) / 2, (py.max() + py.min()) / 2
    if floor:
        bottom = root.dot(up) - h * 0.02
        size = max(w, py.max() - bottom) * 1.04
        cy = bottom + size / 2
    co.location = right * cx + up * cy + back * 150
    co.rotation_euler = (-back).to_track_quat('-Z', 'Y').to_euler()
    co.data.ortho_scale = size
    rx, ry = root.dot(right), root.dot(up)
    return {
        'rootU': (rx - (cx - size / 2)) / size,
        'rootV': (ry - (cy - size / 2)) / size,
        'cellM': size,
        'widthM': float(w),
    }


def world_verts(obj):
    me = obj.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    m = np.array(obj.matrix_world)
    return co @ m[:3, :3].T + m[:3, 3]


def tussocks(tufts):
    """TUSSOCKS dense clumps, each a dozen copies of the single tufts, scattered in a 0.22 m disc."""
    rnd = np.random.default_rng(0x7a55)
    out = []
    for k in range(TUSSOCKS):
        parts = []
        for _ in range(9 + 3 * k):
            src = tufts[int(rnd.integers(len(tufts)))]
            c = src.copy()
            c.data = src.data.copy()
            bpy.context.scene.collection.objects.link(c)
            c.hide_render = False
            # each tuft's own base to the origin, then scattered
            v = world_verts(src)
            band = v[v[:, 2] < v[:, 2].min() + 0.02]
            a, r = rnd.uniform(0, 2 * math.pi), 0.22 * math.sqrt(rnd.uniform())
            sc = rnd.uniform(0.75, 1.3)
            c.matrix_world = (
                __import__('mathutils').Matrix.Translation((r * math.cos(a), r * math.sin(a), 0))
                @ __import__('mathutils').Matrix.Rotation(rnd.uniform(0, 2 * math.pi), 4, 'Z')
                @ __import__('mathutils').Matrix.Scale(sc, 4)
                @ __import__('mathutils').Matrix.Translation((-band[:, 0].mean(), -band[:, 1].mean(), -v[:, 2].min()))
                @ src.matrix_world
            )
            parts.append(c)
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        parts[0].name = f'tussock_{k}'
        out.append(parts[0])
    for t in tufts:
        t.hide_render = True
    return out


def render_model(scene, co, name, azimuths, elev, kind, cells):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene, co = setup_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'models', name, f'{name}_1k.gltf'))
    def wanted(o):
        return o.type == 'MESH' and o.name not in SKIP and ('LOD' not in o.name or o.name.endswith('LOD0'))

    objs = sorted((o for o in bpy.data.objects if wanted(o)), key=lambda o: o.name)
    for o in bpy.data.objects:
        if o.type == 'MESH' and not wanted(o):
            o.hide_render = True
    if kind == 'grass':
        objs = tussocks(objs)
    wired = [w for w in (rewire(m, {'tree': 0.5, 'shrub': 0.22, 'grass': 0.08}[kind]) for m in bpy.data.materials if m.use_nodes) if w]
    for o in objs:
        for other in objs:
            other.hide_render = other is not o
        v = world_verts(o)
        zmin, zmax = v[:, 2].min(), v[:, 2].max()
        band = v[v[:, 2] < zmin + (zmax - zmin) * 0.06]
        root = Vector((band[:, 0].mean(), band[:, 1].mean(), zmin))
        shots = [(az, '', v, root, zmax - zmin, None) for az in (azimuths if kind == 'tree' else azimuths[:1])]
        if kind == 'shrub' and o.name in MOUNDS:
            cut = zmin + (zmax - zmin) * MOUND_CUT
            top = v[v[:, 2] >= cut]
            ring = top[top[:, 2] < cut + (zmax - zmin) * 0.08]
            mroot = Vector((ring[:, 0].mean(), ring[:, 1].mean(), cut))
            shots += [(az, '_mound', top, mroot, zmax - cut, cut) for az in azimuths]
        for az, tag, fv, froot, height, zcut in shots:
            for w in wired:
                w['cut'].outputs[0].default_value = -1e9 if zcut is None else zcut
                w['rag'].outputs[0].default_value = 0 if zcut is None else height * 0.4
            cell = frame(co, fv, froot, elev, az, floor=zcut is not None)
            stem = f'{o.name.replace("_LOD0", "")}{tag}_{az:03d}'
            for which, view, samples in (('albedo', 'Standard', 96), ('normal', 'Raw', 32)):
                use_pass(wired, which)
                scene.view_settings.view_transform = view
                scene.cycles.samples = samples
                scene.cycles.use_denoising = which == 'albedo'
                scene.render.filepath = os.path.join(OUT, f'{stem}_{which}.png')
                bpy.ops.render.render(write_still=True)
            cells.append({'kind': kind, 'model': stem, 'albedo': f'{stem}_albedo.png', 'normal': f'{stem}_normal.png', 'heightM': float(height), **cell})
            print('cell', stem, 'h %.2f w %.2f' % (height, cell['widthM']))


def main():
    """LC_ONLY=shrub,grass re-renders those kinds and keeps the other cells of the last run."""
    os.makedirs(OUT, exist_ok=True)
    only = set(filter(None, os.environ.get('LC_ONLY', '').split(',')))
    cells = []
    if only and os.path.exists(os.path.join(OUT, 'cells.json')):
        with open(os.path.join(OUT, 'cells.json')) as fh:
            cells = [c for c in json.load(fh) if c['kind'] not in only]
    for kind, models, elev in (('tree', TREES, 3), ('shrub', SHRUBS, 14), ('grass', GRASS, 10)):
        if only and kind not in only:
            continue
        for name, az in models.items():
            render_model(None, None, name, az, elev, kind, cells)
    with open(os.path.join(OUT, 'cells.json'), 'w') as fh:
        json.dump(cells, fh, indent=1)
    print('cells:', len(cells))


main()
