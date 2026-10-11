// Builds the static terrain sheet of the lesson-6 "שלושה סוגי צפון" lab:
//   public/assets/lessons/topic06/north-lab/map-paper.svg
//
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/maps/build-north-lab-map.mjs
//
// Only paper, contours, vegetation, one minor road and five buildings — no grid,
// compass, arrows, letters, numbers or text (those stay live in NorthLabMap.tsx).
// Colours come from MAP (topographyTerrainStyle.ts) only; the sheet size and the
// readable zones around A, the arrow labels, AB and B from northLabGeometry.ts.
//
// Contours are the level sets of ONE continuous height field (marching squares
// with a consistent saddle rule), so two contours can never cross. Deterministic:
// the same seed always writes the same file.
import { writeFile, mkdir } from 'node:fs/promises';
import { MAP } from '../../src/components/lessons/topic-02/topographyTerrainStyle.ts';
import { ARROW_LEN, INSET, LAB_A, LAB_B, LAB_H, LAB_W, NOTE_POS, RING } from '../../src/components/lessons/topic-06/north-lab/northLabGeometry.ts';

const OUT = 'public/assets/lessons/topic06/north-lab/map-paper.svg';
const W = LAB_W;
const H = LAB_H;

// ─────────────────────────────────────────────────────────────────────────────
// Seeded noise
// ─────────────────────────────────────────────────────────────────────────────

function rng(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function perlin(seed) {
  const rand = rng(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const G = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)]);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (h, x, y) => G[h & 15][0] * x + G[h & 15][1] * y;
  return (x, y) => {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;
    const xi = X & 255;
    const yi = Y & 255;
    const aa = p[p[xi] + yi];
    const ab = p[p[xi] + yi + 1];
    const ba = p[p[xi + 1] + yi];
    const bb = p[p[xi + 1] + yi + 1];
    const u = fade(xf);
    const v = fade(yf);
    const x1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
    const x2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
    return x1 + v * (x2 - x1);
  };
}

const n1 = perlin(1301);
const n2 = perlin(7741);
const n3 = perlin(2207);
const n4 = perlin(9133);
const fbm = (n, x, y, oct = 4) => {
  let a = 1;
  let f = 1;
  let s = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / norm;
};

// ─────────────────────────────────────────────────────────────────────────────
// Terrain: a winding western ridge, a north-eastern hill, the saddle between
// them and a drainage valley running from the saddle to the south-east
// ─────────────────────────────────────────────────────────────────────────────

function catmull(pts, perSeg = 24) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Distance to a polyline, the arc-length parameter (0–1) of the nearest point and the side (+1 = right of travel). */
function polyInfo(line) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = cum[cum.length - 1];
  return (x, y) => {
    let best = Infinity;
    let bs = 0;
    let side = 1;
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = Math.hypot(x - px, y - py);
      if (d < best) {
        best = d;
        bs = (cum[i] + t * Math.sqrt(l2)) / total;
        side = dx * (y - ay) - dy * (x - ax) > 0 ? 1 : -1;
      }
    }
    return { d: best, s: bs, side };
  };
}

const smooth = (e0, e1, v) => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Each landform is a smooth analytic function (no distance-to-polyline creases):
// the ridge as a crest line x(y), the saddle as y(x), the valley as x(y).
const ridgeX = (y) => 92 + 24 * Math.sin(y / 96 + 0.5) + 13 * Math.sin(y / 43 + 1.9) + 5 * Math.sin(y / 19 + 0.3);
const valleyX = (y) => 322 + (y - 196) * 0.43 + 16 * Math.sin(y / 66 + 0.8) + 6 * Math.sin(y / 27);
const saddleY = (x) => 166 - 0.12 * (x - 130) + 13 * Math.sin(x / 58 + 0.4) + 5 * Math.sin(x / 23 + 2.2);
const slopeCos = (fn, t) => 1 / Math.hypot(1, (fn(t + 0.5) - fn(t - 0.5)));
const softAbs = (v, k) => Math.sqrt(v * v + k * k) - k;
/** Signed horizontal offset from the ridge crest, corrected for its slant (+ = east). */
const ridgeOff = (x, y) => (x - ridgeX(y)) * slopeCos(ridgeX, y);

const ROAD = catmull([[474, 660], [494, 612], [530, 578], [526, 540], [548, 506], [590, 492], [612, 462], [640, 446], [690, 434]], 30);
const roadAt = polyInfo(ROAD);
const bump = (s, c, w) => Math.exp(-(((s - c) / w) ** 2));
const hillR = (x, y) => {
  const c = Math.cos((-25 * Math.PI) / 180);
  const sn = Math.sin((-25 * Math.PI) / 180);
  return Math.hypot(((x - 556) * c - (y - 90) * sn) / 108, ((x - 556) * sn + (y - 90) * c) / 72);
};

