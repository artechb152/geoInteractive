// Browser QA for the topic-02 contour map's legibility (audit ב4, ג7; handoff topic02-map-readability-handoff-2026-10-27.md).
// Usage (dev server on :3000, or QA_BASE=http://localhost:<port>):
//   node scripts/qa/contours-legibility.mjs [--strict] [outDir]   (--strict: the two known touches fail too)
// Screenshots + contours-legibility.json go to outDir (default qa-output/contours-legibility, git-ignored).
// Exit code 1 on any failure.
//
// Sizes are SCREEN px at 1440×1122, after the lesson's uniform fit: an SVG label is font-size × (shown SVG width / 100).
// Checks:
//   - every map label (heights, spot height, "צ", the scale bar and its "מ׳", "תלול" / "מתון") is ≥ 12 px on screen;
//   - the scale bar's "50" and "מ׳" share one row and do not touch;
//   - no two labels / marks overlap; no label sits at or over the map's frame;
//   - no label covers a contour of another height, the slope rulers or their dots — except the two pre-existing
//     touches listed in KNOWN_LINE_HITS (audit, outside the readability brief), which may not grow;
//   - the card's height does not move: idle, hovering the map, keyboard focus on the map, after leaving it,
//     the three model views and a wheel zoom on the model; the card stays on screen with no horizontal scroll.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const W = 1440;
const H = 1122;
const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-contours`;
const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'qa-output/contours-legibility';
const STRICT = process.argv.includes('--strict');
const MIN_LABEL_PX = 12;
/**
 * Present before the readability change and unchanged by it (handoff, "לא טופל"): the "מתון" plate hides a short
 * stretch of the 10 m contour, and the 59 plate touches the 50 m contour at one point. `max` is the number of
 * 0.2-unit samples measured on 2026-10-27; more samples, or any other hit, is a failure.
 */
const KNOWN_LINE_HITS = [
  { label: 'slope מתון', line: 'contour 10', max: 39 },
  { label: 'chip 59', line: 'contour 50', max: 1 },
];
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log(`FAIL ${m}`);
};
const ok = (cond, m) => (cond ? console.log(`ok   ${m}`) : fail(m));
const report = { url: URL, viewport: `${W}x${H}` };

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && /contour|ContourCake|ContoursScene/i.test(m.location().url ?? '')) errors.push(m.text());
});
await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
await page.waitForSelector('#scene-contours .surface-elevated', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('#scene-contours canvas', { timeout: 120000 });
await page.waitForFunction(() => !document.querySelector('#scene-contours')?.innerText.includes('טוען הר'), null, { timeout: 120000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const el = document.querySelector('#scene-contours .surface-elevated');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
});
await page.waitForTimeout(500);
await page.mouse.move(2, H - 2);

// ── geometry, in viewBox units (gaps reported in screen px) ──
report.geometry = await page.evaluate(() => {
  const svg = document.querySelector('#scene-contours [data-qa="contour-map-keys"] svg');
  const unitPx = svg.getBoundingClientRect().width / 100;
  const card = svg.closest('.surface-elevated');
  const fit = card.getBoundingClientRect().width / card.offsetWidth;
  const toSvg = (el) => svg.getCTM().inverse().multiply(el.getCTM());
  const quad = (m, pts) =>
    pts.map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(m);
      return [p.x, p.y];
    });
  const poly = (el, pad = 0) => {
    const b = el.getBBox();
    return quad(toSvg(el), [
      [b.x - pad, b.y - pad],
      [b.x + b.width + pad, b.y - pad],
      [b.x + b.width + pad, b.y + b.height + pad],
      [b.x - pad, b.y + b.height + pad],
    ]);
  };
  // glyph box of a text: getBBox is the font's em cell; trim it to the cap / x-height band (≈ 0.72 em, centred)
  const textPoly = (t) => {
    const b = t.getBBox();
    const fs = +t.getAttribute('font-size');
    const cy = b.y + b.height / 2;
    return quad(toSvg(t), [
      [b.x, cy - 0.36 * fs],
      [b.x + b.width, cy - 0.36 * fs],
      [b.x + b.width, cy + 0.36 * fs],
      [b.x, cy + 0.36 * fs],
    ]);
  };
  // label sizes on screen: font-size in viewBox units × screen px per unit (the CTM's own scale, e.g. a rotated chip, is 1)
  const sizes = [...svg.querySelectorAll('text')].map((t) => {
    const m = toSvg(t);
    return { text: t.textContent.trim(), px: +(+t.getAttribute('font-size') * Math.hypot(m.a, m.b) * unitPx).toFixed(2) };
  });
  const shapes = [];
  // chips (contour numbers + spot height): the paper plate
  for (const g of svg.querySelectorAll('g[transform^="rotate"]')) {
    const r = g.querySelector('rect');
    const t = g.querySelector('text');
    if (r && t) shapes.push({ name: `chip ${t.textContent.trim()}`, kind: 'chip', value: t.textContent.trim(), poly: poly(r) });
  }
  for (const t of svg.querySelectorAll('text')) {
    if (t.closest('g[transform^="rotate"]')) continue;
    const s = t.textContent.trim();
    const prev = t.previousElementSibling;
    // slope words sit on their own paper plate
    if (prev && prev.tagName === 'rect' && (s === 'תלול' || s === 'מתון')) shapes.push({ name: `slope ${s}`, kind: 'slope', poly: poly(prev) });
    else shapes.push({ name: `text ${s}`, kind: 'text', poly: textPoly(t) });
  }
  const tri = [...svg.querySelectorAll('path')].find((p) => /^M[\d.]+ [\d.]+ L/.test(p.getAttribute('d') ?? '') && p.getAttribute('d').endsWith('Z') && p.getAttribute('d').split('L').length === 3);
  if (tri) shapes.push({ name: 'summit triangle', kind: 'mark', poly: poly(tri) });
  const north = svg.querySelector('g[transform^="translate"] path');
  if (north) shapes.push({ name: 'north arrow', kind: 'mark', poly: poly(north) });
  const bars = [...svg.querySelectorAll('rect')].filter((r) => +r.getAttribute('height') === 1.1);
  for (const [i, r] of bars.entries()) shapes.push({ name: `scale bar ${i}`, kind: 'bar', poly: poly(r) });

  // separating-axis test for convex quads; returns the gap (≤ 0 = overlap) along the best axis
  const gap = (A, B) => {
    let best = -Infinity;
    for (const P of [A, B]) {
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = P[i];
        const [x2, y2] = P[(i + 1) % 4];
        const nx = y2 - y1;
        const ny = x1 - x2;
        const len = Math.hypot(nx, ny) || 1;
        const proj = (Q) => Q.map(([x, y]) => (x * nx + y * ny) / len);
        const a = proj(A);
        const b = proj(B);
        best = Math.max(best, Math.max(Math.min(...b) - Math.max(...a), Math.min(...a) - Math.max(...b)));
      }
    }
    return best;
  };
  const pairs = [];
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];
      if (a.kind === 'bar' && b.kind === 'bar') continue; // the bar's own two segments
      pairs.push({ a: a.name, b: b.name, gapPx: +(gap(a.poly, b.poly) * unitPx).toFixed(2) });
    }
  const overlaps = pairs.filter((p) => p.gapPx <= 0);
  const closest = [...pairs].sort((x, y) => x.gapPx - y.gapPx).slice(0, 8);

  // the scale bar's "50" and "מ׳": one row (centres level), apart
  const byName = (n) => shapes.find((s) => s.name === n);
  const cy = (s) => (Math.min(...s.poly.map((p) => p[1])) + Math.max(...s.poly.map((p) => p[1]))) / 2;
  const bar50 = byName('text 50');
  const unit = byName('text מ׳');
  const metres = bar50 && unit ? { rowDeltaPx: +(Math.abs(cy(bar50) - cy(unit)) * unitPx).toFixed(2), gapPx: +(gap(bar50.poly, unit.poly) * unitPx).toFixed(2) } : null;

  // lines under labels: contour strokes of OTHER heights, ruler lines and dots
  const inside = (P, [x, y]) => {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = P[i];
      const [x2, y2] = P[(i + 1) % 4];
      const c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
      if (c !== 0) {
        if (s === 0) s = Math.sign(c);
        else if (Math.sign(c) !== s) return false;
      }
    }
    return true;
  };
  const strokes = [...svg.querySelectorAll('path[fill="none"]')].filter((p) => p.getAttribute('stroke') && !p.closest('[aria-hidden]'));
  const levels = ['10', '20', '30', '40', '50'];
  const lineHits = [];
  for (const [li, p] of strokes.entries()) {
    const L = p.getTotalLength();
    const pts = [];
    for (let d = 0; d < L; d += 0.2) {
      const q = p.getPointAtLength(d);
      pts.push([q.x, q.y]);
    }
    for (const s of shapes) {
      if (s.kind === 'bar' || s.kind === 'mark') continue;
      if (s.kind === 'chip' && s.value === levels[li]) continue; // a number breaks its own line
      const n = pts.filter((q) => inside(s.poly, q)).length;
      if (n) lineHits.push({ label: s.name, line: `contour ${levels[li]}`, samples: n });
    }
  }
  for (const l of svg.querySelectorAll('line')) {
    const x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('x2'), y2 = +l.getAttribute('y2');
    const pts = Array.from({ length: 200 }, (_, k) => [x1 + ((x2 - x1) * k) / 199, y1 + ((y2 - y1) * k) / 199]);
    for (const s of shapes) {
      if (s.kind === 'bar' || s.kind === 'mark' || s.kind === 'slope') continue;
      const n = pts.filter((q) => inside(s.poly, q)).length;
      if (n) lineHits.push({ label: s.name, line: 'slope ruler', samples: n });
    }
  }
  for (const c of svg.querySelectorAll('circle')) {
    const cx = +c.getAttribute('cx'), cy0 = +c.getAttribute('cy'), r = +c.getAttribute('r');
    const pts = Array.from({ length: 16 }, (_, k) => [cx + r * Math.cos((k * Math.PI) / 8), cy0 + r * Math.sin((k * Math.PI) / 8)]);
    for (const s of shapes) {
      if (s.kind === 'bar' || s.kind === 'mark') continue;
      if (pts.some((q) => inside(s.poly, q))) lineHits.push({ label: s.name, line: 'ruler dot', samples: 1 });
    }
  }
  const outOfFrame = shapes.filter((s) => s.poly.some(([x, y]) => x < 0.5 || x > 99.5 || y < 0.5 || y > 99.5)).map((s) => s.name);
  const sb = svg.getBoundingClientRect();
  return {
    fit: +fit.toFixed(4),
    mapPx: [+sb.width.toFixed(1), +sb.height.toFixed(1)],
    unitPx: +unitPx.toFixed(3),
    sizes,
    metres,
    shapes: shapes.map((s) => s.name),
    overlaps,
    closest,
    lineHits,
    outOfFrame,
  };
});
const g = report.geometry;
console.log(`map ${g.mapPx.join('×')} px on screen (lesson fit ×${g.fit}, ${g.unitPx} px per viewBox unit)`);

// label sizes
ok(g.sizes.length >= 13, `labels: ${g.sizes.length} SVG labels found on the map`);
const small = g.sizes.filter((s) => s.px < MIN_LABEL_PX);
ok(small.length === 0, `labels: every map label ≥ ${MIN_LABEL_PX} px on screen (min ${Math.min(...g.sizes.map((s) => s.px))}${small.length ? `; under: ${small.map((s) => `${s.text} ${s.px}`).join(', ')}` : ''})`);
for (const t of ['צ', '0', '25', 'מ׳']) ok(g.sizes.some((s) => s.text === t && s.px >= MIN_LABEL_PX), `labels: "${t}" present and ≥ ${MIN_LABEL_PX} px`);
// "50" and "מ׳"
ok(!!g.metres && g.metres.rowDeltaPx < 1 && g.metres.gapPx > 1, `scale bar: "50" and "מ׳" on one row, apart (${JSON.stringify(g.metres)})`);
// overlaps, frame
ok(g.overlaps.length === 0, `overlaps: none among ${g.shapes.length} labels / marks${g.overlaps.length ? ` — ${JSON.stringify(g.overlaps)}` : ''} (closest ${g.closest.slice(0, 3).map((p) => `${p.a} / ${p.b} ${p.gapPx}`).join('; ')})`);
ok(g.outOfFrame.length === 0, `frame: no label at or over the map's edge${g.outOfFrame.length ? ` — ${g.outOfFrame.join(', ')}` : ''}`);
// lines under labels
const known = (h) => KNOWN_LINE_HITS.find((k) => k.label === h.label && k.line === h.line);
const newHits = g.lineHits.filter((h) => !known(h));
const grown = g.lineHits.filter((h) => known(h) && h.samples > known(h).max);
ok(newHits.length === 0, `lines: no label covers another height's contour, a ruler or its dots${newHits.length ? ` — ${JSON.stringify(newHits)}` : ''}`);
ok(grown.length === 0, `lines: the known pre-existing touches did not grow${grown.length ? ` — ${JSON.stringify(grown)}` : ''}`);
report.knownLineHits = g.lineHits.filter(known);
if (STRICT) ok(report.knownLineHits.length === 0, `lines (--strict): no known touch left${report.knownLineHits.length ? ` — ${JSON.stringify(report.knownLineHits)}` : ''}`);
for (const h of report.knownLineHits) console.log(`note known (pre-existing, outside the brief): ${h.label} over ${h.line}, ${h.samples} sample(s) ≤ ${known(h).max}`);
for (const k of KNOWN_LINE_HITS) if (!g.lineHits.some((h) => h.label === k.label && h.line === k.line)) console.log(`note ${k.label} / ${k.line} no longer touches — remove it from KNOWN_LINE_HITS`);

