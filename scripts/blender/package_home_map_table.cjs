// Web delivery for the homepage map-table renders (render_home_map_table.py + home_map_table_maps.cjs).
//   felt.webp                 full-bleed desk plate (CSS: object-fit cover) — soft light falloff baked in
//   sheet-{a,b,c,d}.webp      the folded map sheet + contact shadow, RGBA, one per window-shape frame
//                             (home_map_table_sheets.json); each is shown 1:1 on its frame, never stretched
//   chapter-terrain.webp      ┐ square card faces: cream card stock with the art printed on it; the
//   chapter-cartography.webp  │ number + title zone (home_map_table_card_zones.json) stays blank stock.
//   chapter-navigation.webp   ┘ No text, numbers or UI are baked into any of them.
//   node scripts/blender/package_home_map_table.cjs [felt] [paper | sheet-a…d] [terrain] [cartography] [navigation]
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const work = path.join(root, 'qa-output/home-map-table');
const R = (f) => path.join(work, 'render', f);
const out = path.join(root, 'public/assets/home/map-table');
fs.mkdirSync(out, { recursive: true });

const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const enc = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);

// Tones from design/mockups/home-background-options-2026-11-11/10-muted-warm-cream-cards.png (2026-11-11 brief).
// SHEET_PAPER is the map's blank paper; CARD_STOCK the card board's base and CARD_LIT its lit grain, as seen on screen.
const SHEET_PAPER = '#FDF2EB';
const CARD_STOCK = '#E5D3BD';
const CARD_LIT = '#E8D7C2';
// The page draws every card face through `filter: brightness(1.08) saturate(.94)` (MapTableHome.module.css .artwork),
// applied to sRGB values. The stock is written as that filter's inverse, so it lands on CARD_STOCK / CARD_LIT on screen
// while the art keeps the filter it was tuned with.
const ART_FILTER = { brightness: 1.08, saturate: 0.94 };
function unfilter(hex) {
  const s = ART_FILTER.saturate;
  const m = [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ];
  // solve m · v = target (3×3, Cramer), then undo the brightness
  const t = hexRgb(hex);
  const det = (a) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  return [0, 1, 2].map((c) => det(m.map((row, r) => row.map((v, k) => (k === c ? t[r] : v)))) / d / ART_FILTER.brightness);
}

