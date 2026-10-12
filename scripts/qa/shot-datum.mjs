// QA for the guided 3-D datum block (topic-02 #scene-coordinates,
// design/mockups/datum-concepts/claude-guided-3d-prompt.md §11, with the
// stations as claude-interaction-and-learning-refinement-prompt.md redefines them).
//
// Usage (dev server on :3000):
//   node scripts/qa/shot-datum.mjs [outDir]          (QA_BASE=http://localhost:3041 for another server)
//
// Drives every station and control at 1440 × 1122 and fails (exit 1) on:
//   - console / page errors (three's own "THREE.Clock" deprecation warning is
//     reported, not failed — it comes from @react-three/fiber, every 3-D scene);
//   - a removed control or a score coming back (round play button, scrubber,
//     percentages, fullscreen, "החזרת המבט", demo copies inside the stations);
//   - a surface choice that moves anything, or that does not visibly change the view;
//   - a demo that autoplays, loops, auto-advances, or whose phase changes more
//     than its own parameter; a single button that does not play / stop /
//     resume / replay;
//   - station 3 not applying the chosen fit at once, check points that do not
//     follow the choice, or stations overwriting each other's state;
//   - the feedback leaving the globe's column (or drifting below it);
//   - missing fallback (no WebGL) or reduced-motion behaviour;
//   - a close-up that does not follow the pose, has no bands, or puts the
//     measured points outside its circle;
//   - textures or GPU buffers created while the demo plays (per-frame allocation).
// The stage exposes its state as data-* attributes (station, look, playback,
// phase, guide, pose, inspect) — read here instead of any on-screen number.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const outDir = process.argv[2] || 'design/screenshots/datum-guided/interaction-refinement/qa';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
/** QA_SKIP_LEAVE=1: skip leaving the lesson and coming back — only for a shared dev
    server whose OTHER routes are broken (reported as skipped, never as passed). */
const SKIP_LEAVE = process.env.QA_SKIP_LEAVE === '1';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
await mkdir(outDir, { recursive: true });

/* The exercise's poses (datumDemo.ts / datumGeometry.ts — the unit tests pin them). */
const OVERVIEW = [0, 0, 0, 1];
const DEMO_START = [72, -52, 26, 0.8];
const FIT = { global: [4, -4, -9, 1.01], local: [38, -28, -36, 0.75] };
const PROBES = { inside: -1, outside: 1 };

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const check = (cond, m) => (cond ? notes.push(`ok  ${m}`) : fail(m));

const browser = await chromium.launch({ channel: 'chrome' });

async function open({ reducedMotion = 'no-preference', webgl = true } = {}) {
  const b = webgl ? browser : await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion });
  const page = await ctx.newPage();
  // count WebGL textures / buffers created by the datum stage's canvas (not the lesson's other scenes)
  await page.addInitScript(() => {
    window.__datumGL = { createTexture: 0, createBuffer: 0, deleteTexture: 0, deleteBuffer: 0, lost: 0 };
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
      const getExt = C.prototype.getExtension;
      C.prototype.getExtension = function (name) {
        const ext = getExt.call(this, name);
        if (ext && name === 'WEBGL_lose_context' && !ext.__counted) {
          const ctx = this;
          const lose = ext.loseContext.bind(ext);
          ext.loseContext = () => {
            if (ctx.__datum) window.__datumGL.lost++;
            return lose();
          };
          ext.__counted = true;
        }
        return ext;
      };
      for (const m of ['createTexture', 'createBuffer', 'deleteTexture', 'deleteBuffer']) {
        const orig = C.prototype[m];
        C.prototype[m] = function (...a) {
          // a context is the stage's once it creates something there (the canvas is detached by the time it is torn down)
          if (m.startsWith('create') && this.canvas?.closest?.('[aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"]')) this.__datum = true;
          if (this.__datum) window.__datumGL[m]++;
          return orig.apply(this, a);
        };
      }
    }
  });
  const errors = [];
  const warnings = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/datum-fallback\.webp/.test(t)) errors.push(t);
    if (m.type() === 'warning') warnings.push(t);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('_next/webpack-hmr')) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 180000 });
  await reach(page);
  if (webgl) {
    await page.waitForSelector(`${stageSel} canvas`, { timeout: 60000 });
    await page.waitForTimeout(3500);
  } else await page.waitForTimeout(1500);
  await align(page);
  return { b, ctx, page, errors, warnings };
}

