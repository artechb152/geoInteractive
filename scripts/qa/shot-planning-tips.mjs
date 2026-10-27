// Screenshots of lesson 6 „דגשים לתכנון ולניווט” (live at /lessons/topic-06/#scene-tips), task 27.
// Usage: node scripts/qa/shot-planning-tips.mjs [outDir] [tag] [base]
//   Every tip of both screens and every question state at 1440 × 1122, each
//   screen scrolled under the site header, plus 2× crops of the map per tip.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/planning-tips';
const tag = process.argv[3] ?? 'after';
const BASE = process.argv[4] ?? process.env.QA_BASE ?? 'http://localhost:3000';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const open = async (scale = 1) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/lessons/topic-06/#scene-tips`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('[data-tips-screen="question"]', { timeout: 120000 });
  await page.waitForTimeout(1500);
  return page;
};

/** Scroll so the screen's top sits 16px under the fixed site header (smooth scroll is on site-wide). */
const toScreen = (page, id) =>
  page.evaluate((id) => {
    const el = document.querySelector(`[data-tips-screen="${id}"]`);
    const fit = el.closest('[data-lesson-viewport-fit]') ?? el;
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    scrollTo({ top: Math.max(0, fit.getBoundingClientRect().top + scrollY - headerH - 16), behavior: 'instant' });
  }, id);
const shot = async (page, id, name) => {
  await toScreen(page, id);
  await page.waitForTimeout(250);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${outDir}/${tag}-${name}.png` });
};

const page = await open();
await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
await page.screenshot({ path: `${outDir}/${tag}-00-top.png` });
for (const id of ['plan', 'nav']) {
  const btns = page.locator(`[data-tips-screen="${id}"] button[aria-expanded]`);
  for (let i = 0; i < 4; i++) {
    await btns.nth(i).click();
    await page.waitForTimeout(700);
    await shot(page, id, `${id}-tip${i + 1}`);
  }
}
const opt = (o) => page.locator(`[data-activity="tips-question"] [data-option="${o}"]`);
const reset = page.locator('[data-activity="tips-question"] [data-tips-reset]');
await shot(page, 'question', 'question-1-open');
await opt('looks').click();
await page.waitForTimeout(700);
await shot(page, 'question', 'question-2-wrong-looks');
await opt('continue').click();
await page.waitForTimeout(700);
await shot(page, 'question', 'question-3-wrong-continue');
await opt('direction').click();
await page.waitForTimeout(700);
await shot(page, 'question', 'question-4-wrong-direction');
await opt('recheck').click();
await page.waitForTimeout(700);
await shot(page, 'question', 'question-5-fixed');
await reset.click();
await page.waitForTimeout(700);
await shot(page, 'question', 'question-6-reset-focus');
// keyboard only: Tab to the second answer, Enter; Tab, Space
await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
await shot(page, 'question', 'question-7-keyboard-wrong');
await page.keyboard.press('Tab');
await page.keyboard.press('Space');
await page.waitForTimeout(700);
await shot(page, 'question', 'question-8-keyboard-fixed');
await page.close();

// 2× map crops, one per tip
const hi = await open(2);
for (const id of ['plan', 'nav']) {
  const btns = hi.locator(`[data-tips-screen="${id}"] button[aria-expanded]`);
  for (let i = 0; i < 4; i++) {
    await btns.nth(i).click();
    await hi.waitForTimeout(800);
    await hi.locator(`[data-tips-screen="${id}"] [data-tips-board]`).screenshot({ path: `${outDir}/${tag}-board-${id}${i + 1}.png` });
  }
}
await hi.close();

if (errors.length) console.log('ERRORS', errors.slice(0, 10));
else console.log('ok', outDir);
await browser.close();
