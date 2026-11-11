// 3D performance benchmark — every model in the course, on the production static export.
//
//   npm run build                         (the export lands in out/)
//   npm run perf:3d -- [options]
//
// Options
//   --out=out                 static export to serve (or --base=http://host:port to use a running server)
//   --scenes=a,b              subset of scripts/perf/scenes-3d.mjs (default: all)
//   --gpu=hw|sw               hw: the machine's GPU (ANGLE/D3D11); sw: SwiftShader — CPU-only rendering,
//                             a stand-in for a machine whose browser has no hardware acceleration
//   --cpu=4                   CPU throttling factor (CDP), a stand-in for a slow CPU
//   --tier=auto|high|low|software   force the course's GPU tier (?gpu=…)
//   --cycles=0                mount/unmount cycles (sub-topic away and back) for the memory check
//   --shots=dir               save the model at rest before (rest0) and after (rest1) the drag
//   --json=file               write the results (one object per scene)
//   --compare=file            compare with an earlier --json result; exits 1 on a regression
//
// Per model, on one page load: the clicks that show it (scenes-3d.mjs), the page scrolled from the top
// until it mounts, its first frame and the loader gone; then 3 s at rest on screen, a 6 s drag (from the
// point of the view nearest its centre that no card or map covers), the return to full resolution, 3 s
// scrolled away, the heap after garbage collection, and with --cycles its sub-topic left and re-entered.
// Draw calls, triangles and shadow-map passes are counted on the WebGL context itself.
//
// Simulated conditions (SwiftShader, CPU throttling) are not a real weak machine. A baseline is
// only comparable with runs on the same machine and options.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { SCENES } from './scenes-3d.mjs';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const gpu = arg('gpu', 'hw');
const cpu = +arg('cpu', '1');
const tier = arg('tier', 'auto');
const cycles = +arg('cycles', '0');
const shots = arg('shots', '');
const jsonOut = arg('json', '');
const compare = arg('compare', '');
const names = arg('scenes', Object.keys(SCENES).filter((n) => !SCENES[n].skip).join(',')).split(',');
for (const n of names) if (!SCENES[n]) throw new Error(`unknown scene ${n} — see scripts/perf/scenes-3d.mjs`);
if (shots) fs.mkdirSync(shots, { recursive: true });

