/**
 * Pure geometry for the lesson-6 "מצפן ומפה" activity (AzimuthExplorer):
 * one azimuth in degrees drives the compass pointers, the A→B line on the map,
 * every readout and the back-azimuth equation. No React, no DOM — so the
 * numbers and the label layout can be unit-tested for every whole degree
 * (scripts/qa/compass-map.test.mjs).
 *
 * Conventions
 * - Azimuth: clockwise from north, 0 ≤ a < 360. North is up, east is right —
 *   never mirrored for RTL.
 * - Screen space: y grows downward, so a point at bearing a and distance r
 *   from (cx, cy) is (cx + r·sin a, cy − r·cos a).
 */

export const AZIMUTH_START = 47;
export const AZIMUTH_MAX = 359;

export const normDeg = (d: number) => ((d % 360) + 360) % 360;

/** The opposite direction: (a + 180) mod 360. */
export const backAzimuth = (az: number) => (normDeg(az) + 180) % 360;

/** Whole degrees, zero-padded to three digits as on a compass: 47 → "047°". */
export const formatDeg = (d: number) => `${String(Math.round(normDeg(d)) % 360).padStart(3, '0')}°`;

/**
 * The back-azimuth equation for a whole-degree azimuth: add 180° below 180°,
 * subtract 180° otherwise — so the result always stays in 0–359.
 */
export function backEquation(az: number) {
  const a = Math.round(normDeg(az)) % 360;
  const add = a < 180;
  return { azimuth: a, op: add ? '+' : '−', back: add ? a + 180 : a - 180 } as const;
}

/** Signed shortest turn from `from` to `to`, in (−180, 180]. */
export function shortestTurn(from: number, to: number) {
  const d = normDeg(to - from);
  return d > 180 ? d - 360 : d;
}

export type XY = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

/** Unit vector of a bearing in screen space (y down). */
export function bearingVec(deg: number): XY {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/** Point at `deg` / `r` from `c` (screen space). */
export function polar(c: XY, r: number, deg: number): XY {
  const u = bearingVec(deg);
  return { x: c.x + r * u.x, y: c.y + r * u.y };
}

/** Half the extent of a w×h box along unit direction `u`. */
const halfExtent = (u: XY, w: number, h: number) => (w / 2) * Math.abs(u.x) + (h / 2) * Math.abs(u.y);

const boxAt = (c: XY, w: number, h: number): Box => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });

/**
 * A w×h label straight beyond point `p` along bearing `deg`, its nearest edge
 * `gap` away from `p` — so it never touches the line that ends at `p`.
 */
export function labelBeyond(p: XY, deg: number, gap: number, w: number, h: number): Box {
  const u = bearingVec(deg);
  return boxAt(polar(p, gap + halfExtent(u, w, h), deg), w, h);
}

/**
 * A w×h label beside the line that runs along `deg` through `p`, always on its
 * clockwise side (bearing deg + 90°) — one rule for every angle, so the label
 * glides around with the line instead of jumping sides. `along` slides it
 * along the line (negative = back toward the line's start); with
 * `maxAlong` its far edge stays at most that far ahead of `p` (clear of a
 * label placed beyond `p`).
 */
export function labelBeside(p: XY, deg: number, gap: number, w: number, h: number, maxAlong?: number): Box {
  const u = bearingVec(deg);
  const side = bearingVec(deg + 90);
  const off = gap + halfExtent(side, w, h);
  const along = maxAlong === undefined ? 0 : maxAlong - halfExtent(u, w, h);
  return boxAt({ x: p.x + side.x * off + u.x * along, y: p.y + side.y * off + u.y * along }, w, h);
}

export const boxesOverlap = (a: Box, b: Box, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Shortest distance from a point to a segment. */
function pointSegDist(p: XY, a: XY, b: XY) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when segment a–b passes within `pad` of the box. */
export function segmentHitsBox(a: XY, b: XY, box: Box, pad = 0) {
  const inside = (p: XY) => p.x >= box.x - pad && p.x <= box.x + box.w + pad && p.y >= box.y - pad && p.y <= box.y + box.h + pad;
  if (inside(a) || inside(b)) return true;
  const steps = 64;
  for (let i = 1; i < steps; i++) {
    if (inside({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps })) return true;
  }
  // corners near the segment (thin boxes between samples)
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x, y: box.y + box.h },
    { x: box.x + box.w, y: box.y + box.h },
  ];
  return corners.some((c) => pointSegDist(c, a, b) < pad);
}

