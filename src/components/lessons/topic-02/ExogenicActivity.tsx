'use client';
/**
 * ExogenicActivity — the processes at work on the exogenic landscape
 * (ExogenicVisual in GeologyVisuals.tsx): rain falling through the scene's
 * space and splashing where it lands, the runoff trickling down the land's
 * real flow paths into the stream, the stream flowing (and swelling after the
 * rain), sand hopping over the dunes in a gust, and a block breaking off the
 * cliff and rolling down to the scree.
 *
 * Every point comes from scripts/media/render-geology-forces.cjs, projected
 * through the camera of the painted terrain (exogenicOverlay.data.ts), so the
 * drops are cut where the cloud hides them and stop where they meet the land.
 * One master cycle (CYCLE s) staggers the effects over a calm baseline (the
 * stream's gentle flow). A single subscription to the process clock writes
 * the SVG attributes, so nothing moves while the clock is paused (off screen,
 * hidden tab) and reduced motion is one still frame.
 */
import { useEffect, useId, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import { DROPS, DROPS_PER_SLOT, DUNES, ROCKS, RUNOFF, STREAM, STREAM_JOIN, TURBID, VEIL, type ExoDrop } from './exogenicOverlay.data';

type Pt = readonly [number, number];

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const hash = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

// ── The master cycle (seconds within it) ────────────────────────────────────
/** rain → runoff and the stream's swell → a gust over the dunes → a rockfall */
const CYCLE = 15;
const cyc = (t: number) => ((t % CYCLE) + CYCLE) % CYCLE;
const rainAt = (c: number) => smooth(0.3, 1.3, c) * (1 - smooth(3.6, 5, c));
/** The runoff's wet front leaves the scree at 1.2 s and reaches the stream ≈ 3.3 s. */
const FRONT = { from: 1.2, speed: 170 }; // world units / s
const runoffFlowAt = (c: number) => smooth(1.2, 2.2, c) * (1 - smooth(5.2, 7.2, c));
const runoffWetAt = (c: number) => smooth(1.2, 2, c) * (1 - smooth(6.6, 10, c));
/** The stream swells as the runoff arrives, then relaxes. */
const swellAt = (c: number) => smooth(3.6, 5.4, c) * (1 - smooth(7.4, 10.4, c));
/** The gust over the dunes. */
const gustAt = (c: number) => smooth(7.6, 8.5, c) * (1 - smooth(10.4, 11.4, c));
const GUST_FROM = 7.8;
/**
 * A wind streak (k = 0…2) at time t: it sweeps downwind, staggered, with each
 * gust, and stays faint while the air is calm.
 */
export function windSweep(t: number, k: number) {
  const c = cyc(t);
  const g = gustAt(c);
  const ph = ((((c - GUST_FROM + 0.1 - 0.45 * k) / 2.2) % 1) + 1) % 1;
  return { x: (12 - 22 * ph) * smooth(0, 0.35, g), opacity: Math.max(0.2 * (1 - g), 0.85 * Math.sin(Math.PI * ph) * g) };
}
/** The rockfall: the block loosens, falls, rests on the scree and fades before the cycle ends. */
const ROCK_T = { loosen: 11.5, fall: 11.75, fadeFrom: 14.6, fadeTo: 14.95 };
/** The moment reduced motion shows: rain at depth (some of it falling behind the knoll), the rills running into the stream. */
export const EXO_STILL_T = 3.4;

// ── Rain ────────────────────────────────────────────────────────────────────
const RAIN = { speed: 210, streak: 19, splash: 0.4 }; // world units / s, world units of motion blur, s
/** Near → far: stroke width, opacity, colour (far drops are thinner, fainter, hazier). */
const DROP_LOOK = [
  { w: 2.1, o: 0.88, c: '#4A7385' },
  { w: 1.75, o: 0.8, c: '#567E90' },
  { w: 1.4, o: 0.72, c: '#6A8B9B' },
  { w: 1.2, o: 0.7, c: '#728F9D' },
] as const;
const depthClass = (d: ExoDrop) => Math.min(3, Math.floor(d.dep * 4));

/** Each slot of the shower falls along its paths in turn, with a short gap between drops. */
const SLOTS = Array.from({ length: DROPS.length / DROPS_PER_SLOT }, (_, s) => {
  const paths = Array.from({ length: DROPS_PER_SLOT }, (_, k) => DROPS[s * DROPS_PER_SLOT + k]);
  const offs: number[] = [];
  let acc = 0;
  for (let k = 0; k < paths.length; k++) {
    offs.push(acc);
    acc += paths[k].len / RAIN.speed + 0.05 + 0.24 * hash(s, k + 7);
  }
  return { paths, offs, period: acc, phase: hash(s, 3) * acc, theta: 0.06 + 0.86 * hash(s, 5) };
});

/** The longest part of [u0, u1] the camera sees. */
function visiblePart(d: ExoDrop, u0: number, u1: number): [number, number] | null {
  let best: [number, number] | null = null;
  for (const [a, b] of d.vis) {
    const lo = Math.max(a, u0);
    const hi = Math.min(b, u1);
    if (hi > lo && (!best || hi - lo > best[1] - best[0])) best = [lo, hi];
  }
  return best;
}

/** The shower's slant on screen (dx per dy), for the sheets' streak texture. */
const SLANT = DROPS.reduce((s, d) => s + (d.b[0] - d.a[0]) / (d.b[1] - d.a[1]), 0) / DROPS.length;
/** The streak texture's tile (viewBox units), its fall speed on screen, and its streaks (irregular, so it never reads as a hatch). */
const SHEET = { w: 19, h: 44, speed: 150 };
const SHEET_STREAKS = Array.from({ length: 24 }, (_, i) => {
  const x = (SHEET.w * (i + 0.5 * hash(i, 41))) / 24;
  const y = SHEET.h * hash(i, 42);
  const len = 4 + 7 * hash(i, 43);
  return `M${f2(x)} ${f2(y)}v${f2(Math.min(len, SHEET.h - y))}${y + len > SHEET.h ? `M${f2(x)} 0v${f2(y + len - SHEET.h)}` : ''}`;
}).join('');

const ellipse = (c: Pt, rx: number, ry: number) =>
  `M${f2(c[0] - rx)} ${f2(c[1])}a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(-2 * rx)} 0`;

/** The shower at time t: streaks per depth class (tails, heads), splash rings (young / old) and wet spots. */
function rainFrame(t: number) {
  const tails: string[] = ['', '', '', ''];
  const heads: string[] = ['', '', '', ''];
  const rings = ['', ''];
  const wet: string[] = [];
  const splash = (d: ExoDrop, age: number) => {
    if (age < 0 || age > RAIN.splash || !d.land || !d.splash[0]) return;
    const k = age / RAIN.splash;
    const g = 0.4 + 0.9 * Math.pow(k, 0.6);
    rings[k < 0.45 ? 0 : 1] += ellipse(d.b, d.splash[0] * g, d.splash[1] * g);
    wet.push(ellipse(d.b, d.splash[0] * 0.7, d.splash[1] * 0.7));
  };
  for (let s = 0; s < SLOTS.length; s++) {
    const S = SLOTS[s];
    const local = (((t + S.phase) % S.period) + S.period) % S.period;
    const loop = t - local;
    let k = S.offs.length - 1;
    while (k > 0 && S.offs[k] > local) k--;
    const on = (j: number, start: number) => rainAt(cyc(start)) > S.theta + 0.04 * j;
    // the drop now falling (or waiting) on this slot
    const d = S.paths[k];
    const start = loop + S.offs[k];
    const dur = d.len / RAIN.speed;
    const u = (t - start) / dur;
    if (on(k, start)) {
      if (u < 1) {
        const tail = u - (RAIN.streak * [1.25, 1.05, 0.9, 0.9][depthClass(d)]) / d.len;
        const part = visiblePart(d, Math.max(0, tail), u);
        if (part) {
          const p = lerp(d.a, d.b, part[0]);
          const m = lerp(d.a, d.b, part[0] + 0.55 * (part[1] - part[0]));
          const q = lerp(d.a, d.b, part[1]);
          tails[depthClass(d)] += `M${f1(p[0])} ${f1(p[1])}L${f1(m[0])} ${f1(m[1])}`;
          heads[depthClass(d)] += `M${f1(m[0])} ${f1(m[1])}L${f1(q[0])} ${f1(q[1])}`;
        }
      } else splash(d, t - start - dur);
    }
    // the previous drop's splash may still be spreading
    const pk = k > 0 ? k - 1 : S.paths.length - 1;
    const pd = S.paths[pk];
    const pStart = k > 0 ? loop + S.offs[pk] : loop - S.period + S.offs[pk];
    if (on(pk, pStart)) splash(pd, t - pStart - pd.len / RAIN.speed);
  }
  return { tails, heads, rings, wet: wet.join('') };
}

// ── Runoff ──────────────────────────────────────────────────────────────────
const RILLS = RUNOFF.map((r) => {
  const cum = [0];
  for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
  return { ...r, cum };
});
/** The rill's polyline from its head down to the fraction u of its length. */
function rillTo(r: (typeof RILLS)[number], u: number) {
  const L = u * r.cum[r.cum.length - 1];
  let d = `M${f1(r.pts[0][0])} ${f1(r.pts[0][1])}`;
  for (let i = 1; i < r.pts.length; i++) {
    if (r.cum[i] >= L) {
      const p = lerp(r.pts[i - 1], r.pts[i], (L - r.cum[i - 1]) / Math.max(1e-6, r.cum[i] - r.cum[i - 1]));
      return `${d}L${f1(p[0])} ${f1(p[1])}`;
    }
    d += `L${f1(r.pts[i][0])} ${f1(r.pts[i][1])}`;
  }
  return d;
}

// ── The stream ──────────────────────────────────────────────────────────────
const S_TOTAL = STREAM[STREAM.length - 1][3];
const S_JOIN = STREAM[STREAM_JOIN][3];
/** A point on the stream at world distance s from its far end: x, y, water half-width, haze, seen. */
function streamAt(s: number) {
  const v = Math.min(S_TOTAL, Math.max(0, s));
  let i = 1;
  while (i < STREAM.length - 1 && STREAM[i][3] < v) i++;
  const a = STREAM[i - 1];
  const b = STREAM[i];
  const u = (v - a[3]) / Math.max(1e-6, b[3] - a[3]);
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, hw: a[2] + (b[2] - a[2]) * u, haze: a[4] + (b[4] - a[4]) * u, seen: a[5] && b[5] };
}
const FLOW = { speed: 16, swell: 0.8 }; // world units / s; extra speed at the height of the swell
/** ∫ swell dt over one cycle, tabulated (the flow runs faster while the stream is swollen). */
const SWELL_TAB = (() => {
  const n = 300;
  const tab = [0];
  for (let i = 1; i <= n; i++) tab.push(tab[i - 1] + (swellAt(((i - 0.5) * CYCLE) / n) * CYCLE) / n);
  return tab;
})();
function flowClock(t: number) {
  const n = SWELL_TAB.length - 1;
  const x = (cyc(t) / CYCLE) * n;
  const i = Math.floor(x);
  const swollen = Math.floor(t / CYCLE) * SWELL_TAB[n] + SWELL_TAB[i] + (SWELL_TAB[Math.min(n, i + 1)] - SWELL_TAB[i]) * (x - i);
  return t + FLOW.swell * swollen;
}
const GLINTS = Array.from({ length: 34 }, (_, i) => ({ s0: hash(i, 11) * S_TOTAL, lat: (hash(i, 12) - 0.5) * 1.1, len: 3.5 + 5 * hash(i, 13), v: 0.8 + 0.4 * hash(i, 14), dim: hash(i, 15) < 0.45 ? 1 : 0 }));
const SILT = Array.from({ length: 10 }, (_, i) => ({ s0: hash(i, 21), lat: (hash(i, 22) - 0.5) * 0.6, len: 9 + 7 * hash(i, 23), v: 1.1 + 0.25 * hash(i, 24) }));

