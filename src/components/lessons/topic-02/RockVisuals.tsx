'use client';
/**
 * RockVisuals — time-lapses for "3 סוגי הסלעים" (GeologyScene).
 *
 * Each rock family has two images of the same place from the same camera:
 * START (the process) and END (the rock it leaves behind) — real-looking
 * photographs (design/handoff/rock-types-film) or painted scenes in the forces
 * board's style (scripts/media/render-geology-rocks.cjs). Instead of a
 * generated video — which reached the end state too abruptly — a WebGL shader
 * performs the process between them at a readable pace, stage by stage:
 *
 *   igneous      the lava keeps glowing, then crusts over from the toe of the flow
 *                back to the vent (brightest cores last); only then does morning
 *                light arrive over the black basalt field.
 *   sediment     (painted) the stream's muddy plume spreads into the bay; in the cut
 *                grains settle through the water and the beds pile up one on
 *                another, pausing at each bedding plane, while the delta's shore
 *                advances until the sea is gone; buried beds compact (they settle
 *                loose and thicker), give up their pore water and cement into the
 *                limestone, sandstone and marl of the END painting, the youngest last.
 *   metamorphic  (painted) pressure arrows push from both sides: the flat beds in the
 *                cut shorten and fold (a real deformation of the rock, which the
 *                arrows ride on) and the ridges above rise a little; a soft warm zone
 *                climbs from the base; then a front spreads from the hot, squeezed
 *                base of the middle through the solid rock — limestone flattens (its
 *                fossils drawn out, then gone) and recrystallises into pale sugary
 *                marble, shale takes a cleavage and turns into dark slate — until the
 *                folded, banded marble and slate of the END painting remain.
 *
 * It is an automatic illustration, not a video player: there are no controls.
 * The process plays once when ≥ 35% of the figure is in view and holds its final
 * state; after the figure has fully left the viewport and comes back it plays
 * again from the start (a tab switch remounts it, so it also starts over). The
 * clock stops while the figure is off-screen or the document is hidden.
 * Labels live on an SVG overlay in the images' 640 × 360 frame and appear with
 * their stage. Images are never mirrored for RTL. Reduced motion shows the
 * finished state with its final labels, with no autoplay and no replay.
 * Each film declares its images (`images: { start, end, aux? }`); `aux` is an
 * optional data map the shader reads as `uC` (see rockTimelapseGL).
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { INK_SOFT, Tag, arrowPoints } from './GeologyVisuals';
import { createTimelapse, type Timelapse, type TimelapseImages } from './rockTimelapseGL';
import { cn } from '@/lib/utils';

export type RockKind = 'igneous' | 'sediment' | 'metamorphic';
type Pt = readonly [number, number];

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/scene-geology`;
const photoUrl = (kind: RockKind, which: 'start' | 'end') => `${BASE}/${kind}-${which}.webp`;
/** Painted scenes (scripts/media/render-geology-rocks.cjs). */
const paintedUrl = (kind: RockKind, which: 'start' | 'end') => `${BASE}/rocks/${kind}-${which}.webp`;
const VB_W = 640;
const VB_H = 360;
/** photo-fraction → overlay viewBox */
const at = (u: number, v: number): Pt => [u * VB_W, v * VB_H];

const ease = (x: number) => x * x * (3 - 2 * x);
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

// ── sediment: a painted bay that fills bed by bed and turns to rock ───────────
// The scene is painted by scripts/media/render-geology-rocks.cjs (START: the bay
// over its basin, END: the basin filled with rock, AUX: data); on the near edge
// one unit of height z is one viewBox unit (viewBox y = Y0 − z). The geometry
// (and the anchors below, from its --anchors output) belongs to the script, the
// timing to this table. p windows per bed, base → top: it settles grain by grain
// (deposit), then, once buried, compacts — it was LOOSE × thicker — and cements.
const SED = {
  y0: 358,
  sea: 120,
  loose: 0.3,
  beds: [
    { settle: [0.1, 0.21], harden: [0.26, 0.48], grain: '0.8, 0.77, 0.66' }, // limestone
    { settle: [0.26, 0.37], harden: [0.42, 0.62], grain: '0.82, 0.79, 0.68' }, // limestone with fossils
    { settle: [0.42, 0.5], harden: [0.55, 0.78], grain: '0.76, 0.65, 0.47' }, // sandstone
    { settle: [0.55, 0.62], harden: [0.66, 0.94], grain: '0.6, 0.61, 0.52' }, // marl, the youngest: loose the longest
  ],
  // the pause at each bedding plane: between settle windows, ≥ 0.05 p, with only a trickle of grains
  trickle: 0.06,
  // the shoreline leaves the mouth / reaches the near edge (AUX order 0 → 1); the sea is gone
  shore: [0.1, 0.61],
  // how the AUX order encodes the delta's size a (render-geology-rocks.cjs ORDER): o = max · (1 − e^(−a / scale))
  order: { max: 1, scale: 170 },
  // AUX rows: 360 for the frame, one pad, then the near edge's final bed tops Z0…Z4 per column
  auxRows: 366,
  // per viewBox column x: Z0 (basin floor), the tops of the limestone, limestone with fossils,
  // sandstone, marl (surface); o: the shoreline order of the bay just behind the cut there
  arrow: { x: 190, z: [20.7, 40.9, 63, 88.8, 121.1], o: 0.955 },
  labels: { x: 320, z: [21.7, 39.9, 60.5, 90.1, 121] },
  // where the delta's channel leaves the cut (viewBox x): the plume clouds the water most there
  axisX: 395,
} as const;
const sedY = (z: number) => SED.y0 - z;
/**
 * Top of the deposit (z) at a column whose final tops are z[0…4] and whose bay shore order
 * is o: the same stacking as the shader's deposit() (including its marl fill, which waits
 * for the marl's settle window).
 */
