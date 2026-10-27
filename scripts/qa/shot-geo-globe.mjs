// Screenshots + functional checks of the "גלובוס חוקר" screen (topic-02, מערכת קואורדינטות
// גיאוגרפית) at 1440 × 1122: the explorer, then practice — a "find" task (a miss by click,
// the note on the globe, a stale check, a hit), a "read" task (a wrong side, a hit), the
// keyboard mark, and back to the explorer. Tasks are random: the script reads the task
// from the card's data-* and answers from it. Each state logs the explorer's readout.
//
// Usage (a dev server serving the page):
//   QA_BASE=http://localhost:3001 node scripts/qa/shot-geo-globe.mjs [outDir]
// Writes <outDir>/NN-name.png (the viewport) and NN-name-card.png (the activity card).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/geo-globe';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const REDUCED = process.env.QA_REDUCED === '1';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
// only this screen's own resources and runtime (other screens on the page are not ours)
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && /geo-globe|Globe3D|GlobeExplorer|THREE/.test(`${m.text()} ${m.location()?.url ?? ''}`) && errors.push(m.text()));

await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
const card = page.locator('[data-geo-explorer]');
await card.waitFor({ state: 'attached', timeout: 120000 });
const stage = card.locator('[aria-roledescription="גלובוס"]');

async function align() {
  await page.evaluate(() => {
    const h = document.querySelector('[data-screen="geographic-coordinates"] h3');
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 100);
  });
  await page.waitForTimeout(250);
}
await align();
await page.waitForSelector('[data-geo-explorer] [data-ready="true"]', { timeout: 90000 });
await page.waitForTimeout(900);

let n = 0;
const readout = () =>
  card.evaluate((el) => {
    const d = el.dataset;
    const fb = el.querySelector('[data-geo-feedback]');
    const shown = (sel) => el.querySelector(sel)?.dataset.shown === 'true';
    return {
      stage: d.stage, task: d.taskKind ? `${d.taskKind} ${d.taskLat},${d.taskLon}` : '', level: d.level, misses: d.misses, outcome: d.outcome, stale: d.stale,
      msg: fb ? fb.innerText.replace(/\s+/g, ' ').trim() : '',
      note: shown('[data-note]') ? el.querySelector('[data-note]').innerText : '',
      marker: shown('[data-marker]'), choices: [...el.querySelectorAll('[data-choice]')].filter((c) => c.dataset.shown === 'true').length, target: shown('[data-target-marker]'),
      h: Math.round(el.getBoundingClientRect().height),
    };
  });
async function shot(name) {
  n += 1;
  const id = String(n).padStart(2, '0');
  await page.waitForTimeout(REDUCED ? 200 : 1100);
  await page.screenshot({ path: `${outDir}/${id}-${name}.png` });
  await card.screenshot({ path: `${outDir}/${id}-${name}-card.png` });
  console.log(id, name, JSON.stringify(await readout()));
}
const btn = (name) => card.getByRole('button', { name, exact: true });
// a click that turns the primary button ("בדיקה" ↔ "נקודה הבאה") or opens a task; the panel lets presses go for
// 500 ms after it changes (GlobeExplorer SETTLE_MS — no double click past a verdict), so wait around it
const turn = async (name) => {
  await page.waitForTimeout(600);
  await btn(name).click();
  await page.waitForTimeout(600);
};
const task = async () => card.evaluate((el) => ({ kind: el.dataset.taskKind, lat: +el.dataset.taskLat, lon: +el.dataset.taskLon }));
const choice = (i) => card.locator(`[data-choice-option="${i}"]`);
// which choice is right / wrong: read from the page's own model through the dev hook
const answerIndex = () => page.evaluate(() => window.__geoGlobeAnswer?.());

await shot('explore');

// into practice: draw tasks until one of each kind has been seen
await turn('לתרגול');
let t = await task();
await shot(`task-${t.kind}`);
for (let guard = 0; guard < 12 && t.kind !== 'find'; guard++) {
  // answer the read task wrong three times to move on — three different answers (the same one
  // checked again is no new try)
  const lat = card.getByRole('spinbutton', { name: /רוחב/ });
  for (let i = 0; i < 3 && !(await btn('נקודה הבאה').isVisible()); i++) {
    await btn('בדיקה').click();
    if (await lat.isVisible()) {
      await lat.focus();
      await page.keyboard.press('ArrowUp');
    }
  }
  await turn('נקודה הבאה');
  t = await task();
}
await shot('find-open');
const right = await answerIndex();
const wrong = [0, 1, 2, 3].find((i) => i !== right);
await choice(wrong).click();
await shot('find-picked');
await btn('בדיקה').click();
await shot('find-miss');
await choice(right).click();
await shot('find-stale');
await btn('בדיקה').click();
await shot('find-hit');

// a read task
await turn('נקודה הבאה');
t = await task();
for (let guard = 0; guard < 12 && t.kind !== 'read'; guard++) {
  await choice(await answerIndex()).click();
  await btn('בדיקה').click();
  await turn('נקודה הבאה');
  t = await task();
}
await shot('read-open');
const setCoord = async (name, mag, dir) => {
  const field = card.getByRole('spinbutton', { name: new RegExp(name) });
  await field.fill(String(mag));
  await field.press('Enter');
  if (dir) await card.getByRole('radio', { name: dir }).first().click();
};
const latDir = t.lat >= 0 ? 'דרום' : 'צפון'; // the wrong side first
await setCoord('רוחב', Math.abs(t.lat), Math.abs(t.lat) > 0 ? latDir : null);
await setCoord('אורך', Math.abs(t.lon), t.lon > 0 && t.lon < 180 ? 'מזרח' : t.lon < 0 ? 'מערב' : null);
await btn('בדיקה').click();
await shot('read-miss');
// (on the equator the first try was already right)
if (await btn('בדיקה').isVisible()) {
  if (t.lat !== 0) await card.getByRole('radio', { name: t.lat > 0 ? 'צפון' : 'דרום' }).first().click();
  await btn('בדיקה').click();
}
await shot('read-hit');

// picking by keyboard: Tab into the letters, arrows move the choice (and turn the globe)
await turn('נקודה הבאה');
t = await task();
if (t.kind === 'find') {
  await choice(0).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await shot('find-keyboard');
}

await btn('לחקירה').click();
await shot('back-to-explore');

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
