"""
Scanned plants and limestone rocks of the lesson-6 navigation replay, second generation
(„במהלך הניווט: מה צריך לבדוק?”): the replay's live view up close needs real volumes, not
leaf-card domes.

Reads the Poly Haven CC0 glTF sources that `node scripts/build-navigation-replay-assets.mjs
--only=v2-fetch` downloads (<tmp>/geo-navigation-replay-src/models) and writes geometry only
(Y up, metres, origin at the centre of the base; the textures are packed by the node script,
`--only=v2-plants`, so the cut-out masks and the colour dilation are under our control):

  public/assets/lessons/topic06/navigation-replay/v2/
    plants.glb   per variant and level of detail, one node per part: `<variant>_<lod>_leaf` /
                 `<variant>_<lod>_wood`
                   maquis_0…3   evergreen maquis (Searsia burchellii ×3, S. lucida): lentisk-like
                                masses, normalised to 1 m tall
                   dwarf_0…3    wiry dry dwarf shrubs (wild rooibos): thorny burnet / sage, 0.5 m
                   grass_0…2    dry grass clumps (grass_medium_02), 0.35 m
                 lod0 near (full shape), lod1 middle distance (a quarter of the cards, thicker twigs)
    rocks.glb    `rock_<k>_lod0|lod1`: seven weathered limestone scans (moon_rock_01…07), a karst
                 boulder (boulder_01) and a rounded slab (namaqualand_boulder_05), each 1 m across

Leaves and twigs of a scan are single-leaf cards (hundreds of thousands): a level of detail keeps
a random share of the cards and grows each about its own centre, so the silhouette and the
branching stay the scan's own. The wood loses its smallest pieces and is decimated. Occlusion and
the crown-dome normals are added when the scene loads (scene/plantModels.ts), where they can be tuned.

Run (headless, CPU):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/blender/build_navigation_replay_v2.py -- [plants|rocks|all]
"""
import bpy
import bmesh
import math
import os
import sys
import tempfile
import zlib

import numpy as np

SRC = os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src', 'models')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'lessons', 'topic06', 'navigation-replay', 'v2')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = ARGS[0] if ARGS else 'all'

# variant: (source asset, source object, normalised height m, tris lod0, tris lod1)
PLANTS = [
    ('maquis_0', 'searsia_burchellii', 'searsia_burchellii_small_LOD0', 1.0, 6500, 1400),
    ('maquis_1', 'searsia_burchellii', 'searsia_burchellii_medium_LOD0', 1.0, 6500, 1400),
    ('maquis_2', 'searsia_lucida', 'searsia_lucida_a_LOD0', 1.0, 6500, 1400),
    ('maquis_3', 'searsia_burchellii', 'searsia_burchellii_large_LOD0', 1.0, 7000, 1500),
    ('dwarf_0', 'wild_rooibos_bush', 'wild_rooibos_bush_a', 0.5, 2400, 500),
    ('dwarf_1', 'wild_rooibos_bush', 'wild_rooibos_bush_b', 0.5, 2200, 480),
    ('dwarf_2', 'wild_rooibos_bush', 'wild_rooibos_bush_c', 0.5, 2200, 480),
    ('dwarf_3', 'wild_rooibos_bush', 'wild_rooibos_bush_d', 0.5, 2000, 440),
    ('grass_0', 'grass_medium_02', 'grass_medium_02_c', 0.35, 1300, 300),
    ('grass_1', 'grass_medium_02', 'grass_medium_02_d', 0.35, 2500, 420),
    ('grass_2', 'grass_medium_02', 'grass_medium_02_e', 0.35, 1700, 360),
]
# (source asset, source object or None for the only mesh, tris lod0, tris lod1)
ROCKS = [
    ('moon_rock_01', 'moon_rock_01_LOD1', 2400, 420),
    ('moon_rock_02', 'moon_rock_02_LOD1', 2400, 420),
    ('moon_rock_03', 'moon_rock_03_LOD1', 2400, 420),
    ('moon_rock_04', 'moon_rock_04_LOD1', 2400, 420),
    ('moon_rock_05', 'moon_rock_05_LOD1', 2400, 420),
    ('moon_rock_06', 'moon_rock_06_LOD1', 2400, 420),
    ('moon_rock_07', 'moon_rock_07_LOD1', 2400, 420),
    ('boulder_01', None, 4200, 800),
    ('namaqualand_boulder_05', None, 3600, 700),
]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_gltf(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name, f'{name}_1k.gltf'))
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def apply_transform(obj):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    obj.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)