/** The lesson's sections mount as they come into view: bring the stage in, then align. */
async function reach(page) {
  await page.waitForSelector(stageSel, { state: 'attached', timeout: 120000 });
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), stageSel);
  await page.waitForSelector('[aria-controls="datum-step-0"]', { timeout: 60000 });
  await align(page);
}

/** Scroll so the first station row sits at y = 386 — where the reference puts it. */
async function align(page) {
  await page.evaluate(() => {
    const row = document.querySelector('[aria-controls="datum-step-0"]').closest('div.rounded-xl');
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 386);
  });
  await page.waitForTimeout(300);
}

/** The datum block only — the section also holds other scenes' controls and canvases. */
const blk = (page) => page.locator('h3', { hasText: 'דאטום: התאמת האליפסואיד לכדור הארץ' }).locator('xpath=..');
const stageSel = '[role=group][aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"]';
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const station = (page, i) => page.locator(`[aria-controls="datum-step-${i}"]`);
const panel = (page, i) => page.locator(`#datum-step-${i}`);
const radio = (page, name) => blk(page).getByRole('radio', { name, exact: true });
const demoBtn = (page) => blk(page).getByRole('button', { name: /^(הפעלת ההדגמה|עצירת ההדגמה|המשך ההדגמה|הדגמה חוזרת|לשלב הבא)$/ });
const feedback = (page) => page.locator('[data-datum-feedback]');

/** The stage's state readout. */
async function st(page) {
  const d = await page.locator(stageSel).evaluate((el) => ({ ...el.dataset }));
  return { ...d, pose: d.pose.split(',').map(Number), inspect: Number(d.inspect) };
}
const near = (a, b, eps = 0.02) => a.every((x, i) => Math.abs(x - b[i]) <= eps);
const fmt = (p) => `(${p.join(', ')})`;

/** The close-up: its circle (stage px), the arrow's ends, and band pixels in a screenshot of it. */
const insetSel = `${stageSel} div.rounded-full:has(> svg)`;
async function inset(page) {
  const el = page.locator(insetSel);
  const box = await el.boundingBox();
  const line = await el.locator('svg line').first().evaluate((l) => ['x1', 'y1', 'x2', 'y2'].map((k) => Number(l.getAttribute(k)))).catch(() => null);
  const png = await page.screenshot({ clip: box });
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let blue = 0;
  let orange = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (b > r + 40 && b > 150) blue++;
    if (r > b + 70 && r > 170 && g < r - 25) orange++;
  }
  return { box, line, png, blue, orange, paths: await el.locator('svg path').count() };
}
const inCircle = (box, x, y, pad) => Math.hypot(x - box.width / 2, y - box.height / 2) <= box.width / 2 - pad;

/** Mean per-channel difference (0–255) between two screenshots of the same box. */
async function diff(a, b) {
  const [x, y] = await Promise.all([a, b].map((p) => sharp(p).raw().toBuffer()));
  let s = 0;
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]);
  return s / x.length;
}

/** The feedback sits in the globe's column, right under its control — not after the cards' grid. */
async function feedbackNearGlobe(page, label) {
  const stage = await page.locator(stageSel).boundingBox();
  const fb = await feedback(page).boundingBox();
  const gap = fb.y - (stage.y + stage.height);
  const sameColumn = fb.x >= stage.x - 1 && fb.x + fb.width <= stage.x + stage.width + 1;
  check(sameColumn && gap > 0 && gap < 110, `feedback right under the globe, in its column — ${label} (${Math.round(gap)} px below it)`);
}

async function noScore(page, label) {
  const txt = await blk(page).innerText();
  const desc = await page.locator('#datum-stage-desc').textContent();
  const live = await blk(page).locator('[aria-live]').textContent();
  check(!/\d\s*%|אחוז/.test(txt + desc + live), `no score or percentage in the block, its description or its announcement — ${label}`);
}

