/**
 * The practice area of the planning lab („לפני שיוצאים: מה צריך לתכנן?”, lesson 6).
 *
 * A fictional training sheet in a local metric grid — an example for practice,
 * not a surveyed place: E grows east, N grows north, origin at the south-west
 * corner, 0 ≤ E ≤ 1000, 0 ≤ N ≤ 1200. Distances are horizontal (in the map
 * plane), directions are relative to the grid north at the top of the map.
 *
 * The geography follows the planning tips of the lesson: the start (A) beside a
 * prominent building, a stream south of a two-summit ridge, a ravine that climbs
 * from the stream to the saddle between the summits, a dirt road in the valley
 * north of the ridge, and the destination (B) in a pine grove on rocky ground.
 * The straight line A → B passes over the western summit.
 *
 * This file is the one source of the landforms, the cover, the roads and water,
 * A and B: the height generator, the printed map, the 3D model and the planning
 * measurements all read them. Nothing here is rounded. No imports, so plain Node
 * runs it (scripts/qa/planning-lab.test.mjs).
 */

export type Point = { readonly E: number; readonly N: number };
export type XY = readonly [number, number];

export const WORLD = { minE: 0, maxE: 1000, minN: 0, maxN: 1200 } as const;

/** Contour interval and index interval of the printed map, metres. */
export const CONTOUR_INTERVAL_M = 10;
export const INDEX_INTERVAL_M = 50;

// ---------------------------------------------------------------- the two ends

/** A — the start, on the access road beside the prominent building. */
export const START: Point = { E: 785, N: 152 };
/** B — the destination, in the pine grove, among the rocks. */
export const DEST: Point = { E: 175, N: 1075 };

/** The prominent building beside A: a two-storey stone house with a water tank on a stand. */
export const BUILDING = { E: 826, N: 152, lenM: 17, widM: 10, angleDeg: 98 } as const;
export const WATER_TANK: Point = { E: 812, N: 176 };

// ---------------------------------------------------------------- relief (generator input)

export type PeakId = 'peak-west' | 'peak-east';

/**
 * The two summits of the ridge: rounded domes on the regional surface. `rise`
 * is the height above that surface, `r` the radius along / across `axisDeg`. The
 * real summit position and height are read back from the height grid
 * (planningLabTerrain summits()), never from these numbers.
 */
export const PEAKS: readonly { readonly id: PeakId; readonly E: number; readonly N: number; readonly rise: number; readonly rAlong: number; readonly rAcross: number; readonly axisDeg: number }[] = [
  { id: 'peak-west', E: 420, N: 655, rise: 182, rAlong: 250, rAcross: 210, axisDeg: 78 },
  { id: 'peak-east', E: 848, N: 640, rise: 140, rAlong: 235, rAcross: 195, axisDeg: 96 },
];

/**
 * The ridge crest between the summits: its rise above the regional surface at
 * each vertex, eased between them. The middle vertex is the saddle (אוכף) —
 * the lowest point along the crest and the highest across it. Its true place
 * is read back from the grid (planningLabTerrain saddle()).
 */
export const CREST = {
  pts: [
    [300, 672],
    [420, 655],
    [640, 628],
    [848, 640],
    [980, 660],
  ] as readonly XY[],
  rise: [96, 136, 92, 124, 84] as readonly number[],
  widthM: 165,
} as const;

/** Low ground around the ridge: a knoll south of the start and the knoll that carries the grove. */
export const KNOLLS: readonly { readonly E: number; readonly N: number; readonly rise: number; readonly r: number }[] = [
  { E: 720, N: -160, rise: 46, r: 330 },
  { E: 180, N: 1125, rise: 30, r: 190 },
  { E: 1250, N: 1250, rise: 60, r: 420 },
  { E: -260, N: 520, rise: 50, r: 380 },
  // the hills north of the grove, beyond the sheet: the horizon behind B
  { E: 640, N: 1640, rise: 72, r: 300 },
  { E: 60, N: 1560, rise: 58, r: 260 },
];

