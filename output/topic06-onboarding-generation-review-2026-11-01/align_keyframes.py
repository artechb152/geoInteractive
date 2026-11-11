from pathlib import Path
import math, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'topic06-onboarding-generated-2026-11-01'
NAMES = ['F00-terrain-base.png','F01-route-planning.png','F02-departure-direction.png','F03-position-check.png','F04-destination-verification.png']
src = [Image.open(HERE / ('original-'+n)).convert('RGB') for n in NAMES]
W,H = src[0].size
S=3
ORANGE=(217,126,43,255)

def orange_mask(im):
    a=np.asarray(im).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    m=(r>160)&(r-g>45)&(g-b>28)&(b<145)&((r-b)>100)
    return Image.fromarray((m*255).astype('uint8'))

def polygon_mask(points, blur=0):
    m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon(points, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

def person_mask(im,box,paper,face=None):
    a=np.asarray(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    x0,y0,x1,y1=box
    blue=(b>r*1.08)&(g>r*1.08)&(b>g*.94)&(b>28)
    region=np.zeros((H,W),bool);region[y0:y1,x0:x1]=True
    m=Image.fromarray((blue&region).astype('uint8')*255).filter(ImageFilter.MaxFilter(3))
    d=ImageDraw.Draw(m);d.polygon(paper,fill=255)
    if face:d.ellipse(face,fill=255)
    # Fill small holes inside the connected clothing silhouette.
    flood=m.copy();ImageDraw.floodfill(flood,(0,0),128)
    ar=np.asarray(flood);m=Image.fromarray(np.where(ar==128,0,255).astype('uint8'))
    return m.filter(ImageFilter.GaussianBlur(.45))

p0=Image.open(HERE/'p0-mask.png') if (HERE/'p0-mask.png').exists() else person_mask(src[0],(200,580,345,830),[(277,623),(335,637),(313,674),(273,655)],(268,615,286,640))
p3=Image.open(HERE/'p3-mask.png') if (HERE/'p3-mask.png').exists() else person_mask(src[3],(995,487,1070,607),[(1037,512),(1066,518),(1054,540),(1033,530)],(1028,503,1040,518))
p4=Image.open(HERE/'p4-mask.png') if (HERE/'p4-mask.png').exists() else person_mask(src[4],(1468,341,1520,419),[(1497,354),(1516,357),(1507,379),(1497,372)],(1486,350,1499,364))
for tag,mask in [('p0',p0),('p3',p3),('p4',p4)]:
    mask.save(HERE/(tag+'-mask.png'))
    print(tag,mask.getbbox(),int((np.asarray(mask)>128).sum()),flush=True)

# A single restored photographic background is shared by all five states.
remove=polygon_mask([(170,566),(361,566),(361,844),(170,844)],12)
shadow=polygon_mask([(70,822),(229,785),(297,811),(254,839),(90,865)],6)
remove=ImageChops.lighter(remove,shadow)
o3=np.asarray(orange_mask(src[3]).filter(ImageFilter.MaxFilter(11)))>0
o4=np.asarray(orange_mask(src[4]).filter(ImageFilter.MaxFilter(11)))>0
# Clone equally lit, same-depth ground from the original photograph, avoiding
# the generative drafts' soft inpainted soil. Only the former actor region and
# its shadow are restored; the hill, palms, roads and building are untouched.
replacement=np.roll(np.asarray(src[0]),-250,axis=1).copy()
clean=Image.composite(Image.fromarray(replacement),src[0],remove)

def canvas():return Image.new('RGBA',(W*S,H*S))
def line(draw,points,fill,width):
    draw.line([(round(x*S),round(y*S)) for x,y in points],fill=fill,width=round(width*S),joint='curve')
def ellipse(draw,box,fill=None,outline=None,width=1):
    draw.ellipse(tuple(round(x*S) for x in box),fill=fill,outline=outline,width=round(width*S))
def finish(layer):return layer.resize((W,H),Image.Resampling.LANCZOS)

def bezier(p0,p1,p2,p3,n=90):
    return [tuple((1-t)**3*p0[k]+3*(1-t)**2*t*p1[k]+3*(1-t)*t*t*p2[k]+t**3*p3[k] for k in (0,1)) for t in np.linspace(0,1,n)]
route=bezier((250,810),(252,766),(273,736),(315,720))+bezier((315,720),(512,647),(772,628),(1065,588))+bezier((1065,588),(1235,567),(1346,556),(1403,514))+bezier((1403,514),(1450,478),(1453,429),(1485,404))

def ribbon_polygon(points,width0,width1,offset=0):
    p=np.asarray(points,float);tangent=np.gradient(p,axis=0);norm=np.sqrt((tangent*tangent).sum(axis=1));normal=np.stack([-tangent[:,1],tangent[:,0]],axis=1)/norm[:,None]
    widths=np.linspace(width0,width1,len(p))[:,None]/2
    q=np.vstack([p+normal*widths,p[::-1]-normal[::-1]*widths[::-1]])
    return [(float(x)*S,float(y+offset)*S) for x,y in q]

shared=canvas();d=ImageDraw.Draw(shared)
d.polygon(ribbon_polygon(route,20,12,3),fill=(109,60,20,100))
d.polygon(ribbon_polygon(route,18,10),fill=ORANGE)
line(d,[(x,y-2.5) for x,y in route],(250,177,95,220),1.2)
for cx,cy,rx,ry in [(1065,588,36,14),(1450,465,30,12)]:
    ellipse(d,(cx-rx,cy-ry+3,cx+rx,cy+ry+3),outline=(99,55,22,105),width=9)
    ellipse(d,(cx-rx,cy-ry,cx+rx,cy+ry),outline=ORANGE,width=8)
    ellipse(d,(cx-rx+4,cy-ry+4,cx+rx-4,cy+ry-4),outline=(255,236,198,245),width=1.8)
shared=finish(shared)
shared.save(HERE/'canonical-route-and-checkpoints.png')

def diamond(filled=False):
    im=canvas();d=ImageDraw.Draw(im);pts=[(1485,384),(1505,404),(1485,424),(1465,404),(1485,384)]
    if filled:d.polygon([(x*S,y*S) for x,y in pts],fill=ORANGE)
    line(d,pts,ORANGE,6)
    inside=[(1485,388),(1501,404),(1485,420),(1469,404),(1485,388)]
    line(d,inside,(255,238,206,255),1.7)
    return finish(im)

def composite(base,layer):return Image.alpha_composite(base.convert('RGBA'),layer.convert('RGBA'))
def put_person(base,im,mask,dx=0,dy=0):
    obj=im.copy().convert('RGBA');obj.putalpha(mask)
    shifted=Image.new('RGBA',(W,H));shifted.paste(obj,(dx,dy))
    return composite(base,shifted)

def add_ground_shadow(base,cx,cy,rx=13,ry=4):
    layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer);d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=(45,35,24,70))
    return composite(base,layer.filter(ImageFilter.GaussianBlur(2)))

