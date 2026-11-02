from pathlib import Path
from PIL import Image
import numpy as np
root = Path(__file__).resolve().parents[1] / 'topic06-onboarding-generated-2026-11-01'
review = Path(__file__).resolve().parent
for name in ['F00-terrain-base.png','F01-route-planning.png','F02-departure-direction.png','F03-position-check.png','F04-destination-verification.png']:
    target = review / ('original-' + name)
    if not target.exists():
        target.write_bytes((root / name).read_bytes())
for name, box, scale in [('F03-position-check.png',(975,470,1095,620),4),('F04-destination-verification.png',(1450,330,1550,435),5)]:
    im = Image.open(root / name).convert('RGB')
    crop = im.crop(box)
    crop.resize((crop.width*scale,crop.height*scale)).save(review / (name[:3]+'-person-detail.png'))
    print(name, 'crop', box)
