// Browser tests for the lesson-6 navigation replay („מתי עוצרים לבדוק?”, PlanningTipsScene screen 2).
// Needs a running dev server (WebGL from the machine's GPU). Run:
//   QA_BASE=http://localhost:3000 node --test scripts/qa/navigation-replay.e2e.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const VIEW = { width: 1440, height: 1122 };
const A = '[data-activity="navigation-replay"]';
const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

let browser;
let page;
const errors = [];
const watch = (p, list) => {
  p.on('pageerror', (e) => list.push(String(e)));
  p.on('console', (m) => {
    // this page's own errors only (other sessions' assets may 404 on a shared server)
    if (m.type() === 'error' && !/Failed to load resource|Download the React DevTools/.test(m.text())) list.push(m.text());
  });
};

async function open(p, url = URL) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForSelector(A, { timeout: 180000 });
  await p.evaluate(() => document.querySelector('[data-tips-screen="nav"]').scrollIntoView({ block: 'start', behavior: 'instant' }));
}
const liveReady = (p) =>
  p.waitForFunction((s) => {
    const f = document.querySelector(s + ' [data-view-frame]');
    return f?.hasAttribute('data-ready') && !f.querySelector('[data-loading]');
  }, A, { timeout: 180000 });
const click = async (sel) => {
  await page.click(`${A} ${sel}`);
  await page.waitForTimeout(320);
};
const state = () =>
  page.evaluate((s) => {
    const root = document.querySelector(s);
    const map = root.querySelector('[data-panel="map"] svg[role="img"]');
    return {
      active: root.getAttribute('data-active'),
      phase: root.getAttribute('data-phase'),
      done: [...root.querySelectorAll('[data-timeline] [data-moment]')].filter((b) => b.hasAttribute('data-done')).map((b) => b.getAttribute('data-moment')),
      current: root.querySelector('[data-timeline] [aria-current="step"]')?.getAttribute('data-moment'),
      counter: root.querySelector('[data-counter]').textContent.trim(),
      story: root.querySelector('[data-info-card="story"] p').textContent.trim(),
      field: root.querySelector('[data-info-card="field"] p').textContent.trim(),
      mapLabel: map.getAttribute('aria-label'),
      truthMarks: map.querySelectorAll('[data-marker="truth"], [data-truth]').length,
      estimate: map.querySelector('[data-marker="estimate"]') ? 1 : 0,
      fix: map.querySelector('[data-marker="fix"]')?.getAttribute('data-name'),
      text: root.innerText,
      height: Math.round(root.getBoundingClientRect().height),
    };
  }, A);

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', args: GPU });
  page = await browser.newPage({ viewport: VIEW });
  watch(page, errors);
  await open(page);
  await liveReady(page);
});
after(async () => browser?.close());

test('direct load of #scene-tips: the replay screen, the live view drawn, one canvas', async () => {
  const s = await state();
  assert.equal(s.active, 'depart');
  assert.equal(s.counter, 'רגע 1 מתוך 4');
  assert.equal(await page.locator(`${A} canvas`).count(), 1);
  const heading = await page.locator('[data-tips-screen="nav"] h3').textContent();
  assert.equal(heading.trim(), 'במהלך הניווט: מה צריך לבדוק?');
  assert.match(await page.locator('[data-tips-screen="nav"] header p').textContent(), /השוו בין סיפור הדרך למה שנראה בשטח/);
  const stats = await page.evaluate(() => window.__replayStats);
  assert.equal(stats.station, 'depart');
  assert.ok(stats.shrubsNear > 500 && stats.rocks > 1000 && stats.grass > 1000, JSON.stringify(stats));
});

test('the screen fits the 1440 × 1122 view at the lesson scale, with no horizontal scroll', async () => {
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-tips-screen="nav"]');
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: -96, behavior: 'instant' });
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, scale: +el.closest('[data-lesson-viewport-fit]').getAttribute('data-fit-scale'), h: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  assert.ok(r.top >= 80 && r.bottom <= VIEW.height, `screen ${r.top}–${r.bottom}`);
  assert.ok(Math.abs(r.scale - 0.7827) < 0.002, `scale ${r.scale}`);
  assert.equal(r.h, 0);
});

