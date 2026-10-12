// Browser QA for the base-60 decomposition (#scene-coordinates-2 → "חלוקה ב־60: אותה נקודה, כמה
// דרכי כתיבה", design/mockups/base60-concepts-2026-10-12/02-number-workbench.png + claude-code-handoff.txt).
//
// Usage (a dev server for the lesson):
//   QA_BASE=http://localhost:3000 node scripts/qa/shot-base60-workbench.mjs [outDir]
//
// Renders the lesson route at 1440 × 1122 with the block's title under the site header and checks,
// exit code 1 on any failure:
//   guided      opening shows only the source; each "הצעד הבא" adds its nodes to the track and
//               completes its card; DM opens after the minutes, DMS and S after the seconds
//   writings    D / DM / DMS / S show the one point, each with its note; closed writings refuse
//   practice    a check judges the attempt; each mistake gets its own explanation; hints step up
//               and never fill the answer; a comma is a decimal separator; Enter checks
//   transfer    the latitude after the longitude, then the closing question
//   back/reset  one step back closes what that step opened; reset returns to the opening;
//               switching axes keeps each axis's progress
//   layout      track nodes never overlap; the equation's operation sits left of its field;
//               readable text sizes; nothing clipped by the card
//   keyboard    RTL arrows in the axis switch, LTR in the writings; focus moves with the step
//   motion      reduced motion lands at once
//   console     no page errors
// Writes per-state screenshots of the screen and of the card.
import { chromium } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';

