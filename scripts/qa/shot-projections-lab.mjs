// Screenshots + functional checks of "היטלים: מכדור למפה" (topic-02 #scene-coordinates-2,
// projections/ProjectionsLab.tsx) at 1440 × 1122: the three methods at the start, mid-way and
// at the end — one idea and one action per phase, the map coming in as the surface unrolls, the
// equal circles (with their dashed true size) at the end; the slider's keys and direction; the
// demonstration (play / stop / replay); "מבט התחלתי" appearing only once the view is turned and
// keeping the progress; a method switch keeping the progress (the same moment compared); the
// method tabs by keyboard; the practice — a first miss (where to look, never the answer), back to
// the demonstration and back, a second miss (the answer shown), windows, the summary, repeat.
// Each state logs the card's readout; the card's height is checked to stay one value.
//
// Usage (a dev server serving the page):
//   QA_BASE=http://localhost:3001 node scripts/qa/shot-projections-lab.mjs [outDir]
//   QA_REDUCED=1 …   reduced motion (the demonstration steps through key states)
//   QA_NOGL=1 …      no WebGL (the flat stage)
//   QA_NOIMG=1 …     the globe images fail (Natural Earth land through the same pipeline)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const outDir = process.argv[2] || 'design/screenshots/projections-lab';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const REDUCED = process.env.QA_REDUCED === '1';
const NOGL = process.env.QA_NOGL === '1';
const NOIMG = process.env.QA_NOIMG === '1';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: NOGL ? ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] : [] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
if (NOIMG) await page.route(/geo-globe\/earth-(color|relief)/, (r) => r.abort());
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && /projections|ProjectionStage|ProjectionsLab|THREE|WebGL/.test(`${m.text()} ${m.location()?.url ?? ''}`) && errors.push(m.text()));

await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
const card = page.locator('[data-projections-lab]');
await card.waitFor({ state: 'attached', timeout: 120000 });
async function align() {
  await page.evaluate(() => {
    const h = document.querySelector('[data-screen="projections"] h3');
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 96);
  });
  await page.waitForTimeout(300);
}
await align();
if (!NOGL) await page.waitForSelector('[data-projections-lab][data-ready="true"]', { timeout: 90000 });
await page.waitForSelector('[data-projections-lab][data-earth]:not([data-earth=""])', { timeout: 90000 });
await page.waitForTimeout(900);

let n = 0;
const heights = new Set();
const readout = () =>
  card.evaluate((el) => {
    const d = el.dataset;
    const q = (s) => el.querySelector(s);
    const circles = q('[data-circles]');
    return {
      mode: d.mode, method: d.method, p: d.progress, playing: d.playing, flat: d.flat, earth: d.earth,
      target: d.target, part: d.part, pick: d.pick, checked: d.checked, task: d.task, misses: d.misses, outcome: d.outcome, done: d.done,
      phase: q('[data-slider]')?.dataset.phase ?? '', play: q('[data-play]')?.textContent ?? '',
      explain: q('[data-explain] p')?.textContent ?? '', act: q('[data-act]')?.textContent ?? '',
      feedback: q('[data-feedback]')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
      stageTitle: q('[data-stage-title]')?.textContent ?? '', mapTitle: q('[data-map-title]')?.textContent ?? '',
      mapOpacity: Number(q('[data-map-box]')?.style.opacity || 1).toFixed(2),
      circles: circles ? `${circles.querySelectorAll('[data-circle]').length}@${Number(circles.style.opacity).toFixed(2)}` : '',
      truths: el.querySelectorAll('[data-truth]').length,
      window: q('[data-map]')?.dataset.window ?? '',
      resetView: !!q('[data-reset-view]'),
      answerMark: [...el.querySelectorAll('[data-option]')].filter((b) => /התשובה/.test(b.getAttribute('aria-label') ?? '')).map((b) => b.dataset.option).join(''),
      cta: q('[data-enter-practice]')?.textContent ?? '',
      h: Math.round(el.getBoundingClientRect().height),
    };
  });
