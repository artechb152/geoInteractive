'use client';

import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import { QualityCanvas } from '@/components/three/QualityCanvas';
import type { ViewStore } from '../terrain-nav/terrainNavViewStore';
import { DEST, START, STREAM, WATER_TANK, WORLD, type Point } from './planningLabWorld';
import { bedStones, behindGround, boulders, buildings, crownShape, heightAt, insideSheet, shrubs, terrainMeshArrays, trees, understory, waterCourses, type Boulder, type Shrub, type Tree } from './planningLabTerrain';
import { featureOf, legsOf, standsOn, type FeatureId } from './planningLabPlan';
import { editable, type Action, type RouteNode, type Selection, type Tool } from './planningLabState';
import { FEATURE_INDEX, buildAnalysisTexture, buildFeatureIdTexture, buildGroundAreas, buildGroundLines, buildShadeTexture, buildToneTexture, createHighlightMask } from './planningLabMaterials';
import { LAYERS, createLabGroundMaterial, stripToArray } from './planningLabGround';
import { crownGeometry, foliageMaterial, liftShade, rockMaterial, shrubGeometry, trunkGeometry } from './planningLabCover';
import { concreteMaterial, skyMaterial, stoneWallMaterial, tileRoofMaterial, waterMaterial } from './planningLabScenery';
import { WORLD3D, fromWorld3, toWorld3 } from './planningLabView';

/**
 * The live terrain model of the planning lab. Everything it shows comes from
 * planningLabTerrain — the same height grid as the map's contours:
 *
 *   terrain  the 5 m sheet grid with its SW–NE triangles, unexaggerated, and an
 *            apron of the same generator to the hazy horizon (normals evened
 *            out over the apron's long cells); shaded by this lab's own ground
 *            (planningLabGround): where each kind of ground lies is read from the
 *            land — slope and aspect, relief, the sky each point sees, drainage
 *            and wetness (planningLabAnalysis), the map's own roads, beds,
 *            grove, woodland and orchard — and eight scanned CC0 layers at their
 *            true size give the surface; the contact shade of all the cover.
 *   cover    every tree, shrub and boulder of the shared lists as instances on
 *            heightAt() — umbrella pines whose crowns meet over the grove, low
 *            oak domes, thickets of two or three bushes, tapered trunks
 *            (planningLabCover); scanned limestone rocks; model-only cover below
 *            the map's threshold: the grove's understory, the banks' shrubs,
 *            stones in the beds; the stone house, its annex and the water tank
 *            at A, the stream's water (planningLabScenery).
 *   air      a sky photograph, a low west-north-west sun with soft
 *            shadows, and a thin haze of the sky's own horizon colour.
 *   plan     the learner's route draped on the ground (sampled every 4 m), the
 *            straight line, and handles for every route point.
 *
 * A handle can be dragged on the model: the pointer ray is marched over
 * heightAt() — the drawn surface — and the orbit is held while it moves. A
 * click on the ground (not a drag) is handed up as a ground point; the tool
 * decides what it does. Frames render on demand; the shadow map is drawn once
 * (the world is static) and dragging only moves the route. The canvas is
 * supersampled within a pixel budget (Resolution), stepping down only while a
 * slow GPU moves the view.
 */

const S = WORLD3D.metresPerUnit;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/**
 * The lab's own ground scans, sky and rocks (CC0, Poly Haven; scripts/build-planning-lab-assets.mjs — the
 * sky and the rocks copies of the navigation replay's, so a change to either model's files leaves the other as it is).
 */
const DIR = `${BASE}/assets/lessons/topic06/planning-lab`;
/** The ground's eight scanned layers, each a strip of square layers (albedo; normal X / Y + displacement). */
const STRIP_URLS = [`${DIR}/terrain/albedo.webp`, `${DIR}/terrain/normal.webp`];
const SKY_URL = `${DIR}/sky.webp`;
const ROCKS_URL = `${DIR}/rocks.glb`;

