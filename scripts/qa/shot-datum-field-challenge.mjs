// Browser QA for the datum field challenge (#scene-coordinates → "הדמיה: מה קורה כשהדאטום לא תואם?",
// design/docs/datum-field-challenge-claude-prompt-2026-10-11.txt §9–§11).
//
// Usage (a dev server for the lesson):
//   QA_BASE=http://localhost:3000 node scripts/qa/shot-datum-field-challenge.mjs [outDir]
//
// Renders the real lesson route at 1440 × 1122 with the block's title at the top of the screen and
// checks, exit code 1 on any failure:
//   opening     the bridge; A's numbers on the map; 60 m; step 2 current; no answer, no success;
//               "בדיקת הבחירה" disabled; the markers stand where the projection puts them
//   hint        shows and hides the hint, frames the two datum rows, answers nothing
//   wrong       "label only": its feedback, and the numbers, the gap and the marker do not move
//   correct     the converted pair beside the source, the marker travels to the crosshair while the
//               gap counts down with it, then 0 m, "ללא סטייה", the success band, step 3 done,
//               one announcement; a second check converts nothing
//   landmarks   switching (also mid-motion) shows the new point's numbers, no stale answer or feedback
//   reset       back to the bridge, A's numbers, 60 m, nothing chosen
//   keyboard    the answers and the points are radio groups (arrows), Enter checks, focus is visible
//   motion      reduced motion lands at once
//   loading     a failed terrain says so, offers a retry and shows no markers; the retry recovers
//   console     no page errors
// Writes per-state screenshots of the screen and of the card, and a side-by-side with the mockup.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
const outDir = process.argv[2] || 'design/screenshots/datum-field-challenge';
const MOCKUP = process.env.QA_MOCKUP || 'design/mockups/topic-02-datum-shift-2026-10-11/mockup-field-challenge.png';
const W = 1440;
const H = 1122;
const TITLE = 'הדמיה: מה קורה כשהדאטום לא תואם?';
await mkdir(outDir, { recursive: true });

const failures = [];
const expect = (cond, m) => cond || failures.push(m);
const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (opts.blockTerrain) await page.route('**/datum-field-challenge/terrain-base.webp*', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const title = page.locator('h3', { hasText: TITLE });
  await title.waitFor({ timeout: 60000 });
  const root = page.locator('div.my-10', { has: title });
  // the block's title at the top of the screen (header clearance), the whole card under it
  await title.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96));
  if (!opts.blockTerrain) await root.locator('[data-terrain="ready"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  const ui = {
    page, root, errors, ctx,
    steps: root.locator('ol[aria-label="שלבי המשימה"] > li'),
    rows: root.locator('dl dd'),
    gap: root.locator('text=מ׳ סטייה').locator('..'),
    answer: (v) => root.locator(`input[type=radio][value=${v}]`),
    pick: (v) => root.locator('label', { has: page.locator(`input[type=radio][value=${v}]`) }).click(),
    check: root.locator('button', { hasText: 'בדיקת הבחירה' }),
    hint: root.locator('button', { hasText: 'רמז' }),
    reset: root.locator('button', { hasText: 'איפוס' }),
    band: root.locator('[data-band]'),
    live: root.locator('p[aria-live="polite"]'),
    req: root.locator('[data-marker="requested"]'),
    disp: root.locator('[data-marker="displayed"]'),
    line: root.locator('[data-gap-line]'),
  };
  return ui;
}

