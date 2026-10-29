// Photographs the live navigation replay (lesson 6, „מתי עוצרים לבדוק?”) for its no-WebGL
// fallback: four stills per moment, a quarter turn apart from the opening look, at the
// view frame's reference size (1920 × 1080 viewport, lesson fit scale 1) × 1.5.
// Re-run whenever the terrain, the vegetation, the lighting or a station changes.
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
const MOMENTS = ['depart', 'enroute', 'saddle', 'after'];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 });
await page.goto(`${BASE}/lessons/topic-06/#scene-tips`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector(A, { timeout: 180000 });
await page.evaluate(() => document.querySelector('[data-tips-screen="nav"]').scrollIntoView({ block: 'start', behavior: 'instant' }));
// the stills carry no interface: hide the ribbon, the controls and the focus ring
await page.addStyleTag({ content: '[data-heading-ribbon],[data-view-controls]{visibility:hidden!important}[data-view-frame]::after{display:none!important}' });
const ready = () => page.waitForFunction((s) => { const f = document.querySelector(s + ' [data-view-frame]'); return f?.hasAttribute('data-ready') && !f.querySelector('[data-loading]'); }, A, { timeout: 180000 });
for (let i = 0; i < MOMENTS.length; i++) {
  await page.click(`${A} [data-moment="${MOMENTS[i]}"]`);
  await ready();
  for (let q = 0; q < 4; q++) {
    await page.evaluate((q) => { const v = window.__replayView; const h = v.home(); v.goTo({ ...h, yawDeg: h.yawDeg + q * 90 }, true); }, q);
    await page.waitForTimeout(700);
    const png = await page.locator(`${A} [data-view-frame] canvas`).screenshot();
    const file = path.join(OUT, `m${i + 1}-${q}.webp`);
    const info = await sharp(png).webp({ quality: 78 }).toFile(file);
    console.log(path.relative(ROOT, file), `${info.width}×${info.height}`, `${(info.size / 1024) | 0} KB`);
  }
}
await browser.close();
