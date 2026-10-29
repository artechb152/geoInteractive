/**
 * The planning map's contour lines, traced from the same height field the 3D
 * view stands on (replayTerrain.heightAt) — marching squares over a grid in
 * map units, joined into polylines and lightly smoothed. Nothing is drawn by
 * hand: a contour is where the ground has that height.
 */
import type { Pt } from '../navTipsGeometry';
import { heightAt } from './replayTerrain';
import { toWorld } from './replayWorld';

export type Box = { x: number; y: number; w: number; h: number };
export type ContourLine = { level: number; index: boolean; pts: Pt[] };

/** Samples heightAt on a grid over `box` (map units), `step` map units apart. */
export function sampleHeights(box: Box, step: number) {
  const nx = Math.ceil(box.w / step) + 1;
  const ny = Math.ceil(box.h / step) + 1;
  const h = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const w = toWorld({ x: box.x + i * step, y: box.y + j * step });
      h[j * nx + i] = heightAt(w.x, w.z);
    }
  return { nx, ny, h, step, box };
}

type Grid = ReturnType<typeof sampleHeights>;

/** Iso-lines of one level: segments from marching squares, joined end to end. */
function trace(g: Grid, level: number): Pt[][] {
  const { nx, ny, h, step, box } = g;
  const segs: [Pt, Pt][] = [];
  const at = (i: number, j: number) => h[j * nx + i];
  const lerpPt = (i0: number, j0: number, i1: number, j1: number): Pt => {
    const a = at(i0, j0);
    const b = at(i1, j1);
    const t = (level - a) / (b - a);
    return { x: box.x + (i0 + (i1 - i0) * t) * step, y: box.y + (j0 + (j1 - j0) * t) * step };
  };
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const c = (at(i, j) > level ? 8 : 0) | (at(i + 1, j) > level ? 4 : 0) | (at(i + 1, j + 1) > level ? 2 : 0) | (at(i, j + 1) > level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const top = () => lerpPt(i, j, i + 1, j);
      const right = () => lerpPt(i + 1, j, i + 1, j + 1);
      const bottom = () => lerpPt(i, j + 1, i + 1, j + 1);
      const left = () => lerpPt(i, j, i, j + 1);
      const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 > level;
      switch (c) {
        case 1: case 14: segs.push([left(), bottom()]); break;
        case 2: case 13: segs.push([bottom(), right()]); break;
        case 3: case 12: segs.push([left(), right()]); break;
        case 4: case 11: segs.push([top(), right()]); break;
        case 6: case 9: segs.push([top(), bottom()]); break;
        case 7: case 8: segs.push([left(), top()]); break;
        case 5:
          if (centre) segs.push([left(), top()], [bottom(), right()]);
          else segs.push([left(), bottom()], [top(), right()]);
          break;
        case 10:
          if (centre) segs.push([top(), right()], [left(), bottom()]);
          else segs.push([left(), top()], [bottom(), right()]);
          break;
      }
    }
  // join segments sharing end points
  const key = (p: Pt) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`;
  const byEnd = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    for (const p of [a, b]) {
      const kk = key(p);
      const list = byEnd.get(kk);
      if (list) list.push(k);
      else byEnd.set(kk, [k]);
    }
  });
  const used = new Uint8Array(segs.length);
  const lines: Pt[][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const line = [segs[s][0], segs[s][1]];
    for (const dir of [1, -1] as const) {
      for (;;) {
        const end = dir === 1 ? line[line.length - 1] : line[0];
        const next = (byEnd.get(key(end)) ?? []).find((k) => !used[k]);
        if (next === undefined) break;
        used[next] = 1;
        const [a, b] = segs[next];
        const other = key(a) === key(end) ? b : a;
        if (dir === 1) line.push(other);
        else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Chaikin corner cutting (keeps the ends), for map-like curves without moving lines by more than a fraction of a cell. */
function smooth(pts: Pt[], rounds = 2): Pt[] {
  let p = pts;
  const closed = pts.length > 3 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-6;
  for (let r = 0; r < rounds; r++) {
    const out: Pt[] = closed ? [] : [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i];
      const b = p[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    if (closed) out.push(out[0]);
    else out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

/**
 * Contour lines every `interval` m over `box`; every `indexEvery`-th level is
 * an index contour. Lines shorter than `minLen` map units are dropped (noise
 * rings a map would generalise away).
 */
export function contourLines(box: Box, { step = 0.4, interval = 5, indexEvery = 25, minLen = 2.2 } = {}): { lines: ContourLine[]; grid: Grid } {
  const grid = sampleHeights(box, step);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of grid.h) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const lines: ContourLine[] = [];
  for (let level = Math.ceil(lo / interval) * interval; level <= hi; level += interval) {
    for (const raw of trace(grid, level)) {
      let len = 0;
      for (let i = 1; i < raw.length; i++) len += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
      if (len < minLen) continue;
      lines.push({ level, index: level % indexEvery === 0, pts: smooth(raw) });
    }
  }
  return { lines, grid };
}

export const toPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('');
