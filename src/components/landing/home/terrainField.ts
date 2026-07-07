/**
 * terrainField.ts — pure math describing the home-hero terrain relief.
 *
 * v3 structural rewrite (the v2 "flat/framed/synthetic" complaints required
 * a new engine, not a tweak). Five systems compose into one height field:
 *
 * 1. MACRO RELIEF — a handful of RIDGES (gaussian falloff around distance to
 *    a line SEGMENT, not a point — a "peak" is just a ridge whose two
 *    endpoints coincide). This gives real elongated ridgelines with rounded
 *    ends instead of stretched/rotated circles, composed into a little
 *    massif with a clear order of dominance: one tall, tight summit (the
 *    flag knoll) + a connecting spine + a minor spur + a clearly-subordinate
 *    second hill (the tree bank) + a small satellite knoll.
 * 2. DOMAIN WARP + RIDGED FBM — a cheap deterministic value-noise field
 *    perturbs every macro lookup (so no ridge sits on a clean mathematical
 *    curve) and adds amplitude-modulated micro-relief on top (rugged near
 *    peaks, calm in the valley — reads as weathering, not sprinkled noise).
 * 3. SLOPE-ADAPTIVE CARVED TERRACING — local gradient (3-tap finite
 *    difference) shrinks the terrace/contour interval on steep faces and
 *    widens it on flats (the real cartographic "lines crowd on cliffs"
 *    effect), and every terrace boundary gets an actual carved groove — a
 *    real crease in the computed normals, not only a colour band.
 * 4. CARVED RIVER CHANNEL — a Catmull-Rom spline (not a coarse polyline) is
 *    sampled into a dense polyline once at module load; a real piecewise
 *    cross-section (cosine U-bed → bank wall → raised lip → shoulder) is
 *    carved into the smooth pre-terrace ground and cross-faded back into
 *    the terraced land only across the shoulder, so the valley never fights
 *    a terrace step. Water colour/depth signals are decoupled from the
 *    (wider) geometric corridor, so the visible edge stays crisp.
 * 5. ORGANIC COMPOSITION — `COMPOSITION` is the single source of truth for
 *    where the story beats are (flag knoll, tree bank, tree instances); the
 *    ridges above and the biome boundary below both read from it, so the
 *    height-field bumps and the props standing on them can never drift
 *    apart. The sage/cream boundary is a smooth-max ("soft union") of two
 *    radial potentials — an organic peninsula with a neck, not a ruled
 *    diagonal.
 * 6. EDGE TAPER — the whole relief smoothstep-fades to zero within a margin
 *    of `FIELD_HALF_SIZE`. The R3F scene sizes the terrain mesh directly
 *    from that same exported constant, so the relief always meets the
 *    slab's flat plateau flush at its own zero-height rim.
 *
 * Kept side-effect free (no THREE/R3F imports) so the shape of the terrain
 * can be reasoned about independently of the scene that consumes it
 * (InteractiveHomeTerrainModel.tsx).
 */

