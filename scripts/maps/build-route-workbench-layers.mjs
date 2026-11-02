/** The route workbench's two map views, drawn in the one north-up frame
 * (x = −16…116 east, y = 0…92 south; routeStoryModel's viewBox):
 *
 * - workbench-ortho.webp — the approved photo (workbench-terrain-realistic.webp,
 *   unchanged on disk) with its faint baked 10-unit (235 m) grid painted out, so
 *   the only grid on screen is the live 100 m grid of WorkbenchMap.
 * - workbench-topo.webp — the topographic map of the same ground: 10 m contours of
 *   the surface the photo was generated from (route-workbench-relief.mjs), the
 *   stream and the dirt road from the lesson geometry, and woodland, rocky ground
 *   and trees mapped from the photo itself (canopy / limestone density), so every
 *   symbol stands where the photo shows the feature.
 *
 * Markers, the route, the grid, the scale bar and the tools are live SVG on top.
 * Run: node --experimental-strip-types scripts/maps/build-route-workbench-layers.mjs
 */
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { POINT_XY, ROAD, STREAM, pathD, samplePath, distToLine } from '../../src/components/lessons/topic-06/route-story/routeStoryModel.ts';
import { clamp, hash, peaks, height, carved } from './route-workbench-relief.mjs';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const DIR = 'public/assets/lessons/topic06/route-story';
const X0 = -16, VW = 132, VH = 92;

// ---------------------------------------------------------------- the photo, without its baked grid

const photo = await sharp(`${DIR}/workbench-terrain-realistic.webp`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const PW = photo.info.width, PH = photo.info.height, img = Buffer.from(photo.data);
const lum = (x, y) => { const k = (y * PW + x) * 3; return img[k] * .3 + img[k + 1] * .59 + img[k + 2] * .11; };
/** Paint out one straight 2 px line: per 40 px run, find its darkest pair near the expected position and bridge it. */
function paintOut(vertical, expected, len) {
  for (let s = 0; s < len; s += 40) {
    const e = Math.min(len, s + 40);
    let best = 0, bestV = Infinity;
    for (let d = -4; d <= 4; d++) {
      const c = Math.round(expected) + d;
      let v = 0;
      for (let t = s; t < e; t++) v += vertical ? lum(c, t) + lum(c + 1, t) : lum(t, c) + lum(t, c + 1);
      if (v < bestV) { bestV = v; best = c; }
    }
    for (let t = s; t < e; t++) {
      const a = best - 2, b = best + 3;
      for (let c = best - 1; c <= best + 2; c++) {
        const f = (c - a) / (b - a);
        const ka = vertical ? (t * PW + a) * 3 : (a * PW + t) * 3, kb = vertical ? (t * PW + b) * 3 : (b * PW + t) * 3, k = vertical ? (t * PW + c) * 3 : (c * PW + t) * 3;
        for (let ch = 0; ch < 3; ch++) img[k + ch] = Math.round(img[ka + ch] * (1 - f) + img[kb + ch] * f);
      }
    }
  }
}
for (let x = -10; x <= 110; x += 10) paintOut(true, ((x - X0) / VW) * PW, PH);
for (let y = 10; y < VH; y += 10) paintOut(false, (y / VH) * PH, PW);
await sharp(img, { raw: { width: PW, height: PH, channels: 3 } }).webp({ quality: 90 }).toFile(`${DIR}/workbench-ortho.webp`);

// ---------------------------------------------------------------- what the photo shows: canopy and limestone density

const canopy = Buffer.alloc(PW * PH), rock = Buffer.alloc(PW * PH);
for (let i = 0; i < PW * PH; i++) {
  const r = photo.data[i * 3], g = photo.data[i * 3 + 1], b = photo.data[i * 3 + 2];
  const l = r * .3 + g * .59 + b * .11;
  canopy[i] = l < 105 && g >= r * .92 && g > b * 1.05 ? 255 : 0;
  rock[i] = l > 178 && Math.max(r, g, b) - Math.min(r, g, b) < 38 ? 255 : 0;
}
const blur = (buf, s) => sharp(buf, { raw: { width: PW, height: PH, channels: 1 } }).blur(s).extractChannel(0).raw().toBuffer();
const wood = await blur(canopy, 26), rocky = await blur(rock, 26), crowns = await blur(canopy, 5);
/** A density field at map point (x, y), 0–255 (bilinear on the photo's pixels). */
function field(buf, x, y) {
  const gx = clamp(((x - X0) / VW) * PW - .5, 0, PW - 1.001), gy = clamp((y / VH) * PH - .5, 0, PH - 1.001);
  const i = Math.floor(gx), j = Math.floor(gy), u = gx - i, v = gy - j;
  return (buf[j * PW + i] * (1 - u) + buf[j * PW + i + 1] * u) * (1 - v) + (buf[(j + 1) * PW + i] * (1 - u) + buf[(j + 1) * PW + i + 1] * u) * v;
}
const WOOD = 120, ROCKY = 55;

// ---------------------------------------------------------------- the surface: heights on a quarter-unit grid

const STEP = .25, GW = VW / STEP + 1, GH = VH / STEP + 1;
const streamLine = samplePath(STREAM), roadLine = samplePath(ROAD);
const H = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const x = X0 + i * STEP, y = j * STEP;
  H[j * GW + i] = carved(height(x, y), distToLine({ x, y }, streamLine));
}
function hAt(x, y) {
  const gx = clamp((x - X0) / STEP, 0, GW - 1.001), gy = clamp(y / STEP, 0, GH - 1.001);
  const i = Math.floor(gx), j = Math.floor(gy), u = gx - i, v = gy - j;
  return (H[j * GW + i] * (1 - u) + H[j * GW + i + 1] * u) * (1 - v) + (H[(j + 1) * GW + i] * (1 - u) + H[(j + 1) * GW + i + 1] * u) * v;
}
let hMin = Infinity, hMax = -Infinity;
for (const h of H) { hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); }

