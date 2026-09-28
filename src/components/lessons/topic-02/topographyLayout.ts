/**
 * Pure layout math for the topography viewer (TopographyTerrain3D) — no
 * imports, so scripts/qa/topography-layout.test.mjs can run it under plain
 * Node. It is the one place that says where the map sheet sits in the viewer,
 * so the camera's top-down framing and the SVG map overlay can never drift
 * apart.
 *
 * Spaces (see docs/superpowers/plans/2026-09-28-topography-scene-redesign.md):
 *   sheet  x east 0–100, y SOUTH 0–75 (origin = NW corner, 1 unit = 14 m)
 *   world  three.js: x east, y up, z SOUTH; the sheet spans 4 × 3 units
 *          (1 unit = 350 m); heights are exaggerated ×2 above a 280 m datum.
 */
export const SHEET = { w: 100, h: 75, metres: 14 } as const;
export const WORLD = { w: 4, h: 3, mPerUnit: 350, ve: 2, datumM: 280 } as const;

/** Grid-label margin around the neatline, and the legend strip under it (sheet units). */
export const COLLAR = 3.2;
export const LEGEND_H = 11;
export const VIEWBOX = {
  x: -COLLAR,
  y: -COLLAR,
  w: SHEET.w + 2 * COLLAR,
  h: SHEET.h + 2 * COLLAR + LEGEND_H,
} as const;

/**
 * Height of the model above the map in the "all together" view (world
 * units). Large enough that, seen from the stack camera, the model hides only
 * a sliver of the map — so every part of the map can be pointed at.
 */
export const STACK_GAP = 2.2;

export type Mode = '3d' | 'photo' | 'topo' | 'stack';
export type CameraGoal = {
  /** Polar angle from straight down (0) — spherical, measured at the target. */
  phi: number;
  /** Azimuth: 0 looks from due south; positive swings the camera toward the east. */
  theta: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Half the visible world height at the target — the framing the dolly-zoom preserves. */
  frameHalf: number;
  target: [number, number, number];
};

export function sheetToWorld(x: number, y: number): [number, number] {
  return [(x / SHEET.w - 0.5) * WORLD.w, (y / SHEET.h - 0.5) * WORLD.h];
}

export function heightToY(m: number): number {
  return ((m - WORLD.datumM) * WORLD.ve) / WORLD.mPerUnit;
}

/**
 * The neatline (sheet 0–100 × 0–75) in container px, for an SVG drawn with
 * VIEWBOX and preserveAspectRatio="xMidYMid meet" over the whole container.
 */
export function sheetRect(viewW: number, viewH: number) {
  const scale = Math.min(viewW / VIEWBOX.w, viewH / VIEWBOX.h);
  const left = (viewW - VIEWBOX.w * scale) / 2;
  const top = (viewH - VIEWBOX.h * scale) / 2;
  return { x: left + COLLAR * scale, y: top + COLLAR * scale, w: SHEET.w * scale, h: SHEET.h * scale, scale };
}

export function radiusFor(g: Pick<CameraGoal, 'fov' | 'frameHalf'>): number {
  return g.frameHalf / Math.tan(((g.fov / 2) * Math.PI) / 180);
}

/** Near-orthographic top view: at this FOV the relief shifts well under 1 px at the neatline. */
const TOP_FOV = 4;
const PERSP_FOV = 30;

export function goalFor(mode: Mode, viewW: number, viewH: number, groundY: number): CameraGoal {
  if (mode === 'photo' || mode === 'topo') {
    const r = sheetRect(viewW, viewH);
    const frameHalf = (WORLD.h * viewH) / r.h / 2;
    const wpp = (2 * frameHalf) / viewH; // world units per px at the ground
    const ox = r.x + r.w / 2 - viewW / 2;
    const oy = r.y + r.h / 2 - viewH / 2;
    return { phi: 0.0001, theta: 0, fov: TOP_FOV, frameHalf, target: [-ox * wpp, groundY, -oy * wpp] };
  }
  // Frame whichever is tighter: the diorama's projected height, or its width
  // (≈ 4.7 units seen from the SSE) divided by the viewer's aspect.
  const aspect = viewW / viewH;
  if (mode === 'stack') {
    // Shifted east so the stack sits left of centre, leaving the right edge
    // (RTL reading start) for the layer labels.
    return { phi: 0.92, theta: 0.18, fov: PERSP_FOV, frameHalf: Math.max(2.45, 2.85 / aspect), target: [0.62, STACK_GAP * 0.56, 0] };
  }
  return { phi: 0.82, theta: 0.22, fov: PERSP_FOV, frameHalf: Math.max(1.45, 2.2 / aspect), target: [0, groundY - 0.02, 0.3] };
}