states=[]
states.append(put_person(clean,src[0],p0))

# Alternative is a terrain-conforming, dashed gray teaching line.
alt=canvas();ad=ImageDraw.Draw(alt)
ap=bezier((250,810),(320,630),(625,350),(880,140))+bezier((880,140),(1060,192),(1300,280),(1485,404))
distance=0
for i in range(1,len(ap)):
    distance+=math.dist(ap[i-1],ap[i])
    if distance%42<25:line(ad,[ap[i-1],ap[i]],(211,214,210,255),9)
plan=composite(clean,finish(alt));plan=composite(plan,shared);plan=composite(plan,diamond());plan=put_person(plan,src[0],p0)
states.append(plan)

departure=composite(clean,shared);departure=composite(departure,diamond())
compass_mask=polygon_mask([(576,725),(694,699),(1037,651),(1075,665),(1118,756),(1112,800),(1067,834),(740,897),(606,868),(568,816)])
cm=Image.new('L',(W,H));ImageDraw.Draw(cm).ellipse((572,680,895,884),fill=255)
compass_mask=ImageChops.lighter(compass_mask,cm).filter(ImageFilter.GaussianBlur(.65))
compass=src[2].convert('RGBA');compass.putalpha(compass_mask);departure=composite(departure,compass)
start=canvas();sd=ImageDraw.Draw(start);ellipse(sd,(178,780,325,827),outline=(25,145,217,255),width=11)
# A short arrow follows the initial straight leg, independently of magnetic north.
arrow=[(507,653),(533,654),(565,653),(546,670),(535,685),(532,674),(510,678)]
sd.polygon([(x*S,y*S) for x,y in arrow],fill=ORANGE)
departure=composite(departure,finish(start));departure=put_person(departure,src[0],p0);states.append(departure)

