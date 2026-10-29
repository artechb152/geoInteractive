'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useProgress, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import { CROWN, clumpGeometry, crownGeometry, useInstances, wallMaterial } from '../terrain-nav/TerrainNav3D';
import { createGroundMaterial } from '../terrain-nav/terrainNavMaterials';
import { createSkyMaterial } from '../locationCheckMaterials';
import { WATER } from '../terrain-nav/TerrainNavMap';
import type { ViewStore } from '../terrain-nav/terrainNavViewStore';
import { DEST, START, STREAM, WATER_TANK, WORLD, type Point } from './planningLabWorld';
import { behindGround, boulders, buildings, crownShape, heightAt, insideSheet, shrubs, terrainMeshArrays, trees, waterCourses, type Tree } from './planningLabTerrain';
import { featureOf, legsOf, standsOn, type FeatureId } from './planningLabPlan';
import { editable, type Action, type RouteNode, type Selection, type Tool } from './planningLabState';
import { FEATURE_INDEX, GROUND_FRAME, TONE_RECT, buildFeatureIdTexture, buildGroundMasks, buildToneTexture, createHighlightMask } from './planningLabMaterials';
import { WORLD3D, fromWorld3, toWorld3 } from './planningLabView';

/**
 * The live terrain model of the planning lab. Everything it shows comes from
 * planningLabTerrain — the same height grid as the map's contours:
 *
 *   terrain  the 5 m sheet grid with its SW–NE triangles, unexaggerated, and an
 *            apron of the same generator to the hazy horizon; coloured by the
 *            shared terrain-nav ground shader (grass, dry grass, limestone and
 *            forest-floor photo textures blended by slope and noise, roads,
 *            beds and the rocks painted from the map's own lines).
 *   cover    every tree, shrub and boulder of the shared lists as instances on
 *            heightAt(); the building and the water tank at A.
 *   plan     the learner's route draped on the ground (sampled every 4 m), the
 *            straight line, and handles for every route point.
 *
 * A handle can be dragged on the model: the pointer ray is marched over
 * heightAt() — the drawn surface — and the orbit is held while it moves. A
 * click on the ground (not a drag) is handed up as a ground point; the tool
 * decides what it does. Frames render on demand; the shadow map is drawn once
 * (the world is static) and dragging only moves the route.
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

const SHEET_CENTER = { E: 545, N: 610 };
/**
 * Opening view: from the south, high enough to see behind the ridge — A in front, the saddle in the
 * middle between the two summits (both whole in the frame), the ravine climbing to it, B beyond.
 */
export const HOME_VIEW = { targetE: 615, targetN: 650, targetHeightM: 400, distanceM: 1500, polarDeg: 58, azimuthDeg: 5 } as const;

const ACCENT = new THREE.Color('#D97E2B');
/** Crown tones: terrain-nav's oaks and olives; the pines the grey to fresh green of Aleppo pine, so a dense grove reads as many trees from afar. */
const CROWN_HERE: typeof CROWN = { ...CROWN, pine: [new THREE.Color('#3D5634'), new THREE.Color('#68844A')] };
const UP = new THREE.Vector3(0, 1, 0);
const ORANGE = '#D97E2B';
const LIFT_M = 2.4;

export type Lab3DProps = {
  view: ViewStore;
  reduce: boolean;
  nodes: readonly RouteNode[];
  selection: Selection;
  showDirect: boolean;
  /** Features drawn highlighted (the selection, a checkpoint's feature). */
  highlights: readonly FeatureId[];
  dragging: string | null;
  tool: Tool;
  dispatch: (a: Action) => void;
  /** A click (not a drag) on the ground. */
  onGround: (p: Point) => void;
  onReady?: () => void;
  onProgress?: (p: number | undefined) => void;
  /** Whether any route point is hidden from the camera by the ground (the panel explains the dashed ring). */
  onHidden?: (anyHidden: boolean) => void;
  /** CSS scale of the model on screen (the lesson fit); orbit speeds are divided by it. */
  pointerScale?: number;
};

// ---------------------------------------------------------------- picking

const raycaster = new THREE.Raycaster();
/** The ground point under a screen point: the camera ray marched over heightAt(), then bisected. */
function groundUnder(camera: THREE.Camera, el: HTMLElement, clientX: number, clientY: number): Point | null {
  const r = el.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
  const o = raycaster.ray.origin;
  const d = raycaster.ray.direction;
  const at = (t: number) => fromWorld3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
  const stepU = 2 / S;
  let prev = 0;
  for (let t = stepU; t < 40000 / S; t += stepU * (1 + t * 0.6)) {
    const p = at(t);
    if (p.heightM <= heightAt(p.E, p.N)) {
      let lo = prev;
      let hi = t;
      for (let k = 0; k < 24; k++) {
        const m = (lo + hi) / 2;
        const q = at(m);
        if (q.heightM <= heightAt(q.E, q.N)) hi = m;
        else lo = m;
      }
      const q = at(hi);
      return { E: q.E, N: q.N };
    }
    prev = t;
  }
  return null;
}

