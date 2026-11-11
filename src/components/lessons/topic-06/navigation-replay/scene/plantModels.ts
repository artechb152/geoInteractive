/**
 * The scanned plants and rocks as the instance fields need them: plants.glb's
 * nodes `<variant>_<lod>_<leaf|wood>` and rocks.glb's `rock_<k>_<lod>`, with
 * what the scans lack for a live scene added on load (so it can be tuned
 * without rebuilding the files):
 *
 *   occlusion  a vertex colour per point: darker low in the plant and towards
 *              the core of the crown (where light hardly gets in), lighter at
 *              the outer tips; a grass blade dark at its root
 *   normals    a leaf card's own normal points anywhere; bent towards the
 *              crown's dome, the cards of one shrub shade as one soft mass,
 *              lit on the sun's side, in shade on the other
 */
import { BufferAttribute, BufferGeometry, Mesh, Object3D, Vector3 } from 'three';

export type PlantPart = 'leaf' | 'wood';
export type PlantKey = `${string}_${'lod0' | 'lod1'}_${PlantPart}`;

export type PlantGeometries = Map<string, BufferGeometry>;

/** Collect the meshes of a glTF scene by node name (the exporter may add a suffix to a repeated mesh name). */
export function meshesByName(root: Object3D): Map<string, BufferGeometry> {
  const out = new Map<string, BufferGeometry>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    m.updateWorldMatrix(true, false);
    g.applyMatrix4(m.matrixWorld);
    out.set(m.name.replace(/\.\d+$/, ''), g);
  });
  return out;
}

type Kind = 'shrub' | 'dwarf' | 'grass' | 'tree';

/** A tree's crown in its model: radius (x/z), bottom and top (y), and the model's height. */
export type CrownFrame = { radius: number; bottom: number; top: number; height: number };

/**
 * Occlusion and dome normals for one plant variant — both of its parts share
 * one frame (the bounds of leaves and wood together; for a tree, the crown's
 * own bounds, with the foot of the trunk at the origin).
 */
export function preparePlant(kind: Kind, leaf: BufferGeometry | undefined, wood: BufferGeometry | undefined): CrownFrame {
  const parts = [leaf, wood].filter(Boolean) as BufferGeometry[];
  const box = (gs: BufferGeometry[]) => {
    const lo = new Vector3(Infinity, Infinity, Infinity);
    const hi = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const g of gs) {
      g.computeBoundingBox();
      lo.min(g.boundingBox!.min);
      hi.max(g.boundingBox!.max);
    }
    return { lo, hi };
  };
  // the meshes were exported with their viewer spacing: back to the origin, base at y = 0 — a tree
  // on the foot of its trunk (the wood's lowest tenth), a shrub on the middle of its footprint
  const all = box(parts);
  let cx = (all.lo.x + all.hi.x) / 2;
  let cz = (all.lo.z + all.hi.z) / 2;
  if (kind === 'tree' && wood) {
    const pos = wood.getAttribute('position') as BufferAttribute;
    const yMax = all.lo.y + (all.hi.y - all.lo.y) * 0.1;
    let sx = 0, sz = 0, k = 0;
    for (let i = 0; i < pos.count; i++)
      if (pos.getY(i) < yMax) {
        sx += pos.getX(i);
        sz += pos.getZ(i);
        k++;
      }
    if (k) {
      cx = sx / k;
      cz = sz / k;
    }
  }
  for (const g of parts) g.translate(-cx, -all.lo.y, -cz);
  const whole = box(parts);
  // the frame occlusion and normals are measured in: the crown of a tree, the whole of a shrub
  const f = kind === 'tree' && leaf ? box([leaf]) : whole;
  const y0 = kind === 'tree' ? f.lo.y : 0;
  const h = Math.max(1e-3, f.hi.y - y0);
  const rx = Math.max(1e-3, (f.hi.x - f.lo.x) / 2);
  const rz = Math.max(1e-3, (f.hi.z - f.lo.z) / 2);
  const ox = (f.lo.x + f.hi.x) / 2;
  const oz = (f.lo.z + f.hi.z) / 2;
  const p = new Vector3();
  const n = new Vector3();
  const d = new Vector3();
  for (const g of parts) {
    const isLeaf = g === leaf;
    const pos = g.getAttribute('position') as BufferAttribute;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const nor = g.getAttribute('normal') as BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      const up = Math.min(1, Math.max(0, (p.y - y0) / h));
      const qx = (p.x - ox) / rx;
      const qz = (p.z - oz) / rz;
      let ao: number;
      if (kind === 'grass') ao = 0.32 + 0.68 * Math.pow(up, 0.55);
      else {
        const radial = Math.min(1.2, Math.hypot(qx, (up - 0.55) / 0.55, qz));
        ao = isLeaf ? 0.5 + 0.26 * up + 0.3 * radial : kind === 'tree' ? (p.y < y0 ? 0.88 - 0.25 * Math.max(0, 1 - p.y / 0.4) : 0.62) : 0.45 + 0.4 * up;
        // wood inside a crown is in its shade
        if (!isLeaf && kind === 'shrub') ao *= 0.72;
        ao = Math.min(1, Math.max(kind === 'tree' ? 0.55 : 0.4, ao));
      }
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
      if (isLeaf) {
        n.fromBufferAttribute(nor, i);
        if (kind === 'grass') d.set(qx * 0.45, 1, qz * 0.45).normalize();
        else d.set(qx, (up - 0.35) / 0.65, qz).normalize();
        if (n.dot(d) < 0) n.negate();
        const k = kind === 'grass' ? 0.55 : 0.72;
        n.multiplyScalar(1 - k).addScaledVector(d, k).normalize();
        nor.setXYZ(i, n.x, n.y, n.z);
      }
    }
    nor.needsUpdate = true;
    g.setAttribute('color', new BufferAttribute(col, 3));
    g.computeBoundingSphere();
  }
  // a tree's crown radius: where most of its leaves end (85 %), not its farthest stray twig — the
  // model is fitted to the map's crown by this, so a stray outlier would shrink the whole crown
  let radius = Math.max(rx, rz);
  if (kind === 'tree' && leaf) {
    const pos = leaf.getAttribute('position') as BufferAttribute;
    const r: number[] = [];
    for (let i = 0; i < pos.count; i += 3) r.push(Math.hypot(pos.getX(i), pos.getZ(i)));
    r.sort((a, b) => a - b);
    radius = r[Math.floor(r.length * 0.85)] ?? radius;
  }
  return { radius, bottom: f.lo.y, top: f.hi.y, height: whole.hi.y };
}

/** A rock's geometry: back at the origin (the exporter spaced them out), base at y = 0, 1 m across. */
export function prepareRock(g: BufferGeometry) {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeBoundingSphere();
  return { height: b.max.y - b.min.y };
}
