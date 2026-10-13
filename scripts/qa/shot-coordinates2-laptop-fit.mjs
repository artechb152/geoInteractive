// Laptop fit of "קואורדינטות 2" (topic-02 #scene-coordinates-2): per viewport, a full-page
// shot, one viewport shot per screen (its top just under the site header) and a geometry
// report — each screen's fit scale, laid-out vs. footprint height, horizontal overflow, gaps
// and overlaps between consecutive screens.
//
// Usage: QA_BASE=http://localhost:3000 node scripts/qa/shot-coordinates2-laptop-fit.mjs <outDir> [WxH ...]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/coordinates2-laptop-fit';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const sizes = (process.argv.slice(3).length ? process.argv.slice(3) : ['1920x1080', '1536x864', '1440x1122', '1366x768']).map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};
// Other sessions edit this checkout: a Fast Refresh full reload can land mid-run. Retry once settled.
async function settled(page, fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= 4 || !/context was destroyed|navigation/i.test(String(e))) throw e;
      await page.waitForLoadState('networkidle', { timeout: 240000 }).catch(() => {});
      await page.waitForSelector('#scene-coordinates-2', { timeout: 120000 });
      await page.waitForTimeout(3000);
    }
  }
}
for (const [width, height] of sizes) {
  const dir = `${outDir}/${width}x${height}`;
  await mkdir(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector('#scene-coordinates-2', { timeout: 120000 });
  // let the WebGL stages come up
  await page.waitForSelector('[data-projections-lab][data-ready="true"]', { timeout: 90000 }).catch(() => errors.push('projections not ready'));
  await page.waitForTimeout(2500);
  const screens = await settled(page, () => page.evaluate(() => {
    const sec = document.querySelector('#scene-coordinates-2');
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const items = [...sec.children].flatMap((c) => (c.dataset.fitGroup !== undefined ? [...c.children] : [c]));
    return {
      headerH,
      docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      list: items.map((c, i) => {
        const b = c.getBoundingClientRect();
        const fit = c.matches('[data-lesson-viewport-fit]') ? c : c.querySelector(':scope > [data-lesson-viewport-fit]');
        const inner = fit?.firstElementChild?.firstElementChild;
        const ib = inner?.getBoundingClientRect();
        const next = items[i + 1]?.getBoundingClientRect();
        return {
          name: c.dataset.coordinates2Screen ?? c.tagName.toLowerCase(),
          top: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), x: Math.round(b.left),
          scale: fit ? Number(fit.dataset.fitScale) : null,
          layoutH: inner ? inner.offsetHeight : null,
          visualH: ib ? Math.round(ib.height) : null,
          // the scaled composition must end where its footprint ends (no clip, no empty band)
          footprintDelta: ib ? Math.round(b.bottom - ib.bottom) : null,
          overflowX: inner ? Math.max(0, Math.round(ib.right - b.right), Math.round(b.left - ib.left)) : null,
          gapToNext: next ? Math.round(next.top - b.bottom) : null,
          fitsViewport: Math.round(b.height) <= Math.round(innerHeight - headerH),
        };
      }),
    };
  }));
  for (const [i, s] of screens.list.entries()) {
    await settled(page, async () => {
      await page.evaluate(([top, headerH]) => window.scrollTo(0, top - headerH), [s.top, screens.headerH]);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-${s.name}.png` });
    });
  }
  await settled(page, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/00-full.png`, fullPage: true });
  });
  report[`${width}x${height}`] = { ...screens, errors };
  console.log(`${width}x${height}`, `headerH=${screens.headerH}`, `docOverflowX=${screens.docOverflowX}`, errors.length ? `ERRORS ${errors.join(' | ')}` : '');
  for (const s of screens.list) console.log(' ', JSON.stringify(s));
  await page.close();
}
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 1));
await browser.close();