checking=composite(clean,shared);checking=composite(checking,diamond())
landmarks=canvas();ld=ImageDraw.Draw(landmarks)
hill_left=bezier((250,210),(160,250),(165,300),(230,330))+bezier((230,330),(330,385),(500,415),(580,418))
hill_right=bezier((1035,190),(1155,225),(1240,295),(1110,348))+bezier((1110,348),(1010,393),(880,411),(760,418))
for arc in [hill_left,hill_right]:
    line(ld,arc,ORANGE,8);line(ld,arc,(255,231,190,240),1.5)
for bracket in [[(965,420),(932,420),(932,453)],[(1090,420),(1133,420),(1133,453)],[(932,514),(932,545),(965,545)],[(1090,545),(1133,545),(1133,514)]]:
    line(ld,bracket,ORANGE,8);line(ld,bracket,(255,231,190,240),1.5)
checking=composite(checking,finish(landmarks))
checking=add_ground_shadow(checking,1065,596)
checking=put_person(checking,src[3],p3,34,-6);states.append(checking)

arrival=composite(clean,shared)
# Thin identification traces follow the three pre-existing path arms.
acc=canvas();acd=ImageDraw.Draw(acc)
for pts in [[(1485,404),(1450,368),(1410,341),(1378,300),(1342,270),(1325,250),(1312,220),(1300,200),(1275,180),(1252,160)],[(1485,404),(1530,389),(1580,375),(1630,359),(1671,347)],[(1485,404),(1470,442),(1455,480),(1446,508),(1445,535)]]:
    line(acd,pts,(217,126,43,235),4)
arrival=composite(arrival,finish(acc))
building=canvas();bd=ImageDraw.Draw(building)
outline=[(1458,321),(1480,313),(1480,283),(1519,270),(1587,281),(1587,300),(1607,302),(1615,317),(1602,334),(1543,341),(1494,334),(1458,321)]
line(bd,outline,ORANGE,4)
arrival=composite(arrival,finish(building))
arrival=composite(arrival,diamond(True));arrival=add_ground_shadow(arrival,1485,410,9,3)
arrival=put_person(arrival,src[4],p4,-3,-4);states.append(arrival)

for name,im in zip(NAMES,states):im.convert('RGB').save(OUT/name)

# Exact shared-layer identity is recorded, alongside landmark coordinates.
report={'method':'User-authorized deterministic compositing over one common photographic background','canvas':[W,H],'route_start':[250,810],'checkpoints':[[1065,588],[1450,465]],'destination':[1485,404],'same_route_layer_in':['F01','F02','F03','F04'],'person_translations':{'F03':[34,-6],'F04':[-3,-4]},'remaining_note':'Actor clothing details come from generated source images; no claim of surveyed geographic accuracy.'}
(HERE/'alignment-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
preview=Image.new('RGB',(1254,534),(243,233,220));pd=ImageDraw.Draw(preview)
for i,im in enumerate(states):
    x=(i%3)*418;y=(i//3)*267
    preview.paste(im.convert('RGB').resize((418,235),Image.Resampling.LANCZOS),(x,y+25));pd.text((x+10,y+6),f'F0{i}',fill=(56,67,46))
preview.save(OUT/'preview-five-frames.jpg',quality=94)
print(json.dumps(report))
