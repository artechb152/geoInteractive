// Browser check of the globe practice's feedback and tries (topic-02 #scene-coordinates-2,
// design/docs/topic02-independent-user-audit.md א1 / ג1), at 1440 × 1122:
// - a "read" task: a miss never names the marked point's coordinates — not in the panel, the
//   globe's note, the flat map, the screen-reader description or the live region — while the
//   description still lets a non-sighted learner place the point on the grid;
// - "בדיקה" again on the same answer is not a new try (read and find), by mouse and keyboard;
//   a real change re-opens the check, and the old result is marked as the previous check.
// Tasks are random: the script reads the task from the card's data-* and answers from it.
//
// Usage (a dev server serving the page):
//   QA_BASE=http://localhost:3000 node scripts/qa/geo-globe-feedback.mjs [outDir]
// Writes <outDir>/NN-name.png (the viewport) and NN-name-card.png (the activity card); logs one
// JSON line per state, and the leaks / failures found (none expected after the fix).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/geo-globe-feedback';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && /geo-globe|Globe3D|GlobeExplorer|THREE/.test(`${m.text()} ${m.location()?.url ?? ''}`) && errors.push(m.text()));

await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
const card = page.locator('[data-geo-explorer]');
await card.waitFor({ state: 'attached', timeout: 120000 });
await page.evaluate(() => {
  const h = document.querySelector('[data-screen="geographic-coordinates"] h3');
  window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - 100, behavior: 'instant' });
});
await page.waitForSelector('[data-geo-explorer] [data-ready="true"]', { timeout: 90000 });
await page.waitForTimeout(900);

const fails = [];
const fmtLat = (lat) => (lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`);
const fmtLon = (lon) => (lon === 0 || lon === 180 ? `${Math.abs(lon)}°` : `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`);

const readout = () =>
  card.evaluate((el) => {
    const d = el.dataset;
    const fb = el.querySelector('[data-geo-feedback]');
    const check = [...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'בדיקה');
    const desc = document.getElementById(el.querySelector('[aria-roledescription="גלובוס"]')?.getAttribute('aria-describedby') ?? '');
    const shown = (sel) => el.querySelector(sel)?.dataset.shown === 'true';
    return {
      task: d.taskKind ? `${d.taskKind} ${d.taskLat},${d.taskLon}` : '',
      level: d.level,
      misses: d.misses,
      outcome: d.outcome,
      stale: d.stale,
      msg: fb ? fb.innerText.replace(/\s+/g, ' ').trim() : '',
      tries: el.querySelector('[data-tries]')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
      hint: el.querySelector('[data-recheck-hint]')?.innerText.trim() ?? '',
      described: check?.getAttribute('aria-describedby') ? document.getElementById(check.getAttribute('aria-describedby'))?.textContent.trim() ?? '' : '',
      check: check ? (check.disabled ? 'disabled' : check.getAttribute('aria-disabled') === 'true' ? 'aria-disabled' : 'enabled') : 'absent',
      focus: document.activeElement === check ? 'בדיקה' : (document.activeElement?.textContent ?? '').trim().slice(0, 20),
      note: shown('[data-note]') ? el.querySelector('[data-note]').innerText : '',
      desc: desc?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      question: el.querySelector('[data-task]')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      chips: [...el.querySelectorAll('[data-chip]')].filter((c) => c.dataset.shown === 'true').map((c) => c.textContent),
      h: Math.round(el.getBoundingClientRect().height),
      bottom: Math.round(el.getBoundingClientRect().bottom),
    };
  });

let n = 0;
async function shot(name) {
  n += 1;
  const id = String(n).padStart(2, '0');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${outDir}/${id}-${name}.png` });
  await card.screenshot({ path: `${outDir}/${id}-${name}-card.png` });
  const r = await readout();
  console.log(id, name, JSON.stringify(r));
  return r;
}
const btn = (name) => card.getByRole('button', { name, exact: true });
// a click that turns the primary button ("בדיקה" ↔ "נקודה הבאה") or opens a task; the panel lets presses go for
// 500 ms after it changes (GlobeExplorer SETTLE_MS — no double click past a verdict), so wait around it
const turn = async (name) => {
  await page.waitForTimeout(600);
  await btn(name).click();
  await page.waitForTimeout(600);
};
const task = async () => card.evaluate((el) => ({ kind: el.dataset.taskKind, lat: +el.dataset.taskLat, lon: +el.dataset.taskLon }));
const choice = (i) => card.locator(`[data-choice-option="${i}"]`);
const answerIndex = () => page.evaluate(() => window.__geoGlobeAnswer?.());
const solveAndNext = async () => {
  await choice(await answerIndex()).click();
  await btn('בדיקה').click();
  await turn('נקודה הבאה');
};

