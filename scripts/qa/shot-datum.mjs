// QA for the guided 3-D datum block (topic-02 #scene-coordinates,
// design/mockups/datum-concepts/claude-guided-3d-prompt.md §11).
//
// Usage (dev server on :3000):
//   node scripts/qa/shot-datum.mjs [outDir]          (QA_BASE=http://localhost:3005 for another server)
//
// Drives every station and control at 1440 × 1122 and fails (exit 1) on:
//   - console / page errors (three's own "THREE.Clock" deprecation warning is
//     reported, not failed — it comes from @react-three/fiber, every 3-D scene);
//   - a demo that loops, auto-advances, or keeps moving after a manual action;
//   - the score / pose not following the controls;
//   - missing fallback (no WebGL) or reduced-motion behaviour;
//   - a close-up that does not follow the pose, has no bands, or puts the
//     measured points outside its circle;
//   - textures or GPU buffers created while the demo plays (per-frame allocation).
// Screenshots: the three stations, demo mid-run, manual mode, local datum,
// reduced motion, no-WebGL fallback, and the block scrolled through.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const outDir = process.argv[2] || 'design/screenshots/datum-guided';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
/** QA_SKIP_LEAVE=1: skip leaving the lesson and coming back — only for a shared dev
    server whose OTHER routes are broken (reported as skipped, never as passed). */
const SKIP_LEAVE = process.env.QA_SKIP_LEAVE === '1';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
await mkdir(outDir, { recursive: true });

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
const radio = (page, name) => blk(page).getByRole('radio', { name });
const scrubber = (page) => blk(page).getByRole('slider', { name: 'התקדמות ההדגמה' });

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

async function read(page) {
  return page.evaluate(() => {
    const scope = [...document.querySelectorAll('h3')].find((h) => h.textContent.includes('דאטום: התאמת')).parentElement;
    const label = [...scope.querySelectorAll('span')].find((s) => /^התאמה (לכל כדור הארץ|לאזור המסומן)$/.test(s.textContent.trim()));
    const score = label ? Number(label.parentElement.textContent.match(/(\d+)%/)?.[1]) : NaN;
    const range = scope.querySelector('input[aria-label="התקדמות ההדגמה"]');
    const xs = [...scope.querySelectorAll('input[type=range]')].map((i) => ({ v: i.value, t: i.getAttribute('aria-valuetext') }));
    return { score, progress: range ? Number(range.value) / 1000 : NaN, ranges: xs, label: label?.textContent };
  });
}

