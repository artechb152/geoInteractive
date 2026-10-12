// Screenshots of the datum block's states for the interaction refinement
// (design/mockups/datum-concepts/claude-interaction-and-learning-refinement-prompt.md):
// the three surface choices, the demo's phases, the experiment open, global
// and local with both check points, and station switching — 1440 × 1122.
//
// Usage (dev server on :3000):
//   node scripts/qa/shot-datum-interaction.mjs [outDir] [prefix]
//   QA_BASE=http://localhost:3021 for another server; QA_REDUCED=1 for reduced motion.
// Writes <outDir>/<prefix>NN-name.png (full view) and <prefix>NN-name-stage.png
// (the block's card only). Logs each state's data-* readout from the stage.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/datum-guided/interaction-refinement/after';
const prefix = process.argv[3] || '';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const REDUCED = process.env.QA_REDUCED === '1';
await mkdir(outDir, { recursive: true });

const stageSel = '[role=group][aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"]';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/datum-fallback\.webp/.test(m.text()) && errors.push(m.text()));
await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForSelector(stageSel, { state: 'attached', timeout: 120000 });
await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), stageSel);
await page.waitForSelector(`${stageSel} canvas`, { timeout: 60000 });
await page.waitForTimeout(3500);

async function align() {
  await page.evaluate(() => {
    const row = document.querySelector('[aria-controls="datum-step-0"]').closest('div.rounded-xl');
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 386);
  });
  await page.waitForTimeout(300);
}
await align();

const blk = page.locator('h3', { hasText: 'דאטום: התאמת האליפסואיד לכדור הארץ' }).locator('xpath=..');
const card = blk.locator('.surface-elevated');
let n = 0;
async function shot(name) {
  n++;
  const id = `${prefix}${String(n).padStart(2, '0')}-${name}`;
  await page.screenshot({ path: `${outDir}/${id}.png` });
  await card.screenshot({ path: `${outDir}/${id}-stage.png` });
  const d = await page.locator(stageSel).evaluate((el) => ({ ...el.dataset }));
  const fb = await page.locator('[data-datum-feedback]').innerText();
  console.log(id, JSON.stringify(d), '|', fb.replace(/\s+/g, ' '));
}
const station = (i) => page.locator(`[aria-controls="datum-step-${i}"]`);
const radio = (name) => blk.getByRole('radio', { name, exact: true });
const button = (name) => blk.getByRole('button', { name, exact: true });

// station 1 — the three surfaces
await shot('station1-surface');
await radio('גיאואיד').click();
await page.waitForTimeout(500);
await shot('station1-geoid');
await radio('אליפסואיד').click();
await page.waitForTimeout(500);
await shot('station1-ellipsoid');

// station 2 — the demo, phase by phase
await station(1).click();
await page.waitForTimeout(1100);
await align();
await shot('station2-open');
const demo = blk.locator('ol[aria-label="שלבי ההדגמה"]').locator('xpath=..').getByRole('button');
if (REDUCED) {
  for (const name of ['shift', 'rotate', 'scale']) {
    await demo.click();
    await page.waitForTimeout(500);
    await shot(`station2-step-${name}`);
  }
} else {
  await demo.click(); // play
  for (const [ms, name] of [[1900, 'shift'], [1700, 'rotate'], [1650, 'scale']]) {
    await page.waitForTimeout(ms);
    await demo.click(); // stop
    await page.waitForTimeout(200);
    await shot(`station2-demo-${name}`);
    await demo.click(); // resume
  }
  await page.waitForTimeout(2600);
  await shot('station2-demo-end');
}

// the experiment
await button('נסו בעצמכם').click();
await page.waitForTimeout(400);
await align();
await shot('station2-experiment-open');
const rot = blk.getByRole('slider', { name: /^סיבוב/ });
await rot.focus();
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
await shot('station2-experiment-rotate');
const sc = blk.getByRole('slider', { name: /^קנה מידה/ });
await sc.focus();
for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
await shot('station2-experiment-scale');
const dx = blk.getByRole('slider', { name: /^הזזה אופקית/ });
await dx.focus();
for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
await shot('station2-experiment-shift-x');

// station 3 — global / local, both check points
await station(2).click();
await page.waitForTimeout(1100);
await align();
await shot('station3-global-inside');
await radio('מחוץ לאזור').click();
await page.waitForTimeout(500);
await shot('station3-global-outside');
await radio('דאטום מקומי').click();
await page.waitForTimeout(1100);
await shot('station3-local-outside');
await radio('באזור המסומן').click();
await page.waitForTimeout(500);
await shot('station3-local-inside');

// back to station 2: the experiment is where it was left
await station(1).click();
await page.waitForTimeout(1100);
await align();
await shot('station2-back');

console.log(errors.length ? `ERRORS:\n  ${errors.slice(0, 8).join('\n  ')}` : 'no console errors');
await browser.close();
