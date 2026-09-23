/**
 * shots.mjs — רתמת אימות חזותי. מריצה את הרכיב מול preview ומצלמת מסכי מפתח
 * בכמה רוחבים. זהו הבסיס לסוויטת רגרסיה חזותית אמיתית (L-08).
 *
 *   npm run build && npm run preview &
 *   node tools/verify/shots.mjs [--out=tools/verify/shots] [--base=http://localhost:4173/]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, resolveBrowser, flag, log } from '../lib/geo.mjs';

const OUT = resolve(ROOT, String(flag('out', 'tools/verify/shots')));
const BASE = String(flag('base', 'http://localhost:4173/'));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveBrowser(), headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
const shot = async (name) => {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false });
  log('shot', name);
};
const click = async (name, exact = true) => {
  await page.getByRole('button', { name, exact }).first().click();
  await page.waitForTimeout(450);
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// דילוג על ההדרכה אם היא נפתחה
const skip = page.getByRole('button', { name: 'דילוג' });
if (await skip.count()) await skip.first().click();
await page.waitForTimeout(300);

await shot('01-initial');

await click('כיפה');
await shot('02-dome-card');

await click('הצג מפה טופוגרפית בלבד');
await click('מדרון');
await shot('03-slope-flow');

await click('גיא / ואדי');
await shot('04-valley-flow');

await click('אוכף');
await shot('05-saddle');

await click('הצג הכול');
await shot('06-showall');
await click('הצג הכול');

// זום (L-03)
await click('התקרבות');
await click('התקרבות');
await shot('07-zoom');
await click('התאמה למסך');

// בורר אזורים (L-01)
const picker = page.getByRole('tab').nth(1);
if (await picker.count()) {
  await picker.click();
  await page.waitForTimeout(1200);
  await shot('08-second-area');
  await page.getByRole('tab').first().click();
  await page.waitForTimeout(900);
}

// מצב תרגול (L-02)
const quiz = page.getByRole('button', { name: 'תרגול' });
if (await quiz.count()) {
  await quiz.first().click();
  await page.waitForTimeout(700);
  await shot('09-quiz');
  const explore = page.getByRole('button', { name: 'חקירה' });
  if (await explore.count()) await explore.first().click();
  await page.waitForTimeout(400);
}

// מסכים צרים (M-02)
for (const w of [360, 390, 768]) {
  await page.setViewportSize({ width: w, height: 860 });
  await page.waitForTimeout(500);
  await shot(`10-narrow-${w}`);
}
await page.setViewportSize({ width: 390, height: 860 });
await click('שלוחה');
await shot('11-narrow-card');

// לרוחב בטלפון
await page.setViewportSize({ width: 860, height: 420 });
await page.waitForTimeout(500);
await shot('12-landscape');

await browser.close();
log('DONE →', OUT);
