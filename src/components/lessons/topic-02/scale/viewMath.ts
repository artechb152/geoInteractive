// Zoom/pan math for the square sheet viewport, ported from the terrain-overlay prototype's useZoomPan.
// One transform `translate(x, y) scale(k)`, origin 0 0, is applied to every layer and to the overlay:
//   screen = (unit / 1000) * size * k + offset
// Pure module with no imports (Node tests load it directly).

export type View = { k: number; x: number; y: number };
export const IDENTITY: View = { k: 1, x: 0, y: 0 };

/** The world must cover the square at all times. */
export function clampView(v: View, size: number, min: number, max: number): View {
  const k = Math.min(max, Math.max(min, v.k));
  const lo = size - size * k;
  return { k, x: Math.min(0, Math.max(lo, v.x)), y: Math.min(0, Math.max(lo, v.y)) };
}

/** Zoom by `factor` keeping the screen point (sx, sy) fixed. */
export function zoomAt(v: View, factor: number, sx: number, sy: number, size: number, min: number, max: number): View {
  const k = Math.min(max, Math.max(min, v.k * factor));
  const r = k / v.k;
  return clampView({ k, x: sx - (sx - v.x) * r, y: sy - (sy - v.y) * r }, size, min, max);
}

export function panView(v: View, dx: number, dy: number, size: number, min: number, max: number): View {
  return clampView({ k: v.k, x: v.x + dx, y: v.y + dy }, size, min, max);
}

/** Screen px relative to the viewport's top-left → sheet units (0..1000). */
export function screenToUnits(v: View, sx: number, sy: number, size: number): { x: number; y: number } {
  return { x: ((sx - v.x) / (size * v.k)) * 1000, y: ((sy - v.y) / (size * v.k)) * 1000 };
}