/** A click (not a drag) on the canvas → the ground point under it. */
function Picker({ onGround }: { onGround: (p: Point) => void }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || performance.now() - down.t > 600) return;
      down = null;
      const p = groundUnder(camera, el, e.clientX, e.clientY);
      if (p && insideSheet(p.E, p.N)) onGround(p);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, onGround]);
  return null;
}

// ---------------------------------------------------------------- camera

const tmpV = new THREE.Vector3();

function CameraRig({ view, reduce }: { view: ViewStore; reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; enabled: boolean; update: () => void } | null;
  const lastCommand = useRef(0);
  const tween = useRef<{ fromPos: THREE.Vector3; fromT: THREE.Vector3; toPos: THREE.Vector3; toT: THREE.Vector3; t0: number; ms: number } | null>(null);

  useEffect(() => view.subscribe(() => invalidate()), [view, invalidate]);
  useEffect(() => invalidate(), [size.width, size.height, invalidate]);

  // Dev-only probes for the QA scripts: the canvas' own projection of a ground point, and a fixed
  // camera (eye and target as ground metres) so before/after shots share one view.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    type GP = { E: number; N: number; h: number };
    const w = window as unknown as { __plProbe?: (E: number, N: number, h?: number) => [number, number, boolean]; __plCamera?: (eye: GP, at: GP) => void };
    const v = new THREE.Vector3();
    w.__plProbe = (E, N, h) => {
      v.set(...toWorld3(E, N, h ?? heightAt(E, N))).project(camera);
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height, v.z < 1];
    };
    w.__plCamera = (eye, at) => {
      if (!controls) return;
      camera.position.set(...toWorld3(eye.E, eye.N, eye.h));
      controls.target.set(...toWorld3(at.E, at.N, at.h));
      controls.update();
      invalidate();
    };
    return () => {
      delete w.__plProbe;
      delete w.__plCamera;
    };
  }, [camera, controls, invalidate, size.width, size.height]);

  const goal = (kind: 'home' | 'top' | 'focus', at?: Point) => {
    // straight down: the whole sheet, centred, with room for the end tags
    const c = kind === 'top' ? { E: 500, N: 625 } : { E: HOME_VIEW.targetE, N: HOME_VIEW.targetN };
    const t = new THREE.Vector3(...toWorld3(at?.E ?? c.E, at?.N ?? c.N, at ? heightAt(at.E, at.N) : HOME_VIEW.targetHeightM));
    const polar = THREE.MathUtils.degToRad(kind === 'top' ? 0.6 : kind === 'focus' ? 50 : HOME_VIEW.polarDeg);
    const az = THREE.MathUtils.degToRad(HOME_VIEW.azimuthDeg);
    const r = (kind === 'focus' ? 520 : kind === 'top' ? 2150 : HOME_VIEW.distanceM) / S;
    return { pos: new THREE.Vector3(t.x + r * Math.sin(polar) * Math.sin(az), t.y + r * Math.cos(polar), t.z + r * Math.sin(polar) * Math.cos(az)), target: t };
  };

  useFrame(() => {
    const st = view.get();
    camera.aspect = size.width / Math.max(1, size.height);
    const cmd = st.orbitCommand;
    if (cmd && cmd.seq !== lastCommand.current && controls) {
      lastCommand.current = cmd.seq;
      if (cmd.kind === 'zoom-in' || cmd.kind === 'zoom-out') {
        const k = cmd.kind === 'zoom-in' ? 0.72 : 1 / 0.72;
        const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
        off.setLength(THREE.MathUtils.clamp(off.length(), 250 / S, 3200 / S));
        tween.current = { fromPos: camera.position.clone(), fromT: controls.target.clone(), toPos: controls.target.clone().add(off), toT: controls.target.clone(), t0: performance.now(), ms: reduce ? 0 : 380 };
      } else {
        const g = goal(cmd.kind as 'home' | 'top' | 'focus', cmd.at);
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
      // keep the target over the sheet and the camera above the ground
      const t = controls.target;
      const g = fromWorld3(t.x, t.y, t.z);
      const E = THREE.MathUtils.clamp(g.E, WORLD.minE, WORLD.maxE);
      const N = THREE.MathUtils.clamp(g.N, WORLD.minN, WORLD.maxN);
      if (E !== g.E || N !== g.N) {
        const [x, , z] = toWorld3(E, N, 0);
        camera.position.x += x - t.x;
        camera.position.z += z - t.z;
        t.x = x;
        t.z = z;
      }
      const c = fromWorld3(camera.position.x, camera.position.y, camera.position.z);
      const floor = heightAt(c.E, c.N) + 30;
      if (c.heightM < floor) camera.position.y = (floor - WORLD3D.datumM) / S;
    }
    camera.updateProjectionMatrix();
    const dir = camera.getWorldDirection(tmpV);
    const top = dir.y < -0.985;
    view.publishLive(top ? 0 : (Math.atan2(dir.x, -dir.z) * 180) / Math.PI, top);
  });
  return null;
}

