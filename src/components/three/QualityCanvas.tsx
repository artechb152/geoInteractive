'use client';
/**
 * QualityCanvas — the course's react-three-fiber <Canvas>. Every 3D model draws through it (`npm run
 * check:3d` fails on a raw <Canvas>), so every model holds its frame rate on a weak GPU (an
 * integrated Intel UHD 630, a laptop on battery, a browser drawing without the GPU) without
 * thinning out the scene: geometry, textures, lights, shadows and effects stay exactly as authored.
 * What it does, for every model, without the model asking:
 *
 * - Draws only when needed. `profile` says how the model draws:
 *     'interactive' (default) — on demand: when the camera, a control or the scene's state changes
 *                    (OrbitControls, tweens and React props invalidate);
 *     'static'      — on demand, and always at full resolution (nothing moves for long);
 *     'animated'    — every frame (an animation that runs on its own).
 *   `animating` turns an interactive model into an animated one while an animation plays, and
 *   `moving` does the same while the view changes without the camera moving (a dragged handle).
 * - Stops drawing off-screen (and when the host says `paused`: a hidden step). The first frame is
 *   drawn even off-screen, so the model is built before it scrolls in.
 * - Resolution follows the frame rate, only while something moves. Frames drawn back to back
 *   (an animation, a damped orbit, a drag) are timed; slower than ~28 fps the pixel ratio steps down
 *   (to MIN_DPR at most), fast again it climbs back. Frames paced by the input (a slow drag) or
 *   held up by the CPU are not the GPU's pace and are not counted, so a fast GPU never steps down.
 *   A demand-drawn model rests sharp: REST_MS after the camera stops it draws again at full
 *   resolution. Post-processing follows the pixel ratio through QualityComposer.
 * - `pixelBudget`: supersamples a small canvas up to that many device pixels at rest (never below
 *   the screen's own pixel ratio, never above dpr's max).
 * - Shadow maps (`shadowCache`, on unless 'animated') are drawn again only when a shadow caster or a
 *   shadow-casting light changed — not on every frame of an orbit. A model that schedules its own
 *   shadow updates (shadowMap.autoUpdate = false) passes shadowCache={false}.
 * - A scroll does not redraw the model (R3F re-measures the canvas on scroll by default).
 * - A closed canvas is let go: the renderer's 'dispose' listeners come off the textures, geometries and
 *   materials that outlive it (shared caches, three's own), which otherwise keep the old renderer, its
 *   context and the section's DOM alive after every visit (releaseOnClose).
 * - The context asks for the high-performance GPU (a dual-GPU laptop's discrete card); a browser
 *   drawing on the CPU (lib/gpu-tier 'software') gets no MSAA and rests at a pixel ratio of 1 at most,
 *   and a weak GPU ('low') starts moving frames at a pixel ratio it can hold.
 *
 * One owner per renderer setting: a model never sets the pixel ratio (setDpr, drei AdaptiveDpr /
 * PerformanceMonitor) or the frameloop itself.
 * QA: the canvas carries data-scene (`name`), data-profile and data-gpu-tier; `?gpu=high|low|software|auto`
 * overrides the detection. Benchmark: `npm run perf:3d` (scripts/perf). Guide: design/docs/3d-performance.md.
 * Animations must not rely on clock.elapsedTime surviving a pause (R3F restarts the clock).
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
/** A frame whose own JavaScript took this share of the gap was held up by the CPU, not the GPU. */
const CPU_SHARE = 0.6;
/** Shader compiles and texture uploads after the first frame are not the GPU's pace. */
const WARMUP_MS = 1200;
/** Frames skipped after a pixel-ratio change (the canvas and its render targets are reallocated). */
const SETTLE_FRAMES = 2;
/** A demand-drawn view that has not drawn for this long is at rest. */
const REST_MS = 320;
/** A step up that slows down again within this long settles at the pixel ratio before it. */
const RAISE_TRIAL_MS = 4000;
/** Off-screen margin: a model this close to the viewport keeps drawing. */
const ONSCREEN_MARGIN = '100px';

/** The pixel ratio a moving view starts at, by tier (it then follows the frame rate). */
const START_MOTION_DPR: Record<GpuTier, number> = { high: Infinity, low: 1, software: 0.75 };
/** The highest pixel ratio at all, by tier. */
const MAX_DPR: Record<GpuTier, number> = { high: Infinity, low: Infinity, software: 1 };

export type SceneProfile = 'static' | 'interactive' | 'animated';

