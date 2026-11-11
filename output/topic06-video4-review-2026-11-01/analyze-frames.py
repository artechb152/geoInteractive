from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np,json
p=Path(__file__).resolve().parent
metadata=json.loads((p/'frames.json').read_text())
frames=metadata['frames']
sheet=Image.new('RGB',(4*384,6*240),(243,233,220));d=ImageDraw.Draw(sheet)
tracks=[]
for i,entry in enumerate(frames):
    im=Image.open(p/entry['file']).convert('RGB');a=np.asarray(im).astype(float)
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    m=(b>r*1.4)&(g>r*1.25)&(b>g*.95)&(b>35)
    ys,xs=np.where(m)
    if len(xs):
        tracks.append({'time':entry['time'],'blue_pixels':len(xs),'bbox':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())],'centroid':[round(float(xs.mean()),1),round(float(ys.mean()),1)]})
    x=(i%4)*384;y=(i//4)*240
    sheet.paste(im.resize((384,216)),(x,y+22));d.text((x+8,y+5),str(entry['time'])+' s',fill=(40,40,35))
sheet.save(p/'timeline-full.jpg',quality=94)
selected=[0,.5,1,1.5,2,3,4,5,6,7,7.5,frames[-1]['time']]
zoom=Image.new('RGB',(3*496,4*320),(243,233,220));d=ImageDraw.Draw(zoom)
for i,time in enumerate(selected):
    entry=min(frames,key=lambda z:abs(z['time']-time));im=Image.open(p/entry['file']).crop((620,180,1240,550))
    x=(i%3)*496;y=(i//3)*320
    zoom.paste(im.resize((496,296)),(x,y+22));d.text((x+8,y+5),str(entry['time'])+' s',fill=(40,40,35))
zoom.save(p/'timeline-detail.jpg',quality=94)
(p/'blue-position-track.json').write_text(json.dumps(tracks,indent=2))
print(json.dumps(tracks))
