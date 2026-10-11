/* ─────────── מערכות ייחוס — "אותה נקודה, שתי שפות": data ───────────
   Brief: design/mockups/topic-02-reference-systems-2026-10-11/claude-linked-comparison-prompt.md

   ILLUSTRATED TERRAIN — NOT A MAP OF A REAL PLACE. The base image
   (public/assets/lessons/topic02/reference-systems/linked-terrain-base.webp,
   built by scripts/maps/build-reference-systems-terrain.mjs from the features
   below) is drawn for the lesson. It is given a synthetic teaching
   registration inside a valid range of WGS84 / UTM zone 36N (EPSG:32636),
   wholly inside zone 36 and the northern hemisphere, so that the two
   readings of each point are real conversions of each other.

   One source of truth:
     EXTENT   the image, in UTM metres (east grows right, north grows up)
     POINTS   E / N of A, B, C — integers, the stored values
     lat/lon  never stored: derived by fromUtm() (utm.ts) on demand
   Everything the page draws (both grids, labels, markers, rings, scale bar)
   is computed from these in referenceSystemsGeometry.ts. */

import type { UtmZone } from './utm';

/** The datum both readings share — locked; there is no datum selector. */
export const DATUM = 'WGS84';
/** EPSG codes of the two readings (documentation; the page shows the names). */
export const CRS = { geographic: 'EPSG:4326', projected: 'EPSG:32636' } as const;
export const ZONE: UtmZone = { zone: 36, hemisphere: 'N' };

/** The base image covers exactly this square, 1 px = 1 m. */
export const EXTENT = { eMin: 700000, eMax: 702000, nMin: 3520000, nMax: 3522000 } as const;
export const EXTENT_W = EXTENT.eMax - EXTENT.eMin;
export const EXTENT_H = EXTENT.nMax - EXTENT.nMin;
export const IMAGE_PX = 2000;

/** Local metres used by the image and the overlays: x east from eMin, y south from nMax. */
export const localX = (e: number) => e - EXTENT.eMin;
export const localY = (n: number) => EXTENT.nMax - n;
export const eastOf = (x: number) => EXTENT.eMin + x;
export const northOf = (y: number) => EXTENT.nMax - y;

/** The window both maps show — one crop for both sides (5:4, 80 % of the image's height,
    set so the B pin clears the top label row). */
export const VIEW = { x: 0, y: 150, w: 2000, h: 1600 } as const;

/** UTM grid every 500 m; graticule every 15″. */
export const UTM_STEP_M = 500;
export const GRATICULE_STEP_SEC = 15;
export const SCALE_BAR_M = 500;

export type PointId = 'A' | 'B' | 'C';

export type TeachingPoint = {
  id: PointId;
  /** Stored reading, WGS84 / UTM 36N, whole metres. */
  e: number;
  n: number;
  /** The feature it marks, outlined on both maps when selected: an ellipse in local metres. */
  ring: { rx: number; ry: number; rot: number };
};

/* A sits on the bridge deck, B on the ridge summit, C in the middle of the
   village. Their local positions are the anchors the terrain is built around
   (TERRAIN below), so a marker can never drift off its feature. */
export const POINTS: readonly TeachingPoint[] = [
  { id: 'A', e: 701125, n: 3521095, ring: { rx: 118, ry: 52, rot: -8 } },
  { id: 'B', e: 700430, n: 3521480, ring: { rx: 105, ry: 105, rot: 0 } },
  { id: 'C', e: 700570, n: 3520715, ring: { rx: 175, ry: 128, rot: -12 } },
];

export const START_POINT: PointId = 'A';

const P = Object.fromEntries(POINTS.map((p) => [p.id, { x: localX(p.e), y: localY(p.n) }])) as Record<PointId, { x: number; y: number }>;

/* ── The illustrated terrain (local metres) ─────────────────────────────────
   Used only by the build script; kept here so its anchors and the points
   above cannot disagree. Symbols are drawn larger than life (as on any
   map): road 14 m, bridge deck 22 m, houses ≈ 34 × 24 m. */
export const TERRAIN = {
  /** River centre line, north → south (smoothed by the build script). */
  river: [
    [1236, -60], [1210, 110], [1128, 250], [1150, 400], [1282, 520], [1300, 655], [1192, 782],
    [P.A.x - 2, P.A.y], [1178, 1040], [1300, 1150], [1336, 1300], [1226, 1452], [1186, 1600],
    [1262, 1760], [1322, 1905], [1300, 2060],
  ] as [number, number][],
  riverWidth: 64,
  /** Bridge deck, west end → east end, crossing the river at A. */
  bridge: { from: [P.A.x - 82, P.A.y + 11] as [number, number], to: [P.A.x + 82, P.A.y - 11] as [number, number], width: 22 },
  /** Ridge crest, NNW → SSE, with B as its summit. */
  ridge: {
    crest: [[150, 90], [300, 300], [P.B.x, P.B.y], [520, 730], [600, 900], [650, 1030]] as [number, number][],
    summit: [P.B.x, P.B.y] as [number, number],
    height: 210,
  },
  /** Low hills in the north-east corner. */
  hills: [
    { at: [1720, 300] as [number, number], r: 330, height: 120 },
    { at: [1880, 640] as [number, number], r: 220, height: 55 },
  ],
  village: { center: [P.C.x, P.C.y] as [number, number] },
  roads: [
    // main road: west edge → village → bridge → east edge
    { width: 14, path: [[-30, 1395], [180, 1360], [380, 1318], [P.C.x - 40, P.C.y + 10], [P.C.x + 120, P.C.y - 30], [800, 1160], [930, 1045], [1010, 960], [P.A.x - 82, P.A.y + 11]] },
    { width: 14, path: [[P.A.x + 82, P.A.y - 11], [1330, 862], [1530, 770], [1770, 705], [2040, 650]] },
    // east-bank road south
    { width: 12, path: [[1330, 862], [1420, 1000], [1462, 1200], [1470, 1420], [1520, 1640], [1580, 2040]] },
    // village street south
    { width: 10, path: [[P.C.x + 20, P.C.y - 20], [P.C.x + 40, P.C.y + 110], [P.C.x + 10, P.C.y + 250], [P.C.x - 30, P.C.y + 420]] },
  ] as { width: number; path: [number, number][] }[],
  /** Unpaved track from the village up to the summit. */
  track: { width: 6, path: [[P.C.x - 60, P.C.y - 30], [P.C.x - 120, P.C.y - 170], [470, 1060], [500, 900], [470, 760], [P.B.x + 30, P.B.y + 110], [P.B.x + 8, P.B.y + 22]] as [number, number][] },
} as const;