// ---------------------------------------------------------------- terrain and water

function Terrain({ highlights }: { highlights: readonly FeatureId[] }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const tex = useTexture(TEXTURE_URLS);
  const geometry = useMemo(() => {
    const { positions, index } = terrainMeshArrays(toWorld3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }, []);
  const masks = useMemo(buildGroundMasks, []);
  const ids = useMemo(buildFeatureIdTexture, []);
  const tone = useMemo(buildToneTexture, []);
  const hl = useMemo(() => createHighlightMask(ids), [ids]);
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
    return createGroundMaterial(tex, masks, ids, { ...GROUND_FRAME, refine: { tone, toneRect: TONE_RECT, hlMask: hl.texture } });
  }, [tex, masks, ids, tone, hl, gl]);
  useEffect(() => {
    const v = highlights.map((h) => FEATURE_INDEX[h] ?? 0);
    uniforms.uHl.value.set(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    hl.update(v.slice(0, 3));
    invalidate();
  }, [highlights, uniforms, hl, invalidate]);
  useEffect(
    () => () => {
      geometry.dispose();
      Object.values(masks).forEach((m) => m.dispose());
      ids.dispose();
      tone.dispose();
      hl.texture.dispose();
      material.dispose();
    },
    [geometry, masks, ids, tone, hl, material],
  );
  return <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />;
}

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
      const h = Math.max(heightAt(E, N), heightAt(E + nx * half, N + ny * half), heightAt(E - nx * half, N - ny * half)) + 0.2;
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
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(WATER.line).lerp(new THREE.Color(WATER.fill), 0.35), roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
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

// ---------------------------------------------------------------- vegetation, rocks, the building

/** Lifts a clump's baked self-shade (its vertex colours) to `floor`, so a crown keeps its round form without going black. */
function liftShade<G extends THREE.BufferGeometry>(geo: G, floor: number): G {
  const col = geo.getAttribute('color');
  for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, floor + (1 - floor) * col.getComponent(i, c));
  col.needsUpdate = true;
  return geo;
}

/**
 * Shading for the cover seen from near and far: with distance the albedo pales
 * a little toward the haze, as the air does to dark foliage; and small cover
 * (`shrinkM`, instances under `keepAboveM` across) shrinks into the ground
 * between those distances — from there the ground's own scrub tone carries it,
 * instead of a speckle of dark dots a pixel wide.
 */
function coverMaterial(key: string, { paleM = [700, 2600], pale = 0.28, shrinkM, keepAboveM = Infinity, roughness = 1 }: { paleM?: [number, number]; pale?: number; shrinkM?: [number, number]; keepAboveM?: number; roughness?: number }) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 });
  const u = (m: number) => (m / S).toFixed(4);
  mat.customProgramCacheKey = () => `planning-lab-cover-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCoverFar;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float coverD = distance((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
      #else
        float coverD = distance((modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
      #endif
      vCoverFar = smoothstep(${u(paleM[0])}, ${u(paleM[1])}, coverD);${
        shrinkM
          ? `
      #ifdef USE_INSTANCING
        float coverSmall = ${Number.isFinite(keepAboveM) ? `1.0 - step(${u(keepAboveM)}, length(instanceMatrix[0].xyz))` : '1.0'};
        transformed *= 1.0 - coverSmall * smoothstep(${u(shrinkM[0])}, ${u(shrinkM[1])}, coverD);
      #endif`
          : ''
      }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCoverFar;').replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.22, 0.16), vCoverFar * ${pale.toFixed(2)});`,
    );
  };
  return mat;
}

