'use client';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { MEASUREMENT_MODEL as M } from './measurementModel.data';
import { N_Z_PER_M, Z_PER_M, geoidZ, undulationAt, type Vec3 } from './measurementLayout';
import type { StationId } from './measurementMission.data';
import { MODEL_URLS, faceLines, stationArrows, surveyLine3D, topZ, worldPerPixel, type HeightGrid, type LandCamera, type ModelState } from './measurementView';
import { C_ACCENT, C_ELL, C_GEO, C_H, C_INK } from './referenceBodiesStyle';

/**
 * The turnable landscape (WebGL): the renders' own ground, live.
 *
 *   ground   the height grid (model-height.bin) meshed every 10 m, wearing the
 *            straight-down Cycles image (model-albedo.webp) unlit — the renders'
 *            sun, trees and shadows are in it, and light on diffuse ground does
 *            not change with the viewing angle, so every angle shows the same
 *            landscape as the renders. Built in two parts: behind the survey
 *            line, and the slab in front of it, which drops away to open the cut.
 *   walls    the cut base in the renders' ground tone with its thin topsoil
 *            band, and the sea's own face where the ground is under water;
 *            shaded once per side for the renders' sun (from the left).
 *   sheets   the geoid (wavy, N exaggerated like the land) and the flat
 *            ellipsoid: a faint fill and a thin analytic grid, depth-tested, so
 *            they are part of the model and the land hides them.
 *   lines    the dashed survey line, the three lines on the cut face, the
 *            heights at the picked station, the station's ring — in 3-D, so
 *            the ground hides them where it should.
 *   tripod   the GNSS receiver beside the picked station (the only lit object).
 *
 * The camera is given (landCamera(): the same numbers the HTML overlay projects
 * with), so nothing here decides where anything lands on screen. Frames render
 * on demand. Loaded client-only (next/dynamic) by MeasurementLandscape.
 */


const MPU = L.mPerUnit;
const HALF_W = L.width / 2;
const HALF_D = L.depth / 2;
const CELL = M.heights.cell / MPU;
/** Grid row of the survey line (the cut plane). */
const J_CUT = Math.round((L.lineY + HALF_D) / CELL);
const SLAB_AWAY = { y: -0.35, z: -2.1 };

/** The renders' cut face, as seen there (sampled from land-cut.png): pale ground, a thin dark topsoil band. */
const WALL = { low: '#BCB3A4', high: '#B7AC9A', soil: '#57493A', shallow: '#6FAAB8', deep: '#3A7590' };
/** Each side's light from the renders' sun (from the left, high): left lit, right in shade. */
const SHADE = { front: 1, back: 0.8, left: 1.07, right: 0.84 };

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

