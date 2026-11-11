/**
 * A field of instanced models with levels of detail, culled per frame.
 *
 * The scatter hands the replay tens of thousands of shrubs, tufts and stones
 * around a station (or along the walking corridor). Drawing them all at full
 * detail every frame is out of the question, and an InstancedMesh is culled
 * only as a whole. So the instances are bucketed into world cells once; each
 * frame the cells outside the view or beyond reach are skipped, and every
 * instance of the remaining cells is copied into the level of detail its
 * distance asks for — a dense scanned model near the eye, a thinned one
 * further out. Each level is one InstancedMesh per model part.
 *
 * No popping: around every level boundary (and at the far end of reach) an
 * instance is drawn in both levels for a few metres, each with a fixed
 * screen-door dither (`aFade`, foliage/rock materials discard by it), the two
 * patterns complementary — so a model dissolves into its other level instead
 * of switching. With the view still (frameloop "demand") nothing moves.
 *
 * Shadow casters are separate meshes (`casters`): every instance within a
 * radius at one fixed level, independent of the view, on a layer only a
 * shadow camera renders — so a static shadow map never misses an object that
 * was outside the view when it was drawn.
 */
import { BufferGeometry, Frustum, InstancedBufferAttribute, InstancedMesh, Matrix4, Sphere, Vector3, type Camera, type Material } from 'three';
import type { Instance } from '../replayScatter';

export type FieldPart = { geometry: BufferGeometry; material: Material };
export type FieldLevel = { parts: FieldPart[]; /** drawn up to this distance (m, × the instance's reach) */ until: number };
export type FieldVariant = { levels: FieldLevel[] };

export type FieldOptions = {
  variants: FieldVariant[];
  /** culling cell, m */
  cell: number;
  /** half-width of a cross-fade, as a fraction of the boundary's distance */
  fade?: number;
  /** a factor on every `until` for one instance (bigger rocks reach further) */
  reach?: (it: Instance) => number;
  /** the instance's matrix (16 floats at m[mo]) and colour (3 floats at c[co]) */
  write: (it: Instance, m: Float32Array, mo: number, c: Float32Array, co: number) => void;
  /** an instance's bounding radius, m */
  radius: (it: Instance) => number;
  shadows?: { receive: boolean };
};

type Cell = { start: number; end: number; sphere: Sphere };

const tmpM = new Matrix4();
const frustum = new Frustum();
const camPos = new Vector3();

/** A geometry sharing every attribute (and the GPU buffers) of `src`, free to take its own instanced attributes. */
function shareGeometry(src: BufferGeometry): BufferGeometry {
  const g = new BufferGeometry();
  for (const [k, a] of Object.entries(src.attributes)) g.setAttribute(k, a);
  g.setIndex(src.index);
  if (!src.boundingSphere) src.computeBoundingSphere();
  g.boundingSphere = src.boundingSphere!.clone();
  return g;
}

/**
 * Free a mesh made by makeMesh: its own instanced buffers only. Disposing the geometry as it is would
 * also delete the GPU buffers of the attributes it shares with the source model (and with every
 * other field drawing that model), so those are detached first.
 */
function disposeMesh(m: InstancedMesh) {
  const g = m.geometry;
  const shared = Object.entries(g.attributes).filter(([k]) => k !== 'aFade');
  const index = g.index;
  for (const [k] of shared) g.deleteAttribute(k);
  g.setIndex(null);
  g.dispose(); // three frees the buffers of what the geometry holds now, synchronously
  // ... and the mesh stays whole: React's development double mount reuses a field after this
  for (const [k, a] of shared) g.setAttribute(k, a);
  g.setIndex(index);
  m.dispose();
}

function makeMesh(part: FieldPart, capacity: number) {
  const g = shareGeometry(part.geometry);
  const fade = new InstancedBufferAttribute(new Float32Array(Math.max(1, capacity)).fill(1), 1);
  fade.setUsage(35048); // DynamicDrawUsage
  g.setAttribute('aFade', fade);
  const m = new InstancedMesh(g, part.material, Math.max(1, capacity));
  m.instanceMatrix.setUsage(35048);
  m.instanceColor = new InstancedBufferAttribute(new Float32Array(Math.max(1, capacity) * 3).fill(1), 3);
  m.instanceColor.setUsage(35048);
  m.count = 0;
  m.frustumCulled = false;
  return m;
}

type LevelMeshes = { meshes: InstancedMesh[]; fill: number };

