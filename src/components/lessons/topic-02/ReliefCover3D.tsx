'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COVER, GROVE, HILL, HOUSES, ORCHARD, SHRUBS, STATES, type House, type StateId, type Tree } from './reliefCoverCompare.data';
import { CENTER, DRAPE, DRAPE_FEATHER, groundMesh, toWorld, type DrapeRegion } from './reliefCoverMesh';
import { LESSON_FIT_CANVAS_RESIZE, useLessonViewportScale } from '@/components/lesson/LessonViewportFit';

/**
 * ReliefCover3D — the "בשטח" board of „אותה גבעה, שלושה נופים” as a live model, in the lesson's
 * realistic language. Everything is the same terrain the map beside it draws (reliefCoverCompare.data),
 * dressed in straight-down Cycles renders of it (scripts/blender/render_relief_cover_model.py), unlit,
 * the way the coordinates globe wears its satellite imagery:
 *   ground   the mesh (reliefCoverMesh, VEX× high) wears the renders of the ground out to the horizon
 *            and, over the sheet, the render of the current state — the shadows its land cover casts,
 *            the quarried ground in state 4
 *   objects  every tree, shrub and house is real 3D (crowns, trunks, walls with windows, roofs), its top
 *            wearing the render of the objects themselves; the sides are shaded by the same sun
 * A state change sweeps the next state's ground in from the near side; objects grow out of the ground
 * (or shrink away) as the sweep passes them, and the quarry reshapes the ground itself (a morph between
 * the two poses). Growth runs in the shaders; frames render on demand.
 * Rendered client-only via next/dynamic (ReliefCoverModel).
 */

