import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const phase = process.argv[2] ?? 'before';
const root = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const report = {};
for (const [scene, activity, model] of [
  ['tips', 'planning-lab', 'model'],
  ['tips', 'navigation-replay', 'view'],
  ['combatnav', 'terrain-association', 'model'],
]) {
  await page.goto(`http://127.0.0.1:3011/lessons/topic-06/#scene-${scene}`, {waitUntil:'networkidle', timeout:180000});
  const card = page.locator(`[data-activity="${activity}"]`);
  await card.waitFor({timeout:120000});
  await card.scrollIntoViewIfNeeded();
  await card.locator('canvas').first().waitFor({timeout:120000});
  await page.waitForTimeout(1500);
  await card.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 104));
  await page.waitForTimeout(400);
  report[activity] = await card.evaluate((el, model) => {
    const rect = panel => {const r = el.querySelector(`[data-panel="${panel}"]`).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {map:rect('map'), model:rect(model)};
  }, model);
  await page.screenshot({path:`${root}/${phase}-${activity}.png`});
  if (activity === 'terrain-association') {
    const opening = await page.locator('#scene-combat').innerText();
    report.definitionsRemoved = !opening.includes('(Azimuth)') && !opening.includes('חלק מהמסלול בין שתי נקודות מזוהות');
    await card.getByRole('radio',{name:'תרגול',exact:true}).click();
    await page.waitForTimeout(500);
    report.practiceMapOnRight = await card.evaluate(el => el.querySelector('[data-panel="map"]').getBoundingClientRect().x > el.querySelector('[data-panel="model"]').getBoundingClientRect().x);
    await page.screenshot({path:`${root}/${phase}-terrain-practice.png`});
  }
}
report.errors = errors;
await writeFile(`${root}/${phase}.json`,JSON.stringify(report,null,2));
if (phase === 'after') {
  const before = JSON.parse(await readFile(`${root}/before.json`,'utf8'));
  for(const name of ['planning-lab','navigation-replay','terrain-association']) {
    const a=report[name], b=before[name];
    if(a.map.x <= a.model.x) throw new Error(`${name}: map must be on right`);
    for(const p of ['map','model']) for(const dimension of ['width','height']) {
      if(Math.abs(a[p][dimension]-b[p][dimension])>0.1) throw new Error(`${name} ${p} ${dimension} changed: ${b[p][dimension]} -> ${a[p][dimension]}`);
    }
  }
  if(!report.definitionsRemoved || !report.practiceMapOnRight || errors.length) throw new Error(JSON.stringify(report));
}
console.log(JSON.stringify(report,null,2));
await browser.close();

