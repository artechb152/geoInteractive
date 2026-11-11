'use client';

import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { QualityCanvas } from '@/components/three/QualityCanvas';
import { Html, Line, OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STREAM, WATER_TOWER, WORLD_BOUNDS, type Point } from './terrainNavScenario';
import { WORLD3D, bearing, fromWorld3, toWorld3, verticalFov } from './terrainNavGeometry';
import {
  boulders,
  crownShape,
  groundStones,
  heightAt,

  houses,
  insideSheet,

  rng,
  shrubs,
  trees,
  waterCourses,

  type Shrub,
  type Tree,
} from './terrainNavTerrain';
import { FEATURE_INDEX, buildFeatureIdTexture } from './terrainNavMaterials';
import { GROUND_LAYERS, buildGroundDetail, buildReliefTexture, createDaySky, createHighlightMask, createTerrainGround, textureArray } from './terrainNavGround';

import { CROWN2, concreteMaterial, limestoneMaterial, towerSteelGeometry, parapetGeometry, plasterWallMaterial, solarHeaterGeometry, tileRoofMaterial } from './terrainNavCover';
import { AIR, HAZE, addLight, litStandard } from './terrainNavAir';
import { GRASS_HILLS, GRASS_REACH_M, grassMaterial, grassPatch, grassVariants, type GrassClump } from './terrainNavGrass';
import { TREE_REF, TREE_UNIFORMS, TREE_VARIANTS, coreMaterial, leafAtlas, leafMaterial, shrubVariant, treeVariant, woodMaterial, type TreeVariant } from './terrainNavTrees';
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
const DIR = `${BASE}/assets/lessons/topic06/terrain-nav`;
/** The ground scans (terrainNavGround GROUND_LAYERS order) and the village's plaster and tiles. */
const GROUND_URLS = {
  albedo: GROUND_LAYERS.map((l) => `${DIR}/ground/${l}_albedo.webp`),
  normal: GROUND_LAYERS.map((l) => `${DIR}/ground/${l}_normal.webp`),
};
/** The scanned stones the dead-reckoning scene ships (rounded-rocks.glb), used here as limestone. */
const ROCKS_URL = `${BASE}/assets/lessons/topic06/dead-reckoning/rounded-rocks.glb`;
const VILLAGE_URLS = [`${DIR}/village/plaster_albedo.webp`, `${DIR}/village/plaster_normal.webp`, `${DIR}/village/roof_albedo.webp`, `${DIR}/village/roof_normal.webp`];
/** Bark scans of the three kinds of tree (albedo, normal; pine, oak, olive). */
const BARK_URLS = (['pine', 'oak', 'olive'] as const).flatMap((k) => [`${DIR}/tree/bark_${k}_albedo.webp`, `${DIR}/tree/bark_${k}_normal.webp`]);

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
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
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
    // …and what the last frame drew (draw calls, triangles), for the performance check
    const r = window as unknown as { __tnRenderInfo?: () => unknown };
    r.__tnRenderInfo = () => ({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      lodK: TREE_UNIFORMS.uLodK.value,
      // triangles submitted per material (instances × the geometry's), for the performance budget
      byMaterial: (() => {
        const out: Record<string, number> = {};
        scene.traverse((o) => {
          const m = o as THREE.InstancedMesh;
          if (!m.isMesh || !m.visible) return;
          const g = m.geometry;
          const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
          const name = (m.material as THREE.Material).name || (m.material as THREE.Material).type;
          out[name] = (out[name] ?? 0) + tris * (m.isInstancedMesh ? m.count : 1);
        });
        return out;
      })(),
    });
    // …and the GPU time of one frame of the current view: n synchronous renders, waited for by a pixel read
    const b = window as unknown as { __tnBench?: (n?: number) => number };
    b.__tnBench = (n = 40) => {
      const ctx = gl.getContext();
      const px = new Uint8Array(4);
      gl.render(scene, camera);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < n; i++) gl.render(scene, camera);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
      return (performance.now() - t0) / n;
    };
    return () => {
      delete w.__tnProbe;
      delete r.__tnRenderInfo;
      delete b.__tnBench;
    };
  }, [camera, gl, scene, size.width, size.height]);

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
    // the trees' level of detail: device pixels per metre at 1 m (this frame's field of view); a size or
    // field of view caught mid-change (full screen, a resize) keeps the last good value
    const lodK = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    if (Number.isFinite(lodK) && lodK > 1) TREE_UNIFORMS.uLodK.value = lodK;
    else if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __tnLodTrace?: unknown[] };
      (w.__tnLodTrace ??= []).push({ lodK, h: size.height, dpr: gl.getPixelRatio(), fov: camera.fov, mode: st.mode, t: performance.now() });
    }

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

