/**
 * Shared look for the topic-02 contour mountain (ContourCake3D + the 2D map
 * in ContoursScene). The 2D map itself is drawn in the lesson's map language
 * (topographyTerrainStyle MAP); hover links the two views through ACCENT.
 *
 * Kept free of three.js so the map can import it without pulling the 3D
 * bundle. scripts/blender/build_contour_mountain.py keeps a preview-only
 * copy of CUT_COLOR / WALL_COLOR.
 */

/** Flat faces where the knife went through — the "inside of the cake". */
export const CUT_COLOR = '#EFE4CC';
/** Diorama plinth sides — an earth cross-section. */
export const WALL_COLOR = '#8A7353';

/** Contour-line ink (= fg / olive ink) and the action/focus accent (= ember). */
export const CONTOUR_INK = '#38432E';
export const ACCENT = '#D97E2B';

/** The 50 m line is the index contour (every 5th line at a 10 m interval). */
export const INDEX_LEVEL_M = 50;
