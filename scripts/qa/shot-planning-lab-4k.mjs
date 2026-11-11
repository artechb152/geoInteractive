// Before/after shots for the planning lab's ground, cover and light upgrade (lesson 6, „לפני שיוצאים:
// מה צריך לתכנן?”): fixed cameras over the whole model and close to the building, the rocks, the
// stream, the grove and the orchard, at 1440 × 1122 in the page and in full screen; the route
// edited on the model and on the map (the resulting points must not change between runs); frame
// timing while dragging and orbiting; time to the first drawn frame.
// Needs a running dev server (the dev-only __pl / __plCamera / __plProbe hooks). Run:
//   node scripts/qa/shot-planning-lab-4k.mjs <out-dir>      (QA_BASE defaults to http://localhost:3000)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const OUT = process.argv[2] ?? 'design/screenshots/topic06-planning-lab-4k-2026-11-01/after';
const LAB = '[data-activity="planning-lab"]';
const MODEL = `${LAB} [data-panel="model"]`;
mkdirSync(OUT, { recursive: true });
const report = {};

/** Fixed cameras: eye and target in ground metres (E, N, metres above the ground there). */
const CAM = {
  saddle: { eye: { E: 735, N: 345, up: 200 }, at: { E: 648, N: 668, up: 0 } },
  grove: { eye: { E: 395, N: 745, up: 170 }, at: { E: 180, N: 1060, up: 0 } },
  building: { eye: { E: 690, N: -40, up: 150 }, at: { E: 815, N: 160, up: 0 } },
  rocks: { eye: { E: 400, N: 880, up: 150 }, at: { E: 182, N: 1082, up: 0 } },
  stream: { eye: { E: 560, N: 70, up: 140 }, at: { E: 690, N: 300, up: 0 } },
  orchard: { eye: { E: 520, N: -60, up: 150 }, at: { E: 585, N: 175, up: 0 } },
  // low over the western flank, looking up the ravine to the saddle
  flank: { eye: { E: 560, N: 330, up: 60 }, at: { E: 650, N: 600, up: 0 } },
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector(`${LAB} [data-map="sheet"]`, { timeout: 180000 });
await page.evaluate(() => {
  const el = document.querySelector('[data-tips-screen="plan"]');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
});
await page.waitForSelector(`${MODEL}[data-ready]`, { timeout: 120000 });
report.msToReady = Date.now() - t0;
await page.waitForTimeout(800);

report.gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});

const d = (a) => page.evaluate((a) => window.__pl.dispatch(a), a);
/** The drawn ground's height at (E, N): bisected on the canvas' own projection (h ↦ screen y is monotonic). */
const groundH = (E, N) =>
  page.evaluate(
    ({ E, N }) => {
      const [, yG] = window.__plProbe(E, N);
      let lo = 0;
      let hi = 1200;
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        const [, y] = window.__plProbe(E, N, m);
        if (y > yG) lo = m;
        else hi = m;
      }
      return (lo + hi) / 2;
    },
    { E, N },
  );
