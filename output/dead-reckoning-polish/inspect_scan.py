import bpy, bmesh
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=r'C:\Users\idog2\Desktop\Programming\Artech\geoInteractive\output\dead-reckoning-polish\source\sand_rocks_small_01\sand_rocks_small_01_1k.gltf')
obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bm = bmesh.new(); bm.from_mesh(obj.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces), plane_co=Vector((0,0,0.065)), plane_no=Vector((0,0,1)), clear_inner=True, dist=0.0001)
bm.to_mesh(obj.data); bm.free()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
pieces = sorted([o for o in bpy.context.scene.objects if o.type=='MESH'], key=lambda o:len(o.data.polygons), reverse=True)
for i,o in enumerate(pieces[:20]):
    pts=[o.matrix_world@Vector(c) for c in o.bound_box]
    print('PIECE', i, len(o.data.polygons), 'bounds', tuple(round(min(v[k] for v in pts),3) for k in range(3)), tuple(round(max(v[k] for v in pts),3) for k in range(3)))
