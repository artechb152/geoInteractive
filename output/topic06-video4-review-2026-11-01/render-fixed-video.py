from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageChops
import numpy as np,json,math,sys,subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OUT=HERE.parent/'topic06-onboarding-video4-fixed-2026-11-01';OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(HERE/'video-deps'))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
align=HERE.parent/'topic06-onboarding-generation-review-2026-11-01'/'align_keyframes.py'
# Reuse the approved scene's layers without exporting or changing its images.
code=align.read_text(encoding='utf8').split('for name,im in zip(NAMES,states):')[0]
ns={'__file__':str(align),'__name__':'video_scene_layers'};exec(compile(code,str(align),'exec'),ns)
W,H=ns['W'],ns['H'];FPS=24;DURATION=8;COUNT=FPS*DURATION
composite=ns['composite'];finish=ns['finish']
base=composite(composite(ns['clean'],ns['shared']),ns['diamond']())
early=finish(ns['landmarks']);late=composite(finish(ns['acc']),finish(ns['building']))
filled=ns['diamond'](True)
first=ns['checking'].convert('RGB');last=ns['arrival'].convert('RGB')
assert ImageChops.difference(first,Image.open(HERE.parent/'topic06-onboarding-generated-2026-11-01'/'F03-position-check.png').convert('RGB')).getbbox() is None
assert ImageChops.difference(last,Image.open(HERE.parent/'topic06-onboarding-generated-2026-11-01'/'F04-destination-verification.png').convert('RGB')).getbbox() is None

def static_sprite(src,mask,feet,body_height):
    box=mask.getbbox();im=src.convert('RGBA');im.putalpha(mask)
    return {'image':im.crop(box),'feet':[feet[0]-box[0],feet[1]-box[1]],'body_height':body_height}
start_sprite=static_sprite(ns['src'][3],ns['p3'],(1031,601),108)
end_sprite=static_sprite(ns['src'][4],ns['p4'],(1488,412),70)
walkdata=json.loads((HERE/'walk'/'index.json').read_text())['frames']
sprites=[{**r,'image':Image.open(HERE/'walk'/r['file']).convert('RGBA')} for r in walkdata]

def layer_for(sprite,position,height):
    scale=height/sprite['body_height'];im=sprite['image']
    size=(max(1,round(im.width*scale)),max(1,round(im.height*scale)))
    im=im.resize(size,Image.Resampling.LANCZOS)
    x=round(position[0]-sprite['feet'][0]*scale);y=round(position[1]-sprite['feet'][1]*scale)
    layer=Image.new('RGBA',(W,H));layer.paste(im,(x,y))
    return layer

def pose_for_matching(sprite):
    im=sprite['image'];scale=100/sprite['body_height']
    im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))))
    c=Image.new('RGBA',(120,130));c.paste(im,(round(55-sprite['feet'][0]*scale),round(120-sprite['feet'][1]*scale)))
    return np.asarray(c.getchannel('A')).astype(float)/255
pose0=pose_for_matching(sprites[0]);scores=[]
for i in range(22,min(56,len(sprites))):
    pose=pose_for_matching(sprites[i]);scores.append((float(np.abs(pose[55:]-pose0[55:]).mean()),i))
score,period=min(scores)
cycle=sprites[:period]
print(json.dumps({'cycle_frames':period,'cycle_match_error':score}),flush=True)

route=np.asarray(ns['route'][180:],float)
dists=np.concatenate([[0],np.cumsum(np.linalg.norm(np.diff(route,axis=0),axis=1))]);length=dists[-1]
def progress(t):
    elapsed=max(0,min(6.2,t-.35));T=6.2;rin=.45;rout=.55
    if elapsed<rin:distance=.5*(elapsed-rin/math.pi*math.sin(math.pi*elapsed/rin))
    elif elapsed<T-rout:distance=elapsed-rin/2
    else:
        u=elapsed-(T-rout)
        distance=T-rout-rin/2+.5*(u+rout/math.pi*math.sin(math.pi*u/rout))
    return distance/(T-(rin+rout)/2)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def fade(layer,alpha):
    if alpha>=.999:return layer
    out=layer.copy();out.putalpha(layer.getchannel('A').point(lambda x:round(x*max(0,alpha))))
    return out