function sedTop(p: number, z: readonly number[], o: number) {
  const lim = SED.sea + (z[4] - SED.sea) * ease(seg(p, SED.shore[1], SED.shore[1] + 0.06));
  const pc = SED.shore[0] + (SED.shore[1] - SED.shore[0]) * o;
  const ss = (a: number, b: number, x: number) => ease(seg(x, a, b));
  let top = z[0];
  SED.beds.forEach(({ settle, harden }, i) => {
    const inf = 1 + SED.loose * (1 - ease(seg(p, harden[0], harden[1])));
    const room = Math.max(lim - top, 0);
    let th = Math.min((z[i + 1] - z[i]) * ease(seg(p, settle[0], settle[1])) * inf, room);
    if (i === SED.beds.length - 1) th = Math.max(th, room * ss(Math.max(pc - 0.05, settle[0]), Math.max(pc, settle[0] + 0.05), p));
    top += th;
  });
  return top;
}
const g3 = (n: number) => n.toFixed(3);
const SED_GLSL = `
const float Y0 = ${g3(SED.y0)};
const float SEA = ${g3(SED.sea)};
const float LOOSE = ${g3(SED.loose)};
const float AUX_H = ${g3(SED.auxRows)};
const float ORDER_MAX = ${g3(SED.order.max)};
const float ORDER_SCALE = ${g3(SED.order.scale)};
// the delta's size (world units) when it covers a point of AUX order o
float sizeAt(float o) { return -ORDER_SCALE * log(max(1.0 - o / ORDER_MAX, 0.003)); }
vec4 aux(vec2 uv) { return texture2D(uC, vec2(uv.x, uv.y * 360.0 / AUX_H)); }
// the near edge's final bed tops in this column (16-bit: whole units + 1/256)
float zTab(float i) { vec4 t = texture2D(uC, vec2(v.x, (361.5 + i) / AUX_H)); return t.r * 255.0 + t.g * (255.0 / 256.0); }
// how much is settling now (0…1), and the colour of the grains that settle
float settling(float p) {
  float s = ${g3(SED.trickle)};
${SED.beds.map(({ settle: [a, b] }) => `  s = max(s, smoothstep(${g3(a)}, ${g3(a + 0.015)}, p) * (1.0 - smoothstep(${g3(b - 0.015)}, ${g3(b)}, p)));`).join('\n')}
  return s * (1.0 - smoothstep(${g3(SED.shore[1] - 0.04)}, ${g3(SED.shore[1])}, p));
}
vec3 grainColor(float p) {
  vec3 c = vec3(${SED.beds[0].grain});
${SED.beds.slice(1).map(({ settle: [a], grain }) => `  c = mix(c, vec3(${grain}), smoothstep(${g3(a - 0.03)}, ${g3(a)}, p));`).join('\n')}
  return c;
}
// The deposit in this column at time p, for the point at height z: the bed it lies in (-1: none),
// where that point sits in the finished stack (zf) and within its bed (rel, 0 base … 1 top), how far
// its bed has hardened (c), the deposit's top, and how fast the beds at and below z give up their water.
// pc: when the delta front reaches the bay just behind the cut in this column — the water over
// the pile there fills in with the youngest bed, never before that bed's own settle window opens
// (so the pause at the bedding plane under it stays clear).
void deposit(float z, float pc, out float bed, out float zf, out float rel, out float hard, out float top, out float seep) {
  float Z0 = zTab(0.0);
  float Z1 = zTab(1.0);
  float Z2 = zTab(2.0);
  float Z3 = zTab(3.0);
  float Z4 = zTab(4.0);
  float lim = SEA + (Z4 - SEA) * ease(seg(uP, ${g3(SED.shore[1])}, ${g3(SED.shore[1] + 0.06)}));
  top = Z0;
  bed = -1.0;
  zf = z;
  seep = 0.0;
  rel = 0.0;
  hard = 1.0;
  float c, inf, th, h;
${SED.beds
  .map(
    ({ settle: [s0, s1], harden: [h0, h1] }, i) => `  c = ease(seg(uP, ${g3(h0)}, ${g3(h1)}));
  inf = 1.0 + LOOSE * (1.0 - c);
  th = min((Z${i + 1} - Z${i}) * ease(seg(uP, ${g3(s0)}, ${g3(s1)})) * inf, max(lim - top, 0.0));${
    i === SED.beds.length - 1
      ? `\n  th = max(th, max(lim - top, 0.0) * smoothstep(max(pc - 0.05, ${g3(s0)}), max(pc, ${g3(s0 + 0.05)}), uP));`
      : ''
  }
  h = seg(uP, ${g3(h0)}, ${g3(h1)});
  if (z >= top && th > 0.3) seep += 6.0 * h * (1.0 - h) * ${g3(1 / (h1 - h0))} / (1.0 + max(z - top - th, 0.0) * 0.03);
  if (bed < 0.0 && z >= Z0 && z < top + th) { bed = ${i}.0; zf = Z${i} + (z - top) / inf; rel = (zf - Z${i}) / max(Z${i + 1} - Z${i}, 0.5); hard = c; }
  top += th;`,
  )
  .join('\n')}
}
// specks falling (speed > 0) or rising (< 0) through a world-unit plane: cell size, share of cells with one, radius
float specks(vec2 q, float speed, float cell, float dens, float r, float seed) {
  vec2 g = vec2(q.x + 0.6 * sin(q.y * 0.21 + seed * 5.0), q.y + uT * speed) / cell;
  vec2 id = floor(g);
  if (hash(id + seed) > dens) return 0.0;
  vec2 o = vec2(hash(id + seed + 1.7), hash(id + seed + 4.3)) * 0.6 + 0.2;
  return smoothstep(r, r * 0.3, length((fract(g) - o) * cell));
}
`;

