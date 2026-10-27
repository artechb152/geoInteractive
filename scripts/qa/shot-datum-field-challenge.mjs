// Browser QA for the datum activity (#scene-coordinates → "הדמיה: מה קורה כשהדאטום לא תואם?",
// design/docs/datum-field-challenge-followup-claude-2026-10-12.txt §5–§11; clarity pass 2026-10-26).
//
// Usage (a dev server for the lesson):
//   QA_BASE=http://localhost:3000 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs \
//     scripts/qa/shot-datum-field-challenge.mjs [outDir]
//
// Renders the real lesson route at 1440 × 1122 with the block's title just under the site header and
// checks, exit code 1 on any failure:
//   datums      every state names the datum of the source, of the copy sent and of the target map (one
//               tag shape), and the map is titled with the datum it reads in
//   compare     A/B changes the numbers, the readout and the grid (margin values slide by 36/48 m);
//               the bridge marker never moves; what changed (E, N) and what did not (the bridge) after
//               a switch; one short live message per switch
//   error       copying A's numbers to the B map: the marker 60 m from the bridge, where the B grid
//               reads 1200/800; the real place and the mark obtained labelled on the map and in the
//               legend; the flow names the action taken; each experiment says what it changes before
//               it is used; the label experiment changes only the label (and undoes); converting
//               always starts from the true source, shows "המחשת המעבר" and no number on the way,
//               then lands on the bridge with 0 m; a replay never converts twice; "התחלה מחדש"
//               starts the stage again
//   practice    three decisions (datums match? the action, the numbers) and nothing on the map before
//               the check; the check names the step that went wrong — identification, action,
//               calculation — with its gap on the map (60 / 120 / 17 / 48 m); any change clears the
//               verdict; reset, back, next, summary, practise again, back to the demonstration
//   layout      the whole card on screen under the site header; both columns from one top, the way on
//               right after the panel's content with no blank beyond the stage's feedback room, the
//               panel and the map ending close together (not the summary); the map at its column's
//               size and proportions, never moving or resizing between states; inside a stage one
//               place for the way on and one card height; the lead as wide as the panel; chips inside
//               the map and apart; readable text sizes; no N glyph, hint, point picker or thumbnails
//               (layout pass 2026-10-27, design/docs/claude-datum-layout-2026-10-27.md)
//   keyboard    stage tabs and the datum switch follow RTL arrows; the practice steps are radio
//               groups; focus is visible
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
/** Where the card's top edge is placed on screen: under the 80px site header, with a 16px gap. */
const CARD_TOP = 96;
const TITLE = 'הדמיה: מה קורה כשהדאטום לא תואם?';
const T = {
  changed: 'המספרים השתנו, הגשר לא זז',
  toB: 'המפה מציגה עכשיו את רשת B. הגשר נשאר במקומו, ולכן נקרא בה במספרים אחרים.',
  toA: 'המפה מציגה שוב את רשת A, והגשר נקרא בה במספרים המקוריים. המקום עצמו לא השתנה.',
  rawLead: 'הסימון שהתקבל רחוק 60 מטר מהגשר',
  raw: 'מספרי A נקראו כאילו נמדדו ב־B. הגשר לא זז; רק הסימון במפה. נסו לתקן בשתי הדרכים.',
  labelledLead: 'הכיתוב השתנה, הסימון לא זז',
  labelled: 'המספרים עדיין של A, והמפה ממשיכה לקרוא אותם כ־B. שינוי הכיתוב אינו המרה.',
  fixed: 'ההמרה חישבה את המספרים מחדש, כך שבדאטום B הם מתארים את אותו גשר. השתנו המספרים, לא המקום.',
  match: 'הסימון תואם למיקום הגשר',
  moving: 'המחשת המעבר',
  convert: 'המרת המספרים מ־A ל־B',
  relabelHelp: 'רק האות בכותרת העותק משתנה',
  convertHelp: 'E ו־N מחושבים מחדש לדאטום B',
  c1right: 'המקור ומפת היעד באותו דאטום, ולכן אין מה להמיר: המספרים המקוריים כבר מצביעים על הגשר.',
  c1identify: 'גם נתוני המקור וגם מפת היעד בדאטום A: הדאטומים תואמים, ואין מה להמיר. הסימון נפל 60 מטר מהגשר.',
  c1action: 'הדאטומים תואמים, ולכן אין מה להמיר. ההמרה הזיזה את הסימון 60 מטר מהגשר.',
  c2right: 'המקור ב־B ומפת היעד ב־A, ולכן ממירים B→A — בכיוון ההפוך מההדגמה. המספרים השתנו, והסימון נשאר בצומת.',
  c2identify: 'נתוני המקור בדאטום B ומפת היעד בדאטום A: הדאטומים שונים, ולכן צריך להמיר. הסימון נפל 60 מטר מהצומת.',
  c2keep: 'המספרים נשלחו בלי המרה, ומפת היעד קראה את מספרי B כאילו הם ב־A. הסימון נפל 60 מטר מהצומת.',
  c2relabel: 'שינוי הכיתוב ל־A לא שינה את המספרים, ולכן המפה עדיין קוראת אותם במקום אחר. הסימון נפל 60 מטר מהצומת.',
  c2reverse: 'הכיוון הפוך: הנתונים ב־B ומפת היעד ב־A, ולכן ממירים B→A. המרה A→B הרחיקה את הסימון ל־120 מטר מהצומת.',
  c2swapped: 'הכיוון נכון, אבל ההזזות התחלפו: בהמחשה E משתנה ב־36 ו־N ב־48. הסימון נפל 17 מטר מהצומת.',
  c2partial: 'הכיוון נכון, אבל רק E הומר. בהמחשה גם N משתנה, ב־48. הסימון נפל 48 מטר מהצומת.',
  summary: 'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.',
};
const VERDICT = { right: 'נכון', identify: 'הטעות בזיהוי הדאטומים', action: 'הטעות בבחירת הפעולה', calc: 'הטעות בחישוב' };
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
  // the whole card just under the fixed site header (80px), as a learner scrolls to it (instant: the site scrolls smoothly)
  await root.locator('.surface-elevated').evaluate((el, top) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - top, behavior: 'instant' }), CARD_TOP);
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
    mapTitle: root.locator('[data-map-title]'),
    target: root.locator('[data-marker="target"]'),
    result: root.locator('[data-marker="result"]'),
    chips: root.locator('[data-chip]'),
    measure: root.locator('[data-measure]'),
    measureLabel: root.locator('[data-measure-label]'),
    feedback: root.locator('[data-feedback]'),
    verdict: root.locator('[data-verdict]'),
    live: root.locator('p[aria-live="polite"]'),
    sent: root.locator('[data-sent]'),
    copyLabel: root.locator('[data-copy-label]'),
    flowStep: root.locator('[data-flow-step]').first(),
    legend: root.locator('[data-legend]'),
    rule: root.locator('[data-rule]'),
    /** A practice choice: step (match | action | send) and its visible text. */
    choice: (step, hasText) => root.locator(`[data-step="${step}"] label`, { hasText }),
    calc: (i) => root.locator('[data-step="send"] label').nth(i),
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

