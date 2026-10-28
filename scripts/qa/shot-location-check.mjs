// Browser QA for the lesson-6 location-check activity ("באיזה אזור אתם נמצאים?"),
// as implemented after task 30 and its follow-up (2026-10-27): field readings above
// the views; the decision (area → check → reset) at the top of a control column at
// the inline end of the views, the map tools at its foot (2026-10-28: one screen,
// card ≤ 760 px at 1344); one fixed-height result panel under the views; no
// road-split button, no GPS help dialog, no measurement boxes, no "פירוט" popover.
//
// Usage (dev server running; default http://localhost:3000):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-location-check.mjs [outDir] [--base=http://localhost:3000] [--capture-fallback]
//
// Checks (exit code 1 on any failure):
//   entry          the scene is reached through the side-nav button "עקרונות הניווט"
//   fit            at 1440 × 1122, card under the site header: title, instruction, field readings,
//                  both views, decision, map tools and result panel inside the viewport and not
//                  overlapping; body text ≥ 16 px; one live region; the result never overflows its
//                  panel; nothing moves or resizes between states; the same card height in every run
//   field readings 043° to the road split and about 300 m from the last known position (READINGS),
//                  above the views from the opening on, unchanged in every state
//   frames         observation 4:3, the map the same height
//   registration   the canvas' own projection (dev probe) vs projectToView() for F and a crown of
//                  each grove, at the frame's real size — ≤ 1.5 px
//   opening view   G1 left of G2, both inside the frame; F off-frame to the right
//   one choice     a click in the observation selects nothing; map clicks (halo, name plate) and the
//                  radio buttons choose the same area and stay in sync
//   map values     a chosen area shows its bearing and distance in plain ink before any check:
//                  300 מ׳ for both areas (the distance cannot decide), 043° vs 008°
//   no area        a check with no area: "עדיין לא נבחר אזור", no verdict; the area chosen next is a
//                  first choice, not a change (feedback "pending", view().stale false)
//   wrong          area 2: ✗ direction 008° vs 043° (35°, 5° allowed), ✓ distance; says what to
//                  match again; never names area 1; no scenario viewpoint on the map
//   change         after a check: "הבחירה השתנתה — … עדיין לא נבדק", old result layers gone
//   success        area 1: both rows ✓, worded to the evidence (an area, not a point; keep checking
//                  along the route); the map marks "נקודת התצפית בתרחיש" inside area 1 with the field
//                  of view, never "מיקום הצופה", its label clear of every other map label; the map key
//                  separates the supported area from the scenario viewpoint, only after success
//   after success  a change voids it; re-choosing the checked area shows its verdict; reset returns
//                  to the opening state and view
//   road split     at the road-split look both arms are brighter than the ground beside them
//   nav            another sub-topic and back: one canvas, no duplicated document/window listeners
//   keyboard       radios (arrows, RTL) → Tab "בדקו את הבחירה" (Enter) → Shift+Tab, correct → Tab
//                  "איפוס" (Space); arrow keys on the observation turn the view
//   loading        ground textures held: the shared loader "טוען תצפית תלת־ממדית…" over the frame,
//                  the readings and the choice usable, nothing revealed; released: the loader is gone
//                  once the canvas is drawn
//   reduced motion a new look is applied at once, no easing
//   no WebGL       static 4:3 picture, no loader; same layout; wrong → change → success, same feedback
//                  and the same scenario-viewpoint mark
//   console        no page errors
// --capture-fallback renders public/assets/lessons/topic06/location-check/observation-north.jpg
// from the live canvas at the opening look (overlays hidden), 4:3 at 2×.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { CANDIDATES, FORK, OBSERVER, READINGS, ROAD_WIDTH_M } from '../../src/components/lessons/topic-06/locationCheckScenario.ts';
import { distance, formatBearing, projectToView, worldToMap } from '../../src/components/lessons/topic-06/locationCheckGeometry.ts';
import { ROAD_VERGE_M, crownShape, groveTrees, heightAt, observerEye, roads, terrainClear } from '../../src/components/lessons/topic-06/locationCheckTerrain.ts';
import { view } from '../../src/components/lessons/topic-06/locationCheckState.ts';
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

const ACT = '[data-activity="location-check"]';
const VIEWPOINT = 'נקודת התצפית בתרחיש';
const LOADER = 'טוען תצפית תלת־ממדית';
/** Text as read: bidi isolates dropped, spaces collapsed. */
const norm = (s) => s.replace(/[⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();

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

async function openActivity(browser, opts = {}, { route } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  await ctx.addInitScript(LISTENER_SPY);
  if (route) await ctx.route(route.pattern, route.handler);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  // Entry through the side-nav button, not the hash alone.
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector(`#scene-principles ${ACT}`, { state: 'attached', timeout: 60000 });
  await scrollThrough(page);
  await alignActivity(page);
  return { ctx, page, errors };
}

/** Scroll down the lesson once so lazy content above the card has its real height. */
async function scrollThrough(page) {
  for (let y = 0; y < 7000; y += 700) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
}

/** Card top just under the site header. */
async function alignActivity(page) {
  await page.evaluate((sel) => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 16, behavior: 'instant' });
  }, ACT);
  await page.waitForTimeout(400);
}

