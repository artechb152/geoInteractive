"""Assets of the lesson-6 dead-reckoning sandstorm (ניווט עיוור): ground PBR
textures and the scanned rocks and bushes, packed for the live first-person
scene (src/components/lessons/topic-06/dead-reckoning/).

Sources: Poly Haven, CC0 (public/assets/lessons/topic06/dead-reckoning/ATTRIBUTIONS.md).
The script downloads the 1K files itself (api.polyhaven.com, no key) into
--src, unless they are already there.

    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup \\
        --python scripts/blender/build_dead_reckoning_assets.py -- \\
        --src <download dir> --out public/assets/lessons/topic06/dead-reckoning

Output (all under --out):
    ground/<name>_albedo.webp   albedo, sRGB, 1024 px
    ground/<name>_normal.webp   RG = OpenGL normal XY, B = height (displacement), 1024 px
    ground/roughness.webp       the four layers' roughness, one per channel
                                (R ground, G stony, B bank, A drift), 512 px —
                                the layers share one UV, so one fetch serves all
    rocks.glb                   11 scanned rocks and stones, decimated, origin at
                                the base centre, Y up, metres
    shrubs.glb                  4 dry bushes (twigs + leaf cards), origin at the root
"""

import json
import math
import os
import sys
import urllib.request

import bpy
import bmesh
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
args = dict(zip(argv[::2], argv[1::2]))
SRC = os.path.abspath(args.get("--src", "polyhaven-src"))
OUT = os.path.abspath(args.get("--out", "public/assets/lessons/topic06/dead-reckoning"))

# The ground materials, in the order of the terrain shader's layers.
GROUND = {
    "ground": "gravelly_sand",  # warm compact desert soil with fine grit — the base
    "stony": "rocky_trail",  # stony patches, the wadi bed
    "bank": "excavated_soil_wall",  # eroded wadi banks and steep cuts
    "drift": "dense_sand",  # wind-blown sand drifts
}
# Rock shapes: (Poly Haven id, target triangles per piece, prefix)
ROCKS = [
    ("namaqualand_stones_01", 220, "stone"),
    ("namaqualand_rocks_01", 900, "rock"),
    ("rock_07", 900, "rock07"),
    ("namaqualand_boulder_05", 2600, "boulder"),
]
SHRUB = "wild_rooibos_bush"
# Bushes kept (a is the largest, 13k triangles — too heavy to scatter).
SHRUB_KEEP = ("b", "c", "d", "e")


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print("download", url)
    req = urllib.request.Request(url, headers={"User-Agent": "geo-course-asset-build"})
    with urllib.request.urlopen(req) as r, open(path, "wb") as f:
        f.write(r.read())


