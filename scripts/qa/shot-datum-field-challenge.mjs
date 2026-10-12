// Browser QA for the datum activity (#scene-coordinates → "הדמיה: מה קורה כשהדאטום לא תואם?",
// design/docs/datum-field-challenge-followup-claude-2026-10-12.txt §5–§11).
//
// Usage (a dev server for the lesson):
//   QA_BASE=http://localhost:3000 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs \
//     scripts/qa/shot-datum-field-challenge.mjs [outDir]
//
// Renders the real lesson route at 1440 × 1122 with the block's title just under the site header and
// checks, exit code 1 on any failure:
//   compare     A/B changes the numbers, the readout and the grid (margin values slide by 36/48 m);
//               the bridge marker never moves; one short live message per switch
//   error       copying A's numbers to the B map: the marker 60 m from the bridge, where the B grid
//               reads 1200/800; the label experiment changes only the label (and undoes); converting
//               always starts from the true source, shows "המחשת המעבר" and no number on the way,
//               then lands on the bridge with 0 m; a replay never converts twice; no reset button
//   practice    a choice is a preview (no verdict); checking judges from the data; each case's
//               mistakes get their own text and their gap on the map (60 / 120 m); back, next,
//               summary, practise again, back to the demonstration
//   layout      the instruction, the map, the action and the feedback on screen together; the card
//               follows its content with the way on next to feedback; chips inside the map and apart;
//               readable text sizes; no N glyph, hint, point picker or thumbnails
//   keyboard    stage tabs and the datum switch follow RTL arrows; options are a radio group; focus
//               is visible
//   motion      reduced motion lands at once
//   loading     a failed map says so and offers a retry; the live layers stay; the retry recovers
//   console     no page errors
// Writes per-state screenshots of the screen and of the card.
import { chromium } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { MAP, PLACES } from '../../src/components/lessons/topic-02/datum-field/datumField.data.ts';
import { xOfE, yOfN } from '../../src/components/lessons/topic-02/datum-field/datumFieldProjection.ts';

const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
const outDir = process.argv[2] || 'design/screenshots/datum-field-challenge';
const W = 1440;
const H = 1122;
const TITLE = 'הדמיה: מה קורה כשהדאטום לא תואם?';
const T = {
  toB: 'הגשר נשאר באותו מקום. בהמרה לדאטום B המספרים שמייצגים אותו משתנים.',
  raw: 'העיגול מסמן את הגשר האמיתי. המעוין מסמן לאן מפנים המספרים כשהמפה קוראת אותם בדאטום B. הם הועתקו מ־A ללא המרה, ולכן מתקבל פער של 60 מטר. זהו פער בסימון, לא תזוזה של הגשר.',
  labelled: 'הכיתוב השתנה, אבל המספרים עדיין נלקחו מדאטום A. המפה ממשיכה לקרוא אותם כ־B, ולכן הפער נשאר 60 מטר.',
  fixed: 'המספרים הומרו לייצוג המתאים לדאטום B. כשהמפה קוראת אותם, הסימון חוזר לאותו גשר. השתנה הייצוג — המקום בשטח נשאר קבוע.',
  match: 'הסימון תואם למיקום הגשר',
  moving: 'המחשת המעבר',
  c1right: 'המקור והמפה משתמשים כאן באותו דאטום. אין צורך בהמרה; המספרים המקוריים כבר מצביעים על הגשר.',
  c1wrong: 'שיניתם מספרים אף שהדאטום כבר תואם. בהדגמה הזאת השינוי מזיז את הסימון 60 מטר מהגשר.',
  c2right: 'כאן המקור הוא B והיעד הוא A, ולכן כיוון ההמרה הפוך מהדוגמה הקודמת. המספרים השתנו והסימון נשאר בצומת.',
  c2kept: 'הועתקו מספרי B למפה שקוראת אותם כ־A. הפער נשאר 60 מטר.',
  c2minus: 'הופעלה המרה בכיוון A→B אף שהנתונים כבר ב־B. בהמחשה הזאת הפער גדל ל־120 מטר.',
  summary: 'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.',
};
await mkdir(outDir, { recursive: true });
// only this script's own shots (NN-name.png) are replaced
for (const f of await readdir(outDir)) if (/^\d{2}-.*\.png$/.test(f)) await unlink(`${outDir}/${f}`);