// ------------------------------------------------------------------ static server
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.txt': 'text/plain',
};
async function serve(dir) {
  const server = http.createServer((req, res) => {
    let f = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try {
      if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    } catch {}
    fs.readFile(f, (err, data) => {
      if (err) return res.writeHead(404).end('404');
      res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream' }).end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// ------------------------------------------------------------------ in-page instrumentation
// Per WebGL context: draw calls, triangles and shadow-map passes; per animation frame: which contexts drew.
function instrument() {
  const S = (window.__p3d = { ctxs: [], frames: [], longTasks: [] });
  const stat = (gl) => {
    let s = gl.__p3d;
    if (!s) {
      // weakly: the benchmark must not keep a closed canvas (and the section around it) alive itself
      const glRef = new WeakRef(gl);
      const canvasRef = new WeakRef(gl.canvas);
      s = gl.__p3d = {
        id: S.ctxs.length,
        get gl() { return glRef.deref(); },
        get canvas() { return canvasRef.deref(); },
        draws: 0, tris: 0, shadow: 0, seen: [0, 0, 0],
      };
      S.ctxs.push(s);
    }
    return s;
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = getContext.call(this, type, ...a);
    if (c && /webgl/i.test(type)) stat(c).type = type;
    return c;
  };
  const tris = (mode, n) => (mode === 4 ? n / 3 : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0);
  const wrap = (P, name, f) => {
    const o = P[name];
    if (o) P[name] = function (...a) { f(stat(this), a); return o.apply(this, a); };
  };
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const P = C.prototype;
    wrap(P, 'drawArrays', (s, [m, , n]) => { s.draws++; s.tris += tris(m, n); });
    wrap(P, 'drawElements', (s, [m, n]) => { s.draws++; s.tris += tris(m, n); });
    wrap(P, 'drawArraysInstanced', (s, [m, , n, k]) => { s.draws++; s.tris += tris(m, n) * k; });
    wrap(P, 'drawElementsInstanced', (s, [m, n, , , k]) => { s.draws++; s.tris += tris(m, n) * k; });
    wrap(P, 'drawRangeElements', (s, [m, , , n]) => { s.draws++; s.tris += tris(m, n); });
    // a square power-of-two viewport of ≥ 512 px is a shadow-map pass (a canvas is rarely one)
    wrap(P, 'viewport', (s, [, , w, h]) => { if (w >= 512 && w === h && (w & (w - 1)) === 0) s.shadow++; });
  }
  const tick = (t) => {
    const row = [];
    for (const s of S.ctxs) {
      const d = s.draws - s.seen[0];
      if (d) row.push([s.id, d, s.tris - s.seen[1], s.shadow - s.seen[2]]);
      s.seen = [s.draws, s.tris, s.shadow];
    }
    if (row.length) S.frames.push([t, row]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => S.longTasks.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
  } catch {}
}

// Inside the page: the scene's canvas — by data-scene, else the index-th WebGL canvas of the section.
function findCanvas({ scene, hash, index, near }) {
  const S = window.__p3d;
  // once found, the canvas is tagged: other models mounting or unmounting nearby must not shift the index
  const tagged = document.querySelector(`canvas[data-bench="${scene}"]`);
  if (tagged) return tagged;
  const byName = document.querySelector(`canvas[data-scene="${scene}"]`);
  if (byName) return byName;
  // a build that names its models: only the name counts (another model must not stand in while this one mounts)
  if (document.querySelector('canvas[data-scene]')) return null;
  const root = (hash && document.getElementById(hash)) || document;
  const live = S.ctxs.filter((s) => s.canvas?.isConnected && s.canvas.clientWidth > 50 && root.contains(s.canvas)).map((s) => s.canvas);
  live.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  if (near) {
    // the live canvas closest to a control of the model (other models on the page mount and unmount)
    const re = new RegExp(near);
    const ctl = [...root.querySelectorAll('button,[role=tab]')].find((b) => re.test(b.textContent));
    if (!ctl) return null;
    const y = ctl.getBoundingClientRect().top;
    const d = (c) => Math.abs((c.getBoundingClientRect().top + c.getBoundingClientRect().bottom) / 2 - y);
    return live.sort((a, b) => d(a) - d(b))[0] ?? null;
  }
  return live[index] ?? null;
}

// ------------------------------------------------------------------ one scene
async function measure(browser, base, name) {
  const sc = SCENES[name];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180_000);
  const errors = [];
  const contextWarnings = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    const t = m.text();
    if (/too many active webgl contexts/i.test(t)) contextWarnings.push(t.slice(0, 120));
    else if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push(t.slice(0, 200));
  });
  await page.addInitScript(instrument);
  await page.addInitScript({ content: `window.findCanvasIn = ${findCanvas.toString()};` });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('geo:prefetch', 'off');
    } catch {}
  });
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

  const query = tier === 'auto' ? '?gpu=auto' : `?gpu=${tier}`;
  const t0 = Date.now();
  await page.goto(`${base}${sc.path}${query}${sc.hash ? '#' + sc.hash : ''}`, { waitUntil: 'load' });
  const pick = { scene: sc.scene, hash: sc.hash, index: sc.index, near: sc.near };

  if (sc.expectNoCanvas) {
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => ({
      contexts: window.__p3d.ctxs.length,
      live: window.__p3d.ctxs.filter((s) => s.gl && !s.gl.isContextLost()).length,
      threeLoaded: performance.getEntriesByType('resource').some((e) => /three|fiber/i.test(e.name)),
    }));
    await ctx.close();
    return { scene: name, noCanvas: true, ...r, errors };
  }

  // Bring the model on screen: steps, then scroll the page from the top until the canvas exists
  // (lazy models mount only while near the viewport, and some take a moment).
  const section = sc.hash ? page.locator(`#${sc.hash}`) : page.locator('body');
  const reach = async () => {
    for (const step of sc.steps ?? []) {
      // a button anywhere on the page, the visible one (a first-visit guide may sit outside the section)
      const loc = step.tab
        ? section.getByRole('tab', { name: new RegExp(step.tab) })
        : page.locator('button:visible', { hasText: new RegExp(step.button) });
      // an optional step (a guide shown on a first visit) may take a moment to appear on a slow machine
      if (step.optional && !(await loc.first().waitFor({ timeout: 8000 }).then(() => true, () => false))) continue;
      await loc.first().scrollIntoViewIfNeeded();
      await loc.first().click();
      await page.waitForTimeout(800);
    }
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H + 300; y += 300) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
      for (let k = 0; k < 6; k++) {
        await page.waitForTimeout(300);
        if (await page.evaluate((p) => !!findCanvasIn(p), pick).catch(() => false)) return true;
      }
    }
    return false;
  };
  const found = await reach();
  if (found) await page.evaluate((p) => (findCanvasIn(p).dataset.bench = p.scene), pick);
  if (!found) {
    const seen = await page.evaluate(() => window.__p3d.ctxs.map((s) => (s.canvas ? `${s.canvas.isConnected ? 'attached' : 'detached'} ${s.canvas.clientWidth}px` : 'collected')).join(', '));
    await ctx.close();
    return { scene: name, error: `canvas not found (contexts: ${seen})` };
  }
  const center = async () => {
    await page.evaluate((p) => findCanvasIn(p).scrollIntoView({ block: 'center', behavior: 'instant' }), pick);
    await page.waitForTimeout(400);
  };
  await center();
  // drawn, and no loader left over it
  await page.waitForFunction((p) => {
    const c = findCanvasIn(p);
    const s = c && window.__p3d.ctxs.find((x) => x.canvas === c);
    if (!s || s.draws === 0) return false;
    let el = c;
    for (let k = 0; k < 6 && el; k++) el = el.parentElement;
    return !(el ?? document).querySelector('[data-loading]');
  }, pick);
  const loadS = (Date.now() - t0) / 1000;
  await center();
  // a first-visit guide that shows only once its model is in view (the replay's walkthrough): dismiss it now
  for (const step of sc.steps ?? []) {
    if (!step.optional || step.tab) continue;
    const loc = page.locator('button:visible', { hasText: new RegExp(step.button) });
    if (!(await loc.count())) continue;
    await loc.first().click();
    await page.waitForTimeout(1500);
    await center();
  }
  await page.waitForTimeout(3000);

  const box = await page.evaluate((p) => {
    const r = findCanvasIn(p).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, pick);
  const view = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.w, 1440 - Math.max(0, box.x)), height: Math.min(box.h, 900 - Math.max(0, box.y)) };
  const info = () =>
    page.evaluate((p) => {
      const c = findCanvasIn(p);
      const s = window.__p3d.ctxs.find((x) => x.canvas === c);
      return { id: s.id, density: +(c.width / c.clientWidth).toFixed(2), tier: c.dataset.gpuTier ?? '-', now: performance.now() };
    }, pick);
  // the page's clock (a model may unmount itself once scrolled away — GlobeExplorer does)
  const now = () => page.evaluate(() => performance.now());
  const framesOf = (id, a, b) =>
    page.evaluate(([id, a, b]) => window.__p3d.frames.filter(([t, row]) => t >= a && t <= b && row.some((r) => r[0] === id)).map(([t, row]) => [t, ...row.find((r) => r[0] === id).slice(1)]), [id, a, b]);

  const rest = await info();
  if (shots) await page.screenshot({ path: path.join(shots, `${name}-rest0.png`), clip: view });

  // idle on screen
  const idleA = (await info()).now;
  await page.waitForTimeout(3000);
  const idleB = (await info()).now;
  const idleFrames = await framesOf(rest.id, idleA, idleB);

  // drag
  let drag = null;
  let recoverS = null;
  if (sc.drag) {
    const lt0 = await page.evaluate(() => window.__p3d.longTasks.length);
    const a = (await info()).now;
    // the drag starts on the view itself: the point nearest the centre where the canvas (or the element
    // that holds it, e.g. a drag surface) is on top — not a card, a list or a map laid over it
    const [cx, cy] = await page.evaluate(
      ([p, v]) => {
        const c = findCanvasIn(p);
        const ok = (x, y) => {
          const e = document.elementFromPoint(x, y);
          return !!e && (e === c || (e.contains(c) && !e.closest('li,button,a')));
        };
        const pts = [];
        for (let fy = 0.15; fy <= 0.85; fy += 0.05) for (let fx = 0.1; fx <= 0.9; fx += 0.05) pts.push([v.x + v.width * fx, v.y + v.height * fy]);
        const mid = [v.x + v.width / 2, v.y + v.height / 2];
        pts.sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]));
        return pts.find(([x, y]) => ok(x, y)) ?? mid;
      },
      [pick, view],
    );
    const amp = Math.min(view.width * 0.18, 160);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    let mid = null;
    const STEPS = 120;
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS;
      await page.mouse.move(cx + Math.sin(t * Math.PI * 4) * amp, cy + Math.sin(t * Math.PI * 2) * 12);
      await page.waitForTimeout(50);
      if (i === STEPS / 2) mid = (await info()).density;
    }
    await page.mouse.up();
    const b = (await info()).now;
    const fr = await framesOf(rest.id, a, b);
    const gaps = fr.slice(1).map((f, i) => f[0] - fr[i][0]).sort((x, y) => x - y);
    const lts = await page.evaluate((n) => window.__p3d.longTasks.slice(n), lt0);
    const sum = (k) => fr.reduce((s, f) => s + f[k], 0);
    drag = {
      fps: +(fr.length / ((b - a) / 1000)).toFixed(1),
      gapMedMs: gaps.length ? +gaps[gaps.length >> 1].toFixed(1) : null,
      gapP90Ms: gaps.length ? +gaps[Math.floor(gaps.length * 0.9)].toFixed(1) : null,
      gapMaxMs: gaps.length ? +gaps[gaps.length - 1].toFixed(1) : null,
      drawsPerFrame: fr.length ? Math.round(sum(1) / fr.length) : 0,
      trisPerFrame: fr.length ? Math.round(sum(2) / fr.length) : 0,
      shadowPasses: sum(3),
      longTaskMs: Math.round(lts.reduce((s, l) => s + l[1], 0)),
      density: mid,
    };
    // back to full resolution, and to idle
    const r0 = Date.now();
    for (;;) {
      const d = (await info()).density;
      if (d >= rest.density - 0.01) break;
      if (Date.now() - r0 > 15000) break;
      await page.waitForTimeout(100);
    }
    recoverS = +((Date.now() - r0) / 1000).toFixed(1);
    await page.waitForTimeout(2500);
  } else {
    // nothing to drag: a frame at rest still tells the draw calls and triangles
    const fr = idleFrames.length ? idleFrames : await framesOf(rest.id, 0, idleB);
    const last = fr[fr.length - 1];
    drag = last ? { drawsPerFrame: last[1], trisPerFrame: Math.round(last[2]) } : null;
  }
  if (shots) await page.screenshot({ path: path.join(shots, `${name}-rest1.png`), clip: view });
  const settledA = await now();
  await page.waitForTimeout(2000);
  const settledB = await now();
  const settledFrames = await framesOf(rest.id, settledA, settledB);

  // off screen: scroll the model away
  const offView = await page.evaluate((p) => {
    const c = findCanvasIn(p);
    const out = () => {
      const r = c.getBoundingClientRect();
      return r.bottom < -150 || r.top > innerHeight + 150;
    };
    window.scrollBy({ top: c.getBoundingClientRect().bottom + 400, behavior: 'instant' });
    if (!out()) window.scrollTo({ top: 0, behavior: 'instant' });
    return out();
  }, pick);
  await page.waitForTimeout(1200);
  const offA = await now();
  await page.waitForTimeout(3000);
  const offB = await now();
  const offFrames = await framesOf(rest.id, offA, offB);
  const allOff = await page.evaluate(([a, b]) => window.__p3d.frames.filter(([t]) => t >= a && t <= b).length, [offA, offB]);

  // Memory after garbage collection, exact (performance.memory is coarse and lags): the JS heap, the DOM's
  // (embedder) heap and ArrayBuffer data (geometry and texture arrays live there) — a leaked canvas shows in the last two.
  const heapAfterGC = async () => {
    // DOM and ArrayBuffer memory is released by sweeps after the collection: collect again after a pause
    for (let k = 0; k < 3; k++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.waitForTimeout(700);
    }
    const h = await cdp.send('Runtime.getHeapUsage');
    return +((h.usedSize + (h.embedderHeapUsedSize ?? 0) + (h.backingStorageSize ?? 0)) / 1048576).toFixed(1);
  };
  const heapMB = await heapAfterGC();
  const contexts = await page.evaluate(() => ({ created: window.__p3d.ctxs.length, live: window.__p3d.ctxs.filter((s) => s.gl && !s.gl.isContextLost()).length }));

  // mount/unmount cycles: to a neighbouring sub-topic and back
  let memory = null;
  if (cycles > 0 && sc.cycle) {
    const heap = [];
    // DOM nodes alive after GC: a closed canvas that is kept (with the section around it) shows as thousands more
    const domNodes = [];
    for (let i = 0; i < cycles; i++) {
      await page.evaluate((h) => (location.hash = h), sc.cycle);
      await page.waitForTimeout(1500);
      await page.evaluate((h) => (location.hash = h), sc.hash);
      await page.waitForTimeout(1000);
      if (!(await reach().catch(() => false))) throw new Error(`cycle ${i + 1}: the model did not come back`);
      await center();
      await page
        .waitForFunction((p) => {
          const c = findCanvasIn(p);
          const s = c && window.__p3d.ctxs.find((x) => x.canvas === c);
          return s && s.draws > 0;
        }, pick, { timeout: 60_000 });
      await page.waitForTimeout(1500);
      heap.push(await heapAfterGC());
      domNodes.push((await cdp.send('Memory.getDOMCounters')).nodes);
    }
    const live = await page.evaluate(() => window.__p3d.ctxs.filter((s) => s.gl && !s.gl.isContextLost() && s.canvas && !s.canvas.isConnected && s.canvas.width > 300).length);
    // Canvases off the page yet still reachable (V8 queryObjects: live objects only) — a closed model that is kept,
    // with its renderer and the section around it. (DOM and heap counters also count garbage not yet swept.)
    const proto = await cdp.send('Runtime.evaluate', { expression: 'HTMLCanvasElement.prototype' });
    const all = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const kept = await cdp.send('Runtime.callFunctionOn', {
      objectId: all.objects.objectId,
      functionDeclaration: 'function () { return this.filter((c) => !c.isConnected && c.width > 300).length; }',
      returnByValue: true,
    });
    memory = { heapMB: heap, growthMB: +(heap[heap.length - 1] - heap[0]).toFixed(1), domNodes, domGrowth: domNodes[domNodes.length - 1] - domNodes[0], keptCanvases: kept.result.value, detachedLiveContexts: live };
  }

  await ctx.close();
  const fps = (fr, ms) => +(fr.length / (ms / 1000)).toFixed(1);
  return {
    scene: name,
    tier: rest.tier,
    loadS: +loadS.toFixed(1),
    density: { rest: rest.density, moving: drag?.density ?? null, recoverS },
    idleFps: fps(idleFrames, idleB - idleA),
    settledFps: fps(settledFrames, settledB - settledA),
    offscreenFps: offView ? fps(offFrames, offB - offA) : null,
    offscreenPageFps: fps({ length: allOff }, offB - offA),
    drag,
    heapMB,
    contexts,
    contextWarnings: contextWarnings.length,
    memory,
    errors: errors.slice(0, 3),
  };
}

