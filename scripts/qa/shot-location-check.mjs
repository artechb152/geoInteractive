// QA for the lesson-6 location-check activity ("באיזה אזור אתם נמצאים?").
//
// Usage (dev server running; default http://localhost:3000):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-location-check.mjs [outDir] [--base=http://localhost:3000] [--capture-fallback]
//
// Checks (exit code 1 on any failure):
//   entry         the scene is reached through the side-nav button "עקרונות הניווט"
//   one screen    with the card aligned under the site header at 1440 × 1122, the task, the two
//                 measurements, both views, the map tools, the area choice, the check button and
//                 the feedback are all inside the viewport, none overlapping; body text ≥ 16 px;
//                 the card does not grow when feedback appears (checked in every captured state)
//   4:3           the observation frame is 4:3; the map frame has the same height
//   registration  the canvas' own projection (dev probe) vs the pure projectToView() for F,
//                 a G1 crown and a G2 crown, at the frame's real size — ≤ 1.5 px
//   opening view  G1 left of G2, both inside the frame; F off-frame to the right
//   one choice    a click in the observation selects nothing; the area is chosen on the map
//                 (halo or name plate) or with the buttons, and both stay in sync
//   map values    a chosen area shows its bearing to the road split and its distance from the
//                 last known position, in plain ink, before any check (no verdict colour, no result)
//   mouse flow    area 2 (direction contradiction) then area 1 (success)
//   stale         changing the area after a check: "הבחירה השתנתה — בדקו שוב", no old result
//                 layers, the new area's neutral values shown
//   wording       no "מזלג" anywhere in the activity (text, labels, aria)
//   keyboard flow the same answer through the radio group only — same state, same verdict
//   road split    "הראו את התפצלות הדרך" frames the split (043°, 30°); in the rendered frame at the
//                 normal panel size both arms are clearly brighter than the ground beside them
//   measurement   "הראו את התפצלות הדרך" turns the view to 043° without changing the choice;
//                 turning the view never changes the measured bearing shown
//   help          the GPS help dialog opens, and closes with Escape
//   reset         returns to the opening state (and the camera to the opening view)
//   nav           another sub-topic and back: one canvas, no duplicated document listeners
//   loading       placeholder while the ground textures load; the choice usable; nothing revealed
//   no WebGL      static 4:3 picture of the same world and camera, choice + check still work
//   console       no page errors
// --capture-fallback renders public/assets/lessons/topic06/location-check/observation-north.jpg
// from the live canvas at the opening look (overlays hidden), 4:3 at 2×.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { CANDIDATES, FORK, ROAD_WIDTH_M } from '../../src/components/lessons/topic-06/locationCheckScenario.ts';
import { projectToView } from '../../src/components/lessons/topic-06/locationCheckGeometry.ts';
import { ROAD_VERGE_M, crownShape, groveTrees, heightAt, observerEye, roads, terrainClear } from '../../src/components/lessons/topic-06/locationCheckTerrain.ts';
import { INITIAL_LOOK, LOOK_LIMITS } from '../../src/components/lessons/topic-06/locationCheckViewStore.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/location-check';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const CAPTURE = args.includes('--capture-fallback');
const URL = `${BASE}/lessons/topic-06/`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);

// Count document/window listeners (adds − removes) to catch duplicates after remounts.
const LISTENER_SPY = () => {
  const counts = (window.__lcListeners = {});
  for (const target of [window, document]) {
    const name = target === window ? 'window' : 'document';
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, fn, opts) => {
      counts[`${name}:${type}`] = (counts[`${name}:${type}`] ?? 0) + 1;
      return add(type, fn, opts);
    };
    target.removeEventListener = (type, fn, opts) => {
      counts[`${name}:${type}`] = (counts[`${name}:${type}`] ?? 0) - 1;
      return remove(type, fn, opts);
    };
  }
};

async function openActivity(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  await ctx.addInitScript(LISTENER_SPY);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  // Entry through the side-nav button, not the hash alone.
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector('#scene-principles [data-activity="location-check"]', { timeout: 60000 });
  for (let y = 0; y < 7000; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(80);
  }
  await alignActivity(page);
  return { ctx, page, errors };
}

