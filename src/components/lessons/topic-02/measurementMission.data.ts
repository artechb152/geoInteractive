/**
 * Measurement mission (#scene-coordinates → "אליפסואיד, גיאואיד וגליות"):
 * the ONE data source for the three stations — demo values and where each
 * stands on the terrain. Teaching values only, not a survey of a real place.
 *
 *   H (the answer) is never stored: it is always h − N (measurementMission.ts).
 *   scripts/blender/build_measurement_terrain.py reads the JSON block below
 *   and shapes the terrain so the ground at each station stands exactly H m
 *   above the sea; scripts/qa/measurement-mission.test.mjs checks that the
 *   generated terrain data still agrees with it.
 *
 * Placement: metres on the diorama, X east, Y north, origin = its centre
 * (X ∈ ±1000, Y ∈ ±650). The sea is in the east.
 */

export type StationId = 'A' | 'B' | 'C';

export type Station = {
  readonly id: StationId;
  /** Ellipsoidal height h (m) — what the GNSS receiver reads. */
  readonly h: number;
  /** Geoid undulation N (m) at the station, signed: + geoid above the ellipsoid. */
  readonly N: number;
  /** Position on the diorama (m). */
  readonly x: number;
  readonly y: number;
};

// Keep this block valid JSON: the Blender build parses it.
/* stations:begin */
const STATION_LIST: readonly Station[] = [
  { "id": "A", "h": 18, "N": -12, "x": 470, "y": -175 },
  { "id": "B", "h": 148, "N": 28, "x": -60, "y": 30 },
  { "id": "C", "h": 220, "N": 0, "x": -500, "y": 255 }
];
/* stations:end */

export const STATIONS: Readonly<Record<StationId, Station>> = Object.fromEntries(
  STATION_LIST.map((s) => [s.id, s]),
) as Record<StationId, Station>;

/** Entering the mission opens B; "next station" walks B → A → C, skipping solved ones. */
export const STATION_ORDER: readonly StationId[] = ['B', 'A', 'C'];
export const FIRST_STATION: StationId = 'B';
