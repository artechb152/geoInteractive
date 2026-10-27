// Behavioural acceptance tests for lesson 6 „דגשים לתכנון ולניווט”
// (PlanningTipsScene.tsx + NavTipsMap.tsx), task 27.
// Restored to the public lesson on 2026-10-27 at the user's request.
// Needs a running dev server. Run:
//   node --test scripts/qa/planning-tips.test.mjs            (QA_BASE defaults to http://localhost:3000)
//   QA_BASE=http://localhost:3041 node --test scripts/qa/planning-tips.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const VIEW = { width: 1440, height: 1122 };
const M_PER_UNIT = 25; // NavTipsMap scale
const LEGS_M = [500, 550, 600, 500];

let browser;
let page;
const errors = [];

before(async () => {
  browser = await chromium.launch({ channel: 'chrome' });
  page = await browser.newPage({ viewport: VIEW });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // only this page's own errors (other sessions' assets may 404 on a shared server)
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('[data-tips-screen="question"]', { timeout: 120000 });
  await page.waitForTimeout(1500);
});

after(async () => {
  await browser?.close();
});

const screen = (id) => `[data-tips-screen="${id}"]`;

/** Open tip i of a screen and wait until the map shows only that state. */
async function openTip(id, i, focus) {
  await page.locator(`${screen(id)} button[aria-expanded]`).nth(i).click();
  await page.waitForFunction(
    ({ sel, focus }) => {
      const svg = document.querySelector(`${sel} svg[role="img"]`);
      if (svg?.getAttribute('data-focus') !== focus) return false;
      return ['halos', 'marks', 'labels'].every((l) => svg.querySelectorAll(`[data-layer="${l}"]`).length === 1);
    },
    { sel: screen(id), focus },
  );
  await page.waitForTimeout(450); // fades and the panel height animation
}

/** Everything the tests read from one state. */
const readState = (id) =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const svg = root.querySelector('svg[role="img"]');
    const region = root.querySelector('[role="region"]');
    const texts = (layer) => [...svg.querySelectorAll(`[data-layer="${layer}"] text`)].map((t) => t.textContent.trim());
    return {
      focus: svg.getAttribute('data-focus'),
      ariaLabel: svg.getAttribute('aria-label'),
      caption: root.querySelector('[data-tips-caption]').textContent.trim(),
      what: region?.querySelectorAll('p')[0]?.textContent.trim() ?? '',
      why: region?.querySelectorAll('p')[1]?.textContent.trim() ?? '',
      openCount: root.querySelectorAll('button[aria-expanded="true"]').length,
      halos: [...svg.querySelectorAll('[data-halo]')].map((h) => h.getAttribute('data-halo') + (h.hasAttribute('data-expected') ? '?' : '')).sort(),
      labels: texts('labels'),
      marks: texts('marks'),
      tagTones: [...svg.querySelectorAll('[data-layer="marks"] [data-tone]')].map((g) => g.getAttribute('data-tone')),
      markers: Object.fromEntries([...svg.querySelectorAll('[data-marker]')].map((m) => [m.getAttribute('data-marker'), m.getAttribute('data-state')])),
      points: [...svg.querySelectorAll('[data-marker]')].map((m) => ({ id: m.getAttribute('data-marker'), x: +m.getAttribute('data-x'), y: +m.getAttribute('data-y') })),
      walked: [...svg.querySelectorAll('[data-walked]')].map((l) => l.getAttribute('data-walked')),
      ahead: svg.querySelectorAll('[data-ahead]').length,
      planned: svg.querySelectorAll('[data-planned]').length,
      position: (() => {
        const p = svg.querySelector('[data-position]');
        return p ? { id: p.getAttribute('data-position'), x: +p.getAttribute('data-x'), y: +p.getAttribute('data-y') } : null;
      })(),
      legend: [...root.querySelectorAll('[data-tips-legend] li > span')].map((s) => s.textContent.trim()),
      height: Math.round(root.getBoundingClientRect().height),
    };
  }, screen(id));

const PLAN = ['ends', 'route', 'legs', 'checkpoints'];
const NAV = ['verify', 'compare', 'combine', 'mismatch'];
const states = {};