/** A small 0…1 hash of an instance's own numbers, for variety that the shared lists don't carry. */
const hash01 = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function TreeKind({ kind, lit }: { kind: Tree['kind']; lit: boolean }) {
  const list = useMemo(() => trees().filter((t) => t.kind === kind), [kind]);
  const crown = useMemo(() => liftShade(kind === 'pine' ? crownGeometry(0x9b05688c, 10, 0.55) : kind === 'oak' ? crownGeometry(0x1f83d9ab, 9, 0.6) : crownGeometry(0x5be0cd19, 7, 0.62), 0.42), [kind]);
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.6, 1, 1, 6).translate(0, 0.5, 0), []);
  const crownMat = useMemo(() => coverMaterial(`crown-${kind}`, { pale: 0.4 }), [kind]);
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
  useInstances(
    crownRef,
    list.length,
    (i, m, c) => {
      const t = list[i];
      const cs = crownShape(t);
      // the crown's own variety: a little wider one way than the other, a shade warmer or bluer, lighter or darker
      const a = hash01(t.E, t.N);
      const b = hash01(t.N, t.E);
      q.setFromAxisAngle(UP, t.spin);
      m.compose(new THREE.Vector3(...toWorld3(cs.E, cs.N, cs.centerM)), q, new THREE.Vector3((cs.radiusM * (0.86 + 0.28 * a)) / S, cs.halfHeightM / S, (cs.radiusM * (0.86 + 0.28 * b)) / S));
      c.copy(CROWN_HERE[kind][0]).lerp(CROWN_HERE[kind][1], t.tone);
      c.offsetHSL((a - 0.5) * 0.05, 0, (b - 0.5) * 0.07);
      if (lit) c.lerp(ACCENT, 0.45);
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
      {/* crowns cast on the ground but take no shadow from their neighbours: a dense grove stays green, not black */}
      <instancedMesh ref={crownRef} args={[crown, crownMat, list.length]} castShadow raycast={() => null} />
      <instancedMesh ref={trunkRef} args={[trunk, trunkMat, list.length]} castShadow raycast={() => null} />
    </group>
  );
}

/** Maquis: low lumpy clumps, olive to sage and grey-green; far off it shrinks into the ground's scrub tone. */
function Maquis() {
  const list = useMemo(() => shrubs(), []);
  const geo = useMemo(() => liftShade(clumpGeometry(0x510e527f, [[0, 0.1, 0, 0.75], [0.45, 0, 0.15, 0.55], [-0.35, -0.02, -0.3, 0.6]], 1, 0.12).scale(1, 0.75, 1).translate(0, 0.42, 0), 0.5), []);
  const mat = useMemo(() => coverMaterial('maquis', { shrinkM: [1350, 2500] }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#3A4A22'), []);
  const B = useMemo(() => new THREE.Color('#6F7745'), []);
  const SAGE = useMemo(() => new THREE.Color('#7C7F5C'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - 0.15)), q, new THREE.Vector3(s.radiusM / S, s.heightM / S, s.radiusM / S));
      c.copy(A).lerp(B, s.tone);
      // one shrub in four the grey sage of the dry garrigue
      const g = hash01(s.E, s.N);
      if (g > 0.75) c.lerp(SAGE, (g - 0.75) * 3);
    },
    [],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

function Boulders({ lit }: { lit: boolean }) {
  const list = useMemo(() => boulders(), []);
  const geo = useMemo(() => liftShade(clumpGeometry(0x1b2c3d4e, [[0, 0, 0, 1], [0.35, -0.1, 0.2, 0.7]], 1, 0.22).scale(1, 0.6, 0.85), 0.45), []);
  // lone boulders shrink away with the maquis; the big blocks of the rocks at B (≥ 2 m) stay
  const mat = useMemo(() => coverMaterial('boulders', { pale: 0.1, shrinkM: [1100, 2100], keepAboveM: 2, roughness: 0.92 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const A = useMemo(() => new THREE.Color('#9E9684'), []);
  const B = useMemo(() => new THREE.Color('#D3CAB3'), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM + s.sizeM * 0.08)), q, new THREE.Vector3(s.sizeM / S, s.sizeM / S, s.sizeM / S));
      c.copy(A).lerp(B, s.tone);
      if (lit && s.atB) c.lerp(ACCENT, 0.5);
    },
    [lit],
  );
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow raycast={() => null} />;
}

function roofGeometry() {
  // a hip roof over a unit footprint, ridge along z
  const g = new THREE.BufferGeometry();
  const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, -0.24, 0, 1, 0.24];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0]);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  return ng;
}

