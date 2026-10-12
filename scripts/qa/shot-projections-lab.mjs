// Screenshots + functional checks of "היטלים: מכדור למפה" (topic-02 #scene-coordinates-2,
// projections/ProjectionsLab.tsx) at 1440 × 1122: the three methods at the start, mid-way and
// at the end; the slider's keys and direction; the demonstration (play / stop / replay); the
// initial view keeping the progress; the method tabs by keyboard; the practice — a miss, the
// hint, back to the demonstration and back, the corrections, the summary, repeat. Each state
// logs the card's readout; the card's height is checked to stay one value.
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
    return {
      mode: d.mode, method: d.method, p: d.progress, playing: d.playing, flat: d.flat, earth: d.earth,
      target: d.target, pick: d.pick, checked: d.checked, task: d.task, solved: d.solved, done: d.done,
      phase: q('[data-phase]')?.textContent ?? '', play: q('[data-play]')?.textContent ?? '',
      explain: q('[data-explain] p')?.textContent ?? '', feedback: q('[data-feedback]')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
      stageTitle: q('[data-stage-title]')?.textContent ?? '', mapTitle: q('[data-map-title]')?.textContent ?? '',
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

/* ── cylindrical ── */
let r = await shot('cyl-open');
assert.equal(r.method, 'cyl');
assert.equal(r.p, '0.000');
assert.equal(r.playing, 'false', 'no autoplay');
assert.match(r.explain, /הזיזו את המחוון או הפעילו את ההדגמה כדי לפתוח את המשטח/);
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
assert.equal(r.phase, 'פתיחת המשטח');
await key('End');
r = await shot('cyl-flat');
assert.equal(r.p, '1.000');
assert.equal(r.phase, 'מפה שטוחה');
assert.equal(r.explain, 'גליל נפתח למלבן. בדוגמה הזו מתקבלת רשת של קווים ישרים.');
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

// the initial view: a drag turns the view; "מבט התחלתי" turns it back and keeps the progress
const before = await progress();
if (!NOGL) {
  const box = await card.locator('[data-3d]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await shot('cyl-turned');
}
await btn('button:has-text("מבט התחלתי")').click();
await shot('cyl-initial-view');
assert.equal(await progress(), before, '"מבט התחלתי" keeps the progress');

/* ── conic and azimuthal ── */
for (const m of ['cone', 'az']) {
  await card.locator(`[data-tab="${m}"]`).click();
  r = await shot(`${m}-open`);
  assert.equal(r.method, m);
  assert.equal(r.p, '0.000', 'a new method starts its own process');
  await key('PageUp', 2);
  r = await shot(`${m}-mid`);
  await key('End');
  r = await shot(`${m}-end`);
}
assert.equal(r.phase, 'מבט על');
assert.equal(r.explain, 'המישור כבר שטוח. במבט על מתקבלת רשת מעגלית סביב מרכז ההיטל.');
// tabs by keyboard: in RTL, ← is the next tab
await card.locator('[data-tab="az"]').focus();
await page.keyboard.press('ArrowRight');
assert.equal((await readout()).method, 'cone', '→ from "אזימוטלי" is "חרוטי"');
await page.keyboard.press('Home');
assert.equal((await readout()).method, 'cyl');
await page.keyboard.press('ArrowLeft');
assert.equal((await readout()).method, 'cone');
await page.keyboard.press('Enter');
await key('PageUp');
await card.locator('[data-tab="cone"]').focus();
r = await shot('keyboard-focus', 400);

/* ── practice ── */
await btn('[data-enter-practice]').click();
r = await shot('practice-open');
assert.equal(r.mode, 'practice');
assert.equal(r.target, 'cone', 'the first task is conic');
assert.equal(r.checked, '');
assert.equal(r.stageTitle, 'כדור הארץ', 'no surface before a check');
  assert.equal(await card.locator('[data-practice-head] h4').textContent(), 'תרגול: זהו את המשטח');
assert.equal(r.mapTitle, 'מפת היעד');
assert.ok(await btn('[data-check]').isDisabled(), 'no check without a choice');
await btn('[data-option="cyl"]').click();
r = await shot('practice-picked', 500);
assert.equal(r.pick, 'cyl');
assert.equal(r.checked, '', 'a choice is not checked on its own');
await btn('[data-check]').click();
r = await shot('practice-wrong', REDUCED ? 500 : 3900);
assert.equal(r.checked, 'cyl');
assert.match(r.feedback, /^הגליל נפתח למלבן\. במפת היעד קווי הרוחב מקושתים וקווי האורך מתכנסים — בדקו איזה משטח יכול ליצור את הרשת הזו\./);
assert.ok(!/חרוט/.test(r.feedback), 'the miss does not name the answer');
assert.equal(r.stageTitle, 'המשטח שבחרתם: גליל');
await btn('[data-hint]').click();
r = await shot('practice-hint', 400);
assert.match(r.feedback, /התבוננו בצורה של קווי הרוחב/);
// back to the demonstration and back: the task and the attempt are kept
await btn('[data-back]').click();
r = await readout();
assert.equal(r.mode, 'learn');
assert.equal(r.cta.trim(), 'חזרה לתרגול');
await btn('[data-enter-practice]').click();
r = await readout();
assert.equal(r.checked, 'cyl', 'the attempt was kept');
await btn('[data-option="cone"]').click();
assert.equal((await readout()).checked, '', 'another choice clears the old check');
await btn('[data-check]').click();
r = await shot('practice-right', REDUCED ? 500 : 3900);
assert.equal(r.solved, '100');
assert.equal(r.feedback, 'נכון. החרוט נפתח למניפה: קווי הרוחב מקושתים וקווי האורך מתכנסים.');
await btn('[data-next]').click();
r = await readout();
assert.equal(r.target, 'az');
await btn('[data-option="az"]').click();
await btn('[data-check]').click();
await shot('practice-az-right', REDUCED ? 500 : 3900);
await btn('[data-next]').click();
assert.equal((await readout()).target, 'cyl');
await btn('[data-option="az"]').click();
await btn('[data-check]').click();
r = await shot('practice-cyl-wrong', REDUCED ? 500 : 3900);
assert.match(r.feedback, /^המישור יוצר כאן מפה עגולה/);
await btn('[data-option="cyl"]').click();
await btn('[data-check]').click();
await page.waitForTimeout(REDUCED ? 300 : 1000);
assert.equal((await readout()).done, 'false', 'no automatic move to the summary');
await btn('[data-finish]').click();
r = await shot('practice-summary');
assert.equal(r.done, 'true');
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
assert.notEqual(r.target, 'cone', 'the repeat takes another order');

console.log('card heights:', [...heights].join(', '));
assert.equal(heights.size, 1, `the card keeps one height: ${[...heights]}`);
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
if (errors.length) process.exitCode = 1;
