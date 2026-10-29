// Behavioural acceptance tests for the lesson-6 planning lab („לפני שיוצאים: מה צריך לתכנן?”),
// in the real page: editing on the map and the model, tools, checkpoints, identification,
// keyboard, undo/reset, the camera, and the fit. The math is proven in planning-lab.test.mjs.
// Needs a running dev server (WebGL in Chrome). Run:
//   node --test scripts/qa/planning-lab.e2e.test.mjs        (QA_BASE defaults to http://localhost:3000)
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const LAB = '[data-activity="planning-lab"]';

let browser;
let page;
const errors = [];

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector(`${LAB} [data-map="sheet"]`, { timeout: 180000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-tips-screen="plan"]');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
  });
  await page.waitForSelector(`${LAB} [data-panel="model"][data-ready]`, { timeout: 120000 });
  await page.waitForTimeout(500);
});

after(async () => {
  await browser?.close();
});

const state = () =>
  page.evaluate(() => {
    const s = window.__pl.state;
    return { nodes: s.nodes.map((n) => ({ id: n.id, kind: n.kind, E: n.E, N: n.N, feature: n.feature ?? null })), tool: s.tool, sel: s.selection, notice: s.notice?.kind ?? null, past: s.past.length, direct: s.showDirect };
  });
const dispatch = (a) => page.evaluate((a) => window.__pl.dispatch(a), a);
const attr = (a) => page.getAttribute(LAB, a);
const text = (sel) => page.$eval(`${LAB} ${sel}`, (e) => e.textContent.trim());
/** Map ground metres → page px through the sheet's own screen CTM. */
const mapPt = (E, N) =>
  page.evaluate(
    ({ E, N }) => {
      const svg = document.querySelector('[data-activity="planning-lab"] [data-panel="map"] svg');
      const p = new DOMPoint(E, 1200 - N).matrixTransform(svg.getScreenCTM());
      return [p.x, p.y];
    },
    { E, N },
  );