const SHEET_CENTER = { E: 545, N: 610 };
/**
 * Opening view: from the south, high enough to see behind the ridge — A in front, the saddle in the
 * middle between the two summits (both whole in the frame), the ravine climbing to it, B beyond.
 */
export const HOME_VIEW = { targetE: 615, targetN: 650, targetHeightM: 400, distanceM: 1500, polarDeg: 58, azimuthDeg: 5 } as const;

const ACCENT = new THREE.Color('#D97E2B');
/** The haze at the horizon (sRGB #C3CDD3): the sky photograph's own colour there, and the fog's. */
const HAZE = new THREE.Color('#C3CDD3');
/** What the stream mirrors at a glancing angle: the sky a little above the horizon (linear, before tone mapping). */
const SKY_REFLECTION = new THREE.Color('#B4C6D8');
/**
 * Crown tones, dark to light: Aleppo pine a grey, slightly bluish green, so the grove reads as a dark
 * wood of many crowns from afar; kermes oak the deep green of the hills; olive silver-grey.
 */
const CROWN_HERE: Record<Tree['kind'], [THREE.Color, THREE.Color]> = {
  pine: [new THREE.Color('#33452F'), new THREE.Color('#58704A')],
  oak: [new THREE.Color('#2F3E22'), new THREE.Color('#4E5E32')],
  olive: [new THREE.Color('#646C52'), new THREE.Color('#8A9172')],
};
/** Bark: Aleppo pine grey-brown with a red tinge, oak darker, olive grey. */
const BARK: Record<Tree['kind'], string> = { pine: '#6A5747', oak: '#544A3E', olive: '#6E6656' };
/**
 * The maquis, by its plants: lentisk and phillyrea dark evergreen, calicotome olive, rock-rose grey-green,
 * thorny burnet low and grey-brown in the dry season.
 */
const MAQUIS = ['#35422A', '#435033', '#59603A', '#6A6F52', '#756C55'].map((c) => new THREE.Color(c));
/** The understory and the banks: greener, fresher growth (lentisk, buckthorn; oleander, bramble). */
const LUSH = ['#33432A', '#3D4E2C', '#4A5C33', '#57683A', '#5E6640'].map((c) => new THREE.Color(c));
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
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
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
    const w = window as unknown as { __plProbe?: (E: number, N: number, h?: number) => [number, number, boolean]; __plCamera?: (eye: GP, at: GP) => void; __plRender?: () => { calls: number; triangles: number; textures: number; geometries: number } };
    w.__plRender = () => {
      // instanced cover: how many of each shape, at how many triangles each
      const cover: Record<string, { n: number; tris: number }> = {};
      scene.traverse((o) => {
        const im = o as THREE.InstancedMesh;
        if (!im.isInstancedMesh) return;
        const key = (im.material as THREE.Material).customProgramCacheKey?.() ?? im.uuid;
        const tris = (im.geometry.index ? im.geometry.index.count : im.geometry.getAttribute('position').count) / 3;
        const c = (cover[key] ??= { n: 0, tris: 0 });
        c.n += im.count;
        c.tris += im.count * tris;
      });
      const buf = gl.getDrawingBufferSize(new THREE.Vector2());
      return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, geometries: gl.info.memory.geometries, pixelRatio: gl.getPixelRatio(), buffer: [buf.x, buf.y], cover };
    };
    // GPU cost of one frame: n frames drawn back to back, finished by a pixel read — at the canvas'
    // own pixel ratio, or at `dpr` for the measurement (restored after it)
    (w as unknown as { __plBench?: (n: number, dpr?: number) => number }).__plBench = (n, dpr) => {
      const own = gl.getPixelRatio();
      if (dpr) gl.setPixelRatio(dpr);
      const px = new Uint8Array(4);
      const ctx = gl.getContext();
      gl.render(scene, camera);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
      const t = performance.now();
      for (let k = 0; k < n; k++) gl.render(scene, camera);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
      const ms = (performance.now() - t) / n;
      if (dpr) gl.setPixelRatio(own);
      invalidate();
      return ms;
    };
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
      delete w.__plRender;
    };
  }, [camera, controls, gl, scene, invalidate, size.width, size.height]);

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
    // dev-only: frames drawn so far (the QA checks the model rests when nothing moves)
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __plFrames?: number };
      w.__plFrames = (w.__plFrames ?? 0) + 1;
    }
  });
  return null;
}