// ------------------------------------------------------------------ compare
const LIMITS = [
  // [label, getter, allowed(baseline, now)]
  ['idle fps', (r) => r.idleFps, (b, n) => n <= b + 1],
  ['off-screen fps', (r) => r.offscreenFps, (b, n) => n <= b + 1],
  ['draw calls / frame', (r) => r.drag?.drawsPerFrame, (b, n) => n <= b * 1.1 + 2],
  ['triangles / frame', (r) => r.drag?.trisPerFrame, (b, n) => n <= b * 1.1 + 100],
  ['shadow passes / drag', (r) => r.drag?.shadowPasses, (b, n) => n <= b * 1.5 + 4],
  ['drag fps', (r) => r.drag?.fps, (b, n) => n >= b * 0.8 - 1],
  ['resolution recovery s', (r) => r.density?.recoverS, (b, n) => n <= b + 2],
  ['live WebGL contexts', (r) => r.contexts?.live, (b, n) => n <= b],
  ['heap growth MB (cycles)', (r) => r.memory?.growthMB, (b, n) => n <= Math.max(b, 0) + 8],
  ['closed canvases kept alive (cycles)', (r) => r.memory?.keptCanvases, (b, n) => n <= b],
];
function compareRuns(base, now) {
  const fails = [];
  for (const r of now) {
    const b = base.find((x) => x.scene === r.scene);
    if (!b) continue;
    for (const [label, get, ok] of LIMITS) {
      const bv = get(b);
      const nv = get(r);
      if (bv == null || nv == null) continue;
      if (!ok(bv, nv)) fails.push(`${r.scene}: ${label} ${bv} → ${nv}`);
    }
  }
  return fails;
}