function Terrain({ highlights, albedo, normal }: { highlights: readonly FeatureId[]; albedo: readonly THREE.Texture[]; normal: readonly THREE.Texture[] }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(buildTerrainGeometry, []);
  const detail = useMemo(buildGroundDetail, []);
  const relief = useMemo(buildReliefTexture, []);
  const ids = useMemo(buildFeatureIdTexture, []);
  const hl = useMemo(() => createHighlightMask(ids), [ids]);
  const { material, uniforms, arrays } = useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const arrays = [textureArray(albedo.map((t) => t.image as CanvasImageSource), 1024, true, aniso), textureArray(normal.map((t) => t.image as CanvasImageSource), 1024, false, aniso)] as const;
    return { ...createTerrainGround(arrays[0], arrays[1], relief, detail, hl.texture), arrays };
  }, [albedo, normal, relief, detail, hl, gl]);
  useEffect(() => {
    const v = highlights.map((h) => FEATURE_INDEX[h] ?? 0);
    uniforms.uHl.value.set(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    hl.update(v.slice(0, 3));
    invalidate();
  }, [highlights, uniforms, hl, invalidate]);
  useEffect(
    () => () => {
      geometry.dispose();
      Object.values(detail).forEach((m) => m.dispose());
      relief.dispose();
      ids.dispose();
      hl.texture.dispose();
      arrays.forEach((a) => a.dispose());
      material.dispose();
    },
    [geometry, detail, relief, ids, hl, arrays, material],
  );
  return <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- water

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
      // a level surface across the channel, just above the drawn mesh
      const h = Math.max(heightAt(E, N), heightAt(E + nx * half, N + ny * half), heightAt(E - nx * half, N - ny * half)) + 0.18;
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
  const mat = useMemo(() => {
    // the map's water blue deepened over a dark bed, shallower and browner at the banks where it thins out
    // into the wet earth (no ruled edge); ripples, and the sky on it at grazing angles
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(WATER.line).lerp(new THREE.Color('#1E302C'), 0.3), roughness: 0.1, metalness: 0, side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    m.customProgramCacheKey = () => 'tn-water';
    m.onBeforeCompile = (shader) => {
      addLight(shader);
      shader.uniforms.uSky = { value: new THREE.Color('#A9C2D6') };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWw;\nattribute float aAcross;\nvarying float vAcross;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWw = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvAcross = aAcross;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWw;\nuniform vec3 uSky;\nvarying float vAcross;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            // the edges wander a little and thin out: shallow water over the bed, then the wet bank
            vec2 q = vWw.xz * ${S.toFixed(1)};
            float wob = (sin(q.x * 0.37 + q.y * 0.21) + sin(q.x * 0.13 - q.y * 0.53 + 1.7)) * 0.06;
            float e = min(vAcross, 1.0 - vAcross) + wob;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.062, 0.045), (1.0 - smoothstep(0.04, 0.3, e)) * 0.75);
            diffuseColor.a = smoothstep(-0.02, 0.16, e);
          }`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            vec2 p = vWw.xz * ${S.toFixed(1)};
            vec3 rip = vec3(sin(p.x * 2.1 + p.y * 0.7) + sin(p.x * 0.9 - p.y * 2.6) * 0.6, 0.0, cos(p.y * 2.3 - p.x * 0.4) + cos(p.x * 3.1 + p.y * 1.3) * 0.5) * 0.045;
            normal = normalize(normal + (viewMatrix * vec4(rip, 0.0)).xyz);
          }`,
        )
        .replace(
          '#include <opaque_fragment>',
          `{
            float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
            outgoingLight = mix(outgoingLight, uSky * 0.8, fr * 0.6);
          }
          #include <opaque_fragment>`,
        );
    };
    return m;
  }, []);
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
export function clumpGeometry(seed: number, lobes: [number, number, number, number][], detail: number, jitter: number) {
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

export function crownGeometry(seed: number, lobeCount: number, spread: number) {
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

export const CROWN: Record<Tree['kind'], [THREE.Color, THREE.Color]> = {
  pine: [new THREE.Color('#2A3A1A'), new THREE.Color('#3C4F24')],
  oak: [new THREE.Color('#3A4D20'), new THREE.Color('#596A2E')],
  olive: [new THREE.Color('#5E6A48'), new THREE.Color('#7D8662')],
};
const ACCENT = new THREE.Color('#D97E2B');
const UP = new THREE.Vector3(0, 1, 0);

/** Fills an instanced mesh; refilled when `deps` change (the highlight). */
export function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, count: number, fill: (i: number, m: THREE.Matrix4, c: THREE.Color) => void, deps: readonly unknown[]) {
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

/**
 * Draws, in the given instanced meshes (already filled, all with the same instances), only
 * the instances big enough on screen — radius `radiiM` at least `loPx` device pixels —
 * re-sorted whenever the eye moves a metre or the zoom changes. Below that size their vertex
 * shader has already folded the detail away (the leaves into the hull, the limbs into the
 * trunk), so dropping them changes no pixel and spares their vertices.
 * `deps`: what refills the meshes (their colours), to take a fresh copy.
 */
function useScreenCull(refs: readonly React.RefObject<THREE.InstancedMesh | null>[], centres: Float32Array, radiiM: Float32Array, loPx: number, deps: readonly unknown[]) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const full = useRef<{ m: Float32Array; c: Float32Array | null }[]>([]);
  const last = useRef({ x: NaN, y: 0, z: 0, k: 0 });
  const order = useMemo(() => new Uint32Array(radiiM.length), [radiiM]);
  // the instances drawn now (n = -1: none yet, or a refill to copy again)
  const chosen = useMemo(() => ({ ids: new Uint32Array(radiiM.length), n: -1 }), [radiiM]);
  useLayoutEffect(() => {
    full.current = refs.map((r) => {
      const m = r.current;
      return m ? { m: (m.instanceMatrix.array as Float32Array).slice(), c: m.instanceColor ? (m.instanceColor.array as Float32Array).slice() : null } : { m: new Float32Array(0), c: null };
    });
    last.current.x = NaN;
    chosen.n = -1;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidate, ...deps]);
  useFrame(() => {
    const k = TREE_UNIFORMS.uLodK.value;
    const p = camera.position;
    const l = last.current;
    if (Math.abs(p.x - l.x) + Math.abs(p.y - l.y) + Math.abs(p.z - l.z) < 1 / S && Math.abs(k - l.k) < k * 0.03) return;
    l.x = p.x;
    l.y = p.y;
    l.z = p.z;
    l.k = k;
    let n = 0;
    for (let i = 0; i < radiiM.length; i++) {
      const dx = centres[i * 3] - p.x;
      const dy = centres[i * 3 + 1] - p.y;
      const dz = centres[i * 3 + 2] - p.z;
      if ((radiiM[i] * k) / Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz) * S, 1) >= loPx) order[n++] = i;
    }
    // The same instances as drawn: nothing to copy or upload (most frames of an orbit).
    let same = n === chosen.n;
    for (let q = 0; same && q < n; q++) same = order[q] === chosen.ids[q];
    if (same) return;
    chosen.ids.set(order.subarray(0, n));
    chosen.n = n;
    // Copied element by element (no typed-array view per instance) and uploaded as far as drawn.
    refs.forEach((r, j) => {
      const m = r.current;
      const f = full.current[j];
      if (!m || !f || !f.m.length) return;
      const ma = m.instanceMatrix.array as Float32Array;
      for (let q = 0; q < n; q++) {
        const from = order[q] * 16;
        const to = q * 16;
        for (let e = 0; e < 16; e++) ma[to + e] = f.m[from + e];
      }
      m.instanceMatrix.clearUpdateRanges();
      m.instanceMatrix.addUpdateRange(0, n * 16);
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor && f.c) {
        const ca = m.instanceColor.array as Float32Array;
        for (let q = 0; q < n; q++) {
          const from = order[q] * 3;
          const to = q * 3;
          ca[to] = f.c[from];
          ca[to + 1] = f.c[from + 1];
          ca[to + 2] = f.c[from + 2];
        }
        m.instanceColor.clearUpdateRanges();
        m.instanceColor.addUpdateRange(0, n * 3);
        m.instanceColor.needsUpdate = true;
      }
      m.count = n;
    });
  });
}

