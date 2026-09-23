/**
 * shots-editor.mjs — אימות חזותי של עורך התוכן (L-12).
 *
 *   node tools/verify/shots-editor.mjs --base=http://localhost:5188/
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, resolveBrowser, flag, log } from '../lib/geo.mjs';

const OUT = resolve(ROOT, String(flag('out', 'tools/verify/shots')));
const BASE = String(flag('base', 'http://localhost:5188/'));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveBrowser(), headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1050 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE + '?editor=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: resolve(OUT, '30-editor.png') });
log('shot 30-editor');

// ציור מתאר חדש: ארבע לחיצות וסגירה
await page.getByRole('button', { name: '+ צורה חדשה' }).click();
await page.waitForTimeout(300);
const stage = page.locator('.tms-editor__stage');
const box = await stage.boundingBox();
for (const [fx, fy] of [
  [0.35, 0.3],
  [0.6, 0.32],
  [0.62, 0.55],
  [0.34, 0.52],
]) {
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(120);
}
await page.screenshot({ path: resolve(OUT, '31-editor-drawing.png') });
log('shot 31-editor-drawing');

await page.getByRole('button', { name: /סגירת המתאר/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(OUT, '32-editor-closed.png') });
log('shot 32-editor-closed');

const exported = await page.locator('.tms-editor__out textarea').inputValue();
try {
  const parsed = JSON.parse(exported);
  const ids = Object.keys(parsed.geometry ?? {});
  log(`ייצוא תקין: ${ids.length} צורות`);
  const drawn = parsed.geometry[ids[ids.length - 1]];
  if (!drawn?.hitPath?.startsWith('M')) {
    log('!! המתאר שצויר לא נכנס לייצוא');
    process.exitCode = 1;
  } else {
    log(`המתאר שצויר: ${drawn.hitPath.slice(0, 50)}…`);
  }
} catch (e) {
  log('!! הייצוא אינו JSON תקין: ' + e.message);
  process.exitCode = 1;
}

await browser.close();
if (errors.length) {
  log('\n!! שגיאות קונסול:');
  errors.forEach((e) => log('  ' + e));
  process.exitCode = 1;
} else {
  log('אין שגיאות קונסול.');
}