// Heights are probed once, from the opening camera (which has every camera point in front of it).
const H = {};
for (const [k, c] of Object.entries(CAM)) H[k] = { eye: await groundH(c.eye.E, c.eye.N), at: await groundH(c.at.E, c.at.N) };
report.cameraGroundM = H;
const cam = async (c) => {
  const k = Object.keys(CAM).find((x) => CAM[x] === c);
  const eye = { E: c.eye.E, N: c.eye.N, h: H[k].eye + c.eye.up };
  const at = { E: c.at.E, N: c.at.N, h: H[k].at + c.at.up };
  await page.evaluate(({ eye, at }) => window.__plCamera(eye, at), { eye, at });
};
const settle = (ms = 700) => page.waitForTimeout(ms);
const shotModel = async (name) => {
  await settle();
  await (await page.$(MODEL)).screenshot({ path: `${OUT}/${name}.png` });
};
const shotPage = async (name) => {
  await settle();
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const mapPt = (E, N) =>
  page.evaluate(
    ({ E, N }) => {
      const svg = document.querySelector('[data-activity="planning-lab"] [data-panel="map"] svg');
      const p = new DOMPoint(E, 1200 - N).matrixTransform(svg.getScreenCTM());
      return [p.x, p.y];
    },
    { E, N },
  );
const handles = () =>
  page.$$eval('[data-model-node]', (hs) => hs.map((h) => ({ id: h.getAttribute('data-model-node'), hidden: h.getAttribute('data-occluded') === 'true' })));
const nodes = () => page.evaluate(() => window.__pl.state.nodes.map((n) => [n.id, +n.E.toFixed(2), +n.N.toFixed(2)]));

/** rAF intervals and long tasks over an async action. */
async function timed(action) {
  await page.evaluate(() => {
    window.__frames = [];
    window.__long = [];
    window.__on = true;
    const loop = (t) => {
      window.__frames.push(t);
      if (window.__on) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      window.__obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration)));
      window.__obs.observe({ type: 'longtask', buffered: false });
    } catch {}
  });
  await action();
  return page.evaluate(() => {
    window.__on = false;
    window.__obs?.disconnect();
    const f = window.__frames;
    const dt = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b);
    return { frames: dt.length, medianMs: +dt[Math.floor(dt.length / 2)].toFixed(1), p95Ms: +dt[Math.floor(dt.length * 0.95)].toFixed(1), maxMs: +dt[dt.length - 1].toFixed(1), longTasks: window.__long.length, longestTaskMs: Math.round(Math.max(0, ...window.__long)) };
  });
}
async function sweep(x0, y0, x1, y1, steps = 60) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let k = 1; k <= steps; k++) {
    await page.mouse.move(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps + Math.sin(k / 4) * 6);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

/** The same shots in the page and in full screen. */
async function series(prefix, shot) {
  await d({ type: 'reset' });
  await d({ type: 'select', selection: null });
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  await shot(`${prefix}01-open`);
  await cam(CAM.saddle);
  await shot(`${prefix}02-saddle-close`);
  await d({ type: 'select', selection: { kind: 'feature', id: 'saddle' } });
  await shot(`${prefix}03-saddle-highlight`);
  await d({ type: 'select', selection: null });
  await cam(CAM.grove);
  await shot(`${prefix}04-grove-close`);
  await d({ type: 'select', selection: { kind: 'feature', id: 'grove' } });
  await shot(`${prefix}05-grove-highlight`);
  await d({ type: 'select', selection: null });
  await cam(CAM.building);
  await shot(`${prefix}06-building-close`);
  await d({ type: 'select', selection: { kind: 'feature', id: 'building' } });
  await shot(`${prefix}07-building-highlight`);
  await d({ type: 'select', selection: null });
  await cam(CAM.rocks);
  await shot(`${prefix}08-rocks-close`);
  await cam(CAM.stream);
  await shot(`${prefix}09-stream-close`);
  await d({ type: 'select', selection: { kind: 'feature', id: 'stream' } });
  await shot(`${prefix}10-stream-highlight`);
  await d({ type: 'select', selection: null });
  await cam(CAM.orchard);
  await shot(`${prefix}11-orchard-close`);
  await cam(CAM.flank);
  await shot(`${prefix}12-ravine-flank`);
  await page.evaluate(() => window.__pl.view.orbit('top'));
  await settle(1200);
  await shot(`${prefix}13-top-view`);
}

await shotPage('00-page-open');
await series('', shotModel);

// editing in both views from the opening camera: drag p2 on the model, then p1 on the map
{
  await d({ type: 'reset' });
  await d({ type: 'select', selection: null });
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  report.nodesAtStart = await nodes();
  const h = await page.$('[data-model-node="p1"]');
  const b = await h.boundingBox();
  report.modelDrag = await timed(() => sweep(b.x + b.width / 2, b.y + b.height / 2, b.x + b.width / 2 + 120, b.y + b.height / 2 - 40, 50));
  report.afterModelDrag = await nodes();
  // the map's handle sits on the same ground point the model moved it to
  report.mapHandleAfterModelDrag = await page.evaluate(() => {
    const n = window.__pl.state.nodes.find((x) => x.id === 'p1');
    const el = document.querySelector('[data-activity="planning-lab"] [data-panel="map"] [data-node="p1"]');
    const svg = document.querySelector('[data-activity="planning-lab"] [data-panel="map"] svg');
    const p = new DOMPoint(n.E, 1200 - n.N).matrixTransform(svg.getScreenCTM());
    const r = el.getBoundingClientRect();
    return { dx: +(r.x + r.width / 2 - p.x).toFixed(1), dy: +(r.y + r.height / 2 - p.y).toFixed(1) };
  });
  await shotPage('20-after-model-drag');
  const p1 = await page.evaluate(() => window.__pl.state.nodes.find((n) => n.id === 'p1'));
  const [x0, y0] = await mapPt(p1.E, p1.N);
  const [x1, y1] = await mapPt(649, 670);
  report.mapDrag = await timed(() => sweep(x0, y0, x1, y1, 60));
  report.afterMapDrag = await nodes();
  report.crossing = await page.getAttribute(LAB, 'data-crossing');
  // the model's handle sits where the canvas projects the moved point
  report.modelHandleAfterMapDrag = await page.evaluate(() => {
    const n = window.__pl.state.nodes.find((x) => x.id === 'p1');
    const el = document.querySelector('[data-model-node="p1"]');
    const cv = document.querySelector('[data-activity="planning-lab"] [data-panel="model"] canvas');
    const c = cv.getBoundingClientRect();
    // the probe is in the canvas' own (untransformed) pixels; the lesson fit scales it on screen
    const k = c.width / cv.clientWidth;
    const [px, py] = window.__plProbe(n.E, n.N, undefined);
    const r = el.getBoundingClientRect();
    return { dx: +(r.x + r.width / 2 - (c.x + px * k)).toFixed(1), dyAboveGround: +(c.y + py * k - (r.y + r.height / 2)).toFixed(1) };
  });
  report.handlesAfterMapDrag = await handles();
  await shotPage('21-after-map-drag');
}

// camera: orbit by mouse, zoom in to the closest, wheel
{
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  const c = await (await page.$(`${MODEL} canvas`)).boundingBox();
  report.orbitDrag = await timed(() => sweep(c.x + c.width * 0.3, c.y + c.height * 0.75, c.x + c.width * 0.7, c.y + c.height * 0.6, 60));
  await shotModel('22-orbited');
  for (let k = 0; k < 6; k++) await page.click(`${MODEL} button[aria-label="התקרבות"]`);
  await shotModel('23-zoomed-in-max');
  report.wheelZoom = await timed(async () => {
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    for (let k = 0; k < 20; k++) {
      await page.mouse.wheel(0, k < 10 ? 120 : -120);
      await page.waitForTimeout(30);
    }
  });
  await page.click(`${MODEL} button[aria-label="חזרה למבט ההתחלתי"]`);
  await settle(1000);
}

// full screen
await page.click(`${MODEL} [data-view="fullscreen"]`);
await settle(1200);
report.fullscreen = await page.evaluate(() => !!document.fullscreenElement?.matches('[data-panel="model"]'));
await d({ type: 'reset' });
await d({ type: 'select', selection: null });
await page.evaluate(() => window.__pl.view.orbit('home'));
await settle(1200);
await shotPage('fs-01-open');
for (const k of ['saddle', 'grove', 'building', 'flank']) {
  await cam(CAM[k]);
  await shotPage(`fs-${k}`);
}
await page.evaluate(() => window.__pl.view.orbit('home'));
await settle(1200);
report.fsOrbitDrag = await timed(() => sweep(300, 800, 1100, 650, 60));
await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
await settle(600);

report.errors = errors;
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
