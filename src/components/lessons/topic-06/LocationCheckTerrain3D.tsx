'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROVES, ROAD_WIDTH_M, WORLD_BOUNDS, type GroveId } from './locationCheckScenario';
import { WORLD3D, grovePolygon, toWorld3, verticalFov } from './locationCheckGeometry';
import { ROAD_VERGE_M, crownShape, groundStones, groundTufts, groveTrees, heightField, meshAxis, observerEye, roads, rng, shrubs } from './locationCheckTerrain';
import type { LookStore } from './locationCheckViewStore';
import { createTerrainMaterial, createSkyMaterial, SKY } from './locationCheckMaterials';

/**
 * The live eye-level observation: one camera, fixed at the observation point
 * (ground + 1.7 m), that only turns (yaw / pitch) and zooms (field of view) —
 * never moves, never orbits. Everything it shows comes from locationCheckTerrain:
 *
 *   terrain   the 5 m sheet grid with its SW–NE triangles, unexaggerated
 *             (verticalExaggeration 1), plus an apron of the same generator
 *             out to the hazy horizon.
 *   cover     the grove trees and the scrub as instanced meshes at their
 *             heightAt() positions; the roads and the grove floor painted by
 *             the ground shader from a mask drawn with the same centre-lines
 *             and the shared 8 m road width.
 *
 * The heading tape and every control live in the DOM layer
 * (LocationCheckObservation) and use the same pure projection, so they work
 * identically over this canvas and over the static fallback.
 *
 * Frames render on demand; the shadow map is drawn once (the world is static).
 * Rendered client-only via next/dynamic.
 */

const S = WORLD3D.metresPerUnit;
const APRON_M = 7000;
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

// ---------------------------------------------------------------- camera

function LookCamera({ store, reduce }: { store: LookStore; reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const eye = useMemo(() => observerEye(), []);
  const cur = useRef({ ...store.getLive() });

  useEffect(() => store.subscribe(() => invalidate()), [store, invalidate]);
  useEffect(() => invalidate(), [size.width, size.height, invalidate]);

  // Dev-only registration probe (scripts/qa/shot-location-check.mjs): the
  // canvas' own projection of a world point, to compare with projectToView().
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __lcProbe?: (E: number, N: number, h: number) => [number, number] };
    const v = new THREE.Vector3();
    w.__lcProbe = (E, N, h) => {
      v.set(...toWorld3(E, N, h)).project(camera);
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
    };
    return () => {
      delete w.__lcProbe;
    };
  }, [camera, size.width, size.height]);

  useFrame((_, dt) => {
    if (size.width === 0 || size.height === 0) return;
    const t = store.getTarget();
    const c = cur.current;
    const k = reduce ? 1 : 1 - Math.exp(-12 * Math.min(dt, 0.1));
    c.yawDeg += (t.yawDeg - c.yawDeg) * k;
    c.pitchDeg += (t.pitchDeg - c.pitchDeg) * k;
    c.hfovDeg += (t.hfovDeg - c.hfovDeg) * k;
    const settled = Math.abs(t.yawDeg - c.yawDeg) < 0.01 && Math.abs(t.pitchDeg - c.pitchDeg) < 0.01 && Math.abs(t.hfovDeg - c.hfovDeg) < 0.01;
    if (settled) Object.assign(c, t);

    const aspect = size.width / size.height;
    camera.position.set(...toWorld3(eye.E, eye.N, eye.heightM));
    camera.rotation.set(THREE.MathUtils.degToRad(c.pitchDeg), -THREE.MathUtils.degToRad(c.yawDeg), 0, 'YXZ');
    camera.aspect = aspect;
    camera.fov = verticalFov(c.hfovDeg, aspect);
    camera.near = 0.25 / S;
    camera.far = 9000 / S;
    camera.updateProjectionMatrix();

    const live = store.getLive();
    if (live.yawDeg !== c.yawDeg || live.pitchDeg !== c.pitchDeg || live.hfovDeg !== c.hfovDeg) store.setLive({ ...c });
    if (!settled) invalidate();
  });
  return null;
}