export type FieldSample = {
  /** Final displaced height (terraces + groove, or the carved river valley). */
  height: number;
  /** 0 = sage/olive ground, 1 = cream/sand high ground. */
  biome: number;
  /** 0..1, 1 = open water surface, sharp (~1 grid-cell) falloff to 0 at the true bank edge. */
  riverMask: number;
  /** 0..1 depth gradient across the water surface: 1 at the channel centreline, 0 at the edge. */
  riverDepth: number;
  /** 0..1, 1 right on the raised bank lip just outside the water, 0 elsewhere. */
  bankLip: number;
  /** 0..1, 1 directly on a contour line (suppressed across the river corridor). */
  contour: number;
  /** 0..1 normalised raw elevation, for height-based colour shading. */
  shade: number;
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function smoothstep(x: number, edge0: number, edge1: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Shared geometric primitive: distance from a point to a line segment. Used
// for every ridge (macro relief) and for the river's coarse control points.
// ---------------------------------------------------------------------------
function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq > 0 ? clamp01(((px - x1) * dx + (pz - z1) * dz) / lenSq) : 0;
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

// ---------------------------------------------------------------------------
// Composition anchors — the two "story beats" of the diorama. Both the
// height field (ridges below) and the prop layer (Tree/Flag placement in the
// scene file) read from this single object, so the bump in the terrain and
// the object standing on it can never drift apart. Deliberately NOT mirrored
// across the origin: the flag site is a tight, tall single peak; the tree
// site is a spread cluster on a broad, low bank — same rule-of-thirds
// weighting, opposite character.
// ---------------------------------------------------------------------------
export const COMPOSITION = {
  /** The single tallest, most prominent point in the whole diorama. */
  flag: { x: 1.0, z: -0.345 },
  /** Centre of the gentle bank the tree cluster stands on, at the river's first bend. */
  treeBank: { x: -0.64, z: 0.46 },
  /** A small, deliberately-varied 3-tree cluster (dominant + two companions) — not a repeated prefab. */
  trees: [
    { x: -0.78, z: 0.58, scale: 1.0, rotationY: 0.35, lean: 0.05 },
    { x: -0.5, z: 0.72, scale: 0.72, rotationY: 2.05, lean: -0.035 },
    { x: -0.98, z: 0.4, scale: 0.56, rotationY: 4.1, lean: 0.02 },
  ],
} as const;

// ---------------------------------------------------------------------------
// Cheap deterministic value noise (hash-lattice, bilinear, smoothstep-eased)
// — no external noise library available/allowed, nothing fancier is needed
// for domain-warp + ridged-FBM micro-detail.
// ---------------------------------------------------------------------------
function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function rotate2D(x: number, z: number, angle: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - z * s, x * s + z * c];
}

/** Ridged FBM: rotates each octave by a golden-angle-ish increment (no
 * octave shares an axis with another) and reshapes each octave through
 * `1 - |2n-1|` so the noise reads as creases/ridges rather than rounded
 * blobs. Normalised by its own amplitude budget for a stable 0..1 result. */
function ridgedFbm(x: number, z: number, octaves: number): number {
  let sum = 0;
  let ampSum = 0;
  let amp = 0.55;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    const [rx, rz] = rotate2D(x * freq, z * freq, i * 2.399963);
    const n = valueNoise(rx + i * 19.7, rz - i * 8.3);
    const ridge = 1 - Math.abs(n * 2 - 1);
    sum += ridge * ridge * amp;
    ampSum += amp;
    amp *= 0.5;
    freq *= 2.17;
  }
  return ampSum > 0 ? sum / ampSum : 0;
}

const WARP_STRENGTH = 0.22;
const WARP_FREQ = 0.55;

/** Perturbs sample coordinates before every macro/detail lookup so nothing —
 * not even the hand-authored ridges — sits on a perfectly clean mathematical
 * curve. Without it, ridge primitives (and their terrace rings) are exactly
 * circular/elliptical arcs; with it, every ring wobbles organically like a
 * hand-drawn contour. The river spline is NOT warped — it already reads as
 * organic via its own Catmull-Rom curvature, and staying unwarped keeps its
 * crisp water-edge antialiasing exact. */
function warpCoords(x: number, z: number): [number, number] {
  const n1 = valueNoise(x * WARP_FREQ + 12.3, z * WARP_FREQ - 4.1) * 2 - 1;
  const n2 = valueNoise(x * WARP_FREQ - 7.2, z * WARP_FREQ + 9.6) * 2 - 1;
  return [x + n1 * WARP_STRENGTH, z + n2 * WARP_STRENGTH];
}

// ---------------------------------------------------------------------------
// Macro relief — ridges anchored to COMPOSITION so the terrain bumps and the
// props standing on them can't drift apart. Amplitudes are deliberately
// unequal: one tall, tight summit; a connecting spine; a minor spur; a
// clearly-subordinate second hill; one small satellite knoll.
// ---------------------------------------------------------------------------
type Ridge = { a: [number, number]; b: [number, number]; radius: number; height: number; k?: number };