function height(x, y) {
  // two-scale domain warp: long meanders + small natural wiggles
  const wx = x + 14 * fbm(n1, x / 180 + 3.1, y / 180 + 7.7, 3) + 3.2 * fbm(n3, x / 34 + 9.4, y / 34 - 2.6, 2);
  const wy = y + 14 * fbm(n2, x / 180 - 5.2, y / 180 + 1.3, 3) + 3.2 * fbm(n4, x / 34 - 7.1, y / 34 + 5.5, 2);
  // regional fall towards the south-east → long contours crossing the sheet
  let h = 0.085 * (W - wx) + 0.062 * (H - wy) + 7 * fbm(n2, wx / 150 + 20, wy / 150 - 3, 3);
  let flank = 0;
  {
    const off = ridgeOff(wx, wy);
    const crest = 62 + 24 * bump(wy, 330, 52) + 30 * bump(wy, 478, 46) + 12 * bump(wy, 112, 40);
    const w = 60 + 9 * Math.tanh(off / 22);
    const u = softAbs(off, 7) / w;
    h += crest * Math.exp(-(u ** 1.55));
    flank = Math.max(flank, Math.exp(-(((u - 0.95) / 0.55) ** 2)));
  }
  {
    const r = hillR(wx, wy);
    h += 92 * Math.exp(-(r ** 1.75));
    h += 16 * Math.exp(-((Math.hypot((wx - 462) / 34, (wy - 52) / 26)) ** 2));
    flank = Math.max(flank, Math.exp(-(((r - 0.95) / 0.45) ** 2)));
  }
  {
    const fade = smooth(70, 140, wx) * (1 - smooth(470, 540, wx));
    const crest = 34 - 12 * bump(wx, 318, 90);
    h += fade * crest * Math.exp(-((softAbs(wy - saddleY(wx), 6) / 54) ** 1.7));
  }
  {
    const fade = smooth(150, 236, wy);
    h -= fade * 13 * Math.exp(-(((wx - valleyX(wy)) / 46) ** 2));
  }
  // spurs and gullies on the steep flanks only — gentle ground stays calm
  h += 6.5 * flank * fbm(n3, x / 30 + 1.7, y / 30 - 8.2, 3);
  return h + 0.6 * fbm(n4, x / 90, y / 90, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Marching squares (consistent saddle rule) → chained, simplified polylines
// ─────────────────────────────────────────────────────────────────────────────

const STEP = 2;
const M = 6; // sample beyond the sheet so long contours run off its edges
const NX = Math.ceil((W + 2 * M) / STEP);
const NY = Math.ceil((H + 2 * M) / STEP);
const gx = (i) => -M + i * STEP;
const gy = (j) => -M + j * STEP;

function sampleField(fn, pad = null) {
  const f = new Float64Array((NX + 1) * (NY + 1));
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const border = i === 0 || j === 0 || i === NX || j === NY;
      f[j * (NX + 1) + i] = pad !== null && border ? pad : fn(gx(i), gy(j));
    }
  }
  return f;
}