/**
 * The most blank, in px of the 1344 reference layout, between the panel's last mark and its way on: the stage's
 * feedback room with its margins (DatumFieldChallenge ROOM; stage 2 also its action row's), never more.
 */
const VOID_REF = { compare: 142 + 16 + 16, error: 168 + 12 + 16 + 14, practice: 108 + 12 + 16, summary: 16 };
/** The map's picture box in the reference layout (DatumFieldChallenge MAP_BOX_W). */
const MAP_BOX_REF = 430;

/** The layout invariants of one state. */
const layouts = [];
async function layout(ui, state) {
  const g = await ui.root.evaluate((r) => {
    const R = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    };
    const panel = r.querySelector('[data-activity-panel]');
    const footer = r.querySelector('[data-activity-navigation]');
    // `flow`: the lowest box before the way on (a kept room included); `ink`: the lowest thing actually drawn —
    // text, a control, a tinted or bordered inset — so an empty room does not count
    let flow = 0;
    let ink = 0;
    for (const el of panel.querySelectorAll('*')) {
      if (footer.contains(el)) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      flow = Math.max(flow, b.bottom);
      const cs = getComputedStyle(el);
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const drawn = ownText || el.matches('svg, button, label') || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0;
      if (drawn && cs.visibility !== 'hidden') ink = Math.max(ink, b.bottom);
    }
    const fit = r.closest('[data-lesson-viewport-fit]');
    return {
      s: fit ? +fit.getAttribute('data-fit-scale') : 1,
      stage: r.querySelector('[role=tabpanel]').getAttribute('data-stage'),
      summary: panel.querySelector('h4')?.textContent === 'סיכום התרגול',
      card: R(r.querySelector('.surface-elevated')),
      lead: R(r.querySelector('.surface-elevated > p')),
      panel: R(panel),
      figure: R(r.querySelector('figure')),
      box: R(r.querySelector('[data-map-box]')),
      footer: R(footer),
      flow,
      ink,
    };
  });
  const { s, card, panel, figure, footer } = g;
  const stage = g.summary ? 'summary' : g.stage;
  // two columns from one top; the way on right after the stage's content, not pushed down to the map's foot
  expect(Math.abs(panel.y - figure.y) <= 1, `${state}: both columns start at the same top`);
  expect(footer.y - g.flow <= 16 * s + 1, `${state}: the way on follows the panel's content (${(footer.y - g.flow).toFixed(1)} px)`);
  expect(footer.y - g.ink <= VOID_REF[stage] * s + 2, `${state}: no blank beyond the feedback room before the way on (${(footer.y - g.ink).toFixed(1)} px, at most ${(VOID_REF[stage] * s).toFixed(1)})`);
  // the map and the panel in one composition: their feet within 100 reference px — the summary's closing note is short by nature
  if (stage !== 'summary') expect(Math.abs(footer.b - figure.b) <= 100 * s, `${state}: the panel and the map end close together (${(footer.b - figure.b).toFixed(1)} px)`);
  expect(card.b - Math.max(footer.b, figure.b) <= 25, `${state}: no excess space at the bottom of the card`);
  // the map: its own proportions, at its column's size
  expect(Math.abs(g.box.w / g.box.h - (MAP.e1 - MAP.e0) / (MAP.n1 - MAP.n0)) <= 0.01, `${state}: the map keeps its proportions`);
  expect(Math.abs(g.box.w - MAP_BOX_REF * s) <= 1.5, `${state}: the map box is ${MAP_BOX_REF} reference px wide (${(g.box.w / s).toFixed(1)})`);
  // the lead ends where the panel's column ends (its start edge is the card's, at the right)
  expect(Math.abs(g.lead.r - panel.r) <= 1 && Math.abs(g.lead.w - panel.w) <= 2, `${state}: the lead spans the panel's column (${g.lead.w.toFixed(1)} vs ${panel.w.toFixed(1)})`);
  // the whole card on screen under the site header, at the lesson's own scale
  expect(card.y >= 80 && card.b <= H, `${state}: the card fits under the header (${card.y.toFixed(1)}–${card.b.toFixed(1)})`);
  expect(!(await text(ui.root)).includes('הגשר בשטח') && !(await text(ui.root)).includes('רשת דאטום'), `${state}: the removed map captions stay absent`);
  // the map always says which datum it reads every pair in
  const mt = await text(ui.mapTitle);
  expect(/^(המפה|מפת היעד) דאטום [AB]$/.test(mt), `${state}: the map is titled with its datum (${mt})`);
  layouts.push({
    state,
    stage,
    cardH: +card.h.toFixed(1),
    footerY: +(footer.y - card.y).toFixed(1),
    box: [g.box.x - card.x, g.box.y - card.y, g.box.w, g.box.h].map((v) => +v.toFixed(1)),
    blank: +(footer.y - g.ink).toFixed(1),
    colGap: +(panel.x - figure.r).toFixed(1),
  });
  // the block on screen together, under the header: instruction (first body line), map, action, feedback
  const box = await ui.box.boundingBox();
  const heading = await ui.panel.locator('h4').first().boundingBox();
  expect(heading.y >= 80, `${state}: the instruction is under the header (${heading.y})`);
  expect(box.y + box.height <= H, `${state}: the map ends on screen (${box.y + box.height})`);
  if (await ui.feedback.count()) {
    const fb = await ui.feedback.first().boundingBox();
    expect(fb.y + fb.height <= H, `${state}: the feedback ends on screen (${fb.y + fb.height})`);
    expect(footer.y >= fb.y + fb.height - 1, `${state}: navigation does not overlap feedback`);
  }
  expect(footer.b <= H, `${state}: the way on is on screen (${footer.b})`);
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
  // the gap's number never sits on a marker (the ring with its ticks, the diamond)
  if (await ui.measureLabel.count()) {
    const m = await ui.measureLabel.locator('> span').boundingBox();
    for (const loc of [ui.target, ui.result]) {
      for (let i = 0; i < (await loc.count()); i++) {
        const b = await loc.nth(i).boundingBox();
        const hit = m.x < b.x + b.width - 1 && b.x < m.x + m.width - 1 && m.y < b.y + b.height - 1 && b.y < m.y + m.height - 1;
        expect(!hit, `${state}: the gap label covers a marker`);
      }
    }
  }
  // the legend: the symbols on the map, never a symbol that is not there
  if (await ui.result.count()) {
    const lg = await text(ui.legend);
    expect(lg.includes('המקום האמיתי') && lg.includes('הסימון שהתקבל'), `${state}: the legend tells the real place from the mark obtained (${lg})`);
    expect(lg.includes('הפער ביניהם') === ((await ui.measure.count()) > 0), `${state}: the legend's gap item matches the line`);
  } else {
    expect((await ui.legend.count()) === 0, `${state}: no legend without a mark`);
  }
  // readable sizes: body 16px, map labels and datum tags 14px, margin values 13px (lessons-02-06 spec §3)
  const sizes = await ui.root.evaluate((r) => {
    const px = (sel) => [...r.querySelectorAll(sel)].map((e) => parseFloat(getComputedStyle(e).fontSize));
    return {
      body: px('[role=tabpanel] p'),
      chips: px('[data-chip] span span, [data-measure-label] span, [data-datum-tag]'),
      margin: px('[data-grid-e], [data-grid-n]'),
    };
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
  expect((await text(ui.panel)).includes('עברו בין A ל־B ובדקו מה משתנה: המספרים או המקום בשטח?'), 'stage 1: one instruction');
  expect(!(await text(ui.panel)).includes('מערכות ייחוס'), 'stage 1 does not explain what a datum is again');
  expect((await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'A is on at the start');
  expect((await text(ui.mapTitle)) === 'המפה דאטום A', 'the map is titled with datum A');
  const bridge = await screenOf(ui, PLACES.bridge.ground);
  const at0 = await center(ui.target);
  expect(near(at0, bridge), `the bridge marker stands on the bridge ${JSON.stringify(at0)} vs ${JSON.stringify(bridge)}`);
  expect((await ui.result.count()) === 0 && (await ui.measure.count()) === 0, 'stage 1 shows only the bridge');
  expect((await text(ui.chips)).includes('E 1200 · N 800'), 'the readout shows A’s numbers');
  expect((await root.locator('[data-grid]').getAttribute('data-grid')) === 'A', 'the map uses the A grid');
  expect((await text(ui.live)) === '' && (await ui.feedback.count()) === 0, 'nothing said before a switch');
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
  expect((await text(ui.mapTitle)) === 'המפה דאטום B', 'the map title follows the switch');
  const s = await screenOf(ui, PLACES.bridge.ground);
  const eB = await root.locator('[data-grid-e="1100"]').boundingBox();
  const shiftPx = eB.x - eA.x;
  expect(Math.abs(shiftPx - 36 * s.scale) <= 1, `B's E 1100 line stands 36 m east of A's (${shiftPx.toFixed(1)} px)`);
  expect(eMid.x > eA.x + 1 && eMid.x < eB.x - 1, 'the grid slides between A and B');
  const nB = await root.locator('[data-grid-n="800"]').boundingBox();
  const nExpected = (await screenOf(ui, { e: 0, n: 848 })).y;
  expect(Math.abs(nB.y + nB.height / 2 - nExpected) <= 1.5, 'B’s N 800 line stands 48 m north of A’s');
  expect((await root.locator('[data-grid]').getAttribute('data-grid')) === 'B', 'the map uses the B grid');
  const fb = await text(ui.feedback);
  expect(fb.startsWith(`${T.changed} ${T.toB}`) && fb.includes('1200 → 1164') && fb.includes('800 → 752') && fb.includes('הגשר לא זז'), `what changed, and what did not: ${fb}`);
  expect((await text(ui.live)) === `${T.changed}. ${T.toB}`, 'one short message after the switch');
  await layout(ui, 'compare-B');
  await shot(ui, '02-compare-B');
  // keyboard: the switch follows RTL arrows
  await root.locator('[data-datum="B"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  expect((await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'ArrowRight goes back to A (RTL)');
  expect((await text(ui.chips)).includes('E 1200 · N 800'), 'back to A’s numbers');
  expect((await text(ui.feedback)).includes('1164 → 1200') && (await text(ui.live)).endsWith(T.toA), 'back to A: the change the other way');
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
  const P = await text(ui.panel);
  expect(P.includes('נתוני המקור דאטום A E 1200 · N 800'), `the source, fixed, tagged A: ${P}`);
  expect(P.includes('מפת היעד דאטום B'), 'the target, fixed, tagged B');
  expect((await text(ui.mapTitle)) === 'מפת היעד דאטום B', 'the map is the target map, in B');
  expect((await ui.result.count()) === 0, 'only the bridge before the copy');
  expect((await root.locator('[data-grid]').getAttribute('data-grid')) === 'B', 'the map shows its own grid, B');
  expect((await btn('התחלה מחדש').count()) === 0, 'nothing to start again yet');
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
  // the real place and the mark obtained, each named
  expect((await ui.chips.filter({ hasText: 'הגשר' }).count()) === 1 && (await text(ui.chips.filter({ hasText: 'E 1200' }))) === 'E 1200 · N 800', 'the ring is the bridge; the mark carries the numbers read');
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'A', 'the copy is labelled A');
  expect((await text(ui.sent)).includes('E 1200 · N 800'), 'the copy carries the source numbers');
  expect((await ui.flowStep.getAttribute('data-flow-step')) === 'העתקה ללא המרה', 'the flow names the action taken');
  expect((await text(ui.feedback)) === `${T.rawLead} ${T.raw}`, 'the error is explained next to the action');
  expect((await text(ui.live)) === `${T.rawLead}. ${T.raw}`, 'announced once');
  // each experiment says what it changes, visibly, before it is used
  for (const [name, help] of [['שינוי הכיתוב בלבד', T.relabelHelp], [T.convert, T.convertHelp]]) {
    const b = btn(name);
    const hb = await b.locator('span').nth(1).boundingBox();
    expect((await text(b)) === `${name} ${help}` && hb && hb.width > 20, `${name}: its help is shown on it`);
  }
  await layout(ui, 'error-raw');
  await shot(ui, '04-error-copied');

  // the label only
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(250);
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'B', 'the copy’s label changed to B');
  expect((await text(ui.sent)).includes('E 1200 · N 800'), 'the numbers did not change');
  expect((await ui.flowStep.getAttribute('data-flow-step')) === 'שינוי הכיתוב בלבד', 'the flow names the experiment');
  expect(near(await center(ui.result), r0, 0.5), 'the marker did not move');
  expect((await text(ui.measureLabel)) === '60 מ׳', 'the gap is still 60 m');
  const fbL = await text(ui.feedback);
  expect(fbL.startsWith(`${T.labelledLead} ${T.labelled}`) && fbL.includes('A → B') && fbL.includes('ללא שינוי') && fbL.includes('60 → 60'), `label feedback + before/after: ${fbL}`);
  expect((await text(ui.panel)).includes('נתוני המקור דאטום A'), 'the source is still A');
  await layout(ui, 'error-label');
  await shot(ui, '05-label-only');
  await btn('ביטול שינוי הכיתוב').click();
  await page.waitForTimeout(200);
  expect((await ui.copyLabel.getAttribute('data-copy-label')) === 'A' && (await text(ui.feedback)) === `${T.rawLead} ${T.raw}`, 'the experiment undoes without a reset');

  // convert, after the label experiment: from the true source, with the motion marked as such
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(150);
  await btn(T.convert).click();
  const samples = [];
  const lives = new Set();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(110);
    // one frame read at once: the marker, its chip, the gap label and the panel's copy
    samples.push(
      await root.evaluate((r) => {
        const m = r.querySelector('[data-marker="result"]')?.getBoundingClientRect();
        const norm = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
        return {
          at: m ? { x: m.x + m.width / 2, y: m.y + m.height / 2 } : null,
          chip: norm([...r.querySelectorAll('[data-chip]')].find((c) => c.textContent.includes('המחשת'))),
          label: r.querySelectorAll('[data-measure-label]').length,
          sent: norm(r.querySelector('[data-sent]')),
        };
      }),
    );
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
  expect((await ui.flowStep.getAttribute('data-flow-step')) === 'המרה A→B', 'the flow names the conversion');
  expect((await text(ui.panel)).includes('נתוני המקור דאטום A E 1200 · N 800'), 'the source stays A, unchanged');
  expect((await text(ui.live)) === `${T.match}. ${T.fixed}`, 'the fix announced once it is done, in the card’s order');
  await layout(ui, 'error-converted');
  await shot(ui, '06-converted');
  // a replay of the conversion never converts twice
  await btn(T.convert).click();
  await page.waitForTimeout(1300);
  expect((await text(ui.sent)).includes('E 1164 · N 752'), 'a second conversion still gives 1164 · 752');
  // the label experiment stays open after the fix
  await btn('שינוי הכיתוב בלבד').click();
  await page.waitForTimeout(250);
  expect(near(await center(ui.result), wrong) && (await text(ui.sent)).includes('E 1200 · N 800'), 'after the fix, the label experiment shows its own result');
  await btn('ביטול שינוי הכיתוב').click();
  await page.waitForTimeout(250);
  expect(near(await center(ui.result), bridge) && (await text(ui.sent)).includes('E 1164 · N 752'), 'undoing it returns to the fix it started from');
  // start the stage again: nothing sent, the copy button back and focused
  await btn('התחלה מחדש').click();
  await page.waitForTimeout(250);
  expect((await ui.result.count()) === 0 && (await ui.feedback.count()) === 0 && (await text(ui.sent)).includes('—'), 'reset: nothing sent, no feedback');
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'copy'), 'reset: focus on the copy');
  await btn('העתקת המספרים ללא המרה').click();
  await page.waitForTimeout(250);
  expect(near(await center(ui.result), wrong), 'after the reset the error can be made again');
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
  expect(P.includes('נתוני המקור דאטום A E 1200 · N 800') && P.includes('מפת היעד דאטום A'), 'case 1 source and target, tagged');
  expect(P.includes('האם הדאטומים תואמים?') && P.includes('מה עושים עם המספרים?') && P.includes('אילו מספרים נשלחים למפה?'), 'the three steps');
  expect((await ui.choice('action', 'שינוי הכיתוב בלבד').count()) === 0, 'no label to change when both say A');
  expect((await ui.rule.count()) === 0, 'no rule before a conversion is chosen');
  expect((await btn('בדיקת הנתונים').getAttribute('aria-disabled')) === 'true', 'nothing to check before the answers');
  expect((await root.locator('[data-recap]').count()) === 0, 'no recap (no answers) before the summary');
  await layout(ui, 'practice-1-start');
  const bridge = await screenOf(ui, PLACES.bridge.ground);
  const judge = async (verdict, body, name) => {
    await btn('בדיקת הנתונים').click();
    await page.waitForTimeout(200);
    const fb = await text(ui.feedback);
    expect((await text(ui.verdict)) === VERDICT[verdict] && fb === `${VERDICT[verdict]} ${body}`, `${name}: ${fb}`);
    expect((await ui.feedback.getAttribute('data-feedback')) === (verdict === 'right' ? 'right' : 'wrong'), `${name}: its tone`);
    expect((await text(ui.live)) === `${VERDICT[verdict]}. ${body}`, `${name}: announced once`);
  };
  // decide first: the steps, then the check — nothing on the map before it
  await ui.choice('match', 'לא, דאטומים שונים').click();
  await ui.choice('action', 'המרה B→A').click();
  await page.waitForTimeout(150);
  expect((await text(ui.rule)) === 'כלל ההמחשה בלבד, לא שיטת המרה כללית: B→A: E + 36, N + 48', `the scoped rule of the chosen direction: ${await text(ui.rule)}`);
  expect((await root.locator('[data-step="send"] label').count()) === 3, 'three pairs for a conversion');
  expect((await btn('בדיקת הנתונים').getAttribute('aria-disabled')) === 'true', 'a conversion needs its pair');
  await ui.calc(1).click();
  await page.waitForTimeout(150);
  expect((await ui.result.count()) === 0 && (await ui.feedback.count()) === 0 && (await ui.measure.count()) === 0, 'a choice shows nothing on the map: a decision, not a preview');
  expect((await root.getByText('תצוגה מקדימה').count()) === 0, 'no preview');
  await layout(ui, 'practice-1-decided');
  await shot(ui, '07-practice-1-decided');
  await judge('identify', T.c1identify, 'case 1: "different" is an identification error');
  expect(near(await center(ui.result), await screenOf(ui, { e: 1236, n: 848 })) && (await text(ui.measureLabel)) === '60 מ׳', 'after the check: the mark and its gap');
  expect((await btn('למקרה הבא').count()) === 0, 'a wrong answer does not move on');
  await layout(ui, 'practice-1-identify');
  await shot(ui, '08-practice-1-identify');
  // any change clears the verdict and the mark
  await ui.choice('match', 'כן, אותו דאטום').click();
  await page.waitForTimeout(150);
  expect((await ui.feedback.count()) === 0 && (await ui.result.count()) === 0, 'a change clears the verdict');
  await judge('action', T.c1action, 'case 1: a conversion when the datums match');
  await layout(ui, 'practice-1-action');
  await shot(ui, '09-practice-1-action');
  await ui.choice('action', 'העתקה ללא המרה').click();
  await page.waitForTimeout(150);
  expect((await ui.rule.count()) === 0 && (await text(root.locator('[data-step="send"]'))).includes('העותק שנשלח דאטום A E 1200 · N 800 (ללא שינוי)'), 'sent as they are: the numbers, unchanged');
  await judge('right', T.c1right, 'case 1: right');
  expect(near(await center(ui.result), bridge) && (await ui.measure.count()) === 0, 'the original numbers stand on the bridge');
  expect((await btn('למקרה הבא').count()) === 1, 'the next case opens');
  await layout(ui, 'practice-1-right');
  await shot(ui, '10-practice-1-right');

  await btn('למקרה הבא').click();
  await page.waitForTimeout(200);
  const P2 = await text(ui.panel);
  expect(P2.includes('מקרה 2 מתוך 2 · הצומת') && P2.includes('נתוני המקור דאטום B E 1054 · N 712') && P2.includes('מפת היעד דאטום A'), 'case 2 data');
  expect((await ui.result.count()) === 0 && (await ui.feedback.count()) === 0 && (await root.locator('input[type=radio]:checked').count()) === 0, 'case 2 starts clean');
  expect((await ui.choice('action', 'שינוי הכיתוב בלבד').count()) === 1, 'case 2 offers the label change');
  const junction = await screenOf(ui, PLACES.junction.ground);
  expect(near(await center(ui.target), junction), 'the target is the junction');
  await ui.choice('match', 'כן, אותו דאטום').click();
  await ui.choice('action', 'העתקה ללא המרה').click();
  await judge('identify', T.c2identify, 'case 2: "same datum"');
  await ui.choice('match', 'לא, דאטומים שונים').click();
  const tries = [
    ['העתקה ללא המרה', null, 'action', T.c2keep, '60 מ׳', { e: 1054, n: 712 }, '11-practice-2-copied'],
    ['שינוי הכיתוב בלבד', null, 'action', T.c2relabel, '60 מ׳', { e: 1054, n: 712 }, '12-practice-2-label'],
    ['המרה A→B', { e: 1018, n: 664 }, 'action', T.c2reverse, '120 מ׳', { e: 1018, n: 664 }, '13-practice-2-reversed'],
    ['המרה B→A', { e: 1102, n: 748 }, 'calc', T.c2swapped, '17 מ׳', { e: 1102, n: 748 }, '14-practice-2-swapped'],
    ['המרה B→A', { e: 1090, n: 712 }, 'calc', T.c2partial, '48 מ׳', { e: 1090, n: 712 }, '15-practice-2-partial'],
  ];
  for (const [action, pair, verdict, body, gap, p, name] of tries) {
    await ui.choice('action', action).click();
    if (pair) await root.locator('[data-step="send"] label', { hasText: `E ${pair.e}` }).filter({ hasText: `N ${pair.n}` }).click();
    await page.waitForTimeout(150);
    expect((await ui.result.count()) === 0, `${name}: nothing on the map before the check`);
    if (action === 'שינוי הכיתוב בלבד') expect((await text(root.locator('[data-step="send"]'))).includes('העותק שנשלח דאטום A E 1054 · N 712'), 'the label says A; the numbers are still B’s');
    await judge(verdict, body, name);
    expect(near(await center(ui.result), await screenOf(ui, p)), `${name}: the mark at ${p.e}/${p.n}`);
    expect((await text(ui.measureLabel)) === gap, `${name}: ${gap}`);
    await layout(ui, name);
    await shot(ui, name);
  }
  await ui.choice('action', 'המרה A→B').click();
  await ui.choice('action', 'המרה B→A').click();
  await root.locator('[data-step="send"] label', { hasText: 'E 1090' }).filter({ hasText: 'N 760' }).click();
  await judge('right', T.c2right, 'case 2: right');
  expect(near(await center(ui.result), junction) && (await ui.measure.count()) === 0, 'case 2: on the junction');
  await layout(ui, 'practice-2-right');
  await shot(ui, '16-practice-2-right');
  // reset the case: clean again, solved stays solved
  await btn('התחלה מחדש').click();
  await page.waitForTimeout(200);
  expect((await root.locator('input[type=radio]:checked').count()) === 0 && (await ui.result.count()) === 0 && (await ui.feedback.count()) === 0, 'reset: the case from its start');
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'heading'), 'reset: focus on the case');
  expect((await btn('לסיכום התרגול').count()) === 1, 'a case solved once stays solved');
  // back to case 1: it starts clean
  await btn('למקרה הקודם').click();
  await page.waitForTimeout(150);
  expect((await text(ui.panel)).includes('מקרה 1 מתוך 2') && (await ui.result.count()) === 0, 'back: case 1, clean');
  await btn('למקרה הבא').click();
  await btn('לסיכום התרגול').click();
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === T.summary, 'the closing message');
  expect((await ui.target.count()) === 2 && (await ui.result.count()) === 2, 'the summary shows both places, each with its right mark');
  // the recap names, per case, its datums, the right action and the numbers it sent — the two marks on the map
  const recap = root.locator('[data-recap] li');
  expect((await recap.count()) === 2, 'the recap has one item per case');
  expect((await text(recap.nth(0))) === 'מקרה 1 · הגשר נתוני המקור דאטום A מפת היעד דאטום A העתקה ללא המרה E 1200 · N 800', `recap, case 1: ${await text(recap.nth(0))}`);
  expect((await text(recap.nth(1))) === 'מקרה 2 · הצומת נתוני המקור דאטום B מפת היעד דאטום A המרה B→A E 1090 · N 760', `recap, case 2: ${await text(recap.nth(1))}`);
  await layout(ui, 'summary');
  await shot(ui, '17-summary');
  await btn('תרגול חוזר').click();
  await page.waitForTimeout(150);
  expect((await text(ui.panel)).includes('מקרה 1 מתוך 2') && (await btn('למקרה הבא').count()) === 0, 'practise again: case 1, nothing solved');
  // solve both again, then back to the demonstration
  const solve = async (conv) => {
    await ui.choice('match', conv ? 'לא, דאטומים שונים' : 'כן, אותו דאטום').click();
    await ui.choice('action', conv ? 'המרה B→A' : 'העתקה ללא המרה').click();
    if (conv) await root.locator('[data-step="send"] label', { hasText: 'E 1090' }).filter({ hasText: 'N 760' }).click();
    await btn('בדיקת הנתונים').click();
  };
  await solve(false);
  await btn('למקרה הבא').click();
  await solve(true);
  await btn('לסיכום התרגול').click();
  await btn('חזרה להדגמה').click();
  await page.waitForTimeout(250);
  expect((await ui.tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await root.locator('[data-datum="A"]').getAttribute('aria-checked')) === 'true', 'back to the demonstration, in A');

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
  const desc = await page.evaluate(() => {
    const el = document.activeElement;
    return { name: el?.getAttribute('aria-label'), desc: document.getElementById(el?.getAttribute('aria-describedby') || '')?.textContent };
  });
  expect(desc.name === 'שינוי הכיתוב בלבד' && desc.desc === 'רק האות בכותרת העותק משתנה', `the experiment's name and description: ${JSON.stringify(desc)}`);
  // the way on lands on the next stage's heading
  await root.getByRole('button', { name: 'נסו על נתונים נוספים', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'heading' && document.activeElement.textContent.includes('איזה צמד מספרים')), 'the way on lands on the new stage’s question');
  await ui.tabs.nth(2).focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(150);
  expect((await ui.tabs.nth(2).getAttribute('aria-selected')) === 'true', 'End → the last stage');
  // step 1 is a radio group: Tab in, Space, arrows
  await page.keyboard.press('Tab');
  let guard = 0;
  while (!(await page.evaluate(() => document.activeElement?.getAttribute('type') === 'radio')) && guard++ < 12) await page.keyboard.press('Tab');
  expect(guard < 12, 'the steps are reachable by Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  expect((await root.locator('[data-step="match"] input:checked').getAttribute('value')) === 'different', 'arrows move between the choices');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);
  expect((await root.locator('[data-step="match"] input:checked').getAttribute('value')) === 'same', 'and back');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement.closest('label')).boxShadow);
  expect(ring && ring !== 'none', 'focus is visible on the choice');
  await shot(ui, '18-keyboard-focus');
  // step 2: the next group, then the check
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('[data-step]')?.getAttribute('data-step') === 'action'), 'Tab reaches step 2');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect((await root.locator('[data-step="action"] input:checked').getAttribute('value')) === 'keep', 'Space picks the action');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.textContent?.includes('בדיקת הנתונים')), 'Tab reaches the check');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect((await text(ui.feedback)) === `נכון ${T.c1right}`, 'Enter checks');
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
  await btn(T.convert).click();
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
  await shot(ui, '19-load-failure');
  await page.unroute('**/datum-field-challenge/field-map.webp*');
  await root.getByRole('button', { name: 'נסו שוב' }).click();
  await root.locator('[data-map="ready"]').waitFor({ timeout: 20000 });
  expect((await root.getByRole('alert').count()) === 0, 'the retry recovers');
  expect(ui.errors.length === 0, `loading: page errors ${ui.errors}`);
  await ui.ctx.close();
}

