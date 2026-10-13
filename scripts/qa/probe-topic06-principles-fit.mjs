// QA probe for the topic-06 "עקרונות הניווט" laptop fit (PrinciplesScene).
// Usage: node scripts/qa/probe-topic06-principles-fit.mjs <outDir> <tag> [base] [viewports]
//   viewports: comma list like 1920x1080,1366x768 (default: the four review sizes)
// Writes one viewport screenshot per screen of the part (scrolled to it), a full-page
// shot, and prints a JSON geometry report (fit scales, rects, overflow checks).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic06-principles-fit';
const tag = process.argv[3] ?? 'probe';
const BASE = process.argv[4] ?? 'http://localhost:3061';
const VIEWPORTS = (process.argv[5] ?? '1920x1080,1536x864,1440x1122,1366x768')
  .split(',')
  .map((s) => s.split('x').map(Number));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

const probe = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom + scrollY) };
    };
    const section = document.getElementById('scene-principles');
    const q = (s) => section?.querySelector(s);
    const fits = [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({
      scale: Number(el.getAttribute('data-fit-scale')),
      rect: r(el),
      inner: r(el.firstElementChild?.firstElementChild),
    }));
    // Elements whose content is wider than their box (clipped text / overflow).
    const overflowing = [...(section?.querySelectorAll('p, h3, h4, button, td, th, dd, dt, [data-readout]') ?? [])]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
      .map((el) => (el.textContent ?? '').trim().slice(0, 40));
    const header = document.querySelector('header');
    return {
      vw: innerWidth,
      vh: innerHeight,
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      siteHeader: r(header),
      main: r(document.querySelector('main')),
      section: r(section),
      sceneHeader: r(q('header')),
      compass: r(q('[data-activity="compass-map"]')),
      compassSvg: r(q('[data-activity="compass-map"] svg')),
      equation: r(q('[data-equation]')),
      north: r(q('[data-activity="north-lab"]')),
      location: r(q('[data-activity="location-check"]')),
      canvas: r(q('[data-activity="location-check"] canvas')),
      canvasAttr: (() => {
        const c = q('[data-activity="location-check"] canvas');
        return c ? { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height } : null;
      })(),
      obsFrame: r(q('[data-panel="observation"]')),
      fits,
      overflowing,
    };
  });

const report = {};
for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${w}x${h} ${m.text()}`);
  });
  await page.goto(`${BASE}/lessons/topic-06/#scene-principles`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector('#scene-principles [data-activity="location-check"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  const key = `${w}x${h}`;
  const info = await probe(page);
  report[key] = info;
  // One viewport shot per screen: scroll so the screen's top sits right under the site header.
  const headerH = info.siteHeader ? info.siteHeader.h : 0;
  const targets = { top: 0 };
  if (info.fits.length) info.fits.forEach((f, i) => (targets[`screen${i + 1}`] = f.rect.y - headerH - 16));
  else {
    targets.compass = info.compass.y - headerH - 16;
    targets.north = info.north.y - headerH - 16;
    targets.location = info.location.y - headerH - 16;
  }
  for (const [name, y] of Object.entries(targets)) {
    await page.evaluate((yy) => scrollTo(0, Math.max(0, yy)), y);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-${name}.png` });
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });
  await page.close();
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
