// Browser QA for lesson 6 › טכניקות ניווט: the dead-reckoning activity in the sandstorm (first-person 3D),
// and the fit of both technique cards at 1440 × 1122 in their tallest states.
//
// Usage (dev server running):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-dead-reckoning.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   layout     one dominant first-person view (≥ 90 % of the card's width), the planning map on demand inside it
//   no answer  until the count is checked right, 800 is nowhere in the card — text, SVG or accessible names — the
//              counter reads "/ ?", the map has no 100-pair ticks; every reset withholds it again
//   flows      wrong counts named, then right; a wrong compass refused, then 062°; 100 pairs per press; the wadi
//              identified at 400 (wrong, then right); the finished count asks, never announces arrival; both
//              wrong decisions explained, the right one opens the map debrief; reset mid-walk and at the end
//   sync       at every stop the camera stands on the 62° line at the counted distance, 1.7 m over the ground,
//              the counter and the map's estimate agree with it
//   wadi       a real depression ahead of the 400 stop (its centre ~15 m ahead), named only once identified, and
//              its label gone at 500 (150 m later); nothing labels anything beyond sight
//   input      rapid presses count one segment; looking around and opening / closing the map change nothing of
//              the walk; closing the map returns focus to its button; the whole task with keys only
//   reduced    with reduced motion a segment is a cut
//   fallback   no WebGL: a labelled stand-in, no loader left; slow assets: the shared loader until the first frame
//   lifecycle  away to another sub-topic and back three times: one canvas, no errors
//   numbers    frames per second while walking, asset bytes and load time (reported)
//   fit        both cards end above 1122 px in every state
//   console    no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { LEGS } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavPractice.ts';
import { AZIMUTH_DEG, PACE_M, START, STEP_PAIRS, WADI_CROSSING_M, WADI_STOP_PAIRS, along, SHEET } from '../../src/components/lessons/topic-06/dead-reckoning/deadReckoningModel.ts';
import { eyeHeightAt, toScene } from '../../src/components/lessons/topic-06/dead-reckoning/deadReckoningTerrain.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/dead-reckoning-immersive';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-06/#scene-combatnav`;
await mkdir(`${outDir}/states`, { recursive: true });
await mkdir(`${outDir}/checks`, { recursive: true });
await mkdir(`${outDir}/terrain-fit`, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

const DR = '[data-activity="dead-reckoning"]';
const TA = '[data-activity="terrain-association"]';
const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

async function open(browser, { reduced = false, route } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  if (route) await route(page);
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(DR, { timeout: 150000 });
  await align(page, DR);
  return { ctx, page, errors };
}
const align = (page, sel) => page.evaluate((s) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' }), sel);
const bottom = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().bottom), sel);
const ready = (page) => page.waitForSelector(`${DR} [data-view-ready]`, { timeout: 150000 });
const shot = async (page, sel, file) => {
  await align(page, sel);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${file}` });
};
const fits = async (page, sel, label) => {
  await align(page, sel);
  await page.waitForTimeout(250);
  const b = await bottom(page, sel);
  check(b <= 1122, `fit · ${label}: card ends at ${b} px (≤ 1122)`);
  return b;
};
const st = (page) => page.evaluate(() => window.__dr.state);
const fb = (page) => page.locator(`${DR} [data-dr-feedback]`).getAttribute('data-dr-feedback');
const btn = (page, name) => page.locator(DR).getByRole('button', { name });
const counterText = (page) => page.locator(`${DR} [data-counter]`).innerText();
const typeCount = async (page, v) => {
  await page.locator(`${DR} [data-count-input]`).fill(String(v));
  await btn(page, 'בדיקה').click();
};
const setHeading = async (page, deg) => {
  // keys on the compass slider: the shortest way from the current setting
  const slider = page.locator(`${DR} [data-travel-compass][role="slider"]`);
  await slider.focus();
  let cur = (await st(page)).heading;
  let d = ((deg - cur + 540) % 360) - 180;
  while (Math.abs(d) >= 10) {
    await page.keyboard.press(d > 0 ? 'PageUp' : 'PageDown');
    d -= d > 0 ? 10 : -10;
  }
  while (d !== 0) {
    await page.keyboard.press(d > 0 ? 'ArrowRight' : 'ArrowLeft');
    d -= Math.sign(d);
  }
  cur = (await st(page)).heading;
  return cur;
};
const settle = (page, pairs) => page.waitForFunction((p) => window.__dr && !window.__dr.state.moving && window.__dr.state.pairs === p, pairs, { timeout: 30000 });
const advance = async (page) => {
  const before = (await st(page)).pairs;
  await page.locator(`${DR} [data-advance="walk"]`).click();
  await settle(page, before + STEP_PAIRS);
  await page.waitForTimeout(350);
};
/** Every 800 in the card outside the learner's own input: text (shown or screen-reader only, SVG included) and accessible names. */
const countLeaks = (page) =>
  page.locator(DR).evaluate((root) => {
    const re = /(?<![\d,.])800(?!\d)/;
    const hits = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t; (t = walk.nextNode()); ) if (re.test(t.textContent)) hits.push(t.textContent.trim().slice(0, 50));
    for (const el of root.querySelectorAll('*'))
      for (const a of ['aria-label', 'aria-valuetext', 'aria-description', 'title', 'alt'])
        if (re.test(el.getAttribute(a) ?? '')) hits.push(`${a}: ${el.getAttribute(a).slice(0, 50)}`);
    return hits;
  });
/** The camera against the model at the current stop. */
const syncAt = async (page, label) => {
  const s = await st(page);
  const m = s.pairs * PACE_M;
  const p = along(m);
  const [x, , z] = toScene(p.E, p.N, 0);
  const cam = await page.evaluate(() => window.__drScene.camera());
  const eye = eyeHeightAt(p.E, p.N);
  check(Math.hypot(cam.x - x, cam.z - z) < 0.05, `sync · ${label}: camera on the line at ${m} m (off by ${Math.hypot(cam.x - x, cam.z - z).toFixed(3)} m)`);
  check(Math.abs(cam.y - eye) < 0.02, `sync · ${label}: eye ${(cam.y - eye + 1.7).toFixed(2)} m over the ground`);
  const txt = (await counterText(page)).replace(/\s+/g, ' ');
  check(txt.includes(`${s.pairs.toLocaleString('en-US')} / `) && txt.includes(`כ־${m.toLocaleString('en-US')} מ׳`), `sync · ${label}: the counter reads ${s.pairs} pairs, ${m} m`);
};

const browser = await chromium.launch({ args: GPU });
const metrics = {};
try {
  // ================================================================ the whole task, mouse
  {
    const { ctx, page, errors } = await open(browser);
    const t0 = Date.now();
    await ready(page);
    metrics.firstFrameMs = Date.now() - t0;
    await page.waitForTimeout(1200);

    // layout
    const geo = await page.evaluate((s) => {
      const card = document.querySelector(s).getBoundingClientRect();
      const view = document.querySelector(`${s} [data-panel="dr-view"]`).getBoundingClientRect();
      return { card: card.width, view: view.width, viewH: view.height };
    }, DR);
    check(geo.view / geo.card > 0.9, `layout: the first-person view spans ${(100 * geo.view / geo.card).toFixed(0)} % of the card`);
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 1, 'layout: the planning map is open while planning');
    check((await page.locator(`${DR} canvas`).count()) === 1, 'layout: one live canvas');

    // no answer before the check
    check((await countLeaks(page)).length === 0, `no answer: nothing in the opening says 800 ${(await countLeaks(page)).join(' | ')}`);
    check((await page.locator(`${DR} [data-tick]`).count()) === 0, 'no answer: the map has no 100-pair ticks yet');
    check((await page.locator(`${DR} [data-count-target]`).innerText()) === '?', 'no answer: the counter target reads ?');
    await shot(page, DR, 'states/01-opening-prep.png');
    await fits(page, DR, 'opening');

    for (const [v, kind] of [
      [1800, 'count-multiplied'],
      [1600, 'count-single-steps'],
      [1200, 'count-metres'],
      [750, 'count-other'],
    ]) {
      await typeCount(page, v);
      check((await fb(page)) === kind, `count ${v}: feedback "${kind}"`);
      check((await countLeaks(page)).length === 0, `no answer: still withheld after ${v}`);
      if (v === 1800) await shot(page, DR, 'states/02-count-wrong.png');
      await fits(page, DR, `count ${v} wrong`);
    }
    await typeCount(page, 800);
    check((await st(page)).countChecked === 800 && (await page.locator(`${DR} [data-tick]`).count()) === 7, 'count 800: right — the map draws its ticks');
    check((await page.locator(`${DR} [data-count-target]`).innerText()) === '800', 'count 800: the counter target appears');

    // compass: a wrong setting is refused, the view turns with the setting
    await setHeading(page, 298);
    await page.waitForTimeout(900);
    const yaw298 = await page.evaluate(() => window.__dr.look.yaw);
    check(Math.abs(((yaw298 - 298 + 540) % 360) - 180) < 2, `compass 298°: the view turns with it (${yaw298.toFixed(1)}°)`);
    await btn(page, 'יציאה לדרך').click();
    check((await fb(page)) === 'heading-off' && (await st(page)).step === 'plan', 'compass 298°: refused, explained (counter-clockwise)');
    await fits(page, DR, 'compass wrong');
    await setHeading(page, AZIMUTH_DEG);
    check((await st(page)).heading === 62, 'compass: set to 062°');
    await shot(page, DR, 'states/03-compass-062.png');
    await btn(page, 'יציאה לדרך').click();
    await page.waitForTimeout(1500);
    let s = await st(page);
    check(s.step === 'walk' && s.pairs === 0, 'depart: under way from A');
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 0, 'depart: the map closes; the view is the field');
    await syncAt(page, 'A');
    await shot(page, DR, 'states/04-depart-A.png');

    // looking around changes nothing of the walk
    const surf = await page.locator(`${DR} [data-look-surface]`).boundingBox();
    await page.mouse.move(surf.x + surf.width / 2, surf.y + surf.height / 2);
    await page.mouse.down();
    await page.mouse.move(surf.x + surf.width / 2 - 260, surf.y + surf.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    s = await st(page);
    const lookYaw = await page.evaluate(() => window.__dr.look.yaw);
    check(Math.abs(((lookYaw - 62 + 540) % 360) - 180) > 20 && s.heading === 62 && s.pairs === 0, `look around: the head turns (${lookYaw.toFixed(0)}°), the walking azimuth stays 062°`);
    check((await page.locator(`${DR} [data-view-readout]`).getAttribute('aria-hidden')) !== 'true', 'look around: "כיוון המבט" is named apart from the walking direction');

    // rapid presses: one segment
    const adv = page.locator(`${DR} [data-advance="walk"]`);
    await adv.click();
    for (let k = 0; k < 4; k++) await adv.click({ force: true, timeout: 2000 }).catch(() => {});
    await settle(page, 100);
    await page.waitForTimeout(1500);
    s = await st(page);
    check(s.pairs === 100, `rapid presses: one segment counted (${s.pairs})`);
    const yawAfter = await page.evaluate(() => window.__dr.look.yaw);
    check(Math.abs(((yawAfter - 62 + 540) % 360) - 180) < 2, 'walking turns the head back to the walking direction');
    await syncAt(page, '100');

    await advance(page);
    await advance(page);
    await syncAt(page, '300');
    // the map's estimate agrees
    await page.locator(`${DR} [data-map-toggle]`).click();
    await page.waitForTimeout(500);
    const walked = Number(await page.locator(`${DR} [data-map-walked]`).getAttribute('data-map-walked'));
    check(walked === 450, `sync · 300: the map's estimate is at ${walked} m`);
    check(await page.evaluate(() => document.activeElement?.hasAttribute('data-map-close')), 'map: focus moves to its close button');
    await shot(page, DR, 'states/05-map-open-300.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 0 && (await page.evaluate(() => document.activeElement?.hasAttribute('data-map-toggle'))), 'map: Escape closes it, focus back on "מפת התכנון"');
    check((await st(page)).pairs === 300, 'map: opening and closing keeps the count');
    await shot(page, DR, 'states/06-walk-before-wadi-300.png');
    await fits(page, DR, 'walking');

    // the wadi
    await advance(page);
    s = await st(page);
    check(s.pairs === WADI_STOP_PAIRS, `wadi: the 400-pair stop`);
    await syncAt(page, '400');
    const ahead = WADI_CROSSING_M - s.pairs * PACE_M;
    check(ahead > 0 && ahead <= 30, `wadi: its centre line ${ahead} m ahead — inside the ~30 m of sight`);
    const proj = await page.evaluate(([E, N]) => window.__drScene.project(E, N, 0), [along(WADI_CROSSING_M).E, along(WADI_CROSSING_M).N]);
    const box = await page.locator(`${DR} [data-panel="dr-view"]`).boundingBox();
    check(proj[2] < 1 && proj[1] > 0 && proj[1] < box.height / 0.7827, `wadi: the crossing projects inside the view (${proj.map((v) => v.toFixed(1)).join(', ')})`);
    check((await page.locator(`${DR} [data-wadi-label]`).count()) === 0, 'wadi: not named before it is identified');
    check((await page.locator(`${DR} [data-advance="walk"]`).isDisabled()), 'wadi: identify it before walking on');
    await shot(page, DR, 'states/07-wadi-in-sight-400.png');
    await page.locator(`${DR} [data-compare-map]`).click();
    await page.waitForTimeout(600);
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 1, 'wadi: "השוואה למפה" opens the same planning map');
    await shot(page, DR, 'states/08-wadi-compare-map.png');
    await page.locator(`${DR} [data-map-close]`).click();
    await page.locator(`${DR} [data-radio="sign"] [data-option="road"]`).click();
    await btn(page, 'בדיקה').click();
    check((await fb(page)) === 'sign-road', 'wadi: "דרך עפר" is explained as wrong');
    await fits(page, DR, 'wadi wrong');
    await page.locator(`${DR} [data-radio="sign"] [data-option="wadi"]`).click();
    await btn(page, 'בדיקה').click();
    await page.waitForTimeout(700);
    check((await fb(page)) === 'sign-right', 'wadi: identified');
    check((await page.locator(`${DR} [data-wadi-label]`).count()) === 1, 'wadi: its label appears once identified');
    // The label's dot sits on its 3-D anchor (drei Html under RTL drifts a label-width otherwise).
    const dot = await page.locator(`${DR} [data-wadi-label] span`).last().boundingBox();
    const cv = await page.locator(`${DR} canvas`).evaluate((c) => ({ ...c.getBoundingClientRect().toJSON(), w: c.clientWidth }));
    const k = cv.width / cv.w;
    const [ax, ay] = await page.evaluate(() => window.__drScene.projectWadiLabel());
    const dx = dot.x + dot.width / 2 - (cv.x + ax * k);
    const dy = dot.y + dot.height / 2 - (cv.y + ay * k);
    check(Math.hypot(dx, dy) <= 3, `wadi: the label's dot on its anchor (off by ${dx.toFixed(1)}, ${dy.toFixed(1)} px)`);
    await shot(page, DR, 'states/09-wadi-identified.png');
    await fits(page, DR, 'wadi identified');

    await advance(page);
    await syncAt(page, '500');
    check((await page.locator(`${DR} [data-wadi-label]`).count()) === 0, 'wadi: no label 150 m later');
    check((await fb(page)) === 'past-wadi', 'after the wadi: it is behind, out of sight');
    await shot(page, DR, 'states/10-after-wadi-500.png');

    // a walk segment's frame rate
    const fps = await page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n += 1;
            if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
            else res((n * 1000) / (performance.now() - t0));
          };
          document.querySelector('[data-advance="walk"]').click();
          requestAnimationFrame(tick);
        }),
    );
    metrics.walkFps = Math.round(fps);
    await settle(page, 600);
    await advance(page);
    await advance(page);
    s = await st(page);
    check(s.step === 'verify' && s.pairs === 800, 'the count completes into a question, not an arrival');
    await syncAt(page, '800');
    check(!(await page.locator(DR).innerText()).includes('הגעתם'), 'no arrival is announced');
    await shot(page, DR, 'states/11-count-complete-800.png');
    await fits(page, DR, 'decision');
    for (const v of ['proof', 'keep-walking']) {
      await page.locator(`${DR} [data-radio="verify"] [data-option="${v}"]`).click();
      await btn(page, 'בדיקה').click();
      check((await fb(page)) === `verify-${v}`, `decision "${v}": explained`);
      if (v === 'proof') await shot(page, DR, 'states/12-decision-wrong.png');
      await fits(page, DR, `decision ${v}`);
    }
    await page.locator(`${DR} [data-radio="verify"] [data-option="estimate"]`).click();
    await btn(page, 'בדיקה').click();
    await page.waitForTimeout(800);
    check((await fb(page)) === 'verify-right' && (await page.locator(`${DR} [data-map="deviation"]`).count()) === 1, 'decision "estimate": right — the map debrief opens on the 3° case');
    await shot(page, DR, 'states/13-debrief-deviation.png');
    await fits(page, DR, 'debrief');
    await page.locator(`${DR} [data-debrief="short-pace"]`).click();
    check((await page.locator(`${DR} [data-map="short-pace"]`).count()) === 1, 'debrief: the short pace drawn');
    await shot(page, DR, 'states/14-debrief-short-pace.png');

    await page.locator(DR).getByRole('button', { name: 'איפוס' }).click();
    await page.waitForTimeout(1200);
    s = await st(page);
    check(s.step === 'plan' && s.pairs === 0 && s.count === null && s.heading === 0 && s.verify === null && s.sign === null, 'reset at the end: back to the opening');
    check((await countLeaks(page)).length === 0 && (await page.locator(`${DR} [data-tick]`).count()) === 0, 'reset: the count is withheld again');
    const cam0 = await page.evaluate(() => window.__drScene.camera());
    check(Math.hypot(cam0.x, cam0.z) < 0.05 && Math.abs(cam0.yaw) < 1, 'reset: the camera is back at A, facing north');
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 1, 'reset: the planning map is open again');
    await shot(page, DR, 'states/15-reset.png');

    // reset in the middle of a segment
    await typeCount(page, 800);
    await setHeading(page, 62);
    await btn(page, 'יציאה לדרך').click();
    await page.waitForTimeout(600);
    await page.locator(`${DR} [data-advance="walk"]`).click();
    await page.waitForTimeout(1200);
    await page.locator(DR).getByRole('button', { name: 'איפוס' }).click();
    await page.waitForTimeout(1500);
    s = await st(page);
    const cam1 = await page.evaluate(() => window.__drScene.camera());
    check(s.step === 'plan' && s.pairs === 0 && !s.moving && Math.hypot(cam1.x, cam1.z) < 0.05, 'reset mid-walk: count, camera and walk back at A');

    check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    const res = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((e) => e.name.includes('/dead-reckoning/'))
        .map((e) => ({ name: e.name.split('/dead-reckoning/')[1], kb: Math.round((e.encodedBodySize || e.transferSize) / 1024), ms: Math.round(e.duration) })),
    );
    metrics.assets = res;
    metrics.assetKb = res.reduce((a, r) => a + r.kb, 0);
    await ctx.close();
  }

  // ================================================================ keyboard only
  {
    const { ctx, page, errors } = await open(browser);
    await ready(page);
    await page.locator(`${DR} [data-count-input]`).focus();
    await page.keyboard.type('1600');
    await page.keyboard.press('Enter');
    check((await fb(page)) === 'count-single-steps', 'keys: a wrong count with Enter');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('800');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    check(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'slider'), 'keys: focus moves to the compass');
    for (let k = 0; k < 6; k++) await page.keyboard.press('PageUp');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    check((await st(page)).heading === 62, 'keys: compass to 062° with Page Up and arrows');
    for (let k = 0; k < 5; k++) await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.activeElement?.getAttribute('data-advance') === 'depart'), 'keys: Tab reaches "יציאה לדרך"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    check(await page.evaluate(() => document.activeElement?.getAttribute('data-advance') === 'walk'), 'keys: focus on the advance button');
    for (let k = 0; k < 4; k++) {
      await page.keyboard.press('Enter');
      await settle(page, (k + 1) * 100);
      await page.waitForTimeout(200);
      check(await page.evaluate(() => document.activeElement?.getAttribute('data-advance') === 'walk' || document.activeElement?.getAttribute('role') === 'radio'), `keys: focus kept after segment ${k + 1}`);
    }
    check(await page.evaluate(() => document.activeElement?.closest('[data-radio="sign"]') !== null), 'keys: at the wadi, focus on its options');
    await page.keyboard.press('ArrowLeft'); // RTL: next option
    await page.keyboard.press('ArrowRight'); // back to the first (wadi)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    check((await fb(page)) === 'sign-right', 'keys: the wadi identified');
    // look around with the keys, on the focused view
    await page.locator(`${DR} [data-look-surface]`).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    const y = await page.evaluate(() => window.__dr.look.yaw);
    check(Math.abs(y - 92) < 2, `keys: arrows turn the head (${y.toFixed(0)}°)`);
    await page.keyboard.press('Home');
    await page.waitForTimeout(900);
    check(Math.abs((await page.evaluate(() => window.__dr.look.yaw)) - 62) < 2, 'keys: Home faces the walking direction');
    // the map by keys
    await page.locator(`${DR} [data-map-toggle]`).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter'); // the focused close button
    await page.waitForTimeout(300);
    check((await page.locator(`${DR} [data-map-panel]`).count()) === 0 && (await page.evaluate(() => document.activeElement?.hasAttribute('data-map-toggle'))), 'keys: the map opens and closes, focus returns');
    await page.locator(`${DR} [data-advance="walk"]`).focus();
    for (let k = 5; k <= 8; k++) {
      await page.keyboard.press('Enter');
      await settle(page, k * 100);
      await page.waitForTimeout(200);
    }
    check(await page.evaluate(() => document.activeElement?.closest('[data-radio="verify"]') !== null), 'keys: the decision has focus');
    await page.keyboard.press('ArrowLeft'); // estimate
    await page.keyboard.press('Tab'); // "בדיקה"
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    check((await fb(page)) === 'verify-right', 'keys: the whole task done with keys only');
    check(errors.length === 0, `keys: no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    await ctx.close();
  }

  // ================================================================ reduced motion: a segment is a cut
  {
    const { ctx, page } = await open(browser, { reduced: true });
    await ready(page);
    await typeCount(page, 800);
    await setHeading(page, 62);
    await btn(page, 'יציאה לדרך').click();
    await page.waitForTimeout(400);
    await page.locator(`${DR} [data-advance="walk"]`).click();
    await page.waitForTimeout(150);
    const s = await st(page);
    check(s.pairs === 100 && !s.moving, 'reduced motion: the segment is a cut');
    await page.waitForTimeout(300);
    await syncAt(page, 'reduced 100');
    await ctx.close();
  }

  // ================================================================ slow assets: the shared loader until the first frame
  {
    let release;
    const held = new Promise((r) => (release = r));
    const { ctx, page } = await open(browser, {
      route: (p) =>
        p.route('**/dead-reckoning/rocks.glb', async (route) => {
          await held;
          await route.continue();
        }),
    });
    await page.waitForSelector(`${DR} [data-panel="dr-view"] [data-loading]`, { timeout: 60000 });
    await page.waitForTimeout(1500);
    check((await page.locator(`${DR} [data-panel="dr-view"] [data-loading]`).innerText()).includes('טוען שטח מדברי תלת־ממדי'), 'slow assets: the shared loader names the model');
    await page.screenshot({ path: `${outDir}/checks/loading.png`, clip: await page.locator(`${DR} [data-panel="dr-view"]`).boundingBox() });
    release();
    await ready(page);
    await page.waitForTimeout(600);
    check((await page.locator(`${DR} [data-panel="dr-view"] [data-loading]`).count()) === 0, 'slow assets: the loader is gone once the scene is drawn');
    await ctx.close();
  }

  // ================================================================ a short screen (1920 × 910): the view and the toolbar fit together
  {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 910 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
    await page.waitForSelector(DR, { timeout: 150000 });
    await align(page, DR);
    await ready(page);
    const g = await page.evaluate((s) => {
      const r = (q) => document.querySelector(`${s} ${q}`).getBoundingClientRect();
      return { view: r('[data-panel="dr-view"]'), bar: r('[data-dr-toolbar]'), map: r('[data-map-panel]') };
    }, DR);
    check(g.bar.bottom <= 910 - 24 && g.view.height >= 400, `1920 × 910: view (${Math.round(g.view.height)} px) and toolbar end at ${Math.round(g.bar.bottom)} px (≤ 886)`);
    check(g.map.bottom <= g.view.bottom && g.map.top >= g.view.top, '1920 × 910: the planning map fits inside the view');
    await page.screenshot({ path: `${outDir}/checks/viewport-1920x910.png` });
    await ctx.close();
  }

  // ================================================================ away and back: one canvas, no errors
  {
    const { ctx, page, errors } = await open(browser);
    await ready(page);
    for (let k = 0; k < 3; k++) {
      await page.goto('about:blank');
      await page.goto(`${BASE}/lessons/topic-06/#scene-principles`, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForSelector(DR, { timeout: 120000 });
      await align(page, DR);
      await ready(page);
    }
    check((await page.locator(`${DR} canvas`).count()) === 1, 'lifecycle: one canvas after going away and back three times');
    check(errors.length === 0, `lifecycle: no errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

// ================================================================ no WebGL: the labelled stand-in
{
  const nogl = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const ctx = await nogl.newContext({ viewport: { width: 1440, height: 1122 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(DR, { timeout: 150000 });
  await align(page, DR);
  await page.waitForSelector(`${DR} [data-fallback]`, { timeout: 30000 }).catch(() => {});
  check((await page.locator(`${DR} [data-fallback]`).count()) === 1, 'no WebGL: the stand-in view is shown');
  check((await page.locator(`${DR} [data-fallback]`).innerText()).includes('תצוגה חלופית'), 'no WebGL: it says it is a stand-in');
  check((await page.locator(`${DR} [data-panel="dr-view"] [data-loading]`).count()) === 0, 'no WebGL: no loader left spinning');
  await typeCount(page, 800);
  check((await st(page)).countChecked === 800, 'no WebGL: the task still works');
  await page.screenshot({ path: `${outDir}/checks/no-webgl.png` });
  check(errors.length === 0, `no WebGL: no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await nogl.close();
}