// ---------------------------------------------------------------- terrain

function buildTerrainGeometry() {
  const xs = meshAxis(WORLD_BOUNDS.minE, WORLD_BOUNDS.maxE, APRON_M);
  const ns = meshAxis(WORLD_BOUNDS.minN, WORLD_BOUNDS.maxN, APRON_M);
  const nx = xs.length;
  const ny = ns.length;
  const pos = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      // Inside the sheet these are exactly the 5 m grid samples (same function, same arguments).
      const [x, y, z] = toWorld3(xs[i], ns[j], heightField(xs[i], ns[j]));
      const o = (j * nx + i) * 3;
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
    }
  }
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i; // SW
      const b = a + 1; // SE
      const c = a + nx + 1; // NE
      const d = a + nx; // NW
      // The SW–NE split of locationCheckTerrain — counter-clockwise seen from above.
      index.set([a, b, c, a, c, d], k);
      k += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Ground mask over the sheet, 2048 × 1536 (≈ 0.68 m / px): R = road surface
 * (the shared centre-lines at ROAD_WIDTH_M), G = grove floor (the grove
 * polygons), B = road surface plus its vegetated edge (ROAD_VERGE_M each side,
 * as the map's road casing). Same data the map draws.
 */
function buildMaskTexture() {
  const W = 2048;
  const H = 1536;
  const sx = W / (WORLD_BOUNDS.maxE - WORLD_BOUNDS.minE);
  const sy = H / (WORLD_BOUNDS.maxN - WORLD_BOUNDS.minN);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const px = (E: number, N: number): [number, number] => [(E - WORLD_BOUNDS.minE) * sx, (WORLD_BOUNDS.maxN - N) * sy];
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = 'rgb(0,255,0)';
  for (const g of GROVES) {
    ctx.beginPath();
    grovePolygon(g.center).forEach((p, i) => (i ? ctx.lineTo(...px(p.E, p.N)) : ctx.moveTo(...px(p.E, p.N))));
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const strokeRoads = (color: string, widthM: number, blurPx: number) => {
    ctx.filter = `blur(${blurPx}px)`;
    ctx.strokeStyle = color;
    ctx.lineWidth = widthM * sx;
    for (const r of roads()) {
      ctx.beginPath();
      r.pts.forEach(([E, N], i) => (i ? ctx.lineTo(...px(E, N)) : ctx.moveTo(...px(E, N))));
      ctx.stroke();
    }
  };
  strokeRoads('rgb(0,0,255)', ROAD_WIDTH_M + 2 * ROAD_VERGE_M, 1.5);
  strokeRoads('rgb(255,0,0)', ROAD_WIDTH_M, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

function Terrain() {
  const gl = useThree((s) => s.gl);
  const tex = useTexture(TEXTURE_URLS);
  const geometry = useMemo(buildTerrainGeometry, []);
  const mask = useMemo(buildMaskTexture, []);
  const material = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    for (const [key, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = key.endsWith('D') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }
    // The roads are seen obliquely from the eye: full anisotropic filtering keeps them sharp.
    mask.anisotropy = aniso;
    mask.needsUpdate = true;
    return createTerrainMaterial({ ...tex, mask });
  }, [tex, mask, gl]);
  useEffect(
    () => () => {
      geometry.dispose();
      mask.dispose();
      material.dispose();
    },
    [geometry, mask, material],
  );
  // Nothing in the scene is a raycast target: the view is only turned, never clicked into.
  return <mesh geometry={geometry} material={material} receiveShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- vegetation

/**
 * Lumpy geometry from overlapping lobes, jittered once with a fixed seed.
 * Normals blend each lobe's own with the whole clump's spherical normal, so
 * the clumps read in the light without faceting; a baked occlusion darkens the
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
    const ao = THREE.MathUtils.lerp(0.42, 1, THREE.MathUtils.smoothstep(v.y, -0.9, 0.75)) * THREE.MathUtils.lerp(0.72, 1, radial) * (0.84 + rand() * 0.16);
    colors.set([ao, ao, ao], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** A unit canopy (radius ≈ 1): a core and nine clumps; instances scale it to each tree's crown. */
function crownGeometry() {
  const rand = rng(0x9b05688c);
  const lobes: [number, number, number, number][] = [[0, 0, 0, 0.72]];
  for (let k = 0; k < 9; k++) {
    const a = rand() * Math.PI * 2;
    const y = (rand() - 0.4) * 0.9;
    const r = 0.38 + rand() * 0.18;
    lobes.push([Math.cos(a) * 0.52, y * 0.62, Math.sin(a) * 0.52, r]);
  }
  return clumpGeometry(0x2f1ac81d, lobes, 2, 0.07);
}

/** A unit shrub, flat-bottomed at y = 0. */
function shrubGeometry() {
  const geo = clumpGeometry(
    0x510e527f,
    [
      [0, 0.1, 0, 0.75],
      [0.45, 0, 0.15, 0.55],
      [-0.35, -0.02, -0.3, 0.6],
    ],
    1,
    0.12,
  );
  return geo.scale(1, 0.75, 1).translate(0, 0.42, 0);
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

const CROWN_DARK = new THREE.Color('#34421F');
const CROWN_LIGHT = new THREE.Color('#56652F');
const SHRUB_A = new THREE.Color('#4E5531');
const SHRUB_B = new THREE.Color('#7A7650');
const STONE_A = new THREE.Color('#A39B88');
const STONE_B = new THREE.Color('#CFC6B0');
const TUFT_A = new THREE.Color('#B09A63');
const TUFT_B = new THREE.Color('#D6C38E');

/** Fills an instanced mesh once; matrices and colours never change afterwards. */
function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  count: number,
  fill: (i: number, m: THREE.Matrix4, c: THREE.Color) => void,
) {
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
    // fill is a pure function of the memoised list it closes over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, count, invalidate]);
}

const UP = new THREE.Vector3(0, 1, 0);

function Grove({ id, crown, trunk }: { id: GroveId; crown: THREE.BufferGeometry; trunk: THREE.BufferGeometry }) {
  const trees = useMemo(() => groveTrees().filter((t) => t.grove === id), [id]);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), []);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A3E30', roughness: 1, metalness: 0 }), []);
  useEffect(
    () => () => {
      crownMat.dispose();
      trunkMat.dispose();
    },
    [crownMat, trunkMat],
  );
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(crownRef, trees.length, (i, m, c) => {
    const t = trees[i];
    const { center, radiusM, halfHeightM } = crownShape(t);
    q.setFromAxisAngle(UP, t.spin);
    m.compose(new THREE.Vector3(...toWorld3(center.E, center.N, center.heightM)), q, new THREE.Vector3(radiusM / S, halfHeightM / S, radiusM / S));
    c.copy(CROWN_DARK).lerp(CROWN_LIGHT, t.tone);
  });
  useInstances(trunkRef, trees.length, (i, m, c) => {
    const t = trees[i];
    const { center } = crownShape(t);
    const r = 0.24 + t.crownR * 0.025;
    q.setFromAxisAngle(UP, t.spin);
    m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.4)), q, new THREE.Vector3(r / S, (center.heightM - t.baseM + 0.4) / S, r / S));
    c.set('#FFFFFF');
  });

  return (
    <group>
      <instancedMesh ref={crownRef} args={[crown, crownMat, trees.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={trunkRef} args={[trunk, trunkMat, trees.length]} castShadow raycast={() => null} />
    </group>
  );
}

function Groves() {
  const crown = useMemo(crownGeometry, []);
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.7, 1, 1, 7).translate(0, 0.5, 0), []);
  useEffect(
    () => () => {
      crown.dispose();
      trunk.dispose();
    },
    [crown, trunk],
  );
  return (
    <>
      {GROVES.map((g) => (
        <Grove key={g.id} id={g.id} crown={crown} trunk={trunk} />
      ))}
    </>
  );
}

