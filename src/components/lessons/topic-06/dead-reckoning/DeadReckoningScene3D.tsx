'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF, useProgress, useTexture } from '@react-three/drei';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import { WADI_CROSSING_M, along } from './deadReckoningModel';
import {
  CHUNK_M,
  CHUNK_REACH_M,
  ROCK_SHAPES,
  SHRUB_SHAPES,
  buildChunk,
  chunksAround,
  eyeHeightAt,
  heightAt,
  instanceMatrix,
  legToEN,
  scatterChunk,
  toScene,
  type Instance,
  type Occluder,
} from './deadReckoningTerrain';
import {
  DUST,
  createDustNoise,
  createGrainMaterial,
  createGroundMaterial,
  createMacroNoise,
  createSkyMaterial,
  patchRockMaterial,
  patchShrubMaterial,
  type GroundTextures,
} from './deadReckoningMaterials';
import type { LookRig } from './deadReckoningLook';

/**
 * The live first-person view of the dead-reckoning walk: the eye 1.7 m over
 * the ground of deadReckoningTerrain, on the planned 62° line, `distM` metres
 * from A — the same motion value that moves the map's estimate and the pace
 * counter, so the three can never disagree. The camera only reads it; the
 * activity animates it, one 150 m segment at a time.
 *
 *   ground   chunks of the height field streamed around the eye (built a few
 *            per frame within a time budget, released behind it), drawn with
 *            the splatted scan material
 *   rocks    11 scanned rocks and stones, 4 dry bushes — instanced, placed by
 *            the terrain's deterministic scatter
 *   storm    the dust function in every material, a sky dome of the same
 *            colour, and a box of airborne grains around the eye
 *   light    soft daylight through dust: a warm hemisphere and a low-contrast
 *            sun whose shadow box follows the eye
 *
 * Client-only (next/dynamic). Rendering stops while the view is off screen.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const DIR = `${BASE}/assets/lessons/topic06/dead-reckoning`;
const LAYERS = ['ground', 'stony', 'bank', 'drift'] as const;
const TEXTURE_URLS = [...LAYERS.map((l) => `${DIR}/ground/${l}_albedo.webp`), ...LAYERS.map((l) => `${DIR}/ground/${l}_normal.webp`), `${DIR}/ground/roughness.webp`];
const ROCKS_URL = `${DIR}/rocks.glb`;
const SHRUBS_URL = `${DIR}/shrubs.glb`;

/** The frame's background while the canvas has nothing to show (the storm's own haze colour). */
export const DUST_BG = '#c1a484';

/** Vertical field of view: ~76° across the activity's wide frame. */
const FOV = 38;
/**
 * Sun through the dust: high in the north-north-east, ahead of the walker — the
 * brightest haze is in front, rocks throw their soft shadows towards the eye
 * and the wadi's far bank stands in its own shade, as in the approved mockup.
 */
const SUN_AZ = 28;
const SUN_EL = 34;

/** Instance capacity per shape. */
const CAPACITY: Record<string, number> = { stone: 2600, rock: 700, rock07: 700, boulder: 260, shrub: 420 };
const family = (shape: string) => shape.replace(/_[a-z]$/, '');

export type SceneProps = {
  /** Metres walked along the planned line (animated by the activity). */
  distM: MotionValue<number>;
  /** Where the eye looks. */
  look: LookRig;
  /** Show the wadi's identification label (only while it is in sight and named). */
  wadiLabel: boolean;
  reduceMotion: boolean;
  /** Render (false while the view is off screen). */
  active: boolean;
  /** The first frame of the full scene is on screen. */
  onReady: () => void;
  /** WebGL failed (context lost, or textures that never load). */
  onFail: () => void;
};