// ================================================================ terrain association: tallest states (technique 1, same screen part)
{
  const b2 = await chromium.launch({ args: GPU });
  const t = await open(b2);
  const p = t.page;
  await p.waitForFunction(() => !document.querySelector('[data-panel="map"] [data-loading]'), null, { timeout: 120000 });
  await fits(p, TA, 'terrain · learn');
  await p.locator(`${TA} [data-mode-switch] [role="radio"]`).nth(1).click();
  await p.waitForTimeout(800);
  const tFeedback = () => p.locator(`${TA} [data-feedback]`).getAttribute('data-feedback');
  const tCheck = () => p.locator(TA).getByRole('button', { name: 'בדיקת המיקום' }).click();
  let worst = 0;
  for (const leg of LEGS) {
    const radios = p.locator(`${TA} [data-radio="candidates"] [role="radio"]`);
    for (const c of leg.candidates.filter((x) => x !== leg.answer)) {
      await radios.nth(leg.candidates.indexOf(c)).click();
      await p.locator(`${TA} [data-radio="comparison"] [data-option="mismatch"]`).click();
      await tCheck();
      if (await p.locator(TA).getByRole('button', { name: /רמז/ }).isEnabled()) await p.locator(TA).getByRole('button', { name: /רמז/ }).click();
      if (await p.locator(TA).getByRole('button', { name: /רמז/ }).isEnabled()) await p.locator(TA).getByRole('button', { name: /רמז/ }).click();
      worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · wrong point ${c} + hint 2`));
    }
    await radios.nth(leg.candidates.indexOf(leg.answer)).click();
    for (const e of leg.evidence.filter((x) => !leg.correctEvidence.includes(x.id))) await p.locator(`${TA} [data-evidence-id="${e.id}"]`).click();
    await p.locator(`${TA} [data-radio="comparison"] [data-option="mismatch"]`).click();
    await tCheck();
    worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · partial + hint 2`));
    await p.locator(TA).getByRole('button', { name: 'הצגת הסבר' }).click();
    check((await tFeedback()) === 'explained', `terrain · leg ${leg.index + 1}: the explanation after a check`);
    worst = Math.max(worst, await fits(p, TA, `terrain · leg ${leg.index + 1} · explained`));
    await p.locator(`${TA} [data-strip="practice"] button`, { hasText: /המשך לקטע הדרך הבא|לסיכום הציר/ }).click();
    await p.waitForTimeout(400);
  }
  worst = Math.max(worst, await fits(p, TA, 'terrain · summary'));
  await shot(p, TA, 'terrain-fit/summary.png');
  ok(`terrain: tallest state ends at ${worst} px`);
  check(t.errors.length === 0, `terrain sweep: no page errors${t.errors.length ? `: ${t.errors.join(' | ')}` : ''}`);
  await b2.close();
}

void START;
void SHEET;
console.log('\nmetrics', JSON.stringify(metrics, null, 1));
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