/** Card top just under the site header — "aligned to the start of the content area". */
async function alignActivity(page) {
  await page.evaluate(() => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const el = document.querySelector('[data-activity="location-check"]');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 4);
  });
  await page.waitForTimeout(400);
}

async function waitFor3D(page) {
  await page.waitForFunction(() => document.querySelector('[data-activity="location-check"] canvas') && !document.body.innerText.includes('טוען תצפית תלת־ממדית'), null, {
    timeout: 240000,
  });
  await page.waitForTimeout(800);
}

const state = (page) => page.evaluate(() => window.__lc.state);
const frameBox = (page) => page.locator('[data-obs-frame]').boundingBox();
const areaGroup = (page) => page.getByRole('radiogroup', { name: 'בחרו אזור' });
const checkButton = (page) => page.getByRole('button', { name: 'בדקו את הבחירה' });
const feedbackKind = (page) => page.locator('[data-feedback]').getAttribute('data-feedback');
const count = (page, sel) => page.locator(sel).count();

/** Client px of a map point (E, N) through the SVG's own screen CTM. */
async function mapPoint(page, E, N) {
  return page.evaluate(
    ([e, n]) => {
      const svg = document.querySelector('[data-panel="map"] svg');
      const p = new DOMPoint(e, 1050 - n).matrixTransform(svg.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    [E, N],
  );
}
async function clickMap(page, E, N) {
  const pt = await mapPoint(page, E, N);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(300);
}

/** A visible crown of a grove, as an eye-space point for projection. */
function visibleCrown(id) {
  const eye = observerEye();
  for (const t of groveTrees().filter((t) => t.grove === id)) {
    const c = crownShape(t);
    const p = { ...c.center, heightM: c.center.heightM + c.halfHeightM * 0.4 };
    if (terrainClear(eye, p)) return p;
  }
  return null;
}

async function clickInView(page, p) {
  const box = await frameBox(page);
  const look = await page.evaluate(() => window.__lc.look.getLive());
  const v = projectToView(look, box.width / box.height, observerEye(), p);
  await page.mouse.click(box.x + v.x * box.width, box.y + v.y * box.height);
}

/**
 * The chosen area's map layer: present for `id`, neutral (ink only, no measured
 * colour) before a check, and its labels give the area's own values.
 */
async function checkAreaValues(page, id, { dir, dist }, label) {
  const v = await page.evaluate((area) => {
    const g = document.querySelector(`[data-panel="map"] [data-overlay="values"][data-area="${area}"]`);
    if (!g) return null;
    const strokes = [...g.querySelectorAll('[stroke]')].map((el) => el.getAttribute('stroke').toLowerCase());
    return { text: g.textContent, strokes, results: document.querySelectorAll('[data-panel="map"] [data-overlay="result"], [data-panel="map"] [data-overlay="observer"]').length };
  }, id);
  if (!v) return fail(`${label}: no map values for ${id}`);
  const problems = [];
  if (!v.text.includes(dir)) problems.push(`direction ${dir} not labelled`);
  if (!v.text.includes(dist)) problems.push(`distance ${dist} not labelled`);
  if (v.strokes.includes('#e2553a')) problems.push('measured/verdict colour in the neutral layer');
  if (v.results) problems.push('result layers drawn before the check');
  if (problems.length) fail(`${label}: ${problems.join('; ')}`);
  else ok(`${label}: map shows ${dir} to the road split and ${dist} from the last known position, neutral, no result`);
}

/**
 * The road split in the rendered frame (overlays hidden, the panel at its
 * normal size): at points 15–110 m along each arm from F, the luminance on the
 * road's centre-line against the brighter of the two ground samples beside it
 * (outside the road and its edge band). Pixels come from a real screenshot.
 */
async function checkRoadContrast(page, label) {
  const box = await frameBox(page);
  const look = await page.evaluate(() => window.__lc.look.getLive());
  const eye = observerEye();
  const aspect = box.width / box.height;
  const [main, branch] = roads();
  const fi = main.pts.findIndex(([E, N]) => E === FORK.E && N === FORK.N);
  const arms = { south: main.pts.slice(0, fi + 1).reverse(), branch: branch.pts };
  const side = ROAD_WIDTH_M / 2 + ROAD_VERGE_M + 5;
  const samples = [];
  for (const [arm, pts] of Object.entries(arms)) {
    let along = 0;
    let next = 15;
    for (let k = 1; k < pts.length - 1 && next <= 110; k++) {
      along += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (along < next) continue;
      next += 15;
      const [E, N] = pts[k];
      const tl = Math.hypot(pts[k + 1][0] - E, pts[k + 1][1] - N);
      const nE = -(pts[k + 1][1] - N) / tl;
      const nN = (pts[k + 1][0] - E) / tl;
      const px = (o) => {
        const v = projectToView(look, aspect, eye, { E: E + nE * o, N: N + nN * o, heightM: heightAt(E + nE * o, N + nN * o) });
        return [v.x * box.width, v.y * box.height];
      };
      samples.push({ arm, along: Math.round(along), road: px(0), a: px(side), b: px(-side) });
    }
  }
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'qa-hide-overlay';
    st.textContent = '[data-obs-overlay], [data-obs-chrome] { visibility: hidden !important; }';
    document.head.append(st);
  });
  await page.waitForTimeout(200);
  const png = (await page.screenshot({ clip: box })).toString('base64');
  await page.evaluate(() => document.getElementById('qa-hide-overlay')?.remove());
  const lum = await page.evaluate(
    async ([data, pts]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      const L = (x, y) => {
        const i = (Math.round(y) * c.width + Math.round(x)) * 4;
        return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      };
      // Road: the brightest of the 3 × 3 around the projected centre (the arm is 2–5 px wide);
      // ground: the mean of a 3 × 3 block.
      const max3 = (x, y) => Math.max(...[-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => L(x + dx, y + dy))));
      const mean3 = (x, y) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => L(x + dx, y + dy))).reduce((s, v) => s + v, 0) / 9;
      return pts.map((s) => ({ road: max3(...s.road), ground: Math.max(mean3(...s.a), mean3(...s.b)) }));
    },
    [png, samples],
  );
  const rows = samples.map((s, i) => ({ ...s, ratio: lum[i].road / Math.max(lum[i].ground, 1) }));
  const weak = rows.filter((r) => r.ratio < 1.15);
  const summary = ['south', 'branch'].map((arm) => {
    const r = rows.filter((x) => x.arm === arm).map((x) => x.ratio);
    return `${arm} ${r.length} points, contrast ${Math.min(...r).toFixed(2)}–${Math.max(...r).toFixed(2)}`;
  });
  if (rows.length < 10 || weak.length > rows.length * 0.15) fail(`${label}: road arms do not stand out — ${summary.join('; ')}; weak at ${weak.map((w) => `${w.arm} ${w.along} m (${w.ratio.toFixed(2)})`).join(', ')}`);
  else ok(`${label}: both arms stand out of the ground at ${Math.round(box.width)}×${Math.round(box.height)} px — ${summary.join('; ')}`);
}