/** The prominent building at A: stone walls with windows, a tiled hip roof, a flat-roofed annex, and the water tank on its stand. */
function Building({ lit }: { lit: boolean }) {
  const list = useMemo(() => buildings(), []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const roof = useMemo(roofGeometry, []);
  const walls = useMemo(wallMaterial, []);
  const plain = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), []);
  const wallsRef = useRef<THREE.InstancedMesh>(null);
  const capsRef = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      box.dispose();
      roof.dispose();
      walls.dispose();
      plain.dispose();
    },
    [box, roof, walls, plain],
  );
  const q = useMemo(() => new THREE.Quaternion(), []);
  const top = (b: (typeof list)[number]) => b.floorM + b.heightM;
  useInstances(
    wallsRef,
    list.length,
    (i, m, c) => {
      const b = list[i];
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(b.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(b.E, b.N, b.baseM)), q, new THREE.Vector3(b.widM / S, (top(b) - b.baseM) / S, b.lenM / S));
      c.set(i === 0 ? '#E2D6BC' : '#CDBF9F');
      if (lit) c.lerp(ACCENT, 0.5);
    },
    [lit],
  );
  // the main house's tiled roof (the annex's flat roof is its own mesh below)
  useInstances(
    capsRef,
    1,
    (_, m, c) => {
      const b = list[0];
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(b.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(b.E, b.N, top(b))), q, new THREE.Vector3((b.widM + 0.8) / S, 3.2 / S, (b.lenM + 0.8) / S));
      c.set(lit ? '#D97E2B' : '#A9573A');
    },
    [lit],
  );
  const tankBase = heightAt(WATER_TANK.E, WATER_TANK.N);
  const tankColor = lit ? '#E0A066' : '#C9C3B4';
  return (
    <group>
      <instancedMesh ref={wallsRef} args={[box, walls, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={capsRef} args={[roof, plain, 1]} castShadow receiveShadow raycast={() => null} />
      <mesh position={toWorld3(list[1].E, list[1].N, top(list[1]))} rotation={[0, -THREE.MathUtils.degToRad(list[1].angleDeg), 0]} castShadow raycast={() => null}>
        <boxGeometry args={[(list[1].widM - 0.6) / S, 0.35 / S, (list[1].lenM - 0.6) / S]} />
        <meshStandardMaterial color="#B2A992" roughness={0.95} />
      </mesh>
      <group position={toWorld3(WATER_TANK.E, WATER_TANK.N, tankBase - 0.3)}>
        {[
          [-1.3, -1.3],
          [1.3, -1.3],
          [1.3, 1.3],
          [-1.3, 1.3],
        ].map(([x, z], k) => (
          <mesh key={k} position={[x / S, 4.5 / S, z / S]} castShadow raycast={() => null}>
            <boxGeometry args={[0.35 / S, 9 / S, 0.35 / S]} />
            <meshStandardMaterial color="#6F6A5E" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 10.6 / S, 0]} castShadow receiveShadow raycast={() => null}>
          <cylinderGeometry args={[2.3 / S, 2.3 / S, 3.4 / S, 20]} />
          <meshStandardMaterial color={tankColor} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- the plan on the ground

/** Ground points along a polyline every ≤ 4 m, lifted just above the drawn mesh. */
function drape(pts: readonly Point[], liftM = LIFT_M): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.E - a.E, b.N - a.N) / 4));
    for (let i = 0; i < n; i++) {
      const E = a.E + ((b.E - a.E) * i) / n;
      const N = a.N + ((b.N - a.N) * i) / n;
      out.push(toWorld3(E, N, heightAt(E, N) + liftM));
    }
  }
  const z = pts[pts.length - 1];
  out.push(toWorld3(z.E, z.N, heightAt(z.E, z.N) + liftM));
  return out;
}

/** A chevron drawn on the ground at a leg's middle, pointing the way of travel. */
function chevron(a: Point, b: Point, sizeM: number): [number, number, number][] {
  const len = Math.hypot(b.E - a.E, b.N - a.N) || 1;
  const ux = (b.E - a.E) / len;
  const uy = (b.N - a.N) / len;
  const m = { E: (a.E + b.E) / 2 + ux * sizeM * 0.4, N: (a.N + b.N) / 2 + uy * sizeM * 0.4 };
  const p = (E: number, N: number): [number, number, number] => toWorld3(E, N, heightAt(E, N) + LIFT_M + 0.6);
  return [p(m.E - ux * sizeM + uy * sizeM * 0.8, m.N - uy * sizeM - ux * sizeM * 0.8), p(m.E, m.N), p(m.E - ux * sizeM - uy * sizeM * 0.8, m.N - uy * sizeM + ux * sizeM * 0.8)];
}

