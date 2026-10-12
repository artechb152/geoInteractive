/**
 * Scenario contract for the lesson-6 terrain-association activity ("ניווט לפי השטח",
 * design/mockups/combatnav-concepts-2026-10-12/claude-terrain-navigation-prompt.txt §6–7).
 *
 * A fictional training area in a local metric grid — not a real, surveyed place
 * and not a live GPS: E grows east, N grows north, origin at the south-west
 * corner, 0 ≤ E ≤ 1400, 0 ≤ N ≤ 1750. Every distance is horizontal (in the map
 * plane) and every bearing is relative to the shared local grid north, which is
 * also the compass north of the exercise (no magnetic declination is modelled).
 *
 * This file is the single source for every view: the height generator's
 * landforms, the cover (groves, woodland, orchards, fields, village, square,
 * water tower), the roads and the stream, A, B and the route. The 3D model, the
 * printed map, the measurements and the practice evaluation read them by the
 * same ids. Nothing here is rounded; rounding happens on display only.
 *
 * No imports, so plain Node runs it (scripts/qa/terrain-nav.test.mjs).
 */

export type Point = { readonly E: number; readonly N: number };
export type XY = readonly [number, number];

export const WORLD_BOUNDS = { minE: 0, maxE: 1400, minN: 0, maxN: 1750 } as const;

/** Contour interval and index interval of the printed map — scenario values, metres. */
export const CONTOUR_INTERVAL_M = 10;
export const INDEX_INTERVAL_M = 50;

// ---------------------------------------------------------------- relief (generator input)

/**
 * A rounded summit: a smooth bump on the regional surface. `rise` is its height
 * above that surface, `r` its radius (m) along / across `axisDeg` (a grid
 * bearing). The real summit position and height are read back from the grid
 * (terrainNavTerrain summits()), never from these numbers.
 */
export type DomeSpec = { readonly id: DomeId; readonly E: number; readonly N: number; readonly rise: number; readonly rAlong: number; readonly rAcross: number; readonly axisDeg: number };

export type DomeId = 'H1' | 'H2' | 'H3' | 'D1' | 'D2' | 'D3' | 'D4';
/** H1–H3 are the route's hilltops (כיפה 1–3); D1–D4 are look-alike domes nearby. */
export const ROUTE_DOMES = ['H1', 'H2', 'H3'] as const;

export const DOMES: readonly DomeSpec[] = [
  { id: 'H1', E: 975, N: 520, rise: 66, rAlong: 205, rAcross: 170, axisDeg: 115 },
  { id: 'H2', E: 690, N: 880, rise: 74, rAlong: 215, rAcross: 180, axisDeg: 150 },
  { id: 'H3', E: 565, N: 1270, rise: 62, rAlong: 200, rAcross: 165, axisDeg: 60 },
  { id: 'D1', E: 1305, N: 770, rise: 42, rAlong: 190, rAcross: 150, axisDeg: 10 },
  { id: 'D2', E: 950, N: 1150, rise: 56, rAlong: 190, rAcross: 160, axisDeg: 40 },
  { id: 'D3', E: 255, N: 995, rise: 54, rAlong: 185, rAcross: 155, axisDeg: 165 },
  { id: 'D4', E: 985, N: 1525, rise: 52, rAlong: 195, rAcross: 160, axisDeg: 100 },
];

/** A broad ridge line: height above the regional surface along the line, falling off over `width` m to either side. */
export type RidgeSpec = { readonly pts: readonly XY[]; readonly rise: readonly number[]; readonly width: number };

export const RIDGES: readonly RidgeSpec[] = [
  // The eastern ridge, rising to the north-east corner (D1 sits on it).
  { pts: [[1330, -300], [1310, 300], [1300, 700], [1330, 1100], [1390, 1550], [1450, 2100]], rise: [14, 20, 22, 34, 50, 58], width: 220 },
  // The broad saddle between H2 and H3.
  { pts: [[690, 880], [640, 1070], [570, 1265]], rise: [8, 14, 8], width: 170 },
  // A low ridge from H3 north-east to D4 and on to the northern edge.
  { pts: [[570, 1270], [760, 1400], [985, 1525], [1150, 1640], [1300, 1850]], rise: [6, 12, 14, 18, 24], width: 190 },
];

// ---------------------------------------------------------------- drainage

export type StreamId = 'stream';
/**
 * The perennial stream — a narrow water course in a carved valley, rising at a
 * spring in the north-east of the sheet and leaving in the west. Its bed lies
 * incisionM below the natural ground and never rises downstream
 * (terrainNavTerrain waterCourses()); the carve and the water ribbon follow it.
 */
