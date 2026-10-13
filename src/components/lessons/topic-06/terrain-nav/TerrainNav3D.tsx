'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useTexture } from '@react-three/drei';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STREAM, WATER_TOWER, WORLD_BOUNDS, type Point } from './terrainNavScenario';
import { WORLD3D, bearing, fromWorld3, toWorld3, verticalFov } from './terrainNavGeometry';
import {
  boulders,
  groundStones,
  groundTufts,
  crownShape,
  heightAt,

  houses,
  insideSheet,

  rng,
  shrubs,
  trees,
  waterCourses,

  type Tree,
} from './terrainNavTerrain';
import { FEATURE_INDEX, buildFeatureIdTexture, buildGroundMasks, createGroundMaterial } from './terrainNavMaterials';
import { createSkyMaterial } from '../locationCheckMaterials';
import type { FeatureId } from './terrainNavPractice';
import type { ViewStore } from './terrainNavViewStore';
import { WATER } from './TerrainNavMap';
import { terrainMeshArrays } from './terrainNavMesh';

/**
 * The live terrain model. Everything it shows comes from terrainNavTerrain:
 *
 *   terrain  the 5 m sheet grid with its SW–NE triangles, unexaggerated
 *            (WORLD3D.verticalExaggeration = 1), plus an apron of the same
 *            generator out to the hazy horizon.
 *   cover    every tree, house, shrub and boulder of the shared lists as
 *            instances at their heightAt() positions; roads, water beds,
 *            fields, yards and the square painted by the ground shader from
 *            masks drawn with the same centre-lines and polygons as the map.
 *   water    a ribbon on the stream's centre-line, just above the mesh.
 *
 * Two cameras: orbit (learn) and the navigator's eye (practice), both driven by
 * the view store. A click (learn) is resolved by marching the pointer ray over
 * heightAt() — the drawn surface — and handed up as a ground point.
 *
 * Frames render on demand; the shadow map is drawn once (the world is static).
 * Rendered client-only via next/dynamic.
 */

const S = WORLD3D.metresPerUnit;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const TEX = `${BASE}/assets/lessons/topic06/location-check/textures`;
const TEXTURE_URLS = {
  grassD: `${TEX}/grass_diff.jpg`,
  grassN: `${TEX}/grass_nor.jpg`,
  dryD: `${TEX}/dry_diff.jpg`,
  dryN: `${TEX}/dry_nor.jpg`,
  rockD: `${TEX}/rock_diff.jpg`,
  rockN: `${TEX}/rock_nor.jpg`,
  forestD: `${TEX}/forest_diff.jpg`,
};

/** Learn-mode opening view: from the south, looking north (north up the screen, like the map). */
const SHEET_CENTER = { E: 760, N: 850 };
export const HOME_VIEW = { targetHeightM: 360, distanceM: 1720, polarDeg: 57, azimuthDeg: 0 } as const;

export type ModelLabel = { readonly id: string; readonly text: string; readonly at: Point; readonly liftM: number; readonly tone: 'route' | 'feature' | 'start' };

export type ModelProps = {
  view: ViewStore;
  reduce: boolean;
  highlights: readonly FeatureId[];
  /** Route drawn on the ground: the plan (learn, dashed) or the legs walked (practice, solid). */
  route: { readonly pts: readonly Point[]; readonly dashed: boolean } | null;
  labels: readonly ModelLabel[];
  /** 3D pins at these ground points (A, checkpoints shown). */
  pins: readonly { readonly id: string; readonly at: Point; readonly tone: 'start' | 'checkpoint' }[];
  onPick?: (p: Point) => void;
  onReady?: () => void;
  /**
   * CSS scale of the model on screen (the laptop fit of CombatNavScene; 1 when
   * not shrunk or in full screen). OrbitControls reads drag deltas in screen px
   * but divides by the untransformed size, so its speeds are compensated.
   */
  pointerScale?: number;
};

// ---------------------------------------------------------------- camera

const tmpV = new THREE.Vector3();