function PlanOnGround({ nodes, selection, showDirect }: { nodes: readonly RouteNode[]; selection: Selection; showDirect: boolean }) {
  const route = useMemo(() => drape(nodes), [nodes]);
  const legs = useMemo(() => legsOf(nodes), [nodes]);
  const selLeg = selection?.kind === 'leg' ? nodes.findIndex((n) => n.id === selection.from) : -1;
  const sel = useMemo(() => (selLeg >= 0 && legs[selLeg] ? drape([legs[selLeg].from, legs[selLeg].to], LIFT_M + 0.3) : null), [legs, selLeg]);
  const direct = useMemo(() => drape([START, DEST], LIFT_M - 0.4), []);
  return (
    <group>
      {showDirect && <Line points={direct} color="#FFFFFF" lineWidth={2.6} dashed dashSize={14 / S} gapSize={10 / S} renderOrder={1} transparent opacity={0.95} />}
      {/* a light casing, then the orange route on it: an overlay, never a road */}
      <Line points={route} color="#FDFBF3" lineWidth={7} renderOrder={2} depthWrite={false} />
      <Line points={route} color={ORANGE} lineWidth={4.2} renderOrder={3} />
      {sel && <Line points={sel} color={ORANGE} lineWidth={10} renderOrder={1} transparent opacity={0.42} depthWrite={false} />}
      {legs.map((l, k) => (l.distanceM > 60 ? <Line key={nodes[k].id} points={chevron(l.from, l.to, k === selLeg ? 12 : 8)} color="#FFFFFF" lineWidth={k === selLeg ? 3.2 : 2.4} renderOrder={4} /> : null))}
    </group>
  );
}

const AT_ENDS: readonly FeatureId[] = ['building', 'grove', 'rocks'];
const pill = 'whitespace-nowrap rounded-lg border bg-bg-elevated/95 px-2 py-0.5 font-display text-base font-bold leading-snug text-black shadow-elevated';

/**
 * A route point on the model. A press and a drag moves it over the ground (the
 * orbit waits); a click selects it. The map holds the keyboard path, so these
 * are pointer-only and hidden from assistive tech. A point the ground hides
 * from the camera (behind a ridge) is drawn as a faint dashed ghost that lets
 * the pointer through: it is not on the slope in front, so it cannot be
 * grabbed there — it is edited on the map, or from a view that sees it.
 */
function Handle({ n, index, nodes, selected, dragging, dispatch, onHidden }: { n: RouteNode; index: number; nodes: readonly RouteNode[]; selected: boolean; dragging: boolean; dispatch: (a: Action) => void; onHidden: (id: string, hidden: boolean) => void }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const press = useRef<{ x: number; y: number; id: number; moving: boolean } | null>(null);
  const raf = useRef(0);
  const next = useRef<Point | null>(null);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const h = heightAt(n.E, n.N);
  // Hidden or not: tested on rendered frames only, when the camera or the point has moved.
  const [hidden, setHidden] = useState(false);
  const seen = useRef({ x: NaN, y: NaN, z: NaN, E: NaN, N: NaN, hidden: false });
  useFrame(() => {
    const c = camera.position;
    const s = seen.current;
    if (c.x === s.x && c.y === s.y && c.z === s.z && n.E === s.E && n.N === s.N) return;
    Object.assign(s, { x: c.x, y: c.y, z: c.z, E: n.E, N: n.N });
    const occ = !press.current?.moving && behindGround(fromWorld3(c.x, c.y, c.z), n.E, n.N, h + LIFT_M);
    if (occ !== s.hidden) {
      s.hidden = occ;
      setHidden(occ);
      onHidden(n.id, occ);
    }
  });
  const can = editable(n);
  const checkNo = n.kind === 'check' ? nodes.slice(0, index + 1).filter((x) => x.kind === 'check').length : 0;
  const onIt = n.kind === 'check' && n.feature ? standsOn(n.feature, n) : true;

  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moving: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moving && can && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) {
      p.moving = true;
      if (controls) controls.enabled = false;
      dispatch({ type: 'dragStart', id: n.id });
    }
    if (!p.moving) return;
    next.current = groundUnder(camera, gl.domElement, e.clientX, e.clientY);
    if (!raf.current)
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        if (next.current) dispatch({ type: 'drag', at: next.current });
      });
  };
  const onUp = (e: ReactPointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (controls) controls.enabled = true;
    if (p.moving) {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        if (next.current) dispatch({ type: 'drag', at: next.current });
      }
      dispatch({ type: 'dragEnd' });
    } else dispatch({ type: 'select', selection: { kind: 'node', id: n.id } });
  };

  const end = n.kind === 'start' || n.kind === 'end';
  return (
    // The wrapper is laid out left-to-right: in the RTL page its zero-width box would otherwise grow
    // leftward from the anchor and put the handle one width off its point (see shot-terrain-nav).
    <Html position={toWorld3(n.E, n.N, h + LIFT_M)} center zIndexRange={[40, 10]} wrapperClass="[direction:ltr]">
      <span
        aria-hidden
        data-model-node={n.id}
        data-kind={n.kind}
        data-occluded={hidden ? 'true' : undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`relative block touch-none select-none`}
        style={hidden ? { pointerEvents: 'none' } : { cursor: can ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}
      >
        {end && (
          <span dir="rtl" className={`${pill} ${hidden ? 'opacity-75' : ''}`} style={{ position: 'absolute', left: '50%', bottom: 'calc(100% + 6px)', transform: 'translateX(-50%)', borderColor: 'rgba(56,67,46,0.35)' }}>
            {n.kind === 'start' ? 'מוצא' : 'יעד'}
          </span>
        )}
        {hidden ? (
          // behind the ground: a hollow dashed ring of the same size, no fill to stand on the slope in front
          <span
            className={`flex items-center justify-center rounded-full border-[3px] border-dashed border-white bg-black/30 font-display font-extrabold text-white ${end ? 'size-9 text-lg' : n.kind === 'check' ? 'size-8 text-base' : 'size-6'} ${selected ? 'ring-4 ring-accent/45' : ''}`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)', boxShadow: '0 0 0 2px rgba(217,126,43,0.95), 0 1px 4px rgba(0,0,0,0.35)' }}
          >
            {end ? (n.kind === 'start' ? 'A' : 'B') : n.kind === 'check' ? checkNo : null}
          </span>
        ) : end ? (
          <span className={`flex size-9 items-center justify-center rounded-full border-[3px] border-white bg-accent font-display text-lg font-extrabold text-white shadow-elevated ${selected ? 'ring-4 ring-accent/40' : ''}`}>{n.kind === 'start' ? 'A' : 'B'}</span>
        ) : n.kind === 'check' ? (
          <span
            className={`flex size-8 items-center justify-center rounded-full border-[3px] font-display text-base font-extrabold shadow-elevated ${onIt ? 'border-white bg-brand-dark text-white' : 'border-dashed border-accent bg-bg-elevated text-black'} ${selected ? 'ring-4 ring-accent/45' : ''}`}
          >
            {checkNo}
          </span>
        ) : (
          <span className={`flex size-6 items-center justify-center rounded-full border-[3.5px] border-accent bg-white shadow-elevated ${selected || dragging ? 'ring-4 ring-accent/45' : ''}`}>
            <span className="size-1.5 rounded-full bg-accent" />
          </span>
        )}
      </span>
    </Html>
  );
}

