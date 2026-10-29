"""
Rocks and shrub sprites of the lesson-6 navigation replay ("מתי עוצרים לבדוק?").

Reads the Poly Haven CC0 glTF sources that scripts/build-navigation-replay-assets.mjs
downloads (<tmp>/geo-navigation-replay-src/models) and writes:
  public/assets/lessons/topic06/navigation-replay/rocks.glb
      every scanned rock / stone as its own node, decimated (rocks ~700, stones ~180
      triangles), origin at the centre of its base, textures 512 px WebP.
  <tmp>/geo-navigation-replay-src/sprites/*.png
      RGBA renders of the scanned Searsia lucida shrub (soft, shadowless sky light,
      Standard view transform): whole-shrub side views (far billboards) and canopy
      close-ups (leaf cards). scripts/build-navigation-replay-assets.mjs --only=sprites
      packs them into the shrub atlas.

Run (headless):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P scripts/blender/build_navigation_replay_models.py -- [rocks|sprites]
"""
import bpy
import bmesh
import math
import os
import sys
import tempfile
from mathutils import Vector

SRC = os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'lessons', 'topic06', 'navigation-replay')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = ARGS[0] if ARGS else 'all'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_gltf(name):
    path = os.path.join(SRC, 'models', name, f'{name}_1k.gltf')
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def base_origin(obj):
    """Origin at the centre of the mesh's lowest band (its 'base'), transforms applied."""
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    obj.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    vs = [v.co for v in obj.data.vertices]
    zmin = min(v.z for v in vs)
    zmax = max(v.z for v in vs)
    band = [v for v in vs if v.z < zmin + (zmax - zmin) * 0.2]
    cx = sum(v.x for v in band) / len(band)
    cy = sum(v.y for v in band) / len(band)
    # glTF is Y-up: Blender Z → glTF Y; the base sits at z = 15 % of the height so the
    # widest part of the scan rests on the ground and the ragged underside is buried.
    off = Vector((cx, cy, zmin + (zmax - zmin) * 0.15))
    obj.data.transform(__import__('mathutils').Matrix.Translation(-off))
    obj.location = (0, 0, 0)


def decimate(obj, target):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= target:
        return
    m = obj.modifiers.new('dec', 'DECIMATE')
    m.ratio = target / tris
    m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)


def build_rocks():
    reset()
    objs = []
    for name, target, prefix in (
        ('rock_moss_set_02', 700, 'rock'),
        ('namaqualand_rocks_01', 700, 'rock'),
        ('namaqualand_stones_01', 180, 'stone'),
    ):
        for i, o in enumerate(sorted(import_gltf(name), key=lambda o: o.name)):
            base_origin(o)
            decimate(o, target)
            o.name = f'{prefix}_{name.split("_")[0]}_{i}'
            objs.append(o)
    # downscale the textures the exporter embeds
    for img in bpy.data.images:
        if img.size[0] > 512:
            img.scale(512, 512)
    for o in bpy.data.objects:
        o.select_set(o in objs)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, 'rocks.glb'),
        export_format='GLB',
        use_selection=True,
        export_image_format='WEBP',
        export_image_quality=82,
        export_yup=True,
        export_apply=True,
    )
    drop_sourceless_textures(os.path.join(OUT, 'rocks.glb'))
    print('rocks:', ', '.join(f'{o.name}:{len(o.data.polygons)}' for o in objs))


def drop_sourceless_textures(glb_path):
    """The exporter writes a texture without an image for a single-channel
    roughness map it could not pack; three.js refuses such a file. Drop those
    textures and every reference to them (the material keeps its roughness factor)."""
    import json
    import struct
    with open(glb_path, 'rb') as fh:
        data = fh.read()
    jlen = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + jlen])
    rest = data[20 + jlen:]
    bad = {i for i, t in enumerate(doc.get('textures', []))
           if 'source' not in t and not (t.get('extensions') or {}).get('EXT_texture_webp')}
    if not bad:
        return
    remap = {}
    kept = []
    for i, t in enumerate(doc['textures']):
        if i not in bad:
            remap[i] = len(kept)
            kept.append(t)
    doc['textures'] = kept

    def fix(obj):
        if isinstance(obj, dict):
            for k in list(obj.keys()):
                v = obj[k]
                if isinstance(v, dict) and 'index' in v and k.endswith('Texture'):
                    if v['index'] in bad:
                        del obj[k]
                        continue
                    v['index'] = remap[v['index']]
                fix(obj.get(k))
        elif isinstance(obj, list):
            for v in obj:
                fix(v)
    fix(doc.get('materials', []))
    js = json.dumps(doc, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + len(rest)
    with open(glb_path, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A))
        fh.write(js)
        fh.write(rest)
    print('dropped textures without an image:', sorted(bad))


def sprite_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = None if os.environ.get("NR_CPU") else bpy.context.preferences.addons.get("cycles")
    if prefs:
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
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    world = bpy.data.worlds.new('sky')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
    bg.inputs[1].default_value = 1.0
    scene.world = world
    # a soft key from above so the canopy top reads lighter than its underside
    sun = bpy.data.lights.new('key', 'SUN')
    sun.energy = 1.6
    sun.angle = math.radians(35)
    so = bpy.data.objects.new('key', sun)
    so.rotation_euler = (math.radians(35), 0, math.radians(30))
    scene.collection.objects.link(so)
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    co = bpy.data.objects.new('cam', cam)
    scene.collection.objects.link(co)
    scene.camera = co
    return scene, co


def frame(co, obj, size, center, elev_deg, az_deg):
    """Aim the ortho camera at `center` from azimuth/elevation, covering `size` metres."""
    el = math.radians(elev_deg)
    az = math.radians(az_deg)
    d = 20.0
    dirv = Vector((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)))
    co.location = center + dirv * d
    co.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()
    co.data.ortho_scale = size
    co.data.clip_end = 100


def build_sprites():
    reset()
    scene, co = sprite_scene()
    shrubs = sorted(import_gltf('searsia_lucida'), key=lambda o: o.name)
    for o in shrubs:
        o.parent = None
    out = os.path.join(SRC, 'sprites')
    os.makedirs(out, exist_ok=True)
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    for i, o in enumerate(shrubs):
        for other in shrubs:
            other.hide_render = other is not o
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
        hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
        c = (lo + hi) / 2
        size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) * 1.04
        # whole shrub, side view, base on the frame's lower edge
        frame(co, o, size, Vector((c.x, c.y, lo.z + size / 2)), 8, 20 + i * 47)
        scene.render.filepath = os.path.join(out, f'whole_{i}.png')
        bpy.ops.render.render(write_still=True)
        # two canopy close-ups per shrub: an upper-outer part of the crown, seen a little from above
        for k, (fx, fz, az) in enumerate(((0.28, 0.72, 60), (-0.25, 0.6, 210))):
            cc = Vector((c.x + (hi.x - lo.x) * fx * 0.5, c.y, lo.z + (hi.z - lo.z) * fz))
            frame(co, o, size * 0.42, cc, 25, az + i * 31)
            scene.render.filepath = os.path.join(out, f'cluster_{i}_{k}.png')
            bpy.ops.render.render(write_still=True)
        print('sprites', o.name, 'h', round(hi.z - lo.z, 2), 'w', round(max(hi.x - lo.x, hi.y - lo.y), 2))


if MODE in ('all', 'rocks'):
    build_rocks()
if MODE in ('all', 'sprites'):
    build_sprites()
