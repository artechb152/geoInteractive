import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://localhost:3058';
const A='[data-activity="navigation-replay"]';
const out='design/screenshots/navigation-replay-walk-2026-11-01';
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
test.after(()=>browser.close());
async function open(options={}){
 const p=await browser.newPage({viewport:{width:1440,height:1122},deviceScaleFactor:1,...options});
 await p.goto(`${base}/lessons/topic-06/#scene-tips`,{waitUntil:'domcontentloaded',timeout:180000});
 await p.locator(A).waitFor({timeout:180000});
 await p.locator('[data-tips-screen="nav"]').scrollIntoViewIfNeeded();
 await align(p);
 return p;
}
const ready=p=>p.waitForSelector(`${A} [data-view-frame][data-ready]`,{timeout:180000});
const click=(p,s)=>p.locator(`${A} ${s}`).click();
const active=p=>p.locator(A).getAttribute('data-active');
const idle=p=>p.waitForSelector(`${A}[data-travel="idle"]`,{timeout:20000});
const align=p=>p.evaluate(()=>window.scrollTo({top:document.querySelector('[data-tips-screen="nav"]').getBoundingClientRect().top+scrollY-104,behavior:'instant'}));

test('next terrain is ready before answering; real motion and the map agree; no loader at arrival',async()=>{
 const p=await open();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try{
  await ready(p);
  await p.waitForFunction(()=>window.__replayPreparation?.().ready.includes('approach'),null,{timeout:60000});
  await mkdir(out,{recursive:true});
  await p.evaluate(()=>{window.__frames=[];window.__positions=[];let last=performance.now();const sample=t=>{if(document.querySelector('[data-activity="navigation-replay"]')?.getAttribute('data-travel')==='walking'){window.__frames.push(t-last);window.__positions.push(window.__replayEye);}last=t;requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  await click(p,'[data-action="depart"]');
  await p.waitForSelector(`${A}[data-travel="walking"]`,{timeout:20000});
  assert.equal(await active(p),'depart','source reading stays until arrival');
  assert.equal(await p.locator(`${A} [data-decision]`).count(),0);
  assert.equal(await p.locator(`${A} [data-walking-estimate]`).count(),1);
  await align(p);
  await p.screenshot({path:`${out}/01-walking-to-enroute.png`});
  await idle(p);assert.equal(await active(p),'enroute');await ready(p);
  assert.equal(await p.locator(`${A} [data-loading]`).count(),0);
  const samples=await p.evaluate(()=>({frames:window.__frames,positions:window.__positions,cache:window.__replayPreparation()}));
  assert.ok(samples.positions.length>30);
  assert.ok(Math.hypot(samples.positions.at(-1).x-samples.positions[0].x,samples.positions.at(-1).z-samples.positions[0].z)>50);
  assert.ok(samples.positions.every(s=>Math.abs(s.y-s.ground-1.7)<1e-6));
  const times=samples.frames.sort((a,b)=>a-b);samples.performance={medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)]};
  await writeFile(`${out}/motion-report.json`,JSON.stringify(samples,null,2));
  await click(p,'[data-choice="continue"]');await click(p,'[data-option="landmark"]');await click(p,'[data-action="next"]');
  await p.waitForSelector(`${A}[data-travel="walking"]`);await align(p);await p.waitForTimeout(2300);await p.screenshot({path:`${out}/02-walking-to-saddle.png`});
  await idle(p);assert.equal(await active(p),'saddle');await ready(p);
  await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>document.activeElement?.hasAttribute('data-prompt')),true);
  await p.screenshot({path:`${out}/03-arrived-saddle.png`});
  await click(p,'[data-choice="check"]');await click(p,'[data-option="combined"]');await click(p,'[data-action="next"]');
  await idle(p);assert.equal(await active(p),'after');await ready(p);
  assert.equal(await p.locator(`${A} [data-truth]`).count(),0,'the hidden turn is never animated/revealed');
  assert.ok((await p.evaluate(()=>window.__replayPreparation().size))<=3);
  assert.deepEqual(errors,[]);
 }finally{await p.close();}
});
test('skip, reset and timeline interrupt travel without a late arrival changing the answer',async()=>{
 const p=await open();try{
  await ready(p);await click(p,'[data-action="depart"]');await p.waitForSelector(`${A} [data-skip-walk]`);
  await click(p,'[data-skip-walk]');await idle(p);assert.equal(await active(p),'enroute');await ready(p);
  await click(p,'[data-choice="check"]');await click(p,'[data-action="next"]');await p.waitForSelector(`${A}[data-travel="walking"]`);
  await click(p,'[data-reset]');await idle(p);assert.equal(await active(p),'depart');await ready(p);
  await click(p,'[data-action="depart"]');await p.waitForSelector(`${A}[data-travel="walking"]`);
  await click(p,'[data-moment="after"]');await idle(p);await ready(p);assert.equal(await active(p),'after');
  await p.waitForTimeout(3100);assert.equal(await active(p),'after');
  assert.equal(await p.locator(`${A} [data-truth]`).count(),0);
 }finally{await p.close();}
});
test('reduced motion and WebGL fallback advance immediately and remain completable',async()=>{
 for(const fallback of [false,true]){
  const p=await open({reducedMotion:'reduce'});try{
   if(!fallback)await ready(p);
   else {await p.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:orig.call(this,type,...args);};});await p.reload();await p.locator(`${A} [data-fallback]`).waitFor({timeout:60000});}
   await click(p,'[data-action="depart"]');await idle(p);assert.equal(await active(p),'enroute');
   assert.equal(await p.locator(`${A} [data-skip-walk]`).count(),0);
  }finally{await p.close();}
 }
});
test('cancelling during PREPARATION immediately restores the already drawn departure view',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:1122}});
 try{
  await p.addInitScript(()=>{const schedule=window.setTimeout;window.setTimeout=function(fn,ms,...args){return schedule(fn,ms===180?60000:ms,...args);};});
  await p.goto(`${base}/lessons/topic-06/#scene-tips`,{waitUntil:'domcontentloaded',timeout:180000});
  await p.locator(A).waitFor({timeout:180000});await p.locator('[data-tips-screen="nav"]').scrollIntoViewIfNeeded();await align(p);await ready(p);
  await click(p,'[data-action="depart"]');await p.waitForSelector(`${A}[data-travel="preparing"]`);
  await click(p,'[data-reset]');await idle(p);
  await p.waitForSelector(`${A} [data-view-frame][data-ready]`,{timeout:1500});
  assert.equal(await p.locator(`${A} [data-loading]`).count(),0);
 }finally{await p.close();}
});
test('visiting and revisiting CPU-cached worlds releases the previous terrain GPU allocation',async()=>{
 const p=await open({reducedMotion:'reduce'});try{
  await ready(p);const baseline=await p.evaluate(()=>window.__replayGpu());
  for(const id of ['enroute','after','depart','saddle','after']){
   await click(p,`[data-moment="${id}"]`);await ready(p);await p.waitForTimeout(400);
   const info=await p.evaluate(()=>window.__replayGpu());
   assert.ok(info.geometries<=baseline.geometries,`${id}: ${info.geometries} geometries retained vs ${baseline.geometries} at departure`);
  }
 }finally{await p.close();}
});
test('the walking status and skip control fit 1920×910; motion stays live at desktop size',async()=>{
 const p=await open({viewport:{width:1920,height:910}});try{
  await ready(p);await p.waitForFunction(()=>window.__replayPreparation?.().ready.includes('approach'),null,{timeout:60000});
  await click(p,'[data-action="depart"]');await p.waitForSelector(`${A}[data-travel="walking"]`);await align(p);
  const b=await p.locator('[data-tips-screen="nav"]').boundingBox();assert.ok(b.y>=80&&b.y+b.height<=887);
  await p.waitForTimeout(900);await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/04-1920-walking.png`});
  assert.equal(await p.locator(`${A} [data-view-frame]`).getAttribute('data-mode'),'live');
  await click(p,'[data-skip-walk]');await idle(p);assert.equal(await active(p),'enroute');
 }finally{await p.close();}
});