/** Name labels: the selected feature, and the selected leg's tag. */
function Labels({ nodes, selection, highlights }: { nodes: readonly RouteNode[]; selection: Selection; highlights: readonly FeatureId[] }) {
  const legs = legsOf(nodes);
  const selLeg = selection?.kind === 'leg' ? nodes.findIndex((n) => n.id === selection.from) : -1;
  const leg = selLeg >= 0 ? legs[selLeg] : null;
  return (
    <>
      {highlights.slice(0, 1).map((id) => {
        const f = featureOf(id);
        return (
          // a feature at A or B (the building, the grove, the rocks) is named above the end's own tag
          <Html key={id} position={toWorld3(f.anchor.E, f.anchor.N, heightAt(f.anchor.E, f.anchor.N) + (AT_ENDS.includes(id) ? 185 : 38))} center zIndexRange={[30, 0]} wrapperClass="[direction:ltr]" style={{ pointerEvents: 'none' }}>
            <span dir="rtl" data-model-label={id} className={pill} style={{ borderColor: 'rgba(217,126,43,0.7)' }}>
              {f.name}
            </span>
          </Html>
        );
      })}
      {leg && (
        <Html
          position={toWorld3((leg.from.E + leg.to.E) / 2, (leg.from.N + leg.to.N) / 2, heightAt((leg.from.E + leg.to.E) / 2, (leg.from.N + leg.to.N) / 2) + 30)}
          center
          zIndexRange={[30, 0]}
          wrapperClass="[direction:ltr]"
          style={{ pointerEvents: 'none' }}
        >
          <span dir="rtl" data-model-label="leg" className={pill} style={{ borderColor: 'rgba(217,126,43,0.7)' }}>
            {`קטע ${selLeg + 1} · ${Math.round(leg.distanceM)} מ׳`}
          </span>
        </Html>
      )}
    </>
  );
}

// ---------------------------------------------------------------- sky, light, shadows

/** Sun from the west-north-west, low: every slope seen from the south is side-lit, so summits, spurs and the saddle read by light and shade. */
const SUN_DIR = (() => {
  const az = THREE.MathUtils.degToRad(255);
  const el = THREE.MathUtils.degToRad(30);
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
    o.position.set(...toWorld3(SHEET_CENTER.E, SHEET_CENTER.N, 370));
    return o;
  }, []);
  const pos = useMemo(() => {
    const t = target.position;
    return [t.x + SUN_DIR.x * 30, t.y + SUN_DIR.y * 30, t.z + SUN_DIR.z * 30] as [number, number, number];
  }, [target]);
  const half = 1000 / S;
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={pos}
        target={target}
        intensity={3.4}
        color="#FFEBD0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0008}
        shadow-normalBias={0.05}
        shadow-radius={3}
      />
      <hemisphereLight color="#D6E2EC" groundColor="#6B5E42" intensity={1.15} />
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
    scene.fog = new THREE.FogExp2(new THREE.Color('#E2E3DA'), 0.019);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

