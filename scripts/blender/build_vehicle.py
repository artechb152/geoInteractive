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
  - Root empty "Vehicle" at the origin (ground contact plane, y=0), identity
    transform — every child node lives in the Y-up frame described here.
  - Child mesh "Body" — everything except the four wheels.
  - Child meshes "Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR" — each a
    single mesh whose local origin sits exactly on the wheel's rotation
    axis, so the controller can spin (rotate.x) and steer (rotate.y) them
    independently at runtime.
  - Forward driving direction is -Z. Up is +Y (glTF/Three.js convention).
  - Known dimensions (must match TrafficabilityDrive vehicle constants):
      wheelbase 2.4m, track width 1.55m, wheel radius 0.38m,
      wheel width 0.28m, chassis ride height (axle center to ground) 0.38m.
  - Clearances the body must respect (vehicleController.ts): per-wheel
    suspension travel is ±0.14m and the front wheels steer ±0.5 rad, so
    every arch keeps ≥0.06m over a fully compressed wheel and nothing
    solid sits inboard of a steered front tire.

Material names are part of the contract too — Vehicle.tsx tunes per-material
reflection strength by name (see vehicleMaterials.ts).

Style: a believable light military utility 4x4 (open-top, generic — no
real make), proportions first. The body sides are one plane from the front
fender to the tail with thin body-colour lips around softened-trapezoid wheel
openings; a crowned hood sits a step above flat front fenders; the windshield
is raked ~24° on a full-width cowl; a ~50 mm sport cage stays inside the body
plane. Panels carry subtle curvature (crowned hood/cowl, barrel + tumblehome
on the sides) instead of dead-flat boxes, edges get small pressed-steel
radii (5-15 mm), and 16" steel wheels wear a tall-sidewall all-terrain tire.
"""

import bpy
import bmesh
import math
import os
from mathutils import Euler, Matrix, Vector

# ---------------------------------------------------------------- helpers

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
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


def _link_mesh(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def _xform(location=(0, 0, 0), rotation=(0, 0, 0)):
    """Object-space placement matrix. rotation is an XYZ Euler in radians."""
    return Matrix.Translation(Vector(location)) @ Euler(rotation, 'XYZ').to_matrix().to_4x4()


IDENTITY = Matrix.Identity(4)


def add_box(name, size, location, rotation=(0, 0, 0), matrix=None, pre=IDENTITY):
    """`pre` is applied last — used to place whole sub-assemblies (a wheel)
    with a mirror/rotation; normals are recalculated after it."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    local = matrix if matrix is not None else _xform(location, rotation)
    bmesh.ops.transform(bm, matrix=pre @ local, verts=bm.verts)
    return _link_bmesh(name, bm)