// ---------------------------------------------------------------- terrain and water

/**
 * Vertex normals of the terrain grid by central differences, each over about the same ground distance
 * along both axes: on the sheet ±5 m; on the apron, where the rows lie up to hundreds of metres apart
 * while the columns stay 5 m apart, the short axis is differenced over as long a stretch as the long one.
 * (Averaged triangle normals there would shade the 5 m relief into long streaks across the far land.)
 */
function gridNormals(positions: Float32Array, nx: number, ny: number, xs: readonly number[], ns: readonly number[]) {
  const out = new Float32Array(nx * ny * 3);
  const y = (i: number, j: number) => positions[(j * nx + i) * 3 + 1] * S;
  const span = (a: readonly number[], k: number) => (a[Math.min(a.length - 1, k + 1)] - a[Math.max(0, k - 1)]) / (k > 0 && k < a.length - 1 ? 2 : 1);
  const n = new THREE.Vector3();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const reach = Math.max(span(xs, i), span(ns, j));
      let si = 1;
      while (si < 64 && (xs[Math.min(nx - 1, i + si)] - xs[Math.max(0, i - si)]) / 2 < reach * 0.9) si++;
      let sj = 1;
      while (sj < 64 && (ns[Math.min(ny - 1, j + sj)] - ns[Math.max(0, j - sj)]) / 2 < reach * 0.9) sj++;
      const i0 = Math.max(0, i - si);
      const i1 = Math.min(nx - 1, i + si);
      const j0 = Math.max(0, j - sj);
      const j1 = Math.min(ny - 1, j + sj);
      const dE = (y(i1, j) - y(i0, j)) / (xs[i1] - xs[i0]);
      const dN = (y(i, j1) - y(i, j0)) / (ns[j1] - ns[j0]);
      // three: x east, z south — the normal of h(E, N) is (−∂h/∂E, 1, +∂h/∂N)
      n.set(-dE, 1, dN).normalize();
      out.set([n.x, n.y, n.z], (j * nx + i) * 3);
    }
  }
  return out;
}

type GroundSet = { albedo: THREE.DataArrayTexture; normal: THREE.DataArrayTexture; means: THREE.Vector3[] };

function Terrain({ ground, highlights }: { ground: GroundSet; highlights: readonly FeatureId[] }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    const { positions, index, nx, ny, xs, ns } = terrainMeshArrays(toWorld3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.setAttribute('normal', new THREE.BufferAttribute(gridNormals(positions, nx, ny, xs, ns), 3));
    geo.computeBoundingSphere();
    return geo;
  }, []);
  const lines = useMemo(buildGroundLines, []);
  const areas = useMemo(buildGroundAreas, []);
  const analysis = useMemo(buildAnalysisTexture, []);
  const ids = useMemo(buildFeatureIdTexture, []);
  const tone = useMemo(buildToneTexture, []);
  const shade = useMemo(buildShadeTexture, []);
  const hl = useMemo(() => createHighlightMask(ids), [ids]);
  const material = useMemo(() => {
    lines.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return createLabGroundMaterial(ground, { lines, areas, tone, analysis, shade, hlMask: hl.texture });
  }, [ground, lines, areas, tone, analysis, shade, hl, gl]);
  useEffect(() => {
    hl.update(highlights.slice(0, 3).map((h) => FEATURE_INDEX[h] ?? 0));
    invalidate();
  }, [highlights, hl, invalidate]);
  // the angle of one drawn pixel, for the shader's metres-per-pixel (fov and canvas size change with full screen)
  const px = useMemo(() => new THREE.Vector2(), []);
  useFrame(({ camera }) => {
    const fov = (camera as THREE.PerspectiveCamera).fov;
    gl.getDrawingBufferSize(px);
    (material.userData.uniforms as { uPxAngle: { value: number } }).uPxAngle.value = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / Math.max(1, px.y);
  });
  useEffect(
    () => () => {
      geometry.dispose();
      lines.dispose();
      areas.dispose();
      analysis.dispose();
      ids.dispose();
      tone.dispose();
      shade.dispose();
      hl.texture.dispose();
      material.dispose();
    },
    [geometry, lines, areas, analysis, ids, tone, shade, hl, material],
  );
  return <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />;
}

