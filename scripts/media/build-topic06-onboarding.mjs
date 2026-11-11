import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const root='public/assets/scene-onboarding/topic-06';
const videos='public/assets/video/topic-06/onboarding';
fs.mkdirSync(videos,{recursive:true});fs.mkdirSync(`${root}/states`,{recursive:true});
const sources=['lesson06scene01.mp4','lesson06scene02.mp4','lesson06scene03.mp4','output/topic06-onboarding-video4-fixed-2026-11-01/transition-4-fixed.mp4'];
const states=['base','plan','start','travel','arrive'];const counts={};
for(let i=0;i<4;i++){
 const name=`transition-${i+1}-${i+2}`;const dest=`${videos}/${name}.mp4`;
 if(!fs.existsSync(dest))fs.copyFileSync(sources[i],dest);
 const dir=`${root}/transitions/${name}`;fs.mkdirSync(dir,{recursive:true});
 execFileSync(ffmpeg,['-y','-v','error','-i',dest,'-vf','fps=12,scale=1280:720','-c:v','libwebp','-f','image2','-quality','80',`${dir}/frame-%04d.webp`]);
 const files=fs.readdirSync(dir).filter(n=>n.endsWith('.webp')).sort();counts[name]=files.length;
 if(i===0)fs.copyFileSync(`${dir}/${files[0]}`,`${root}/states/state-1-base.webp`);
 fs.copyFileSync(`${dir}/${files.at(-1)}`,`${root}/states/state-${i+2}-${states[i+1]}.webp`);
}
// Pin each segment's first frame to the preceding resting image, so reverse
// playback and rapid accordion changes always meet at the same boundary.
for(let i=1;i<4;i++)fs.copyFileSync(`${root}/states/state-${i+1}-${states[i]}.webp`,`${root}/transitions/transition-${i+1}-${i+2}/frame-0001.webp`);
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({fps:12,counts,videos},null,2));
console.log(counts);