/** The top surface between grid rows j0 … j1, draped with the straight-down image. */
function topGeometry(g: HeightGrid, G: Grids, j0: number, j1: number) {
  const { cols, rows } = g;
  const n = cols * (j1 - j0 + 1);
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  for (let j = j0; j <= j1; j++) {
    for (let i = 0; i < cols; i++) {
      const k = (j - j0) * cols + i;
      pos.set([-HALF_W + i * CELL, -HALF_D + j * CELL, G.zTop[j * cols + i]], k * 3);
      uv.set([i / (cols - 1), j / (rows - 1)], k * 2);
    }
  }
  const idx = new Uint32Array((cols - 1) * (j1 - j0) * 6);
  let o = 0;
  for (let j = 0; j < j1 - j0; j++) {
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

/** The four upright sides of the block between rows j0 … j1, vertex-coloured. */
function wallGeometry(g: HeightGrid, G: Grids, j0: number, j1: number) {
  const { cols } = g;
  const col = (hex: string, s: number) => new THREE.Color(hex).multiplyScalar(s);
  const pos: number[] = [];
  const clr: number[] = [];
  const idx: number[] = [];
  const side = (samples: [number, number, number][], shade: number) => {
    // per sample: base, under the band, band, ground (earth) · seabed, sea surface (water)
    const start = pos.length / 3;
    const low = col(WALL.low, shade);
    const high = col(WALL.high, shade);
    const soil = col(WALL.soil, shade);
    for (const [x, y, k] of samples) {
      const zt = G.zTop[k];
      const zg = G.zGround[k];
      const depth = zt - zg;
      const water = col(WALL.shallow, shade).lerp(col(WALL.deep, shade), Math.min(1, depth / 0.22));
      const rows: [number, THREE.Color][] = [
        [M.baseZ, low],
        [zg - 0.03, high],
        [zg - 0.018, soil],
        [zg, soil],
        [zg, water],
        [zt, col(WALL.shallow, shade)],
      ];
      for (const [z, c] of rows) {
        pos.push(x, y, z);
        clr.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < samples.length - 1; s++) {
      const a = start + s * 6;
      const b = a + 6;
      for (const r of [0, 1, 2, 4]) idx.push(a + r, b + r, b + r + 1, a + r, b + r + 1, a + r + 1);
    }
  };
  const row = (j: number) => Array.from({ length: cols }, (_, i) => [-HALF_W + i * CELL, -HALF_D + j * CELL, j * cols + i] as [number, number, number]);
  const column = (i: number) => Array.from({ length: j1 - j0 + 1 }, (_, t) => [-HALF_W + i * CELL, -HALF_D + (j0 + t) * CELL, (j0 + t) * cols + i] as [number, number, number]);
  side(row(j0), SHADE.front);
  side(row(j1), SHADE.back);
  side(column(0), SHADE.left);
  side(column(cols - 1), SHADE.right);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/** A reference sheet over the footprint between y0 and y1 (world units). */
function sheetGeometry(y0: number, y1: number, zOf: (x: number, y: number) => number, step = 0.05) {
  const nx = Math.round((2 * HALF_W) / step) + 1;
  const ny = Math.max(2, Math.round((y1 - y0) / step) + 1);
  const pos = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) {
    const y = y0 + ((y1 - y0) * j) / (ny - 1);
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
// A faint fill, an anti-aliased grid in world units (≈ 1.3 px lines), the front edge drawn firmer.
const SHEET_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFill;
uniform float uLine;
uniform float uGrid;
uniform float uEdgeY;
uniform float uOpacity;
varying vec3 vW;
void main() {
  vec2 c = vW.xy / uGrid;
  vec2 d = abs(fract(c - 0.5) - 0.5) / max(fwidth(c), vec2(1e-5));
  float grid = 1.0 - clamp(min(d.x, d.y) - 0.35, 0.0, 1.0);
  float edge = 1.0 - clamp(abs(vW.y - uEdgeY) / max(fwidth(vW.y), 1e-5) - 0.9, 0.0, 1.0);
  float a = mix(uFill, uLine, max(grid, edge)) * uOpacity;
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
      uEdgeY: { value: -HALF_D },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * The soft contact shadow on the table: a block's footprint (world y0 … y1),
 * blurred, thrown a little to the right (sun from the left). The part behind
 * the survey line and the slab each have their own, so the slab's leaves with it.
 */
function shadowTexture(y0: number, y1: number) {
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
  ctx.fillRect(-4000 + (6 - HALF_W + 0.12) * sx, (3.75 - y1 - 0.06) * sy, 2 * HALF_W * sx, (y1 - y0) * sy);
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

function Model({ grid, state, reduce, wpp, onReady }: { grid: HeightGrid; state: ModelState; reduce: boolean; wpp: number; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [albedo, setAlbedo] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let live = true;
    new THREE.TextureLoader().load(MODEL_URLS.albedo, (t) => {
      if (!live) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      setAlbedo(t);
      invalidate();
    });
    return () => {
      live = false;
    };
  }, [gl, invalidate]);

  const parts = useMemo(() => {
    const G = grids(grid);
    const last = grid.rows - 1;
    return {
      backTop: topGeometry(grid, G, J_CUT, last),
      backWalls: wallGeometry(grid, G, J_CUT, last),
      slabTop: topGeometry(grid, G, 0, J_CUT),
      slabWalls: wallGeometry(grid, G, 0, J_CUT),
      geoid: sheetGeometry(-HALF_D, HALF_D, (x, y) => geoidZ(undulationAt(x * MPU, y * MPU)) + 0.004),
      ellipsoid: sheetGeometry(-HALF_D, L.lineY, () => 0),
    };
  }, [grid]);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);

  // the slab's own materials: it is clipped at the table while it drops away
  const mats = useMemo(() => {
    const table = new THREE.Plane(new THREE.Vector3(0, 0, 1), -M.baseZ + 0.0005);
    const top = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const walls = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide });
    const slabTop = top.clone();
    slabTop.clippingPlanes = [table];
    const slabWalls = walls.clone();
    slabWalls.clippingPlanes = [table];
    const shadow = new THREE.MeshBasicMaterial({ map: shadowTexture(L.lineY, HALF_D), transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });
    const slabShadow = new THREE.MeshBasicMaterial({ map: shadowTexture(-HALF_D, L.lineY), transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });
    return {
      top,
      walls,
      slabTop,
      slabWalls,
      shadow,
      slabShadow,
      geoid: sheetMaterial(C_GEO, 0.12, 0.6, 0.5),
      ellipsoid: sheetMaterial(C_ELL, 0.08, 0.45, 1),
    };
  }, []);
  useEffect(() => {
    for (const m of [mats.top, mats.slabTop]) {
      m.map = albedo;
      m.needsUpdate = true;
    }
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

  // slab out / in; then the sheets
  const away = useEased(state.open ? 1 : 0, 620, reduce);
  const geoidA = useEased(state.geoidSheet ? 1 : 0, 380, reduce, state.open ? 260 : 0);
  const ellA = useEased(state.ellipsoidSheet ? 1 : 0, 380, reduce, 320);
  const slab = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = away.current;
    if (slab.current) {
      slab.current.position.set(0, SLAB_AWAY.y * t, SLAB_AWAY.z * t);
      slab.current.visible = t < 0.999;
    }
    mats.slabShadow.opacity = 0.42 * (1 - Math.min(1, t * 1.6));
    mats.geoid.uniforms.uOpacity.value = geoidA.current;
    mats.ellipsoid.uniforms.uOpacity.value = ellA.current;
  });

  // ready once the ground image is on it and a frame has been drawn
  const told = useRef(false);
  useFrame(() => {
    if (albedo && !told.current) {
      told.current = true;
      requestAnimationFrame(onReady);
    }
  });

  return (
    <group>
      <mesh geometry={parts.backTop} material={mats.top} />
      <mesh geometry={parts.backWalls} material={mats.walls} />
      <group ref={slab}>
        <mesh geometry={parts.slabTop} material={mats.slabTop} />
        <mesh geometry={parts.slabWalls} material={mats.slabWalls} />
      </group>
      <mesh position={[0, 0, M.baseZ - 0.002]} material={mats.shadow} renderOrder={-1}>
        <planeGeometry args={[12, 7.5]} />
      </mesh>
      <mesh position={[0, 0, M.baseZ - 0.0025]} material={mats.slabShadow} renderOrder={-1}>
        <planeGeometry args={[12, 7.5]} />
      </mesh>
      <mesh geometry={parts.geoid} material={mats.geoid} renderOrder={2} />
      <mesh geometry={parts.ellipsoid} material={mats.ellipsoid} renderOrder={1} />
      <Analytic grid={grid} state={state} reduce={reduce} wpp={wpp} />
    </group>
  );
}

/** Lines and arrows: what the page draws on the model, in the model. */
function Analytic({ grid, state, reduce, wpp }: { grid: HeightGrid; state: ModelState; reduce: boolean; wpp: number }) {
  const survey = useMemo(() => surveyLine3D(), []);
  const face = useMemo(() => faceLines(), []);
  const faceA = useEased(state.face ? 1 : 0, 420, reduce, state.face ? 380 : 0);
  const [faceOn, setFaceOn] = useState(state.face);
  const lines = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = faceA.current;
    lines.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { opacity: number };
      if (m && 'opacity' in m && o.userData.face) m.opacity = a * (o.userData.alpha ?? 1);
    });
    if ((a > 0) !== faceOn) setFaceOn(a > 0);
  });
  const ring = useMemo(() => {
    if (!state.ring) return null;
    const s = L.stations[state.ring];
    const r = 60 / MPU;
    return Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const x = s.x + Math.cos(a) * r;
      const y = s.y + Math.sin(a) * r;
      return [x, y, topZ(grid, x * MPU, y * MPU) + 0.006] as Vec3;
    });
  }, [state.ring, grid]);

  return (
    <group ref={lines}>
      {state.survey && <Line points={survey} color={C_ACCENT} lineWidth={1.75} dashed dashSize={0.07} gapSize={0.05} transparent opacity={0.9} />}
      {ring && <Line points={ring} color={C_ACCENT} lineWidth={2.25} />}
      {faceOn && (
        <>
          <Line points={face.ellipsoid} color={C_ELL} lineWidth={2.5} dashed dashSize={0.08} gapSize={0.05} transparent userData={{ face: true }} />
          <Line points={face.geoid} color={C_GEO} lineWidth={4} transparent userData={{ face: true }} />
          {face.ground.map((run, i) => (
            <Line key={i} points={run} color={C_INK} lineWidth={2} transparent userData={{ face: true, alpha: 0.85 }} />
          ))}
        </>
      )}
      {state.arrows && <Arrows id={state.arrows} wpp={wpp} />}
      {state.tripod && <Tripod id={state.tripod} grid={grid} />}
    </group>
  );
}