const waitFor3D = (page) =>
  page
    .waitForFunction(([sel, loader]) => document.querySelector(`${sel} canvas`) && !document.querySelector(sel).innerText.includes(loader), [ACT, LOADER], { timeout: 240000 })
    .then(() => page.waitForTimeout(800));

const act = (page) => page.locator(ACT);
const state = (page) => page.evaluate(() => window.__lc.state);
const viewOf = async (page) => view(await state(page));
const frameBox = (page) => page.locator('[data-obs-frame]').boundingBox();
const areaGroup = (page) => act(page).getByRole('radiogroup', { name: 'בחרו אזור' });
const radio = (page, name) => areaGroup(page).getByRole('radio', { name });
const checkButton = (page) => act(page).getByRole('button', { name: 'בדקו את הבחירה' });
const resetButton = (page) => act(page).getByRole('button', { name: 'איפוס' });
const feedbackKind = (page) => act(page).locator('[data-feedback]').getAttribute('data-feedback');
const feedbackText = async (page) => norm(await act(page).locator('[data-feedback]').innerText());
const count = (page, sel) => page.locator(sel).count();
const resultLayers = (page) => count(page, '[data-panel="map"] [data-overlay="result"], [data-panel="map"] [data-overlay="observer"]');

/** Client px of a map point (E, N) through the SVG's own screen CTM. */
async function mapPoint(page, E, N) {
  const m = worldToMap({ E, N });
  return page.evaluate(
    ([x, y]) => {
      const svg = document.querySelector('[data-panel="map"] svg');
      const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    [m.x, m.y],
  );
}
async function clickMap(page, E, N) {
  const pt = await mapPoint(page, E, N);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(350);
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

/** Every value the activity shows from READINGS, as displayed. */
const FIELD = { bearing: formatBearing(READINGS.forkBearingDeg), distance: `כ־${READINGS.distanceM} מ׳` };

/** The field readings line: both values, from the opening on. */
async function checkReadings(page, label) {
  const el = act(page).locator('[data-field-readings]');
  if (!(await el.count())) return fail(`${label}: no field readings line`);
  const t = norm(await el.innerText());
  if (!t.includes(FIELD.bearing) || !t.includes(FIELD.distance) || !/נמדד בשטח/.test(t) || !/התפצלות הדרך/.test(t) || !/המיקום האחרון/.test(t))
    fail(`${label}: field readings "${t}"`);
  else ok(`${label}: field readings "${t}"`);
  return t;
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
 * The scenario viewpoint on the map: absent unless the check succeeded; when
 * shown, named as the scenario's, inside area 1's halo, its label clear of
 * every other label on the sheet.
 */
async function checkViewpoint(page, expected, label) {
  const v = await page.evaluate(() => {
    const svg = document.querySelector('[data-panel="map"] svg');
    const g = svg.querySelector('[data-overlay="observer"]');
    if (!g) return null;
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, r: b.right, b: b.bottom };
    };
    const own = [...g.querySelectorAll('text')];
    const ownBoxes = own.map(box);
    const clashes = [...svg.querySelectorAll('text')]
      .filter((t) => !g.contains(t) && t.textContent.trim())
      .filter((t) => {
        const b = box(t);
        return ownBoxes.some((o) => Math.min(o.r, b.r) - Math.max(o.x, b.x) > 1 && Math.min(o.b, b.b) - Math.max(o.y, b.y) > 1);
      })
      .map((t) => t.textContent.trim());
    const dot = [...g.querySelectorAll('circle')].at(-1);
    const halo = svg.querySelector('[data-candidate="area-1"] circle');
    return {
      label: own.map((t) => t.textContent.trim()).join(' '),
      clashes,
      dot: { x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy') },
      halo: { x: +halo.getAttribute('cx'), y: +halo.getAttribute('cy'), r: +halo.getAttribute('r'), fill: halo.getAttribute('fill') },
    };
  });
  if (!expected) {
    if (v) fail(`${label}: the scenario viewpoint is on the map before a successful check`);
    return;
  }
  if (!v) return fail(`${label}: no scenario viewpoint after success`);
  const problems = [];
  if (v.label !== VIEWPOINT) problems.push(`label "${v.label}"`);
  const o = worldToMap(OBSERVER);
  if (Math.hypot(v.dot.x - o.x, v.dot.y - o.y) > 0.5) problems.push(`mark at ${v.dot.x},${v.dot.y}, not OBSERVER`);
  if (Math.hypot(v.dot.x - v.halo.x, v.dot.y - v.halo.y) > v.halo.r) problems.push('mark outside the area 1 halo');
  if (v.halo.fill === 'none') problems.push('area 1 not drawn as the chosen area');
  if (v.clashes.length) problems.push(`label overlaps ${v.clashes.map((c) => `"${c}"`).join(', ')}`);
  if (problems.length) fail(`${label}: scenario viewpoint — ${problems.join('; ')}`);
  else ok(`${label}: map marks "${VIEWPOINT}" at the scenario's observer, inside the chosen area 1, label clear of the other labels`);
}

/** The map key's entries (opened through its own button, closed with Escape). */
async function legendText(page) {
  await act(page).getByRole('button', { name: 'מקרא המפה' }).click();
  await page.waitForTimeout(250);
  const t = norm(await act(page).locator('[data-legend="map"]').innerText());
  return t;
}
const closeLegend = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
};

/** The look at which the road split is framed (yaw = the measured bearing, the narrowest field of view). */
function roadSplitLook() {
  const eye = observerEye();
  const elev = (Math.atan2(heightAt(FORK.E, FORK.N) - eye.heightM, distance(OBSERVER, FORK)) * 180) / Math.PI;
  return { yawDeg: READINGS.forkBearingDeg, pitchDeg: elev - 3, hfovDeg: LOOK_LIMITS.hfovMin };
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
 * One screen, and nothing moves: every part inside the viewport under the
 * header, no two parts overlapping, body text ≥ 16 px, one live region, the
 * result inside its panel, the field readings unchanged; each part's top and
 * height equal to the run's first state, the card's height equal in every run.
 */
let firstCardHeight = null;
let readingsText = null;
let reference = null;
async function layout(page, label) {
  const m = await page.evaluate((sel) => {
    const a = document.querySelector(sel);
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 };
    };
    const fb = a.querySelector('[data-feedback]');
    const fonts = [...a.querySelectorAll('[data-feedback] *, [data-decision] *, h3 ~ p, h3 ~ p *')]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest('.sr-only') && !el.closest('button:not([role="radio"])'))
      .map((el) => parseFloat(getComputedStyle(el).fontSize));
    const buttons = [...a.querySelectorAll('button')];
    return {
      header: document.querySelector('header')?.getBoundingClientRect().bottom ?? 0,
      vh: innerHeight,
      card: r(a),
      // Side-by-side parts that must not overlap.
      parts: {
        title: r(a.querySelector('h3')),
        instruction: r(a.querySelector('h3 + p')),
        readings: r(a.querySelector('[data-field-readings]')),
        observation: r(a.querySelector('[data-panel="observation"]')),
        map: r(a.querySelector('[data-panel="map"]')),
        decision: r(a.querySelector('[data-decision]')),
        mapTools: r(a.querySelector('[data-map-tools]')),
        feedback: r(fb),
      },
      // Controls inside the decision row: only "inside the viewport".
      controls: {
        areaChoice: r(a.querySelector('[data-choice="area"]')),
        check: r(buttons.find((b) => b.textContent.trim() === 'בדקו את הבחירה')),
        reset: r(buttons.find((b) => b.textContent.trim() === 'איפוס')),
      },
      overflow: fb.scrollHeight - fb.clientHeight,
      contentBottom: fb.firstElementChild.getBoundingClientRect().bottom,
      fbInnerBottom: fb.getBoundingClientRect().bottom - parseFloat(getComputedStyle(fb).paddingBottom) * (fb.getBoundingClientRect().height / fb.offsetHeight) + 0.5,
      minFont: Math.min(...fonts),
      scale: a.getBoundingClientRect().width / a.offsetWidth,
      liveRegions: a.querySelectorAll('[aria-live]').length,
      overflowY: getComputedStyle(a).overflowY,
      readings: (a.querySelector('[data-field-readings]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      html: a.outerHTML,
    };
  }, ACT);
  const p = [];
  for (const [k, b] of Object.entries({ card: m.card, ...m.parts, ...m.controls })) {
    if (!b) p.push(`${k} missing`);
    else if (b.y < m.header - 1 || b.y + b.h > m.vh + 0.5) p.push(`${k} outside the viewport (${b.y}–${Math.round(b.y + b.h)})`);
  }
  const entries = Object.entries(m.parts).filter(([, b]) => b);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [ka, a] = entries[i];
      const [kb, b] = entries[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 1 && iy > 1) p.push(`${ka} overlaps ${kb}`);
    }
  }
  const { observation, decision, mapTools, feedback, readings } = m.parts;
  if (readings && observation && readings.y + readings.h > observation.y) p.push('field readings not above the views');
  // 2026-10-28 layout: the decision tops a control column at the inline end (left) of the map,
  // level with the views' top; the map tools sit at its foot, level with the map's bottom edge.
  const { map } = m.parts;
  if (decision && map && decision.x + decision.w > map.x + 1) p.push('decision not beside the map at the inline end');
  if (decision && observation && Math.abs(decision.y - observation.y) > 3) p.push('decision not level with the top of the views');
  if (mapTools && map && Math.abs(mapTools.y + mapTools.h - (map.y + map.h)) > 3) p.push('map tools not level with the bottom of the map');
  if (mapTools && decision && mapTools.y < decision.y + decision.h) p.push('map tools not under the decision');
  if (feedback && decision && feedback.y < decision.y + decision.h) p.push('result panel not under the decision');
  if (feedback && observation && feedback.y < observation.y + observation.h) p.push('result panel not under the views');
  if (m.card.h / m.scale > 760.5) p.push(`card ${Math.round(m.card.h / m.scale)} px tall at 1344 (max 760)`);
  if (m.overflow > 0) p.push(`result overflows by ${m.overflow}px`);
  if (m.contentBottom > m.fbInnerBottom) p.push(`result content ends ${Math.round(m.contentBottom - m.fbInnerBottom)}px into the panel's padding`);
  if (m.minFont < 16) p.push(`text below 16px (${m.minFont})`);
  if (m.liveRegions !== 1) p.push(`${m.liveRegions} live regions in the activity (expected 1)`);
  if (m.overflowY === 'auto' || m.overflowY === 'scroll') p.push('the card scrolls');
  if (m.html.includes('מיקום הצופה')) p.push('"מיקום הצופה" in the activity');
  if (m.html.includes('מזלג')) p.push('"מזלג" in the activity');
  if (readingsText === null) readingsText = m.readings;
  else if (m.readings !== readingsText) p.push(`field readings changed: "${m.readings}"`);
  if (firstCardHeight === null) firstCardHeight = m.card.h;
  else if (Math.abs(m.card.h - firstCardHeight) > 0.5) p.push(`card height ${firstCardHeight} → ${m.card.h}`);
  const now = { card: m.card, ...m.parts, ...m.controls };
  if (!reference) reference = now;
  else
    for (const k of Object.keys(reference)) {
      const a = reference[k];
      const b = now[k];
      if (a && b && (Math.abs(a.y - b.y) > 0.5 || Math.abs(a.h - b.h) > 0.5)) p.push(`${k} moved/resized ${a.y}/${a.h} → ${b.y}/${b.h}`);
    }
  if (p.length) fail(`layout [${label}]: ${p.join('; ')}`);
  else ok(`layout [${label}]: card ${m.card.y}–${Math.round(m.card.y + m.card.h)} of ${m.vh}, all parts visible, no overlaps, nothing moved, result fits, min text ${m.minFont}px (×${m.scale.toFixed(4)} on screen)`);
}