test('every tip: an action, a reason, and a caption that describes the map without repeating the action', async () => {
  for (const [id, foci] of [['plan', PLAN], ['nav', NAV]]) {
    for (let i = 0; i < foci.length; i++) {
      await openTip(id, i, foci[i]);
      const s = await readState(id);
      states[foci[i]] = s;
      assert.equal(s.openCount, 1, `${foci[i]}: one tip open at a time`);
      assert.ok(s.what.length > 30, `${foci[i]}: the action is written`);
      assert.ok(s.why.length > 30, `${foci[i]}: the reason is written`);
      assert.match(s.caption, /^במפה: /, `${foci[i]}: caption describes the map`);
      assert.equal(s.ariaLabel, s.caption, `${foci[i]}: the caption is the map's accessible name`);
      // no sentence of the caption is copied from the action or the reason
      for (const sentence of s.caption.replace(/^במפה: /, '').split('. ').map((x) => x.replace(/\.$/, '')).filter((x) => x.length > 20)) {
        assert.ok(!s.what.includes(sentence) && !s.why.includes(sentence), `${foci[i]}: caption repeats "${sentence}"`);
      }
    }
  }
});

test('each state highlights exactly what its tip describes', () => {
  const expect = {
    ends: { halos: ['end', 'start'], labels: ['מבנה בולט', 'אורנים על קרקע סלעית'], active: ['start', 'end'] },
    route: { halos: ['cp2', 'summit-n'], labels: ['הקו הישיר: מעל הפסגה', 'אוכף'], active: [] },
    legs: { halos: [], labels: [], active: [] },
    checkpoints: { halos: ['cp1', 'cp2', 'cp3'], labels: ['1 · עיקול הנחל', '2 · אוכף', '3 · חציית דרך עפר', 'נ.ס · אורנים על קרקע סלעית'], active: ['1', '2', '3'] },
    verify: { halos: ['cp1'], labels: ['מיקום מזוהה: עיקול הנחל', 'הכיוון לקטע הבא'], active: [] },
    compare: { halos: ['cp2?', 'summit-n', 'summit-s'], labels: ['פסגה', 'פסגה', 'צפוי: אוכף'], active: ['2'] },
    combine: { halos: ['cp2'], labels: ['כיוון', 'סימן: אוכף'], active: [] },
    // the mismatch only: the expected road crossing — the destination is not highlighted
    mismatch: { halos: ['cp3?'], labels: ['צפוי: חציית דרך עפר', 'כ־600 מ׳: דרך העפר לא הופיעה'], active: ['3'] },
  };
  for (const [focus, e] of Object.entries(expect)) {
    const s = states[focus];
    assert.deepEqual(s.halos, e.halos, `${focus}: halos`);
    assert.deepEqual(s.labels, e.labels, `${focus}: map labels`);
    const active = Object.entries(s.markers).filter(([, st]) => st === 'active').map(([k]) => k);
    assert.deepEqual(active.sort(), [...e.active].sort(), `${focus}: markers in focus`);
  }
  assert.deepEqual(states.legs.marks, ['קטע 1', 'כ־500 מ׳', 'קטע 2', 'כ־550 מ׳', 'קטע 3', 'כ־600 מ׳', 'קטע 4', 'כ־500 מ׳'], 'legs: a tag per leg');
  // the three agreeing data in "combine" share one colour (sage = checked and matching)
  assert.deepEqual(states.combine.marks, ['מרחק', 'כ־550 מ׳']);
  assert.deepEqual(states.combine.tagTones, ['sage']);
  assert.equal(states.mismatch.markers.end, 'idle', 'mismatch: destination not in focus');
});

test('start, end, legs, distances and landmark order agree across all states', () => {
  const ref = JSON.stringify(states.ends.points);
  for (const f of [...PLAN, ...NAV]) assert.equal(JSON.stringify(states[f].points), ref, `${f}: same points`);
  const pts = states.ends.points;
  assert.deepEqual(pts.map((p) => p.id), ['start', '1', '2', '3', 'end']);
  for (let k = 0; k < 4; k++) {
    const m = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y) * M_PER_UNIT;
    assert.ok(Math.abs(m - LEGS_M[k]) < LEGS_M[k] * 0.01, `leg ${k + 1}: drawn ${m.toFixed(0)} m, tagged ${LEGS_M[k]} m`);
  }
  assert.ok(states.combine.caption.includes(`כ־${LEGS_M[1]} מ׳`), 'combine quotes leg 2');
  assert.ok(states.mismatch.caption.includes(`כ־${LEGS_M[2]} מ׳`), 'mismatch quotes leg 3');
  const story = states.checkpoints.caption;
  const order = ['עיקול הנחל', 'האוכף', 'דרך העפר', 'האורנים'].map((w) => story.indexOf(w));
  assert.ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), 'route story in order');
  // where the navigator stands, and how far the drift went
  const at = (id) => pts.find((p) => p.id === id);
  assert.deepEqual([states.verify.position.x, states.verify.position.y], [at('1').x, at('1').y], 'verify: at checkpoint 1');
  assert.deepEqual([states.combine.position.x, states.combine.position.y], [at('2').x, at('2').y], 'combine: at the saddle');
  const drift = states.mismatch.position;
  const fromSaddle = Math.hypot(drift.x - at('2').x, drift.y - at('2').y) * M_PER_UNIT;
  assert.ok(Math.abs(fromSaddle - LEGS_M[2]) < 6, `mismatch: walked leg 3's distance (${fromSaddle.toFixed(0)} m)`);
  assert.ok(Math.hypot(drift.x - at('3').x, drift.y - at('3').y) * M_PER_UNIT > 150, 'mismatch: not at the road crossing');
});