/** h, N and H at a station, upright on the cut face; a head where the arrow is long enough to carry one. */
function Arrows({ id, wpp }: { id: StationId; wpp: number }) {
  const segs = stationArrows(id);
  const head = 7 * wpp;
  const items = (
    [
      ['N', C_GEO],
      ['H', C_H],
      ['h', C_ELL],
    ] as const
  ).map(([k, color]) => {
    const [a, b] = segs[k];
    const len = b[2] - a[2];
    const dir = Math.sign(len) || 1;
    const withHead = Math.abs(len) > head * 1.7;
    const shaftEnd: Vec3 = withHead ? [b[0], b[1], b[2] - dir * head] : b;
    const tick = 3.5 * wpp;
    return { k, color, a, b, dir, withHead, shaftEnd, tick };
  });
  return (
    <group>
      {items.map(({ k, color, a, b, dir, withHead, shaftEnd, tick }) => (
        <group key={k}>
          <Line points={[a, shaftEnd]} color={color} lineWidth={3} />
          {/* the surface it starts on */}
          <Line points={[[a[0] - tick, a[1], a[2]], [a[0] + tick, a[1], a[2]]]} color={color} lineWidth={2} />
          {withHead && (
            <mesh>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([b[0] - head * 0.42, b[1], b[2] - dir * head, b[0] + head * 0.42, b[1], b[2] - dir * head, b[0], b[1], b[2]]), 3]}
                />
              </bufferGeometry>
              <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** The GNSS receiver on its tripod, just right of the station on the ground behind the cut. */
function Tripod({ id, grid }: { id: StationId; grid: HeightGrid }) {
  const s = L.stations[id];
  const x = s.x + 0.24;
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
    <group position={[x, y, z]}>
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
      <mesh position={[0.07, 0.01, 0.004]}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color="#1E1C14" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

class GLBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MeasurementLandscape3D({
  grid,
  cam,
  height,
  state,
  reduce,
  active,
  onReady,
  onFail,
}: {
  grid: HeightGrid;
  cam: LandCamera;
  /** Box height (px), for the size of a pixel on the model. */
  height: number;
  state: ModelState;
  reduce: boolean;
  /** Off while the stage shows another body: no frames are drawn. */
  active: boolean;
  onReady: () => void;
  onFail: () => void;
}) {
  // world size of a screen pixel at the picked station: the arrowheads keep their pixel size
  const at = L.stations[state.arrows ?? 'B'];
  const wpp = worldPerPixel(cam, [at.x, at.y, at.z], height);
  return (
    <GLBoundary onFail={onFail}>
      <Canvas
        aria-hidden
        flat
        dpr={[1, 2]}
        frameloop={active ? 'demand' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ manual: true, fov: cam.fovY, near: cam.near, far: cam.far, position: cam.eye, up: [0, 0, 1] }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onFail();
          });
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <hemisphereLight args={['#FFF4E0', '#6B6A45', 1.1]} />
        <directionalLight position={[-8, 0.3, 6]} intensity={2.2} color="#FFF1DC" />
        <CameraRig cam={cam} />
        <Model grid={grid} state={state} reduce={reduce} wpp={wpp} onReady={onReady} />
      </Canvas>
    </GLBoundary>
  );
}