async function rgba(file, size) {
  let img = sharp(file).ensureAlpha();
  if (size) img = img.resize(size, size, { fit: 'fill', kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const f = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) f[i] = data[i] / 255;
  return { f, w: info.width, h: info.height };
}
function toBuf(f) { const b = Buffer.alloc(f.length); for (let i = 0; i < f.length; i++) b[i] = Math.max(0, Math.min(255, Math.round(f[i] * 255))); return b; }
async function write(f, w, h, name, opts, resize) {
  let img = sharp(toBuf(f), { raw: { width: w, height: h, channels: 4 } });
  if (resize) img = img.resize(resize[0], resize[1], { kernel: 'lanczos3' });
  const info = await img.webp(opts).toFile(path.join(out, name));
  console.log(name, info.width + 'x' + info.height, (info.size / 1024).toFixed(0) + ' KiB');
}
function blur(src, w, h, r) {           // 3x box blur ~ gaussian, single channel
  let a = Float32Array.from(src), b = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { b[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = s / (2 * r + 1); s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
  }
  return a;
}

// ── desk + sheet ───────────────────────────────────────────────────────────
async function felt() {
  const { f, w, h } = await rgba(R('felt.png'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x / w - 0.5) / 0.62, dy = (y / h - 0.42) / 0.62;
    const k = 1 - 0.30 * smooth(0.35, 1.25, Math.hypot(dx, dy));     // soft table-lamp falloff
    const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) f[i + c] = enc(lin(f[i + c]) * k);
  }
  await write(f, w, h, 'felt.webp', { quality: 82, effort: 6 }, [2880, 1800]);
}

async function paper(key) {
  // key: one of the sheet frames in home_map_table_sheets.json (sheet-a … sheet-d)
  const { f, w, h } = await rgba(R(`sheet-${key}.png`));
  const mf = fs.readdirSync(path.join(work, 'tex')).find((n) => n.startsWith(`sheet-mask-${key}-`));
  const [mw, mh] = mf.match(/(\d+)x(\d+)/).slice(1).map(Number);
  const mask = new Float32Array(fs.readFileSync(path.join(work, 'tex', mf)).buffer.slice(0));
  if (mw !== w || mh !== h) throw new Error('mask size mismatch');
  // Retone the sheet: its blank paper (per-channel median) is scaled in linear light onto SHEET_PAPER, so the
  // print keeps its contrast and the paper keeps its fibre; the cut face below is derived from the retoned paper.
  {
    const ch = [[], [], []];
    for (let p = 0; p < w * h; p += 13) if (mask[p] > 0.999) for (let c = 0; c < 3; c++) ch[c].push(lin(f[p * 4 + c]));
    const ratio = ch.map((v, c) => { v.sort((a, b) => a - b); return lin(hexRgb(SHEET_PAPER)[c]) / v[v.length >> 1]; });
    for (let p = 0; p < w * h; p++) {
      const m = mask[p]; if (m <= 0) continue;
      for (let c = 0; c < 3; c++) f[p * 4 + c] = enc(Math.min(1, lin(f[p * 4 + c]) * (1 + (ratio[c] - 1) * m)));
    }
  }
  // One light for everything: render_home_map_table.py lights() puts the sun high beyond the far edge,
  // a little to the right, so every shadow falls toward the viewer and a little to the left.
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'home_map_table_sheets.json'), 'utf8'));
  const pu = w / spec.variants[key].w;   // render px per u
  const shifted = (dx, dy) => {
    const o = new Float32Array(w * h); dx = Math.round(dx); dy = Math.round(dy);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const yy = y - dy, xx = x - dx; o[y * w + x] = yy >= 0 && xx >= 0 && yy < h && xx < w ? mask[yy * w + xx] : 0; }
    return o;
  };
  // the cut face: the sheet's thickness shows as a hair of shaded edge on its near/left side
  const face = shifted(-0.5 * pu, 1.1 * pu);
  let paperMean = [0, 0, 0], np = 0;
  for (let p = 0; p < w * h; p += 7) if (mask[p] > 0.999) { for (let c = 0; c < 3; c++) paperMean[c] += lin(f[p * 4 + c]); np++; }
  const faceCol = paperMean.map((v) => enc((v / np) * 0.6));
  // contact shadow: the sheet's own silhouette, nudged away from the light and softened
  const off = shifted(-0.0012 * w, 0.0028 * w);
  const soft = blur(off, w, h, Math.round(w / 330)); const tight = blur(shifted(-0.4 * pu, 0.9 * pu), w, h, Math.round(w / 1500) || 1);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4, m = mask[p];
    const x = (p % w) / w, y = Math.floor(p / w) / h;
    if (m < 0.999) {
      // outside the sheet: keep only darkening (shadow catcher light is dropped) + synthetic contact shadow
      const lum = 0.2126 * lin(f[i]) + 0.7152 * lin(f[i + 1]) + 0.0722 * lin(f[i + 2]);
      const rendered = f[i + 3] * Math.max(0, 1 - lum * 6);
      const shadowA = Math.max(rendered * 0.9, 0.5 * soft[p] + 0.45 * tight[p]) * (1 - m);
      const faceA = Math.max(0, face[p] - m);
      // composite: paper (mask) over its cut face over the shadow (black)
      const under = faceA + shadowA * (1 - faceA);
      const a = m + under * (1 - m);
      const col = (c) => (a > 0 ? (f[i + c] * m + faceCol[c] * faceA * (1 - m)) / a : 0);
      f[i] = col(0); f[i + 1] = col(1); f[i + 2] = col(2); f[i + 3] = a;
    }
    // gentle light falloff across the sheet: brightest toward the light (upper right), dimmer at the near-left
    const k = 1 - 0.06 * smooth(0.25, 1.0, Math.hypot((x - 0.6) / 0.75, (y - 0.25) / 0.75));
    for (let c = 0; c < 3; c++) f[i + c] = enc(lin(f[i + c]) * k);
  }
  await write(f, w, h, `sheet-${key}.webp`, { quality: 86, alphaQuality: 90, effort: 6 });
}

