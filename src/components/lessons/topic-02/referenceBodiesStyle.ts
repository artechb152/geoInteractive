/**
 * Colours of the reference-bodies diagrams in CoordinatesScene (existing
 * tokens and the profile diagram's own fills) — shared by the measurement
 * mission's section, panel and legend. Kept free of three.js.
 */
export const C_ELL = '#5B7C5C'; // brand.dark — ellipsoid, h
export const C_GEO = '#8A6F4D'; // tanline.badge — geoid, N
export const C_H = '#5b9dd9'; // accent.cool — H
export const C_INK = '#38432E'; // fg — the ground line, chip text
export const C_GROUND = '#E8DCC4'; // the profile's ground fill
export const C_GROUND_DIM = '#C9B892'; // the ground line while another layer is in focus
export const C_SEA = '#7FB4C6'; // the profile's sea
export const C_ACCENT = '#D97E2B'; // accent (ember) — the selected station

/**
 * The geoid view's reveal: H at the picked station comes in once the geoid has swept in under the land
 * (MeasurementLandscape3D: the ground thins, then the sheets sweep in over ≈ 1.1 s) — in the model and in
 * the section at the same moment (s). Taking the reveal back hides both at once.
 */
export const REVEAL_H_DELAY = 1;
export const REVEAL_H_FADE = 0.3;