// ── metamorphic: a painted fold belt; the beds in the cut fold and turn to marble and slate ──
// The scene is painted by scripts/media/render-geology-rocks.cjs (START: flat beds of limestone
// and shale under a plateau, END: the same beds folded and recrystallised, the ridges grown out to
// the near edge, AUX: data). The deformation constants copy the script's MET (its --anchors output
// prints them): a point (X, Z) of the flat beds is, at fold progress f, at
// x = XC + (X − XC)(1 − K·f), z = Z(1 + TH·f) + f·Fd·(1 + (WTOP − 1)·Z / ZT), with Fd the fold at
// depth in its final column (AUX table). The timing lives here.
const MET = {
  y0: 358,
  auxRows: 363,
  xc: 320,
  k: 0.12,
  th: 0.05,
  wtop: 0.26,
  zt: 120,
  // the rock under the base continues the sequence downward: below `at` it is the rock `repeat`
  // units higher (the script's MET.BASE)
  base: { at: 1.2, repeat: 47 },
  // the squeeze: the beds shorten and fold, the ridges rise. Fold progress f = 1 − (1 − s)^ease,
  // s = seg(p, fold): it starts at once with the arrows, so it is clearly under way before the heat
  // is strong
  fold: [0.1, 0.72],
  foldEase: 2.2,
  // the warm zone: it appears with its label ("חום", from 0.12) as a faint band at the base (strength
  // `faint` over `appear`), gains its full strength only after the squeeze is under way (`build`),
  // its upper edge climbing slowly from the base to ≈ z over `rise`; then it fades
  heat: { appear: [0.12, 0.16], faint: 0.4, build: [0.18, 0.32], rise: [0.12, 0.5], fade: [0.82, 0.97], z: 52 },
  // the transformation front: from the hot, squeezed base of the middle up and outward (its
  // radius in the rock's own frame, r = |((X − XC) / 380, Z / 150)|, grows over this window)
  front: [0.3, 0.88],
  // the land takes on its END light as the ridges rise
  land: [0.28, 0.9],
  // the vice: arrow height (z), its tips' material columns (from each side), its length
  arrows: { z: 58, tip: 78, len: 66 },
} as const;
const metF = (p: number) => 1 - (1 - seg(p, MET.fold[0], MET.fold[1])) ** MET.foldEase;
const metY = (z: number) => MET.y0 - z;
const MET_GLSL = `
const float Y0 = ${g3(MET.y0)};
const float AUX_H = ${g3(MET.auxRows)};
const float XC = ${g3(MET.xc)};
const float K = ${g3(MET.k)};
const float TH = ${g3(MET.th)};
const float WTOP = ${g3(MET.wtop)};
const float ZT = ${g3(MET.zt)};
// AUX tables (16-bit: whole units + 1/256): row 361 START's top of the cut per column, row 362 the
// fold at depth + 128 per final column
float tab(float row, float x) { vec4 t = texture2D(uC, vec2(x / 640.0, (row + 0.5) / AUX_H)); return t.r * 255.0 + t.g * (255.0 / 256.0); }
// the material beyond the frame's sides is the mirror image of the material inside
float mirrorX(float X) { return X < 0.0 ? -X : (X > 640.0 ? 1280.0 - X : X); }
float foldZ(float Z, float Fd, float f) { return Z * (1.0 + TH * f) + f * Fd * (1.0 + (WTOP - 1.0) * Z / ZT); }
float unfoldZ(float z, float Fd, float f) { return (z - f * Fd) / (1.0 + TH * f + f * Fd * (WTOP - 1.0) / ZT); }
// the rock below the base, lifted into the anticlines' cores, continues the sequence downward (the
// cut is entered just above the base, clear of the painting's soft bottom edge)
float baseZ(float Z) { return Z < ${g3(MET.base.at)} ? ${g3(MET.base.at)} + mod(Z - ${g3(MET.base.at)}, ${g3(MET.base.repeat)}) : Z; }
// the flat beds (START) at a material point; the AUX data there (G limestone, B the bed's middle / 128)
vec3 flatAt(float X, float Z) { return texture2D(uA, vec2(X / 640.0, (Y0 - baseZ(Z)) / 360.0)).rgb; }
vec4 bedAt(float X, float Z) { return texture2D(uC, vec2(X / 640.0, (Y0 - baseZ(Z)) / AUX_H)); }
`;

// "down(a, b, x)": 1 below a, 0 above b (GLSL smoothstep needs edge0 < edge1)
const DOWN = 'float down(float a, float b, float x) { return 1.0 - smoothstep(a, b, x); }\n';

