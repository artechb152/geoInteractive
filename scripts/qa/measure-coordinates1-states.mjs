// Heights of every state of each "קואורדינטות 1" screen (topic-02 #scene-coordinates), at one viewport.
// A screen's height runs from its heading's top to the bottom of its last part (margins excluded).
// Usage: node scripts/qa/measure-coordinates1-states.mjs [base] [WxH]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3117';
const [width, height] = (process.argv[3] ?? '1920x1080').split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle', timeout: 240000 });
await page.waitForSelector('#scene-coordinates', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(3000);

const sec = page.locator('#scene-coordinates');
const root = (title) => sec.locator('h3', { hasText: title }).locator('xpath=ancestor::div[contains(@class,"my-10")][1]');
const span = (title, last = null) =>
  page.evaluate(
    ([t, l]) => {
      const h = [...document.querySelectorAll('#scene-coordinates h3')].find((x) => x.textContent.includes(t));
      const r = h.closest('.my-10');
      const end = l ? r.querySelector(l) : r.lastElementChild;
      return Math.round(end.getBoundingClientRect().bottom - h.getBoundingClientRect().top);
    },
    [title, last],
  );
const out = {};
const settle = () => page.waitForTimeout(900);

// Screen: אליפסואיד, גיאואיד וגליות
const RB = 'אליפסואיד, גיאואיד וגליות';
for (const tab of ['פני השטח', 'אליפסואיד', 'גיאואיד', 'גליות וגובה']) {
  await root(RB).getByRole('tab', { name: tab }).click();
  await settle();
  out[`bodies:${tab}`] = await span(RB);
  if (tab === 'אליפסואיד') {
    await root(RB).getByRole('button', { name: 'הגדלת האזור' }).click();
    await page.waitForTimeout(1600);
    out['bodies:אליפסואיד+zoom'] = await span(RB);
    await root(RB).getByRole('button', { name: 'חזרה למבט הכללי' }).click();
  }
  if (tab === 'גיאואיד') {
    await root(RB).getByRole('button', { name: 'חשיפת משטחי הייחוס' }).click();
    await settle();
    out['bodies:גיאואיד+clear'] = await span(RB);
  }
}

// Screen: דאטום — the stage (heading → card) and the two parameter cards
const DG = 'דאטום: התאמת';
const stageEnd = '.surface-elevated';
out['datum:step1'] = await span(DG, stageEnd);
await root(DG).getByRole('button', { name: /מיקום וכיוון/ }).click();
await settle();
out['datum:step2'] = await span(DG, stageEnd);
await root(DG).getByRole('button', { name: 'נסו בעצמכם' }).click();
await settle();
out['datum:step2-experiment'] = await span(DG, stageEnd);
await root(DG).getByRole('button', { name: /עולמי ומקומי/ }).click();
await settle();
out['datum:step3'] = await span(DG, stageEnd);
out['datum:cards'] = await page.evaluate(() => {
  const h = [...document.querySelectorAll('#scene-coordinates h3')].find((x) => x.textContent.includes('דאטום: התאמת'));
  return Math.round(h.closest('.my-10').lastElementChild.getBoundingClientRect().height);
});

// Screen: הדמיה — three stages
const DF = 'הדמיה: מה קורה';
out['field:compare'] = await span(DF);
await root(DF).getByRole('radio', { name: /דאטום B/ }).click().catch(() => {});
await settle();
out['field:compare-B'] = await span(DF);
await root(DF).getByRole('tab', { name: /בודקים את הטעות/ }).click();
await settle();
out['field:error'] = await span(DF);
for (const name of [/העתקה/, /המרה/]) {
  const b = root(DF).getByRole('button', { name }).first();
  if (await b.count()) {
    await b.click().catch(() => {});
    await page.waitForTimeout(2500);
    out[`field:error+${name.source}`] = await span(DF);
  }
}
await root(DF).getByRole('tab', { name: /מתרגלים/ }).click();
await settle();
out['field:practice'] = await span(DF);

// Screen: הגדרות + סיכום
out['definitions'] = await page.evaluate(() => Math.round(document.querySelector('#scene-coordinates').children[1].getBoundingClientRect().height));
out['summary'] = await page.evaluate(() => Math.round(document.querySelector('#scene-coordinates').lastElementChild.getBoundingClientRect().height));
console.log(`${width}x${height}`, JSON.stringify(out, null, 1));
await browser.close();
