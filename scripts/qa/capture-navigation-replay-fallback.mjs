// Photographs the live navigation decision exercise (lesson 6, „במהלך הניווט: מה צריך לבדוק?”) for its
// no-WebGL fallback: four stills per stop, a quarter turn apart from the opening look, at the view frame's
// reference size (1920 × 1080 viewport, lesson fit scale 1) × 1.5. One run visits all seven stops (the
// guided check, then continuing past the woodland, the road and beyond it, a check, and the corrected walk to
// the crossing); signs are chosen from the list, so the stills carry no labels.
// Re-run whenever the terrain, the vegetation, the lighting or a stop changes.
// Run: QA_BASE=http://localhost:3000 node scripts/qa/capture-navigation-replay-fallback.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/assets/lessons/topic06/navigation-replay/fallback');
const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const A = '[data-activity="navigation-replay"]';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 });
await page.goto(`${BASE}/lessons/topic-06/#scene-tips`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector(A, { timeout: 180000 });
await page.evaluate(() => document.querySelector('[data-tips-screen="nav"]').scrollIntoView({ block: 'start', behavior: 'instant' }));
// the stills carry no interface: hide the ribbon, the controls, the prompts, the labels and the focus ring
await page.addStyleTag({ content: '[data-heading-ribbon],[data-view-controls],[data-pick-prompt],[data-view-marker]{visibility:hidden!important}[data-view-frame]::after{display:none!important}' });
const ready = () =>
  page.waitForFunction((s) => {
    const f = document.querySelector(s + ' [data-view-frame]');
    return window.__replayRun?.phase !== 'walking' && f?.hasAttribute('data-ready') && !f.querySelector('[data-loading]');
  }, A, { timeout: 180000 });
const stop = () => page.evaluate(() => window.__replayRun.visits.at(-1).stop);
async function shoot() {
  const id = await stop();
  await ready();
  for (let q = 0; q < 4; q++) {
    await page.evaluate((q) => {
      const v = window.__replayView;
      const h = v.home();
      v.goTo({ ...h, yawDeg: h.yawDeg + q * 90 }, true);
    }, q);
    await page.waitForTimeout(900);
    const png = await page.locator(`${A} [data-view-frame] canvas`).screenshot();
    const file = path.join(OUT, `${id}-${q}.webp`);
    const info = await sharp(png).webp({ quality: 80 }).toFile(file);
    console.log(path.relative(ROOT, file), `${info.width}×${info.height}`, `${(info.size / 1024) | 0} KB`);
  }
}
const pick = async (signs) => {
  for (const s of signs) {
    await page.selectOption(`${A} [data-list="view"]`, s);
    await page.selectOption(`${A} [data-list="map"]`, s);
  }
};
await ready();
await shoot(); // the stream crossing
await pick(['saddle', 'stream']);
await page.click(`${A} [data-action="commit"]`);
for (let i = 0; i < 5; i++) {
  // enroute, saddle, woods, road, beyond
  const walking = page.click(`${A} :is([data-choice="continue"], [data-action="next"])`);
  await walking;
  await page.waitForSelector(`${A} [data-skip-walk]`, { timeout: 60000 }).then((b) => b.click()).catch(() => {});
  await page.waitForFunction(() => window.__replayRun.phase !== 'walking', null, { timeout: 60000 });
  await shoot();
}
await page.click(`${A} [data-choice="check"]`);
await pick(['summitW', 'pines']);
await page.click(`${A} [data-action="commit"]`);
await page.click(`${A} [data-action="next"]`);
await page.waitForSelector(`${A} [data-skip-walk]`, { timeout: 60000 }).then((b) => b.click()).catch(() => {});
await page.waitForFunction(() => window.__replayRun.phase !== 'walking', null, { timeout: 60000 });
await shoot(); // the crossing
await browser.close();