def add_cylinder(name, radius, depth, location, rotation=(0, 0, 0), segments=16, radius_top=None, pre=IDENTITY):
    """Cylinder along its local Z axis (same convention as primitive_cylinder_add)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                          radius1=radius, radius2=radius if radius_top is None else radius_top, depth=depth)
    bmesh.ops.transform(bm, matrix=pre @ _xform(location, rotation), verts=bm.verts)
    return _link_bmesh(name, bm)


def add_tube(name, r_out, r_in, depth, location, rotation=(0, 0, 0), segments=32):
    """Hollow ring along local Z — a headlight bezel etc."""
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
        bm.faces.new((o0[i], o0[j], o1[j], o1[i]))
        bm.faces.new((i0[j], i0[i], i1[i], i1[j]))
        bm.faces.new((o0[j], o0[i], i0[i], i0[j]))
        bm.faces.new((o1[i], o1[j], i1[j], i1[i]))
    bmesh.ops.transform(bm, matrix=_xform(location, rotation), verts=bm.verts)
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


def add_revolve(name, profile, segments, matrix=IDENTITY, closed=False):
    """Lathe a (x, r) profile around the local X axis (a wheel's spin axis).
    Points with r == 0 become single pole vertices, so a profile that starts
    and ends on the axis yields a closed solid; `closed` joins the last point
    back to the first (a torus-like section, e.g. the tire carcass)."""
    bm = bmesh.new()
    n = len(profile)
    columns = []
    for (x, r) in profile:
        if r < 1e-6:
            pole = bm.verts.new((x, 0.0, 0.0))
            columns.append([pole] * segments)
        else:
            columns.append([bm.verts.new((x, r * math.cos(i / segments * math.tau), r * math.sin(i / segments * math.tau)))
                            for i in range(segments)])
    spans = range(n) if closed else range(n - 1)
    for k in spans:
        a, b = columns[k], columns[(k + 1) % n]
        for i in range(segments):
            j = (i + 1) % segments
            quad = [a[i], a[j], b[j], b[i]]
            unique = []
            for v in quad:
                if v not in unique:
                    unique.append(v)
            if len(unique) >= 3:
                bm.faces.new(unique)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return _link_bmesh(name, bm)


def add_extrude_profile(name, pts_zy, x0, x1):
    """Extrude a closed side-view polygon (z, y) across x0..x1 — the way body
    panels, fenders and flares get real silhouettes instead of box outlines.
    Concave outlines are fine (glTF export triangulates n-gons correctly)."""
    pts = dedupe(pts_zy, closed=True)
    bm = bmesh.new()
    a = [bm.verts.new((x0, p[1], p[0])) for p in pts]
    b = [bm.verts.new((x1, p[1], p[0])) for p in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    return _link_bmesh(name, bm)


def add_loft(name, sections):
    """Loft top-chamfered cross-sections along Z.
    Each section: (z, half_width_bottom, half_width_top, y_bottom, y_top, chamfer)."""
    bm = bmesh.new()
    rings = []
    for (z, hwb, hwt, yb, yt, c) in sections:
        ring = [(-hwb, yb), (hwb, yb), (hwt, yt - c), (hwt - c, yt), (-(hwt - c), yt), (-hwt, yt - c)]
        rings.append([bm.verts.new((x, y, z)) for (x, y) in ring])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(6):
            m = (k + 1) % 6
            bm.faces.new((r0[k], r0[m], r1[m], r1[k]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    return _link_bmesh(name, bm)


def add_frame(name, width, height, border, radius, depth, matrix):
    """Rounded-rectangle picture frame in the local XY plane (bottom edge on
    y=0, centred on x), `depth` thick along Z — the windshield frame."""
    def rrect(hw, h0, h1, r, segs=4):
        pts = []
        corners = ((hw - r, h1 - r, 0), (-hw + r, h1 - r, 90), (-hw + r, h0 + r, 180), (hw - r, h0 + r, 270))
        for cx, cy, start in corners:
            for s in range(segs + 1):
                a = math.radians(start + 90 * s / segs)
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        return pts

    outer = rrect(width / 2, 0.0, height, radius)
    inner = rrect(width / 2 - border, border, height - border, max(radius - border * 0.6, 0.012))
    bm = bmesh.new()
    loops = {}
    for key, pts in (('o', outer), ('i', inner)):
        for zz in (-depth / 2, depth / 2):
            loops[(key, zz)] = [bm.verts.new((x, y, zz)) for (x, y) in pts]
    n = len(outer)
    of, ob = loops[('o', -depth / 2)], loops[('o', depth / 2)]
    inf, inb = loops[('i', -depth / 2)], loops[('i', depth / 2)]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((of[i], of[j], inf[j], inf[i]))
        bm.faces.new((ob[j], ob[i], inb[i], inb[j]))
        bm.faces.new((of[j], of[i], ob[i], ob[j]))
        bm.faces.new((inf[i], inf[j], inb[j], inb[i]))
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return _link_bmesh(name, bm)


def add_pipe(name, pts, radius, fillet=0.0, fillet_segs=5, bevel_res=2):
    """Round tube swept along a 3D polyline; `fillet` bends each corner with
    that radius — the cage, beltline roll, snorkel, springs."""
    path = fillet_polyline(pts, fillet, fillet_segs) if fillet > 0 else [Vector(p) for p in pts]
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_res
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(path) - 1)
    for point, v in zip(spline.points, path):
        point.co = (v.x, v.y, v.z, 1.0)
    tmp = bpy.data.objects.new(name + '_curve', curve)
    bpy.context.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(depsgraph))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(curve)
    return _link_mesh(name, mesh)


# ---------------------------------------------------------------- 2D path helpers (side profiles are (z, y))

def dedupe(pts, closed=False, eps=1e-5):
    out = []
    for p in pts:
        v = Vector(p)
        if not out or (v - out[-1]).length > eps:
            out.append(v)
    if closed and len(out) > 2 and (out[0] - out[-1]).length <= eps:
        out.pop()
    return out


def fillet_polyline(pts, radius, segs=4):
    """Round every interior corner of an open polyline (2D or 3D) with a
    quadratic-Bezier fillet trimmed `radius` back from the corner."""
    P = [Vector(p) for p in pts]
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        d1, d2 = a - b, c - b
        r = min(radius, d1.length * 0.45, d2.length * 0.45)
        p1 = b + d1.normalized() * r
        p2 = b + d2.normalized() * r
        for s in range(segs + 1):
            t = s / segs
            out.append((1 - t) ** 2 * p1 + 2 * (1 - t) * t * b + t ** 2 * p2)
    out.append(P[-1])
    return dedupe(out)


def arc(center, r, a0, a1, segs):
    cz, cy = center
    return [(cz + r * math.cos(a0 + (a1 - a0) * i / segs), cy + r * math.sin(a0 + (a1 - a0) * i / segs))
            for i in range(segs + 1)]


def offset_path(pts, d, away_from):
    """Offset an open 2D polyline by `d` along its normal pointing away from
    `away_from` (negative d moves toward it). Mitred at the joints."""
    P = [Vector(p) for p in pts]
    center = Vector(away_from)
    out = []
    for i, p in enumerate(P):
        if i == 0:
            t = P[1] - P[0]
        elif i == len(P) - 1:
            t = P[-1] - P[-2]
        else:
            t = (P[i] - P[i - 1]).normalized() + (P[i + 1] - P[i]).normalized()
        t.normalize()
        nrm = Vector((-t.y, t.x))
        if nrm.dot(p - center) < 0:
            nrm = -nrm
        scale = 1.0
        if 0 < i < len(P) - 1:
            seg = (P[i + 1] - P[i]).normalized()
            scale = 1.0 / max(abs(Vector((-seg.y, seg.x)).dot(nrm)), 0.5)
        out.append(p + nrm * d * scale)
    return out


def arch_path(cz, half_bottom, half_top, y_bottom, y_top, fillet=0.13):
    """Trapezoid wheel opening (front→over→rear) with rounded top corners —
    the flat-topped, angled military arch instead of a plain semicircle."""
    pts = [(cz - half_bottom, y_bottom), (cz - half_top, y_top), (cz + half_top, y_top), (cz + half_bottom, y_bottom)]
    return [tuple(v) for v in fillet_polyline(pts, fillet, 6)]


def band(path, d_in, d_out, center):
    """Closed polygon between two offsets of an arch path (a flare / wheelhouse)."""
    inner = offset_path(path, d_in, center)
    outer = offset_path(path, d_out, center)
    return [tuple(v) for v in inner] + [tuple(v) for v in reversed(outer)]


def span(sx, a, b):
    """x0, x1 for a part that sits between |x| = a..b on side sx (±1)."""
    return (sx * a, sx * b) if sx > 0 else (sx * b, sx * a)


# ---------------------------------------------------------------- surface finishing

def finish(obj, mat, bevel_width=0.0, segments=3, smooth_angle=35):
    """Assign the material and give the part its surface treatment:

    - curved surfaces (cylinder sides, arches) shade smooth, anything sharper
      than `smooth_angle` stays a crisp edge;
    - `bevel_width` > 0 rounds the hard edges with hardened normals, so flat
      panels stay flat while their edges roll off and catch a thin highlight.
      Keep it close to real pressed-steel radii (5-15 mm): wide bevels are
      what make a model read as a moulded toy."""
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

AXLE_FRONT_Z = -WHEELBASE / 2
AXLE_REAR_Z = WHEELBASE / 2

# Body layout (y up, z toward the rear). The body sides are ONE plane from
# the front fender to the tail (x = ±BODY_HW); only thin flare lips stand
# proud of it to cover the tires. One continuous beltline runs cowl → tail.
BODY_HW = 0.87          # outer half-width of fenders, cowl and tub
WALL_T = 0.035          # sheet-metal tub wall
BELT_Y = 1.18           # beltline (top of tub + tailgate)
SILL_Y = 0.56           # bottom of the body sides
DOOR_Y = 0.94           # door-opening sill
COWL_Z = (-0.64, -0.30)
FRONT_Z = -1.745        # front face of fenders / grille
TAIL_Z = 1.86           # rear face of the tub
FENDER_TOP = 1.06       # flat front fender shelf, a step below the hood
FENDER_IN = 0.56        # inboard edge of the front fender shelf
# Wheel openings: softened trapezoids clearing a fully compressed (+0.14)
# wheel — and, at the front, one steered to ±0.5 rad — by ≥0.06 m.
ARCH = dict(half_bottom=0.47, half_top=0.33, y_bottom=SILL_Y, y_top=0.97)
FLARE = dict(d_in=-0.008, d_out=0.05, x_in=0.845, x_out=0.935)

# Rotations that remap a local-Z primitive axis onto a world axis
# (parts are authored Y-up / -Z-forward; see build_vehicle()).
AXIS_X = (0, math.radians(90), 0)
AXIS_Y = (math.radians(-90), 0, 0)
AXIS_Z = (0, 0, 0)

SIDES = (-1, 1)


# ---------------------------------------------------------------- panel curvature

def side_bow(y):
    """Outward offset (m) of the body sides at height y: a slight barrel
    through the middle of the panel, and tumblehome tucking the top in."""
    t = min(max((y - SILL_Y) / (BELT_Y + 0.02 - SILL_Y), 0.0), 1.0)
    return 0.010 * math.sin(math.pi * t) - 0.018 * max(0.0, (t - 0.6) / 0.4) ** 2


def shape_panel(obj, step=0.05):
    """Bend a flat side panel: slice it into horizontal bands (so there are
    vertices to bend) and push every vertex outboard by side_bow(y), weighted
    by how close it sits to the body side. Everything that meets at the side
    plane (walls, fenders, cowl, rear panel, flares, belt rail) goes through
    this, so the parts stay flush after bending. step=None skips slicing
    (already-dense meshes like swept tubes)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    if step:
        ys = [v.co.y for v in bm.verts]
        y = math.floor(min(ys) / step) * step + step
        while y < max(ys) - 1e-4:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                   plane_co=(0, y, 0), plane_no=(0, 1, 0))
            y += step
    for v in bm.verts:
        w = min(max((abs(v.co.x) - 0.5) / (BODY_HW - 0.5), 0.0), 1.0)
        w = w * w * (3 - 2 * w)
        v.co.x += math.copysign(side_bow(v.co.y) * w, v.co.x)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def add_crown_loft(name, sections, top_segs=6, shoulder_segs=3):
    """Loft crowned cross-sections along Z: a domed top rolling over round
    shoulders into vertical sides — pressed sheet metal (hood, cowl) rather
    than a chamfered box. Each section:
    (z, half_width, y_bottom, y_top, crown, shoulder_radius)."""
    bm = bmesh.new()
    rings = []
    for (z, hw, yb, yt, crown, r) in sections:
        flat = hw - r
        ys = yt - crown - r
        pts = [(-hw, yb), (hw, yb), (hw, ys)]
        for k in range(1, shoulder_segs):
            a = (math.pi / 2) * k / shoulder_segs
            pts.append((flat + r * math.cos(a), ys + r * math.sin(a)))
        for k in range(top_segs + 1):
            x = flat - 2 * flat * k / top_segs
            pts.append((x, yt - crown * (x / flat) ** 2))
        for k in range(1, shoulder_segs + 1):
            a = math.pi / 2 + (math.pi / 2) * k / shoulder_segs
            pts.append((-flat + r * math.cos(a), ys + r * math.sin(a)))
        rings.append([bm.verts.new((x, y, z)) for (x, y) in pts])
    n = len(rings[0])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(n):
            m = (k + 1) % n
            bm.faces.new((r0[k], r0[m], r1[m], r1[k]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    return _link_bmesh(name, bm)


# ---------------------------------------------------------------- materials

M = {}


def build_materials():
    # Military finishes are low-sheen: satin-matte paint with only a faint
    # coat, never glossy. Each surface family gets its own value/roughness so
    # paint, painted steel, bare steel, rubber and glass read apart without
    # any of them being "clean plastic". vehicleMaterials.ts adds subtle
    # roughness/albedo variation and dust at runtime (no textures).
    M['PaintBody'] = new_material('PaintBody', '#585D3E', roughness=0.6, coat=0.1, coat_roughness=0.5)
    M['PaintChassis'] = new_material('PaintChassis', '#3A3F2A', roughness=0.74)
    # Painted steel hardware (bumpers, cage, frame): paint is a dielectric,
    # so only a hint of metalness — a high value made it read as chrome-toy.
    M['PaintedMetal'] = new_material('PaintedMetal', '#3B3E33', roughness=0.55, metallic=0.1)
    # Bare / worn steel: lug nuts, hinges, latches, shackles.
    M['BareMetal'] = new_material('BareMetal', '#8F8C84', roughness=0.42, metallic=1.0)
    # Pressed-steel wheels in a slightly darker, flatter olive than the body.
    M['Rim'] = new_material('Rim', '#4B503A', roughness=0.62, metallic=0.05)
    # Rubber is warm charcoal, never pure black, with low specular.
    M['Tire'] = new_material('Tire', '#2C2B28', roughness=0.88, specular=0.25)
    M['TireTread'] = new_material('TireTread', '#2A2825', roughness=0.94, specular=0.2)
    M['Glass'] = new_material('Glass', '#1F2B2E', roughness=0.04, alpha=0.3, specular=0.5)
    M['Mirror'] = new_material('Mirror', '#A9ACA8', roughness=0.1, metallic=1.0)
    # Lamps are off in daylight — a faint emission only keeps lenses from
    # going grey in shade; a visible glow read as toy LEDs.
    M['LightLens'] = new_material('LightLens', '#E3DDC8', roughness=0.12, emission='#FFE9B8', emission_strength=0.06)
    M['TailLight'] = new_material('TailLight', '#7E3222', roughness=0.22, emission='#7E3222', emission_strength=0.04)
    M['Canvas'] = new_material('Canvas', '#4D4836', roughness=0.93, specular=0.25)


# ---------------------------------------------------------------- body: underbody + running gear

def build_underbody():
    parts = []
    y = RIDE_HEIGHT

    # Ladder frame: two rails kept inboard of a fully steered front tire.
    for sx in SIDES:
        parts.append(finish(add_box(f'Rail{sx}', (0.08, 0.13, 3.66), (sx * 0.36, 0.625, 0.05)), M['PaintChassis'], 0.006, 1))
    for z in (-1.72, AXLE_FRONT_Z + 0.42, 0.3, AXLE_REAR_Z + 0.5):
        parts.append(finish(add_box(f'Cross{z}', (0.8, 0.09, 0.1), (0, 0.63, z)), M['PaintChassis'], 0.006, 1))

    # Floor pans close the see-through gap under the tub.
    parts.append(finish(add_box('PanCenter', (1.08, 0.08, 2.55), (0, 0.63, 0.575)), M['PaintChassis'], 0.006, 1))
    for sx in SIDES:
        parts.append(finish(add_box(f'PanSide{sx}', (0.3, 0.06, 1.3), (sx * 0.685, 0.6, 0.0)), M['PaintChassis'], 0.006, 1))

    # Engine block + inner fender aprons, seen through the front wheel wells.
    # Aprons sit inboard of x=0.445: a compressed, fully steered front tire
    # reaches x≈0.475 at their lower edge.
    parts.append(finish(add_box('Engine', (0.72, 0.36, 0.95), (0, 0.76, -1.13)), M['PaintChassis'], 0.02, 2))
    for sx in SIDES:
        parts.append(finish(add_box(f'Apron{sx}', (0.03, 0.4, 1.0), (sx * 0.43, 0.82, -1.14)), M['PaintChassis'], 0.006, 1))

    # Solid axles with offset differentials, a driveshaft, coil springs and
    # shocks — the running gear that reads from low camera angles.
    for tag, z in (('F', AXLE_FRONT_Z), ('R', AXLE_REAR_Z)):
        parts.append(finish(add_cylinder(f'Axle{tag}', 0.05, 1.1, (0, y, z), AXIS_X, 12), M['PaintChassis'], 0.006, 1))
        parts.append(finish(add_cylinder(f'Diff{tag}', 0.13, 0.19, (0.1, y, z), AXIS_Z, 18), M['PaintChassis'], 0.02, 2))
        parts.append(finish(add_cylinder(f'DiffCover{tag}', 0.095, 0.035, (0.1, y, z + (0.11 if tag == 'R' else -0.11)), AXIS_Z, 18), M['PaintedMetal'], 0.008, 2))
        for sx in SIDES:
            coil = []
            turns, per_turn = 3.5, 10
            steps = int(turns * per_turn)
            for i in range(steps + 1):
                a = i / per_turn * math.tau
                coil.append((sx * 0.38 + 0.05 * math.cos(a), 0.45 + 0.13 * i / steps, z + 0.05 * math.sin(a)))
            parts.append(finish(add_pipe(f'Spring{tag}{sx}', coil, 0.01, bevel_res=1), M['PaintedMetal'], smooth_angle=60))
            shock_x = sx * (0.28 if tag == 'F' else 0.5)
            shock_z = z + (-0.16 if tag == 'F' else 0.17)
            parts.append(finish(add_pipe(f'Shock{tag}{sx}', [(shock_x, 0.4, shock_z), (shock_x, 0.72, shock_z + 0.08)], 0.024, bevel_res=2), M['PaintedMetal'], smooth_angle=60))
            parts.append(finish(add_pipe(f'ShockRod{tag}{sx}', [(shock_x, 0.6, shock_z + 0.05), (shock_x, 0.8, shock_z + 0.1)], 0.011, bevel_res=1), M['BareMetal'], smooth_angle=60))
    parts.append(finish(add_pipe('Driveshaft', [(0.1, 0.42, AXLE_FRONT_Z + 0.14), (0.02, 0.5, -0.1), (0.1, 0.42, AXLE_REAR_Z - 0.14)], 0.032, bevel_res=1), M['PaintedMetal'], smooth_angle=60))
    return parts


# ---------------------------------------------------------------- body: front clip

def build_front():
    parts = []
    front_arch = arch_path(AXLE_FRONT_Z, **ARCH, fillet=0.2)
    arch_center = (AXLE_FRONT_Z, RIDE_HEIGHT)

    # Hood: crowned sheet rising gently toward the cowl, its front edge rolled
    # down over the grille; its sides stand a hand's width above the fenders.
    parts.append(finish(add_crown_loft('Hood', [
        (FRONT_Z - 0.04, 0.555, 1.00, 1.105, 0.014, 0.025),
        (FRONT_Z - 0.02, 0.57, 0.99, 1.13, 0.02, 0.03),
        (-1.20, 0.575, 0.985, 1.165, 0.022, 0.03),
        (COWL_Z[0] + 0.02, 0.58, 0.98, 1.20, 0.022, 0.03),
    ]), M['PaintBody'], 0.008, 2))
    for sx in SIDES:
        parts.append(finish(add_box(f'HoodLatch{sx}', (0.025, 0.06, 0.035), (sx * 0.593, 1.075, -1.5)), M['BareMetal'], 0.004, 1))

    # Cowl: full body width, crowned like the hood; carries the windshield.
    cowl = add_crown_loft('Cowl', [
        (COWL_Z[0], BODY_HW, SILL_Y + 0.02, 1.205, 0.012, 0.05),
        (COWL_Z[1], BODY_HW, SILL_Y + 0.02, 1.215, 0.012, 0.05),
    ])
    parts.append(finish(shape_panel(cowl), M['PaintBody'], 0.008, 2))

    # Nose panel between the fenders: recessed horizontal-slat grille and
    # round lamps in slim bezels.
    parts.append(finish(add_box('NosePanel', (1.12, 0.36, 0.05), (0, 0.82, FRONT_Z + 0.02)), M['PaintBody'], 0.008, 2))
    parts.append(finish(add_box('GrilleInset', (0.54, 0.24, 0.01), (0, 0.83, FRONT_Z - 0.006)), M['PaintChassis']))
    for i, yy in enumerate((0.755, 0.805, 0.855, 0.905)):
        parts.append(finish(add_box(f'GrilleSlat{i}', (0.54, 0.018, 0.016), (0, yy, FRONT_Z - 0.01)), M['PaintBody'], 0.004, 1))
    for sx in SIDES:
        parts.append(finish(add_tube(f'Bezel{sx}', 0.09, 0.07, 0.04, (sx * 0.42, 0.84, FRONT_Z - 0.02), AXIS_Z, 24), M['PaintedMetal'], 0.005, 1))
        parts.append(finish(add_cylinder(f'Lens{sx}', 0.072, 0.03, (sx * 0.42, 0.84, FRONT_Z - 0.013), AXIS_Z, 24), M['LightLens'], 0.006, 2))

    # Front fenders: flat-topped, their outer face in the same plane as the
    # tub sides, with the softened trapezoid wheel opening cut in and a thin
    # body-colour lip following the opening (not a bolted-on flare).
    fender = ([(FRONT_Z, 0.66)]
              + [tuple(v) for v in fillet_polyline([(FRONT_Z, 0.66), (FRONT_Z, FENDER_TOP), (COWL_Z[0] + 0.02, FENDER_TOP)], 0.05, 4)][1:-1]
              + [(COWL_Z[0] + 0.02, FENDER_TOP), (COWL_Z[0] + 0.02, SILL_Y + 0.02)]
              + list(reversed(front_arch)))
    flare = band(front_arch, FLARE['d_in'], FLARE['d_out'], arch_center)
    for sx in SIDES:
        parts.append(finish(shape_panel(add_extrude_profile(f'Fender{sx}', fender, *span(sx, FENDER_IN, BODY_HW))), M['PaintBody'], 0.01, 2, smooth_angle=30))
        parts.append(finish(shape_panel(add_extrude_profile(f'FlareF{sx}', flare, *span(sx, FLARE['x_in'], FLARE['x_out']))), M['PaintBody'], 0.014, 3, smooth_angle=30))
        parts.append(finish(add_box(f'Indicator{sx}', (0.09, 0.035, 0.01), (sx * 0.72, 0.99, FRONT_Z - 0.004)), M['LightLens'], 0.003, 1))

    # C-channel front bumper with tow shackles, bolted to the rails.
    parts.append(finish(add_box('BumperFront', (1.70, 0.13, 0.12), (0, 0.58, -1.84)), M['PaintedMetal'], 0.01, 2))
    for sx in SIDES:
        parts.append(finish(add_box(f'BumperBracket{sx}', (0.09, 0.09, 0.1), (sx * 0.36, 0.6, -1.74)), M['PaintChassis'], 0.006, 1))
        parts.append(finish(add_torus(f'Shackle{sx}', 0.04, 0.012, (sx * 0.52, 0.53, -1.915), AXIS_X, 14, 6), M['BareMetal']))
    return parts


# ---------------------------------------------------------------- body: tub (sides, rear, interior floor)

def build_tub():
    parts = []
    rear_arch = arch_path(AXLE_REAR_Z, **ARCH, fillet=0.2)
    arch_center = (AXLE_REAR_Z, RIDE_HEIGHT)

    # Side walls: one continuous beltline with the classic scooped door
    # opening and the rear wheel opening cut into a single sheet profile.
    door_scoop = arc((0.42, BELT_Y), BELT_Y - DOOR_Y, 0.0, -math.pi / 2, 8)
    wall = ([(COWL_Z[1] - 0.02, SILL_Y)] + rear_arch + [(TAIL_Z, SILL_Y), (TAIL_Z, BELT_Y)]
            + door_scoop + [(COWL_Z[1] - 0.02, DOOR_Y)])
    for sx in SIDES:
        parts.append(finish(shape_panel(add_extrude_profile(f'Wall{sx}', wall, *span(sx, BODY_HW - WALL_T, BODY_HW))), M['PaintBody'], 0.008, 2, smooth_angle=30))
        parts.append(finish(shape_panel(add_extrude_profile(f'FlareR{sx}', band(rear_arch, FLARE['d_in'], FLARE['d_out'], arch_center), *span(sx, FLARE['x_in'], FLARE['x_out']))), M['PaintBody'], 0.014, 3, smooth_angle=30))
        # Inner wheelhouse so the opening never shows the sky through the tub.
        parts.append(finish(add_extrude_profile(f'Wheelhouse{sx}', band(rear_arch, 0.0, 0.05, arch_center), *span(sx, 0.54, BODY_HW - WALL_T)), M['PaintChassis']))
        # Inboard well wall — closes the see-through view across the chassis.
        parts.append(finish(add_extrude_profile(f'WellWall{sx}', rear_arch, *span(sx, 0.52, 0.545)), M['PaintChassis']))
        parts.append(finish(add_box(f'WheelhouseTop{sx}', (0.3, 0.08, 0.86), (sx * 0.69, 1.03, AXLE_REAR_Z)), M['PaintBody'], 0.01, 2))
        # Tube step / rock slider under the door opening.
        parts.append(finish(add_box(f'Slider{sx}', (0.06, 0.06, 1.24), (sx * 0.8, 0.52, 0.0)), M['PaintedMetal'], 0.01, 2))

    # Rolled beltline edge: one bent tube tracing the door scoop, the side
    # tops and the tail — the highlight that defines the tub from behind.
    rail_x = BODY_HW - 0.017
    rail = []
    for sx in (-1, 1):
        side = ([(sx * rail_x, DOOR_Y, COWL_Z[1] + 0.01)]
                + [(sx * rail_x, yy, zz) for (zz, yy) in reversed(door_scoop)]
                + [(sx * rail_x, BELT_Y, TAIL_Z - 0.017)])
        rail.extend(side if sx < 0 else list(reversed(side)))
    parts.append(finish(shape_panel(add_pipe('BeltRail', rail, 0.017, fillet=0.08, fillet_segs=4), step=None), M['PaintBody'], smooth_angle=50))

    # Rear panel + tailgate skin with hinges and a latch handle.
    parts.append(finish(shape_panel(add_box('RearPanel', (BODY_HW * 2, BELT_Y - SILL_Y, WALL_T), (0, (BELT_Y + SILL_Y) / 2, TAIL_Z - WALL_T / 2))), M['PaintBody'], 0.008, 2))
    parts.append(finish(add_box('Tailgate', (1.14, 0.46, 0.01), (0, 0.88, TAIL_Z + 0.005)), M['PaintBody'], 0.003, 1))
    for yy in (0.74, 1.02):
        parts.append(finish(add_box(f'TailgateHinge{yy}', (0.05, 0.06, 0.02), (-0.585, yy, TAIL_Z + 0.014)), M['BareMetal'], 0.004, 1))
    parts.append(finish(add_box('TailgateHandle', (0.09, 0.03, 0.02), (0.45, 1.04, TAIL_Z + 0.016)), M['BareMetal'], 0.004, 1))

    # Vertical corner tail lights: housing, red stop/tail lens, clear reverse lens.
    for sx in SIDES:
        parts.append(finish(add_box(f'TailHousing{sx}', (0.1, 0.24, 0.024), (sx * 0.72, 0.97, TAIL_Z + 0.012)), M['PaintedMetal'], 0.005, 1))
        parts.append(finish(add_box(f'TailLight{sx}', (0.075, 0.12, 0.01), (sx * 0.72, 1.025, TAIL_Z + 0.026)), M['TailLight'], 0.003, 1))
        parts.append(finish(add_box(f'ReverseLight{sx}', (0.075, 0.055, 0.01), (sx * 0.72, 0.9, TAIL_Z + 0.026)), M['LightLens'], 0.003, 1))

    # Cabin floor, the step up to the cargo floor, and the cargo floor.
    inner_w = (BODY_HW - WALL_T) * 2 - 0.01
    parts.append(finish(add_box('CabinFloor', (inner_w, 0.05, 0.94), (0, 0.675, 0.16)), M['PaintChassis'], 0.005, 1))
    parts.append(finish(add_box('CargoRiser', (inner_w, 0.36, 0.035), (0, 0.85, 0.62)), M['PaintChassis'], 0.005, 1))
    parts.append(finish(add_box('CargoFloor', (inner_w, 0.05, 1.22), (0, 1.02, 1.23)), M['PaintChassis'], 0.005, 1))
    return parts


# ---------------------------------------------------------------- body: cabin, windshield, cage

WS_TILT = math.radians(24)
WS_BASE = (1.22, -0.40)   # (y, z) of the frame's bottom edge, on the cowl
WS_W, WS_H = 1.62, 0.58


def ws_point(h):
    return (WS_BASE[0] + h * math.cos(WS_TILT), WS_BASE[1] + h * math.sin(WS_TILT))


def build_cabin():
    parts = []

    # Windshield: slim rounded frame + glass, raked like a real utility 4x4.
    ws_matrix = Matrix.Translation((0, WS_BASE[0], WS_BASE[1])) @ Matrix.Rotation(WS_TILT, 4, 'X')
    parts.append(finish(add_frame('WindshieldFrame', WS_W, WS_H, 0.04, 0.03, 0.035, ws_matrix), M['PaintedMetal'], 0.005, 2))
    glass = add_box('Windshield', (WS_W - 0.06, WS_H - 0.06, 0.008), None, matrix=ws_matrix @ Matrix.Translation((0, WS_H / 2, 0)))
    parts.append(finish(glass, M['Glass']))
    for sx in SIDES:
        parts.append(finish(add_box(f'WsHinge{sx}', (0.05, 0.035, 0.045), (sx * 0.64, WS_BASE[0] + 0.01, WS_BASE[1] + 0.04)), M['BareMetal'], 0.004, 1))

    # Mirrors on short stalks off the windshield frame, glass facing rearward.
    my, mz = ws_point(0.12)
    for sx in SIDES:
        parts.append(finish(add_pipe(f'MirrorStalk{sx}', [(sx * 0.81, my, mz), (sx * 0.9, my + 0.03, mz - 0.02), (sx * 0.95, my + 0.03, mz - 0.02)], 0.01, fillet=0.03), M['PaintedMetal'], smooth_angle=60))
        parts.append(finish(add_box(f'MirrorHead{sx}', (0.15, 0.11, 0.03), (sx * 1.0, my + 0.04, mz - 0.02)), M['PaintedMetal'], 0.008, 2))
        parts.append(finish(add_box(f'MirrorGlass{sx}', (0.13, 0.09, 0.006), (sx * 1.0, my + 0.04, mz - 0.002)), M['Mirror']))

    # Dash: instrument pod + passenger grab bar on the cowl's cabin face.
    parts.append(finish(add_box('InstrumentPod', (0.32, 0.12, 0.07), (-0.4, 1.12, COWL_Z[1] + 0.02)), M['PaintChassis'], 0.012, 2))
    parts.append(finish(add_pipe('GrabBar', [(0.22, 1.14, COWL_Z[1] + 0.01), (0.27, 1.18, COWL_Z[1] + 0.06), (0.57, 1.18, COWL_Z[1] + 0.06), (0.62, 1.14, COWL_Z[1] + 0.01)], 0.012, fillet=0.03), M['PaintedMetal'], smooth_angle=60))

    # Steering wheel (left-hand drive), tilted toward the driver.
    wheel_center = Vector((-0.4, 1.24, -0.1))
    tilt = (math.radians(-35), 0, 0)
    parts.append(finish(add_torus('SteeringWheel', 0.18, 0.014, tuple(wheel_center), tilt, 28, 6), M['Tire']))
    parts.append(finish(add_cylinder('SteeringHub', 0.04, 0.045, tuple(wheel_center), tilt, 12), M['PaintedMetal'], 0.008, 1))
    rim_frame = Euler(tilt, 'XYZ').to_matrix()
    for i, ang in enumerate((0, 180, 270)):
        a = math.radians(ang)
        tip = wheel_center + rim_frame @ Vector((0.175 * math.cos(a), 0.175 * math.sin(a), 0))
        parts.append(finish(add_pipe(f'Spoke{i}', [tuple(wheel_center), tuple(tip)], 0.009, bevel_res=1), M['PaintedMetal'], smooth_angle=60))
    parts.append(finish(add_pipe('SteeringColumn', [(-0.4, 1.08, COWL_Z[1]), tuple(wheel_center)], 0.022, bevel_res=1), M['PaintedMetal'], smooth_angle=60))

    # Bucket seats: base, cushion, back and headrest.
    for sx in SIDES:
        x = sx * 0.4
        parts.append(finish(add_box(f'SeatBase{sx}', (0.34, 0.16, 0.34), (x, 0.76, 0.2)), M['PaintChassis'], 0.01, 1))
        parts.append(finish(add_box(f'SeatCushion{sx}', (0.46, 0.11, 0.46), (x, 0.9, 0.22)), M['Canvas'], 0.03, 3))
        parts.append(finish(add_box(f'SeatBack{sx}', (0.46, 0.5, 0.11), (x, 1.2, 0.5), (math.radians(10), 0, 0)), M['Canvas'], 0.03, 3))
        parts.append(finish(add_box(f'Headrest{sx}', (0.26, 0.14, 0.09), (x, 1.52, 0.57), (math.radians(10), 0, 0)), M['Canvas'], 0.025, 3))
    parts.append(finish(add_box('Console', (0.2, 0.2, 0.7), (0, 0.78, 0.07)), M['PaintChassis'], 0.012, 2))
    parts.append(finish(add_pipe('Shifter', [(0.0, 0.86, -0.08), (0.0, 1.06, -0.03)], 0.01, bevel_res=1), M['PaintedMetal'], smooth_angle=60))
    parts.append(finish(add_box('ShifterKnob', (0.04, 0.045, 0.04), (0.0, 1.08, -0.025)), M['Tire'], 0.014, 2))
    return parts


def build_cage():
    """A sport cage sized like the real thing: ~50 mm tube, a main hoop just
    behind the seats, side bars running from the windshield header to the
    hoop, and rear legs down to the tub corners. Kept inside the body plane
    and low enough (≈1.86 m) that it frames the cabin instead of towering."""
    parts = []
    hoop_z = 0.7
    top_y = 1.86
    cx = 0.76
    parts.append(finish(add_pipe('CageHoop', [(-cx, 0.95, hoop_z), (-cx, top_y, hoop_z), (cx, top_y, hoop_z), (cx, 0.95, hoop_z)], 0.025, fillet=0.12), M['PaintedMetal'], smooth_angle=50))
    ws_y, ws_z = ws_point(WS_H - 0.02)
    for sx in SIDES:
        parts.append(finish(add_pipe(f'CageSide{sx}', [(sx * cx, ws_y, ws_z), (sx * cx, top_y, hoop_z), (sx * cx, BELT_Y + 0.015, 1.66)], 0.022, fillet=0.16, fillet_segs=6), M['PaintedMetal'], smooth_angle=50))
        parts.append(finish(add_box(f'CageFoot{sx}', (0.08, 0.016, 0.1), (sx * cx, BELT_Y + 0.008, 1.66)), M['PaintedMetal'], 0.004, 1))
    return parts


# ---------------------------------------------------------------- body: rear hardware + utility details

SPARE_CENTER = (0.0, 1.02, TAIL_Z + 0.2)


def build_rear_and_details():
    parts = []

    # Rear bumper tucked under the tailgate, with wrap-around ends, D-rings
    # and a hitch receiver.
    parts.append(finish(add_box('BumperRear', (1.6, 0.13, 0.12), (0, 0.52, TAIL_Z + 0.07)), M['PaintedMetal'], 0.01, 2))
    for sx in SIDES:
        parts.append(finish(add_box(f'BumperWrap{sx}', (0.18, 0.13, 0.12), (sx * 0.83, 0.52, TAIL_Z + 0.005), (0, math.radians(-sx * 38), 0)), M['PaintedMetal'], 0.01, 2))
        parts.append(finish(add_torus(f'DRing{sx}', 0.04, 0.012, (sx * 0.5, 0.455, TAIL_Z + 0.14), AXIS_X, 14, 6), M['BareMetal']))
        parts.append(finish(add_box(f'MudFlap{sx}', (0.24, 0.28, 0.012), (sx * 0.78, 0.4, AXLE_REAR_Z + 0.5)), M['Tire'], 0.004, 1))
    parts.append(finish(add_box('Hitch', (0.07, 0.07, 0.18), (0, 0.49, TAIL_Z + 0.17)), M['PaintChassis'], 0.006, 1))
    parts.append(finish(add_cylinder('HitchPin', 0.01, 0.12, (0, 0.49, TAIL_Z + 0.21), AXIS_X, 8), M['BareMetal']))

    # Spare wheel on a tailgate carrier (same construction as road wheels).
    parts.append(finish(add_box('SpareCarrier', (0.26, 0.26, 0.05), (0, SPARE_CENTER[1], TAIL_Z + 0.035)), M['PaintedMetal'], 0.008, 2))
    parts.extend(wheel_parts('Spare', SPARE_CENTER, outward=-1, axis=Matrix.Rotation(math.radians(90), 4, 'Y')))

    # Cargo: two jerrycans behind the driver, a canvas kit bag on the right.
    for i, x in enumerate((-0.45, -0.26)):
        parts.append(finish(add_box(f'Jerrycan{i}', (0.165, 0.44, 0.34), (x, 1.265, 0.88)), M['PaintChassis'], 0.012, 2))
        parts.append(finish(add_box(f'JerrycanHandle{i}', (0.04, 0.04, 0.18), (x, 1.5, 0.88)), M['PaintChassis'], 0.006, 1))
    parts.append(finish(add_box('CargoStrap', (0.4, 0.03, 0.36), (-0.355, 1.32, 0.88)), M['Canvas'], 0.004, 1))
    parts.append(finish(add_box('KitBag', (0.4, 0.22, 0.55), (0.24, 1.16, 1.34)), M['Canvas'], 0.05, 3))
    parts.append(finish(add_box('KitBagStrap', (0.42, 0.225, 0.035), (0.24, 1.162, 1.34)), M['PaintChassis'], 0.006, 1))

    # Raised air-intake snorkel following the right A-pillar (fording kit).
    snorkel = [(0.915, 0.98, -0.8), (0.915, 1.22, -0.66), (0.895, 1.72, -0.45)]
    parts.append(finish(add_pipe('Snorkel', snorkel, 0.036, fillet=0.12), M['PaintChassis'], smooth_angle=50))
    parts.append(finish(add_box('SnorkelHead', (0.1, 0.1, 0.15), (0.895, 1.755, -0.49)), M['PaintChassis'], 0.02, 2))

    # Whip antenna on the right-rear corner of the beltline.
    ant_base = (BODY_HW - 0.03, BELT_Y + 0.045, 1.76)
    parts.append(finish(add_cylinder('AntennaMount', 0.028, 0.06, ant_base, AXIS_Y, 12), M['BareMetal'], 0.005, 1))
    whip_len = 1.0
    whip_rot = (math.radians(-90 + 10), 0, math.radians(-5))
    whip_dir = _xform((0, 0, 0), whip_rot) @ Vector((0, 0, 1))
    whip_center = Vector(ant_base) + whip_dir * (whip_len / 2 + 0.03)
    parts.append(finish(add_cylinder('Antenna', 0.007, whip_len, tuple(whip_center), whip_rot, 6, radius_top=0.003), M['PaintedMetal']))
    return parts


def build_chassis():
    parts = build_underbody() + build_front() + build_tub() + build_cabin() + build_cage() + build_rear_and_details()
    return join(parts, 'Body')


# ---------------------------------------------------------------- wheels

# 16" pressed-steel wheel on a ~285/75R16-class tire (overall Ø 0.76 m =
# 2 × WHEEL_R): a tall, mostly straight sidewall with only a slight bulge,
# which is what makes the wheel read as a real tire instead of a toy balloon.
# Tread surface sits 12 mm under WHEEL_R; the lugs rise exactly to WHEEL_R,
# so ground contact still matches the physics radius.
TREAD_R = WHEEL_R - 0.012
TIRE_PROFILE = [
    (-0.122, 0.198), (-0.132, 0.215), (-0.140, 0.245), (-0.142, 0.28), (-0.139, 0.315),
    (-0.132, 0.340), (-0.120, 0.356), (-0.105, 0.3625), (-0.09, TREAD_R),
    (0.09, TREAD_R), (0.105, 0.3625), (0.120, 0.356), (0.132, 0.340), (0.139, 0.315),
    (0.142, 0.28), (0.140, 0.245), (0.132, 0.215), (0.122, 0.198),
]
# Rim: barrel, rolled outer flange, and a dished centre face; +x = outer face.
RIM_PROFILE = [
    (-0.10, 0.0), (-0.10, 0.196), (0.096, 0.196),
    (0.104, 0.211), (0.118, 0.215), (0.122, 0.207), (0.110, 0.194),
    (0.072, 0.176), (0.052, 0.14), (0.05, 0.0),
]


def wheel_parts(tag, center, outward=1, axis=None):
    """All pieces of one wheel around the X spin axis at `center`. `outward`
    (±1) is the side the rim face points to; `axis` (about the centre)
    re-orients the whole wheel, e.g. the tailgate spare."""
    W = Matrix.Translation(Vector(center))
    if axis is not None:
        W = W @ axis
    W = W @ Matrix.Diagonal((outward, 1, 1, 1))
    parts = []

    parts.append(finish(add_revolve(f'Tire_{tag}', TIRE_PROFILE, 40, W, closed=True), M['Tire'], smooth_angle=55))
    parts.append(finish(add_revolve(f'Rim_{tag}', RIM_PROFILE, 32, W), M['Rim'], 0.004, 1, smooth_angle=40))
    parts.append(finish(add_cylinder(f'HubCap_{tag}', 0.05, 0.05, (0.06, 0, 0), AXIS_X, 16, pre=W), M['PaintedMetal'], 0.008, 2))
    for i in range(6):
        a = (i / 6) * math.tau
        parts.append(finish(add_cylinder(f'Lug_{tag}_{i}', 0.011, 0.02, (0.06, 0.085 * math.cos(a), 0.085 * math.sin(a)), AXIS_X, 6, pre=W), M['BareMetal'], 0.002, 1))

    # All-terrain military tread: two staggered rows of angled blocks split
    # by a centre groove, long/short alternating, shallow enough that the
    # tire keeps a round silhouette; the long blocks wrap slightly onto the
    # shoulder so the edge of the tread still reads.
    lugs = 30
    depth = 0.018
    for row, s in enumerate((-1, 1)):
        for i in range(lugs):
            spin = Matrix.Rotation(((i + 0.5 * row) / lugs) * math.tau, 4, 'X')
            long = i % 2 == 0
            x0, x1 = (0.01, 0.108) if long else (0.038, 0.108)
            local = (spin @ Matrix.Translation((s * (x0 + x1) / 2, -(WHEEL_R - depth / 2), 0))
                     @ Matrix.Rotation(math.radians(-s * 11), 4, 'Y'))
            parts.append(finish(add_box(f'Tread_{tag}_{row}_{i}', (x1 - x0, depth, 0.066), None, matrix=local, pre=W), M['TireTread']))
            if long:
                shoulder = (spin @ Matrix.Translation((s * 0.124, -0.35, 0))
                            @ Matrix.Rotation(math.radians(-s * 35), 4, 'Z'))
                parts.append(finish(add_box(f'Shoulder_{tag}_{row}_{i}', (0.012, 0.034, 0.05), None, matrix=shoulder, pre=W), M['TireTread']))
    return parts


def build_wheel(tag, x, z):
    wheel = join(wheel_parts(tag, (x, WHEEL_R, z), outward=1 if x > 0 else -1), f'Wheel_{tag}')

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
    children = (body, wheel_fl, wheel_fr, wheel_rl, wheel_rr)

    # Every part above was authored treating Blender's Y axis as "up" and Z
    # as "depth" (swapped from Blender's real Z-up). A +90° rotation about X
    # swaps them back, then the glTF exporter's own Z-up -> Y-up conversion
    # yields a Y-up, -Z-forward model.
    #
    # The rotation is BAKED into each child (mesh data + origin), not left on
    # the root: the controller moves wheel nodes in their parent's frame
    # (position.y = suspension, rotation.y = steer), so that frame must be
    # Y-up. With an unbaked root rotation the parent frame was Z-up — steering
    # tilted the front wheels (camber) and suspension slid them fore-aft.
    fix = Matrix.Rotation(math.radians(90), 4, 'X')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in children:
        obj.location = fix @ obj.location
        obj.rotation_euler = (math.radians(90), 0, 0)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = 'Vehicle'
    root.empty_display_size = 0.3
    for obj in children:
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
    cam = bpy.data.objects.new('Cam', cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    # Tuples are (X=side, Y=depth, Z=height) in Blender's real convention —
    # the baked +90° correction maps the model's forward (-Z authored) to
    # Blender +Y, so "front" cameras sit at +Y and "rear" ones at -Y; the
    # vehicle's left is -X. 'chase' reproduces the lab's rest framing
    # (chaseCamera.ts DEFAULT_CHASE_CAMERA: 6m back, 16° elevation over a
    # 0.9m anchor, 0.8m to the left, 52° vertical FOV, anchor low-right).
    # 'low_rear' is a terrain-dip view that exposes the running gear.
    angles = {
        'front34': ((4.2, 5.6, 1.9), (0, 0, 0.9), None),
        'side': ((5.8, 0.2, 1.5), (0, 0, 0.9), None),
        'rear34': ((-4.0, -5.4, 2.1), (0, 0, 0.9), None),
        'chase': ((-0.8, -6.0, 2.62), (-0.5, 0.0, 1.72), 52),
        'low_rear': ((2.6, -4.6, 0.45), (0, 0, 0.75), None),
    }
    only = os.environ.get('VEHICLE_PREVIEW_ONLY')
    for name, (pos, target, vfov) in angles.items():
        if only and name not in only.split(','):
            continue
        if vfov:
            cam_data.sensor_fit = 'VERTICAL'
            cam_data.angle_y = math.radians(vfov)
        else:
            cam_data.sensor_fit = 'AUTO'
            cam_data.lens = 42
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

    if os.environ.get('VEHICLE_SKIP_PREVIEW') != '1':
        preview_dir = os.path.join(project_root, 'design', 'docs', 'trafficability-drive-previews')
        render_preview(preview_dir)
        print(f'WROTE_PREVIEWS:{preview_dir}')


main()
