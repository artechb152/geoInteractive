// Screenshot of topic-02 „תרגול: סיווג מרכיבי השטח” (#scene-relief-cover, the quiz screen).
//   QA_PORT=3117 node scripts/qa/shot-terrain-classification.mjs <label> [w] [h]
// Scrolls the quiz screen to just under the fixed header and saves
//   design/screenshots/terrain-classification/<label>-<w>x<h>.png
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const [label = 'after', w = '1440', h = '1122'] = process.argv.slice(2);
const outDir = 'design/screenshots/terrain-classification';
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(`http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`, { waitUntil: 'networkidle', timeout: 180000 });
const quiz = page.locator('#scene-relief-cover [data-qa="sort-quiz"]');
await quiz.waitFor({ timeout: 120000 });
await page.evaluate(() => {
  const el = document.querySelector('#scene-relief-cover [data-qa="sort-quiz"]').closest('[data-lesson-viewport-fit]');
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 104);
});
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const fit = document.querySelector('#scene-relief-cover [data-qa="sort-quiz"]').closest('[data-lesson-viewport-fit]');
  const r = fit.getBoundingClientRect();
  return { scale: fit.dataset.fitScale, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: `${outDir}/${label}-${w}x${h}.png` });
await browser.close();