export default function DeadReckoningScene3D(props: SceneProps) {
  const [ready, setReady] = useState(false);
  const { progress, active: loading } = useProgress();
  return (
    <div className="absolute inset-0">
      <Canvas
        className="!absolute inset-0"
        resize={LESSON_FIT_CANVAS_RESIZE}
        frameloop={props.active ? 'always' : 'never'}
        dpr={[0.85, 1.25]}
        shadows
        camera={{ fov: FOV, near: 0.08, far: 600, position: [0, 1.7, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(DUST_BG);
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            props.onFail();
          });
        }}
        aria-hidden
      >
        <Suspense fallback={null}>
          <World
            {...props}
            onReady={() => {
              setReady(true);
              props.onReady();
            }}
          />
        </Suspense>
      </Canvas>
      {/* Centred in the part of the view the open planning map leaves free (--dr-map-w, set by the view) */}
      {!ready && <ModelLoading label="טוען שטח מדברי תלת־ממדי…" progress={loading ? progress : undefined} className="bg-[#c1a484] pe-[var(--dr-map-w,0px)]" />}
    </div>
  );
}

// ---------------------------------------------------------------- the world

type ChunkRec = { mesh: THREE.Mesh; rocks: Map<string, Float32Array>; shrubs: Map<string, Float32Array> };
type Scatter = ReturnType<typeof scatterChunk>;

