/**
 * Datum field challenge (#scene-coordinates → "הדמיה: מה קורה כשהדאטום לא
 * תואם?"): the ONE data source for the three landmarks and the schematic
 * datum shift. Teaching values only — not a real WGS84 ↔ Israel-grid
 * transformation and not a general fact about datums.
 *
 *   Datum A and datum B are two schematic origins in the same unit (m) and
 *   orientation:  B = A − SHIFT.  Every landmark uses the same shift, so the
 *   unconverted gap is always √(36² + 48²) = 60 m.
 *
 *   scripts/blender/render_datum_field.py reads the JSON block below and
 *   builds the diorama so each landmark stands exactly at its A coordinates;
 *   scripts/qa/datum-field-challenge.test.mjs checks that the rendered
 *   terrain data still agrees with it.
 *
 * Coordinates are metres in datum A — the drawing plane of the diorama
 * (E toward the viewer's right, N away from the viewer).
 */

export type LandmarkId = 'bridge' | 'junction' | 'summit';

/** A coordinate pair in metres. */
export type EN = { readonly e: number; readonly n: number };

export type Landmark = {
  readonly id: LandmarkId;
  /** Name shown on the picker card. */
  readonly name: string;
  /** The landmark's coordinates in the source datum A (immutable). */
  readonly a: EN;
};

// Keep this block valid JSON: the Blender build parses it.
/* field:begin */
const FIELD = {
  "shift": { "e": 36, "n": 48 },
  "frame": { "e0": 985, "e1": 1425, "n0": 718, "n1": 913 },
  "landmarks": [
    { "id": "bridge", "name": "גשר", "a": { "e": 1200, "n": 800 } },
    { "id": "junction", "name": "צומת", "a": { "e": 1090, "n": 760 } },
    { "id": "summit", "name": "פסגה", "a": { "e": 1310, "n": 825 } }
  ]
} as const;
/* field:end */

/** The schematic difference between the two datums: B = A − SHIFT (m). */
export const DATUM_SHIFT: EN = FIELD.shift;

/** The diorama's footprint in datum A (m). */
export const FIELD_FRAME = FIELD.frame;

export const LANDMARK_IDS: readonly LandmarkId[] = FIELD.landmarks.map((l) => l.id);

export const LANDMARKS: Readonly<Record<LandmarkId, Landmark>> = Object.fromEntries(
  FIELD.landmarks.map((l) => [l.id, l]),
) as Record<LandmarkId, Landmark>;

/** The activity opens on the bridge. */
export const FIRST_LANDMARK: LandmarkId = 'bridge';