function isolines(f, level) {
  const L = level + 1e-7;
  const at = (i, j) => f[j * (NX + 1) + i];
  const segs = [];
  const pt = (key, a, b, ax, ay, bx, by) => {
    const t = (L - a) / (b - a);
    return { key, x: ax + t * (bx - ax), y: ay + t * (by - ay) };
  };
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const tl = at(i, j);
      const tr = at(i + 1, j);
      const br = at(i + 1, j + 1);
      const bl = at(i, j + 1);
      const c = (tl > L ? 8 : 0) | (tr > L ? 4 : 0) | (br > L ? 2 : 0) | (bl > L ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const x0 = gx(i);
      const y0 = gy(j);
      const x1 = x0 + STEP;
      const y1 = y0 + STEP;
      const T = () => pt(`h${i},${j}`, tl, tr, x0, y0, x1, y0);
      const R = () => pt(`v${i + 1},${j}`, tr, br, x1, y0, x1, y1);
      const B = () => pt(`h${i},${j + 1}`, bl, br, x0, y1, x1, y1);
      const Lf = () => pt(`v${i},${j}`, tl, bl, x0, y0, x0, y1);
      const centre = (tl + tr + br + bl) / 4 > L;
      switch (c) {
        case 1: case 14: segs.push([Lf(), B()]); break;
        case 2: case 13: segs.push([B(), R()]); break;
        case 3: case 12: segs.push([Lf(), R()]); break;
        case 4: case 11: segs.push([T(), R()]); break;
        case 6: case 9: segs.push([T(), B()]); break;
        case 7: case 8: segs.push([Lf(), T()]); break;
        case 5:
          if (centre) segs.push([Lf(), T()], [B(), R()]);
          else segs.push([T(), R()], [Lf(), B()]);
          break;
        case 10:
          if (centre) segs.push([T(), R()], [Lf(), B()]);
          else segs.push([Lf(), T()], [B(), R()]);
          break;
      }
    }
  }
  // chain segments that share a grid-edge crossing
  const byKey = new Map();
  segs.forEach((s, idx) => {
    for (const p of s) {
      const list = byKey.get(p.key) ?? [];
      list.push(idx);
      byKey.set(p.key, list);
    }
  });
  const used = new Uint8Array(segs.length);
  const lines = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const line = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const end = dir ? line[line.length - 1] : line[0];
        const next = (byKey.get(end.key) ?? []).find((s) => !used[s]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next];
        const other = s[0].key === end.key ? s[1] : s[0];
        if (dir) line.push(other);
        else line.unshift(other);
      }
    }
    const closed = line.length > 2 && line[0].key === line[line.length - 1].key;
    lines.push({ pts: line.map((p) => [p.x, p.y]), closed });
  }
  return lines;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0;
  let max = 0;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

/** RDP that keeps closed rings: split at the point farthest from the start. */
function simplify(pts, eps, closed) {
  if (!closed || pts.length < 4) return rdp(pts, eps);
  let k = 1;
  let far = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > far) {
      far = d;
      k = i;
    }
  }
  return [...rdp(pts.slice(0, k + 1), eps), ...rdp(pts.slice(k), eps).slice(1)];
}