async function shot(name, wait = REDUCED ? 300 : 1100) {
  n += 1;
  const id = String(n).padStart(2, '0');
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${outDir}/${id}-${name}.png` });
  await card.screenshot({ path: `${outDir}/${id}-${name}-card.png` });
  const r = await readout();
  heights.add(r.h);
  console.log(id, name, JSON.stringify(r));
  return r;
}
const slider = card.locator('[data-progress-input]');
const progress = async () => Number(await card.getAttribute('data-progress'));
const key = async (k, times = 1) => {
  await slider.focus();
  for (let i = 0; i < times; i++) await page.keyboard.press(k);
};
const btn = (sel) => card.locator(sel);
const STEP_CYL_START = 'הגליל עוטף את הכדור ונוגע בו לאורך קו המשווה. גררו את המחוון כדי לפרוס אותו.';
const STEP_CYL_END = 'על הגליל כל קו רוחב ארוך כמו קו המשווה, ולכן במפה העיגולים נמתחים לצדדים ככל שמתרחקים ממנו. עברו לשיטה אחרת והשוו את העיגולים.';

/* ── cylindrical ── */
let r = await shot('cyl-open');
assert.equal(r.method, 'cyl');
assert.equal(r.p, '0.000');
assert.equal(r.playing, 'false', 'no autoplay');
assert.equal(r.explain, STEP_CYL_START, 'one idea and one action');
assert.equal(r.act, 'גררו את המחוון כדי לפרוס אותו.');
assert.ok(Number(r.mapOpacity) < 0.35, `the map is a faint preview before the unrolling: ${r.mapOpacity}`);
assert.equal(r.circles, '', 'no circles on the map before the surface opens');
assert.equal(r.resetView, false, 'no "מבט התחלתי" before the view is turned');
assert.equal(await card.locator('[data-slider] + p, [data-phase]:not([data-slider])').count(), 0, 'no phase line under the slider');
// the slider: 0 at the right ("עטיפה"), ← advances toward "מפה שטוחה" at the left
const ends = await card.evaluate((el) => [...el.querySelectorAll('[data-end]')].map((e) => ({ t: e.textContent, x: Math.round(e.getBoundingClientRect().x) })));
assert.ok(ends[0].t === 'עטיפה' && ends[1].t === 'מפה שטוחה' && ends[0].x > ends[1].x, `"עטיפה" right of "מפה שטוחה": ${JSON.stringify(ends)}`);
const thumbX = () => slider.evaluate((el) => { const b = el.getBoundingClientRect(); const v = Number(el.value) / Number(el.max); return Math.round(b.right - 11 - v * (b.width - 22)); });
const x0 = await thumbX();
await key('ArrowLeft', 5);
assert.equal(await progress(), 0.25, '← ×5 = 25 %');
assert.ok((await thumbX()) < x0, 'the thumb moved left');
await key('ArrowRight');
assert.equal(await progress(), 0.2, '→ goes back');
await key('Home');
assert.equal(await progress(), 0);
await key('PageUp', 2);
await key('ArrowLeft');
r = await shot('cyl-mid');
assert.equal(r.phase, 'mid');
assert.match(r.explain, /בלי להימתח\. העיוות נוצר כשמעבירים אליו את הכדור, לא בפריסה\. המשיכו עד למפה השטוחה\.$/);
assert.ok(Number(r.mapOpacity) > 0.5 && Number(r.mapOpacity) < 1, `the map is coming in: ${r.mapOpacity}`);
await key('End');
r = await shot('cyl-flat');
assert.equal(r.p, '1.000');
assert.equal(r.phase, 'end');
assert.equal(r.explain, STEP_CYL_END);
assert.equal(r.mapOpacity, '1.00');
assert.equal(r.circles, '3@1.00', 'the three equal circles on the map');
assert.equal(r.truths, 3, 'cylinder: every circle is stretched past its dashed true size');
assert.equal(r.play.trim(), 'הדגמה חוזרת');

// the demonstration: from the start, stopped part-way, resumed from there, to the end
await key('Home');
await btn('[data-play]').click();
await page.waitForTimeout(REDUCED ? 900 : 1500);
r = await readout();
assert.equal(r.playing, 'true');
assert.equal(r.play.trim(), 'עצירת ההדגמה');
await btn('[data-play]').click();
const stopped = await progress();
assert.ok(stopped > 0 && stopped < 1, `stopped mid-way at ${stopped}`);
await page.waitForTimeout(600);
assert.equal(await progress(), stopped, 'stays where it stopped');
r = await shot('cyl-demo-stopped');
assert.equal(r.playing, 'false');
await btn('[data-play]').click();
// ≈ 4 s left of 5 — polled, so a loaded machine does not fail it
await page.waitForFunction(() => {
  const d = document.querySelector('[data-projections-lab]')?.dataset;
  return d?.progress === '1.000' && d?.playing === 'false';
}, null, { timeout: 10000 });
assert.equal(await progress(), 1, 'the demonstration reaches the end');
assert.equal((await readout()).playing, 'false');
// the slider stops a running demonstration
await key('Home');
await btn('[data-play]').click();
await page.waitForTimeout(REDUCED ? 300 : 700);
await key('ArrowLeft');
assert.equal((await readout()).playing, 'false', 'the slider takes the demonstration over');

// the initial view: offered only once the view is turned; it turns back and keeps the progress
const before = await progress();
if (!NOGL) {
  const box = await card.locator('[data-3d]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  r = await shot('cyl-turned');
  assert.equal(r.resetView, true, '"מבט התחלתי" appears once the view is turned');
  await btn('[data-reset-view]').click();
  r = await shot('cyl-initial-view');
  assert.equal(r.resetView, false, 'and goes once the view is back');
  assert.equal(await progress(), before, '"מבט התחלתי" keeps the progress');
}

/* ── a method switch keeps the progress: the same moment, compared ── */
await key('End');
await card.locator('[data-tab="cone"]').click();
r = await shot('cone-compare-flat');
assert.equal(r.method, 'cone');
assert.equal(r.p, '1.000', 'switching methods keeps the progress');
assert.equal(r.circles, '3@1.00');
assert.equal(r.truths, 2, 'cone: the circle on the line of contact stays true');
await card.locator('[data-tab="az"]').click();
r = await shot('az-compare-flat');
assert.equal(r.p, '1.000');
assert.equal(r.truths, 2, 'plane: the circle near the pole stays true');

/* ── conic and azimuthal through their own process ── */
for (const m of ['cone', 'az']) {
  await card.locator(`[data-tab="${m}"]`).click();
  await key('Home');
  r = await shot(`${m}-open`);
  assert.equal(r.method, m);
  assert.equal(r.p, '0.000');
  await key('PageUp', 2);
  r = await shot(`${m}-mid`);
  await key('End');
  r = await shot(`${m}-end`);
}
assert.equal(r.phase, 'end');
assert.equal(r.explain, 'ליד הקוטב העיגול כמעט אינו משתנה. ככל שמתרחקים מנקודת המגע, העיגולים נמתחים. עברו לשיטה אחרת והשוו את העיגולים.');
// tabs by keyboard: in RTL, ← is the next tab
await card.locator('[data-tab="az"]').focus();
await page.keyboard.press('ArrowRight');
assert.equal((await readout()).method, 'cone', '→ from "אזימוטלי" is "חרוטי"');
await page.keyboard.press('Home');
assert.equal((await readout()).method, 'cyl');
await page.keyboard.press('ArrowLeft');
assert.equal((await readout()).method, 'cone');
await page.keyboard.press('Enter');
await key('Home');
await key('PageUp');
await card.locator('[data-tab="cone"]').focus();
r = await shot('keyboard-focus', 400);

/* ── practice ── */
await btn('[data-enter-practice]').click();
r = await shot('practice-open');
assert.equal(r.mode, 'practice');
assert.equal(r.target, 'cone', 'the first task is conic');
assert.equal(r.part, 'false', 'the first task shows a whole map');
assert.equal(r.checked, '');
assert.equal(r.stageTitle, 'כדור הארץ', 'no surface before a check');
assert.equal(await card.locator('[data-practice-head] [data-task-label]').textContent(), 'משימה 1 מתוך 4');
assert.equal(r.mapTitle, 'מפת היעד');
assert.equal(r.circles, '', 'no circles on a target map');
assert.equal(await card.locator('[data-hint]').count(), 0, 'no separate hint button');
assert.ok(await btn('[data-check]').isDisabled(), 'no check without a choice');
await btn('[data-option="cyl"]').click();
r = await shot('practice-picked', 500);
assert.equal(r.pick, 'cyl');
assert.equal(r.checked, '', 'a choice is not checked on its own');
await btn('[data-check]').click();
r = await shot('practice-first-miss', REDUCED ? 500 : 3900);
assert.equal(r.checked, 'cyl');
assert.equal(r.misses, '1');
assert.equal(r.feedback, 'גליל נפרש למלבן, וקווי הרוחב בו ישרים. התבוננו בקווי הרוחב במפת היעד: האם הם ישרים, קשתות או מעגלים שלמים?');
assert.ok(!/חרוט/.test(r.feedback), 'the first miss does not name the answer');
assert.equal(r.stageTitle, 'המשטח שבחרתם: גליל');
assert.equal(r.answerMark, '', 'no answer marked after one miss');
// back to the demonstration and back: the task and the attempt are kept
await btn('[data-back]').click();
r = await readout();
assert.equal(r.mode, 'learn');
assert.equal(r.cta.trim(), 'חזרה לתרגול');
await btn('[data-enter-practice]').click();
r = await readout();
assert.equal(r.checked, 'cyl', 'the attempt was kept');
await btn('[data-option="az"]').click();
r = await readout();
assert.equal(r.checked, '', 'another choice clears the old check');
assert.match(r.feedback, /^התבוננו בקווי הרוחב/, 'the cue stays while choosing again');
await btn('[data-check]').click();
r = await shot('practice-answer-shown', REDUCED ? 500 : 3900);
assert.equal(r.outcome, 's---');
assert.equal(r.stageTitle, 'התשובה: חרוט', 'the answer surface unrolls on the globe');
assert.match(r.feedback, /^התשובה: חרוט\./);
assert.equal(r.answerMark, 'cone');
assert.ok(await btn('[data-next]').isEnabled());
await btn('[data-next]').click();
r = await shot('practice-window-az');
assert.equal(r.target, 'az');
assert.equal(r.part, 'true');
assert.equal(r.window, 'part');
assert.equal(r.mapTitle, 'מפת היעד (קטע)');
await btn('[data-option="az"]').click();
await btn('[data-check]').click();
r = await shot('practice-window-az-right', REDUCED ? 500 : 3900);
assert.equal(r.outcome, 'sr--');
assert.match(r.feedback, /^נכון\./);
await btn('[data-next]').click();
r = await shot('practice-window-cyl', 600);
assert.equal(r.target, 'cyl');
await btn('[data-option="cyl"]').click();
await btn('[data-check]').click();
await page.waitForTimeout(REDUCED ? 300 : 800);
await btn('[data-next]').click();
r = await shot('practice-window-cone', 600);
assert.equal(r.target, 'cone', 'the repeated method');
await btn('[data-option="cone"]').click();
await btn('[data-check]').click();
await page.waitForTimeout(REDUCED ? 300 : 1000);
assert.equal((await readout()).done, 'false', 'no automatic move to the summary');
await btn('[data-finish]').click();
r = await shot('practice-summary');
assert.equal(r.done, 'true');
assert.equal(await card.locator('[data-summary-near]').count(), 3);
// back to learning keeps the summary; repeat resets only the practice
await btn('button:has-text("חזרה ללמידה")').click();
r = await readout();
assert.equal(r.mode, 'learn');
assert.equal(r.cta.trim(), 'סיכום התרגול');
await btn('[data-enter-practice]').click();
assert.equal((await readout()).done, 'true');
await btn('button:has-text("תרגול חוזר")').click();
r = await shot('practice-repeat');
assert.equal(r.done, 'false');
assert.equal(r.task, '0');
assert.equal(r.target, 'az', 'the repeat takes the next round');

console.log('card heights:', [...heights].join(', '));
assert.equal(heights.size, 1, `the card keeps one height: ${[...heights]}`);
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
if (errors.length) process.exitCode = 1;