// ─────────────────────────────────────────────────────────────── steadiness across the states measured
{
  const same = (a, b) => Math.abs(a - b) <= 0.6;
  const box0 = layouts[0].box;
  for (const l of layouts) expect(l.box.every((v, i) => same(v, box0[i])), `${l.state}: the map never moves or resizes (${l.box} vs ${box0})`);
  // inside a stage the way on and the card's height stay put whatever the feedback; between stages they may differ
  const stages = layouts.reduce((m, l) => m.set(l.stage, [...(m.get(l.stage) ?? []), l]), new Map());
  for (const [stage, ls] of stages) {
    expect(ls.every((l) => same(l.footerY, ls[0].footerY)), `${stage}: the way on stays in one place (${ls.map((l) => l.footerY)})`);
    expect(ls.every((l) => same(l.cardH, ls[0].cardH)), `${stage}: the card keeps one height (${ls.map((l) => l.cardH)})`);
  }
}

await browser.close();
if (failures.length) {
  if (process.env.QA_LAYOUTS) console.log(JSON.stringify(layouts));
  console.error(`✖ ${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
if (process.env.QA_LAYOUTS) console.log(JSON.stringify(layouts));
console.log(`✔ every check passed — ${layouts.length} states measured; screenshots in ${outDir}`);
