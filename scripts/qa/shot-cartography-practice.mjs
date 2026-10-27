// Browser QA for lesson 2 › תרגול: "קוראים את המפה" (cartography-practice).
//
// Usage (a dev server serving the page — the shared :3000 by default, or an isolated worktree):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-cartography-practice.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   frame      the card has the frame of the lesson's activities: the lesson's one fit scale (as a lesson-2 activity in the
//              learn tab, same run), one fit only, the same edges; title and body size on screen as lesson 6's practice
//   layout     the task panel at the inline start (right), the map at the end (left); the map is north up and not mirrored
//              (E labels grow to the right, N labels upwards)
//   fit        the card runs from under the header to ≤ 1122 px in every state checked, feedback, hints and summary
//              included; nothing inside it scrolls
//   neutral    a choice before "בדיקה" carries no ✓/✗, no verdict tone on the map, no feedback
//   no answer  before a check / the solution: no computed ground distance in the card, no measured line, no reading lines,
//              no slope evidence, no right tone; no "תלול"/"מתון" or landform name on the map or in its description
//   data       what the task needs stays visible: the two levels on both segments, the ratio and scale bar, the frame labels of
//              the point's lines, datum, zone and hemisphere
//   flows      both scenarios: wrong → feedback kind; the same answer re-checked is not a new try; hint after the first
//              wrong; solution after a second different wrong or after the hint; a changed answer drops the old mark; a right
//              answer or the solution opens "לשלב הבא"; going back keeps a step's answer and feedback; summary per skill
//              (alone / hint / solution); a review link opens its sub-topic in the learn tab; another scenario; restart
//   keyboard   a whole scenario with keys only (Tab / Space / Enter / typing), focus moving to each step's question, a
//              visible focus ring on the controls
//   reduced    with reduced motion the card works and runs no animation
//   text       map labels ≥ 13 px on screen
//   console    no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { scenario, SCENARIO_COUNT } from '../../src/components/lessons/topic-02/cartography-practice/practiceModel.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/cartography-practice';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-02/`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

const A = '[data-activity="cartography-practice"]';
const MAP = `${A} [data-panel="carto-map"] svg`;
const SC = Array.from({ length: SCENARIO_COUNT }, (_, i) => scenario(i));

async function openPractice(page) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
      await page.getByRole('tab', { name: 'תרגול' }).first().click({ timeout: 60000 });
      await page.waitForSelector(A, { timeout: 90000 });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`retry open (${String(e).split('\n')[0]})`);
    }
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
}

async function open(browser, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|\/reference-assets\//.test(m.location()?.url ?? '')) errors.push(m.text());
  });
  await openPractice(page);
  return { ctx, page, errors };
}

const top = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
const st = (page) => page.evaluate(() => window.__cartoPractice.state);
const btn = (page, name) => page.locator(A).getByRole('button', { name, exact: true });
const choice = (page, id) => page.locator(`${A} [data-choice="${id}"]`);
const feedback = (page) => page.locator(`${A} [data-carto-feedback]`).getAttribute('data-carto-feedback');
const cardText = (page) => page.locator(A).evaluate((el) => el.innerText);