function CameraRig({ view, reduce }: { view: ViewStore; reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; enabled: boolean; update: () => void } | null;
  const lastCommand = useRef(0);
  const lastMode = useRef<'orbit' | 'eye'>('orbit');
  const orbitSaved = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const tween = useRef<{ fromPos: THREE.Vector3; fromT: THREE.Vector3; toPos: THREE.Vector3; toT: THREE.Vector3; t0: number; ms: number } | null>(null);
  const eyeCur = useRef({ yawDeg: 0, pitchDeg: -4, hfovDeg: 64 });

  useEffect(() => view.subscribe(() => invalidate()), [view, invalidate]);
  useEffect(() => invalidate(), [size.width, size.height, invalidate]);

  // Dev-only probe for scripts/qa/shot-terrain-nav.mjs: the canvas' own projection of a ground point.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __tnProbe?: (E: number, N: number, h: number) => [number, number, boolean] };
    const v = new THREE.Vector3();
    w.__tnProbe = (E, N, h) => {
      v.set(...toWorld3(E, N, h)).project(camera);
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height, v.z < 1];
    };
    return () => {
      delete w.__tnProbe;
    };
  }, [camera, size.width, size.height]);

  const orbitGoal = (kind: 'home' | 'top' | 'focus', at?: Point) => {
    const t = new THREE.Vector3(...toWorld3(at?.E ?? SHEET_CENTER.E, at?.N ?? SHEET_CENTER.N, at ? heightAt(at.E, at.N) : HOME_VIEW.targetHeightM));
    const polar = THREE.MathUtils.degToRad(kind === 'top' ? 0.6 : HOME_VIEW.polarDeg);
    const az = THREE.MathUtils.degToRad(HOME_VIEW.azimuthDeg);
    const r = (kind === 'focus' ? 750 : kind === 'top' ? 2350 : HOME_VIEW.distanceM) / S;
    const pos = new THREE.Vector3(t.x + r * Math.sin(polar) * Math.sin(az), t.y + r * Math.cos(polar), t.z + r * Math.sin(polar) * Math.cos(az));
    return { pos, target: t };
  };

  useFrame((_, dt) => {
    const st = view.get();
    const aspect = size.width / Math.max(1, size.height);
    camera.aspect = aspect;

    if (st.mode === 'orbit') {
      if (lastMode.current === 'eye') {
        // back from practice: restore the orbit view as it was (a cut)
        if (orbitSaved.current && controls) {
          camera.position.copy(orbitSaved.current.pos);
          controls.target.copy(orbitSaved.current.target);
        }
        camera.fov = 40;
        lastMode.current = 'orbit';
      }
      if (controls) controls.enabled = true;
      camera.near = 5 / S;
      camera.far = 30000 / S;
      const cmd = st.orbitCommand;
      if (cmd && cmd.seq !== lastCommand.current && controls) {
        lastCommand.current = cmd.seq;
        if (cmd.kind === 'zoom-in' || cmd.kind === 'zoom-out') {
          const k = cmd.kind === 'zoom-in' ? 0.72 : 1 / 0.72;
          const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
          const len = THREE.MathUtils.clamp(off.length(), 300 / S, 3600 / S);
          off.setLength(len);
          tween.current = { fromPos: camera.position.clone(), fromT: controls.target.clone(), toPos: controls.target.clone().add(off), toT: controls.target.clone(), t0: performance.now(), ms: reduce ? 0 : 380 };
        } else {
          const g = orbitGoal(cmd.kind, cmd.at);
          tween.current = { fromPos: camera.position.clone(), fromT: controls.target.clone(), toPos: g.pos, toT: g.target, t0: performance.now(), ms: reduce ? 0 : 650 };
        }
      }
      if (tween.current && controls) {
        const tw = tween.current;
        const k = tw.ms === 0 ? 1 : Math.min(1, (performance.now() - tw.t0) / tw.ms);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
        controls.target.lerpVectors(tw.fromT, tw.toT, e);
        controls.update();
        if (k >= 1) tween.current = null;
        else invalidate();
      }
      if (controls) {
        // keep the target on the sheet and the camera above the ground
        const t = controls.target;
        const g = fromWorld3(t.x, t.y, t.z);
        const E = THREE.MathUtils.clamp(g.E, WORLD_BOUNDS.minE, WORLD_BOUNDS.maxE);
        const N = THREE.MathUtils.clamp(g.N, WORLD_BOUNDS.minN, WORLD_BOUNDS.maxN);
        if (E !== g.E || N !== g.N) {
          const [x, , z] = toWorld3(E, N, 0);
          camera.position.x += x - t.x;
          camera.position.z += z - t.z;
          t.x = x;
          t.z = z;
        }
        const c = fromWorld3(camera.position.x, camera.position.y, camera.position.z);
        const floor = heightAt(c.E, c.N) + 40;
        if (c.heightM < floor) camera.position.y = (floor - WORLD3D.datumM) / S;
        orbitSaved.current = { pos: camera.position.clone(), target: t.clone() };
      }
      camera.updateProjectionMatrix();
      const dir = camera.getWorldDirection(tmpV);
      const top = dir.y < -0.985;
      const yaw = top ? 0 : (Math.atan2(dir.x, -dir.z) * 180) / Math.PI;
      view.publishLive(yaw, top);
      return;
    }

    // ---- the navigator's eye
    if (lastMode.current === 'orbit') {
      lastMode.current = 'eye';
      tween.current = null;
      eyeCur.current = { ...st.look };
    }
    if (controls) controls.enabled = false;
    if (!st.eyeAt) return;
    const target = st.look;
    const c = eyeCur.current;
    const k = reduce ? 1 : 1 - Math.exp(-12 * Math.min(dt, 0.1));
    const dYaw = ((((target.yawDeg - c.yawDeg) % 360) + 540) % 360) - 180;
    let pos: Point = st.eyeAt;
    let yaw = c.yawDeg + dYaw * k;
    let walking = false;
    if (st.walk) {
      const w = st.walk;
      const p = Math.min(1, (performance.now() - w.startedAt) / w.durationMs);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      // position along the path by arc length
      const lens = w.path.slice(1).map((q, i) => Math.hypot(q.E - w.path[i].E, q.N - w.path[i].N));
      const total = lens.reduce((a, b) => a + b, 0);
      let s = e * total;
      let i = 0;
      while (i < lens.length - 1 && s > lens[i]) s -= lens[i++];
      const a = w.path[i];
      const b = w.path[i + 1] ?? a;
      const f = lens[i] ? Math.min(1, s / lens[i]) : 1;
      pos = { E: a.E + (b.E - a.E) * f, N: a.N + (b.N - a.N) * f };
      const walkYaw = bearing(a, b) ?? target.yawDeg;
      yaw = p < 0.85 ? walkYaw : walkYaw + ((((target.yawDeg - walkYaw) % 360) + 540) % 360 - 180) * ((p - 0.85) / 0.15);
      walking = p < 1;
      if (!walking) view.endWalk();
    }
    c.yawDeg = walking ? yaw : yaw;
    c.pitchDeg += (target.pitchDeg - c.pitchDeg) * k;
    c.hfovDeg += (target.hfovDeg - c.hfovDeg) * k;
    const settled = !walking && Math.abs(dYaw) < 0.02 && Math.abs(target.pitchDeg - c.pitchDeg) < 0.02 && Math.abs(target.hfovDeg - c.hfovDeg) < 0.02;
    if (settled) Object.assign(c, target);
    camera.position.set(...toWorld3(pos.E, pos.N, heightAt(pos.E, pos.N) + 1.7));
    camera.rotation.set(THREE.MathUtils.degToRad(c.pitchDeg), -THREE.MathUtils.degToRad(c.yawDeg), 0, 'YXZ');
    camera.fov = verticalFov(c.hfovDeg, aspect);
    camera.near = 0.3 / S;
    camera.far = 30000 / S;
    camera.updateProjectionMatrix();
    view.publishLive(c.yawDeg, false);
    if (!settled) invalidate();
  });
  return null;
}