test('moment 4 before a decision: the plan, the last fix and the estimate — never the truth', async () => {
  await click('[data-moment="after"]');
  await liveReady(page);
  const s = await state();
  assert.equal(s.active, 'after');
  assert.equal(s.fix, 'האוכף');
  assert.equal(s.estimate, 1);
  assert.equal(s.truthMarks, 0, 'no true position or track on the map');
  assert.match(s.story, /מהאוכף: כ־600 מ׳ עד חציית דרך עפר/);
  assert.match(s.field, /מרחק משוער מהנקודה המזוהה האחרונה: כ־600 מ׳/);
  for (const w of ['בפועל', 'שלוחה', 'סטה', 'סטייה', 'ממזרח', 'צפונה']) {
    assert.ok(!s.text.includes(w), `"${w}" visible before the decision`);
    assert.ok(!s.mapLabel.includes(w), `"${w}" in the map's accessible name`);
  }
  const sr = await page.evaluate((a) => document.querySelector(a + ' [data-view-frame] .sr-only').textContent, A);
  assert.ok(!/בפועל|שלוחה|סטה/.test(sr), 'the view description gives nothing away');
  // viewing moment 4 first completes nothing earlier
  assert.deepEqual(s.done, []);
});

test('moment 4: continue → retry; check → a wrong and a partial reason explained; the right one opens the debrief', async () => {
  const h0 = (await state()).height;
  await click('[data-choice="continue"]');
  let s = await state();
  assert.equal(s.phase, 'decided');
  assert.match(s.text, /עוד לא\./);
  assert.equal(s.truthMarks, 0);
  await click('[data-action="retry"]');
  await click('[data-choice="check"]');
  await click('[data-option="proof"]');
  s = await state();
  assert.match(s.text, /לא מוכיח לאן סטיתם/);
  assert.equal(s.truthMarks, 0, 'a wrong reason reveals nothing');
  await click('[data-option="routine"]');
  assert.match((await state()).text, /חלקית\./);
  await click('[data-option="missing"]');
  s = await state();
  assert.equal(s.phase, 'done');
  assert.ok(s.truthMarks >= 2, 'debrief: the true track and position');
  assert.match(s.mapLabel, /בפועל/);
  assert.match(s.text, /בשחזור:/);
  assert.match(s.text, /בשטח לא יודעים זאת מראש/);
  assert.match(s.text, /עכשיו:/);
  assert.equal(s.height, h0, 'the card keeps its height');
  assert.deepEqual(s.done, ['after']);
});

test('answers stay per moment; the timeline steps and jumps without completing anything', async () => {
  await click('[data-prev]');
  let s = await state();
  assert.equal(s.active, 'saddle');
  assert.equal(s.phase, 'viewing', 'moment 3 untouched');
  assert.equal(s.truthMarks, 0, 'no debrief leaks into moment 3');
  assert.equal(s.fix, 'עיקול הנחל', 'the saddle is not verified yet');
  await click('[data-moment="after"]');
  s = await state();
  assert.equal(s.phase, 'done');
  assert.ok(s.truthMarks >= 2, 'moment 4 kept its debrief');
  assert.equal(await page.locator(`${A} [data-next]`).isDisabled(), true, 'no moment after 4');
  await click('[data-moment="depart"]');
  assert.equal(await page.locator(`${A} [data-prev]`).isDisabled(), true, 'no moment before 1');
  assert.equal((await state()).current, 'depart');
});

