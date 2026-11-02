// Browser tests for the lesson-6 navigation decision exercise („במהלך הניווט: מה צריך לבדוק?”,
// PlanningTipsScene screen 2). Signs are picked with real clicks in the live 3D view (aimed through the
// canvas' own camera) and on the SVG map; every decision path is played to its debrief.
// Needs a running dev server or static export (WebGL from the machine's GPU). Run:
//   QA_BASE=http://localhost:3000 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay.e2e.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const A = '[data-activity="navigation-replay"]';
const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const base = '../../src/components/lessons/topic-06/navigation-replay/';
const R = await import(base + 'replayRoute.ts');
const W = await import(base + 'replayWorld.ts');
const T = await import(base + 'replayTerrain.ts');

let browser;
const errors = [];
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => {
    // this activity's own errors only (other sessions' assets may 404 on a shared server)
    if (m.type() === 'error' && !/Failed to load resource|Download the React DevTools/.test(m.text())) errors.push(m.text());
  });
};

async function open(viewport = { width: 1440, height: 1122 }, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const p = await ctx.newPage();
  watch(p);
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await p.waitForSelector(A, { timeout: 240000 });
  await toTop(p);
  await ready(p);
  return p;
}
const toTop = (p) => p.evaluate(() => document.querySelector('[data-tips-screen="nav"]').scrollIntoView({ block: 'start', behavior: 'instant' }));
const ready = (p) =>
  p.waitForFunction((s) => {
    const f = document.querySelector(s + ' [data-view-frame]');
    return !f || (f.hasAttribute('data-ready') && !f.querySelector('[data-loading]'));
  }, A, { timeout: 240000 });
const run = (p) => p.evaluate(() => { const r = window.__replayRun; const v = r.visits[r.visits.length - 1]; return { stop: v.stop, phase: r.phase, fix: r.know.fix.stop, counted: r.know.counted, msg: v.check?.msg?.kind ?? null, pending: v.check?.pending ?? null, matched: v.check?.matched ?? [], verdict: v.check?.verdict?.kind ?? null, agrees: v.agrees, review: r.review, truth: v.truth }; });
const attr = (p, name) => p.locator(A).getAttribute(name);