function streamFrame(t: number, swell: number) {
  const glints = ['', '', '', '', '', ''];
  const troughs = ['', '', ''];
  const ft = flowClock(t);
  const seg = (s: number, len: number, lat: number) => {
    const h = streamAt(s);
    const b = streamAt(s - len);
    if (!h.seen || !b.seen) return null;
    return { d: `M${f1(b.x + lat * b.hw)} ${f1(b.y)}L${f1(h.x + lat * h.hw)} ${f1(h.y)}`, haze: h.haze };
  };
  for (const g of GLINTS) {
    const s = (((g.s0 + FLOW.speed * g.v * ft) % S_TOTAL) + S_TOTAL) % S_TOTAL;
    const p = seg(s, g.len, g.lat);
    if (!p) continue;
    const band = p.haze > 0.6 ? 2 : p.haze > 0.25 ? 1 : 0;
    glints[band + 3 * g.dim] += p.d;
    // the darker trough just upstream of each bright crest: a wavelet moving downstream
    if (!g.dim) {
      const q = seg(s - g.len - 0.6, g.len * 0.8, g.lat * 0.8);
      if (q) troughs[band] += q.d;
    }
  }
  // silt: turbid streaks below the junction while the stream is swollen
  let silt = '';
  if (swell > 0.02)
    for (let i = 0; i < SILT.length; i++) {
      if (i / SILT.length > swell) continue;
      const g = SILT[i];
      const run = S_TOTAL - S_JOIN;
      const s = S_JOIN + ((((g.s0 * run + FLOW.speed * g.v * ft) % run) + run) % run);
      const p = seg(s, g.len, g.lat);
      if (p) silt += p.d;
    }
  return { glints, troughs, silt };
}