export const STREAM = {
  id: 'stream' as StreamId,
  pts: [
    [1255, 1410],
    [1218, 1330],
    [1196, 1255],
    [1150, 1170],
    [1112, 1098],
    [1090, 1040],
    [1040, 975],
    [1005, 920],
    [950, 870],
    [905, 800],
    [850, 770],
    [800, 705],
    [745, 680],
    [690, 615],
    [625, 585],
    [565, 525],
    [500, 505],
    [430, 458],
    [360, 450],
    [290, 410],
    [220, 395],
    [150, 360],
    [60, 345],
    [-80, 300],
  ] as readonly XY[],
  /** Depth of the bed below the natural ground, metres. */
  incisionM: 5,
  /** Water surface width, metres (the map's line width matches it). */
  waterWidthM: 4,
} as const;

export type GullyId = 'gully-west' | 'gully-north' | 'gully-south';
/**
 * Dry side gullies (ערוצים) feeding the stream: carved into the slopes the same
 * way (incisionM below the ground, a bed that never rises downstream); drawn on
 * the map as dashed blue lines.
 */
export const GULLIES: readonly { id: GullyId; pts: readonly XY[]; incisionM: number }[] = [
  // From the village shoulder south, west of H2/D3, to the stream.
  { id: 'gully-west', pts: [[110, 1460], [135, 1330], [150, 1200], [128, 1080], [132, 960], [118, 830], [124, 700], [150, 560], [165, 470], [205, 390]], incisionM: 3 },
  // Between H3/H2 and D2, down to the stream.
  { id: 'gully-north', pts: [[760, 1300], [790, 1215], [800, 1130], [822, 1045], [835, 960], [860, 880], [870, 800], [880, 765]], incisionM: 3 },
  // From the south-east, between H1 and the southern knolls, to the stream.
  { id: 'gully-south', pts: [[930, 160], [880, 235], [840, 300], [800, 370], [760, 430], [725, 490], [700, 540], [690, 590]], incisionM: 3 },
];

// ---------------------------------------------------------------- cover

export type GroveId = 'G1' | 'G2' | 'G3';
/** Planted pine groves (חורשות) — polygons in metres; each tree is generated inside (terrainNavTerrain groveTrees()). */
export const GROVES: readonly { id: GroveId; ring: readonly XY[]; seed: number }[] = [
  // On H1's north-west flank, between the summit and the stream (wholly on the stream's south-east bank).
  { id: 'G1', ring: [[840, 610], [885, 585], [925, 612], [930, 668], [903, 715], [860, 730], [826, 700], [820, 645]], seed: 0x6a09e667 },
  // On H3's west flank.
  { id: 'G2', ring: [[395, 1205], [440, 1170], [480, 1200], [490, 1265], [470, 1330], [420, 1350], [380, 1310], [370, 1250]], seed: 0xbb67ae85 },
  // On D2's north flank.
  { id: 'G3', ring: [[960, 1195], [1015, 1180], [1075, 1205], [1095, 1260], [1050, 1300], [985, 1290], [950, 1245]], seed: 0x3c6ef372 },
];

/** Natural woodland (חורש) — scattered oak and carob on the slopes, polygons in metres. Summit cores are kept open. */
export const WOODLAND: readonly { id: string; ring: readonly XY[] }[] = [
  { id: 'W-H2', ring: [[560, 900], [600, 990], [700, 1030], [800, 990], [830, 900], [800, 960], [720, 990], [640, 960]] },
  { id: 'W-east', ring: [[1170, 760], [1220, 860], [1330, 900], [1400, 860], [1400, 980], [1300, 1010], [1190, 940], [1140, 840]] },
  { id: 'W-D3', ring: [[150, 1030], [210, 1110], [320, 1130], [380, 1060], [360, 1110], [260, 1170], [160, 1140]] },
  { id: 'W-south', ring: [[560, 180], [650, 140], [760, 170], [800, 240], [740, 300], [640, 290], [570, 250]] },
  { id: 'W-D4', ring: [[800, 1480], [860, 1540], [960, 1550], [1030, 1500], [1010, 1560], [900, 1600], [800, 1560]] },
];

/** Olive orchards (מטעי זיתים) — planted in rows along `rowDeg` (a grid bearing). */
export const ORCHARDS: readonly { id: string; ring: readonly XY[]; rowDeg: number; spacingM: number }[] = [
  { id: 'O-village-south', ring: [[170, 1330], [300, 1320], [420, 1400], [400, 1455], [250, 1450], [160, 1420]], rowDeg: 78, spacingM: 9 },
  { id: 'O-tower', ring: [[560, 1560], [700, 1560], [720, 1625], [640, 1650], [560, 1630]], rowDeg: 95, spacingM: 9 },
];

