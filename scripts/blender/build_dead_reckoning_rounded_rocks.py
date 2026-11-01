"""Extract weathered stones from the CC0 Poly Haven sand_rocks_small_01 scan.

Run with installed Blender, in background mode:
  blender --background --factory-startup --python scripts/blender/build_dead_reckoning_rounded_rocks.py -- --src <cache> --out public/assets/lessons/topic06/dead-reckoning

Downloads the original 1K glTF/scan textures if not cached. Keeps the existing
eleven placement names and metre bounds; replaces ten fractured stones/rocks
with real rounded scan islands. The existing rock07 remains as an occasional
rougher piece. No runtime download, new scatter or camera code.
"""
import os
import sys
import json
import urllib.request
import importlib.util
import bpy
import bmesh
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
args = dict(zip(args[::2], args[1::2]))
SRC = os.path.abspath(args['--src'])
OUT = os.path.abspath(args['--out'])
ASSET = 'sand_rocks_small_01'
os.makedirs(SRC, exist_ok=True)

spec = importlib.util.spec_from_file_location('asset_helpers', os.path.join(os.path.dirname(__file__), 'build_dead_reckoning_assets.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)

def fetch(url, destination):
    if not os.path.exists(destination):
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        request = urllib.request.Request(url, headers={'User-Agent': 'geo-course-asset-build'})
        with urllib.request.urlopen(request, timeout=120) as response, open(destination, 'wb') as target:
            target.write(response.read())

model = os.path.join(SRC, ASSET + '_1k.gltf')
if not os.path.exists(model):
    request = urllib.request.Request('https://api.polyhaven.com/files/' + ASSET, headers={'User-Agent': 'geo-course-asset-build'})
    with urllib.request.urlopen(request, timeout=60) as response:
        files = json.load(response)['gltf']['1k']['gltf']
    fetch(files['url'], model)
    for relative, file in files['include'].items():
        fetch(file['url'], os.path.join(SRC, relative))

helpers.clear_scene()
scan = helpers.import_gltf(model)[0]
bpy.context.view_layer.objects.active = scan
scan.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# The sandy base joins the stones into one terrain patch. A horizontal cut
# 6.5cm above it separates intact exposed stone islands; their cut bases are
# capped and later buried by the existing scatter. UVs on exposed faces survive.
bm = bmesh.new()
bm.from_mesh(scan.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=Vector((0, 0, 0.065)), plane_no=Vector((0, 0, 1)), clear_inner=True, dist=0.0001)
bm.to_mesh(scan.data)
bm.free()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.separate(type='LOOSE')
bpy.ops.object.mode_set(mode='OBJECT')
pieces = sorted([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: len(o.data.polygons), reverse=True)

# Island index, name, radius, height: the last two match deadReckoningTerrain's
# existing placement contract, so contact shadows and path clearance stay valid.
selection = [
    (7, 'stone_a', .07, .04), (8, 'stone_b', .06, .08),
    (9, 'stone_c', .07, .05), (10, 'stone_d', .05, .04),
    (14, 'stone_e', .06, .08), (0, 'rock_a', .16, .15),
    (1, 'rock_b', .18, .08), (5, 'rock_c', .17, .09),
    (12, 'rock_d', .18, .12),
    (2, 'boulder_a', .62, .54),
]
kept = []
for index, name, radius, height in selection:
    obj = pieces[index]
    obj.name = obj.data.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    boundary = [e for e in bm.edges if e.is_boundary]
    if boundary:
        bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    bpy.ops.object.select_all(action='DESELECT')
    helpers.to_base_origin(obj)
    helpers.decimate(obj, 260 if name.startswith('stone') else 2600 if name == 'boulder_a' else 850)
    helpers.to_base_origin(obj)
    coords = [v.co for v in obj.data.vertices]
    footprint = max((v.x * v.x + v.y * v.y) ** .5 for v in coords)
    h = max(v.z for v in coords)
    for vertex in obj.data.vertices:
        vertex.co.x *= radius / footprint
        vertex.co.y *= radius / footprint
        vertex.co.z *= height / h
    obj.data.update()
    obj.data.validate(clean_customdata=False)
    helpers.shade_smooth(obj)
    obj.location = (len(kept) * 2, 0, 0)
    kept.append(obj)
    print('WEATHERED', name, len(obj.data.polygons), 'faces', 'radius', radius, 'height', height)

for obj in list(bpy.context.scene.objects):
    if obj not in kept:
        bpy.data.objects.remove(obj, do_unlink=True)
helpers.shrink_textures(kept, 512)
original = helpers.import_gltf(os.path.join(OUT, 'rocks.glb'))
for obj in original:
    if obj.name.split('.')[0] == 'rock07_a':
        obj.name = obj.data.name = obj.name.split('.')[0]
        bpy.ops.object.select_all(action='DESELECT')
        helpers.to_base_origin(obj)
        obj.location = (len(kept) * 2, 0, 0)
        kept.append(obj)
    else:
        bpy.data.objects.remove(obj, do_unlink=True)
helpers.export_glb(kept, os.path.join(OUT, 'rounded-rocks.glb'))