test('the guided opening, a cautious check at moment 2, the saddle verified with evidence', async () => {
  await click('[data-look="place"]');
  const yaw = await page.evaluate(() => window.__replayView.get().yawDeg);
  await page.waitForTimeout(700);
  const yaw2 = await page.evaluate(() => window.__replayView.get().yawDeg);
  assert.ok(Math.abs(yaw2 - 236) < 1, `"show in the field" turns to the stream (${yaw} → ${yaw2})`);
  await click('[data-action="depart"]');
  await liveReady(page);
  let s = await state();
  assert.equal(s.active, 'enroute');
  assert.ok(s.done.includes('depart'));
  await click('[data-choice="check"]');
  s = await state();
  assert.equal(s.phase, 'done');
  assert.match(s.text, /בדיקה כאן אינה טעות/);
  await click('[data-action="next"]');
  await liveReady(page);
  await click('[data-choice="continue"]');
  assert.match((await state()).text, /זו נקודת בדיקה מתוכננת/);
  await click('[data-action="retry"]');
  await click('[data-choice="check"]');
  await click('[data-option="distance"]');
  assert.match((await state()).text, /מרחק משוער לבדו אינו מאמת הגעה/);
  await click('[data-option="combined"]');
  s = await state();
  assert.equal(s.phase, 'done');
  assert.equal(s.fix, 'האוכף', 'the saddle becomes the last fix on the map');
  assert.deepEqual(s.done.sort(), ['after', 'depart', 'enroute', 'saddle']);
});

test('summary connects the four principles and leads to the application question', async () => {
  await click('[data-moment="after"]');
  await click('[data-action="next"]');
  const t = (await state()).text;
  for (const p of ['מאמתים מיקום וכיוון לפני ההתקדמות', 'משווים בין הצפוי לנראה בשטח', 'משלבים כיוון, מרחק וסימני שטח', 'בודקים אי־התאמה לפני שממשיכים']) assert.ok(t.includes(p), p);
  await click('[data-action="to-question"]');
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-option')), 'looks', 'focus on the question');
});

test('reset: back to moment 1, every answer cleared, focus on the first action', async () => {
  await page.evaluate(() => document.querySelector('[data-tips-screen="nav"]').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await click('[data-reset]');
  // moment 1 fades in after the old content leaves, and takes the focus once mounted (slower with the planning lab's model on the page)
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-action') === 'depart', null, { timeout: 3000 }).catch(() => {});
  const s = await state();
  assert.equal(s.active, 'depart');
  assert.deepEqual(s.done, []);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-action')), 'depart');
});

test('keyboard: the view turns, tilts, zooms and returns home; the decision is all buttons', async () => {
  await liveReady(page);
  await page.focus(`${A} [data-view-frame]`);
  const look = () => page.evaluate(() => window.__replayView.get());
  const l0 = await look();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('+');
  const l1 = await look();
  assert.ok(Math.abs(((l1.yawDeg - l0.yawDeg + 540) % 360) - 180 - 8) < 1e-6, 'turned 8°');
  assert.ok(l1.pitchDeg > l0.pitchDeg && l1.vfovDeg < l0.vfovDeg);
  await page.keyboard.press('Home');
  await page.waitForTimeout(800);
  const l2 = await look();
  assert.ok(Math.abs(l2.yawDeg - l0.yawDeg) < 0.5 && Math.abs(l2.vfovDeg - l0.vfovDeg) < 0.5, 'home');
  // the activity state never changed while looking
  assert.equal((await state()).phase, 'viewing');
  // decisions reachable by Tab + Enter
  await click('[data-moment="saddle"]');
  await page.focus(`${A} [data-choice="check"]`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  assert.equal((await state()).phase, 'decided');
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-option')), 'Tab reaches the reasons');
});

test('drag to look: a horizontal drag turns the view and leaves the answers alone', async () => {
  await click('[data-reset]');
  await liveReady(page);
  const box = await page.locator(`${A} [data-view-frame]`).boundingBox();
  const y0 = await page.evaluate(() => window.__replayView.get().yawDeg);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6, { steps: 6 });
  await page.mouse.up();
  const y1 = await page.evaluate(() => window.__replayView.get().yawDeg);
  // drag left by 30 % of the width ≈ turn right; inside the fit the drag is divided by the scale
  const d = ((y1 - y0 + 540) % 360) - 180;
  assert.ok(d > 15 && d < 40, `turned ${d.toFixed(1)}°`);
  assert.equal((await state()).active, 'depart');
});

test('full screen opens on the view panel and returns focus to its button', async () => {
  await page.click(`${A} [data-view-controls] button[aria-label="מסך מלא"]`);
  await page.waitForTimeout(600);
  const fs = await page.evaluate(() => document.fullscreenElement?.getAttribute('data-panel') ?? null);
  if (fs === null) {
    test.skip?.('fullscreen not available in this browser mode');
    return;
  }
  assert.equal(fs, 'view');
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'מסך מלא');
});