export class InstanceField {
  readonly meshes: InstancedMesh[] = [];
  private readonly opts: FieldOptions;
  private readonly levels: LevelMeshes[][] = [];
  private matrices = new Float32Array(0);
  private colors = new Float32Array(0);
  /** x, y, z, reach per instance */
  private pos = new Float32Array(0);
  private variant = new Uint8Array(0);
  private cells: Cell[] = [];
  private maxReach = 0;
  /** the eye at the last update (NaN at first: the first frame counts as at rest) */
  private lastEye = new Vector3(NaN, NaN, NaN);

  constructor(opts: FieldOptions, list: readonly Instance[]) {
    this.opts = opts;
    const counts = opts.variants.map(() => 0);
    for (const it of list) counts[it.variant % opts.variants.length]++;
    opts.variants.forEach((v, vi) => {
      this.levels.push(
        v.levels.map((lv) => {
          const meshes = lv.parts.map((p) => makeMesh(p, counts[vi]));
          meshes.forEach((m) => {
            m.receiveShadow = opts.shadows?.receive ?? true;
            m.castShadow = false;
            this.meshes.push(m);
          });
          return { meshes, fill: 0 };
        }),
      );
    });
    this.pack(list);
  }

  private pack(list: readonly Instance[]) {
    const o = this.opts;
    const C = o.cell;
    // sort by cell so each cell is one contiguous range
    const keyed = list.map((it) => ({ it, k: Math.floor(it.x / C) * 100003 + Math.floor(it.z / C) }));
    keyed.sort((a, b) => a.k - b.k);
    const n = keyed.length;
    this.matrices = new Float32Array(n * 16);
    this.colors = new Float32Array(n * 3);
    this.pos = new Float32Array(n * 4);
    this.variant = new Uint8Array(n);
    const maxUntil = Math.max(...o.variants.map((v) => v.levels[v.levels.length - 1].until));
    let reachMax = 0;
    let start = 0;
    for (let i = 0; i < n; i++) {
      const it = keyed[i].it;
      o.write(it, this.matrices, i * 16, this.colors, i * 3);
      const r = o.reach ? o.reach(it) : 1;
      reachMax = Math.max(reachMax, r);
      this.pos[i * 4] = it.x;
      this.pos[i * 4 + 1] = it.y;
      this.pos[i * 4 + 2] = it.z;
      this.pos[i * 4 + 3] = r;
      this.variant[i] = it.variant % o.variants.length;
      if (i === n - 1 || keyed[i + 1].k !== keyed[i].k) {
        // the cell's bounding sphere, instance radii included
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, rr = 0;
        for (let j = start; j <= i; j++) {
          const q = keyed[j].it;
          x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
          y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
          z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z);
          rr = Math.max(rr, o.radius(q));
        }
        const c = new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const rad = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + rr * 2;
        this.cells.push({ start, end: i + 1, sphere: new Sphere(c, rad) });
        start = i + 1;
      }
    }
    this.maxReach = maxUntil * reachMax * (1 + (o.fade ?? 0.08));
  }

  private push(vi: number, li: number, i: number, fade: number) {
    const L = this.levels[vi][li];
    const at = L.fill;
    // copied element by element: a typed-array view per instance and part was ~10k objects a frame
    const M = this.matrices;
    const C = this.colors;
    for (const m of L.meshes) {
      const ma = m.instanceMatrix.array as Float32Array;
      for (let e = 0; e < 16; e++) ma[at * 16 + e] = M[i * 16 + e];
      const ca = m.instanceColor!.array as Float32Array;
      ca[at * 3] = C[i * 3];
      ca[at * 3 + 1] = C[i * 3 + 1];
      ca[at * 3 + 2] = C[i * 3 + 2];
      ((m.geometry.getAttribute('aFade') as InstancedBufferAttribute).array as Float32Array)[at] = fade;
    }
    L.fill = at + 1;
  }

  /** Re-select the instances for this camera. Cheap enough to run on every drawn frame. */
  update(camera: Camera) {
    const o = this.opts;
    camera.updateMatrixWorld();
    tmpM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(tmpM);
    camPos.setFromMatrixPosition(camera.matrixWorld);
    // Cross-fade only while the eye moves (the walk): at rest every instance is one level, whole,
    // so a still view never keeps a crown half-dithered at a boundary.
    const moving = camPos.distanceToSquared(this.lastEye) > 1e-4;
    this.lastEye.copy(camPos);
    const fadeK = moving ? (o.fade ?? 0.08) : 0;
    for (const lv of this.levels) for (const L of lv) L.fill = 0;
    const P = this.pos;
    for (const cell of this.cells) {
      const dc = cell.sphere.center.distanceTo(camPos) - cell.sphere.radius;
      if (dc > this.maxReach || !frustum.intersectsSphere(cell.sphere)) continue;
      for (let i = cell.start; i < cell.end; i++) {
        const dx = P[i * 4] - camPos.x, dy = P[i * 4 + 1] - camPos.y, dz = P[i * 4 + 2] - camPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const r = P[i * 4 + 3];
        const vi = this.variant[i];
        const levels = o.variants[vi].levels;
        // level li covers [lo, hi]; each boundary is cross-faded over ±w of it, the same w on both sides
        if (!moving) {
          for (let li = 0; li < levels.length; li++)
            if (d <= levels[li].until * r) {
              this.push(vi, li, i, 1);
              break;
            }
          continue;
        }
        let lo = 0;
        let wLo = 0;
        for (let li = 0; li < levels.length; li++) {
          const hi = levels[li].until * r;
          const wHi = hi * fadeK;
          if (d < lo - wLo) break;
          if (d <= hi + wHi) {
            const tIn = li === 0 ? 1 : Math.min(1, Math.max(0, (d - (lo - wLo)) / (2 * wLo)));
            const tOut = Math.min(1, Math.max(0, (hi + wHi - d) / (2 * wHi)));
            // fading in: the complement of the outgoing level's pattern (1 − tIn = its tOut)
            if (tIn < 1) this.push(vi, li, i, -(1 - tIn));
            else this.push(vi, li, i, tOut);
          }
          lo = hi;
          wLo = wHi;
        }
      }
    }
    for (const lv of this.levels)
      for (const L of lv)
        for (const m of L.meshes) {
          m.count = L.fill;
          if (!L.fill) continue;
          m.instanceMatrix.clearUpdateRanges();
          m.instanceMatrix.addUpdateRange(0, L.fill * 16);
          m.instanceMatrix.needsUpdate = true;
          m.instanceColor!.clearUpdateRanges();
          m.instanceColor!.addUpdateRange(0, L.fill * 3);
          m.instanceColor!.needsUpdate = true;
          const f = m.geometry.getAttribute('aFade') as InstancedBufferAttribute;
          f.clearUpdateRanges();
          f.addUpdateRange(0, L.fill);
          f.needsUpdate = true;
        }
  }

  /** Instances drawn last frame, per level (for the dev probe). */
  stats() {
    return this.levels.map((lv) => lv.map((L) => L.fill));
  }

  /**
   * Shadow casters: one InstancedMesh per part of the given level, for every instance within
   * `radius` of (x, z), on `layer` — call again to refill around a new centre.
   */
  casters(level: number, layer: number): CasterSet {
    const sets = this.opts.variants.map((v, vi) => {
      const lv = v.levels[Math.min(level, v.levels.length - 1)];
      return lv.parts.map((p) => {
        const m = makeMesh(p, this.levels[vi][0].meshes[0].instanceMatrix.count);
        m.castShadow = true;
        m.receiveShadow = false;
        m.layers.set(layer);
        return m;
      });
    });
    const fill = (x: number, z: number, radius: number) => {
      const fills = sets.map(() => 0);
      const P = this.pos;
      const r2 = radius * radius;
      for (let i = 0; i < this.variant.length; i++) {
        const dx = P[i * 4] - x, dz = P[i * 4 + 2] - z;
        if (dx * dx + dz * dz > r2) continue;
        const vi = this.variant[i];
        const at = fills[vi]++;
        for (const m of sets[vi]) {
          const ma = m.instanceMatrix.array as Float32Array;
          for (let e = 0; e < 16; e++) ma[at * 16 + e] = this.matrices[i * 16 + e];
        }
      }
      sets.forEach((ms, vi) =>
        ms.forEach((m) => {
          m.count = fills[vi];
          m.instanceMatrix.clearUpdateRanges();
          m.instanceMatrix.addUpdateRange(0, fills[vi] * 16);
          m.instanceMatrix.needsUpdate = true;
        }),
      );
    };
    const meshes = sets.flat();
    return { meshes, fill, dispose: () => meshes.forEach(disposeMesh) };
  }

  dispose() {
    this.meshes.forEach(disposeMesh);
  }
}

export type CasterSet = { meshes: InstancedMesh[]; fill: (x: number, z: number, radius: number) => void; dispose: () => void };

/**
 * GLSL for a material drawn by an InstanceField: the per-instance `aFade` and
 * the screen-door test (call `fieldDither()` early in the fragment shader).
 */
export const FIELD_VERT_PARS = /* glsl */ `
attribute float aFade;
varying float vFieldFade;`;
export const FIELD_VERT = /* glsl */ `
vFieldFade = aFade;`;
export const FIELD_FRAG_PARS = /* glsl */ `
varying float vFieldFade;
// interleaved gradient noise: a fixed, even screen-door pattern
float fieldIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void fieldDither() {
  float f = abs(vFieldFade);
  float n = fieldIgn(gl_FragCoord.xy);
  if (vFieldFade >= 0.0 ? n >= f : n < f) discard;
}`;