const center = async (loc) => {
  const b = await loc.boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const gapText = async (ui) => (await ui.gap.innerText()).replace(/\s+/g, ' ').trim();
const shot = async (ui, name) => {
  await ui.page.screenshot({ path: `${outDir}/${name}.png` });
  await ui.root.locator('.surface-elevated').screenshot({ path: `${outDir}/${name}-card.png` });
};
const currentStep = (ui) => ui.steps.evaluateAll((els) => els.findIndex((li) => li.getAttribute('aria-current') === 'step'));

// ── opening ─────────────────────────────────────────────────────────────────
{
  const ui = await open();
  await shot(ui, '01-opening');
  expect((await ui.rows.nth(0).innerText()).includes('E 1200 · N 800'), 'opening: source numbers');
  expect((await ui.rows.nth(1).innerText()).includes('E 1200 · N 800'), 'opening: the map reads A’s numbers');
  expect((await gapText(ui)).startsWith('60'), `opening: 60 m (${await gapText(ui)})`);
  expect((await ui.root.innerText()).includes('סטייה גדולה בהדמיה'), 'opening: the original status wording');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'opening: no feedback in the band');
  expect(await ui.check.isDisabled(), 'opening: check disabled without an answer');
  expect(!(await ui.answer('label').isChecked()) && !(await ui.answer('convert').isChecked()), 'opening: no answer chosen');
  expect((await currentStep(ui)) === 1, 'opening: step 2 is current');
  expect((await ui.answer('bridge').isChecked()), 'opening: the bridge is selected');
  const a = await center(ui.req);
  const b = await center(ui.disp);
  expect(a && b && dist(a, b) > 60, `opening: the two markers are apart on screen (${a && b ? dist(a, b).toFixed(0) : '?'} px)`);
  expect(await ui.line.count() === 1, 'opening: the dashed line is drawn');
  // the reading order of the card: the panel at the inline start (right), the terrain at the inline end (left)
  const panelBox = await ui.root.locator('dl').boundingBox();
  const terrainBox = await ui.root.locator('[data-terrain]').boundingBox();
  expect(panelBox.x > terrainBox.x + terrainBox.width - 1, 'layout: the panel sits right of the terrain');
  const card = await ui.root.locator('.surface-elevated').boundingBox();
  const title = await ui.root.locator('h3').boundingBox();
  expect(card.y + card.height <= H + 1, `layout: the card ends inside the screen (${(card.y + card.height).toFixed(0)} px)`);
  const cardH = card.height;
  const steady = async (m) => expect(Math.abs((await ui.root.locator('.surface-elevated').boundingBox()).height - cardH) <= 1, `${m}: the card keeps its height (no layout jump)`);
  console.log(`card ${card.width.toFixed(0)}×${card.height.toFixed(0)} at y ${card.y.toFixed(0)} (title at ${title.y.toFixed(0)}); terrain ${terrainBox.width.toFixed(0)}×${terrainBox.height.toFixed(0)}; panel x ${panelBox.x.toFixed(0)} w ${panelBox.width.toFixed(0)}`);

  // ── hint ──
  await ui.hint.click();
  await ui.page.waitForTimeout(250);
  expect((await ui.root.innerText()).includes('השוו בין דאטום המקור לדאטום במפה.'), 'hint: the hint text');
  expect((await ui.hint.getAttribute('aria-expanded')) === 'true', 'hint: aria-expanded');
  expect(!(await ui.answer('convert').isChecked()) && (await ui.band.getAttribute('data-band')) === 'info', 'hint: answers nothing');
  await steady('hint');
  await shot(ui, '02-hint');
  await ui.hint.click();
  await ui.page.waitForTimeout(200);
  expect(!(await ui.root.innerText()).includes('השוו בין דאטום המקור לדאטום במפה.'), 'hint: hides again');

  // ── wrong ──
  const before = await center(ui.disp);
  await ui.pick('label');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'wrong: picking judges nothing');
  expect(!(await ui.check.isDisabled()), 'wrong: check enabled once an answer is picked');
  await ui.check.click();
  await ui.page.waitForTimeout(400);
  expect((await ui.band.getAttribute('data-band')) === 'wrong', 'wrong: wrong band');
  expect((await ui.band.innerText()).includes('שינוי התווית בלבד אינו ממיר את הקואורדינטות.'), 'wrong: its feedback');
  expect((await ui.live.innerText()).includes('שינוי התווית בלבד אינו ממיר את הקואורדינטות.'), 'wrong: announced');
  expect((await ui.rows.nth(1).innerText()).includes('E 1200 · N 800'), 'wrong: numbers unchanged');
  expect((await gapText(ui)).startsWith('60'), 'wrong: gap unchanged');
  const after = await center(ui.disp);
  expect(dist(before, after) < 0.5, 'wrong: the marker did not move');
  await steady('wrong');
  await shot(ui, '03-wrong');

  // ── correct, synchronised motion ──
  await ui.pick('convert');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'correct: picking clears the old feedback');
  const target = await center(ui.req);
  await ui.check.click();
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await ui.page.waitForTimeout(110);
    const g = parseInt(await gapText(ui), 10);
    const d = await center(ui.disp);
    samples.push({ g, px: dist(d, target) });
  }
  console.log('motion samples (m, px):', samples.map((s) => `${s.g}/${s.px.toFixed(0)}`).join('  '));
  expect(samples.some((s) => s.g > 0 && s.g < 60), 'correct: the gap counts down during the motion');
  expect(samples.every((s, i) => i === 0 || s.g <= samples[i - 1].g), 'correct: the gap never grows');
  const ratio = samples.filter((s) => s.g > 5).map((s) => s.px / s.g);
  expect(ratio.length < 2 || Math.max(...ratio) / Math.min(...ratio) < 1.6, `correct: marker and readout move together (${ratio.map((r) => r.toFixed(2)).join(', ')})`);
  expect((await ui.rows.nth(1).innerText()).includes('E 1164 · N 752'), 'correct: the converted pair is shown at once');
  expect((await ui.rows.nth(0).innerText()).includes('E 1200 · N 800'), 'correct: the source pair stays');
  await ui.root.locator('[data-band="done"]').waitFor({ timeout: 4000 });
  await ui.page.waitForTimeout(150);
  const landed = await center(ui.disp);
  expect(dist(landed, target) < 1.5, `correct: the marker sits on the crosshair (${dist(landed, target).toFixed(2)} px)`);
  expect((await gapText(ui)).startsWith('0'), 'correct: gap 0');
  expect((await ui.root.innerText()).includes('ללא סטייה'), 'correct: "ללא סטייה"');
  expect((await ui.band.innerText()).includes('ההמרה משנה את הקואורדינטות ושומרת על המיקום המבוקש.'), 'correct: success feedback');
  expect((await ui.live.innerText()).includes('ההמרה משנה את הקואורדינטות ושומרת על המיקום המבוקש.'), 'correct: announced once, at the end');
  expect((await ui.root.innerText()).includes('דאטום במפה: B'), 'correct: the map stays in datum B');
  expect((await currentStep(ui)) === -1 && (await ui.steps.nth(2).innerText()).includes('הושלם'), 'correct: the last step is done');
  expect(await ui.check.isDisabled(), 'correct: nothing left to check');
  expect(await ui.line.count() === 0, 'correct: no gap line');
  await steady('success');
  await shot(ui, '04-success');
  // a second click converts nothing (the button is disabled; force the event anyway)
  await ui.check.dispatchEvent('click');
  await ui.page.waitForTimeout(300);
  expect((await ui.rows.nth(1).innerText()).includes('E 1164 · N 752'), 'correct: no double conversion');

  // ── landmarks ──
  await ui.pick('junction');
  await ui.page.waitForTimeout(300);
  expect((await ui.rows.nth(0).innerText()).includes('E 1090 · N 760'), 'junction: its numbers');
  expect((await ui.rows.nth(1).innerText()).includes('E 1090 · N 760'), 'junction: unconverted on the map');
  expect((await gapText(ui)).startsWith('60'), 'junction: 60 m');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'junction: no stale feedback');
  expect(!(await ui.answer('label').isChecked()) && !(await ui.answer('convert').isChecked()), 'junction: no stale answer');
  await shot(ui, '05-junction');
  // a new conversion's first frame starts at the displayed point, never where the last motion ended
  await ui.pick('convert');
  const firstFrame = await ui.page.evaluate(async (title) => {
    const root = [...document.querySelectorAll('h3')].find((h) => h.textContent.includes(title)).closest('div.my-10');
    const centre = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    const apart = () => {
      const a = centre(root.querySelector('[data-marker="displayed"]'));
      const b = centre(root.querySelector('[data-marker="requested"]'));
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    [...root.querySelectorAll('button')].find((b) => b.textContent.includes('בדיקת הבחירה')).click();
    await Promise.resolve();
    await Promise.resolve();
    const afterRender = apart();
    await new Promise((r) => setTimeout(r, 0));
    return Math.min(afterRender, apart());
  }, TITLE);
  expect(firstFrame > 50, `motion: a new conversion starts from the displayed point (${firstFrame.toFixed(1)} px)`);
  await ui.root.locator('[data-band="done"]').waitFor({ timeout: 4000 });
  await ui.pick('summit');
  await ui.page.waitForTimeout(300);
  expect((await ui.rows.nth(0).innerText()).includes('E 1310 · N 825'), 'summit: its numbers');
  await shot(ui, '06-summit');
  // switching in mid-motion drops the motion and its feedback
  await ui.pick('convert');
  await ui.check.click();
  await ui.page.waitForTimeout(250);
  await ui.pick('bridge');
  await ui.page.waitForTimeout(1500);
  expect((await ui.band.getAttribute('data-band')) === 'info', 'mid-motion switch: no success for the new point');
  expect((await gapText(ui)).startsWith('60'), 'mid-motion switch: the new point starts at 60 m');
  expect((await ui.rows.nth(1).innerText()).includes('E 1200 · N 800'), 'mid-motion switch: the new point’s A numbers');

  // ── summit success, then reset ──
  await ui.pick('summit');
  await ui.pick('convert');
  await ui.check.click();
  await ui.root.locator('[data-band="done"]').waitFor({ timeout: 4000 });
  await ui.page.waitForTimeout(150);
  expect((await ui.rows.nth(1).innerText()).includes('E 1274 · N 777'), 'summit: converted pair');
  expect(dist(await center(ui.disp), await center(ui.req)) < 1.5, 'summit: lands on the crosshair');
  await shot(ui, '07-summit-success');
  await ui.reset.click();
  await ui.page.waitForTimeout(300);
  expect(await ui.answer('bridge').isChecked(), 'reset: back to the bridge');
  expect((await ui.rows.nth(1).innerText()).includes('E 1200 · N 800'), 'reset: A numbers');
  expect((await gapText(ui)).startsWith('60'), 'reset: 60 m');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'reset: no feedback');
  expect((await currentStep(ui)) === 1, 'reset: back to step 2');
  expect(ui.errors.length === 0, `console: ${ui.errors.join(' | ')}`);
  await ui.ctx.close();
}