/** The stream's water: a ribbon on its bed, its edges (aAcross 0 and 1) fading into the wet bank. */
function Stream() {
  const geo = useMemo(() => {
    const pts = waterCourses().stream.pts;
    const half = STREAM.waterWidthM / 2;
    const pos: number[] = [];
    const across: number[] = [];
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
      across.push(0, 1);
      if (k) {
        const o = (k - 1) * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => waterMaterial(SKY_REFLECTION), []);
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

/** A small 0…1 hash of an instance's own numbers, for variety that the shared lists don't carry. */
const hash01 = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Splits a list into `n` shapes by a hash of each item's place, so neighbours differ. */
function byShape<T extends { E: number; N: number }>(list: readonly T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  for (const t of list) out[Math.min(n - 1, Math.floor(hash01(t.N * 1.7 + 3.1, t.E * 0.3) * n))].push(t);
  return out;
}

const CROWN_SHAPES = 4;
/** Leaf clumps (metres) and how open the crown is between them, per kind. */
const FOLIAGE: Record<Tree['kind'], { clumpM: number; gap: number }> = { pine: { clumpM: 0.62, gap: 0.55 }, oak: { clumpM: 0.7, gap: 0.42 }, olive: { clumpM: 0.5, gap: 0.5 } };

function Crowns({ kind, shape, list, material, lit }: { kind: Tree['kind']; shape: number; list: readonly Tree[]; material: THREE.Material; lit: boolean }) {
  const geo = useMemo(() => liftShade(crownGeometry(kind, shape), 0.42), [kind, shape]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const t = list[i];
      const cs = crownShape(t);
      // the crown's own variety: a little wider one way than the other, a shade warmer or bluer, lighter or darker
      const a = hash01(t.E, t.N);
      const b = hash01(t.N, t.E);
      q.setFromAxisAngle(UP, t.spin);
      // the grove's pines spread 1.22× the map's crown circle and sit a little lower on the stem: their
      // crowns meet as the canopy of a planted pine wood, read as one grove from afar
      const wide = kind === 'pine' ? 1.22 : 1;
      const lower = kind === 'pine' ? cs.halfHeightM * 0.12 : 0;
      m.compose(new THREE.Vector3(...toWorld3(cs.E, cs.N, cs.centerM - lower)), q, new THREE.Vector3((cs.radiusM * wide * (0.86 + 0.28 * a)) / S, cs.halfHeightM / S, (cs.radiusM * wide * (0.86 + 0.28 * b)) / S));
      c.copy(CROWN_HERE[kind][0]).lerp(CROWN_HERE[kind][1], t.tone);
      c.offsetHSL((a - 0.5) * 0.05, 0, (b - 0.5) * 0.07);
      if (lit) c.lerp(ACCENT, 0.45);
    },
    [lit, list],
  );
  // crowns cast on the ground but take no shadow from their neighbours: a dense grove stays green, not black
  return <instancedMesh ref={ref} args={[geo, material, list.length]} castShadow raycast={() => null} />;
}

function TrunkShape({ kind, shape, list, material }: { kind: Tree['kind']; shape: number; list: readonly Tree[]; material: THREE.Material }) {
  const geo = useMemo(() => trunkGeometry(shape + (kind === 'pine' ? 0 : 7)), [kind, shape]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const t = list[i];
      const cs = crownShape(t);
      // a pine's stem a little thicker for its height; it runs up into the crown
      const r = (kind === 'pine' ? 0.2 : 0.17) + t.crownR * 0.035;
      q.setFromAxisAngle(UP, t.spin);
      m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.5)), q, new THREE.Vector3(r / S, (cs.centerM - t.baseM + 0.5) / S, r / S));
      c.setScalar(0.88 + 0.24 * hash01(t.N, t.E));
    },
    [list],
  );
  return <instancedMesh ref={ref} args={[geo, material, list.length]} castShadow receiveShadow raycast={() => null} />;
}

