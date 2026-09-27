/**
 * Shared look for the topic-02 contour mountain (ContourCake3D + the 2D map
 * in ContoursScene).
 *
 * BAND_COLORS is the map's hypsometric tint (and its legend): band 0 = ground
 * below the 10 m contour; band i (1–5) = the area between contour i and the
 * next one up (band 5 = 50 m → summit). Vegetated lowland greens → bare-rock
 * tans → pale summit, drawn from the illustration palette (design-spec §8)
 * and terrain tokens. The 3D mountain itself carries realistic baked
 * textures instead; hover links the two views.
 *
 * Kept free of three.js so the map can import it without pulling the 3D
 * bundle. scripts/blender/build_contour_mountain.py keeps a preview-only
 * copy of CUT_COLOR / WALL_COLOR.
 */
export const BAND_COLORS = ['#A9AD80', '#8A9163', '#6E7A4E', '#9C8A5E', '#B89C6E', '#D9C9A6'] as const;

/** Flat faces where the knife went through — the "inside of the cake". */
export const CUT_COLOR = '#EFE4CC';
/** Diorama plinth sides — an earth cross-section. */
export const WALL_COLOR = '#8A7353';

/** Contour-line ink (= fg / olive ink) and the action/focus accent (= ember). */
export const CONTOUR_INK = '#38432E';
export const ACCENT = '#D97E2B';

/** The 50 m line is the index contour (every 5th line at a 10 m interval). */
export const INDEX_LEVEL_M = 50;
