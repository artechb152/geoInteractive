/**
 * Map symbology for the topography sheet (TopographyMapSheet) — the lesson's
 * map language (paper, tan hairlines and brown contours as in
 * ContoursShapeMap) plus the illustration greens of design-spec §8.
 * Kept free of three.js so the SVG never pulls the 3D bundle.
 */
export const MAP = {
  paper: '#F8F2E7',
  collar: '#FFFFFF',
  hairline: '#DCCDB2',
  ink: '#38432E',
  /** Action / active accent (= the ember token) — the stack's active layer and hover probe. */
  accent: '#D97E2B',
  muted: '#8A8873',
  contour: '#8A6F4D',
  contourW: 0.16,
  indexW: 0.34,
  vegFill: '#D5E0C4',
  vegInk: '#6E7A4E',
  roadCasing: '#8A6F4D',
  roadFill: '#E3C996',
  roadW: 0.95,
  path: '#38432E',
  pathW: 0.26,
  pathDash: '1.1 0.75',
  building: '#2B2F28',
  grid: '#C9B99B',
  gridW: 0.12,
} as const;

/** Design-system "snap" easing. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Sheet metres per unit (topographyLayout SHEET.metres) — for the scale bar and ticks. */
export const M_PER_SHEET_UNIT = 14;
/** ITM of the sheet's SW corner (metres) — the grid numbers derive from it. */
export const GRID_ORIGIN = { e: 201_700, n: 691_300 } as const;