async function dragOnMap(from, to, steps = 12) {
  const [x0, y0] = await mapPt(from.E, from.N);
  const [x1, y1] = await mapPt(to.E, to.N);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let k = 1; k <= steps; k++) {
    await page.mouse.move(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}
/** The canvas' own projection of a ground point (dev probe), in canvas px. */
const probe = (E, N) => page.evaluate(({ E, N }) => window.__plProbe(E, N), { E, N });
const reset = async () => {
  await dispatch({ type: 'reset' });
  await dispatch({ type: 'tool', tool: 'route' });
  await dispatch({ type: 'select', selection: null });
  if ((await state()).direct) await dispatch({ type: 'toggleDirect' });
  await page.waitForTimeout(150);
};

test('an open workspace: no stations, no stepper, every tool open from the start', async () => {
  const all = await page.$eval('[data-tips-screen="plan"]', (e) => e.innerText);
  for (const banned of ['שלב 2 מתוך 4', 'מתוך 4', 'המשך לחלוקה לקטעים', 'חזרה למוצא וליעד', 'בחירת מסלול']) assert.ok(!all.includes(banned), `no "${banned}"`);
  const tools = await page.$$eval(`${LAB} [data-tools] [role="radio"]`, (bs) => bs.map((b) => ({ id: b.dataset.tool, disabled: b.disabled, text: b.textContent.trim() })));
  assert.deepEqual(
    tools.map((t) => t.text),
    ['עריכת מסלול', 'נקודות אימות', 'זיהוי בשטח'],
  );
  assert.ok(tools.every((t) => !t.disabled && !/\d/.test(t.text)), 'unnumbered, enabled');
  assert.equal(await attr('data-tool'), 'route');
  assert.match(await text('[data-instruction]'), /הוסיפו נקודת מעבר במפה או גררו נקודה קיימת, ובחנו את הדרך בשטח\./);
  const s = await state();
  assert.deepEqual(s.nodes.map((n) => n.kind), ['start', 'way', 'end']);
  assert.equal(await attr('data-crossing'), 'peak-west', 'the opening line climbs over the western summit');
  assert.ok((await page.$$(`${LAB} [data-panel="model"] canvas`)).length === 1, 'a live WebGL canvas');
  assert.equal(await page.getAttribute(`${LAB} [data-panel="model"]`, 'data-renderer'), 'live');
});

test('dragging on the map changes the route, the measures and the model — and the feedback follows the ground', async () => {
  await reset();
  const p1 = (await state()).nodes[1];
  const len0 = Number(await attr('data-length'));
  const cam0 = await probe(500, 600);
  const past0 = (await state()).past;
  await dragOnMap(p1, { E: 649, N: 670 });
  const s = await state();
  assert.equal(s.past - past0, 1, 'one undo step for the whole drag');
  assert.equal(await attr('data-crossing'), 'saddle');
  assert.notEqual(Number(await attr('data-length')), len0, 'the length changed');
  assert.match(await text('[data-feedback-title]'), /באוכף/);
  // the model's handle stands on the moved point (within 2 px of the canvas' projection)
  const off = await page.evaluate(() => {
    const canvas = document.querySelector('[data-activity="planning-lab"] [data-panel="model"] canvas');
    const c = canvas.getBoundingClientRect();
    const s = c.width / canvas.offsetWidth;
    const n = window.__pl.state.nodes[1];
    const [px, py] = window.__plProbe(n.E, n.N);
    const b = document.querySelector(`[data-model-node="${n.id}"] span.rounded-full`).getBoundingClientRect();
    return [(b.left + b.width / 2 - c.left) / s - px, (b.top + b.height / 2 - c.top) / s - py];
  });
  assert.ok(Math.hypot(...off) <= 2, `handle on its point (${off.map((v) => v.toFixed(1))})`);
  // editing never moves the camera
  assert.deepEqual(await probe(500, 600), cam0, 'camera unchanged by the edit');
  // off the saddle, up the flank: the saddle verdict goes
  await dragOnMap({ E: s.nodes[1].E, N: s.nodes[1].N }, { E: 560, N: 668 });
  assert.notEqual(await attr('data-crossing'), 'saddle');
  assert.doesNotMatch(await text('[data-feedback-title]'), /באוכף/);
});

test('add, select, nudge and delete by keyboard; focus moves to the neighbour', async () => {
  await reset();
  const past0 = (await state()).past;
  const [x, y] = await mapPt(300, 720);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  let s = await state();
  assert.equal(s.nodes.length, 4);
  const id = s.sel.id;
  const before = s.nodes.find((n) => n.id === id);
  await page.focus(`${LAB} [data-node="${id}"]`);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Shift+ArrowLeft');
  s = await state();
  const after = s.nodes.find((n) => n.id === id);
  assert.ok(Math.abs(after.N - before.N - 10) < 1e-6 && Math.abs(after.E - before.E + 50) < 1e-6, 'north 10 m, west 50 m (map directions)');
  assert.equal(s.past - past0, 2, 'the add, then one step for the run of nudges');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(150);
  s = await state();
  assert.equal(s.nodes.length, 3);
  assert.ok(await page.evaluate(() => !!document.activeElement?.getAttribute('data-node')), 'focus on a route point');
});

test('a leg: its direction and horizontal distance come from its two points', async () => {
  await reset();
  const s = await state();
  const [a, b] = s.nodes;
  const [x, y] = await mapPt((a.E + b.E) / 2, (a.N + b.N) / 2);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  assert.deepEqual((await state()).sel, { kind: 'leg', from: 'A' });
  const body = await text('[data-context]');
  const d = Math.round(Math.hypot(b.E - a.E, b.N - a.N));
  assert.ok(body.includes(`${d.toLocaleString('he-IL')} מ׳`), `distance ${d} in the panel`);
  assert.match(body, /צפון־מערב/, 'the leg runs north-west');
  assert.ok(await page.$(`${LAB} [data-leg-tag="1"]`), 'the map tags the leg');
  assert.ok(await page.$('[data-model-label="leg"]'), 'the model tags the leg');
});

test('tools switch the click, not the plan; the straight line compares without replacing the route', async () => {
  await reset();
  await dragOnMap((await state()).nodes[1], { E: 649, N: 670 });
  const before = await state();
  await page.click(`${LAB} [data-tools] [data-tool="checks"]`);
  await page.click(`${LAB} [data-toggle="direct"]`);
  await page.click(`${LAB} [data-tools] [data-tool="identify"]`);
  await page.click(`${LAB} [data-tools] [data-tool="route"]`);
  const s = await state();
  assert.deepEqual(s.nodes, before.nodes, 'route kept');
  assert.deepEqual(s.sel, before.sel, 'selection kept');
  assert.ok(await page.$(`${LAB} [data-overlay="direct"]`), 'straight line on the map');
  assert.match(await text('[data-feedback-text]'), /לעומת הקו הישיר .*ארוך ב־.*טיפוס פחות/);
  assert.equal(s.nodes.length, 3, 'the route is still the learner’s');
  // keyboard: the tool switch moves with the arrows
  await page.focus(`${LAB} [data-tools] [data-tool="route"]`);
  await page.keyboard.press('ArrowLeft');
  assert.equal((await state()).tool, 'checks');
});

test('checkpoints: set where the route passes, ordered along it, the path unchanged; a reason when it does not pass', async () => {
  await reset();
  await dragOnMap((await state()).nodes[1], { E: 649, N: 670 });
  const len = Number(await attr('data-length'));
  await page.click(`${LAB} [data-tools] [data-tool="checks"]`);
  await page.click(`${LAB} [data-feature="road"]`);
  await page.click(`${LAB} [data-feature="stream"]`);
  await page.click(`${LAB} [data-feature="saddle"]`);
  assert.equal(await attr('data-checks'), 'stream,saddle,road', 'by place along the route, not by click order');
  assert.equal(Number(await attr('data-length')), len, 'the path did not move');
  await page.click(`${LAB} [data-feature="peak-east"]`);
  assert.equal(await attr('data-checks'), 'stream,saddle,road');
  assert.match(await text('[data-context]'), /המסלול אינו עובר כאן/);
  const marks = await page.$$eval(`${LAB} [data-node][data-kind="check"]`, (gs) => gs.map((g) => g.textContent.trim()));
  assert.deepEqual(marks, ['1', '2', '3']);
  assert.equal((await page.$$('[data-model-node][data-kind="check"]')).length, 3, 'mirrored on the model');
});

test('identify: a pick on the map lights the same feature on the model; the camera moves only on request', async () => {
  await reset();
  await page.click(`${LAB} [data-tools] [data-tool="identify"]`);
  const [x, y] = await mapPt(840, 600);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  assert.deepEqual((await state()).sel, { kind: 'feature', id: 'peak-east' });
  assert.ok(await page.$(`${LAB} [data-highlight="peak-east"]`), 'map highlight');
  assert.ok(await page.$('[data-model-label="peak-east"]'), 'model label');
  // a pick on the model (a click on its ground) selects in both views too
  const cam = await probe(500, 600);
  await dispatch({ type: 'select', selection: null });
  const [cx, cy] = await probe(649, 670);
  const box = await page.$eval(`${LAB} [data-panel="model"] canvas`, (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, s: r.width / c.offsetWidth };
  });
  await page.mouse.click(box.x + cx * box.s, box.y + cy * box.s);
  await page.waitForTimeout(300);
  assert.deepEqual((await state()).sel, { kind: 'feature', id: 'saddle' }, 'a click on the model saddle picks it');
  assert.ok(await page.$(`${LAB} [data-highlight="saddle"]`), 'and the map lights it');
  assert.deepEqual(await probe(500, 600), cam, 'no camera move on a pick');
  await page.click(`${LAB} [data-feature="saddle"]`);
  await page.click(`${LAB} [data-action="focus"]`);
  await page.waitForTimeout(900);
  assert.notDeepEqual(await probe(500, 600), cam, '"התמקדו בסימן" moves the camera');
  await page.click(`${LAB} [data-panel="model"] button[aria-label="חזרה למבט ההתחלתי"]`);
  await page.waitForTimeout(900);
});