/** A small 0…1 hash of an instance's own numbers, for variety the shared lists don't carry. */
const hash01 = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Screen size (crown radius, device px) below which a tree is drawn as its far look, and above which in full. */
const TREE_LOD: Record<Tree['kind'] | 'shrub', [number, number]> = { pine: [6, 13], oak: [6, 13], olive: [5, 11], shrub: [4, 9] };
/** The bark scans multiplied by these (sRGB): the grey-brown of Aleppo pine, the dark oak, the pale grey olive. */
const BARK_TINT: Record<Tree['kind'], string> = { pine: '#B8A796', oak: '#9C9184', olive: '#C9C6BC' };
const BARK_SATURATION: Record<Tree['kind'], number> = { pine: 0.55, oak: 0.45, olive: 0.2 };
/** Leaf tints (multiplying the painted atlas): the pine a little blue-dark, the olive silvery. */
const LEAF_TINT: Record<Tree['kind'], [THREE.Color, THREE.Color]> = {
  pine: [new THREE.Color('#A9B49E'), new THREE.Color('#D6D7BE')],
  oak: [new THREE.Color('#A8B092'), new THREE.Color('#D8D6B4')],
  olive: [new THREE.Color('#C3C7B6'), new THREE.Color('#E8E8D8')],
};

type Bark = { albedo: THREE.Texture; normal: THREE.Texture };

/**
 * One kind of tree: every listed tree of the kind as an instance of one of its grown
 * variants (terrainNavTrees), placed, turned and sized exactly as the list says —
 * height to heightM, crown to crownR across. Wood, leaf cards and the inner hull are
 * three instanced meshes per variant sharing the same matrices.
 */
function TreeKind({ kind, highlights, atlas, bark }: { kind: Tree['kind']; highlights: readonly FeatureId[]; atlas: THREE.Texture; bark: Bark }) {
  const list = useMemo(() => trees().filter((t) => t.kind === kind), [kind]);
  const variants = useMemo(() => Array.from({ length: TREE_VARIANTS[kind] }, (_, k) => treeVariant(kind, k)), [kind]);
  const ref = TREE_REF[kind];
  const mats = useMemo(
    () => ({
      leaves: leafMaterial(atlas, ref.crownR, TREE_LOD[kind], kind),
      core: coreMaterial(kind, ref.crownR, TREE_LOD[kind], kind === 'oak' ? 0.28 : 0),
      wood: woodMaterial(bark.albedo, bark.normal, ref.crownR, TREE_LOD[kind], kind, BARK_TINT[kind], BARK_SATURATION[kind]),
    }),
    [atlas, bark, kind, ref.crownR],
  );
  useEffect(
    () => () => {
      variants.forEach((v) => [v.trunk, v.wood, v.leaves, v.core].forEach((g) => g.dispose()));
      Object.values(mats).forEach((m) => m.dispose());
    },
    [variants, mats],
  );
  // each tree to a variant by its own numbers (the shared list carries no variant)
  const byVariant = useMemo(() => {
    const out: Tree[][] = variants.map(() => []);
    for (const t of list) out[Math.floor(hash01(t.E * 1.7, t.N * 0.3) * variants.length) % variants.length].push(t);
    return out;
  }, [list, variants]);
  return (
    <group>
      {variants.map((v, k) => (
        <TreeVariantMeshes key={k} kind={kind} variant={v} list={byVariant[k]} mats={mats} highlights={highlights} />
      ))}
    </group>
  );
}