/** A "read" task's texts must not carry its own values (the question is the point itself). */
function leakCheck(label, r, t) {
  if (!r.task.startsWith('read') || r.outcome) return;
  const said = [r.msg, r.note, r.desc, r.question, r.tries, r.hint, ...r.chips].join(' | ');
  for (const v of [fmtLat(t.lat), fmtLon(t.lon)]) if (said.includes(v)) fails.push(`${label}: "${v}" said in a read task — ${said}`);
}

// QA_SEED: the same task sequence on every run (before / after a change) — "לתרגול" draws its
// seed from Math.random, held at this value only while the button is clicked
const SEED = process.env.QA_SEED;
if (SEED) await page.evaluate((v) => ((window.__qaRandom = Math.random), (Math.random = () => v)), Number(SEED));
await turn('לתרגול');
if (SEED) await page.evaluate(() => (Math.random = window.__qaRandom));
let t = await task();
for (let guard = 0; guard < 12 && t.kind !== 'read'; guard++) {
  await solveAndNext();
  t = await task();
}

// ── read: the miss (answer left at 0°, 0°) ──
let r = await shot('read-open');
leakCheck('read-open', r, t);
await btn('בדיקה').click();
r = await shot('read-miss');
leakCheck('read-miss', r, t);
if (r.misses !== '1') fails.push(`read-miss: misses ${r.misses}, expected 1`);

// ── read: the same answer checked again, by mouse ──
await btn('בדיקה').click({ force: true, timeout: 3000 }).catch(() => {});
r = await shot('read-recheck-click');
leakCheck('read-recheck-click', r, t);
if (r.misses !== '1') fails.push(`read-recheck-click: misses ${r.misses} — a repeated check took a try`);
if (r.outcome) fails.push(`read-recheck-click: outcome "${r.outcome}" — a repeated check ended the task`);

// … and by keyboard: Enter on the focused button
await btn('בדיקה').focus();
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
r = await shot('read-recheck-keyboard');
leakCheck('read-recheck-keyboard', r, t);
if (r.misses !== '1' || r.outcome) fails.push(`read-recheck-keyboard: misses ${r.misses}, outcome "${r.outcome}"`);
if (r.focus !== 'בדיקה') fails.push(`read-recheck-keyboard: focus left the check button (${r.focus})`);
if (r.check !== 'aria-disabled' || !r.hint || r.described !== r.hint) fails.push(`read-recheck-keyboard: check ${r.check}, hint "${r.hint}", described by "${r.described}"`);

const setCoord = async (name, mag, dir) => {
  const field = card.getByRole('spinbutton', { name: new RegExp(name) });
  await field.fill(String(mag));
  await field.press('Enter');
  if (dir) await card.getByRole('radio', { name: dir }).first().click();
};

// ── read: a real change re-opens the check; the old result is the previous check ──
// (before the fix the repeated checks may already have ended the task)
if (!r.outcome && r.task.startsWith('read')) {
const lonField = card.getByRole('spinbutton', { name: /אורך/ });
await lonField.focus();
await page.keyboard.press('ArrowUp');
r = await shot('read-changed');
leakCheck('read-changed', r, t);
if (r.check !== 'enabled') fails.push(`read-changed: check ${r.check} after a real change`);
if (r.stale !== 'true') fails.push('read-changed: the old result is not marked as the previous check');
// back to the checked answer: closed again
await page.keyboard.press('ArrowDown');
r = await readout();
if (r.check === 'enabled') fails.push('read-back: the checked answer can be checked again');
await page.keyboard.press('ArrowUp');
await btn('בדיקה').click();
r = await shot('read-second-try');
leakCheck('read-second-try', r, t);
if (r.misses !== '2' && r.outcome !== 'hit') fails.push(`read-second-try: misses ${r.misses}`);

// the answer, set from the task: right on the next check
if (!r.outcome) {
  await setCoord('רוחב', Math.abs(t.lat), t.lat > 0 ? 'צפון' : t.lat < 0 ? 'דרום' : null);
  await setCoord('אורך', Math.abs(t.lon), t.lon > 0 && t.lon < 180 ? 'מזרח' : t.lon < 0 ? 'מערב' : null);
  r = await shot('read-set-unchecked');
  if (r.outcome) fails.push('read-set-unchecked: a set answer counted before the check');
  await btn('בדיקה').click();
  r = await shot('read-hit');
  if (r.outcome !== 'hit') fails.push(`read-hit: outcome "${r.outcome}"`);
}
}