/** Hills beyond the sheet — the horizon of the model. Part of the same generator. */
export const DISTANT_HILLS: readonly { readonly E: number; readonly N: number; readonly rise: number; readonly r: number }[] = [
  { E: 2100, N: 1500, rise: 150, r: 900 },
  { E: 1900, N: -500, rise: 100, r: 800 },
  { E: 500, N: 2700, rise: 130, r: 950 },
  { E: -1300, N: 1700, rise: 110, r: 900 },
  { E: -1100, N: -600, rise: 70, r: 800 },
  { E: 600, N: -1700, rise: 90, r: 900 },
];

// ---------------------------------------------------------------- water

/**
 * The stream (נחל), from the east edge to the west, south of the ridge. Its bed
 * lies incisionM below the natural ground and never rises downstream.
 */
export const STREAM = {
  id: 'stream' as const,
  pts: [
    [1080, 352],
    [960, 330],
    [860, 314],
    [770, 301],
    [700, 296],
    [610, 282],
    [500, 263],
    [390, 248],
    [280, 226],
    [170, 206],
    [60, 191],
    [-80, 172],
  ] as readonly XY[],
  incisionM: 6,
  waterWidthM: 4,
} as const;

/** The ravine (ערוץ): a dry gully from under the saddle down to the stream. */
export const RAVINE = {
  id: 'ravine' as const,
  pts: [
    [650, 620],
    [651, 570],
    [655, 528],
    [664, 482],
    [684, 424],
    [700, 368],
    [708, 318],
    [712, 297],
  ] as readonly XY[],
  incisionM: 12,
} as const;

// ---------------------------------------------------------------- roads

export type RoadId = 'road' | 'track';
/** Dirt-road width, metres — the same in the model and on the map. */
export const ROAD_WIDTH_M = 5;
/**
 * Road control points; a smooth curve passes through each. `road` — the dirt
 * road along the valley north of the ridge; `track` — the access road in the
 * south, past the building at A.
 */
export const ROAD_CONTROL_POINTS: Record<RoadId, readonly XY[]> = {
  road: [
    [1080, 900],
    [940, 922],
    [820, 902],
    [700, 916],
    [580, 945],
    [470, 958],
    [360, 942],
    [250, 952],
    [140, 934],
    [20, 946],
    [-80, 938],
  ],
  track: [
    [1080, 70],
    [950, 92],
    [860, 122],
    [790, 128],
    [700, 100],
    [560, 76],
    [420, 64],
    [260, 44],
    [100, 32],
    [-80, 22],
  ],
};

// ---------------------------------------------------------------- cover

/** The pine grove (חורשת אורנים) around B. */
export const GROVE: readonly XY[] = [
  [95, 1012],
  [160, 988],
  [238, 1000],
  [276, 1058],
  [258, 1132],
  [188, 1166],
  [112, 1152],
  [70, 1088],
];
/** The rocky ground at B: limestone breaking through the grove floor. */
export const ROCKS = { E: 182, N: 1082, rM: 34 } as const;

/** Natural woodland (חורש) — scattered oaks, on the north slopes and around the east summit. */
export const WOODLAND: readonly { readonly id: string; readonly ring: readonly XY[] }[] = [
  { id: 'W-north', ring: [[300, 770], [480, 748], [610, 760], [720, 800], [700, 860], [560, 880], [420, 880], [300, 850]] },
  { id: 'W-east', ring: [[760, 470], [880, 452], [990, 500], [1000, 600], [960, 760], [880, 800], [800, 740], [770, 600]] },
  { id: 'W-west', ring: [[40, 470], [190, 450], [250, 560], [220, 700], [120, 760], [30, 700]] },
];

/** The olive orchard (מטע זיתים) west of the start, in rows along `rowDeg`. */
export const ORCHARD = {
  ring: [
    [512, 122],
    [646, 134],
    [656, 222],
    [520, 214],
  ] as readonly XY[],
  rowDeg: 84,
  spacingM: 9,
} as const;

/** The opening plan's one waypoint: the middle of the straight line A → B (over the western summit). */
export const OPENING_WAYPOINT: Point = { E: (START.E + DEST.E) / 2, N: (START.N + DEST.N) / 2 };
