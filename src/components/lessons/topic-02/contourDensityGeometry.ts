export type DensityKind = 'gentle' | 'steep' | 'cliff';

// ── Layout (viewBox units) ────────────────────────────────────────────────
const VB_W = 200;
const VB_H = 190;
export const CX = 100; // summit
export const CY = 58;
const ASPECT = 0.56; // map ellipse squash (N–S / E–W)
export const SEC_A = 16; // section line ends (west A → east B, left → right)
export const SEC_B = 184;
const MAP_BOTTOM = 116;
const PROF_TOP = 128;
export const PROF_BASE = 176;
const Z_MAX = 90; // metres shown in the profile
export const Z_SCALE = (PROF_BASE - PROF_TOP) / Z_MAX;

export const SLOTS = [10, 20, 30, 40, 50, 60, 70, 80]; // contour interval = 10 m
export const INDEX_H = 50; // every 5th line = index contour (thicker)
const K = 72; // samples per contour ring
const PROFILE_N = 141;
const LABEL_T = -2.25; // where contour labels sit on their ring (upper-left)

const INK = '#38432E';
/** Brown map-contour ink (= tanline.badge) — contour lines are brown, never the orange action accent. */
const CONTOUR_INK = '#8A6F4D';

/** Mix two #RRGGBB colours (t = 0 → a, t = 1 → b). */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, sh: number) => (p >> sh) & 0xff;
  const m = (sh: number) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t);
  return '#' + ((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0');
}
const GRID = '#EEE5D2';

// ── Height models ─────────────────────────────────────────────────────────
export type Model = {
  H: number; // summit height (m)
  R: (t: number) => number; // horizontal reach of the hill along angle t
  g: (u: number, t: number) => number; // height fraction 1 → 0 as u = r/R goes 0 → 1
};

// Only broad shoulders affect the teaching contours. Fine rock detail belongs
// to the offline surface material, not to jagged, distracting contour rings.
const wobble = (t: number) => 1 + 0.045 * Math.sin(2 * t + 0.7) + 0.025 * Math.cos(3 * t - 0.5);
const roundedSlope = (u: number) => (1 - u * u) ** 2;
const erosion = (u: number, t: number) => u * u * (1 - u) ** 2 * 0.14 * Math.sin(3 * t + 0.8);
const eastness = (t: number) => ((1 + Math.cos(t)) / 2) ** 2; // 1 facing B, 0 facing A

/** Cliff face profile: near-flat top, then a sheer drop over the last 18 %. */
const cliffFace = (u: number) => (u < 0.82 ? 1 - (0.1 * u) / 0.82 : (0.9 * (1 - u)) / 0.18);

export const MODELS: Record<DensityKind, Model> = {
  // Rounded summit and foot; slope density stays legible without star-shaped spurs.
  gentle: { H: 45, R: (t) => 80 * wobble(t), g: (u, t) => roundedSlope(u) + erosion(u, t) * 0.45 },
  steep: { H: 86, R: (t) => 54 * wobble(t), g: (u, t) => roundedSlope(u) + erosion(u, t) },
  // Cuesta: gentle back-slope toward A, sheer wall toward B.
  cliff: {
    H: 86,
    R: (t) => (80 + (36 - 80) * eastness(t)) * (1 + 0.025 * Math.sin(2 * t + 0.7)),
    g: (u, t) => {
      const w = eastness(t);
      return (1 - w) * (roundedSlope(u) + erosion(u, t) * 0.4) + w * cliffFace(u);
    },
  },
};

/** Radius (fraction u of R) at which the hill reaches height fraction f. */
function solveU(m: Model, f: number, t: number) {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 28; n++) {
    const mid = (lo + hi) / 2;
    if (m.g(mid, t) > f) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type Pt = [number, number];

export function ringPoint(m: Model, h: number, t: number): Pt {
  const visible = h < m.H;
  const u = visible ? solveU(m, h / m.H, t) : 0.02; // hidden → collapse on summit
  const r = u * m.R(t);
  return [CX + r * Math.cos(t), CY + r * Math.sin(t) * ASPECT];
}

const f2 = (n: number) => n.toFixed(2);

/** Closed Catmull-Rom → cubic Bézier path; fixed structure so paths morph. */
export function closedPath(pts: Pt[]) {
  const n = pts.length;
  let d = `M${f2(pts[0][0])},${f2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f2(c1[0])},${f2(c1[1])} ${f2(c2[0])},${f2(c2[1])} ${f2(p2[0])},${f2(p2[1])}`;
  }
  return `${d}Z`;
}

export function heightAlongSection(m: Model, x: number) {
  const t = x >= CX ? 0 : Math.PI;
  const u = Math.abs(x - CX) / m.R(t);
  return u >= 1 ? 0 : m.H * m.g(u, t);
}

type Geometry = {
  rings: { h: number; d: string; visible: boolean; label: Pt; xw: number; xe: number }[];
  profile: string;
  profileTop: string;
  hachures: string;
};

function buildGeometry(kind: DensityKind): Geometry {
  const m = MODELS[kind];
  const rings = SLOTS.map((h) => {
    const pts: Pt[] = Array.from({ length: K }, (_, k) => ringPoint(m, h, (k / K) * Math.PI * 2));
    const visible = h < m.H;
    const uw = visible ? solveU(m, h / m.H, Math.PI) : 0.02;
    const ue = visible ? solveU(m, h / m.H, 0) : 0.02;
    return {
      h,
      d: closedPath(pts),
      visible,
      label: ringPoint(m, h, LABEL_T),
      xw: CX - uw * m.R(Math.PI),
      xe: CX + ue * m.R(0),
    };
  });

  const pts: Pt[] = Array.from({ length: PROFILE_N }, (_, i) => {
    const x = SEC_A + ((SEC_B - SEC_A) * i) / (PROFILE_N - 1);
    return [x, PROF_BASE - heightAlongSection(m, x) * Z_SCALE];
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)},${f2(y)}`).join('');
  const profile = `M${SEC_A},${PROF_BASE}L${line.slice(1)}L${SEC_B},${PROF_BASE}Z`;

  // Cliff convention: short teeth on the downhill side of the merged lines.
  let hachures = '';
  if (kind === 'cliff') {
    for (let t = -0.95; t <= 0.951; t += 0.1) {
      const [x, y] = ringPoint(m, SLOTS[0], t);
      const nx = Math.cos(t);
      const ny = Math.sin(t) * ASPECT;
      const len = Math.hypot(nx, ny);
      hachures += `M${f2(x)},${f2(y)}L${f2(x + (nx / len) * 2.6)},${f2(y + (ny / len) * 2.6)}`;
    }
  }

  return { rings, profile, profileTop: line, hachures };
}

// Precompute once — pure data, identical on server and client.
export const GEOMETRY: Record<DensityKind, Geometry> = {
  gentle: buildGeometry('gentle'),
  steep: buildGeometry('steep'),
  cliff: buildGeometry('cliff'),
};

// ── Live blend (the tab morph) ────────────────────────────────────────────
// Mid-switch the terrain is a weighted mix of the height models. Every model
// falls monotonically away from the shared summit, so the mix does too: its
// contours are still found by bisection along each ray, and the map rings, the
// A–B profile and their crossings all come from one surface — a drop-line
// never leaves the ground, at any frame. One-hot weights reproduce GEOMETRY.
export type Weights = Record<DensityKind, number>;

export type Blend = {
  summit: number; // m
  /** on: 0 → 1 as the summit rises through the ring's height (it's born as a point). */
  rings: { h: number; pts: Pt[]; label: Pt; xw: number; xe: number; on: number }[];
  /** A–B ground line as [x, metres], x ascending, every contour crossing a vertex. */
  section: Pt[];
};

const DENSITY_KINDS: DensityKind[] = ['gentle', 'steep', 'cliff'];
const SECTION_DX = 0.5;

export function blendTerrain(w: Weights): Blend {
  const kinds = DENSITY_KINDS.filter((k) => w[k] > 0);
  const summit = kinds.reduce((s, k) => s + w[k] * MODELS[k].H, 0);

  // One ray from the summit: each model's reach along it, and the mixed height at distance r.
  const ray = (t: number) => {
    const reach = kinds.map((k) => MODELS[k].R(t));
    const height = (r: number) => {
      let z = 0;
      kinds.forEach((k, i) => {
        const u = r / reach[i];
        if (u < 1) z += w[k] * MODELS[k].H * MODELS[k].g(u, t);
      });
      return z;
    };
    return { height, far: Math.max(...reach) };
  };

  const pointAt = (h: number, t: number): Pt => {
    const { height, far } = ray(t);
    let lo = 0;
    let hi = far;
    for (let n = 0; n < 32; n++) {
      const mid = (lo + hi) / 2;
      if (height(mid) > h) lo = mid;
      else hi = mid;
    }
    const r = (lo + hi) / 2;
    return [CX + r * Math.cos(t), CY + r * Math.sin(t) * ASPECT];
  };

  const rings = SLOTS.map((h) => {
    if (summit <= h) {
      const top: Pt = [CX, CY];
      return { h, pts: Array.from({ length: K }, () => top), label: top, xw: CX, xe: CX, on: 0 };
    }
    const pts = Array.from({ length: K }, (_, k) => pointAt(h, (k / K) * Math.PI * 2));
    return { h, pts, label: pointAt(h, LABEL_T), xw: pts[K / 2][0], xe: pts[0][0], on: Math.min(1, (summit - h) / 2) };
  });

  const west = ray(Math.PI);
  const east = ray(0);
  const section: Pt[] = [];
  for (let x = SEC_A; x <= SEC_B; x += SECTION_DX) {
    section.push([x, x < CX ? west.height(CX - x) : east.height(x - CX)]);
  }
  for (const r of rings) if (r.on > 0) section.push([r.xw, r.h], [r.xe, r.h]);
  section.sort((a, b) => a[0] - b[0]);

  return { summit, rings, section };
}