// ------------------------------------------------------------------ run
const launchArgs =
  gpu === 'sw'
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu']
    : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
let server = null;
let base = arg('base', '');
if (!base) {
  const dir = path.resolve(arg('out', 'out'));
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`${dir} has no static export — run npm run build first`);
  server = await serve(dir);
  base = server.base;
}
const browser = await chromium.launch({ channel: 'chrome', args: launchArgs });
const results = [];
for (const name of names) {
  const r = await measure(browser, base, name).catch((e) => ({ scene: name, error: String(e).slice(0, 300) }));
  results.push(r);
  console.log(JSON.stringify(r));
}
await browser.close();
server?.close();

console.log('\nscene            tier      load  idle  off  drag-fps  p90ms  draws   tris     shadow  dpr rest/move  recover');
for (const r of results) {
  if (r.error || r.noCanvas) {
    console.log(`${r.scene.padEnd(16)} ${r.error ?? JSON.stringify(r)}`);
    continue;
  }
  const d = r.drag ?? {};
  console.log(
    [
      r.scene.padEnd(16), String(r.tier).padEnd(9), String(r.loadS).padStart(5), String(r.idleFps).padStart(5), String(r.offscreenFps).padStart(4),
      String(d.fps ?? '-').padStart(9), String(d.gapP90Ms ?? '-').padStart(6), String(d.drawsPerFrame ?? '-').padStart(6),
      String(d.trisPerFrame ?? '-').padStart(9), String(d.shadowPasses ?? '-').padStart(7), `${r.density.rest}/${r.density.moving ?? '-'}`.padStart(13),
      String(r.density.recoverS ?? '-').padStart(8),
    ].join(' '),
  );
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ gpu, cpu, tier, cycles, results }, null, 1));
if (compare) {
  const baseRun = JSON.parse(fs.readFileSync(compare, 'utf8'));
  const fails = compareRuns(baseRun.results, results);
  console.log(fails.length ? `\nREGRESSIONS vs ${compare}:\n  ${fails.join('\n  ')}` : `\nno regressions vs ${compare}`);
  if (fails.length) process.exitCode = 1;
}