const SHADERS: Record<RockKind, string> = {
  igneous: `${DOWN}
void main() {
  vec2 uv = v;
  vec3 a = texture2D(uA, uv).rgb;
  vec3 b = texture2D(uB, uv).rgb;
  float lum = dot(a, vec3(0.299, 0.587, 0.114));
  // molten rock = the saturated orange/red pixels of the dusk photo
  float hot = smoothstep(0.15, 0.4, a.r - max(a.g * 0.6, a.b));
  // the cooling front runs up the flow, from its toe back to the vent; bright cores crust over last
  vec2 toe = vec2(0.97, 0.88);
  vec2 vent = vec2(0.25, 0.19);
  vec2 d = vent - toe;
  float s = clamp(dot(uv - toe, d) / dot(d, d), 0.0, 1.0);
  float front = seg(uP, 0.16, 0.64) * 1.35 - s - lum * 0.3 + (fbm(uv * 9.0) - 0.5) * 0.14;
  float k = smoothstep(0.0, 0.25, front);
  // still molten: the glow breathes
  float breathe = 0.09 * sin(uT * 2.3 + fbm(uv * 7.0 + uT * 0.12) * 9.0);
  vec3 live = a * (1.0 + hot * (1.0 - k) * breathe);
  // crusting: orange -> dull red -> the cooled basalt of the END photo, still in dusk light
  vec3 ember = vec3(lum * 0.62, lum * 0.13, lum * 0.05);
  vec3 basaltDusk = b * vec3(0.34, 0.36, 0.44);
  vec3 cooled = mix(ember, basaltDusk, smoothstep(0.35, 1.0, k));
  vec3 col = mix(live, cooled, hot * smoothstep(0.0, 0.45, k));
  // time passes: morning light arrives, sky first, then the ground
  float day = seg(uP, 0.62, 0.9);
  float n = fbm(uv * 2.5 + 7.0);
  float m = smoothstep(0.0, 0.3, day * 1.6 - uv.y * 0.4 - n * 0.3);
  gl_FragColor = vec4(mix(col, b, m), 1.0);
}`,
  sediment: `${SED_GLSL}
void main() {
  vec2 uv = v;
  vec4 A = aux(uv);
  vec3 a = texture2D(uA, uv).rgb;
  vec3 b = texture2D(uB, uv).rgb;
  float load = settling(uP);
  float z = Y0 - uv.y * 360.0;
  float Z0 = zTab(0.0);
  float Z4 = zTab(4.0);
  // ── the bay from above. The AUX order (B; 0 = never water) is the delta's size when it covers
  // this point, o = ORDER_MAX · (1 − e^(−a / ORDER_SCALE)) (render-geology-rocks.cjs); its front
  // grows linearly in o over the shore window. Waterline, shoal and plume are drawn in a (world
  // units), so they keep their width wherever the front is.
  float o = A.b;
  float pe = mix(${g3(SED.shore[0])}, ${g3(SED.shore[1])}, o);
  float fo = seg(uP, ${g3(SED.shore[0])}, ${g3(SED.shore[1])});
  float aPix = sizeAt(o) + 3.0 * (noise(uv * vec2(70.0, 120.0)) - 0.5);
  float aFront = uP < ${g3(SED.shore[0])} ? -1.0 : sizeAt(fo);
  float land = o < 0.004 ? 1.0 : smoothstep(-1.2, 1.2, aFront - aPix);
  vec3 col = mix(a, b, land);
  // above the near edge's top: the bay and the land from above (below it, in the cut, START and
  // END differ only over the basin, handled next)
  if (z > max(Z4, SEA) + 0.3) {
    float ahead = aPix - aFront;
    // a narrow sandy shoal just ahead of the waterline
    float shoal = 1.0 - smoothstep(0.0, 14.0, ahead);
    vec3 sea = mix(a, mix(a, vec3(0.72, 0.73, 0.6), 0.6), shoal * shoal * step(0.0, ahead));
    // flow (R, G: phase along the stream and the delta's axis; A: weight w = exp(-(v / W)²) around
    // the axis). The plume is a tongue out of the channel's tip at the delta front, fanning out
    // and thinning ahead of it, its silt swirling outward; at first it reaches out from the mouth.
    vec2 fl = A.rg * 2.0 - 1.0;
    float w = clamp((A.a * 255.0 - 128.0) / 127.0, 0.0, 1.0);
    float ph = atan(fl.y, fl.x);
    float pt = ph - uT * 0.9;
    float swirl = fbm(vec2(cos(pt), sin(pt)) * 0.45 + uv * vec2(11.0, 13.0) + vec2(uT * 0.02, 0.0));
    float t = ahead / (8.0 + 52.0 * smoothstep(0.0, 0.08, uP));
    float vn = sqrt(-log(max(w, 0.002)));
    float tongue = (1.0 - smoothstep(0.2 + 0.6 * t, 0.4 + 0.8 * t, vn)) * step(0.0, t) * (1.0 - smoothstep(0.4, 1.0, t));
    // (not along the strip by the cut, which fills last: there the order steps steeply)
    float steep = smoothstep(18.0, 30.0, abs(sizeAt(aux(uv + vec2(0.0, 0.012)).b) - sizeAt(o)));
    float plume = tongue * (1.0 - steep) * (0.65 + 0.35 * load) * mix(0.5, 1.0, smoothstep(0.42, 0.62, swirl));
    sea = mix(sea, vec3(0.7, 0.61, 0.46), 0.85 * plume * (1.0 - land));
    // new land: bare silt, dark and damp at the waterline, drying pale; the END land and its
    // scrub take over later. The stream's channel (END water) runs across it at once.
    vec3 m = max(max(b, texture2D(uB, uv + vec2(0.003, 0.0)).rgb), max(texture2D(uB, uv - vec2(0.003, 0.0)).rgb, max(texture2D(uB, uv + vec2(0.0, 0.005)).rgb, texture2D(uB, uv - vec2(0.0, 0.005)).rgb)));
    vec3 bare = mix(m, vec3(dot(m, vec3(0.3, 0.59, 0.11))) * vec3(1.1, 1.0, 0.82), 0.3);
    float age = uP - pe;
    bare *= mix(vec3(0.72, 0.73, 0.76), vec3(1.0), smoothstep(0.0, 0.08, age));
    // by the old coast the new land joins the old land without a seam
    float coast = 0.0;
    for (int i = 0; i < 6; i++) {
      float an = float(i) * 1.0472 + 0.3;
      coast += step(aux(uv + vec2(cos(an), sin(an) * 1.6) * 0.012).b, 0.004) + step(aux(uv + vec2(cos(an + 0.5), sin(an + 0.5) * 1.6) * 0.024).b, 0.004);
    }
    vec3 grown = mix(bare, b, max(smoothstep(0.1, 0.28, age), smoothstep(0.0, 6.0, coast)));
    grown = mix(grown, b, max(smoothstep(0.02, 0.07, b.b - b.r), 1.0 - step(0.004, o)));
    col = mix(sea, grown, land);
    // the stream: ripples and silt carried downstream (painted water is the bluish part)
    float water = smoothstep(0.0, 0.06, col.b - col.r) * smoothstep(0.75, 0.95, w) * (1.0 - step(0.004, o));
    float rip = sin(ph * 5.0 - uT * 7.0 + 2.5 * noise(uv * 110.0)) * (0.6 + 0.4 * noise(uv * 40.0 + 3.0));
    col *= 1.0 + 0.045 * rip * water;
    float dp = ph - uT * 1.6;
    float drift = smoothstep(0.55, 0.9, noise(vec2(cos(dp), sin(dp)) * 6.0 + vec2(uv.y * 260.0 + uv.x * 140.0, 0.0)));
    col = mix(col, vec3(0.83, 0.74, 0.56), 0.4 * drift * water);
  }
  // ── the cut under the bay
  if (Z4 - Z0 > 0.5 && z > Z0 - 1.0 && z < Z4 + 1.0) {
    float bed, zf, rel, hard, top, seep;
    deposit(z, mix(${g3(SED.shore[0])}, ${g3(SED.shore[1])}, o), bed, zf, rel, hard, top, seep);
    float x = uv.x * 640.0;
    if (bed >= 0.0) {
      // a point of the bed, at zf in the finished stack. Loose grains (paler, soft, grainy, and
      // thicker until compacted) turn into the solid rock of the END painting as cement spreads
      // up through the bed from its base, a damp line marking the front
      vec2 q = vec2(uv.x, (Y0 - zf) / 360.0);
      vec3 rock = texture2D(uB, q).rgb;
      vec3 soft = 0.25 * (texture2D(uB, q + vec2(0.0024, 0.0)).rgb + texture2D(uB, q - vec2(0.0024, 0.0)).rgb + texture2D(uB, q + vec2(0.0, 0.004)).rgb + texture2D(uB, q - vec2(0.0, 0.004)).rgb);
      float lum = dot(soft, vec3(0.3, 0.59, 0.11));
      vec2 gq = vec2(x, zf * (1.0 + LOOSE * (1.0 - hard))) * 1.7;
      float gr = hash(floor(gq));
      float pore = smoothstep(0.86, 0.97, hash(floor(gq * 0.6) + 31.0));
      vec3 sed = mix(soft, vec3(lum), 0.35) * (1.13 + 0.12 * (gr - 0.5)) * (1.0 - 0.2 * pore);
      float front = hard * 1.3 - 0.15;
      float loose = smoothstep(front - 0.1, front + 0.1, rel);
      col = mix(rock, sed, loose);
      float df = (rel - front) / 0.05;
      col *= 1.0 - 0.12 * exp(-df * df) * step(0.01, hard) * step(hard, 0.99);
      // the freshest grains on top of the pile
      col = mix(col, col * 1.06 + 0.02, (1.0 - smoothstep(0.0, 2.2, top - z)) * step(0.1, loose));
      // pore water squeezed out of the compacting beds, rising through the grains above
      float rise = specks(vec2(x, z * 0.7), -5.0, 5.0, 0.45, 0.95, 3.0);
      col = mix(col, col * 0.8 + vec3(0.13, 0.16, 0.17), 0.7 * rise * clamp(seep * 0.15, 0.0, 1.0));
    } else if (z >= top && z < SEA) {
      // the water over the pile: silt clouds it while sediment arrives — most near the surface
      // and toward the delta's channel, under the plume — in slow wisps that sink; a few grains
      // in the colour of the bed now forming settle through it and film the floor
      float dx = (x - ${g3(SED.axisX)}) / 170.0;
      float lat = exp(-dx * dx);
      float hgt = smoothstep(top, SEA, z);
      float wisp = fbm(vec2(x / 34.0 + 0.3 * sin(z / 9.0), (z + uT * 3.0) / 9.0) + 4.0);
      vec3 gc = grainColor(uP);
      float cloud = load * (0.22 + 0.42 * hgt) * (0.5 + 0.5 * lat) * smoothstep(0.25, 0.75, wisp + 0.15);
      vec3 wcol = mix(a, mix(a, gc * 0.84, 0.85), clamp(cloud, 0.0, 0.62));
      float g = specks(vec2(x, z), 7.0, 5.0, 0.2 * load * (0.3 + 0.7 * hgt) * (0.5 + 0.5 * lat), 0.85, 0.0);
      wcol = mix(wcol, gc * 0.9, 0.55 * g * smoothstep(0.0, 3.0, z - top) * smoothstep(0.0, 2.0, SEA - z));
      wcol = mix(wcol, gc * 0.92, 0.45 * (1.0 - smoothstep(0.0, 1.6, z - top)) * load);
      col = wcol;
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`,
  metamorphic: `${MET_GLSL}
void main() {
  vec2 uv = v;
  float x = uv.x * 640.0;
  float z = Y0 - uv.y * 360.0;
  // the squeeze: this column's material (X), its final column (x1), the fold there, the top now
  float f = 1.0 - pow(1.0 - seg(uP, ${g3(MET.fold[0])}, ${g3(MET.fold[1])}), ${g3(MET.foldEase)});
  float X = XC + (x - XC) / (1.0 - K * f);
  float Xm = mirrorX(X);
  float x1 = XC + (X - XC) * (1.0 - K);
  float Fd = tab(362.0, x1) - 128.0;
  float zt0 = tab(361.0, Xm);
  float ztop = foldZ(zt0, Fd, f);
  vec3 col;
  if (z < 0.0) {
    // the thin strip under the cut (the bottom of the frame)
    col = mix(texture2D(uA, uv).rgb, texture2D(uB, uv).rgb, seg(uP, ${g3(MET.front[0])}, ${g3(MET.front[1])}));
  } else if (z <= ztop) {
    // ── the cut: a point of the rock, at Z in the flat beds and at z1 when the folding is done
    float Z = unfoldZ(z, Fd, f);
    float z1 = foldZ(Z, Fd, 1.0);
    vec3 b = texture2D(uB, vec2(x1 / 640.0, (Y0 - z1) / 360.0)).rgb;
    vec4 mat = bedAt(Xm, Z);
    float lime = mat.g;
    // the front, in the rock's own frame (so a grain once changed stays changed): it starts in the
    // hottest, most squeezed rock — the base of the middle — and spreads up and outward
    float r = length(vec2((X - XC) / 380.0, max(Z, 0.0) / 150.0)) + 0.1 * (fbm(vec2(X / 40.0, Z / 20.0)) - 0.5);
    // (the radius reaches the far top corners, r ≈ 1.32, near the window's end and keeps growing,
    // so at p = 1 every grain has changed: the END painting exactly)
    float t = (-0.1 + 1.55 * (uP - ${g3(MET.front[0])}) / ${g3(MET.front[1] - MET.front[0])} - r) / 0.12;
    // well ahead of it (st 0 → 1, ≈ 0.2 p, never before the squeeze is under way) the squeeze
    // flattens the limestone: its grains and fossils are drawn out across it, up and down from the
    // middle of each bed, to 3× their height. Then (s 0 → 1, just ahead of the front) the old
    // grain fades and the new fabric of the END rock — the slate's cleavage, the marble's sugary
    // grain — shows through
    float st = smoothstep(-6.0, -1.6, t) * smoothstep(0.16, 0.3, uP);
    float s = smoothstep(-2.4, -0.5, t);
    float zc = zt0 - 1.0;
    float zm = mat.b * 128.0;
    float Za = zm + (baseZ(Z) - zm) / (1.0 + 2.0 * st * smoothstep(0.75, 1.0, lime));
    vec3 a = flatAt(Xm, Za);
    vec3 soft = 0.25 * (flatAt(Xm + 1.6, Za) + flatAt(Xm - 1.6, Za) + flatAt(Xm, min(Za + 1.6, zc)) + flatAt(Xm, Za - 1.6));
    vec2 qb = vec2(x1 / 640.0, (Y0 - z1) / 360.0);
    vec3 fabric = b - 0.25 * (texture2D(uB, qb + vec2(0.0025, 0.0)).rgb + texture2D(uB, qb - vec2(0.0025, 0.0)).rgb + texture2D(uB, qb + vec2(0.0, 0.0045)).rgb + texture2D(uB, qb - vec2(0.0, 0.0045)).rgb);
    a = mix(a, soft, 0.45 * s) + fabric * s;
    // in the front the rock recrystallises in patches (limestone → marble) and in thin slivers along
    // the cleavage (shale → slate); behind it, the END rock
    float th = (lime > 0.5 ? fbm(vec2(x1 / 9.0, z1 / 6.0) + 3.1) : fbm(vec2(x1 / 2.4, z1 / 16.0) + 7.7)) * 2.0 - 0.97;
    col = mix(a, b, smoothstep(th - 0.35, th + 0.35, t));
    // heat from below: a soft warm zone over the base of the section, its upper edge (the
    // isotherm) climbing slowly; warmth drifts up through it
    float hz = ${g3(MET.heat.z)} * ease(seg(uP, ${g3(MET.heat.rise[0])}, ${g3(MET.heat.rise[1])}));
    float hAmt = (${g3(MET.heat.faint)} * smoothstep(${g3(MET.heat.appear[0])}, ${g3(MET.heat.appear[1])}, uP) + ${g3(1 - MET.heat.faint)} * smoothstep(${g3(MET.heat.build[0])}, ${g3(MET.heat.build[1])}, uP)) * (1.0 - ease(seg(uP, ${g3(MET.heat.fade[0])}, ${g3(MET.heat.fade[1])})));
    float lat = 0.6 + 0.4 * exp(-pow((x - XC) / 240.0, 2.0));
    float iso = hz * lat + 5.0 * (noise(vec2(x / 48.0, uT * 0.25)) - 0.5) + 3.0 * sin(x / 37.0 + uT * 0.4);
    float warm = hAmt * pow(clamp(1.0 - z / max(iso + 10.0, 1.0), 0.0, 1.0), 1.4);
    warm *= 0.75 + 0.5 * fbm(vec2(x / 26.0, (z - uT * 5.0) / 12.0));
    // a dull earthy warmth (at most half) that keeps the rock's light and dark: heated rock, not
    // glowing rock
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(0.84, 0.5, 0.32) * (0.5 + 0.55 * lum), clamp(0.5 * warm, 0.0, 0.5));
  } else {
    // ── the land: START lifted and END lowered to the ridges' height now, END's light taking over
    float d = (texture2D(uC, vec2(uv.x, uv.y * 360.0 / AUX_H)).r - 0.5) * 64.0;
    vec3 a = texture2D(uA, uv + vec2(0.0, f * d / 360.0)).rgb;
    vec3 b = texture2D(uB, uv - vec2(0.0, (1.0 - f) * d / 360.0)).rgb;
    col = mix(a, b, ease(seg(uP, ${g3(MET.land[0])}, ${g3(MET.land[1])})));
  }
  gl_FragColor = vec4(col, 1.0);
}`,
};

