// Browser QA for lesson 6 › טכניקות ניווט (task 28): the dead-reckoning activity, and the fit of both
// technique cards at 1440 × 1122 in their tallest states.
//
// Usage (dev server running):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-dead-reckoning.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   dead reckoning
//     layout     field view at the inline start (right), planning map at the end (left), one height
//     copy       the technique's approved text, caption and legend are visible
//     no answer  step 1 asks for the count, so until it is checked right the count (800) is nowhere in the card —
//                text, SVG or accessible name (the answer options aside): the field counter reads "/ ?", the map has
//                no 100-pair ticks, the legend and the example withhold it; the right check turns them on; every
//                restart (mouse or keys, in step 1 or at the end) withholds it again
//     geometry   on screen, A→B points 62° and the ticks sit every 150 m; the compass arrow follows the setting;
//                the estimate after 300 pairs is 450 m along the line; the 3° example ends at A + 1200 m @ 65°
//     storm      the field is hazed beyond 30 m; the map carries no haze
//     flows      every wrong pace answer explained, then right; a wrong compass refused, then 62°; counting by 100s;
//                the wadi check at 300; the finished count asks, never announces arrival; both wrong decisions
//                explained; the right one opens the explanation; restart clears everything
//     keyboard   the whole task with keys only (focus follows each new step)
//     reduced    with reduced motion the count is a cut
//     text       body text ≥ 16 px (reference)
//   fit          both cards end above 1122 px in every state (terrain: wrong point / partial / hint 2 on each leg,
//                the explanation, the summary; dead reckoning: every step)
//   console      no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { LEGS } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavPractice.ts';
import { AZIMUTH_DEG, DEVIATION_DEG, DISTANCE_M, SHEET, START, TARGET, along } from '../../src/components/lessons/topic-06/dead-reckoning/deadReckoningModel.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/combatnav-task28';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-06/#scene-combatnav`;
await mkdir(`${outDir}/dead-reckoning`, { recursive: true });
await mkdir(`${outDir}/terrain-fit`, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

const DR = '[data-activity="dead-reckoning"]';
const TA = '[data-activity="terrain-association"]';

async function open(browser, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(DR, { timeout: 150000 });
  return { ctx, page, errors };
}
const align = (page, sel) => page.evaluate((s) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' }), sel);
const bottom = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().bottom), sel);
const shot = async (page, sel, file) => {
  await align(page, sel);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${file}` });
};
const fits = async (page, sel, label) => {
  await align(page, sel);
  await page.waitForTimeout(250);
  const b = await bottom(page, sel);
  check(b <= 1122, `fit · ${label}: card ends at ${b} px (≤ 1122)`);
  return b;
};
const drState = (page) => page.evaluate(() => window.__dr.state);
const drFeedback = (page) => page.locator(`${DR} [data-dr-feedback]`).getAttribute('data-dr-feedback');
const btn = (page, name) => page.locator(DR).getByRole('button', { name });
const turn = async (page, by) => {
  const name = `סיבוב של ${Math.abs(by)}° ${by > 0 ? 'עם' : 'נגד'} כיוון השעון`;
  await btn(page, name).click();
};
/** Map metres → screen px through the map's own CTM. */
const mapToScreen = (page, pts) =>
  page.locator('[data-panel="dr-map"] svg').evaluate((svg, ps) => {
    const ctm = svg.getScreenCTM();
    return ps.map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(ctm);
      return [p.x, p.y];
    });
  }, pts);
const screenToMap = (page, pts) =>
  page.locator('[data-panel="dr-map"] svg').evaluate((svg, ps) => {
    const inv = svg.getScreenCTM().inverse();
    return ps.map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(inv);
      return [p.x, p.y];
    });
  }, pts);
const bearingOf = ([x1, y1], [x2, y2]) => ((Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI + 360) % 360;
const m = (p) => [p.E, SHEET.height - p.N];

// The shortened copy of 2026-10-27 (lesson-6 copy cleanup); "the count is not proof" is step 3's answer.
const APPROVED = [
  'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש.',
  'השיטה מתאימה כשהראות מוגבלת או שיש מעט סימנים מובחנים, ובתנאי שנקודת המוצא ידועה.',
  'במפת התכנון רואים את כל הדרך, ובשטח רק כ־30 מ׳ סביבכם. ההליכה מוצגת ללא סטייה.',
  'אזימוט — כיוון מצפן קבוע',
];
// The approved lines that carry the count, and what is shown in their place until it is checked.
const LEGEND_FULL = 'מרחק — 1.2 ק״מ, כ־800 צעדים כפולים';
const LEGEND_BEFORE = 'מרחק — 1.2 ק״מ';

/** Every 800 in the card outside the pace options: text (shown or screen-reader only, SVG included) and accessible names. */
const countLeaks = (page) =>
  page.locator(DR).evaluate((root) => {
    const re = /(?<![\d,.])800(?!\d)/;
    const option = (el) => el?.closest('[data-radio="pace"]');
    const hits = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t; (t = walk.nextNode()); ) if (re.test(t.textContent) && !option(t.parentElement)) hits.push(t.textContent.trim().slice(0, 50));
    for (const el of root.querySelectorAll('*'))
      for (const a of ['aria-label', 'aria-valuetext', 'aria-description', 'title', 'alt'])
        if (re.test(el.getAttribute(a) ?? '') && !option(el)) hits.push(`${a}: ${el.getAttribute(a).slice(0, 50)}`);
    return hits;
  });
const fieldCount = (page) => page.locator('[data-field="count"]').textContent();
const tickCount = (page) => page.locator('[data-panel="dr-map"] [data-tick]').count();
const shows = (page, text) => page.locator(DR).getByText(text, { exact: true }).isVisible();
const countHidden = async (page, label) => {
  const leaks = await countLeaks(page);
  check(leaks.length === 0, `${label}: the count appears nowhere in the card${leaks.length ? `: ${JSON.stringify(leaks)}` : ''}`);
  check((await fieldCount(page)).includes('/ ?') && (await tickCount(page)) === 0, `${label}: the field counter waits ("/ ?"), the map has no 100-pair ticks`);
  check(await shows(page, LEGEND_BEFORE), `${label}: the legend gives the distance, not the count`);
};
const countShown = async (page, label) => {
  check((await fieldCount(page)).includes('/ 800') && (await tickCount(page)) === 7, `${label}: the field counter is on ("/ 800"), the map shows the 100-pair ticks`);
  check(await shows(page, LEGEND_FULL), `${label}: the approved legend line, with the count`);
};
const focusedRole = (page) => page.evaluate(() => [document.activeElement?.getAttribute('role'), document.activeElement?.closest('[data-radio]')?.getAttribute('data-radio')].join(':'));

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // ================================================================ dead reckoning
  const { page, errors, ctx } = await open(browser);
  await align(page, DR);
  await page.waitForTimeout(800);

  // ---- layout and copy
  const field = await page.locator('[data-panel="dr-field"]').boundingBox();
  const map = await page.locator('[data-panel="dr-map"]').boundingBox();
  check(field.x > map.x, 'field view at the inline start (right), planning map at the end (left)');
  check(Math.abs(field.height - map.height) < 1 && Math.abs(field.y - map.y) < 1, 'field view and map side by side, one height');
  for (const t of APPROVED) check(await page.locator(DR).getByText(t, { exact: false }).first().isVisible(), `visible: ${t.slice(0, 40)}…`);
  check((await page.locator(DR).getByText('סופת חול — בשטח בלבד').count()) === 1, 'legend: the storm limits the field, not the map');
  await countHidden(page, 'opening');
  check((await page.locator(`${DR} [data-controls="plan"]`).innerText()).includes('1,200 מ׳') && (await page.locator(`${DR} [data-controls="plan"]`).innerText()).includes('1.5 מ׳'), 'opening: the task gives the distance (1,200 m) and the double pace (1.5 m)');
  await fits(page, DR, 'dead reckoning · plan');
  await shot(page, DR, 'dead-reckoning/01-plan.png');

  // ---- geometry on screen
  const [a, b] = await mapToScreen(page, [m(START), m(TARGET)]);
  const onScreen = bearingOf(a, b);
  check(Math.abs(onScreen - AZIMUTH_DEG) < 0.3, `on screen, A→B points ${onScreen.toFixed(2)}° (62°): north up, not mirrored`);
  check((await page.locator('[data-panel="dr-map"] [mask]').count()) === 0, 'the storm never covers the map');
  const haze = await page.locator('[data-panel="dr-field"] [mask] rect').first().evaluate((r) => getComputedStyle(r).fillOpacity);
  check(Number(haze) === 1, 'the field is fully hazed beyond the sight radius');
  check((await page.locator('[data-field-note]').innerText()).includes('צומת הדרכים A'), 'at A the field shows the known junction');

  // ---- step 1: the pace count
  check(await btn(page, 'בדיקה').isDisabled(), 'no check before an answer');
  const pace = (v) => page.locator(`${DR} [data-radio="pace"] [data-option="${v}"]`).click();
  for (const [v, kind, needle] of [
    [1800, 'pace-multiplied', 'הכפלתם'],
    [1600, 'pace-single-steps', 'הצעדים הבודדים'],
    [1200, 'pace-metres', 'במטרים'],
  ]) {
    await pace(v);
    await btn(page, 'בדיקה').click();
    check((await drFeedback(page)) === kind && (await page.locator(`${DR} [data-dr-feedback]`).innerText()).includes(needle), `${v}: explained (${needle})`);
    check((await btn(page, /המשך: כיוון התנועה/).count()) === 0, `${v}: no way on with a wrong count`);
    await countHidden(page, `${v} checked`);
    await fits(page, DR, `dead reckoning · plan · ${v} wrong`);
    if (v === 1800) await shot(page, DR, 'dead-reckoning/02-pace-wrong.png');
  }
  await pace(800);
  check((await drFeedback(page)) === 'info', 'a changed answer clears the old verdict');
  await countHidden(page, '800 chosen, not checked');
  await btn(page, 'בדיקה').click();
  const right = await page.locator(`${DR} [data-dr-feedback]`).innerText();
  check((await drFeedback(page)) === 'pace-right' && right.includes('1,200 ÷ 1.5 = 800') && right.includes('750'), '800: right, with the division and another pace (1.6 m → 750)');
  await countShown(page, '800 checked');
  const ticks = await page.locator('[data-panel="dr-map"] [data-tick]').evaluateAll((els) =>
    els.map((e) => {
      const n = e.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
      return [(n[0] + n[2]) / 2, (n[1] + n[3]) / 2];
    }),
  );
  check(
    ticks.every(([x, y], k) => Math.abs(Math.hypot(x - m(START)[0], y - m(START)[1]) - 150 * (k + 1)) < 0.3),
    'each tick is 150 m further along the line (100 pairs × 1.5 m)',
  );
  await fits(page, DR, 'dead reckoning · plan · right');
  await shot(page, DR, 'dead-reckoning/03-pace-right.png');
  await btn(page, /המשך: כיוון התנועה/).click();

  // ---- step 2: the compass
  check((await drState(page)).step === 'heading', 'on to the compass');
  check((await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'slider', 'focus moves to the compass');
  for (let k = 0; k < 3; k++) await turn(page, 10);
  const arrow = await page.locator('[data-map="heading"] path').first().getAttribute('d');
  const n = arrow.match(/-?\d+(\.\d+)?/g).map(Number);
  check(Math.abs(bearingOf([n[0], n[1]], [n[2], n[3]]) - 30) < 0.2, 'the map arrow from A points where the compass is set (30°)');
  await btn(page, /יציאה לדרך/).click();
  const off = await page.locator(`${DR} [data-dr-feedback]`).innerText();
  check((await drState(page)).step === 'heading' && (await drFeedback(page)) === 'heading-off', '30°: no departure');
  check(off.includes('32°') && off.includes('עם כיוון השעון') && off.includes('660'), '30°: turn 32° clockwise; it would end ≈ 660 m from B (2·1200·sin16°)');
  await fits(page, DR, 'dead reckoning · compass off');
  await shot(page, DR, 'dead-reckoning/04-compass-off.png');
  for (let k = 0; k < 27; k++) await turn(page, 10);
  await turn(page, -1);
  await turn(page, -1);
  check((await drState(page)).heading === 298, 'turned to 298°');
  await btn(page, /יציאה לדרך/).click();
  check((await page.locator(`${DR} [data-dr-feedback]`).innerText()).includes('נגד כיוון השעון'), '298°: "measured counter-clockwise" explained');
  for (let k = 0; k < 12; k++) await turn(page, 10);
  for (let k = 0; k < 4; k++) await turn(page, 1);
  check((await drState(page)).heading === 62, 'set to 62°');
  await btn(page, /יציאה לדרך/).click();
  check((await drState(page)).step === 'walk' && (await drFeedback(page)) === 'departed', '62°: under way');
  check((await page.locator('[data-map="heading"]').count()) === 0, 'the compass arrow gives way to the count');

  // ---- counting
  const advance = () => btn(page, /עוד 100 צעדים כפולים/).click();
  for (let k = 0; k < 3; k++) {
    await advance();
    await page.waitForTimeout(1100);
  }
  const s3 = await drState(page);
  check(s3.pairs === 300 && (await page.locator('[data-field-pairs]').getAttribute('data-field-pairs')) === '300', 'three presses: 300 pairs in the strip and in the field');
  check((await page.locator('[data-panel="dr-map"] [data-tick][data-on]').count()) === 3, 'three ticks passed on the map');
  const est = await page.locator('[data-map="estimate"] circle').nth(1).boundingBox();
  const [[ex, ey]] = await screenToMap(page, [[est.x + est.width / 2, est.y + est.height / 2]]);
  const want = m(along(450));
  check(Math.hypot(ex - want[0], ey - want[1]) < 3, `the estimate is 450 m along the 62° line (${Math.hypot(ex - want[0], ey - want[1]).toFixed(1)} m off)`);
  check((await drFeedback(page)) === 'wadi' && (await page.locator('[data-field-note]').innerText()).includes('ערוץ יבש'), '300 pairs: the wadi — a check on the way, on the map at 450 m');
  await fits(page, DR, 'dead reckoning · counting');
  await shot(page, DR, 'dead-reckoning/05-wadi.png');
  await advance();
  await page.waitForTimeout(1100);
  check(!(await page.locator('[data-field-note]').innerText()).includes('ערוץ'), '400 pairs: the wadi is out of sight again');
  for (let k = 0; k < 4; k++) {
    await advance();
    await page.waitForTimeout(1100);
  }
  const s8 = await drState(page);
  check(s8.pairs === 800 && s8.step === 'verify', '800 pairs: the count is complete — and a question follows');
  const askTitle = await page.locator(`${DR} h4`).innerText();
  check(!/הגעתם ל־B|הגעתם ליעד/.test(askTitle + (await page.locator(`${DR} [data-dr-feedback]`).innerText())), 'the finished count does not announce arrival');
  check((await page.locator('[data-map="deviation"]').count()) === 0, 'no explanation before the decision');
  await fits(page, DR, 'dead reckoning · decision');
  await shot(page, DR, 'dead-reckoning/06-decision.png');

  // ---- step 3: the decision
  const decide = async (v) => {
    await page.locator(`${DR} [data-radio="verify"] [data-option="${v}"]`).click();
    await btn(page, 'בדיקה').click();
  };
  await decide('proof');
  check((await drFeedback(page)) === 'verify-proof', '"the count proves it": wrong, explained');
  await fits(page, DR, 'dead reckoning · decision wrong');
  await shot(page, DR, 'dead-reckoning/07-decision-wrong.png');
  await decide('keep-walking');
  check((await drFeedback(page)) === 'verify-keep-walking', '"keep walking until you see it": wrong, explained');
  await decide('estimate');
  const done = await page.locator(`${DR} [data-dr-feedback]`).innerText();
  check((await drFeedback(page)) === 'verify-right' && done.includes('31') && done.includes('63') && done.includes('80') && done.includes('160'), 'right: the 3° gaps (31 / 63 m), the short pace (80 m) and the landmark (160 m)');
  const endC = page.locator('[data-map="deviation"] circle');
  const [cx, cy] = [Number(await endC.getAttribute('cx')), Number(await endC.getAttribute('cy'))];
  const end65 = m(along(DISTANCE_M, AZIMUTH_DEG + DEVIATION_DEG));
  check(Math.abs(cx - end65[0]) < 0.11 && Math.abs(cy - end65[1]) < 0.11, 'the 3° example ends at A + 1,200 m @ 65°');
  const devText = await page.locator('[data-map="deviation"]').innerText().catch(() => page.locator('[data-map="deviation"]').textContent());
  check(/31 מ׳/.test(devText) && /63 מ׳/.test(devText), 'the gaps are labelled on the map: 31 m at 600 m, 63 m at the end');
  check((await page.locator(DR).getAttribute('data-done')) === 'true', 'the task ends: "נדרש אימות"');
  await fits(page, DR, 'dead reckoning · done');
  await shot(page, DR, 'dead-reckoning/08-done.png');

  // ---- text size (reference px: computed size ignores the fit transform)
  const small = await page.locator(DR).evaluate((root) =>
    [...root.querySelectorAll('p, li, h4, [role="radio"], [data-field-note], [data-heading-readout]')]
      .filter((e) => e.offsetParent !== null && e.textContent.trim())
      .map((e) => [e.textContent.trim().slice(0, 30), parseFloat(getComputedStyle(e).fontSize)])
      .filter(([, s]) => s < 16),
  );
  check(small.length === 0, `body text ≥ 16 px${small.length ? `: ${JSON.stringify(small)}` : ''}`);

  // ---- restart
  await btn(page, 'התחלה מחדש').first().click();
  const r = await drState(page);
  check(r.step === 'plan' && r.pairs === 0 && r.pace === null && r.heading === 0 && r.verify === null, 'restart: back to step 1, everything cleared');
  await page.waitForTimeout(300);
  check((await page.locator('[data-field-pairs]').getAttribute('data-field-pairs')) === '0' && (await page.locator('[data-map="deviation"]').count()) === 0, 'restart: the field and the map back at A');
  await countHidden(page, 'restart at the end');
  check((await page.locator(TA).getAttribute('data-mode')) === 'learn', 'the terrain activity is untouched by this one');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();

  // ---- keyboard only
  {
    const k = await open(browser);
    const p = k.page;
    await align(p, DR);
    await p.locator(`${DR} [data-radio="pace"] [role="radio"]`).first().focus();
    await p.keyboard.press('ArrowLeft'); // next option in RTL: 1,200
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    check((await drFeedback(p)) === 'pace-metres', 'keys: a wrong count (1,200) is checked and explained');
    await countHidden(p, 'keys · 1,200 checked');
    await p.keyboard.press('Shift+Tab'); // back to the chosen option
    await p.keyboard.press('ArrowRight'); // previous option in RTL: 800
    check((await drState(p)).pace === 800 && (await drFeedback(p)) === 'info', 'keys: the answer is corrected to 800');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    check((await drFeedback(p)) === 'pace-right', 'keys: the corrected count is checked right');
    await countShown(p, 'keys · 800 checked');
    // a restart from step 1: back past the answers to the task line's reset
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Shift+Tab');
    check((await p.evaluate(() => document.activeElement?.textContent)).includes('התחלה מחדש'), 'keys: Shift+Tab reaches "התחלה מחדש"');
    await p.keyboard.press('Enter');
    check((await drState(p)).pace === null && (await drFeedback(p)) === 'info', 'keys: a restart in step 1 clears the answer');
    check((await focusedRole(p)) === 'radio:pace', 'keys: after that restart, focus is back on the answers');
    await countHidden(p, 'keys · restart in step 1');
    await shot(p, DR, 'dead-reckoning/09a-keyboard-restart-plan.png');
    await p.keyboard.press('Space'); // 800 (first option)
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    check((await drFeedback(p)) === 'pace-right', 'keys: choose and check the count');
    await p.keyboard.press('Enter'); // the same button now leads on
    check((await drState(p)).step === 'heading', 'keys: on to the compass');
    await p.keyboard.press('Home');
    for (let i = 0; i < 6; i++) await p.keyboard.press('PageUp');
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('ArrowUp');
    check((await drState(p)).heading === 62, 'keys: the dial turns to 62° (PageUp ±10, arrows ±1)');
    for (let i = 0; i < 5; i++) await p.keyboard.press('Tab');
    check((await p.evaluate(() => document.activeElement?.textContent)).includes('יציאה לדרך'), 'keys: Tab reaches "יציאה לדרך" after the turn buttons');
    await p.keyboard.press('Enter');
    check((await drState(p)).step === 'walk', 'keys: under way');
    for (let i = 0; i < 8; i++) await p.keyboard.press('Enter');
    check((await drState(p)).step === 'verify', 'keys: counted to 800 on the focused button');
    await p.keyboard.press('ArrowLeft'); // next option in RTL: "estimate"
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    check((await drFeedback(p)) === 'verify-right', 'keys: decide and check');
    check((await p.evaluate(() => document.activeElement?.textContent)).includes('התחלה מחדש'), 'keys: focus lands on "התחלה מחדש"');
    await p.keyboard.press('Enter');
    check((await drState(p)).step === 'plan', 'keys: restart');
    check((await focusedRole(p)) === 'radio:pace', 'keys: after the restart, focus is on the answers of step 1');
    await countHidden(p, 'keys · restart at the end');
    await shot(p, DR, 'dead-reckoning/09-keyboard-restart.png');
    await k.ctx.close();
  }

  // ---- reduced motion: the count is a cut
  {
    const rm = await open(browser, { reduced: true });
    const p = rm.page;
    await align(p, DR);
    await p.locator(`${DR} [data-radio="pace"] [data-option="800"]`).click();
    await btn(p, 'בדיקה').click();
    await btn(p, /המשך: כיוון התנועה/).click();
    await btn(p, 'סיבוב של 10° עם כיוון השעון').click();
    for (let i = 0; i < 5; i++) await btn(p, 'סיבוב של 10° עם כיוון השעון').click();
    await btn(p, 'סיבוב של 1° עם כיוון השעון').click();
    await btn(p, 'סיבוב של 1° עם כיוון השעון').click();
    await btn(p, /יציאה לדרך/).click();
    await btn(p, /עוד 100 צעדים כפולים/).click();
    await p.waitForTimeout(60);
    check((await p.locator('[data-field-pairs]').getAttribute('data-field-pairs')) === '100', 'reduced motion: the field jumps to 100 pairs at once');
    await shot(p, DR, 'dead-reckoning/10-reduced-motion.png');
    await rm.ctx.close();
  }

  // ================================================================ terrain association: tallest states
  {
    const t = await open(browser);
    const p = t.page;
    await p.waitForFunction(() => !document.querySelector('[data-panel="map"] [data-loading]'), null, { timeout: 120000 });
    await fits(p, TA, 'terrain · learn');
    await p.locator(`${TA} [data-mode-switch] [role="radio"]`).nth(1).click();
    await p.waitForTimeout(800);
    const tFeedback = () => p.locator(`${TA} [data-feedback]`).getAttribute('data-feedback');
    const tCheck = () => p.locator(TA).getByRole('button', { name: 'בדיקת המיקום' }).click();
    let worst = 0;
    for (const leg of LEGS) {
      const radios = p.locator(`${TA} [data-radio="candidates"] [role="radio"]`);
      // wrong points, with the comparison and both hints
      for (const c of leg.candidates) {
        await radios.nth(leg.candidates.indexOf(c)).click();
        const plate = await p.locator(`${TA} [data-overlay="measure"] rect`).evaluate((r) => [r.x.baseVal.value, r.y.baseVal.value, r.width.baseVal.value, r.height.baseVal.value]);
        check(plate[0] >= 0 && plate[0] + plate[2] <= 1400 && plate[1] >= 0 && plate[1] + plate[3] <= 1750, `leg ${leg.index + 1} · point ${c}: the direction-and-distance label stays on the sheet`);
      }
      for (const c of leg.candidates.filter((x) => x !== leg.answer)) {
        await radios.nth(leg.candidates.indexOf(c)).click();
        await p.locator(`${TA} [data-radio="comparison"] [data-option="mismatch"]`).click();
        await tCheck();
        if ((await p.locator(TA).getByRole('button', { name: /רמז/ }).isEnabled())) await p.locator(TA).getByRole('button', { name: /רמז/ }).click();
        if ((await p.locator(TA).getByRole('button', { name: /רמז/ }).isEnabled())) await p.locator(TA).getByRole('button', { name: /רמז/ }).click();
        worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · wrong point ${c} + hint 2`));
      }
      // the right point with both false statements and the wrong comparison
      await radios.nth(leg.candidates.indexOf(leg.answer)).click();
      for (const e of leg.evidence.filter((x) => !leg.correctEvidence.includes(x.id))) await p.locator(`${TA} [data-evidence-id="${e.id}"]`).click();
      await p.locator(`${TA} [data-radio="comparison"] [data-option="mismatch"]`).click();
      await tCheck();
      check((await tFeedback()) === 'partial' && (await p.locator(`${TA} [data-evidence-id][data-wrong]`).count()) === 2, `leg ${leg.index + 1}: both false statements marked ✕`);
      worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · partial, both false + hint 2`));
      if (leg.index === 0) await shot(p, TA, 'terrain-fit/leg1-partial-hint2.png');
      if (leg.index === 3) await shot(p, TA, 'terrain-fit/leg4-partial-hint2.png');
      await p.locator(TA).getByRole('button', { name: 'הצגת הסבר' }).click();
      check((await tFeedback()) === 'explained', `leg ${leg.index + 1}: the explanation after a check`);
      worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · explained`));
      if (leg.index === 1) {
        // the practice reset, beside the mode switch: back to leg 1, still practising
        await p.locator(TA).getByRole('button', { name: 'התחלה מחדש' }).click();
        const st = await p.evaluate(() => window.__tn.state);
        check(st.leg === 0 && st.mode === 'practice' && st.outcomes.every((o) => o === null), 'practice restart: back to leg 1, progress cleared, still in practice');
        // walk back to leg 3 to continue the sweep
        for (let k = 0; k < 2; k++) {
          await tCheck();
          await p.locator(TA).getByRole('button', { name: 'הצגת הסבר' }).click();
          await p.locator(`${TA} [data-strip="practice"] button`, { hasText: 'המשך לקטע הדרך הבא' }).click();
          await p.waitForTimeout(300);
        }
        continue;
      }
      await p.locator(`${TA} [data-strip="practice"] button`, { hasText: /המשך לקטע הדרך הבא|לסיכום הציר/ }).click();
      await p.waitForTimeout(400);
    }
    worst = Math.max(worst, await fits(p, TA, 'terrain · summary'));
    await shot(p, TA, 'terrain-fit/summary.png');
    ok(`terrain: tallest state ends at ${worst} px`);
    check(t.errors.length === 0, `terrain sweep: no page errors${t.errors.length ? `: ${t.errors.join(' | ')}` : ''}`);
    await t.ctx.close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