/** Cultivated fields (שדות) — open ground with crop strips along `stripDeg`. */
export const FIELDS: readonly { id: string; ring: readonly XY[]; stripDeg: number; crop: 0 | 1 | 2 }[] = [
  { id: 'F-west-1', ring: [[30, 250], [190, 290], [250, 340], [230, 370], [80, 345], [20, 320]], stripDeg: 72, crop: 0 },
  { id: 'F-west-2', ring: [[300, 330], [470, 360], [520, 415], [450, 430], [300, 395]], stripDeg: 68, crop: 1 },
  { id: 'F-west-3', ring: [[40, 395], [200, 420], [330, 450], [300, 520], [120, 500], [40, 470]], stripDeg: 74, crop: 2 },
  { id: 'F-south', ring: [[880, 120], [1060, 100], [1110, 170], [1050, 250], [900, 250]], stripDeg: 10, crop: 1 },
  { id: 'F-east', ring: [[1180, 1030], [1290, 1060], [1360, 1140], [1300, 1180], [1200, 1130]], stripDeg: 40, crop: 0 },
  { id: 'F-village-west', ring: [[20, 1500], [140, 1500], [170, 1640], [100, 1700], [20, 1680]], stripDeg: 2, crop: 2 },
];

// ---------------------------------------------------------------- the village

/** B — the village's central square; also the route's destination. */
export const SQUARE_CENTER: Point = { E: 300, N: 1560 };
/** The paved square (כיכר), metres. */
export const SQUARE_RING: readonly XY[] = [
  [276, 1538],
  [326, 1536],
  [330, 1584],
  [278, 1586],
];
/** Village water tower (מגדל מים) — a landmark on a small rise east of the houses. */
export const WATER_TOWER: Point = { E: 530, N: 1585 };
/** Outline of the built-up area, metres (land cover; the houses are generated inside it, off the streets). */
export const VILLAGE_RING: readonly XY[] = [
  [170, 1440],
  [330, 1430],
  [430, 1490],
  [470, 1570],
  [450, 1660],
  [330, 1720],
  [190, 1700],
  [140, 1600],
];

// ---------------------------------------------------------------- roads

export type RoadId = 'road-west' | 'track-east' | 'road-north' | 'lane-village';
/** Dirt-road width, metres — the same in the model and on the map. */
export const ROAD_WIDTH_M = 6;
/**
 * Road control points; a smooth curve passes through every one of them
 * (terrainNavTerrain roads()). The western road climbs from the south, past A,
 * along the stream and up the west side into the square; the eastern track runs
 * north from A at the foot of H1 (east of it, west of D1) to the stream ford; the
 * northern road leaves the square east past the water tower.
 */
export const ROAD_CONTROL_POINTS: Record<RoadId, readonly XY[]> = {
  'road-west': [
    [1250, -40],
    [1215, 90],
    [1170, 170],
    [1060, 225],
    [930, 260],
    [810, 300],
    [700, 360],
    [600, 420],
    [505, 470],
    [440, 545],
    [400, 700],
    [370, 860],
    [395, 1020],
    [330, 1170],
    [300, 1320],
    [296, 1440],
    [300, 1536],
  ],
  'track-east': [
    [1170, 170],
    [1185, 300],
    [1175, 420],
    [1150, 540],
    [1140, 660],
    [1130, 790],
    [1100, 900],
    [1050, 985],
    [985, 1045],
    [905, 1105],
    [855, 1225],
    [835, 1380],
    [840, 1520],
    [840, 1640],
  ],
  'road-north': [
    [326, 1572],
    [400, 1600],
    [470, 1612],
    [560, 1610],
    [700, 1640],
    [840, 1640],
    [980, 1665],
    [1150, 1700],
    [1300, 1730],
    [1460, 1790],
  ],
  'lane-village': [
    [278, 1570],
    [220, 1590],
    [175, 1640],
    [150, 1700],
  ],
};

// ---------------------------------------------------------------- the route

/** A — the start, at the road junction in the south-east (a known point, not a verified leg). */
export const START: Point = { E: 1170, N: 170 };

export type CheckpointId = 'H1' | 'H2' | 'H3' | 'B';
/**
 * The route: A → כיפה 1 → כיפה 2 → כיפה 3 → the square (B). A hilltop
 * checkpoint is that dome's real summit, read from the height grid
 * (terrainNavTerrain checkpoint()); B is SQUARE_CENTER.
 */
export const ROUTE: readonly CheckpointId[] = ['H1', 'H2', 'H3', 'B'];

export const CHECKPOINT_LABEL: Record<CheckpointId, string> = {
  H1: 'כיפה 1',
  H2: 'כיפה 2',
  H3: 'כיפה 3',
  B: 'הכיכר המרכזית (B)',
};

/** Eye height above the ground for the navigator's view, metres. */
export const EYE_HEIGHT_M = 1.7;

// ---------------------------------------------------------------- distant hills (outside the sheet)

/** Hills beyond the mapped sheet: the horizon of the navigator's view. Part of the same generator. */
export const DISTANT_HILLS: readonly { E: number; N: number; rise: number; r: number }[] = [
  { E: 2600, N: 1900, rise: 170, r: 900 },
  { E: 2400, N: -400, rise: 110, r: 800 },
  { E: 700, N: 3200, rise: 140, r: 1000 },
  { E: -1300, N: 2100, rise: 120, r: 900 },
  { E: -1100, N: -300, rise: 70, r: 800 },
  { E: 900, N: -1600, rise: 90, r: 900 },
  { E: 3600, N: 600, rise: 190, r: 1100 },
];