type Label = { text: string; x: number; y: number; to?: Pt; from: number; until?: number };
type Film = { images: TimelapseImages; duration: number; description: string; labels: Label[] };

const FILMS: Record<RockKind, Film> = {
  igneous: {
    images: { start: photoUrl('igneous', 'start'), end: photoUrl('igneous', 'end') },
    duration: 11000,
    description:
      'צילום בהילוך מהיר: זרם לבה זוהר יורד מהר געש בשעת בין ערביים, מתקרר ומתקשה מקצה הזרם עד פתח ההר, ובאור הבוקר נשאר שדה של בזלת שחורה, קשה וחשופה',
    labels: [
      { text: 'הר געש', x: 78, y: 46, to: at(0.225, 0.235), from: 0.02 },
      { text: 'לבה', x: 190, y: 252, to: at(0.44, 0.61), from: 0.05, until: 0.6 },
      { text: 'בזלת', x: 190, y: 252, to: at(0.44, 0.61), from: 0.72 },
    ],
  },
  sediment: {
    images: { start: paintedUrl('sediment', 'start'), end: paintedUrl('sediment', 'end'), aux: `${BASE}/rocks/sediment-aux.png` },
    duration: 12000,
    description:
      'איור: נחל מזרים חול וטין אל מפרץ רדוד. לאורך מיליוני שנים השכבות שוקעות זו על גבי זו, עד שהים נעלם ובערוץ נחשף מצוק של שכבות משקע: גיר עם מאובנים, אבן חול וחוואר',
    // on the beds of the cut, each with its layer; the time label at the foot of the growth arrow
    labels: [
      { text: 'גיר', x: SED.labels.x, y: sedY((SED.labels.z[0] + SED.labels.z[2]) / 2), from: 0.41 },
      { text: 'אבן חול', x: SED.labels.x, y: sedY((SED.labels.z[2] + SED.labels.z[3]) / 2), from: 0.52 },
      { text: 'חוואר', x: SED.labels.x, y: sedY((SED.labels.z[3] + SED.labels.z[4]) / 2), from: 0.62 },
      { text: 'מיליוני שנים', x: SED.arrow.x + 54, y: 345, from: 0.12 },
    ],
  },
  metamorphic: {
    images: { start: paintedUrl('metamorphic', 'start'), end: paintedUrl('metamorphic', 'end'), aux: `${BASE}/rocks/metamorphic-aux.png` },
    duration: 11000,
    description:
      'איור: מצוק של שכבות משקע שטוחות נלחץ משני הצדדים ומתחמם מלמטה. השכבות מתקפלות לקשתות ומשנות את אופיין לסלע מותמר בעל פסים: שיש וצפחה',
    // all in the cut, clear of the sample card (top right); 'לחץ' under the arrows, 'חום' on the
    // warm base beside (not over) the middle, where the change begins
    labels: [
      { text: 'סלעים קיימים', x: 320, y: metY(69), from: 0, until: 0.3 },
      { text: 'לחץ', x: 58, y: metY(MET.arrows.z) + 30, from: 0.1 },
      { text: 'לחץ', x: 582, y: metY(MET.arrows.z) + 30, from: 0.1 },
      { text: 'חום', x: 226, y: metY(16), from: 0.12, until: 0.92 },
      { text: 'שיש וצפחה', x: 320, y: metY(92), from: 0.84 },
    ],
  },
};