const failures = [];
const expect = (cond, m) => cond || failures.push(m);
const near = (a, b, eps = 1.5) => a && b && Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url || '';
    if (/Failed to load resource/.test(m.text())) {
      // another block's resource (other work in progress on the page) is not this activity's error
      if (!/datum-field-challenge/.test(url)) return;
      if (opts.blockMap && /field-map\.webp/.test(url)) return;
    }
    errors.push(`${m.text()} ${url}`);
  });
  if (opts.blockMap) await page.route('**/datum-field-challenge/field-map.webp*', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const title = page.locator('h3', { hasText: TITLE });
  await title.waitFor({ timeout: 90000 });
  const root = page.locator('[data-datum-activity]');
  // the block's title just under the fixed site header
  await title.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96));
  if (!opts.blockMap) await root.locator('[data-map="ready"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  const btn = (name) => root.getByRole('button', { name, exact: true });
  return {
    page, root, errors, ctx, title, btn,
    card: root.locator('.surface-elevated'),
    tabs: root.locator('[role=tab]'),
    panel: root.locator('[role=tabpanel] > div').first(),
    footer: root.locator('[data-activity-navigation]'),
    box: root.locator('[data-map-box]'),
    target: root.locator('[data-marker="target"]'),
    result: root.locator('[data-marker="result"]'),
    chips: root.locator('[data-chip]'),
    measure: root.locator('[data-measure]'),
    measureLabel: root.locator('[data-measure-label]'),
    feedback: root.locator('[data-feedback]'),
    live: root.locator('p[aria-live="polite"]'),
    sent: root.locator('[data-sent]'),
    copyLabel: root.locator('[data-copy-label]'),
    legend: root.locator('[data-legend]'),
    option: (i) => root.locator('label', { has: page.locator(`input[type=radio][value="${i}"]`) }),
  };
}

const center = async (loc) => {
  const b = await loc.first().boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
/** Where the one transform puts a ground position on screen. */
async function screenOf(ui, p) {
  const b = await ui.box.boundingBox();
  // the box has a 1px border: the picture fills its padding box
  const inner = { x: b.x + 1, y: b.y + 1, w: b.width - 2, h: b.height - 2 };
  return { x: inner.x + xOfE(p.e) * inner.w, y: inner.y + yOfN(p.n) * inner.h, scale: inner.w / (MAP.e1 - MAP.e0) };
}
const text = async (loc) => ((await loc.count()) ? (await loc.first().innerText()).replace(/\s+/g, ' ').trim() : '');
const shot = async (ui, name) => {
  await ui.page.screenshot({ path: `${outDir}/${name}.png` });
  await ui.card.screenshot({ path: `${outDir}/${name}-card.png` });
};

/** The layout invariants of one state. */
const layouts = [];
async function layout(ui, state) {
  const card = await ui.card.boundingBox();
  const footer = await ui.footer.boundingBox();
  layouts.push({ state, cardH: Math.round(card.height), footerY: Math.round(footer.y - card.y), raw: [card.height, footer.y, footer.height].map((v) => +v.toFixed(2)) });
  // the block on screen together, under the header: instruction (first body line), map, action, feedback
  const box = await ui.box.boundingBox();
  const heading = await ui.panel.locator('h4').first().boundingBox();
  expect(heading.y >= 80, `${state}: the instruction is under the header (${heading.y})`);
  expect(box.y + box.height <= H, `${state}: the map ends on screen (${box.y + box.height})`);
  if (await ui.feedback.count()) {
    const fb = await ui.feedback.first().boundingBox();
    expect(fb.y + fb.height <= H, `${state}: the feedback ends on screen (${fb.y + fb.height})`);
    expect(footer.y - (fb.y + fb.height) <= 24, `${state}: continue stays close to feedback`);
  }
  expect(footer.y + footer.height <= H, `${state}: the way on is on screen (${footer.y + footer.height})`);
  // chips and the distance label: inside the map, and apart from each other
  const items = [];
  for (const loc of [ui.chips, ui.measureLabel]) {
    for (let i = 0; i < (await loc.count()); i++) {
      const inner = loc.nth(i).locator('> span');
      const b = await inner.boundingBox();
      if (b && b.width > 0) items.push(b);
    }
  }
  for (const b of items) {
    expect(b.x >= box.x - 0.5 && b.y >= box.y - 0.5 && b.x + b.width <= box.x + box.width + 0.5 && b.y + b.height <= box.y + box.height + 0.5,
      `${state}: a map label leaves the map ${JSON.stringify(b)}`);
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const c = items[j];
      const overlap = a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1;
      expect(!overlap, `${state}: two map labels overlap`);
    }
  }
  // readable sizes: body 16px, map labels 14px, margin values 13px (lessons-02-06 spec §3)
  const sizes = await ui.root.evaluate((r) => {
    const px = (sel) => [...r.querySelectorAll(sel)].map((e) => parseFloat(getComputedStyle(e).fontSize));
    return { body: px('[role=tabpanel] p'), chips: px('[data-chip] span span, [data-measure-label] span'), margin: px('[data-grid-e], [data-grid-n]') };
  });
  expect(sizes.body.every((v) => v >= 16), `${state}: panel text under 16px ${sizes.body}`);
  expect(sizes.chips.every((v) => v >= 14), `${state}: map labels under 14px ${sizes.chips}`);
  expect(sizes.margin.every((v) => v >= 13), `${state}: margin values under 13px ${sizes.margin}`);
}