function TreeVariantMeshes({ kind, variant, list, mats, highlights }: { kind: Tree['kind']; variant: TreeVariant; list: readonly Tree[]; mats: { leaves: THREE.Material; core: THREE.Material; wood: THREE.Material }; highlights: readonly FeatureId[] }) {
  const ref = TREE_REF[kind];
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const woodRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const place = (t: Tree, m: THREE.Matrix4) => {
    q.setFromAxisAngle(UP, t.spin);
    // a little wider one way than the other; sunk 15 cm (the flare meets the ground on a slope)
    const a = hash01(t.E, t.N);
    const kr = t.crownR / ref.crownR;
    sc.set((kr * (0.95 + 0.1 * a)) / S, t.heightM / ref.heightM / S, (kr * (1.05 - 0.1 * a)) / S);
    m.compose(v.set(...toWorld3(t.E, t.N, t.baseM - 0.15)), q, sc);
  };
  const lit = highlights.join(',');
  const tint = (t: Tree, c: THREE.Color, base: [THREE.Color, THREE.Color]) => {
    c.copy(base[0]).lerp(base[1], t.tone);
    c.offsetHSL((hash01(t.N, t.E) - 0.5) * 0.025, 0, 0);
    if (highlights.includes(t.group as FeatureId)) c.lerp(ACCENT, 0.5);
    return c;
  };
  const bark = (i: number, m: THREE.Matrix4, c: THREE.Color) => {
    place(list[i], m);
    c.setScalar(0.85 + 0.3 * list[i].tone);
  };
  useInstances(trunkRef, list.length, bark, []);
  useInstances(woodRef, list.length, bark, []);
  useInstances(leafRef, list.length, (i, m, c) => {
    place(list[i], m);
    tint(list[i], c, LEAF_TINT[kind]);
  }, [lit]);
  useInstances(coreRef, list.length, (i, m, c) => {
    place(list[i], m);
    tint(list[i], c, CROWN2[kind]);
  }, [lit]);
  const sizes = useMemo(() => {
    const centres = new Float32Array(list.length * 3);
    const radii = new Float32Array(list.length);
    list.forEach((t, i) => {
      const cs = crownShape(t);
      centres.set(toWorld3(t.E, t.N, cs.centerM), i * 3);
      radii[i] = t.crownR;
    });
    return { centres, radii };
  }, [list]);
  useScreenCull([woodRef, leafRef], sizes.centres, sizes.radii, TREE_LOD[kind][0], [lit]);
  if (!list.length) return null;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[variant.trunk, mats.wood, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={woodRef} args={[variant.wood, mats.wood, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={leafRef} args={[variant.leaves, mats.leaves, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={coreRef} args={[variant.core, mats.core, list.length]} castShadow receiveShadow raycast={() => null} />
    </group>
  );
}

/** The maquis: four grown shrub variants (leaf cards over a hull), each listed shrub at its size. */
function Scrub({ atlas }: { atlas: THREE.Texture }) {
  const list = useMemo(() => shrubs(), []);
  const variants = useMemo(() => Array.from({ length: 4 }, (_, k) => shrubVariant(k)), []);
  const mats = useMemo(() => ({ leaves: leafMaterial(atlas, 1, TREE_LOD.shrub, 'shrub'), core: coreMaterial('shrub', 1, TREE_LOD.shrub, 0.28) }), [atlas]);
  useEffect(
    () => () => {
      variants.forEach((v) => [v.leaves, v.core].forEach((g) => g.dispose()));
      Object.values(mats).forEach((m) => m.dispose());
    },
    [variants, mats],
  );
  const byVariant = useMemo(() => {
    const out: Shrub[][] = variants.map(() => []);
    for (const s of list) out[Math.floor(hash01(s.N * 0.7, s.E * 1.3) * variants.length) % variants.length].push(s);
    return out;
  }, [list, variants]);
  return (
    <group>
      {variants.map((v, k) => (
        <ShrubMeshes key={k} variant={v} list={byVariant[k]} mats={mats} />
      ))}
    </group>
  );
}

const SHRUB_LEAF: [THREE.Color, THREE.Color] = [new THREE.Color('#A6AE8C'), new THREE.Color('#D4D2AE')];
const SHRUB_CORE: [THREE.Color, THREE.Color] = [new THREE.Color('#33421E'), new THREE.Color('#58603A')];
const SAGE = new THREE.Color('#BDBFAA');

function ShrubMeshes({ variant, list, mats }: { variant: { leaves: THREE.BufferGeometry; core: THREE.BufferGeometry }; list: readonly Shrub[]; mats: { leaves: THREE.Material; core: THREE.Material } }) {
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const place = (s: Shrub, m: THREE.Matrix4) => {
    q.setFromAxisAngle(UP, s.spin);
    // a dome a little narrower and taller than the listed footprint (below the map's threshold either way)
    m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - 0.1)), q, new THREE.Vector3((s.radiusM * 0.9) / S, (s.heightM * 1.1) / S, (s.radiusM * 0.9) / S));
  };
  useInstances(leafRef, list.length, (i, m, c) => {
    const s = list[i];
    place(s, m);
    c.copy(SHRUB_LEAF[0]).lerp(SHRUB_LEAF[1], s.tone);
    // one shrub in four the grey sage of the dry garrigue
    const g = hash01(s.E, s.N);
    if (g > 0.75) c.lerp(SAGE, (g - 0.75) * 3);
  }, []);
  useInstances(coreRef, list.length, (i, m, c) => {
    const s = list[i];
    place(s, m);
    c.copy(SHRUB_CORE[0]).lerp(SHRUB_CORE[1], s.tone);
  }, []);
  const sizes = useMemo(() => {
    const centres = new Float32Array(list.length * 3);
    const radii = new Float32Array(list.length);
    list.forEach((s, i) => {
      centres.set(toWorld3(s.E, s.N, s.baseM + s.heightM * 0.5), i * 3);
      radii[i] = s.radiusM;
    });
    return { centres, radii };
  }, [list]);
  useScreenCull([leafRef], sizes.centres, sizes.radii, TREE_LOD.shrub[0], []);
  if (!list.length) return null;
  return (
    <group>
      <instancedMesh ref={leafRef} args={[variant.leaves, mats.leaves, list.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={coreRef} args={[variant.core, mats.core, list.length]} castShadow receiveShadow raycast={() => null} />
    </group>
  );
}

/**
 * Scanned stones (the dead-reckoning scene's rounded-rocks.glb) as limestone: the large ones
 * from its rocks, the small from its stones, sized as the shared lists say, sunk a little.
 */
function useScannedRocks() {
  const gltf = useGLTF(ROCKS_URL);
  const res = useMemo(() => {
    const pick = (name: string) => {
      let mesh: THREE.Mesh | null = null;
      gltf.scene.getObjectByName(name)?.traverse((o) => {
        if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
      });
      const src = mesh as THREE.Mesh | null;
      if (!src) return null;
      const geo = src.geometry;
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      return { name, geo, diameter: Math.max(b.max.x - b.min.x, b.max.z - b.min.z), mat: src.material as THREE.MeshStandardMaterial };
    };
    const rocks = ['rock_a', 'rock_b', 'rock_c', 'rock_d'].map(pick).filter((x) => x !== null);
    const stones = ['stone_a', 'stone_b', 'stone_c', 'stone_d', 'stone_e'].map(pick).filter((x) => x !== null);
    const mats = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    for (const r of [...rocks, ...stones]) if (!mats.has(r.mat)) mats.set(r.mat, limestoneMaterial(r.mat, r.mat.name));
    return { rocks, stones, mats };
  }, [gltf]);
  useEffect(() => () => res.mats.forEach((m) => m.dispose()), [res]);
  return res;
}

type RockItem = { readonly E: number; readonly N: number; readonly baseM: number; readonly sizeM: number; readonly spin: number; readonly tone: number };

/** One instanced mesh per scanned shape; each item to the shape its hash picks, `widthOf` its footprint. */
function RockSet({ items, large, widthOf, castShadow }: { items: readonly RockItem[]; large: (s: RockItem) => boolean; widthOf: (s: RockItem) => number; castShadow: boolean }) {
  const { rocks, stones, mats } = useScannedRocks();
  const groups = useMemo(() => {
    const out = [...rocks, ...stones].map((shape) => ({ shape, items: [] as RockItem[] }));
    for (const s of items) {
      const set = large(s) ? rocks : stones;
      const k = Math.floor(hash01(s.E, s.N) * set.length) % set.length;
      out[(large(s) ? 0 : rocks.length) + k].items.push(s);
    }
    return out.filter((g) => g.items.length);
  }, [rocks, stones, items, large]);
  return (
    <group>
      {groups.map((g) => (
        <RockShape key={g.shape.name} shape={g.shape} mat={mats.get(g.shape.mat)!} items={g.items} widthOf={widthOf} castShadow={castShadow} />
      ))}
    </group>
  );
}

function RockShape({ shape, mat, items, widthOf, castShadow }: { shape: { geo: THREE.BufferGeometry; diameter: number }; mat: THREE.Material; items: readonly RockItem[]; widthOf: (s: RockItem) => number; castShadow: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  useInstances(
    ref,
    items.length,
    (i, m, c) => {
      const s = items[i];
      const k = widthOf(s) / shape.diameter;
      const h = hash01(s.N, s.E);
      // lying as it settled: a small tilt, turned at random
      e.set((h - 0.5) * 0.25, s.spin, (hash01(s.E + 1, s.N) - 0.5) * 0.25);
      q.setFromEuler(e);
      // bedded in the soil: a third of its height under the ground, a little flatter than the scan
      m.compose(new THREE.Vector3(...toWorld3(s.E, s.N, s.baseM - widthOf(s) * 0.16)), q, new THREE.Vector3(k / S, (k * (0.62 + 0.25 * h)) / S, k / S));
      c.setScalar(0.86 + 0.24 * s.tone);
    },
    [],
  );
  const sizes = useMemo(() => {
    const centres = new Float32Array(items.length * 3);
    const radii = new Float32Array(items.length);
    items.forEach((s, i) => {
      centres.set(toWorld3(s.E, s.N, s.baseM), i * 3);
      radii[i] = widthOf(s) / 2;
    });
    return { centres, radii };
  }, [items, widthOf]);
  // a stone under a pixel or so is left to the ground's own texture (the scans are dense meshes)
  useScreenCull([ref], sizes.centres, sizes.radii, 1.1, []);
  return <instancedMesh ref={ref} args={[shape.geo, mat, items.length]} castShadow={castShadow} receiveShadow raycast={() => null} />;
}

const LARGE_BOULDER = (s: RockItem) => s.sizeM >= 0.95;
const BOULDER_WIDTH = (s: RockItem) => s.sizeM * 1.9;
const NEVER = () => false;
const STONE_WIDTH = (s: RockItem) => s.sizeM * 1.8;

function Boulders() {
  const list = useMemo(() => boulders(), []);
  return <RockSet items={list} large={LARGE_BOULDER} widthOf={BOULDER_WIDTH} castShadow />;
}

/** Loose stones around the hilltops where the navigator stands. */
function Stones() {
  const list = useMemo(() => groundStones(), []);
  return <RockSet items={list} large={NEVER} widthOf={STONE_WIDTH} castShadow={false} />;
}

/**
 * The grass round the three hilltops the practice stands on (terrainNavGrass): drawn only in
 * the navigator's view and only round the hill the eye is on.
 */
function Grass({ view }: { view: ViewStore }) {
  const variants = useMemo(grassVariants, []);
  const mats = useMemo(() => ({ tall: grassMaterial(SUN_DIR, [45, 65], 'tall'), sward: grassMaterial(SUN_DIR, [16, 27], 'sward') }), []);
  useEffect(
    () => () => {
      [...variants.tall, ...variants.sward].forEach((g) => g.dispose());
      mats.tall.dispose();
      mats.sward.dispose();
    },
    [variants, mats],
  );
  return (
    <group>
      {GRASS_HILLS.map((h) => (
        <GrassHill key={h} hill={h} variants={variants} mats={mats} view={view} />
      ))}
    </group>
  );
}

function GrassHill({ hill, variants, mats, view }: { hill: (typeof GRASS_HILLS)[number]; variants: { tall: THREE.BufferGeometry[]; sward: THREE.BufferGeometry[] }; mats: { tall: THREE.Material; sward: THREE.Material }; view: ViewStore }) {
  const camera = useThree((s) => s.camera);
  const patch = useMemo(() => grassPatch(hill), [hill]);
  // each clump to the variant of its dryness: mostly green, mixed, mostly straw
  const groups = useMemo(() => {
    const out: GrassClump[][] = [[], [], []];
    for (const c of patch.clumps) out[c.dry < 0.33 ? 0 : c.dry < 0.66 ? 1 : 2].push(c);
    return out;
  }, [patch]);
  const sward = useMemo(() => {
    const out: GrassClump[][] = [[], []];
    for (const c of patch.carpet) out[c.dry < 0.5 ? 0 : 1].push(c);
    return out;
  }, [patch]);
  const centre = useMemo(() => toWorld3(patch.centre.E, patch.centre.N, 0), [patch]);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const st = view.get();
    g.visible = st.mode === 'eye' && Math.hypot(camera.position.x - centre[0], camera.position.z - centre[2]) * S < GRASS_REACH_M + 90;
  });
  return (
    <group ref={ref}>
      {groups.map((list, k) => (
        <GrassMesh key={k} geo={variants.tall[k]} mat={mats.tall} list={list} />
      ))}
      {sward.map((list, k) => (
        <GrassMesh key={`s${k}`} geo={variants.sward[k]} mat={mats.sward} list={list} />
      ))}
    </group>
  );
}

function GrassMesh({ geo, mat, list }: { geo: THREE.BufferGeometry; mat: THREE.Material; list: readonly GrassClump[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useInstances(
    ref,
    list.length,
    (i, m, c) => {
      const t = list[i];
      q.setFromAxisAngle(UP, t.spin);
      const w = 0.85 + hash01(t.E, t.N) * 0.5;
      m.compose(new THREE.Vector3(...toWorld3(t.E, t.N, t.baseM - 0.02)), q, new THREE.Vector3((t.heightM * w) / S, t.heightM / S, (t.heightM * w) / S));
      c.setScalar(0.85 + 0.3 * hash01(t.N, t.E));
    },
    [],
  );
  if (!list.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} receiveShadow raycast={() => null} />;
}

// ---------------------------------------------------------------- village

/** Walls with a procedural window pattern (two floors of windows on the long and short faces). */
export function wallMaterial() {
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

function Village({ highlights, textures }: { highlights: readonly FeatureId[]; textures: readonly [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture] }) {
  const gl = useThree((s) => s.gl);
  const list = useMemo(() => houses(), []);
  const flat = useMemo(() => list.map((h, i) => ({ h, i })).filter((x) => x.h.roof === 'flat'), [list]);
  const tiled = useMemo(() => list.map((h, i) => ({ h, i })).filter((x) => x.h.roof === 'tile'), [list]);
  // a solar water heater on about half the flat roofs (a metre or two across: no landmark)
  const heated = useMemo(() => flat.filter((x) => hash01(x.h.E, x.h.N) < 0.55), [flat]);
  const [plA, plN, rfA, rfN] = textures;
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
  const rimGeo = useMemo(parapetGeometry, []);
  const heaterGeo = useMemo(solarHeaterGeometry, []);
  const { wallMat, tileMat } = useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const [t, srgb] of [[plA, true], [plN, false], [rfA, true], [rfN, false]] as const) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }
    return { wallMat: plasterWallMaterial(plA, plN), tileMat: tileRoofMaterial(rfA, rfN) };
  }, [gl, plA, plN, rfA, rfN]);
  const capMat = useMemo(() => litStandard({ roughness: 0.95, metalness: 0 }, 'caps'), []);
  const heaterMat = useMemo(() => litStandard({ vertexColors: true, roughness: 0.45, metalness: 0 }, 'heaters'), []);
  useEffect(
    () => () => {
      box.dispose();
      roofGeo.dispose();
      rimGeo.dispose();
      heaterGeo.dispose();
      wallMat.dispose();
      capMat.dispose();
      tileMat.dispose();
      heaterMat.dispose();
    },
    [box, roofGeo, rimGeo, heaterGeo, wallMat, capMat, tileMat, heaterMat],
  );
  const wallsRef = useRef<THREE.InstancedMesh>(null);
  const capsRef = useRef<THREE.InstancedMesh>(null);
  const rimsRef = useRef<THREE.InstancedMesh>(null);
  const heatersRef = useRef<THREE.InstancedMesh>(null);
  const tilesRef = useRef<THREE.InstancedMesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const WALL_A = useMemo(() => new THREE.Color('#EFE8D6'), []);
  const WALL_B = useMemo(() => new THREE.Color('#DACDB0'), []);
  const lit = highlights.includes('village');
  const wallTop = (h: (typeof list)[number]) => h.floorM + h.floors * 3.2;
  const wallColour = (h: (typeof list)[number], c: THREE.Color) => {
    c.copy(WALL_A).lerp(WALL_B, h.tone);
    if (lit) c.lerp(ACCENT, 0.5);
    return c;
  };
  useInstances(
    wallsRef,
    list.length,
    (i, m, c) => {
      const h = list[i];
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, h.baseM)), q, new THREE.Vector3(h.widM / S, (wallTop(h) - h.baseM) / S, h.lenM / S));
      wallColour(h, c);
    },
    [lit],
  );
  useInstances(
    capsRef,
    flat.length,
    (i, m, c) => {
      const h = flat[i].h;
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, wallTop(h))), q, new THREE.Vector3((h.widM - 0.5) / S, 0.12 / S, (h.lenM - 0.5) / S));
      c.set(lit ? '#E0A066' : '#ABA290').multiplyScalar(0.92 + 0.14 * h.tone);
    },
    [lit],
  );
  useInstances(
    rimsRef,
    flat.length,
    (i, m, c) => {
      const h = flat[i].h;
      q.setFromAxisAngle(UP, -THREE.MathUtils.degToRad(h.angleDeg));
      m.compose(new THREE.Vector3(...toWorld3(h.E, h.N, wallTop(h))), q, new THREE.Vector3(h.widM / S, 0.8 / S, h.lenM / S));
      wallColour(h, c).multiplyScalar(1.04);
    },
    [lit],
  );
  useInstances(
    heatersRef,
    heated.length,
    (i, m, c) => {
      const h = heated[i].h;
      // on the roof, towards one corner, facing south
      const a = THREE.MathUtils.degToRad(h.angleDeg);
      const u = (hash01(h.N, h.E) - 0.5) * 0.4;
      const E = h.E + Math.sin(a) * h.lenM * u + Math.cos(a) * h.widM * 0.22;
      const N = h.N + Math.cos(a) * h.lenM * u - Math.sin(a) * h.widM * 0.22;
      q.setFromAxisAngle(UP, (hash01(h.E, h.N) - 0.5) * 0.3);
      m.compose(new THREE.Vector3(...toWorld3(E, N, wallTop(h) + 0.12)), q, new THREE.Vector3(1 / S, 1 / S, 1 / S));
      c.set('#FFFFFF');
    },
    [],
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
      <instancedMesh ref={capsRef} args={[box, capMat, flat.length]} receiveShadow raycast={() => null} />
      <instancedMesh ref={rimsRef} args={[rimGeo, capMat, flat.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={heatersRef} args={[heaterGeo, heaterMat, heated.length]} castShadow receiveShadow raycast={() => null} />
      <instancedMesh ref={tilesRef} args={[roofGeo, tileMat, tiled.length]} castShadow receiveShadow raycast={() => null} />
      <WaterTower lit={highlights.includes('tower')} />
    </group>
  );
}

/**
 * The water tower, at its listed point and height (the map's landmark): a cast-concrete shaft
 * and tank (concreteMaterial), a collar under the tank, a rim, a shallow roof cone with its
 * hatch, and the steel — ladder, roof railing, down-pipe — in metres, scaled into the world.
 */
function WaterTower({ lit }: { lit: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const base = heightAt(WATER_TOWER.E, WATER_TOWER.N);
  const origin = useMemo(() => new THREE.Vector3(...toWorld3(WATER_TOWER.E, WATER_TOWER.N, base - 0.5)), [base]);
  const res = useMemo(
    () => ({
      concrete: concreteMaterial(origin, 'tower'),
      roof: concreteMaterial(origin, 'tower-roof'),
      steel: litStandard({ color: '#55524C', roughness: 0.55, metalness: 0.35 }, 'tower-steel'),
      shaft: new THREE.CylinderGeometry(1.5, 1.9, 17, 40, 1, true).translate(0, 8.5, 0),
      collar: new THREE.CylinderGeometry(4.2, 1.6, 0.9, 48).translate(0, 16.55, 0),
      tank: new THREE.CylinderGeometry(4.6, 4.2, 5.5, 64).translate(0, 19.5, 0),
      rim: new THREE.TorusGeometry(4.35, 0.12, 8, 64).rotateX(Math.PI / 2).translate(0, 17.05, 0),
      cap: new THREE.ConeGeometry(4.8, 1.8, 64).translate(0, 23, 0),
      hatch: new THREE.BoxGeometry(0.9, 0.35, 0.9).translate(0, 23.9, 0),
      steelGeo: towerSteelGeometry(),
    }),
    [origin],
  );
  useEffect(() => {
    res.concrete.color.set(lit ? '#E0A066' : '#BDB9AF');
    res.roof.color.set(lit ? '#D97E2B' : '#A8A397');
    invalidate();
  }, [lit, res, invalidate]);
  useEffect(
    () => () => {
      Object.values(res).forEach((v) => v.dispose());
    },
    [res],
  );
  return (
    <group position={origin} scale={1 / S}>
      <mesh geometry={res.shaft} material={res.concrete} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.collar} material={res.concrete} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.tank} material={res.concrete} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.rim} material={res.concrete} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.cap} material={res.roof} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.hatch} material={res.roof} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={res.steelGeo} material={res.steel} castShadow receiveShadow raycast={() => null} />
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
  const el = THREE.MathUtils.degToRad(38);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
})();