// ── Dunes: saltation in the gust ────────────────────────────────────────────
const CREST_U = (d: (typeof DUNES)[number]) => d.crest / (d.pts.length - 1);
const GRAINS = DUNES.flatMap((d, p) =>
  Array.from({ length: 14 }, (_, i) => ({
    p,
    u0: 0.02 + 0.45 * hash(p * 14 + i, 31),
    hop: 0.09 + 0.06 * hash(p * 14 + i, 32),
    period: 0.2 + 0.08 * hash(p * 14 + i, 33),
    delay: 2.4 * hash(p * 14 + i, 34),
    h: 2 + 1.4 * hash(p * 14 + i, 35),
  })),
);
/** A point on a dune path at fraction u, lifted h world units. */
function dunePoint(d: (typeof DUNES)[number], u: number, h: number): Pt {
  const x = Math.min(1, Math.max(0, u)) * (d.pts.length - 1);
  const i = Math.min(d.pts.length - 2, Math.floor(x));
  const p = lerp(d.pts[i], d.pts[i + 1], x - i);
  return [p[0], p[1] - h * d.up];
}
/** A grain at cycle time c: where it is, and whether it has settled on the lee. */
function grainAt(g: (typeof GRAINS)[number], c: number) {
  const d = DUNES[g.p];
  const k = (c - GUST_FROM - g.delay) / g.period;
  if (k < 0) return null;
  const n = Math.floor(k);
  const phase = k - n;
  // the gust stops lifting grains as it fades; one in flight lands
  if (gustAt(GUST_FROM + g.delay + n * g.period) < 0.35 && n > 0) {
    const u = Math.min(1, g.u0 + g.hop * n);
    return { pt: dunePoint(d, u, 0), ground: null, u, flying: false };
  }
  const u = g.u0 + g.hop * (n + phase);
  if (u >= 1) return { pt: dunePoint(d, 1, 0), ground: null, u: 1, flying: false };
  const ground = dunePoint(d, u, 0);
  // a low, skewed hop (steep lift-off, long flat descent); over the crest it drops down the slip face
  const arc = 4 * Math.pow(phase, 0.7) * (1 - Math.pow(phase, 0.7));
  const lift = u < CREST_U(d) ? g.h * arc : g.h * arc * 0.5;
  return { pt: dunePoint(d, u, lift), ground, u, flying: true };
}

