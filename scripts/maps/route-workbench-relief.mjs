/** The route workbench's ground surface, shared by every raster drawn of it.
 * build-route-workbench.mjs hillshades it into the photo's geometry guide, and
 * build-route-workbench-layers.mjs contours it for the topographic view, so the
 * contour lines on the map are the same hills as the photo.
 * Map units: x = −16…116 east, y = 0…92 south (routeStoryModel's viewBox).
 */
import { POINT_XY, SADDLE_ROTATE, SUMMIT_OFFSET } from '../../src/components/lessons/topic-06/route-story/routeStoryModel.ts';

export const hash = (x, y, k = 0) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k, 144269); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export const noise = (x, y, k = 0) => { const i = Math.floor(x), j = Math.floor(y); let u = x - i, v = y - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); return (hash(i, j, k) * (1 - u) + hash(i + 1, j, k) * u) * (1 - v) + (hash(i, j + 1, k) * (1 - u) + hash(i + 1, j + 1, k) * u) * v; };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.03, y * 2.03, 2) * .27 + noise(x * 4.1, y * 4.1, 7) * .13 + noise(x * 8.3, y * 8.3, 12) * .05;
export const gaussian = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

const angle = SADDLE_ROTATE * Math.PI / 180;
/** The two summits either side of the saddle at point 3. */
export const peaks = [-1, 1].map(s => ({ x: POINT_XY[2].x + s * SUMMIT_OFFSET * Math.cos(angle), y: POINT_XY[2].y + s * SUMMIT_OFFSET * Math.sin(angle) }));

/** Height in metres before the stream is cut in. */
export function height(x, y) {
  const wx = x + (noise(x * .3, y * .3, 19) - .5) * 1.5, wy = y + (noise(x * .3, y * .3, 20) - .5) * 1.5;
  const ridge = peaks.reduce((a, p) => a + 112 * gaussian(wx, wy, p.x, p.y, 6.7, 6.7), 0);
  return 320 + 48 * gaussian(x, y, 21, 22, 25, 17) + 36 * gaussian(x, y, 94, 58, 20, 22) + ridge + 13 * fbm(x * .12, y * .12) + .32 * (85 - y);
}

/** The stream's valley: `waterDist` is the distance (map units) to the stream line. */
export const carved = (h, waterDist) => h - 13 * Math.exp(-(waterDist ** 2) / 9);
