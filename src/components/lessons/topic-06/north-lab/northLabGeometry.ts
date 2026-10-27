/**
 * Pure geometry for the lesson-6 "שלושה סוגי צפון" reference lab (NorthLab):
 * one fixed target, three north references, one azimuth per reference. No
 * React, no DOM — so the numbers, the arc and every label position can be
 * unit-tested for each slider step (scripts/qa/north-lab.test.mjs).
 *
 * Conventions (as compassMapGeometry)
 * - Angles are measured from true north, clockwise: positive east, negative
 *   west. North is up, east is right — never mirrored for RTL.
 * - Screen space: y grows downward, so a point at bearing a and distance r
 *   from A is (A.x + r·sin a, A.y − r·cos a).
 *
 * The values are fictional teaching data for this experiment — not a real
 * place, date or declination.
 */
import { COMPASS_RINGS, normDeg, polar, type Box, type XY } from '../compassMapGeometry';

export type NorthId = 'true' | 'grid' | 'magnetic';

export const TRUE_NORTH_ANGLE = 0;
export const GRID_NORTH_ANGLE = 2;
export const TARGET_TRUE_BEARING = 66;
export const DECLINATION_START = -6;
export const DECLINATION_MIN = -10;
export const DECLINATION_MAX = 10;

/** normalize(x) = ((x % 360) + 360) % 360 */
export const normalize = normDeg;

/** The north each reference points to, in degrees from true north. */
export function northAngles(declination: number): Record<NorthId, number> {
  return { true: TRUE_NORTH_ANGLE, grid: GRID_NORTH_ANGLE, magnetic: declination };
}

export const referenceAngle = (id: NorthId, declination: number) => northAngles(declination)[id];

/** azimuth = normalize(targetTrueBearing − referenceAngle) */
export const azimuthFrom = (referenceDeg: number) => normalize(TARGET_TRUE_BEARING - referenceDeg);

/** The same target measured from each north. */
export function bearings(declination: number): Record<NorthId, number> {
  const n = northAngles(declination);
  return { true: azimuthFrom(n.true), grid: azimuthFrom(n.grid), magnetic: azimuthFrom(n.magnetic) };
}

export const clampDeclination = (d: number) =>
  Math.max(DECLINATION_MIN, Math.min(DECLINATION_MAX, Math.round(d)));

/** Signed whole degrees, sign before the number: −6°, 0°, +2° (U+2212 minus). */
export function formatSigned(d: number) {
  const v = Math.round(d);
  return v === 0 ? '0°' : `${v < 0 ? '−' : '+'}${Math.abs(v)}°`;
}

/** aria-valuetext for the declination slider: the side, in words. */
export function declinationText(d: number) {
  const v = Math.round(d);
  if (v === 0) return '0 מעלות';
  const side = v < 0 ? 'מערבה' : 'מזרחה';
  const n = Math.abs(v);
  return n === 1 ? `מעלה אחת ${side}` : `${n} מעלות ${side}`;
}

/**
 * The line under the reading: where the chosen north lies relative to true
 * north and what that does to the angle to B. It names the side (west →
 * larger, east → smaller), never a blanket "add" / "subtract" rule, and it
 * follows the slider. Unsigned degrees only, so the text needs no LTR island.
 */
