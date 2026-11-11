from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,sys,re
p=Path(__file__).resolve().parent
sys.path.insert(0,str(p.parent/'topic06-video4-review-2026-11-01/video-deps'))
import imageio_ffmpeg
exe=imageio_ffmpeg.get_ffmpeg_exe();root=p.parents[1]
sheet=Image.new('RGB',(1600,824),(243,233,220));d=ImageDraw.Draw(sheet);records=[]
for i in range(4):
    file=root/f'public/assets/video/topic-06/onboarding/transition-{i+1}-{i+2}.mp4'
    info=subprocess.run([exe,'-hide_banner','-i',str(file)],capture_output=True).stderr.decode(errors='replace')
    records.append({'file':str(file),'metadata':info})
    for j,t in enumerate([0,1,3,5,7.75]):
        raw=subprocess.check_output([exe,'-v','error','-ss',str(t),'-i',str(file),'-frames:v','1','-vf','scale=640:360','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        im=Image.frombytes('RGB',(640,360),raw);im.save(p/f'clip{i+1}-{t}.jpg',quality=95)
        x=j*320;y=i*206;sheet.paste(im.resize((320,180)),(x,y+24));d.text((x+6,y+6),f'Clip {i+1} / {t}s',fill=(40,40,35))
sheet.save(p/'four-videos-review.jpg',quality=95)
(p/'metadata.json').write_text(json.dumps(records,indent=2))
for r in records:
    print(Path(r['file']).name)
    print('\n'.join(line for line in r['metadata'].splitlines() if 'Video:' in line or 'Duration:' in line))