const MACRO_FEATURES: Ridge[] = [
  // Dominant summit — THE flag knoll. Tight radius, tallest point in frame.
  {
    a: [COMPOSITION.flag.x - 0.02, COMPOSITION.flag.z - 0.015],
    b: [COMPOSITION.flag.x + 0.02, COMPOSITION.flag.z + 0.015],
    radius: 0.55,
    height: 0.27,
    k: 2.6,
  },
  // Ridge spine running off the summit toward the interior — a real
  // elongated spine (distance-to-segment), not a stretched blob.
  { a: [0.85, -0.25], b: [0.15, 0.05], radius: 0.5, height: 0.13, k: 2.1 },
  // Shorter spur peeling off at a different angle — breaks bilateral symmetry.
  { a: [0.5, -0.55], b: [0.18, -0.9], radius: 0.42, height: 0.085, k: 2.3 },
  // Tree bank — clearly subordinate to the summit: lower, broader, softer.
  {
    a: [COMPOSITION.treeBank.x - 0.14, COMPOSITION.treeBank.z - 0.12],
    b: [COMPOSITION.treeBank.x + 0.14, COMPOSITION.treeBank.z + 0.12],
    radius: 0.62,
    height: 0.125,
    k: 2.2,
  },
  // Small satellite knoll, off-axis, so the sage massif doesn't read as one
  // perfect dome either.
  { a: [-1.0, 0.12], b: [-1.0, 0.12], radius: 0.4, height: 0.055, k: 2.6 },
];

function ridgeContribution(x: number, z: number, ridge: Ridge): number {
  const d = distToSegment(x, z, ridge.a[0], ridge.a[1], ridge.b[0], ridge.b[1]);
  const k = ridge.k ?? 2.3;
  const t = d / ridge.radius;
  return ridge.height * Math.exp(-t * t * k);
}

function macroHeight(x: number, z: number): number {
  let h = 0;
  for (const ridge of MACRO_FEATURES) h += ridgeContribution(x, z, ridge);
  return h;
}

const DETAIL_FREQ = 1.1;
const DETAIL_OCTAVES = 3;
const PEAK_HEIGHT_REF = 0.27;

/** Micro-relief: ridged FBM whose amplitude scales with macro height, so the
 * summit/spine get gently rugged, weathered-looking micro-ridging while the
 * valley floor stays calm. Kept deliberately subtle — this is texture on
 * top of the terracing, not a competing signal: too strong (and/or too high
 * a frequency) and it reads as visual noise instead of weathering, and can
 * alias badly against the curvature-based AO sampling in the R3F scene. */
function detailHeight(wx: number, wz: number, macro: number): number {
  const n = ridgedFbm(wx * DETAIL_FREQ, wz * DETAIL_FREQ, DETAIL_OCTAVES);
  const amp = 0.004 + 0.016 * clamp01(macro / PEAK_HEIGHT_REF);
  return (n - 0.5) * amp;
}

// ---------------------------------------------------------------------------
// River — Catmull-Rom spline through hand-placed control points (routed past
// the tree bank, toward the flag knoll, fading out before it), sampled into
// a dense polyline once at module load so the medial line is C1-smooth
// rather than a kinked coarse polyline.
// ---------------------------------------------------------------------------
type RiverPoint = { x: number; z: number; s: number; sN: number };

const RIVER_CONTROL_POINTS: [number, number][] = [
  [-1.35, 1.1],
  [-1.05, 0.86],
  [-0.82, 0.63],
  [-0.6, 0.42],
  [-0.32, 0.18],
  [-0.02, -0.04],
  [0.22, -0.24],
];

const RIVER_SAMPLES_PER_SEGMENT = 10;

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, u: number) {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (3 * p1 - 3 * p2 + p3 - p0) * u3)
  );
}

function buildRiverPolyline(controlPoints: [number, number][], samplesPerSegment: number): RiverPoint[] {
  const n = controlPoints.length;

  const at = (i: number): { x: number; z: number } => {
    if (i < 0) {
      const p0 = controlPoints[0];
      const p1 = controlPoints[1];
      return { x: 2 * p0[0] - p1[0], z: 2 * p0[1] - p1[1] };
    }
    if (i > n - 1) {
      const pn = controlPoints[n - 1];
      const pn1 = controlPoints[n - 2];
      return { x: 2 * pn[0] - pn1[0], z: 2 * pn[1] - pn1[1] };
    }
    const p = controlPoints[i];
    return { x: p[0], z: p[1] };
  };

  const raw: { x: number; z: number }[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const startS = i === 0 ? 0 : 1;
    for (let s = startS; s <= samplesPerSegment; s++) {
      const u = s / samplesPerSegment;
      raw.push({
        x: catmullRom1D(p0.x, p1.x, p2.x, p3.x, u),
        z: catmullRom1D(p0.z, p1.z, p2.z, p3.z, u),
      });
    }
  }

  let total = 0;
  const withArc: RiverPoint[] = raw.map((p, i) => {
    if (i > 0) {
      const prev = raw[i - 1];
      total += Math.hypot(p.x - prev.x, p.z - prev.z);
    }
    return { x: p.x, z: p.z, s: total, sN: 0 };
  });
  const totalLength = total || 1;
  return withArc.map((p) => ({ ...p, sN: p.s / totalLength }));
}

