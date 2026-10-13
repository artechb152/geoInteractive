// Geometry probe + screenshots for "קואורדינטות 1" (topic-02 #scene-coordinates) laptop fit.
// Per viewport: header, section, each screen block (with its fit scale) and a screenshot of each
// screen, scrolled so its top sits right under the fixed header.
// Usage: node scripts/qa/probe-coordinates1-fit.mjs <outDir> <tag> [base] [WxH ...]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic02-coordinates1-fit';
const tag = process.argv[3] ?? 'probe';
const BASE = process.argv[4] ?? 'http://localhost:3117';
const sizes = (process.argv.slice(5).length ? process.argv.slice(5) : ['1920x1080', '1536x864', '1440x1122', '1366x768']).map((s) =>
  s.split('x').map(Number),
);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};
// Other sessions edit this checkout: a dev-server reload can interrupt a run, so a viewport is retried.
for (const [width, height] of sizes) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await probe(width, height);
      break;
    } catch (e) {
      console.error(`${width}x${height} attempt ${attempt}: ${String(e).slice(0, 120)}`);
    }
  }
}
await writeFile(`${outDir}/${tag}-report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await browser.close();

async function probe(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector('#scene-coordinates', { state: 'attached', timeout: 120000 });
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const sec = document.querySelector('#scene-coordinates');
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const header = document.querySelector('header.fixed') ?? document.querySelector('header');
    // the fitted screens when present (after), else the section's top-level blocks (before)
    const screens = [...sec.querySelectorAll('[data-coordinates1-screen]')];
    const blocks = (screens.length ? screens : [...sec.children]).map((c) => {
      const fit = c.querySelector('[data-lesson-viewport-fit]');
      const b = box(fit ? fit.firstElementChild : c);
      return {
        name: c.dataset.coordinates1Screen ?? c.tagName,
        fit: fit?.dataset.fitScale ?? null,
        text: (c.querySelector('h2,h3,h4,[class*="font-display"]')?.textContent ?? '').slice(0, 40),
        ...b,
        fitsView: b.h <= innerHeight - 80,
      };
    });
    return {
      vw: innerWidth,
      vh: innerHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      header: header ? box(header) : null,
      section: box(sec),
      contentW: sec.clientWidth - parseFloat(getComputedStyle(sec).paddingLeft) - parseFloat(getComputedStyle(sec).paddingRight),
      blocks,
      nextRow: (() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'תת הנושא הבא');
        return b ? box(b) : null;
      })(),
    };
  });
  report[`${width}x${height}`] = { ...r, errors };
  const headerH = r.header ? r.header.h : 0;
  for (let i = 0; i < r.blocks.length; i++) {
    const b = r.blocks[i];
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, b.y - headerH));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/${tag}-${width}x${height}-${String(i).padStart(2, '0')}-${b.name}.png` });
  }
  await page.close();
}