// ── states: the card's height must not move ──
const card = page.locator('#scene-contours .surface-elevated').first();
const slider = page.locator('#scene-contours [data-qa="contour-map-keys"]');
const mapSvg = slider.locator('svg');
const heights = {};
const measure = async (name) => {
  const b = await card.boundingBox();
  const m = await mapSvg.boundingBox();
  const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
  heights[name] = +b.height.toFixed(1);
  ok(b.y + b.height <= H, `${name}: card bottom ${Math.round(b.y + b.height)} ≤ ${H}`);
  ok(m.y >= b.y && m.y + m.height <= b.y + b.height && m.x >= b.x && m.x + m.width <= b.x + b.width, `${name}: the map stays inside the card`);
  ok(sw <= W, `${name}: no horizontal scroll (${sw})`);
};
await measure('idle');
await page.screenshot({ path: `${outDir}/contours-1-whole.png` });
await mapSvg.screenshot({ path: `${outDir}/contours-map.png` });

// hover a band (30–40) on the map
const mb = await mapSvg.boundingBox();
await page.mouse.move(mb.x + mb.width * 0.5, mb.y + mb.height * 0.7);
await page.waitForTimeout(400);
report.hover = await page.evaluate(() => document.querySelector('#scene-contours [data-qa="contour-link"]')?.innerText.trim() ?? null);
await measure('hover map');
await page.mouse.move(2, H - 2);
await page.waitForTimeout(300);