const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates-2`;
const outDir = process.argv[2] || 'design/screenshots/base60-workbench';
const W = 1440;
const H = 1122;
const TITLE = 'חלוקה ב־60: אותה נקודה, כמה דרכי כתיבה';
const T = {
  success: 'נכון — 35 מעלות, 7 דקות ו־24.24 שניות מתארות את אותו ערך.',
  successLat: 'נכון — 33 מעלות, 34 דקות ו־4.08 שניות מתארות את אותו ערך.',
  pickAll: '35.1234 כולל גם את שבר המעלה. שומרים רק את המעלות השלמות, המספר שלפני הנקודה.',
  div: 'כדי לעבור ליחידה קטנה יותר כופלים ב־60. נסו שוב עם שבר המעלה.',
  whole: '35 המעלות נשמרות. כופלים רק את 0.1234.',
  rounded: 'התוצאה קרובה, אבל עוגלה. כתבו את כל הספרות שמתקבלות מהכפל, בלי לעגל.',
  hint3: 'חישוב בחלקים: 0.1 × 60 = 6, וגם 0.0234 × 60 = 1.404. חברו את שתי התוצאות.',
  rule: 'החלק השלם נשמר. רק השבר עובר ליחידה הבאה.',
  noteS: 'S — הכול בשניות: 35 × 3600 + 7 × 60 + 24.24 = 126444.24″',
  noteD: 'D — הכול במעלות: 35 + 7/60 + 24.24/3600 = 35.1234°',
};
await mkdir(outDir, { recursive: true });
for (const f of await readdir(outDir)) if (/^\d{2}-.*\.png$/.test(f)) await unlink(`${outDir}/${f}`);

const failures = [];
const expect = (cond, m) => cond || failures.push(m);
const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // another block's missing resource (other work in progress on the page) is not this activity's error
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const title = page.locator('h3', { hasText: TITLE });
  await title.waitFor({ timeout: 180000 });
  await title.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96));
  await page.waitForTimeout(500);
  const root = page.locator('[data-base60]');
  return {
    page, ctx, errors, root,
    card: root.locator('.surface-elevated'),
    btn: (name) => root.getByRole('button', { name, exact: true }),
    radio: (name) => root.getByRole('radio', { name, exact: true }),
    node: (id) => root.locator(`[data-node="${id}"]`),
    stepCard: (k) => root.locator(`li[data-step="${k}"]`),
    coord: root.locator('[data-coordinate]'),
    note: root.locator('[data-track-note]'),
    feedback: root.locator('[data-feedback]'),
    live: root.locator('p[aria-live="polite"]'),
    answer: (k) => root.locator(`[data-focus="answer-${k}"]`),
  };
}

const text = async (loc) => ((await loc.count()) ? (await loc.first().innerText()).replace(/\s+/g, ' ').trim() : '');
const settle = (ui) => ui.page.waitForTimeout(650);
const shot = async (ui, name) => {
  await settle(ui);
  await ui.page.screenshot({ path: `${outDir}/${name}.png` });
  await ui.card.screenshot({ path: `${outDir}/${name}-card.png` });
};
const nodes = async (ui) => ui.root.locator('[data-node]').evaluateAll((els) => els.map((e) => e.getAttribute('data-node')));

/** Track nodes (with their captions) and the equation's text never overlap; text stays inside the track. */
async function layout(ui, state) {
  const boxes = await ui.root.locator('[data-track] [data-node], [data-track] input, [data-track] [data-eq-part]').evaluateAll((els) =>
    els.map((e) => {
      const r = (e.closest('.absolute') ?? e).getBoundingClientRect();
      const id = e.getAttribute('data-node') ?? (e.tagName === 'INPUT' ? 'input' : `"${e.textContent.trim()}"`);
      return { id, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom };
    }),
  );
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1;
      expect(!overlap, `${state}: ${a.id} overlaps ${b.id}`);
    }
  const track = await ui.root.locator('[data-track]').boundingBox();
  const spans = await ui.root.locator('[data-track] span, [data-track] p').evaluateAll((els) =>
    els.filter((e) => e.textContent.trim()).map((e) => {
      const r = e.getBoundingClientRect();
      return { t: e.textContent.trim(), x0: r.left, x1: r.right, size: parseFloat(getComputedStyle(e).fontSize) };
    }),
  );
  for (const s of spans) {
    expect(s.x0 >= track.x - 1 && s.x1 <= track.x + track.width + 1, `${state}: "${s.t}" leaves the track`);
    expect(s.size >= 16, `${state}: "${s.t}" is ${s.size}px`);
  }
}

// ──────────────────────────── guided example ────────────────────────────
{
  const ui = await open();
  expect((await nodes(ui)).join() === 'src', `opening shows only the source (${await nodes(ui)})`);
  expect((await ui.stepCard(1).getAttribute('data-state')) === 'active', 'opening: step 1 active');
  expect((await text(ui.stepCard(1))).includes('איזה חלק שומרים כמעלות שלמות?'), 'opening asks which part stays');
  expect((await text(ui.coord)) === '35.1234°', `opening coordinate (${await text(ui.coord)})`);
  expect((await ui.radio('DM').getAttribute('aria-disabled')) === 'true', 'DM closed at the opening');
  expect((await ui.btn('חזור צעד').getAttribute('aria-disabled')) === 'true', 'back is off at the opening');
  expect((await text(ui.note)) === T.rule, 'the rule under the track');
  await ui.radio('DMS').click({ force: true });
  expect((await text(ui.coord)) === '35.1234°', 'a closed writing refuses');
  await shot(ui, '01-opening');

  await ui.btn('הצעד הבא').click();
  await settle(ui);
  expect((await nodes(ui)).join() === 'src,deg,degFrac', `step 1 splits (${await nodes(ui)})`);
  expect((await ui.stepCard(1).getAttribute('data-state')) === 'done', 'step 1 done');
  expect((await text(ui.stepCard(1))).includes('35.1234° → 35°'), 'step 1 card shows its arithmetic');
  expect((await ui.node('degFrac').getAttribute('data-tone')) === 'active', 'the degree fraction is the work');
  expect(await ui.page.evaluate(() => document.activeElement?.textContent?.includes('הצעד הבא')), 'focus on the next step’s button');
  await shot(ui, '02-guided-step1');

  await ui.btn('הצעד הבא').click();
  await settle(ui);
  expect((await nodes(ui)).join() === 'src,deg,degFrac,minAll,min,minFrac', `step 2 → minutes, then the split (${await nodes(ui)})`);
  expect((await text(ui.coord)) === '35°07.404′', 'DM shown after the minutes');
  expect((await text(ui.stepCard(2))).includes('0.1234 × 60 = 7.404′'), 'step 2 arithmetic');
  expect((await text(ui.root.locator('[data-track]'))).includes('דקות'), 'the minutes are captioned "דקות"');
  await shot(ui, '03-guided-step2');

  await ui.btn('הצעד הבא').click();
  await settle(ui);
  expect((await nodes(ui)).includes('finSec') && (await nodes(ui)).includes('sec'), 'step 3 → seconds and the writing');
  expect((await text(ui.coord)) === '35°07′24.24″', 'DMS shown after the seconds');
  expect((await ui.root.locator('[data-summary="guided"]').count()) === 1, 'guided summary');
  expect(await ui.page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'summary'), 'focus on the summary');
  await layout(ui, 'guided-done');
  await shot(ui, '04-guided-done');

  for (const [f, v] of [['D', '35.1234°'], ['DM', '35°07.404′'], ['S', '126444.24″'], ['DMS', '35°07′24.24″']]) {
    await ui.radio(f).click();
    expect((await text(ui.coord)) === v, `${f} → ${v} (${await text(ui.coord)})`);
    if (f === 'S') {
      expect((await text(ui.note)) === T.noteS, `S note (${await text(ui.note)})`);
      expect((await ui.node('finSec').getAttribute('data-tone')) === 'chosen', 'S marks the writing’s nodes');
      await shot(ui, '05-format-S');
    }
    if (f === 'D') expect((await text(ui.note)) === T.noteD, `D note shows the inverse (${await text(ui.note)})`);
  }

  // back closes what the step opened
  await ui.radio('S').click();
  await ui.btn('חזור צעד').click();
  await settle(ui);
  expect((await text(ui.coord)) === '35°07.404′' && !(await nodes(ui)).includes('finSec'), 'back from the end: DM, no writing row');
  await ui.btn('הצעד הבא').click();
  await settle(ui);

  // the learner's turn
  await ui.btn('השלימו בעצמכם').click();
  await settle(ui);
  expect((await ui.card.getAttribute('data-mode')) === 'practice' && (await nodes(ui)).join() === 'src', 'practice starts from the source');
  expect(await ui.page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'step-1'), 'focus on step 1');

  await ui.radio('35.1234').click();
  await ui.btn('בדיקת תשובה').click();
  expect((await text(ui.feedback)) === T.pickAll, `pick all → its reason (${await text(ui.feedback)})`);
  expect((await ui.stepCard(1).getAttribute('data-state')) === 'active', 'a wrong pick keeps the step');
  await shot(ui, '06-practice-step1-wrong');
  await ui.radio('35').click();
  await ui.btn('בדיקת תשובה').click();
  await settle(ui);
  expect((await ui.stepCard(1).getAttribute('data-state')) === 'done', 'right pick completes step 1');

  // hints: highlight → rule → worked calculation; the field stays empty
  for (let i = 0; i < 3; i++) await ui.root.getByRole('button', { name: /^רמז/ }).click();
  expect((await text(ui.feedback)).includes(T.hint3), `third hint (${await text(ui.feedback)})`);
  expect((await ui.root.getByRole('button', { name: /^רמז/ }).getAttribute('aria-disabled')) === 'true', 'no hint past the last');
  expect((await ui.answer(2).inputValue()) === '', 'a hint never fills the answer');
  expect((await ui.node('degFrac').evaluate((e) => e.className)).includes('ring-4'), 'the hint marks the fraction');
  await shot(ui, '07-practice-step2-hint');

  await ui.radio('÷ 60').click();
  expect(await ui.page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'answer-2'), 'choosing the operation leads to the field');
  await ui.page.keyboard.type('7.404');
  await ui.btn('בדיקת תשובה').click();
  expect((await text(ui.feedback)) === T.div, `÷60 → its reason (${await text(ui.feedback)})`);
  await ui.radio('× 60').click();
  await ui.answer(2).fill('2107.404');
  await ui.answer(2).press('Enter');
  expect((await text(ui.feedback)) === T.whole, `whole number converted → its reason (${await text(ui.feedback)})`);
  await ui.answer(2).fill('7.4');
  await ui.answer(2).press('Enter');
  expect((await text(ui.feedback)) === T.rounded, `rounded → its reason (${await text(ui.feedback)})`);
  await layout(ui, 'practice-step2');
  await shot(ui, '08-practice-step2-wrong');
  await ui.answer(2).fill('7,404');
  await ui.answer(2).press('Enter');
  await settle(ui);
  expect((await ui.stepCard(2).getAttribute('data-state')) === 'done', 'a comma is a decimal separator');
  expect(await ui.page.evaluate(() => document.activeElement?.getAttribute('data-focus') === 'step-3'), 'focus on step 3');

  // the mockup's state: steps 1–2 done, the seconds entered, not yet checked
  await ui.radio('× 60').click();
  await ui.page.keyboard.type('24.24');
  expect((await ui.answer(3).inputValue()) === '24.24', `the seconds go into step 3’s field (${await ui.answer(3).inputValue()})`);
  const eq = await ui.answer(3).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const lhs = el.parentElement.querySelector('span').getBoundingClientRect();
    return { lhsRight: lhs.right, boxLeft: box.left };
  });
  expect(eq.lhsRight <= eq.boxLeft + 1, 'the operation sits left of its field');
  await layout(ui, 'practice-step3');
  await shot(ui, '09-mockup-state');

  await ui.btn('בדיקת תשובה').click();
  await settle(ui);
  expect((await text(ui.root.locator('[data-summary="practice"]'))).includes(T.success), 'the handoff’s success line');
  expect((await text(ui.live)).startsWith('נכון.'), 'the verdict is announced');
  await shot(ui, '10-practice-done');

  // transfer: the latitude
  await ui.btn('משימה נוספת: קו רוחב').click();
  await settle(ui);
  expect((await ui.card.getAttribute('data-axis')) === 'lat' && (await text(ui.coord)) === '33.5678°', 'latitude opens at its source');
  await ui.radio('33').click();
  await ui.btn('בדיקת תשובה').click();
  await ui.radio('× 60').click();
  await ui.page.keyboard.type('34.068');
  await ui.page.keyboard.press('Enter');
  await settle(ui);
  await ui.radio('× 60').click();
  await ui.page.keyboard.type('4,08');
  await ui.page.keyboard.press('Enter');
  await settle(ui);
  expect((await text(ui.coord)) === '33°34′04.08″', `latitude DMS (${await text(ui.coord)})`);
  expect((await text(ui.root.locator('[data-summary="practice"]'))).includes(T.successLat), 'latitude success line');
  await ui.radio('S').click();
  expect((await text(ui.coord)) === '120844.08″', 'latitude S');
  await ui.radio('המרה לשניות').click();
  expect((await text(ui.feedback.last())).includes('דקה אחת היא 60 שניות'), 'the closing question answers');
  await layout(ui, 'lat-done');
  await shot(ui, '11-lat-done');

  // switching back keeps the longitude's progress
  await ui.radio('קו אורך').click();
  expect((await ui.card.getAttribute('data-done')) === '3' && (await ui.card.getAttribute('data-mode')) === 'practice', 'longitude kept its progress');
  await ui.btn('איפוס').click();
  await settle(ui);
  expect((await ui.card.getAttribute('data-mode')) === 'guided' && (await nodes(ui)).join() === 'src', 'reset returns to the guided opening');

  expect(ui.errors.length === 0, `console: ${ui.errors.join(' | ')}`);
  await ui.ctx.close();
}

// ──────────────────────────── keyboard ────────────────────────────
{
  const ui = await open();
  await ui.radio('קו אורך').focus();
  await ui.page.keyboard.press('ArrowLeft'); // RTL: ← is the next option
  expect((await ui.card.getAttribute('data-axis')) === 'lat', 'ArrowLeft moves to קו רוחב');
  await ui.page.keyboard.press('ArrowRight');
  expect((await ui.card.getAttribute('data-axis')) === 'lon', 'ArrowRight back to קו אורך');
  await ui.btn('הצעד הבא').focus();
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.press('Enter');
  await settle(ui);
  expect((await ui.card.getAttribute('data-done')) === '2', 'Enter twice runs two steps (focus follows the button)');
  await ui.radio('DM').focus();
  await ui.page.keyboard.press('ArrowLeft'); // the writings are LTR: ← goes back to D
  expect((await text(ui.coord)) === '35.1234°', 'ArrowLeft in the writings → D');
  const ring = await ui.page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  expect(ring && ring !== 'none', 'focus is visible');
  await shot(ui, '12-keyboard');
  await ui.ctx.close();
}

// ──────────────────────────── reduced motion ────────────────────────────
{
  const ui = await open({ reducedMotion: 'reduce' });
  await ui.btn('הצעד הבא').click();
  await ui.page.waitForTimeout(60);
  const op = await ui.node('deg').evaluate((e) => getComputedStyle(e.closest('.absolute')).opacity);
  expect(op === '1', `reduced motion lands at once (opacity ${op})`);
  await ui.ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`✗ ${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ base-60 workbench: all checks passed. Screenshots in ${outDir}`);