let tallest = { bottom: 0, label: '' };
const fits = async (page, label) => {
  await top(page);
  await page.waitForTimeout(150);
  const b = await page.locator(A).boundingBox();
  if (b.y + b.height > tallest.bottom) tallest = { bottom: b.y + b.height, label };
  const scrollers = await page.locator(A).evaluate((root) =>
    [...root.querySelectorAll('*')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return /(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
      })
      .map((el) => el.tagName + '.' + el.className.toString().slice(0, 40)),
  );
  check(b.y >= 96 && b.y + b.height <= 1122 && scrollers.length === 0, `fit · ${label}: card ${Math.round(b.y)}–${Math.round(b.y + b.height)} px${scrollers.length ? `, scrolls: ${scrollers}` : ''}`);
};
const shot = async (page, file) => {
  await top(page);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${file}` });
};

/** A card's frame on screen: fit scale (and how many fits hold it), edges, padding, title and body size. */
const frame = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const fits = [];
    for (let p = el.parentElement; p; p = p.parentElement) if (p.hasAttribute('data-fit-scale')) fits.push(Number(p.getAttribute('data-fit-scale')));
    const k = fits.reduce((a, b) => a * b, 1);
    const r = el.getBoundingClientRect();
    const px = (e) => (e ? parseFloat(getComputedStyle(e).fontSize) * k : NaN);
    return { fits, k, x: r.x, right: r.right, pad: parseFloat(getComputedStyle(el).paddingTop) * k, title: px(el.querySelector('h2')), body: px(el.querySelector('p.text-base')) };
  });
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

/** Visible verdict marks (✓/✗ on choices or the input, verdict tones on the map). */
const marks = (page) =>
  page.locator(A).evaluate((root) => ({
    choices: [...root.querySelectorAll('[data-choice][data-verdict]')].map((e) => e.getAttribute('data-verdict')),
    map: [...root.querySelectorAll('[data-mark][data-tone], [data-segment][data-tone]')].map((e) => e.getAttribute('data-tone')).filter((t) => t === 'right' || t === 'wrong'),
  }));

/** Leaks that must not exist before a check (or the solution). */
async function noLeak(page, sc, step, label) {
  const text = await cardText(page);
  const svgText = await page.locator(MAP).evaluate((s) => s.textContent);
  const desc = await page.locator(`${A} [data-map-description]`).evaluate((e) => e.textContent);
  const words = /תלול|מתון|כיפה|אוכף|תבליט|תכסית/;
  check(!words.test(svgText) && !words.test(desc), `no answer · ${label}: no landform / slope words on the map or in its description`);
  const m = await marks(page);
  check(m.map.length === 0, `no answer · ${label}: no verdict tone on the map`);
  if (step === 1) check((await page.locator(`${MAP} [data-crossing]`).count()) === 0, `no answer · ${label}: no slope evidence before the check`);
  if (step === 2) {
    const D = sc.ground3.metres;
    const re = new RegExp(`(?<![\\d.,])(${D}|${D.toLocaleString('en-US')})(?![\\d.,])`);
    const inputs = await page.locator(`${A} input`).evaluateAll((els) => els.map((e) => e.value));
    const svgNums = await page.locator(MAP).evaluate((s) => [...s.querySelectorAll('text')].map((t) => t.textContent));
    check(!re.test(text) && !svgNums.some((t) => re.test(t)) && !inputs.some((v) => re.test(v)), `no answer · ${label}: the ground distance (${D} m) appears nowhere`);
    check((await page.locator(`${MAP} [data-map-measured]`).count()) === 0, `no answer · ${label}: no measured line`);
  }
  if (step === 3) check((await page.locator(`${MAP} [data-map-read-lines], ${MAP} [data-map-read-labels]`).count()) === 0, `no answer · ${label}: no reading lines`);
}

/** The data each step needs stays on screen. */
async function dataVisible(page, sc, step, label) {
  const svg = await page.locator(MAP).evaluate((s) => [...s.querySelectorAll('text')].map((t) => t.textContent));
  const meta = await page.locator(`${A} [data-map-meta]`).innerText();
  check(svg.includes(`1:${sc.denominator.toLocaleString('en-US')}`) && svg.includes(String(sc.mPerCm * 2)) && svg.includes(String(sc.mPerCm * 4)), `data · ${label}: ratio and scale bar`);
  check(meta.includes('WGS84') && meta.includes(String(sc.interval)) && /פלח\s*36/.test(meta.replace(/⁨|⁩/g, '')) && meta.includes('צפוני'), `data · ${label}: interval, datum, zone and hemisphere beside the map`);
  if (step === 1) {
    const labels = await page.locator(`${MAP} [data-contour-label]`).evaluateAll((g) => g.map((e) => e.getAttribute('data-contour-label')));
    const [lo, hi] = sc.slope.levels.map(String);
    check(labels.filter((l) => l === lo).length >= 2 && labels.filter((l) => l === hi).length >= 2, `data · ${label}: both levels (${hi}, ${lo}) labelled at both segments`);
  }
  if (step === 3) check(svg.includes(String(sc.point.E)) && svg.includes(String(sc.point.N)), `data · ${label}: the frame labels of the point's lines`);
}

