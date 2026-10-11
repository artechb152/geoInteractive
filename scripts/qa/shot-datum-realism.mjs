// The guided datum's five comparison states at 1440 × 1122 — opening, geoid
// chosen, ellipsoid chosen, mid-demo (paused at 35 %), fitted — each as the
// full viewport (normal display size) plus separate close-ups of the globe and
// of the linked close-up window, rendered at 2× device pixels and cropped to
// the same comparison size for every run (before / after).
//   QA_BASE=http://localhost:3000 node scripts/qa/shot-datum-realism.mjs <outDir> <tag>
// Files: <outDir>/<tag>-<state>.png, <tag>-<state>-globe.png, <tag>-<state>-inset.png
// QA_STATES=open,demo-angle,… picks the states; the "-angle" states turn the
// camera by one fixed drag (the existing orbit control) toward the reference's view.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const [outDir = 'design/screenshots/datum-guided/realism-refinement', tag = 'after'] = process.argv.slice(2);
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const STATES = (process.env.QA_STATES || 'open,geoid,ellipsoid,demo,fit').split(',');
/** The orbit drag of the "-angle" states: stage px from → to (on the land, clear of every handle). */
const TURN = { from: [300, 170], to: [Number(process.env.QA_TURN_X || 380), Number(process.env.QA_TURN_Y || 200)] };
const STAGE = '[role=group][aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"]';
/** Crops in stage pixels: the globe (right of the close-up) and the close-up circle. */
const GLOBE = { x: 200, y: 0, w: 454, h: 440 };
const INSET = { x: 0, y: 440 - 10 - 188, w: 188, h: 188 };

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function shoot(state, dpr) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1122 }, deviceScaleFactor: dpr })).newPage();
  page.on('pageerror', (e) => errors.push(`${state}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${state}: ${m.text().slice(0, 200)}`));
  await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle', timeout: 180000 });
  // the first station row at y = 386, as in the reference frame
  const align = () =>
    page.evaluate(() => {
      const row = document.querySelector('[aria-controls="datum-step-0"]').closest('div.rounded-xl');
      window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 386);
    });
  // the block may mount late (lazy sections): bring the stage into view first
  await page.waitForSelector(STAGE, { state: 'attached', timeout: 120000 });
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), STAGE);
  await page.waitForSelector('[aria-controls="datum-step-0"]', { timeout: 60000 });
  await align();
  await page.waitForSelector(`${STAGE} canvas`, { timeout: 60000 });
  await page.waitForTimeout(3500);
  const blk = page.locator('h3', { hasText: 'דאטום: התאמת האליפסואיד לכדור הארץ' }).locator('xpath=..');
  if (state === 'geoid') await blk.getByRole('radio', { name: 'גיאואיד' }).click();
  if (state === 'ellipsoid') await blk.getByRole('radio', { name: 'אליפסואיד' }).click();
  const base = state.replace(/-angle$/, '');
  if (base === 'demo' || base === 'fit') {
    await page.locator('[aria-controls="datum-step-1"]').click();
    await page.waitForTimeout(600);
  }
  if (base === 'demo') {
    await page.locator('#datum-step-1').getByRole('button', { name: 'הפעלת ההדגמה' }).click();
    await page.waitForTimeout(0.35 * 7000);
    await blk.getByRole('button', { name: 'השהיה' }).click();
  }
  if (base === 'fit') {
    await page.locator('#datum-step-1').getByRole('button', { name: 'נסו בעצמכם' }).click();
    await page.waitForTimeout(300);
    await page.locator('#datum-step-1').getByRole('button', { name: 'הצגת התאמה' }).click();
    await page.waitForTimeout(1800);
  }
  await align();
  if (state.endsWith('-angle')) {
    const r0 = await page.locator(STAGE).boundingBox();
    const at = (k) => [r0.x + TURN.from[0] + (TURN.to[0] - TURN.from[0]) * k, r0.y + TURN.from[1] + (TURN.to[1] - TURN.from[1]) * k];
    await page.mouse.move(...at(0));
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(...at(i / 12));
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1200);
  const buf = await page.screenshot();
  const r = await page.locator(STAGE).boundingBox();
  await page.context().close();
  return { buf, r };
}

for (const state of STATES) {
  const full = await shoot(state, 1);
  await sharp(full.buf).toFile(`${outDir}/${tag}-${state}.png`);
  const hi = await shoot(state, 2);
  const crop = (c, scale) =>
    sharp(hi.buf)
      .extract({ left: Math.round((hi.r.x + c.x) * 2), top: Math.round((hi.r.y + c.y) * 2), width: c.w * 2, height: c.h * 2 })
      .resize(Math.round(c.w * scale));
  await crop(GLOBE, 1.5).toFile(`${outDir}/${tag}-${state}-globe.png`);
  await crop(INSET, 2).toFile(`${outDir}/${tag}-${state}-inset.png`);
  console.log(`${tag}-${state}`);
}
await browser.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
