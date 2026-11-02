// Browser QA for „שולחן התכנון — בניית סיפור דרך” (lesson 6, #scene-planning) at 1440 × 1122.
// The learner measures by hand: the protractor and the ruler are dragged and turned on the map and never
// print or fill a value; the card holds only what the learner types. Both map views share one frame and one
// 100 m grid; the tools, the view switch and the legend float inside the map, clear of route, points, north
// and scale. Run: node scripts/qa/route-workbench.e2e.mjs (BASE=http://localhost:3001 by default).
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const shots = 'design/screenshots/route-workbench-tools';
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };

try {
  await page.goto(`${BASE}/lessons/topic-06/#scene-planning`, { waitUntil: 'load', timeout: 180000 });
  const root = page.locator('[data-qa="route-builder"]');
  await root.waitFor({ timeout: 120000 });
  await page.waitForTimeout(1500);
  const map = root.locator('[data-qa="workbench-map"]');
  const svg = root.getByTestId('workbench-map');
  const tools = root.locator('[data-qa="map-tools"]');
  const az = root.locator('[data-field="az"]'), m = root.locator('[data-field="m"]'), end = root.locator('[data-field="end"]');
  const scrollToBuilder = () => page.evaluate(() => { const el = document.querySelector('[data-qa="route-builder"]'); window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: 'instant' }); });
  const shot = async (name, whole = false) => { await scrollToBuilder(); await page.waitForTimeout(350); await (whole ? page.screenshot({ path: `${shots}/${name}.png` }) : map.screenshot({ path: `${shots}/${name}.png` })); };
  const toClient = (x, y) => svg.evaluate((el, [x, y]) => { const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()); return { x: p.x, y: p.y }; }, [x, y]);
  const drag = async (from, to) => {
    const a = await toClient(...from), b = await toClient(...to);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
  };
  const at = async (qa) => (await root.locator(`[data-qa="${qa}"]`).getAttribute('data-at')).split(',').map(Number);
  const pts = await svg.evaluate((el) => [...el.querySelectorAll('g[transform^="translate("] > circle[r="2.55"]')].map((c) => { const t = c.parentElement.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/); return [Number(t[1]), Number(t[2])]; }));
  const R = 23, ARM = R + 4.5, RULER_HANDLE = 800 / 23.5 + 5.6;
  const aim = (a, b) => (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI;
  const tipOf = (c, deg, len) => [c[0] + len * Math.sin((deg * Math.PI) / 180), c[1] - len * Math.cos((deg * Math.PI) / 180)];
  const noValueInMap = async () => {
    const text = await svg.evaluate((el) => [...el.querySelectorAll('text')].map((t) => t.textContent).join(' '));
    assert.doesNotMatch(text, /°/, 'no degree read-out on the map');
    assert.equal(await root.getByTestId('measurement-overlay').count(), 0);
  };
  await scrollToBuilder();

  await check('five points drawn; cards start empty; tools, view switch and legend sit inside the map frame', async () => {
    assert.equal(pts.length, 5);
    assert.equal(await az.inputValue(), ''); assert.equal(await m.inputValue(), '');
    const frame = await svg.boundingBox();
    for (const qa of ['map-tools', 'view-switch']) {
      const b = await root.locator(`[data-qa="${qa}"]`).boundingBox();
      assert.ok(b.x >= frame.x && b.y >= frame.y && b.x + b.width <= frame.x + frame.width && b.y + b.height <= frame.y + frame.height, `${qa} inside the map`);
    }
    assert.equal(await root.getByRole('button', { name: 'מקרא' }).count(), 1);
    assert.equal(await root.locator('[data-qa="map-tools"] button').count(), 4);
  });

  await check('the floating controls cover no point, leg, the north arrow or the scale bar', async () => {
    const boxes = await Promise.all(['map-tools', 'view-switch'].map((qa) => root.locator(`[data-qa="${qa}"]`).boundingBox()));
    boxes.push(await root.getByRole('button', { name: 'מקרא' }).boundingBox());
    const furniture = [await root.locator('[data-qa="north-arrow"]').boundingBox(), await root.locator('[data-qa="scale-bar"]').boundingBox()];
    const markers = await Promise.all(pts.map(async ([x, y]) => { const a = await toClient(x - 2.55, y - 2.55), b = await toClient(x + 2.55, y + 2.55); return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y }; }));
    const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const b of boxes) for (const f of [...furniture, ...markers]) assert.ok(!hit(b, f), 'overlap');
    // legs: sample along each leg
    for (let i = 0; i < 4; i++) for (let t = 0; t <= 1; t += 0.05) {
      const p = await toClient(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t);
      for (const b of boxes) assert.ok(!(p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height), `leg ${i} under a control`);
    }
  });

  await check('grid square = scale-bar segment = ruler division = 100 m (in rendered px too)', async () => {
    const xs = await svg.evaluate((el) => [...el.querySelectorAll('[data-qa="map-grid"] path')].map((p) => p.getAttribute('d')).filter((d) => /V/.test(d)).map((d) => Number(d.match(/^M([-\d.]+)/)[1])));
    const uniq = [...new Set(xs)].sort((a, b) => a - b);
    const step = uniq[1] - uniq[0];
    for (let i = 1; i < uniq.length; i++) assert.ok(Math.abs(uniq[i] - uniq[i - 1] - step) < 0.002);
    const seg = await svg.evaluate((el) => Number(el.querySelector('[data-qa="scale-bar"] rect + rect').getAttribute('width')));
    assert.ok(Math.abs(seg - step) < 0.002, `scale bar segment ${seg} = grid square ${step}`);
    assert.ok(Math.abs(step * 23.5 - 100) < 0.05, 'one square = 100 m');
    const [a, b] = [await toClient(0, 0), await toClient(step, 0)];
    assert.ok(b.x - a.x > 18, `a grid square is ${(b.x - a.x).toFixed(1)} px wide`);
  });

  await check('azimuth tool: protractor starts parked off the route, arm north; card empty', async () => {
    assert.equal(await tools.getByRole('button', { name: 'אזימוט' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await root.locator('[data-qa="protractor"]').getAttribute('data-on-point'), null);
    assert.equal(await root.locator('[data-qa="protractor-arm"] [role="slider"]').getAttribute('aria-valuenow'), '0');
    await noValueInMap();
    await shot('01-ortho-azimuth-parked');
  });

  const p1 = pts[0], p2 = pts[1];
  await check('drag the protractor onto point 1 and turn its arm to point 2: nothing is read out or filled', async () => {
    const parked = await at('protractor');
    await drag([parked[0], parked[1] + 20.5], [p1[0] + 0.9, p1[1] + 20.5 - 0.7]);
    assert.equal(await root.locator('[data-qa="protractor"]').getAttribute('data-on-point'), '1', 'centre snaps onto the point');
    await drag(tipOf(p1, 0, ARM), tipOf(p1, aim(p1, p2), ARM));
    const arm = Number(await root.locator('[data-qa="protractor-arm"] [role="slider"]').getAttribute('aria-valuenow'));
    assert.ok(Math.abs(arm - 35) <= 1, `arm at ${arm}`);
    assert.equal(await az.inputValue(), '', 'no auto-fill');
    await noValueInMap();
    await shot('02-ortho-azimuth-measuring');
  });

  await check('switching to the topographic map keeps the tool, its pose, the leg and the answers', async () => {
    await az.fill('35');
    const before = await at('protractor');
    await root.getByRole('radio', { name: 'מפה טופוגרפית' }).click();
    await page.waitForTimeout(300);
    assert.equal(await map.getAttribute('data-view'), 'topo');
    assert.equal(await root.locator('[data-qa="topo-layer"]').evaluate((e) => getComputedStyle(e).opacity), '1');
    assert.deepEqual(await at('protractor'), before);
    assert.equal(await az.inputValue(), '35');
    assert.equal(await root.getAttribute('data-selected-leg'), '0');
    await shot('03-topo-azimuth-measuring');
    await root.getByRole('button', { name: 'מקרא' }).click();
    assert.match(await root.locator('[data-qa="map-legend"]').innerText(), /קו גובה[\s\S]*נחל[\s\S]*דרך עפר[\s\S]*קרקע סלעית/);
    await shot('04-topo-legend');
    await root.getByRole('button', { name: 'מקרא' }).click();
  });

  await check('distance tool: drag the ruler to point 1, turn it to point 2; the card stays empty until typed', async () => {
    await tools.getByRole('button', { name: 'מרחק' }).click();
    await shot('05-topo-ruler-parked');
    const parked = await at('ruler');
    await drag([parked[0] + 10, parked[1] + 2], [p1[0] + 10.6, p1[1] + 2.4]);
    assert.equal(await root.locator('[data-qa="ruler"]').getAttribute('data-on-point'), '1');
    await drag([p1[0] + RULER_HANDLE, p1[1]], tipOf(p1, aim(p1, p2), RULER_HANDLE));
    assert.equal(await m.inputValue(), '', 'no auto-fill');
    await noValueInMap();
    await shot('06-topo-ruler-measuring');
    await root.getByRole('radio', { name: 'תצ״א' }).click();
    await page.waitForTimeout(300);
    assert.deepEqual(await at('ruler'), pts[0]);
    await shot('07-ortho-ruler-measuring');
  });

  await check('landmark tool, wrong answers get specific feedback, then the leg checks out', async () => {
    await m.fill('500');
    await tools.getByRole('button', { name: 'סימני שטח' }).click();
    await shot('08-ortho-landmarks');
    await root.getByRole('button', { name: 'בחירת סימן: חורשה', exact: true }).locator('rect').click();
    assert.equal(await end.inputValue(), 'grove');
    await az.fill('215'); // the reverse bearing
    await root.getByRole('button', { name: 'בדיקת הקטע', exact: true }).click();
    assert.match(await root.locator('[data-feedback="az"]').innerText(), /ההפוך/);
    assert.equal(await root.locator('[data-feedback="m"]').getAttribute('data-verdict'), 'right');
    assert.equal(await root.locator('[data-feedback="end"]').getAttribute('data-verdict'), 'wrong');
    await shot('09-feedback-wrong', true);
    await az.fill('35');
    await root.getByRole('button', { name: 'בחירת סימן: עיקול הנחל', exact: true }).locator('rect').click();
    await root.getByRole('button', { name: 'בדיקת הקטע', exact: true }).click();
    assert.equal(await root.locator('[data-verdict="right"]').count(), 3);
    assert.equal(await az.isDisabled(), true);
    await shot('10-leg-done', true);
  });

  await check('keyboard: next leg; 2 puts the protractor on point 2; arrows turn the arm 1° / Shift 5°', async () => {
    await root.getByRole('button', { name: 'לקטע הבא' }).click();
    assert.equal(await root.getAttribute('data-selected-leg'), '1');
    assert.equal(await tools.getByRole('button', { name: 'אזימוט' }).getAttribute('aria-pressed'), 'true');
    const body = root.locator('[data-qa="protractor"]');
    assert.equal(await body.getAttribute('data-on-point'), '1', 'the tool stays where the learner left it');
    await body.focus(); await page.keyboard.press('2');
    assert.equal(await body.getAttribute('data-on-point'), '2');
    await page.keyboard.press('ArrowRight');
    assert.equal(await body.getAttribute('data-on-point'), null, 'arrows slide it off');
    await page.keyboard.press('2');
    const arm = root.locator('[data-qa="protractor-arm"] [role="slider"]');
    await arm.focus();
    const v0 = Number(await arm.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
    assert.equal(Number(await arm.getAttribute('aria-valuenow')), (v0 + 6) % 360);
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    assert.equal(Number(await arm.getAttribute('aria-valuenow')), v0);
    assert.equal(await az.inputValue(), '');
    // view switch is a radio group with arrow keys
    await root.getByRole('radio', { name: 'תצ״א' }).focus(); await page.keyboard.press('ArrowLeft');
    assert.equal(await map.getAttribute('data-view'), 'topo');
    await page.keyboard.press('ArrowRight');
    assert.equal(await map.getAttribute('data-view'), 'ortho');
    // tool buttons work from the keyboard
    await tools.getByRole('button', { name: 'מרחק' }).focus(); await page.keyboard.press('Enter');
    assert.equal(await tools.getByRole('button', { name: 'מרחק' }).getAttribute('aria-pressed'), 'true');
    await root.locator('[data-qa="ruler"]').focus(); await page.keyboard.press('3');
    assert.equal(await root.locator('[data-qa="ruler"]').getAttribute('data-on-point'), '3');
  });

  await check('undo restores the last typed value; reset clears every card and puts the tools back', async () => {
    await az.fill('65'); await m.fill('700');
    await root.getByRole('button', { name: 'ביטול', exact: true }).click();
    assert.equal(await m.inputValue(), '');
    assert.equal(await az.inputValue(), '65');
    await root.getByRole('button', { name: 'איפוס', exact: true }).click();
    assert.equal(await root.getAttribute('data-selected-leg'), '0');
    assert.equal(await az.inputValue(), '');
    for (let i = 0; i < 4; i++) assert.equal((await root.locator(`[data-leg-row="${i}"] td`).allTextContents()).slice(1).join(''), '———');
    assert.equal(await root.locator('[data-qa="protractor"]').getAttribute('data-on-point'), null);
    assert.deepEqual(await at('protractor'), [92, 52]);
    await shot('11-after-reset', true);
  });

  await check('select tool: legs and points are chosen on the map with Enter', async () => {
    await tools.getByRole('button', { name: 'בחירת קטע' }).click();
    const legC = svg.getByRole('button', { name: 'בחירת קטע ג׳, מנקודה 3 לנקודה 4', exact: true });
    await legC.focus(); await page.keyboard.press('Enter');
    assert.equal(await root.getAttribute('data-selected-leg'), '2');
    await tools.getByRole('button', { name: 'בחירת קטע' }).click();
    await svg.getByRole('button', { name: 'נקודה 5', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.match(await root.locator('[data-qa="route-panel"]').innerText(), /נקודה 5/);
    await shot('12-select-point', true);
  });

  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} checks; screenshots in ${shots}/`);
} finally {
  await browser.close();
}
