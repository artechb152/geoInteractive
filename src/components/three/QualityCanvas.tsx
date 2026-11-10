'use client';
/**
 * QualityCanvas — the course's react-three-fiber <Canvas>, made to hold its frame rate on a weak GPU
 * (an integrated Intel UHD 630, a laptop on battery, a browser drawing without the GPU) without
 * thinning out the scene: geometry, textures, lights, shadows and effects stay exactly as authored.
 * What gives way is pixel density, and only while something moves:
 *
 * - Resolution follows the frame rate. Frames drawn back to back while the camera moves are timed;
 *   when they run slower than ~28 fps the pixel ratio steps down (to MIN_DPR at most), and when
 *   they run fast again it climbs back. A fast GPU never steps down.
 * - A demand-drawn scene rests sharp: REST_MS after its last frame it draws once more at the full
 *   pixel ratio, so a slow GPU sees a softer image only while the view moves.
 * - `shadowCache`: shadow maps are drawn again only when a shadow caster or a shadow-casting light
 *   changed — not on every frame of an orbit (the same shadows, without a 4096² depth pass per
 *   frame). For scenes whose shadow casters only move through their transforms, geometry and
 *   materials; topic-06's scenes, which schedule their own shadow updates, leave it off.
 * - A continuously drawn scene ('always') stops while it is off-screen.
 * - The context asks for the high-performance GPU (a dual-GPU laptop's discrete card).
 * - A weak GPU (lib/gpu-tier) starts moving frames at a pixel ratio it can hold; a browser drawing
 *   on the CPU also rests at a pixel ratio of 1 at most.
 *
 * Drop-in for <Canvas>: same props, plus `shadowCache`. Scenes that already pace their own pixel
 * ratio (PlanningLab3D's Resolution, DeadReckoningScene3D, the navigation replay's pixel budget)
 * keep the plain <Canvas>.
 * QA: the canvas carries data-gpu-tier; `?gpu=high|low|software|auto` overrides the detection.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type CanvasProps } from '@react-three/fiber';
import * as THREE from 'three';
import { gpuTier, type GpuTier } from '@/lib/gpu-tier';

/** The lowest pixel ratio a moving view drops to. */
const MIN_DPR = 0.6;
/** Median gap between back-to-back frames above which the pixel ratio steps down (< ~28 fps)… */
const SLOW_MS = 36;
/** …the gap a step down aims for (pixel cost ∝ dpr²)… */
const TARGET_MS = 24;
/** …and below which, for FAST_WINDOWS windows in a row, it climbs back (> 50 fps). */
const FAST_MS = 20;
const FAST_WINDOWS = 3;
/** Frames per timed window — or fewer (MIN_WINDOW at least) when they already span WINDOW_MS. */
const WINDOW = 10;
const MIN_WINDOW = 4;
const WINDOW_MS = 600;
/** A longer gap ends a run of frames (a GPU drawing on the CPU still manages ~3 fps). */
const RUN_GAP_MS = 1000;
/** Shader compiles and texture uploads after the first frame are not the GPU's pace. */
const WARMUP_MS = 1200;
/** Frames skipped after a pixel-ratio change (the canvas and its render targets are reallocated). */
const SETTLE_FRAMES = 2;
/** A demand-drawn view that has not drawn for this long is at rest. */
const REST_MS = 320;
/** A step up that slows down again within this long settles at the pixel ratio before it. */
const RAISE_TRIAL_MS = 4000;

/** The pixel ratio a moving view starts at, by tier (it then follows the frame rate). */
const START_MOTION_DPR: Record<GpuTier, number> = { high: Infinity, low: 1, software: 0.75 };
/** The highest pixel ratio at all, by tier. */
const MAX_DPR: Record<GpuTier, number> = { high: Infinity, low: Infinity, software: 1 };

export type QualityCanvasProps = CanvasProps & {
  /** Draw shadow maps again only when a shadow caster or a shadow-casting light changed. */
  shadowCache?: boolean;
};

function resolveDpr(dpr: CanvasProps['dpr'], own: number): number {
  if (Array.isArray(dpr)) return Math.min(Math.max(dpr[0], own), dpr[1]);
  return dpr ?? own;
}

const round = (dpr: number) => Math.round(dpr * 100) / 100;