const shot = async (page, name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  await act(page).screenshot({ path: `${outDir}/${name}-card.png` });
};
const crop = (page, sel, name) => page.locator(sel).first().screenshot({ path: `${outDir}/${name}.png` });

const browser = await chromium.launch({ channel: 'chrome' });

// ---------------------------------------------------------------- fallback capture
if (CAPTURE) {
  const { ctx, page } = await openActivity(browser, { deviceScaleFactor: 2 });
  await waitFor3D(page);
  await page.addStyleTag({ content: '[data-obs-overlay], [data-obs-chrome] { display: none !important; } [data-activity="location-check"] .rounded-xl { border-radius: 0 !important; }' });
  await page.waitForTimeout(500);
  const box = await frameBox(page);
  if (Math.abs(box.width / box.height - 4 / 3) > 0.01) throw new Error(`frame is not 4:3 (${box.width}×${box.height})`);
  await page.locator(`${ACT} canvas`).screenshot({ path: 'public/assets/lessons/topic06/location-check/observation-north.jpg', type: 'jpeg', quality: 86 });
  console.log(`fallback picture written (${Math.round(box.width * 2)}×${Math.round(box.height * 2)})`);
  await ctx.close();
  await browser.close();
  process.exit(0);
}

const AREA1 = CANDIDATES.find((c) => c.id === 'area-1').center;
const AREA2 = CANDIDATES.find((c) => c.id === 'area-2').center;
// The "אזור 1" name plate sits west of its halo.
const AREA1_PLATE = { E: 500, N: AREA1.N };