/** Map labels on screen ≥ 13 px. */
const smallestMapText = (page) =>
  page.locator(MAP).evaluate((svg) => {
    const k = svg.getScreenCTM().a;
    return Math.min(...[...svg.querySelectorAll('text')].map((t) => parseFloat(t.getAttribute('font-size') ?? getComputedStyle(t).fontSize) * k));
  });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // ================================================================ frame and layout
  {
    const { page, errors, ctx } = await open(browser);
    const card = await frame(page, A);
    check(card.fits.length === 1, `frame: one fit only (${card.fits})`);
    const mapBox = await page.locator(`${A} [data-panel="carto-map"]`).boundingBox();
    const panelBox = await page.locator(`${A} [data-panel="carto-step"]`).boundingBox();
    check(mapBox.x + mapBox.width <= panelBox.x + 1, 'layout: the map at the left (inline end), the task at the right');
    const eLabels = await page.locator(`${MAP} [data-frame-e]`).evaluateAll((ts) => ts.map((t) => [Number(t.getAttribute('data-frame-e')), t.getBoundingClientRect().x]));
    const nLabels = await page.locator(`${MAP} [data-frame-n]`).evaluateAll((ts) => ts.map((t) => [Number(t.getAttribute('data-frame-n')), t.getBoundingClientRect().y]));
    const grows = (pairs, sign) => pairs.every((p, i) => i === 0 || (p[0] > pairs[i - 1][0]) === (sign * (p[1] - pairs[i - 1][1]) > 0));
    check(grows(eLabels, 1) && grows(nLabels, -1), 'layout: north up, not mirrored (E grows right, N grows up)');
    const min = await smallestMapText(page);
    check(min >= 13, `text: the smallest map label is ${min.toFixed(1)} px`);
    await shot(page, '01-opening.png');
    await fits(page, 'opening');

    // the frame of a lesson-2 activity in the learn tab (same run) — a hash-only goto would keep the practice tab
    await page.goto('about:blank');
    await page.goto(`${URL}#scene-scale`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForTimeout(2500);
    const learnFit = await page.locator('[data-lesson-viewport-fit]').first().getAttribute('data-fit-scale');
    const learnCard = await page.locator('[data-lesson-viewport-fit] .surface-elevated').first().boundingBox();
    check(near(card.k, Number(learnFit), 0.002), `frame: the lesson's one scale (${card.k} vs learn tab ${learnFit})`);
    check(near(card.x, learnCard.x, 1.5) && near(card.right, learnCard.x + learnCard.width, 1.5), `frame: the same edges as the lesson's activities (${Math.round(card.x)}–${Math.round(card.right)} vs ${Math.round(learnCard.x)}–${Math.round(learnCard.x + learnCard.width)})`);
    // lesson 6's practice, for the title and body type on screen
    await page.goto('about:blank');
    await page.goto(`${BASE}/lessons/topic-06/`, { waitUntil: 'load', timeout: 180000 });
    await page.getByRole('tab', { name: 'תרגול' }).first().click();
    const nav = await page.waitForSelector('[data-activity="navigation-sim"]', { timeout: 60000 }).then(() => frame(page, '[data-activity="navigation-sim"]')).catch(() => null);
    if (nav) check(near(card.title, nav.title) && near(card.body, nav.body) && near(card.pad, nav.pad), `frame: title ${card.title.toFixed(1)} / body ${card.body.toFixed(1)} / padding ${card.pad.toFixed(1)} px as lesson 6's practice (${nav.title.toFixed(1)} / ${nav.body.toFixed(1)} / ${nav.pad.toFixed(1)})`);
    else fail('frame: lesson 6 practice not found for comparison');

    // tabs keep no state; the practice reopens at task 1
    await page.goto('about:blank');
    await openPractice(page);
    await choice(page, SC[0].reliefAnswer).click();
    await page.getByRole('tab', { name: 'בדיקת ידע' }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('tab', { name: 'תרגול' }).first().click();
    await page.waitForSelector(A);
    const s = await st(page);
    check(s.step === 0 && s.tasks.relief.answer === '', 'tabs: the practice reopens at task 1 after the knowledge check');
    check(errors.length === 0, `console: no page errors${errors.length ? `: ${errors.slice(0, 3)}` : ''}`);
    await ctx.close();
  }

  // ================================================================ both scenarios, pointer
  for (const [i, sc] of SC.entries()) {
    const { page, errors, ctx } = await open(browser);
    const P = `s${i + 1}`;
    if (i === 1) {
      // reach scenario B by the summary's "תרחיש נוסף" (solving A fast)
      const a = SC[0];
      for (const val of [a.reliefAnswer, a.slopeAnswer]) {
        await choice(page, val).click();
        await btn(page, 'בדיקה').click();
        await btn(page, 'לשלב הבא').click();
      }
      await page.locator(`${A} [data-distance-input]`).fill(String(a.ground3.metres));
      await btn(page, 'בדיקה').click();
      await btn(page, 'לשלב הבא').click();
      await choice(page, a.locationAnswer).click();
      await btn(page, 'בדיקה').click();
      await btn(page, 'לסיכום').click();
      await btn(page, 'תרחיש נוסף').click();
      const s = await st(page);
      check(s.scenario === 1 && s.step === 0, 'another scenario: B opens at task 1');
    }
    check((await page.locator(A).getAttribute('data-scenario')) === sc.id, `${sc.id}: the card shows scenario ${sc.id}`);

    // ---- task 1
    if (i === 1) await shot(page, '11-B-task1.png');
    await noLeak(page, sc, 0, `${sc.id} task 1`);
    await dataVisible(page, sc, 0, `${sc.id} task 1`);
    // the letter discs leave the spot heights and the tops' triangles readable
    const covered = await page.locator(MAP).evaluate((svg) => {
      // the visible disc (not its transparent pointer target), as a circle against each label's box
      const discs = [...svg.querySelectorAll('[data-mark] circle[stroke]')].map((c) => {
        const b = c.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 };
      });
      const hit = (d, b) => Math.hypot(Math.max(b.left - d.x, 0, d.x - b.right), Math.max(b.top - d.y, 0, d.y - b.bottom)) < d.r;
      return [...svg.querySelectorAll('[data-spot] text, [data-spot] path')].filter((t) => discs.some((d) => hit(d, t.getBoundingClientRect()))).map((t) => t.textContent || '▲');
    });
    check(covered.length === 0, `${sc.id} task 1: the marks leave the spot heights readable${covered.length ? ` (covered: ${covered})` : ''}`);
    const wrong1 = sc.marks.filter((m) => m.letter !== sc.reliefAnswer).map((m) => m.letter);
    // choose on the map
    await page.locator(`${MAP} [data-mark="${wrong1[0]}"]`).click();
    let m = await marks(page);
    let s = await st(page);
    check(s.tasks.relief.answer === wrong1[0] && m.choices.length === 0 && m.map.length === 0 && (await feedback(page)) === 'none', `${sc.id} task 1: choosing on the map is neutral (no ✓/✗, no feedback)`);
    check((await page.locator(`${MAP} [data-mark="${wrong1[0]}"]`).getAttribute('data-tone')) === 'selected', `${sc.id} task 1: the chosen mark is shown as chosen`);
    await btn(page, 'בדיקה').click();
    check(/^cover-/.test(await feedback(page)), `${sc.id} task 1: wrong → ${await feedback(page)}`);
    const fbText = await page.locator(`${A} [data-carto-feedback]`).innerText();
    const right = sc.marks.find((x) => x.letter === sc.reliefAnswer);
    check(!fbText.includes({ dome: 'כיפה', saddle: 'אוכף' }[right.kind]) && !new RegExp(`(^|\\s)${sc.reliefAnswer}(\\s|$)`).test(fbText), `${sc.id} task 1: wrong feedback does not name the right element`);
    check((await btn(page, 'רמז').count()) === 1 && (await btn(page, 'הצגת הפתרון').count()) === 0, `${sc.id} task 1: hint offered after the first wrong, no solution yet`);
    if (i === 0) await shot(page, '02-task1-wrong.png');
    await fits(page, `${sc.id} task 1 wrong`);
    const checks = (await st(page)).checks;
    await btn(page, 'בדיקה').click();
    check((await st(page)).checks === checks && (await st(page)).tasks.relief.wrong.length === 1, `${sc.id} task 1: the same answer re-checked is not a new try`);
    await choice(page, wrong1[1]).click();
    m = await marks(page);
    check(m.choices.length === 0 && (await feedback(page)) === 'none', `${sc.id} task 1: a changed answer drops the previous ✗`);
    await btn(page, 'בדיקה').click();
    check((await btn(page, 'הצגת הפתרון').count()) === 1, `${sc.id} task 1: solution offered after two different wrong answers`);
    if (i === 0) {
      await btn(page, 'רמז').click();
      check((await page.locator(`${A} [data-hint]`).count()) === 1, 'A task 1: the hint appears');
      await shot(page, '03-task1-hint.png');
      await fits(page, 'A task 1 hint');
      await choice(page, sc.reliefAnswer).click();
      await btn(page, 'בדיקה').click();
      check((await feedback(page)) === 'right' && (await page.locator(`${MAP} [data-mark="${sc.reliefAnswer}"]`).getAttribute('data-tone')) === 'right', 'A task 1: right → ✓ on the choice and the mark');
    } else {
      await btn(page, 'הצגת הפתרון').click();
      check((await feedback(page)) === 'solution' && (await st(page)).tasks.relief.answer === sc.reliefAnswer, 'B task 1: the solution, on request');
      await fits(page, 'B task 1 solution');
    }
    check((await btn(page, 'לשלב הבא').count()) === 1 && (await st(page)).step === 0, `${sc.id} task 1: "לשלב הבא" offered, no automatic move`);
    await btn(page, 'לשלב הבא').click();

    // ---- task 2
    await noLeak(page, sc, 1, `${sc.id} task 2`);
    await dataVisible(page, sc, 1, `${sc.id} task 2`);
    const steep = sc.segments.find((x) => x.id !== sc.slopeAnswer).id;
    await page.locator(`${MAP} [data-segment-disc="${steep}"]`).click();
    check((await st(page)).tasks.slope.answer === steep && (await feedback(page)) === 'none', `${sc.id} task 2: choosing a segment on the map is neutral`);
    await btn(page, 'בדיקה').click();
    check((await feedback(page)) === 'steeper', `${sc.id} task 2: the steeper one → its feedback`);
    if (i === 1) {
      await btn(page, 'רמז').click();
      check((await btn(page, 'הצגת הפתרון').count()) === 1, 'B task 2: the hint opens the solution');
    }
    await choice(page, sc.slopeAnswer).click();
    await btn(page, 'בדיקה').click();
    check((await feedback(page)) === 'right' && (await page.locator(`${MAP} [data-crossing]`).count()) === 2 * ((sc.slope.levels[1] - sc.slope.levels[0]) / sc.interval + 1), `${sc.id} task 2: right → the contour crossings drawn on both segments`);
    const fb2 = await page.locator(`${A} [data-carto-feedback]`).innerText();
    check(!/בטוח|תנועה|רכב|כלי/.test(fb2), `${sc.id} task 2: the feedback is about steepness only`);
    await shot(page, i === 0 ? '04-task2-right.png' : '12-B-task2-right.png');
    await fits(page, `${sc.id} task 2 right`);
    // back to task 1: its state and feedback are kept
    await btn(page, 'לשלב הקודם').click();
    s = await st(page);
    check(s.step === 0 && (await feedback(page)) === (i === 0 ? 'right' : 'solution'), `${sc.id}: back to task 1 keeps its answer and feedback`);
    await btn(page, 'לשלב הבא').click();
    check((await feedback(page)) === 'right', `${sc.id}: task 2 still shows its result`);
    await btn(page, 'לשלב הבא').click();

    // ---- task 3
    await noLeak(page, sc, 2, `${sc.id} task 3`);
    await dataVisible(page, sc, 2, `${sc.id} task 3`);
    await page.locator(`${A} [data-ruler-toggle]`).click();
    const cms = await page.locator(`${MAP} [data-ruler-cm]`).count();
    check(cms >= Math.ceil(sc.ground3.cm) + 1, `${sc.id} task 3: the ruler is laid with cm numerals (${cms})`);
    // the ruler reads sheet cm: B's point lies at the right numeral (map geometry, not screen cm)
    const ruler = await page.locator(MAP).evaluate((svg, cm) => {
      const t = [...svg.querySelectorAll('[data-ruler-cm]')].find((e) => Number(e.getAttribute('data-ruler-cm')) === cm);
      const b = svg.querySelector('[data-point="ב"] circle');
      const tb = t.getBBox();
      return Math.hypot(tb.x + tb.width / 2 - Number(b.getAttribute('cx')), tb.y + tb.height / 2 - Number(b.getAttribute('cy')));
    }, sc.ground3.cm);
    check(ruler < 8, `${sc.id} task 3: point ב sits by the ruler's ${sc.ground3.cm} cm mark (${ruler.toFixed(1)} mm)`);
    // no ruler numeral touches another label of the map (a spot height beside a numeral reads as one number)
    const touching = await page.locator(MAP).evaluate((svg) => {
      const box = (e) => e.getBoundingClientRect();
      const hit = (a, b) => a.left < b.right + 2 && b.left < a.right + 2 && a.top < b.bottom + 2 && b.top < a.bottom + 2;
      const nums = [...svg.querySelectorAll('[data-ruler-cm]')].map(box);
      const others = [...svg.querySelectorAll('[data-spot] text, [data-point-disc] text')].map((t) => [t.textContent, box(t)]);
      return others.filter(([, b]) => nums.some((n) => hit(n, b))).map(([t]) => t);
    });
    check(touching.length === 0, `${sc.id} task 3: the ruler's numerals are clear of other labels${touching.length ? ` (touch: ${touching})` : ''}`);
    await noLeak(page, sc, 2, `${sc.id} task 3 with the ruler`);
    if (i === 1) await shot(page, '13-B-task3-ruler.png');
    const tries = [
      [String(sc.ground3.cm), 'map-cm'],
      [String(sc.ground3.metres / 1000), 'units-km'],
      [String(sc.ground3.metres * 10), 'scale'],
      [String(sc.ground3.metres * 100), 'units-cm'],
      [String(Math.round(sc.ground3.metres * 1.5)), 'far'],
    ];
    for (const [k, [val, kind]] of tries.entries()) {
      await page.locator(`${A} [data-distance-input]`).fill(val);
      if (k === 0) check((await feedback(page)) === 'none', `${sc.id} task 3: typing is not checking`);
      await page.locator(`${A} [data-distance-input]`).press('Enter');
      check((await feedback(page)) === kind, `${sc.id} task 3: ${val} → ${kind}`);
      await noLeak(page, sc, 2, `${sc.id} task 3 after ${kind}`);
      if (i === 0 && k === 0) await shot(page, '05-task3-measure-wrong.png');
      await fits(page, `${sc.id} task 3 ${kind}`);
    }
    if (i === 0) {
      const near1 = sc.ground3.metres - sc.ground3.tolerance / 2;
      await page.locator(`${A} [data-distance-input]`).fill(String(near1));
      await btn(page, 'בדיקה').click();
      const t3 = await page.locator(`${A} [data-carto-feedback]`).innerText();
      check((await feedback(page)) === 'right' && t3.includes('כ־') && t3.includes(sc.ground3.metres.toLocaleString('en-US')) && t3.includes('×'), `A task 3: ${near1} accepted as an estimate, "כ־${sc.ground3.metres}" and the working shown`);
      check((await page.locator(`${MAP} [data-map-measured]`).count()) === 1, 'A task 3: the measured line after the check');
      await shot(page, '06-task3-measure-right.png');
      await fits(page, 'A task 3 right');
    } else {
      await btn(page, 'הצגת הפתרון').click();
      check((await feedback(page)) === 'solution', 'B task 3: the solution');
    }
    await btn(page, 'לשלב הבא').click();

    // ---- task 4
    await noLeak(page, sc, 3, `${sc.id} task 4`);
    await dataVisible(page, sc, 3, `${sc.id} task 4`);
    for (const r of sc.readings.filter((x) => x.letter !== sc.locationAnswer)) {
      await choice(page, r.letter).click();
      await btn(page, 'בדיקה').click();
      const kind = await feedback(page);
      const txt = await page.locator(`${A} [data-carto-feedback]`).innerText();
      check(kind !== 'right' && kind !== 'none' && !txt.includes(String(sc.point.E)) && !txt.includes(String(sc.point.N)), `${sc.id} task 4: reading ${r.letter} → ${kind}, without the answer`);
      if (kind === 'hemisphere') check(/חצי הכדור/.test(txt) && /במטרים/.test(txt), `${sc.id} task 4: the hemisphere N vs the northing N is explained`);
      await noLeak(page, sc, 3, `${sc.id} task 4 after ${kind}`);
      if (i === 0 && kind === 'hemisphere') await shot(page, '07-task4-location-wrong.png');
      if (i === 1 && kind === 'swap') await shot(page, '14-B-task4-wrong.png');
      await fits(page, `${sc.id} task 4 ${kind}`);
    }
    await choice(page, sc.locationAnswer).click();
    await btn(page, 'בדיקה').click();
    check((await feedback(page)) === 'right' && (await page.locator(`${MAP} [data-map-read-lines]`).count()) === 1, `${sc.id} task 4: right → reading lines to the frame`);
    const boxed = await page.locator(MAP).evaluate((svg, pt) => {
      const [re, rn] = [...svg.querySelectorAll('[data-map-read-labels] rect')].map((r) => r.getBoundingClientRect());
      const te = svg.querySelector(`[data-frame-e="${pt.E}"]`).getBoundingClientRect();
      const tn = svg.querySelector(`[data-frame-n="${pt.N}"]`).getBoundingClientRect();
      const svgBox = svg.getBoundingClientRect();
      const holds = (o, t) => o.left <= t.left + 0.5 && o.right >= t.right - 0.5 && o.top <= t.top + 0.5 && o.bottom >= t.bottom - 0.5;
      return holds(re, te) && holds(rn, tn) && rn.left >= svgBox.left && tn.left >= svgBox.left;
    }, sc.point);
    check(boxed, `${sc.id} task 4: the highlighted frame labels sit whole inside their boxes and the map`);
    if (i === 0) await shot(page, '08-task4-location-right.png');
    await fits(page, `${sc.id} task 4 right`);
    await btn(page, 'לסיכום').click();

    // ---- summary
    const rows = await page.locator(`${A} [data-summary-row]`).evaluateAll((rs) => Object.fromEntries(rs.map((r) => [r.getAttribute('data-summary-row'), r.getAttribute('data-result')])));
    const want = i === 0 ? { relief: 'hint', slope: 'self', distance: 'self', location: 'self' } : { relief: 'solution', slope: 'hint', distance: 'solution', location: 'self' };
    check(JSON.stringify(rows) === JSON.stringify(want), `${sc.id} summary: ${JSON.stringify(rows)}`);
    const sumText = await cardText(page);
    check(/נפתר עצמאית/.test(sumText) && (i === 0 ? /נעזרתם ברמז/.test(sumText) : /הוצג פתרון/.test(sumText)) && !/ציון|עברתם|שליטה/.test(sumText), `${sc.id} summary: alone / hint / solution, no pass mark`);
    check((await btn(page, 'תרחיש נוסף').count()) === 1 && (await btn(page, 'התחלה מחדש').count()) === 1, `${sc.id} summary: another scenario and restart offered`);
    await shot(page, i === 0 ? '09-summary.png' : '19-summary-B.png');
    await fits(page, `${sc.id} summary`);
    if (i === 0) {
      await btn(page, 'התחלה מחדש').click();
      s = await st(page);
      check(s.scenario === 0 && s.step === 0 && s.tasks.relief.answer === '' && (await feedback(page)) === 'none', 'restart: A again, from task 1, empty');
    } else {
      // a review link opens its sub-topic in the learn tab
      await page.locator(`${A} [data-review-link="relief-cover"]`).click();
      await page.waitForTimeout(1200);
      const learn = await page.locator('#lesson-panel-learn').count();
      const hash = await page.evaluate(() => location.hash);
      const current = await page.locator('nav[aria-label="ניווט תתי-נושא"] button[aria-current="step"]').innerText().catch(() => '');
      check(learn === 1 && hash === '#scene-relief-cover' && current.includes('תבליט ותכסית'), `review link: the learn tab opens "תבליט ותכסית" (${hash}, ${current.trim()})`);
      await shot(page, '20-review-link-learn.png');
    }
    check(errors.length === 0, `console ${sc.id}: no page errors${errors.length ? `: ${errors.slice(0, 3)}` : ''}`);
    await ctx.close();
  }

  // ================================================================ keyboard only (scenario A)
  {
    const { page, errors, ctx } = await open(browser);
    const sc = SC[0];
    const active = () => page.evaluate(() => {
      const e = document.activeElement;
      return { tag: e?.tagName, choice: e?.getAttribute('data-choice'), text: e?.textContent?.trim().slice(0, 30), input: e?.hasAttribute('data-distance-input'), ring: e ? getComputedStyle(e).boxShadow + '|' + getComputedStyle(e).outlineStyle : '' };
    });
    const tabTo = async (pred, label, max = 60) => {
      for (let k = 0; k < max; k++) {
        await page.keyboard.press('Tab');
        const a = await active();
        if (pred(a)) return a;
      }
      fail(`keyboard: could not reach ${label}`);
      return null;
    };
    // start in the card: focus its title region, then tab
    await page.locator(`${A} h2`).evaluate((h) => {
      h.setAttribute('tabindex', '-1');
      h.focus();
    });
    let a = await tabTo((x) => x.choice === sc.reliefAnswer, 'task 1 right choice');
    check(a && (a.ring.includes('rgb') || a.ring.includes('solid')), 'keyboard: a visible focus ring on a choice');
    await page.keyboard.press('Space');
    check((await st(page)).tasks.relief.answer === sc.reliefAnswer, 'keyboard: Space chooses');
    await tabTo((x) => x.text === 'בדיקה', 'the check button');
    await page.keyboard.press('Enter');
    check((await st(page)).tasks.relief.outcome === 'right', 'keyboard: Enter checks');
    a = await active();
    check(a.text?.startsWith('לשלב הבא'), `keyboard: focus stays on the main button, now "לשלב הבא" (${a.text})`);
    await page.keyboard.press('Enter');
    a = await active();
    check(a.tag === 'H3', `keyboard: a new step moves focus to its question (${a.tag} "${a.text}")`);
    await tabTo((x) => x.choice === sc.slopeAnswer, 'task 2 choice');
    await page.keyboard.press('Enter');
    await tabTo((x) => x.text === 'בדיקה', 'check');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // focus is on "לשלב הבא"
    check((await st(page)).step === 2, 'keyboard: task 2 done, on task 3');
    await tabTo((x) => x.text === 'הנחת סרגל', 'the ruler toggle');
    await page.keyboard.press('Enter');
    check((await page.locator(`${MAP} [data-map="ruler"]`).count()) === 1, 'keyboard: the ruler is laid by keys');
    await tabTo((x) => x.input, 'the distance field');
    await page.keyboard.type(String(sc.ground3.metres));
    await page.keyboard.press('Enter');
    check((await st(page)).tasks.distance.outcome === 'right', 'keyboard: typing and Enter check the distance');
    await tabTo((x) => x.text?.startsWith('לשלב הבא'), 'next');
    await page.keyboard.press('Enter');
    await tabTo((x) => x.choice === sc.locationAnswer, 'task 4 reading');
    await page.keyboard.press('Space');
    await tabTo((x) => x.text === 'בדיקה', 'check');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    check((await st(page)).step === 4, 'keyboard: the summary, keys only');
    await tabTo((x) => x.text?.startsWith('תרחיש נוסף'), 'another scenario');
    await page.keyboard.press('Enter');
    check((await st(page)).scenario === 1, 'keyboard: another scenario by keys');
    // back to an earlier step by the progress (keys)
    check(errors.length === 0, `console keyboard: no page errors${errors.length ? `: ${errors.slice(0, 3)}` : ''}`);
    await ctx.close();
  }

  // ================================================================ reduced motion
  {
    const { page, errors, ctx } = await open(browser, { reduced: true });
    const sc = SC[0];
    await choice(page, sc.reliefAnswer).click();
    await btn(page, 'בדיקה').click();
    // Motion = keyframe animations or transitions of position / size / transform. The shared option and button
    // recipes fade colours for 200 ms; that is not motion and stays.
    const motion = await page.locator(A).evaluate((root) =>
      root
        .getAnimations({ subtree: true })
        .filter((x) => x.playState === 'running')
        .filter((x) => !(x instanceof CSSTransition) || !/color|opacity|filter|shadow/.test(x.transitionProperty))
        .map((x) => x.transitionProperty ?? x.animationName ?? 'web-animation'),
    );
    await page.waitForTimeout(600);
    const left = await page.locator(A).evaluate((root) => root.getAnimations({ subtree: true }).filter((x) => x.playState === 'running').length);
    check((await feedback(page)) === 'right' && motion.length === 0 && left === 0, `reduced: the card works, no motion (${motion.join(', ') || 'none'}), colour fades settled (${left} left)`);
    check(errors.length === 0, `console reduced: no page errors${errors.length ? `: ${errors.slice(0, 3)}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\ntallest state: ${tallest.label} (bottom ${Math.round(tallest.bottom)} px)`);
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nALL OK');
process.exit(failures.length ? 1 : 0);