test('dragging a handle on the model moves the point and holds the orbit', async () => {
  await reset();
  const past0 = (await state()).past;
  const cam = await probe(500, 600);
  const h = await page.$('[data-model-node="p1"]');
  const b = await h.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(b.x + b.width / 2 + k * 5, b.y + b.height / 2 + k * 2);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const s = await state();
  assert.ok(s.nodes[1].E !== 480 || s.nodes[1].N !== 613.5, 'the point moved');
  assert.equal(s.past - past0, 1, 'one undo step');
  assert.deepEqual(await probe(500, 600), cam, 'the orbit did not turn');
});

test('a point behind the ridge: a dashed ghost on the model that lets the pointer through; still edited on the map', async () => {
  await reset();
  const hidden = (id) => page.getAttribute(`[data-model-node="${id}"]`, 'data-occluded');
  // p1 north of the western summit, seen from low in the south-west: the summit hides it
  await dispatch({ type: 'dragStart', id: 'p1' });
  await dispatch({ type: 'drag', at: { E: 430, N: 860 } });
  await dispatch({ type: 'dragEnd' });
  await dispatch({ type: 'select', selection: null });
  await page.evaluate(() => window.__plCamera({ E: 300, N: 205, h: 455 }, { E: 470, N: 700, h: 445 }));
  await page.waitForTimeout(500);
  assert.equal(await hidden('p1'), 'true', 'p1 is marked hidden');
  assert.ok(await page.$(`${LAB} [data-panel="model"] [data-hidden-note]`), 'the panel says what the dashed ring means');
  const ghost = await page.$eval('[data-model-node="p1"]', (e) => ({ pe: getComputedStyle(e).pointerEvents, dashed: getComputedStyle(e.querySelector('span.rounded-full')).borderStyle }));
  assert.deepEqual(ghost, { pe: 'none', dashed: 'dashed' }, 'a dashed ring the pointer passes through');
  // a press-and-drag on the ghost does not grab the hidden point
  const before = (await state()).nodes.find((n) => n.id === 'p1');
  const b = await (await page.$('[data-model-node="p1"]')).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) {
    await page.mouse.move(b.x + b.width / 2 + k * 6, b.y + b.height / 2 + k * 3);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = (await state()).nodes.find((n) => n.id === 'p1');
  assert.deepEqual([after.E, after.N], [before.E, before.N], 'the hidden point stays put');
  // the map still edits it, and the model follows: dragged into sight on the near slope, it is drawn as a handle again
  await page.evaluate(() => window.__plCamera({ E: 300, N: 205, h: 455 }, { E: 470, N: 700, h: 445 }));
  await dragOnMap(after, { E: 430, N: 520 });
  const moved = (await state()).nodes.find((n) => n.id === 'p1');
  assert.ok(Math.hypot(moved.E - 430, moved.N - 520) < 8, `the map moved it (${moved.E}, ${moved.N})`);
  assert.equal(await hidden('p1'), null, 'in sight again: a full handle');
  assert.equal(await page.$(`${LAB} [data-panel="model"] [data-hidden-note]`), null, 'the note goes with it');
  await page.click(`${LAB} [data-panel="model"] button[aria-label="חזרה למבט ההתחלתי"]`);
  await page.waitForTimeout(900);
});

