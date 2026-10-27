/* ─────────── קוראים את המפה — the fictional terrain and its contours ───────────
   One height model per scenario: a gentle tilt plus a few smooth hills. Every contour line, spot
   height, contour label and slope segment of the practice map is computed from this function, so
   the map and the answers can never disagree. Pure functions (no JSX), shared with
   scripts/qa/cartography-practice.test.mjs.

   Coordinates are ground metres from the sheet's south-west corner: x grows east, y grows north. */

export type XY = readonly [number, number];

/** A smooth hill. σ differs on each side (west/east, south/north), so one flank can be steeper. */
export type Hill = {
  readonly x: number;
  readonly y: number;
  readonly amp: number;
  /** σ west of the top, σ east of it (m). */
  readonly sx: readonly [number, number];
  /** σ south of the top, σ north of it (m). */
  readonly sy: readonly [number, number];
};

export type Terrain = {
  readonly base: number;
  /** Rise per metre east and per metre north. */
  readonly tilt: readonly [number, number];
  readonly hills: readonly Hill[];
};

function hillAt(h: Hill, x: number, y: number): number {
  const dx = x - h.x;
  const dy = y - h.y;
  const sx = dx < 0 ? h.sx[0] : h.sx[1];
  const sy = dy < 0 ? h.sy[0] : h.sy[1];
  return h.amp * Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy));
}

/** Height above sea level (m) at a ground point. */
export function heightAt(t: Terrain, x: number, y: number): number {
  let z = t.base + t.tilt[0] * x + t.tilt[1] * y;
  for (const h of t.hills) z += hillAt(h, x, y);
  return z;
}

/** Central-difference gradient (m per m). */
export function gradientAt(t: Terrain, x: number, y: number, d = 1): XY {
  return [(heightAt(t, x + d, y) - heightAt(t, x - d, y)) / (2 * d), (heightAt(t, x, y + d) - heightAt(t, x, y - d)) / (2 * d)];
}

/**
 * The point at `level` along the ray from `from` in direction `dir` (unit vector), found by
 * bisection between `from` and `from + dir·maxR`. The height must fall monotonically along the
 * ray; the caller (and the QA test) checks that.
 */
export function pointAtLevel(t: Terrain, from: XY, dir: XY, level: number, maxR: number): XY {
  let lo = 0;
  let hi = maxR;
  const z = (r: number) => heightAt(t, from[0] + dir[0] * r, from[1] + dir[1] * r);
  const descending = z(0) > z(maxR);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const above = z(mid) > level;
    if (above === descending) lo = mid;
    else hi = mid;
  }
  const r = (lo + hi) / 2;
  return [from[0] + dir[0] * r, from[1] + dir[1] * r];
}

/** The highest point near a hill's centre (gradient ascent), i.e. its real top on the tilted ground. */
export function topNear(t: Terrain, start: XY): XY {
  let [x, y] = start;
  let step = 8;
  for (let i = 0; i < 4000 && step > 0.01; i++) {
    const here = heightAt(t, x, y);
    let best = here;
    let next: XY = [x, y];
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as const) {
      const z = heightAt(t, x + dx, y + dy);
      if (z > best) {
        best = z;
        next = [x + dx, y + dy];
      }
    }
    if (best === here) step /= 2;
    else [x, y] = next;
  }
  return [x, y];
}

/* ── contours: marching squares on a regular sample grid, joined into polylines ── */

export type ContourLevel = { readonly level: number; readonly index: boolean; readonly lines: readonly (readonly XY[])[] };

/**
 * Contour polylines of every multiple of `interval` inside the sheet (w × h m), sampled every
 * `step` m. Index lines are every `indexEvery`-th level (heights divisible by interval·indexEvery).
 */
