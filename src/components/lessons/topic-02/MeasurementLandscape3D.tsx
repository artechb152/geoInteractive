'use client';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { MEASUREMENT_MODEL as M } from './measurementModel.data';
import { N_Z_PER_M, Z_PER_M, geoidZ, undulationAt, type Vec3 } from './measurementLayout';
import type { StationId } from './measurementMission.data';
import { MODEL_URLS, surveyLine3D, surveyPlaneLines, topZ, type HeightGrid, type LandCamera, type ModelState } from './measurementView';
import { C_ACCENT, C_ELL, C_GEO, C_INK, C_SEA } from './referenceBodiesStyle';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';

/**
 * The turnable landscape (WebGL): the renders' own ground, live.
 *
 *   ground   the height grid (model-height.bin) meshed every 10 m, wearing the
 *            straight-down Cycles image (model-albedo.webp) unlit — the renders'
 *            sun, trees and shadows are in it, and light on diffuse ground does
 *            not change with the viewing angle, so every angle shows the same
 *            landscape as the renders. One block, all the way round.
 *   sides    the same image carried down each side from the strip along its
 *            top edge: forest over forest, fields over fields, water under the
 *            sea. The strip is folded down at the top's own density — no row is
 *            stretched — and back again past its width, its detail softening
 *            with depth; a shade darker per side and toward the base — the
 *            model's volume, not a claim about what is underground.
 *   clear    the geoid view's reveal: the whole ground turns see-through. A
 *            depth pre-pass keeps only its nearest layer, so the ground reads as
 *            one thin envelope (never a milky stack), and the reference sheets
 *            drawn before it show inside it.
 *   sheets   the geoid (wavy, N exaggerated like the land) and the flat
 *            ellipsoid, only while clear: the geoid firm (the height reference),
 *            coming in from the sea and on under the land; the ellipsoid a quiet
 *            second reference.
 *   lines    the dashed survey line over the section's span, and while clear
 *            the two reference lines in the survey line's plane — the section's
 *            own lines, in the model.
 *   tripod   the GNSS receiver beside the picked station (the only lit object).
 *
 * The camera is given (landCamera(): the same numbers the HTML overlay projects
 * with), so nothing here decides where anything lands on screen. Frames render
 * on demand. Imported on first need (and again on a retry) by MeasurementLandscape.
 */

const MPU = L.mPerUnit;
const HALF_W = L.width / 2;
const HALF_D = L.depth / 2;
const CELL = M.heights.cell / MPU;
/** How see-through the clear ground is: thin enough for the geoid inside it to read as a surface. */
const CLEAR_OPACITY = 0.22;
/** The geoid's reveal: it comes in from the sea's edge and runs inland under the whole block (ms). */
const SWEEP_MS = 1100;
/** Render order: everything the ground can cover is drawn before its depth pre-pass. */
const ORDER = { sheetEll: 1, sheetGeo: 2, sea: 3, planeLines: 4, lines: 5, outline: 6, groundDepth: 10, ground: 11 } as const;
/** Each side's light from the renders' sun (from the left, high): left lit, right in shade. */
const SHADE = { front: 0.88, back: 0.8, left: 0.94, right: 0.76 };
/** The strip of image (world units ≈ 175 m) a side folds down from its top edge, back and forth. */
const SIDE_BAND = 0.35;
/** Start the strip this far inside the edge (≈ 1.5 texels): the image's outermost row is never sampled alone. */
const SIDE_INSET = 0.006;

type Grids = { zTop: Float32Array; zGround: Float32Array };

function grids(g: HeightGrid): Grids {
  const { cols, rows } = g;
  const zTop = new Float32Array(cols * rows);
  const zGround = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const yM = (-HALF_D + j * CELL) * MPU;
    for (let i = 0; i < cols; i++) {
      const xM = (-HALF_W + i * CELL) * MPU;
      const k = j * cols + i;
      const H = g.h[k];
      const n = undulationAt(xM, yM) * N_Z_PER_M;
      zGround[k] = H * Z_PER_M + n;
      zTop[k] = Math.max(H, 0) * Z_PER_M + n;
    }
  }
  return { zTop, zGround };
}