export function QualityCanvas({ dpr = [1, 2], frameloop = 'always', gl, shadowCache = false, ref, children, ...props }: QualityCanvasProps) {
  const [tier] = useState(gpuTier);
  const [own, setOwn] = useState(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1));
  useEffect(() => {
    // browser zoom, or the window moved to another screen
    const read = () => setOwn(window.devicePixelRatio || 1);
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const full = Math.min(resolveDpr(dpr, own), MAX_DPR[tier]);
  const [learned, setLearned] = useState<number | null>(null);
  const motion = Math.min(full, learned ?? START_MOTION_DPR[tier]);
  const [moving, setMoving] = useState(false);
  const continuous = frameloop === 'always';
  const current = continuous || moving ? motion : full;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const setCanvas = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvas.current = el;
      if (el) el.dataset.gpuTier = tier;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as RefObject<HTMLCanvasElement | null>).current = el;
    },
    [ref, tier],
  );

  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = canvas.current;
    if (!continuous || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, [continuous]);

  const onLearn = useCallback((next: number) => setLearned(round(next)), []);
  const glProps = typeof gl === 'function' || (gl && 'render' in gl) ? gl : { powerPreference: 'high-performance' as const, ...gl };

  return (
    <Canvas {...props} ref={setCanvas} dpr={current} frameloop={continuous && !onScreen ? 'never' : frameloop} gl={glProps}>
      <Governor continuous={continuous} motion={motion} full={full} current={current} onLearn={onLearn} onMoving={setMoving} />
      {shadowCache && <ShadowCache />}
      {children}
    </Canvas>
  );
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

function Governor(props: {
  continuous: boolean;
  motion: number;
  full: number;
  current: number;
  onLearn: (dpr: number) => void;
  onMoving: (moving: boolean) => void;
}) {
  const live = useRef(props);
  live.current = props;
  const s = useRef({ last: 0, start: 0, applied: 0, settle: 0, gaps: [] as number[], fast: 0, moved: false, pace: 0, moving: false, rest: 0, ceiling: Infinity, raisedFrom: 0, raisedAt: -Infinity }).current;
  const seen = useMemo(() => new THREE.Matrix4(), []);
  useEffect(() => () => window.clearTimeout(s.rest), [s]);

  useFrame(({ camera }) => {
    const p = live.current;
    const now = performance.now();
    const gap = now - s.last;
    s.last = now;
    s.start ||= now;
    // The camera moved over the last two frames: an orbit, a drag or a tween — not a single cut, and
    // not the endless sub-pixel tail of OrbitControls' damping.
    const step = !nearlyEqual(camera.matrixWorld, seen);
    seen.copy(camera.matrixWorld);
    const moved = step && s.moved && gap < RUN_GAP_MS;
    s.moved = step;
    if (moved) s.pace = s.pace ? s.pace * 0.7 + gap * 0.3 : gap;

    // A demand-drawn view moves at the moving pixel ratio and rests at the full one — once its
    // camera has not moved for REST_MS, or for 2½ frames of a slow GPU's pace.
    if (!p.continuous && step) {
      window.clearTimeout(s.rest);
      s.rest = window.setTimeout(() => {
        if (!s.moving) return;
        s.moving = false;
        live.current.onMoving(false);
      }, Math.max(REST_MS, s.pace * 2.5));
      if (!s.moving && moved && p.motion < p.full) {
        s.moving = true;
        p.onMoving(true);
      }
    }

    // Time only consecutive frames drawn at the moving pixel ratio while the camera moves.
    if (p.current !== s.applied) {
      s.applied = p.current;
      s.settle = SETTLE_FRAMES;
      s.gaps.length = 0;
      return;
    }
    if (s.settle > 0) {
      s.settle -= 1;
      return;
    }
    if (now - s.start < WARMUP_MS || gap >= RUN_GAP_MS) {
      s.gaps.length = 0;
      return;
    }
    if (p.current !== p.motion || !(p.continuous || moved)) return;
    s.gaps.push(gap);
    if (s.gaps.length < WINDOW && (s.gaps.length < MIN_WINDOW || s.gaps.reduce((a, b) => a + b, 0) < WINDOW_MS)) return;
    const med = median(s.gaps);
    s.gaps.length = 0;

    const dpr = p.motion;
    if (med > SLOW_MS && dpr > MIN_DPR + 0.01) {
      if (now - s.raisedAt < RAISE_TRIAL_MS) s.ceiling = s.raisedFrom;
      s.fast = 0;
      p.onLearn(Math.max(MIN_DPR, Math.min(dpr * 0.9, dpr * Math.sqrt(TARGET_MS / med))));
    } else if (med < FAST_MS && dpr < Math.min(p.full, s.ceiling) - 0.01) {
      s.fast += 1;
      if (s.fast < FAST_WINDOWS) return;
      s.fast = 0;
      s.raisedFrom = dpr;
      s.raisedAt = now;
      const top = Math.min(p.full, s.ceiling);
      // the last few percent are not worth a pixel ratio of their own (and a switch on every move)
      p.onLearn(dpr * 1.15 > top * 0.95 ? top : dpr * 1.15);
    } else s.fast = 0;
  });
  return null;
}

/** Equal up to 1e-5 of each element's size: less than any pixel of these scenes moves. */
const TOLERANCE = 1e-5;
const close = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE * (1 + Math.abs(b));

function nearlyEqual(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let k = 0; k < 16; k++) if (!close(a.elements[k], b.elements[k])) return false;
  return true;
}

type ShadowLight = THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight;

