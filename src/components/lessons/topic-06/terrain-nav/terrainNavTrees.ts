import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD3D } from './terrainNavGeometry';
import { rng, type Tree } from './terrainNavTerrain';
import { addLight } from './terrainNavAir';

/**
 * The trees and shrubs of the terrain-association model, grown once per page
 * from fixed seeds (the same trees on every visit). Only the look is made here:
 * TerrainNav3D places every instance from the shared lists — the map's own
 * tree symbols — at its point, height and crown radius.
 *
 *   skeleton  space colonisation (Runions et al. 2007): a trunk grows into a
 *             cloud of attraction points clumped inside the species' crown, so
 *             limbs fork, thin out (pipe model) and end in tufts with gaps
 *             between them — no two variants alike
 *   wood      the trunk and limbs as tapered tubes in a bark scan (CC0, see
 *             ATTRIBUTIONS.md), twigs thinner than ~1.5 cm left to the leaves
 *   leaves    cards cut from a painted atlas (pine needle brushes, small
 *             kermes-oak leaves, narrow silver olive leaves, maquis), drawn with
 *             alpha to coverage; their normals follow the crown's volume, so a
 *             crown has a lit side, a shaded side and a soft terminator, and the
 *             sun shines through the leaves seen against it
 *   core      a lumpy hull inside the crown: the deep foliage seen through the
 *             gaps close up; far away it swells to the crown's envelope as the
 *             leaf cards shrink into it (no pop, no shimmer of sub-pixel cards)
 *
 * Variants are built at a reference size (TREE_REF); an instance scales its
 * variant to its own height and crown radius.
 */

type Kind = Tree['kind'];
const S = WORLD3D.metresPerUnit;

/** The reference tree each variant is built at (metres); the crown spans bottomM…heightM, crownR across. */
export const TREE_REF: Record<Kind, { heightM: number; crownR: number; bottomM: number }> = {
  pine: { heightM: 13, crownR: 3.6, bottomM: 13 * 0.42 },
  oak: { heightM: 8.2, crownR: 4.6, bottomM: 2.1 },
  olive: { heightM: 4.7, crownR: 2.75, bottomM: 1.1 },
};
export const TREE_VARIANTS: Record<Kind, number> = { pine: 5, oak: 6, olive: 4 };

/** Atlas tiles (2 × 2): the leaves of each kind and of the maquis shrubs. */
const TILE: Record<Kind | 'shrub', [number, number]> = { pine: [0, 1], oak: [1, 1], olive: [0, 0], shrub: [1, 0] };

// ---------------------------------------------------------------- the skeleton

type Skeleton = { x: Float32Array; y: Float32Array; z: Float32Array; parent: Int32Array; r: Float32Array; n: number };

type CrownSpec = {
  /** Inside the crown (≤ 1) for a point relative to the crown centre, in crown radii. */
  inside: (x: number, y: number, z: number) => number;
  clumps: number;
  perClump: number;
  clumpR: number;
  step: number;
  influence: number;
  kill: number;
  /** Upward pull of new growth (and a little outward). */
  tropism: number;
  baseR: number;
  tipR: number;
};

const SPECS: Record<Kind, CrownSpec> = {
  // Aleppo pine: tall bare trunk, an irregular crown flattening on top, tufts with sky between them
  pine: {
    inside: (x, y, z) => Math.hypot(x, z) ** 2 + Math.abs(y) ** (y > 0 ? 3.2 : 2),
    clumps: 34,
    perClump: 16,
    clumpR: 0.95,
    step: 0.3,
    influence: 2.6,
    kill: 0.42,
    tropism: 0.35,
    baseR: 0.2,
    tipR: 0.006,
  },
  // kermes / Tabor oak: a short trunk that forks low, a broad dense dome
  oak: {
    inside: (x, y, z) => Math.hypot(x, z) ** 2 + (y < 0 ? (y * 1.12) ** 2 : y * y),
    clumps: 46,
    perClump: 14,
    clumpR: 0.95,
    step: 0.28,
    influence: 2.5,
    kill: 0.38,
    tropism: 0.18,
    baseR: 0.2,
    tipR: 0.006,
  },
  // olive: a thick, twisting trunk splitting into a few limbs, a loose, open, rounded crown
  olive: {
    inside: (x, y, z) => Math.hypot(x, z) ** 2 + y * y,
    clumps: 26,
    perClump: 12,
    clumpR: 0.6,
    step: 0.22,
    influence: 1.8,
    kill: 0.3,
    tropism: 0.12,
    baseR: 0.2,
    tipR: 0.005,
  },
};

function crownFrame(kind: Kind) {
  const ref = TREE_REF[kind];
  const hh = (ref.heightM - ref.bottomM) / 2;
  return { cy: ref.bottomM + hh, hh, r: ref.crownR };
}

