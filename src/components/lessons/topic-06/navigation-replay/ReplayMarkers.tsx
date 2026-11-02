'use client';
/**
 * The check's presence in the live view:
 *   Picker   turns a click (normalised device coordinates) into what the eye
 *            looked at — the ground hit by ray-marching the world's own
 *            terrain, and the first tree crown on the way — for replayCheck to
 *            recognise as a sign;
 *   Markers  labels on the signs the learner identified, and the guided
 *            opening's pulsing pointer on the sign to find.
 * Labels are drei <Html> with an LTR wrapper and RTL text (an RTL wrapper
 * lands them one label-width off their point).
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from 'three';
import type { StationTerrain } from './replayTerrain';
import { replayTrees } from './replayLandmarks';
import type { ViewPick } from './replayCheck';

export type PickFn = (ndcX: number, ndcY: number) => ViewPick | null;
export type ViewMarker = { id: string; at: { x: number; z: number }; label: string; tone: 'picked' | 'hint'; lift?: number };

const CROWNS = replayTrees().map((t) => ({
  x: t.x,
  z: t.z,
  y: t.crown.centerM,
  r: Math.max(t.crown.radiusM, t.crown.halfHeightM) * 0.92,
  kind: t.kind as 'oak' | 'pine' | 'olive',
}));

export function Picker({ terrain, pickRef }: { terrain: StationTerrain; pickRef: MutableRefObject<PickFn | null> }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useEffect(() => {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const fn: PickFn = (nx, ny) => {
      ndc.set(nx, ny);
      camera.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      const below = (t: number) => o.y + d.y * t < terrain.height(o.x + d.x * t, o.z + d.z * t);
      // march with a step that grows with distance, then bisect the crossing
      let t0 = 0;
      let hitT: number | null = null;
      for (let t = 0.4; t < 4000; t += Math.max(0.4, t * 0.012)) {
        if (below(t)) {
          let a = t0;
          let b = t;
          for (let k = 0; k < 24; k++) {
            const m = (a + b) / 2;
            if (below(m)) b = m;
            else a = m;
          }
          hitT = b;
          break;
        }
        t0 = t;
      }
      // the first crown the ray enters before the ground
      let tree: ViewPick['tree'] = null;
      let treeT = hitT ?? Infinity;
      for (const c of CROWNS) {
        const ox = c.x - o.x;
        const oy = c.y - o.y;
        const oz = c.z - o.z;
        const tc = ox * d.x + oy * d.y + oz * d.z;
        if (tc < 0 || tc > treeT) continue;
        const d2 = ox * ox + oy * oy + oz * oz - tc * tc;
        if (d2 > c.r * c.r) continue;
        const tIn = tc - Math.sqrt(c.r * c.r - d2);
        if (tIn < treeT) {
          treeT = tIn;
          tree = c.kind;
        }
      }
      const hitAt = hitT === null ? null : { x: o.x + d.x * hitT, y: o.y + d.y * hitT, z: o.z + d.z * hitT };
      const treeAt = tree ? { x: o.x + d.x * treeT, y: o.y + d.y * treeT, z: o.z + d.z * treeT } : null;
      return { eye: { x: o.x, y: o.y, z: o.z }, dir: { x: d.x, y: d.y, z: d.z }, hit: treeAt ?? hitAt, tree };
    };
    pickRef.current = fn;
    // QA: where a world point (x, z, metres above the ground) falls in the view, in NDC
    const qa = window as unknown as { __replayProject?: (x: number, z: number, lift?: number) => { x: number; y: number; front: boolean } };
    const project = (x: number, z: number, lift = 0) => {
      const v = new Vector3(x, terrain.height(x, z) + lift, z);
      camera.updateMatrixWorld();
      const front = v.clone().applyMatrix4(camera.matrixWorldInverse).z < 0;
      v.project(camera);
      return { x: v.x, y: v.y, front };
    };
    qa.__replayProject = project;
    return () => {
      if (pickRef.current === fn) pickRef.current = null;
      if (qa.__replayProject === project) delete qa.__replayProject;
    };
  }, [camera, terrain, pickRef]);
  return null;
}

export function Markers({ markers, terrain, reduce }: { markers: ViewMarker[]; terrain: StationTerrain; reduce: boolean }) {
  return (
    <>
      {markers.map((m) => (
        <Marker key={m.id} m={m} y={terrain.height(m.at.x, m.at.z) + (m.lift ?? 0)} reduce={reduce} />
      ))}
    </>
  );
}

function Marker({ m, y, reduce }: { m: ViewMarker; y: number; reduce: boolean }) {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const pos = useMemo(() => new Vector3(m.at.x, y, m.at.z), [m.at.x, m.at.z, y]);
  // the hint pulses (the canvas draws on demand, so it asks for its frames while shown)
  useFrame(() => {
    if (m.tone === 'hint' && !reduce) invalidate();
  });
  return (
    <group ref={group} position={pos}>
      <Html center zIndexRange={[15, 10]} wrapperClass="[direction:ltr] pointer-events-none" style={{ pointerEvents: 'none' }}>
        {m.tone === 'hint' ? (
          <div className="flex -translate-y-1/2 flex-col items-center" data-view-marker="hint" data-marker-id={m.id}>
            <span dir="rtl" className="mb-1 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 font-display text-sm font-bold text-white shadow-md">
              {m.label}
            </span>
            <span className={reduce ? 'block size-5 rounded-full border-[3px] border-accent' : 'block size-5 animate-ping rounded-full border-[3px] border-accent'} />
          </div>
        ) : (
          <div className="flex -translate-y-1/2 flex-col items-center" data-view-marker="picked" data-marker-id={m.id}>
            <span dir="rtl" className="mb-1 whitespace-nowrap rounded-full border border-brand-dark/30 bg-white/95 px-2.5 py-0.5 font-display text-sm font-bold text-black shadow-md">
              ✓ {m.label}
            </span>
            <span className="block size-2.5 rounded-full border-2 border-white bg-brand-dark shadow" />
          </div>
        )}
      </Html>
    </group>
  );
}
