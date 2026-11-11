// Printed artwork for the homepage (MapTableHome.tsx). Output: qa-output/home-map-table/maps.
//   contours.png         chapter 02 — a topographic sheet: two hills (784, 720), 4 m contours with
//                        20 m index contours, a blue dashed wadi down its valley, tracks, grid, pale
//                        vegetation; ink only (printed on the card stock), clear of the copy zone.
//   navcard-ink.png      chapter 03 — the route map in the site's map symbology, clear of the copy zone.
//   navcompass-{dial,bezel}.png + navcompass.json
//                        chapter 03 — the print and card placement of the lesson-6 compass; the 3D
//                        instrument itself is rendered by render_home_nav_compass.py.
// The homepage sheet's print (sheet-ink-{a..d}.png) is drawn by home_map_table_sheet_ink.cjs.
// Cards are square and cover the whole card face (the packager clips them to the print area).
//   node scripts/blender/home_map_table_maps.cjs [contours] [navmap]
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'qa-output/home-map-table/maps');
fs.mkdirSync(out, { recursive: true });

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
    const l1 = dot(p[a] , x, y) + u * (dot(p[b], x - 1, y) - dot(p[a], x, y));
    const l2 = dot(p[a + 1], x, y - 1) + u * (dot(p[b + 1], x - 1, y - 1) - dot(p[a + 1], x, y - 1));
    return l1 + v * (l2 - l1);
  };
  return (x, y, oct = 4, gain = 0.5) => { let a = 1, f = 1, t = 0, n = 0; for (let o = 0; o < oct; o++) { t += a * n2(x * f + o * 17.3, y * f - o * 9.1); n += a; a *= gain; f *= 2; } return t / n; };
}