/* ───────── main run ───────── */
{
  const { b, ctx, page, errors, warnings } = await open();

  // the removed controls stay removed
  for (const name of ['השהיה', 'המשך', 'מסך מלא', 'יציאה ממסך מלא', 'החזרת המבט']) {
    check((await blk(page).getByRole('button', { name, exact: true }).count()) === 0, `no "${name}" button`);
  }
  check((await blk(page).getByRole('slider', { name: 'התקדמות ההדגמה' }).count()) === 0, 'no demo scrubber');
  await noScore(page, 'opening');

  // ── station 1: three surfaces, nothing moves ──
  check((await station(page, 0).getAttribute('aria-expanded')) === 'true', 'station 1 open at start');
  let s = await st(page);
  check(s.station === '0' && s.look === 'surface' && near(s.pose, OVERVIEW), `station 1 opens on the nested overview ${fmt(s.pose)}`);
  check((await radio(page, 'פני השטח').getAttribute('aria-checked')) === 'true', 'surface selected at start');
  check((await demoBtn(page).count()) === 0 && (await blk(page).locator('input[type=range]').count()) === 0, 'no demo and no fit controls in station 1');
  await page.waitForTimeout(1500);
  check(near((await st(page)).pose, OVERVIEW), 'no autoplay');
  await feedbackNearGlobe(page, 'station 1');
  const canvas = page.locator(`${stageSel} canvas`);
  let prev = await canvas.screenshot();
  await shot(page, '01-station1-surface');
  for (const [name, look, file] of [['גיאואיד', 'geoid', '02-station1-geoid'], ['אליפסואיד', 'ellipsoid', '03-station1-ellipsoid'], ['פני השטח', 'surface', null]]) {
    await radio(page, name).click();
    await page.waitForTimeout(500);
    s = await st(page);
    const now = await canvas.screenshot();
    const d = await diff(prev, now);
    check(s.look === look && near(s.pose, OVERVIEW) && s.playback === '', `"${name}" changes the look only — pose ${fmt(s.pose)}, no fit, no playback`);
    check(d > 6, `"${name}" visibly changes the view (mean difference ${d.toFixed(1)} / 255)`);
    check((await feedback(page).innerText()).includes(`במיקוד: ${name}`), `the feedback names the surface in focus (${name})`);
    if (file) await shot(page, file);
    prev = now;
  }
  // choosing the active surface again does not reset the camera
  {
    const bb = await canvas.boundingBox();
    await page.mouse.move(bb.x + 120, bb.y + 60);
    await page.mouse.down();
    await page.mouse.move(bb.x + 240, bb.y + 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    const turned = await canvas.screenshot();
    await radio(page, 'פני השטח').click();
    await page.waitForTimeout(900);
    check((await diff(turned, await canvas.screenshot())) < 1, 'choosing the active surface again keeps the camera where it is');
  }

  // ── station 2: one demo button under the globe ──
  await station(page, 1).click();
  await page.waitForTimeout(1000);
  await align(page);
  check((await station(page, 0).getAttribute('aria-expanded')) === 'false', 'only one station open');
  s = await st(page);
  check(s.station === '1' && s.look === 'motion' && near(s.pose, DEMO_START) && s.playback === 'idle', `station 2 opens on the demo's opening pose, not playing ${fmt(s.pose)}`);
  check((await blk(page).getByRole('radiogroup', { name: 'המשטח במיקוד' }).count()) === 0, 'the surface choice is only in station 1');
  check((await demoBtn(page).count()) === 1 && (await panel(page, 1).getByRole('button', { name: /ההדגמה/ }).count()) === 0, 'one demo button, none inside the station');
  {
    const btn = await demoBtn(page).boundingBox();
    const stage = await page.locator(stageSel).boundingBox();
    check(btn.y > stage.y + stage.height && btn.x >= stage.x && btn.x + btn.width <= stage.x + stage.width, 'the demo button sits under the globe');
  }
  check((await demoBtn(page).innerText()).trim() === 'הפעלת ההדגמה', 'label before playing: "הפעלת ההדגמה"');
  await feedbackNearGlobe(page, 'station 2');
  await shot(page, '04-station2-open');

  const gl0 = await page.evaluate(() => ({ ...window.__datumGL }));
  await demoBtn(page).click();
  check((await demoBtn(page).innerText()).trim() === 'עצירת ההדגמה', 'label while playing: "עצירת ההדגמה"');
  await page.waitForTimeout(1900);
  s = await st(page);
  check(s.phase === 'shift' && s.guide === 'shift', `phase "הזזה" with its reference marks (${s.phase}/${s.guide})`);
  check(s.pose[2] === DEMO_START[2] && s.pose[3] === DEMO_START[3] && !near(s.pose.slice(0, 2), DEMO_START.slice(0, 2), 1), `the shift moves only the position ${fmt(s.pose)}`);
  check((await blk(page).locator('ol[aria-label="שלבי ההדגמה"] [aria-current="step"]').innerText()).includes('הזזה'), 'the stepper shows the active phase: הזזה');
  await demoBtn(page).click();
  check((await demoBtn(page).innerText()).trim() === 'המשך ההדגמה', 'label when stopped: "המשך ההדגמה"');
  const held = (await st(page)).pose;
  await page.waitForTimeout(1200);
  check(near((await st(page)).pose, held, 1e-9), 'stopped holds in place');
  await shot(page, '05-station2-demo-shift');
  {
    const a = await inset(page);
    check(a.blue > 300 && a.orange > 300, `close-up draws both bands (blue ${a.blue}px, orange ${a.orange}px)`);
    check(!!a.line && inCircle(a.box, a.line[0], a.line[1], 6) && inCircle(a.box, a.line[2], a.line[3], 6), 'the gap arrow and both measured points are inside the close-up');
    check(a.paths <= 2, `with WebGL the close-up's SVG holds only the arrow and points (${a.paths} paths)`);
  }
  await demoBtn(page).click();
  await page.waitForTimeout(1650);
  s = await st(page);
  check(s.phase === 'rotate' && s.guide === 'rotate', `phase "סיבוב" with the body's axes (${s.phase}/${s.guide})`);
  check(near(s.pose.slice(0, 2), FIT.global.slice(0, 2)) && s.pose[3] === DEMO_START[3], `the rotation keeps position and size ${fmt(s.pose)}`);
  await demoBtn(page).click();
  await shot(page, '06-station2-demo-rotate');
  await demoBtn(page).click();
  await page.waitForTimeout(1700);
  s = await st(page);
  check(s.phase === 'scale' && s.guide === 'scale', `phase "קנה מידה" with the outline it started from (${s.phase}/${s.guide})`);
  check(near(s.pose.slice(0, 3), FIT.global.slice(0, 3)), `the scale keeps position and orientation ${fmt(s.pose)}`);
  const gl1 = await page.evaluate(() => ({ ...window.__datumGL }));
  check(gl0.createTexture > 0 && gl1.createTexture === gl0.createTexture && gl1.createBuffer === gl0.createBuffer,
    `no textures / buffers created while the demo plays through its phases (textures ${gl0.createTexture}→${gl1.createTexture}, buffers ${gl0.createBuffer}→${gl1.createBuffer})`);
  await demoBtn(page).click();
  await shot(page, '07-station2-demo-scale');
  await demoBtn(page).click();
  await page.waitForTimeout(3000);
  s = await st(page);
  check(s.playback === 'ended' && near(s.pose, FIT.global), `the demo ends on the computed fit ${fmt(s.pose)}`);
  check((await demoBtn(page).innerText()).trim() === 'הדגמה חוזרת', 'label at the end: "הדגמה חוזרת"');
  await page.waitForTimeout(1500);
  check(near((await st(page)).pose, FIT.global) && (await st(page)).playback === 'ended', 'the end stays — no loop');
  check((await station(page, 1).getAttribute('aria-expanded')) === 'true' && (await station(page, 2).getAttribute('aria-expanded')) === 'false', 'no auto-advance to station 3');
  await noScore(page, 'demo end');
  await shot(page, '08-station2-demo-end');
  await demoBtn(page).click();
  await page.waitForTimeout(300);
  s = await st(page);
  check(s.playback === 'playing' && Number(s.pose[3]) < 0.95, 'replay starts again from the opening');

  // ── the experiment (closed by default, behind "נסו בעצמכם") ──
  check((await panel(page, 1).locator('input[type=range]').count()) === 0, 'the four parameters are closed by default');
  await panel(page, 1).getByRole('button', { name: 'נסו בעצמכם' }).click();
  await page.waitForTimeout(400);
  s = await st(page);
  check(s.playback === 'manual', 'the experiment stops the demo');
  const sliders = panel(page, 1).locator('input[type=range]');
  check((await sliders.count()) === 4, 'four parameters in the experiment');
  for (const name of ['הזזה אופקית (X)', 'הזזה אנכית (Y)', 'סיבוב', 'קנה מידה']) {
    check((await panel(page, 1).getByText(name, { exact: true }).count()) === 1, `parameter "${name}"`);
  }
  check((await panel(page, 1).getByText('זהו ניסוי סכמטי בחתך דו־ממדי', { exact: false }).count()) === 1, 'the schematic-experiment note is shown');
  check(await page.evaluate(() => document.activeElement?.type === 'range'), 'focus moves to the first parameter');
  check((await panel(page, 1).getByRole('button', { name: /ההדגמה$/ }).count()) === 0, 'no second play button under the parameters');
  const rot = panel(page, 1).getByRole('slider', { name: /^סיבוב/ });
  await rot.focus();
  await page.waitForTimeout(200);
  const before3 = await inset(page);
  const r0 = (await st(page)).pose;
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
  s = await st(page);
  check(s.guide === 'rotate' && s.phase === 'rotate', `adjusting the rotation shows the axes and names the change (${s.guide})`);
  check(s.pose[2] !== r0[2] && near(s.pose.slice(0, 2), r0.slice(0, 2)) && s.pose[3] === r0[3], `the keyboard turns only the orientation ${fmt(r0)} → ${fmt(s.pose)}`);
  check(!before3.png.equals((await inset(page)).png), 'the close-up follows the pose (live, not a picture)');
  check((await feedback(page).innerText()).includes('סיבוב'), 'the feedback names the parameter being changed');
  await align(page);
  await shot(page, '09-station2-experiment');
  await panel(page, 1).getByRole('button', { name: 'איפוס' }).click();
  await page.waitForTimeout(900);
  check(near((await st(page)).pose, DEMO_START), 'reset returns the experiment to its opening');
  await panel(page, 1).getByRole('button', { name: 'הצגת התאמה' }).click();
  await page.waitForTimeout(1400);
  check(near((await st(page)).pose, FIT.global), 'show fit moves to the computed fit');
  await noScore(page, 'show fit');
  // leave a saved experiment for the station round trip
  const sx = panel(page, 1).getByRole('slider', { name: /^קנה מידה/ });
  await sx.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  const saved = (await st(page)).pose;
  await feedbackNearGlobe(page, 'experiment open (the longest station)');

  // ── station 3: global / local, two check points ──
  await station(page, 2).click();
  await page.waitForTimeout(1000);
  await align(page);
  s = await st(page);
  check(s.station === '2' && s.look === 'compare' && near(s.pose, FIT.global), `station 3 shows the global fit ${fmt(s.pose)}`);
  check((await demoBtn(page).count()) === 0 && (await blk(page).locator('input[type=range]').count()) === 0 && (await blk(page).getByRole('button', { name: 'נסו בעצמכם' }).count()) === 0,
    'no demo, no experiment in station 3');
  check((await feedback(page).innerText()).includes('תחום ההתאמה: כלל כדור הארץ.'), 'global: "תחום ההתאמה: כלל כדור הארץ."');
  check(Math.abs(s.inspect - PROBES.inside) < 1e-3, 'the close-up reads the check point in the marked region');
  await feedbackNearGlobe(page, 'station 3');
  await shot(page, '10-station3-global-inside');
  await radio(page, 'דאטום מקומי').click();
  await page.waitForTimeout(80);
  s = await st(page);
  check(!near(s.pose, FIT.global, 0.5) || near(s.pose, FIT.local), 'local applies at once (the view is already on its way)');
  await page.waitForTimeout(1000);
  s = await st(page);
  check(near(s.pose, FIT.local), `local: the computed local fit ${fmt(s.pose)}`);
  check((await feedback(page).innerText()).includes('תחום ההתאמה: האזור המסומן.'), 'local: "תחום ההתאמה: האזור המסומן."');
  const insideLocal = await inset(page);
  await shot(page, '11-station3-local-inside');
  await radio(page, 'מחוץ לאזור').click();
  await page.waitForTimeout(500);
  s = await st(page);
  check(Math.abs(s.inspect - PROBES.outside) < 1e-3 && near(s.pose, FIT.local), 'the outside check point, same fit');
  const outsideLocal = await inset(page);
  const len = (a) => Math.hypot(a.line[2] - a.line[0], a.line[3] - a.line[1]);
  check(!!outsideLocal.line && (!insideLocal.line || len(outsideLocal) > len(insideLocal)), `local: the gap outside the region is larger than inside it (arrow ${insideLocal.line ? len(insideLocal).toFixed(0) : 'none'} → ${outsideLocal.line ? len(outsideLocal).toFixed(0) : 'none'} px)`);
  check(/מחוץ לאזור/.test(await feedback(page).innerText()), 'the feedback reports the check point');
  await shot(page, '12-station3-local-outside');
  await radio(page, 'דאטום עולמי').click();
  await page.waitForTimeout(1000);
  s = await st(page);
  check(near(s.pose, FIT.global) && Math.abs(s.inspect - PROBES.outside) < 1e-3, 'the same check point serves both fits');
  await shot(page, '13-station3-global-outside');
  // the other check point on the globe is a pointer alternative to the radio group
  {
    const alt = page.locator(`${stageSel} > div[aria-hidden].cursor-pointer`);
    if ((await alt.count()) === 1 && (await alt.evaluate((el) => el.style.opacity)) === '1') {
      await alt.click();
      await page.waitForTimeout(400);
      check(Math.abs((await st(page)).inspect - PROBES.inside) < 1e-3, 'clicking the other check point on the globe chooses it');
    } else notes.push('--  the other check point is out of view at this camera — not clicked');
  }

  // ── 2 → 3 → 2: the experiment is where it was left, nothing plays ──
  await station(page, 1).click();
  await page.waitForTimeout(1000);
  s = await st(page);
  check(s.playback === 'manual' && near(s.pose, saved, 1e-9), `station 2 keeps its experiment ${fmt(saved)}`);
  check((await panel(page, 1).locator('input[type=range]').count()) === 4, 'the experiment is still open');
  await page.waitForTimeout(800);
  check(near((await st(page)).pose, saved, 1e-9), 'coming back plays nothing');
  // "חזרה להדגמה" closes the parameters; focus lands on "נסו בעצמכם"
  await panel(page, 1).getByRole('button', { name: 'חזרה להדגמה' }).click();
  await page.waitForTimeout(900);
  check((await panel(page, 1).locator('input[type=range]').count()) === 0 && (await demoBtn(page).innerText()).trim() === 'הפעלת ההדגמה', '"חזרה להדגמה" closes the experiment; the demo is ready again');
  check(await page.evaluate(() => document.activeElement?.textContent?.trim() === 'נסו בעצמכם'), 'focus returns to "נסו בעצמכם"');

  // ── camera: background drag rotates (inside its limits); wheel only once engaged ──
  const bb = await canvas.boundingBox();
  const before = await canvas.screenshot();
  await page.mouse.move(bb.x + 120, bb.y + 60);
  await page.mouse.down();
  await page.mouse.move(bb.x + 260, bb.y + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await shot(page, '14-camera-rotated');
  check(!before.equals(await canvas.screenshot()), 'background drag rotates the camera');
  // a long drag stops at the azimuth limit: the open quarter stays toward the viewer
  for (let k = 0; k < 2; k++) {
    await page.mouse.move(bb.x + 40, bb.y + 200);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width - 20, bb.y + 200, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  const limit1 = await canvas.screenshot();
  await page.mouse.move(bb.x + 40, bb.y + 200);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width - 20, bb.y + 200, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  check((await diff(limit1, await canvas.screenshot())) < 1.5, 'turning stops at its limit (the model stays in view)');
  await page.mouse.click(10, 600); // outside
  const y0 = await page.evaluate(() => window.scrollY);
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
  const y1 = await page.evaluate(() => window.scrollY);
  check(y1 > y0, `wheel scrolls the lesson while the stage is not engaged (${y0} → ${y1})`);
  await align(page);

  // ── keyboard ──
  await station(page, 0).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check((await station(page, 0).getAttribute('aria-expanded')) === 'true' && (await st(page)).station === '0', 'Enter opens a station');
  await radio(page, 'פני השטח').click();
  await page.keyboard.press('ArrowLeft');
  check((await radio(page, 'גיאואיד').getAttribute('aria-checked')) === 'true', '← moves the surface choice (RTL)');
  const marker = blk(page).getByRole('slider', { name: 'נקודת הבדיקה' });
  const v0 = await marker.getAttribute('aria-valuenow');
  await marker.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  check(v0 !== (await marker.getAttribute('aria-valuenow')), 'the inspection point moves with the keyboard (stations 1–2)');
  await station(page, 2).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await radio(page, 'באזור המסומן').click();
  await page.keyboard.press('ArrowLeft');
  check((await radio(page, 'מחוץ לאזור').getAttribute('aria-checked')) === 'true', '← moves the check point choice');
  check((await blk(page).getByRole('slider', { name: 'נקודת הבדיקה' }).count()) === 0, 'station 3: the marker is not a free slider (two fixed check points)');
  // closing the open station's text keeps the station and its view
  await station(page, 2).click();
  await page.waitForTimeout(500);
  check((await station(page, 2).getAttribute('aria-expanded')) === 'false' && (await st(page)).station === '2', 'closing the text keeps the station');

  // ── scroll through the block ──
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.includes('דאטום: התאמת'));
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 96);
  });
  await page.waitForTimeout(600);
  await shot(page, '15-scroll-top');
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(800);
  await shot(page, '16-scroll-cards');

  // leave the lesson (client-side, as a learner would) — the stage's GPU resources are released — and come back
  if (SKIP_LEAVE) console.log('--  SKIPPED: leaving the lesson and re-entering it (QA_SKIP_LEAVE=1)');
  else {
    const glIn = await page.evaluate(() => ({ ...window.__datumGL }));
    await page.getByRole('link', { name: 'בית', exact: true }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('topic-02'), { timeout: 60000 });
    await page.waitForTimeout(1500);
    const glOut = await page.evaluate(() => ({ ...window.__datumGL }));
    // three keeps 4 placeholder textures of its own per renderer; they go with the context
    const liveTex = glIn.createTexture - glIn.deleteTexture;
    const liveBuf = glIn.createBuffer - glIn.deleteBuffer;
    check(glOut.lost > glIn.lost && glOut.deleteTexture - glIn.deleteTexture >= liveTex - 4 && glOut.deleteBuffer - glIn.deleteBuffer >= 0.8 * liveBuf,
      `leaving the lesson releases the stage (context released; textures ${glOut.deleteTexture - glIn.deleteTexture} of ${liveTex} deleted explicitly, buffers ${glOut.deleteBuffer - glIn.deleteBuffer} of ${liveBuf})`);
    await page.goBack({ waitUntil: 'networkidle' });
    await reach(page);
    await page.waitForSelector(`${stageSel} canvas`, { timeout: 60000 });
    await page.waitForTimeout(2500);
    s = await st(page);
    check(s.station === '0' && near(s.pose, OVERVIEW), 're-entering the lesson starts at station 1');
  }

  report('main', errors, warnings);
  await ctx.close();
  void b;
}