/** Hand-specimen photo of the rock family (tabs + sample card). */
export function RockSpecimen({ kind, className }: { kind: RockKind; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
    <img
      src={`${BASE}/specimens/${kind}.webp`}
      alt=""
      aria-hidden
      width={480}
      height={480}
      draggable={false}
      className={cn('block object-cover', className)}
    />
  );
}

export function RockDiorama({ kind, reduce }: { kind: RockKind; reduce: boolean }) {
  const film = FILMS[kind];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tlRef = useRef<Timelapse | null>(null);
  // inView: enough of the figure is showing to play; touching: any part of it is still in the viewport
  const inView = useInView(wrapRef, { amount: 0.35 });
  const touching = useInView(wrapRef, { amount: 'some' });
  const [mode, setMode] = useState<'loading' | 'gl' | 'fallback'>('loading');
  const [p, setP] = useState(reduce ? 1 : 0);
  const pRef = useRef(p);

  const setProgress = (next: number) => {
    pRef.current = next;
    setP(next);
  };

  // upload the film's images and compile this rock's shader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    createTimelapse(canvas, film.images, SHADERS[kind]).then(
      (tl) => {
        if (!alive) return tl.dispose();
        tlRef.current = tl;
        tl.draw(pRef.current, 0);
        setMode('gl');
      },
      () => alive && setMode('fallback'),
    );
    const ro = new ResizeObserver(() => {
      tlRef.current?.resize();
      tlRef.current?.draw(pRef.current, performance.now() / 1000);
    });
    ro.observe(canvas);
    return () => {
      alive = false;
      ro.disconnect();
      tlRef.current?.dispose();
      tlRef.current = null;
    };
  }, [kind, film]);

  // The one clock. State machine (p = process progress 0..1):
  //   reduced motion          p = 1, nothing runs
  //   figure fully off-screen p reset to 0 (armed: the next view replays from the start)
  //   ≥ 35% in view, p < 1    p advances in real time (stops while the document is hidden)
  //   p = 1                   the final state is held, the loop ends
  useEffect(() => {
    if (mode === 'loading') return;
    if (reduce) {
      if (pRef.current !== 1) setProgress(1);
      tlRef.current?.draw(1, 0);
      return;
    }
    if (!touching) {
      if (pRef.current !== 0) setProgress(0);
      tlRef.current?.draw(0, 0);
      return;
    }
    if (!inView || pRef.current >= 1) {
      tlRef.current?.draw(pRef.current, 0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = document.hidden ? 0 : Math.max(0, Math.min(now - last, 100));
      last = now;
      const next = Math.min(1, pRef.current + dt / film.duration);
      if (next !== pRef.current) setProgress(next);
      tlRef.current?.draw(next, now / 1000);
      if (next < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, inView, touching, reduce, film.duration]);

  return (
    <div ref={wrapRef}>
      <div role="img" aria-label={film.description} className="relative aspect-video">
        <canvas ref={canvasRef} className={cn('absolute inset-0 size-full', mode === 'fallback' && 'hidden')} />
        {mode === 'fallback' && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
            <img src={film.images.start} alt="" className="absolute inset-0 size-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
            <img
              src={film.images.end}
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{ opacity: ease(seg(p, 0.2, 0.85)) }}
            />
          </>
        )}
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden className="pointer-events-none absolute inset-0 size-full">
          <Diagram kind={kind} p={p} />
          {film.labels.map((l, i) => {
            const shown = mode !== 'loading' && p >= l.from && (l.until === undefined || p < l.until);
            return (
              <motion.g
                key={`${l.text}-${i}`}
                initial={false}
                animate={{ opacity: shown ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.4 }}
              >
                <Tag x={l.x} y={l.y} text={l.text} to={l.to} />
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Diagram marks that belong to the explanation, drawn in step with the process. */
function Diagram({ kind, p }: { kind: RockKind; p: number }) {
  if (kind === 'sediment') {
    // the pile grows: the arrow rises from the basin floor and its tip follows the top of the deposit
    const { x, z, o } = SED.arrow;
    const bottom = sedY(z[0]) - 2;
    const tip = sedY(sedTop(p, z, o));
    const show = p >= 0.12;
    return (
      <motion.g initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.4 }}>
        {tip < bottom - 20 && (
          <polygon
            points={arrowPoints(x, bottom, x, tip, 7, 14, 20)}
            fill="#FDFBF3"
            stroke={INK_SOFT}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        )}
      </motion.g>
    );
  }
  if (kind === 'metamorphic') {
    // the vice: both sides push in, the arrow tips moving with the rock they press on as the
    // section shortens
    const { xc, k, arrows } = MET;
    const tip = xc + (arrows.tip - xc) * (1 - k * metF(p));
    const y = metY(arrows.z);
    const show = p >= 0.1;
    return (
      <motion.g initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.4 }}>
        {(
          [
            [tip, 1],
            [VB_W - tip, -1],
          ] as const
        ).map(([to, dir]) => (
          <polygon
            key={dir}
            points={arrowPoints(to - dir * arrows.len, y, to, y, 10, 18, 26)}
            fill="#FDFBF3"
            stroke={INK_SOFT}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ))}
      </motion.g>
    );
  }
  return null;
}
