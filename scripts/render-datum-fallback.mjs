// Renders public/assets/lessons/topic02/datum-guided/datum-fallback.webp —
// the static image of the guided datum globe shown while the 3-D view loads
// and, beside the live SVG section, when WebGL is unavailable.
//
// It is the live scene itself, not a drawing: the page is opened with
// ?datum-capture (DatumGuided hides the ellipsoid — it moves with the
// learner's pose — and every HTML overlay), the default camera, at 2× the
// 1440 px stage, and the WebGL canvas is encoded to WebP in the browser. No
// text is baked in. Requires the dev server on :3000.
//   node scripts/render-datum-fallback.mjs
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const OUT = 'public/assets/lessons/topic02/datum-guided/datum-fallback.webp';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(`${process.env.QA_BASE || 'http://localhost:3000'}/lessons/topic-02/?datum-capture#scene-coordinates`, { waitUntil: 'networkidle', timeout: 180000 });
const stage = '[role=group][aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"]';
await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), stage);
await page.waitForSelector(`${stage} canvas`, { timeout: 60000 });
await page.waitForTimeout(4000);
const dataUrl = await page.evaluate((sel) => document.querySelector(`${sel} canvas`).toDataURL('image/webp', 0.86), stage);
const { w, h } = await page.evaluate((sel) => {
  const c = document.querySelector(`${sel} canvas`);
  return { w: c.width, h: c.height };
}, stage);
await mkdir('public/assets/lessons/topic02/datum-guided', { recursive: true });
await writeFile(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`${OUT}  ${w}×${h}`);
await browser.close();
