"""
Headless Blender render of the lesson-6 compass body (PrinciplesScene →
AzimuthExplorer, "מצפן ומפה"). Run with:

  blender --background --python scripts/blender/build_compass_body.py

(on this machine: "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")

What it renders: ONLY the physical instrument — a round capsule with a knurled
rim, a domed matte-olive bezel, a thin metal inner ring and a recessed ivory
face — seen straight from above (orthographic, north = image up), with its own
soft contact shadow on a transparent background.

What it does NOT render: every printed or moving mark (bezel numbers, face
graduations, cross-hair, the azimuth pointers, the pivot cap, the glass glint).
Those are drawn live in SVG from exact data by CompassInstrument
(src/components/lessons/topic-06/CompassMapVisuals.tsx), on top of this image.

Coordinate contract with the SVG (keep in sync with COMPASS_RINGS in
src/components/lessons/topic-06/compassMapGeometry.ts):
  - 1 Blender unit = 100 SVG units; outer knurl radius R = 1.0 (SVG 100).
  - The image covers ±IMAGE_HALF (SVG ±119) around the capsule centre.
  - The ring radii below are the SVG ring radii / 100.
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "assets", "lessons", "topic06", "compass")
OUT_FILE = os.path.join(OUT_DIR, "compass-body.webp")

IMAGE_HALF = 1.19  # half the rendered square, in units of R
RES = 1024  # px — the capsule is ~280 CSS px wide, so this is ~3x

# Ring radii (units of R) — mirrored in compassMapGeometry.ts COMPASS_RINGS
RIM_OUT = 1.0  # knurl ridge tips
KNURL_IN = 0.94  # knurl band starts (meets the bezel)
BEZEL_IN = 0.705  # bezel inner edge (meets the metal ring)
METAL_IN = 0.672  # metal ring inner edge = visible face radius
FACE_Z = 0.0  # face surface, well below the bezel → a real recess

RIDGES = 144

# Materials — base colours are the site's own tokens (tailwind.config.ts),
# lit by the scene: olive ink #38432E (fg) for the bezel, illustration olive
# #6E7A4E (MAP.vegInk) for the knurl, #C9B99B (MAP.grid) for the metal ring, paper #F6EFE6
# (bg-accent) for the face.


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i : i + 2], 16)) for i in (0, 2, 4)) + (1.0,)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 192
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    return scene


def make_material(name, base_hex, roughness, metallic=0.0, grain=0.0, grain_scale=420.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_rgba(base_hex)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if grain:
        # fine powder-coat / paper grain: noise → bump
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = grain_scale
        tex.inputs["Detail"].default_value = 6.0
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = grain
        bump.inputs["Distance"].default_value = 0.002
        nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def lathe(name, profile, segments=360):
    """Revolve a closed (r, z) profile around Z — a smooth-shaded ring."""
    bm = bmesh.new()
    rings = [
        [bm.verts.new((r * math.cos(2 * math.pi * i / segments), r * math.sin(2 * math.pi * i / segments), z)) for i in range(segments)]
        for r, z in profile
    ]
    n = len(rings)
    for k in range(n):
        a, b = rings[k], rings[(k + 1) % n]
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def disc(name, r, z0, z1, segments=360):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=r, depth=z1 - z0, location=(0, 0, (z0 + z1) / 2))
    ob = bpy.context.active_object
    ob.name = name
    return ob


def knurl_ridges(name, count, r_in, r_out):
    """`count` rounded ridges on a band that slopes down to the rim — the grip."""
    bm = bmesh.new()
    pitch = 2 * math.pi / count
    half = pitch * 0.40  # angular half-width of a ridge
    # (r, z) of the ridge's top edge: high at the bezel, rolling off at the tip
    top = [(r_in, 0.142), (r_in + 0.015, 0.145), (r_in + 0.035, 0.136), (r_out - 0.01, 0.112), (r_out, 0.09)]
    for i in range(count):
        a = pitch * i
        verts_top_l, verts_top_r, verts_bot_l, verts_bot_r = [], [], [], []
        for r, z in top:
            for side, store_t, store_b in ((-1, verts_top_l, verts_bot_l), (1, verts_top_r, verts_bot_r)):
                ang = a + side * half
                store_t.append(bm.verts.new((r * math.cos(ang), r * math.sin(ang), z)))
                store_b.append(bm.verts.new((r * math.cos(ang), r * math.sin(ang), 0.02)))
        m = len(top)
        for k in range(m - 1):
            bm.faces.new((verts_top_l[k], verts_top_l[k + 1], verts_top_r[k + 1], verts_top_r[k]))  # top
            bm.faces.new((verts_bot_l[k], verts_top_l[k], verts_top_l[k + 1], verts_bot_l[k + 1]))  # side −
            bm.faces.new((verts_bot_r[k + 1], verts_top_r[k + 1], verts_top_r[k], verts_bot_r[k]))  # side +
            bm.faces.new((verts_bot_l[k + 1], verts_bot_r[k + 1], verts_bot_r[k], verts_bot_l[k]))  # bottom
        bm.faces.new((verts_bot_l[0], verts_bot_r[0], verts_top_r[0], verts_top_l[0]))  # inner cap
        bm.faces.new((verts_top_l[m - 1], verts_top_r[m - 1], verts_bot_r[m - 1], verts_bot_l[m - 1]))  # tip cap
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = 0.0085
    mod.segments = 4
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(35)
    return ob


def area_light(name, location, energy, size, color=(1.0, 1.0, 1.0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = size
    data.color = color
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (-Vector(location)).normalized().to_track_quat("-Z", "Y").to_euler()
    return ob


def build():
    scene = reset_scene()

    olive = make_material("Bezel", "#38432E", roughness=0.72, grain=0.35)
    knurl = make_material("Knurl", "#6E7A4E", roughness=0.55, grain=0.2)
    metal = make_material("MetalRing", "#C9B99B", roughness=0.3, metallic=0.75)
    face = make_material("Face", "#F6EFE6", roughness=0.9, grain=0.05, grain_scale=900.0)

    # Puck under everything (hidden except between knurl ridges).
    base = disc("Base", 0.985, 0.0, 0.05)
    base.data.materials.append(knurl)

    # Knurled band: ridges sloping from the bezel down to the rim.
    ridges = knurl_ridges("Knurl", RIDGES, KNURL_IN - 0.006, RIM_OUT)
    ridges.data.materials.append(knurl)

    # Bezel: domed ring, highest a little inside its middle.
    bezel = lathe(
        "Bezel",
        [
            (KNURL_IN + 0.004, 0.06),
            (KNURL_IN + 0.004, 0.142),
            (0.905, 0.162),
            (0.86, 0.172),
            (0.8, 0.175),
            (0.75, 0.168),
            (BEZEL_IN + 0.01, 0.152),
            (BEZEL_IN, 0.138),
            (BEZEL_IN, 0.06),
        ],
    )
    bezel.data.materials.append(olive)

    # Metal ring: a rounded lip stepping down into the capsule.
    ring = lathe(
        "MetalRing",
        [
            (BEZEL_IN + 0.004, 0.05),
            (BEZEL_IN + 0.004, 0.14),
            (BEZEL_IN - 0.006, 0.146),
            (METAL_IN + 0.01, 0.13),
            (METAL_IN + 0.002, 0.11),
            (METAL_IN, 0.075),
            (METAL_IN, 0.05),
        ],
    )
    ring.data.materials.append(metal)

    # Face: sunk well below the ring lip, so the lip throws a soft inner shadow.
    face_ob = disc("Face", METAL_IN + 0.01, FACE_Z - 0.02, FACE_Z + 0.075)
    face_ob.data.materials.append(face)

    # Ground: shadow catcher only (transparent film keeps just the shadow).
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "ShadowCatcher"
    ground.is_shadow_catcher = True
    ground.location.z = 0.0

    # Raise the instrument so it sits on the ground plane.
    for ob in (base, ridges, bezel, ring, face_ob):
        ob.location.z += 0.02

    # Light: a broad warm key from the upper left (north-west), a cool weak fill.
    area_light("Key", (-2.2, 2.6, 3.2), 185.0, 2.6, (1.0, 0.95, 0.87))
    area_light("Fill", (2.6, -1.6, 3.4), 32.0, 5.0, (0.96, 0.98, 1.0))

    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34
    scene.world = world

    # Camera: straight down, orthographic, north (+Y) = image up.
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2 * IMAGE_HALF
    cam_data.clip_end = 50
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0, 0, 10)
    scene.camera = cam

    os.makedirs(OUT_DIR, exist_ok=True)
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 90
    scene.render.filepath = OUT_FILE
    bpy.ops.render.render(write_still=True)
    print("WROTE", OUT_FILE)


build()
