"""Render true relief and section miniatures, using the lesson's exact geometry.

node scripts/blender/export_density_geometry.cjs
blender --background --python scripts/blender/render_density_dioramas.py -- [gentle|steep|cliff]

Photo materials reuse the existing CC0 Poly Haven terrain textures. No network.
All contour curves are actual 3D geometry on the terrain, never SVG overlays.
"""
import bpy, json, math, os, random, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'qa-output/density-blender')
SOURCE_OUT = os.path.join(ROOT, 'design/blender/terrain-density/archive-polished-v2')
os.makedirs(SOURCE_OUT, exist_ok=True)
TEX = os.path.join(ROOT, 'public/assets/lessons/topic02/contour-mountain/textures')
GEOMETRY = json.load(open(os.path.join(OUT, 'geometry.json')))

def rgba(h):
    rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)

def material(name, color):
    m=bpy.data.materials.new(name); m.diffuse_color=rgba(color); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=rgba(color)
    bs.inputs['Roughness'].default_value=.86
    return m

def terrain_material():
    m=material('Natural limestone and olive ground','#8A9163'); nt=m.node_tree; ns=nt.nodes; lk=nt.links
    bs=ns.get('Principled BSDF')
    tc=ns.new('ShaderNodeTexCoord'); mapping=ns.new('ShaderNodeVectorMath'); mapping.operation='SCALE'; mapping.inputs[3].default_value=1.25
    lk.new(tc.outputs['Object'],mapping.inputs[0])
    images=[]
    for filename in ('grass_diff.jpg','rock_diff.jpg'):
        tx=ns.new('ShaderNodeTexImage'); tx.image=bpy.data.images.load(os.path.join(TEX,filename),check_existing=True)
        tx.projection='BOX'; tx.projection_blend=.28; lk.new(mapping.outputs[0],tx.inputs['Vector']); images.append(tx)
    geom=ns.new('ShaderNodeNewGeometry'); sep=ns.new('ShaderNodeSeparateXYZ'); lk.new(geom.outputs['Normal'],sep.inputs[0])
    slope=ns.new('ShaderNodeMapRange'); slope.inputs['From Min'].default_value=.55; slope.inputs['From Max'].default_value=.94
    lk.new(sep.outputs['Z'],slope.inputs['Value'])
    mix=ns.new('ShaderNodeMixRGB'); lk.new(slope.outputs[0],mix.inputs[0]); lk.new(images[1].outputs['Color'],mix.inputs[1]); lk.new(images[0].outputs['Color'],mix.inputs[2])
    hsv=ns.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value=.8; hsv.inputs['Value'].default_value=.95; lk.new(mix.outputs[0],hsv.inputs['Color']); lk.new(hsv.outputs[0],bs.inputs['Base Color'])
    noise=ns.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=65; noise.inputs['Detail'].default_value=4
    lk.new(tc.outputs['Object'],noise.inputs['Vector'])
    bump=ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.38; bump.inputs['Distance'].default_value=.026
    lk.new(noise.outputs['Fac'],bump.inputs['Height']); lk.new(bump.outputs[0],bs.inputs['Normal'])
    return m

def rock_material():
    m=material('Exposed sedimentary section','#C9B892'); nt=m.node_tree; ns=nt.nodes; lk=nt.links; bs=ns.get('Principled BSDF')
    tc=ns.new('ShaderNodeTexCoord'); sep=ns.new('ShaderNodeSeparateXYZ'); comb=ns.new('ShaderNodeCombineXYZ')
    lk.new(tc.outputs['Generated'],sep.inputs[0]); lk.new(sep.outputs['X'],comb.inputs['X']); lk.new(sep.outputs['Z'],comb.inputs['Y'])
    tx=ns.new('ShaderNodeTexImage'); tx.image=bpy.data.images.load(os.path.join(ROOT,'public/assets/lessons/topic02/contour-density/limestone-section.webp'),check_existing=True)
    lk.new(comb.outputs[0],tx.inputs['Vector']); lk.new(tx.outputs['Color'],bs.inputs['Base Color'])
    bump=ns.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.5; bump.inputs['Distance'].default_value=.035; lk.new(tx.outputs['Color'],bump.inputs['Height']); lk.new(bump.outputs[0],bs.inputs['Normal'])
    return m