export type QualityCanvasProps = Omit<CanvasProps, 'frameloop'> & {
  /** The model's name — data-scene on the canvas; the benchmark finds it by it (scripts/perf/scenes-3d.mjs). */
  name: string;
  /** How the model draws (default 'interactive'; see the header). */
  profile?: SceneProfile;
  /** An animation plays: draw every frame while true. */
  animating?: boolean;
  /** The view changes without the camera moving (a dragged handle): draw every frame, at the moving resolution, while true. */
  moving?: boolean;
  /** Draw nothing while true (a hidden step; the host's own visibility rule). Off-screen pausing is automatic. */
  paused?: boolean;
  /** Draw shadow maps again only when a shadow caster or a shadow-casting light changed (default: on unless 'animated'). */
  shadowCache?: boolean;
  /** Supersample up to this many device pixels at rest (between the screen's pixel ratio and dpr's max). */
  pixelBudget?: number;
};

function resolveDpr(dpr: CanvasProps['dpr'], own: number): number {
  if (Array.isArray(dpr)) return Math.min(Math.max(dpr[0], own), dpr[1]);
  return dpr ?? own;
}
const maxOf = (dpr: CanvasProps['dpr'], own: number) => (Array.isArray(dpr) ? dpr[1] : (dpr ?? own));

const round = (dpr: number) => Math.round(dpr * 100) / 100;

export function QualityCanvas({
  name,
  profile = 'interactive',
  animating = false,
  moving: movingProp = false,
  paused = false,
  shadowCache = profile !== 'animated',
  pixelBudget,
  dpr = [1, 2],
  gl,
  resize,
  onCreated,
  ref,
  children,
  ...props
}: QualityCanvasProps) {
  const [tier] = useState(gpuTier);
  const [own, setOwn] = useState(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1));
  useEffect(() => {
    // browser zoom, or the window moved to another screen
    const read = () => setOwn(window.devicePixelRatio || 1);
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  // css pixels of the canvas, for pixelBudget (reported from inside the canvas: R3F's own size)
  const [cssPixels, setCssPixels] = useState(0);
  const budgetDpr = pixelBudget && cssPixels > 0 ? Math.min(maxOf(dpr, own), Math.sqrt(pixelBudget / cssPixels)) : 0;
  const full = round(Math.min(Math.max(resolveDpr(dpr, own), budgetDpr), MAX_DPR[tier]));
  const [learned, setLearned] = useState<number | null>(null);
  const motion = Math.min(full, learned ?? START_MOTION_DPR[tier]);
  const [cameraMoving, setCameraMoving] = useState(false);
  const continuous = profile === 'animated' || animating || movingProp;
  const adaptive = profile !== 'static';
  const current = adaptive && (continuous || cameraMoving) ? motion : full;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const setCanvas = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvas.current = el;
      if (el) {
        el.dataset.scene = name;
        el.dataset.profile = profile;
        el.dataset.gpuTier = tier;
      }
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as RefObject<HTMLCanvasElement | null>).current = el;
    },
    [ref, name, profile, tier],
  );

  // Off-screen (or display: none): no frames — once the first one is drawn.
  const [onScreen, setOnScreen] = useState(true);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = canvas.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: ONSCREEN_MARGIN });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const stopped = paused || (!onScreen && drawn);
  const frameloop = stopped ? 'never' : continuous ? 'always' : 'demand';

  const onLearn = useCallback((next: number) => setLearned(round(next)), []);
  const onDrawn = useCallback(() => setDrawn(true), []);
  const created = useRef(onCreated);
  created.current = onCreated;
  const onRoot = useCallback<NonNullable<CanvasProps['onCreated']>>((state) => {
    releaseOnClose(state.gl);
    return created.current?.(state);
  }, []);
  const glProps =
    typeof gl === 'function' || (gl && 'render' in gl)
      ? gl
      : { powerPreference: 'high-performance' as const, ...gl, ...(tier === 'software' ? { antialias: false } : null) };

  return (
    <Canvas {...props} ref={setCanvas} dpr={current} frameloop={frameloop} gl={glProps} resize={{ scroll: false, ...resize }} onCreated={onRoot}>
      <Governor
        adaptive={adaptive}
        continuous={continuous}
        motion={motion}
        full={full}
        current={current}
        onLearn={onLearn}
        onMoving={setCameraMoving}
        onDrawn={onDrawn}
        onCssPixels={pixelBudget ? setCssPixels : undefined}
      />
      {shadowCache && <ShadowCache />}
      {children}
    </Canvas>
  );
}

/**
 * three gives every texture, geometry, material and render target a renderer draws a 'dispose' listener
 * of that renderer, and WebGLRenderer.dispose() leaves them there. A resource that outlives the canvas —
 * three's own module-level empty textures, a model's module-level cache — keeps the listener and through it
 * the renderer, its WebGL context, the canvas and the lesson section around it: ~5 MB on every visit to a
 * sub-topic. So the listeners a QualityCanvas renderer adds are noted (while one of its methods runs) and
 * taken off when R3F closes the renderer.
 */
