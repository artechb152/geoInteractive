// Before/after shots for the planning lab's 3D polish (lesson 6, „לפני שיוצאים: מה צריך לתכנן?”):
// the same cameras, light, route and selection every run, at 1440 × 1122 in the page and with the
// model in full screen, plus frame timing while dragging (map and model) and while orbiting.
// Needs a running dev server (the dev-only __pl / __plCamera hooks). Run:
//   node scripts/qa/shot-planning-lab-polish.mjs <out-dir>      (QA_BASE defaults to http://localhost:3000)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const OUT = process.argv[2] ?? 'design/screenshots/topic06-planning-lab-polish-2026-10-29/after';
const LAB = '[data-activity="planning-lab"]';
const MODEL = `${LAB} [data-panel="model"]`;
mkdirSync(OUT, { recursive: true });
const report = {};

/** Fixed cameras: eye and target in ground metres (E, N, height). */
const CAM = {
  saddle: { eye: { E: 735, N: 345, h: 590 }, at: { E: 648, N: 668, h: 418 } },
  grove: { eye: { E: 395, N: 745, h: 520 }, at: { E: 180, N: 1060, h: 360 } },
  // low from the south-west: the western summit stands between the eye and the far side of the ridge
  hidden: { eye: { E: 300, N: 205, h: 455 }, at: { E: 470, N: 700, h: 445 } },
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector(`${LAB} [data-map="sheet"]`, { timeout: 180000 });
await page.evaluate(() => {
  const el = document.querySelector('[data-tips-screen="plan"]');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
});
await page.waitForSelector(`${MODEL}[data-ready]`, { timeout: 120000 });
await page.waitForTimeout(800);

report.gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
report.dpr = await page.evaluate(() => devicePixelRatio);

const d = (a) => page.evaluate((a) => window.__pl.dispatch(a), a);
const cam = (c) => page.evaluate((c) => window.__plCamera(c.eye, c.at), c);
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
  await d({ type: 'select', selection: { kind: 'feature', id: 'stream' } });
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  await shot(`${prefix}06-stream-highlight-open`);
  // one route point on the near (south) flank, one behind the western summit
  await d({ type: 'select', selection: null });
  await d({ type: 'dragStart', id: 'p1' });
  await d({ type: 'drag', at: { E: 430, N: 860 } });
  await d({ type: 'dragEnd' });
  await d({ type: 'add', at: { E: 560, N: 420 } });
  await d({ type: 'select', selection: null });
  await cam(CAM.hidden);
  await shot(`${prefix}07-hidden-handle`);
  report[`${prefix}handles`] = await handles();
}

await series('', shotModel);
await shotPage('08-hidden-handle-page');

// editing in both views from the opening camera (where p2 is in sight): drag it on the model, then p1 on the map
{
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  report.handlesAtHome = await handles();
  const h = await page.$('[data-model-node="p2"]');
  const b = await h.boundingBox();
  report.modelDrag = await timed(() => sweep(b.x + b.width / 2, b.y + b.height / 2, b.x + b.width / 2 + 120, b.y + b.height / 2 - 40, 50));
  report.afterModelDrag = await page.evaluate(() => window.__pl.state.nodes.map((n) => [n.id, Math.round(n.E), Math.round(n.N)]));
  await shotPage('09-after-model-drag');
  const p1 = await page.evaluate(() => window.__pl.state.nodes.find((n) => n.id === 'p1'));
  const [x0, y0] = await mapPt(p1.E, p1.N);
  const [x1, y1] = await mapPt(649, 670);
  report.mapDrag = await timed(() => sweep(x0, y0, x1, y1, 60));
  report.afterMapDrag = await page.evaluate(() => window.__pl.state.nodes.map((n) => [n.id, Math.round(n.E), Math.round(n.N)]));
  report.handlesAfterMapDrag = await handles();
  await shotPage('10-after-map-drag');
}

// camera: orbit by mouse, zoom, straight down, reset
{
  await page.evaluate(() => window.__pl.view.orbit('home'));
  await settle(1200);
  const c = await (await page.$(`${MODEL} canvas`)).boundingBox();
  report.orbitDrag = await timed(() => sweep(c.x + c.width * 0.3, c.y + c.height * 0.75, c.x + c.width * 0.7, c.y + c.height * 0.6, 60));
  await shotModel('11-orbited');
  await page.click(`${MODEL} button[aria-label="התקרבות"]`);
  await page.click(`${MODEL} button[aria-label="התקרבות"]`);
  await shotModel('12-zoomed-in');
  await page.click(`${MODEL} [data-view="top"]`);
  await settle(1000);
  await shotModel('13-top-view');
  report.wheelZoom = await timed(async () => {
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    for (let k = 0; k < 20; k++) {
      await page.mouse.wheel(0, k < 10 ? -120 : 120);
      await page.waitForTimeout(30);
    }
  });
  await page.click(`${MODEL} button[aria-label="חזרה למבט ההתחלתי"]`);
  await shotModel('14-reset-camera');
}

// full screen
await page.click(`${MODEL} [data-view="fullscreen"]`);
await settle(1200);
report.fullscreen = await page.evaluate(() => !!document.fullscreenElement?.matches('[data-panel="model"]'));
await series('fs-', shotPage);
report.fsOrbitDrag = await timed(() => sweep(300, 800, 1100, 650, 60));
await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
await settle(600);

report.errors = errors;
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