export function contours(t: Terrain, w: number, h: number, interval: number, indexEvery: number, step: number): ContourLevel[] {
  const nx = Math.round(w / step);
  const ny = Math.round(h / step);
  const z: number[] = new Array((nx + 1) * (ny + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const v = heightAt(t, i * step, j * step);
      z[j * (nx + 1) + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  const at = (i: number, j: number) => z[j * (nx + 1) + i];
  const out: ContourLevel[] = [];
  for (let level = Math.ceil(min / interval) * interval; level <= max; level += interval) {
    // Nudge exact hits so no sample sits on the level (keeps the case table unambiguous).
    const L = level + 1e-7;
    const segs: [XY, XY][] = [];
    const cross = (i0: number, j0: number, i1: number, j1: number): XY => {
      const a = at(i0, j0);
      const b = at(i1, j1);
      const f = (L - a) / (b - a);
      return [(i0 + (i1 - i0) * f) * step, (j0 + (j1 - j0) * f) * step];
    };
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const c0 = at(i, j) > L ? 1 : 0; // SW
        const c1 = at(i + 1, j) > L ? 1 : 0; // SE
        const c2 = at(i + 1, j + 1) > L ? 1 : 0; // NE
        const c3 = at(i, j + 1) > L ? 1 : 0; // NW
        const code = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3);
        if (code === 0 || code === 15) continue;
        const S = () => cross(i, j, i + 1, j);
        const E = () => cross(i + 1, j, i + 1, j + 1);
        const N = () => cross(i, j + 1, i + 1, j + 1);
        const W = () => cross(i, j, i, j + 1);
        switch (code) {
          case 1: case 14: segs.push([W(), S()]); break;
          case 2: case 13: segs.push([S(), E()]); break;
          case 3: case 12: segs.push([W(), E()]); break;
          case 4: case 11: segs.push([E(), N()]); break;
          case 6: case 9: segs.push([S(), N()]); break;
          case 7: case 8: segs.push([W(), N()]); break;
          case 5: {
            const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 > L;
            if (centre) segs.push([W(), N()], [S(), E()]);
            else segs.push([W(), S()], [E(), N()]);
            break;
          }
          case 10: {
            const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 > L;
            if (centre) segs.push([W(), S()], [E(), N()]);
            else segs.push([W(), N()], [S(), E()]);
            break;
          }
        }
      }
    out.push({ level, index: level % (interval * indexEvery) === 0, lines: join(segs) });
  }
  return out;
}

const key = (p: XY) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;

/** Chains segments that share end points into polylines (closed rings repeat their first point). */
function join(segs: [XY, XY][]): XY[][] {
  const byEnd = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    for (const p of [a, b]) {
      const id = key(p);
      const list = byEnd.get(id);
      if (list) list.push(k);
      else byEnd.set(id, [k]);
    }
  });
  const used = new Uint8Array(segs.length);
  const lines: XY[][] = [];
  const nextFrom = (p: XY): XY | null => {
    for (const k of byEnd.get(key(p)) ?? []) {
      if (used[k]) continue;
      used[k] = 1;
      const [a, b] = segs[k];
      return key(a) === key(p) ? b : a;
    }
    return null;
  };
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const line: XY[] = [segs[k][0], segs[k][1]];
    for (let p = nextFrom(line[line.length - 1]); p; p = nextFrom(line[line.length - 1])) line.push(p);
    for (let p = nextFrom(line[0]); p; p = nextFrom(line[0])) line.unshift(p);
    lines.push(line);
  }
  return lines;
}

/** Heights along a straight segment, `n` + 1 samples from a to b. */
export function profile(t: Terrain, a: XY, b: XY, n = 200): number[] {
  return Array.from({ length: n + 1 }, (_, k) => heightAt(t, a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n));
}

export const dist = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Back onto the contour `level` from a nearby point, along the gradient (Newton steps). */
export function onLevel(t: Terrain, p: XY, level: number): XY {
  let [x, y] = p;
  for (let i = 0; i < 20; i++) {
    const [gx, gy] = gradientAt(t, x, y);
    const g2 = gx * gx + gy * gy;
    if (g2 < 1e-12) break;
    const dz = heightAt(t, x, y) - level;
    x -= (dz * gx) / g2;
    y -= (dz * gy) / g2;
    if (Math.abs(dz) < 1e-6) break;
  }
  return [x, y];
}

/**
 * Walks `metres` along the contour through `p` (p must be on it), turning to the side given by
 * `side` (+1 = counter-clockwise of the uphill direction, −1 = clockwise).
 */
export function alongContour(t: Terrain, p: XY, level: number, metres: number, side: 1 | -1): XY {
  let q: XY = p;
  const n = Math.max(4, Math.ceil(metres / 5));
  for (let i = 0; i < n; i++) {
    const [gx, gy] = gradientAt(t, q[0], q[1]);
    const g = Math.hypot(gx, gy) || 1;
    // tangent = gradient turned by 90°
    q = onLevel(t, [q[0] - (side * gy * metres) / n / g, q[1] + (side * gx * metres) / n / g], level);
  }
  return q;
}
