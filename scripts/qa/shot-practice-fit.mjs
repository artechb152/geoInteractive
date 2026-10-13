// Laptop-fit QA for topic-02 "משמעות מעשית" (#scene-practice, PracticalMeaningScene).
// Captures the screen at each viewport, with each of the four cases opened, and
// logs the geometry: fit scale, panel rect, the space between the site header
// and the panel, the prev/next row, and whether the page scrolls.
//
// Usage (a dev server serving the page):
//   QA_BASE=http://localhost:3000 node scripts/qa/shot-practice-fit.mjs [outDir]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/practice-fit';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const VIEWPORTS = [
  [1920, 1080],
  [1440, 1122],
  [1536, 864],
  [1366, 768],
];
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

const probe = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) };
    };
    const section = document.getElementById('scene-practice');
    const fit = section?.querySelector('[data-lesson-viewport-fit]');
    const panel = section?.querySelector('.shadow-pine-card');
    const footprint = fit?.firstElementChild ?? null;
    const detail = document.getElementById('history-detail-panel');
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const buttons = [...(main?.querySelectorAll('button') ?? [])].filter((b) => /הקודם|הבא|המשך|חזרה/.test(b.textContent ?? ''));
    const de = document.documentElement;
    return {
      scale: fit?.getAttribute('data-fit-scale') ?? null,
      header: r(header),
      section: r(section),
      panel: r(panel),
      footprint: r(footprint),
      detail: r(detail),
      nav: buttons.map((b) => ({ t: b.textContent.trim().slice(0, 12), ...r(b) })),
      viewportH: window.innerHeight,
      scrollH: de.scrollHeight,
      vScroll: de.scrollHeight - window.innerHeight,
      hScroll: de.scrollWidth - de.clientWidth,
    };
  });

// Other sessions edit this checkout, so a dev-server Fast Refresh can reload
// the page mid-capture. A viewport whose run hits a reload, or loses the
// scene, is captured again from the start.
async function captureViewport(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  let reloaded = false;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) reloaded = true; });
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  try {
    await page.goto(`${BASE}/lessons/topic-02/#scene-practice`, { waitUntil: 'networkidle', timeout: 240000 });
    await page.waitForSelector('#scene-practice', { timeout: 120000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    reloaded = false;
    const cases = page.locator('#scene-practice button[aria-controls="history-detail-panel"]');
    const count = await cases.count();
    const lines = [];
    for (let i = 0; i < count; i++) {
      await cases.nth(i).click({ timeout: 10000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const t0 = Date.now();
      // AnimatePresence keeps the exiting panel (same id) for a moment, so
      // wait for the ONE panel showing the clicked case, with its art loaded.
      const headline = (await cases.nth(i).locator('div.font-display').first().textContent()).trim();
      const imgReady = await page
        .waitForFunction((title) => {
          const panels = document.querySelectorAll('#history-detail-panel');
          if (panels.length !== 1) return false;
          const p = panels[0];
          return p.querySelector('h4')?.textContent.trim() === title && getComputedStyle(p).opacity === '1'
            && p.querySelector('[data-asset-status="ready"]');
        }, headline, { timeout: 20000 })
        .then(() => Date.now() - t0, () => 'TIMEOUT');
      await page.waitForTimeout(600);
      const name = `${w}x${h}-case${i + 1}`;
      await page.screenshot({ path: `${outDir}/${name}.png` });
      if (i === 0) await page.screenshot({ path: `${outDir}/${w}x${h}-full.png`, fullPage: true });
      const data = await probe(page);
      if (reloaded || !data.section) throw new Error('page reloaded during capture');
      lines.push(`${name} img ${imgReady} ${JSON.stringify(data)}`);
    }
    return lines;
  } finally {
    await page.close();
  }
}

for (const [w, h] of VIEWPORTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      for (const line of await captureViewport(w, h)) console.log(line);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.log(`${w}x${h} retry ${attempt}: ${String(e).split('\n')[0]}`);
    }
  }
}

await browser.close();
if (errors.length) console.log('ERRORS', errors);