const RIVER_POLYLINE = buildRiverPolyline(RIVER_CONTROL_POINTS, RIVER_SAMPLES_PER_SEGMENT);

/** Nearest perpendicular distance to the dense river polyline, plus the
 * arc-length fraction (0..1) at that closest point. */
function nearestOnRiver(x: number, z: number): { dist: number; t: number } {
  let best = Infinity;
  let bestT = 0;
  for (let i = 0; i < RIVER_POLYLINE.length - 1; i++) {
    const a = RIVER_POLYLINE[i];
    const b = RIVER_POLYLINE[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const proj = lenSq > 0 ? clamp01(((x - a.x) * dx + (z - a.z) * dz) / lenSq) : 0;
    const px = a.x + proj * dx;
    const pz = a.z + proj * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      bestT = lerp(a.sN, b.sN, proj);
    }
  }
  return { dist: best, t: bestT };
}

const VALLEY_RADIUS = 0.85;
const VALLEY_DEPTH = 0.085;

/** Broad valley pull: the surrounding land visibly drains toward the river
 * *before* the sharp trench cuts the actual channel — real hydrology, not a
 * bump field with a ditch dug through it. */
function valleySuppression(riverDist: number): number {
  const t = riverDist / VALLEY_RADIUS;
  return VALLEY_DEPTH * Math.exp(-t * t * 1.6);
}

// ---------------------------------------------------------------------------
// Edge taper — the fix for "looks like a framed panel." The relief tapers
// smoothly to exactly zero within a margin of FIELD_HALF_SIZE, so the
// terrain mesh's own perimeter is flush with the slab's flat plateau: a
// sculpted landmass rising out of a presentation base. The R3F scene sizes
// the mesh directly from FIELD_HALF_SIZE so this can never drift out of sync.
// ---------------------------------------------------------------------------
export const FIELD_HALF_SIZE = 1.1;
const EDGE_MARGIN = 0.2;

function edgeMask(x: number, z: number): number {
  const dx = FIELD_HALF_SIZE - Math.abs(x);
  const dz = FIELD_HALF_SIZE - Math.abs(z);
  const d = Math.min(dx, dz);
  return smoothstep(d, 0, EDGE_MARGIN);
}

const SLOPE_EPS = 0.025;

/** Cheap slope estimate reusing only macro+detail (skips the river/valley/
 * edge lookups, which change slowly relative to SLOPE_EPS) — used purely to
 * pick the local terrace/contour spacing, not to place geometry. */
function slopeAt(x: number, z: number, centerMacro: number, centerDetail: number): number {
  const [wx1, wz1] = warpCoords(x + SLOPE_EPS, z);
  const m1 = macroHeight(wx1, wz1);
  const d1 = detailHeight(wx1, wz1, m1);
  const [wx2, wz2] = warpCoords(x, z + SLOPE_EPS);
  const m2 = macroHeight(wx2, wz2);
  const d2 = detailHeight(wx2, wz2, m2);
  const center = centerMacro + centerDetail;
  return Math.hypot((m1 + d1 - center) / SLOPE_EPS, (m2 + d2 - center) / SLOPE_EPS);
}

// ---------------------------------------------------------------------------
// Slope-adaptive terrace/contour interval — real topo maps show lines
// crowding on steep faces and opening up on flats; exaggerated deliberately
// (wide bold shelves on flats, tight rings on cliffs) for a terraced
// cut-paper read, and it guarantees the ring spacing is never uniform.
// ---------------------------------------------------------------------------
const LAYER_HEIGHT_FLAT = 0.062;
const LAYER_HEIGHT_STEEP = 0.024;
const SLOPE_REF = 1.15;

function effectiveLayerHeight(slope: number): number {
  const t = clamp01(slope / SLOPE_REF);
  const eased = t * t * (3 - 2 * t);
  return LAYER_HEIGHT_FLAT + (LAYER_HEIGHT_STEEP - LAYER_HEIGHT_FLAT) * eased;
}

const TERRACE_SOFTNESS = 0.4;
const GROOVE_WIDTH = 0.06;
const GROOVE_DEPTH = 0.26;