type DisposeListener = (event: { type: 'dispose'; target: unknown }) => void;
// weakly: a resource disposed while the canvas lives must not be kept by this list
type Owned = [WeakRef<THREE.EventDispatcher<{ dispose: object }>>, DisposeListener][];
let owning: Owned | null = null;
let dispatcherPatched = false;
const OWNED = Symbol('qualityCanvasOwnedListeners');
const DRAWING_METHODS = ['render', 'compile', 'compileAsync', 'initTexture', 'initRenderTarget', 'setRenderTarget', 'copyTextureToTexture', 'copyFramebufferToTexture'] as const;

function releaseOnClose(gl: THREE.WebGLRenderer) {
  // the renderer's methods, wrapped in place
  const r = gl as unknown as Record<string | symbol, unknown>;
  if (r[OWNED]) return; // React's dev double mount: wrapped once
  if (!dispatcherPatched) {
    dispatcherPatched = true;
    const add = THREE.EventDispatcher.prototype.addEventListener;
    THREE.EventDispatcher.prototype.addEventListener = function (this: THREE.EventDispatcher, type: string, listener: never) {
      if (owning && type === 'dispose') {
        owning.push([new WeakRef(this as THREE.EventDispatcher<{ dispose: object }>), listener]);
        // drop what is gone or already let go (three removes the listener when the resource is disposed)
        if (owning.length > 4096) {
          const live = owning.filter(([t, l]) => t.deref()?.hasEventListener('dispose', l as never));
          owning.length = 0;
          owning.push(...live);
        }
      }
      return add.call(this, type as never, listener);
    } as typeof add;
  }
  const owned: Owned = (r[OWNED] = []);
  for (const name of DRAWING_METHODS) {
    const method = r[name];
    if (typeof method !== 'function') continue;
    r[name] = function (this: unknown, ...args: unknown[]) {
      const outer = owning;
      owning = owned;
      try {
        return (method as (...a: unknown[]) => unknown).apply(this, args);
      } finally {
        owning = outer;
      }
    };
  }
  const release = () => {
    for (const [ref, listener] of owned) {
      const target = ref.deref();
      if (target?.hasEventListener('dispose', listener as never)) target.removeEventListener('dispose', listener as never);
    }
    owned.length = 0;
  };
  for (const name of ['forceContextLoss', 'dispose'] as const) {
    const method = gl[name].bind(gl) as () => void;
    r[name] = () => {
      release();
      method();
    };
  }
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

function Governor(props: {
  adaptive: boolean;
  continuous: boolean;
  motion: number;
  full: number;
  current: number;
  onLearn: (dpr: number) => void;
  onMoving: (moving: boolean) => void;
  onDrawn: () => void;
  onCssPixels?: (px: number) => void;
}) {
  const live = useRef(props);
  live.current = props;
  const s = useRef({
    last: 0, start: 0, applied: 0, settle: 0, gaps: [] as number[], fast: 0, moved: false, pace: 0, moving: false, rest: 0,
    ceiling: Infinity, raisedFrom: 0, raisedAt: -Infinity,
    // this frame's start; the last frame's JavaScript time and whether it asked for the next frame
    frameStart: 0, cpu: 0, queued: false, drawn: false,
  }).current;
  const seen = useMemo(() => new THREE.Matrix4(), []);
  useEffect(() => () => window.clearTimeout(s.rest), [s]);

  const scene = useThree((st) => st.scene);
  const get = useThree((st) => st.get);
  const width = useThree((st) => st.size.width);
  const height = useThree((st) => st.size.height);
  const onCssPixels = props.onCssPixels;
  useEffect(() => onCssPixels?.(width * height), [onCssPixels, width, height]);

  // The end of the frame's last scene render: its JavaScript time, and whether it asked for the next frame
  // (an invalidate from inside the frame — damping, a tween — or a continuous loop; R3F decrements after).
  useEffect(() => {
    const after = scene.onAfterRender;
    scene.onAfterRender = function (...args) {
      after.apply(this, args);
      const st = get();
      s.cpu = performance.now() - s.frameStart;
      s.queued = st.frameloop === 'always' || st.internal.frames > 1;
      if (!s.drawn) {
        s.drawn = true;
        live.current.onDrawn();
      }
    };
    return () => {
      scene.onAfterRender = after;
    };
  }, [scene, get, s]);

  useFrame(({ camera }) => {
    const p = live.current;
    const now = performance.now();
    const gap = now - s.last;
    // the gap is the GPU's pace only if the last frame asked for this one and its own JavaScript was short
    const paced = s.queued && s.cpu < gap * CPU_SHARE;
    s.queued = false;
    s.last = now;
    s.frameStart = now;
    s.start ||= now;
    if (!p.adaptive) return;
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

    // Time only frames drawn back to back at the moving pixel ratio while the view moves.
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
    if (p.current !== p.motion || !(p.continuous || moved) || !paced) return;
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
  }, -1000);
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
 * Shadow casters animated inside a shader (a vertex-shader wind, a uniform-driven displacement) are
 * invisible to it: such a model passes shadowCache={false}.
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
      if (!map.enabled || checked === frame.current) return;
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