/**
 * One-screen check: every part of the task inside the viewport, no two parts
 * overlapping, body text at least 16 px, card height unchanged.
 */
let cardHeight = null;
async function checkFit(page, label) {
  const m = await page.evaluate(() => {
    const act = document.querySelector('[data-activity="location-check"]');
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    };
    const parts = {
      title: box(act.querySelector('h3')),
      instruction: box(act.querySelector('h3')?.parentElement?.nextElementSibling),
      measurements: box(act.querySelector('[data-measurements]')),
      observation: box(act.querySelector('[data-panel="observation"]')),
      map: box(act.querySelector('[data-panel="map"]')),
      mapTools: box(act.querySelector('[data-map-tools]')),
      areaChoice: box(act.querySelector('[data-choice="area"]')),
      check: box([...act.querySelectorAll('button')].find((b) => b.textContent.includes('בדקו את הבחירה'))),
      feedback: box(act.querySelector('[data-feedback]')),
    };
    // Body text: the instruction, the measurements, the choice, the feedback. (Tags and in-view labels use the design system's chip sizes.)
    const fonts = [...act.querySelectorAll('[data-feedback] p, [data-feedback] li, [data-choice] button, [data-choice] > span, [data-measurements] > div, h3 ~ p, p')]
      .filter((el) => el.offsetParent && !el.closest('.sr-only'))
      .map((el) => parseFloat(getComputedStyle(el).fontSize));
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    return { parts, card: box(act), vh: innerHeight, header, minFont: Math.min(...fonts), overflowY: getComputedStyle(act).overflowY };
  });
  const problems = [];
  for (const [k, b] of Object.entries(m.parts)) {
    if (!b) problems.push(`${k} missing`);
    else if (b.y < m.header - 1 || b.b > m.vh + 0.5) problems.push(`${k} outside the viewport (${Math.round(b.y)}–${Math.round(b.b)})`);
  }
  const entries = Object.entries(m.parts).filter(([, b]) => b);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [ka, a] = entries[i];
      const [kb, b] = entries[j];
      if ((ka === 'title' && kb === 'instruction') || (ka === 'instruction' && kb === 'title')) continue;
      const ix = Math.min(a.r, b.r) - Math.max(a.x, b.x);
      const iy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      if (ix > 1 && iy > 1) problems.push(`${ka} overlaps ${kb}`);
    }
  }
  if (m.minFont < 16) problems.push(`text below 16 px (${m.minFont})`);
  if (m.overflowY === 'auto' || m.overflowY === 'scroll') problems.push('the card scrolls');
  if (m.card.b > m.vh + 0.5) problems.push(`card bottom ${Math.round(m.card.b)} > ${m.vh}`);
  if (cardHeight === null) cardHeight = m.card.h;
  else if (Math.abs(m.card.h - cardHeight) > 0.5) problems.push(`card height changed ${cardHeight} → ${m.card.h}`);
  if (problems.length) fail(`fit [${label}]: ${problems.join('; ')}`);
  else ok(`fit [${label}]: card ${Math.round(m.card.y)}–${Math.round(m.card.b)} of ${m.vh}, all parts visible, no overlaps, min text ${m.minFont}px`);
}

