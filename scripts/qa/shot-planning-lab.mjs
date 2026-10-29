// Visual QA for the lesson-6 planning lab: screenshots of every state at 1440 × 1122 (and the
// user's 1920 × 910), the loader held on its chunk and textures, the no-WebGL still, frame timing
// while dragging, and the still itself (public/assets/lessons/topic06/planning-lab/overview.jpg,
// rendered from the live model at its opening camera, with no plan drawn on it).
// Needs a running dev server. Run:
//   node scripts/qa/shot-planning-lab.mjs [--still]      (QA_BASE defaults to http://localhost:3000)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-06/#scene-tips`;
const OUT = process.env.QA_OUT ?? 'design/screenshots/topic06-planning-lab-2026-10-29';
const STILL = 'public/assets/lessons/topic06/planning-lab/overview.jpg';
const LAB = '[data-activity="planning-lab"]';
mkdirSync(OUT, { recursive: true });
const GPU = ['--use-angle=d3d11', '--enable-gpu'];
const report = {};

async function open(browser, viewport, { ready = true, scale = 1 } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector(`${LAB} [data-map="sheet"]`, { timeout: 180000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-tips-screen="plan"]');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
  });
  if (ready) await page.waitForSelector(`${LAB} [data-panel="model"][data-ready]`, { timeout: 120000 });
  await page.waitForTimeout(500);
  return { page, errors };
}
const d = (page, a) => page.evaluate((a) => window.__pl.dispatch(a), a);
const mapPt = (page, E, N) =>
  page.evaluate(
    ({ E, N }) => {
      const svg = document.querySelector('[data-activity="planning-lab"] [data-panel="map"] svg');
      const p = new DOMPoint(E, 1200 - N).matrixTransform(svg.getScreenCTM());
      return [p.x, p.y];
    },
    { E, N },
  );

const browser = await chromium.launch({ channel: 'chrome', args: GPU });

// ---- the still for browsers without WebGL
if (process.argv.includes('--still')) {
  const { page } = await open(browser, { width: 1920, height: 910 }, { scale: 2 });
  await page.evaluate(() => {
    window.__plBare = true;
  });
  await d(page, { type: 'toggleDirect' });
  await d(page, { type: 'toggleDirect' });
  await page.addStyleTag({ content: '[data-activity="planning-lab"] [data-panel="model"] [data-overlay], [data-activity="planning-lab"] [data-panel="model"] [data-loading] { visibility: hidden !important }' });
  await page.waitForTimeout(1200);
  const buf = await (await page.$(`${LAB} [data-panel="model"] canvas`)).screenshot({ type: 'jpeg', quality: 84 });
  mkdirSync('public/assets/lessons/topic06/planning-lab', { recursive: true });
  writeFileSync(STILL, buf);
  report.still = `${STILL} (${Math.round(buf.length / 1024)} KB)`;
  await page.close();
}

// ---- every state at 1440 × 1122
{
  const { page, errors } = await open(browser, { width: 1440, height: 1122 });
  const shot = async (name) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  };
  await shot('01-open');
  // drag the route point to the saddle on the map, sampling frames while dragging
  const p1 = await page.evaluate(() => window.__pl.state.nodes[1]);
  const [x0, y0] = await mapPt(page, p1.E, p1.N);
  const [x1, y1] = await mapPt(page, 649, 670);
  await page.evaluate(() => {
    window.__frames = [];
    window.__long = [];
    const loop = (t) => {
      window.__frames.push(t);
      if (window.__frames.length < 400) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false });
    } catch {}
  });
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let k = 1; k <= 60; k++) {
    await page.mouse.move(x0 + ((x1 - x0) * k) / 60, y0 + ((y1 - y0) * k) / 60 + Math.sin(k / 4) * 8);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  const perf = await page.evaluate(() => {
    const f = window.__frames;
    const dt = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b);
    return { frames: dt.length, medianMs: +dt[Math.floor(dt.length / 2)].toFixed(1), p95Ms: +dt[Math.floor(dt.length * 0.95)].toFixed(1), longTasks: window.__long.length, longestTaskMs: Math.round(Math.max(0, ...window.__long)) };
  });
  report.dragPerf = perf;
  await shot('02-drag-to-saddle');
  // add a point by clicking the map, then select it by keyboard focus
  const [xa, ya] = await mapPt(page, 300, 720);
  await page.mouse.click(xa, ya);
  await shot('03-add-point');
  const id = await page.evaluate(() => window.__pl.state.selection.id);
  await page.focus(`${LAB} [data-node="${id}"]`);
  await page.keyboard.press('ArrowUp');
  await shot('04-keyboard-focus-nudge');
  await page.keyboard.press('Delete');
  await shot('05-deleted');
  // the straight line
  await page.click(`${LAB} [data-toggle="direct"]`);
  await shot('06-straight-line');
  // checkpoints
  await page.click(`${LAB} [data-tools] [data-tool="checks"]`);
  for (const f of ['road', 'stream', 'saddle']) await page.click(`${LAB} [data-feature="${f}"]`);
  await shot('07-checkpoints');
  await page.click(`${LAB} [data-feature="peak-east"]`);
  await shot('08-checkpoint-off-route');
  // identify in both views
  await page.click(`${LAB} [data-tools] [data-tool="identify"]`);
  await page.click(`${LAB} [data-feature="grove"]`);
  await shot('09-identify-grove');
  // a leg
  await page.click(`${LAB} [data-tools] [data-tool="route"]`);
  await d(page, { type: 'select', selection: { kind: 'leg', from: 'A' } });
  await shot('10-leg');
  // undo / reset / example
  await page.click(`${LAB} [data-action="reset"]`);
  await shot('11-reset');
  await page.click(`${LAB} [data-action="undo"]`);
  await shot('12-reset-undone');
  await page.click(`${LAB} [data-action="example"]`);
  await shot('13-example');
  // views
  await page.click(`${LAB} [data-view="top"]`);
  await page.waitForTimeout(900);
  await shot('14-top-view');
  await d(page, { type: 'select', selection: { kind: 'feature', id: 'saddle' } });
  await page.click(`${LAB} [data-action="focus"]`);
  await page.waitForTimeout(900);
  await shot('15-focus-saddle');
  await page.click(`${LAB} [data-panel="model"] button[aria-label="חזרה למבט ההתחלתי"]`);
  await page.waitForTimeout(900);
  // full screen (the model)
  await page.click(`${LAB} [data-view="fullscreen"]`);
  await page.waitForTimeout(1200);
  await shot('16-model-fullscreen');
  report.fullscreen = await page.evaluate(() => !!document.fullscreenElement?.matches('[data-panel="model"]'));
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await page.waitForTimeout(600);
  report.errors1440 = errors;
  await page.close();
}