/* ───────── reduced motion ───────── */
{
  const { ctx, page, errors, warnings } = await open({ reducedMotion: 'reduce' });
  await station(page, 1).click();
  await page.waitForTimeout(150);
  check(near((await st(page)).pose, DEMO_START), 'reduced motion: opening a station switches the view at once');
  const labels = [];
  for (const phase of ['shift', 'rotate', 'scale']) {
    await demoBtn(page).click();
    const a = await st(page);
    await page.waitForTimeout(900);
    const c = await st(page);
    labels.push((await demoBtn(page).innerText()).trim());
    check(near(a.pose, c.pose, 1e-9), `reduced motion: one click per phase, nothing animates (${phase} ${fmt(c.pose)})`);
    if (phase !== 'scale') check(c.phase === phase, `reduced motion: the click shows "${phase}"`);
  }
  check(labels[0] === 'לשלב הבא' && labels[1] === 'לשלב הבא' && labels[2] === 'הדגמה חוזרת', `reduced motion: the same button reads "לשלב הבא", then "הדגמה חוזרת" (${labels.join(' / ')})`);
  check(near((await st(page)).pose, FIT.global), 'reduced motion: the clicks reach the computed fit');
  await align(page);
  await shot(page, '17-reduced-motion');
  await station(page, 2).click();
  await page.waitForTimeout(150);
  await radio(page, 'דאטום מקומי').click();
  await page.waitForTimeout(100);
  check(near((await st(page)).pose, FIT.local), 'reduced motion: global ↔ local is instant');
  report('reduced', errors, warnings);
  await ctx.close();
}

