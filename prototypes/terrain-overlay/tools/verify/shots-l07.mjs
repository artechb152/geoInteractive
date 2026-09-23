/**
 * shots-l07.mjs — אימות חזותי ממוקד למצבי ההשוואה, מסלול השיעור,
 * חתך הגובה ומחוון ההתקדמות.
 *
 *   node tools/verify/shots-l07.mjs --base=http://localhost:5188/
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, resolveBrowser, flag, log } from '../lib/geo.mjs';

const OUT = resolve(ROOT, String(flag('out', 'tools/verify/shots')));
const BASE = String(flag('base', 'http://localhost:5188/'));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveBrowser(), headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 1150 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const shot = async (name) => {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  log('shot', name);
};
const click = async (name, exact = true) => {
  await page.getByRole('button', { name, exact }).first().click();
  await page.waitForTimeout(500);
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const skip = page.getByRole('button', { name: 'דילוג' });
if (await skip.count()) await skip.first().click();
await page.waitForTimeout(400);

await shot('20-wipe-default');

await page.getByRole('radio', { name: 'שקיפות' }).click();
await page.waitForTimeout(400);
await shot('21-fade');

await page.getByRole('radio', { name: 'זה לצד זה' }).click();
await page.waitForTimeout(700);
await shot('22-split');

await page.getByRole('radio', { name: 'הצללה' }).click();
await page.waitForTimeout(900);
await shot('23-hillshade');

await page.getByRole('radio', { name: 'וילון' }).click();
await page.waitForTimeout(500);

// כרטיס + חתך גובה
await click('כיפה');
await page.waitForTimeout(400);
const prof = page.getByRole('button', { name: 'החתך האופייני של הצורה' });
if (await prof.count()) {
  await prof.first().click();
  await page.waitForTimeout(1500);
  await shot('24-profile');
} else {
  log('!! לא נמצא כפתור חתך הגובה');
}

// מסלול שיעור
await page.getByRole('button', { name: 'שיעור', exact: true }).first().click();
await page.waitForTimeout(600);
await shot('25-lesson-intro');
await click('התחלת השיעור');
await page.waitForTimeout(700);
await shot('26-lesson-explore');

// עזרה
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'קיצורי מקלדת ועזרה' }).first().click();
await page.waitForTimeout(400);
await shot('27-help');
await page.keyboard.press('Escape');

// מסך צר
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(600);
await shot('28-narrow-modes');

await browser.close();
if (errors.length) {
  log('\n!! שגיאות קונסול:');
  errors.forEach((e) => log('  ' + e));
  process.exitCode = 1;
} else {
  log('\nאין שגיאות קונסול.');
}
log('DONE →', OUT);