// ---------------------------------------------------------------- the topographic sheet

const W = 1980, HT = 1380, PX = W / VW; // 15 px per map unit
// Lesson map language (topic-02 topographyTerrainStyle MAP; lesson 6 water).
const C = { paper: [248, 242, 231], vegFill: [213, 224, 196], vegInk: '#6E7A4E', contour: '#8A6F4D', ink: '#38432E', roadCasing: '#8A6F4D', roadFill: '#E3C996', water: '#4f8397', waterWide: '#7FB4C6' };
const px = Buffer.alloc(W * HT * 3);
for (let py = 0; py < HT; py++) for (let pxi = 0; pxi < W; pxi++) {
  const x = X0 + (pxi + .5) / PX, y = (py + .5) / PX;
  // a faint relief shade from the north-west, under the symbols
  const dx = (hAt(x + .2, y) - hAt(x - .2, y)) / .4, dy = (hAt(x, y + .2) - hAt(x, y - .2)) / .4;
  const shade = clamp(1 - (dx + dy) * .012, .9, 1.035);
  const base = field(wood, x, y) >= WOOD ? C.vegFill : C.paper;
  const k = (py * W + pxi) * 3;
  for (let c = 0; c < 3; c++) px[k + c] = clamp(base[c] * shade, 0, 255);
}

/** Marching triangles: the segments where `f` crosses `level`, on a grid of `step` units. */
function isolines(f, gw, gh, step, level) {
  const segs = [];
  for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
    const v = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    for (const tri of [[0, 1, 2], [0, 2, 3]]) {
      const pts = [];
      for (let e = 0; e < 3; e++) {
        const a = v[tri[e]], b = v[tri[(e + 1) % 3]], ha = f(a[0], a[1]), hb = f(b[0], b[1]);
        if ((ha <= level && hb > level) || (hb <= level && ha > level)) {
          const t = (level - ha) / (hb - ha);
          pts.push([X0 + (a[0] + t * (b[0] - a[0])) * step, (a[1] + t * (b[1] - a[1])) * step]);
        }
      }
      if (pts.length === 2) segs.push(pts);
    }
  }
  return segs;
}
const segD = segs => segs.map(([a, b]) => `M${a[0].toFixed(3)} ${a[1].toFixed(3)}L${b[0].toFixed(3)} ${b[1].toFixed(3)}`).join('');