export function relationText(id: NorthId, declination: number) {
  if (id === 'true') return 'זה הבסיס להשוואה: הזוויות שעל החצים במפה נמדדות ממנו.';
  const name = id === 'grid' ? 'צפון הרשת' : 'הצפון המגנטי';
  const v = Math.round(referenceAngle(id, declination));
  if (v === 0) return `בדוגמה, ${name} חופף לצפון האמיתי, ולכן האזימוט זהה.`;
  const n = Math.abs(v);
  return v < 0
    ? `בדוגמה, ${name} נוטה ${n}° מערבה מהצפון האמיתי, ולכן האזימוט גדול ב־${n}°.`
    : `בדוגמה, ${name} נוטה ${n}° מזרחה מהצפון האמיתי, ולכן האזימוט קטן ב־${n}°.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Measurement arc — from the chosen north, clockwise, to the target line
// ─────────────────────────────────────────────────────────────────────────────

/** Clockwise sweep from `fromDeg` to `toDeg`, 0 ≤ sweep < 360 (handles the wrap through 0°). */
export const clockwiseSweep = (fromDeg: number, toDeg: number) => normalize(toDeg - fromDeg);

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Open arc at `c`, radius `r`, from `fromDeg` clockwise to `toDeg`. */
export function arcPath(c: XY, r: number, fromDeg: number, toDeg: number) {
  const sweep = clockwiseSweep(fromDeg, toDeg);
  const a = polar(c, r, fromDeg);
  const b = polar(c, r, fromDeg + sweep);
  return `M${r2(a.x)} ${r2(a.y)}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${r2(b.x)} ${r2(b.y)}`;
}

/** The same arc closed through the centre — the filled measurement wedge. */
export function wedgePath(c: XY, r: number, fromDeg: number, toDeg: number) {
  return `M${r2(c.x)} ${r2(c.y)}L${arcPath(c, r, fromDeg, toDeg).slice(1)}Z`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map — viewBox units ≈ CSS px at the 1440 desktop layout
// ─────────────────────────────────────────────────────────────────────────────

export const LAB_W = 654;
export const LAB_H = 628;
/** Keep every live mark this far inside the sheet edge. */
export const LAB_MARGIN = 8;

/** Fixed origin A — every north arrow and the target line start here. */
export const LAB_A: XY = { x: 300, y: 386 };
/** Fixed target B: created once from the target bearing at a fixed distance. */
export const B_RADIUS = 330;
export const LAB_B: XY = polar(LAB_A, B_RADIUS, TARGET_TRUE_BEARING);
export const POINT_R = { a: 11, b: 12 } as const;

/** Length of the three north arrows (A → tip). */
export const ARROW_LEN = 226;

/** Printed map grid: its north axis is parallel to GN; A sits in the middle of a cell. */
export const GRID_STEP = 52;

/**
 * The measuring ring reuses the compass body render (CompassInstrument) —
 * its ring radii (COMPASS_RINGS, ×100 units) scaled to the map. The ivory face
 * is masked out so the map shows through; the print sits on the bezel.
 */
export const RING_SCALE = 1.5;
export const RING = {
  image: COMPASS_RINGS.image * RING_SCALE,
  rim: COMPASS_RINGS.rim * RING_SCALE,
  knurlIn: COMPASS_RINGS.knurlIn * RING_SCALE,
  bezelIn: COMPASS_RINGS.bezelIn * RING_SCALE,
  /** Mask radius: the face goes, the light hairline at the bezel's inner edge stays. */
  cut: (COMPASS_RINGS.face + 0.8) * RING_SCALE,
} as const;

/** Bezel graduation: ticks from the bezel's inner edge, numbers at mid-bezel. */
export const RING_TICK = { inner: RING.bezelIn + 0.6, minor: 4, mid: 6.5, major: 9 } as const;
export const RING_NUMBER_R = (RING.knurlIn + RING.bezelIn) / 2 + 2;
/** Printed numbers — 0 lies under the north arrows, so the TN arrow is its mark. */
export const RING_NUMBERS = [90, 180, 270] as const;

/** Measurement arc and its single number (inside the face, just beyond the arc). */
export const ARC_R = 53;
export const ARC_LABEL = { r: 77, w: 46, h: 22 } as const;

export function arcLabelBox(fromDeg: number): Box {
  const mid = fromDeg + clockwiseSweep(fromDeg, TARGET_TRUE_BEARING) / 2;
  const c = polar(LAB_A, ARC_LABEL.r, mid);
  return { x: c.x - ARC_LABEL.w / 2, y: c.y - ARC_LABEL.h / 2, w: ARC_LABEL.w, h: ARC_LABEL.h };
}

/** Enlarged-separation inset in the sheet's north-west corner. */
export const INSET: Box = { x: 16, y: 16, w: 188, h: 190 };
/** Angles in the inset only: the deviation from TN × INSET_GAIN (side and order kept). */
export const INSET_GAIN = 4;
export const INSET_ORIGIN: XY = { x: INSET.x + INSET.w / 2, y: INSET.y + INSET.h - 18 };
export const INSET_ARROW_LEN = 96;

/** "הנתונים להמחשה בלבד" — bottom-left corner of the sheet. */
export const NOTE_POS: XY = { x: 16, y: LAB_H - 16 };

// ─────────────────────────────────────────────────────────────────────────────
// Labels — one row above the arrow tips, spread so they never overlap
// ─────────────────────────────────────────────────────────────────────────────

/** Main map: the north's Hebrew name over its angle from TN. Inset: the name only. */
export const ARROW_LABEL = { w: 48, h: 36, gap: 6, lift: 16 } as const;
export const INSET_LABEL = { w: 46, h: 20, gap: 4, lift: 8 } as const;

/** Equal angles (MN = TN at 0°, MN = GN at 2°) keep this left-to-right order. */
const TIE_ORDER: Record<NorthId, number> = { magnetic: 0, true: 1, grid: 2 };

/**
 * Centres for a row of equal-width labels near their natural x (sorted
 * ascending): overlapping neighbours merge into a block centred on their
 * mean, each block clamped inside [min, max].
 */
export function spreadRow(nat: number[], w: number, gap: number, min: number, max: number): number[] {
  const step = w + gap;
  type Block = { n: number; sum: number };
  let blocks: Block[] = nat.map((x) => ({ n: 1, sum: x }));
  const half = (b: Block) => ((b.n - 1) * step) / 2 + w / 2;
  const centre = (b: Block) => Math.min(max - half(b), Math.max(min + half(b), b.sum / b.n));
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i + 1 < blocks.length; i++) {
      const a = blocks[i];
      const b = blocks[i + 1];
      if (centre(b) - half(b) - (centre(a) + half(a)) < gap - 1e-9) {
        blocks = [...blocks.slice(0, i), { n: a.n + b.n, sum: a.sum + b.sum }, ...blocks.slice(i + 2)];
        merged = true;
        break;
      }
    }
  }
  const out: number[] = [];
  for (const b of blocks) {
    const first = centre(b) - ((b.n - 1) * step) / 2;
    for (let k = 0; k < b.n; k++) out.push(first + k * step);
  }
  return out;
}

export interface ArrowLabel {
  id: NorthId;
  /** drawn angle (in the inset: the enlarged one) */
  angle: number;
  /** the source value the label prints */
  value: number;
  tip: XY;
  box: Box;
  /** the label moved off its tip → draw a leader line from the label to the tip */
  leader: boolean;
}

function rowLabels(
  origin: XY,
  len: number,
  drawn: Record<NorthId, number>,
  source: Record<NorthId, number>,
  size: { w: number; h: number; gap: number; lift: number },
  min: number,
  max: number,
): ArrowLabel[] {
  const items = (Object.keys(drawn) as NorthId[])
    .map((id) => ({ id, angle: drawn[id], value: source[id], tip: polar(origin, len, drawn[id]) }))
    .sort((a, b) => a.tip.x - b.tip.x || TIE_ORDER[a.id] - TIE_ORDER[b.id]);
  const bottom = Math.min(...items.map((i) => i.tip.y)) - size.lift;
  const xs = spreadRow(items.map((i) => i.tip.x), size.w, size.gap, min, max);
  return items.map((it, k) => ({
    ...it,
    box: { x: xs[k] - size.w / 2, y: bottom - size.h, w: size.w, h: size.h },
    leader: Math.abs(xs[k] - it.tip.x) > 2,
  }));
}

/** The three north labels on the main map: true angles, clear of the inset. */
export function arrowLabels(declination: number): ArrowLabel[] {
  const n = northAngles(declination);
  return rowLabels(LAB_A, ARROW_LEN, n, n, ARROW_LABEL, INSET.x + INSET.w + 10, LAB_W - LAB_MARGIN);
}

/** Inset angles: deviation from TN × INSET_GAIN. */
export function insetAngles(declination: number): Record<NorthId, number> {
  const n = northAngles(declination);
  return { true: n.true * INSET_GAIN, grid: n.grid * INSET_GAIN, magnetic: n.magnetic * INSET_GAIN };
}

/** Inset labels: names only, placed at the enlarged angles (the values stay on the main map). */
export function insetLabels(declination: number): ArrowLabel[] {
  return rowLabels(
    INSET_ORIGIN,
    INSET_ARROW_LEN,
    insetAngles(declination),
    northAngles(declination),
    INSET_LABEL,
    INSET.x + 6,
    INSET.x + INSET.w - 6,
  );
}