export type ViewCommand = { seq: number; kind: 'home' | 'top' | 'zoom-in' | 'zoom-out' };
export type Model3DProps = {
  state: StateId;
  reduce: boolean;
  command: ViewCommand | null;
  /** camera heading (deg, 0 = looking north) and whether the view is straight down — for the north arrow */
  onHeading?: (yawDeg: number, topDown: boolean) => void;
  onReady?: () => void;
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const DIR = `${BASE}/assets/lessons/topic02/relief-cover-model`;
type TexKey = 'outer' | 'mid' | 'objects' | StateId;
const TEXTURES = Object.fromEntries((['outer', 'mid', 'objects', ...STATES] as TexKey[]).map((k) => [k, `${DIR}/${k}.webp`])) as Record<TexKey, string>;

/** Opening view: from the south, looking north (north up the screen, like the map). */
export const HOME = { target: [0, 30, 8] as [number, number, number], distance: 590, polarDeg: 58 } as const;
const DIST = { min: 240, max: 1150 } as const;
const HAZE = '#E4E1D6';
/** One unit of the change timeline (ms): the ground sweeps across the sheet in 1 unit, the last
 *  objects finish growing at T_END. */
const SWEEP_MS = 1100;
const T_END = 1.5;
/** The renders' sun (render_relief_cover_model.py SUN_AZ / SUN_EL): 225° from north, 42° up. World: X east, Y up, Z south. */
const SUN = (() => {
  const az = THREE.MathUtils.degToRad(225);
  const el = THREE.MathUtils.degToRad(42);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
})();

// ---------------------------------------------------------------- the drape (shared by every material)

/** x0, y0, x1, y1 of a drape region, for the shader. */
const rect = (r: DrapeRegion) => new THREE.Vector4(r.x0, r.y0, r.x1, r.y1);

function sharedUniforms(tex: Record<TexKey, THREE.Texture>, state: StateId) {
  const s = STATES.indexOf(state);
  return {
    uOuter: { value: tex.outer },
    uMid: { value: tex.mid },
    uObjects: { value: tex.objects },
    uFrom: { value: tex[state] },
    uTo: { value: tex[state] },
    /** the change timeline, 0 … T_END (T_END: at rest) */
    uT: { value: T_END },
    uFromS: { value: s },
    uToS: { value: s },
    uOuterR: { value: rect(DRAPE.outer) },
    uMidR: { value: rect(DRAPE.mid) },
    uSheetR: { value: rect(DRAPE.sheet) },
    uFeather: { value: new THREE.Vector2(DRAPE_FEATHER.mid, DRAPE_FEATHER.sheet) },
    uCenter: { value: new THREE.Vector2(CENTER.x, CENTER.y) },
    uSun: { value: SUN },
  };
}
type Shared = ReturnType<typeof sharedUniforms>;

const COMMON = /* glsl */ `
uniform sampler2D uOuter, uMid, uObjects, uFrom, uTo;
uniform float uT, uFromS, uToS, uSpread;
uniform vec4 uOuterR, uMidR, uSheetR;
uniform vec2 uFeather, uCenter;
uniform vec3 uSun;
varying vec2 vPlan;
varying vec3 vNrm;
varying vec3 vWall;
// sheet-plan metres (x east, y south) → a render's uv (north at the top of the image)
vec2 drapeUv(vec4 r) { return vec2((vPlan.x - r.x) / (r.z - r.x), (r.w - vPlan.y) / (r.w - r.y)); }
// 0 outside a region, easing to 1 over \`f\` metres inside its edge
float drapeIn(vec4 r, float f) {
  float e = min(min(vPlan.x - r.x, r.z - vPlan.x), min(vPlan.y - r.y, r.w - vPlan.y));
  return smoothstep(0.0, f, e);
}
float drapeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float drapeNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(drapeHash(i), drapeHash(i + vec2(1, 0)), f.x), mix(drapeHash(i + vec2(0, 1)), drapeHash(i + 1.0), f.x), f.y);
}`;

/** An object's growth (0 … 1) at the current point of the change: it grows once the sweep has passed
 *  its place, or shrinks just before the sweep takes its ground away. */
const GROWTH = /* glsl */ `
attribute vec3 aBase;
attribute float aMask;
attribute vec3 aWall;
float inState(float m, float s) { return mod(floor(m / exp2(s) + 0.01), 2.0); }
float growth() {
  float s = clamp((uSheetR.w - (aBase.z + uCenter.y)) / (uSheetR.w - uSheetR.y), 0.0, 1.0);
  float pf = inState(aMask, uFromS);
  float pt = inState(aMask, uToS);
  float grow = smoothstep(0.0, 1.0, (uT - (0.6 * s + 0.35)) / 0.4);
  float fall = smoothstep(0.0, 1.0, (uT - (0.6 * s - 0.05)) / 0.3);
  return pt > 0.5 ? (pf > 0.5 ? 1.0 : grow) : (pf > 0.5 ? 1.0 - fall : 0.0);
}`;

type Mode = 'ground' | 'canopy' | 'solid' | 'walls';

/**
 * One material of the model: MeshBasic (unlit, so the renders show as rendered, with fog), its colour
 * from the drape — the ground renders (ground), the objects render with a little side shade
 * (canopy: crowns, shrubs, tiled roofs), or a flat colour lit by the renders' sun (solid: trunks;
 * walls: house walls with windows and the flat roof on top).
 */
function drapeMaterial(shared: Shared, mode: Mode, spread = 1) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: true, vertexColors: mode !== 'ground' });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { uSpread: { value: spread } });
    const objects = mode !== 'ground';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${objects ? GROWTH : ''}`)
      .replace(
        '#include <begin_vertex>',
        objects
          ? /* glsl */ `#include <begin_vertex>
            float g = growth();
            float e = 1.0 - pow(1.0 - g, 3.0);
            float wide = mix(1.0, 0.35 + 0.65 * e, uSpread);
            vec3 off = transformed - aBase;
            transformed = aBase + vec3(off.x * wide, off.y * max(e, 0.001), off.z * wide) - vec3(0.0, (1.0 - g) * 1.5, 0.0);
            if (g <= 0.001) transformed = aBase - vec3(0.0, 4.0, 0.0);
            vNrm = normal;
            vWall = aWall;`
          : '#include <begin_vertex>',
      )
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPlan = (modelMatrix * vec4(transformed, 1.0)).xz + uCenter;');
    const color =
      mode === 'ground'
        ? /* glsl */ `
          vec3 c = texture2D(uOuter, drapeUv(uOuterR)).rgb;
          c = mix(c, texture2D(uMid, drapeUv(uMidR)).rgb, drapeIn(uMidR, uFeather.x));
          // the next state sweeps in from the near (south) side, along a ragged front
          vec2 su = drapeUv(uSheetR);
          float front = su.y * 0.6 + 0.15 * drapeNoise(vPlan / 14.0);
          float k = clamp((uT - front) / 0.25, 0.0, 1.0);
          vec3 sheet = mix(texture2D(uFrom, su).rgb, texture2D(uTo, su).rgb, k);
          diffuseColor.rgb *= mix(c, sheet, drapeIn(uSheetR, uFeather.y));`
        : mode === 'canopy'
          ? /* glsl */ `
            vec3 n = normalize(vNrm);
            diffuseColor.rgb *= texture2D(uObjects, drapeUv(uSheetR)).rgb * mix(0.58, 1.0, smoothstep(-0.4, 0.85, n.y));`
          : mode === 'solid'
            ? /* glsl */ `
              vec3 n = normalize(vNrm);
              diffuseColor.rgb *= 0.5 + 0.55 * max(dot(n, uSun), 0.0);`
            : /* glsl */ `
              vec3 n = normalize(vNrm);
              if (n.y > 0.5) {
                // the flat roof: the render of it (parapet, water heater, stair room)
                diffuseColor.rgb = texture2D(uObjects, drapeUv(uSheetR)).rgb;
              } else {
                // walls: two floors of windows on every face, lit by the renders' sun
                float along = vWall.x, up = vWall.y, H = vWall.z;
                float wx = fract(along / 4.5);
                float fy = mod(up - 0.3, 3.2);
                float win = step(0.37, wx) * step(wx, 0.63) * step(1.0, fy) * step(fy, 2.3) * step(1.0, up) * step(up, H - 1.2);
                diffuseColor.rgb *= mix(1.0, 0.45, win) * (0.68 + 0.45 * max(dot(n, uSun), 0.0));
              }`;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      // after the vertex colours (a crown's baked occlusion, a wall's colour), which the roof replaces
      .replace('#include <color_fragment>', `#include <color_fragment>\n${color}`);
  };
  return mat;
}