/** The top surface, draped with the straight-down image. */
function topGeometry(g: HeightGrid, G: Grids) {
  const { cols, rows } = g;
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      pos.set([-HALF_W + i * CELL, -HALF_D + j * CELL, G.zTop[k]], k * 3);
      uv.set([i / (cols - 1), j / (rows - 1)], k * 2);
    }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let o = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.set([a, b, d, a, d, c], o);
      o += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * The sea's surface (the cells below sea level, at the water's level — the geoid there), for the
 * see-through view: the geoid is seen to be the sea's surface before it carries on under the land.
 */
function seaGeometry(g: HeightGrid, G: Grids) {
  const { cols, rows } = g;
  const pos = new Float32Array(cols * rows * 3);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pos.set([-HALF_W + i * CELL, -HALF_D + j * CELL, G.zTop[j * cols + i] + 0.006], (j * cols + i) * 3);
  const idx: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (g.h[a] < 0 || g.h[b] < 0 || g.h[c] < 0 || g.h[d] < 0) idx.push(a, b, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

/**
 * The four upright sides. Per vertex: the image coordinate of the top edge right
 * above it, the directions into the image and along the edge (per world unit),
 * how far below the top it is, and the side's shade — the shader carries the
 * edge's strip down from there.
 */
function sideGeometry(g: HeightGrid, G: Grids) {
  const { cols, rows } = g;
  const pos: number[] = [];
  const edge: number[] = [];
  const inward: number[] = [];
  const along: number[] = [];
  const depth: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  const side = (samples: { x: number; y: number; k: number; u: number; v: number }[], into: [number, number], by: [number, number], s: number) => {
    const start = pos.length / 3;
    for (const p of samples) {
      const zt = G.zTop[p.k];
      for (const z of [zt, M.baseZ]) {
        pos.push(p.x, p.y, z);
        edge.push(p.u, p.v);
        inward.push(into[0], into[1]);
        along.push(by[0], by[1]);
        depth.push(zt - z);
        shade.push(s);
      }
    }
    for (let t = 0; t < samples.length - 1; t++) {
      const a = start + t * 2;
      idx.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
  };
  const row = (j: number) => Array.from({ length: cols }, (_, i) => ({ x: -HALF_W + i * CELL, y: -HALF_D + j * CELL, k: j * cols + i, u: i / (cols - 1), v: j / (rows - 1) }));
  const column = (i: number) => Array.from({ length: rows }, (_, j) => ({ x: -HALF_W + i * CELL, y: -HALF_D + j * CELL, k: j * cols + i, u: i / (cols - 1), v: j / (rows - 1) }));
  const du = 1 / (2 * HALF_W);
  const dv = 1 / (2 * HALF_D);
  side(row(0), [0, dv], [du, 0], SHADE.front);
  side(row(rows - 1), [0, -dv], [-du, 0], SHADE.back);
  side(column(0), [du, 0], [0, -dv], SHADE.left);
  side(column(cols - 1), [-du, 0], [0, dv], SHADE.right);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('edgeUv', new THREE.Float32BufferAttribute(edge, 2));
  geo.setAttribute('inward', new THREE.Float32BufferAttribute(inward, 2));
  geo.setAttribute('along', new THREE.Float32BufferAttribute(along, 2));
  geo.setAttribute('depth', new THREE.Float32BufferAttribute(depth, 1));
  geo.setAttribute('shade', new THREE.Float32BufferAttribute(shade, 1));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

const SIDE_VERT = /* glsl */ `
attribute vec2 edgeUv;
attribute vec2 inward;
attribute vec2 along;
attribute float depth;
attribute float shade;
varying vec2 vEdge;
varying vec2 vIn;
varying vec2 vAlong;
varying float vDepth;
varying float vShade;
varying vec3 vWorld;
void main() {
  vEdge = edgeUv;
  vIn = inward;
  vAlong = along;
  vDepth = depth;
  vShade = shade;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// The edge's strip at the top's own density, folded down and back inside the band (continuous at
// the edge and at every fold, nothing stretched); the same spot's coarser image takes over a little
// with depth, so the folds read as texture, not as a pattern; a little darker toward the base.
const SIDE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform float uBand;
uniform float uInset;
varying vec2 vEdge;
varying vec2 vIn;
varying vec2 vAlong;
varying float vDepth;
varying float vShade;
varying vec3 vWorld;
void main() {
  float fold = uBand - abs(mod(vDepth, 2.0 * uBand) - uBand);
  // each fold also drifts a little along the edge, so no fold mirrors the one above it
  vec2 uv = vEdge + vIn * (uInset + fold) + vAlong * (0.45 * vDepth);
  vec3 crisp = texture2D(map, uv).rgb;
  vec3 soft = texture2D(map, uv, 2.5).rgb;
  vec3 c = mix(crisp, soft, 0.55 * smoothstep(0.05, 0.9, vDepth));
  // seen nearly edge-on a side is a sliver: its rows would average into bands, so it settles into
  // the soft colour of its own edge (the side's outward normal is the in-image direction, reversed)
  vec3 view = normalize(cameraPosition - vWorld);
  float facing = abs(dot(normalize(vec3(-vIn, 0.0)), view));
  vec3 wide = texture2D(map, vEdge + vIn * uBand * 0.5, 5.0).rgb;
  c = mix(c, wide, 0.9 * (1.0 - smoothstep(0.12, 0.42, facing)));
  c *= vShade * (1.0 - 0.2 * smoothstep(0.0, 1.4, vDepth));
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}`;
// Depth only, with the colour pass's own vertex shader: the two land on exactly the same depth.
const DEPTH_FRAG = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}`;

function sideMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SIDE_VERT,
    fragmentShader: SIDE_FRAG,
    uniforms: { map: { value: null }, uOpacity: { value: 1 }, uBand: { value: SIDE_BAND }, uInset: { value: SIDE_INSET } },
    transparent: true,
    depthWrite: false,
    depthFunc: THREE.LessEqualDepth,
    side: THREE.DoubleSide,
  });
}
function sideDepthMaterial() {
  return new THREE.ShaderMaterial({ vertexShader: SIDE_VERT, fragmentShader: DEPTH_FRAG, colorWrite: false, transparent: true, side: THREE.DoubleSide });
}

/** A reference sheet over the footprint (world units). */
function sheetGeometry(zOf: (x: number, y: number) => number, step = 0.05) {
  const nx = Math.round((2 * HALF_W) / step) + 1;
  const ny = Math.round((2 * HALF_D) / step) + 1;
  const pos = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) {
    const y = -HALF_D + (2 * HALF_D * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const x = -HALF_W + (2 * HALF_W * i) / (nx - 1);
      pos.set([x, y, zOf(x, y)], (j * nx + i) * 3);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      idx.push(a, a + 1, a + nx + 1, a, a + nx + 1, a + nx);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

const SHEET_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
// A faint fill, an anti-aliased grid in world units (≈ 1.3 px lines), the outer edge drawn firmer.
// uSweep: the world x the sheet has come in to, from the sea's edge (x = +half) inland; the geoid's
// reveal runs it once across, so the sheet is seen to carry on from the sea under the land.
const SHEET_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFill;
uniform float uLine;
uniform float uGrid;
uniform vec2 uHalf;
uniform float uOpacity;
uniform float uSweep;
varying vec3 vW;
void main() {
  vec2 c = vW.xy / uGrid;
  vec2 d = abs(fract(c - 0.5) - 0.5) / max(fwidth(c), vec2(1e-5));
  float grid = 1.0 - clamp(min(d.x, d.y) - 0.35, 0.0, 1.0);
  vec2 e = (uHalf - abs(vW.xy)) / max(fwidth(vW.xy), vec2(1e-5));
  float edge = 1.0 - clamp(min(e.x, e.y) - 0.9, 0.0, 1.0);
  float a = mix(uFill, uLine, max(grid, edge)) * uOpacity * smoothstep(uSweep - 0.35, uSweep, vW.x);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;

function sheetMaterial(hex: string, fill: number, line: number, grid: number) {
  return new THREE.ShaderMaterial({
    vertexShader: SHEET_VERT,
    fragmentShader: SHEET_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(hex) },
      uFill: { value: fill },
      uLine: { value: line },
      uGrid: { value: grid },
      uHalf: { value: new THREE.Vector2(HALF_W, HALF_D) },
      uOpacity: { value: 0 },
      uSweep: { value: -HALF_W - 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** The soft contact shadow on the table: the footprint, blurred, thrown a little to the right (sun from the left). */
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.shadowColor = 'rgba(30, 28, 20, 1)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetX = 4000;
  // on a 12 × 7.5 plane centred on the model (image top = the back)
  const sx = 512 / 12;
  const sy = 320 / 7.5;
  ctx.fillRect(-4000 + (6 - HALF_W + 0.12) * sx, (3.75 - HALF_D - 0.06) * sy, 2 * HALF_W * sx, 2 * HALF_D * sy);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Moves a number toward its goal over `ms` (at once under reduced motion); keeps frames coming while it moves. */
function useEased(goal: number, ms: number, reduce: boolean, delay = 0) {
  const v = useRef(goal);
  const from = useRef(goal);
  const t0 = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const [, bump] = useState(0);
  useEffect(() => {
    if (reduce) {
      v.current = goal;
      bump((n) => n + 1);
      invalidate();
      return;
    }
    from.current = v.current;
    t0.current = performance.now() + delay;
    invalidate();
  }, [goal, reduce, delay, invalidate]);
  useFrame(() => {
    if (reduce || v.current === goal) return;
    const u = Math.min(1, Math.max(0, (performance.now() - t0.current) / ms));
    const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    v.current = from.current + (goal - from.current) * e;
    if (u >= 1) v.current = goal;
    invalidate();
  });
  return v;
}

function CameraRig({ cam }: { cam: LandCamera }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.up.set(0, 0, 1);
    camera.position.set(...cam.eye);
    camera.fov = cam.fovY;
    camera.aspect = cam.aspect;
    camera.near = cam.near;
    camera.far = cam.far;
    camera.lookAt(...cam.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    invalidate();
  }, [cam, camera, invalidate]);
  return null;
}

function Model({
  grid,
  state,
  cam,
  reduce,
  active,
  onReady,
  onFail,
}: {
  grid: HeightGrid;
  state: ModelState;
  cam: LandCamera;
  reduce: boolean;
  active: boolean;
  onReady: () => void;
  onFail: (why: 'image') => void;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [albedo, setAlbedo] = useState<THREE.Texture | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The ground image. An image that fails is reported (the stills stay, with a retry); one that
  // arrives after the model is gone is given straight back.
  useEffect(() => {
    let live = true;
    new THREE.TextureLoader().load(
      MODEL_URLS.albedo,
      (t) => {
        if (!live) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        // the sides' folds may reach past the image's border: it mirrors back instead of repeating one row
        t.wrapS = THREE.MirroredRepeatWrapping;
        t.wrapT = THREE.MirroredRepeatWrapping;
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        setAlbedo(t);
        invalidate();
      },
      undefined,
      () => {
        if (live) onFail('image');
      },
    );
    return () => {
      live = false;
    };
  }, [gl, invalidate, onFail]);

  // Back on the stage after another view held it (no frames were drawn meanwhile): draw one now.
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  const parts = useMemo(() => {
    const G = grids(grid);
    return {
      top: topGeometry(grid, G),
      sides: sideGeometry(grid, G),
      sea: seaGeometry(grid, G),
      geoid: sheetGeometry((x, y) => geoidZ(undulationAt(x * MPU, y * MPU)) + 0.004),
      ellipsoid: sheetGeometry(() => 0),
    };
  }, [grid]);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);

  const mats = useMemo(() => {
    // the ground's nearest layer only: depth first, then colour where it is that layer. Both passes are
    // 'transparent' so they take their turn by render order, after everything the ground may cover.
    const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true });
    const top = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth });
    return {
      depthOnly,
      top,
      sidesDepth: sideDepthMaterial(),
      sides: sideMaterial(),
      shadow: new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
      geoid: sheetMaterial(C_GEO, 0.32, 0.95, 0.75),
      sea: new THREE.MeshBasicMaterial({ color: C_SEA, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
      ellipsoid: sheetMaterial(C_ELL, 0.07, 0.34, 1.5),
    };
  }, []);
  useEffect(() => {
    mats.top.map = albedo;
    mats.top.needsUpdate = true;
    mats.sides.uniforms.map.value = albedo;
    invalidate();
  }, [albedo, mats, invalidate]);
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        (m as THREE.MeshBasicMaterial).map?.dispose();
        m.dispose();
      });
    },
    [mats],
  );

  // clear: the ground thins, then the sheets come up inside it
  const groundA = useEased(state.clear ? CLEAR_OPACITY : 1, 560, reduce);
  const sheetsA = useEased(state.clear ? 1 : 0, 420, reduce, state.clear ? 220 : 0);
  // the geoid sheet sweeps in from the sea (x = +half) inland; its line in the survey plane follows it
  const sweep = useEased(state.clear ? -HALF_W - 0.5 : HALF_W + 0.5, SWEEP_MS, reduce, state.clear ? 220 : 0);
  const geoidLineA = useEased(state.clear ? 1 : 0, 380, reduce, state.clear ? 220 + SWEEP_MS * 0.8 : 0);
  const sheets = useRef<THREE.Group>(null);
  // the contact shadow on the table: seen almost edge-on from low angles, it would read as a grey band
  const d = [cam.eye[0] - cam.target[0], cam.eye[1] - cam.target[1], cam.eye[2] - cam.target[2]];
  const elev = (Math.asin(d[2] / Math.hypot(d[0], d[1], d[2])) * 180) / Math.PI;
  const lowFade = Math.min(1, Math.max(0.12, (elev - 4) / 22));
  useFrame(() => {
    const g = groundA.current;
    mats.top.opacity = g;
    mats.sides.uniforms.uOpacity.value = g;
    mats.shadow.opacity = 0.42 * lowFade * (0.45 + 0.55 * g);
    mats.geoid.uniforms.uOpacity.value = sheetsA.current;
    mats.geoid.uniforms.uSweep.value = sweep.current;
    mats.sea.opacity = 0.5 * sheetsA.current;
    mats.ellipsoid.uniforms.uOpacity.value = sheetsA.current;
    if (sheets.current) sheets.current.visible = sheetsA.current > 0.003;
  });

  // Ready once a frame has been drawn with the ground image on the ground: this callback runs just
  // before that frame is rendered, so the page is told on the next animation frame, after it.
  const told = useRef(false);
  useFrame(() => {
    if (told.current || !albedo || mats.top.map !== albedo) return;
    told.current = true;
    requestAnimationFrame(() => mounted.current && onReady());
  });

  return (
    <group>
      <mesh position={[0, 0, M.baseZ - 0.002]} material={mats.shadow} renderOrder={-1}>
        <planeGeometry args={[12, 7.5]} />
      </mesh>
      <group ref={sheets}>
        <mesh geometry={parts.ellipsoid} material={mats.ellipsoid} renderOrder={ORDER.sheetEll} />
        <mesh geometry={parts.geoid} material={mats.geoid} renderOrder={ORDER.sheetGeo} />
        <mesh geometry={parts.sea} material={mats.sea} renderOrder={ORDER.sea} />
        <PlaneLines opacity={sheetsA} geoidOpacity={geoidLineA} />
        <Outline grid={grid} opacity={sheetsA} />
      </group>
      <mesh geometry={parts.top} material={mats.depthOnly} renderOrder={ORDER.groundDepth} />
      <mesh geometry={parts.sides} material={mats.sidesDepth} renderOrder={ORDER.groundDepth} />
      <mesh geometry={parts.top} material={mats.top} renderOrder={ORDER.ground} />
      <mesh geometry={parts.sides} material={mats.sides} renderOrder={ORDER.ground} />
      <Analytic grid={grid} state={state} />
    </group>
  );
}

type Eased = { current: number };

/** Lines whose opacity follows a value that eases (the clear ground's sheets). */
function useFollow(opacity: Eased, base = 1) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    group.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as (THREE.Material & { opacity: number }) | undefined;
      if (m && 'opacity' in m) m.opacity = opacity.current * (o.userData.alpha ?? base);
    });
  });
  return group;
}

/** The geoid and the ellipsoid in the survey line's plane: the section's reference lines, inside the clear ground. */
function PlaneLines({ opacity, geoidOpacity }: { opacity: Eased; geoidOpacity: Eased }) {
  const lines = useMemo(() => surveyPlaneLines(), []);
  const ell = useFollow(opacity, 0.7);
  const geo = useFollow(geoidOpacity);
  return (
    <>
      <group ref={ell}>
        <Line points={lines.ellipsoid} color={C_ELL} lineWidth={2.25} transparent renderOrder={ORDER.planeLines} />
      </group>
      <group ref={geo}>
        <Line points={lines.geoid} color={C_GEO} lineWidth={4} transparent renderOrder={ORDER.planeLines} />
      </group>
    </>
  );
}

/** The clear ground's envelope: its top edges, its base and its corners, drawn quietly so its shape stays readable. */
function Outline({ grid, opacity }: { grid: HeightGrid; opacity: Eased }) {
  const runs = useMemo(() => {
    const z = (x: number, y: number) => topZ(grid, x * MPU, y * MPU);
    const n = 90;
    const along = (a: [number, number], b: [number, number]) =>
      Array.from({ length: n + 1 }, (_, t) => {
        const x = a[0] + ((b[0] - a[0]) * t) / n;
        const y = a[1] + ((b[1] - a[1]) * t) / n;
        return [x, y, z(x, y)] as Vec3;
      });
    const c: [number, number][] = [
      [-HALF_W, -HALF_D],
      [HALF_W, -HALF_D],
      [HALF_W, HALF_D],
      [-HALF_W, HALF_D],
    ];
    const top = c.map((p, i) => along(p, c[(i + 1) % 4]));
    const base = [...c, c[0]].map(([x, y]) => [x, y, M.baseZ] as Vec3);
    const corners = c.map(([x, y]) => [[x, y, M.baseZ] as Vec3, [x, y, z(x, y)] as Vec3]);
    return [...top, base, ...corners];
  }, [grid]);
  const group = useFollow(opacity, 0.45);
  return (
    <group ref={group}>
      {runs.map((pts, i) => (
        <Line key={i} points={pts} color={C_INK} lineWidth={1.25} transparent renderOrder={ORDER.outline} />
      ))}
    </group>
  );
}

/** What the page draws on the model, in the model: the survey line and the receiver. */
function Analytic({ grid, state }: { grid: HeightGrid; state: ModelState }) {
  const survey = useMemo(() => surveyLine3D(), []);
  return (
    <group>
      {state.survey && <Line points={survey} color={C_ACCENT} lineWidth={2} dashed dashSize={0.07} gapSize={0.05} transparent opacity={0.95} renderOrder={ORDER.lines} />}
      {state.tripod && <Tripod id={state.tripod} grid={grid} />}
    </group>
  );
}



/** The GNSS receiver on its tripod, right of the station (clear of its pin) on the ground just behind the survey line. */
function Tripod({ id, grid }: { id: StationId; grid: HeightGrid }) {
  const s = L.stations[id];
  const x = s.x + 0.44;
  const y = L.lineY + 0.07;
  const z = topZ(grid, x * MPU, y * MPU);
  const h = 0.46;
  const legs = useMemo(
    () =>
      [0, 1, 2].map((k) => {
        const a = ((90 + k * 120 + 20) * Math.PI) / 180;
        const foot = new THREE.Vector3(Math.cos(a) * h * 0.34, Math.sin(a) * h * 0.34, 0);
        const top = new THREE.Vector3(0, 0, h);
        const mid = foot.clone().add(top).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
        return { mid, q, len: top.distanceTo(foot) };
      }),
    [],
  );
  return (
    <group position={[x, y, z]} scale={1.4}>
      {legs.map((l, i) => (
        <mesh key={i} position={l.mid} quaternion={l.q}>
          <cylinderGeometry args={[0.009, 0.011, l.len, 8]} />
          <meshLambertMaterial color="#C29455" />
        </mesh>
      ))}
      <mesh position={[0, 0, h]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.022, 16]} />
        <meshLambertMaterial color="#3A3F38" />
      </mesh>
      <mesh position={[0, 0, h + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.065, 10]} />
        <meshLambertMaterial color="#3A3F38" />
      </mesh>
      <mesh position={[0, 0, h + 0.082]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.034, 0.046, 0.026, 28]} />
        <meshLambertMaterial color="#F4F2EC" />
      </mesh>
      {/* a soft shadow on the ground, thrown right like the renders' */}
      <mesh position={[0.07, 0.01, 0.004]} renderOrder={ORDER.lines}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color="#1E1C14" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * The model's WebGL context, while the model is on the page. The browser may take a context away
 * (a GPU reset, too many contexts) and give it back: the page shows the stills meanwhile and
 * returns to the model once a frame is drawn again. The listeners leave with the model — so the
 * context loss three.js forces on purpose when a canvas is torn down (r3f does so 500 ms after
 * unmounting it, e.g. on a remount) is never read as the model failing.
 */
function ContextWatch({ onLost, onReady }: { onLost: () => void; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const back = useRef(false);
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault(); // lets the browser restore it
      onLost();
    };
    const restored = () => {
      back.current = true;
      invalidate();
    };
    el.addEventListener('webglcontextlost', lost);
    el.addEventListener('webglcontextrestored', restored);
    return () => {
      el.removeEventListener('webglcontextlost', lost);
      el.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, invalidate, onLost]);
  useFrame(() => {
    if (!back.current) return;
    back.current = false;
    requestAnimationFrame(onReady);
  });
  return null;
}

class GLBoundary extends Component<{ onFail: (why: 'webgl') => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[measurement] the 3-D model stopped:', error);
    this.props.onFail('webgl');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MeasurementLandscape3D({
  grid,
  cam,
  state,
  reduce,
  active,
  onReady,
  onFail,
  onLost,
}: {
  grid: HeightGrid;
  cam: LandCamera;
  state: ModelState;
  reduce: boolean;
  /** Off while the stage shows another body: no frames are drawn. */
  active: boolean;
  /** A frame has been drawn with the ground on it (again, after a lost context came back). */
  onReady: () => void;
  onFail: (why: 'image' | 'webgl') => void;
  onLost: () => void;
}) {
  return (
    <GLBoundary onFail={onFail}>
      <Canvas
        aria-hidden
        flat
        dpr={[1, 2]}
        resize={LESSON_FIT_CANVAS_RESIZE}
        frameloop={active ? 'demand' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ manual: true, fov: cam.fovY, near: cam.near, far: cam.far, position: cam.eye, up: [0, 0, 1] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <hemisphereLight args={['#FFF4E0', '#6B6A45', 1.1]} />
        <directionalLight position={[-8, 0.3, 6]} intensity={2.2} color="#FFF1DC" />
        <ContextWatch onLost={onLost} onReady={onReady} />
        <CameraRig cam={cam} />
        <Model grid={grid} state={state} cam={cam} reduce={reduce} active={active} onReady={onReady} onFail={onFail} />
      </Canvas>
    </GLBoundary>
  );
}
