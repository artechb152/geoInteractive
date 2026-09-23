"""
Headless Blender build script for the trafficability-drive lab's light
military off-road vehicle. Run with:

  blender --background --python scripts/blender/build_vehicle.py

No addon, no running Blender GUI, no external assets — pure bpy geometry
+ flat PBR materials (no textures), so the model carries no licensing
requirements at all (self-authored).

Produces:
  public/assets/lessons/topic04/trafficability-drive/models/vehicle.glb
  design/docs/trafficability-drive-vehicle-preview-*.png (QA renders)

Node contract consumed by the React vehicle controller:
  - Root empty "Vehicle" at the origin (ground contact plane, y=0).
  - Child mesh "Body" — everything except the four wheels.
  - Child meshes "Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR" — each a
    single mesh whose local origin sits exactly on the wheel's rotation
    axis, so the controller can spin (rotate.x) and steer (rotate.y) them
    independently at runtime.
  - Forward driving direction is -Z. Up is +Y (glTF/Three.js convention).
  - Known dimensions (must match TrafficabilityDrive vehicle constants):
      wheelbase 2.4m, track width 1.55m, wheel radius 0.38m,
      wheel width 0.28m, chassis ride height (axle center to ground) 0.38m.
"""

import bpy
import bmesh
import math
import os

# ---------------------------------------------------------------- helpers

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def _set_first(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return True
    return False


def new_material(name, base_color, roughness=0.6, metallic=0.0, alpha=1.0, coat=0.0, coat_roughness=0.2):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*base_color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.blend_method = 'BLEND'
    if coat > 0:
        # Input names moved from 'Clearcoat'/'Clearcoat Roughness' (pre-4.0) to
        # 'Coat Weight'/'Coat Roughness' (4.0+) — try both so this keeps
        # working across Blender versions. glTF export maps this to
        # KHR_materials_clearcoat automatically (no extra export flag).
        _set_first(bsdf, ['Coat Weight', 'Clearcoat'], coat)
        _set_first(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], coat_roughness)
    return mat