function TreeKind({ kind, lit }: { kind: Tree['kind']; lit: boolean }) {
  const list = useMemo(() => trees().filter((t) => t.kind === kind), [kind]);
  const shapes = useMemo(() => byShape(list, CROWN_SHAPES), [list]);
  const crownMat = useMemo(() => foliageMaterial(`crown-${kind}`, { ...FOLIAGE[kind], pale: 0.4 }), [kind]);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BARK[kind], roughness: 0.95, metalness: 0 }), [kind]);
  useEffect(
    () => () => {
      crownMat.dispose();
      trunkMat.dispose();
    },
    [crownMat, trunkMat],
  );
  return (
    <group>
      {shapes.map((l, k) => (
        <Crowns key={k} kind={kind} shape={k} list={l} material={crownMat} lit={lit} />
      ))}
      {shapes.map((l, k) => (
        <TrunkShape key={k} kind={kind} shape={k} list={l} material={trunkMat} />
      ))}
    </group>
  );
}

const SHRUB_SHAPES = 6;

function ShrubShape({ shape, list, material, palette }: { shape: number; list: readonly Shrub[]; material: THREE.Material; palette: readonly THREE.Color[] }) {
  const geo = useMemo(() => liftShade(shrubGeometry(shape), 0.5), [shape]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      q.setFromAxisAngle(UP, s.spin);
      // the clump covers the listed footprint; sunk a little into the slope
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - 0.25)), q, new THREE.Vector3((s.radiusM * 0.95) / S, (s.heightM * 1.05) / S, (s.radiusM * 0.95) / S));
      // its plant: the darker evergreens most often, the grey and brown dwarf shrubs on the drier ground
      const g = hash01(s.E, s.N);
      const k = g < 0.32 ? 0 : g < 0.55 ? 1 : g < 0.72 ? 2 : g < 0.88 ? 3 : 4;
      c.copy(palette[k]).lerp(palette[Math.min(4, k + 1)], s.tone * 0.35);
      c.offsetHSL(0, 0, (hash01(s.N, s.E) - 0.5) * 0.04);
    },
    [list, palette],
  );
  return <instancedMesh ref={ref} args={[geo, material, list.length]} castShadow receiveShadow raycast={() => null} />;
}

/**
 * Maquis: thickets of two or three bushes, dark evergreen to grey-green and grey-brown; the grove's
 * understory and the banks' strip greener. Far off it shrinks into the ground's scrub tone.
 */
function Maquis() {
  const shapes = useMemo(() => byShape(shrubs(), SHRUB_SHAPES), []);
  const lush = useMemo(() => byShape(understory(), SHRUB_SHAPES), []);
  const mat = useMemo(() => foliageMaterial('maquis', { clumpM: 0.42, gap: 0.36, shrinkM: [1350, 2500] }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group>
      {shapes.map((l, k) => (
        <ShrubShape key={k} shape={k} list={l} material={mat} palette={MAQUIS} />
      ))}
      {lush.map((l, k) => (
        <ShrubShape key={`u${k}`} shape={k} list={l} material={mat} palette={LUSH} />
      ))}
    </group>
  );
}

type RockPart = { geometry: THREE.BufferGeometry; source: THREE.MeshStandardMaterial; stone: boolean };

/** The scans of rocks.glb, each moved to stand on its own base at the origin and scaled to 1 m across. */
function rockParts(scene: THREE.Object3D): RockPart[] {
  const out: RockPart[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const across = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2).scale(1 / across, 1 / across, 1 / across);
    g.computeBoundingSphere();
    out.push({ geometry: g, source: mesh.material as THREE.MeshStandardMaterial, stone: mesh.name.startsWith('stone') });
  });
  return out;
}

