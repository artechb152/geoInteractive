import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.QA_BASE??'http://localhost:3047';
test('all replay decision states fit the complete 1920×910 desktop screen',async()=>{
 const browser=await chromium.launch({channel:'chrome',args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
 try {const page=await browser.newPage({viewport:{width:1920,height:910},reducedMotion:'reduce'});
 await page.goto(`${base}/lessons/topic-06/#scene-tips`,{waitUntil:'domcontentloaded',timeout:180000});
 const a=page.locator('[data-activity="navigation-replay"]'); await a.waitFor({timeout:180000});
 const check=async(label)=>{await page.locator('[data-tips-screen="nav"]').scrollIntoViewIfNeeded();
 await page.evaluate(()=>window.scrollTo({top:document.querySelector('[data-tips-screen="nav"]').getBoundingClientRect().top+window.scrollY-104,behavior:'instant'}));
 const b=await page.locator('[data-tips-screen="nav"]').boundingBox();
 assert.ok(b.y>=79&&b.y+b.height<=887,`${label}: screen ${b.y}..${b.y+b.height}`);
 const overflow=await a.evaluate(el=>[...el.querySelectorAll('[data-decision] button,[data-feedback],[data-summary]')].filter(e=>e.getBoundingClientRect().height).some(e=>e.getBoundingClientRect().bottom>el.getBoundingClientRect().bottom+1));
 assert.equal(overflow,false,`${label}: decision content outside activity`);};
 await check('guided');
 await a.locator('[data-moment="enroute"]').click();await a.locator('[data-choice="check"]').click();await check('cautious check');
 await a.locator('[data-moment="after"]').click();await a.locator('[data-choice="check"]').click();await check('evidence');
 await a.locator('[data-option="proof"]').click();await check('wrong reason');
 await a.locator('[data-option="missing"]').click();await check('debrief');
 await a.locator('[data-action="next"]').click();await check('summary');
 }finally{await browser.close();}
});