function Scrub() {
  const list = useMemo(() => shrubs(), []);
  const geo = useMemo(shrubGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const spin = useMemo(() => {
    const rand = rng(0x1f83d9ab);
    return list.map(() => rand() * Math.PI * 2);
  }, [list]);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(ref, list.length, (i, m, c) => {
    const s = list[i];
    q.setFromAxisAngle(UP, spin[i]);
    m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - 0.12)), q, new THREE.Vector3(s.radiusM / S, s.heightM / S, s.radiusM / S));
    c.copy(SHRUB_A).lerp(SHRUB_B, s.tone);
  });
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

/** Loose stones: flattened, jittered lumps, half sunk into the ground. */
function stoneGeometry() {
  const geo = clumpGeometry(0x1b2c3d4e, [[0, 0, 0, 1], [0.35, -0.1, 0.2, 0.7]], 1, 0.22);
  return geo.scale(1, 0.55, 0.85);
}

function Stones() {
  const list = useMemo(() => groundStones(), []);
  const geo = useMemo(stoneGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(ref, list.length, (i, m, c) => {
    const s = list[i];
    q.setFromAxisAngle(UP, s.spin);
    m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM + s.sizeM * 0.12)), q, new THREE.Vector3(s.sizeM / S, s.sizeM / S, s.sizeM / S));
    c.copy(STONE_A).lerp(STONE_B, s.tone);
  });
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

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
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(ref, list.length, (i, m, c) => {
    const t = list[i];
    q.setFromAxisAngle(UP, t.spin);
    m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.03)), q, new THREE.Vector3(t.heightM / S, t.heightM / S, t.heightM / S));
    c.copy(TUFT_A).lerp(TUFT_B, t.tone);
  });
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} receiveShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- sky, light, shadows