function SkyDome() {
  const camera = useThree((s) => s.camera);
  const mat = useMemo(() => createDaySky(SUN_DIR), []);
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

/** Half the side of the sharp shadow box around the eye, metres (4096 texels: under 9 cm each). */
const NEAR_SHADOW_M = 180;
/** Half the side of the whole sheet's shadow box, metres. */
const FAR_SHADOW_M = 1200;

/** Set once every program is compiled and the world shown: shadow maps drawn before that would be empty. */
const shadowsLive = { current: false };

/**
 * The sun and the sky's light. Two directional lights from the sun's direction,
 * both casting (terrainNavAir reads them as one sun): the first carries the
 * light and a sharp shadow box that follows the eye in practice (redrawn only
 * when the eye moves: a turn of the head costs nothing); the second, dark,
 * holds the static shadow map of the whole sheet. In learn mode the sharp box
 * covers the sheet too.
 */
function Sun({ view }: { view: ViewStore }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const nearRef = useRef<THREE.DirectionalLight>(null);
  const targets = useMemo(() => {
    const near = new THREE.Object3D();
    const far = new THREE.Object3D();
    far.position.set(...toWorld3(SHEET_CENTER.E, SHEET_CENTER.N, 350));
    near.position.copy(far.position);
    return { near, far };
  }, []);
  const farPos = useMemo(() => {
    const t = targets.far.position;
    return [t.x + SUN_DIR.x * 30, t.y + SUN_DIR.y * 30, t.z + SUN_DIR.z * 30] as [number, number, number];
  }, [targets]);
  const fh = FAR_SHADOW_M / S;
  const placed = useRef('');
  useFrame(() => {
    const light = nearRef.current;
    if (!light || !shadowsLive.current) return;
    const st = view.get();
    let key: string;
    const cam = light.shadow.camera;
    if (st.mode === 'eye' && st.eyeAt) {
      // a box around the eye, snapped to its texels so its shadows don't crawl as the eye walks
      const h = NEAR_SHADOW_M / S;
      const texel = (2 * h) / light.shadow.mapSize.x;
      const x = Math.round(camera.position.x / texel) * texel;
      const z = Math.round(camera.position.z / texel) * texel;
      const y = camera.position.y - 1.7 / S;
      key = `eye:${x.toFixed(5)}:${z.toFixed(5)}`;
      if (key === placed.current) return;
      targets.near.position.set(x, y, z);
      light.position.set(x + SUN_DIR.x * 8, y + SUN_DIR.y * 8, z + SUN_DIR.z * 8);
      cam.left = cam.bottom = -h;
      cam.right = cam.top = h;
      cam.near = 1;
      cam.far = 16;
      light.shadow.bias = -0.00025;
      light.shadow.normalBias = 0.0012;
      light.shadow.radius = 1.6;
    } else {
      key = 'sheet';
      if (key === placed.current) return;
      targets.near.position.copy(targets.far.position);
      light.position.set(...farPos);
      cam.left = cam.bottom = -fh;
      cam.right = cam.top = fh;
      cam.near = 1;
      cam.far = 60;
      light.shadow.bias = -0.0006;
      light.shadow.normalBias = 0.006;
      light.shadow.radius = 2;
    }
    placed.current = key;
    targets.near.updateMatrixWorld();
    cam.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  });
  return (
    <>
      <primitive object={targets.near} />
      <primitive object={targets.far} />
      {/* the sun's light and the sharp box (first: terrainNavAir reads light 0 as the sun) */}
      <directionalLight ref={nearRef} target={targets.near} position={farPos} intensity={4.3} color="#FFF1DC" castShadow shadow-mapSize={[4096, 4096]} shadow-autoUpdate={false} shadow-intensity={0.94} />
      {/* the whole sheet's shadow map, no light of its own */}
      <directionalLight
        target={targets.far}
        position={farPos}
        intensity={0}
        castShadow
        shadow-autoUpdate={false}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-fh}
        shadow-camera-right={fh}
        shadow-camera-top={fh}
        shadow-camera-bottom={-fh}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
        shadow-normalBias={0.006}
        shadow-radius={2}
        shadow-intensity={0.94}
      />
      {/* skylight from above, the warm light the dry ground throws back from below */}
      <hemisphereLight color="#B9CEE4" groundColor="#7C6E55" intensity={1.5} />
      {/* a little of the bright sky opposite the sun (no shadow of its own) */}
      <directionalLight position={[-SUN_DIR.x * 30, 18, -SUN_DIR.z * 30]} intensity={0.28} color="#DDE7F1" />
    </>
  );
}

