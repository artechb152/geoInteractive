// QA probe for the topic-06 "לפני שמתחילים" laptop fit.
// Usage: node scripts/qa/probe-topic06-onboarding-fit.mjs <outDir> <tag> [base] [--states]
//   --states also opens every accordion step (and the all-closed state) and
//   screenshots each one, scrolled to the first composition.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const STATES = process.argv.includes('--states');
const outDir = args[0] ?? 'design/screenshots/topic06-onboarding-fit';
const tag = args[1] ?? 'probe';
const BASE = args[2] ?? 'http://localhost:3000';
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
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
    const section = document.getElementById('scene-onboarding');
    const fits = [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({
      scale: el.getAttribute('data-fit-scale'),
      rect: r(el),
    }));
    const header = section?.querySelector('header');
    const grid = section?.querySelector('.grid');
    const buttons = [...(section?.querySelectorAll('button[aria-controls^="step-panel-"]') ?? [])];
    const panel = section?.querySelector('[id^="step-panel-"]');
    const stage = grid?.children[1];
    const cards = section?.querySelectorAll('article');
    const callout = section?.querySelector('section');
    const siteHeader = document.querySelector('body header');
    const nav = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא');
    const label = stage?.querySelector('.absolute');
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollY,
      headerH: getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      siteHeader: r(siteHeader),
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fits,
      section: r(section),
      header: r(header),
      grid: r(grid),
      accordion: r(grid?.children[0]),
      stage: r(stage),
      stageLabel: r(label),
      panel: r(panel),
      firstButton: r(buttons[0]),
      lastButton: r(buttons[buttons.length - 1]),
      firstCard: r(cards?.[0]),
      lastCard: r(cards?.[cards.length - 1]),
      callout: r(callout),
      nextBtn: r(nav),
    };
  });

// The dev server is shared with other sessions, so an HMR full reload can
// land mid-run: retry a viewport from scratch when that happens.
async function withRetry(fn, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries || !/context was destroyed|Timeout|navigat/i.test(String(e))) throw e;
      console.error(`retry ${i}: ${String(e).split('\n')[0]}`);
    }
  }
}

const report = {};
for (const [w, h] of VIEWPORTS) await withRetry(async () => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}x${h} ${m.text()}`); });
  await page.goto(`${BASE}/lessons/topic-06/#scene-onboarding`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector('#scene-onboarding [aria-controls="step-panel-plan"]', { timeout: 120000 });
  await page.waitForTimeout(1800);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  const key = `${w}x${h}`;
  report[key] = { initial: await probe(page) };
  await page.screenshot({ path: `${outDir}/${tag}-${key}.png` });
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true });

  // Second composition: scrolled so its top sits just under the site header.
  const second = await page.evaluate(() => {
    const fits = document.querySelectorAll('#scene-onboarding [data-lesson-viewport-fit]');
    const el = fits[1] ?? document.querySelector('#scene-onboarding h3');
    const hh = document.querySelector('body header')?.getBoundingClientRect().height ?? 0;
    const y = el.getBoundingClientRect().top + scrollY - hh - 24;
    scrollTo(0, y);
    return y;
  });
  await page.waitForTimeout(500);
  report[key].second = { scrolledTo: second, ...(await probe(page)) };
  await page.screenshot({ path: `${outDir}/${tag}-${key}-screen2.png` });

  if (STATES) {
    report[key].states = {};
    const ids = ['plan', 'start', 'travel', 'arrive'];
    for (const id of ids) {
      await page.evaluate(() => scrollTo(0, 0));
      const btn = page.locator(`button[aria-controls="step-panel-${id}"]`);
      if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
      await page.waitForTimeout(700);
      report[key].states[id] = await probe(page);
      await page.screenshot({ path: `${outDir}/${tag}-${key}-step-${id}.png` });
    }
    // All closed: click the open one again.
    await page.locator('button[aria-controls="step-panel-arrive"]').click();
    await page.waitForTimeout(700);
    report[key].states.closed = await probe(page);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-step-closed.png` });
  }
  await page.close();
});
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