// ── card faces ─────────────────────────────────────────────────────────────
// Each face: the cream card stock, the art printed on it (ink takes the board's grain), and for 03 the
// compass lying on top. The number + title zone (home_map_table_card_zones.json) stays blank card stock:
// the art is composed around it and fades out naturally into the same paper at its edge.
const C = 1400;           // working size; shipped at 1200
const M = 40, RAD = 40;   // print-area inset and corner radius (working px)
const ZONES = JSON.parse(fs.readFileSync(path.join(__dirname, 'home_map_table_card_zones.json'), 'utf8'));
function keep(id, x, y, fade = ZONES.fade) {
  let d = 1e9;
  for (const [x0, y0, x1, y1] of ZONES.cards[id]) d = Math.min(d, Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) - ZONES.pad);
  return smooth(0, fade, d);
}
function inPrint(x, y) {   // signed coverage of the rounded print rectangle (1 inside, 0 outside, aa edge)
  const lo = M, hi = C - M; const cx = Math.min(Math.max(x, lo + RAD), hi - RAD), cy = Math.min(Math.max(y, lo + RAD), hi - RAD);
  const d = Math.hypot(x - cx, y - cy) - RAD; const inside = x > lo && x < hi && y > lo && y < hi;
  return inside ? Math.max(0, Math.min(1, 0.5 - d)) : 0;
}
async function cardFace(name, id, art, opts = {}) {
  const stock = await rgba(R('cardstock.png'), C);
  const s = stock.f;
  // muted deep-cream board, clearly darker than the sheet: the render's fibre/light variation (grain, around its
  // median) is kept and laid on CARD_STOCK; the lit grain rises toward CARD_LIT (p90 of the board's grain lands on it)
  const lums = new Float32Array(C * C);
  for (let p = 0; p < C * C; p++) lums[p] = 0.2126 * lin(s[p * 4]) + 0.7152 * lin(s[p * 4 + 1]) + 0.0722 * lin(s[p * 4 + 2]);
  const sorted = Float32Array.from(lums).sort();
  const mean = sorted[sorted.length >> 1], litGrain = sorted[Math.floor(sorted.length * 0.9)] / mean;
  const base = unfilter(CARD_STOCK).map(lin), lit = unfilter(CARD_LIT).map(lin);
  const board = (grain) => (grain <= 1 ? base.map((v) => v * grain) : base.map((v, c) => v + (lit[c] - v) * ((grain - 1) / (litGrain - 1))));
  const a = await art();                       // { f } in C x C, straight alpha
  const top = opts.object ? await opts.object() : null;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = (y * C + x) * 4;
    const grain = lums[y * C + x] / mean;           // the board's fibre/light variation
    let col = board(grain);
    const cov = inPrint(x, y) * keep(id, x / C, y / C);
    if (cov > 0) {
      const ai = a.f[i + 3] * cov;
      // the print takes the board's grain (ink on paper), with a slightly softened black point
      const ink = [0, 1, 2].map((c) => lin(a.f[i + c]) * (0.72 + 0.28 * grain));
      col = col.map((v, c) => v * (1 - ai) + ink[c] * ai);
    }
    if (opts.inset) {
      // a photographic print sits a hair below the board: faint shade along its top/left edge
      const dTop = y - M, dLeft = x - M, dBot = C - M - y;
      if (cov > 0 && a.f[i + 3] > 0.5) {
        const sh = 0.10 * Math.exp(-Math.max(0, dTop) / 5) + 0.05 * Math.exp(-Math.max(0, dLeft) / 5);
        col = col.map((cv) => cv * (1 - sh));
      } else if (dBot < 0 && dBot > -6 && x > M && x < C - M) {
        col = col.map((cv) => cv * 1.04);
      }
    }
    if (top) {   // an object lying on the card (its own contact shadow included), over the print
      const ao = top.f[i + 3] * inPrint(x, y);
      col = col.map((v, c) => v * (1 - ao) + lin(top.f[i + c]) * ao);
    }
    for (let c = 0; c < 3; c++) s[i + c] = enc(Math.min(1, col[c]));
    s[i + 3] = 1;
  }
  await write(s, C, C, name, { quality: 84, effort: 6 }, [1200, 1200]);
}