/** Turn to a sign, aim through the live camera, click it in the view. */
async function clickSign(p, sign) {
  const { truth: eye } = await run(p);
  let at = R.signAnchor(sign, eye);
  let lift = 0.3;
  if (sign === 'summitW' || sign === 'summitE') {
    const d = W.distW(eye, at);
    at = { x: at.x + ((eye.x - at.x) * 45) / d, z: at.z + ((eye.z - at.z) * 45) / d };
    lift = 0;
  }
  if (sign === 'saddle') lift = 4;
  if (sign === 'saddle' && W.distW(eye, at) < 40) at = W.along(eye, await p.evaluate(() => window.__replayView.get().yawDeg), 22), (lift = 0);
  if (sign === 'pines') (at = R.SIGNS.pines.members.reduce((b, q) => (W.distW(eye, q) < W.distW(eye, b) ? q : b))), (lift = 7);
  const yaw = W.bearingW(eye, at);
  const pitch = (Math.atan2(T.heightAt(at.x, at.z) + lift - T.heightAt(eye.x, eye.z) - 1.7, W.distW(eye, at)) * 180) / Math.PI;
  await p.evaluate(([y, t]) => window.__replayView.set({ yawDeg: y, pitchDeg: Math.max(-22, Math.min(24, t)), vfovDeg: 40 }), [yaw, pitch]);
  await p.waitForTimeout(350);
  const ndc = await p.evaluate(([x, z, l]) => window.__replayProject(x, z, l), [at.x, at.z, lift]);
  const box = await p.locator(`${A} [data-view-frame]`).boundingBox();
  const y = Math.min(box.y + box.height - 6, Math.max(box.y + 6, box.y + ((1 - ndc.y) / 2) * box.height));
  await p.mouse.click(box.x + ((ndc.x + 1) / 2) * box.width, y);
  await p.waitForTimeout(250);
}
/** Click a world point on the SVG map, through the map's own transform. */
async function clickMap(p, w) {
  const m = W.toMap(w);
  const pt = await p.evaluate(([s, x, y]) => {
    const svg = document.querySelector(s + ' [data-panel="map"] svg[role="img"]');
    const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
    return { x: q.x, y: q.y };
  }, [A, m.x, m.y]);
  await p.mouse.click(pt.x, pt.y);
  await p.waitForTimeout(250);
}
const mapPoint = (sign, eye) => (sign === 'road' || sign === 'stream' ? R.signAnchor(sign, eye) : R.SIGNS[sign].at);
async function useSign(p, sign) {
  await clickSign(p, sign);
  let s = await run(p);
  assert.equal(s.pending, sign, `view click on ${sign} → ${s.msg}`);
  await clickMap(p, mapPoint(sign, s.truth));
  s = await run(p);
  assert.ok(s.matched.includes(sign), `map click on ${sign} → ${s.msg}`);
}
const click = async (p, sel) => {
  await p.click(`${A} ${sel}`);
  await p.waitForTimeout(250);
};
async function walkOn(p, sel = '[data-choice="continue"], [data-action="next"], [data-action="continue-anyway"]') {
  const before = (await run(p)).stop;
  await p.click(`${A} :is(${sel})`);
  await p.waitForFunction(([s, b]) => { const r = window.__replayRun; return r.phase !== 'walking' && (r.visits.at(-1).stop !== b || r.phase === 'done'); }, [A, before], { timeout: 60000 });
  await ready(p);
  // the decision bar cross-fades (0.2 s) to the new stop's question
  await p.waitForFunction((s) => !document.querySelector(s + ' [data-travel-status]'), A);
  await p.waitForTimeout(400);
}
async function guided(p) {
  await useSign(p, 'saddle');
  await useSign(p, 'stream');
  await click(p, '[data-action="commit"]');
  assert.equal((await run(p)).fix, 'stream');
}
const checkWith = async (p, signs, distance) => {
  await click(p, '[data-choice="check"]');
  for (const s of signs) await useSign(p, s);
  if (distance) await click(p, '[data-action="distance"]');
  await click(p, '[data-action="commit"]');
};
const noTruth = async (p) => assert.equal(await p.locator(`${A} [data-panel="map"] [data-truth], ${A} [data-panel="map"] [data-layer="debrief"]`).count(), 0, 'the true track must not show before the debrief');

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', args: GPU });
});
after(async () => browser?.close());

test('opening: one card, one canvas, the guided check with its pointer, and the map keeps fix / estimate / target apart', async () => {
  const p = await open();
  assert.equal(await p.locator('[data-tips-screen="nav"] .surface-elevated').count(), 1);
  assert.equal(await p.locator(`${A} canvas`).count(), 1);
  assert.equal((await p.locator('[data-tips-screen="nav"] h3').textContent()).trim(), 'במהלך הניווט: מה צריך לבדוק?');
  assert.match(await p.locator('[data-tips-screen="nav"] header p').textContent(), /בכל תחנה החליטו: ממשיכים, או עוצרים לבדוק/);
  assert.equal(await attr(p, 'data-phase'), 'check');
  assert.match(await p.locator(`${A} [data-prompt]`).textContent(), /דוגמה מודרכת/);
  assert.equal(await p.locator(`${A} [data-view-marker="hint"]`).count(), 1, 'the sign to find is pointed out');
  assert.match(await p.locator(`${A} [data-map-key] [data-key="fix"]`).textContent(), /חציית הנחל/);
  assert.match(await p.locator(`${A} [data-map-key] [data-key="target"]`).textContent(), /האוכף/);
  assert.equal(await p.locator(`${A} [data-choice="continue"]`).count(), 0, 'no walking before the guided check');
  await noTruth(p);
  await p.context().close();
});