def split_by_material(obj):
    """{material name: object} — each material's faces as an object of its own."""
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = {}
    for o in list(bpy.context.selected_objects):
        if not o.data.polygons:
            continue
        names = [m.name for m in o.data.materials if m]
        used = {o.data.polygons[0].material_index}
        name = o.data.materials[next(iter(used))].name if names else 'none'
        parts[name] = o
        o.select_set(False)
    return parts


def mesh_arrays(obj):
    me = obj.data
    me.calc_loop_triangles()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    tri = np.empty(len(me.loop_triangles) * 3, np.int64)
    me.loop_triangles.foreach_get('vertices', tri)
    return co.reshape(-1, 3), tri.reshape(-1, 3)


def islands(n_verts, tri):
    """Connected components of the triangles (by shared vertices): a label per vertex."""
    lab = np.arange(n_verts)
    for _ in range(64):
        m = np.minimum(np.minimum(lab[tri[:, 0]], lab[tri[:, 1]]), lab[tri[:, 2]])
        new = lab.copy()
        for k in range(3):
            np.minimum.at(new, tri[:, k], m)
        # pointer jumping speeds up long chains (twig cards with many segments)
        new = new[new]
        if np.array_equal(new, lab):
            break
        lab = new
    return lab


def thin_cards(obj, keep, grow, seed):
    """Keep a random share of the cards (islands) and grow each about its own centre."""
    if keep >= 0.999:
        return
    co, tri = mesh_arrays(obj)
    lab = islands(len(co), tri)
    uniq, inv = np.unique(lab, return_inverse=True)
    rng = np.random.default_rng(seed)
    kept = rng.random(len(uniq)) < keep
    # centre of each island
    cnt = np.bincount(inv, minlength=len(uniq)).astype(np.float32)
    cen = np.stack([np.bincount(inv, weights=co[:, k], minlength=len(uniq)) for k in range(3)], 1) / cnt[:, None]
    vk = kept[inv]
    co2 = np.where(vk[:, None], cen[inv] + (co - cen[inv]) * grow, co)
    me = obj.data
    me.vertices.foreach_set('co', co2.astype(np.float32).ravel())
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    drop = [v for v in bm.verts if not vk[v.index]]
    bmesh.ops.delete(bm, geom=drop, context='VERTS')
    bm.to_mesh(me)
    bm.free()
    me.update()


