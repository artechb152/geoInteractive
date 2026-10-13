// QA capture for the landforms laptop fit (topic-02 #scene-landforms).
//
//   QA_PORT=3147 node scripts/qa/probe-landforms-fit.mjs <outDir> <tag> [WxH ...]
//
// Per viewport (default 1920x1080, 1440x1122, 1536x864, 1366x768):
//   - <tag>-<W>x<H>-top.png     first screen (scene header + landform board) at scroll 0
//   - <tag>-<W>x<H>-slopes.png  second screen (slope analyzer) scrolled under the site header
//   - <tag>-<W>x<H>-full.png    whole page
//   - <tag>-<W>x<H>-lf-<n>.png / -sl-<n>.png  every landform tab (+ the saddle switch) / slope tab
// and prints, per state, the screen boxes, fit scales and overflow checks:
//   cut      = a screen's bottom lies below the viewport bottom when scrolled to its top
//   clipped  = an element inside the board/analyzer pokes outside its card
//   hScroll  = horizontal page overflow
// Exit 1 on a page error.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const [outDir = 'design/screenshots/topic02-landforms-fit', tag = 'shot', ...sizes] = process.argv.slice(2);
const VIEWPORTS = (sizes.length ? sizes : ['1920x1080', '1440x1122', '1536x864', '1366x768']).map((s) => s.split('x').map(Number));
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landforms`;
const LANDFORM_TABS = ['כיפה', 'שלוחה', 'גיא ואוכף', 'מכתש'];
const SLOPE_TABS = ['מדרון קצוב', 'מדרון קמור', 'מדרון קעור', 'כתף'];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
let failed = false;

const measure = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom + scrollY) };
    };
    const sec = document.getElementById('scene-landforms');
    const board = document.querySelector('[data-qa="forms-board"]');
    const slopes = document.querySelector('[data-qa="slope-analyzer"]');
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    // Elements that stick out of their card (labels pushed off a frame, text overflow).
    const clipped = [];
    for (const card of [board, slopes]) {
      const c = card.getBoundingClientRect();
      for (const el of card.querySelectorAll('button, p, span, text, svg, canvas, figure')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)
          clipped.push(`${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim().slice(0, 20)}`);
      }
    }
    const fits = [...document.querySelectorAll('[data-lesson-viewport-fit]')];
    const first = fits[0] ?? sec.querySelector('header');
    const s1Top = first.getBoundingClientRect().top + scrollY;
    const s1Bottom = board.getBoundingClientRect().bottom + scrollY;
    const s2Bottom = slopes.getBoundingClientRect().bottom + scrollY;
    const s2Top = slopes.getBoundingClientRect().top + scrollY;
    return {
      scales: fits.map((el) => Number(el.dataset.fitScale)),
      screen1: { top: Math.round(s1Top), h: Math.round(s1Bottom - s1Top), cut: Math.max(0, Math.round(s1Bottom - innerHeight)) },
      screen2: { h: Math.round(s2Bottom - s2Top), cut: Math.max(0, Math.round(s2Bottom - s2Top - (innerHeight - headerH))) },
      gap12: Math.round(s2Top - s1Bottom),
      board: box(board),
      fitBoxes: fits.map(box),
      clipped: clipped.slice(0, 8),
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      docH: document.documentElement.scrollHeight,
    };
  });

const scrollToSlopes = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('[data-qa="slope-analyzer"]');
    const fit = s.closest('[data-lesson-viewport-fit]') ?? s;
    const hd = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    window.scrollTo(0, fit.getBoundingClientRect().top + scrollY - hd - 24);
  });

for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.locator('[data-qa="forms-board"]').waitFor({ timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const id = `${tag}-${w}x${h}`;
  console.log(`${w}x${h} initial`, JSON.stringify(await measure(page)));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${id}-top.png` });
  await page.screenshot({ path: `${outDir}/${id}-full.png`, fullPage: true });

  // Every landform tab; the shared valley/saddle tab is shot once per form.
  let n = 0;
  for (const name of LANDFORM_TABS) {
    await page.getByRole('tab', { name: new RegExp(name) }).first().click();
    await page.waitForTimeout(2200);
    await page.evaluate(() => window.scrollTo(0, 0));
    const shots = name === 'גיא ואוכף' ? ['גיא', 'אוכף'] : [null];
    for (const pick of shots) {
      if (pick) {
        await page.getByRole('button', { name: pick, exact: true }).click();
        await page.waitForTimeout(1800);
      }
      n++;
      const m = await measure(page);
      console.log(`${w}x${h} lf-${n} ${pick ?? name}`, JSON.stringify({ scales: m.scales, screen1: m.screen1, clipped: m.clipped, hScroll: m.hScroll }));
      await page.screenshot({ path: `${outDir}/${id}-lf-${n}.png` });
    }
  }

  await scrollToSlopes(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${id}-slopes.png` });
  for (const [i, name] of SLOPE_TABS.entries()) {
    await page.getByRole('tab', { name: new RegExp(name) }).click();
    await page.waitForTimeout(1400);
    await scrollToSlopes(page);
    await page.waitForTimeout(300);
    const m = await measure(page);
    const selected = await page.getByRole('tab', { name: new RegExp(name) }).getAttribute('aria-selected');
    console.log(`${w}x${h} sl-${i + 1} ${name}`, JSON.stringify({ selected, scales: m.scales, screen2: m.screen2, gap12: m.gap12, clipped: m.clipped }));
    await page.screenshot({ path: `${outDir}/${id}-sl-${i + 1}.png` });
  }

  if (errors.length) {
    console.error(`${w}x${h} page errors`, errors.slice(0, 3));
    failed = true;
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