const perimeter = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** Compact path data: absolute start, relative steps, rounded to 0.1 without drift. */
function pathData(lines) {
  let d = '';
  const fmt = (v) => {
    const s = (v / 10).toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };
  for (const { pts, closed } of lines) {
    const r = pts.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
    d += `M${fmt(r[0][0])} ${fmt(r[0][1])}l`;
    const steps = [];
    for (let i = 1; i < r.length; i++) steps.push(`${fmt(r[i][0] - r[i - 1][0])} ${fmt(r[i][1] - r[i - 1][1])}`);
    d += steps.join(' ').replace(/ -/g, '-');
    if (closed) d += 'z';
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Readable zones: moderate detail (never an erased hole) where the live marks sit
// ─────────────────────────────────────────────────────────────────────────────

const segDist = (x, y, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
};
const boxDist = (x, y, b) => Math.hypot(Math.max(b.x - x, 0, x - (b.x + b.w)), Math.max(b.y - y, 0, y - (b.y + b.h)));
const LABEL_ROW = { x: INSET.x + INSET.w + 4, y: LAB_A.y - ARROW_LEN - 64, w: 240, h: 64 };
const NOTE_BOX = { x: NOTE_POS.x - 4, y: NOTE_POS.y - 12, w: 150, h: 24 };
const TIP_ZONE = { x: LAB_A.x - 60, y: LAB_A.y - ARROW_LEN - 6, w: 110, h: 40 };

/** 0 = full detail, 1 = quietest. */
function quiet(x, y) {
  return Math.max(
    1 - smooth(RING.cut - 14, RING.rim + 6, Math.hypot(x - LAB_A.x, y - LAB_A.y)),
    1 - smooth(10, 26, segDist(x, y, LAB_A, LAB_B)),
    1 - smooth(14, 34, Math.hypot(x - LAB_B.x, y - LAB_B.y)),
    1 - smooth(4, 20, boxDist(x, y, LABEL_ROW)),
    1 - smooth(4, 18, boxDist(x, y, TIP_ZONE)),
    1 - smooth(2, 14, boxDist(x, y, NOTE_BOX)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vegetation: irregular patches that follow the terrain, symbol clusters inside
// ─────────────────────────────────────────────────────────────────────────────

function vegZone(x, y) {
  const off = ridgeOff(x, y);
  const r = hillR(x, y);
  const dv = Math.abs(x - valleyX(y));
  return Math.max(
    // the ridge: its lower eastern flank, and a thinner band on the western slope
    off > 0 ? smooth(18, 42, off) * (1 - smooth(92, 132, off)) : 0.6 * smooth(-96, -46, off) * (1 - smooth(-26, -8, off)),
    // around the north-eastern hill, below its top
    smooth(0.55, 0.85, r) * (1 - smooth(1.5, 2.0, r)),
    // scrub along the lower valley
    (1 - smooth(26, 74, dv)) * smooth(380, 470, y),
    // a scatter on the north-central slope
    0.9 * (1 - smooth(40, 90, Math.hypot(x - 300, y - 40))),
    // the southern foot of the ridge and the eastern edge below B
    0.7 * smooth(500, 570, y) * (1 - smooth(380, 450, x)),
    0.75 * smooth(560, 625, x) * smooth(270, 320, y) * (1 - smooth(420, 470, y)),
  );
}

function vegetation(x, y) {
  const breakup = fbm(n4, x / 70 + 11.3, y / 70 - 4.1, 4);
  return 0.75 * vegZone(x, y) + 1.05 * breakup - 0.3 - 0.95 * quiet(x, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

const t0 = Date.now();
const hf = sampleField(height);
let hmin = Infinity;
let hmax = -Infinity;
for (const v of hf) {
  hmin = Math.min(hmin, v);
  hmax = Math.max(hmax, v);
}
const INTERVAL = 5;
const contours = { regular: [], index: [] };
let levels = 0;
for (let L = Math.ceil(hmin / INTERVAL) * INTERVAL; L <= hmax; L += INTERVAL) {
  levels++;
  for (const line of isolines(hf, L)) {
    if (line.closed && perimeter(line.pts) < 28) continue; // no tiny specks
    const pts = simplify(line.pts, 0.22, line.closed);
    (L % 25 === 0 ? contours.index : contours.regular).push({ pts, closed: line.closed });
  }
}

// vegetation tint: three soft steps of the same field (closed rings, even-odd for holes)
const vf = sampleField(vegetation, -10);
const tint = [0.05, 0.16, 0.3].map((lv) => isolines(vf, lv).filter((l) => perimeter(l.pts) > 18).map((l) => ({ pts: simplify(l.pts, 0.35, true), closed: true })));

// vegetation symbols: small clusters of fine dots (scrub stipple), a few small
// tree marks and crowns; cluster density, size and spread vary with the field
const rand = rng(424242);
const dots = [[], [], []];
const trees = [];
const crowns = [];
const CL = 7.5;
for (let y = -CL; y < H + CL; y += CL) {
  for (let x = -CL; x < W + CL; x += CL) {
    const cx = x + rand() * CL;
    const cy = y + rand() * CL;
    const v = vegetation(cx, cy);
    const p = v >= 0 ? Math.min(1, 0.32 + v * 1.8) : Math.max(0, 0.09 + v * 0.3) * (1 - quiet(cx, cy));
    if (rand() > p) continue;
    const n = 3 + Math.floor(rand() * (v > 0.2 ? 6 : 3));
    const spread = 1.6 + rand() * 3.2;
    for (let k = 0; k < n; k++) {
      const a = rand() * 2 * Math.PI;
      const rr = spread * Math.sqrt(-2 * Math.log(rand() + 1e-9)) * 0.5;
      dots[Math.floor(rand() * 3)].push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.34 + rand() ** 2 * 0.62]);
    }
    if (v > 0.1 && rand() < 0.2) trees.push([cx + (rand() - 0.5) * 5, cy + (rand() - 0.5) * 5, 0.95 + rand() * 0.75]);
    if (v > 0.3 && rand() < 0.07) crowns.push([cx, cy, 1.4 + rand() * 0.8]);
  }
}
/** Dots as zero-length round-capped subpaths, one path per radius bucket. */
function dotPaths(list, opacity, step = 0.15) {
  const buckets = new Map();
  for (const [x, y, r] of list) {
    const k = Math.max(step, Math.round(r / step) * step);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push([Math.round(x * 10), Math.round(y * 10)]);
  }
  const fmt = (v) => {
    const t = (v / 10).toFixed(1);
    return t.endsWith('.0') ? t.slice(0, -2) : t;
  };
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([r, pts]) => {
      let d = '';
      let px = 0;
      let py = 0;
      pts.sort((a, b) => a[1] - b[1] || a[0] - b[0]).forEach(([x, y], i) => {
        d += i ? `m${fmt(x - px)} ${fmt(y - py)}h0` : `M${fmt(x)} ${fmt(y)}h0`;
        px = x;
        py = y;
      });
      return `<path stroke-opacity="${opacity}" stroke-width="${(2 * r).toFixed(2)}" d="${d.replace(/ -/g, '-')}"/>`;
    })
    .join('\n');
}

const circlePath = (list) =>
  list
    .map(([x, y, r]) => {
      const f = (v) => +v.toFixed(1);
      return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
    })
    .join('');

// buildings: five varied footprints beside the road, set back on both sides
const roadPts = ROAD;
const roadCum = [0];
for (let i = 1; i < roadPts.length; i++) roadCum.push(roadCum[i - 1] + Math.hypot(roadPts[i][0] - roadPts[i - 1][0], roadPts[i][1] - roadPts[i - 1][1]));
function roadFrame(s) {
  const target = s * roadCum[roadCum.length - 1];
  let i = roadCum.findIndex((c) => c >= target);
  i = Math.max(1, i);
  const [ax, ay] = roadPts[i - 1];
  const [bx, by] = roadPts[i];
  const t = (target - roadCum[i - 1]) / (roadCum[i] - roadCum[i - 1] || 1);
  const ang = Math.atan2(by - ay, bx - ax);
  return { x: ax + t * (bx - ax), y: ay + t * (by - ay), ang, nx: -Math.sin(ang), ny: Math.cos(ang) };
}
const BUILDINGS = [
  { s: 0.4, side: 1, off: 13, w: 10, h: 6.5, rot: 4 },
  { s: 0.46, side: -1, off: 11, w: 7, h: 5.5, rot: -6 },
  { s: 0.505, side: 1, off: 17, w: 12, h: 7, rot: 9 },
  { s: 0.565, side: 1, off: 12, w: 6.5, h: 6.5, rot: 2 },
  { s: 0.62, side: -1, off: 12.5, w: 9, h: 5, rot: -4 },
].map((b) => {
  const f = roadFrame(b.s);
  const cx = f.x + f.nx * b.off * b.side;
  const cy = f.y + f.ny * b.off * b.side;
  return { cx, cy, w: b.w, h: b.h, deg: (f.ang * 180) / Math.PI + b.rot };
});

const roadD = pathData([{ pts: rdp(ROAD, 0.15), closed: false }]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<!-- Generated by scripts/maps/build-north-lab-map.mjs — terrain only (no grid, compass, marks or text). Colours: MAP (topographyTerrainStyle.ts). -->
<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.541 0 0 0 0 0.435 0 0 0 0 0.302 0 0 0 0.07 0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="${MAP.paper}"/>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
<g fill="${MAP.vegFill}" fill-rule="evenodd">
<path fill-opacity="0.38" d="${pathData(tint[0])}"/>
<path fill-opacity="0.3" d="${pathData(tint[1])}"/>
<path fill-opacity="0.24" d="${pathData(tint[2])}"/>
</g>
<g fill="none" stroke="${MAP.contour}" stroke-linecap="round" stroke-linejoin="round">
<path stroke-opacity="0.5" stroke-width="0.7" d="${pathData(contours.regular)}"/>
<path stroke-opacity="0.64" stroke-width="1.1" d="${pathData(contours.index)}"/>
</g>
<g fill="none" stroke="${MAP.vegInk}" stroke-linecap="round">
${dotPaths(dots[0], 0.38)}
${dotPaths(dots[1], 0.52)}
${dotPaths(dots[2], 0.66)}
${dotPaths(trees, 0.5, 0.2)}
</g>
<path fill="${MAP.vegFill}" stroke="${MAP.vegInk}" stroke-opacity="0.55" stroke-width="0.45" d="${circlePath(crowns)}"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path stroke="${MAP.roadCasing}" stroke-opacity="0.62" stroke-width="3.6" d="${roadD}"/>
<path stroke="${MAP.roadFill}" stroke-width="2.1" d="${roadD}"/>
</g>
<g fill="${MAP.building}" fill-opacity="0.68">
${BUILDINGS.map((b) => `<rect x="${(b.cx - b.w / 2).toFixed(1)}" y="${(b.cy - b.h / 2).toFixed(1)}" width="${b.w}" height="${b.h}" transform="rotate(${b.deg.toFixed(1)} ${b.cx.toFixed(1)} ${b.cy.toFixed(1)})"/>`).join('\n')}
</g>
</svg>
`;

await mkdir('public/assets/lessons/topic06/north-lab', { recursive: true });
await writeFile(OUT, svg);
console.log(
  `${OUT}: ${(svg.length / 1024).toFixed(0)} KB · heights ${hmin.toFixed(0)}–${hmax.toFixed(0)} m · ${levels} levels @ ${INTERVAL} m · ` +
    `contours ${contours.regular.length}+${contours.index.length} index · tint rings ${tint.map((t) => t.length).join('/')} · ` +
    `dots ${dots.flat().length} · trees ${trees.length} · crowns ${crowns.length} · ${Date.now() - t0} ms`,
);
