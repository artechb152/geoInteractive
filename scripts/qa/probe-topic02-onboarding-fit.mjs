// QA probe for the topic-02 "לפני שמתחילים" laptop fit.
// Usage: node scripts/qa/probe-topic02-onboarding-fit.mjs <outDir> <tag> [base]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic02-onboarding-fit';
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

const probeOnce = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) };
    };
    const section = document.getElementById('scene-onboarding');
    const fits = [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({
      scale: el.getAttribute('data-fit-scale'),
      rect: r(el),
    }));
    const header = section?.querySelector('header');
    const grid = section?.querySelector('.grid');
    const buttons = [...(section?.querySelectorAll('button[aria-controls^="layer-panel-"]') ?? [])];
    const panel = section?.querySelector('[id^="layer-panel-"]');
    const map = grid?.children[1];
    const callout = section?.querySelector('section');
    const main = document.querySelector('main');
    const canvas = map?.querySelector('canvas');
    let canvasInk = null;
    try {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      const cx = c.getContext('2d');
      cx.drawImage(canvas, 0, 0, 8, 8);
      const d = cx.getImageData(0, 0, 8, 8).data;
      canvasInk = d.reduce((n, v, i) => n + (i % 4 === 3 ? 0 : v), 0);
    } catch { /* not ready */ }
    const nav = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא');
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollY,
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fits,
      section: r(section),
      header: r(header),
      grid: r(grid),
      accordion: r(grid?.children[0]),
      map: r(map),
      panel: r(panel),
      firstButton: r(buttons[0]),
      lastButton: r(buttons[buttons.length - 1]),
      callout: r(callout),
      nextBtn: r(nav),
      main: r(main),
      expanded: buttons.map((b) => b.getAttribute('aria-expanded')).join(''),
      canvas: canvas ? { buf: `${canvas.width}x${canvas.height}`, ink: canvasInk } : null,
    };
  });

// The dev server can hot-reload mid-run; retry once the page settles.
const probe = async (page) => {
  for (let i = 0; ; i++) {
    try {
      return await probeOnce(page);
    } catch (e) {
      if (i >= 4) throw e;
      await page.waitForTimeout(1500);
    }
  }
};

// Other sessions keep the dev server recompiling; a reload can land
// mid-step. Each state is therefore reached from a fresh load, retried.
const load = async (page) => {
  for (let i = 0; ; i++) {
    try {
      await page.goto('about:blank');
      await page.goto(`${BASE}/lessons/topic-02/#scene-onboarding`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForSelector('button[aria-controls="layer-panel-ops"]', { timeout: 20000 });
      break;
    } catch (e) {
      console.error('reload', page.viewportSize(), String(e).slice(0, 80));
      if (i >= 8) throw e;
      await page.waitForTimeout(5000);
    }
  }
  await page.waitForTimeout(2500);
  await page.evaluate(() => scrollTo(0, 0));
};
const clickItem = async (page, id) => {
  for (let i = 0; ; i++) {
    try {
      await page.locator(`button[aria-controls="layer-panel-${id}"]`).click({ timeout: 8000 });
      return;
    } catch (e) {
      if (i >= 3) throw e;
      await load(page);
    }
  }
};

const report = {};
// One state = fresh load + action + probe + screenshot, retried as a whole
// when a dev-server reload lands in the middle of it.
const capture = async (page, key, state, action, file) => {
  for (let i = 0; ; i++) {
    try {
      await load(page);
      await action();
      const p = await probe(page);
      if (!p.fits.length) throw new Error('fits not rendered');
      report[key][state] = p;
      await page.screenshot({ path: `${outDir}/${tag}-${key}${file}.png` });
      return page;
    } catch (e) {
      console.error('retry', key, state, String(e).slice(0, 80));
      if (i >= 6) throw e;
      await page.waitForTimeout(5000);
    }
  }
};

for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  const key = `${w}x${h}`;
  report[key] = {};
  if (tag === 'before') {
    await load(page);
    report[key].initial = await probe(page);
    await page.screenshot({ path: `${outDir}/${tag}-${key}.png` });
    await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });
    await page.close();
    continue;
  }
  await capture(page, key, 'initial', async () => {}, '');
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });
  // Every accordion item (each one also drives a map state), the collapsed
  // state, then screen 2 scrolled up under the site header.
  const ids = ['base', 'roads', 'buildings', 'borders', 'ops'];
  for (let i = 0; i < ids.length; i++) {
    await capture(page, key, `open-${ids[i]}`, async () => {
      if (i > 0) await page.locator(`button[aria-controls="layer-panel-${ids[i]}"]`).click({ timeout: 8000 });
      await page.waitForTimeout(i > 0 ? 3000 : 200);
    }, `-open-${i + 1}-${ids[i]}`);
  }
  await capture(page, key, 'collapsed', async () => {
    await page.locator('button[aria-controls="layer-panel-base"]').click({ timeout: 8000 });
    await page.waitForTimeout(800);
  }, '-collapsed');
  await capture(page, key, 'screen2', async () => {
    await page.evaluate(() => {
      const fits = document.querySelectorAll('#scene-onboarding [data-lesson-viewport-fit]');
      const el = fits[fits.length - 1];
      scrollTo(0, el.getBoundingClientRect().top + scrollY - 80 - 16);
    });
    await page.waitForTimeout(600);
  }, '-screen2');
  await page.close();
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