/** Resample an RGBA float image (premultiplied bilinear): dst = to + scale * Rot(deg) * (src - from), in fractions. */
function warp(img, { from, to, deg, scale }) {
  const { f, w, h } = img; const o = new Float32Array(f.length);
  const c = Math.cos(deg * Math.PI / 180), sn = Math.sin(deg * Math.PI / 180);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const rx = (x / w - to[0]) / scale, ry = (y / h - to[1]) / scale;
    const sx = (from[0] + rx * c + ry * sn) * w, sy = (from[1] - rx * sn + ry * c) * h;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const acc = [0, 0, 0, 0];
    for (const [dx, dy, wt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const xx = x0 + dx, yy = y0 + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = (yy * w + xx) * 4, al = f[j + 3] * wt;
      acc[0] += f[j] * al; acc[1] += f[j + 1] * al; acc[2] += f[j + 2] * al; acc[3] += al;
    }
    const i = (y * w + x) * 4;
    if (acc[3] > 1e-6) { o[i] = acc[0] / acc[3]; o[i + 1] = acc[1] / acc[3]; o[i + 2] = acc[2] / acc[3]; }
    o[i + 3] = acc[3];
  }
  return { f: o, w, h };
}
// Chapter 01: the aerial view rolled 8° about the summit (exactly what a camera roll does) and the
// summit set into the upper-left, so the ridge runs down under the title instead of through it.
const TERRAIN_WARP = process.env.HMT_WARP ? JSON.parse(process.env.HMT_WARP) : { from: [0.25, 0.16], to: [0.2, 0.24], deg: 8, scale: 1.15 };
async function terrainArt() {
  const t = warp(await rgba(R('terrain.png'), C), TERRAIN_WARP);
  const d = warp(await rgba(R('terrain-dist.png'), C), TERRAIN_WARP);
  const haze = unfilter(CARD_STOCK).map(lin);   // the far ridges dissolve into the card stock itself
  for (let p = 0; p < C * C; p++) {
    const i = p * 4; const k = Math.min(1, Math.max(0, d.f[i] * 0.75)) ** 1.3;
    for (let c = 0; c < 3; c++) t.f[i + c] = enc(lin(t.f[i + c]) * (1 - k) + haze[c] * k);
  }
  return t;
}
const plainArt = (file) => () => rgba(file, C);

(async () => {
  const only = process.argv.slice(2);
  const want = (k) => !only.length || only.includes(k);
  if (want('felt')) await felt();
  for (const key of ['a', 'b', 'c', 'd']) if (want('paper') || want(`sheet-${key}`)) await paper(key);
  if (want('terrain')) await cardFace('chapter-terrain.webp', 'topic-02', terrainArt, { inset: true });
  if (want('cartography')) await cardFace('chapter-cartography.webp', 'topic-02b', plainArt(path.join(work, 'maps/contours.png')));
  if (want('navigation')) await cardFace('chapter-navigation.webp', 'topic-06', plainArt(path.join(work, 'maps/navcard-ink.png')), { object: plainArt(R('nav-compass.png')) });
})();