/** drei's loader count, passed up while it is loading (the wrapper's bar fills over its sheen). */
function Progress({ onProgress }: { onProgress?: (p: number | undefined) => void }) {
  const { active, progress } = useProgress();
  useEffect(() => onProgress?.(active ? progress : undefined), [active, progress, onProgress]);
  return null;
}

function World({ highlights, onReady }: { highlights: readonly FeatureId[]; onReady?: () => void }) {
  return (
    <>
      <Terrain highlights={highlights} />
      <Stream />
      <TreeKind kind="pine" lit={highlights.includes('grove')} />
      <TreeKind kind="oak" lit={false} />
      <TreeKind kind="olive" lit={highlights.includes('orchard')} />
      <Maquis />
      <Boulders lit={highlights.includes('rocks')} />
      <Building lit={highlights.includes('building')} />
      <StaticShadows onReady={onReady} />
    </>
  );
}

export default function PlanningLab3D({ view, reduce, nodes, selection, showDirect, highlights, dragging, dispatch, onGround, onReady, onProgress, onHidden, pointerScale = 1 }: Lab3DProps) {
  // the hidden route points, told up as one flag
  const hiddenIds = useRef(new Set<string>());
  const onHandleHidden = useCallback(
    (id: string, hidden: boolean) => {
      const set = hiddenIds.current;
      const before = set.size > 0;
      if (hidden) set.add(id);
      else set.delete(id);
      if (set.size > 0 !== before) onHidden?.(set.size > 0);
    },
    [onHidden],
  );
  useEffect(() => {
    // a removed point is no longer hidden
    const set = hiddenIds.current;
    const before = set.size > 0;
    for (const id of [...set]) if (!nodes.some((n) => n.id === id)) set.delete(id);
    if (set.size > 0 !== before) onHidden?.(set.size > 0);
  }, [nodes, onHidden]);
  // Dev-only: the bare terrain for the no-WebGL still (scripts/qa/shot-planning-lab.mjs) — no plan drawn on it.
  const bare = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && !!(window as unknown as { __plBare?: boolean }).__plBare;
  const home = useMemo(() => {
    const t = toWorld3(HOME_VIEW.targetE, HOME_VIEW.targetN, HOME_VIEW.targetHeightM);
    const polar = THREE.MathUtils.degToRad(HOME_VIEW.polarDeg);
    const az = THREE.MathUtils.degToRad(HOME_VIEW.azimuthDeg);
    const r = HOME_VIEW.distanceM / S;
    return { target: t, pos: [t[0] + r * Math.sin(polar) * Math.sin(az), t[1] + r * Math.cos(polar), t[2] + r * Math.sin(polar) * Math.cos(az)] as [number, number, number] };
  }, []);
  return (
    <Canvas
      aria-hidden
      dpr={[1, 1.5]}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 38, near: 5 / S, far: 30000 / S, position: home.pos }}
      frameloop="demand"
      // Inside the lesson's LessonViewportFit: size from the untransformed box.
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.98;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneSetup />
      <OrbitControls
        makeDefault
        target={home.target}
        enableDamping
        dampingFactor={0.1}
        minDistance={250 / S}
        maxDistance={3200 / S}
        maxPolarAngle={THREE.MathUtils.degToRad(78)}
        zoomSpeed={0.9}
        rotateSpeed={1 / pointerScale}
        panSpeed={1 / pointerScale}
        screenSpacePanning={false}
      />
      <CameraRig view={view} reduce={reduce} />
      <Picker onGround={onGround} />
      <Progress onProgress={onProgress} />
      <SkyDome />
      <Sun />
      <Suspense fallback={null}>
        <World highlights={highlights} onReady={onReady} />
      </Suspense>
      {!bare && (
        <>
          <PlanOnGround nodes={nodes} selection={selection} showDirect={showDirect} />
          {nodes.map((n, i) => (
            <Handle key={n.id} n={n} index={i} nodes={nodes} selected={selection?.kind === 'node' && selection.id === n.id} dragging={dragging === n.id} dispatch={dispatch} onHidden={onHandleHidden} />
          ))}
          <Labels nodes={nodes} selection={selection} highlights={highlights} />
        </>
      )}
    </Canvas>
  );
}