const WRONG_ROWS = (t) =>
  [
    [/^אזור 2 אינו מתאים למדידות/, 'title names area 2'],
    [/כיוון להתפצלות הדרך במפה 008° נמדד בשטח 043° אינו מתאים: פער 35°, מותר עד 5°/, 'direction row'],
    [/מרחק מהמיקום האחרון במפה 300 מ׳ נמדד בשטח כ־300 מ׳ מתאים: בטווח 260–340 מ׳/, 'distance row'],
    [/המרחק מתאים לשני האזורים ואינו מכריע ביניהם/, 'distance cannot decide'],
    [/בדקו במפה מאיזה אזור הכיוון להתפצלות הדרך קרוב ל־043°/, 'what to match again'],
  ].filter(([re]) => !re.test(t)).map(([, what]) => what);

const SUCCESS_ROWS = (t) =>
  [
    [/^אזור 1 מתאים לשתי המדידות/, 'title'],
    [/כיוון להתפצלות הדרך במפה 043° נמדד בשטח 043° מתאים: פער 0°, מותר עד 5°/, 'direction row'],
    [/מרחק מהמיקום האחרון במפה 300 מ׳ נמדד בשטח כ־300 מ׳ מתאים: בטווח 260–340 מ׳/, 'distance row'],
    [/המרחק מתאים לשני האזורים, ולכן הכיוון הוא שמכריע/, 'the direction decides'],
    [/המדידות תומכות באזור, לא בנקודה מדויקת בתוכו/, 'an area, not a point'],
    [/במצב אמיתי ממשיכים לבדוק את ההתאמה לאורך הדרך/, 'keep checking along the route'],
  ].filter(([re]) => !re.test(t)).map(([, what]) => what);

const CERTAINTY = /בוודאות|מיקום מדויק|מצאתם את המיקום|אתם נמצאים ב|מיקום הצופה|נכון!/;

