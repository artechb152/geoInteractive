/**
 * Datum field activity (#scene-coordinates → "הדמיה: מה קורה כשהדאטום לא
 * תואם?"): the ONE data source for the world, the places, the practice cases
 * and the base map's terrain. Teaching values only — A and B are fictional
 * datums, and the difference between them is shown as a constant shift of a
 * local grid. Not a real datum transformation, and not a claim that every
 * transformation is a shift.
 *
 *   The ground plane is described in datum-A metres: a place's ground
 *   position IS its A pair. Reading a pair as A gives that position; reading
 *   it as B gives the pair + SHIFT. Converting A→B subtracts SHIFT, B→A adds it
 *   (datumField.ts). Same unit and orientation in both datums.
 *
 *   scripts/maps/build-datum-field-map.mjs draws the base map from MAP and
 *   TERRAIN below, so the bridge and the junction drawn there stand exactly on
 *   the numbers of the exercise; the live grid and markers use the same
 *   world → picture transform (datumFieldProjection.ts).
 *
 * Brief: design/docs/datum-field-challenge-followup-claude-2026-10-12.txt.
 */

export type Datum = 'A' | 'B';

/** A coordinate pair in metres: E (easting) and N (northing). */
export type EN = { readonly e: number; readonly n: number };

export type PlaceId = 'bridge' | 'junction';

export type Place = {
  readonly id: PlaceId;
  /** "הגשר" / "הצומת" — used in "… בשטח". */
  readonly name: string;
  /** The ground position, in datum-A metres. */
  readonly ground: EN;
};

/** A→B subtracts this from E and N; B→A adds it. √(36² + 48²) = 60 m. */
export const SHIFT: EN = { e: 36, n: 48 };

export const PLACES: Readonly<Record<PlaceId, Place>> = {
  bridge: { id: 'bridge', name: 'הגשר', ground: { e: 1200, n: 800 } },
  junction: { id: 'junction', name: 'הצומת', ground: { e: 1090, n: 760 } },
};

/**
 * The base map: its extent in ground metres (north up, east right, never
 * mirrored) and its pixel density. Uniform scale: the picture is
 * (e1 − e0)·ppm × (n1 − n0)·ppm, so a metre is the same length on both axes.
 * Every position the activity can show (the places, A read as B, the
 * practice options) lies inside, with room for its label.
 */
export const MAP = { e0: 960, e1: 1300, n0: 552, n1: 962, ppm: 3.5 } as const;

/** One grid line every 100 m: few lines, exact margin values. */
export const GRID_STEP = 100;

/**
 * Terrain of the base map, in ground metres. The stream meanders north →
 * south through a low valley and passes under the bridge; the main road
 * crosses the map west → east, through the junction (a crossroads with a
 * north–south track) and over the bridge.
 */
export const TERRAIN = {
  stream: [
    [1286, 980], [1272, 950], [1262, 912], [1250, 888], [1226, 872], [1216, 850], [1222, 830], [1210, 812],
    [1200, 800], [1190, 786], [1172, 772], [1170, 750], [1188, 730], [1196, 708],
    [1182, 686], [1160, 672], [1154, 648], [1166, 626], [1160, 598], [1140, 572], [1146, 535],
  ],
  streamWidth: 7,
  /** The dry gravel bed either side of the water. */
  bedWidth: 24,
  roads: [
    {
      id: 'main',
      width: 6,
      path: [
        [948, 736], [990, 744], [1036, 752], [1090, 760], [1130, 770], [1166, 788], [1200, 800],
        [1234, 810], [1266, 826], [1312, 850],
      ],
    },
    { id: 'north', width: 5, path: [[1090, 760], [1084, 792], [1070, 828], [1062, 866], [1056, 912], [1046, 975]] },
    { id: 'south', width: 5, path: [[1090, 760], [1100, 726], [1116, 690], [1124, 652], [1120, 598], [1110, 535]] },
  ],
  /** The deck spans the stream along the main road. */
  bridge: { at: [1200, 800], length: 24, width: 8.5 },
  /** Gentle hills: centre, radius (m), height (m). */
  hills: [
    { at: [1005, 880], r: 130, height: 22 },
    { at: [1290, 700], r: 120, height: 18 },
    { at: [1295, 930], r: 110, height: 16 },
    { at: [990, 610], r: 110, height: 14 },
    { at: [1215, 570], r: 80, height: 8 },
    { at: [1120, 955], r: 70, height: 8 },
  ],
} as const;

/** The practice cases: a place, the datum its numbers were delivered in, and the target map's datum. */
export type PracticeCase = {
  readonly id: 'same' | 'reverse';
  readonly place: PlaceId;
  readonly source: Datum;
  readonly target: Datum;
  /** Three output pairs, in a set order (the right one is not always in the same slot). */
  readonly options: readonly EN[];
  readonly feedback: {
    readonly right: string;
    /** For a pair that copies the source numbers unchanged. */
    readonly kept?: string;
    /** For a pair with SHIFT added (B→A applied) or subtracted (A→B applied). */
    readonly plus?: string;
    readonly minus?: string;
    /** For any other wrong pair. */
    readonly wrong?: string;
  };
};

export const CASES: readonly PracticeCase[] = [
  {
    id: 'same',
    place: 'bridge',
    source: 'A',
    target: 'A',
    options: [
      { e: 1164, n: 752 },
      { e: 1200, n: 800 },
      { e: 1236, n: 848 },
    ],
    feedback: {
      right: 'המקור והמפה משתמשים כאן באותו דאטום. אין צורך בהמרה; המספרים המקוריים כבר מצביעים על הגשר.',
      wrong: 'שיניתם מספרים אף שהדאטום כבר תואם. בהדגמה הזאת השינוי מזיז את הסימון 60 מטר מהגשר.',
    },
  },
  {
    id: 'reverse',
    place: 'junction',
    source: 'B',
    target: 'A',
    options: [
      { e: 1090, n: 760 },
      { e: 1054, n: 712 },
      { e: 1018, n: 664 },
    ],
    feedback: {
      right: 'כאן המקור הוא B והיעד הוא A, ולכן כיוון ההמרה הפוך מהדוגמה הקודמת. המספרים השתנו והסימון נשאר בצומת.',
      kept: 'הועתקו מספרי B למפה שקוראת אותם כ־A. הפער נשאר 60 מטר.',
      minus: 'הופעלה המרה בכיוון A→B אף שהנתונים כבר ב־B. בהמחשה הזאת הפער גדל ל־120 מטר.',
    },
  },
];