/** A click (not a drag) on the canvas → the ground point under it, by marching the ray over heightAt(). */
function Picker({ onPick }: { onPick?: (p: Point) => void }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!onPick) return;
    const el = gl.domElement;
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || performance.now() - down.t > 600) return;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      const stepU = 2 / S;
      let prev = 0;
      for (let t = stepU; t < 40000 / S; t += stepU * (1 + t * 0.6)) {
        const p = fromWorld3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
        if (p.heightM <= heightAt(p.E, p.N)) {
          // bisect between prev and t
          let lo = prev;
          let hi = t;
          for (let k = 0; k < 24; k++) {
            const m = (lo + hi) / 2;
            const q = fromWorld3(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m);
            if (q.heightM <= heightAt(q.E, q.N)) hi = m;
            else lo = m;
          }
          const q = fromWorld3(o.x + d.x * hi, o.y + d.y * hi, o.z + d.z * hi);
          if (insideSheet(q.E, q.N)) onPick({ E: q.E, N: q.N });
          return;
        }
        prev = t;
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, onPick]);
  return null;
}

// ---------------------------------------------------------------- terrain

/** The sheet's 5 m grid samples and the apron, SW–NE triangles (terrainNavMesh — the arrays the tests check). */
function buildTerrainGeometry() {
  const { positions, index } = terrainMeshArrays();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function Terrain({ highlights }: { highlights: readonly FeatureId[] }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const tex = useTexture(TEXTURE_URLS);
  const geometry = useMemo(buildTerrainGeometry, []);
  const masks = useMemo(buildGroundMasks, []);
  const ids = useMemo(buildFeatureIdTexture, []);
  const { material, uniforms } = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    for (const [key, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = key.endsWith('D') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }
    for (const m of Object.values(masks)) {
      m.anisotropy = aniso;
      m.needsUpdate = true;
    }
    return createGroundMaterial(tex, masks, ids);
  }, [tex, masks, ids, gl]);
  useEffect(() => {
    const v = highlights.map((h) => FEATURE_INDEX[h] ?? 0);
    uniforms.uHl.value.set(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    invalidate();
  }, [highlights, uniforms, invalidate]);
  useEffect(
    () => () => {
      geometry.dispose();
      Object.values(masks).forEach((m) => m.dispose());
      ids.dispose();
      material.dispose();
    },
    [geometry, masks, ids, material],
  );
  return <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- water

function Stream() {
  const geo = useMemo(() => {
    const pts = waterCourses().stream.pts;
    const half = STREAM.waterWidthM / 2;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)];
      const b = pts[Math.min(pts.length - 1, k + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len;
      const ny = (b[0] - a[0]) / len;
      const [E, N] = pts[k];
      // a level surface across the channel, just above the drawn mesh
      const h = Math.max(heightAt(E, N), heightAt(E + nx * half, N + ny * half), heightAt(E - nx * half, N - ny * half)) + 0.18;
      pos.push(...toWorld3(E + nx * half, N + ny * half, h), ...toWorld3(E - nx * half, N - ny * half, h));
      if (k) {
        const o = (k - 1) * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(WATER.line).lerp(new THREE.Color(WATER.fill), 0.35), roughness: 0.18, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} receiveShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- vegetation

/**
 * Lumpy geometry from overlapping lobes, jittered once with a fixed seed;
 * normals blend each lobe's own with the clump's spherical normal so the
 * clumps read in the light without faceting; a baked occlusion darkens the
 * underside and the inside.
 */
function clumpGeometry(seed: number, lobes: [number, number, number, number][], detail: number, jitter: number) {
  const rand = rng(seed);
  const parts = lobes.map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, detail).translate(x, y, z));
  const geo = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  const pos = geo.getAttribute('position');
  const own = geo.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);
  const nrm = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const s = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(own, i);
    v.addScaledVector(n, (rand() - 0.5) * jitter);
    pos.setXYZ(i, v.x, v.y, v.z);
    s.copy(v).normalize();
    n.lerp(s, 0.55).normalize();
    nrm.set([n.x, n.y, n.z], i * 3);
    const radial = THREE.MathUtils.smoothstep(v.length(), 0.35, 0.95);
    const ao = THREE.MathUtils.lerp(0.4, 1, THREE.MathUtils.smoothstep(v.y, -0.9, 0.75)) * THREE.MathUtils.lerp(0.7, 1, radial) * (0.82 + rand() * 0.18);
    colors.set([ao, ao, ao], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

function crownGeometry(seed: number, lobeCount: number, spread: number) {
  const rand = rng(seed);
  const lobes: [number, number, number, number][] = [[0, 0, 0, 0.7]];
  for (let k = 0; k < lobeCount; k++) {
    const a = rand() * Math.PI * 2;
    const y = (rand() - 0.4) * 0.9;
    const r = 0.36 + rand() * 0.2;
    lobes.push([Math.cos(a) * spread, y * 0.6, Math.sin(a) * spread, r]);
  }
  return clumpGeometry(seed ^ 0x2f1ac81d, lobes, 2, 0.08);
}

const CROWN: Record<Tree['kind'], [THREE.Color, THREE.Color]> = {
  pine: [new THREE.Color('#2A3A1A'), new THREE.Color('#3C4F24')],
  oak: [new THREE.Color('#3A4D20'), new THREE.Color('#596A2E')],
  olive: [new THREE.Color('#5E6A48'), new THREE.Color('#7D8662')],
};
const ACCENT = new THREE.Color('#D97E2B');
const UP = new THREE.Vector3(0, 1, 0);

/** Fills an instanced mesh; refilled when `deps` change (the highlight). */
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, count: number, fill: (i: number, m: THREE.Matrix4, c: THREE.Color) => void, deps: readonly unknown[]) {
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      fill(i, m, c);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, count, invalidate, ...deps]);
}

function TreeKind({ kind, highlights }: { kind: Tree['kind']; highlights: readonly FeatureId[] }) {
  const list = useMemo(() => trees().filter((t) => t.kind === kind), [kind]);
  const crown = useMemo(() => (kind === 'pine' ? crownGeometry(0x9b05688c, 10, 0.55) : kind === 'oak' ? crownGeometry(0x1f83d9ab, 9, 0.6) : crownGeometry(0x5be0cd19, 7, 0.62)), [kind]);
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.6, 1, 1, 6).translate(0, 0.5, 0), []);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), []);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A3E30', roughness: 1, metalness: 0 }), []);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      crown.dispose();
      trunk.dispose();
      crownMat.dispose();
      trunkMat.dispose();
    },
    [crown, trunk, crownMat, trunkMat],
  );
  const q = useMemo(() => new THREE.Quaternion(), []);
  const lit = highlights.join(',');
  useInstances(
    crownRef,
    list.length,
    (i, m, c) => {
      const t = list[i];
      const cs = crownShape(t);
      q.setFromAxisAngle(UP, t.spin);
      m.compose(new THREE.Vector3(...toWorld3(cs.E, cs.N, cs.centerM)), q, new THREE.Vector3(cs.radiusM / S, cs.halfHeightM / S, cs.radiusM / S));
      c.copy(CROWN[kind][0]).lerp(CROWN[kind][1], t.tone);
      if (highlights.includes(t.group as FeatureId)) c.lerp(ACCENT, 0.45);
    },
    [lit],
  );
  useInstances(
    trunkRef,
    list.length,
    (i, m, c) => {
      const t = list[i];
      const cs = crownShape(t);
      const r = 0.22 + t.crownR * 0.03;
      q.setFromAxisAngle(UP, t.spin);
      m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.4)), q, new THREE.Vector3(r / S, (cs.centerM - t.baseM + 0.4) / S, r / S));
      c.set('#FFFFFF');
    },
    [],
  );
  return (
    <group>
      <instancedMesh ref={crownRef} args={[crown, crownMat, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={trunkRef} args={[trunk, trunkMat, list.length]} castShadow raycast={() => null} />
    </group>
  );
}

function Scrub() {
  const list = useMemo(() => shrubs(), []);
  const geo = useMemo(() => clumpGeometry(0x510e527f, [[0, 0.1, 0, 0.75], [0.45, 0, 0.15, 0.55], [-0.35, -0.02, -0.3, 0.6]], 1, 0.12).scale(1, 0.75, 1).translate(0, 0.42, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#3F4A22'), []);
  const B = useMemo(() => new THREE.Color('#6E6F3F'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - 0.12)), q, new THREE.Vector3(s.radiusM / S, s.heightM / S, s.radiusM / S));
      c.copy(A).lerp(B, s.tone);
    },
    [],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

function Boulders() {
  const list = useMemo(() => boulders(), []);
  const geo = useMemo(() => clumpGeometry(0x1b2c3d4e, [[0, 0, 0, 1], [0.35, -0.1, 0.2, 0.7]], 1, 0.22).scale(1, 0.6, 0.85), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#9E9684'), []);
  const B = useMemo(() => new THREE.Color('#CFC6AF'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM + s.sizeM * 0.1)), q, new THREE.Vector3(s.sizeM / S, s.sizeM / S, s.sizeM / S));
      c.copy(A).lerp(B, s.tone);
    },
    [],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

/**
 * Dry grass blades fanning out of one point, unit height. Lit like the ground
 * (every normal points up) and emitted with both windings, so no blade turns
 * dark from behind.
 */
function tuftGeometry() {
  const rand = rng(0x7137449e);
  const pos: number[] = [];
  const col: number[] = [];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + rand() * 0.5;
    const lean = 0.18 + rand() * 0.4;
    const h = 0.55 + rand() * 0.45;
    const w = 0.07;
    const bx = Math.cos(a + Math.PI / 2) * w;
    const bz = Math.sin(a + Math.PI / 2) * w;
    const tx = Math.cos(a) * lean;
    const tz = Math.sin(a) * lean;
    pos.push(-bx, 0, -bz, bx, 0, bz, tx, h, tz, bx, 0, bz, -bx, 0, -bz, tx, h, tz);
    col.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 1.08, 1.08, 1.08, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 1.08, 1.08, 1.08);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

/** Foreground grass around the hilltops where the navigator stands (below the map's threshold). */
function Tufts() {
  const list = useMemo(() => groundTufts(), []);
  const geo = useMemo(tuftGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#7D7A45'), []);
  const B = useMemo(() => new THREE.Color('#B7A66B'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const t = list[i];
      q.setFromAxisAngle(UP, t.spin);
      m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.03)), q, new THREE.Vector3(t.heightM / S, t.heightM / S, t.heightM / S));
      c.copy(A).lerp(B, t.tone);
    },
    [],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} receiveShadow raycast={() => null} />;
}