const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const crop = async (page, sel, name) => page.locator(sel).first().screenshot({ path: `${outDir}/${name}.png` });

const browser = await chromium.launch({ channel: 'chrome' });

// ---------------------------------------------------------------- fallback capture
if (CAPTURE) {
  const { ctx, page } = await openActivity(browser, { deviceScaleFactor: 2 });
  await waitFor3D(page);
  await page.addStyleTag({ content: '[data-obs-overlay], [data-obs-chrome] { display: none !important; } [data-activity="location-check"] .rounded-xl { border-radius: 0 !important; }' });
  await page.waitForTimeout(500);
  const box = await frameBox(page);
  if (Math.abs(box.width / box.height - 4 / 3) > 0.01) throw new Error(`frame is not 4:3 (${box.width}×${box.height})`);
  await page.locator('[data-activity="location-check"] canvas').screenshot({ path: 'public/assets/lessons/topic06/location-check/observation-north.jpg', type: 'jpeg', quality: 86 });
  console.log(`fallback picture written (${Math.round(box.width * 2)}×${Math.round(box.height * 2)})`);
  await ctx.close();
  await browser.close();
  process.exit(0);
}

// The area plates' centres in map coordinates (the halo is at the area centre; "אזור 1" sits west of it).
const AREA1 = CANDIDATES.find((c) => c.id === 'area-1').center;
const AREA2 = CANDIDATES.find((c) => c.id === 'area-2').center;
const AREA1_PLATE = { E: 500, N: AREA1.N };