def api(path):
    req = urllib.request.Request("https://api.polyhaven.com/" + path, headers={"User-Agent": "geo-course-asset-build"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def fetch_texture_set(asset):
    files = api("files/" + asset)
    out = {}
    for key in ("Diffuse", "Rough", "nor_gl", "Displacement"):
        f = files[key]["1k"]
        f = f.get("jpg") or f.get("png")
        path = os.path.join(SRC, "tex", f"{asset}_{key}.{f['url'].rsplit('.', 1)[1]}")
        fetch(f["url"], path)
        out[key] = path
    return out


def fetch_model(asset):
    files = api("files/" + asset)["gltf"]["1k"]["gltf"]
    root = os.path.join(SRC, "models", asset)
    gltf = os.path.join(root, files["url"].rsplit("/", 1)[1])
    fetch(files["url"], gltf)
    for rel, f in files["include"].items():
        fetch(f["url"], os.path.join(root, rel))
    return gltf


# ---------------------------------------------------------------- ground textures


def load_raw(path):
    """Pixels as stored in the file (no colour management), float RGBA, rows bottom-up."""
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)


def resize(px, size):
    """Box-filter down to size × size (the sources are square powers of two)."""
    h = px.shape[0]
    k = h // size
    return px.reshape(size, k, size, k, 4).mean(axis=(1, 3)) if k > 1 else px


def save_webp(px, path, quality, alpha=False):
    h, w, _ = px.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=alpha, float_buffer=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(np.ascontiguousarray(px, dtype=np.float32).ravel())
    scene = bpy.context.scene
    s = scene.render.image_settings
    s.file_format = "WEBP"
    s.color_mode = "RGBA" if alpha else "RGB"
    s.quality = quality
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save_render(path, scene=scene)
    bpy.data.images.remove(img)
    print("wrote", path, os.path.getsize(path) // 1024, "KB")


def build_ground():
    rough_pack = np.ones((512, 512, 4), dtype=np.float32)
    for ch, (name, asset) in enumerate(GROUND.items()):
        t = fetch_texture_set(asset)
        diff = load_raw(t["Diffuse"])
        nor = load_raw(t["nor_gl"])
        disp = load_raw(t["Displacement"])
        rough_pack[..., ch] = resize(load_raw(t["Rough"]), 512)[..., 0]
        nh = nor.copy()
        # Height normalised to the full 0–1 range, so the shader's height blend has the same contrast for every layer.
        d = disp[..., 0]
        lo, hi = np.percentile(d, 1), np.percentile(d, 99)
        nh[..., 2] = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
        save_webp(diff, os.path.join(OUT, "ground", f"{name}_albedo.webp"), 80)
        save_webp(nh, os.path.join(OUT, "ground", f"{name}_normal.webp"), 84)
    save_webp(rough_pack, os.path.join(OUT, "ground", "roughness.webp"), 90, alpha=True)


# ---------------------------------------------------------------- rocks and bushes


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before and o.type == "MESH"]


def to_base_origin(obj):
    """Apply transforms; origin at the centre of the base, so a scale keeps it on the ground."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = obj.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    # Blender is Z up. The base is the lowest few centimetres' footprint.
    cx = (co[:, 0].min() + co[:, 0].max()) / 2
    cy = (co[:, 1].min() + co[:, 1].max()) / 2
    cz = co[:, 2].min()
    co -= np.array([cx, cy, cz], dtype=np.float32)
    me.vertices.foreach_set("co", co.ravel())
    me.update()
    obj.location = (0, 0, 0)
    obj.select_set(False)


def decimate(obj, target_tris):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= target_tris:
        return tris
    m = obj.modifiers.new("dec", "DECIMATE")
    m.ratio = target_tris / tris
    m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def shrink_textures(objs, size):
    """Scale every texture to `size` — also at the same size, which makes the exporter re-encode it
    (otherwise it copies the source's ~1 MB high-quality JPEG unchanged)."""
    seen = set()
    for o in objs:
        for slot in o.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes:
                continue
            for n in mat.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image and n.image.name not in seen:
                    seen.add(n.image.name)
                    s = min(size, n.image.size[0])
                    n.image.scale(s, s)


def export_glb(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format="JPEG",
        export_jpeg_quality=86,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_animations=False,
    )
    print("wrote", path, os.path.getsize(path) // 1024, "KB")


def build_rocks():
    clear_scene()
    kept = []
    for asset, target, prefix in ROCKS:
        objs = import_gltf(fetch_model(asset))
        objs.sort(key=lambda o: o.name)
        for k, o in enumerate(objs):
            o.parent = None
            to_base_origin(o)
            n = decimate(o, target)
            shade_smooth(o)
            o.name = o.data.name = f"{prefix}_{chr(97 + k)}"
            # Spread them out so the exported scene is readable in a viewer; the scene uses each mesh on its own.
            o.location = (len(kept) * 2.0, 0, 0)
            kept.append(o)
            print(o.name, n, "tris")
        # Most rocks are small on screen: 512 px textures are enough; the boulder keeps 1024.
        shrink_textures(objs, 1024 if prefix == "boulder" else 512)
    export_glb(kept, os.path.join(OUT, "rocks.glb"))


def build_shrubs():
    clear_scene()
    objs = import_gltf(fetch_model(SHRUB))
    keep = []
    for o in objs:
        suffix = o.name.rsplit("_", 1)[-1][:1]
        root = o
        while root.parent:
            root = root.parent
        name = root.name if root is not o else o.name
        letter = name.rsplit("_", 1)[-1][:1]
        if letter in SHRUB_KEEP:
            o.parent = None
            to_base_origin(o)
            o.name = o.data.name = f"shrub_{letter}"
            o.location = (len(keep) * 1.5, 0, 0)
            keep.append(o)
        else:
            bpy.data.objects.remove(o)
    shrink_textures(keep, 512)
    export_glb(keep, os.path.join(OUT, "shrubs.glb"))


if __name__ == "__main__":
    build_ground()
    build_rocks()
    build_shrubs()