/** Spindrift: wisps of sand torn off each crest, carried downwind (west) as they thin out. */
const WISP = { per: 2, life: 1.7 };
function wispAt(i: number, j: number, c: number) {
  const g = gustAt(c);
  const a = (c - GUST_FROM - j * (WISP.life / WISP.per) - 0.37 * i) / WISP.life;
  if (g < 0.01 || a < 0) return null;
  const age = a - Math.floor(a);
  const d = DUNES[i];
  const p = d.pts[d.crest];
  const k = d.up * 1.8;
  return {
    x: p[0] - 13 * k * Math.pow(age, 0.8),
    y: p[1] - 0.8 * k - 1.6 * k * age,
    sx: k * (0.6 + 1.3 * age),
    sy: k * (0.7 + 0.5 * age),
    o: g * Math.pow(Math.sin(Math.PI * age), 1.2),
  };
}

function duneFrame(c: number) {
  let flying = '';
  let settled = '';
  let shadows = '';
  for (const g of GRAINS) {
    const now = grainAt(g, c);
    if (!now) continue;
    if (now.flying) {
      const was = grainAt(g, c - 0.05);
      const a = was ? was.pt : now.pt;
      flying += `M${f1(a[0])} ${f1(a[1])}L${f1(now.pt[0])} ${f1(now.pt[1])}`;
      if (now.ground) shadows += `M${f1(now.ground[0] + 0.5)} ${f1(now.ground[1] + 0.3)}h0.01`;
    } else settled += `M${f1(now.pt[0])} ${f1(now.pt[1])}h0.01`;
  }
  return { flying, settled, shadows };
}

// ── Rockfall ────────────────────────────────────────────────────────────────
/**
 * The block (unit radius): an irregular silhouette with a top and a shaded
 * flank that tumble with it; the sun's highlight stays put (upper left).
 */
const BLOCK = '-1,-0.55 -0.45,-0.95 0.5,-0.9 1,-0.2 0.8,0.6 0.1,0.95 -0.7,0.75';
const BLOCK_TOP = '-1,-0.55 -0.45,-0.95 0.5,-0.9 0.4,-0.15 -0.15,0.1';
const BLOCK_FLANK = '1,-0.2 0.8,0.6 0.1,0.95 -0.15,0.1 0.4,-0.15';