// ── keyboard ─────────────────────────────────────────────────────────────────
{
  const ui = await open();
  await ui.answer('label').focus();
  await ui.page.keyboard.press('Space');
  expect(await ui.answer('label').isChecked(), 'keyboard: space picks an answer');
  await ui.page.keyboard.press('ArrowDown');
  expect(await ui.answer('convert').isChecked(), 'keyboard: arrows move within the answers');
  await ui.page.waitForTimeout(150);
  await ui.page.screenshot({ path: `${outDir}/08-keyboard-focus.png` });
  const ring = await ui.answer('convert').evaluate((el) => getComputedStyle(el.closest('label')).boxShadow);
  expect(ring && ring !== 'none', 'keyboard: the focused answer shows a ring');
  await ui.check.focus();
  await ui.page.keyboard.press('Enter');
  await ui.root.locator('[data-band="done"]').waitFor({ timeout: 4000 });
  await ui.answer('bridge').focus();
  await ui.page.keyboard.press('ArrowDown');
  await ui.page.waitForTimeout(200);
  expect(await ui.answer('junction').isChecked(), 'keyboard: arrows move between the points');
  expect((await ui.band.getAttribute('data-band')) === 'info', 'keyboard: the new point starts over');
  await ui.hint.focus();
  await ui.page.keyboard.press('Enter');
  expect((await ui.hint.getAttribute('aria-expanded')) === 'true', 'keyboard: the hint opens from the keyboard');
  await ui.reset.focus();
  await ui.page.keyboard.press('Enter');
  await ui.page.waitForTimeout(200);
  expect(await ui.answer('bridge').isChecked(), 'keyboard: reset from the keyboard');
  await ui.ctx.close();
}