def weld(obj, dist=1e-5):
    """Merge the vertices the glTF split at UV seams (corner UVs survive), so the decimator can collapse across them."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def prune_islands(obj, min_extent):
    """Drop the pieces smaller than min_extent across (petioles, thorns, splinters of twig) — a
    decimator cannot take a tiny closed piece below a few triangles, so thousands of them would
    stall it; the branches that carry the shape remain."""
    co, tri = mesh_arrays(obj)
    if not len(tri):
        return
    lab = islands(len(co), tri)
    uniq, inv = np.unique(lab, return_inverse=True)
    lo = np.full((len(uniq), 3), np.inf)
    hi = np.full((len(uniq), 3), -np.inf)
    for k in range(3):
        np.minimum.at(lo[:, k], inv, co[:, k])
        np.maximum.at(hi[:, k], inv, co[:, k])
    ext = np.linalg.norm(hi - lo, axis=1)
    small = (ext < min_extent)[inv]
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if small[v.index]], context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def decimate(obj, target):
    t = tris(obj)
    if t <= target or t == 0:
        return
    m = obj.modifiers.new('dec', 'DECIMATE')
    m.ratio = max(0.01, target / t)
    m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)


def join(objs, name):
    objs = [o for o in objs if o and o.data.polygons]
    if not objs:
        return None
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = o.data.name = name
    o.select_set(False)
    return o


def duplicate(obj, name):
    d = obj.copy()
    d.data = obj.data.copy()
    d.name = d.data.name = name
    bpy.context.scene.collection.objects.link(d)
    return d


def shade_and_bake(objs, height, foliage_obj):
    """Vertex occlusion (COLOR_0) and, for foliage, normals bent towards the crown's dome."""
    allco = np.concatenate([mesh_arrays(o)[0] for o in objs if o])
    lo = allco.min(0)
    hi = allco.max(0)
    c = (lo + hi) / 2
    r = np.maximum((hi - lo) / 2, 1e-3)
    for o in objs:
        if not o:
            continue
        foliage = o is foliage_obj
        me = o.data
        co, _ = mesh_arrays(o)
        q = (co - np.array([c[0], c[1], lo[2]])) / np.array([r[0], r[1], hi[2] - lo[2]])
        up = np.clip(q[:, 2], 0, 1)
        radial = np.clip(np.sqrt(q[:, 0] ** 2 + q[:, 1] ** 2 + ((q[:, 2] - 0.55) / 0.55) ** 2), 0, 1.2)
        ao = np.clip(0.42 + 0.38 * up + 0.3 * radial, 0.3, 1.0) if foliage else np.clip(0.5 + 0.5 * up, 0.45, 1.0)
        if not foliage and height > 0.6:
            # wood inside a crown is shaded by it
            ao = ao * np.where(q[:, 2] > 0.35, 0.75, 1.0)
        attr = me.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
        rgba = np.repeat(ao[:, None], 4, 1).astype(np.float32)
        rgba[:, 3] = 1
        attr.data.foreach_set('color', rgba.ravel())
        if foliage:
            # dome normal: from a point low in the crown out through the vertex
            d = (co - np.array([c[0], c[1], lo[2] + (hi[2] - lo[2]) * 0.35])) / np.array([r[0], r[1], (hi[2] - lo[2]) * 0.6])
            d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-6
            me.calc_loop_triangles()
            vn = np.empty(len(me.vertices) * 3, np.float32)
            me.vertices.foreach_get('normal', vn)
            vn = vn.reshape(-1, 3)
            # cards face any way: their own normal only counts by how it agrees with the dome
            vn = np.where((np.sum(vn * d, 1) < 0)[:, None], -vn, vn)
            n = d * 0.72 + vn * 0.28
            n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-6
            me.normals_split_custom_set_from_vertices([tuple(v) for v in n])


def base_origin(obj_list, height=None):
    """Origin at the centre of the base of the group; optionally scaled to `height` metres tall."""
    allco = np.concatenate([mesh_arrays(o)[0] for o in obj_list if o])
    lo = allco.min(0)
    hi = allco.max(0)
    off = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]], np.float32)
    s = 1.0 if not height else height / max(hi[2] - lo[2], 1e-4)
    for o in obj_list:
        if not o:
            continue
        co, _ = mesh_arrays(o)
        o.data.vertices.foreach_set('co', ((co - off) * s).astype(np.float32).ravel())
        o.data.update()
    return s