/* ───────── main run ───────── */
{
  const { b, ctx, page, errors, warnings } = await open();

  // station 1 — opening state: demo stopped, station 1 open, surface selected
  check(await station(page, 0).getAttribute('aria-expanded') === 'true', 'station 1 open at start');
  check(await radio(page, 'פני השטח').getAttribute('aria-checked') === 'true', 'surface selected at start');
  const r0 = await read(page);
  check(r0.score === 0, `START score 0 (got ${r0.score})`);
  check(r0.progress === 0, 'demo not started');
  await page.waitForTimeout(1500);
  check((await read(page)).progress === 0, 'no autoplay');
  await shot(page, '01-station1-surface');
  await radio(page, 'גיאואיד').click();
  await page.waitForTimeout(500);
  await shot(page, '02-station1-geoid');
  await radio(page, 'אליפסואיד').click();
  await page.waitForTimeout(400);
  await shot(page, '03-station1-ellipsoid');

  // station 2 — opening focuses the ellipsoid
  await station(page, 1).click();
  await page.waitForTimeout(700);
  check(await station(page, 0).getAttribute('aria-expanded') === 'false', 'only one station open');
  check(await radio(page, 'אליפסואיד').getAttribute('aria-checked') === 'true', 'station 2 focuses the ellipsoid');
  await align(page);
  await shot(page, '04-station2-open');

  // play → mid → pause holds → resume → end stays
  const gl0 = await page.evaluate(() => ({ ...window.__datumGL }));
  await panel(page, 1).getByRole('button', { name: 'הפעלת ההדגמה' }).click();
  await page.waitForTimeout(3200);
  const gl1 = await page.evaluate(() => ({ ...window.__datumGL }));
  check(gl0.createTexture > 0 && gl1.createTexture === gl0.createTexture && gl1.createBuffer === gl0.createBuffer,
    `no textures / buffers created while the demo plays (textures ${gl0.createTexture}→${gl1.createTexture}, buffers ${gl0.createBuffer}→${gl1.createBuffer})`);
  const pauseBtn = blk(page).getByRole('button', { name: 'השהיה' });
  check(await pauseBtn.isEnabled(), 'pause available while playing');
  await pauseBtn.click();
  const mid = await read(page);
  check(mid.progress > 0.25 && mid.progress < 0.75, `paused mid-demo (progress ${mid.progress})`);
  await page.waitForTimeout(1200);
  check((await read(page)).progress === mid.progress, 'pause holds in place');
  await shot(page, '05-station2-demo-paused');
  {
    const a = await inset(page);
    check(a.blue > 300 && a.orange > 300, `close-up draws both bands (blue ${a.blue}px, orange ${a.orange}px)`);
    check(!!a.line && inCircle(a.box, a.line[0], a.line[1], 6) && inCircle(a.box, a.line[2], a.line[3], 6), 'the gap arrow and both measured points are inside the close-up');
    check(a.paths <= 2, `with WebGL the close-up's SVG holds only the arrow and points (${a.paths} paths)`);
  }
  await blk(page).getByRole('button', { name: 'המשך' }).click();
  await page.waitForTimeout(6500);
  const end = await read(page);
  check(end.progress === 1, `demo reaches the end (${end.progress})`);
  check(end.score === 100, `fit at the end: 100 (got ${end.score})`);
  await page.waitForTimeout(1500);
  const after = await read(page);
  check(after.progress === 1 && after.score === 100, 'end stays — no loop');
  check(await station(page, 1).getAttribute('aria-expanded') === 'true' && (await station(page, 2).getAttribute('aria-expanded')) === 'false', 'no auto-advance to station 3');
  await shot(page, '06-station2-demo-end');

  // scrub
  const sb = await scrubber(page).boundingBox();
  await page.mouse.click(sb.x + sb.width * 0.3, sb.y + sb.height / 2);
  await page.waitForTimeout(400);
  const sc = await read(page);
  check(sc.progress > 0.2 && sc.progress < 0.4, `scrub moves the timeline (${sc.progress})`);
  check(sc.score < 100, `scrub moves the pose (score ${sc.score})`);

  // manual mid-demo
  await panel(page, 1).getByRole('button', { name: 'הפעלת ההדגמה' }).click();
  await page.waitForTimeout(2500);
  await panel(page, 1).getByRole('button', { name: 'נסו בעצמכם' }).click();
  await page.waitForTimeout(300);
  const m1 = await read(page);
  await page.waitForTimeout(1500);
  const m2 = await read(page);
  check(m1.progress === m2.progress, 'manual mode stops the demo');
  const sliders = panel(page, 1).locator('input[type=range]');
  check((await sliders.count()) === 4, 'four sliders in manual mode');
  const rot = panel(page, 1).getByRole('slider').nth(2);
  await rot.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  const before3 = await inset(page);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  const m3 = await read(page);
  check(m3.ranges[2].t !== m2.ranges[2].t, `keyboard moves the rotation slider (${m2.ranges[2].t} → ${m3.ranges[2].t})`);
  check(!before3.png.equals((await inset(page)).png), 'the close-up follows the pose (live, not a picture)');
  await align(page);
  await shot(page, '07-station2-manual');
  await panel(page, 1).getByRole('button', { name: 'איפוס' }).click();
  await page.waitForTimeout(300);
  check((await read(page)).score === 0, 'reset returns to START');
  await panel(page, 1).getByRole('button', { name: 'הצגת התאמה' }).click();
  await page.waitForTimeout(1500);
  check((await read(page)).score === 100, 'show fit → 100');

  // station 3 — local keeps the pose, changes the measure
  await station(page, 2).click();
  await page.waitForTimeout(700);
  await panel(page, 2).getByRole('button', { name: 'דאטום מקומי' }).click();
  await page.waitForTimeout(500);
  const loc = await read(page);
  check(loc.label === 'התאמה לאזור המסומן', 'local measure label');
  check(loc.score === 60, `global fit over the marked arc: 60 (got ${loc.score})`);
  await align(page);
  await shot(page, '08-station3-local-kept-pose');
  await panel(page, 2).getByRole('button', { name: 'הצגת התאמה' }).click();
  await page.waitForTimeout(1500);
  check((await read(page)).score === 100, 'local show fit → 100');
  await shot(page, '09-station3-local-fit');
  await panel(page, 2).getByRole('button', { name: 'חזרה להדגמה' }).click();
  await page.waitForTimeout(300);
  await panel(page, 2).getByRole('button', { name: 'הפעלת ההדגמה' }).click();
  await page.waitForTimeout(7800);
  check((await read(page)).score === 100, 'local demo ends on the local fit');
  await panel(page, 2).getByRole('button', { name: 'דאטום עולמי' }).click();
  await page.waitForTimeout(300);
  check((await read(page)).score === 0, 'global measure of the local fit: 0 (pose kept)');
  await shot(page, '10-station3-global-of-local');

  // camera: background drag rotates, "החזרת המבט" restores, wheel only once engaged
  const stage = page.locator(`${stageSel} canvas`);
  const bb = await stage.boundingBox();
  const before = await stage.screenshot();
  await page.mouse.move(bb.x + 120, bb.y + 60);
  await page.mouse.down();
  await page.mouse.move(bb.x + 260, bb.y + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await shot(page, '11-camera-rotated');
  const rotated = await stage.screenshot();
  check(!before.equals(rotated), 'background drag rotates the camera');
  await blk(page).getByRole('button', { name: 'החזרת המבט' }).click();
  await page.waitForTimeout(1200);
  check((await read(page)).score === 0, 'restoring the view keeps the pose / learning state');

  // wheel over the stage without engaging must scroll the lesson
  await page.mouse.click(10, 600); // outside
  const y0 = await page.evaluate(() => window.scrollY);
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
  const y1 = await page.evaluate(() => window.scrollY);
  check(y1 > y0, `wheel scrolls the lesson while the stage is not engaged (${y0} → ${y1})`);
  await align(page);

  // fullscreen: enter, then leave. Escape is the browser's own exit (it does
  // not reach a headless page), so the test leaves with the same button and
  // checks that focus is returned to it.
  const fsBtn = blk(page).getByRole('button', { name: 'מסך מלא' });
  await fsBtn.click();
  await page.waitForTimeout(800);
  const fs = await page.evaluate(() => !!document.fullscreenElement);
  check(fs, 'fullscreen enters on the stage');
  if (fs) {
    await shot(page, '12-fullscreen');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (await page.evaluate(() => !!document.fullscreenElement)) {
      notes.push('--  Escape is handled by the browser chrome (not in headless) — leaving with the button');
      await blk(page).getByRole('button', { name: 'יציאה ממסך מלא' }).click();
      await page.waitForTimeout(800);
    }
    check(!(await page.evaluate(() => !!document.fullscreenElement)), 'fullscreen exits');
    check(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'מסך מלא'), 'focus is on the fullscreen button after leaving');
  }
  await align(page);

  // keyboard: station headers and the surface radios are reachable
  await station(page, 0).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check(await station(page, 0).getAttribute('aria-expanded') === 'true', 'Enter opens a station');
  await radio(page, 'פני השטח').click();
  await page.keyboard.press('ArrowLeft');
  check(await radio(page, 'גיאואיד').getAttribute('aria-checked') === 'true', '← moves the surface selection (RTL)');

  // inspection point: keyboard + drag
  const marker = blk(page).getByRole('slider', { name: 'נקודת הבדיקה' });
  const v0 = await marker.getAttribute('aria-valuenow');
  await marker.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  const v1 = await marker.getAttribute('aria-valuenow');
  check(v0 !== v1, `inspection point moves with the keyboard (${v0} → ${v1})`);

  // scroll through the block — the copy stays readable
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.includes('דאטום: התאמת'));
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 96);
  });
  await page.waitForTimeout(600);
  await shot(page, '13-scroll-top');
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(800);
  await shot(page, '14-scroll-cards');

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
  check((await read(page)).score === 0, 're-entering the lesson starts at START');
  }

  report('main', errors, warnings);
  await ctx.close();
  void b;
}