const svg = [];
// Woodland edge (dotted) from the photo's canopy density.
const WG = 2; // density grid, units / cell
const woodSegs = isolines((i, j) => field(wood, X0 + i / WG, j / WG), VW * WG + 1, VH * WG + 1, 1 / WG, WOOD);
svg.push(`<path d="${segD(woodSegs)}" fill="none" stroke="${C.vegInk}" stroke-width=".14" stroke-linecap="round" stroke-dasharray=".05 .45"/>`);

// Trees: one symbol per crown the photo shows inside woodland or rocky ground (local maxima of the crown field).
const trees = [];
for (let y = 1; y < VH - 1; y += .9) for (let x = X0 + 1; x < X0 + VW - 1; x += .9) {
  const jx = x + (hash(Math.round(x * 10), Math.round(y * 10), 5) - .5) * .5, jy = y + (hash(Math.round(x * 10), Math.round(y * 10), 6) - .5) * .5;
  const inWood = field(wood, jx, jy) >= WOOD, inRock = field(rocky, jx, jy) >= ROCKY;
  if (!(inWood || (inRock && field(crowns, jx, jy) > 120))) continue;
  if (trees.some(t => Math.hypot(t.x - jx, t.y - jy) < 1.15)) continue;
  trees.push({ x: jx, y: jy });
}
for (const t of trees) svg.push(`<circle cx="${t.x.toFixed(2)}" cy="${t.y.toFixed(2)}" r=".42" fill="none" stroke="${C.vegInk}" stroke-width=".13"/><circle cx="${t.x.toFixed(2)}" cy="${t.y.toFixed(2)}" r=".1" fill="${C.vegInk}"/>`);

// Rocky ground: small angular rock marks where the photo's limestone is densest.
for (let y = .6; y < VH; y += 1.05) for (let x = X0 + .6; x < X0 + VW; x += 1.05) {
  const jx = x + (hash(Math.round(x * 10), Math.round(y * 10), 8) - .5) * .7, jy = y + (hash(Math.round(x * 10), Math.round(y * 10), 9) - .5) * .7;
  if (field(rocky, jx, jy) < ROCKY || trees.some(t => Math.hypot(t.x - jx, t.y - jy) < .8)) continue;
  const s = .26 + hash(Math.round(jx * 10), Math.round(jy * 10), 10) * .14;
  svg.push(`<path d="M${(jx - s).toFixed(2)} ${(jy + s * .55).toFixed(2)}L${(jx - s * .2).toFixed(2)} ${(jy - s * .7).toFixed(2)}L${(jx + s).toFixed(2)} ${(jy + s * .55).toFixed(2)}Z" fill="${C.ink}" opacity=".78"/>`);
}

// Contours every 10 m, index every 50 m, labelled where they are clear of the route, points and map furniture.
const route = POINT_XY.slice(0, -1).flatMap((p, i) => samplePath({ start: p, curves: [[p, POINT_XY[i + 1], POINT_XY[i + 1]]] }, 24));
const clearOf = (x, y) =>
  distToLine({ x, y }, route) > 3 && POINT_XY.every(p => Math.hypot(p.x - x, p.y - y) > 5) &&
  distToLine({ x, y }, streamLine) > 2.5 && distToLine({ x, y }, roadLine) > 2.5 &&
  x > X0 + 4 && x < X0 + VW - 4 && y > 11 && y < VH - 4 && !(x > 84 && y > 78) && !(x < 12 && y > 58) && !(x < 26 && y < 48);