function RockSet({ part, list, material, lit }: { part: RockPart; list: readonly Boulder[]; material: THREE.Material; lit: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const s = list[i];
      // across: the blocks at B a little larger than their spacing, the lone boulders about as drawn before
      const across = s.sizeM * (s.atB ? 1.5 : 1.7);
      const a = hash01(s.E, s.N);
      e.set((a - 0.5) * 0.3, s.spin, (hash01(s.N, s.E) - 0.5) * 0.3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - across * 0.1)), q, new THREE.Vector3(across / S, (across * (0.8 + 0.4 * a)) / S, across / S));
      c.setScalar(0.84 + 0.28 * s.tone);
      if (lit && s.atB) c.lerp(ACCENT, 0.5);
    },
    [lit, list],
  );
  return <instancedMesh ref={ref} args={[part.geometry, material, list.length]} castShadow receiveShadow raycast={() => null} />;
}

/** Boulders and the rocks at B: scanned limestone. Small ones are stones, larger ones rocks; the lone ones shrink away far off. */
function Boulders({ rocks, lit }: { rocks: THREE.Object3D; lit: boolean }) {
  const parts = useMemo(() => rockParts(rocks), [rocks]);
  const mats = useMemo(() => {
    const lone = new Map<THREE.Material, THREE.Material>();
    const kept = new Map<THREE.Material, THREE.Material>();
    for (const p of parts) {
      if (!lone.has(p.source)) lone.set(p.source, rockMaterial(p.source, `lone-${p.source.name}`, { shrinkM: [1100, 2100] }));
      if (!kept.has(p.source)) kept.set(p.source, rockMaterial(p.source, `kept-${p.source.name}`, {}));
    }
    return { lone, kept };
  }, [parts]);
  useEffect(
    () => () => {
      parts.forEach((p) => p.geometry.dispose());
      [...mats.lone.values(), ...mats.kept.values()].forEach((m) => m.dispose());
    },
    [parts, mats],
  );
  const sets = useMemo(() => {
    const all = [...boulders(), ...bedStones()];
    const stones = parts.filter((p) => p.stone);
    const rocks = parts.filter((p) => !p.stone);
    return [
      ...byShape(all.filter((b) => !b.atB && b.sizeM < 0.95), stones.length).map((list, k) => ({ part: stones[k], list, kept: false })),
      ...byShape(all.filter((b) => !b.atB && b.sizeM >= 0.95), rocks.length).map((list, k) => ({ part: rocks[k], list, kept: false })),
      ...byShape(all.filter((b) => b.atB), rocks.length).map((list, k) => ({ part: rocks[k], list, kept: true })),
    ].filter((s) => s.list.length);
  }, [parts]);
  return (
    <group>
      {sets.map((s, k) => (
        <RockSet key={k} part={s.part} list={s.list} material={(s.kept ? mats.kept : mats.lone).get(s.part.source)!} lit={lit} />
      ))}
    </group>
  );
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

/** The tank's drum: 3.4 m tall, about its own centre. */
const DRUM_HALF_M = 1.7;

/** The prominent building at A: coursed stone walls with windows, a tiled hip roof, a flat-roofed annex, and the water tank on its stand. */
function Building({ lit }: { lit: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const list = useMemo(() => buildings(), []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const roof = useMemo(roofGeometry, []);
  const walls = useMemo(stoneWallMaterial, []);
  const tiles = useMemo(tileRoofMaterial, []);
  const annexRoof = useMemo(() => concreteMaterial('#B2A992', 'annex'), []);
  const drum = useMemo(() => concreteMaterial('#C9C3B4', 'tank', { streaks: true, topM: DRUM_HALF_M }), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5F5A50', roughness: 0.7, metalness: 0.3 }), []);
  const wallsRef = useRef<THREE.InstancedMesh>(null);
  const capsRef = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      box.dispose();
      roof.dispose();
      walls.dispose();
      tiles.dispose();
      annexRoof.dispose();
      drum.dispose();
      steel.dispose();
    },
    [box, roof, walls, tiles, annexRoof, drum, steel],
  );
  useEffect(() => {
    drum.color.set(lit ? '#E0A066' : '#C9C3B4');
    invalidate();
  }, [lit, drum, invalidate]);
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
  return (
    <group>
      <instancedMesh ref={wallsRef} args={[box, walls, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={capsRef} args={[roof, tiles, 1]} castShadow receiveShadow raycast={() => null} />
      <mesh position={toWorld3(list[1].E, list[1].N, top(list[1]))} rotation={[0, -THREE.MathUtils.degToRad(list[1].angleDeg), 0]} material={annexRoof} castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[(list[1].widM - 0.6) / S, 0.35 / S, (list[1].lenM - 0.6) / S]} />
      </mesh>
      <group position={toWorld3(WATER_TANK.E, WATER_TANK.N, tankBase - 0.3)}>
        {[
          [-1.3, -1.3],
          [1.3, -1.3],
          [1.3, 1.3],
          [-1.3, 1.3],
        ].map(([x, z], k) => (
          <mesh key={k} position={[x / S, 4.5 / S, z / S]} material={steel} castShadow raycast={() => null}>
            <boxGeometry args={[0.35 / S, 9 / S, 0.35 / S]} />
          </mesh>
        ))}
        <mesh position={[0, 10.6 / S, 0]} material={drum} castShadow receiveShadow raycast={() => null}>
          <cylinderGeometry args={[2.3 / S, 2.3 / S, (DRUM_HALF_M * 2) / S, 28]} />
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
  // built with the legs: new points on every render rebuild drei's Lines
  const chevrons = useMemo(() => legs.map((l, k) => (l.distanceM > 60 ? chevron(l.from, l.to, k === selLeg ? 12 : 8) : null)), [legs, selLeg]);
  return (
    <group>
      {showDirect && <Line points={direct} color="#FFFFFF" lineWidth={2.6} dashed dashSize={14 / S} gapSize={10 / S} renderOrder={1} transparent opacity={0.95} />}
      {/* a light casing, then the orange route on it: an overlay, never a road */}
      <Line points={route} color="#FDFBF3" lineWidth={7} renderOrder={2} depthWrite={false} />
      <Line points={route} color={ORANGE} lineWidth={4.2} renderOrder={3} />
      {sel && <Line points={sel} color={ORANGE} lineWidth={10} renderOrder={1} transparent opacity={0.42} depthWrite={false} />}
      {chevrons.map((pts, k) => (pts ? <Line key={nodes[k].id} points={pts} color="#FFFFFF" lineWidth={k === selLeg ? 3.2 : 2.4} renderOrder={4} /> : null))}
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
const SUN_AZ_DEG = 255;
const SUN_DIR = (() => {
  const az = THREE.MathUtils.degToRad(SUN_AZ_DEG);
  const el = THREE.MathUtils.degToRad(30);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
})();

function SkyDome({ texture }: { texture: THREE.Texture }) {
  const camera = useThree((s) => s.camera);
  const mat = useMemo(() => skyMaterial(texture, SUN_AZ_DEG, HAZE), [texture]);
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
        intensity={3.7}
        color="#FFE7CC"
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
        shadow-radius={2.5}
      />
      <hemisphereLight color="#BFD3EA" groundColor="#7A6A4E" intensity={1.0} />
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
    // the haze is the sky's own horizon colour, so the far hills fade into it without a seam
    scene.fog = new THREE.FogExp2(HAZE.clone(), 0.013);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

/**
 * Pixels drawn per CSS pixel at rest: as many as fit a budget of about 3.2 million, between 1 and 2 (and
 * never fewer than the screen's own). In the lesson's panel that is twice the panel's size each way —
 * every shrub, road and ridge line supersampled — and in full screen as much as the budget allows.
 * QualityCanvas owns the pixel ratio: on a slow GPU a moving view (an orbit, a dragged point) steps
 * down and the view rests sharp again; a fast GPU never steps down.
 */
const PIXEL_BUDGET = 3.2e6;

/** drei's loader count, passed up while it is loading (the wrapper's bar fills over its sheen). */
function Progress({ onProgress }: { onProgress?: (p: number | undefined) => void }) {
  const { active, progress } = useProgress();
  useEffect(() => onProgress?.(active ? progress : undefined), [active, progress, onProgress]);
  return null;
}

function World({ highlights, onReady }: { highlights: readonly FeatureId[]; onReady?: () => void }) {
  const gl = useThree((s) => s.gl);
  // Every file first, here: until all have loaded nothing below renders, so the one-off maps (the
  // contact shade, the masks) are built once — not again on each render while the tree is suspended.
  const sky = useTexture(SKY_URL);
  const strips = useLoader(THREE.ImageLoader, STRIP_URLS);
  const rocks = useGLTF(ROCKS_URL).scene;
  useMemo(() => {
    sky.wrapS = sky.wrapT = THREE.ClampToEdgeWrapping;
    sky.colorSpace = THREE.SRGBColorSpace;
    sky.needsUpdate = true;
  }, [sky]);
  const ground = useMemo<GroundSet>(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const a = stripToArray(strips[0], LAYERS.length, true);
    const n = stripToArray(strips[1], LAYERS.length, false);
    a.texture.anisotropy = n.texture.anisotropy = aniso;
    return { albedo: a.texture, normal: n.texture, means: a.means };
  }, [strips, gl]);
  useEffect(
    () => () => {
      ground.albedo.dispose();
      ground.normal.dispose();
    },
    [ground],
  );
  return (
    <>
      <SkyDome texture={sky} />
      <Terrain ground={ground} highlights={highlights} />
      <Stream />
      <TreeKind kind="pine" lit={highlights.includes('grove')} />
      <TreeKind kind="oak" lit={false} />
      <TreeKind kind="olive" lit={highlights.includes('orchard')} />
      <Maquis />
      <Boulders rocks={rocks} lit={highlights.includes('rocks')} />
      <Building lit={highlights.includes('building')} />
      <StaticShadows onReady={onReady} />
    </>
  );
}

/** Memoised: the model's panel re-renders on every frame of an orbit (its live north arrow). */
export default memo(function PlanningLab3D({ view, reduce, nodes, selection, showDirect, highlights, dragging, dispatch, onGround, onReady, onProgress, onHidden, pointerScale = 1 }: Lab3DProps) {
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
    <QualityCanvas
      name="planning-lab"
      aria-hidden
      dpr={[1, 2]}
      pixelBudget={PIXEL_BUDGET}
      // a dragged route point changes the view without moving the camera
      moving={dragging !== null}
      // StaticShadows draws the shadow map once (the world does not move)
      shadowCache={false}
      // PCF with a radius: soft-edged shadows (three's PCFSoftShadowMap is deprecated and falls back to it)
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 38, near: 5 / S, far: 30000 / S, position: home.pos }}
      // Inside the lesson's LessonViewportFit: size from the untransformed box.
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl }) => {
        // neutral: the scans' and the sky photograph's own colours, without a filmic shift
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.12;
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
    </QualityCanvas>
  );
});

useGLTF.preload(ROCKS_URL);
