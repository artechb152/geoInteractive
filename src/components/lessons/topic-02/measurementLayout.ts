/**
 * Measurement mission — pure layout math (no React), shared by the layered
 * landscape renders, the live overlay drawn over them and the SVG section
 * below, so all three register exactly.
 *
 *   The landscape is a stack of Cycles renders from ONE fixed camera
 *   (scripts/blender/render_measurement_landscape.py). Its matrix is in
 *   measurementLandscape.data.ts; project() places any world point on the
 *   rendered pixels, at any display size.
 *   undulationAt()  ONE smooth N field (exact at the stations). The model
 *                   stands on the geoid it describes: land is lifted by its N,
 *                   the smooth ellipsoid is the flat level z = 0, and the cut
 *                   face and the section sample the same field along the
 *                   survey line.
 *   sectionGeometry()  the section along the survey line: one horizontal
 *                   scale (B exactly below its pin, C and A as close to theirs
 *                   as one scale allows) and one vertical scale for H, h and N.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { STATIONS, type StationId } from './measurementMission.data';

export type Vec3 = readonly [number, number, number];
export type Size = { w: number; h: number };
export type Pt = { x: number; y: number };

export const STATION_IDS: readonly StationId[] = ['C', 'B', 'A'];

/** The renders' proportions; every landscape box keeps them, so the overlay only scales. */
export const LANDSCAPE_ASPECT = L.image.w / L.image.h;

/** World units per metre: of H (drawn ve× high) and of N (another nx× on top). */
export const Z_PER_M = L.ve / L.mPerUnit;
export const N_Z_PER_M = Z_PER_M * L.nx;

// ---------------------------------------------------------------- the undulation field

/** Geoid undulation N (m) at a point of the diorama given in metres (x toward the sea, y away from the viewer). */
export function undulationAt(xM: number, yM: number): number {
  const { far, sigma, ids, weights } = L.nField;
  let n = far;
  ids.forEach((id, i) => {
    const dx = xM - STATIONS[id].x;
    const dy = yM - STATIONS[id].y;
    n += weights[i] * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
  });
  return n;
}

/** World height of the ground, the geoid and the (flat) ellipsoid. */
export const groundZ = (H: number, N: number) => H * Z_PER_M + N * N_Z_PER_M;
export const geoidZ = (N: number) => N * N_Z_PER_M;
export const ELLIPSOID_Z = 0;

export const stationWorld = (id: StationId): Vec3 => {
  const s = L.stations[id];
  return [s.x, s.y, s.z];
};

// ---------------------------------------------------------------- the camera

/** Pixel position of a world point in a landscape box of `size` (origin top-left). */
export function project(p: Vec3, size: Size): Pt {
  const m = L.camera;
  const [x, y, z] = p;
  const cx = m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3];
  const cy = m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3];
  const cw = m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3];
  return { x: ((cx / cw + 1) / 2) * size.w, y: ((1 - cy / cw) / 2) * size.h };
}

/** Where each station's ground point lands in the box. */
export function stationPins(size: Size): Record<StationId, Pt> {
  return Object.fromEntries(STATION_IDS.map((id) => [id, project(stationWorld(id), size)])) as Record<StationId, Pt>;
}

/** Closed ring of `r` metres around a station, lying on its ground (SVG path). */
export function stationRing(id: StationId, size: Size, r = 60): string {
  const [x, y, z] = stationWorld(id);
  const pts = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return project([x + (Math.cos(a) * r) / L.mPerUnit, y + (Math.sin(a) * r) / L.mPerUnit, z], size);
  });
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
}

// ---------------------------------------------------------------- the survey line