// ---------------------------------------------------------------- geometry

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Lumpy geometry from overlapping lobes, jittered once with a fixed seed; normals blend each lobe's
 * own with the clump's spherical normal (no faceting), and a baked occlusion darkens the underside.
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
    const ao = THREE.MathUtils.lerp(0.62, 1, THREE.MathUtils.smoothstep(v.y, -0.9, 0.75));
    colors.set([ao, ao, ao], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** A unit crown (radius ≈ 1, centred on the origin). */
function crownGeometry(seed: number, lobeCount: number, spread: number) {
  const rand = rng(seed);
  const lobes: [number, number, number, number][] = [[0, 0, 0, 0.72]];
  for (let k = 0; k < lobeCount; k++) {
    const a = rand() * Math.PI * 2;
    lobes.push([Math.cos(a) * spread, (rand() - 0.4) * 0.55, Math.sin(a) * spread, 0.36 + rand() * 0.2]);
  }
  return clumpGeometry(seed ^ 0x2f1ac81d, lobes, 1, 0.08);
}

/** Which states (bit per STATES index) an object is in. */
function masks(pick: (s: StateId) => { id: string }[]) {
  const m = new Map<string, number>();
  STATES.forEach((s, i) => pick(s).forEach((o) => m.set(o.id, (m.get(o.id) ?? 0) | (1 << i))));
  return m;
}

/** Tags a placed piece with its object's base point (it grows from there) and state mask. */
function tag(g: THREE.BufferGeometry, base: [number, number, number], mask: number, wall?: (i: number) => [number, number, number]) {
  const n = g.getAttribute('position').count;
  const b = new Float32Array(n * 3);
  const w = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    b.set(base, i * 3);
    if (wall) w.set(wall(i), i * 3);
  }
  g.setAttribute('aBase', new THREE.BufferAttribute(b, 3));
  g.setAttribute('aMask', new THREE.BufferAttribute(new Float32Array(n).fill(mask), 1));
  g.setAttribute('aWall', new THREE.BufferAttribute(w, 3));
  if (!g.getAttribute('color')) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return g;
}

