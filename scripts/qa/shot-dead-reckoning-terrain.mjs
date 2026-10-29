// Visual QA for the dead-reckoning sandstorm's ground, wadi and dust: the same poses every run, so a before and
// an after can be laid side by side, plus a rotation sweep (no stretch), a frame mid-walk and the frame rate.
//
// Usage (dev server running):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-dead-reckoning-terrain.mjs [outDir] [--base=http://localhost:3000]
//
// Poses (metres along the 62° line from A, the look's yaw and pitch):
//   A, the 400 stop facing the wadi, near its bank, looking along it both ways, in its bed, past it looking back.
// Checks (exit code 1 on any failure):
//   rotation   at one spot, eight yaws, during a real drag and in the middle of a walk: a point 20° right of the
//              look projects to the same pixel — the view never stretches as it turns or moves
//   walk       a segment still takes ~1.4 s and ends on the counted distance
//   console    no page errors, no shader errors
//   numbers    fps standing, turning and walking (a clean segment too); draw calls and triangles (metrics.json)
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { AZIMUTH_DEG, STEP_PAIRS, PACE_M } from '../../src/components/lessons/topic-06/dead-reckoning/deadReckoningModel.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/dead-reckoning-terrain';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-06/#scene-combatnav`;
await mkdir(outDir, { recursive: true });

const failures = [];
const check = (cond, m) => (cond ? console.log('ok  ', m) : (failures.push(m), console.log('FAIL', m)));
const DR = '[data-activity="dead-reckoning"]';
const VIEW = `${DR} [data-panel="dr-view"]`;