// ---------------------------------------------------------------- mouse: every state
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

  // Opening: the task, both field readings, an empty result, a clean map.
  const instruction = norm(await act(page).locator('h3 + p').innerText());
  if (instruction !== 'כשקליטת אותות הלוויין חסומה או משובשת, אי אפשר להסתמך על GPS, וקובעים את המיקום לפי המפה, המצפן וסימני השטח. בחרו אזור והשוו את הכיוון והמרחק במפה למדידות מהשטח.') fail(`instruction text: ${instruction}`);
  else ok(`instruction: "${instruction}"`);
  await checkReadings(page, 'opening');
  let s = await state(page);
  if (JSON.stringify(Object.keys(s.selections)) !== '["candidateId"]') fail(`selections hold more than the area: ${JSON.stringify(s.selections)}`);
  if (s.selections.candidateId || s.attempt) fail('opening state is not empty');
  if (await count(page, '[data-panel="map"] [data-overlay]')) fail('map layers visible before an area is chosen');
  let t = await feedbackText(page);
  // 2026-10-27 copy cleanup: the empty panel keeps its height and says nothing.
  if ((await feedbackKind(page)) !== 'empty' || t.trim() !== '') fail(`opening result panel: ${t}`);
  else ok('opening: no choice, an empty result panel, clean map');
  const order = await page.evaluate((sel) => {
    const d = document.querySelector(`${sel} [data-decision]`);
    return [...d.querySelectorAll('[data-choice] > span, [role="radio"], button:not([role])')].map((e) => e.textContent.trim());
  }, ACT);
  if (order.join('|') !== 'בחרו אזור|אזור 1|אזור 2|בדקו את הבחירה|איפוס') fail(`decision order: ${order.join(' → ')}`);
  else ok(`decision row in reading order: ${order.join(' → ')}`);
  if ((await count(page, `${ACT} [role="radiogroup"]`)) !== 1) fail('expected exactly one radio group (the area)');
  await layout(page, 'opening');
  await shot(page, '01-opening');
  await crop(page, '[data-panel="map"]', '01-opening-map');

  // Registration at the real frame size: the canvas' own projection vs the pure one. The canvas
  // measures its untransformed (layout) size under the laptop fit, so the probe's px are layout px.
  const eye = observerEye();
  const look = await page.evaluate(() => window.__lc.look.getLive());
  const layoutFrame = await page.evaluate(() => {
    const f = document.querySelector('[data-obs-frame]');
    return { width: f.offsetWidth, height: f.offsetHeight };
  });
  if (Math.abs(look.yawDeg - INITIAL_LOOK.yawDeg) > 0.01 || Math.abs(look.hfovDeg - INITIAL_LOOK.hfovDeg) > 0.01) fail(`opening look ${JSON.stringify(look)}`);
  const probes = [
    { name: 'F', p: { E: FORK.E, N: FORK.N, heightM: heightAt(FORK.E, FORK.N) } },
    { name: 'G1 crown', p: visibleCrown('G1') },
    { name: 'G2 crown', p: visibleCrown('G2') },
  ];
  for (const { name, p } of probes) {
    const gl = await page.evaluate(([E, N, h]) => window.__lcProbe(E, N, h), [p.E, p.N, p.heightM]);
    const v = projectToView(look, layoutFrame.width / layoutFrame.height, eye, p);
    const err = Math.hypot(gl[0] - v.x * layoutFrame.width, gl[1] - v.y * layoutFrame.height);
    if (err > 1.5) fail(`registration ${name}: ${err.toFixed(2)} px (frame ${layoutFrame.width}×${layoutFrame.height} layout px)`);
    else ok(`registration ${name}: ${err.toFixed(2)} px (frame ${layoutFrame.width}×${layoutFrame.height} layout px)`);
  }
  const g1x = projectToView(look, fb.width / fb.height, eye, visibleCrown('G1')).x;
  const g2x = projectToView(look, fb.width / fb.height, eye, visibleCrown('G2')).x;
  const fx = projectToView(look, fb.width / fb.height, eye, probes[0].p).x;
  if (!(g1x > 0 && g1x < g2x && g2x < 1 && fx > 1)) fail(`opening view: G1 x=${g1x.toFixed(2)}, G2 x=${g2x.toFixed(2)}, F x=${fx.toFixed(2)}`);
  else ok(`opening view: G1 at x=${g1x.toFixed(2)} (left), G2 at x=${g2x.toFixed(2)} (right), F off-frame right`);

  // A click on a grove in the view is not a choice.
  await clickInView(page, visibleCrown('G1'));
  await page.waitForTimeout(300);
  s = await state(page);
  if (s.selections.candidateId || s.attempt || (await count(page, '[data-panel="map"] [data-overlay]'))) fail('a click in the observation changed the task');
  else ok('a click on a grove in the observation selects nothing');

  // Check with no area.
  await checkButton(page).click();
  await page.waitForTimeout(400);
  t = await feedbackText(page);
  s = await state(page);
  if ((await feedbackKind(page)) !== 'missing' || !/^עדיין לא נבחר אזור/.test(t) || /מתאים/.test(t)) fail(`check without a choice: ${t}`);
  else ok(`check without a choice: "${t}" — names what is missing, no verdict`);
  if (s.selections.candidateId || s.attempt?.result.kind !== 'missing') fail(`check without a choice left ${JSON.stringify(s)}`);
  if (await resultLayers(page)) fail('result layers after a check with no area');
  await layout(page, 'check without a choice');
  await shot(page, '02-check-without-choice');

  // Area 2 on the map (its halo): a first choice, not a change; the radio follows; neutral values.
  await clickMap(page, AREA2.E, AREA2.N);
  s = await state(page);
  t = await feedbackText(page);
  if (s.selections.candidateId !== 'area-2') fail(`map click → ${s.selections.candidateId}`);
  else if (norm(await areaGroup(page).getByRole('radio', { checked: true }).innerText()) !== 'אזור 2') fail('area radio not in sync with the map click');
  else ok('map click on the area 2 halo → אזור 2 (radio in sync)');
  if ((await feedbackKind(page)) !== 'pending' || !/^אזור 2 נבחר — עדיין לא נבדק/.test(t) || /השתנתה/.test(t)) fail(`area 2 chosen after a check with no area: ${t}`);
  else ok(`area 2 after a check with no area: "${t.split('.')[0]}" — a first choice, not a change`);
  if ((await viewOf(page)).stale) fail('view().stale is true after a check with no area');
  else ok('view(): not stale after a check with no area');
  await checkAreaValues(page, 'area-2', { dir: '008°', dist: '300 מ׳' }, 'area 2 chosen');
  await layout(page, 'area 2 chosen');
  await shot(page, '03-area2-chosen');

  // Wrong: area 2.
  await checkButton(page).click();
  await page.waitForTimeout(700);
  s = await state(page);
  const r2 = s.attempt?.result;
  if (r2?.kind !== 'contradicted' || r2.direction.consistent || !r2.distance.consistent) fail('area 2 should fail on direction only');
  else ok(`area 2: contradicted on direction (map ${r2.direction.predictedDeg.toFixed(2)}°), distance fits`);
  t = await feedbackText(page);
  const rows2 = await act(page).locator('[data-feedback] li').evaluateAll((els) => els.map((e) => e.dataset.row));
  const wrongMissing = WRONG_ROWS(t);
  if ((await feedbackKind(page)) !== 'contradicted' || rows2.join() !== 'mismatch,match' || wrongMissing.length) fail(`wrong (area 2): ${wrongMissing.join(', ') || rows2.join()} — "${t}"`);
  else ok('wrong (area 2): ✗ direction 008° vs 043° (35°, 5° allowed), ✓ distance 300 מ׳ (260–340); says what to match again');
  if (/אזור 1/.test(t)) fail('wrong feedback names area 1 (gives the answer away)');
  if (/חורש/.test(t)) fail('feedback mentions a grove');
  if (!(await count(page, '[data-panel="map"] [data-overlay="result"]'))) fail('no result layers after the check');
  await checkViewpoint(page, false, 'wrong (area 2)');
  let legend = await legendText(page);
  if (/אזור שמתאים|נקודת התצפית/.test(legend)) fail(`map key before success: ${legend}`);
  else ok('map key after a wrong check: no supported area, no scenario viewpoint');
  await closeLegend(page);
  await layout(page, 'wrong — area 2');
  await shot(page, '04-area2-wrong');
  await crop(page, '[data-panel="map"]', '04-area2-wrong-map');

  // Area 1 by its name plate on the map: the old result is void, area 1's values shown.
  await clickMap(page, AREA1_PLATE.E, AREA1_PLATE.N);
  s = await state(page);
  t = await feedbackText(page);
  if (s.selections.candidateId !== 'area-1') fail(`click on the "אזור 1" plate → ${s.selections.candidateId}`);
  else ok('map click on the "אזור 1" name plate → אזור 1');
  if ((await feedbackKind(page)) !== 'stale' || !/^הבחירה השתנתה — אזור 1 עדיין לא נבדק/.test(t) || !/הקודמת הייתה של אזור 2/.test(t) || /מתאים/.test(t)) fail(`change after a check: ${t}`);
  else ok(`change after a check: "${t.split('.')[0]}." — no verdict on the new choice`);
  if (!(await viewOf(page)).stale) fail('view().stale is false after changing a checked area');
  if (await act(page).locator('[data-feedback] li').count()) fail('comparison rows still shown after a change');
  await checkAreaValues(page, 'area-1', { dir: '043°', dist: '300 מ׳' }, 'area 1 chosen after a check');
  await layout(page, 'changed to area 1');
  await shot(page, '05-changed-to-area1');

  // Success: area 1.
  await checkButton(page).click();
  await page.waitForTimeout(1000);
  s = await state(page);
  if (s.attempt?.result.kind !== 'supported') fail(`area 1 should succeed, got ${s.attempt?.result.kind}`);
  else ok('area 1: supported');
  t = await feedbackText(page);
  const rows1 = await act(page).locator('[data-feedback] li').evaluateAll((els) => els.map((e) => e.dataset.row));
  const okMissing = SUCCESS_ROWS(t);
  if ((await feedbackKind(page)) !== 'supported' || rows1.join() !== 'match,match' || okMissing.length) fail(`success (area 1): ${okMissing.join(', ') || rows1.join()} — "${t}"`);
  else ok('success (area 1): both rows ✓ with values; "the direction decides", "an area, not a point", "keep checking along the route"');
  if (CERTAINTY.test(t)) fail(`success claims more certainty than the evidence: "${t}"`);
  await checkViewpoint(page, true, 'success');
  legend = await legendText(page);
  if (!legend.includes('אזור שמתאים לשתי המדידות') || !legend.includes(`${VIEWPOINT} (להמחשה)`) || !legend.includes('תחום המבט')) fail(`map key after success: ${legend}`);
  else ok(`map key after success separates "אזור שמתאים לשתי המדידות" from "${VIEWPOINT} (להמחשה)"`);
  await shot(page, '06b-area1-success-legend');
  await closeLegend(page);
  await layout(page, 'success — area 1');
  await shot(page, '06-area1-success');
  await crop(page, '[data-panel="map"]', '06-area1-success-map');
  mouseFinal = JSON.stringify(s.selections);

  // Change after success (buttons): the verdict and its map layers go.
  await radio(page, 'אזור 2').click();
  await page.waitForTimeout(400);
  t = await feedbackText(page);
  if ((await feedbackKind(page)) !== 'stale' || !/^הבחירה השתנתה — אזור 2 עדיין לא נבדק/.test(t) || /מתאים לשתי/.test(t)) fail(`change after success: ${t}`);
  else ok(`change after success: "${t.split('.')[0]}." — the verdict is gone`);
  if (await resultLayers(page)) fail('success layers still on the map after a change');
  else ok('result layers and the scenario viewpoint removed after a change');
  await checkAreaValues(page, 'area-2', { dir: '008°', dist: '300 מ׳' }, 'area 2 after a change');
  await layout(page, 'changed after success');
  await shot(page, '07-changed-after-success');

  // Back to the checked area: the snapshot is current again, its verdict returns.
  await radio(page, 'אזור 1').click();
  await page.waitForTimeout(400);
  if ((await feedbackKind(page)) !== 'supported' || !(await count(page, '[data-panel="map"] [data-overlay="observer"]'))) fail('re-choosing the checked area did not restore its verdict');
  else ok('re-choosing the checked area shows its verdict again');

  // Reset: opening state and view.
  await page.evaluate(() => window.__lc.look.setTarget({ yawDeg: 20 }));
  await resetButton(page).click();
  await page.waitForTimeout(1200);
  s = await state(page);
  const lookAfter = await page.evaluate(() => window.__lc.look.getTarget());
  if (s.selections.candidateId || s.attempt || (await feedbackKind(page)) !== 'empty' || (await count(page, '[data-panel="map"] [data-overlay]'))) fail('reset left a choice, a result or map layers');
  else if (lookAfter.yawDeg !== INITIAL_LOOK.yawDeg || lookAfter.hfovDeg !== INITIAL_LOOK.hfovDeg) fail('reset did not return to the opening view');
  else ok('reset → opening state (no choice, no result, clean map) and opening view');
  await checkReadings(page, 'after reset');
  await layout(page, 'after reset');
  await shot(page, '08-reset');

  // The road split reads in 3D at its own look.
  const split = roadSplitLook();
  await page.evaluate((l) => window.__lc.look.setTarget(l), split);
  await page.waitForFunction((y) => Math.abs(window.__lc.look.getLive().yawDeg - y) < 0.05, split.yawDeg, { timeout: 10000 });
  await page.waitForTimeout(300);
  await crop(page, '[data-panel="observation"]', '09-road-split-view');
  await checkRoadContrast(page, 'road split (normal size)');
  await page.evaluate(() => window.__lc.look.reset());

  // Another sub-topic and back.
  const listenersBefore = await page.evaluate(() => ({ ...window.__lcListeners }));
  await page.getByRole('button', { name: /תכנון ציר/ }).first().click();
  await page.waitForTimeout(1500);
  if (await count(page, `${ACT} canvas`)) fail('canvas left behind after leaving the sub-topic');
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector(ACT, { state: 'attached' });
  await scrollThrough(page);
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
  else ok('no console errors (mouse run)');
  await ctx.close();
}