/**
 * The world appears once every shader program is compiled (in parallel, off the frame — the
 * loader keeps running meanwhile); then both shadow maps are drawn (the world is static: the
 * sheet's once, the eye's box when the eye moves) and, two frames later, the model is ready.
 */
function StaticShadows({ onReady, onCompiled }: { onReady?: () => void; onCompiled: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let alive = true;
    let raf = 0;
    gl.shadowMap.autoUpdate = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        onCompiled();
        scene.traverse((o) => {
          const l = o as THREE.DirectionalLight;
          if (l.isDirectionalLight && l.castShadow) l.shadow.needsUpdate = true;
        });
        shadowsLive.current = true;
        gl.shadowMap.needsUpdate = true;
        invalidate();
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => onReady?.());
        });
      });
    return () => {
      alive = false;
      shadowsLive.current = false;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, invalidate, onReady, onCompiled]);
  return null;
}

function SceneSetup() {
  useEffect(() => {
    // one sun for the leaves' light, the air's glow and the shadows (terrainNavTrees, terrainNavAir)
    TREE_UNIFORMS.uSunDir.value.copy(SUN_DIR);
    AIR.uAirSun.value.copy(SUN_DIR);
  }, []);
  return null;
}

/** Every texture of the model, loaded together: one suspension, so no part of the world is built twice. */
const ALL_TEXTURES = [...GROUND_URLS.albedo, ...GROUND_URLS.normal, ...VILLAGE_URLS, ...BARK_URLS];