def foliage_material():
    m=material('Natural scrub leaf cards','#55613C'); ns=m.node_tree.nodes; lk=m.node_tree.links; bs=ns.get('Principled BSDF')
    tx=ns.new('ShaderNodeTexImage'); tx.image=bpy.data.images.load(os.path.join(TEX,'leaves.png'),check_existing=True)
    lk.new(tx.outputs['Color'],bs.inputs['Base Color']); lk.new(tx.outputs['Alpha'],bs.inputs['Alpha'])
    return m

def mesh(name, verts, faces, mat, smooth=False):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); ob.data.materials.append(mat)
    if smooth:
        for poly in me.polygons: poly.use_smooth=True
    return ob

def curve(name, points, radius, mat, closed=False):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.resolution_u=1; cu.bevel_depth=radius; cu.bevel_resolution=2
    sp=cu.splines.new('POLY'); sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points): p.co=(*co,1)
    sp.use_cyclic_u=closed
    ob=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(ob); ob.data.materials.append(mat)
    return ob

def camera(loc, target, scale):
    bpy.ops.object.camera_add(location=loc); cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=scale; bpy.context.scene.camera=cam
    return cam

def setup(width,height):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=48; sc.cycles.use_denoising=True
    sc.render.resolution_x=width; sc.render.resolution_y=height; sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'; sc.render.film_transparent=True
    sc.world.use_nodes=True; sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.76,.82,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.38
    sc.view_settings.view_transform='AgX'
    for loc,energy,size in [((-3,-4,7),750,5),((4,1,5),400,4)]:
        bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size
        light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
    return sc

def project(co):
    sc=bpy.context.scene; p=world_to_camera_view(sc,sc.camera,Vector(co)); return [round(p.x*200,3),round((1-p.y)*sc.render.resolution_y/sc.render.resolution_x*200,3)]

