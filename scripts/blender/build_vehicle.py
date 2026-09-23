"""
Headless Blender build script for the trafficability-drive lab's light
military off-road vehicle. Run with:

  blender --background --python scripts/blender/build_vehicle.py

No addon, no running Blender GUI, no external assets — pure bpy/bmesh
geometry + flat PBR materials (no textures), so the model carries no
licensing requirements at all (self-authored).

Produces:
  public/assets/lessons/topic04/trafficability-drive/models/vehicle.glb
  design/docs/trafficability-drive-previews/vehicle-preview-*.png (QA renders)

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

Material names are part of the contract too — Vehicle.tsx tunes per-material
reflection strength by name (see vehicleMaterials.ts).

Style: deliberately low-poly/stylized, but "finished" — every hard edge gets
a small bevel with hardened normals so it catches a highlight, and each
physical material family (painted body, painted chassis, painted metal, bare
metal, rubber, glass, lens, canvas) is its own material so they separate
under light instead of reading as one plastic mass.
"""

import bpy
import bmesh
import math
import os
from mathutils import Matrix, Vector

# ---------------------------------------------------------------- helpers

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def srgb(hex_color):
    """'#RRGGBB' (what you'd pick on screen) -> linear RGB tuple for Principled BSDF.

    Base colors must be LINEAR — typing an sRGB-looking value straight into
    0..1 renders 2-3x too bright/pale once real PBR/IBL lighting hits it."""
    h = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def _set_first(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return True
    return False


def new_material(name, hex_color, roughness=0.6, metallic=0.0, alpha=1.0, coat=0.0, coat_roughness=0.2,
                 specular=None, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    # Every part is a closed solid, so single-sided (exports doubleSided:
    # false) — halves fragment work and avoids back-face shadow artifacts.
    # Only see-through glass keeps both sides.
    mat.use_backface_culling = alpha >= 1.0
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*srgb(hex_color), 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        for attr, value in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(mat, attr, value)
            except (AttributeError, TypeError):
                pass
    if coat > 0:
        # Input names moved from 'Clearcoat'/'Clearcoat Roughness' (pre-4.0) to
        # 'Coat Weight'/'Coat Roughness' (4.0+) — try both so this keeps
        # working across Blender versions. glTF export maps this to
        # KHR_materials_clearcoat automatically (no extra export flag).
        _set_first(bsdf, ['Coat Weight', 'Clearcoat'], coat)
        _set_first(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], coat_roughness)
    if specular is not None:
        # Rubber/canvas reflect noticeably less than the 0.5 default (exports
        # as KHR_materials_specular) — the main cue that separates "rubber"
        # from "black plastic".
        _set_first(bsdf, ['Specular IOR Level', 'Specular'], specular)
    if emission is not None:
        _set_first(bsdf, ['Emission Color', 'Emission'], (*srgb(emission), 1.0))
        _set_first(bsdf, ['Emission Strength'], emission_strength)
    return mat


def _link_bmesh(name, bm):
    mesh = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def _xform(location=(0, 0, 0), rotation=(0, 0, 0)):
    """Object-space placement matrix. rotation is an XYZ Euler in radians."""
    from mathutils import Euler
    return Matrix.Translation(Vector(location)) @ Euler(rotation, 'XYZ').to_matrix().to_4x4()


def add_box(name, size, location, rotation=(0, 0, 0), matrix=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=matrix if matrix is not None else _xform(location, rotation), verts=bm.verts)
    return _link_bmesh(name, bm)


def add_cylinder(name, radius, depth, location, rotation=(0, 0, 0), segments=16, radius_top=None):
    """Cylinder along its local Z axis (same convention as primitive_cylinder_add)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                          radius1=radius, radius2=radius if radius_top is None else radius_top, depth=depth)
    bmesh.ops.transform(bm, matrix=_xform(location, rotation), verts=bm.verts)
    return _link_bmesh(name, bm)


def add_tube(name, r_out, r_in, depth, location, rotation=(0, 0, 0), segments=32):
    """Hollow ring along local Z — a tire carcass, bezel, etc. (a solid cylinder
    would cap over the rim and hide it)."""
    bm = bmesh.new()
    rings = []
    for zz in (-depth / 2, depth / 2):
        outer, inner = [], []
        for i in range(segments):
            a = (i / segments) * math.tau
            outer.append(bm.verts.new((r_out * math.cos(a), r_out * math.sin(a), zz)))
            inner.append(bm.verts.new((r_in * math.cos(a), r_in * math.sin(a), zz)))
        rings.append((outer, inner))
    (o0, i0), (o1, i1) = rings
    for i in range(segments):
        j = (i + 1) % segments
        bm.faces.new((o0[i], o0[j], o1[j], o1[i]))   # tread surface
        bm.faces.new((i0[j], i0[i], i1[i], i1[j]))   # inner bore
        bm.faces.new((o0[j], o0[i], i0[i], i0[j]))   # sidewall A
        bm.faces.new((o1[i], o1[j], i1[j], i1[i]))   # sidewall B
    bmesh.ops.transform(bm, matrix=_xform(location, rotation), verts=bm.verts)
    return _link_bmesh(name, bm)


def add_arch(name, r_in, r_out, x0, x1, center_y, center_z, a0=math.radians(8), a1=math.radians(172), segments=14):
    """Wheel-arch fender: a rectangular section swept along an arc around the
    world-X axle line at (center_y, center_z). Angles run from the front
    (-Z) over the top to the rear (+Z)."""
    bm = bmesh.new()
    sections = []
    for s in range(segments + 1):
        a = a0 + (a1 - a0) * s / segments
        dy, dz = math.sin(a), -math.cos(a)
        sections.append([
            bm.verts.new((x0, center_y + dy * r_in, center_z + dz * r_in)),
            bm.verts.new((x1, center_y + dy * r_in, center_z + dz * r_in)),
            bm.verts.new((x1, center_y + dy * r_out, center_z + dz * r_out)),
            bm.verts.new((x0, center_y + dy * r_out, center_z + dz * r_out)),
        ])
    for s in range(segments):
        a, b = sections[s], sections[s + 1]
        for k in range(4):
            m = (k + 1) % 4
            bm.faces.new((a[k], a[m], b[m], b[k]))
    bm.faces.new(sections[0])
    bm.faces.new(list(reversed(sections[-1])))
    return _link_bmesh(name, bm)


def add_torus(name, major, minor, location, rotation=(0, 0, 0), major_segments=24, minor_segments=8):
    bm = bmesh.new()
    grid = []
    for i in range(major_segments):
        u = (i / major_segments) * math.tau
        row = []
        for j in range(minor_segments):
            v = (j / minor_segments) * math.tau
            r = major + minor * math.cos(v)
            row.append(bm.verts.new((r * math.cos(u), r * math.sin(u), minor * math.sin(v))))
        grid.append(row)
    for i in range(major_segments):
        for j in range(minor_segments):
            i2, j2 = (i + 1) % major_segments, (j + 1) % minor_segments
            bm.faces.new((grid[i][j], grid[i2][j], grid[i2][j2], grid[i][j2]))
    bmesh.ops.transform(bm, matrix=_xform(location, rotation), verts=bm.verts)
    return _link_bmesh(name, bm)


def finish(obj, mat, bevel_width=0.0, segments=3, smooth_angle=35):
    """Assign the material and give the part its surface treatment:

    - curved surfaces (cylinder sides, arches) shade smooth, anything sharper
      than `smooth_angle` stays a crisp edge;
    - `bevel_width` > 0 rounds the hard edges with hardened normals, so flat
      panels stay perfectly flat while their edges roll off and catch a thin
      highlight — the single biggest "finished model vs. prototype" cue."""
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.data.shade_smooth()
    obj.data.set_sharp_from_angle(angle=math.radians(smooth_angle))
    if bevel_width > 0:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel_width
        mod.segments = segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(smooth_angle)
        mod.harden_normals = True
        mod.miter_outer = 'MITER_ARC'
        apply_all_modifiers(obj)
    return obj


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
CHASSIS_W = 1.62

AXLE_FRONT_Z = -WHEELBASE / 2
AXLE_REAR_Z = WHEELBASE / 2

# Rotations that remap a local-Z primitive axis onto a world axis
# (parts are authored Y-up / -Z-forward; see build_vehicle()).
AXIS_X = (0, math.radians(90), 0)
AXIS_Y = (math.radians(-90), 0, 0)
AXIS_Z = (0, 0, 0)


# ---------------------------------------------------------------- materials

M = {}


def build_materials():
    # Muted olive palette — sits with the site's sage/olive/cream identity
    # rather than a saturated "toy army green". Satin, not glossy: a light
    # clearcoat only, so paint reads as painted steel without looking wet.
    M['PaintBody'] = new_material('PaintBody', '#565D3A', roughness=0.52, coat=0.22, coat_roughness=0.38)
    M['PaintChassis'] = new_material('PaintChassis', '#3B4128', roughness=0.66, coat=0.08, coat_roughness=0.5)
    # Painted steel hardware (bumpers, cage, pillars): darker, partially
    # metallic so it picks up sky reflections differently from body paint.
    M['PaintedMetal'] = new_material('PaintedMetal', '#34372F', roughness=0.4, metallic=0.55)
    # Bare / worn steel: lug nuts, hinges, latches, mounts.
    M['BareMetal'] = new_material('BareMetal', '#9A978D', roughness=0.3, metallic=1.0)
    M['Rim'] = new_material('Rim', '#4C5236', roughness=0.46, metallic=0.25, coat=0.15, coat_roughness=0.4)
    # Rubber is warm charcoal, never pure black, with low specular — pure
    # black + default specular is what made the old tires read as plastic.
    M['Tire'] = new_material('Tire', '#2E2C29', roughness=0.84, specular=0.28)
    M['TireTread'] = new_material('TireTread', '#27251F', roughness=0.95, specular=0.2)
    M['Glass'] = new_material('Glass', '#1F2C2F', roughness=0.04, alpha=0.38, specular=0.6)
    M['Mirror'] = new_material('Mirror', '#B9BCB8', roughness=0.06, metallic=1.0)
    M['LightLens'] = new_material('LightLens', '#EDE6D1', roughness=0.1, emission='#FFE9B8', emission_strength=0.25)
    M['TailLight'] = new_material('TailLight', '#8A3524', roughness=0.18, emission='#8A3524', emission_strength=0.12)
    M['Canvas'] = new_material('Canvas', '#4D4836', roughness=0.93, specular=0.25)


# ---------------------------------------------------------------- body

def build_chassis():
    parts = []
    y = RIDE_HEIGHT

    # --- chassis / underbody (dark, fills the see-through gap under the body)
    parts.append(finish(add_box('Frame', (1.0, 0.24, 3.0), (0, 0.46, 0.05)), M['PaintChassis'], 0.02, 2))
    for z in (AXLE_FRONT_Z, AXLE_REAR_Z):
        parts.append(finish(add_cylinder(f'Axle{z}', 0.065, TRACK - 0.34, (0, y, z), AXIS_X, 12), M['PaintChassis'], 0.01, 1))
        parts.append(finish(add_cylinder(f'Diff{z}', 0.14, 0.2, (0.12, y, z), AXIS_Z, 14), M['PaintChassis'], 0.03, 2))
    parts.append(finish(add_box('BedBase', (1.2, 0.4, 1.15), (0, 0.78, 1.35)), M['PaintChassis'], 0.02, 2))

    # --- cabin tub (sits between the wheels so the arches read as open wells)
    parts.append(finish(add_box('Tub', (1.56, 0.44, 1.55), (0, 0.8, 0.0)), M['PaintBody'], 0.045, 3))
    # rock sliders along the tub sills
    for sx in (-1, 1):
        parts.append(finish(add_box(f'Slider{sx}', (0.09, 0.08, 1.3), (sx * 0.81, 0.6, 0.0)), M['PaintedMetal'], 0.02, 2))

    # --- hood + nose
    hood_rot = (math.radians(-4), 0, 0)
    parts.append(finish(add_box('Hood', (1.39, 0.34, 1.35), (0, y + 0.66, AXLE_FRONT_Z + 0.25), hood_rot), M['PaintBody'], 0.045, 3))
    for sx in (-1, 1):
        parts.append(finish(add_box(f'HoodLatch{sx}', (0.03, 0.09, 0.05), (sx * 0.705, y + 0.64, -1.35)), M['BareMetal'], 0.008, 1))
    parts.append(finish(add_box('GrillePanel', (1.34, 0.4, 0.06), (0, 0.92, -1.6)), M['PaintedMetal'], 0.015, 2))
    for i in range(7):
        sx = -0.33 + i * (0.66 / 6)
        parts.append(finish(add_box(f'Slat{i}', (0.045, 0.32, 0.05), (sx, 0.92, -1.64)), M['PaintBody'], 0.012, 2))
    for sx in (-1, 1):
        # bezel ring + lens; lens sits proud so it gets its own rim highlight
        parts.append(finish(add_tube(f'Bezel{sx}', 0.115, 0.08, 0.06, (sx * 0.52, 0.94, -1.645), AXIS_Z, 20), M['PaintedMetal'], 0.012, 2))
        parts.append(finish(add_cylinder(f'Lens{sx}', 0.085, 0.05, (sx * 0.52, 0.94, -1.64), AXIS_Z, 20), M['LightLens'], 0.015, 2))

    # --- bumpers (box-section steel, the military norm)
    for tag, z in (('Front', -1.78), ('Rear', 1.97)):
        parts.append(finish(add_box(f'Bumper{tag}', (1.62, 0.16, 0.14), (0, 0.62, z)), M['PaintedMetal'], 0.025, 3))
    for sx in (-1, 1):
        parts.append(finish(add_box(f'BumperBracket{sx}', (0.1, 0.1, 0.3), (sx * 0.4, 0.56, -1.6)), M['PaintChassis'], 0.01, 1))
        # tow shackles on the front bumper
        parts.append(finish(add_torus(f'Shackle{sx}', 0.045, 0.014, (sx * 0.52, 0.57, -1.86), AXIS_X, 14, 6), M['BareMetal']))

    # --- wheel-arch fenders (replace the old box flares)
    for sx, sz, tag in (
        (-1, AXLE_FRONT_Z, 'FL'), (1, AXLE_FRONT_Z, 'FR'),
        (-1, AXLE_REAR_Z, 'RL'), (1, AXLE_REAR_Z, 'RR'),
    ):
        x_in, x_out = 0.56, 0.95
        x0, x1 = (sx * x_in, sx * x_out) if sx > 0 else (sx * x_out, sx * x_in)
        arch = add_arch(f'Arch{tag}', WHEEL_R + 0.1, WHEEL_R + 0.18, x0, x1, y, sz)
        parts.append(finish(arch, M['PaintChassis'], 0.025, 2, smooth_angle=30))

    # --- cargo bed
    parts.append(finish(add_box('BedFloor', (1.49, 0.06, 1.15), (0, 1.0, AXLE_REAR_Z + 0.15)), M['PaintChassis'], 0.01, 1))
    for sx in (-1, 1):
        parts.append(finish(add_box(f'BedWall{sx}', (0.06, 0.4, 1.15), (sx * 0.745, 1.2, AXLE_REAR_Z + 0.15)), M['PaintBody'], 0.018, 2))
    parts.append(finish(add_box('BedFront', (1.49, 0.4, 0.06), (0, 1.2, AXLE_REAR_Z - 0.4)), M['PaintBody'], 0.018, 2))
    parts.append(finish(add_box('Tailgate', (1.49, 0.4, 0.06), (0, 1.2, AXLE_REAR_Z + 0.72)), M['PaintBody'], 0.018, 2))
    for sx in (-1, 1):
        parts.append(finish(add_box(f'TailgateLatch{sx}', (0.07, 0.05, 0.03), (sx * 0.66, 1.34, AXLE_REAR_Z + 0.765)), M['BareMetal'], 0.008, 1))
        parts.append(finish(add_cylinder(f'TailgateHinge{sx}', 0.022, 0.16, (sx * 0.5, 1.02, AXLE_REAR_Z + 0.755), AXIS_X, 10), M['BareMetal'], 0.006, 1))
        parts.append(finish(add_box(f'TailLightHousing{sx}', (0.16, 0.11, 0.025), (sx * 0.6, 1.16, AXLE_REAR_Z + 0.76)), M['PaintedMetal'], 0.008, 1))
        parts.append(finish(add_box(f'TailLight{sx}', (0.12, 0.075, 0.02), (sx * 0.6, 1.16, AXLE_REAR_Z + 0.775)), M['TailLight'], 0.006, 1))
        # mud flaps behind the rear wheels
        parts.append(finish(add_box(f'MudFlap{sx}', (0.3, 0.34, 0.02), (sx * TRACK / 2, 0.36, AXLE_REAR_Z + 0.5)), M['Tire'], 0.006, 1))

    # jerrycan strapped in the front-left corner of the bed
    parts.append(finish(add_box('Jerrycan', (0.2, 0.44, 0.34), (-0.5, 1.25, AXLE_REAR_Z - 0.18)), M['PaintChassis'], 0.03, 3))
    parts.append(finish(add_box('JerrycanHandle', (0.05, 0.05, 0.2), (-0.5, 1.5, AXLE_REAR_Z - 0.18)), M['PaintChassis'], 0.01, 1))
    parts.append(finish(add_box('BedStrap', (0.24, 0.035, 0.37), (-0.5, 1.3, AXLE_REAR_Z - 0.18)), M['Canvas'], 0.005, 1))

    # --- windshield: frame + glass, leaning back 12°
    ws_tilt = math.radians(12)
    ws_base_y, ws_base_z, ws_h = 1.02, -0.3, 0.64

    def ws_point(h):
        return (ws_base_y + h * math.cos(ws_tilt), ws_base_z + h * math.sin(ws_tilt))

    ws_rot = (ws_tilt, 0, 0)
    py, pz = ws_point(ws_h / 2)
    for sx in (-1, 1):
        parts.append(finish(add_box(f'Pillar{sx}', (0.055, ws_h, 0.055), (sx * 0.68, py, pz), ws_rot), M['PaintedMetal'], 0.012, 2))
    for tag, h in (('Top', ws_h), ('Bottom', 0.03)):
        by, bz = ws_point(h)
        parts.append(finish(add_box(f'Windshield{tag}', (1.415, 0.055, 0.055), (0, by, bz), ws_rot), M['PaintedMetal'], 0.012, 2))
    parts.append(finish(add_box('Windshield', (1.31, ws_h - 0.06, 0.012), (0, py, pz), ws_rot), M['Glass']))

    # --- interior: seats + steering wheel (seen from the chase camera above)
    for sx in (-1, 1):
        parts.append(finish(add_box(f'SeatCushion{sx}', (0.5, 0.12, 0.46), (sx * 0.36, 1.08, 0.38)), M['Canvas'], 0.04, 3))
        parts.append(finish(add_box(f'SeatBack{sx}', (0.5, 0.5, 0.11), (sx * 0.36, 1.36, 0.66), (math.radians(8), 0, 0)), M['Canvas'], 0.04, 3))
    wheel_tilt = (math.radians(-90 + 55), 0, 0)
    parts.append(finish(add_torus('SteeringWheel', 0.16, 0.017, (-0.36, 1.36, -0.08), wheel_tilt, 24, 6), M['Tire']))
    parts.append(finish(add_cylinder('SteeringColumn', 0.025, 0.36, (-0.36, 1.24, -0.2), (math.radians(-35), 0, 0), 8), M['PaintedMetal']))

    # --- roll cage (painted tube)
    cage_x = CHASSIS_W * 0.42
    cage_z = (-0.05, AXLE_REAR_Z - 0.05)
    post_top_y = y + 1.62
    post_base_y = 1.0
    for i, (px, pz) in enumerate([(-cage_x, cage_z[0]), (cage_x, cage_z[0]), (-cage_x, cage_z[1]), (cage_x, cage_z[1])]):
        parts.append(finish(add_cylinder(f'CagePost{i}', 0.035, post_top_y - post_base_y, (px, (post_top_y + post_base_y) / 2, pz), AXIS_Y, 12), M['PaintedMetal'], 0.008, 1))
    for tag, z in (('Front', cage_z[0]), ('Rear', cage_z[1])):
        parts.append(finish(add_cylinder(f'CageTop{tag}', 0.032, cage_x * 2 + 0.07, (0, post_top_y, z), AXIS_X, 12), M['PaintedMetal'], 0.008, 1))
    for sx in (-1, 1):
        parts.append(finish(add_cylinder(f'CageSide{sx}', 0.032, cage_z[1] - cage_z[0] + 0.07, (sx * cage_x, post_top_y, sum(cage_z) / 2), AXIS_Z, 12), M['PaintedMetal'], 0.008, 1))

    # --- side mirrors (painted housing + real mirror face toward the rear)
    for sx in (-1, 1):
        parts.append(finish(add_box(f'MirrorStalk{sx}', (0.18, 0.03, 0.03), (sx * 0.8, 1.2, -0.2)), M['PaintedMetal'], 0.006, 1))
        parts.append(finish(add_box(f'MirrorHead{sx}', (0.06, 0.13, 0.17), (sx * 0.9, 1.25, -0.2), (0, 0, 0)), M['PaintedMetal'], 0.015, 2))
        parts.append(finish(add_box(f'MirrorGlass{sx}', (0.045, 0.105, 0.012), (sx * 0.9, 1.25, -0.112)), M['Mirror']))

    # --- spare wheel on the tailgate (same construction as the road wheels)
    parts.append(finish(add_box('SpareBracket', (0.28, 0.28, 0.1), (0, 1.3, AXLE_REAR_Z + 0.8)), M['PaintedMetal'], 0.015, 2))
    spare_parts = wheel_parts('Spare', (0, 1.3, AXLE_REAR_Z + 0.97), axis_matrix=Matrix.Rotation(math.radians(90), 4, 'Y'))
    parts.extend(spare_parts)

    # --- antenna (bare-metal mount + dark whip), rooted on the bed wall top
    ant_base = (cage_x + 0.06, 1.42, AXLE_REAR_Z + 0.35)
    parts.append(finish(add_cylinder('AntennaMount', 0.035, 0.07, ant_base, AXIS_Y, 12), M['BareMetal'], 0.008, 1))
    whip_len = 1.0
    whip_rot = (math.radians(-90 + 10), 0, math.radians(-5))
    whip_dir = _xform((0, 0, 0), whip_rot) @ Vector((0, 0, 1))
    whip_center = Vector(ant_base) + whip_dir * (whip_len / 2 + 0.03)
    parts.append(finish(add_cylinder('Antenna', 0.009, whip_len, tuple(whip_center), whip_rot, 6, radius_top=0.004), M['PaintedMetal']))

    return join(parts, 'Body')


# ---------------------------------------------------------------- wheels

def wheel_parts(tag, center, axis_matrix=None):
    """All pieces of one wheel, built around the X spin axis at `center`.
    `axis_matrix` (about the wheel center) re-orients it, e.g. for the spare."""
    cx, cy, cz = center
    parts = []

    def place(obj):
        if axis_matrix is not None:
            c = Vector(center)
            obj.data.transform(Matrix.Translation(c) @ axis_matrix @ Matrix.Translation(-c))
            obj.data.update()
        return obj

    # Tire carcass: a hollow ring with a well-rounded shoulder, so the
    # sidewall rolls into the tread instead of meeting it at a hard 90°.
    carcass_r = WHEEL_R * 0.93
    parts.append(place(finish(add_tube(f'Tire_{tag}', carcass_r, WHEEL_R * 0.6, WHEEL_W, center, AXIS_X, 36), M['Tire'], 0.06, 4, smooth_angle=30)))
    # Sidewall bead ring — a slight step at the rim edge, catches a rim-light.
    parts.append(place(finish(add_tube(f'Bead_{tag}', WHEEL_R * 0.66, WHEEL_R * 0.58, WHEEL_W * 0.94, center, AXIS_X, 36), M['Tire'], 0.012, 2, smooth_angle=30)))

    # Recessed rim dish + raised hub + bare-metal lug nuts.
    parts.append(place(finish(add_cylinder(f'Rim_{tag}', WHEEL_R * 0.6, WHEEL_W * 0.72, center, AXIS_X, 28), M['Rim'], 0.015, 2)))
    parts.append(place(finish(add_tube(f'RimLip_{tag}', WHEEL_R * 0.6, WHEEL_R * 0.52, WHEEL_W * 0.86, center, AXIS_X, 28), M['Rim'], 0.01, 2)))
    parts.append(place(finish(add_cylinder(f'Hub_{tag}', WHEEL_R * 0.2, WHEEL_W * 0.9, center, AXIS_X, 16), M['PaintedMetal'], 0.015, 2)))
    parts.append(place(finish(add_cylinder(f'HubCap_{tag}', WHEEL_R * 0.09, WHEEL_W * 0.98, center, AXIS_X, 12), M['BareMetal'], 0.008, 1)))
    lug_ring = WHEEL_R * 0.3
    for i in range(6):
        a = (i / 6) * math.tau
        ly, lz = cy + math.cos(a) * lug_ring, cz + math.sin(a) * lug_ring
        parts.append(place(finish(add_cylinder(f'Lug_{tag}_{i}', 0.017, WHEEL_W * 0.8, (cx, ly, lz), AXIS_X, 6), M['BareMetal'], 0.004, 1)))

    # Tread: two staggered rows of chevron lugs whose outer face lands
    # exactly on WHEEL_R (so ground contact matches the physics radius).
    lugs_per_row = 18
    lug_depth = WHEEL_R - carcass_r + 0.012
    lug_center_r = WHEEL_R - lug_depth / 2
    for row, (x_off, yaw) in enumerate(((-WHEEL_W * 0.23, 14), (WHEEL_W * 0.23, -14))):
        for i in range(lugs_per_row):
            ang = ((i + 0.5 * row) / lugs_per_row) * math.tau
            spin = Matrix.Rotation(ang, 4, 'X')
            radial = spin @ Vector((0, -1, 0))
            pos = Vector((cx + x_off, cy, cz)) + radial * lug_center_r
            mat = Matrix.Translation(pos) @ spin @ Matrix.Rotation(math.radians(yaw), 4, 'Y')
            lug = add_box(f'Tread_{tag}_{row}_{i}', (WHEEL_W * 0.44, lug_depth, 0.075), None, matrix=mat)
            parts.append(place(finish(lug, M['TireTread'], 0.008, 1)))
    return parts


def build_wheel(tag, x, z):
    wheel = join(wheel_parts(tag, (x, WHEEL_R, z)), f'Wheel_{tag}')

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
    try:
        scene.view_settings.view_transform = 'AgX'
    except TypeError:
        pass
    scene.world = bpy.data.worlds.new('World')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (*srgb('#DCD6C8'), 1.0)
        bg.inputs[1].default_value = 1.0

    sun_data = bpy.data.lights.new('Sun', type='SUN')
    sun_data.energy = 3.2
    sun_data.angle = math.radians(3)
    sun = bpy.data.objects.new('Sun', sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))

    fill_data = bpy.data.lights.new('Fill', type='SUN')
    fill_data.energy = 0.6
    fill = bpy.data.objects.new('Fill', fill_data)
    bpy.context.collection.objects.link(fill)
    fill.rotation_euler = (math.radians(60), 0, math.radians(-140))

    ground = add_box('Ground', (14, 14, 0.05), (0, 0, -0.025))
    ground.data.materials.append(new_material('GroundPreview', '#B9A988', roughness=0.95))

    cam_data = bpy.data.cameras.new('Cam')
    cam_data.lens = 42
    cam = bpy.data.objects.new('Cam', cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    # Tuples are (X=side, Y=depth, Z=height) in Blender's real convention —
    # the root's +90° correction maps the model's forward (-Z authored) to
    # Blender +Y, so "front" cameras sit at +Y and "rear" ones at -Y.
    # 'chase' matches the in-lab camera (Vehicle.tsx CAM_DISTANCE/CAM_HEIGHT).
    angles = {
        'front34': ((4.2, 5.6, 1.9), (0, 0, 0.9)),
        'side': ((5.8, 0.2, 1.5), (0, 0, 0.9)),
        'rear34': ((4.0, -5.4, 2.1), (0, 0, 0.9)),
        'chase': ((0.9, -6.4, 2.6), (0, 3.2, 1.1)),
    }
    for name, (pos, target) in angles.items():
        cam.location = pos
        direction = Vector(target) - Vector(pos)
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
        export_normals=True,
        export_materials='EXPORT',
        export_animations=False,
    )
    print(f'WROTE_GLB:{out_glb}')

    preview_dir = os.path.join(project_root, 'design', 'docs', 'trafficability-drive-previews')
    render_preview(preview_dir)
    print(f'WROTE_PREVIEWS:{preview_dir}')


main()