function SkyDome() {
  const eye = useMemo(() => observerEye(), []);
  const mat = useMemo(createSkyMaterial, []);
  const geo = useMemo(() => new THREE.SphereGeometry(20, 64, 32), []);
  useEffect(
    () => () => {
      mat.dispose();
      geo.dispose();
    },
    [mat, geo],
  );
  return <mesh geometry={geo} material={mat} position={toWorld3(eye.E, eye.N, eye.heightM)} renderOrder={-1} frustumCulled={false} raycast={() => null} />;
}

/** The sun (SKY.sunDirection): glancing light on the slopes facing the observer; the shadow map covers the groves, the ridge and the foreground. */
function Sun() {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld3(800, 650, 300));
    return o;
  }, []);
  const pos = useMemo(() => {
    const t = target.position;
    const d = SKY.sunDirection;
    return [t.x + d.x * 6, t.y + d.y * 6, t.z + d.z * 6] as [number, number, number];
  }, [target]);
  const half = 640 / S;
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={pos}
        target={target}
        intensity={2.5}
        color="#FFF1DC"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-bias={-0.00008}
        shadow-normalBias={0.0012}
      />
      <hemisphereLight color="#DCE6EE" groundColor="#7D6E4C" intensity={0.95} />
    </>
  );
}

/** The world never moves: draw the shadow map once, after every caster is in place. */
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

function World({ onReady }: { onReady?: () => void }) {
  return (
    <>
      <Terrain />
      <Groves />
      <Scrub />
      <Tufts />
      <Stones />
      <StaticShadows onReady={onReady} />
    </>
  );
}

function SceneSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2(SKY.horizon.clone(), SKY.fogDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

export default function LocationCheckTerrain3D({
  lookStore,
  reduce,
  onReady,
}: {
  lookStore: LookStore;
  reduce: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      aria-hidden
      dpr={[1, 2]}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 50, near: 0.25 / S, far: 9000 / S, position: [0, 0, 0] }}
      frameloop="demand"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneSetup />
      <LookCamera store={lookStore} reduce={reduce} />
      <SkyDome />
      <Sun />
      <Suspense fallback={null}>
        <World onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
