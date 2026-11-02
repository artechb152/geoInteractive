from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
here=Path(__file__).resolve().parent
out=here.parent/'topic06-onboarding-generated-2026-11-01'
names=['F00-terrain-base.png','F01-route-planning.png','F02-departure-direction.png','F03-position-check.png','F04-destination-verification.png']
assert len(list(out.glob('*.png')))==5
images=[Image.open(out/n).convert('RGB') for n in names]
assert all(im.size==(1672,941) for im in images)
arrays=[np.asarray(im) for im in images]
alpha=np.asarray(Image.open(here/'canonical-route-and-checkpoints.png'))[:,:,3]
yy,xx=np.indices(alpha.shape)
mask=(alpha>250)&(xx>400)&(xx<1300)&(yy>560)
mask &= ~((xx>480)&(xx<580)&(yy<710))
mask &= ~((xx>1020)&(xx<1120)&(yy<615))
assert mask.sum()>3000
for a in arrays[2:]:assert np.array_equal(arrays[1][mask],a[mask]),'Shared route pixels differ'
patches={'hill_summit':(350,100,720,190),'palm_fronds':(980,450,1120,485),'building_roof':(1490,287,1550,300)}
for label,(x0,y0,x1,y1) in patches.items():
    reference=arrays[0][y0:y1,x0:x1]
    assert all(np.array_equal(reference,a[y0:y1,x0:x1]) for a in arrays[1:]),label+' changed'
motion=['A01-planning.txt','A02-direction.txt','A03-position-check.txt','A04-destination.txt']
for i,n in enumerate(motion):
    text=(out/n).read_text(encoding='utf8')
    assert 'Start frame: '+names[i] in text
    assert 'End frame: '+names[i+1] in text
    assert len(text)>1000
assets=[]
for n in names:
    data=(out/n).read_bytes();assets.append({'name':n,'width':1672,'height':941,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
report={'status':'verified final aligned image set','image_count':5,'motion_prompt_count':4,'same_canvas':[1672,941],'shared_route_pixels_compared':int(mask.sum()),'shared_route_identical':True,'fixed_landmark_patches':list(patches),'landmark_patches_pixel_identical':True,'anchors':{'start':[250,810],'checkpoints':[[1065,588],[1450,465]],'destination':[1485,404]},'images':assets,'motion_prompts':motion,'visual_review':'Five-frame contact sheet, full departure/checking/arrival images, actor cutouts and restored ground inspected.','videos_generated':False,'site_code_changed':False,'production_note':'Flow video output still needs inspection after generation; images alone do not guarantee video consistency.'}
(out/'03-delivery-check.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k not in ['images','motion_prompts']},indent=2))
