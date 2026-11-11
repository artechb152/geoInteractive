// The homepage map sheet's print (MapTableHome.tsx): one ink layer per sheet frame
// (home_map_table_sheets.json), in frame pixels (pxPerU per u), rendered into the sheet's paper by
// render_home_map_table.py (pass sheet-a…d). Output: qa-output/home-map-table/maps/sheet-ink-{a..d}.png
//
// A real topographic print, not a pattern:
//   - one continuous relief covers the whole sheet: ridged hills (domain-warped ridged noise, so spurs
//     and re-entrants read as real ground) rising from a broad valley floor;
//   - wadis are traced from the same height field (depressions filled, D8 flow, accumulation), so every
//     stream runs down a valley the contours draw and each crossing's V points upstream;
//   - hierarchy, faintest first: kilometre grid → 10 m contours → 50 m index contours (a few labels
//     reading uphill, set in a gap in the line) → spot heights → wadis.
// Quiet zones: the land falls to a flat valley floor (between two contour levels) under the brand row,
// the headline and 'פרקי הקורס', so they sit on blank paper without a knock-out halo; the wadis die out
// where they reach the floor. No neatline (removed 2026-11-11 at the user's request).
//
//   node scripts/blender/home_map_table_sheet_ink.cjs [a] [b] [c] [d]
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'qa-output/home-map-table/maps');
fs.mkdirSync(out, { recursive: true });

// Site palette only: tanline.badge (contours), terrain.sky (water), olive.ink (grid, spot heights).
const INK = { contour: '#8a6f4d', water: '#3d6b8e', ink: '#38432e' };

// ── noise ──────────────────────────────────────────────────────────────────
function makeNoise(seed) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = [...perm, ...perm];
  const g = Array.from({ length: 256 }, () => { const a = rnd() * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (h, x, y) => g[h][0] * x + g[h][1] * y;
  const n2 = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    const l1 = dot(p[a], x, y) + u * (dot(p[b], x - 1, y) - dot(p[a], x, y));
    const l2 = dot(p[a + 1], x, y - 1) + u * (dot(p[b + 1], x - 1, y - 1) - dot(p[a + 1], x, y - 1));
    return l1 + v * (l2 - l1);
  };
  return (x, y, oct = 4, gain = 0.5) => { let a = 1, f = 1, t = 0, n = 0; for (let o = 0; o < oct; o++) { t += a * n2(x * f + o * 17.3, y * f - o * 9.1); n += a; a *= gain; f *= 2; } return t / n; };
}

