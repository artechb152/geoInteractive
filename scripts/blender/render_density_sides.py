"""Isolated side-view terrain renders; no surrounding grass tile or plinth."""
import os, sys, json, math, random
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
import render_density_dioramas as base
import bpy
from mathutils import Vector, noise

def natural_surface():
    """Small-scale limestone, olive scrub and scree, with slope-aware blending."""
    m = base.material('Weathered limestone and sparse olive scrub', '#8A9163')
    ns=m.node_tree.nodes; lk=m.node_tree.links; bs=ns.get('Principled BSDF')
    tc=ns.new('ShaderNodeTexCoord')
    mapping=ns.new('ShaderNodeVectorMath'); mapping.operation='SCALE'; mapping.inputs[3].default_value=3.8
    lk.new(tc.outputs['Object'],mapping.inputs[0])
    txs=[]
    for filename in ('dry_diff.jpg','grass_diff.jpg'):
        tx=ns.new('ShaderNodeTexImage'); tx.image=bpy.data.images.load(os.path.join(base.TEX,filename),check_existing=True)
        tx.projection='BOX'; tx.projection_blend=.4; lk.new(mapping.outputs[0],tx.inputs[0]); txs.append(tx)
    geom=ns.new('ShaderNodeNewGeometry'); sep=ns.new('ShaderNodeSeparateXYZ'); lk.new(geom.outputs['Normal'],sep.inputs[0])
    slope=ns.new('ShaderNodeMapRange'); slope.clamp=True
    slope.inputs['From Min'].default_value=.15; slope.inputs['From Max'].default_value=.72
    lk.new(sep.outputs['Z'],slope.inputs['Value'])
    patch=ns.new('ShaderNodeTexNoise'); patch.inputs['Scale'].default_value=7; patch.inputs['Detail'].default_value=3
    lk.new(tc.outputs['Object'],patch.inputs['Vector'])
    patch_contrast=ns.new('ShaderNodeMapRange'); patch_contrast.clamp=True
    patch_contrast.inputs['From Min'].default_value=.34; patch_contrast.inputs['From Max'].default_value=.60
    lk.new(patch.outputs['Fac'],patch_contrast.inputs['Value'])
    blend=ns.new('ShaderNodeMath'); blend.operation='MULTIPLY'; lk.new(slope.outputs[0],blend.inputs[0]); lk.new(patch_contrast.outputs[0],blend.inputs[1])
    mix=ns.new('ShaderNodeMixRGB'); lk.new(blend.outputs[0],mix.inputs[0]); lk.new(txs[0].outputs['Color'],mix.inputs[1]); lk.new(txs[1].outputs['Color'],mix.inputs[2])
    hsv=ns.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value=.63; hsv.inputs['Value'].default_value=1.1
    lk.new(mix.outputs[0],hsv.inputs['Color']); lk.new(hsv.outputs[0],bs.inputs['Base Color'])
    detail=ns.new('ShaderNodeTexNoise'); detail.inputs['Scale'].default_value=145; detail.inputs['Detail'].default_value=5; detail.inputs['Roughness'].default_value=.72
    lk.new(tc.outputs['Object'],detail.inputs['Vector'])
    bump=ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.55; bump.inputs['Distance'].default_value=.018
    lk.new(detail.outputs['Fac'],bump.inputs['Height']); lk.new(bump.outputs[0],bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value=.95
    return m

def scatter_surface_details(vertices, faces):
    """Sparse rocky outcrops and low scrub only on the landform itself."""
    rng=random.Random(731)
    rock=base.material('Small weathered limestone outcrops','#C9B892')
    scrub=base.material('Low olive scrub','#55613C')
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
    proto=bpy.context.object; rock_mesh=proto.data.copy(); bpy.data.objects.remove(proto,do_unlink=True)
    scrub_mesh=rock_mesh.copy(); rock_mesh.materials.append(rock); scrub_mesh.materials.append(scrub)
    # Sample faces rather than polar vertices, weighting by area to avoid summit clumping.
    areas=[]; total=0
    for f in faces:
        a,b,c=(Vector(vertices[i]) for i in f[:3])
        total+=(b-a).cross(c-a).length
        areas.append(total)
    import bisect
    for i in range(1400):
        f=faces[bisect.bisect_left(areas,rng.random()*total)]
        a,b,c=(Vector(vertices[j]) for j in f[:3]); normal=(b-a).cross(c-a).normalized()
        p=(a+b+c)/3
        if p.z < .045 or normal.z < .2: continue
        is_scrub=rng.random()<.66 and normal.z>.48
        ob=bpy.data.objects.new('Scrub' if is_scrub else 'Limestone',scrub_mesh if is_scrub else rock_mesh)
        bpy.context.collection.objects.link(ob)
        s=rng.uniform(.008,.023) if is_scrub else rng.uniform(.01,.035)
        ob.location=p; ob.scale=(s*rng.uniform(.8,1.7),s,s*(.65 if is_scrub else .8))
        ob.rotation_euler=(rng.random(),rng.random(),rng.random()*math.pi)

SOURCE = os.path.join(base.ROOT, 'design/blender/terrain-density/isolated-sides')
os.makedirs(SOURCE, exist_ok=True)
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for kind in (args or list(base.GEOMETRY)):
    data = base.GEOMETRY[kind]
    sc = base.setup(1200, 420)
    sc.cycles.samples=96
    # Keep rock relief sub-metre: contours still describe the underlying macroform.
    vertices=[]
    for x,y,z in data['sideVertices']:
        fade=min(1,max(0,z/.1))
        rough=noise.fractal(Vector((x*15,y*15,z*9)),1.0,2.0,4)
        vertices.append((x,y,z + .024*rough*fade))
    base.mesh('Isolated mountain ' + kind, vertices, data['sideFaces'], natural_surface(), True)
    scatter_surface_details(vertices, data['sideFaces'])
    # A smaller directional key reveals actual surface volume and the shoulders.
    lights=[ob for ob in sc.objects if ob.type=='LIGHT']
    lights[0].location=(-3,-4,6); lights[0].data.size=2.0; lights[0].data.energy=850
    lights[1].data.energy=100
    sc.world.node_tree.nodes['Background'].inputs[1].default_value=.24
    # Low oblique side view: west stays left, steep eastern cliff stays right.
    base.camera((0, -8, 3.3), (0, 0, .72), 6.1)
    bpy.context.view_layer.update()
    labels = [{'text':str(h), 'point':base.project((-2.32, 0, h/55))} for h in (20,40,60,80)]
    ends = [base.project((x,0,0)) for x in (-2.1,2.1)]
    json.dump({'labels':labels,'ends':ends}, open(os.path.join(base.OUT, kind+'-side-labels.json'),'w'), indent=2)
    sc.render.filepath = os.path.join(base.OUT, kind+'-side.png')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,kind+'-side.blend'), compress=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,kind+'-side.blend'), compress=True)
    bpy.ops.render.render(write_still=True)
print('ISOLATED SIDE RENDERS COMPLETE', flush=True)