source='C:/Users/idog2/Downloads/Navigator_walking_orange_route_t…_b9d51d6e.mp4'
video=OUT/'transition-4-fixed.mp4'
command=[ffmpeg,'-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','pipe:0','-i',source,'-map','0:v:0','-map','1:a?','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','copy','-t',str(DURATION),'-movflags','+faststart',str(video)]
encoder=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
snapshots=[];track=[]
snapshot_indices={0,12,24,36,48,60,72,84,96,108,120,132,144,156,168,191}
for frame_index in range(COUNT):
    t=frame_index/FPS;p=progress(t)
    x=float(np.interp(p*length,dists,route[:,0]));y=float(np.interp(p*length,dists,route[:,1]))+7-3*p
    height=108*(1-p)+70*p
    if t<.35:x,y=1065.,595.
    if t>=6.55:x,y=1485.,408.
    scene=base.copy()
    scene=composite(scene,fade(early,1-smooth((t-.1)/.8)))
    if t>=6.65:scene=composite(scene,fade(late,smooth((t-6.65)/.6)))
    if t>=7.35:scene=composite(scene,fade(filled,smooth((t-7.35)/.3)))
    scene=ns['add_ground_shadow'](scene,x,y+1+p,13-4*p,4-p)
    if t<.35:
        person=layer_for(start_sprite,(x,y),108)
    elif t<6.55:
        elapsed=t-.35
        phase=int(elapsed*FPS)%len(cycle)
        person=layer_for(cycle[phase],(x,y),height)
        if elapsed<.18:
            standing=layer_for(start_sprite,(x,y),height)
            person=Image.blend(standing,person,smooth(elapsed/.18))
    else:
        person=layer_for(end_sprite,(1485,408),70)
        if t<6.75:
            previous=layer_for(cycle[int(6.2*FPS)%len(cycle)],(1485,408),70)
            person=Image.blend(previous,person,smooth((t-6.55)/.2))
    scene=composite(scene,person).convert('RGB')
    if frame_index==0:scene=first.copy()
    if t>=7.8:scene=last.copy()
    out=scene.resize((1280,720),Image.Resampling.LANCZOS)
    encoder.stdin.write(out.tobytes())
    track.append({'frame':frame_index,'time':round(t,5),'x':round(x,4),'y':round(y,4),'progress':round(p,6),'actor_count':1})
    if frame_index in snapshot_indices:
        file=OUT/f'check-{frame_index:03}.jpg';out.save(file,quality=92);snapshots.append((t,out.copy()))
encoder.stdin.close();stderr=encoder.stderr.read().decode(errors='replace');exitcode=encoder.wait()
if exitcode:raise RuntimeError(stderr)
assert all(track[i+1]['progress']>=track[i]['progress'] for i in range(len(track)-1))
assert all(track[i+1]['x']>=track[i]['x']-.01 for i in range(len(track)-1))
(OUT/'motion-check.json').write_text(json.dumps({'status':'rendered','fps':FPS,'frames':COUNT,'duration':DURATION,'same_background':True,'same_route':True,'actor_count':1,'route_progress_monotonic':True,'gait_source':'Clean walk segment from user supplied video','source_gait_period_frames':period,'positions':track},indent=2))
sheet=Image.new('RGB',(4*384,4*240),(243,233,220));d=ImageDraw.Draw(sheet)
for i,(t,im) in enumerate(snapshots):
    x=(i%4)*384;y=(i//4)*240;sheet.paste(im.resize((384,216)),(x,y+22));d.text((x+7,y+5),f'{t:.2f} s',fill=(40,40,35))
sheet.save(OUT/'timeline-fixed.jpg',quality=94)
print(json.dumps({'video':str(video),'bytes':video.stat().st_size,'frames':COUNT,'duration':DURATION,'one_actor':True,'monotonic_progress':True}),flush=True)