def render(kind, mode, data):
    is_relief=mode=='relief'; sc=setup(1200,720 if is_relief else 420)
    soil=rock_material(); ground=terrain_material(); ink=material('Contour inlay','#E8DCC4'); dark=material('Section marking','#38432E')
    pts=data['profile']; labels=[]
    if is_relief:
        ob=mesh('Terrain_'+kind,data['vertices'],data['faces'],ground,True)
        # Closed, layered soil edges give the tile actual volume.
        n=240; vs=data['vertices']; edges=[]
        for row,col,dr,dc in [(0,0,0,1),(0,n,1,0),(n,n,0,-1),(n,0,-1,0)]:
            for j in range(n):
                a=vs[(row+j*dr)*(n+1)+col+j*dc]; b=vs[(row+(j+1)*dr)*(n+1)+col+(j+1)*dc]
                edges.extend([a,b,[b[0],b[1],-.19],[a[0],a[1],-.19]])
        mesh('Layered soil block',edges,[(i,i+1,i+2,i+3) for i in range(0,len(edges),4)],soil)
        for ring in data['rings']:
            curve('Contour_%02d'%ring['height'],[(x,y,z+.009) for x,y,z in ring['points']],.014 if ring['height']==50 else .009,ink,True)
        # A–B is painted along the terrain itself, including its rise/fall.
        for i in range(0,len(pts)-5,9): curve('Section A-B',[(x,y,z+.015) for x,y,z in pts[i:i+5]],.008,dark)
        # Low scrub and small limestone outcrops, deterministic and kept clear of contours.
        rng=random.Random(19); leafverts=[]; leaffaces=[]; leafuv=[]
        for i in range(650):
            row=rng.randrange(4,n-4); col=rng.randrange(4,n-4); x,y,z=vs[row*(n+1)+col]
            if min(abs(z-r['height']/55) for r in data['rings'])<.035 or abs(y)<.03: continue
            # Avoid placing shrubs on the steep cliff wall.
            if abs(vs[row*(n+1)+col+1][2]-z)>.035: continue
            s=rng.uniform(.025,.055)
            for a in (0,math.pi/3,math.pi*2/3):
                dx=math.cos(a)*s; dy=math.sin(a)*s; j=len(leafverts)
                leafverts.extend([(x-dx,y-dy,z),(x+dx,y+dy,z),(x+dx,y+dy,z+s*1.3),(x-dx,y-dy,z+s*1.3)])
                leaffaces.append((j,j+1,j+2,j+3)); leafuv.extend([(0,0),(.5,0),(.5,.5),(0,.5)])
        leaves=mesh('Fine natural scrub',leafverts,leaffaces,foliage_material())
        uv=leaves.data.uv_layers.new(name='UVMap')
        for p in leaves.data.polygons:
            for li in p.loop_indices: uv.data[li].uv=leafuv[leaves.data.loops[li].vertex_index]
        camera((3,-6,6.3),(0,0,.35),6.9)
        for ring in data['rings']:
            if ring['height'] in ([10,30] if kind=='gentle' else [10,50]):
                labels.append({'text':str(ring['height']),'point':project([*ring['label'][:2],ring['label'][2]+.04])})
        ends=[project(pts[0]),project(pts[-1])]
    else:
        # A real extruded geological section, not a flat textured SVG path.
        verts=[]; faces=[]
        for x,y,z in pts: verts.extend([(x,-.14,z),(x,.30,z),(x,-.14,-.13),(x,.30,-.13)])
        for i in range(len(pts)-1):
            j=i*4; faces.extend([(j,j+4,j+6,j+2),(j+1,j+3,j+7,j+5)])
        section=mesh('A-B cut rock',verts,faces,soil)
        topfaces=[(i*4,i*4+1,i*4+5,i*4+4) for i in range(len(pts)-1)]
        mesh('Living terrain surface',verts,topfaces,ground)
        for ring in data['rings']:
            for x,y,z in ring['crossings']:
                bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.018,location=(x,-.16,z+.007))
                bpy.context.object.name='Contour crossing'; bpy.context.object.data.materials.append(ink)
        camera((0,-8,2.6),(0,0,.65),6.3)
        ends=[project((pts[0][0],-.15,-.13)),project((pts[-1][0],-.15,-.13))]
        for h in (20,40,60,80): labels.append({'text':str(h),'point':project((-2.32,-.15,h/55))})
    bpy.context.view_layer.update()
    # Re-project only after dependency graph evaluates the final camera pose.
    if is_relief:
        labels=[{'text':str(r['height']),'point':project([*r['label'][:2],r['label'][2]+.04])} for r in data['rings'] if r['height'] in ([10,30] if kind=='gentle' else [10,50])]
        ends=[project(pts[0]),project(pts[-1])]
    else:
        labels=[{'text':str(h),'point':project((-2.32,-.15,h/55))} for h in (20,40,60,80)]
        ends=[project((pts[0][0],-.15,-.13)),project((pts[-1][0],-.15,-.13))]
    sc.render.filepath=os.path.join(OUT,kind+'-'+mode+'.png')
    bpy.context.preferences.filepaths.save_version=0
    source_path=os.path.join(SOURCE_OUT if is_relief else OUT,kind+'-'+mode+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=source_path,compress=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_as_mainfile(filepath=source_path,compress=True)
    bpy.ops.render.render(write_still=True)
    return {'labels':labels,'ends':ends}

if __name__ == '__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    for kind in (args or list(GEOMETRY)):
        meta={mode:render(kind,mode,GEOMETRY[kind]) for mode in ('relief','section')}
        json.dump(meta,open(os.path.join(OUT,kind+'-labels.json'),'w'),indent=2)
    print('DENSITY RENDERS COMPLETE',flush=True)