/** Grows one variant's skeleton (metres, base at the origin). */
export function growSkeleton(kind: Kind, seed: number): Skeleton {
  const rand = rng(seed);
  const spec = SPECS[kind];
  const f = crownFrame(kind);
  // the twigs end inside the crown's envelope: the leaf cards on them reach out to it
  const cy = f.cy - f.hh * 0.06;
  const hh = f.hh * 0.86;
  const r = f.r * 0.86;
  const MAX = 3200;
  const x = new Float32Array(MAX);
  const y = new Float32Array(MAX);
  const z = new Float32Array(MAX);
  const parent = new Int32Array(MAX).fill(-1);
  let n = 0;
  // nodes in a grid of influence-sized cells: an attractor looks only at the 27 cells around it
  const cell = spec.influence;
  const grid = new Map<number, number[]>();
  const key = (i: number, j: number, k: number) => (i + 64) * 16384 + (j + 64) * 128 + (k + 64);
  const add = (px: number, py: number, pz: number, p: number) => {
    x[n] = px;
    y[n] = py;
    z[n] = pz;
    parent[n] = p;
    const kk = key(Math.floor(px / cell), Math.floor(py / cell), Math.floor(pz / cell));
    const list = grid.get(kk);
    if (list) list.push(n);
    else grid.set(kk, [n]);
    return n++;
  };

  // ---- attraction points: clumps inside the crown (the tufts), denser towards its surface
  const ax: number[] = [];
  const ay: number[] = [];
  const az: number[] = [];
  for (let c = 0; c < spec.clumps; c++) {
    let cx = 0;
    let cyy = 0;
    let cz = 0;
    for (let t = 0; t < 60; t++) {
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const rr = 0.45 + 0.55 * Math.sqrt(rand());
      const s = Math.sqrt(1 - u * u);
      cx = Math.cos(a) * s * rr;
      cyy = u * rr;
      cz = Math.sin(a) * s * rr;
      if (spec.inside(cx, cyy, cz) <= 0.92) break;
    }
    for (let k = 0; k < spec.perClump; k++) {
      const px = cx * r + (rand() - 0.5) * 2 * spec.clumpR;
      const py = cy + cyy * hh + (rand() - 0.5) * 1.6 * spec.clumpR;
      const pz = cz * r + (rand() - 0.5) * 2 * spec.clumpR;
      if (spec.inside(px / r, (py - cy) / hh, pz / r) > 1) continue;
      ax.push(px);
      ay.push(py);
      az.push(pz);
    }
  }

  // ---- the trunk (and, for the oak and the olive, the stems it forks into)
  const lean = (kind === 'pine' ? 0.03 + rand() * 0.14 : 0.04 + rand() * 0.1) * (rand() < 0.5 ? -1 : 1);
  const bend = (kind === 'pine' ? 0.25 : 0.12) * (rand() - 0.5);
  const leanA = rand() * Math.PI * 2;
  let last = add(0, 0, 0, -1);
  const trunkTop = kind === 'pine' ? cy - hh * (0.2 + rand() * 0.35) : kind === 'oak' ? 1.1 + rand() * 0.5 : 0.55 + rand() * 0.35;
  const segs = Math.max(2, Math.round(trunkTop / (spec.step * 1.6)));
  for (let k = 1; k <= segs; k++) {
    const t = k / segs;
    const wob = Math.sin(t * 5.1 + seed) * (kind === 'olive' ? 0.09 : 0.04) + bend * Math.sin(t * Math.PI) * trunkTop * 0.25;
    last = add(Math.cos(leanA) * lean * trunkTop * t + wob, trunkTop * t, Math.sin(leanA) * lean * trunkTop * t - wob * 0.6, last);
  }
  if (kind !== 'pine') {
    // two to four stems leaving the fork outwards and up
    const stems = kind === 'olive' ? 2 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3);
    const a0 = rand() * Math.PI * 2;
    for (let s = 0; s < stems; s++) {
      const a = a0 + (s / stems) * Math.PI * 2 + (rand() - 0.5) * 0.7;
      const out = (kind === 'olive' ? 0.75 : 0.55) + rand() * 0.25;
      const len = kind === 'olive' ? 1.0 + rand() * 0.5 : 1.3 + rand() * 0.7;
      let p = last;
      const n2 = Math.max(2, Math.round(len / spec.step));
      for (let k = 1; k <= n2; k++) {
        const t = k / n2;
        const tw = kind === 'olive' ? Math.sin(t * 4 + s) * 0.08 : 0;
        p = add(x[last] + Math.cos(a + tw) * out * len * t, y[last] + len * t * (1 - out * 0.45), z[last] + Math.sin(a + tw) * out * len * t, p);
      }
    }
  }

  // ---- space colonisation
  const alive = new Uint8Array(ax.length).fill(1);
  const sumX = new Float32Array(MAX);
  const sumY = new Float32Array(MAX);
  const sumZ = new Float32Array(MAX);
  const cnt = new Int32Array(MAX);
  const lastChild = new Int32Array(MAX).fill(-1);
  const di2 = spec.influence ** 2;
  const dk2 = spec.kill ** 2;
  for (let iter = 0; iter < 160 && n < MAX - 64; iter++) {
    sumX.fill(0, 0, n);
    sumY.fill(0, 0, n);
    sumZ.fill(0, 0, n);
    cnt.fill(0, 0, n);
    let any = false;
    for (let a = 0; a < ax.length; a++) {
      if (!alive[a]) continue;
      let best = -1;
      let bd = di2;
      const ci = Math.floor(ax[a] / cell);
      const cj = Math.floor(ay[a] / cell);
      const ck = Math.floor(az[a] / cell);
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++)
          for (let dk = -1; dk <= 1; dk++) {
            const list = grid.get(key(ci + di, cj + dj, ck + dk));
            if (!list) continue;
            for (const k of list) {
              const dx = ax[a] - x[k];
              const dy = ay[a] - y[k];
              const dz = az[a] - z[k];
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 < bd) {
                bd = d2;
                best = k;
              }
            }
          }
      if (best < 0) continue;
      const d = Math.sqrt(bd) || 1;
      sumX[best] += (ax[a] - x[best]) / d;
      sumY[best] += (ay[a] - y[best]) / d;
      sumZ[best] += (az[a] - z[best]) / d;
      cnt[best]++;
    }
    const before = n;
    for (let k = 0; k < before && n < MAX - 1; k++) {
      if (!cnt[k]) continue;
      let dx = sumX[k] / cnt[k] + (rand() - 0.5) * 0.18;
      let dy = sumY[k] / cnt[k] + spec.tropism * 0.35 + (rand() - 0.5) * 0.18;
      let dz = sumZ[k] / cnt[k] + (rand() - 0.5) * 0.18;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l;
      dy /= l;
      dz /= l;
      const nx = x[k] + dx * spec.step;
      const ny = y[k] + dy * spec.step;
      const nz = z[k] + dz * spec.step;
      // two attractors pulling a node both ways would grow the same twig again and again
      const prev = lastChild[k];
      if (prev >= 0 && (x[prev] - nx) ** 2 + (y[prev] - ny) ** 2 + (z[prev] - nz) ** 2 < (spec.step * 0.35) ** 2) continue;
      lastChild[k] = add(nx, ny, nz, k);
      any = true;
    }
    if (!any) break;
    for (let a = 0; a < ax.length; a++) {
      if (!alive[a]) continue;
      for (let k = before; k < n; k++) {
        const dx = ax[a] - x[k];
        const dy = ay[a] - y[k];
        const dz = az[a] - z[k];
        if (dx * dx + dy * dy + dz * dz < dk2) {
          alive[a] = 0;
          break;
        }
      }
    }
  }

  // ---- the last twigs: two or three short sprays out of every tip, fanning outwards (the leaves sit on them)
  {
    const tips: number[] = [];
    const hasKid = new Uint8Array(n);
    for (let k = 1; k < n; k++) if (parent[k] >= 0) hasKid[parent[k]] = 1;
    for (let k = 0; k < n; k++) if (!hasKid[k] && y[k] > cy - hh * 1.1) tips.push(k);
    for (const k of tips) {
      const p = parent[k] >= 0 ? parent[k] : k;
      let dx = x[k] - x[p];
      let dy = y[k] - y[p];
      let dz = z[k] - z[p];
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l;
      dy /= l;
      dz /= l;
      const sprays = 2 + (rand() < 0.5 ? 1 : 0);
      for (let s = 0; s < sprays && n < MAX - 2; s++) {
        const len = spec.step * (1.1 + rand() * 0.9);
        let ex = dx + (rand() - 0.5) * 1.3 + (x[k] / r) * 0.4;
        let ey = dy + (rand() - 0.5) * 1.0 + spec.tropism * 0.4;
        let ez = dz + (rand() - 0.5) * 1.3 + (z[k] / r) * 0.4;
        const m = Math.hypot(ex, ey, ez) || 1;
        ex /= m;
        ey /= m;
        ez /= m;
        const mid = add(x[k] + ex * len * 0.5, y[k] + ey * len * 0.5, z[k] + ez * len * 0.5, k);
        add(x[k] + ex * len + (rand() - 0.5) * 0.08, y[k] + ey * len + 0.04, z[k] + ez * len + (rand() - 0.5) * 0.08, mid);
      }
    }
  }

  // ---- radii: the pipe model from the tips down, then scaled to the trunk's base radius
  const rad = new Float32Array(n).fill(0);
  const acc = new Float32Array(n).fill(0);
  // da Vinci: the cross-sections of the branches add up to their parent's
  const P = 2.0;
  for (let k = n - 1; k >= 0; k--) {
    rad[k] = acc[k] > 0 ? Math.pow(acc[k], 1 / P) : 1;
    if (parent[k] >= 0) acc[parent[k]] += Math.pow(rad[k], P);
  }
  const base = spec.baseR * (kind === 'olive' ? 1.25 + rand() * 0.3 : 0.9 + rand() * 0.25);
  const kR = base / rad[0];
  for (let k = 0; k < n; k++) rad[k] = Math.max(spec.tipR, rad[k] * kR);
  return { x: x.slice(0, n), y: y.slice(0, n), z: z.slice(0, n), parent: parent.slice(0, n), r: rad, n };
}