/**
 * Turns the renderer's shadow maps to manual and asks for a redraw only when what they depend on
 * changed: the shadow-casting lights (transform, target, shadow camera, map size) and the visible
 * shadow casters (transform, geometry, instances, morphs, materials, clipping). The check runs in
 * the scene's onBeforeRender — after three has updated the world matrices, before the shadow pass.
 */
function ShadowCache() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // Checked at the frame's first render only: later passes of the same frame re-render the scene
  // with some of it hidden (N8AO draws only its transparent objects), which is not a change.
  const frame = useRef(0);
  useFrame(() => {
    frame.current += 1;
  });
  useEffect(() => {
    const map = gl.shadowMap;
    const auto = map.autoUpdate;
    map.autoUpdate = false;
    map.needsUpdate = true;
    const sig: number[] = [];
    let checked = -1;
    const before = scene.onBeforeRender;
    scene.onBeforeRender = (...args) => {
      before.apply(scene, args);
      if (checked === frame.current) return;
      checked = frame.current;
      if (shadowInputsChanged(scene, gl, sig)) map.needsUpdate = true;
    };
    return () => {
      scene.onBeforeRender = before;
      map.autoUpdate = auto;
      map.needsUpdate = true;
    };
  }, [gl, scene]);
  return null;
}

/**
 * Compares this frame's shadow inputs with the ones the shadow maps were last drawn from (`sig`),
 * each up to TOLERANCE — an animation's float tail (an exponential ease that never quite lands)
 * must not redraw them every frame, while a slow drift still adds up against the drawn state.
 */
function shadowInputsChanged(scene: THREE.Scene, gl: THREE.WebGLRenderer, sig: number[]): boolean {
  let i = 0;
  let changed = false;
  const next = shadowNext;
  const put = (v: number) => {
    next[i] = v;
    if (i >= sig.length || !close(v, sig[i])) changed = true;
    i += 1;
  };
  // ids, versions, counts, flags: exact
  const key = (v: number) => {
    next[i] = v;
    if (i >= sig.length || v !== sig[i]) changed = true;
    i += 1;
  };
  const putMatrix = (m: THREE.Matrix4) => {
    for (let k = 0; k < 16; k++) put(m.elements[k]);
  };
  const putPlanes = (planes: THREE.Plane[] | null) => {
    if (!planes) return;
    for (const p of planes) {
      put(p.normal.x);
      put(p.normal.y);
      put(p.normal.z);
      put(p.constant);
    }
  };

  putPlanes(gl.clippingPlanes);
  scene.traverseVisible((o) => {
    if (!o.castShadow) return;
    if ((o as THREE.Light).isLight) {
      const light = o as ShadowLight;
      if (!light.shadow) return;
      if (!light.shadow.map) changed = true;
      key(light.id);
      putMatrix(light.matrixWorld);
      if ('target' in light) putMatrix(light.target.matrixWorld);
      const c = light.shadow.camera as THREE.OrthographicCamera & THREE.PerspectiveCamera;
      put(c.left ?? 0);
      put(c.right ?? 0);
      put(c.top ?? 0);
      put(c.bottom ?? 0);
      put(c.fov ?? 0);
      put(c.near);
      put(c.far);
      put(c.zoom);
      key(light.shadow.mapSize.x);
      key(light.shadow.mapSize.y);
      return;
    }
    const mesh = o as THREE.Mesh;
    const g = mesh.geometry as THREE.BufferGeometry | undefined;
    if (!g) return;
    key(mesh.id);
    putMatrix(mesh.matrixWorld);
    key(g.id);
    const position = g.attributes.position;
    key(!position ? -1 : 'isInterleavedBufferAttribute' in position ? position.data.version : position.version);
    key(g.index?.version ?? -1);
    key(g.drawRange.start);
    key(g.drawRange.count);
    const inst = o as THREE.InstancedMesh;
    if (inst.isInstancedMesh) {
      key(inst.count);
      key(inst.instanceMatrix.version);
    }
    if (mesh.morphTargetInfluences) for (const w of mesh.morphTargetInfluences) put(w);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials) {
      if (!m) continue;
      const std = m as THREE.MeshStandardMaterial;
      key((m as unknown as { id: number }).id); // three numbers every material; the typings leave it out
      key(m.version);
      key(m.visible ? 1 : 0);
      key(m.side);
      put(m.alphaTest);
      key(std.map?.version ?? -1);
      key(std.alphaMap?.version ?? -1);
      key(std.displacementMap?.version ?? -1);
      put(std.displacementScale ?? 0);
      put(std.displacementBias ?? 0);
      putPlanes(m.clippingPlanes);
    }
  });
  if (sig.length !== i) changed = true;
  if (changed) {
    sig.length = i;
    for (let k = 0; k < i; k++) sig[k] = next[k];
  }
  return changed;
}

/** Scratch for shadowInputsChanged (runs synchronously, one scene at a time). */
const shadowNext: number[] = [];