const paint = (g: THREE.BufferGeometry, hex: string) => {
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};

const mergeAll = (parts: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
};

const ALL_TREES: Tree[] = [...GROVE, ...ORCHARD];
/** Crown shapes as in the renders: pines an umbrella high on the trunk, oaks and olives broad and low. */
const crownHalf = (t: Tree) => t.tall * (t.kind === 'pine' ? 0.2 : 0.38);

function treeGeometry() {
  const mask = masks((s) => [...COVER[s].grove, ...COVER[s].orchard]);
  const shapes = [crownGeometry(0x1f83d9ab, 9, 0.6), crownGeometry(0x7a3b11c5, 8, 0.58), crownGeometry(0x2c9e4f07, 10, 0.62)];
  const trunk = new THREE.CylinderGeometry(0.6, 1, 1, 6, 1, true).translate(0, 0.5, 0).toNonIndexed();
  const crowns: THREE.BufferGeometry[] = [];
  const trunks: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  ALL_TREES.forEach((t, i) => {
    const g = HILL(t.x, t.y);
    const base = toWorld(t.x, t.y, g, -0.3);
    const half = crownHalf(t);
    const c = new THREE.Vector3(...toWorld(t.x, t.y, g, t.tall - half));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.spin);
    m.compose(c, q, new THREE.Vector3(t.r, half, t.r));
    crowns.push(tag(shapes[i % 3].clone().applyMatrix4(m), base, mask.get(t.id) ?? 0));
    const r = 0.14 + t.r * 0.035;
    m.compose(new THREE.Vector3(...base), q, new THREE.Vector3(r, t.tall - half * 1.2 + 0.3, r));
    trunks.push(tag(paint(trunk.clone().applyMatrix4(m), t.kind === 'olive' ? '#6A6455' : '#4A3E30'), base, mask.get(t.id) ?? 0));
  });
  shapes.forEach((s) => s.dispose());
  trunk.dispose();
  return { crowns: mergeAll(crowns), trunks: mergeAll(trunks) };
}

function shrubGeometry() {
  const mask = masks((s) => COVER[s].shrubs);
  const shape = clumpGeometry(0x510e527f, [[0, 0.1, 0, 0.75], [0.45, 0, 0.15, 0.55], [-0.35, -0.02, -0.3, 0.6]], 1, 0.12);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const parts = SHRUBS.map((s) => {
    const base = toWorld(s.x, s.y, HILL(s.x, s.y), -0.2);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.spin);
    m.compose(new THREE.Vector3(base[0], base[1] + s.r * 0.45, base[2]), q, new THREE.Vector3(s.r, s.r * 0.62, s.r));
    return tag(shape.clone().applyMatrix4(m), base, mask.get(s.id) ?? 0);
  });
  shape.dispose();
  return mergeAll(parts);
}

/** The ground a house stands on: the lowest and highest of its corners (walls start below the lowest,
 *  so none floats on a slope). */