// ── find: a miss, then the same (ruled-out) letter checked again ──
if (await btn('נקודה הבאה').isVisible()) await turn('נקודה הבאה');
t = await task();
for (let guard = 0; guard < 12 && t.kind !== 'find'; guard++) {
  await setCoord('רוחב', Math.abs(t.lat), t.lat > 0 ? 'צפון' : t.lat < 0 ? 'דרום' : null);
  await setCoord('אורך', Math.abs(t.lon), t.lon > 0 && t.lon < 180 ? 'מזרח' : t.lon < 0 ? 'מערב' : null);
  await btn('בדיקה').click();
  await turn('נקודה הבאה');
  t = await task();
}
const right = await answerIndex();
const wrong = [0, 1, 2, 3].find((i) => i !== right);
await choice(wrong).click();
r = await shot('find-picked-unchecked');
if (r.outcome) fails.push('find-picked-unchecked: a pick counted before the check');
await btn('בדיקה').click();
r = await shot('find-miss');
await btn('בדיקה').click({ force: true, timeout: 3000 }).catch(() => {});
r = await shot('find-recheck');
if (r.misses !== '1' || r.outcome) fails.push(`find-recheck: misses ${r.misses}, outcome "${r.outcome}" — a repeated check took a try`);
if (!r.outcome) {
await choice(right).click();
r = await shot('find-changed');
if (r.check !== 'enabled') fails.push(`find-changed: check ${r.check} after another letter`);
if (r.stale !== 'true') fails.push('find-changed: the old result is not marked as the previous check');
// by keyboard: Enter checks; focus moves on to "נקודה הבאה" in the same place
await btn('בדיקה').focus();
await page.keyboard.press('Enter');
r = await shot('find-hit');
if (r.outcome !== 'hit') fails.push(`find-hit: outcome "${r.outcome}"`);
if (r.focus !== 'נקודה הבאה') fails.push(`find-hit: focus on "${r.focus}", expected "נקודה הבאה"`);
}

// ── read: the tries run out on three different answers (keyboard only); then a new task starts clean ──
if (await btn('נקודה הבאה').isVisible()) {
  await turn('נקודה הבאה');
  t = await task();
  for (let guard = 0; guard < 12 && t.kind !== 'read'; guard++) {
    await solveAndNext();
    t = await task();
  }
  const latField = card.getByRole('spinbutton', { name: /רוחב/ });
  for (let i = 0; i < 3; i++) {
    await btn('בדיקה').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // a second Enter on the same answer: nothing
    r = await readout();
    if (i < 2) {
      if (r.misses !== String(i + 1) || r.outcome) fails.push(`read-exhaust ${i + 1}: misses ${r.misses}, outcome "${r.outcome}"`);
      leakCheck(`read-exhaust ${i + 1}`, r, t);
      await latField.focus();
      await page.keyboard.press('ArrowUp');
    }
  }
  r = await shot('read-reveal');
  if (r.outcome !== 'reveal' || r.misses !== '3') fails.push(`read-reveal: outcome "${r.outcome}", misses ${r.misses}`);
  if (!r.msg.includes(fmtLat(t.lat)) || !r.msg.includes(fmtLon(t.lon))) fails.push(`read-reveal: the full reading is not said — ${r.msg}`);
  if (r.focus !== 'נקודה הבאה') fails.push(`read-reveal: focus on "${r.focus}"`);
  // away to the explorer, "איפוס", and back: a finished task gives way to a new one, clean
  await btn('לחקירה').click();
  await card.getByRole('button', { name: /^איפוס/ }).click();
  await turn('לתרגול');
  r = await shot('after-reset-new-task');
  if (r.misses !== '0' || r.outcome || r.hint || r.stale !== 'false') fails.push(`after-reset: misses ${r.misses}, outcome "${r.outcome}", hint "${r.hint}", stale ${r.stale}`);
}

console.log('fails:', fails.length ? fails : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
