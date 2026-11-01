import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE??'http://localhost:3048';
const out='design/screenshots/navigation-replay-polish-2026-11-01';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1920,height:910},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(`${base}/lessons/topic-06/#scene-tips`,{waitUntil:'domcontentloaded',timeout:180000});
const a=page.locator('[data-activity="navigation-replay"]');await a.waitFor({timeout:180000});
const align=()=>page.evaluate(()=>window.scrollTo({top:document.querySelector('[data-tips-screen="nav"]').getBoundingClientRect().top+scrollY-104,behavior:'instant'}));
const ready=id=>page.waitForFunction(id=>window.__replayStats?.station===id&&!document.querySelector('[data-activity="navigation-replay"] [data-loading]'),id,{timeout:180000});
const shots=[];
async function shot(label){await align();await page.waitForTimeout(300);const mode=await a.locator('[data-view-frame]').getAttribute('data-mode');assert.equal(mode,'live',`${label}: renderer stays live`);await page.screenshot({path:`${out}/${label}.png`});shots.push({label,mode,screen:await page.locator('[data-tips-screen="nav"]').boundingBox(),stats:await page.evaluate(()=>window.__replayStats)});}
for(const id of ['depart','enroute','saddle','after']){await a.locator(`[data-moment="${id}"]`).click();await ready(id);await shot(`1920-${id}`);}
await a.locator('[data-choice="check"]').click();await shot('1920-evidence');
await a.locator('[data-option="missing"]').click();await shot('1920-debrief');
await a.locator('[data-action="next"]').click();await shot('1920-summary');
await a.locator('[data-reset]').click();await a.locator('[data-moment="after"]').click();await ready('after');
for(const [w,h] of [[1440,1122],[1366,768]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(500);await shot(`${w}-after`);}
await writeFile(`${out}/report.json`,JSON.stringify({shots,errors},null,2));
await browser.close();console.log(JSON.stringify({shots:shots.length,errors}));