def add_box(name, size, location, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    # primitive_cube_add(size=1) spans exactly 1 unit per axis, so scale == desired dimension.
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def add_cylinder(name, radius, depth, location, rotation=(0, 0, 0), segments=16):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, location=location, rotation=rotation, vertices=segments
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def bevel(obj, width=0.02, segments=2):
    mod = obj.modifiers.new('Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(45)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = name
    return result


def apply_all_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            obj.modifiers.remove(mod)


# ---------------------------------------------------------------- geometry constants (meters)

WHEELBASE = 2.4
TRACK = 1.55
WHEEL_R = 0.38
WHEEL_W = 0.28
RIDE_HEIGHT = WHEEL_R  # axle height above ground
CHASSIS_LEN = 3.9
CHASSIS_W = 1.62

AXLE_FRONT_Z = -WHEELBASE / 2
AXLE_REAR_Z = WHEELBASE / 2


# ---------------------------------------------------------------- materials

MAT_PAINT_UPPER = None
MAT_PAINT_LOWER = None
MAT_TRIM = None
MAT_TIRE = None
MAT_RIM = None
MAT_GLASS = None
MAT_LIGHT = None


def build_materials():
    global MAT_PAINT_UPPER, MAT_PAINT_LOWER, MAT_TRIM, MAT_TIRE, MAT_RIM, MAT_GLASS, MAT_LIGHT
    # NOTE: these are LINEAR base colors (glTF/Blender convention), not sRGB —
    # a value that "looks about right" typed in 0..1 as if it were sRGB
    # renders 2-3x too bright once real PBR/IBL lighting hits it. Values below
    # are converted from a target on-screen olive-drab (~#4B5320 / ~#33391A)
    # via linear = ((srgb+0.055)/1.055)^2.4.
    MAT_PAINT_UPPER = new_material('PaintUpper', (0.070, 0.086, 0.020), roughness=0.42, metallic=0.06, coat=0.6, coat_roughness=0.18)
    MAT_PAINT_LOWER = new_material('PaintLower', (0.035, 0.043, 0.010), roughness=0.55, metallic=0.03, coat=0.4, coat_roughness=0.25)
    MAT_TRIM = new_material('Trim', (0.05, 0.05, 0.055), roughness=0.5, metallic=0.3)
    MAT_TIRE = new_material('Tire', (0.02, 0.02, 0.02), roughness=0.95, metallic=0.0)
    MAT_RIM = new_material('Rim', (0.12, 0.12, 0.13), roughness=0.35, metallic=0.75)
    MAT_GLASS = new_material('Glass', (0.05, 0.09, 0.11), roughness=0.15, metallic=0.1)
    MAT_LIGHT = new_material('LightLens', (0.95, 0.92, 0.78), roughness=0.3, metallic=0.0)


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ---------------------------------------------------------------- body

def build_chassis():
    parts = []

    # Main lower chassis / frame rail block
    frame = add_box('Frame', (CHASSIS_W * 0.82, 0.32, CHASSIS_LEN * 0.72), (0, RIDE_HEIGHT + 0.08, 0.05))
    bevel(frame, 0.015, 1)
    assign(frame, MAT_PAINT_LOWER)
    parts.append(frame)

    # Cabin tub (floor + lower sides)
    tub = add_box('Tub', (CHASSIS_W, 0.42, 1.9), (0, RIDE_HEIGHT + 0.42, 0.15))
    bevel(tub, 0.03, 2)
    assign(tub, MAT_PAINT_UPPER)
    parts.append(tub)

    # Hood (tapered forward using a scaled + rotated box, angled down toward the front)
    hood = add_box('Hood', (CHASSIS_W * 0.86, 0.34, 1.35), (0, RIDE_HEIGHT + 0.66, AXLE_FRONT_Z + 0.25),
                    rotation=(math.radians(-4), 0, 0))
    bevel(hood, 0.03, 2)
    assign(hood, MAT_PAINT_UPPER)
    parts.append(hood)

    # Grille block (dark, recessed slightly under the hood front)
    grille = add_box('Grille', (CHASSIS_W * 0.6, 0.4, 0.08), (0, RIDE_HEIGHT + 0.55, AXLE_FRONT_Z - 0.42))
    assign(grille, MAT_TRIM)
    parts.append(grille)

    # Front bumper (rounded bar) — cylinder's own axis (local Z) rotated 90° about Y
    # to point along world X (vehicle width).
    bumper_f = add_cylinder('BumperFront', 0.09, CHASSIS_W * 0.98, (0, RIDE_HEIGHT + 0.28, AXLE_FRONT_Z - 0.55),
                             rotation=(0, math.radians(90), 0), segments=10)
    assign(bumper_f, MAT_TRIM)
    parts.append(bumper_f)

    # Rear bumper
    bumper_r = add_cylinder('BumperRear', 0.09, CHASSIS_W * 0.98, (0, RIDE_HEIGHT + 0.28, AXLE_REAR_Z + 0.55),
                             rotation=(0, math.radians(90), 0), segments=10)
    assign(bumper_r, MAT_TRIM)
    parts.append(bumper_r)

    # Cargo bed (open box, low walls) at the rear
    bed_floor = add_box('BedFloor', (CHASSIS_W * 0.92, 0.06, 1.15), (0, RIDE_HEIGHT + 0.62, AXLE_REAR_Z + 0.15))
    assign(bed_floor, MAT_PAINT_LOWER)
    parts.append(bed_floor)
    for side, sx in (('L', -1), ('R', 1)):
        wall = add_box(f'BedWall{side}', (0.06, 0.4, 1.15),
                        (sx * (CHASSIS_W * 0.92) / 2, RIDE_HEIGHT + 0.82, AXLE_REAR_Z + 0.15))
        assign(wall, MAT_PAINT_LOWER)
        parts.append(wall)
    tailgate = add_box('Tailgate', (CHASSIS_W * 0.92, 0.4, 0.06), (0, RIDE_HEIGHT + 0.82, AXLE_REAR_Z + 0.72))
    assign(tailgate, MAT_PAINT_LOWER)
    parts.append(tailgate)

    # Windshield frame (two angled pillars + top bar) + glass pane
    for sx in (-1, 1):
        pillar = add_box(f'Pillar{sx}', (0.05, 0.62, 0.05),
                          (sx * (CHASSIS_W * 0.86) / 2, RIDE_HEIGHT + 1.0, -0.15),
                          rotation=(math.radians(12), 0, 0))
        assign(pillar, MAT_TRIM)
        parts.append(pillar)
    top_bar = add_box('WindshieldTop', (CHASSIS_W * 0.8, 0.05, 0.05), (0, RIDE_HEIGHT + 1.28, -0.32),
                       rotation=(math.radians(12), 0, 0))
    assign(top_bar, MAT_TRIM)
    parts.append(top_bar)
    glass = add_box('Windshield', (CHASSIS_W * 0.74, 0.55, 0.02), (0, RIDE_HEIGHT + 1.0, -0.18),
                     rotation=(math.radians(12), 0, 0))
    assign(glass, MAT_GLASS)
    parts.append(glass)

    # Roll cage — four vertical posts + a top perimeter made from beveled boxes (kept simple/robust
    # instead of curve-based tubes, which are harder to guarantee manifold on export).
    cage_positions = [
        (-CHASSIS_W * 0.42, -0.05),
        (CHASSIS_W * 0.42, -0.05),
        (-CHASSIS_W * 0.42, AXLE_REAR_Z - 0.05),
        (CHASSIS_W * 0.42, AXLE_REAR_Z - 0.05),
    ]
    post_top_y = RIDE_HEIGHT + 1.62
    post_base_y = RIDE_HEIGHT + 0.9
    for i, (px, pz) in enumerate(cage_positions):
        # Posts stand vertically (world height axis); remap cylinder's default
        # Z-axis to Y via -90 deg about X, same as the antenna base rotation.
        post = add_cylinder(f'CagePost{i}', 0.035, post_top_y - post_base_y,
                             (px, (post_top_y + post_base_y) / 2, pz),
                             rotation=(math.radians(-90), 0, 0), segments=8)
        assign(post, MAT_TRIM)
        parts.append(post)
    # top perimeter bars — axis along world X (width), same 90°-about-Y remap as the bumpers.
    top_front = add_cylinder('CageTopFront', 0.032, CHASSIS_W * 0.84 + 0.07, (0, post_top_y, -0.05),
                              rotation=(0, math.radians(90), 0), segments=8)
    assign(top_front, MAT_TRIM)
    parts.append(top_front)
    top_rear = add_cylinder('CageTopRear', 0.032, CHASSIS_W * 0.84 + 0.07, (0, post_top_y, AXLE_REAR_Z - 0.05),
                             rotation=(0, math.radians(90), 0), segments=8)
    assign(top_rear, MAT_TRIM)
    parts.append(top_rear)
    # side bars run along world Z (depth) — that's already a cylinder's default axis, no rotation needed.
    for sx in (-1, 1):
        side_bar = add_cylinder(f'CageSide{sx}', 0.032, AXLE_REAR_Z - 0.1, (sx * CHASSIS_W * 0.42, post_top_y, (AXLE_REAR_Z - 0.05) / 2 - 0.025),
                                 rotation=(0, 0, 0), segments=8)
        assign(side_bar, MAT_TRIM)
        parts.append(side_bar)

    # Headlights (small cylinders inset in the grille) — default cylinder axis is
    # already world Z (depth), so the flat lens face naturally points forward/back.
    for sx in (-1, 1):
        light = add_cylinder(f'Headlight{sx}', 0.09, 0.05,
                              (sx * CHASSIS_W * 0.34, RIDE_HEIGHT + 0.58, AXLE_FRONT_Z - 0.46),
                              rotation=(0, 0, 0), segments=12)
        assign(light, MAT_LIGHT)
        parts.append(light)

    # Side mirrors
    for sx in (-1, 1):
        stalk = add_box(f'MirrorStalk{sx}', (0.03, 0.03, 0.18), (sx * CHASSIS_W * 0.52, RIDE_HEIGHT + 1.05, -0.1))
        assign(stalk, MAT_TRIM)
        parts.append(stalk)
        head = add_box(f'MirrorHead{sx}', (0.05, 0.12, 0.16), (sx * (CHASSIS_W * 0.52 + 0.06), RIDE_HEIGHT + 1.05, -0.1))
        assign(head, MAT_TRIM)
        parts.append(head)

    # Fender flares over each wheel opening
    for sx, sz, tag in (
        (-1, AXLE_FRONT_Z, 'FL'), (1, AXLE_FRONT_Z, 'FR'),
        (-1, AXLE_REAR_Z, 'RL'), (1, AXLE_REAR_Z, 'RR'),
    ):
        flare = add_box(f'Flare{tag}', (0.14, 0.22, 0.66), (sx * (TRACK / 2 + 0.02), RIDE_HEIGHT + 0.34, sz))
        bevel(flare, 0.04, 2)
        assign(flare, MAT_PAINT_LOWER)
        parts.append(flare)

    # Spare wheel mount on the tailgate (simple disc, doesn't need to spin — join into Body)
    spare = add_cylinder('SpareWheel', WHEEL_R * 0.92, WHEEL_W * 0.9, (0, RIDE_HEIGHT + 0.95, AXLE_REAR_Z + 0.78),
                          rotation=(0, math.radians(90), 0), segments=20)
    assign(spare, MAT_TIRE)
    parts.append(spare)
    spare_rim = add_cylinder('SpareRim', WHEEL_R * 0.5, WHEEL_W * 0.95, (0, RIDE_HEIGHT + 0.95, AXLE_REAR_Z + 0.78),
                              rotation=(0, math.radians(90), 0), segments=16)
    assign(spare_rim, MAT_RIM)
    parts.append(spare_rim)

    # Antenna (thin, whippy) — base rotation of -90° about X stands the cylinder's
    # default Z-axis up along world Y, plus a small whip lean. Rooted near the
    # bed wall top so it doesn't float disconnected above the roll cage.
    antenna_len = 0.7
    antenna = add_cylinder('Antenna', 0.012, antenna_len,
                            (CHASSIS_W * 0.44, RIDE_HEIGHT + 0.82 + antenna_len / 2, AXLE_REAR_Z + 0.05),
                            rotation=(math.radians(-90 + 8), 0, math.radians(-6)), segments=6)
    assign(antenna, MAT_TRIM)
    parts.append(antenna)

    for p in parts:
        apply_all_modifiers(p)

    body = join(parts, 'Body')
    return body


def build_wheel(tag, x, z):
    parts = []
    # Wheel spin axis is world X (left-right); cylinders default to axis-Z, so
    # remap Z->X via a 90° rotation about Y.
    rotation = (0, math.radians(90), 0)

    tire = add_cylinder(f'Tire_{tag}', WHEEL_R, WHEEL_W, (x, WHEEL_R, z), rotation=rotation, segments=24)
    bevel(tire, 0.05, 3)
    assign(tire, MAT_TIRE)
    parts.append(tire)

    rim = add_cylinder(f'Rim_{tag}', WHEEL_R * 0.55, WHEEL_W * 1.04, (x, WHEEL_R, z), rotation=rotation, segments=16)
    assign(rim, MAT_RIM)
    parts.append(rim)

    hub = add_cylinder(f'Hub_{tag}', WHEEL_R * 0.14, WHEEL_W * 1.1, (x, WHEEL_R, z), rotation=rotation, segments=12)
    assign(hub, MAT_TRIM)
    parts.append(hub)

    # Tread blocks — small boxes radially arrayed around the wheel's rotation
    # axis (world X), so they vary in height (Y) and depth (Z), not X.
    n = 14
    for i in range(n):
        ang = (i / n) * math.tau
        by = WHEEL_R - math.cos(ang) * WHEEL_R * 0.98
        bz = z + math.sin(ang) * WHEEL_R * 0.98
        block = add_box(f'Tread_{tag}_{i}', (WHEEL_W * 1.02, 0.07, 0.07), (x, by, bz),
                         rotation=(ang, 0, 0))
        assign(block, MAT_TIRE)
        parts.append(block)

    for p in parts:
        apply_all_modifiers(p)

    wheel = join(parts, f'Wheel_{tag}')

    # Set the object's origin to the wheel's rotation axis (x, WHEEL_R, z) so runtime
    # rotation (rolling + steering) happens around the correct point.
    bpy.context.scene.cursor.location = (x, WHEEL_R, z)
    bpy.context.view_layer.objects.active = wheel
    wheel.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return wheel


def build_vehicle():
    build_materials()

    body = build_chassis()
    wheel_fl = build_wheel('FL', -TRACK / 2, AXLE_FRONT_Z)
    wheel_fr = build_wheel('FR', TRACK / 2, AXLE_FRONT_Z)
    wheel_rl = build_wheel('RL', -TRACK / 2, AXLE_REAR_Z)
    wheel_rr = build_wheel('RR', TRACK / 2, AXLE_REAR_Z)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = 'Vehicle'
    root.empty_display_size = 0.3

    # Every part above was authored treating Blender's native Y axis as "up" and
    # Z as "depth" (i.e. swapped from Blender's real Z-up/Y-depth convention).
    # A +90 deg rotation about X on the root swaps them back before the glTF
    # exporter's own Z-up -> Y-up conversion runs, so the exported model ends up
    # correctly Y-up with -Z forward, matching the doc comment at the top of
    # this file. Left unbaked (not transform_apply'd) — glTF stores it as the
    # root node's own rotation, which GLTFLoader/Three.js honors like any other
    # node transform.
    root.rotation_euler = (math.radians(90), 0, 0)

    # matrix_parent_inverse is left at its default identity (NOT set to
    # root.matrix_world.inverted()) so children actually inherit the root's
    # +90 deg correction above instead of having it cancelled out.
    for obj in (body, wheel_fl, wheel_fr, wheel_rl, wheel_rr):
        obj.parent = root

    return root


# ---------------------------------------------------------------- render QA

def render_preview(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    scene = bpy.context.scene
    for engine_id in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES'):
        try:
            scene.render.engine = engine_id
            break
        except TypeError:
            continue
    scene.render.resolution_x = 900
    scene.render.resolution_y = 650
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new('World')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.83, 0.80, 0.73, 1.0)
        bg.inputs[1].default_value = 1.0

    sun_data = bpy.data.lights.new('Sun', type='SUN')
    sun_data.energy = 3.2
    sun = bpy.data.objects.new('Sun', sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55), 0, math.radians(35))

    fill_data = bpy.data.lights.new('Fill', type='SUN')
    fill_data.energy = 0.8
    fill = bpy.data.objects.new('Fill', fill_data)
    bpy.context.collection.objects.link(fill)
    fill.rotation_euler = (math.radians(60), 0, math.radians(-140))

    ground = add_box('Ground', (10, 10, 0.05), (0, 0, -0.025))
    ground_mat = new_material('GroundPreview', (0.55, 0.5, 0.4), roughness=0.9)
    assign(ground, ground_mat)

    cam_data = bpy.data.cameras.new('Cam')
    cam_data.lens = 42
    cam = bpy.data.objects.new('Cam', cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    # Tuples are (X=side, Y=depth, Z=height) — Blender's real convention —
    # now that the vehicle root carries the +90 deg correction, the model's
    # own "up" is Blender Z, matching a normal scene.
    import mathutils
    angles = {
        'front34': (4.2, -5.6, 1.9),
        'side': (5.8, 0.2, 1.5),
        'rear34': (4.0, 5.4, 2.1),
    }
    target = mathutils.Vector((0, 0, 0.9))
    for name, pos in angles.items():
        cam.location = pos
        direction = target - mathutils.Vector(pos)
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(out_dir, f'vehicle-preview-{name}.png')
        bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- main

def main():
    clear_scene()
    build_vehicle()

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    out_glb_dir = os.path.join(project_root, 'public', 'assets', 'lessons', 'topic04', 'trafficability-drive', 'models')
    os.makedirs(out_glb_dir, exist_ok=True)
    out_glb = os.path.join(out_glb_dir, 'vehicle.glb')

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
        export_animations=False,
    )
    print(f'WROTE_GLB:{out_glb}')

    preview_dir = os.path.join(project_root, 'design', 'docs', 'trafficability-drive-previews')
    render_preview(preview_dir)
    print(f'WROTE_PREVIEWS:{preview_dir}')


main()