// ---------------------------------------------------------------- keyboard only
{
  const { ctx, page, errors } = await openActivity(browser);
  await waitFor3D(page);
  reference = null;
  await layout(page, 'keyboard — opening');
  await radio(page, 'אזור 1').focus();
  await page.keyboard.press('Space'); // אזור 1
  await page.keyboard.press('ArrowLeft'); // RTL: the next option, אזור 2
  let s = await state(page);
  if (s.selections.candidateId !== 'area-2') fail(`ArrowLeft chose ${s.selections.candidateId}`);
  await page.keyboard.press('Tab');
  const onCheck = await page.evaluate(() => document.activeElement?.textContent.trim());
  if (onCheck !== 'בדקו את הבחירה') fail(`Tab from the area group lands on "${onCheck}"`);
  else ok('Space / ArrowLeft choose; Tab from the area group → "בדקו את הבחירה"');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow !== 'none' || getComputedStyle(document.activeElement).outlineStyle !== 'none');
  if (!ring) fail('no visible focus on the check button');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  if ((await feedbackKind(page)) !== 'contradicted') fail('Enter on check (area 2) did not give the wrong verdict');
  else ok('Enter → area 2 wrong verdict');
  await layout(page, 'keyboard — wrong');
  await shot(page, '10-keyboard-wrong');
  await page.keyboard.press('Shift+Tab');
  const back = await page.evaluate(() => document.activeElement?.getAttribute('aria-checked') === 'true' && document.activeElement?.textContent.trim());
  if (back !== 'אזור 2') fail(`Shift+Tab returns to "${back}", expected the checked radio`);
  await page.keyboard.press('ArrowRight'); // back to אזור 1
  if ((await feedbackKind(page)) !== 'stale') fail('keyboard change did not void the result');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  s = await state(page);
  if ((await feedbackKind(page)) !== 'supported') fail('keyboard correction did not succeed');
  else if (JSON.stringify(s.selections) !== mouseFinal) fail(`keyboard selections ${JSON.stringify(s.selections)} ≠ mouse ${mouseFinal}`);
  else ok('keyboard correction: Shift+Tab → ArrowRight (אזור 1) → Tab → Enter → supported, same state as the mouse run');
  await checkViewpoint(page, true, 'keyboard — success');
  await layout(page, 'keyboard — success');
  await shot(page, '11-keyboard-success');
  await page.keyboard.press('Tab');
  const onReset = await page.evaluate(() => document.activeElement?.textContent.trim());
  if (onReset !== 'איפוס') fail(`Tab after check lands on "${onReset}"`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  if ((await feedbackKind(page)) !== 'empty') fail('Space on reset did not reset');
  else ok('Tab → "איפוס", Space resets');
  await page.locator('[data-obs-frame]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const look = await page.evaluate(() => window.__lc.look.getTarget());
  if (Math.abs(look.yawDeg - (INITIAL_LOOK.yawDeg + 10)) > 0.01) fail(`arrow keys turned the view to ${look.yawDeg}`);
  else ok('arrow keys on the observation turn the view');
  if (errors.length) fail(`console errors (keyboard run): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- loading
{
  // Hold the ground textures back: the shared loader covers the frame, the task
  // stays usable through the area buttons, and nothing reveals the answer.
  let release;
  const gate = new Promise((r) => (release = r));
  const { ctx, page, errors } = await openActivity(browser, {}, {
    route: {
      pattern: '**/location-check/textures/**',
      handler: async (route) => {
        await gate;
        await route.continue();
      },
    },
  });
  await page.waitForFunction(([sel, loader]) => document.querySelector(sel)?.innerText.includes(loader), [ACT, LOADER], { timeout: 120000 });
  await crop(page, '[data-panel="observation"]', '00-loading-observation');
  const loaderInFrame = await page.evaluate(([sel, loader]) => {
    const frame = document.querySelector(`${sel} [data-obs-frame]`);
    return frame.innerText.includes(loader);
  }, [ACT, LOADER]);
  if (!loaderInFrame) fail('loading: the loader is not over the observation frame');
  await checkReadings(page, 'loading');
  const overlayWhileLoading = await count(page, '[data-obs-overlay]');
  await radio(page, 'אזור 1').click();
  const s = await state(page);
  if (overlayWhileLoading) fail('loading: labels drawn over an unloaded view');
  else if (s.selections.candidateId !== 'area-1' || s.attempt || (await resultLayers(page))) fail('loading: area choice not usable, or a result appeared');
  else ok(`loading: "${LOADER}…" over the frame, readings shown, area choice usable, nothing revealed`);
  release();
  await waitFor3D(page);
  if (await page.evaluate(([sel, loader]) => document.querySelector(sel).innerText.includes(loader), [ACT, LOADER])) fail('loading: the loader stayed after the canvas was drawn');
  else ok('loading: released — the canvas is drawn and the loader is gone');
  if (errors.length) fail(`console errors (loading): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const { ctx, page, errors } = await openActivity(browser, { reducedMotion: 'reduce' });
  await waitFor3D(page);
  await page.evaluate(() => window.__lc.look.setTarget({ yawDeg: 43 }));
  await page.waitForTimeout(250);
  const live = await page.evaluate(() => window.__lc.look.getLive());
  if (Math.abs(live.yawDeg - 43) > 0.01) fail(`reduced motion: camera eased (${live.yawDeg})`);
  else ok('reduced motion: the camera jumps to a new look, no easing');
  if (errors.length) fail(`console errors (reduced motion): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();

// ---------------------------------------------------------------- no WebGL
{
  const noGl = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const { ctx, page, errors } = await openActivity(noGl);
  await page.waitForTimeout(1500);
  reference = null;
  const img = page.locator('[data-obs-frame] img');
  if ((await count(page, `${ACT} canvas`)) || !(await img.count())) fail('no WebGL: expected the static picture, not a canvas');
  else {
    const { w, h } = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
    if (!w) fail('no WebGL: static picture failed to load');
    else if (Math.abs(w / h - 4 / 3) > 0.01) fail(`no WebGL: picture is ${w}×${h}, not 4:3`);
    else ok(`no WebGL: static 4:3 picture (${w}×${h})`);
  }
  if (await page.evaluate(([sel, loader]) => document.querySelector(sel).innerText.includes(loader), [ACT, LOADER])) fail('no WebGL: a loader over the static picture');
  else ok('no WebGL: no loader over the static picture');
  await checkReadings(page, 'no WebGL');
  await layout(page, 'no WebGL — opening');
  await radio(page, 'אזור 2').click();
  await checkButton(page).click();
  await page.waitForTimeout(600);
  const wrongMissing = WRONG_ROWS(await feedbackText(page));
  if ((await feedbackKind(page)) !== 'contradicted' || wrongMissing.length) fail(`no WebGL: wrong check — ${wrongMissing.join(', ')}`);
  else ok('no WebGL: area 2 → the same wrong feedback');
  await layout(page, 'no WebGL — wrong');
  await radio(page, 'אזור 1').click();
  if ((await feedbackKind(page)) !== 'stale') fail('no WebGL: change did not void the result');
  await checkButton(page).click();
  await page.waitForTimeout(800);
  const okMissing = SUCCESS_ROWS(await feedbackText(page));
  if ((await feedbackKind(page)) !== 'supported' || okMissing.length) fail(`no WebGL: success — ${okMissing.join(', ')}`);
  else ok('no WebGL: change to area 1 → the same success feedback');
  await checkViewpoint(page, true, 'no WebGL — success');
  await layout(page, 'no WebGL — success');
  await shot(page, '12-no-webgl-success');
  if (errors.filter((e) => !/WebGL|webgl/.test(e)).length) fail(`console errors (no WebGL): ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
  await noGl.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
