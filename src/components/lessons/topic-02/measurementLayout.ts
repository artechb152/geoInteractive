/**
 * Measurement mission — pure layout math (no React), shared by the turnable
 * landscape (measurementView), the ellipsoid's marked area (ellipsoidView) and
 * the SVG section, so all three describe one landscape and one line.
 *
 *   The landscape is scripts/blender/render_measurement_landscape.py's: its
 *   scale, stations, N field and survey-line samples are in
 *   measurementLandscape.data.ts.
 *   undulationAt()  ONE smooth N field (exact at the stations). The model
 *                   stands on the geoid it describes: land is lifted by its N,
 *                   the smooth ellipsoid is the flat level z = 0, and the
 *                   survey line's plane in the model and the section sample
 *                   the same field along the line.
 *   SURVEY_SPAN     the stretch of the survey line the section draws — ONE
 *                   definition shared by the line on the landscape, the marked
 *                   area on the ellipsoid and its enlargement.
 *   sectionGeometry()  the section along that stretch: one horizontal scale
 *                   and one vertical scale for H, h and N.
 *   DISPLAY_VE      ONE display mapping of height for both representations:
 *                   the model and the section draw every height (H, h and N
 *                   alike) DISPLAY_VE times their own horizontal scale. Only
 *                   the drawing is exaggerated — the data (H, h, N in metres)
 *                   never change. With the model framed so the survey line's
 *                   stretch is as long on screen as in the section
 *                   (measurementView.landCamera), the line's relief stands
 *                   equally high in both.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { STATIONS, type StationId } from './measurementMission.data';

export type Vec3 = readonly [number, number, number];
export type Size = { w: number; h: number };
export type Pt = { x: number; y: number };

export const STATION_IDS: readonly StationId[] = ['C', 'B', 'A'];

/**
 * Heights are drawn this many times their horizontal scale, in the model and in the section
 * (the section's caption says "הגבהים מוגזמים"). The landscape data were rendered at L.ve.
 */
export const DISPLAY_VE = 6;
/** The source data's world z (rendered at L.ve) → the displayed z. */
export const Z_SCALE = DISPLAY_VE / L.ve;
/** World units per metre: of H, and of N (another nx× on top). */
export const Z_PER_M = DISPLAY_VE / L.mPerUnit;
export const N_Z_PER_M = Z_PER_M * L.nx;
/** A world point from the landscape data (stations, place names), at the displayed height. */
export const displayed = (p: readonly [number, number, number]): Vec3 => [p[0], p[1], p[2] * Z_SCALE];

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

/** A station's ground point in the model: its ellipsoidal height h, drawn. */
export const stationWorld = (id: StationId): Vec3 => {
  const s = L.stations[id];
  return [s.x, s.y, STATIONS[id].h * Z_PER_M];
};

const LINE = L.line;

// ---------------------------------------------------------------- the local section

/**
 * The stretch of the survey line the section draws (m along the line from the
 * model's left edge): from the ridge's flank short of C, past A, into the sea.
 * The dashed line on the landscape, the line across the ellipsoid's marked
 * area and the line across its enlargement all run over exactly this stretch,
 * C at the left end and A toward the right, as in the section.
 */
export const SURVEY_SPAN = { s0: 900, s1: 4400 } as const;
/** Where a point along the span lies, as a fraction of it (0 … 1). */
export const spanAt = (s: number) => (s - SURVEY_SPAN.s0) / (SURVEY_SPAN.s1 - SURVEY_SPAN.s0);

/** Section frame (px): line names live left of the plot, room above for the station pins. */
export const SECTION = { plotLeft: 118, padRight: 10, padTop: 36, padBottom: 6, bulge: 10 } as const;

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
  /** The span's two ends on the ground line (the marked line's anchors). */
  spanEnds: [Pt, Pt];
};

/**
 * The section draws heights DISPLAY_VE times its horizontal scale — the model's own exaggeration,
 * so the two stand equally high. Only a frame too short for that (a very low window) draws them
 * flatter. At 6× A's arrows still read as arrows (H 30 m ≈ 20 px, h 18 m ≈ 12 px, N −12 m ≈ 8 px
 * at 1440 px); its caption says the heights are exaggerated.
 */
export const SECTION_MAX_VE = DISPLAY_VE;

/**
 * @param width   section width (px)
 * @param height  section height (px)
 * The plot runs over SURVEY_SPAN exactly, C → A from left to right; it does not
 * register with any camera, so turning the model never changes it.
 */
export function sectionGeometry(width: number, height: number): SectionGeometry {
  const left = SECTION.plotLeft;
  const right = width - SECTION.padRight;
  const sOf = (id: StationId) => L.stations[id].s;
  const kH = (right - left) / (SURVEY_SPAN.s1 - SURVEY_SPAN.s0);
  const xOfS = (s: number) => left + (s - SURVEY_SPAN.s0) * kH;

  const samples = LINE.H.map((H, i) => ({ H, N: LINE.N[i], x: xOfS(i * LINE.step) })).filter(
    (p) => p.x >= left - 0.5 && p.x <= right + 0.5,
  );
  // One vertical scale for everything: the model's DISPLAY_VE — flatter only if the tallest stack above
  // the ellipsoid would not fit; a tall frame keeps the rest as room above and below.
  const tallest = Math.max(...samples.map((p) => Math.max(0, p.N) + Math.max(0, p.H)));
  const room = height - SECTION.padBottom - SECTION.bulge - SECTION.padTop;
  const kV = Math.min(room / tallest, kH * SECTION_MAX_VE);
  // spare height goes mostly above the ground: the section sits low, like the model beside it (which
  // stands on its frame's floor), so neither leaves empty paper under it
  const base = height - SECTION.padBottom - (room - kV * tallest) * 0.15;
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
    spanEnds: [
      { x: first.x, y: first.t },
      { x: last.x, y: Math.min(last.t, last.g) },
    ],
  };
}