/* ───────── no WebGL ───────── */
{
  const { b, ctx, page, errors, warnings } = await open({ webgl: false });
  check((await page.locator(`${stageSel} canvas`).count()) === 0, 'no WebGL: no canvas');
  const svg = page.locator(`${stageSel} svg[role=img]`);
  check((await svg.count()) === 1, 'no WebGL: the live SVG section is shown');
  check(!/%|אחוז/.test(await svg.getAttribute('aria-label')), 'no WebGL: the section’s description has no score');
  {
    const a = await inset(page);
    check(a.paths >= 8 && a.blue > 300 && a.orange > 300, `no WebGL: the close-up draws its bands in SVG (${a.paths} paths)`);
  }
  const svg0 = await svg.innerHTML();
  await radio(page, 'גיאואיד').click();
  await page.waitForTimeout(300);
  const svg1 = await svg.innerHTML();
  check(svg0 !== svg1 && (await svg.getAttribute('aria-label')).includes('גיאואיד'), 'no WebGL: choosing a surface changes the live section and its description');
  await station(page, 1).click();
  await page.waitForTimeout(800);
  await demoBtn(page).click();
  await page.waitForTimeout(2000);
  check(!near((await st(page)).pose, DEMO_START, 1), 'no WebGL: the demo button drives the section');
  await demoBtn(page).click();
  await panel(page, 1).getByRole('button', { name: 'נסו בעצמכם' }).click();
  await panel(page, 1).getByRole('button', { name: 'הצגת התאמה' }).click();
  await page.waitForTimeout(1500);
  check(near((await st(page)).pose, FIT.global), 'no WebGL: the experiment still drives the section');
  await align(page);
  await shot(page, '18-no-webgl-experiment');
  await station(page, 2).click();
  await page.waitForTimeout(1000);
  await radio(page, 'דאטום מקומי').click();
  await page.waitForTimeout(1000);
  check(near((await st(page)).pose, FIT.local) && (await svg.locator(':scope > circle').count()) === 2, 'no WebGL: local and both check points on the section');
  await shot(page, '19-no-webgl-local');
  report('no-webgl', errors, warnings);
  await ctx.close();
  await b.close();
}

function report(label, errors, warnings) {
  const three = warnings.filter((w) => /THREE\.Clock/.test(w)).length;
  const other = warnings.filter((w) => !/THREE\.Clock/.test(w));
  if (errors.length) fail(`${label}: console/page errors:\n  ${errors.slice(0, 10).join('\n  ')}`);
  else notes.push(`ok  ${label}: no console or page errors`);
  if (three) notes.push(`--  ${label}: ${three}× THREE.Clock deprecation warning (from @react-three/fiber)`);
  if (other.length) notes.push(`--  ${label}: warnings:\n  ${other.slice(0, 6).join('\n  ')}`);
}

await browser.close();
console.log(notes.join('\n'));
if (failures.length) {
  console.log(`\nFAIL (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nPASS');