function World({ highlights, onReady, view }: { highlights: readonly FeatureId[]; onReady?: () => void; view: ViewStore }) {
  const textures = useTexture(ALL_TEXTURES);
  useGLTF(ROCKS_URL);
  const gl = useThree((s) => s.gl);
  const n = GROUND_LAYERS.length;
  const ground = useMemo(() => ({ albedo: textures.slice(0, n), normal: textures.slice(n, 2 * n) }), [textures, n]);
  const village = useMemo(() => textures.slice(2 * n, 2 * n + 4) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture], [textures, n]);
  const bark = useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const t = textures.slice(2 * n + 4);
    t.forEach((x, k) => {
      x.wrapS = x.wrapT = THREE.RepeatWrapping;
      x.colorSpace = k % 2 ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      x.anisotropy = aniso;
      x.needsUpdate = true;
    });
    return { pine: { albedo: t[0], normal: t[1] }, oak: { albedo: t[2], normal: t[3] }, olive: { albedo: t[4], normal: t[5] } };
  }, [textures, n, gl]);
  const atlas = useMemo(() => {
    const a = leafAtlas();
    a.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    return a;
  }, [gl]);
  useEffect(() => () => atlas.dispose(), [atlas]);
  // Dev-only: the painted leaf atlas as a PNG data URL (rows flipped back), for inspection.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __tnAtlas?: () => string };
    w.__tnAtlas = () => {
      const img = atlas.image as { data: Uint8Array; width: number; height: number };
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const id = c.getContext('2d')!.createImageData(img.width, img.height);
      for (let row = 0; row < img.height; row++) id.data.set(img.data.subarray((img.height - 1 - row) * img.width * 4, (img.height - row) * img.width * 4), row * img.width * 4);
      c.getContext('2d')!.putImageData(id, 0, 0);
      return c.toDataURL('image/png');
    };
    return () => {
      delete w.__tnAtlas;
    };
  }, [atlas]);
  const [compiled, setCompiled] = useState(false);
  const onCompiled = useCallback(() => setCompiled(true), []);
  return (
    <>
      <group visible={compiled}>
        <Terrain highlights={highlights} albedo={ground.albedo} normal={ground.normal} />
        <Stream />
        <TreeKind kind="pine" highlights={highlights} atlas={atlas} bark={bark.pine} />
        <TreeKind kind="oak" highlights={highlights} atlas={atlas} bark={bark.oak} />
        <TreeKind kind="olive" highlights={highlights} atlas={atlas} bark={bark.olive} />
        <Scrub atlas={atlas} />
        <Boulders />
        <Grass view={view} />
        <Stones />
        <Village highlights={highlights} textures={village} />
      </group>
      <StaticShadows onReady={onReady} onCompiled={onCompiled} />
    </>
  );
}