test('planned route, walked way and current position are told apart', () => {
  for (const f of PLAN) {
    const s = states[f];
    assert.equal(s.position, null, `${f}: no position before leaving`);
    assert.deepEqual(s.walked, [], `${f}: nothing walked before leaving`);
    assert.equal(s.planned, 4, `${f}: the planned route`);
    assert.deepEqual(s.legend, ['המסלול המתוכנן', 'נקודה לבדיקת המיקום']);
  }
  const walked = { verify: ['leg'], compare: ['leg', 'part'], combine: ['leg', 'leg'], mismatch: ['leg', 'leg', 'drift'] };
  for (const f of NAV) {
    const s = states[f];
    assert.equal(s.position?.id, f, `${f}: current position shown`);
    assert.deepEqual(s.walked, walked[f], `${f}: walked way`);
    assert.equal(s.ahead + s.walked.filter((w) => w === 'leg').length, 4, `${f}: the rest of the plan is dashed`);
    assert.deepEqual(s.legend, ['מיקום נוכחי', 'הדרך שעברתם', 'נקודה מזוהה', 'המשך המסלול המתוכנן']);
    const passed = Object.entries(s.markers).filter(([, st]) => st === 'passed').map(([k]) => k);
    assert.ok(passed.includes('start'), `${f}: the start is verified`);
  }
});

test('no duplicated framing: "אותה מפה", the example note and the old panel labels appear once / not at all', async () => {
  const text = await page.evaluate(() => document.getElementById('scene-tips').innerText);
  assert.equal(text.split('אותה מפה').length - 1, 1, 'navigation board only');
  assert.equal(text.split('דוגמה לימודית').length - 1, 1, 'note only on the planning board');
  for (const label of ['מה עושים', 'למה זה מועיל']) assert.ok(!text.includes(label), `no "${label}" heading`);
});

test('screens keep one height across tips (no jumps) and fit whole at 1440 × 1122', async () => {
  for (const [id, foci] of [['plan', PLAN], ['nav', NAV]]) {
    const heights = foci.map((f) => states[f].height);
    assert.equal(new Set(heights).size, 1, `${id}: heights ${heights.join(', ')}`);
  }
  for (const [id, i, focus] of [['plan', 3, 'checkpoints'], ['nav', 3, 'mismatch']]) {
    await openTip(id, i, focus);
    const r = await fitRect(id);
    // One scale for the whole lesson (LessonFitUniform): the column's width over the 1344px reference.
    assert.ok(Math.abs(Number(r.scale) - r.lessonScale) < 0.001, `${id}: the lesson's scale (${r.scale} vs ${r.lessonScale})`);
    assert.ok(r.top >= 80 && r.bottom <= VIEW.height, `${id}: ${r.top}–${r.bottom} inside the view`);
    assert.equal(r.hScroll, 0, 'no horizontal scroll');
  }
});

async function fitRect(id) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const fit = el.closest('[data-lesson-viewport-fit]') ?? el;
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    scrollTo({ top: Math.max(0, fit.getBoundingClientRect().top + scrollY - headerH - 16), behavior: 'instant' });
  }, screen(id));
  await page.waitForTimeout(150);
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const b = el.getBoundingClientRect();
    return {
      top: Math.round(b.top),
      bottom: Math.round(b.bottom),
      scale: el.closest('[data-lesson-viewport-fit]')?.getAttribute('data-fit-scale'),
      lessonScale: Math.min(1, (el.closest('[data-lesson-viewport-fit]')?.clientWidth ?? 1344) / 1344),
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, screen(id));
}

// ——— the application question ———
const Q = '[data-activity="tips-question"]';
const opt = (id) => page.locator(`${Q} [data-option="${id}"]`);
const feedback = () =>
  page.evaluate((Q) => {
    const fb = document.querySelector(`${Q} [data-tips-feedback]`);
    return fb ? { kind: fb.getAttribute('data-tips-feedback'), text: fb.textContent.trim() } : null;
  }, Q);