const labels = [];
const masks = [];
const lines = [];
const first = Math.ceil(hMin / 10) * 10;
const levels = [];
for (let level = first; level <= hMax; level += 10) {
  const segs = isolines((i, j) => H[j * GW + i], GW, GH, STEP, level);
  levels.push({ level, segs });
  lines.push(`<path d="${segD(segs)}" fill="none" stroke="${C.contour}" stroke-width="${level % 50 === 0 ? .26 : .12}" stroke-linecap="round"/>`);
}
// Index contours first (up to three labels each), then one label on every other 20 m contour where there is room.
const labelOrder = [...levels.filter(l => l.level % 50 === 0).map(l => ({ ...l, max: 3 })), ...levels.filter(l => l.level % 50 !== 0 && l.level % 20 === 0).map(l => ({ ...l, max: 1 }))];
for (const { level, segs, max } of labelOrder) {
  let placed = 0;
  for (let n = 0; n < segs.length && placed < max; n += 5) {
    const [a, b] = segs[n];
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    if (!clearOf(x, y) || labels.some(l => Math.hypot(l.x - x, l.y - y) < 20)) continue;
    const gx = (hAt(x + .3, y) - hAt(x - .3, y)) / .6, gy = (hAt(x, y + .3) - hAt(x, y - .3)) / .6, g = Math.hypot(gx, gy);
    if (g < 1e-3 || 10 / g < 1.5) continue; // the next contour must clear the label
    // the text runs along the contour, upright
    let rot = (Math.atan2(gx, -gy) * 180) / Math.PI;
    if (rot > 90) rot -= 180;
    if (rot < -90) rot += 180;
    labels.push({ x, y, rot, text: String(level) });
    const w = String(level).length * .95 + .5;
    masks.push(`<rect x="${-w / 2}" y="-.85" width="${w}" height="1.7" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})" fill="black"/>`);
    placed++;
  }
}
svg.push(`<mask id="labels" maskUnits="userSpaceOnUse" x="${X0}" y="0" width="${VW}" height="${VH}"><rect x="${X0}" y="0" width="${VW}" height="${VH}" fill="white"/>${masks.join('')}</mask>`);
svg.push(`<g mask="url(#labels)">${lines.join('')}</g>`);
for (const l of labels) svg.push(`<text transform="translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot.toFixed(1)})" y=".58" text-anchor="middle" font-family="Arial, sans-serif" font-size="1.6" font-weight="700" fill="${C.contour}">${l.text}</text>`);

// The stream (blue) and the dirt road (cased double line), from the lesson geometry, run off the sheet edges.
const streamD = `M-17 46L-3 47 ${pathD(STREAM).replace(/^M[^C]+/, '')} L117 82`;
const roadD = `M34 -1L49 15.5 ${pathD(ROAD).replace(/^M[^C]+/, '')} L117 71`;
svg.push(`<path d="${streamD}" fill="none" stroke="${C.waterWide}" stroke-width=".8" stroke-linecap="round" opacity=".5"/><path d="${streamD}" fill="none" stroke="${C.water}" stroke-width=".34" stroke-linecap="round"/>`);
svg.push(`<path d="${roadD}" fill="none" stroke="${C.roadCasing}" stroke-width=".95"/><path d="${roadD}" fill="none" stroke="${C.roadFill}" stroke-width=".62"/>`);

// Spot heights on the two summits beside the saddle, sampled where the photo's guide printed them (456 / 449).
const spots = peaks.map(p => ({ x: p.x, y: p.y, h: hAt(p.x, p.y) }));
for (const s of spots) svg.push(`<g transform="translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})"><circle r=".38" fill="${C.ink}"/><text x=".9" y=".62" text-anchor="start" font-family="Arial, sans-serif" font-size="1.75" font-weight="700" fill="${C.ink}">${Math.round(s.h)}</text></g>`);

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}" viewBox="${X0} 0 ${VW} ${VH}">${svg.join('')}</svg>`);
await sharp(px, { raw: { width: W, height: HT, channels: 3 } }).composite([{ input: overlay }]).webp({ quality: 90 }).toFile(`${DIR}/workbench-topo.webp`);
console.log(`ortho ${PW}×${PH} (baked grid removed) · topo ${W}×${HT}: contours ${first}–${Math.floor(hMax / 10) * 10} m every 10 m, ${labels.length} contour labels, ${trees.length} trees, summits ${spots.map(s => Math.round(s.h)).join(' / ')}`);