const footing = (h: House) => {
  const t = (h.angle * Math.PI) / 180;
  let lo = Infinity;
  let hi = -Infinity;
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const a = (u * h.w) / 2;
    const b = (v * h.d) / 2;
    const g = HILL(h.x + a * Math.cos(t) - b * Math.sin(t), h.y + a * Math.sin(t) + b * Math.cos(t));
    lo = Math.min(lo, g);
    hi = Math.max(hi, g);
  }
  return { lo, hi };
};
const FLOOR_H = 3.2;

/** Hip roof over a footprint (eaves ±L along x, ±S along z), ridge along the longer side, 2.8 m high. */
function hipRoof(L: number, S: number) {
  const g = new THREE.BufferGeometry();
  const along = L >= S;
  const r = Math.abs(L - S);
  const [a, b] = along ? [L, S] : [S, L];
  // in the frame where the ridge runs along x (a = half length, b = half width)
  const v = [-a, 0, -b, a, 0, -b, a, 0, b, -a, 0, b, -r, 2.8, 0, r, 2.8, 0];
  const pts: number[] = [];
  for (let i = 0; i < v.length; i += 3) pts.push(...(along ? [v[i], v[i + 1], v[i + 2]] : [v[i + 2], v[i + 1], v[i]]));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  // wound to face outward (up) in the ridge-along-x frame; swapping x and z mirrors, so flip then
  const idx = [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0];
  g.setIndex(along ? idx : idx.map((_, i) => idx[i - (i % 3) + (2 - (i % 3))]));
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  return ng;
}

function houseGeometry() {
  const mask = masks((s) => COVER[s].houses);
  const walls: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  HOUSES.forEach((h) => {
    const { lo, hi } = footing(h);
    const base = toWorld(h.x, h.y, lo, -0.3);
    const top = toWorld(h.x, h.y, hi, h.floors * FLOOR_H)[1] + (h.roof === 'flat' ? 0.9 : 0);
    const H = top - base[1];
    const spin = -THREE.MathUtils.degToRad(h.angle);
    const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed();
    // the windows' frame, from the unit box: metres along the face, metres up, wall height
    const p = box.getAttribute('position');
    const nr = box.getAttribute('normal');
    const wall = (i: number): [number, number, number] => {
      const along = Math.abs(nr.getX(i)) > 0.5 ? (p.getZ(i) + 0.5) * h.d : (p.getX(i) + 0.5) * h.w;
      return [along, p.getY(i) * H, H];
    };
    const frame = Array.from({ length: p.count }, (_, i) => wall(i));
    box.scale(h.w, H, h.d).rotateY(spin).translate(...base);
    walls.push(tag(paint(box, h.tone < 0.5 ? '#C6B898' : '#D2CABA'), base, mask.get(h.id) ?? 0, (i) => frame[i]));
    if (h.roof === 'tile') {
      const roof = hipRoof(h.w / 2 + 0.5, h.d / 2 + 0.5).rotateY(spin).translate(base[0], top, base[2]);
      roofs.push(tag(roof, base, mask.get(h.id) ?? 0));
    }
  });
  return { walls: mergeAll(walls), roofs: mergeAll(roofs) };
}

// ---------------------------------------------------------------- the model