// ─────────────────────────────────────────────────────────────── stage 1: compare
{
  const ui = await open();
  const { page, root } = ui;
  expect((await ui.tabs.nth(0).getAttribute('aria-selected')) === 'true', 'opens on stage 1');
  expect((await text(ui.panel.locator('h4'))) === 'גשר אחד, קואורדינטות בשני דאטומים', 'stage 1 heading');
  expect((await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'A is on at the start');
  const bridge = await screenOf(ui, PLACES.bridge.ground);
  const at0 = await center(ui.target);
  expect(near(at0, bridge), `the bridge marker stands on the bridge ${JSON.stringify(at0)} vs ${JSON.stringify(bridge)}`);
  expect((await ui.result.count()) === 0 && (await ui.measure.count()) === 0, 'stage 1 shows only the bridge');
  expect((await text(ui.chips)).includes('E 1200 · N 800'), 'the readout shows A’s numbers');
  expect((await text(ui.legend)).includes('רשת דאטום A'), 'the legend names the A grid');
  expect((await text(ui.live)) === '', 'nothing announced before a switch');
  // nothing left of the old design
  expect((await root.getByText('N', { exact: true }).count()) === 0, 'no N glyph');
  expect((await root.getByRole('button', { name: 'רמז' }).count()) === 0, 'no hint');
  expect((await root.locator('img').count()) === 1, 'one picture: the map (no thumbnails)');
  expect((await root.getByText('פסגה').count()) === 0, 'no point picker');
  const eA = await root.locator('[data-grid-e="1100"]').boundingBox();
  await layout(ui, 'compare-A');
  await shot(ui, '01-compare-A');

  // A → B: the grid slides (mid-way sample), the bridge stays, the numbers change
  await root.locator('[data-datum="B"]').click();
  await page.waitForTimeout(120);
  const eMid = await root.locator('[data-grid-e="1100"]').boundingBox();
  await page.waitForTimeout(650);
  const at1 = await center(ui.target);
  expect(near(at1, at0, 0.5), 'switching to B does not move the bridge');
  expect((await text(ui.chips)).includes('E 1164 · N 752'), 'the readout shows B’s numbers');
  const s = await screenOf(ui, PLACES.bridge.ground);
  const eB = await root.locator('[data-grid-e="1100"]').boundingBox();
  const shiftPx = eB.x - eA.x;
  expect(Math.abs(shiftPx - 36 * s.scale) <= 1, `B's E 1100 line stands 36 m east of A's (${shiftPx.toFixed(1)} px)`);
  expect(eMid.x > eA.x + 1 && eMid.x < eB.x - 1, 'the grid slides between A and B');
  const nB = await root.locator('[data-grid-n="800"]').boundingBox();
  const nExpected = (await screenOf(ui, { e: 0, n: 848 })).y;
  expect(Math.abs(nB.y + nB.height / 2 - nExpected) <= 1.5, 'B’s N 800 line stands 48 m north of A’s');
  expect((await text(ui.legend)).includes('רשת דאטום B'), 'the legend names the B grid');
  expect((await text(ui.live)) === T.toB, 'one short message after the switch');
  await layout(ui, 'compare-B');
  await shot(ui, '02-compare-B');
  // keyboard: the switch follows RTL arrows
  await root.locator('[data-datum="B"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  expect((await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'ArrowRight goes back to A (RTL)');
  expect((await text(ui.chips)).includes('E 1200 · N 800'), 'back to A’s numbers');
  expect(near(await center(ui.target), at0, 0.5), 'the bridge still has not moved');
  expect(ui.errors.length === 0, `compare: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── stage 2: the error
{
  const ui = await open();
  const { page, root, btn } = ui;
  await btn('מה קורה בלי המרה?').click();
  await page.waitForTimeout(300);
  expect((await ui.tabs.nth(1).getAttribute('aria-selected')) === 'true', 'the way on opens stage 2');
  expect((await text(ui.panel.locator('h4'))) === 'אותם מספרים נקראים בדאטום אחר', 'stage 2 heading');
  expect((await text(ui.panel)).includes('נתוני המקור · דאטום A'), 'the source, fixed, in A');
  expect((await text(ui.panel)).includes('המפה מפרשת את הנתונים בדאטום B'), 'the target, fixed, in B');
  expect((await ui.result.count()) === 0, 'only the bridge before the copy');
  expect((await text(ui.legend)).includes('רשת דאטום B'), 'the map shows its own grid, B');
  await layout(ui, 'error-ready');
  await shot(ui, '03-error-ready');

  await btn('העתקת המספרים ללא המרה').click();
  await page.waitForTimeout(300);
  const wrong = await screenOf(ui, { e: 1236, n: 848 });
  const bridge = await screenOf(ui, PLACES.bridge.ground);
  const r0 = await center(ui.result);
  expect(near(r0, wrong), `A read as B lands at (1236, 848) ${JSON.stringify(r0)} vs ${JSON.stringify(wrong)}`);
  const gapPx = Math.hypot(r0.x - bridge.x, r0.y - bridge.y);
  expect(Math.abs(gapPx - 60 * bridge.scale) <= 2, `the drawn gap is 60 m (${gapPx.toFixed(1)} px)`);
  // the B grid's 1200/800 lines cross exactly where the numbers landed
  const e1200 = await root.locator('[data-grid-e="1200"]').boundingBox();
  expect(Math.abs(e1200.x + e1200.width / 2 - r0.x) <= 1.5, 'the B grid reads E 1200 at the marker');
  expect((await text(ui.measureLabel)) === '60 מ׳', 'the distance label reads 60 m');
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'A', 'the copy is labelled A');
  expect((await text(ui.sent)).includes('E 1200 · N 800'), 'the copy carries the source numbers');
  expect((await text(ui.feedback)) === T.raw, 'the error is explained next to the action');
  expect((await text(ui.live)) === T.raw, 'announced once');
  expect((await text(ui.panel)).includes('מחליפים את האות בכותרת של עותק הנתונים; המספרים אינם משתנים.'), 'the label experiment’s helper is shown before it');
  await layout(ui, 'error-raw');
  await shot(ui, '04-error-copied');

  // the label only
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(250);
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'B', 'the copy’s label changed to B');
  expect((await text(ui.sent)).includes('E 1200 · N 800'), 'the numbers did not change');
  expect(near(await center(ui.result), r0, 0.5), 'the marker did not move');
  expect((await text(ui.measureLabel)) === '60 מ׳', 'the gap is still 60 m');
  const fbL = await text(ui.feedback);
  expect(fbL.startsWith(T.labelled) && fbL.includes('A → B') && fbL.includes('ללא שינוי') && fbL.includes('60 → 60'), `label feedback + before/after: ${fbL}`);
  expect((await text(ui.panel)).includes('נתוני המקור · דאטום A'), 'the source is still A');
  await layout(ui, 'error-label');
  await shot(ui, '05-label-only');
  await btn('ביטול שינוי הכיתוב').click();
  await page.waitForTimeout(200);
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'A' && (await text(ui.feedback)) === T.raw, 'the experiment undoes without a reset');

  // convert, after the label experiment: from the true source, with the motion marked as such
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(150);
  await btn('המרת הנתונים מ־A ל־B').click();
  const samples = [];
  const lives = new Set();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(110);
    samples.push({ at: await center(ui.result), chip: await text(ui.chips.filter({ hasText: 'המחשת' })), label: await ui.measureLabel.count(), sent: await text(ui.sent) });
    lives.add(await text(ui.live));
  }
  const mid = samples.find((v) => v.chip);
  expect(!!mid, 'the moving marker is marked "המחשת המעבר"');
  expect(samples.filter((v) => v.chip).every((v) => v.label === 0), 'no distance number while the marker moves');
  expect(samples.filter((v) => v.chip).every((v) => v.sent.includes('המחשת המעבר') && !v.sent.includes('1164')), 'no output numbers in the panel while the marker moves');
  const dist = samples.map((v) => Math.hypot(v.at.x - bridge.x, v.at.y - bridge.y));
  expect(dist.every((d, i) => i === 0 || d <= dist[i - 1] + 0.5), `the marker heads to the bridge ${dist.map((d) => d.toFixed(0))}`);
  expect(lives.size <= 2, `the live region is not re-announced per frame (${lives.size})`);
  await page.waitForTimeout(800);
  expect(near(await center(ui.result), bridge), 'converted: the marker on the bridge');
  expect((await ui.measure.count()) === 0, 'no distance line at 0 m');
  const fbC = await text(ui.feedback);
  expect(fbC.includes(T.match) && fbC.includes(T.fixed) && fbC.includes('1200 → 1164') && fbC.includes('800 → 752') && fbC.includes('60 → 0'), `fix feedback: ${fbC}`);
  expect((await text(ui.sent)).includes('E 1164 · N 752') && (await ui.copyLabel.getAttribute('data-copy-label')) === 'B', 'the output copy is B');
  expect((await text(ui.panel)).includes('נתוני המקור · דאטום A') && (await text(ui.panel)).includes('E 1200 · N 800'), 'the source stays A, unchanged');
  expect((await text(ui.live)) === `${T.match}. ${T.fixed}`, 'the fix announced once it is done, in the card’s order');
  await layout(ui, 'error-converted');
  await shot(ui, '06-converted');
  // a replay of the conversion never converts twice
  await btn('המרת הנתונים מ־A ל־B').click();
  await page.waitForTimeout(1300);
  expect((await text(ui.sent)).includes('E 1164 · N 752'), 'a second conversion still gives 1164 · 752');
  // the label experiment stays open after the fix
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(250);
  expect(near(await center(ui.result), wrong) && (await text(ui.sent)).includes('E 1200 · N 800'), 'after the fix, the label experiment shows its own result');
  await btn('ביטול שינוי הכיתוב').click();
  await page.waitForTimeout(250);
  expect(near(await center(ui.result), bridge) && (await text(ui.sent)).includes('E 1164 · N 752'), 'undoing it returns to the fix it started from');
  expect((await btn('איפוס').count()) === 0, 'no reset button; the experiments remain reversible');
  // entering stage 1 shows its own grid at once: the slide belongs to an A/B switch only
  await ui.tabs.nth(0).click();
  await page.waitForTimeout(60);
  const e1100 = await root.locator('[data-grid-e="1100"]').boundingBox();
  const want = await screenOf(ui, { e: 1100, n: 0 });
  expect(Math.abs(e1100.x + e1100.width / 2 - want.x) <= 1, 'entering stage 1 does not slide the grid');
  expect(ui.errors.length === 0, `error: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── stage 3: practice
{
  const ui = await open();
  const { page, root, btn } = ui;
  await ui.tabs.nth(1).click();
  await btn('נסו על נתונים נוספים').click();
  await page.waitForTimeout(250);
  expect((await ui.tabs.nth(2).getAttribute('aria-selected')) === 'true', 'the way on opens stage 3');
  const P = await text(ui.panel);
  expect(P.includes('מקרה 1 מתוך 2 · הגשר') && P.includes('איזה צמד מספרים צריך לשלוח למפת היעד כדי לשמור על אותו מקום?'), 'case 1 and the question');
  expect(P.includes('נתוני המקור · דאטום A') && P.includes('מפת היעד · דאטום A') && P.includes('E 1200 · N 800'), 'case 1 source and target');
  expect(P.includes('A→B: E − 36, N − 48') && P.includes('B→A: E + 36, N + 48'), 'the rule, left to right, axes named');
  expect((await btn('בדיקת הנתונים').getAttribute('aria-disabled')) === 'true', 'nothing to check before a choice');
  const bridge = await screenOf(ui, PLACES.bridge.ground);
  // a preview, not a verdict
  await ui.option(0).click();
  await page.waitForTimeout(200);
  expect(near(await center(ui.result), await screenOf(ui, { e: 1164, n: 752 })), 'the preview reads the pair in the target datum');
  expect((await ui.chips.filter({ hasText: 'תצוגה מקדימה' }).count()) === 1 && (await text(ui.measureLabel)) === '60 מ׳', 'marked as a preview, with its gap');
  expect((await text(ui.feedback)).startsWith('תצוגה מקדימה'), 'the panel says it is a preview');
  expect((await btn('למקרה הבא').count()) === 0, 'a choice completes nothing');
  await layout(ui, 'practice-1-preview');
  await btn('בדיקת הנתונים').click();
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.c1wrong && (await ui.feedback.getAttribute('data-feedback')) === 'wrong', 'case 1: the wrong pair explained');
  expect((await btn('למקרה הבא').count()) === 0, 'a wrong answer does not move on');
  await layout(ui, 'practice-1-wrong');
  await shot(ui, '07-practice-1-wrong');
  await ui.option(1).click();
  await page.waitForTimeout(150);
  expect(near(await center(ui.result), bridge) && (await ui.measure.count()) === 0, 'the original numbers stand on the bridge');
  await btn('בדיקת הנתונים').click();
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.c1right && (await ui.feedback.getAttribute('data-feedback')) === 'right', 'case 1: right');
  expect((await btn('למקרה הבא').count()) === 1, 'the next case opens');
  await layout(ui, 'practice-1-right');
  await shot(ui, '08-practice-1-right');

  await btn('למקרה הבא').click();
  await page.waitForTimeout(200);
  const P2 = await text(ui.panel);
  expect(P2.includes('מקרה 2 מתוך 2 · הצומת') && P2.includes('נתוני המקור · דאטום B') && P2.includes('E 1054 · N 712') && P2.includes('מפת היעד · דאטום A'), 'case 2 data');
  expect((await ui.result.count()) === 0 && (await ui.feedback.count()) === 0, 'case 2 starts clean');
  const junction = await screenOf(ui, PLACES.junction.ground);
  expect(near(await center(ui.target), junction), 'the target is the junction');
  const tries = [
    [1, T.c2kept, '60 מ׳', { e: 1054, n: 712 }, '09-practice-2-copied'],
    [2, T.c2minus, '120 מ׳', { e: 1018, n: 664 }, '10-practice-2-reversed'],
  ];
  for (const [i, fb, gap, p, name] of tries) {
    await ui.option(i).click();
    await page.waitForTimeout(150);
    expect(near(await center(ui.result), await screenOf(ui, p)), `case 2 option ${i} lands at ${p.e}/${p.n}`);
    expect((await text(ui.measureLabel)) === gap, `case 2 option ${i}: ${gap}`);
    await btn('בדיקת הנתונים').click();
    await page.waitForTimeout(150);
    expect((await text(ui.feedback)) === fb, `case 2 option ${i}: its own explanation`);
    await layout(ui, `practice-2-${i}`);
    await shot(ui, name);
  }
  await ui.option(0).click();
  await btn('בדיקת הנתונים').click();
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.c2right && near(await center(ui.result), junction), 'case 2: right, on the junction');
  await layout(ui, 'practice-2-right');
  await shot(ui, '11-practice-2-right');
  // back to case 1 and on again: each case starts clean
  await btn('למקרה הקודם').click();
  await page.waitForTimeout(150);
  expect((await text(ui.panel)).includes('מקרה 1 מתוך 2') && (await ui.result.count()) === 0, 'back: case 1, clean');
  await btn('למקרה הבא').click();
  await ui.option(0).click();
  await btn('בדיקת הנתונים').click();
  await btn('לסיכום התרגול').click();
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.summary, 'the closing message');
  expect((await ui.target.count()) === 2, 'the summary shows both places');
  await layout(ui, 'summary');
  await shot(ui, '12-summary');
  await btn('תרגול חוזר').click();
  await page.waitForTimeout(150);
  expect((await text(ui.panel)).includes('מקרה 1 מתוך 2') && (await btn('למקרה הבא').count()) === 0, 'practise again: case 1, nothing solved');
  // solve both again, then back to the demonstration
  for (const [i, next] of [[1, 'למקרה הבא'], [0, 'לסיכום התרגול']]) {
    await ui.option(i).click();
    await btn('בדיקת הנתונים').click();
    await btn(next).click();
  }
  await btn('חזרה להדגמה').click();
  await page.waitForTimeout(250);
  expect((await ui.tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'back to the demonstration, in A');

  // Content determines height; every state's controls and feedback were checked in layout().
  expect(ui.errors.length === 0, `practice: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── keyboard
{
  const ui = await open();
  const { page, root } = ui;
  await ui.tabs.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  expect((await ui.tabs.nth(1).getAttribute('aria-selected')) === 'true', 'ArrowLeft → the next stage (RTL)');
  expect(await ui.tabs.nth(1).evaluate((el) => el === document.activeElement), 'focus follows the stage');
  await page.keyboard.press('Control+ArrowLeft');
  await page.waitForTimeout(150);
  expect((await ui.tabs.nth(1).getAttribute('aria-selected')) === 'true', 'Ctrl+← belongs to the browser and assistive tech');
  // stage 2 by keyboard: the copy hands focus to the first experiment
  await page.keyboard.press('Tab');
  let hops = 0;
  while (!(await page.evaluate(() => document.activeElement?.textContent?.includes('העתקת המספרים ללא המרה'))) && hops++ < 12) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'experiment'), 'after the copy, focus is on the first experiment');
  // the way on lands on the next stage's heading
  await root.getByRole('button', { name: 'נסו על נתונים נוספים', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'heading' && document.activeElement.textContent.includes('איזה צמד מספרים')), 'the way on lands on the new stage’s question');
  await ui.tabs.nth(2).focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(150);
  expect((await ui.tabs.nth(2).getAttribute('aria-selected')) === 'true', 'End → the last stage');
  // the options are a radio group
  await page.keyboard.press('Tab');
  let guard = 0;
  while (!(await page.evaluate(() => document.activeElement?.getAttribute('type') === 'radio')) && guard++ < 12) await page.keyboard.press('Tab');
  expect(guard < 12, 'the options are reachable by Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  const checked = await root.locator('input[type=radio]:checked').getAttribute('value');
  expect(checked === '1', `arrows move between the options (${checked})`);
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement.closest('label')).boxShadow);
  expect(ring && ring !== 'none', 'focus is visible on the option');
  await shot(ui, '13-keyboard-focus');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.textContent?.includes('בדיקת הנתונים')), 'Tab reaches the check');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.c1right, 'Enter checks');
  expect(await page.evaluate(() => document.activeElement?.textContent?.includes('בדיקת הנתונים')), 'the check keeps focus while its verdict is read');
  expect(ui.errors.length === 0, `keyboard: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── reduced motion
{
  const ui = await open({ reducedMotion: 'reduce' });
  const { page, root, btn } = ui;
  const eA = await root.locator('[data-grid-e="1100"]').boundingBox();
  await root.locator('[data-datum="B"]').click();
  await page.waitForTimeout(40);
  const eB = await root.locator('[data-grid-e="1100"]').boundingBox();
  const s = await screenOf(ui, PLACES.bridge.ground);
  expect(Math.abs(eB.x - eA.x - 36 * s.scale) <= 1, 'reduced motion: the grid switches at once');
  await ui.tabs.nth(1).click();
  await btn('העתקת המספרים ללא המרה').click();
  await btn('המרת הנתונים מ־A ל־B').click();
  await page.waitForTimeout(60);
  expect(near(await center(ui.result), s) && (await text(ui.feedback)).includes(T.match), 'reduced motion: the conversion lands at once');
  expect(ui.errors.length === 0, `motion: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── a map that fails to load
{
  const ui = await open({ blockMap: true });
  const { page, root } = ui;
  await root.locator('[data-map="failed"]').waitFor({ timeout: 20000 });
  expect((await root.getByRole('alert').innerText()).includes('לא ניתן לטעון את מפת השטח.'), 'the failure says so');
  expect((await ui.target.count()) === 1, 'the live layers stay usable');
  await shot(ui, '14-load-failure');
  await page.unroute('**/datum-field-challenge/field-map.webp*');
  await root.getByRole('button', { name: 'נסו שוב' }).click();
  await root.locator('[data-map="ready"]').waitFor({ timeout: 20000 });
  expect((await root.getByRole('alert').count()) === 0, 'the retry recovers');
  expect(ui.errors.length === 0, `loading: page errors ${ui.errors}`);
  await ui.ctx.close();
}

await browser.close();
if (failures.length) {
  if (process.env.QA_LAYOUTS) console.log(JSON.stringify(layouts));
  console.error(`✖ ${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
if (process.env.QA_LAYOUTS) console.log(JSON.stringify(layouts));
console.log(`✔ every check passed — ${layouts.length} states measured; screenshots in ${outDir}`);