useTexture.preload(ALL_TEXTURES);
useGLTF.preload(ROCKS_URL);

/** Memoised: the model's panel re-renders on every frame of an orbit or a look (its live heading). */
export default memo(function TerrainNav3D({ view, reduce, highlights, route, labels, pins, onPick, onReady, pointerScale = 1 }: ModelProps) {
  const home = useMemo(() => {
    const t = toWorld3(SHEET_CENTER.E, SHEET_CENTER.N, HOME_VIEW.targetHeightM);
    const polar = THREE.MathUtils.degToRad(HOME_VIEW.polarDeg);
    const r = HOME_VIEW.distanceM / S;
    return { target: t, pos: [t[0], t[1] + r * Math.cos(polar), t[2] + r * Math.sin(polar)] as [number, number, number] };
  }, []);
  return (
    <QualityCanvas
      name="terrain-nav"
      aria-hidden
      // Sun schedules both shadow maps itself (the near one follows the eye)
      shadowCache={false}
      dpr={[1, 1.75]}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 40, near: 5 / S, far: 30000 / S, position: home.pos }}
      // Inside CombatNavScene's LessonViewportFit: size from the untransformed box.
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.97;
        gl.setClearColor(HAZE);
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneSetup />
      <OrbitControls makeDefault target={home.target} enableDamping dampingFactor={0.1} minDistance={300 / S} maxDistance={3600 / S} maxPolarAngle={THREE.MathUtils.degToRad(80)} zoomSpeed={0.9} rotateSpeed={1 / pointerScale} panSpeed={1 / pointerScale} screenSpacePanning={false} />
      <CameraRig view={view} reduce={reduce} />
      <Picker onPick={onPick} />
      <SkyDome />
      <Sun view={view} />
      <Suspense fallback={null}>
        <World highlights={highlights} onReady={onReady} view={view} />
      </Suspense>
      {route && <RouteOnGround pts={route.pts} dashed={route.dashed} />}
      <Pins pins={pins} />
      <Labels labels={labels} />
    </QualityCanvas>
  );
});