test('decisions with checks: the guided check, a continue that matches, verified saddle, the woodland drift found and corrected', async () => {
  const p = await open();
  await guided(p);
  assert.equal(await p.locator(`${A} [data-timeline] [data-moment="stream"]`).getAttribute('data-status'), 'fix');
  await walkOn(p);
  let s = await run(p);
  assert.equal(s.stop, 'enroute');
  assert.ok(s.counted > 70);
  assert.equal(await p.locator(`${A} [data-panel="map"] [data-marker="estimate"]`).count(), 1, 'the estimate is drawn as a ring');
  const r1 = +(await p.locator(`${A} [data-panel="map"] [data-marker="estimate"]`).getAttribute('data-r'));
  await walkOn(p);
  s = await run(p);
  assert.equal(s.stop, 'saddle');
  assert.equal(s.fix, 'stream', 'continuing does not verify');
  assert.ok(+(await p.locator(`${A} [data-panel="map"] [data-marker="estimate"]`).getAttribute('data-r')) > r1, 'the uncertainty grows');
  assert.match(await p.locator(`${A} [data-line="changed"]`).textContent(), /האומדן התקדם/);
  // the saddle: stood in + the distance counted
  await checkWith(p, ['saddle'], true);
  s = await run(p);
  assert.equal(s.fix, 'saddle');
  assert.equal(s.agrees, true);
  assert.match(await p.locator(`${A} [data-feedback="fix"]`).textContent(), /המיקום אומת/);
  await walkOn(p);
  s = await run(p);
  assert.equal(s.stop, 'woods');
  assert.match(await p.locator(`${A} [data-line="event"]`).textContent(), /החורש|בחורש/);
  await noTruth(p);
  await checkWith(p, ['pines'], true);
  s = await run(p);
  assert.equal(s.agrees, false);
  assert.match(await p.locator(`${A} [data-feedback="fix"]`).textContent(), /סטייה של כ־\d+ מ׳/);
  assert.equal(await p.locator(`${A} [data-panel="map"] [data-layer="correction"]`).count(), 1, 'the corrected leg is drawn');
  assert.ok((await p.locator(`${A} [data-panel="map"] [data-locus="sight"]`).count()) >= 1);
  await walkOn(p);
  assert.equal((await run(p)).stop, 'crossing');
  await checkWith(p, ['road'], true);
  assert.equal((await run(p)).agrees, true);
  await walkOn(p, '[data-action="next"]');
  assert.equal((await run(p)).phase, 'done');
  assert.equal(await p.locator(`${A} [data-panel="debrief"]`).count(), 1);
  assert.equal(await p.locator(`${A} [data-panel="map"] [data-truth="track"]`).count(), 1, 'the debrief shows the true track');
  assert.match(await p.locator(`${A} [data-summary]`).textContent(), /מיד אחרי החורש/);
  assert.equal(await p.locator(`${A} [data-debrief-stop]`).count(), 5);
  assert.deepEqual(errors, []);
  await p.context().close();
});

test('continuing despite the mismatch: the road comes early, a short walk past it, then only a check — and its cost in the debrief', async () => {
  const p = await open();
  await guided(p);
  for (const expected of ['enroute', 'saddle', 'woods', 'road']) {
    await walkOn(p);
    assert.equal((await run(p)).stop, expected);
  }
  assert.match(await p.locator(`${A} [data-line="expect"]`).textContent(), /עוד כ־\d+ מ׳ עד חציית הדרך/);
  await walkOn(p);
  assert.equal((await run(p)).stop, 'beyond');
  assert.equal(await p.locator(`${A} [data-choice="continue"]`).count(), 0, 'no more walking from an unknown point');
  assert.equal(await p.locator(`${A} [data-must-check]`).count(), 1);
  await noTruth(p);
  await checkWith(p, ['summitW', 'pines'], false);
  assert.equal((await run(p)).agrees, false);
  await walkOn(p);
  assert.equal((await run(p)).stop, 'crossing');
  await walkOn(p);
  assert.equal((await run(p)).phase, 'done');
  assert.match(await p.locator(`${A} [data-summary]`).textContent(), /אחרי שחציתם את דרך העפר/);
  assert.match(await p.locator(`${A} [data-panel="debrief"]`).textContent(), /950|940|960/);
  assert.deepEqual(errors, []);
  await p.context().close();
});