// keyboard: Tab from the last view button into the map
await page.getByRole('button', { name: 'מבט מלמעלה', exact: false }).first().focus();
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
const focused = await slider.evaluate((el) => el === document.activeElement);
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(300);
const keysHint = await page.locator('#scene-contours [data-qa="contour-map-keys-hint"]').evaluate((el) => !el.classList.contains('sr-only'));
report.keys = { focused, valuetext: await slider.getAttribute('aria-valuetext'), keysHint };
ok(focused && keysHint, `keyboard: Tab reaches the map and its key line shows (${JSON.stringify(report.keys)})`);
await measure('keyboard focus');
await page.screenshot({ path: `${outDir}/contours-keyboard.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Shift+Tab');
await page.waitForTimeout(300);
await measure('keyboard left');

// three views
for (const [i, name] of ['הר שלם', 'פריסה לשכבות', 'מבט מלמעלה'].entries()) {
  await page.getByRole('button', { name, exact: false }).first().click();
  await page.waitForTimeout(1800);
  await page.mouse.move(2, H - 2);
  await page.waitForTimeout(300);
  await measure(`view ${name}`);
  await page.screenshot({ path: `${outDir}/contours-view-${i + 1}.png` });
}

// model wheel zoom (the screen's only zoom): it must not move the card or the map
const cv = await page.locator('#scene-contours canvas').first().boundingBox();
await page.mouse.move(cv.x + cv.width / 2, cv.y + cv.height / 2);
for (let k = 0; k < 4; k++) {
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(800);
await measure('model zoomed');

report.heights = heights;
const hs = Object.values(heights);
ok(Math.max(...hs) - Math.min(...hs) <= 0.5, `card height steady across ${hs.length} states (${Math.min(...hs)}–${Math.max(...hs)} px)`);
ok(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
report.failures = failures;
await writeFile(`${outDir}/contours-legibility.json`, JSON.stringify(report, null, 1));
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nPASS');
process.exit(failures.length ? 1 : 0);
