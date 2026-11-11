// Serve an existing static production export with an opt-in, QA-only frame recorder.
// No production source/bundle is instrumented. Open /lessons/topic-06/?qa=1#scene-tips,
// choose a phase, click Start, use the real interface, then click Save.
// node scripts/qa/serve-planning-lab-production.mjs [export-dir] [report-dir] [port]
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'out');
const output = resolve(process.argv[3] ?? 'design/screenshots/topic06-planning-production-2026-11-01');
const port = Number(process.argv[4] ?? 4173);
if (!existsSync(resolve(root, 'lessons/topic-06/index.html'))) throw new Error('Build the production export first.');
mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };

function recorder() {
  const LAB = '[data-activity="planning-lab"]';
  const startWhenReady = () => {
    const lab = document.querySelector(LAB);
    if (!lab?.querySelector('[data-panel="model"][data-ready]')) return setTimeout(startWhenReady, 200);
    const panel = document.createElement('aside');
    panel.id = 'production-qa';
    panel.setAttribute('aria-label', 'Production performance recorder');
    panel.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:2147483647;background:white;color:black;border:2px solid #333;border-radius:8px;padding:8px;font:14px sans-serif;direction:ltr;max-width:500px';
    panel.innerHTML = '<b>Production QA</b> <select aria-label="Measurement phase"><option>map-drag</option><option>model-drag</option><option>orbit</option><option>zoom</option><option>fullscreen-orbit</option></select> <button type="button">Start recording</button> <button type="button" disabled>Save measurement</button><div role="status">Ready — use the real map/model controls.</div>';
    document.body.append(panel);
    const [start, stop] = panel.querySelectorAll('button');
    const select = panel.querySelector('select');
    const status = panel.querySelector('[role="status"]');
    let recording = false, frames = [], activeFrames = [], longTasks = [], mutations = 0, moves = 0, downs = 0, previous = null, lastActive = -Infinity, began = 0, observer, changes;
    const frame = (time) => {
      if (!recording) return;
      if (previous !== null) {
        const dt = time - previous;
        frames.push(dt);
        if (previous <= lastActive + 250 && previous >= began) activeFrames.push(dt);
      }
      previous = time;
      requestAnimationFrame(frame);
    };
    const activity = (event) => {
      if (!recording || !event.target?.closest?.(LAB)) return;
      if (event.type === 'pointerdown') { downs++; lastActive = performance.now(); }
      if ((event.type === 'pointermove' && event.buttons) || event.type === 'wheel') { moves++; lastActive = performance.now(); }
    };
    for (const type of ['pointerdown', 'pointermove', 'wheel']) document.addEventListener(type, activity, { capture: true, passive: true });
    const stats = (samples) => {
      if (!samples.length) return { samples: 0 };
      const sorted = [...samples].sort((a, b) => a - b);
      const percentile = (p) => +sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))].toFixed(2);
      const meanMs = samples.reduce((a, b) => a + b, 0) / samples.length;
      return { samples: samples.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: percentile(1), meanMs: +meanMs.toFixed(2), medianFps: +(1000 / percentile(0.5)).toFixed(1), over33ms: samples.filter((v) => v > 33.4).length, over50ms: samples.filter((v) => v > 50).length };
    };
    start.onclick = () => {
      frames = []; activeFrames = []; longTasks = []; mutations = moves = downs = 0; previous = null; lastActive = -Infinity;
      began = performance.now(); recording = true; start.disabled = true; stop.disabled = false; select.disabled = true;
      changes = new MutationObserver((entries) => { mutations += entries.length; });
      changes.observe(lab, { attributes: true, attributeFilter: ['data-length', 'data-crossing'] });
      try { observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((e) => ({ startMs: +(e.startTime - began).toFixed(2), durationMs: +e.duration.toFixed(2) })))); observer.observe({ type: 'longtask', buffered: false }); } catch {}
      status.textContent = 'Recording ' + select.value + ' — interact now.';
      requestAnimationFrame(frame);
    };
    stop.onclick = async () => {
      recording = false; changes?.disconnect(); observer?.disconnect(); stop.disabled = true;
      const canvas = lab.querySelector('canvas');
      const gl = canvas?.getContext('webgl2');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const report = {
        phase: select.value, capturedAt: new Date().toISOString(), url: location.href,
        productionExport: true, devHookPresent: typeof window.__pl !== 'undefined',
        userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemoryGB: navigator.deviceMemory ?? null,
        gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        fullscreen: !!document.fullscreenElement, durationMs: +(performance.now() - began).toFixed(1),
        pointerDowns: downs, movesOrWheels: moves, measurementMutations: mutations,
        allFrames: stats(frames), activeFrames: stats(activeFrames), longTasks,
        frameIntervalsMs: frames.map((v) => +v.toFixed(2)), activeFrameIntervalsMs: activeFrames.map((v) => +v.toFixed(2)),
        note: 'rAF intervals during actual UI input and 250 ms after each input; not isolated GPU render timings. No CPU/GPU emulation. Workstation result is not laptop acceptance.'
      };
      const response = await fetch('/__planning-qa/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report) });
      const saved = await response.json();
      status.textContent = response.ok ? 'Saved ' + saved.file + ' | active median ' + report.activeFrames.medianMs + ' ms, p95 ' + report.activeFrames.p95Ms + ' ms' : 'Save failed';
      start.disabled = false; select.disabled = false;
    };
    // Keep the recorder usable while the model owns fullscreen; no scene state is touched.
    document.addEventListener('fullscreenchange', () => (document.fullscreenElement ?? document.body).append(panel));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startWhenReady, { once: true });
  else startWhenReady();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('cache-control', 'no-store');
  if (url.pathname === '/__planning-qa/recorder.js') {
    res.setHeader('content-type', mime['.js']);
    return res.end('(' + recorder.toString() + ')();');
  }
  if (url.pathname === '/__planning-qa/report' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413); return res.end(); } }
    try {
      const report = JSON.parse(body);
      if (!['map-drag', 'model-drag', 'orbit', 'zoom', 'fullscreen-orbit'].includes(report.phase)) throw new Error('Unknown phase');
      const file = report.phase + '-' + Date.now() + '.json';
      writeFileSync(resolve(output, file), JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ file, activeFrames: report.activeFrames, pointerDowns: report.pointerDowns, moves: report.movesOrWheels, longTasks: report.longTasks.length }));
      res.setHeader('content-type', mime['.json']); return res.end(JSON.stringify({ file }));
    } catch (error) { res.writeHead(400); return res.end(JSON.stringify({ error: String(error) })); }
  }
  let file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.setHeader('content-type', mime[extname(file)] ?? 'application/octet-stream');
  if (extname(file) === '.html' && url.searchParams.get('qa') === '1') {
    const { readFileSync } = await import('node:fs');
    return res.end(readFileSync(file, 'utf8').replace('</body>', '<script src="/__planning-qa/recorder.js"></script></body>'));
  }
  createReadStream(file).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`Production export: http://127.0.0.1:${port}/lessons/topic-06/?qa=1#scene-tips`));
