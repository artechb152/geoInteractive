// QA probe for the topic-02 "קנה מידה" laptop fit: screenshots of every lab state at four viewports, plus
// interaction readings (picks, handle drag, wheel anchor, pan, curtain drag) expressed as fractions of the
// map so the numbers compare across viewports and fit scales.
// Usage: node scripts/qa/probe-topic02-scale-fit.mjs <outDir> <tag> [base]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic02-scale-fit';
const tag = process.argv[3] ?? 'probe';
const BASE = process.argv[4] ?? 'http://localhost:3000';
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
  [1366, 768],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

const layout = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const y = b.y + scrollY;
      return { x: Math.round(b.x), y: Math.round(y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(y + b.height) };
    };
    const section = document.getElementById('scene-scale');
    const lab = section?.querySelector('[data-qa="scale-lab"]');
    const fits = [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({ scale: el.getAttribute('data-fit-scale'), rect: r(el) }));
    const nav = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא');
    const header = document.querySelector('body > header, header');
    // Text boxes that overflow their own box (clipped text) inside the lab.
    const clipped = [...(lab?.querySelectorAll('p, span, button, dd, dt, summary, div') ?? [])]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
      .map((el) => el.getAttribute('data-qa') || el.textContent?.slice(0, 30));
    const inner = section?.querySelector('[data-lesson-viewport-fit] > div > div');
    return {
      vw: innerWidth,
      innerLayoutH: inner ? inner.offsetHeight : null,
      vh: innerHeight,
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      header: r(header),
      fits,
      section: r(section),
      title: r(section?.querySelector('h2')),
      lab: r(lab),
      map: r(section?.querySelector('[data-qa="sheet-viewport"]')),
      panel: r(section?.querySelector('[role="tabpanel"]')),
      nextBtn: r(nav),
      clipped,
    };
  });

// Brings the whole map on screen first (on short viewports without the fit it runs past the fold).
const mapRect = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-qa="sheet-viewport"]');
    const pre = el.getBoundingClientRect();
    if (pre.top < 0 || pre.bottom > innerHeight) el.scrollIntoView({ block: 'center' });
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
const at = (m, fx, fy) => [m.x + fx * m.w, m.y + fy * m.h];
const view = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-qa="sheet-viewport"]');
    const [k, x, y] = el.getAttribute('data-view').split(',').map(Number);
    const s = el.clientWidth;
    return { k, x: x / s, y: y / s };
  });
const text = (page, qa) => page.evaluate((q) => document.querySelector(`[data-qa="${q}"]`)?.textContent?.trim() ?? null, qa);
const points = (page) => page.evaluate(() => JSON.parse(document.querySelector('[data-qa="measure-result"]').getAttribute('data-points')));
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

async function drag(page, [x0, y0], [x1, y1]) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
  await page.mouse.up();
}

const report = {};
for (const [w, h] of VIEWPORTS) {
  // The dev server is shared with other sessions: an HMR reload mid-run destroys the page, so retry.
  for (let attempt = 1; ; attempt++) {
    try {
      await runViewport(w, h);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.error(`${w}x${h} attempt ${attempt} failed: ${String(e).split(/\r?\n/)[0]}`);
    }
  }
}