/** Loose stones around the same hilltops: flattened, jittered lumps, half sunk into the ground. */
function Stones() {
  const list = useMemo(() => groundStones(), []);
  const geo = useMemo(() => clumpGeometry(0x2b3c4d5e, [[0, 0, 0, 1], [0.35, -0.1, 0.2, 0.7]], 1, 0.22).scale(1, 0.55, 0.85), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#A39B88'), []);
  const B = useMemo(() => new THREE.Color('#CFC6B0'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM + s.sizeM * 0.12)), q, new THREE.Vector3(s.sizeM / S, s.sizeM / S, s.sizeM / S));
      c.copy(A).lerp(B, s.tone);
    },
    [],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- village

/** Walls with a procedural window pattern (two floors of windows on the long and short faces). */
function wallMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHLocal;\nvarying vec3 vHSize;\nvarying vec3 vHNormal;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vHLocal = position;
        vHNormal = normal;
        #ifdef USE_INSTANCING
          vHSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)) * ${S.toFixed(1)};
        #else
          vHSize = vec3(1.0);
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHLocal;\nvarying vec3 vHSize;\nvarying vec3 vHNormal;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (abs(vHNormal.y) < 0.5) {
          float along = abs(vHNormal.x) > 0.5 ? (vHLocal.z + 0.5) * vHSize.z : (vHLocal.x + 0.5) * vHSize.x;
          float up = vHLocal.y * vHSize.y;
          float fromTop = vHSize.y - up;
          float wx = fract(along / 3.4);
          float floorY = mod(fromTop, 3.1);
          float win = step(0.32, wx) * step(wx, 0.68) * step(0.9, floorY) * step(floorY, 2.2) * step(1.2, fromTop) * step(fromTop, vHSize.y - 0.6);
          diffuseColor.rgb *= mix(1.0, 0.32, win);
        }`,
      );
  };
  return mat;
}

function Village({ highlights }: { highlights: readonly FeatureId[] }) {
  const list = useMemo(() => houses(), []);
  const flat = useMemo(() => list.map((h, i) => ({ h, i })).filter((x) => x.h.roof === 'flat'), [list]);
  const tiled = useMemo(() => list.map((h, i) => ({ h, i })).filter((x) => x.h.roof === 'tile'), [list]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const roofGeo = useMemo(() => {
    // a hip roof over a unit footprint, ridge along z
    const g = new THREE.BufferGeometry();
    const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, -0.22, 0, 1, 0.22];
    const idx = [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    g.dispose();
    return ng;
  }, []);
  const wallMat = useMemo(wallMaterial, []);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 }), []);
  const tileMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }), []);
  useEffect(
    () => () => {
      box.dispose();
      roofGeo.dispose();
      wallMat.dispose();
      capMat.dispose();
      tileMat.dispose();
    },
    [box, roofGeo, wallMat, capMat, tileMat],
  );
  const wallsRef = useRef<THREE.InstancedMesh>(null);
  const capsRef = useRef<THREE.InstancedMesh>(null);
  const tilesRef = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const WALL_A = useMemo(() => new THREE.Color('#D9CCAF'), []);
  const WALL_B = useMemo(() => new THREE.Color('#C3B391'), []);
  const lit = highlights.includes('village');
  const wallTop = (h: (typeof list)[number]) => h.floorM + h.floors * 3.2;
  useInstances(
    wallsRef,
    list.length,
    (i, m, c) => {
      const h = list[i];
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, h.baseM)), q, new THREE.Vector3(h.widM / S, (wallTop(h) - h.baseM) / S, h.lenM / S));
      c.copy(WALL_A).lerp(WALL_B, h.tone);
      if (lit) c.lerp(ACCENT, 0.5);
    },
    [lit],
  );
  useInstances(
    capsRef,
    flat.length,
    (i, m, c) => {
      const h = flat[i].h;
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, wallTop(h))), q, new THREE.Vector3((h.widM - 0.7) / S, 0.35 / S, (h.lenM - 0.7) / S));
      c.set(lit ? '#E0A066' : '#B2A992');
    },
    [lit],
  );
  useInstances(
    tilesRef,
    tiled.length,
    (i, m, c) => {
      const h = tiled[i].h;
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, wallTop(h))), q, new THREE.Vector3((h.widM + 0.6) / S, 2.6 / S, (h.lenM + 0.6) / S));
      c.set(lit ? '#D97E2B' : h.tone > 0.5 ? '#A5583A' : '#B4673F');
    },
    [lit],
  );
  return (
    <group>
      <instancedMesh ref={wallsRef} args={[box, wallMat, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={capsRef} args={[box, capMat, flat.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={tilesRef} args={[roofGeo, tileMat, tiled.length]} castShadow receiveShadow raycast={() => null} />
      <WaterTower lit={highlights.includes('tower')} />
    </group>
  );
}

function WaterTower({ lit }: { lit: boolean }) {
  const base = heightAt(WATER_TOWER.E, WATER_TOWER.N);
  const color = lit ? '#E0A066' : '#CFC8B8';
  return (
    <group position={toWorld3(WATER_TOWER.E, WATER_TOWER.N, base - 0.5)}>
      <mesh position={[0, 8.5 / S, 0]} castShadow receiveShadow raycast={() => null}>
        <cylinderGeometry args={[1.5 / S, 1.9 / S, 17 / S, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 19.5 / S, 0]} castShadow receiveShadow raycast={() => null}>
        <cylinderGeometry args={[4.6 / S, 4.2 / S, 5.5 / S, 20]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 23 / S, 0]} castShadow raycast={() => null}>
        <coneGeometry args={[4.8 / S, 1.8 / S, 20]} />
        <meshStandardMaterial color={lit ? '#D97E2B' : '#A9A293'} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- route, pins, labels

function RouteOnGround({ pts, dashed }: { pts: readonly Point[]; dashed: boolean }) {
  const points = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.E - a.E, b.N - a.N) / 4));
      for (let i = 0; i < n; i++) {
        const E = a.E + ((b.E - a.E) * i) / n;
        const N = a.N + ((b.N - a.N) * i) / n;
        out.push(toWorld3(E, N, heightAt(E, N) + 2.2));
      }
    }
    const z = pts[pts.length - 1];
    out.push(toWorld3(z.E, z.N, heightAt(z.E, z.N) + 2.2));
    return out;
  }, [pts]);
  if (points.length < 2) return null;
  return (
    <group>
      {/* a light casing, then the orange route drawn after it: an overlay, never a road */}
      <Line points={points} color="#FDFBF3" lineWidth={6.5} renderOrder={1} depthWrite={false} />
      <Line points={points} color="#D97E2B" lineWidth={4} dashed={dashed} dashSize={18 / S} gapSize={11 / S} renderOrder={2} />
    </group>
  );
}

function Pins({ pins }: { pins: ModelProps['pins'] }) {
  return (
    <group>
      {pins.map((p) => {
        const h = heightAt(p.at.E, p.at.N);
        return (
          <group key={p.id} position={toWorld3(p.at.E, p.at.N, h)}>
            <mesh position={[0, 15 / S, 0]} raycast={() => null}>
              <cylinderGeometry args={[1.1 / S, 1.1 / S, 30 / S, 8]} />
              <meshStandardMaterial color="#FDFBF3" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.6 / S, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <ringGeometry args={[7 / S, 10 / S, 32]} />
              <meshBasicMaterial color="#D97E2B" side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Labels({ labels }: { labels: readonly ModelLabel[] }) {
  return (
    <>
      {labels.map((l) => (
        // The wrapper is laid out left-to-right: in the RTL page its zero-width box would
        // otherwise grow leftward from the anchor and put every label one label-width off.
        <Html key={l.id} position={toWorld3(l.at.E, l.at.N, heightAt(l.at.E, l.at.N) + l.liftM)} center zIndexRange={[30, 0]} wrapperClass="[direction:ltr]" style={{ pointerEvents: 'none' }}>
          <span
            dir="rtl"
            data-model-label={l.id}
            className={
              l.tone === 'start'
                ? 'flex size-8 items-center justify-center rounded-full border-2 border-white bg-accent font-display text-base font-extrabold text-white shadow-elevated'
                : l.tone === 'route'
                  ? 'whitespace-nowrap rounded-lg border border-accent/60 bg-bg-elevated/95 px-2 py-0.5 font-display text-base font-bold text-black shadow-elevated'
                  : 'whitespace-nowrap rounded-lg border border-border bg-bg-elevated/95 px-2 py-0.5 font-display text-base font-semibold text-black shadow-elevated'
            }
          >
            {l.text}
          </span>
        </Html>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- sky, light, shadows

/**
 * Sun from the west-north-west, low — the cartographic north-west lighting of
 * relief: seen from the south (the opening view) every slope is side-lit, so
 * the domes, spurs and gullies read by their light and shadow sides.
 */
const SUN_DIR = (() => {
  const az = THREE.MathUtils.degToRad(292);
  const el = THREE.MathUtils.degToRad(32);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
})();

function SkyDome() {
  const camera = useThree((s) => s.camera);
  const mat = useMemo(createSkyMaterial, []);
  const geo = useMemo(() => new THREE.SphereGeometry(200, 64, 32), []);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      mat.dispose();
      geo.dispose();
    },
    [mat, geo],
  );
  useFrame(() => ref.current?.position.copy(camera.position));
  return <mesh ref={ref} geometry={geo} material={mat} renderOrder={-1} frustumCulled={false} raycast={() => null} />;
}

function Sun() {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld3(SHEET_CENTER.E, SHEET_CENTER.N, 350));
    return o;
  }, []);
  const pos = useMemo(() => {
    const t = target.position;
    return [t.x + SUN_DIR.x * 30, t.y + SUN_DIR.y * 30, t.z + SUN_DIR.z * 30] as [number, number, number];
  }, [target]);
  const half = 1200 / S;
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={pos}
        target={target}
        intensity={2.7}
        color="#FFEBD0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <hemisphereLight color="#D6E2EC" groundColor="#7A6C4C" intensity={1.9} />
    </>
  );
}

function StaticShadows({ onReady }: { onReady?: () => void }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => onReady?.());
    });
    return () => cancelAnimationFrame(raf);
  }, [gl, invalidate, onReady]);
  return null;
}

function SceneSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2(new THREE.Color('#E2E3DA'), 0.012);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

function World({ highlights, onReady }: { highlights: readonly FeatureId[]; onReady?: () => void }) {
  return (
    <>
      <Terrain highlights={highlights} />
      <Stream />
      <TreeKind kind="pine" highlights={highlights} />
      <TreeKind kind="oak" highlights={highlights} />
      <TreeKind kind="olive" highlights={highlights} />
      <Scrub />
      <Boulders />
      <Tufts />
      <Stones />
      <Village highlights={highlights} />
      <StaticShadows onReady={onReady} />
    </>
  );
}

export default function TerrainNav3D({ view, reduce, highlights, route, labels, pins, onPick, onReady, pointerScale = 1 }: ModelProps) {
  const home = useMemo(() => {
    const t = toWorld3(SHEET_CENTER.E, SHEET_CENTER.N, HOME_VIEW.targetHeightM);
    const polar = THREE.MathUtils.degToRad(HOME_VIEW.polarDeg);
    const r = HOME_VIEW.distanceM / S;
    return { target: t, pos: [t[0], t[1] + r * Math.cos(polar), t[2] + r * Math.sin(polar)] as [number, number, number] };
  }, []);
  return (
    <Canvas
      aria-hidden
      dpr={[1, 1.75]}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 40, near: 5 / S, far: 30000 / S, position: home.pos }}
      frameloop="demand"
      // Inside CombatNavScene's LessonViewportFit: size from the untransformed box.
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.86;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneSetup />
      <OrbitControls makeDefault target={home.target} enableDamping dampingFactor={0.1} minDistance={300 / S} maxDistance={3600 / S} maxPolarAngle={THREE.MathUtils.degToRad(80)} zoomSpeed={0.9} rotateSpeed={1 / pointerScale} panSpeed={1 / pointerScale} screenSpacePanning={false} />
      <CameraRig view={view} reduce={reduce} />
      <Picker onPick={onPick} />
      <SkyDome />
      <Sun />
      <Suspense fallback={null}>
        <World highlights={highlights} onReady={onReady} />
      </Suspense>
      {route && <RouteOnGround pts={route.pts} dashed={route.dashed} />}
      <Pins pins={pins} />
      <Labels labels={labels} />
    </Canvas>
  );
}