// ─────────────────────────────────────────────────────────────────────────────
// Compass — SVG units: outer knurl radius = 100 (the rendered body's R)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ring radii of the rendered body (scripts/blender/build_compass_body.py, ×100).
 * The SVG layer prints onto these rings, so keep the two files in sync.
 */
export const COMPASS_RINGS = {
  /** rendered image half-size (the body + its contact shadow) */
  image: 119,
  rim: 100,
  knurlIn: 94,
  bezelIn: 70.5,
  /** visible ivory face */
  face: 67.2,
} as const;

/** Square viewBox half-size: the body plus room for the two degree labels. */
export const COMPASS_VIEW = 122;

/** Bezel print radius (numbers + cardinal letters) — the middle of the bezel. */
export const BEZEL_PRINT_R = (COMPASS_RINGS.knurlIn + COMPASS_RINGS.bezelIn) / 2;

/** Degree label size on the compass, in SVG units (≈ 18 px bold at desktop). */
export const COMPASS_LABEL = { w: 30, h: 15, gap: 3.5 } as const;

export function compassLayout(angle: number) {
  const c = { x: 0, y: 0 };
  const back = angle + 180;
  return {
    /** forward pointer: centre → open ring on the knurl */
    fwdEnd: polar(c, 96.5, angle),
    /** back pointer: arrow tip on the knurl, its base clear of the bezel print */
    backTip: polar(c, 99, back),
    fwdLabel: labelBeyond(c, angle, COMPASS_RINGS.rim + COMPASS_LABEL.gap, COMPASS_LABEL.w, COMPASS_LABEL.h),
    backLabel: labelBeyond(c, back, COMPASS_RINGS.rim + COMPASS_LABEL.gap, COMPASS_LABEL.w, COMPASS_LABEL.h),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Map — viewBox units ≈ CSS px at the 1440 desktop layout
// ─────────────────────────────────────────────────────────────────────────────

export const MAP_W = 618;
export const MAP_H = 515;
/** Fictional sheet: 10 m of ground per map unit → the 500 m grid is 50 units. */
export const METERS_PER_UNIT = 10;
export const GRID_M = 500;

/** Fixed origin A — the centre of the sheet. */
export const MAP_A: XY = { x: MAP_W / 2, y: MAP_H / 2 };
/** Fixed A→B distance: B circles A at this radius and stays on the sheet. */
export const MAP_R = 188;
/** The back ray is a direction from A, not a place — drawn shorter than A→B. */
export const MAP_BACK_R = 150;

/** Label sizes (units ≈ px). */
export const MAP_LABEL = {
  deg: { w: 50, h: 24 },
  /** "B" over the "יעד" chip */
  b: { w: 50, h: 48 },
  /** "A" over the "נקודת מוצא" chip */
  a: { w: 94, h: 48 },
  dotR: 8,
  gap: 6,
} as const;

/** Static sheet furniture the moving labels must stay clear of. */
export const MAP_NORTH_BOX: Box = { x: 18, y: 14, w: 40, h: 66 };
export const MAP_SCALE_BOX: Box = { x: 14, y: MAP_H - 44, w: 158, h: 32 };
/** Keep moving labels this far inside the sheet edge. */
export const MAP_MARGIN = 8;

export function mapLayout(angle: number) {
  const back = angle + 180;
  const B = polar(MAP_A, MAP_R, angle);
  const backTip = polar(MAP_A, MAP_BACK_R, back);
  const dotGap = MAP_LABEL.dotR + MAP_LABEL.gap;
  const fwdLabel = labelBeyond(B, angle, dotGap, MAP_LABEL.deg.w, MAP_LABEL.deg.h);
  const backLabel = labelBeyond(backTip, back, MAP_LABEL.gap, MAP_LABEL.deg.w, MAP_LABEL.deg.h);
  // B's name sits beside the line just short of B, so it never meets the degree label beyond B.
  const bLabel = labelBeside(B, angle, dotGap, MAP_LABEL.b.w, MAP_LABEL.b.h, MAP_LABEL.dotR);
  const aLabel = labelBeside(MAP_A, angle, dotGap, MAP_LABEL.a.w, MAP_LABEL.a.h);
  return { A: MAP_A, B, backTip, fwdLabel, backLabel, bLabel, aLabel };
}

/** Scale-bar length for `metres` of ground, in map units. */
export const metresToUnits = (metres: number) => metres / METERS_PER_UNIT;