test('one sign gives a line, not a position; leaving the check keeps the drift', async () => {
  const p = await open();
  await guided(p);
  for (let i = 0; i < 3; i++) await walkOn(p);
  assert.equal((await run(p)).stop, 'woods');
  await click(p, '[data-choice="check"]');
  assert.equal(await p.locator(`${A} [data-action="commit"]`).isDisabled(), true, 'no evidence, no position to determine');
  await useSign(p, 'pines');
  assert.equal(await p.locator(`${A} [data-action="commit"]`).isDisabled(), true, 'one sign still needs a second piece of evidence');
  assert.match(await p.locator(`${A} [data-evidence-progress]`).textContent(), /ראיה אחת מתוך שתיים/);
  assert.equal((await run(p)).fix, 'stream');
  await click(p, '[data-action="cancel-check"]');
  await walkOn(p);
  assert.equal((await run(p)).stop, 'road', 'the partial check corrected nothing');
  await p.context().close();
});

test('wrong picks are named, keyboard picks work, review is read-only, reset starts over', async () => {
  const p = await open();
  // empty ground in the view, then a map click on the wrong sign
  const box = await p.locator(`${A} [data-view-frame]`).boundingBox();
  // the sky behind, away from every sign
  await p.evaluate(() => window.__replayView.set({ yawDeg: 170, pitchDeg: 22 }));
  await p.waitForTimeout(300);
  await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
  assert.equal((await run(p)).msg, 'view-none');
  await clickSign(p, 'saddle');
  await clickMap(p, R.SIGNS.summitE.at);
  assert.equal((await run(p)).msg, 'map-wrong');
  assert.match(await p.locator(`${A} [data-check-feedback]`).textContent(), /במפה לחצתם על הפסגה המזרחית/);
  // the keyboard path: choose from the lists
  await p.selectOption(`${A} [data-list="map"]`, 'saddle');
  await p.selectOption(`${A} [data-list="view"]`, 'stream');
  await p.selectOption(`${A} [data-list="map"]`, 'stream');
  await click(p, '[data-action="commit"]');
  assert.equal((await run(p)).fix, 'stream');
  await walkOn(p);
  await walkOn(p);
  await click(p, '[data-timeline] [data-moment="enroute"]');
  assert.equal(await attr(p, 'data-review'), 'true');
  assert.equal(await p.locator(`${A} [data-choice]`).count(), 0, 'no decisions in the review');
  assert.match(await p.locator(`${A} [data-decision="review"]`).textContent(), /המשכתם/);
  await click(p, '[data-action="back-to-current"]');
  assert.equal(await attr(p, 'data-review'), null);
  assert.equal((await run(p)).stop, 'saddle');
  await click(p, '[data-reset]');
  const s = await run(p);
  assert.equal(s.stop, 'stream');
  assert.equal(s.phase, 'check');
  await p.context().close();
});

test('reduced motion: continuing arrives at once, without a walk', async () => {
  const p = await open({ width: 1440, height: 1122 }, { reducedMotion: 'reduce' });
  await p.selectOption(`${A} [data-list="view"]`, 'saddle');
  await p.selectOption(`${A} [data-list="map"]`, 'saddle');
  await p.selectOption(`${A} [data-list="view"]`, 'stream');
  await p.selectOption(`${A} [data-list="map"]`, 'stream');
  await click(p, '[data-action="commit"]');
  await p.click(`${A} [data-action="next"]`);
  await p.waitForTimeout(150);
  assert.equal(await p.locator(`${A} [data-skip-walk]`).count(), 0);
  assert.equal((await run(p)).stop, 'enroute');
  await p.context().close();
});

test('fit: the whole activity stays on screen in every state at 1440×1122 and 1920×910', async () => {
  for (const vp of [{ width: 1440, height: 1122 }, { width: 1920, height: 910 }]) {
    const p = await open(vp);
    const fits = async (label) => {
      await toTop(p);
      await p.waitForTimeout(200);
      const r = await p.evaluate(() => document.querySelector('[data-tips-screen="nav"]').getBoundingClientRect().toJSON());
      assert.ok(r.bottom <= vp.height + 1, `${vp.width}×${vp.height} ${label}: bottom ${Math.round(r.bottom)}`);
      assert.ok(r.top >= -1, `${label}: top ${r.top}`); // scaled lesson coordinates may round just below zero
    };
    await fits('guided check');
    await p.selectOption(`${A} [data-list="view"]`, 'saddle');
    await p.selectOption(`${A} [data-list="map"]`, 'saddle');
    assert.equal(await p.locator(`${A} [data-action="commit"]`).isDisabled(), true);
    await fits('second evidence instruction');
    await p.close();
  }
});