const LINE = L.line;
const N_SAMPLES = LINE.H.length;
/** x (m) of sample i: the line runs from the model's left edge to its right edge. */
const xOfSample = (i: number) => -L.width / 2 * L.mPerUnit + i * LINE.step;
const worldX = (i: number) => xOfSample(i) / L.mPerUnit;
const fmt = (p: Pt[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

/**
 * The dashed survey line draped on the closed model, as SVG path runs: only
 * where the camera sees it (the render recorded what ridges hide), riding the
 * water over the sea.
 */
export function surveyLinePath(size: Size): string {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    if (LINE.visible[i] !== '1') {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    const z = Math.max(groundZ(LINE.H[i], LINE.N[i]), geoidZ(LINE.N[i])) + 0.004;
    run.push(project([worldX(i), L.lineY, z], size));
  }
  if (run.length > 1) runs.push(run);
  return runs.map(fmt).join(' ');
}

/**
 * The three lines on the cut face (the plane of the survey line), projected:
 * the ground's edge over the land, the geoid and the ellipsoid. Nothing stands
 * in front of the face once the slab is open, so these are never hidden.
 */
export function cutFaceLines(size: Size): { ground: string; geoid: string; ellipsoid: string; geoidLeft: Pt; ellipsoidLeft: Pt } {
  const ground: Pt[] = [];
  const geoid: Pt[] = [];
  const ell: Pt[] = [];
  for (let i = 0; i < N_SAMPLES; i += 2) {
    const x = worldX(i);
    const N = LINE.N[i];
    if (LINE.H[i] >= 0) ground.push(project([x, L.lineY, groundZ(LINE.H[i], N)], size));
    geoid.push(project([x, L.lineY, geoidZ(N)], size));
    ell.push(project([x, L.lineY, ELLIPSOID_Z], size));
  }
  return { ground: fmt(ground), geoid: fmt(geoid), ellipsoid: fmt(ell), geoidLeft: geoid[0], ellipsoidLeft: ell[0] };
}

// ---------------------------------------------------------------- the illustration's column

/** Gap between the stage and the section, and above the task view's legend (px). */
export const GAP = 8;
/** The ellipsoid view lends the stage this much of the section's height (px): a bigger body, a smaller local section. */
export const ELLIPSOID_EXTRA = 60;
/** The section's share of what is left under the stage, and its limits (px): readable at the shortest screen, never steeper than SECTION_MAX_VE at the tallest. */
const SECTION_SHARE = 0.4;
export const SECTION_H = { explain: [200, 276], mission: [184, 214] } as const;

/** How a column of `height` px splits between the stage, the section and the task view's legend (`footer` px). */
export function illustrationSplit(height: number, mission: boolean, footer: number) {
  const room = height - GAP - (mission ? footer + GAP : 0);
  const [lo, hi] = mission ? SECTION_H.mission : SECTION_H.explain;
  const section = Math.round(Math.min(hi, Math.max(lo, room * SECTION_SHARE)));
  return { stage: room - section, section };
}

// ---------------------------------------------------------------- the local section

/** Section frame (px): line names live left of the plot, as in the mockup. */
export const SECTION = { plotLeft: 136, padRight: 12, padTop: 34, padBottom: 30, bulge: 10 } as const;

export type SectionGeometry = {
  width: number;
  height: number;
  /** One scale for H, h and N (px per metre), and the horizontal scale (px per metre). */
  kV: number;
  kH: number;
  stations: Record<StationId, { x: number; ground: number; geoid: number; ellipsoid: number }>;
  terrainPath: string;
  groundFillPath: string;
  seaPath: string;
  gapPath: string;
  geoidPath: string;
  ellipsoidPath: string;
  /** Line ends at the plot's left edge, for the line-name labels. */
  leftEnds: { x: number; ground: number; geoid: number; ellipsoid: number };
};

/**
 * @param width   section width (px) — the illustration's width
 * @param height  section height (px)
 * @param pinX    each station's pin x in the same box (px), from stationPins(); without a
 *                landscape above (the ellipsoid view) the stations spread over the plot instead
 */
/** The section is never drawn steeper than this many times its horizontal scale. */
export const SECTION_MAX_VE = 5;

export function sectionGeometry(width: number, height: number, pinX?: Record<StationId, number>): SectionGeometry {
  const left = SECTION.plotLeft;
  const right = width - SECTION.padRight;
  const sOf = (id: StationId) => L.stations[id].s;
  const sB = sOf('B');
  const dC = sOf('C') - sB;
  const dA = sOf('A') - sB;
  let xB: number;
  let kH: number;
  if (pinX) {
    // One horizontal scale: B straight below its pin, the slope fitted to C's and A's pins
    // (least squares) and kept inside the plot.
    xB = pinX.B;
    kH = (dC * (pinX.C - xB) + dA * (pinX.A - xB)) / (dC * dC + dA * dA);
  } else {
    kH = (right - 70 - (left + 40)) / (dA - dC);
    xB = left + 40 - dC * kH;
  }
  kH = Math.min(kH, (xB - (left + 16)) / -dC, (right - 60 - xB) / dA);
  const xOfS = (s: number) => xB + (s - sB) * kH;

  const samples = LINE.H.map((H, i) => ({ H, N: LINE.N[i], x: xOfS(i * LINE.step) })).filter(
    (p) => p.x >= left - 1 && p.x <= right + 1,
  );
  // One vertical scale for everything, fitted to the tallest stack above the ellipsoid in the plot —
  // but never steeper than SECTION_MAX_VE; a tall frame keeps the rest as room above and below.
  const tallest = Math.max(...samples.map((p) => Math.max(0, p.N) + Math.max(0, p.H)));
  const room = height - SECTION.padBottom - SECTION.bulge - SECTION.padTop;
  const kV = Math.min(room / tallest, kH * SECTION_MAX_VE);
  const base = height - SECTION.padBottom - (room - kV * tallest) * 0.6;
  const mid = (left + right) / 2;
  const half = (right - left) / 2;
  const yE = (x: number) => base - SECTION.bulge * (1 - ((x - mid) / half) ** 2);

  const pts = samples.map((p) => {
    const e = yE(p.x);
    const g = e - kV * p.N;
    return { x: p.x, e, g, t: g - kV * p.H, H: p.H };
  });
  const f = (v: number) => v.toFixed(1);
  const line = (key: 'e' | 'g' | 't', list = pts) => list.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p[key])}`).join(' ');
  const back = (key: 'e' | 'g' | 't', list: typeof pts) =>
    list
      .slice()
      .reverse()
      .map((p) => `L${f(p.x)},${f(p[key])}`)
      .join(' ');
  const sea = pts.filter((p, i) => p.H < 0 || (pts[i + 1] && pts[i + 1].H < 0));
  const land = pts.filter((p, i) => p.H >= 0 || (pts[i - 1] && pts[i - 1].H >= 0));
  const first = pts[0];
  const last = pts[pts.length - 1];

  const stations = Object.fromEntries(
    STATION_IDS.map((id) => {
      const x = xOfS(sOf(id));
      const e = yE(x);
      const g = e - kV * STATIONS[id].N;
      return [id, { x, ellipsoid: e, geoid: g, ground: g - kV * L.stations[id].heightM }];
    }),
  ) as SectionGeometry['stations'];

  return {
    width,
    height,
    kV,
    kH,
    stations,
    terrainPath: line('t', land),
    groundFillPath: `${line('t')} L${f(last.x)},${height} L${f(first.x)},${height} Z`,
    seaPath: sea.length ? `${line('g', sea)} ${back('t', sea)} Z` : '',
    gapPath: `${line('g')} ${back('e', pts)} Z`,
    geoidPath: line('g'),
    ellipsoidPath: line('e'),
    leftEnds: { x: first.x, ground: first.t, geoid: first.g, ellipsoid: first.e },
  };
}