test('undo, reset (itself undoable), Ctrl+Z and the example plan', async () => {
  await reset();
  await dragOnMap((await state()).nodes[1], { E: 649, N: 670 });
  const edited = (await state()).nodes;
  await page.click(`${LAB} [data-action="reset"]`);
  assert.equal((await state()).nodes.length, 3);
  assert.equal(await attr('data-crossing'), 'peak-west');
  await page.focus(`${LAB} [data-action="reset"]`);
  await page.keyboard.press('Control+z');
  assert.deepEqual((await state()).nodes, edited, 'reset undone');
  await page.click(`${LAB} [data-action="example"]`);
  assert.equal(await attr('data-crossing'), 'saddle');
  assert.equal(await attr('data-checks'), 'stream,saddle,road');
  assert.match(await text('[data-notice]'), /לא הדרך היחידה/);
  await page.click(`${LAB} [data-action="undo"]`);
  assert.deepEqual((await state()).nodes, edited, 'the example undone');
});

test('view controls: top view is north-up; zoom and full-screen controls are there', async () => {
  await page.click(`${LAB} [data-view="top"]`);
  await page.waitForTimeout(1200);
  assert.equal(await page.getAttribute(`${LAB} [data-north]`, 'data-north'), '0');
  for (const label of ['התקרבות', 'התרחקות', 'חזרה למבט ההתחלתי', 'הצגת המודל במסך מלא']) assert.ok(await page.$(`${LAB} [data-panel="model"] button[aria-label="${label}"]`), label);
  assert.ok(await page.$(`${LAB} [data-map-fullscreen]`), 'map full screen');
  await page.click(`${LAB} [data-panel="model"] button[aria-label="חזרה למבט ההתחלתי"]`);
  await page.waitForTimeout(900);
});

test('one height in every state, inside 1440 × 1122 under the header', async () => {
  const heights = new Set();
  const check = async (name) => {
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const lab = document.querySelector('[data-activity="planning-lab"]');
      const p = lab.querySelector('[data-panel="context"]');
      const f = lab.querySelector('[data-feedback]');
      const r = lab.getBoundingClientRect();
      return { h: lab.offsetHeight, panel: p.scrollHeight - p.clientHeight, feedback: f.scrollHeight - f.clientHeight, top: r.top, bottom: r.bottom };
    });
    heights.add(m.h);
    assert.ok(m.panel <= 0 && m.feedback <= 0, `${name}: nothing spills (${m.panel}, ${m.feedback})`);
    assert.ok(m.top >= 80 && m.bottom <= 1122, `${name}: ${m.top}–${m.bottom}`);
  };
  await reset();
  await check('open');
  await dispatch({ type: 'example' });
  await check('example');
  await dispatch({ type: 'select', selection: { kind: 'node', id: (await state()).nodes.find((n) => n.kind === 'check').id } });
  await check('checkpoint');
  await dispatch({ type: 'tool', tool: 'checks' });
  await dispatch({ type: 'select', selection: null });
  await check('checks');
  await dispatch({ type: 'addCheck', feature: 'peak-east' });
  await check('off-route');
  await dispatch({ type: 'tool', tool: 'identify' });
  await dispatch({ type: 'select', selection: { kind: 'feature', id: 'rocks' } });
  await check('identify');
  await dispatch({ type: 'toggleDirect' });
  await check('direct');
  assert.equal(heights.size, 1, `heights ${[...heights].join(', ')}`);
  assert.ok([...heights][0] <= 760, 'within the lesson budget');
});

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
