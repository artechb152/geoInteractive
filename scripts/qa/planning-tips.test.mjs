// Behavioural acceptance tests for lesson 6 „דגשים לתכנון ולניווט”
// (PlanningTipsScene.tsx), task 27. Screen 2 („במהלך הניווט”) became the
// navigation replay on 2026-10-29 — its own tests are scripts/qa/navigation-replay*.test.mjs;
// here only its place in the scene is checked.
// Restored to the public lesson on 2026-10-27 at the user's request.
// 2026-10-29: screen 1 („לפני שיוצאים”) became the open planning lab — its own tests are
// scripts/qa/planning-lab*.test.mjs. Both tips accordions are gone, so these tests keep the
// scene's frame (which activity sits on each screen), the shared fit and the question.
// Needs a running dev server. Run:
//   node --test scripts/qa/planning-tips.test.mjs            (QA_BASE defaults to http://localhost:3000)
//   QA_BASE=http://localhost:3041 node --test scripts/qa/planning-tips.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const VIEW = { width: 1440, height: 1122 };

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

test('no duplicated framing: the example note once, the old panel labels not at all; screen 2 is the replay', async () => {
  const text = await page.evaluate(() => document.getElementById('scene-tips').innerText);
  assert.equal(text.split('במהלך הניווט: מה צריך לבדוק?').length - 1, 1, 'screen 2 keeps its title');
  assert.equal(await page.locator('[data-tips-screen="nav"] [data-activity="navigation-replay"]').count(), 1, 'screen 2 is the replay');
  assert.equal(text.split('דוגמה לימודית').length - 1, 1, 'note only on the planning lab');
  assert.equal(await page.locator('[data-tips-screen="plan"] [data-activity="planning-lab"]').count(), 1, 'screen 1 is the planning lab');
  for (const label of ['מה עושים', 'למה זה מועיל']) assert.ok(!text.includes(label), `no "${label}" heading`);
});

test('the planning screen fits whole at 1440 × 1122, at the lesson\'s scale', async () => {
  for (const id of ['plan']) {
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

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