function rockFrame(t: number) {
  const c = cyc(t);
  const n = Math.floor(t / CYCLE);
  const rock = ROCKS[((n % ROCKS.length) + ROCKS.length) % ROCKS.length];
  const size = rock.k * 8.2;
  if (c < ROCK_T.loosen) return null;
  const fade = 1 - smooth(ROCK_T.fadeFrom, ROCK_T.fadeTo, c);
  const p0 = rock.pts[0];
  if (c < ROCK_T.fall) {
    // it loosens: appears at the rim and rocks a little
    const k = (c - ROCK_T.loosen) / (ROCK_T.fall - ROCK_T.loosen);
    return { x: p0[0] + 0.25 * Math.sin(k * 40), y: p0[1], a: 4 * Math.sin(k * 30), size, o: smooth(0, 0.6, k), rest: 0, dust: [] as number[][] };
  }
  const tf = c - ROCK_T.fall;
  const x = Math.min(rock.pts.length - 1.001, tf * 60);
  const i = Math.floor(x);
  const a = rock.pts[i];
  const b = rock.pts[i + 1];
  const u = x - i;
  // dust where it strikes the ground (and a little where it breaks away)
  const dust = [[0.02, p0[0], p0[1] + 1, 0.35], ...rock.impacts]
    .map(([ti, ix, iy, k]) => [tf - ti, ix, iy, k])
    .filter(([age]) => age >= 0 && age < 0.9);
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: a[2] + (b[2] - a[2]) * u, size, o: fade, rest: smooth(rock.dur - 0.3, rock.dur + 0.2, tf), dust };
}

// ── The component ───────────────────────────────────────────────────────────
const set = (el: Element | null | undefined, name: string, v: string) => {
  if (el && el.getAttribute(name) !== v) el.setAttribute(name, v);
};

/**
 * The exogenic processes, drawn in the 560 × 360 forces frame from the process
 * clock (seconds; frozen at EXO_STILL_T for reduced motion).
 */