def export(objs, path):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='NONE',
        export_texcoords=True,
        export_normals=True,
        export_vertex_color='NONE',
        export_tangents=False,
        export_animations=False,
        export_draco_mesh_compression_enable=False,
    )
    print('wrote', path, os.path.getsize(path) // 1024, 'KB')


def build_plants():
    out = []
    for variant, asset, objname, height, t0, t1 in PLANTS:
        reset()
        objs = import_gltf(asset)
        src = next(o for o in objs if o.name == objname)
        for o in objs:
            if o is not src:
                bpy.data.objects.remove(o, do_unlink=True)
        apply_transform(src)
        parts = split_by_material(src)
        leafs = [o for n, o in parts.items() if n.endswith('_leaves') or n.endswith('_twigs') or asset.startswith('grass')]
        woods = [o for n, o in parts.items() if o not in leafs]
        leaf = join(leafs, f'{variant}_src_leaf')
        wood = join(woods, f'{variant}_src_wood')
        # scale to the normalised height first: the cards then grow in final metres
        base_origin([leaf, wood], height)
        lt = tris(leaf) if leaf else 0
        wt = tris(wood) if wood else 0
        for lod, target in (('lod0', t0), ('lod1', t1)):
            l = duplicate(leaf, f'{variant}_{lod}_leaf') if leaf else None
            w = duplicate(wood, f'{variant}_{lod}_wood') if wood else None
            wood_budget = min(wt, int(target * (0.22 if lod == 'lod0' else 0.18)))
            leaf_budget = max(200, target - wood_budget)
            keep = min(1.0, leaf_budget / max(lt, 1))
            # grow the kept cards so the crown stays about as dense; a little less than the full
            # compensation, or a thinned crown reads as a mass of big leaves
            grow = min(3.2, (1.0 / keep) ** 0.5 * 0.82) if keep < 0.999 else 1.0
            if l:
                thin_cards(l, keep, max(1.0, grow), seed=zlib.crc32((variant + lod).encode()))
            if w:
                prune_islands(w, height * (0.035 if lod == 'lod0' else 0.09))
                decimate(w, wood_budget)
            print(variant, lod, 'leaf', tris(l) if l else 0, 'wood', tris(w) if w else 0, 'keep', round(keep, 3), 'grow', round(grow, 2))
            for o in (l, w):
                if o:
                    for p in o.data.polygons:
                        p.use_smooth = True
            # space them out for a viewer
            k = len(out)
            for o in (l, w):
                if o:
                    o.location = ((k // 2) * 3.0, (k % 2) * 3.0, 0)
            out.append((variant, lod, l, w))
        for o in (leaf, wood):
            if o:
                bpy.data.objects.remove(o, do_unlink=True)
        # keep the built objects alive across the reset: write a per-variant temp blend? simpler: export now
        export([o for _, _, l, w in out[-2:] for o in (l, w) if o], os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src', 'v2parts', f'{variant}.glb'))
    # merge the per-variant files into one
    reset()
    objs = []
    for variant, *_ in PLANTS:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src', 'v2parts', f'{variant}.glb'))
        objs += [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    export(objs, os.path.join(OUT, 'plants.glb'))


def build_rocks():
    reset()
    kept = []
    for k, (asset, objname, t0, t1) in enumerate(ROCKS):
        objs = import_gltf(asset)
        # the named level of detail when the scan has several, else its largest mesh
        src = next((o for o in objs if objname and o.name.startswith(objname)), None) or next((o for o in objs if 'LOD1' in o.name), None) or max(objs, key=tris)
        for o in objs:
            if o is not src:
                bpy.data.objects.remove(o, do_unlink=True)
        apply_transform(src)
        # 1 m across, origin at the centre of the base; the lowest 12 % sinks into the ground in the scene
        co, _ = mesh_arrays(src)
        across = max(co[:, 0].max() - co[:, 0].min(), co[:, 1].max() - co[:, 1].min())
        lo = co.min(0)
        hi = co.max(0)
        off = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]], np.float32)
        src.data.vertices.foreach_set('co', ((co - off) / across).astype(np.float32).ravel())
        src.data.update()
        weld(src, 1e-4)
        for lod, target in (('lod0', t0), ('lod1', t1)):
            d = duplicate(src, f'rock_{k}_{lod}')
            decimate(d, target)
            for p in d.data.polygons:
                p.use_smooth = True
            d.location = (k * 1.6, 0 if lod == 'lod0' else 1.6, 0)
            kept.append(d)
            print(asset, lod, tris(d))
        bpy.data.objects.remove(src, do_unlink=True)
    export(kept, os.path.join(OUT, 'rocks.glb'))


# ───────────────────────────────────────────── leaf clusters: cards cut from renders of the scans
#
# A scan's leaves are single-leaf cards — tens of thousands of them; thinned to a budget, a crown
# loses its density (a few leaves on bare twigs). Instead each crown is rebuilt from cluster cards:
# renders of a patch of the scan's own outer foliage (leaves, twigs and the gaps between them, sky
# light only), placed at a random subset of the scan's real leaf positions and turned out of the
# crown — so the crown keeps the scan's shape and the look of its leaves at a few hundred cards.

SPRITES = os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src', 'v2sprites')
# atlas: (source asset, source object, patch width in the source's metres, alpha map key)
ATLASES = {
    'maquis': ('searsia_burchellii', 'searsia_burchellii_large_LOD0', 0.3, 'Alpha'),
    'lucida': ('searsia_lucida', 'searsia_lucida_a_LOD0', 0.28, 'Alpha'),
    'dwarf': ('wild_rooibos_bush', 'wild_rooibos_bush_a', 0.14, 'Alpha'),
    'pine': ('pine_sapling_small', 'pine_sapling_small_a', 0.3, 'twig_alpha'),
}
CLUSTERS_PER_ATLAS = 8


def is_card_material(name, asset):
    return name.endswith('_leaves') or name.endswith('_twigs') or name.endswith('_twig') or asset.startswith('grass')


def wire_alpha(objs, asset, key):
    """The glTF's JPEG carries no alpha: hook the scan's cut-out mask to every card material."""
    path = os.path.join(SRC, asset, 'textures', f'{asset}_{key}_1k.jpg')
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = 'Non-Color'
    seen = set()
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            if not is_card_material(m.name, asset):
                continue
            nt = m.node_tree
            bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = img
            uv_src = next((n for n in nt.nodes if n.type == 'TEX_IMAGE' and n is not tex), None)
            if uv_src and uv_src.inputs['Vector'].links:
                nt.links.new(uv_src.inputs['Vector'].links[0].from_socket, tex.inputs['Vector'])
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Alpha'])


def cluster_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.transparent_max_bounces = 24
    scene.cycles.max_bounces = 4
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    world = bpy.data.worlds.new('sky')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    scene.world = world
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    co = bpy.data.objects.new('cam', cam)
    scene.collection.objects.link(co)
    scene.camera = co
    return scene, co


def leaf_centroids(obj):
    """Centre and normal of every card (island) of a leaf mesh."""
    co, tri = mesh_arrays(obj)
    lab = islands(len(co), tri)
    uniq, inv = np.unique(lab, return_inverse=True)
    cnt = np.bincount(inv, minlength=len(uniq)).astype(np.float64)
    cen = np.stack([np.bincount(inv, weights=co[:, k], minlength=len(uniq)) for k in range(3)], 1) / cnt[:, None]
    first = np.full(len(uniq), -1)
    tlab = inv[tri[:, 0]]
    first[tlab[::-1]] = np.arange(len(tri))[::-1]
    t = tri[first]
    n = np.cross(co[t[:, 1]] - co[t[:, 0]], co[t[:, 2]] - co[t[:, 0]])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    return cen, n


def render_clusters(name):
    from mathutils import Vector
    asset, objname, patch, key = ATLASES[name]
    reset()
    objs = import_gltf(asset)
    src = next(o for o in objs if o.name == objname)
    for o in objs:
        if o is not src:
            bpy.data.objects.remove(o, do_unlink=True)
    apply_transform(src)
    wire_alpha([src], asset, key)
    scene, cam = cluster_scene()
    co_all, _ = mesh_arrays(src)
    lo, hi = co_all.min(0), co_all.max(0)
    c = (lo + hi) / 2
    r = (hi - lo) / 2
    parts = split_by_material(src)
    leaf = [o for n, o in parts.items() if is_card_material(n, asset)]
    cen, _ = leaf_centroids(join(leaf, 'leafcopy') if len(leaf) > 1 else leaf[0])
    q = (cen - c) / r
    rad = np.linalg.norm(q, axis=1)
    # the outer, upper part of the crown, where the leaves face the light
    cand = np.where((rad > np.quantile(rad, 0.55)) & (q[:, 2] > -0.3))[0]
    rng = np.random.default_rng(zlib.crc32(name.encode()))
    os.makedirs(SPRITES, exist_ok=True)
    D = 6.0
    for i in range(CLUSTERS_PER_ATLAS):
        p = cen[rng.choice(cand)]
        d = (p - c) / r
        d /= np.linalg.norm(d)
        d = d + np.array([0, 0, 0.35])
        d /= np.linalg.norm(d)
        cam.location = Vector(p + d * D)
        cam.rotation_euler = Vector(-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = patch
        cam.data.clip_start = D - patch * 0.45
        cam.data.clip_end = D + patch * 0.9
        scene.render.filepath = os.path.join(SPRITES, f'{name}_{i}.png')
        bpy.ops.render.render(write_still=True)
        print('cluster', name, i)


# whole shrubs from the side, for the far billboards: (atlas cell, asset, object, azimuth)
FAR_VIEWS = [
    (0, 'searsia_burchellii', 'searsia_burchellii_small_LOD0', 30),
    (1, 'searsia_burchellii', 'searsia_burchellii_medium_LOD0', 120),
    (2, 'searsia_lucida', 'searsia_lucida_a_LOD0', 60),
    (3, 'searsia_burchellii', 'searsia_burchellii_large_LOD0', 200),
]


def render_far():
    """Each shrub whole, from 8° above the ground, base on the frame's lower edge — the far
    billboards' silhouettes (packed 2 × 2 by the node step)."""
    from mathutils import Vector
    for cell, asset, objname, az in FAR_VIEWS:
        reset()
        objs = import_gltf(asset)
        src = next(o for o in objs if o.name == objname)
        for o in objs:
            if o is not src:
                bpy.data.objects.remove(o, do_unlink=True)
        apply_transform(src)
        wire_alpha([src], asset, 'Alpha')
        scene, cam = cluster_scene()
        co, _ = mesh_arrays(src)
        lo, hi = co.min(0), co.max(0)
        size = max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 1.04
        c = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] + size / 2))
        el, a = math.radians(8), math.radians(az)
        d = Vector((math.cos(el) * math.sin(a), -math.cos(el) * math.cos(a), math.sin(el)))
        cam.location = c + d * 20
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = size
        cam.data.clip_start = 1
        cam.data.clip_end = 60
        scene.render.filepath = os.path.join(SPRITES, f'far_{cell}.png')
        bpy.ops.render.render(write_still=True)
        print('far', cell)