function Model({ state, reduce }: { state: StateId; reduce: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const tex = useTexture(TEXTURES);
  const mesh = useMemo(groundMesh, []);

  const shared = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    for (const t of Object.values(tex)) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }
    return sharedUniforms(tex, state);
    // the initial state only; later changes run the timeline (below)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, gl]);

  const ground = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setIndex(new THREE.BufferAttribute(mesh.index, 1));
    const pos = new THREE.BufferAttribute(mesh.pose[state === 'quarry' ? 1 : 0].slice(), 3);
    pos.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pos);
    g.computeBoundingSphere();
    return g;
    // the initial pose only; later changes morph (below)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh]);
  const objects = useMemo(() => ({ ...treeGeometry(), shrubs: shrubGeometry(), ...houseGeometry() }), []);
  const mats = useMemo(
    () => ({
      ground: drapeMaterial(shared, 'ground'),
      canopy: drapeMaterial(shared, 'canopy'),
      trunk: drapeMaterial(shared, 'solid'),
      walls: drapeMaterial(shared, 'walls', 0),
      roofs: drapeMaterial(shared, 'canopy', 0),
    }),
    [shared],
  );
  useEffect(
    () => () => {
      ground.dispose();
      Object.values(objects).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [ground, objects, mats],
  );

  // the change: the state on show becomes "from", the new one "to", and the timeline runs
  const shown = useRef<StateId>(state);
  const run = useRef<{ t0: number; ms: number } | null>(null);
  useEffect(() => {
    if (shown.current === state) return;
    const u = shared;
    // interrupted mid-change: carry on from the state it was heading to
    const from = u.uT.value >= T_END ? shown.current : STATES[u.uToS.value];
    u.uFrom.value = tex[from];
    u.uFromS.value = STATES.indexOf(from);
    u.uTo.value = tex[state];
    u.uToS.value = STATES.indexOf(state);
    u.uT.value = reduce ? T_END : 0;
    shown.current = state;
    run.current = reduce ? null : { t0: performance.now(), ms: SWEEP_MS * T_END };
    invalidate();
  }, [state, reduce, shared, tex, invalidate]);

  // the morph: 0 = hill, 1 = quarried hill
  const goal = state === 'quarry' ? 1 : 0;
  const cur = useRef(goal);
  const anim = useRef<{ from: number; t0: number; ms: number } | null>(null);
  useEffect(() => {
    if (cur.current === goal) return;
    anim.current = { from: cur.current, t0: performance.now(), ms: reduce ? 0 : 900 };
    invalidate();
  }, [goal, reduce, invalidate]);

  useFrame(() => {
    const r = run.current;
    if (r) {
      const k = Math.min(1, (performance.now() - r.t0) / r.ms);
      shared.uT.value = k * T_END;
      if (k >= 1) run.current = null;
      else invalidate();
    }
    const a = anim.current;
    if (!a) return;
    const k = a.ms === 0 ? 1 : Math.min(1, (performance.now() - a.t0) / a.ms);
    const s = a.from + (goal - a.from) * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    cur.current = s;
    const pos = ground.getAttribute('position') as THREE.BufferAttribute;
    const [P0, P1] = mesh.pose;
    const pa = pos.array as Float32Array;
    for (const v of mesh.morph) {
      const o = v * 3 + 1;
      pa[o] = P0[o] + (P1[o] - P0[o]) * s;
    }
    pos.needsUpdate = true;
    if (k >= 1) anim.current = null;
    else invalidate();
  });

  const none = () => null;
  return (
    <group>
      <mesh geometry={ground} material={mats.ground} raycast={none} />
      <mesh geometry={objects.crowns} material={mats.canopy} raycast={none} />
      <mesh geometry={objects.shrubs} material={mats.canopy} raycast={none} />
      <mesh geometry={objects.trunks} material={mats.trunk} raycast={none} />
      <mesh geometry={objects.walls} material={mats.walls} raycast={none} />
      <mesh geometry={objects.roofs} material={mats.roofs} raycast={none} />
    </group>
  );
}

// ---------------------------------------------------------------- camera, scene