export function ExogenicActivity({ clock }: { clock: MotionValue<number> }) {
  const ids = `exo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const root = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = root.current;
    if (!g) return;
    const q = (k: string) => g.querySelector(`[data-k="${k}"]`);
    const el = {
      veil: VEIL.map((_, i) => q(`veil${i}`)),
      sheet: VEIL.map((_, i) => q(`sheet${i}`)),
      sheetPattern: g.querySelector('pattern'),
      tails: DROP_LOOK.map((_, i) => q(`tail${i}`)),
      heads: DROP_LOOK.map((_, i) => q(`drops${i}`)),
      rings: [q('ring0'), q('ring1')],
      wet: q('wet'),
      rillWet: RILLS.map((_, i) => q(`rillwet${i}`)),
      rillWater: RILLS.map((_, i) => q(`rillwater${i}`)),
      rillGlint: RILLS.map((_, i) => q(`rillglint${i}`)),
      glints: [0, 1, 2, 3, 4, 5].map((i) => q(`glint${i}`)),
      troughs: [0, 1, 2].map((i) => q(`trough${i}`)),
      silt: q('silt'),
      turbid: q('turbid'),
      flying: q('flying'),
      grainShadows: q('grainshadows'),
      settled: q('settled'),
      wisps: DUNES.flatMap((_, i) => Array.from({ length: WISP.per }, (_, j) => q(`wisp${i}-${j}`))),
      rock: q('rock'),
      rockShadow: q('rockshadow'),
      rockSpin: q('rockspin'),
      dust: [0, 1, 2, 3].map((i) => q(`dust${i}`)),
    };
    const draw = (t: number) => {
      const c = cyc(t);
      // rain
      const rain = rainAt(c);
      const r = rainFrame(t);
      r.tails.forEach((d, i) => set(el.tails[i], 'd', d || 'M0 0'));
      r.heads.forEach((d, i) => set(el.heads[i], 'd', d || 'M0 0'));
      set(el.rings[0], 'd', r.rings[0] || 'M0 0');
      set(el.rings[1], 'd', r.rings[1] || 'M0 0');
      set(el.wet, 'd', r.wet || 'M0 0');
      VEIL.forEach((v, i) => {
        set(el.veil[i], 'opacity', f2(rain * (v.cut ? 0.55 : 0.85 - 0.4 * v.dep)));
        set(el.sheet[i], 'opacity', f2(rain * (v.cut ? 0.95 : 0.8 - 0.3 * v.dep)));
      });
      set(el.sheetPattern, 'patternTransform', `skewX(${f1((Math.atan(SLANT) * 180) / Math.PI)}) translate(0 ${f2((t * SHEET.speed) % SHEET.h)})`);
      // runoff: the wet front runs down the rills, water trickles in them, then they dry
      const front = Math.max(0, c - FRONT.from) * FRONT.speed;
      const flow = runoffFlowAt(c);
      const wet = runoffWetAt(c);
      RILLS.forEach((rl, i) => {
        const u = Math.min(1, front / rl.wl);
        const d = wet > 0.005 && u > 0 ? rillTo(rl, u) : 'M0 0';
        set(el.rillWet[i], 'd', d);
        set(el.rillWet[i], 'opacity', f2(wet));
        set(el.rillWater[i], 'd', flow > 0.005 ? d : 'M0 0');
        set(el.rillWater[i], 'opacity', f2(flow));
        set(el.rillGlint[i], 'd', flow > 0.005 ? d : 'M0 0');
        set(el.rillGlint[i], 'opacity', f2(flow));
        set(el.rillGlint[i], 'stroke-dashoffset', f1(-24 * t - 7 * i));
      });
      // the stream
      const swell = swellAt(c);
      const s = streamFrame(t, swell);
      s.glints.forEach((d, i) => set(el.glints[i], 'd', d || 'M0 0'));
      s.troughs.forEach((d, i) => set(el.troughs[i], 'd', d || 'M0 0'));
      set(el.silt, 'd', s.silt || 'M0 0');
      set(el.silt, 'opacity', f2(swell));
      set(el.turbid, 'opacity', f2(swell));
      // sand in the gust
      const gust = gustAt(c);
      const sand = gust > 0.001 || (c > GUST_FROM && c < 12) ? duneFrame(c) : { flying: '', settled: '', shadows: '' };
      set(el.flying, 'd', sand.flying || 'M0 0');
      set(el.grainShadows, 'd', sand.shadows || 'M0 0');
      set(el.settled, 'd', sand.settled || 'M0 0');
      set(el.settled, 'opacity', f2(1 - smooth(10.6, 11.4, c)));
      el.wisps.forEach((e, n) => {
        const w = wispAt(Math.floor(n / WISP.per), n % WISP.per, c);
        set(e, 'opacity', w ? f2(w.o) : '0');
        if (w) set(e, 'transform', `translate(${f1(w.x)} ${f1(w.y)}) scale(${f2(w.sx)} ${f2(w.sy)})`);
      });
      // the rockfall
      const rk = rockFrame(t);
      set(el.rock, 'opacity', rk ? f2(rk.o) : '0');
      if (rk) {
        set(el.rock, 'transform', `translate(${f2(rk.x)} ${f2(rk.y)}) scale(${f2(rk.size)})`);
        set(el.rockSpin, 'transform', `rotate(${f1(rk.a)})`);
      }
      set(el.rockShadow, 'opacity', rk ? f2(rk.o * rk.rest * 0.5) : '0');
      if (rk) set(el.rockShadow, 'transform', `translate(${f2(rk.x + 0.6 * rk.size)} ${f2(rk.y + 0.75 * rk.size)}) scale(${f2(rk.size)})`);
      el.dust.forEach((e, i) => {
        const d = rk?.dust[i];
        if (!d) return set(e, 'opacity', '0');
        const [age, x, y, k] = d;
        const grow = 1.6 + 5.4 * Math.sqrt(age / 0.9) * (0.5 + k);
        set(e, 'transform', `translate(${f1(x)} ${f1(y - 0.6 - 1.2 * age)}) scale(${f2(grow)} ${f2(grow * 0.7)})`);
        set(e, 'opacity', f2(0.95 * (0.5 + 0.5 * k) * Math.pow(1 - age / 0.9, 1.2) * (rk?.o ?? 1)));
      });
    };
    draw(clock.get());
    return clock.on('change', draw);
  }, [clock]);

  const turbid = `M${TURBID.map((p) => p.join(' ')).join('L')}Z`;
  // each sheet's bounding box (its sides fade out)
  const veilBox = VEIL.map((v) => {
    const xs = v.pts.map((p) => p[0]);
    const ys = v.pts.map((p) => p[1]);
    return { x0: Math.min(...xs) - 3, x1: Math.max(...xs) + 3, y0: Math.min(...ys) - 6, y1: Math.max(...ys) + 6 };
  });
  return (
    <g ref={root} aria-hidden="true">
      <defs>
        {/* a sheet that reaches the ground thins out toward it; one hidden behind a crest stays dense to its foot, so the crest cuts it */}
        {VEIL.map((v, i) => {
          const ys = v.pts.map((p) => p[1]);
          return (
            <linearGradient key={i} id={`${ids}-veil${i}`} gradientUnits="userSpaceOnUse" x1={0} y1={Math.min(...ys)} x2={0} y2={Math.max(...ys)}>
              <stop offset="0" stopColor="#8396A0" stopOpacity={v.cut ? 0.36 : 0.42} />
              <stop offset="0.55" stopColor="#90A2AA" stopOpacity={v.cut ? 0.3 : 0.22} />
              <stop offset="1" stopColor="#A3B1B6" stopOpacity={v.cut ? 0.26 : 0} />
            </linearGradient>
          );
        })}
        {/* where each sheet's streaks show: all the way down to a crest that cuts it, else fading toward the ground */}
        {VEIL.map((v, i) => {
          const ys = v.pts.map((p) => p[1]);
          return (
            <g key={i}>
              <linearGradient id={`${ids}-sheetfade${i}`} gradientUnits="userSpaceOnUse" x1={0} y1={Math.min(...ys)} x2={0} y2={Math.max(...ys)}>
                <stop offset="0" stopColor="#fff" stopOpacity={1} />
                <stop offset="0.6" stopColor="#fff" stopOpacity={v.cut ? 1 : 0.7} />
                <stop offset="1" stopColor="#fff" stopOpacity={v.cut ? 1 : 0} />
              </linearGradient>
              <mask id={`${ids}-sheetmask${i}`} maskUnits="userSpaceOnUse">
                <polygon points={v.pts.map((p) => p.join(',')).join(' ')} fill={`url(#${ids}-sheetfade${i})`} />
              </mask>
            </g>
          );
        })}
        {/* the streak texture: thin, broken rain streaks, slanted with the wind and falling */}
        <pattern id={`${ids}-rainpat`} patternUnits="userSpaceOnUse" width={SHEET.w} height={SHEET.h}>
          <path d={SHEET_STREAKS} fill="none" stroke="#5F7C8B" strokeOpacity={0.6} strokeWidth={0.7} strokeLinecap="round" />
        </pattern>
        {veilBox.map((b, i) => (
          <g key={i}>
            <linearGradient id={`${ids}-veilfade${i}`} gradientUnits="userSpaceOnUse" x1={b.x0} y1={0} x2={b.x1} y2={0}>
              <stop offset="0" stopColor="#fff" stopOpacity={0} />
              <stop offset="0.28" stopColor="#fff" stopOpacity={1} />
              <stop offset="0.72" stopColor="#fff" stopOpacity={1} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <mask id={`${ids}-veilmask${i}`} maskUnits="userSpaceOnUse" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0}>
              <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill={`url(#${ids}-veilfade${i})`} />
            </mask>
          </g>
        ))}
        <filter id={`${ids}-bank`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={0.7} />
        </filter>
        <filter id={`${ids}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.2} />
        </filter>
        <filter id={`${ids}-softcut`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.6} />
        </filter>
        <radialGradient id={`${ids}-lit`}>
          <stop offset="0" stopColor="#F3EAD8" stopOpacity={0.85} />
          <stop offset="1" stopColor="#F3EAD8" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${ids}-dust`}>
          <stop offset="0" stopColor="#CDBF9F" stopOpacity={1} />
          <stop offset="0.55" stopColor="#D3C6A9" stopOpacity={0.55} />
          <stop offset="1" stopColor="#D8CCB2" stopOpacity={0} />
        </radialGradient>
        {/* a wisp of spindrift: densest at its upwind end, soft all round */}
        <radialGradient id={`${ids}-drift`} cx="0.6" cy="0.5" r="0.5" fx="0.72" fy="0.5">
          <stop offset="0" stopColor="#FBF3E0" stopOpacity={0.95} />
          <stop offset="0.5" stopColor="#F4E6C7" stopOpacity={0.55} />
          <stop offset="1" stopColor="#EAD5A9" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* the stream: swollen, silty water below the junction; ripples moving downstream */}
      <path data-k="turbid" d={turbid} fill="#9A7647" fillOpacity={0.9} opacity={0} filter={`url(#${ids}-bank)`} />
      {[
        { w: 1.5, o: 0.42 },
        { w: 1.2, o: 0.34 },
        { w: 0.95, o: 0.26 },
      ].map((s, i) => (
        <path key={i} data-k={`trough${i}`} d="M0 0" fill="none" stroke="#2C5F72" strokeOpacity={s.o} strokeWidth={s.w} strokeLinecap="round" />
      ))}
      {[
        { w: 1.6, o: 0.9 },
        { w: 1.3, o: 0.75 },
        { w: 1, o: 0.55 },
        { w: 1.3, o: 0.5 },
        { w: 1.05, o: 0.4 },
        { w: 0.85, o: 0.3 },
      ].map((s, i) => (
        <path key={i} data-k={`glint${i}`} d="M0 0" fill="none" stroke="#EEF7F8" strokeOpacity={s.o} strokeWidth={s.w} strokeLinecap="round" />
      ))}
      <path data-k="silt" d="M0 0" fill="none" stroke="#B39566" strokeOpacity={0.85} strokeWidth={2.6} strokeLinecap="round" opacity={0} />

      {/* runoff: the damp trace of each rill, the water in it and its surges running down */}
      {RILLS.map((_, i) => (
        <g key={i}>
          <path data-k={`rillwet${i}`} d="M0 0" fill="none" stroke="#74603F" strokeOpacity={0.3} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" opacity={0} />
          <path data-k={`rillwater${i}`} d="M0 0" fill="none" stroke="#6A97A8" strokeOpacity={0.55} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" opacity={0} />
          <path data-k={`rillglint${i}`} d="M0 0" fill="none" stroke="#CFE6EC" strokeOpacity={0.5} strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 16" opacity={0} />
        </g>
      ))}

      {/* sand: grains hopping up the windward slopes, spindrift off the crests, grains settled on the lee */}
      {DUNES.flatMap((_, i) =>
        Array.from({ length: WISP.per }, (_, j) => <ellipse key={`${i}-${j}`} data-k={`wisp${i}-${j}`} rx={7.5} ry={2.2} fill={`url(#${ids}-drift)`} opacity={0} />),
      )}
      <path data-k="settled" d="M0 0" fill="none" stroke="#B8905A" strokeOpacity={0.7} strokeWidth={1.2} strokeLinecap="round" />
      <path data-k="grainshadows" d="M0 0" fill="none" stroke="#7B5D37" strokeOpacity={0.42} strokeWidth={1.3} strokeLinecap="round" />
      <path data-k="flying" d="M0 0" fill="none" stroke="#FBF1DA" strokeOpacity={0.95} strokeWidth={1.55} strokeLinecap="round" />

      {/* the rockfall: a block off the cap rock, dust where it strikes */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} data-k={`dust${i}`} r={3.4} fill={`url(#${ids}-dust)`} opacity={0} />
      ))}
      <ellipse data-k="rockshadow" cx={0} cy={0} rx={1.1} ry={0.45} fill="#3F362C" opacity={0} />
      <g data-k="rock" opacity={0}>
        <g data-k="rockspin">
          <polygon points={BLOCK} fill="#AE9874" />
          <polygon points={BLOCK_TOP} fill="#CDBA96" />
          <polygon points={BLOCK_FLANK} fill="#7C6A52" />
        </g>
        <circle cx={-0.35} cy={-0.4} r={0.55} fill={`url(#${ids}-lit)`} />
      </g>

      {/* the rain: a soft veil under the cloud, wet spots and splashes where drops land, the drops */}
      {VEIL.map((v, i) => (
        <g key={i} mask={`url(#${ids}-veilmask${i})`}>
          <polygon data-k={`veil${i}`} points={v.pts.map((p) => p.join(',')).join(' ')} fill={`url(#${ids}-veil${i})`} filter={`url(#${ids}-${v.cut ? 'softcut' : 'soft'})`} opacity={0} />
          <g mask={`url(#${ids}-sheetmask${i})`}>
            <rect data-k={`sheet${i}`} x={veilBox[i].x0} y={veilBox[i].y0} width={veilBox[i].x1 - veilBox[i].x0} height={veilBox[i].y1 - veilBox[i].y0} fill={`url(#${ids}-rainpat)`} opacity={0} />
          </g>
        </g>
      ))}
      <path data-k="wet" d="M0 0" fill="#5B4A39" fillOpacity={0.18} />
      <path data-k="ring0" d="M0 0" fill="none" stroke="#EEF4F4" strokeOpacity={0.6} strokeWidth={0.55} />
      <path data-k="ring1" d="M0 0" fill="none" stroke="#EEF4F4" strokeOpacity={0.28} strokeWidth={0.45} />
      {DROP_LOOK.map((s, i) => (
        <g key={i}>
          <path data-k={`tail${i}`} d="M0 0" fill="none" stroke={s.c} strokeOpacity={s.o * 0.45} strokeWidth={s.w * 0.85} strokeLinecap="round" />
          <path data-k={`drops${i}`} d="M0 0" fill="none" stroke={s.c} strokeOpacity={s.o} strokeWidth={s.w} strokeLinecap="round" />
        </g>
      )).reverse()}
    </g>
  );
}