// ---- the user's viewport
{
  const { page } = await open(browser, { width: 1920, height: 910 });
  await page.screenshot({ path: `${OUT}/17-open-1920x910.png` });
  report.fit1920 = await page.evaluate(() => {
    const r = document.querySelector('[data-activity="planning-lab"]').getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), viewport: innerHeight };
  });
  await page.close();
}

// ---- the loader: hold the 3D chunk, then the textures, then release
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
  let releaseChunk;
  let releaseTex;
  const chunkHeld = new Promise((r) => (releaseChunk = r));
  const texHeld = new Promise((r) => (releaseTex = r));
  await page.route(/PlanningLab3D/, async (route) => {
    await chunkHeld;
    await route.continue();
  });
  await page.route(/location-check\/textures\/.*\.jpg/, async (route) => {
    await texHeld;
    await route.continue();
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector(`${LAB} [data-map="sheet"]`, { timeout: 180000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-tips-screen="plan"]');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  report.loaderWhileChunkHeld = await page.$$eval(`${LAB} [data-panel="model"] [data-loading]`, (ls) => ls.map((l) => l.textContent.trim()));
  await page.screenshot({ path: `${OUT}/18-loader-chunk-held.png` });
  releaseChunk();
  await page.waitForSelector(`${LAB} [data-panel="model"] canvas`, { timeout: 60000 });
  await page.waitForTimeout(1200);
  report.loaderWhileTexturesHeld = await page.$$eval(`${LAB} [data-panel="model"] [data-loading]`, (ls) => ls.map((l) => l.textContent.trim()));
  report.mapUsableWhileLoading = (await page.$(`${LAB} [data-node="p1"]`)) !== null;
  await page.screenshot({ path: `${OUT}/19-loader-textures-held.png` });
  releaseTex();
  await page.waitForSelector(`${LAB} [data-panel="model"][data-ready]`, { timeout: 120000 });
  await page.waitForTimeout(500);
  report.loaderAfterReady = await page.$$eval(`${LAB} [data-panel="model"] [data-loading]`, (ls) => ls.length);
  await page.close();
}
await browser.close();

// ---- no WebGL: the labelled still, no loader, the map still works
{
  const nogl = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const { page } = await open(nogl, { width: 1440, height: 1122 }, { ready: false });
  await page.waitForTimeout(1500);
  report.noWebGL = await page.evaluate(() => {
    const m = document.querySelector('[data-activity="planning-lab"] [data-panel="model"]');
    const img = m.querySelector('img[data-fallback]');
    return { renderer: m.getAttribute('data-renderer'), still: !!img && img.complete && img.naturalWidth > 0, loaders: m.querySelectorAll('[data-loading]').length, label: m.innerText.includes('תמונה קבועה של המודל') };
  });
  await d(page, { type: 'dragStart', id: 'p1' });
  await d(page, { type: 'drag', at: { E: 649, N: 670 } });
  await d(page, { type: 'dragEnd' });
  report.noWebGL.mapStillEdits = (await page.getAttribute(LAB, 'data-crossing')) === 'saddle';
  await page.screenshot({ path: `${OUT}/20-no-webgl-still.png` });
  await nogl.close();
}

console.log(JSON.stringify(report, null, 2));