test('reduced motion: going home is immediate', async () => {
  const p = await browser.newPage({ viewport: VIEW, reducedMotion: 'reduce' });
  const errs = [];
  watch(p, errs);
  await open(p);
  await liveReady(p);
  await p.evaluate(() => window.__replayView.turn(70, 0));
  await p.click(`${A} [data-view-controls] button[aria-label="חזרה למבט הפתיחה"]`);
  const yaw = await p.evaluate(() => window.__replayView.get().yawDeg);
  const home = await p.evaluate(() => window.__replayView.home().yawDeg);
  assert.ok(Math.abs(yaw - home) < 1e-6, 'no animated turn');
  await p.close();
  assert.deepEqual(errs, []);
});

test('the loader covers the wait for the 3D assets and goes once the view is drawn', async () => {
  const p = await browser.newPage({ viewport: VIEW });
  let release;
  const gate = new Promise((r) => (release = r));
  await p.route('**/navigation-replay/rocks.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await open(p);
  await p.waitForSelector(`${A} [data-view-frame] [data-loading]`, { timeout: 120000 });
  assert.equal(await p.locator(`${A} [data-view-frame] [data-loading]`).count(), 1, 'one loading line at a time');
  assert.match(await p.locator(`${A} [data-view-frame] [data-loading]`).textContent(), /טוען שטח תלת־ממדי…/);
  release();
  await liveReady(p);
  assert.equal(await p.locator(`${A} [data-view-frame] [data-loading]`).count(), 0);
  await p.close();
});

test('no WebGL: the photographed fallback, labelled, turns by quarters, and the activity completes', async () => {
  const p = await browser.newPage({ viewport: VIEW });
  await p.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      return /webgl/.test(type) ? null : orig.call(this, type, ...a);
    };
  });
  await open(p);
  await p.waitForSelector(`${A} [data-fallback] img`, { timeout: 60000 });
  await p.waitForFunction((s) => document.querySelector(s + ' [data-fallback] img')?.naturalWidth > 0, A);
  assert.match(await p.locator(`${A} [data-panel="view"]`).innerText(), /תצלומים מהמודל/);
  assert.equal(await p.locator(`${A} canvas`).count(), 0);
  await p.focus(`${A} [data-view-frame]`);
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.locator(`${A} [data-fallback]`).getAttribute('data-quarter'), '1');
  await p.click(`${A} [data-action="depart"]`);
  await p.click(`${A} [data-choice="continue"]`);
  await p.click(`${A} [data-option="landmark"]`);
  assert.equal(await p.locator(A).getAttribute('data-phase'), 'done');
  assert.match(await p.locator(`${A} [data-fallback] img`).getAttribute('src'), /m2-0\.webp$/);
  await p.close();
});

test('a failed 3D asset falls back to the stills', async () => {
  const p = await browser.newPage({ viewport: VIEW });
  await p.route('**/navigation-replay/rocks.glb', (route) => route.fulfill({ status: 404, body: '' }));
  await open(p);
  await p.waitForSelector(`${A} [data-fallback] img`, { timeout: 120000 });
  await p.close();
});

test('another sub-topic and back: one canvas, no errors', async () => {
  await page.goto(`${BASE}/lessons/topic-06/#scene-combatnav`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.goto('about:blank');
  await open(page);
  await liveReady(page);
  // the replay's own canvas, once (the planning lab on screen 1 has its own model)
  assert.equal(await page.locator('[data-activity="navigation-replay"] canvas').count(), 1);
  assert.deepEqual(errors, []);
});