function World({ distM, look, wadiLabel, reduceMotion, onReady }: SceneProps) {
  const { gl, scene, camera, setDpr } = useThree();
  const textures = useTexture(TEXTURE_URLS);
  const rocksGltf = useGLTF(ROCKS_URL);
  const shrubsGltf = useGLTF(SHRUBS_URL);

  // ---- materials, made once
  const res = useMemo(() => {
    const maxAniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    textures.forEach((t, k) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = maxAniso;
      t.colorSpace = k < 4 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
    });
    const tex: GroundTextures = {
      albedo: [textures[0], textures[1], textures[2], textures[3]],
      normal: [textures[4], textures[5], textures[6], textures[7]],
      roughness: textures[8],
    };
    DUST.uDustNoise.value = createDustNoise();
    const macro = createMacroNoise();
    const ground = createGroundMaterial(tex, macro);
    const sunDir = new THREE.Vector3(Math.sin((SUN_AZ * Math.PI) / 180) * Math.cos((SUN_EL * Math.PI) / 180), Math.sin((SUN_EL * Math.PI) / 180), -Math.cos((SUN_AZ * Math.PI) / 180) * Math.cos((SUN_EL * Math.PI) / 180));
    DUST.uSunDir.value.copy(sunDir);

    // Instanced rocks and bushes: one InstancedMesh per glTF primitive.
    const tints: Record<string, THREE.Color> = {
      stone: new THREE.Color('#9a8a78'),
      rock: new THREE.Color('#968470'),
      rock07: new THREE.Color('#9b8973'),
      boulder: new THREE.Color('#a08c76'),
    };
    const rockMats = new Map<THREE.Material, THREE.Material>();
    const instanced = new Map<string, THREE.InstancedMesh[]>();
    const addShape = (root: THREE.Object3D, shape: string, isShrub: boolean) => {
      const meshes: THREE.Mesh[] = [];
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      const fam = family(shape);
      const list = meshes.map((src, k) => {
        const srcMat = src.material as THREE.MeshStandardMaterial;
        let mat = rockMats.get(srcMat);
        if (!mat) {
          mat = isShrub ? patchShrubMaterial(srcMat, `${srcMat.name}`) : patchRockMaterial(srcMat, tints[fam] ?? tints.rock, srcMat.name);
          rockMats.set(srcMat, mat);
        }
        const im = new THREE.InstancedMesh(src.geometry, mat, CAPACITY[fam] ?? 400);
        im.count = 0;
        im.frustumCulled = false;
        im.castShadow = fam !== 'stone';
        im.receiveShadow = true;
        im.name = `${shape}#${k}`;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        return im;
      });
      instanced.set(shape, list);
    };
    for (const s of ROCK_SHAPES) {
      const node = rocksGltf.scene.getObjectByName(s);
      if (node) addShape(node, s, false);
    }
    for (const s of SHRUB_SHAPES) {
      const node = shrubsGltf.scene.getObjectByName(s);
      if (node) addShape(node, s, true);
    }

    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), createSkyMaterial());
    sky.renderOrder = -10;
    sky.frustumCulled = false;

    // Grains: a 16 × 6 × 16 m box around the eye.
    const N = 3200;
    const gpos = new Float32Array(N * 3);
    const gseed = new Float32Array(N);
    let seed = 0x5eed;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < N; k++) {
      gpos[k * 3] = rnd() * 16;
      gpos[k * 3 + 1] = rnd() * 6;
      gpos[k * 3 + 2] = rnd() * 16;
      gseed[k] = rnd();
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
    gg.setAttribute('aSeed', new THREE.BufferAttribute(gseed, 1));
    const grainMat = createGrainMaterial();
    grainMat.uniforms.uBox.value.set(16, 6, 16);
    const grains = new THREE.Points(gg, grainMat);
    grains.frustumCulled = false;
    grains.renderOrder = 5;

    return { ground, macro, instanced, rockMats, sky, grains, grainMat, sunDir };
  }, [gl, textures, rocksGltf, shrubsGltf]);

  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    scene.background = null;
    return () => {
      res.ground.dispose();
      res.macro.dispose();
      DUST.uDustNoise.value?.dispose();
      DUST.uDustNoise.value = null;
      for (const m of res.rockMats.values()) m.dispose();
      for (const list of res.instanced.values()) for (const im of list) im.dispose();
      res.sky.geometry.dispose();
      (res.sky.material as THREE.Material).dispose();
      res.grains.geometry.dispose();
      res.grainMat.dispose();
    };
  }, [gl, scene, res]);

  // ---- terrain chunks, streamed
  const groundGroup = useRef<THREE.Group>(null);
  const chunks = useRef(new Map<string, ChunkRec>());
  const scatterCache = useRef(new Map<string, Scatter>());
  const queue = useRef<{ i: number; j: number }[]>([]);
  const instancesDirty = useRef(false);
  const lastRebuild = useRef(0);
  const initial = useRef<{ total: number; done: boolean; frames: number }>({ total: 0, done: false, frames: 0 });

  const scatterOf = (i: number, j: number) => {
    const k = `${i},${j}`;
    let s = scatterCache.current.get(k);
    if (!s) {
      s = scatterChunk(i, j);
      scatterCache.current.set(k, s);
    }
    return s;
  };

  const packInstances = (list: readonly Instance[]) => {
    const by = new Map<string, Instance[]>();
    for (const t of list) {
      const a = by.get(t.shape) ?? [];
      a.push(t);
      by.set(t.shape, a);
    }
    const out = new Map<string, Float32Array>();
    for (const [shape, ts] of by) {
      const f = new Float32Array(ts.length * 16);
      ts.forEach((t, k) => instanceMatrix(t, f, k * 16));
      out.set(shape, f);
    }
    return out;
  };

  const buildOne = (i: number, j: number) => {
    const key = `${i},${j}`;
    if (chunks.current.has(key)) return;
    const own = scatterOf(i, j);
    // Contact shadows from rocks of the neighbouring chunks too, so they don't stop at an edge.
    const occ: Occluder[] = [...own.occluders];
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]] as const) {
      if (Math.abs(j + dj) > 4) continue;
      for (const o of scatterOf(i + di, j + dj).occluders) occ.push(o);
    }
    const c = buildChunk(i, j, occ);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(c.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(c.normal, 3));
    g.setAttribute('aLayers', new THREE.BufferAttribute(c.layers, 4));
    g.setAttribute('aAO', new THREE.BufferAttribute(c.ao, 1));
    g.setIndex(new THREE.BufferAttribute(c.index, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(...c.center), c.radius);
    const mesh = new THREE.Mesh(g, res.ground);
    mesh.receiveShadow = true;
    mesh.castShadow = Math.abs(j) <= 1;
    mesh.matrixAutoUpdate = false;
    mesh.name = `chunk ${key}`;
    groundGroup.current?.add(mesh);
    chunks.current.set(key, { mesh, rocks: packInstances(own.rocks), shrubs: packInstances(own.shrubs) });
    instancesDirty.current = true;
  };

  const rebuildInstances = () => {
    const fill = new Map<THREE.InstancedMesh, number>();
    for (const list of res.instanced.values()) for (const im of list) fill.set(im, 0);
    for (const rec of chunks.current.values()) {
      for (const src of [rec.rocks, rec.shrubs]) {
        for (const [shape, mats] of src) {
          const list = res.instanced.get(shape);
          if (!list) continue;
          for (const im of list) {
            const at = fill.get(im)!;
            const n = Math.min(mats.length / 16, im.instanceMatrix.count - at);
            if (n <= 0) continue;
            (im.instanceMatrix.array as Float32Array).set(mats.subarray(0, n * 16), at * 16);
            fill.set(im, at + n);
          }
        }
      }
    }
    for (const [im, n] of fill) {
      im.count = n;
      im.instanceMatrix.clearUpdateRanges();
      im.instanceMatrix.addUpdateRange(0, n * 16);
      im.instanceMatrix.needsUpdate = true;
    }
    instancesDirty.current = false;
  };

  const syncChunks = (u: number) => {
    const want = new Set<string>();
    const order: { i: number; j: number; pri: number }[] = [];
    for (const c of chunksAround(u)) {
      const k = `${c.i},${c.j}`;
      want.add(k);
      if (!chunks.current.has(k)) {
        const cu = (c.i + 0.5) * CHUNK_M - u;
        const cv = (c.j + 0.5) * CHUNK_M;
        order.push({ ...c, pri: Math.hypot(cu * (cu < 0 ? 1.4 : 1), cv) });
      }
    }
    order.sort((a, b) => a.pri - b.pri);
    queue.current = order;
    // Release chunks well behind or beyond reach.
    for (const [k, rec] of chunks.current) {
      if (want.has(k)) continue;
      const [i] = k.split(',').map(Number);
      if (Math.abs((i + 0.5) * CHUNK_M - u) < CHUNK_REACH_M + CHUNK_M * 1.5) continue;
      groundGroup.current?.remove(rec.mesh);
      rec.mesh.geometry.dispose();
      chunks.current.delete(k);
      instancesDirty.current = true;
    }
    for (const k of scatterCache.current.keys()) {
      const [i] = k.split(',').map(Number);
      if (Math.abs((i + 0.5) * CHUNK_M - u) > CHUNK_REACH_M + CHUNK_M * 3) scatterCache.current.delete(k);
    }
  };

  // The wadi's label hangs over its bed, 2 m before the centre line, just above the ground.
  const wadiAnchorRef = useRef<[number, number, number]>(
    (() => {
      const p = along(WADI_CROSSING_M - 2);
      return toScene(p.E, p.N, heightAt(p.E, p.N) + 0.15);
    })(),
  );

  // ---- lights
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);

  // ---- camera and streaming, every frame
  const lastU = useRef(Number.NaN);
  const perf = useRef({ t: 0, frames: 0, dpr: 1.25, checked: 0, fast: 0, fps: 0 });
  useEffect(() => {
    const u = distM.get();
    syncChunks(u);
    initial.current.total = queue.current.length;
    // Dev-only probe for scripts/qa/shot-dead-reckoning.mjs: the camera's own state.
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __drScene?: unknown };
      w.__drScene = {
        camera: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: look.yaw, pitch: look.pitch }),
        groundAt: (x: number, z: number) => heightAt(x + 230, -z + 140),
        chunks: () => chunks.current.size,
        project: (E: number, N: number, h: number) => {
          const v = new THREE.Vector3(...toScene(E, N, h)).project(camera);
          const el = gl.domElement;
          return [((v.x + 1) / 2) * el.clientWidth, ((1 - v.y) / 2) * el.clientHeight, v.z];
        },
        fps: () => perf.current,
        projectWadiLabel: () => {
          const v = new THREE.Vector3(...wadiAnchorRef.current).project(camera);
          const el = gl.domElement;
          return [((v.x + 1) / 2) * el.clientWidth, ((1 - v.y) / 2) * el.clientHeight];
        },
      };
      return () => {
        delete w.__drScene;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    DUST.uTime.value = reduceMotion ? t * 0.15 : t;
    res.grainMat.uniforms.uSize.value = state.viewport.dpr;

    const u = distM.get();
    if (Math.abs(u - lastU.current) > 4 || Number.isNaN(lastU.current)) {
      syncChunks(u);
      lastU.current = u;
    }
    // Build within a time budget; more while loading.
    const budget = initial.current.done ? 6 : 40;
    const t0 = performance.now();
    while (queue.current.length && performance.now() - t0 < budget) {
      const c = queue.current.shift()!;
      buildOne(c.i, c.j);
    }
    if (instancesDirty.current && (performance.now() - lastRebuild.current > 120 || !initial.current.done)) {
      rebuildInstances();
      lastRebuild.current = performance.now();
    }

    // The eye: on the line, 1.7 m over the ground under the feet.
    const p = legToEN(u, 0);
    const [x, , z] = toScene(p.E, p.N, 0);
    const eye = eyeHeightAt(p.E, p.N);
    camera.position.set(x, eye, z);
    look.step(dt, reduceMotion);
    camera.rotation.set((look.pitch * Math.PI) / 180, (-look.yaw * Math.PI) / 180, 0, 'YXZ');

    // Shadow box ahead of the eye, snapped to its texels so edges don't crawl.
    if (sun.current) {
      const [fx, fz] = [Math.sin((look.yaw * Math.PI) / 180), -Math.cos((look.yaw * Math.PI) / 180)];
      const texel = 52 / 2048;
      const cx = Math.round((x + fx * 12) / texel) * texel;
      const cz = Math.round((z + fz * 12) / texel) * texel;
      sunTarget.position.set(cx, eye - 1.7, cz);
      sunTarget.updateMatrixWorld();
      sun.current.position.set(cx + res.sunDir.x * 60, eye - 1.7 + res.sunDir.y * 60, cz + res.sunDir.z * 60);
    }
    res.sky.position.copy(camera.position);

    // Ready once the chunks around the eye are built and drawn.
    if (!initial.current.done && queue.current.length === 0) {
      initial.current.frames += 1;
      if (initial.current.frames >= 2) {
        initial.current.done = true;
        onReady();
      }
    }

    // Resolution follows the frame rate, measured over 2 s windows while no chunks are being built (a
    // reset or a long jump builds many at once): a step down below 40 fps, back up after three windows above 57.
    if (initial.current.done && queue.current.length === 0) {
      const pf = perf.current;
      pf.frames += 1;
      pf.t += dt;
      if (pf.t > 2) {
        const fps = pf.frames / pf.t;
        pf.checked += 1;
        pf.fast = fps > 57 ? pf.fast + 1 : 0;
        if (fps < 40 && pf.dpr > 0.86) {
          pf.dpr = Math.max(0.85, pf.dpr - 0.2);
          setDpr(pf.dpr);
        } else if (pf.fast >= 3 && pf.dpr < 1.25) {
          pf.dpr = Math.min(1.25, pf.dpr + 0.1);
          pf.fast = 0;
          setDpr(pf.dpr);
        }
        pf.fps = fps;
        pf.t = 0;
        pf.frames = 0;
      }
    }
  });

  const wadiAnchor = wadiAnchorRef.current;

  return (
    <>
      <primitive object={res.sky} />
      <hemisphereLight args={['#e6d3b8', '#8a6c50', 3.0]} />
      <directionalLight
        ref={sun}
        color="#ffe6c4"
        intensity={3.4}
        target={sunTarget}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-intensity={0.8}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <primitive object={sunTarget} />
      <group ref={groundGroup} />
      {[...res.instanced.values()].flat().map((im) => (
        <primitive key={im.name} object={im} />
      ))}
      <primitive object={res.grains} />
      {wadiLabel && (
        <Html position={wadiAnchor} wrapperClass="[direction:ltr]" zIndexRange={[20, 0]} style={{ transform: 'translate(-50%, calc(5px - 100%))', pointerEvents: 'none' }}>
          <div className="flex flex-col items-center" data-wadi-label>
            <span dir="rtl" className="whitespace-nowrap rounded-md bg-white/95 px-2.5 py-1 font-display text-base font-bold text-black shadow-md">
              ערוץ יבש
            </span>
            <span className="h-7 w-0.5 bg-white/90" />
            <span className="size-2.5 rounded-full border-2 border-white bg-black/70" />
          </div>
        </Html>
      )}
    </>
  );
}

useGLTF.preload(ROCKS_URL);
useGLTF.preload(SHRUBS_URL);