/* ───────── reduced motion ───────── */
{
  const { ctx, page, errors, warnings } = await open({ reducedMotion: 'reduce' });
  await station(page, 1).click();
  await page.waitForTimeout(400);
  await panel(page, 1).getByRole('button', { name: 'הפעלת ההדגמה' }).click();
  const a = await read(page);
  await page.waitForTimeout(1200);
  const c = await read(page);
  check(a.progress > 0 && a.progress === c.progress, `reduced motion: a click shows the next stage, nothing animates (${a.progress})`);
  await blk(page).getByRole('button', { name: 'המשך' }).click();
  await blk(page).getByRole('button', { name: 'המשך' }).click();
  check((await read(page)).score === 100, 'reduced motion: clicks reach the final fit');
  await align(page);
  await shot(page, '15-reduced-motion');
  report('reduced', errors, warnings);
  await ctx.close();
}

/* ───────── no WebGL ───────── */
{
  const { b, ctx, page, errors, warnings } = await open({ webgl: false });
  check((await page.locator(`${stageSel} canvas`).count()) === 0, 'no WebGL: no canvas');
  check((await page.locator(`${stageSel} svg[role=img][aria-label^="גיאואיד גלי"]`).count()) === 1, 'no WebGL: the live SVG section is shown');
  {
    const a = await inset(page);
    check(a.paths >= 8 && a.blue > 300 && a.orange > 300, `no WebGL: the close-up draws its bands in SVG (${a.paths} paths)`);
  }
  await station(page, 1).click();
  await page.waitForTimeout(400);
  await panel(page, 1).getByRole('button', { name: 'נסו בעצמכם' }).click();
  await panel(page, 1).getByRole('button', { name: 'הצגת התאמה' }).click();
  await page.waitForTimeout(1500);
  check((await read(page)).score === 100, 'no WebGL: the controls still drive the exercise');
  await align(page);
  await shot(page, '16-no-webgl');
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
