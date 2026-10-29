/**
 * The ground as seen from one station: a polar mesh centred on the eye, whose
 * rings grow geometrically — centimetres apart at the feet, ~0.8° apart all
 * the way to the horizon 16 km out — so every distance gets the same detail
 * on screen. Heights come from the station's nested grids + micro relief
 * (StationTerrain); the horizon drops with the earth's curvature.
 *
 * Vertices are stored relative to the station (the mesh sits at the station)
 * to keep float precision; `aRoad` / `aStream` carry the distance (m) to the
 * road and to the stream's centre line for the material's masks.
 */
import { BufferAttribute, BufferGeometry } from 'three';
import type { StationTerrain } from '../replayTerrain';

export const SEGMENTS = 448;
export const HORIZON_M = 16000;
const EARTH_R = 6371000;

export function buildTerrainGeometry(t: StationTerrain, sx: number, sz: number): BufferGeometry {
  const k = 1 + (2 * Math.PI) / SEGMENTS;
  const radii: number[] = [0];
  for (let r = 0.3; r < HORIZON_M; r *= k) radii.push(r);
  radii.push(HORIZON_M);
  const rings = radii.length;
  const n = 1 + (rings - 1) * SEGMENTS;
  const pos = new Float32Array(n * 3);
  const road = new Float32Array(n);
  const stream = new Float32Array(n);
  const cos = new Float32Array(SEGMENTS);
  const sin = new Float32Array(SEGMENTS);
  for (let s = 0; s < SEGMENTS; s++) {
    cos[s] = Math.cos((s / SEGMENTS) * Math.PI * 2);
    sin[s] = Math.sin((s / SEGMENTS) * Math.PI * 2);
  }
  // centre vertex
  pos[1] = t.height(sx, sz);
  road[0] = t.road(sx, sz);
  stream[0] = t.stream(sx, sz);
  let v = 1;
  for (let ri = 1; ri < rings; ri++) {
    const r = radii[ri];
    const drop = (r * r) / (2 * EARTH_R);
    // stagger alternate rings by half a segment: even triangles, no radial seams
    const off = ri % 2 ? 0.5 : 0;
    for (let s = 0; s < SEGMENTS; s++) {
      const a = ((s + off) / SEGMENTS) * Math.PI * 2;
      const dx = r * Math.cos(a);
      const dz = r * Math.sin(a);
      const x = sx + dx;
      const z = sz + dz;
      pos[v * 3] = dx;
      pos[v * 3 + 1] = t.height(x, z) - drop;
      pos[v * 3 + 2] = dz;
      // the masks only matter where the road / stream can be seen in detail
      if (r < 2500) {
        road[v] = t.road(x, z);
        stream[v] = t.stream(x, z);
      } else {
        road[v] = 420;
        stream[v] = 420;
      }
      v++;
    }
  }
  // indices: a fan around the centre, then quads between rings
  const tris = SEGMENTS + (rings - 2) * SEGMENTS * 2;
  const idx = new Uint32Array(tris * 3);
  let q = 0;
  for (let s = 0; s < SEGMENTS; s++) {
    idx[q++] = 0;
    idx[q++] = 1 + ((s + 1) % SEGMENTS);
    idx[q++] = 1 + s;
  }
  for (let ri = 1; ri < rings - 1; ri++) {
    const a0 = 1 + (ri - 1) * SEGMENTS;
    const b0 = a0 + SEGMENTS;
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS;
      const a = a0 + s;
      const a1 = a0 + s1;
      const b = b0 + s;
      const b1 = b0 + s1;
      // winding: counter-clockwise seen from above (+y). An odd ring sits half a
      // segment ahead of the next ring: its vertex s points out between b and b1.
      if (ri % 2 === 0) {
        idx[q++] = a;
        idx[q++] = a1;
        idx[q++] = b;
        idx[q++] = a1;
        idx[q++] = b1;
        idx[q++] = b;
      } else {
        idx[q++] = a;
        idx[q++] = b1;
        idx[q++] = b;
        idx[q++] = a;
        idx[q++] = a1;
        idx[q++] = b1;
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aRoad', new BufferAttribute(road, 1));
  g.setAttribute('aStream', new BufferAttribute(stream, 1));
  g.setIndex(new BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