/** Terraces the relief into flat shelves with a short eased ramp between
 * them, plus a small real notch carved exactly at each shelf boundary — the
 * same boundary metric the vertex-colour contour band uses, so geometry and
 * colour share one seam. `computeVertexNormals()` in the consuming mesh then
 * picks the crease up as genuine shading, not only a painted stripe. */
function terraceWithGroove(h: number, layerHeight: number): number {
  const scaled = h / layerHeight;
  const i = Math.floor(scaled);
  const f = scaled - i;

  let shaped: number;
  if (f < TERRACE_SOFTNESS) shaped = 0;
  else if (f > 1 - TERRACE_SOFTNESS) shaped = 1;
  else {
    const t = (f - TERRACE_SOFTNESS) / (1 - 2 * TERRACE_SOFTNESS);
    shaped = t * t * (3 - 2 * t);
  }
  const base = (i + shaped) * layerHeight;

  const distToBoundary = Math.min(f, 1 - f);
  const groove = (1 - smoothstep(distToBoundary, 0, GROOVE_WIDTH)) * GROOVE_DEPTH * layerHeight;
  // Clamped to the base plateau (h was already >= 0): every interior shelf
  // boundary has a lower shelf to carve the groove into, but the ground
  // floor (h = 0, i.e. i = 0 with f near 0) does not — without this, the
  // groove notch at that boundary sinks the entire flat majority of the
  // terrain (everywhere away from a hill) a few hundredths of a unit below
  // the slab's plateau surface, where the lip card occludes it outright.
  return Math.max(0, base - groove);
}

const CONTOUR_LINE_WIDTH = 0.075;

function contourIntensity(h: number, layerHeight: number, river: number): number {
  const t = h / layerHeight;
  const level = Math.floor(t);
  const frac = t - level;
  const distToBoundary = Math.min(frac, 1 - frac);
  let line = 1 - smoothstep(distToBoundary, 0, CONTOUR_LINE_WIDTH);
  // Suppress the ground floor's own lower edge (level 0, frac near 0) — like
  // the groove above, there is no shelf below it to draw a contour line
  // against. Without this, every flat stretch away from a hill (h ≈ 0) reads
  // as "sitting on a contour line" instead of open, uncontoured ground.
  if (level <= 0 && frac < 0.5) line = 0;
  return line * (1 - river);
}

// ---------------------------------------------------------------------------
// River cross-section — a real embedded channel, not a soft radial mask.
// ---------------------------------------------------------------------------
const RIVER_CHANNEL_HALF = 0.11;
const RIVER_BANK_RISE = 0.05;
const RIVER_LIP_WIDTH = 0.032;
const RIVER_SHOULDER = 0.1;
const RIVER_BED_DEPTH = 0.075;
const RIVER_LIP_HEIGHT = 0.02;
const RIVER_FLOOR_MARGIN = 0.01;
const RIVER_EDGE_AA = 0.022;

type RiverProfile = {
  carve: number;
  corridorFade: number;
  waterMask: number;
  depthShade: number;
  bankLip: number;
};