def card_object(name, centers, normals, sizes, seed, crown_c, crown_r, grid=(4, 2)):
    """Square cards at the given centres, facing out of the crown (bent by the leaf's own normal),
    each spun at random and textured with one atlas cell."""
    rng = np.random.default_rng(seed)
    n = len(centers)
    out = (centers - crown_c) / crown_r
    out /= np.linalg.norm(out, axis=1, keepdims=True) + 1e-9
    nl = np.where((np.sum(normals * out, 1) < 0)[:, None], -normals, normals)
    f = out * 0.65 + nl * 0.2 + rng.normal(0, 0.25, (n, 3))
    f /= np.linalg.norm(f, axis=1, keepdims=True) + 1e-9
    up = np.tile(np.array([0.0, 0.0, 1.0]), (n, 1))
    t1 = np.cross(up, f)
    bad = np.linalg.norm(t1, axis=1) < 1e-3
    t1[bad] = np.array([1.0, 0, 0])
    t1 /= np.linalg.norm(t1, axis=1, keepdims=True)
    t2 = np.cross(f, t1)
    a = rng.random(n) * np.pi * 2
    ax = t1 * np.cos(a)[:, None] + t2 * np.sin(a)[:, None]
    ay = t2 * np.cos(a)[:, None] - t1 * np.sin(a)[:, None]
    cells = rng.integers(0, grid[0] * grid[1], n)
    verts, faces, uvs = [], [], []
    for k in range(n):
        s = sizes[k] / 2
        u0 = (cells[k] % grid[0]) / grid[0]
        v0 = 1 - (cells[k] // grid[0] + 1) / grid[1]
        base = len(verts)
        for sx, sy, su, sv in ((-1, -1, 0, 0), (1, -1, 1, 0), (1, 1, 1, 1), (-1, 1, 0, 1)):
            verts.append(tuple(centers[k] + ax[k] * sx * s + ay[k] * sy * s))
            uvs.append((u0 + su / grid[0], v0 + sv / grid[1]))
        faces.append((base, base + 1, base + 2, base + 3))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[me.loops[li].vertex_index]
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


# variant: (asset, object, kind, normalised height m or None (trees keep metres), cards lod0, lod1, card size lod0, lod1 (m), wood tris lod0, lod1)
CROWNS = [
    ('maquis_0', 'searsia_burchellii', 'searsia_burchellii_small_LOD0', 'shrub', 1.0, 520, 150, 0.17, 0.3, 1200, 160),
    ('maquis_1', 'searsia_burchellii', 'searsia_burchellii_medium_LOD0', 'shrub', 1.0, 520, 150, 0.17, 0.3, 1200, 160),
    ('maquis_2', 'searsia_lucida', 'searsia_lucida_a_LOD0', 'shrub', 1.0, 480, 140, 0.18, 0.3, 1200, 160),
    ('maquis_3', 'searsia_burchellii', 'searsia_burchellii_large_LOD0', 'shrub', 1.0, 560, 160, 0.16, 0.28, 1400, 180),
    ('dwarf_0', 'wild_rooibos_bush', 'wild_rooibos_bush_a', 'dwarf', 0.5, 240, 70, 0.11, 0.19, 500, 80),
    ('dwarf_1', 'wild_rooibos_bush', 'wild_rooibos_bush_b', 'dwarf', 0.5, 220, 64, 0.11, 0.19, 450, 80),
    ('dwarf_2', 'wild_rooibos_bush', 'wild_rooibos_bush_c', 'dwarf', 0.5, 220, 64, 0.11, 0.19, 450, 80),
    ('dwarf_3', 'wild_rooibos_bush', 'wild_rooibos_bush_d', 'dwarf', 0.5, 200, 60, 0.11, 0.19, 420, 80),
    ('oak_0', 'island_tree_02', 'island_tree_02_LOD0', 'tree', None, 9000, 1100, 0.13, 0.36, 9000, 900),
    ('oak_1', 'island_tree_01', 'island_tree_01_LOD0', 'tree', None, 9400, 1150, 0.13, 0.36, 9000, 900),
]
GRASS_VARIANTS = [('grass_0', 'grass_medium_02_c', 1300, 300), ('grass_1', 'grass_medium_02_d', 2500, 420), ('grass_2', 'grass_medium_02_e', 1700, 360)]
V2PARTS = os.path.join(tempfile.gettempdir(), 'geo-navigation-replay-src', 'v2parts')


def build_crowns():
    written = []
    for variant, asset, objname, kind, height, c0, c1, s0, s1, w0, w1 in CROWNS:
        reset()
        objs = import_gltf(asset)
        src = next(o for o in objs if o.name == objname)
        for o in objs:
            if o is not src:
                bpy.data.objects.remove(o, do_unlink=True)
        apply_transform(src)
        parts = split_by_material(src)
        leafs = [o for n, o in parts.items() if is_card_material(n, asset)]
        woods = [o for n, o in parts.items() if o not in leafs]
        leaf = join(leafs, f'{variant}_src_leaf')
        wood = join(woods, f'{variant}_src_wood')
        base_origin([leaf, wood], height)
        cen, nrm = leaf_centroids(leaf)
        lo, hi = cen.min(0), cen.max(0)
        cc = (lo + hi) / 2
        cr = np.maximum((hi - lo) / 2, 1e-3)
        built = []
        for lod, count, size, wb in (('lod0', c0, s0, w0), ('lod1', c1, s1, w1)):
            rng = np.random.default_rng(zlib.crc32((variant + lod).encode()))
            pick = rng.choice(len(cen), size=min(count, len(cen)), replace=False)
            sizes = size * (0.8 + 0.4 * rng.random(len(pick)))
            cards = card_object(f'{variant}_{lod}_leaf', cen[pick], nrm[pick], sizes, zlib.crc32((variant + lod + 'c').encode()), cc, cr)
            w = duplicate(wood, f'{variant}_{lod}_wood') if wood else None
            if w:
                h = hi[2] if height is None else height
                prune_islands(w, max(h, 0.5) * ((0.03 if lod == 'lod0' else 0.08) * (2.0 if variant in ('maquis_1', 'maquis_3') else 1.0)))
                decimate(w, wb)
                for p in w.data.polygons:
                    p.use_smooth = True
            k = len(built)
            for o in (cards, w):
                if o:
                    o.location = (k * 8.0, 0, 0)
            built.append((cards, w))
            print(variant, lod, 'cards', len(pick), 'wood', tris(w) if w else 0)
        for o in (leaf, wood):
            if o:
                bpy.data.objects.remove(o, do_unlink=True)
        path = os.path.join(V2PARTS, f'{variant}.glb')
        export([o for pair in built for o in pair if o], path)
        written.append(path)
    # grass: the scan's own blade cards (the clumps are light), thinned for the far level
    for variant, objname, t0, t1 in GRASS_VARIANTS:
        reset()
        objs = import_gltf('grass_medium_02')
        src = next(o for o in objs if o.name == objname)
        for o in objs:
            if o is not src:
                bpy.data.objects.remove(o, do_unlink=True)
        apply_transform(src)
        base_origin([src], 0.35)
        lt = tris(src)
        built = []
        for k, (lod, target) in enumerate((('lod0', t0), ('lod1', t1))):
            l = duplicate(src, f'{variant}_{lod}_leaf')
            keep = min(1.0, target / max(lt, 1))
            thin_cards(l, keep, max(1.0, min(2.0, (1 / keep) ** 0.5 * 0.8)), seed=zlib.crc32((variant + lod).encode()))
            l.location = (k * 2.0, 0, 0)
            built.append(l)
        path = os.path.join(V2PARTS, f'{variant}.glb')
        export(built, path)
        written.append(path)
    reset()
    objs = []
    for path in written:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        objs += [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    export(objs, os.path.join(OUT, 'plants.glb'))


def build_pines():
    """Aleppo pines: a tall, slightly bent bole and an open crown of needle-tuft cards in the top
    40 %, built here (no tall pine scan is light enough); height 1 (foot … top), crown radius ~1."""
    from mathutils import Vector
    out = []
    for v in range(2):
        rng = np.random.default_rng(91 + v)
        parts = []
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1, depth=1, location=(0, 0, 0.5))
        bole = bpy.context.active_object
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for vt in bole.data.vertices:
            z = vt.co.z
            taper = 0.022 * (1 - 0.7 * z) * (1 + 0.6 * max(0.0, 0.06 - z) / 0.06)
            vt.co.x = vt.co.x * taper + 0.03 * math.sin(z * 2.4 + v * 1.7)
            vt.co.y = vt.co.y * taper + 0.02 * math.sin(z * 1.7 + v)
        bole.data.update()
        clumps = [(rng.normal(0, 0.45), rng.normal(0, 0.45), 0.5 + 0.45 * rng.random() ** 0.7) for _ in range(12 + v * 2)]
        pts, nrm = [], []
        for cx, cy, cz in clumps:
            for _ in range(420):
                d = rng.normal(0, 1, 3)
                d /= np.linalg.norm(d)
                pts.append(np.array([cx, cy, cz]) + d * np.array([0.32, 0.32, 0.1]) * (0.55 + 0.45 * rng.random()))
                nrm.append(d)
        pts = np.array(pts)
        nrm = np.array(nrm)
        for cx, cy, cz in clumps:
            start = np.array([0.03 * math.sin((cz - 0.1) * 2.4 + v * 1.7), 0.0, cz - 0.1])
            end = np.array([cx * 0.75, cy * 0.75, cz])
            vec = end - start
            L = float(np.linalg.norm(vec))
            bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=1, depth=1, location=(0, 0, 0.5))
            b = bpy.context.active_object
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            for vt in b.data.vertices:
                t = vt.co.z
                r = 0.006 * (1 - 0.6 * t)
                vt.co.x *= r
                vt.co.y *= r
                vt.co.z = t * L
            b.data.update()
            b.rotation_euler = Vector(vec / L).to_track_quat('Z', 'Y').to_euler()
            b.location = Vector(start)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            parts.append(b)
        wood = join([bole] + parts, f'pine_{v}_src_wood')
        c = np.array([0, 0, 0.85])
        r = np.array([0.8, 0.8, 0.2])
        for k, (lod, count, size) in enumerate((('lod0', 3600, 0.034), ('lod1', 520, 0.085))):
            sub = np.random.default_rng(7 + v + k).choice(len(pts), size=count, replace=False)
            cards = card_object(f'pine_{v}_{lod}_leaf', pts[sub], nrm[sub], size * (0.8 + 0.4 * rng.random(count)), 13 + v + k, c, r)
            w = duplicate(wood, f'pine_{v}_{lod}_wood')
            for o in (cards, w):
                o.location = ((v * 2 + k) * 3.0, 20, 0)
            out += [cards, w]
            print('pine', v, lod, count)
        bpy.data.objects.remove(wood, do_unlink=True)
    export(out, os.path.join(OUT, 'pines.glb'))


if MODE in ('all', 'rocks'):
    build_rocks()
if MODE == 'plants-v1':
    build_plants()
if MODE in ('all', 'clusters'):
    for name in ATLASES:
        render_clusters(name)
if MODE in ('all', 'clusters', 'far'):
    render_far()
if MODE in ('all', 'plants'):
    build_crowns()
if MODE in ('all', 'pines'):
    reset()
    build_pines()
