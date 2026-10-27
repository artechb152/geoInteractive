// Screenshot + checks of "מערכת קואורדינטות גיאוגרפית: יתרונות ומגבלות" (topic-02
// #scene-coordinates-2, GeoProsCons.tsx) at 1440 × 1122: its place in the sequence (after the
// base-60 workbench, before UTM), one card, the deck's slogans replaced by precise sentences, the
// figure's ground lengths of one degree of longitude (WGS84: 111 / 96 / 56 / 0 km), labels inside
// the figure and clear of each other, no horizontal overflow.
//
// Usage (a dev server serving the page):
//   QA_BASE=http://localhost:3001 node scripts/qa/shot-geo-pros-cons.mjs [outDir]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const outDir = process.argv[2] || 'design/screenshots/geo-pros-cons';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
const screen = page.locator('[data-coordinates2-screen="geo-pros-cons"]');
await screen.waitFor({ state: 'attached', timeout: 120000 });
await page.evaluate(() => {
  const el = document.querySelector('[data-coordinates2-screen="geo-pros-cons"]');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96);
});
await page.waitForTimeout(1200);

const r = await page.evaluate(() => {
  const order = [...document.querySelectorAll('[data-coordinates2-screen]')].map((e) => e.dataset.coordinates2Screen);
  const el = document.querySelector('[data-screen="geo-pros-cons"]');
  const fig = el.querySelector('[data-longitude-figure] [role="img"]').getBoundingClientRect();
  const chips = [...el.querySelectorAll('[data-km]')].map((c) => {
    const b = c.getBoundingClientRect();
    return { km: c.dataset.km, text: c.textContent, l: b.left, r: b.right, t: b.top, b: b.bottom };
  });
  return {
    order,
    cards: el.querySelectorAll('.surface-elevated').length,
    h3: el.querySelector('h3')?.textContent,
    text: el.innerText,
    chips,
    fig: { l: fig.left, r: fig.right, t: fig.top, b: fig.bottom },
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    screenH: Math.round(document.querySelector('[data-coordinates2-screen="geo-pros-cons"]').getBoundingClientRect().height),
  };
});
console.log(JSON.stringify({ ...r, text: r.text.replace(/\s+/g, ' ') }, null, 1));

const i = r.order.indexOf('geo-pros-cons');
assert.equal(r.order[i - 1], 'base60', 'after the base-60 workbench');
assert.equal(r.order[i + 1], 'utm-projection', 'before UTM');
assert.equal(r.cards, 1, 'one card');
assert.equal(r.h3, 'מערכת קואורדינטות גיאוגרפית: יתרונות ומגבלות');
for (const slogan of ['אינטואיטיבית', 'דורשת מתמטיקה גבוהה', 'פיזור לא אחיד', 'יחידות זוויתיות ולא מטריות'])
  assert.ok(!r.text.includes(slogan), `the slogan "${slogan}" is gone`);
for (const said of ['בגלובוס ראיתם', 'רשת אחת לכל כדור הארץ', 'זווית אינה מרחק', 'כ־111 ק״מ בכל מקום', 'כ־31 מ׳', 'טריגונומטריה כדורית', 'בלי חלוקה לאזורים'])
  assert.ok(r.text.includes(said), `says "${said}"`);
assert.deepEqual(r.chips.map((c) => c.km), ['111', '96', '56', '0'], 'WGS84 ground lengths of 1° of longitude');
for (const c of r.chips) assert.ok(c.l >= r.fig.l - 1 && c.r <= r.fig.r + 1 && c.t >= r.fig.t - 1 && c.b <= r.fig.b + 1, `chip ${c.km} inside the figure`);
for (let a = 0; a < r.chips.length; a++)
  for (let b = a + 1; b < r.chips.length; b++) {
    const p = r.chips[a];
    const q = r.chips[b];
    assert.ok(p.r <= q.l || q.r <= p.l || p.b <= q.t || q.b <= p.t, `chips ${p.km} and ${q.km} overlap`);
  }
assert.equal(r.overflowX, 0, 'no horizontal page scroll');

await page.screenshot({ path: `${outDir}/geo-pros-cons-1440.png` });
await screen.screenshot({ path: `${outDir}/geo-pros-cons-card.png` });
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
if (errors.length) process.exitCode = 1;