// ---------------------------------------------------------------- mouse flow + screenshots
let mouseFinal;
{
  const { ctx, page, errors } = await openActivity(browser);
  await waitFor3D(page);
  ok('entered via "עקרונות הניווט"');

  // Frames: 4:3 observation, map of the same height.
  const fb = await frameBox(page);
  const mb = await page.locator('[data-panel="map"]').boundingBox();
  if (Math.abs(fb.width / fb.height - 4 / 3) > 0.01) fail(`observation is ${fb.width.toFixed(0)}×${fb.height.toFixed(0)}, not 4:3`);
  else ok(`observation ${fb.width.toFixed(0)}×${fb.height.toFixed(0)} (4:3)`);
  if (Math.abs(mb.height - (fb.height + 2)) > 3) fail(`map height ${mb.height.toFixed(0)} ≠ observation ${fb.height.toFixed(0)}`);
  else ok(`map ${mb.width.toFixed(0)}×${mb.height.toFixed(0)} — same height as the observation`);

  await shot(page, '01-opening');
  await crop(page, '[data-panel="observation"]', '01-opening-observation');
  await crop(page, '[data-panel="map"]', '01-opening-map');
  await checkFit(page, 'opening');

  const s0 = await state(page);
  if (JSON.stringify(Object.keys(s0.selections)) !== '["candidateId"]') fail(`selections hold more than the area: ${JSON.stringify(s0.selections)}`);
  else ok('the only choice is the area');
  if (s0.selections.candidateId || s0.attempt) fail('opening state is not empty');
  if (await count(page, '[data-overlay]')) fail('map layers visible before an area is chosen');
  if ((await feedbackKind(page)) !== 'empty') fail('feedback is not empty at the opening');
  // One radio group in the task (the GPS help dialog has its own, outside the task).
  const groups = await page.evaluate(() => [...document.querySelectorAll('[data-activity="location-check"] [role="radiogroup"]')].filter((g) => !g.closest('dialog')).length);
  if (groups !== 1) fail(`expected exactly one radio group in the task (the area), found ${groups}`);

  const html = await page.locator('[data-activity="location-check"]').evaluate((el) => el.outerHTML);
  if (html.includes('מזלג')) fail('the activity still says "מזלג"');
  else ok('no "מזלג" in the activity (text, labels, aria)');
  const instruction = await page.evaluate(() => document.querySelector('[data-activity="location-check"] h3').parentElement.nextElementSibling.textContent);
  if (instruction.trim() !== 'בחרו אזור והשוו את הכיוון והמרחק במפה למדידות מהשטח.') fail(`instruction text: ${instruction}`);
  else ok('instruction: "בחרו אזור והשוו את הכיוון והמרחק במפה למדידות מהשטח."');

  // Registration at the real frame size: the canvas' own projection vs the pure one.
  const eye = observerEye();
  const look = await page.evaluate(() => window.__lc.look.getLive());
  if (Math.abs(look.yawDeg - INITIAL_LOOK.yawDeg) > 0.01 || Math.abs(look.hfovDeg - INITIAL_LOOK.hfovDeg) > 0.01) fail(`opening look ${JSON.stringify(look)}`);
  const probes = [
    { name: 'F', p: { E: FORK.E, N: FORK.N, heightM: heightAt(FORK.E, FORK.N) } },
    { name: 'G1 crown', p: visibleCrown('G1') },
    { name: 'G2 crown', p: visibleCrown('G2') },
  ];
  for (const { name, p } of probes) {
    const gl = await page.evaluate(([E, N, h]) => window.__lcProbe(E, N, h), [p.E, p.N, p.heightM]);
    const v = projectToView(look, fb.width / fb.height, eye, p);
    const err = Math.hypot(gl[0] - v.x * fb.width, gl[1] - v.y * fb.height);
    if (err > 1.5) fail(`registration ${name}: ${err.toFixed(2)} px`);
    else ok(`registration ${name}: ${err.toFixed(2)} px`);
  }
  const g1x = projectToView(look, fb.width / fb.height, eye, visibleCrown('G1')).x;
  const g2x = projectToView(look, fb.width / fb.height, eye, visibleCrown('G2')).x;
  const fx = projectToView(look, fb.width / fb.height, eye, probes[0].p).x;
  if (!(g1x > 0 && g1x < g2x && g2x < 1 && fx > 1)) fail(`opening view: G1 x=${g1x.toFixed(2)}, G2 x=${g2x.toFixed(2)}, F x=${fx.toFixed(2)}`);
  else ok(`opening view: G1 at x=${g1x.toFixed(2)} (left), G2 at x=${g2x.toFixed(2)} (right), F off-frame right`);

  // A click on a grove in the view is not a choice.
  await clickInView(page, visibleCrown('G1'));
  await page.waitForTimeout(300);
  let s = await state(page);
  if (s.selections.candidateId || s.attempt || (await count(page, '[data-overlay]'))) fail('a click in the observation changed the task');
  else ok('a click on a grove in the observation selects nothing');

  // Area 2 on the map (its halo): the radio follows; the map shows its values, neutral.
  await clickMap(page, AREA2.E, AREA2.N);
  s = await state(page);
  if (s.selections.candidateId !== 'area-2') fail(`map click → ${s.selections.candidateId}`);
  else if ((await areaGroup(page).getByRole('radio', { checked: true }).innerText()).trim() !== 'אזור 2') fail('area radio not in sync with the map click');
  else ok('map click on the area 2 halo → אזור 2 (radio in sync)');
  await checkAreaValues(page, 'area-2', { dir: '008°', dist: '300 מ׳' }, 'area 2 chosen');
  if ((await feedbackKind(page)) !== 'empty') fail('choosing an area produced feedback before the check');
  await shot(page, '02-area2-chosen');
  await crop(page, '[data-panel="map"]', '02-area2-chosen-map');
  await checkFit(page, 'area 2 chosen');

  // Area 2 checked: direction contradiction.
  await checkButton(page).click();
  await page.waitForTimeout(700);
  s = await state(page);
  const r2 = s.attempt?.result;
  if (r2?.kind !== 'contradicted' || r2.direction.consistent || !r2.distance.consistent) fail('area 2 should fail on direction only');
  else ok(`area 2: contradicted on direction (predicted ${r2.direction.predictedDeg.toFixed(2)}°), distance fits`);
  const wrongText = await page.locator('[data-feedback]').innerText();
  if (!/אזור 2 אינו מתאים למדידות/.test(wrongText) || !/008°/.test(wrongText) || !/043°/.test(wrongText) || !/התפצלות הדרך/.test(wrongText)) fail(`area 2 feedback: ${wrongText}`);
  else ok('area 2 feedback explains: distance fits both, direction 008° not 043°');
  if (/חורש/.test(wrongText)) fail('feedback still mentions a grove');
  if (!(await count(page, '[data-overlay="result"]'))) fail('no result layers after the check');
  await shot(page, '03-area2-contradiction');
  await crop(page, '[data-panel="map"]', '03-area2-contradiction-map');
  await checkFit(page, 'area 2 contradiction');
  // The full reasoning on demand.
  await page.getByRole('button', { name: 'פירוט הבדיקה' }).click();
  await page.waitForTimeout(250);
  await shot(page, '03b-area2-details');
  await page.keyboard.press('Escape');

  // Area 1 by its name plate on the map: the old result is void, area 1's values shown.
  await clickMap(page, AREA1_PLATE.E, AREA1_PLATE.N);
  s = await state(page);
  if (s.selections.candidateId !== 'area-1') fail(`click on the "אזור 1" plate → ${s.selections.candidateId}`);
  else ok('map click on the "אזור 1" name plate → אזור 1');
  if ((await feedbackKind(page)) !== 'stale') fail('changed area should show the stale notice');
  await checkAreaValues(page, 'area-1', { dir: '043°', dist: '300 מ׳' }, 'area 1 chosen after a check');

  // Area 1 checked: success.
  await checkButton(page).click();
  await page.waitForTimeout(900);
  s = await state(page);
  if (s.attempt?.result.kind !== 'supported') fail(`area 1 should succeed, got ${s.attempt?.result.kind}`);
  else ok('area 1: supported');
  const okText = await page.locator('[data-feedback]').innerText();
  if (!/אזור 1 מתאים למדידות/.test(okText) || !/043°/.test(okText)) fail(`success feedback: ${okText}`);
  else ok('area 1 feedback explains: direction 043° as measured, distance fits both');
  if (!(await count(page, '[data-overlay="observer"]'))) fail('observation point missing after success');
  await shot(page, '04-success');
  await crop(page, '[data-panel="map"]', '04-success-map');
  await checkFit(page, 'success');
  mouseFinal = JSON.stringify(s.selections);

  // Change after success (buttons): stale, old result layers gone, the new area's neutral values.
  await areaGroup(page).getByRole('radio', { name: 'אזור 2' }).click();
  await page.waitForTimeout(400);
  const fbText = await page.locator('[data-feedback]').innerText();
  if ((await feedbackKind(page)) !== 'stale' || !/הבחירה השתנתה — בדקו שוב/.test(fbText)) fail('change after success did not void the result');
  else ok('change after success → "הבחירה השתנתה — בדקו שוב"');
  if (await count(page, '[data-overlay="observer"], [data-overlay="result"]')) fail('old result layers still shown after a change');
  else ok('old result layers removed after a change');
  await checkAreaValues(page, 'area-2', { dir: '008°', dist: '300 מ׳' }, 'area 2 after a change');
  await shot(page, '05-changed-after-success');
  await crop(page, '[data-panel="map"]', '05-changed-after-success-map');
  await checkFit(page, 'changed after success');

  // The measurement stays fixed; "הראו את התפצלות הדרך" only turns the view.
  const before = JSON.stringify((await state(page)).selections);
  await page.getByRole('button', { name: 'הראו את התפצלות הדרך' }).click();
  await page.waitForTimeout(1200);
  const t = await page.evaluate(() => window.__lc.look.getTarget());
  if (Math.abs(t.yawDeg - 43) > 0.01 || t.hfovDeg !== LOOK_LIMITS.hfovMin) fail(`"הראו את התפצלות הדרך" set ${JSON.stringify(t)}`);
  else ok(`"הראו את התפצלות הדרך" turns the view to 043° and frames the split at ${t.hfovDeg}°`);
  if (JSON.stringify((await state(page)).selections) !== before) fail('"הראו את התפצלות הדרך" changed the choice');
  const measured = await page.locator('[data-measurements]').innerText();
  if (!/043°/.test(measured)) fail('measured bearing changed after turning the view');
  else ok('measured bearing still 043° while the view looks elsewhere');
  await crop(page, '[data-panel="observation"]', '06-road-split-view');
  await shot(page, '06-road-split');
  await checkRoadContrast(page, 'road split (normal size)');

  // Help dialog.
  await page.getByRole('button', { name: /למה אין GPS/ }).click();
  await page.waitForTimeout(300);
  if (!(await count(page, 'dialog[data-dialog="gps-help"][open]'))) fail('help dialog did not open');
  await shot(page, '06b-gps-help');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await count(page, 'dialog[data-dialog="gps-help"][open]')) fail('help dialog did not close with Escape');
  else ok('help dialog opens and closes with Escape');

  // Reset.
  await page.getByRole('button', { name: /איפוס/ }).click();
  await page.waitForTimeout(1200);
  s = await state(page);
  const lookAfter = await page.evaluate(() => window.__lc.look.getTarget());
  if (s.selections.candidateId || s.attempt || (await count(page, '[data-overlay]'))) fail('reset left a choice, a result or map layers');
  else if (lookAfter.yawDeg !== INITIAL_LOOK.yawDeg || lookAfter.hfovDeg !== INITIAL_LOOK.hfovDeg) fail('reset did not return to the opening view');
  else ok('reset → opening state and opening view');

  // Navigate to another sub-topic and back.
  const listenersBefore = await page.evaluate(() => ({ ...window.__lcListeners }));
  await page.getByRole('button', { name: /תכנון ציר/ }).first().click();
  await page.waitForTimeout(1500);
  if (await count(page, '[data-activity="location-check"] canvas')) fail('canvas left behind after leaving the sub-topic');
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector('[data-activity="location-check"]');
  for (let y = 0; y < 7000; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(60);
  }
  await alignActivity(page);
  await waitFor3D(page);
  const canvases = await count(page, 'canvas');
  const after = await page.evaluate(() => ({ ...window.__lcListeners }));
  const grew = Object.keys(after).filter((k) => /fullscreenchange|resize|keydown|pointer/.test(k) && (after[k] ?? 0) > (listenersBefore[k] ?? 0));
  if (canvases !== 1) fail(`${canvases} canvases after returning`);
  else ok('one canvas after returning');
  if (grew.length) fail(`listeners grew after returning: ${grew.map((k) => `${k} ${listenersBefore[k]}→${after[k]}`).join(', ')}`);
  else ok('no duplicated document/window listeners after returning');

  if (errors.length) fail(`console errors (mouse run): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- keyboard-only flow
{
  const { ctx, page, errors } = await openActivity(browser);
  await waitFor3D(page);
  await areaGroup(page).getByRole('radio').first().focus();
  await page.keyboard.press('Space'); // אזור 1
  await page.keyboard.press('ArrowLeft'); // RTL: next option = אזור 2
  let s = await state(page);
  if (s.selections.candidateId !== 'area-2') fail(`ArrowLeft chose ${s.selections.candidateId}`);
  await page.keyboard.press('ArrowRight'); // back to אזור 1
  await checkButton(page).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  s = await state(page);
  if (s.attempt?.result.kind !== 'supported') fail(`keyboard flow verdict ${s.attempt?.result.kind}`);
  else if (JSON.stringify(s.selections) !== mouseFinal) fail(`keyboard selections ${JSON.stringify(s.selections)} ≠ mouse ${mouseFinal}`);
  else ok('keyboard flow = mouse flow (supported)');
  await page.locator('[data-obs-frame]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const look = await page.evaluate(() => window.__lc.look.getTarget());
  if (Math.abs(look.yawDeg - (INITIAL_LOOK.yawDeg + 10)) > 0.01) fail(`arrow keys turned the view to ${look.yawDeg}`);
  else ok('arrow keys turn the view');
  if (errors.length) fail(`console errors (keyboard run): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- loading
{
  // Hold the ground textures back: the panel shows its loading state, the task
  // stays usable through the area buttons, and nothing reveals the answer.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
  let release;
  const gate = new Promise((r) => (release = r));
  await ctx.route('**/location-check/textures/**', async (route) => {
    await gate;
    await route.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector('[data-activity="location-check"]');
  await alignActivity(page);
  await page.waitForFunction(() => document.body.innerText.includes('טוען תצפית תלת־ממדית'), null, { timeout: 120000 });
  await crop(page, '[data-panel="observation"]', '00-loading-observation');
  const overlayWhileLoading = await count(page, '[data-obs-overlay]');
  await areaGroup(page).getByRole('radio').first().click();
  const s = await state(page);
  if (overlayWhileLoading) fail('loading: labels drawn over an unloaded view');
  else if (s.selections.candidateId !== 'area-1' || s.attempt || (await count(page, '[data-overlay="result"], [data-overlay="observer"]'))) fail('loading: area choice not usable, or a result appeared');
  else ok('loading: placeholder shown, area choice usable, nothing revealed');
  release();
  await waitFor3D(page);
  if (errors.length) fail(`console errors (loading): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const { ctx, page, errors } = await openActivity(browser, { reducedMotion: 'reduce' });
  await waitFor3D(page);
  await page.getByRole('button', { name: 'הראו את התפצלות הדרך' }).click();
  await page.waitForTimeout(250);
  const live = await page.evaluate(() => window.__lc.look.getLive());
  if (Math.abs(live.yawDeg - 43) > 0.01) fail(`reduced motion: camera eased (${live.yawDeg})`);
  else ok('reduced motion: camera jumps, no easing');
  if (errors.length) fail(`console errors (reduced motion): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();

// ---------------------------------------------------------------- no WebGL
{
  const noGl = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const { ctx, page, errors } = await openActivity(noGl);
  await page.waitForTimeout(1500);
  const img = page.locator('[data-obs-frame] img');
  if ((await count(page, '[data-activity="location-check"] canvas')) || !(await img.count())) fail('no-WebGL: expected the static picture, not a canvas');
  else {
    const { w, h } = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
    if (!w) fail('no-WebGL: static picture failed to load');
    else if (Math.abs(w / h - 4 / 3) > 0.01) fail(`no-WebGL: picture is ${w}×${h}, not 4:3`);
    else ok(`no-WebGL: static 4:3 picture (${w}×${h})`);
  }
  await areaGroup(page).getByRole('radio').first().click();
  await checkButton(page).click();
  await page.waitForTimeout(700);
  const s = await state(page);
  if (s.attempt?.result.kind !== 'supported') fail('no-WebGL: check did not work');
  else ok('no-WebGL: area choice + check work');
  if (!(await page.getByRole('button', { name: 'הראו את התפצלות הדרך' }).isDisabled())) fail('no-WebGL: "הראו את התפצלות הדרך" should be disabled');
  await shot(page, '07-no-webgl');
  await checkFit(page, 'no WebGL');
  if (errors.filter((e) => !/WebGL|webgl/.test(e)).length) fail(`console errors (no WebGL): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
  await noGl.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