const POSES = [
  ['01-depart-A', 0, AZIMUTH_DEG, -4],
  ['02-stop400-facing-wadi', 600, AZIMUTH_DEG, -4],
  ['03-near-bank', 607, AZIMUTH_DEG, -8],
  ['04-bank-look-se', 607, 140, -6],
  ['05-bank-look-nw', 607, 320, -6],
  ['06-in-bed-along', 615, 140, -2],
  ['07-crossing-ahead', 613, AZIMUTH_DEG, 0],
  ['08-past-look-back', 628, AZIMUTH_DEG + 180, -6],
  ['09-past-ahead', 640, AZIMUTH_DEG, -4],
  ['10-plain-side', 300, AZIMUTH_DEG + 90, -4],
];

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const metrics = {};
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || /Shader Error|WebGLProgram|Context Lost/.test(m.text())) errors.push(m.text().slice(0, 600));
  });
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(DR, { timeout: 150000 });
  const align = () => page.evaluate((s) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' }), DR);
  await align();
  const t0 = Date.now();
  await page.waitForSelector(`${DR} [data-view-ready]`, { timeout: 150000 });
  metrics.firstFrameMs = Date.now() - t0;

  // Through the planning to the road: the map closes, the view is the field.
  await page.locator(`${DR} [data-count-input]`).fill('800');
  await page.locator(DR).getByRole('button', { name: 'בדיקה' }).click();
  const slider = page.locator(`${DR} [data-travel-compass][role="slider"]`);
  await slider.focus();
  for (let k = 0; k < 6; k++) await page.keyboard.press('PageUp');
  for (let k = 0; k < 2; k++) await page.keyboard.press('ArrowRight');
  await page.locator(DR).getByRole('button', { name: 'יציאה לדרך' }).click();
  await page.waitForTimeout(1500);
  await align();

  /** Place the eye, wait until the ground around it is built and drawn. */
  const place = async (m, yaw, pitch) => {
    await page.evaluate(([m, y, p]) => window.__drDev.place(m, y, p), [m, yaw, pitch]);
    let last = -1;
    for (let k = 0; k < 40; k++) {
      await page.waitForTimeout(150);
      const n = await page.evaluate(() => window.__drScene.chunks());
      if (n === last) break;
      last = n;
    }
    await page.waitForTimeout(700);
  };
  const box = await page.locator(VIEW).boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };

  for (const [name, m, yaw, pitch] of POSES) {
    await place(m, yaw, pitch);
    await page.screenshot({ path: `${outDir}/${name}.png`, clip });
  }
  await page.screenshot({ path: `${outDir}/00-card-near-wadi.png` });

  // Standing still.
  await place(600, AZIMUTH_DEG, -4);
  const fpsOver = (ms, fn) =>
    page.evaluate(
      ([ms, body]) =>
        new Promise((res) => {
          const act = body ? new Function('t', body) : () => {};
          let n = 0;
          const t0 = performance.now();
          let worst = 0;
          let long = 0;
          let prev = t0;
          const tick = (now) => {
            n += 1;
            worst = Math.max(worst, now - prev);
            if (now - prev > 34) long += 1;
            prev = now;
            act((now - t0) / 1000);
            if (now - t0 < ms) requestAnimationFrame(tick);
            else res({ fps: Math.round((n * 1000) / (now - t0)), worstFrameMs: Math.round(worst), framesOver34ms: long });
          };
          requestAnimationFrame(tick);
        }),
      [ms, fn ?? null],
    );
  metrics.standing = await fpsOver(3000);
  metrics.renderInfo = await page.evaluate(() => window.__drScene.renderInfo?.());

  /** Where a point 10 m away, 20° right of the current look, at eye height, lands on the canvas (x px). */
  const offsetPx = () =>
    page.evaluate(() => {
      const cam = window.__drScene.camera();
      const a = ((cam.yaw + 20) * Math.PI) / 180;
      // scene → E/N: E = x + 230, N = −z + 140
      return window.__drScene.project(cam.x + Math.sin(a) * 10 + 230, -(cam.z - Math.cos(a) * 10) + 140, cam.y)[0];
    });

  // Rotation sweep: the same angular offset lands on the same pixel at every yaw (no stretch), and the frames.
  const sweep = [];
  for (let yaw = 0; yaw < 360; yaw += 45) {
    await page.evaluate(([y]) => window.__drDev.place(600, y, -4), [yaw]);
    await page.waitForTimeout(500);
    sweep.push({ yaw, px: await offsetPx() });
    await page.screenshot({ path: `${outDir}/rot-${String(yaw).padStart(3, '0')}.png`, clip });
  }
  const pxs = sweep.map((s) => s.px);
  const spread = Math.max(...pxs) - Math.min(...pxs);
  check(spread < 1.5, `rotation: 20° right of the look lands at ${pxs.map((p) => p.toFixed(1)).join(', ')} px (spread ${spread.toFixed(2)})`);
  metrics.rotationPx = sweep;
  const restPx = pxs[0];
  // The same with a real drag on the view, read while the pointer is still down.
  {
    await page.evaluate(() => window.__drDev.place(600, 62, -4));
    await page.waitForTimeout(400);
    const surf = await page.locator(`${DR} [data-look-surface]`).boundingBox();
    const cx = surf.x + surf.width / 2;
    const cy = surf.y + surf.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    const during = [];
    for (let k = 1; k <= 6; k++) {
      await page.mouse.move(cx + k * 60, cy, { steps: 4 });
      // the camera takes the new look on the next frame
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      during.push(await offsetPx());
    }
    await page.screenshot({ path: `${outDir}/drag-mid.png`, clip });
    await page.mouse.up();
    const yawAfter = await page.evaluate(() => window.__drScene.camera().yaw);
    const dspread = Math.max(...during, restPx) - Math.min(...during, restPx);
    check(Math.abs(((yawAfter - 62 + 540) % 360) - 180) > 10 && dspread < 1.5, `drag: the head turned to ${yawAfter.toFixed(0)}°, the view never stretched (spread ${dspread.toFixed(2)} px)`);
  }
  // Turning continuously (as a drag does): 90° a second.
  await page.evaluate(() => window.__drDev.place(600, 0, -4));
  metrics.turning = await fpsOver(3000, 'window.__drDev.place(600, (t * 90) % 360, -4)');

  // A walk segment: back to the 400 stop as the activity left it, then one press (mid-walk frame at ~0.7 s).
  await page.evaluate(() => window.__drDev.place(0, 62, -4));
  await page.waitForTimeout(1500);
  const w0 = Date.now();
  const walk = fpsOver(2600);
  await page.locator(`${DR} [data-advance="walk"]`).click();
  await page.waitForTimeout(500);
  const midPx = await offsetPx();
  const midMoving = await page.evaluate(() => window.__dr.state.moving);
  check(midMoving && Math.abs(midPx - restPx) < 1.5, `walk: mid-segment the view keeps its shape (${midPx.toFixed(1)} px, at rest ${restPx.toFixed(1)})`);
  await page.screenshot({ path: `${outDir}/walk-mid.png`, clip });
  await page.waitForFunction(() => window.__dr && !window.__dr.state.moving && window.__dr.state.pairs === 100, null, { timeout: 15000 });
  const walkMs = Date.now() - w0;
  metrics.walking = await walk;
  metrics.walkMs = walkMs;
  check(walkMs < 2400, `walk: one segment of ${STEP_PAIRS} pairs took ${walkMs} ms (1.4 s animation)`);
  const cam = await page.evaluate(() => window.__drScene.camera());
  check(Math.abs(Math.hypot(cam.x, cam.z) - STEP_PAIRS * PACE_M) < 0.05, `walk: the eye ends ${Math.hypot(cam.x, cam.z).toFixed(2)} m from A`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/walk-end-150.png`, clip });
  // A second segment with nothing else going on (no screenshot inside it): the clean frame times of a walk.
  await page.waitForTimeout(1500);
  const clean = fpsOver(2200);
  await page.locator(`${DR} [data-advance="walk"]`).click();
  metrics.walkingClean = await clean;
  await page.waitForFunction(() => window.__dr && !window.__dr.state.moving && window.__dr.state.pairs === 200, null, { timeout: 15000 });

  check(errors.length === 0, `console: ${errors.length ? errors.join(' | ') : 'no page errors'}`);
  await ctx.close();
} finally {
  await browser.close();
}
await writeFile(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
