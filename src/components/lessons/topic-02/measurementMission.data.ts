/**
 * Measurement mission (#scene-coordinates → "אליפסואיד, גיאואיד וגליות"):
 * the ONE data source for the three stations — demo values and where each
 * stands on the terrain. Teaching values only, not a survey of a real place.
 *
 *   H (the answer) is never stored: it is always h − N (measurementMission.ts).
 *   scripts/blender/render_measurement_landscape.py reads the JSON block
 *   below and corrects the ground locally so each station stands exactly H m
 *   above the geoid; scripts/qa/measurement-mission.test.mjs checks that the
 *   generated landscape data still agrees with it.
 *
 * Placement: metres on the diorama, origin = its centre (x ∈ ±2250 toward
 * the sea on the right, y ∈ ±1150 away from the viewer). All three stand on
 * the survey line y = −700, where the cut opens.
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
  { "id": "A", "h": 18, "N": -12, "x": 1450, "y": -700 },
  { "id": "B", "h": 148, "N": 28, "x": 600, "y": -700 },
  { "id": "C", "h": 220, "N": 0, "x": -950, "y": -700 }
];
/* stations:end */

export const STATIONS: Readonly<Record<StationId, Station>> = Object.fromEntries(
  STATION_LIST.map((s) => [s.id, s]),
) as Record<StationId, Station>;

/** Entering the mission opens B; "next station" walks B → A → C, skipping solved ones. */
export const STATION_ORDER: readonly StationId[] = ['B', 'A', 'C'];
export const FIRST_STATION: StationId = 'B';