test('question: answers do not give the right one away before thinking', async () => {
  const labels = await page.locator(`${Q} [data-option]`).allTextContents();
  assert.equal(labels.length, 4);
  assert.equal(labels.filter((l) => l.startsWith('כן')).length, 2, 'two "yes" answers');
  assert.equal(labels.filter((l) => l.startsWith('לא')).length, 2, 'two "no" answers');
  assert.equal(await feedback(), null, 'no feedback before a choice');
  assert.equal(await page.locator(`${Q} [aria-pressed="true"]`).count(), 0, 'nothing marked before a choice');
});

test('question: a wrong answer explains why, the fix explains the principle, reset clears and keeps focus', async () => {
  await fitRect('question');
  const correctLabel = (await opt('recheck').textContent()).trim();
  for (const wrong of ['looks', 'continue', 'direction']) {
    await opt(wrong).click();
    await page.waitForTimeout(450);
    const fb = await feedback();
    assert.equal(fb?.kind, 'wrong', `${wrong}: marked wrong`);
    assert.ok(fb.text.startsWith('עוד לא.') && fb.text.length > 80, `${wrong}: explained, not just "לא נכון"`);
    assert.ok(!fb.text.includes(correctLabel.replace(/^לא\. /, '')), `${wrong}: does not quote the right answer`);
    assert.equal(await opt(wrong).getAttribute('aria-pressed'), 'true');
    assert.equal((await page.locator(`${Q} [data-tips-reset]`).textContent()).trim(), 'ניסיון נוסף');
  }
  await opt('recheck').click();
  await page.waitForTimeout(450);
  const ok = await feedback();
  assert.equal(ok?.kind, 'correct');
  assert.ok(ok.text.startsWith('נכון.') && /המרחק/.test(ok.text) && /סדר הסימנים/.test(ok.text), 'correct: says what to compare and why');
  assert.equal((await page.locator(`${Q} [data-tips-reset]`).textContent()).trim(), 'התחלה מחדש');
  await page.locator(`${Q} [data-tips-reset]`).click();
  await page.waitForTimeout(450);
  assert.equal(await feedback(), null, 'reset: feedback gone');
  assert.equal(await page.locator(`${Q} [aria-pressed="true"]`).count(), 0, 'reset: nothing marked');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-option')), 'looks', 'reset: focus on the first answer');
});

test('question: switching answers swaps the feedback in place (no collapse)', async () => {
  await opt('looks').click();
  await page.waitForTimeout(450);
  const h0 = await page.evaluate((Q) => document.querySelector(`${Q} [data-tips-feedback]`).getBoundingClientRect().height, Q);
  const samples = await page.evaluate(async (Q) => {
    document.querySelector(`${Q} [data-option="direction"]`).click();
    const out = [];
    for (let t = 0; t < 12; t++) {
      await new Promise((r) => setTimeout(r, 30));
      out.push(document.querySelector(`${Q} [data-tips-feedback]`)?.getBoundingClientRect().height ?? 0);
    }
    return out;
  }, Q);
  assert.ok(Math.min(...samples) > h0 * 0.85, `feedback height stays (${h0.toFixed(0)} → min ${Math.min(...samples).toFixed(0)})`);
  await page.locator(`${Q} [data-tips-reset]`).click();
  await page.waitForTimeout(450);
});

test('question: keyboard only — Tab between answers, Enter and Space choose', async () => {
  await opt('looks').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-option')), 'continue');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  assert.equal((await feedback())?.kind, 'wrong');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.waitForTimeout(450);
  assert.equal((await feedback())?.kind, 'correct');
  assert.equal(await opt('recheck').getAttribute('aria-pressed'), 'true');
  // the question with its tallest feedback still fits under the header
  const r = await fitRect('question');
  assert.ok(r.bottom <= VIEW.height && r.top >= 80, `question ${r.top}–${r.bottom}`);
  await page.locator(`${Q} [data-tips-reset]`).click();
  await page.waitForTimeout(450);
});

test('tip accordion: ↓ ↑ Home End move between tips, Enter opens', async () => {
  const headers = page.locator(`${screen('nav')} button[aria-expanded]`);
  await headers.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  assert.equal(await headers.nth(1).getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await page.waitForTimeout(450);
  assert.equal(await headers.nth(3).getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('ArrowDown'); // wraps to the first
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  assert.equal(await headers.nth(0).getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.querySelector('[data-tips-screen="nav"] svg[role="img"]').getAttribute('data-focus')), 'verify');
});

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