function CameraRig({ command, reduce, onHeading }: { command: ViewCommand | null; reduce: boolean; onHeading?: (yaw: number, top: boolean) => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const last = useRef(0);
  const tween = useRef<{ fromPos: THREE.Vector3; fromT: THREE.Vector3; toPos: THREE.Vector3; toT: THREE.Vector3; t0: number; ms: number } | null>(null);
  const heading = useRef<[number, boolean]>([999, false]);

  useEffect(() => {
    if (!command || command.seq === last.current || !controls) return;
    last.current = command.seq;
    const target = new THREE.Vector3(...HOME.target);
    let toPos: THREE.Vector3;
    let toT = target;
    if (command.kind === 'zoom-in' || command.kind === 'zoom-out') {
      const off = camera.position.clone().sub(controls.target).multiplyScalar(command.kind === 'zoom-in' ? 0.72 : 1 / 0.72);
      off.setLength(THREE.MathUtils.clamp(off.length(), DIST.min, DIST.max));
      toT = controls.target.clone();
      toPos = toT.clone().add(off);
    } else {
      const polar = THREE.MathUtils.degToRad(command.kind === 'top' ? 0.5 : HOME.polarDeg);
      const r = command.kind === 'top' ? 760 : HOME.distance;
      toPos = new THREE.Vector3(target.x, target.y + r * Math.cos(polar), target.z + r * Math.sin(polar));
    }
    tween.current = { fromPos: camera.position.clone(), fromT: controls.target.clone(), toPos, toT, t0: performance.now(), ms: reduce ? 0 : 650 };
    invalidate();
  }, [command, camera, controls, reduce, invalidate]);

  useFrame(() => {
    const tw = tween.current;
    if (tw && controls) {
      const k = tw.ms === 0 ? 1 : Math.min(1, (performance.now() - tw.t0) / tw.ms);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
      controls.target.lerpVectors(tw.fromT, tw.toT, e);
      controls.update();
      if (k >= 1) tween.current = null;
      else invalidate();
    }
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const top = dir.y < -0.985;
    const yaw = top ? 0 : (Math.atan2(dir.x, -dir.z) * 180) / Math.PI;
    const [py, pt] = heading.current;
    if (Math.abs(yaw - py) > 0.5 || top !== pt) {
      heading.current = [yaw, top];
      onHeading?.(yaw, top);
    }
  });
  return null;
}

function SceneSetup({ onReady }: { onReady?: () => void }) {
  // dev-only frame counter for scripts/qa (frames must render on demand only)
  useFrame(() => {
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __rcFrames?: number };
      w.__rcFrames = (w.__rcFrames ?? 0) + 1;
    }
  });
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    scene.background = new THREE.Color(HAZE);
    scene.fog = new THREE.Fog(new THREE.Color(HAZE), 900, 2700);
    invalidate();
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => onReady?.());
    });
    return () => {
      cancelAnimationFrame(raf);
      scene.fog = null;
    };
  }, [scene, invalidate, onReady]);
  return null;
}

export default function ReliefCover3D({ state, reduce, command, onHeading, onReady }: Model3DProps) {
  // Inside a shrunk LessonViewportFit the canvas sizes itself from its untransformed box, and a drag
  // turns the model as far per px of the shrunk board as at full size (OrbitControls turns by screen
  // px over the untransformed clientHeight).
  const fitScale = useLessonViewportScale();
  const pos = useMemo(() => {
    const p = THREE.MathUtils.degToRad(HOME.polarDeg);
    const [x, y, z] = HOME.target;
    return [x, y + HOME.distance * Math.cos(p), z + HOME.distance * Math.sin(p)] as [number, number, number];
  }, []);
  return (
    <Canvas
      aria-hidden
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      camera={{ fov: 31, near: 5, far: 6000, position: pos }}
      frameloop="demand"
      resize={LESSON_FIT_CANVAS_RESIZE}
      style={{ position: 'absolute', inset: 0 }}
    >
      <OrbitControls
        makeDefault
        target={HOME.target}
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        enableZoom={false}
        minDistance={DIST.min}
        maxDistance={DIST.max}
        minPolarAngle={0}
        maxPolarAngle={THREE.MathUtils.degToRad(74)}
        minAzimuthAngle={THREE.MathUtils.degToRad(-80)}
        maxAzimuthAngle={THREE.MathUtils.degToRad(80)}
        rotateSpeed={0.6 / fitScale}
      />
      <CameraRig command={command} reduce={reduce} onHeading={onHeading} />
      <Suspense fallback={null}>
        <Model state={state} reduce={reduce} />
        <SceneSetup onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