// ---------------------------------------------------------------- wood

/** Twigs thinner than this (metres, radius) are left to the leaf cards. */
const MIN_WOOD_R: Record<Kind, number> = { pine: 0.018, oak: 0.019, olive: 0.03 };

/**
 * Tubes along the skeleton's chains (from a fork to the next fork or a tip), framed
 * by parallel transport so they don't twist. aWood.x: ambient occlusion (darker
 * inside the crown and at the foot); aWood.y: 1 on the trunk and its first stems,
 * 0 on the limbs. `part`: the trunk and its first stems (drawn for every tree), or
 * the limbs (drawn only close enough to show).
 */
function woodGeometry(kind: Kind, sk: Skeleton, part: 'stem' | 'limbs') {
  const { cy, hh, r } = crownFrame(kind);
  const kids: number[][] = Array.from({ length: sk.n }, () => []);
  for (let k = 1; k < sk.n; k++) if (sk.parent[k] >= 0) kids[sk.parent[k]].push(k);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const chain = (start: number, from: number, depth: number) => {
    const stem = depth <= (kind === 'pine' ? 0 : 1);
    const pts: number[] = from >= 0 ? [from, start] : [start];
    let k = start;
    while (kids[k].length === 1) {
      k = kids[k][0];
      pts.push(k);
    }
    // drop the thin end
    let end = pts.length;
    while (end > 2 && sk.r[pts[end - 1]] < MIN_WOOD_R[kind]) end--;
    // a ring at every other node along the thin limbs (their bends are gentle)
    const used = pts.slice(0, end).filter((_, i, a) => sk.r[start] > 0.06 || i % 2 === 0 || i === a.length - 1);
    if (used.length >= 2 && sk.r[start] >= MIN_WOOD_R[kind] && stem === (part === 'stem')) {
      const r0 = sk.r[start];
      const segs = r0 > 0.09 ? 7 : r0 > 0.045 ? 5 : r0 > 0.028 ? 4 : 3;
      const rep = Math.max(1, Math.round((2 * Math.PI * r0) / 0.45));
      const first = pos.length / 3;
      let len = 0;
      nrm.set(0, 0, 0);
      for (let i = 0; i < used.length; i++) {
        const p = used[i];
        const a = used[Math.max(0, i - 1)];
        const b = used[Math.min(used.length - 1, i + 1)];
        tan.set(sk.x[b] - sk.x[a], sk.y[b] - sk.y[a], sk.z[b] - sk.z[a]).normalize();
        if (i === 0) {
          tmp.set(Math.abs(tan.y) < 0.9 ? 0 : 1, Math.abs(tan.y) < 0.9 ? 1 : 0, 0);
          nrm.crossVectors(tan, tmp).normalize();
        } else {
          nrm.addScaledVector(tan, -nrm.dot(tan)).normalize();
          len += Math.hypot(sk.x[p] - sk.x[used[i - 1]], sk.y[p] - sk.y[used[i - 1]], sk.z[p] - sk.z[used[i - 1]]);
        }
        bin.crossVectors(tan, nrm);
        // the branch's own radius (the fork node takes the child's), the root flare at the foot
        // (a trunk going on past a fork keeps its girth there and tapers on: no step)
        let rr = i === 0 && from >= 0 ? (stem && depth === 0 ? sk.r[from] : sk.r[start]) : sk.r[p];
        if (stem && sk.y[p] < 0.6) rr *= 1 + 0.45 * (1 - sk.y[p] / 0.6) ** 2;
        // occlusion: dark deep in the crown and at its foot, light at its surface
        const e = Math.sqrt((sk.x[p] / r) ** 2 + ((sk.y[p] - cy) / hh) ** 2 + (sk.z[p] / r) ** 2);
        const inCrown = THREE.MathUtils.smoothstep(sk.y[p], cy - hh * 1.15, cy - hh * 0.75);
        const ao = THREE.MathUtils.lerp(1, THREE.MathUtils.lerp(0.42, 0.95, THREE.MathUtils.smoothstep(e, 0.25, 1)), inCrown) * (stem && sk.y[p] < 0.4 ? 0.78 + 0.55 * sk.y[p] : 1);
        for (let j = 0; j <= segs; j++) {
          const ang = (j / segs) * Math.PI * 2;
          v.copy(nrm).multiplyScalar(Math.cos(ang)).addScaledVector(bin, Math.sin(ang));
          pos.push(sk.x[p] + v.x * rr, sk.y[p] + v.y * rr, sk.z[p] + v.z * rr);
          nor.push(v.x, v.y, v.z);
          uv.push((j / segs) * rep, len / 0.9);
          col.push(ao, stem ? 1 : 0);
        }
        if (i > 0) {
          const o = first + (i - 1) * (segs + 1);
          for (let j = 0; j < segs; j++) {
            const a0 = o + j;
            const b0 = o + j + segs + 1;
            idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
          }
        }
      }
    }
    // the chains that leave this one's end
    const tip = pts[pts.length - 1];
    // the pine's leader goes on as the trunk (its thickest child); every other child is a limb
    const lead = kids[tip].reduce((b, c) => (b < 0 || sk.r[c] > sk.r[b] ? c : b), -1);
    for (const c of kids[tip]) chain(c, tip, kind === 'pine' && depth === 0 && c === lead && sk.r[c] > 0.06 ? 0 : depth + 1);
  };
  chain(0, -1, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aWood', new THREE.Float32BufferAttribute(col, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------- leaves

/**
 * Leaf cards at the twig ends: a cluster per tip (thinned to a spacing), two or
 * three crossed cards of the kind's atlas tile, each turned at random about the
 * twig. aCard: the cluster's centre (the cards shrink into it far away).
 * Normals: the crown envelope's own at each corner, tipped up a little.
 */
function leafGeometry(kind: Kind | 'shrub', centres: readonly { p: THREE.Vector3; dir: THREE.Vector3; size: number }[], envelope: { cy: number; hh: number; r: number }, seed: number) {
  const rand = rng(seed);
  const [tu, tv] = TILE[kind];
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const card: number[] = [];
  const idx: number[] = [];
  const n = new THREE.Vector3();
  const u = new THREE.Vector3();
  const w = new THREE.Vector3();
  const q = new THREE.Vector3();
  const e = new THREE.Vector3();
  const cards = 2;
  for (const c of centres) {
    for (let k = 0; k < cards; k++) {
      // the card's plane: about the twig's direction, at a random roll
      w.copy(c.dir);
      n.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(w);
      if (n.lengthSq() < 1e-8) n.set(1, 0, 0).cross(w);
      n.normalize();
      u.crossVectors(w, n).normalize();
      const s = c.size * (0.85 + rand() * 0.3);
      const flip = rand() < 0.5;
      // the card's foot sits on the twig, it reaches outwards along it
      const ox = c.p.x - w.x * s * 0.18;
      const oy = c.p.y - w.y * s * 0.18;
      const oz = c.p.z - w.z * s * 0.18;
      const base = pos.length / 3;
      const corners: [number, number][] = [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ];
      for (const [cu, cv] of corners) {
        q.set(ox + u.x * cu * s + w.x * cv * s, oy + u.y * cu * s + w.y * cv * s, oz + u.z * cu * s + w.z * cv * s);
        pos.push(q.x, q.y, q.z);
        // the envelope's normal at the corner
        e.set(q.x / envelope.r ** 2, (q.y - envelope.cy) / envelope.hh ** 2, q.z / envelope.r ** 2).normalize();
        e.y += 0.28;
        e.normalize();
        nor.push(e.x, e.y, e.z);
        const uu = flip ? 0.5 - cu : cu + 0.5;
        uv.push((tu + 0.03 + uu * 0.94) / 2, (tv + 0.03 + cv * 0.94) / 2);
        // occlusion: deep inside and low in the crown darker
        const depth = Math.sqrt((q.x / envelope.r) ** 2 + ((q.y - envelope.cy) / envelope.hh) ** 2 + (q.z / envelope.r) ** 2);
        const ao = THREE.MathUtils.lerp(0.5, 1.02, THREE.MathUtils.smoothstep(depth, 0.35, 1.0)) * THREE.MathUtils.lerp(0.78, 1, THREE.MathUtils.smoothstep(q.y, envelope.cy - envelope.hh, envelope.cy + envelope.hh * 0.6)) * (0.9 + rand() * 0.14);
        col.push(ao, ao, ao);
        card.push(c.p.x, c.p.y, c.p.z);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aCard', new THREE.Float32BufferAttribute(card, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Leaf clusters on a skeleton: its tips and the thin ends of its limbs inside the crown, thinned to `spacing`. */
export function clusterCentres(kind: Kind, sk: Skeleton, seed: number) {
  const rand = rng(seed);
  const { cy, hh, r } = crownFrame(kind);
  const kids = new Int32Array(sk.n);
  for (let k = 1; k < sk.n; k++) if (sk.parent[k] >= 0) kids[sk.parent[k]]++;
  const size = kind === 'pine' ? 1.55 : kind === 'oak' ? 1.3 : 0.95;
  const spacing = kind === 'pine' ? 0.4 : kind === 'oak' ? 0.42 : 0.27;
  const out: { p: THREE.Vector3; dir: THREE.Vector3; size: number }[] = [];
  // tips first, then the thin twigs behind them: the outer shell fills before the inside
  const order = Array.from({ length: sk.n }, (_, k) => k).sort((a, b) => kids[a] - kids[b] || sk.r[a] - sk.r[b]);
  for (const k of order) {
    const thin = sk.r[k] < (kind === 'pine' ? 0.03 : 0.026);
    if (!(kids[k] === 0 || thin)) continue;
    if (sk.y[k] < cy - hh * 1.05) continue;
    // leaves on the outer two thirds of the crown (the inside is bare wood and shade)
    const e = Math.sqrt((sk.x[k] / r) ** 2 + ((sk.y[k] - cy) / hh) ** 2 + (sk.z[k] / r) ** 2);
    if (e < 0.4 && rand() < 0.8) continue;
    const p = new THREE.Vector3(sk.x[k], sk.y[k], sk.z[k]);
    if (out.some((o) => o.p.distanceToSquared(p) < spacing * spacing)) continue;
    const pk = sk.parent[k] >= 0 ? sk.parent[k] : k;
    const dir = new THREE.Vector3(sk.x[k] - sk.x[pk], sk.y[k] - sk.y[pk], sk.z[k] - sk.z[pk]);
    // tufts point out of the crown and a little up
    const outw = new THREE.Vector3(sk.x[k] / r, (sk.y[k] - cy) / hh + 0.25, sk.z[k] / r);
    dir.normalize().multiplyScalar(0.6).add(outw.normalize());
    if (kind === 'pine') dir.y += 0.35;
    dir.normalize();
    out.push({ p, dir, size: size * (0.8 + rand() * 0.4) });
  }
  return out;
}

// ---------------------------------------------------------------- the inner hull

/** A lumpy hull from lobes at the leaf clusters' clumps, inside the crown (color: occlusion). */
function coreGeometry(seed: number, centres: readonly { p: THREE.Vector3 }[], envelope: { cy: number; hh: number; r: number }, lobes: number, shrink: number, detail: number) {
  const rand = rng(seed);
  // k-means-ish: lobes at a spread of the clusters
  const picks: THREE.Vector3[] = [];
  const pool = [...centres];
  for (let k = 0; k < lobes && pool.length; k++) {
    let best = 0;
    let bestD = -1;
    for (let i = 0; i < pool.length; i++) {
      const d = picks.length ? Math.min(...picks.map((p) => p.distanceToSquared(pool[i].p))) : rand();
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    picks.push(pool[best].p.clone());
    pool.splice(best, 1);
  }
  const parts = picks.map((p) => {
    // pulled towards the crown's axis, sized to fill
    const c = new THREE.Vector3(p.x * shrink, envelope.cy + (p.y - envelope.cy) * shrink, p.z * shrink);
    const rr = Math.min(envelope.r, envelope.hh) * (0.42 + rand() * 0.14);
    return new THREE.IcosahedronGeometry(rr, detail).translate(c.x, c.y, c.z);
  });
  parts.push(new THREE.IcosahedronGeometry(1, detail).scale(envelope.r * shrink * 0.78, envelope.hh * shrink * 0.78, envelope.r * shrink * 0.78).translate(0, envelope.cy, 0));
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  parts.forEach((g) => g.dispose());
  const pos = geo.getAttribute('position');
  const nrm = new Float32Array(pos.count * 3);
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // the envelope's normal (one smooth mass in the light)
    const e = new THREE.Vector3(x / envelope.r ** 2, (y - envelope.cy) / envelope.hh ** 2, z / envelope.r ** 2).normalize();
    e.y += 0.2;
    e.normalize();
    nrm.set([e.x, e.y, e.z], i * 3);
    const ao = THREE.MathUtils.lerp(0.55, 0.92, THREE.MathUtils.smoothstep(y, envelope.cy - envelope.hh, envelope.cy + envelope.hh * 0.7));
    col.set([ao, ao, ao], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------- variants

export type TreeVariant = { trunk: THREE.BufferGeometry; wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry; core: THREE.BufferGeometry };

const variantCache = new Map<string, { sk: Skeleton; centres: ReturnType<typeof clusterCentres> }>();

/** One variant of a kind, in reference metres (base at the origin). */
export function treeVariant(kind: Kind, k: number): TreeVariant {
  const seed = (kind === 'pine' ? 0x9b05688c : kind === 'oak' ? 0x1f83d9ab : 0x5be0cd19) ^ Math.imul(k + 1, 0x27d4eb2d);
  const key = `${kind}:${k}`;
  let c = variantCache.get(key);
  if (!c) {
    const sk = growSkeleton(kind, seed);
    c = { sk, centres: clusterCentres(kind, sk, seed ^ 0x51ed270b) };
    variantCache.set(key, c);
  }
  const env = crownFrame(kind);
  return {
    trunk: woodGeometry(kind, c.sk, 'stem'),
    wood: woodGeometry(kind, c.sk, 'limbs'),
    leaves: leafGeometry(kind, c.centres, env, seed ^ 0x2545f491),
    core: coreGeometry(seed ^ 0x68e31da4, c.centres, env, kind === 'olive' ? 5 : 6, 1, 1),
  };
}

/** A maquis shrub of unit radius and height (base at y = 0): leaf clusters over a low dome. */
export function shrubVariant(k: number): { leaves: THREE.BufferGeometry; core: THREE.BufferGeometry } {
  const rand = rng(0x510e527f ^ Math.imul(k + 1, 0x9e3779b1));
  const env = { cy: 0.42, hh: 0.58, r: 1 };
  const centres: { p: THREE.Vector3; dir: THREE.Vector3; size: number }[] = [];
  const count = 18 + Math.floor(rand() * 6);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const up = Math.pow(rand(), 0.7);
    const rr = 0.25 + 0.6 * Math.sqrt(rand());
    const p = new THREE.Vector3(Math.cos(a) * rr, 0.08 + up * 0.75 * (1 - rr * 0.45), Math.sin(a) * rr);
    const dir = new THREE.Vector3(p.x, p.y + 0.6, p.z).normalize();
    centres.push({ p, dir, size: 0.58 + rand() * 0.24 });
  }
  return { leaves: leafGeometry('shrub', centres, env, 0x7137449e ^ k), core: coreGeometry(0x3c6ef372 ^ k, centres, env, 4, 1, 0) };
}

// ---------------------------------------------------------------- the leaf atlas

/**
 * 2048² RGBA: four painted tiles — Aleppo pine needle brushes, kermes-oak twigs
 * of small leathery leaves, olive twigs of narrow two-toned leaves, maquis
 * (lentisk) leaflets. Each leaf is shaded from the light side to the shaded one
 * with its midrib; the colour under transparent pixels is bled out from the
 * leaves (no dark fringe in the mips).
 */
let atlasCache: Uint8Array | null = null;
const ATLAS = 2048;
export function leafAtlas(): THREE.DataTexture {
  atlasCache ??= paintAtlas();
  const t = new THREE.DataTexture(atlasCache, ATLAS, ATLAS, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.flipY = false;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function paintAtlas(): Uint8Array {
  const T = ATLAS / 2;
  const leaves = document.createElement('canvas');
  leaves.width = leaves.height = ATLAS;
  const ctx = leaves.getContext('2d', { willReadFrequently: true })!;
  const rand = rng(0x6a09e667);
  const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

  // tile origin: canvas rows run from the top, the texture's v from the bottom (the rows are flipped below)
  const tileAt = (kind: keyof typeof TILE) => {
    const [tu, tv] = TILE[kind];
    return { x0: tu * T, y0: (1 - tv) * T };
  };

  /** A twig as a quadratic curve; returns points along it. */
  const twig = (x0: number, y0: number, ang: number, len: number, bend: number, width: number, colour: string, steps = 12) => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = ang + bend * t;
      const px = x0 + Math.cos(a) * len * t;
      const py = y0 + Math.sin(a) * len * t;
      pts.push([px, py, a]);
    }
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = Math.max(0.8, width * (1 - (i / pts.length) * 0.7));
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    return pts;
  };

  /** A leaf: an elongated, slightly asymmetric blade shaded across, with a midrib. */
  const leaf = (x: number, y: number, ang: number, len: number, wid: number, h: number, s: number, l: number, two = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -wid, 0, wid);
    g.addColorStop(0, hsl(h + 2, s, l + 5 + two * 14));
    g.addColorStop(0.45, hsl(h, s, l + 3));
    g.addColorStop(1, hsl(h - 3, s + 4, l - 7 + two * 10));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.35, -wid * 1.15, len, 0);
    ctx.quadraticCurveTo(len * 0.4, wid * 1.05, 0, 0);
    ctx.fill();
    ctx.strokeStyle = hsl(h - 4, s - 8, l - 10 + two * 16);
    ctx.lineWidth = Math.max(0.6, wid * 0.14);
    ctx.beginPath();
    ctx.moveTo(len * 0.04, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.stroke();
    ctx.restore();
  };

  /** A tile's drawing area (clipped 20 px in from its edges, so the mips don't bleed across tiles). */
  const inTile = (kind: keyof typeof TILE, draw: (x0: number, y0: number) => void) => {
    const { x0, y0 } = tileAt(kind);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + 20, y0 + 20, T - 40, T - 40);
    ctx.clip();
    draw(x0, y0);
    ctx.restore();
  };

  // ---- Aleppo pine: a branching spray of twigs, each ending in a small, dense brush of slender needles
  // (many small brushes, so a card reads as pine foliage close up, not as a few big leaves); the tips
  // barely lighter than the rest, so the silhouette has no pale rim
  inTile('pine', (x0, y0) => {
    const brushes: [number, number, number, number][] = [];
    const main = twig(x0 + T * 0.5, y0 + T * 0.97, -Math.PI / 2 + (rand() - 0.5) * 0.15, T * 0.5, (rand() - 0.5) * 0.3, 9, '#45372a');
    const twigs = [main];
    for (let b = 0; b < 7; b++) {
      const at = main[3 + Math.floor(rand() * (main.length - 4))];
      const side = b % 2 ? 1 : -1;
      twigs.push(twig(at[0], at[1], at[2] + side * (0.5 + rand() * 0.5), T * (0.2 + rand() * 0.16), -side * 0.4, 4.5, '#4a3a2b'));
    }
    for (const tw of twigs) {
      // a brush at the end of each twig and two or three along it
      const e = tw[tw.length - 1];
      brushes.push([e[0], e[1], e[2], 1]);
      for (let k = 0; k < 3; k++) {
        const at = tw[4 + Math.floor(rand() * (tw.length - 5))];
        const side = rand() < 0.5 ? -1 : 1;
        const a = at[2] + side * (0.6 + rand() * 0.6);
        const l = T * (0.04 + rand() * 0.05);
        twig(at[0], at[1], a, l, 0, 2, '#4f3d2c', 4);
        brushes.push([at[0] + Math.cos(a) * l, at[1] + Math.sin(a) * l, a, 0.75 + rand() * 0.3]);
      }
    }
    for (const pass of [0, 1, 2]) {
      for (const [bx, by, ba, k] of brushes) {
        const count = [34, 30, 16][pass];
        for (let i = 0; i < count; i++) {
          const a = ba + (rand() - 0.5) * (pass === 2 ? 2.2 : 3.0);
          const len = T * (0.05 + rand() * 0.04) * k;
          const back = rand() * T * 0.025;
          const sx = bx - Math.cos(ba) * back;
          const sy = by - Math.sin(ba) * back;
          const l = [10 + rand() * 5, 15 + rand() * 6, 21 + rand() * 7][pass];
          const ex = sx + Math.cos(a) * len;
          const ey = sy + Math.sin(a) * len;
          const g = ctx.createLinearGradient(sx, sy, ex, ey);
          g.addColorStop(0, hsl(100 + rand() * 10, 30, l - 3));
          g.addColorStop(1, hsl(90 + rand() * 12, 28, l + 2));
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2 + rand() * 0.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + Math.cos(a + 0.12) * len * 0.5, sy + Math.sin(a + 0.12) * len * 0.5, ex, ey);
          ctx.stroke();
        }
      }
    }
  });

  // ---- kermes oak: stiff twigs crowded with small, leathery, dark leaves (some lighter new growth)
  inTile('oak', (x0, y0) => {
    const twigs: [number, number, number][][] = [];
    for (let t = 0; t < 9; t++) {
      const a = -Math.PI / 2 + (t - 4) * 0.34 + (rand() - 0.5) * 0.3;
      const tw = twig(x0 + T * (0.5 + (rand() - 0.5) * 0.12), y0 + T * 0.96, a, T * (0.42 + rand() * 0.34), (rand() - 0.5) * 0.7, 5, '#45392d');
      twigs.push(tw);
      // side shoots
      for (let s = 0; s < 2; s++) {
        const at = tw[4 + Math.floor(rand() * (tw.length - 5))];
        twigs.push(twig(at[0], at[1], at[2] + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.4), T * (0.12 + rand() * 0.12), (rand() - 0.5) * 0.6, 2.5, '#4a3d30', 6));
      }
    }
    for (const pass of [0, 1]) {
      for (const tw of twigs) {
        for (let i = 1; i < tw.length; i++) {
          const [px, py, pa] = tw[i];
          for (let k = 0; k < (pass ? 3 : 4); k++) {
            const a = pa + (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 1.2);
            const len = T * (0.026 + rand() * 0.022);
            const fresh = pass && rand() < 0.12;
            const l = pass ? 19 + rand() * 9 : 11 + rand() * 6;
            leaf(px + (rand() - 0.5) * 8, py + (rand() - 0.5) * 8, a, len, len * (0.42 + rand() * 0.12), fresh ? 76 + rand() * 8 : 92 + rand() * 16, fresh ? 44 : 34 + rand() * 10, fresh ? l + 10 : l);
          }
        }
      }
    }
  });

  // ---- olive: many thin twigs of narrow leaves, grey-green above, silver below
  inTile('olive', (x0, y0) => {
    const twigs: [number, number, number][][] = [];
    for (let t = 0; t < 9; t++) {
      const a = -Math.PI / 2 + (t - 4) * 0.3 + (rand() - 0.5) * 0.25;
      const tw = twig(x0 + T * (0.5 + (rand() - 0.5) * 0.1), y0 + T * 0.96, a, T * (0.4 + rand() * 0.3), (rand() - 0.5) * 0.7, 3.2, '#6b6253');
      twigs.push(tw);
      const at = tw[5 + Math.floor(rand() * (tw.length - 6))];
      twigs.push(twig(at[0], at[1], at[2] + (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 0.3), T * (0.14 + rand() * 0.1), (rand() - 0.5) * 0.5, 2, '#6f6657', 6));
    }
    for (const tw of twigs) {
      for (let i = 2; i < tw.length; i++) {
        const [px, py, pa] = tw[i];
        for (let k = 0; k < 3; k++) {
          const a = pa + (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.55);
          const len = T * (0.055 + rand() * 0.035);
          const under = rand() < 0.3 ? 1 : 0;
          leaf(px, py, a, len, len * (0.12 + rand() * 0.04), 76 + rand() * 14, under ? 9 + rand() * 6 : 16 + rand() * 8, under ? 40 + rand() * 8 : 25 + rand() * 8, under);
        }
      }
    }
  });

  // ---- maquis (lentisk): a dense mass of short twigs of small paired leaflets
  inTile('shrub', (x0, y0) => {
    for (let t = 0; t < 16; t++) {
      const a = -Math.PI / 2 + (t - 7.5) * 0.19 + (rand() - 0.5) * 0.3;
      const tw = twig(x0 + T * (0.5 + (rand() - 0.5) * 0.3), y0 + T * 0.97, a, T * (0.36 + rand() * 0.4), (rand() - 0.5) * 0.6, 3, '#4a3f30');
      for (let i = 1; i < tw.length; i++) {
        const [px, py, pa] = tw[i];
        for (const side of [-1, 1]) {
          for (let k = 0; k < 2; k++) {
            const len = T * (0.03 + rand() * 0.02);
            leaf(px + (rand() - 0.5) * 10, py + (rand() - 0.5) * 10, pa + side * (0.7 + rand() * 0.7), len, len * 0.4, 82 + rand() * 18, 32 + rand() * 10, 13 + rand() * 13);
          }
        }
      }
    }
  });

  // ---- the colour under the transparent pixels: bled out from the leaves (blurred copies, opaque)
  const bleed = document.createElement('canvas');
  bleed.width = bleed.height = ATLAS;
  const bx = bleed.getContext('2d', { willReadFrequently: true })!;
  bx.fillStyle = '#3a4a26';
  bx.fillRect(0, 0, ATLAS, ATLAS);
  for (const r of [48, 24, 12, 6, 3]) {
    bx.filter = `blur(${r}px)`;
    bx.drawImage(leaves, 0, 0);
    bx.drawImage(leaves, 0, 0);
  }
  bx.filter = 'none';
  bx.drawImage(leaves, 0, 0);
  const rgb = bx.getImageData(0, 0, ATLAS, ATLAS).data;
  const a = ctx.getImageData(0, 0, ATLAS, ATLAS).data;
  const out = new Uint8Array(ATLAS * ATLAS * 4);
  // canvas row 0 is the top; texture row 0 (flipY false) is v = 0: flip rows so v grows upwards
  for (let row = 0; row < ATLAS; row++) {
    const src = row * ATLAS * 4;
    const dst = (ATLAS - 1 - row) * ATLAS * 4;
    for (let i = 0; i < ATLAS * 4; i += 4) {
      out[dst + i] = rgb[src + i];
      out[dst + i + 1] = rgb[src + i + 1];
      out[dst + i + 2] = rgb[src + i + 2];
      out[dst + i + 3] = a[src + i + 3];
    }
  }
  return out;
}

// ---------------------------------------------------------------- materials

/** Shared by every tree and shrub material: the sun, and device pixels per metre at 1 m (the level of detail). */
export const TREE_UNIFORMS = {
  uLodK: { value: 1000 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
};

/**
 * Level of detail from the instance's size on screen: its crown radius in device
 * pixels (r · uLodK / distance). 1 = full detail; 0 = the far look.
 */
const LOD_GLSL = (refR: number, lo: number, hi: number) => /* glsl */ `
  uniform float uLodK;
  float tnLod() {
    #ifdef USE_INSTANCING
      vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float rM = length(instanceMatrix[0].xyz) * ${S.toFixed(1)} * ${refR.toFixed(3)};
    #else
      vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float rM = ${refR.toFixed(3)};
    #endif
    float px = rM * uLodK / max(distance(c, cameraPosition) * ${S.toFixed(1)}, 1.0);
    return smoothstep(${lo.toFixed(1)}, ${hi.toFixed(1)}, px);
  }
`;

const NO_FLIP_NORMAL = THREE.ShaderChunk.normal_fragment_begin.replace(/normal\s*\*=\s*faceDirection;/g, '');

const HASH3 = /* glsl */ `
  float tnHash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float tnNoise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(tnHash3(i), tnHash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(tnHash3(i + vec3(0.0, 1.0, 0.0)), tnHash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(tnHash3(i + vec3(0.0, 0.0, 1.0)), tnHash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(tnHash3(i + vec3(0.0, 1.0, 1.0)), tnHash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
`;

/**
 * Leaf cards: the atlas with alpha to coverage (MSAA-smooth edges, no sorting),
 * coverage kept in the smaller mips (a far crown doesn't thin out), the crown's
 * normals on both faces, light through the leaves against the sun. Far away
 * each card shrinks into its cluster's centre.
 */
export function leafMaterial(atlas: THREE.Texture, refR: number, lod: [number, number], key: string) {
  const mat = new THREE.MeshStandardMaterial({
    map: atlas,
    vertexColors: true,
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    roughness: 0.93,
    metalness: 0,
  });
  mat.name = `leaves-${key}`;
  mat.customProgramCacheKey = () => `tn-leaves-${key}`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TREE_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', ['#include <common>', 'attribute vec3 aCard;', 'varying float vTnLod;', 'varying float vTnAo;', LOD_GLSL(refR, lod[0], lod[1])].join('\n'))
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vTnLod = tnLod();
        vTnAo = color.r;
        transformed = mix(aCard, transformed, vTnLod);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', ['#include <common>', 'uniform vec3 uSunDir;', 'varying float vTnLod;', 'varying float vTnAo;'].join('\n'))
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        {
          // keep the coverage of the smaller mips (after Golus, "anti-aliased alpha test")
          vec2 tsz = vec2(${ATLAS}.0);
          vec2 dx = dFdx(vMapUv * tsz);
          vec2 dy = dFdy(vMapUv * tsz);
          float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
          diffuseColor.a *= 1.0 + mip * 0.22;
          // a card seen edge-on is only a smear of a far mip: fade it out (its neighbours face the eye)
          vec3 gn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
          diffuseColor.a *= smoothstep(0.1, 0.32, abs(dot(gn, normalize(vViewPosition))));
        }`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        /* glsl */ `${NO_FLIP_NORMAL}
        {
          // a crown's normal turned away from the eye (a leaf seen from below or behind) is bent back
          // towards it: grazing normals make the specular blow up into pale cards
          vec3 Vv = normalize(vViewPosition);
          normal = normalize(normal + Vv * max(0.0, 0.25 - dot(normal, Vv)));
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        {
          // the sun through the leaves seen against it, more at the crown's rim than in its depth
          vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          vec3 V = normalize(vViewPosition);
          float back = pow(clamp(dot(-V, L), 0.0, 1.0), 3.0);
          // the sun's own light through the leaves (thin leaves pass a good part of it, yellow-green): the
          // underside of a sunlit crown glows, and more so looking towards the sun; less deep in the crown
          #if NUM_DIR_LIGHTS > 0
            vec3 sunCol = directionalLights[0].color;
          #else
            vec3 sunCol = vec3(0.0);
          #endif
          float through = 0.2 * max(dot(-normal, L), 0.0) + 0.18 * back;
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(0.9, 1.0, 0.55) * sunCol * through * mix(0.3, 1.0, smoothstep(0.4, 1.0, vTnAo));
          // a little light scattered within the foliage: the shaded side is green, not black
          reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.05;
        }`,
      );
    addLight(shader, { soft: true });
  };
  return mat;
}

/** The crown centre's height of a kind's reference tree (the hull swells about it). */
export function coreCentreY(kind: Kind | 'shrub') {
  return kind === 'shrub' ? 0.42 : crownFrame(kind).cy;
}

/**
 * The inner hull, built at the crown's envelope: far away it is the crown (the leaf cards
 * have shrunk into it) and it casts the crown's shadow; close up it shrinks (to `near`
 * of the envelope): sky shows through a pine, an oak keeps a dark heart.
 */
export function coreMaterial(kind: Kind | 'shrub', refR: number, lod: [number, number], near: number) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const cy = coreCentreY(kind).toFixed(3);
  mat.name = `core-${kind}`;
  mat.customProgramCacheKey = () => `tn-core-${kind}`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TREE_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', ['#include <common>', 'varying vec3 vTnP;', 'varying float vTnLod;', LOD_GLSL(refR, lod[0], lod[1])].join('\n'))
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vTnLod = tnLod();
        vTnP = position;
        {
          vec3 c = vec3(0.0, ${cy}, 0.0);
          transformed = c + (transformed - c) * mix(1.0, ${near.toFixed(3)}, vTnLod);
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', ['#include <common>', 'varying vec3 vTnP;', 'varying float vTnLod;', HASH3].join('\n'))
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          // clumps and gaps of foliage on the hull, finer close up
          float n = tnNoise3(vTnP * 2.4) * 0.6 + tnNoise3(vTnP * 6.1 + 3.1) * 0.4;
          diffuseColor.rgb *= mix(0.62, 1.16, smoothstep(0.25, 0.8, n)) * mix(0.6, 1.0, 1.0 - vTnLod);
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.05;`,
      );
    addLight(shader);
  };
  return mat;
}

/** Bark: the kind's scan, its relief as a normal map, darker in the crown and at the foot. Far away the limbs fold into the trunk. */
export function woodMaterial(albedo: THREE.Texture, normal: THREE.Texture, refR: number, lod: [number, number], key: string, tint: THREE.ColorRepresentation, saturation: number) {
  const mat = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, normalScale: new THREE.Vector2(2, 2), color: tint, roughness: 0.95, metalness: 0 });
  mat.name = `wood-${key}`;
  mat.customProgramCacheKey = () => `tn-wood-${key}`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TREE_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', ['#include <common>', 'attribute vec2 aWood;', 'varying float vTnAo;', LOD_GLSL(refR, lod[0], lod[1])].join('\n'))
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vTnAo = aWood.x;
        // far away only the trunk is drawn (a limb is under a pixel and hidden by the crown)
        if (aWood.y < 0.5 && tnLod() < 0.02) transformed = vec3(0.0);`,
      );
    // the packed normal (RG; B holds the scan's height): z rebuilt from x and y
    shader.fragmentShader = '#define USE_PACKED_NORMALMAP\n' + shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTnAo;').replace(
        '#include <color_fragment>',
        // the scans are of other, redder barks: greyed towards these trees' own
        `#include <color_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, ${saturation.toFixed(2)}) * vTnAo;`,
      );
    addLight(shader);
  };
  return mat;
}
