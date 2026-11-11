/** Deterministic, north-up geometry guide for the training basemap.
 * The displayed photoreal asset is workbench-terrain-realistic.webp; this script
 * rebuilds only its source guide and never overwrites the approved illustration.
 * See design/docs/route-workbench-terrain.md for image provenance.
 * Geometry comes from the lesson model.
 * Run: node --experimental-strip-types scripts/maps/build-route-workbench.mjs
 * The raster contains terrain only; markers, tools, scale and labels are live SVG.
 */
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ROAD, STREAM, FEATURES, pathD, samplePath, distToLine } from '../../src/components/lessons/topic-06/route-story/routeStoryModel.ts';
// The surface itself is shared with the topographic view (build-route-workbench-layers.mjs).
import { hash, noise, clamp, fbm, gaussian, peaks, height, carved } from './route-workbench-relief.mjs';
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const W = 1980, H = 1380, SCALE = 15, X0 = -16;
// Reuse the site's actual ground albedo for fine earth detail, rather than new
// third-party imagery. Its luminance is tiled at two scales to hide repetition.
const ground = await sharp('public/embeds/terrain-3d/textures/terrain/albedo.jpg').resize(384,384).removeAlpha().raw().toBuffer();
const stream=samplePath(STREAM),road=samplePath(ROAD);
// Sample cartographic surface and drainage distance once, then interpolate for shading.
const GW=397,GH=277,step=1/3;
const heights=new Float32Array(GW*GH),water=new Float32Array(GW*GH),tracks=new Float32Array(GW*GH);
for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const x=X0+i*step,y=j*step,k=j*GW+i;water[k]=distToLine({x,y},stream);tracks[k]=distToLine({x,y},road);heights[k]=carved(height(x,y),water[k]);}
function sample(a,x,y){const gx=clamp((x-X0)/step,0,GW-1.001),gy=clamp(y/step,0,GH-1.001),i=Math.floor(gx),j=Math.floor(gy),u=gx-i,v=gy-j;return (a[j*GW+i]*(1-u)+a[j*GW+i+1]*u)*(1-v)+(a[(j+1)*GW+i]*(1-u)+a[(j+1)*GW+i+1]*u)*v;}
const pixels=Buffer.alloc(W*H*3);
for(let py=0;py<H;py++)for(let px=0;px<W;px++){
  const x=X0+px/SCALE,y=py/SCALE;
  const dx=(sample(heights,x+.18,y)-sample(heights,x-.18,y))/.36,dy=(sample(heights,x,y+.18)-sample(heights,x,y-.18))/.36;
  const shade=clamp(1-(dx+dy)*.023,.55,1.24);
  const coarse=fbm(x*.42,y*.42),fine=noise(x*9,y*9,27),grain=hash(px,py,33);
  const rocky=clamp(gaussian(x,y,88,16,9,7)*1.3+gaussian(x,y,peaks[0].x,peaks[0].y,4,4)*.8+gaussian(x,y,peaks[1].x,peaks[1].y,4,4)*.8);
  const patch=clamp((coarse-.37)*2);
  const base=[216,207,175].map((v,i)=>v-patch*[34,24,29][i]+rocky*[14,12,16][i]);
  const ti=((py%384)*384+(px%384))*3,ti2=((Math.floor(py*.41)%384)*384+(Math.floor(px*.41)%384))*3;
  const lum=ground[ti]*.3+ground[ti+1]*.59+ground[ti+2]*.11,lum2=ground[ti2]*.3+ground[ti2+1]*.59+ground[ti2+2]*.11;
  const detail=(fine-.5)*12+(grain-.5)*8+(noise(x*2.1,y*2.1,43)-.5)*14+(lum-135)*.3+(lum2-135)*.13;
  const k=(py*W+px)*3;
  for(let c=0;c<3;c++)pixels[k+c]=clamp((base[c]+detail)*shade,0,255);
}
const svg=[];
// Contours: marching triangles on exactly the same surface that is hillshaded.
for(let level=320;level<=480;level+=10){const paths=[];
  for(let y=0;y<GH-1;y++)for(let x=0;x<GW-1;x++){
    const vertices=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
    for(const tri of [[0,1,2],[0,2,3]]){const pts=[];
      for(let e=0;e<3;e++){const a=vertices[tri[e]],b=vertices[tri[(e+1)%3]],ha=heights[a[1]*GW+a[0]],hb=heights[b[1]*GW+b[0]];if((ha<=level&&hb>level)||(hb<=level&&ha>level)){const f=(level-ha)/(hb-ha);pts.push([X0+(a[0]+f*(b[0]-a[0]))*step,(a[1]+f*(b[1]-a[1]))*step]);}}
      if(pts.length===2)paths.push(`M${pts[0][0].toFixed(3)} ${pts[0][1].toFixed(3)}L${pts[1][0].toFixed(3)} ${pts[1][1].toFixed(3)}`);
    }
  }
  svg.push(`<path d="${paths.join('')}" fill="none" stroke="#8A6F4D" stroke-width="${level%50===0?.13:.065}" opacity="${level%50===0?.75:.58}"/>`);
}
// Real earth roads and a narrow water course; paths are the exact lesson geometry.
const streamD=`M-17 46L-3 47 ${pathD(STREAM).replace(/^M[^C]+/,'')} L117 82`,roadD=`M34 -1L49 15.5 ${pathD(ROAD).replace(/^M[^C]+/,'')} L117 71`;
svg.push(`<path d="${streamD}" fill="none" stroke="#8A8873" stroke-width="1.35" opacity=".5"/><path d="${streamD}" fill="none" stroke="#DCCDB2" stroke-width="1.05"/><path d="${streamD}" fill="none" stroke="#3d6b8e" stroke-width=".48" opacity=".7"/><path d="${streamD}" fill="none" stroke="#F6EFE6" stroke-width=".09" opacity=".6"/>`);
svg.push(`<path d="${roadD}" fill="none" stroke="#8A8873" stroke-width="1.2" opacity=".6"/><path d="${roadD}" fill="none" stroke="#DCCDB2" stroke-width=".92"/><path d="${roadD}" fill="none" stroke="#F3E9DC" stroke-width=".1" stroke-dasharray=".6 .4"/>`);
// Top-down natural tree crowns, with directional shadows and irregular leaf clusters.
function tree(x,y,r,k){
  svg.push(`<ellipse cx="${x+r*.6}" cy="${y+r*.7}" rx="${r*1.1}" ry="${r*.7}" fill="#38432E" opacity=".28"/>`);
  for(let n=0;n<14;n++){const a=hash(k,n,2)*Math.PI*2,rr=Math.sqrt(hash(k,n,3))*r*.65,lx=x+Math.cos(a)*rr,ly=y+Math.sin(a)*rr,sz=r*(.24+hash(k,n,4)*.23);const col=['#38432E','#4A5240','#5a6b4a','#5B7C5C','#7a8a3f'][Math.floor(hash(k,n,9)*5)];svg.push(`<circle cx="${lx}" cy="${ly}" r="${sz}" fill="${col}"/>`);}
}
for(let i=0;i<5300;i++){
  const x=X0+hash(i,14)*132,y=hash(i,15)*92,wd=sample(water,x,y),rd=sample(tracks,x,y);
  const grove=gaussian(x,y,FEATURES.grove.at.x,FEATURES.grove.at.y,5,4),target=gaussian(x,y,88.2,15.6,7,5);
  const density=.13+clamp((noise(x*.22,y*.22,71)-.5)*.75)+grove*1.3+target*.8;
  if(wd<.9||rd<.85||hash(i,16)>density)continue;
  tree(x,y,(grove+target>.25?.36:.15)+hash(i,17)*.32,i);
}
// Rocky destination: individual limestone fragments rather than a generic grove.
for(let i=0;i<260;i++){
  const a=hash(i,21)*Math.PI*2,r=Math.sqrt(hash(i,22));const x=88.2+Math.cos(a)*r*7.7,y=15.6+Math.sin(a)*r*6.2;
  const s=.1+hash(i,23)*.48;
  svg.push(`<path d="M${x-s} ${y}l${s*.7} ${-s*.7} ${s*1.1} ${s*.2} ${s*.4} ${s*.9} ${-s*1.2} ${s*.4}Z" fill="#8A8873" opacity=".8"/><path d="M${x-s} ${y}l${s*.7} ${-s*.7} ${s*1.1} ${s*.2} ${-s*.1} ${s*.5}Z" fill="#ECE4D2"/>`);
}
// Grid is deliberately quiet, like printed cartography.
for(let x=-10;x<=110;x+=10)svg.push(`<path d="M${x} 0V92" stroke="#4A5240" stroke-width=".05" opacity=".28"/>`);
for(let y=10;y<92;y+=10)svg.push(`<path d="M-16 ${y}H116" stroke="#4A5240" stroke-width=".05" opacity=".28"/>`);
for(const p of peaks){const h=Math.round(sample(heights,p.x,p.y));svg.push(`<g transform="translate(${p.x} ${p.y})"><path d="M0-.55L.5.35H-.5Z" fill="#38432E"/><text x="1" y=".6" text-anchor="start" font-family="Arial,sans-serif" font-size="1.7" font-weight="600" fill="#38432E">${h}</text></g>`);}
const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="-16 0 132 92">${svg.join('')}</svg>`);
await mkdir('public/assets/lessons/topic06/route-story',{recursive:true});
await sharp(pixels,{raw:{width:W,height:H,channels:3}}).composite([{input:overlay}]).webp({quality:90}).toFile('public/assets/lessons/topic06/route-story/workbench-terrain.webp');
console.log('Built 1980×1380 route workbench basemap from routeStoryModel geometry.');
