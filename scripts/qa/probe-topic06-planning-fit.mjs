// QA probe for the topic-06 "תכנון ציר" laptop fit.
// Usage: node scripts/qa/probe-topic06-planning-fit.mjs <outDir> <tag> [base]
// Screenshots each screen of the planning section at every target viewport,
// then exercises the route builder (list, map, prev/next, keyboard) and the
// pacing slider, and reports geometry + state so scale-independence can be
// checked (same active step, same pace numbers at every viewport).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic06-planning-fit';
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

const geometry = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom + scrollY) };
    };
    const section = document.getElementById('scene-planning');
    const fits = [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({
      scale: el.getAttribute('data-fit-scale'),
      rect: r(el),
    }));
    const header = document.querySelector('header');
    const nav = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא');
    const lines = (el) => {
      if (!el) return null;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 1;
      return Math.round(el.offsetHeight / lh);
    };
    const cards = [...(section?.querySelectorAll('[data-qa="route-builder"] ol button') ?? [])];
    return {
      vw: innerWidth,
      vh: innerHeight,
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      siteHeader: r(header),
      fits,
      section: r(section),
      builder: r(section?.querySelector('[data-qa="route-builder"]')),
      map: r(section?.querySelector('[data-qa="route-builder"] svg[role="img"]')),
      pacing: r(section?.querySelector('[data-qa="pacing"]')),
      nextBtn: r(nav),
      introLines: lines(section?.querySelector('header p')),
      cardLines: cards.map((c) => lines(c.querySelector('.text-sm'))),
    };
  });

const state = (page) =>
  page.evaluate(() => {
    const section = document.getElementById('scene-planning');
    const cards = [...section.querySelectorAll('[data-qa="route-builder"] ol button')];
    const counter = section.querySelector('[data-qa="route-builder"] [data-stop-label]');
    const pacing = section.querySelector('[data-qa="pacing"]');
    return {
      active: cards.findIndex((c) => c.getAttribute('aria-current') === 'step'),
      counter: counter?.textContent,
      live: section.querySelector('[data-qa="route-builder"] [aria-live]')?.textContent,
      distance: pacing?.querySelector('input[type=range]')?.value,
      paceLive: pacing?.querySelector('[aria-live]')?.textContent,
      calc: [...(pacing?.querySelectorAll('div') ?? [])].find((d) => d.textContent?.startsWith('חישוב לדוגמה'))?.textContent,
    };
  });

const report = {};
async function runViewport(w, h) {
  const key = `${w}x${h}`;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
  page.on('pageerror', (e) => errors.push(`${key} ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${key} ${m.text()}`); });
  // Other sessions edit this checkout while the dev server runs; a hot reload
  // can blank the page mid-probe, so retry the load until the scene is there.
  for (let attempt = 0; ; attempt++) {
    await page.goto(`${BASE}/lessons/topic-06/#scene-planning`, { waitUntil: 'load', timeout: 180000 }).catch(() => {});
    const ok = await page
      .waitForSelector('#scene-planning [data-qa="pacing"]', { timeout: 30000 })
      .then(() => true, () => false);
    if (ok || attempt >= 3) break;
  }
  await page.waitForTimeout(2500);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
  const geo = await geometry(page);
  report[key] = { geo };

  // Screen shots: top of page (screen 1), and each fit wrapper scrolled under the header.
  await page.screenshot({ path: `${outDir}/${tag}-${key}-top.png` });
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });
  const fitCount = geo.fits.length;
  for (let i = 1; i < fitCount; i++) {
    await page.evaluate((idx) => {
      const el = document.querySelectorAll('#scene-planning [data-lesson-viewport-fit]')[idx];
      const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerH - 24, behavior: 'instant' });
    }, i);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-screen${i + 1}.png` });
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);

  // Interactions — route builder.
  const steps = [];
  const section = page.locator('#scene-planning');
  const cards = section.locator('[data-qa="route-builder"] ol button');
  await cards.nth(2).click();
  steps.push({ after: 'click card 3', ...(await state(page)) });
  await section.getByRole('button', { name: 'לנקודה או לקטע הבא' }).click();
  steps.push({ after: 'next', ...(await state(page)) });
  await section.getByRole('button', { name: 'לנקודה או לקטע הקודם' }).click();
  await section.getByRole('button', { name: 'לנקודה או לקטע הקודם' }).click();
  steps.push({ after: 'prev x2', ...(await state(page)) });
  await cards.nth(1).focus();
  await page.keyboard.press('End');
  steps.push({ after: 'key End', ...(await state(page)) });
  await page.keyboard.press('Home');
  steps.push({ after: 'key Home', ...(await state(page)) });

  // Map clicks: press the mouse on each checkpoint marker's on-screen centre.
  // elementFromPoint must resolve inside that marker's clickable group, so a
  // raw-coordinate click proves the scaled SVG still maps pointer → target exactly.
  const mapHits = [];
  const gCount = await section.locator('[data-qa="route-builder"] svg g.cursor-pointer').count();
  for (let i = gCount - 1; i >= 0; i--) {
    await page.evaluate((idx) => {
      const g = document.querySelectorAll('#scene-planning [data-qa="route-builder"] svg g.cursor-pointer')[idx];
      g.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, i);
    await page.waitForTimeout(250);
    const pt = await page.evaluate((idx) => {
      const g = document.querySelectorAll('#scene-planning [data-qa="route-builder"] svg g.cursor-pointer')[idx];
      const c = [...g.querySelectorAll('circle')].sort((a, b) => b.r.baseVal.value - a.r.baseVal.value)[0] ?? g;
      const b = c.getBoundingClientRect();
      const x = b.x + b.width / 2;
      const y = b.y + b.height / 2;
      const el = document.elementFromPoint(x, y);
      return { x, y, hitOk: !!(el && g.contains(el)) };
    }, i);
    await page.mouse.click(pt.x, pt.y);
    mapHits.push({ group: i, hitOk: pt.hitOk, ...(await state(page)) });
  }
  await page.screenshot({ path: `${outDir}/${tag}-${key}-after-map-click.png` });

  // Pacing slider: drag thumb to the far inline-end (left in RTL), then to 1000 via keyboard.
  const slider = section.locator('[data-qa="pacing"] input[type=range]');
  await slider.scrollIntoViewIfNeeded();
  const sb = await slider.boundingBox();
  await page.mouse.move(sb.x + sb.width - 12, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height / 2, { steps: 6 });
  await page.mouse.up();
  const midDrag = await state(page);
  await page.mouse.click(sb.x + 2, sb.y + sb.height / 2);
  const leftEnd = await state(page);
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 19; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(700);
  const kb = await state(page);
  await page.evaluate(() => {
    const el = document.querySelector('#scene-planning [data-qa="pacing"]');
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerH - 24, behavior: 'instant' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${tag}-${key}-pacing-1000.png` });

  report[key].steps = steps;
  report[key].mapHits = mapHits;
  report[key].slider = { midDrag, leftEnd, kb };
  } finally {
    await page.close();
  }
}

// A hot reload caused by another session's edit aborts a run; retry that viewport.
for (const [w, h] of VIEWPORTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      await runViewport(w, h);
      break;
    } catch (e) {
      errors.push(`${w}x${h} attempt ${attempt}: ${String(e).split('\n')[0]}`);
      if (attempt >= 4) throw e;
    }
  }
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