function riverProfileAt(d: number, t: number, rawGround: number): RiverProfile {
  // The river narrows and shallows as it nears the flag knoll, so it reads
  // as soaking into the earth rather than being cut off by a wall.
  const endFade = 1 - smoothstep(t, 0.76, 0.97);
  const widthScale = 0.55 + 0.45 * endFade;

  const channelHalf = RIVER_CHANNEL_HALF * widthScale;
  const bankRise = RIVER_BANK_RISE * widthScale;
  const lipWidth = RIVER_LIP_WIDTH * widthScale;
  const shoulder = RIVER_SHOULDER * widthScale;

  const bankStart = channelHalf;
  const lipStart = bankStart + bankRise;
  const shoulderStart = lipStart + lipWidth;
  const shoulderEnd = shoulderStart + shoulder;

  if (d > shoulderEnd) {
    return { carve: 0, corridorFade: 0, waterMask: 0, depthShade: 0, bankLip: 0 };
  }

  const depthWobble = 0.85 + 0.1 * Math.sin(t * 9.7) + 0.05 * Math.sin(t * 3.1 + 1.7);
  const desiredDepth = RIVER_BED_DEPTH * depthWobble * endFade;
  const maxDepth = Math.min(desiredDepth, Math.max(0, rawGround - RIVER_FLOOR_MARGIN));

  let carve = 0;
  let bankLip = 0;

  if (d <= bankStart) {
    const bt = d / channelHalf;
    const bed = Math.cos(bt * Math.PI * 0.5);
    carve = -maxDepth * bed;
  } else if (d <= lipStart) {
    const bt = (d - bankStart) / bankRise;
    const eased = bt * bt * (3 - 2 * bt);
    carve = eased * RIVER_LIP_HEIGHT * endFade;
    bankLip = eased;
  } else if (d <= shoulderStart) {
    carve = RIVER_LIP_HEIGHT * endFade;
    bankLip = 1;
  } else {
    const bt = (d - shoulderStart) / shoulder;
    const eased = bt * bt * (3 - 2 * bt);
    carve = RIVER_LIP_HEIGHT * endFade * (1 - eased);
    bankLip = 1 - eased;
  }

  const corridorFade = 1 - smoothstep(d, shoulderStart, shoulderEnd);

  const edge0 = Math.max(0.005, channelHalf - RIVER_EDGE_AA);
  const waterMask = 1 - smoothstep(d, edge0, channelHalf);
  const depthShade = waterMask > 0 ? clamp01(Math.cos(clamp01(d / channelHalf) * Math.PI * 0.5)) : 0;

  return { carve, corridorFade, waterMask, depthShade, bankLip };
}

// ---------------------------------------------------------------------------
// Organic highland boundary — smooth-max ("soft union") of two radial
// potentials anchored to the flag knoll, plus a low-frequency off-axis wave
// for an irregular coastline. Reads as a hand-carved peninsula with a neck,
// not a ruled diagonal.
// ---------------------------------------------------------------------------
function biomeValue(x: number, z: number) {
  // Radii kept tight relative to FIELD_HALF_SIZE (1.1) so the cream high
  // ground stays a contained corner around the flag knoll rather than
  // swallowing most of the visible terrain.
  const c1 = { cx: COMPOSITION.flag.x + 0.06, cz: COMPOSITION.flag.z + 0.1, r: 0.42 };
  const c2 = { cx: 0.4, cz: -0.85, r: 0.26 };
  const p1 = 1 - Math.hypot(x - c1.cx, z - c1.cz) / c1.r;
  const p2 = 1 - Math.hypot(x - c2.cx, z - c2.cz) / c2.r;
  const k = 5;
  const potential = Math.log(Math.exp(p1 * k) + Math.exp(p2 * k)) / k;
  const wave = Math.sin(x * 2.1 - z * 1.4 + 0.7) * 0.05 + Math.sin(x * 0.9 + z * 2.6) * 0.035;
  return smoothstep(potential + wave, -0.02, 0.22);
}

/** Tiny deterministic surface grain — a real (if minute) geometric bump on
 * top of the terracing, not just a colour trick, so flat shelves keep a
 * touch of tactile roughness. Muted across open water. */
function microGrain(x: number, z: number, waterMask: number) {
  return Math.sin(x * 47 + z * 31) * Math.sin(x * 17 - z * 53) * 0.0016 * (1 - waterMask);
}

export const TERRAIN_MAX_HEIGHT = 0.34;

export function sampleField(x: number, z: number): FieldSample {
  const river = nearestOnRiver(x, z);
  const valley = valleySuppression(river.dist);

  const [wx, wz] = warpCoords(x, z);
  const macro = macroHeight(wx, wz);
  const detail = detailHeight(wx, wz, macro);
  const base = Math.max(0, macro + detail - valley);
  const relief = base * edgeMask(x, z);

  const slope = slopeAt(x, z, macro, detail);
  const layerHeight = effectiveLayerHeight(slope);

  const land = terraceWithGroove(relief, layerHeight);
  const profile = riverProfileAt(river.dist, river.t, relief);
  const height =
    lerp(land, relief + profile.carve, profile.corridorFade) + microGrain(x, z, profile.waterMask);

  const biome = biomeValue(x, z);
  const contour = contourIntensity(relief, layerHeight, profile.corridorFade);
  const shade = clamp01(relief / TERRAIN_MAX_HEIGHT);

  return {
    height,
    biome,
    riverMask: profile.waterMask,
    riverDepth: profile.depthShade,
    bankLip: profile.bankLip,
    contour,
    shade,
  };
}