// ── reduced motion ───────────────────────────────────────────────────────────
{
  const ui = await open({ reducedMotion: 'reduce' });
  await ui.pick('convert');
  await ui.check.click();
  await ui.page.waitForTimeout(120);
  expect((await ui.band.getAttribute('data-band')) === 'done', 'reduced motion: the result at once');
  expect(dist(await center(ui.disp), await center(ui.req)) < 1.5, 'reduced motion: on the crosshair');
  await ui.ctx.close();
}

// ── a terrain that fails to load ────────────────────────────────────────────
{
  const ui = await open({ blockTerrain: true });
  await ui.root.locator('[data-terrain="failed"]').waitFor({ timeout: 20000 });
  expect((await ui.root.innerText()).includes('לא ניתן לטעון את תמונת השטח.'), 'loading: says the terrain failed');
  expect(await ui.req.count() === 0 && await ui.disp.count() === 0, 'loading: no markers without the terrain');
  const box = await ui.root.locator('[data-terrain]').boundingBox();
  expect(Math.abs(box.width / box.height - 25 / 14) < 0.01, 'loading: the box keeps 25:14');
  await ui.page.screenshot({ path: `${outDir}/09-load-failure.png` });
  await ui.page.unroute('**/datum-field-challenge/terrain-base.webp*');
  await ui.root.locator('button', { hasText: 'נסו שוב' }).click();
  await ui.root.locator('[data-terrain="ready"]').waitFor({ timeout: 20000 });
  expect(await ui.req.count() === 1, 'loading: the retry brings the terrain and the markers back');
  await ui.ctx.close();
}

await browser.close();

// ── side by side with the mockup (composition check of the activity card) ──
{
  const card = sharp(`${outDir}/01-opening-card.png`);
  const meta = await card.metadata();
  const mock = await sharp(MOCKUP).resize({ height: meta.height }).toBuffer({ resolveWithObject: true });
  await sharp({ create: { width: meta.width + mock.info.width + 24, height: meta.height, channels: 3, background: '#F3E9DC' } })
    .composite([{ input: await card.toBuffer(), left: 0, top: 0 }, { input: mock.data, left: meta.width + 24, top: 0 }])
    .png()
    .toFile(`${outDir}/compare-opening-vs-mockup.png`);
}

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\n✓ datum field challenge: every check passed');