// ── geometry helpers ───────────────────────────────────────────────────────
function catmull(pts, step = 0.004) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function distToPolyline(x, y, line) {
  let best = 1e9, along = 0, acc = 0, bestAlong = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d < best) { best = d; bestAlong = acc + t * Math.sqrt(L2); }
    acc += Math.sqrt(L2);
  }
  along = bestAlong / acc;
  return [best, along];
}
const pathD = (pts, S, close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * S).toFixed(1)} ${(p[1] * S).toFixed(1)}`).join('') + (close ? 'Z' : '');

/** Marching squares -> joined polylines in grid units. */
function contours(field, n, level) {
  const segs = [];
  const at = (i, j) => field[j * n + i];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
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
        const next = (ends.get(key(tip)) || []).find((m) => !used[m]);
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
  const out = [line[0]];
  for (const p of line) { const l = out[out.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= minStep) out.push(p); }
  out.push(line[line.length - 1]);
  return out;
}

// ── the reserved copy zone on every card (home_map_table_card_zones.json) ──────────────
// keep(id, x, y) = 0 inside the zone around the live number + title (plus clearance), 1 beyond
// the fade band. The art is composed to stay out of it; keep() is the safety net.
const ZONES = JSON.parse(fs.readFileSync(path.join(__dirname, 'home_map_table_card_zones.json'), 'utf8'));
function zoneDist(id, x, y) {
  let d = 1e9;
  for (const [x0, y0, x1, y1] of ZONES.cards[id]) d = Math.min(d, Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) - ZONES.pad);
  return d;
}
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const keep = (id, x, y, fade = ZONES.fade) => smoothstep(0, fade, zoneDist(id, x, y));
/** Rasterise an SVG and fade its alpha out of the card's copy zone. */
async function zoned(svg, id, file) {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4 + 3; data[i] = Math.round(data[i] * keep(id, x / w, y / h)); }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(out, file));
}

// ── chapter 02: topographic sheet ──────────────────────────────────────────
// Printed straight onto the card stock (transparent ground). The high ground is on the left and
// along the bottom; the land falls to a flat valley floor in the upper right — no contour crosses
// a plain — which is where the chapter number and title are printed.
function buildContours() {
  const S = 1400; const N = 420; const ID = 'topic-02b';
  const noise = makeNoise(7);
  const wadi = catmull([[0.70, 1.02], [0.69, 0.92], [0.70, 0.82], [0.74, 0.73], [0.81, 0.67], [0.90, 0.64], [1.02, 0.63]]);
  const trib = catmull([[-0.02, 0.55], [0.06, 0.62], [0.115, 0.72], [0.15, 0.84], [0.17, 1.02]]);
  const trib2 = catmull([[0.55, 0.655], [0.62, 0.68], [0.68, 0.70], [0.735, 0.73]]);
  const hills = [
    { x: 0.165, y: 0.30, h: 118, rx: 0.13, ry: 0.15, p: 0.9 },   // 784
    { x: 0.47, y: 0.79, h: 54, rx: 0.16, ry: 0.11, p: 0.95 },   // 720
    { x: 0.87, y: 0.89, h: 60, rx: 0.13, ry: 0.10, p: 1.1 },
    { x: 0.07, y: 0.93, h: 40, rx: 0.12, ry: 0.10, p: 1.2 },
  ];
  const height = (x, y) => {
    // the ground falls gently toward the upper-right valley
    let h = 640 + 30 * Math.min(1, Math.hypot(1 - x, y) / 1.15);
    for (const k of hills) { const r = Math.hypot((x - k.x) / k.rx, (y - k.y) / k.ry); h += k.h * Math.exp(-(r ** (2 * k.p))); }
    const [dr] = distToPolyline(x, y, [[0.165, 0.30], [0.24, 0.55], [0.34, 0.70], [0.47, 0.79]]);
    h += 26 * Math.exp(-((dr / 0.075) ** 2));
    h += 17 * noise(x * 5, y * 5, 5) + 5 * noise(x * 16, y * 16, 3) + 1.6 * noise(x * 48, y * 48, 2);
    for (const [kx, ky, kh, kr] of [[0.30, 0.93, 20, 0.06], [0.06, 0.09, 24, 0.08], [0.95, 0.77, 16, 0.06], [0.60, 0.93, 18, 0.06]]) {
      h += kh * Math.exp(-((Math.hypot(x - kx, y - ky) / kr) ** 2));
    }
    for (const [line, depth, w] of [[wadi, 20, 0.05], [trib, 22, 0.045], [trib2, 14, 0.04]]) {
      const [d, along] = distToPolyline(x, y, line);
      h -= depth * Math.exp(-((d / w) ** 1.4)) * (0.6 + 0.4 * along);
    }
    // the valley floor: flat (below the lowest contour) under the copy, with an organic edge
    const t = smoothstep(0, 0.22, zoneDist(ID, x, y) + 0.1 * noise(x * 2.6 + 4, y * 2.6 - 2, 3));
    return 636 + 1.5 * noise(x * 9, y * 9, 2) + (h - 636) * t;
  };
  const field = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) field[j * N + i] = height(i / (N - 1), j / (N - 1));
  // pin the spot heights to the drawn summits
  const peak = (k) => { let best = -1e9, bx = 0, by = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / (N - 1), y = j / (N - 1); if (Math.hypot(x - k.x, y - k.y) < 0.08 && field[j * N + i] > best) { best = field[j * N + i]; bx = x; by = y; } } return [bx, by, best]; };
  const pA = peak(hills[0]), pB = peak(hills[1]);
  const offA = 784 - pA[2], offB = 720 - pB[2];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / (N - 1), y = j / (N - 1);
    const wA = Math.exp(-((Math.hypot(x - pA[0], y - pA[1]) / 0.16) ** 2)), wB = Math.exp(-((Math.hypot(x - pB[0], y - pB[1]) / 0.14) ** 2));
    field[j * N + i] += offA * wA + offB * wB;
  }
  const g = (pts) => pts.map(([x, y]) => [x / (N - 1), y / (N - 1)]);
  const parts = [];
  // hypsometric tint: very pale warm bands, darker toward the summits
  const tint = [];
  for (let lv = 680; lv <= 780; lv += 20) {
    for (const l of contours(field, N, lv)) if (l.length > 12) tint.push(`<path d="${pathD(g(smooth(decimate(l, 1.2))), S)}" fill="none" stroke="#d98c45" stroke-opacity="${(0.08 + (lv - 680) / 1100).toFixed(3)}" stroke-width="${(26 - (lv - 680) / 7).toFixed(1)}" stroke-linejoin="round"/>`);
  }
  parts.push(`<g>${tint.join('')}</g>`);
  // vegetation tint (none on the valley floor under the copy)
  const veg = makeNoise(31); const vegPaths = [];
  const vf = new Float64Array(140 * 140);
  for (let j = 0; j < 140; j++) for (let i = 0; i < 140; i++) vf[j * 140 + i] = veg(i / 139 * 3.2, j / 139 * 3.2, 4) - 0.6 * (1 - keep(ID, i / 139, j / 139, 0.2));
  for (const l of contours(vf, 140, 0.16)) if (l.length > 8) vegPaths.push(`<path d="${pathD(smooth(l.map(([x, y]) => [x / 139, y / 139]), 3), S, true)}" fill="#b9c27a" fill-opacity="0.18" stroke="#8fa05a" stroke-opacity="0.28" stroke-width="1.6" stroke-dasharray="2 5"/>`);
  parts.push(`<g>${vegPaths.join('')}</g>`);
  // contours: 4 m, index every 20 m
  const cl = [];
  for (let lv = 644; lv <= 784; lv += 4) {
    const index = lv % 20 === 0;
    for (const l of contours(field, N, lv)) {
      if (l.length < 6) continue;
      cl.push(`<path d="${pathD(g(smooth(decimate(l, 0.9))), S)}" fill="none" stroke="${index ? '#934a1c' : '#b9672c'}" stroke-opacity="${index ? 0.95 : 0.85}" stroke-width="${index ? 5.2 : 2.7}" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
  }
  // labels sit in a cartographic knock-out (the contours are masked under them, no halo)
  const labels = [
    { t: '784', x: pA[0] + 0.004, y: pA[1] - 0.026, at: pA },
    { t: '720', x: pB[0] + 0.004, y: pB[1] - 0.026, at: pB },
  ];
  const knock = labels.map((l) => `<rect x="${(l.x * S - 44).toFixed(1)}" y="${(l.y * S - 30).toFixed(1)}" width="88" height="46" rx="10" fill="black"/>` +
    `<circle cx="${(l.at[0] * S).toFixed(1)}" cy="${(l.at[1] * S).toFixed(1)}" r="12" fill="black"/>`).join('');
  parts.push(`<defs><mask id="knock"><rect width="${S}" height="${S}" fill="white"/>${knock}</mask></defs>`);
  parts.push(`<g mask="url(#knock)">${cl.join('')}</g>`);
  // 1 km grid — faint blue-grey (one easting, one northing, both clear of the copy)
  parts.push(`<g stroke="#4f6377" stroke-opacity="0.4" stroke-width="2.6"><path d="M${0.137 * S} 0V${S}M0 ${0.875 * S}H${S}"/></g>`);
  // tracks
  const track1 = catmull([[-0.02, 0.80], [0.08, 0.76], [0.18, 0.67], [0.24, 0.58], [0.275, 0.50]]);
  const track2 = catmull([[0.52, 1.02], [0.58, 0.91], [0.66, 0.865], [0.80, 0.81], [0.92, 0.775], [1.02, 0.755]]);
  parts.push(`<g fill="none" stroke="#3d3a35" stroke-opacity="0.8" stroke-linecap="round">` +
    `<path d="${pathD(track1, S)}" stroke-width="4.6" stroke-dasharray="14 9"/>` +
    `<path d="${pathD(track2, S)}" stroke-width="4.6" stroke-dasharray="14 9"/></g>`);
  // drainage: the wadi dashed (seasonal), tributaries solid thin blue
  parts.push(`<g fill="none" stroke="#3f86c4" stroke-linecap="round">` +
    `<path d="${pathD(wadi, S)}" stroke-width="6.4" stroke-dasharray="18 11"/>` +
    `<path d="${pathD(trib, S)}" stroke-width="3.6" stroke-opacity="0.85"/>` +
    `<path d="${pathD(trib2, S)}" stroke-width="3.6" stroke-opacity="0.85"/></g>`);
  // spot heights
  parts.push(labels.map((l, i) => `<circle cx="${((i ? pB : pA)[0] * S).toFixed(1)}" cy="${((i ? pB : pA)[1] * S).toFixed(1)}" r="4" fill="#2a2620"/>` +
    `<text x="${(l.x * S).toFixed(1)}" y="${(l.y * S + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="46" fill="#24211c" text-anchor="middle">${l.t}</text>`).join(''));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${parts.join('')}</svg>`;
  fs.writeFileSync(path.join(out, 'contours.svg'), svg);
  return zoned(svg, ID, 'contours.png');
}

// ── chapter 03: route map + the course's own compass ─────────────────────────────
// Same family as the lesson-6 instruments ("מצפן ומפה"): the map uses the site's map symbology
// (topographyTerrainStyle MAP: tan contours, sage woodland, sand roads, olive ink) and the compass is
// the lesson's rendered body (olive bezel, ivory face — build_compass_body.py) with its printed scale.
// Two layers: navcard-ink.png (printed on the card) and navcard-compass.png (the instrument on top).
const SITE = { contour: '#a8582a', vegFill: '#d5e0c4', vegInk: '#6e7a4e', roadCasing: '#8a6f4d', roadFill: '#e3c996', ink: '#38432e', water: '#3d6b8e', route: '#b9452f' };
const NAV_COMPASS = { cx: 0.335, cy: 0.64, r: 0.272 };   // card fractions (rim radius)
function buildNavMap() {
  const S = 1400; const N = 280; const ID = 'topic-06';
  const noise = makeNoise(19);
  const parts = [];
  // contours
  const hf = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / (N - 1), y = j / (N - 1); hf[j * N + i] = 40 * noise(x * 2.0 + 3, y * 2.0, 4) + 14 * x + 26 * Math.exp(-(((x - 0.2) / 0.16) ** 2 + ((y - 0.24) / 0.13) ** 2)); }
  const cl = [];
  for (let lv = -24, n = 0; lv <= 46; lv += 2.5, n++) for (const l of contours(hf, N, lv)) if (l.length > 10) cl.push(`<path d="${pathD(smooth(decimate(l, 1)).map(([x, y]) => [x / (N - 1), y / (N - 1)]), S)}" fill="none" stroke="${SITE.contour}" stroke-opacity="${n % 4 === 0 ? 0.7 : 0.5}" stroke-width="${n % 4 === 0 ? 3.4 : 2.0}"/>`);
  // woodland: sage patches with a dotted olive edge (MAP.vegFill / vegInk)
  const vf = new Float64Array(160 * 160);
  for (let j = 0; j < 160; j++) for (let i = 0; i < 160; i++) { const x = i / 159, y = j / 159; vf[j * 160 + i] = noise(x * 3.6 + 11, y * 3.6 + 5, 5) - 0.1; }
  const veg = [];
  for (const l of contours(vf, 160, 0.06)) if (l.length > 6) {
    const d = pathD(smooth(l.map(([x, y]) => [x / 159, y / 159]), 3), S, true);
    veg.push(`<path d="${d}" fill="none" stroke="${SITE.vegInk}" stroke-opacity="0.55" stroke-width="4.5" stroke-dasharray="1 10" stroke-linecap="round"/>`);
  }
  parts.push(`<g>${veg.join('')}</g>`, `<g>${cl.join('')}</g>`);
  // roads (sand fill, tan casing) and tracks (olive dashes)
  const roads = [
    catmull([[-0.02, 0.50], [0.12, 0.47], [0.26, 0.46], [0.40, 0.50], [0.52, 0.58], [0.66, 0.66], [0.82, 0.72], [1.02, 0.76]]),
    catmull([[0.18, 1.02], [0.21, 0.86], [0.27, 0.70], [0.31, 0.52], [0.30, 0.34], [0.26, 0.16], [0.25, -0.02]]),
  ];
  for (const r of roads) parts.push(`<path d="${pathD(r, S)}" fill="none" stroke="${SITE.roadCasing}" stroke-width="21" stroke-linecap="round" stroke-opacity="0.75"/><path d="${pathD(r, S)}" fill="none" stroke="${SITE.roadFill}" stroke-width="14" stroke-linecap="round"/>`);
  const tracks = [
    catmull([[0.46, 0.52], [0.50, 0.66], [0.56, 0.80], [0.60, 1.02]]),
    catmull([[0.70, 0.67], [0.80, 0.84], [0.86, 1.02]]),
    catmull([[-0.02, 0.22], [0.08, 0.20], [0.17, 0.15], [0.26, 0.10]]),
  ];
  for (const t of tracks) parts.push(`<path d="${pathD(t, S)}" fill="none" stroke="${SITE.ink}" stroke-opacity="0.7" stroke-width="5" stroke-dasharray="18 12" stroke-linecap="round"/>`);
  // stream
  parts.push(`<path d="${pathD(catmull([[0.40, -0.02], [0.43, 0.10], [0.44, 0.22], [0.47, 0.34], [0.55, 0.44], [0.66, 0.52], [0.80, 0.56], [1.02, 0.57]]), S)}" fill="none" stroke="${SITE.water}" stroke-width="5" stroke-opacity="0.55" stroke-linecap="round"/>`);
  // the route: red dashes between two checkpoints, round the copy and under the compass
  const start = [0.115, 0.135], end = [0.86, 0.66];
  const route = catmull([start, [0.20, 0.16], [0.30, 0.20], [0.40, 0.25], [0.47, 0.33], [0.52, 0.43], [0.60, 0.52], [0.70, 0.59], [0.79, 0.63], end]);
  parts.push(`<path d="${pathD(route.slice(5, -5), S)}" fill="none" stroke="${SITE.route}" stroke-width="12" stroke-dasharray="30 18" stroke-linecap="round"/>`);
  for (const [x, y] of [start, end]) parts.push(`<circle cx="${x * S}" cy="${y * S}" r="30" fill="#f6ead2" fill-opacity="0.7" stroke="${SITE.route}" stroke-width="11"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${parts.join('')}</svg>`;
  fs.writeFileSync(path.join(out, 'navcard-ink.svg'), svg);
  return zoned(svg, ID, 'navcard-ink.png');
}

/** The lesson-6 compass (CompassMapVisuals → CompassBase + BezelPrint) as a real 3D instrument on the card.
    This writes only its PRINT — the bezel scale and the dial graduations, flat and seen from straight above
    (north up, ±R.rim across the texture) — plus its placement on the card (navcompass.json). The body, needle,
    glass and contact shadow are modelled and rendered by render_home_nav_compass.py, which wraps these
    textures onto the bezel's dome and the recessed dial. Rings from compassMapGeometry COMPASS_RINGS. */
const NAV_COMPASS_POSE = { housing: -38, needle: -4 };   // bezel set to a bearing; needle on north, with a little life (SVG degrees, clockwise)
async function buildNavCompass() {
  const T = 2048;
  const R = { rim: 100, knurlIn: 94, bezelIn: 70.5, face: 67.2 };
  const bezelPrintR = (R.knurlIn + R.bezelIn) / 2;
  const { housing } = NAV_COMPASS_POSE;
  const polar = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 2) {
    const t = deg % 90 === 0 ? [9, 1, 0.95] : deg % 30 === 0 ? [7.2, 0.8, 0.92] : deg % 10 === 0 ? [5, 0.55, 0.82] : [3.2, 0.38, 0.66];
    const a = polar(R.face - 1.6, deg), b = polar(R.face - 1.6 - t[0], deg);
    ticks.push(`<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke-width="${t[1]}" stroke-opacity="${t[2]}"/>`);
  }
  const crossR = R.face - 12.1;
  const print = [];
  for (let i = 0; i < 12; i++) { const p = polar(bezelPrintR + 7.4, 15 + i * 30); print.push(`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="0.75" fill-opacity="0.7"/>`); }
  for (const deg of [30, 60, 120, 150, 210, 240, 300, 330]) {
    const flip = deg > 90 && deg < 270;
    print.push(`<text transform="rotate(${deg}) translate(0 ${-bezelPrintR})${flip ? ' rotate(180)' : ''}" text-anchor="middle" dominant-baseline="central" font-size="8.4" font-weight="600" fill-opacity="0.94">${deg}</text>`);
  }
  for (const [deg, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const p = polar(bezelPrintR, deg); print.push(`<text x="${p[0].toFixed(2)}" y="${p[1].toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700">${t}</text>`); }
  // print layers, ±R.rim across the square texture, housing already turned to its bearing
  const layer = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="${-R.rim} ${-R.rim} ${2 * R.rim} ${2 * R.rim}"><g transform="rotate(${housing})" font-family="Rubik, Arial, Helvetica, sans-serif">${body}</g></svg>`;
  const dial = layer(`<g stroke="#38432e" stroke-linecap="round">
      <line x1="0" y1="${-crossR}" x2="0" y2="${crossR}" stroke-opacity="0.4" stroke-width="0.45"/>
      <line x1="${-crossR}" y1="0" x2="${crossR}" y2="0" stroke-opacity="0.4" stroke-width="0.45"/>
      ${ticks.join('')}</g>`);
  const bezel = layer(`<g fill="#fff">${print.join('')}</g>`);
  fs.writeFileSync(path.join(out, 'navcompass.json'), JSON.stringify({ ...NAV_COMPASS, ...NAV_COMPASS_POSE, rings: R, card: 1400 }, null, 2));
  await sharp(Buffer.from(dial)).png().toFile(path.join(out, 'navcompass-dial.png'));
  return sharp(Buffer.from(bezel)).png().toFile(path.join(out, 'navcompass-bezel.png'));
}

(async () => {
  const only = process.argv.slice(2);
  const want = (k) => !only.length || only.includes(k);
  if (want('contours')) await buildContours();
  if (want('navmap')) { await buildNavMap(); await buildNavCompass(); }
  console.log('maps written to', path.relative(root, out));
})();
