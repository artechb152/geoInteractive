from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,json,sys,subprocess
p=Path(__file__).resolve().parent
sys.path.insert(0,str(p/'video-deps'))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
source=Path('C:/Users/idog2/Downloads/Navigator_walking_orange_route_t…_b9d51d6e.mp4')
fps=24;W=1280;H=720
(p/'walk').mkdir(exist_ok=True)
proc=subprocess.Popen([ffmpeg,'-v','error','-i',str(source),'-an','-vf',f'fps={fps}','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
records=[]
def components(mask):
    ys,xs=np.where(mask);remaining=set(zip(xs.tolist(),ys.tolist()));groups=[]
    while remaining:
        start=remaining.pop();stack=[start];group=[start]
        while stack:
            x,y=stack.pop()
            for dx,dy in [(-1,0),(1,0),(0,1),(0,-1),(-1,-1),(1,1),(-1,1),(1,-1)]:
                n=(x+dx,y+dy)
                if n in remaining:remaining.remove(n);stack.append(n);group.append(n)
        if len(group)>8:groups.append(group)
    return sorted(groups,key=len,reverse=True)
index=0
while True:
    data=proc.stdout.read(W*H*3)
    if len(data)!=W*H*3:break
    t=index/fps;index+=1
    if t<1.25 or t>3.8:continue
    im=Image.frombytes('RGB',(W,H),data);roi=im.crop((300,280,1000,560));a=np.asarray(roi).astype(float)
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    blue=(b>r*1.3)&(g>r*1.17)&(b>g*.95)&(b>30)
    groups=components(blue)
    if not groups:continue
    main=np.asarray(groups[0]);cx=main[:,0].mean();cy=main[:,1].mean()
    chosen=[group for group in groups if abs(np.asarray(group)[:,0].mean()-cx)<35 and abs(np.asarray(group)[:,1].mean()-cy)<85]
    pts=np.concatenate([np.asarray(g) for g in chosen]);xmin,ymin=pts.min(axis=0);xmax,ymax=pts.max(axis=0)
    # Keep a compact crop, with space for the pale map just ahead of the hands.
    box=(int(xmin)+300-4,int(ymin)+280-3,int(xmax)+300+15,int(ymax)+280+4)
    crop=im.crop(box);mask=Image.new('L',crop.size)
    d=ImageDraw.Draw(mask)
    for x,y in pts:d.point((int(x)+300-box[0],int(y)+280-box[1]),fill=255)
    mask=mask.filter(ImageFilter.MaxFilter(3))
    # Preserve the small paper held in front of the chest; restrict it to the
    # hand area rather than including the ground between the moving legs.
    h=ymax-ymin;mx=int(xmax)+300-box[0]
    d=ImageDraw.Draw(mask)
    d.polygon([(mx-5,int(.23*h)+3),(mx+10,int(.26*h)+3),(mx+5,int(.45*h)+3),(mx-8,int(.43*h)+3)],fill=255)
    top=pts[pts[:,1]<ymin+.18*h]
    headx=float(np.median(top[:,0]))+300-box[0]
    d.rectangle((headx-5,3+.09*h,headx+5,3+.29*h),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(.45))
    rgba=crop.convert('RGBA');rgba.putalpha(mask)
    name=f'walk-{len(records):03}.png';rgba.save(p/'walk'/name)
    hip=pts[(pts[:,1]>ymin+.4*h)&(pts[:,1]<ymin+.65*h)]
    feet=(float(np.median(hip[:,0]))+300-box[0],float(ymax)+280-box[1])
    records.append({'time':round(t,5),'file':name,'box':box,'feet':feet,'body_height':int(h),'blue_area':len(pts)})
proc.wait()
(p/'walk'/'index.json').write_text(json.dumps({'fps':fps,'frames':records},indent=2))
preview=Image.new('RGB',(800,600),(240,230,215));d=ImageDraw.Draw(preview)
for i,j in enumerate([0,len(records)//4,len(records)//2,len(records)*3//4,len(records)-1]):
    record=records[j];im=Image.open(p/'walk'/record['file']);im.thumbnail((140,540));im=im.resize((im.width*3,im.height*3))
    x=i*160;preview.paste(im,(x,40),im);d.text((x+4,12),str(record['time'])+'s',fill='black')
preview.save(p/'walk-cutout-preview.png')
print(json.dumps({'frames':len(records),'first':records[0],'last':records[-1],'ffmpeg':ffmpeg}))