async function runViewport(w, h) {
  const key = `${w}x${h}`;
  const shot = (name) => page.screenshot({ path: `${outDir}/${tag}-${key}-${name}.png` });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
  page.on('pageerror', (e) => errors.push(`${key} ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${key} ${m.text()}`);
  });
  await page.goto(`${BASE}/lessons/topic-02/#scene-scale`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForSelector('[data-qa="sheet-viewport"]');
  await page.waitForTimeout(1800);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  const out = { initial: await layout(page) };
  await shot('explore');
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });
  const lab = page.locator('[data-qa="scale-lab"]');

  // Scale picker: every sheet.
  out.sheets = {};
  for (const name of ['1:10,000', '1:250,000', '1:50,000']) {
    await lab.getByRole('radio', { name: new RegExp(name.replace(/[.:,]/g, '.')) }).first().click();
    await page.waitForTimeout(900);
    out.sheets[name] = { readouts: await text(page, 'explore-readouts'), bar: await text(page, 'scale-bar'), height: (await layout(page)).lab.h };
    if (name !== '1:50,000') await shot(`sheet-${name.replace(/[^0-9]/g, '')}`);
  }

  // Locate.
  await lab.getByRole('button', { name: 'כפר תבור', exact: true }).click();
  await page.waitForTimeout(300);
  out.locate = await page.evaluate(() => {
    const m = document.querySelector('[data-qa="sheet-viewport"]').getBoundingClientRect();
    const ring = document.querySelector('[data-qa="locate-marker"] circle')?.getBoundingClientRect();
    return {
      line: document.querySelector('[data-qa="locate-line"]').textContent,
      ring: ring ? { fx: (ring.x + ring.width / 2 - m.x) / m.width, fy: (ring.y + ring.height / 2 - m.y) / m.height } : null,
    };
  });
  out.locate.ring &&= { fx: round(out.locate.ring.fx, 3), fy: round(out.locate.ring.fy, 3) };
  await shot('locate');
  await lab.getByRole('button', { name: 'כפר תבור', exact: true }).click();

  // Enlargement vs detail comparison + curtain drag.
  await page.click('[data-qa="zoom-compare-toggle"]');
  await page.waitForTimeout(900);
  out.compare = { height: (await layout(page)).lab.h, view: await view(page) };
  await shot('compare');
  {
    const m = await mapRect(page);
    const hb = await page.locator('[data-qa="curtain-handle"]').boundingBox();
    await drag(page, [hb.x + hb.width / 2, hb.y + hb.height / 2], at(m, 0.3, 0.5));
    out.compare.curtainAfterDrag = await page.locator('[data-qa="scale-lab"] input[type="range"]').inputValue();
  }
  await lab.getByRole('button', { name: 'חזרה למפות' }).click();
  await page.waitForTimeout(600);

  // Measure: picks at fixed map fractions, then a handle drag, then the example.
  await lab.getByRole('tab', { name: 'מדידה' }).click();
  await page.waitForTimeout(400);
  {
    const m = await mapRect(page);
    await page.mouse.click(...at(m, 0.3, 0.4));
    await page.mouse.click(...at(m, 0.7, 0.6));
    await page.waitForTimeout(200);
    out.measure = { points: (await points(page)).map((p) => p && { lat: round(p.lat, 5), lon: round(p.lon, 5) }), ground: await text(page, 'result-ground'), sheet: await text(page, 'result-sheet') };
    await shot('measure');
    const disc = await page.locator('[data-qa="handle-0"] [data-qa="handle-disc"]').boundingBox();
    const c = [disc.x + disc.width / 2, disc.y + disc.height / 2];
    await drag(page, c, [c[0] + 0.1 * m.w, c[1] + 0.05 * m.h]);
    await page.waitForTimeout(200);
    out.measure.afterHandleDrag = { points: (await points(page)).map((p) => p && { lat: round(p.lat, 5), lon: round(p.lon, 5) }), ground: await text(page, 'result-ground') };
  }
  await lab.getByRole('button', { name: 'הצג דוגמה' }).click();
  await page.waitForTimeout(300);
  out.example = { ground: await text(page, 'result-ground'), sheet: await text(page, 'result-sheet'), height: (await layout(page)).lab.h };
  await page.click('[data-qa="calc-details"] summary');
  await page.waitForTimeout(300);
  out.example.chain = await text(page, 'calc-chain');
  out.example.detailsLayout = await layout(page);
  await shot('measure-details');
  await page.screenshot({ path: `${outDir}/${tag}-${key}-measure-details-full.png`, fullPage: true });
  await lab.getByRole('button', { name: 'ניקוי נקודות' }).click();
  await page.click('[data-qa="calc-details"] summary');

  // Explore again: wheel anchor and pan.
  await lab.getByRole('tab', { name: 'חקירה' }).click();
  await page.waitForTimeout(400);
  {
    const m = await mapRect(page);
    const unitsAt = (v, f) => (f - v.x) / v.k; // fraction of the map → fraction of the sheet
    const before = await view(page);
    await page.mouse.move(...at(m, 0.25, 0.25));
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
    const after = await view(page);
    out.wheel = { k: round(after.k, 3), anchorBefore: round(unitsAt(before, 0.25)), anchorAfter: round(unitsAt(after, 0.25)) };
    await drag(page, at(m, 0.15, 0.15), at(m, 0.05, 0.15));
    await page.waitForTimeout(200);
    const panned = await view(page);
    out.pan = { dxFraction: round(panned.x - after.x), dyFraction: round(panned.y - after.y) };
    await shot('zoomed');
  }

  report[key] = out;
  } finally {
    await page.close();
  }
}
await writeFile(`${outDir}/${tag}-report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
