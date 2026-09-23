/**
 * shots-l05.mjs — אימות חזותי של ספריית 16 הצורות (L-05).
 *
 * עובר על כל האזורים, פותח כל צורה, ומצלם. המטרה אינה רק "שהמסך לא נשבר":
 * צורה שאזור הלחיצה שלה יצא מגבולות המפה, או שחתימת הקונטור שלה לא צוירה,
 * עוברת קומפילציה ובדיקות יחידה בשקט — ונראית רק בעין.
 *
 *   node tools/verify/shots-l05.mjs --base=http://localhost:5188/
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

const seen = new Set();
const areas = ['gilboa', 'tavor', 'sharon', 'bental', 'meron', 'darga', 'ramon', 'yizrael'];

for (const areaId of areas) {
  /* פרמטר משתנה ב-query, ולא רק hash: ניווט שמשנה אך ורק את ה-hash אינו
     טוען מחדש את המסמך, והרכיב אינו נבנה מחדש — כלומר כל האזורים נבדקו
     בטעות על אותה מפה. */
  await page.goto(`${BASE}?run=${areaId}#area=${areaId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const skip = page.getByRole('button', { name: 'דילוג' });
  if (await skip.count()) await skip.first().click();
  await page.waitForTimeout(1100);

  /* בחירה לפי `data-id` ולא לפי אינדקס: כפתור "נקו בחירה" מופיע במקרא ברגע
     שיש בחירה פעילה ומזיז את כל האינדקסים באחד — כך שהלולאה חוזרת ולוחצת על
     השבב שכבר נבחר, וההחלפה מבטלת אותו. */
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('.tms-legend__chip')].map((el) => el.getAttribute('data-id')),
  );
  const n = ids.length;

  for (const id of ids) {
    const chip = page.locator(`.tms-legend__chip[data-id="${id}"]`);
    const label = (await chip.textContent())?.replace(/✓/g, '').trim() ?? id;
    await chip.click();
    await page.waitForTimeout(320);

    const card = page.getByRole('region', { name: /מידע על/ });
    if (!(await card.count())) {
      log(`!! ${areaId}: לחיצה על "${label}" לא פתחה כרטיס`);
      continue;
    }
    // אזור הלחיצה חייב להיות בתוך ה-viewBox
    const bad = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('.tms-feature')) {
        const b = el.getBBox();
        if (b.x < -5 || b.y < -5 || b.x + b.width > 1005 || b.y + b.height > 1005) {
          out.push(el.getAttribute('data-hit'));
        }
      }
      return out;
    });
    if (bad.length) log(`!! ${areaId}: אזור לחיצה חורג — ${bad.join(', ')}`);

    const name = label.split('\n')[0].trim();
    if (!seen.has(name)) {
      seen.add(name);
      await page.screenshot({
        path: resolve(OUT, `40-kind-${seen.size.toString().padStart(2, '0')}-${areaId}.png`),
      });
    }
  }
  log(`${areaId}: ${n} צורות נבדקו`);
}

log(`\nצורות ייחודיות שנראו: ${seen.size}`);
log([...seen].join(' · '));

await browser.close();
if (errors.length) {
  log('\n!! שגיאות קונסול:');
  [...new Set(errors)].forEach((e) => log('  ' + e.slice(0, 200)));
  process.exitCode = 1;
} else {
  log('אין שגיאות קונסול.');
}