// ── geometry ───────────────────────────────────────────────────────────────
/** Marching squares on an n × m grid -> joined polylines in grid units. */
function contours(field, n, m, level) {
  const segs = [];
  const at = (i, j) => field[j * n + i];
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const idx = (a > level) | ((b > level) << 1) | ((c > level) << 2) | ((d > level) << 3);
    if (idx === 0 || idx === 15) continue;
    const e = {
      t: [i + (level - a) / (b - a), j], r: [i + 1, j + (level - b) / (c - b)],
      b: [i + (level - d) / (c - d), j + 1], l: [i, j + (level - a) / (d - a)],
    };
    const table = { 1: ['l', 't'], 2: ['t', 'r'], 3: ['l', 'r'], 4: ['r', 'b'], 6: ['t', 'b'], 7: ['l', 'b'], 8: ['b', 'l'], 9: ['b', 't'], 11: ['b', 'r'], 12: ['r', 'l'], 13: ['r', 't'], 14: ['t', 'l'] };
    if (idx === 5) { segs.push([e.l, e.t], [e.r, e.b]); continue; }
    if (idx === 10) { segs.push([e.t, e.r], [e.b, e.l]); continue; }
    const [p, q] = table[idx]; segs.push([e[p], e[q]]);
  }
  const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const ends = new Map();
  segs.forEach((s, k) => { for (const p of s) { const kk = key(p); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
  const used = new Uint8Array(segs.length); const lines = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1;
    const line = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find((q) => !used[q]);
        if (next === undefined) break;
        used[next] = 1;
        const [p, q] = segs[next]; const other = key(p) === key(tip) ? q : p;
        if (dir) line.push(other); else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}
function smooth(line, it = 2) {
  const closed = Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) < 1e-6;
  let p = line;
  for (let k = 0; k < it; k++) {
    const q = closed ? [] : [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (closed) q.push(q[0]); else q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
function decimate(line, minStep) {
  const o = [line[0]];
  for (const p of line) { const l = o[o.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= minStep) o.push(p); }
  o.push(line[line.length - 1]);
  return o;
}
const pathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
const lengthOf = (p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };

/** Where the live copy sits on a frame (u): measured in the browser, see MapTableHome.module.css. */
function copyBoxes(v, spec) {
  const W = v.w; const row = 3 * spec.card + 2 * spec.gap; const colR = W - (W - row) / 2;
  return [
    [W / 2 - 362, 60, W / 2 + 352, 126],                         // the brand + 'המשך ללמוד' (with its stripes)
    [colR - 540, v.heroTop - 14, colR + 8, v.titleTop + 60],     // the headline and 'פרקי הקורס'
  ];
}

function buildSheetInk(key, v, spec) {
  const k = spec.pxPerU; const W = v.w, H = v.h;
  const row = 3 * spec.card + 2 * spec.gap; const colL = (W - row) / 2, colR = W - colL;
  const foldX = W / 2 + spec.foldXOffset, foldY = v.foldY;
  const boxes = copyBoxes(v, spec);
  const nWarp = makeNoise(53), nRidge = makeNoise(71), nBroad = makeNoise(97), nEdge = makeNoise(13);

  // ── the relief ──
  // The valley floor: the copy boxes, merged by a smooth union and pushed out of shape by a broad warp,
  // so its edge is a landform rather than a rounded rectangle. The warp moves the edge by ≤ ~45 u, and
  // PAD keeps it ≥ ~35 u clear of the letters everywhere.
  const PAD = 96;
  const rectDist = ([x0, y0, x1, y1], x, y) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
  const smin = (a, b, r) => { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / r)); return b + (a - b) * h - r * h * (1 - h); };
  const floorDist = (x, y) => {
    const qx = x + 44 * nEdge(x / 300, y / 300, 3), qy = y + 44 * nEdge(x / 300 + 5.1, y / 300 - 2.7, 3);
    return boxes.reduce((d, b) => smin(d, rectDist(b, qx, qy), 90), 1e9) - PAD + 26 * nEdge(x / 140 - 4, y / 140 + 8, 2);
  };  const ridged = (x, y, oct = 4) => {
    let sum = 0, amp = 1, f = 1, norm = 0, w = 1;
    for (let o = 0; o < oct; o++) {
      let r = Math.max(0, 1 - 1.6 * Math.abs(nRidge(x * f + o * 31.7, y * f - o * 12.9, 1)));
      r *= r * w; w = Math.min(1, r * 1.8);
      sum += r * amp; norm += amp; amp *= 0.42; f *= 2.03;
    }
    return sum / norm;
  };
  const FLOOR = 243, CI = 10;   // the valley floor lies at ~243 m; contours every 10 m from 250 m
  const height = (x, y) => {
    const wx = x + 120 * nWarp(x / 480, y / 480, 3), wy = y + 120 * nWarp(x / 480 + 7.3, y / 480 - 3.1, 3);
    let relief = 40 + 220 * ridged(wx / 640, wy / 640) + 80 * (0.5 + nBroad(x / 820, y / 820, 3)) + 40 * (1 - x / W);
    // spurs and re-entrants along the rim (ridged, so the re-entrants are the creases the wadis follow)
    relief *= 0.8 + 0.42 * ridged(wx / 300 + 13, wy / 300 - 7, 2);
    // the hillsides rise off the floor at different rates: gentle fans in places, steeper spurs in others
    const L = 230 + 150 * nBroad(x / 380 + 11, y / 380 - 6, 2);
    const rise = 1 - Math.exp(-Math.max(0, floorDist(x, y)) / L);
    return FLOOR + 1.4 * nBroad(x / 70, y / 70, 2) + relief * rise;
  };
  const STEP = 4; const nx = Math.ceil(W / STEP) + 1, ny = Math.ceil(H / STEP) + 1, N = nx * ny;
  const field = new Float64Array(N), floorD = new Float64Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * STEP, y = j * STEP; field[j * nx + i] = height(x, y); floorD[j * nx + i] = floorDist(x, y); }
  const sample = (x, y) => {
    const gx = Math.max(0, Math.min(nx - 1.001, x / STEP)), gy = Math.max(0, Math.min(ny - 1.001, y / STEP));
    const i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j, a = j * nx + i;
    return (field[a] * (1 - fx) + field[a + 1] * fx) * (1 - fy) + (field[a + nx] * (1 - fx) + field[a + nx + 1] * fx) * fy;
  };
  const toU = (l) => l.map(([x, y]) => [x * STEP, y * STEP]);
  // labels and spot heights go only where they can be seen and read: on the sheet, off the cards and folds
  const cards = [colL - 12, v.cardsTop - 12, colR + 12, v.cardsTop + spec.card + 14];
  const visible = (x, y, m = 0) => x > v.ex + 50 + m && x < W - v.ex - 50 - m && y > v.ey + 50 + m && y < H - v.ey - 50 - m
    && !(x > cards[0] - m && x < cards[2] + m && y > cards[1] - m && y < cards[3] + m)
    && Math.abs(x - foldX) > 46 + m && Math.abs(y - foldY) > 46 + m && floorDist(x, y) > 70 + m;

  // ── drainage: priority-flood the depressions (sheet edges and the valley floor drain), D8 flow ──
  const filled = Float64Array.from(field); const done = new Uint8Array(N);
  const heap = [];
  const hpush = (h, c) => { heap.push([h, c]); let n = heap.length - 1; while (n) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
  const hpop = () => {
    const top = heap[0]; const last = heap.pop();
    if (heap.length) { heap[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } }
    return top;
  };
  for (let c = 0; c < N; c++) { const i = c % nx, j = (c / nx) | 0; if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1 || floorD[c] <= 0) { done[c] = 1; hpush(field[c], c); } }
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.length) {
    const [, c] = hpop(); const i = c % nx, j = (c / nx) | 0;
    for (const [di, dj] of NB) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const n = jj * nx + ii; if (done[n]) continue;
      done[n] = 1; filled[n] = Math.max(field[n], filled[c] + 1e-4); hpush(filled[n], n);
    }
  }
  const down = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) {
    if (floorD[c] <= 0) continue;
    const i = c % nx, j = (c / nx) | 0; let best = 0;
    for (const [di, dj] of NB) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const n = jj * nx + ii; const s = (filled[c] - filled[n]) / Math.hypot(di, dj);
      if (s > best) { best = s; down[c] = n; }
    }
  }
  const order = Array.from({ length: N }, (_, c) => c).sort((a, b) => filled[b] - filled[a]);
  const acc = new Float64Array(N).fill(1);
  for (const c of order) if (down[c] >= 0) acc[down[c]] += acc[c];
  const T = +(process.env.HMT_WADI_CELLS || 1100);   // cells of 16 u²: a wadi drains at least ~17 600 u²
  const isStream = (c) => acc[c] >= T && floorD[c] > 18;
  const hasUp = new Uint8Array(N);
  for (let c = 0; c < N; c++) if (isStream(c) && down[c] >= 0 && isStream(down[c])) hasUp[down[c]] = 1;
  const seen = new Uint8Array(N); const streams = [];
  const cellPt = (c) => [(c % nx) * STEP, ((c / nx) | 0) * STEP];
  const cls = (c) => Math.max(0, Math.min(2, Math.floor(Math.log2(acc[c] / T) / 1.6)));
  for (const c0 of order) {
    if (!isStream(c0) || hasUp[c0]) continue;
    let c = c0; let pts = [cellPt(c)]; let cur = cls(c);
    for (;;) {
      seen[c] = 1;
      const n = down[c];
      if (n < 0 || !isStream(n)) break;
      pts.push(cellPt(n));
      if (cls(n) !== cur) { streams.push({ pts, cls: cur }); pts = [cellPt(n)]; cur = cls(n); }
      if (seen[n]) break;      // joined a wadi already drawn
      c = n;
    }
    if (pts.length > 2) streams.push({ pts, cls: cur });
  }
  // a little organic wander so the traced lines don't follow the grid's 45° steps
  const meander = (p) => p.map(([x, y], i) => (i === 0 || i === p.length - 1 ? [x, y] : [x + 4 * nWarp(x / 40 + 3, y / 40, 2), y + 4 * nWarp(x / 40, y / 40 + 9, 2)]));
  const streamPaths = streams.map(({ pts, cls: c }) => `<path d="${pathD(smooth(meander(decimate(pts, 9)), 3))}" stroke-width="${[0.95, 1.3, 1.7][c]}" stroke-opacity="${[0.55, 0.64, 0.72][c]}"/>`);

  // ── contours + index labels ──
  const cl = []; const labels = [];
  let maxH = 0; for (let c = 0; c < N; c++) maxH = Math.max(maxH, field[c]);
  for (let lv = FLOOR - (FLOOR % CI) + CI; lv <= maxH; lv += CI) {
    const index = lv % 50 === 0;
    for (const l of contours(field, nx, ny, lv)) {
      if (l.length < 6) continue;
      const pts = toU(smooth(decimate(l, 0.7)));
      cl.push(`<path d="${pathD(pts)}" stroke-width="${index ? 1.8 : 0.9}" stroke-opacity="${index ? 0.6 : 0.4}"/>`);
      if (!index || lengthOf(pts) < 240) continue;
      // a label on a straight-ish, visible stretch, well apart from the other labels
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const at = (s) => { let i = Math.max(1, cum.findIndex((c) => c >= s)); if (i < 1 || i >= pts.length) i = pts.length - 1; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])]; };
      for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88]) {
        const s = f * cum[cum.length - 1]; const p = at(s), a = at(s - 16), b = at(s + 16), a2 = at(s - 34), b2 = at(s + 34);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), ang2 = Math.atan2(b2[1] - a2[1], b2[0] - a2[0]);
        if (Math.abs(Math.atan2(Math.sin(ang - ang2), Math.cos(ang - ang2))) > 0.28) continue;
        if (!visible(p[0], p[1], 20)) continue;
        if (labels.some((q) => Math.hypot(q.x - p[0], q.y - p[1]) < 300)) continue;
        const gx = sample(p[0] + 4, p[1]) - sample(p[0] - 4, p[1]), gy = sample(p[0], p[1] + 4) - sample(p[0], p[1] - 4);
        let deg = ang * 180 / Math.PI;
        const r = ang; if (Math.sin(r) * gx - Math.cos(r) * gy < 0) deg += 180;   // the figures' tops face uphill
        deg = ((deg % 360) + 540) % 360 - 180;
        if (Math.abs(deg) > 80) continue;                                          // ...and are never read upside down
        labels.push({ x: p[0], y: p[1], deg, t: String(lv) });
        break;
      }
    }
  }
  const FS = 12.5;
  const gaps = labels.map((l) => `<rect x="${(-l.t.length * FS * 0.31 - 4).toFixed(1)}" y="${(-FS * 0.55).toFixed(1)}" width="${(l.t.length * FS * 0.62 + 8).toFixed(1)}" height="${(FS * 1.1).toFixed(1)}" fill="black" transform="translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.deg.toFixed(1)})"/>`);
  const labelText = labels.map((l) => `<text transform="translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.deg.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="${FS}">${l.t}</text>`);

  // ── spot heights on the visible summits ──
  const spots = []; const R = 12;
  for (let j = R; j < ny - R; j += 2) for (let i = R; i < nx - R; i += 2) {
    const c = j * nx + i, h = field[c]; if (h < FLOOR + 70) continue;
    const x = i * STEP, y = j * STEP; if (!visible(x, y, 24)) continue;
    let top = true;
    for (let dj = -R; dj <= R && top; dj += 2) for (let di = -R; di <= R; di += 2) if (field[(j + dj) * nx + i + di] > h) { top = false; break; }
    if (top && !spots.some((q) => Math.hypot(q.x - x, q.y - y) < 40)) spots.push({ x, y, h });
  }
  spots.sort((a, b) => b.h - a.h);
  if (process.env.HMT_DEBUG) console.log(key, 'summit candidates', spots.length);
  const kept = [];
  for (const s of spots) if (kept.length < 4 && !kept.some((q) => Math.hypot(q.x - s.x, q.y - s.y) < 300) && !labels.some((q) => Math.hypot(q.x - s.x, q.y - s.y) < 60)) kept.push(s);
  const spotMarks = kept.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="1.9"/>` +
    `<text x="${(s.x + 5).toFixed(1)}" y="${(s.y - 4).toFixed(1)}" text-anchor="start" font-size="12">${Math.round(s.h)}</text>`);

  // ── kilometre grid (1 km = 250 u), interrupted over the valley floor under the copy ──
  const G = 250; const grid = [];
  for (let x = foldX % G + G / 2; x < W; x += G) grid.push(`M${x.toFixed(1)} 0V${H}`);
  for (let y = 70; y < H; y += G) grid.push(`M0 ${y}H${W}`);
  const quiet = boxes.map(([x0, y0, x1, y1]) => `<rect x="${x0 - 24}" y="${y0 - 20}" width="${x1 - x0 + 48}" height="${y1 - y0 + 40}" rx="18" fill="black"/>`).join('');

  const rot = `rotate(${spec.rotateDeg} ${W / 2} ${H / 2})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}" viewBox="0 0 ${W} ${H}">` +
    `<defs><mask id="gap" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${gaps.join('')}</mask>` +
    `<mask id="quiet" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${quiet}</mask></defs>` +
    `<g transform="${rot}" fill="none" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="${grid.join('')}" stroke="${INK.ink}" stroke-opacity="0.13" stroke-width="0.8" mask="url(#quiet)"/>` +
    `<g stroke="${INK.contour}" mask="url(#gap)">${cl.join('')}</g>` +
    `<g stroke="${INK.water}">${streamPaths.join('')}</g>` +
    `<g fill="${INK.contour}" fill-opacity="0.85" stroke="none" font-family="Arial, Helvetica, sans-serif">${labelText.join('')}</g>` +
    `<g fill="${INK.ink}" fill-opacity="0.72" stroke="none" font-family="Arial, Helvetica, sans-serif">${spotMarks.join('')}</g>` +
    `</g></svg>`;
  fs.writeFileSync(path.join(out, `sheet-ink-${key}.svg`), svg);
  console.log(`sheet-ink-${key}: ${cl.length} contour lines, ${streams.length} wadi segments, ${labels.length} labels, ${kept.length} spot heights, ${Math.round(FLOOR)}–${Math.round(maxH)} m`);
  return sharp(Buffer.from(svg), { limitInputPixels: false }).png().toFile(path.join(out, `sheet-ink-${key}.png`));
}

(async () => {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'home_map_table_sheets.json'), 'utf8'));
  const only = process.argv.slice(2);
  for (const [key, v] of Object.entries(spec.variants)) if (!only.length || only.includes(key)) await buildSheetInk(key, v, spec);
})();
