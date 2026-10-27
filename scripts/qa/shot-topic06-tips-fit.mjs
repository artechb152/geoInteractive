// QA probe for the topic-06 „דגשים לתכנון ולניווט” laptop fit.
// The part is archived (/archive/topic-06/tips/, behind the archive gate); behaviour
// is tested in planning-tips.test.mjs and every state is shot by shot-planning-tips.mjs.
// Usage: node scripts/qa/shot-topic06-tips-fit.mjs <outDir> <tag> [base] [--states]
//   Screenshots each screen of the sub-topic scrolled into view, a full-page
//   shot, and (with --states) every tip / answer state of every screen.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic06-tips-fit';
const tag = process.argv[3] ?? 'probe';
const BASE = process.argv[4] ?? 'http://localhost:3000';
const STATES = process.argv.includes('--states');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
  [1366, 768],
].filter(([w, h]) => !ONLY || ONLY.includes(`${w}x${h}`));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

const probe = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const section = document.getElementById('scene-tips');
    const screens = [...(section?.querySelectorAll('[data-tips-screen]') ?? [])];
    return {
      vw: innerWidth,
      vh: innerHeight,
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      header: r(document.querySelector('header')),
      sceneHeader: r(section?.querySelector('header')),
      section: r(section),
      fits: [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({
        scale: el.getAttribute('data-fit-scale'),
        rect: r(el),
      })),
      screens: screens.map((s) => ({ id: s.getAttribute('data-tips-screen'), rect: r(s) })),
      next: r([...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא')),
    };
  });

/** Scroll so the screen's top sits right under the sticky site header. */
const scrollToScreen = (page, id) =>
  page.evaluate((id) => {
    const el = document.querySelector(`[data-tips-screen="${id}"]`);
    const fit = el?.closest('[data-lesson-viewport-fit]') ?? el;
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const top = fit.getBoundingClientRect().top + scrollY - headerH - 24;
    scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }, id);

const report = {};
// A dev-server full reload (another session's edit) can destroy the page
// mid-run; retry the whole viewport when that happens.
async function runViewport(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}x${h} ${m.text()}`); });
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => localStorage.setItem('archive:auth', JSON.stringify({ at: Date.now() })));
  await page.goto(`${BASE}/archive/topic-06/tips/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('[data-tips-screen="question"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  const key = `${w}x${h}`;
  report[key] = { initial: await probe(page) };
  await page.screenshot({ path: `${outDir}/${tag}-${key}-top.png` });
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });

  for (const id of ['plan', 'nav', 'question']) {
    await scrollToScreen(page, id);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-${id}.png` });
  }

  if (STATES) {
    const states = {};
    for (const id of ['plan', 'nav']) {
      const count = await page.locator(`[data-tips-screen="${id}"] button[aria-expanded]`).count();
      for (let i = 0; i < count; i++) {
        await page.locator(`[data-tips-screen="${id}"] button[aria-expanded]`).nth(i).click();
        await page.waitForTimeout(600);
        await scrollToScreen(page, id);
        await page.waitForTimeout(300);
        states[`${id}-${i + 1}`] = await probe(page);
        await page.screenshot({ path: `${outDir}/${tag}-${key}-${id}-tip${i + 1}.png` });
      }
    }
    const opts = page.locator('[data-activity="tips-question"] button[aria-pressed]');
    for (const i of [0, 2]) {
      await opts.nth(i).click();
      await page.waitForTimeout(700);
      await scrollToScreen(page, 'question');
      await page.waitForTimeout(300);
      states[`question-${i + 1}`] = await probe(page);
      await page.screenshot({ path: `${outDir}/${tag}-${key}-question-opt${i + 1}.png` });
    }
    report[key].states = states;
  }
  } finally {
    await page.close();
  }
}
for (const [w, h] of VIEWPORTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      await runViewport(w, h);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      errors.push(`${w}x${h} retry ${attempt}: ${String(e).split('\n')[0]}`);
    }
  }
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
