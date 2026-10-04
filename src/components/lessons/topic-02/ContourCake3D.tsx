'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Bvh, Environment, Html, Line, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { MOUNTAIN } from './contourMountain.data';
import { ACCENT, CONTOUR_INK, CUT_COLOR, INDEX_LEVEL_M } from './contourMountainStyle';
import {
  createGrassMaterial,
  createLeavesMaterial,
  createTerrainMaterial,
  createTriplanarMaterial,
} from './contourMountainMaterials';

/**
 * The "mountain as a layer cake" diorama, rendered like a game scene: a
 * realistic mountain sculpted in Blender (scripts/blender/build_contour_mountain.py)
 * — erosion ravines, limestone bands, ~1,150 trees, boulders and grass — pre-cut
 * into five horizontal slices at the contour heights (10–50 m). Terrain uses
 * splat-blended CC0 photo textures (contourMountainMaterials.ts), lit by a CC0
 * HDRI sky and a shadow-casting sun, with ambient occlusion and ACES filmic
 * tone mapping. Everything planted on a slice lifts with it.
 *
 * Three views, driven from ContoursScene:
 *   whole  — the assembled mountain with its contour lines on the surface.
 *   sliced — the slices lift apart; any slice can be dragged up or down and
 *            everything above rides along, like lifting a cake layer. Each
 *            flat cream cut face is exactly the contour polygon.
 *   top    — straight down, north up: the 3D view turns into the map beside it.
 *
 * Navigation: drag to rotate, wheel to zoom toward the cursor, right-drag to
 * pan; re-clicking the active view button re-frames. Contour lines come from
 * contourMountain.data.ts (the same iso-lines the map draws). Hovering or
 * dragging a slice sets `activeRing`, which lights the map band too.
 *
 * ~20 MB of assets, so nothing loads until the diorama scrolls into view, and
 * frames render on demand only. Rendered client-only via `next/dynamic`.
 */

export type MountainView = 'whole' | 'sliced' | 'top';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const ASSETS = `${BASE}/assets/lessons/topic02/contour-mountain`;
const MODEL_URL = `${ASSETS}/contour-mountain.glb`;
const HDR_URL = `${ASSETS}/env/sky.hdr`;
const DRACO_PATH = `${BASE}/draco/`;
const TEXTURE_URLS = {
  splat: `${ASSETS}/textures/splat.png`,
  macro: `${ASSETS}/textures/macro.jpg`,
  grassD: `${ASSETS}/textures/grass_diff.jpg`,
  grassN: `${ASSETS}/textures/grass_nor.jpg`,
  dryD: `${ASSETS}/textures/dry_diff.jpg`,
  dryN: `${ASSETS}/textures/dry_nor.jpg`,
  rockD: `${ASSETS}/textures/rock_diff.jpg`,
  rockN: `${ASSETS}/textures/rock_nor.jpg`,
  forestD: `${ASSETS}/textures/forest_diff.jpg`,
  forestN: `${ASSETS}/textures/forest_nor.jpg`,
  leaves: `${ASSETS}/textures/leaves.png`,
  grassCard: `${ASSETS}/textures/grass.png`,
};

/** Panel colour behind the canvas (the scene card is bg-elevated white). */
const BG = '#FFFFFF';

const HALF = MOUNTAIN.halfUnits;
const MPU = MOUNTAIN.metersPerUnit;
const LEVEL_COUNT = MOUNTAIN.levels.length;
const SLICE_GAP = 0.3;         // default gap under each slice in the "sliced" view (model units)
const MAX_GAP = 1.1;           // one gap can open this far by dragging
const MAX_TOTAL_LIFT = 2.4;    // …and all gaps together this far
const LINE_LIFT = 0.006;       // keeps the lines just above the surface they trace
const FOV = 30;

const toWorldX = (mx: number) => (mx / 50 - 1) * HALF;
const toWorldZ = (my: number) => (my / 50 - 1) * HALF;
const heightToY = (m: number) => (m * MOUNTAIN.verticalExaggeration) / MPU;
const defaultGaps = () => Array.from({ length: LEVEL_COUNT }, () => SLICE_GAP);
/** Camera distance multiplier that keeps a stack of this total lift in frame. */
const followScale = (lift: number) => 1 + 0.17 * lift + 0.1 * Math.max(0, lift - SLICE_GAP * LEVEL_COUNT);

const SUMMIT_POS: [number, number, number] = [
  toWorldX(MOUNTAIN.summit.x),
  heightToY(MOUNTAIN.summit.heightM),
  toWorldZ(MOUNTAIN.summit.y),
];

// OrbitControls instance — typed loosely: only enabled/target/update and the
// start event are used, and drei's exported ref type doesn't line up cleanly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlsRef = React.MutableRefObject<any>;
type NumberRef = React.MutableRefObject<number>;

// ---------------------------------------------------------------- camera

type CameraGoal = { phi: number; theta: number | null; radius: number; targetY: number };

// theta = 0 looks from due south (north is up the screen); a small positive
// theta swings the camera toward the east, so the steep WNW face shows in
// silhouette on the left and the long gentle spur runs out to the right.
const DEFAULT_THETA = 0.42;
const BASE_RADIUS = 9.6;
const BASE_TARGET_Y = 0.32;

function goalFor(view: MountainView, aspect: number, lift: number): CameraGoal {
  const fit = Math.min(1, aspect);
  if (view === 'top') {
    const span = 2 * HALF + 0.35;
    return { phi: 0.0001, theta: 0, radius: span / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * fit), targetY: 0 };
  }
  return { phi: 1.0, theta: null, radius: (BASE_RADIUS * followScale(lift)) / fit, targetY: BASE_TARGET_Y + 0.5 * lift };
}

const START = goalFor('whole', 1, 0);
const START_TARGET: [number, number, number] = [0, START.targetY, 0];
const START_POSITION: [number, number, number] = [
  START.radius * Math.sin(START.phi) * Math.sin(DEFAULT_THETA),
  START.targetY + START.radius * Math.cos(START.phi),
  START.radius * Math.sin(START.phi) * Math.cos(DEFAULT_THETA),
];

function CameraRig({
  view,
  viewNonce,
  reduce,
  controlsRef,
  liftRef,
}: {
  view: MountainView;
  viewNonce: number;
  reduce: boolean;
  controlsRef: ControlsRef;
  liftRef: NumberRef;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const animating = useRef(true);
  const lastLift = useRef(0);
  const prevView = useRef<MountainView | null>(null);
  const spherical = useMemo(() => new THREE.Spherical(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    // Leaving the top view (or first mount) returns to the canonical angle;
    // whole ↔ sliced keeps whatever angle the learner rotated to.
    animating.current = true;
    prevView.current = view;
    invalidate();
  }, [view, viewNonce, size.width, size.height, invalidate]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const stop = () => {
      animating.current = false;
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controlsRef]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const lift = liftRef.current;
    const dLift = lift - lastLift.current;
    lastLift.current = lift;

    if (!animating.current) {
      // The learner owns the camera — but when slices lift, keep the stack in
      // frame relative to *their* zoom and angle.
      if (Math.abs(dLift) < 1e-5) return;
      offset.copy(camera.position).sub(controls.target);
      spherical.setFromVector3(offset);
      spherical.radius *= followScale(lift) / followScale(lift - dLift);
      controls.target.y += 0.5 * dLift;
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      invalidate();
      return;
    }

    const g = goalFor(view, size.width / size.height, lift);
    const fromTop = prevView.current === 'top' || view === 'top';
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    const thetaGoal = view === 'top' ? 0 : g.theta ?? (fromTop ? DEFAULT_THETA : spherical.theta);
    let dTheta = thetaGoal - spherical.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta)); // shortest way round

    const t = controls.target as THREE.Vector3;
    const settled =
      Math.abs(g.phi - spherical.phi) < 0.002 &&
      Math.abs(dTheta) < 0.002 &&
      Math.abs(g.radius - spherical.radius) < 0.01 &&
      Math.abs(g.targetY - t.y) < 0.005 &&
      Math.abs(t.x) + Math.abs(t.z) < 0.005;
    if (settled) {
      animating.current = false;
      return;
    }

    const k = reduce ? 1 : 1 - Math.exp(-5 * delta);
    spherical.phi += (g.phi - spherical.phi) * k;
    spherical.theta += dTheta * k;
    spherical.radius += (g.radius - spherical.radius) * k;
    spherical.makeSafe();
    t.x += -t.x * k;
    t.z += -t.z * k;
    t.y += (g.targetY - t.y) * k;
    offset.setFromSpherical(spherical);
    camera.position.copy(t).add(offset);
    camera.lookAt(t);
    controls.update();
    invalidate();
  });

  return null;
}

// ---------------------------------------------------------------- mountain

type Parts = {
  base: THREE.Object3D;
  slices: THREE.Object3D[];
  /** Per-part terrain material, so one slice can glow alone. */
  sliceMats: THREE.MeshStandardMaterial[];
};

function useMountainParts(): Parts {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const tex = useTexture(TEXTURE_URLS);
  const gl = useThree((s) => s.gl);

  return useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    const color = [tex.grassD, tex.dryD, tex.rockD, tex.forestD, tex.leaves, tex.grassCard];
    const data = [tex.grassN, tex.dryN, tex.rockN, tex.forestN, tex.splat, tex.macro];
    for (const t of [...color, ...data]) {
      t.colorSpace = color.includes(t) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
    for (const t of [tex.splat, tex.macro]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    // Card textures are addressed by the glTF's own UVs (v points down).
    for (const t of [tex.leaves, tex.grassCard]) t.flipY = false;
    for (const t of [...color, ...data]) t.needsUpdate = true;

    const terrainTextures = {
      splat: tex.splat,
      macro: tex.macro,
      grassD: tex.grassD,
      grassN: tex.grassN,
      dryD: tex.dryD,
      dryN: tex.dryN,
      rockD: tex.rockD,
      rockN: tex.rockN,
      forestD: tex.forestD,
      forestN: tex.forestN,
    };
    const cut = new THREE.MeshStandardMaterial({
      color: CUT_COLOR,
      roughness: 0.95,
      // Behind the terrain where they coincide: on gentle slopes the terrain
      // sits a sliver above the cut face hidden beneath it.
      polygonOffset: true,
      polygonOffsetFactor: 4,
      polygonOffsetUnits: 4,
    });
    const wall = createTriplanarMaterial(tex.dryD, tex.dryN, {
      tileMeters: 5, metersPerUnit: MPU, tint: [0.62, 0.52, 0.42], saturation: 0.8, key: 'wall',
    });
    const boulder = createTriplanarMaterial(tex.rockD, tex.rockN, {
      tileMeters: 3, metersPerUnit: MPU, tint: [1.05, 1.03, 1.0], saturation: 0.25, vertexColors: true, key: 'boulder',
    });
    const leaves = createLeavesMaterial(tex.leaves);
    const leafCore = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const bark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    // Tufts appear within ~110 m of the camera and are fully grown by ~45 m.
    const grass = createGrassMaterial(tex.grassCard, 45 / MPU, 110 / MPU);

    const root = scene.clone(true);
    const dress = (obj: THREE.Object3D) => {
      const terrain = createTerrainMaterial(terrainTextures, HALF, MPU);
      obj.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const name = (child.material as THREE.Material).name;
        child.material =
          ({ Terrain: terrain, Cut: cut, Wall: wall, Boulder: boulder, Leaves: leaves, LeafCore: leafCore, Bark: bark, Grass: grass } as Record<string, THREE.Material>)[name] ??
          child.material;
        child.castShadow = name !== 'Grass';
        child.receiveShadow = true;
      });
      return { obj, terrain };
    };
    const base = dress(root.getObjectByName('Base')!).obj;
    const dressed = MOUNTAIN.levels.map((_, i) => dress(root.getObjectByName(`Slice_${i + 1}`)!));
    return { base, slices: dressed.map((d) => d.obj), sliceMats: dressed.map((d) => d.terrain) };
  }, [scene, tex, gl]);
}

/** Height chip that hides once it swings round to the far side of the mountain. */
function HeightLabel({
  position,
  active,
  alwaysVisible,
  children,
}: {
  position: [number, number, number];
  active: boolean;
  alwaysVisible: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const camera = useThree((s) => s.camera);
  const dir = useMemo(
    () => new THREE.Vector2(position[0] - SUMMIT_POS[0], position[2] - SUMMIT_POS[2]).normalize(),
    [position],
  );
  const cam = useMemo(() => new THREE.Vector2(), []);

  useFrame(() => {
    if (!ref.current) return;
    cam.set(camera.position.x - SUMMIT_POS[0], camera.position.z - SUMMIT_POS[2]).normalize();
    const visible = alwaysVisible || cam.dot(dir) > -0.15;
    ref.current.style.opacity = visible ? '1' : '0';
  });

  return (
    // left:0 is a screen-space anchor, not content alignment: drei positions the
    // chip with an absolute box that has no inline offset, and under dir="rtl"
    // that box would hang off the anchor's right edge (labels drift sideways).
    <Html position={position} center zIndexRange={[20, 0]} style={{ left: 0 }} className="pointer-events-none select-none">
      <span
        ref={ref}
        className="block px-1.5 py-0.5 text-xs font-display font-bold tabular-nums rounded-md whitespace-nowrap shadow-sm transition-opacity duration-200"
        style={{
          color: active ? ACCENT : CONTOUR_INK,
          background: 'rgba(255,255,255,0.94)',
          outline: active ? `1.5px solid ${ACCENT}` : 'none',
        }}
      >
        {children}
      </span>
    </Html>
  );
}

type Drag = { i: number; plane: THREE.Plane; startY: number; startGap: number; cleanup: () => void };

function Mountain({
  view,
  reduce,
  activeRing,
  setActiveRing,
  controlsRef,
  gapsRef,
  liftRef,
  onRearranged,
  onDraggingChange,
}: {
  view: MountainView;
  reduce: boolean;
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
  controlsRef: ControlsRef;
  gapsRef: React.MutableRefObject<number[]>;
  liftRef: NumberRef;
  onRearranged: () => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { base, slices, sliceMats } = useMountainParts();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const drag = useRef<Drag | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const lines = useMemo(
    () =>
      MOUNTAIN.levels.map((lv) =>
        lv.rings.map((ring) => {
          const pts = ring.map(([mx, my]) => new THREE.Vector3(toWorldX(mx), lv.yUnits + LINE_LIFT, toWorldZ(my)));
          pts.push(pts[0].clone());
          return pts;
        }),
      ),
    [],
  );

  useEffect(() => {
    sliceMats.forEach((m, i) => {
      const on = activeRing === i;
      m.emissive.set(on ? ACCENT : '#000000');
      m.emissiveIntensity = on ? 0.3 : 0;
    });
    invalidate();
  }, [activeRing, sliceMats, invalidate]);

  useEffect(() => invalidate(), [view, invalidate]);

  // Never leave window listeners behind if the canvas unmounts mid-drag.
  useEffect(() => () => drag.current?.cleanup(), []);

  const startDrag = (i: number, e: ThreeEvent<PointerEvent>) => {
    if (view !== 'sliced' || e.button !== 0) return;
    e.stopPropagation();
    const controls = controlsRef.current;
    if (controls) controls.enabled = false;

    // Drag on a vertical plane through the grab point, facing the camera, so
    // the slice tracks the pointer 1:1 in height.
    const normal = new THREE.Vector3(camera.position.x - e.point.x, 0, camera.position.z - e.point.z).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, e.point.clone());

    const aim = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      aim(ev);
      if (!raycaster.ray.intersectPlane(d.plane, hit)) return;
      const gaps = gapsRef.current;
      const others = gaps.reduce((sum, g, k) => (k === d.i ? sum : sum + g), 0);
      const max = Math.min(MAX_GAP, MAX_TOTAL_LIFT - others);
      gaps[d.i] = THREE.MathUtils.clamp(d.startGap + (hit.y - d.startY), 0, max);
      onRearranged();
      invalidate();
    };
    const end = (ev: PointerEvent) => {
      drag.current?.cleanup();
      drag.current = null;
      if (controls) controls.enabled = true;
      onDraggingChange(false);
      // Hover events were ignored mid-drag, so re-derive the highlight from
      // whatever is under the pointer now (nothing, if released off-canvas).
      aim(ev);
      const top = raycaster.intersectObjects(slices, true)[0];
      const under = top ? slices.findIndex((s) => s === top.object || !!s.getObjectById(top.object.id)) : -1;
      setActiveRing(under >= 0 ? under : null);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    drag.current = { i, plane, startY: e.point.y, startGap: gapsRef.current[i], cleanup };
    setActiveRing(i);
    onDraggingChange(true);
  };

  useFrame((_, delta) => {
    // Each slice sits on top of every gap below it: dragging one gap open
    // lifts that slice and everything stacked above it.
    const snap = reduce || drag.current !== null;
    const k = snap ? 1 : 1 - Math.exp(-8 * delta);
    let lift = 0;
    let moving = false;
    groups.current.forEach((g, i) => {
      lift += view === 'sliced' ? gapsRef.current[i] : 0;
      if (!g) return;
      const dy = lift - g.position.y;
      g.position.y = Math.abs(dy) < 1e-4 ? lift : g.position.y + dy * k;
      if (Math.abs(dy) >= 1e-4) moving = true;
    });
    liftRef.current = groups.current[LEVEL_COUNT - 1]?.position.y ?? 0;
    if (moving) invalidate();
  });

  return (
    <group>
      <primitive object={base} onPointerOver={() => !drag.current && setActiveRing(null)} />
      {slices.map((slice, i) => {
        const lv = MOUNTAIN.levels[i];
        const active = activeRing === i;
        const isIndex = lv.heightM === INDEX_LEVEL_M;
        // From straight above the lines must carry the picture, as on the map.
        const width = view === 'top' ? (active ? 3.8 : isIndex ? 2.8 : 2) : active ? 3.2 : isIndex ? 2 : 1.3;
        return (
          <group
            key={i}
            ref={(el) => {
              groups.current[i] = el;
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (!drag.current) setActiveRing(i);
            }}
            onPointerOut={() => {
              if (!drag.current) setActiveRing(null);
            }}
            onPointerDown={(e) => startDrag(i, e)}
          >
            <primitive object={slice} />
            {lines[i].map((pts, r) => (
              <Line
                key={r}
                points={pts}
                color={active ? ACCENT : CONTOUR_INK}
                lineWidth={width}
                transparent
                opacity={active || view === 'top' ? 1 : 0.85}
              />
            ))}
            <HeightLabel
              position={[toWorldX(lv.label.x), lv.yUnits + 0.05, toWorldZ(lv.label.y)]}
              active={active}
              alwaysVisible={view === 'top'}
            >
              {lv.heightM} מ׳
            </HeightLabel>
            {i === slices.length - 1 && (
              <HeightLabel position={[SUMMIT_POS[0], SUMMIT_POS[1] + 0.16, SUMMIT_POS[2]]} active={false} alwaysVisible>
                ▲ {MOUNTAIN.summit.heightM}
              </HeightLabel>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------- canvas

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="text-sm font-display font-bold text-fg-muted">טוען הר תלת־ממדי…</div>
      <div className="h-1.5 w-40 rounded-full bg-border/60 overflow-hidden" dir="ltr">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(progress)}%` }} />
      </div>
    </div>
  );
}

export default function ContourCake3D({
  view,
  viewNonce = 0,
  activeRing,
  setActiveRing,
}: {
  view: MountainView;
  /** Bumped on every view-button click, so re-clicking the active view re-frames. */
  viewNonce?: number;
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [activated, setActivated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rearranged, setRearranged] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const reduce = !!useReducedMotion();
  const controlsRef = useRef(null) as ControlsRef;
  const gapsRef = useRef<number[]>(defaultGaps());
  const liftRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Nothing (≈20 MB) loads until the diorama nears the viewport, and the
    // render loop is paused whenever it is scrolled away.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setActivated(true);
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  const resetLayers = useCallback(() => {
    gapsRef.current = defaultGaps();
    setRearranged(false);
  }, []);

  // Every visit to the sliced view starts from an even spread.
  useEffect(() => {
    if (view === 'sliced') resetLayers();
  }, [view, resetLayers]);

  const onRearranged = useCallback(() => setRearranged(true), []);

  const cursor =
    view === 'sliced' && (dragging || activeRing !== null)
      ? 'ns-resize'
      : view === 'top'
        ? 'crosshair'
        : 'grab';

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? 'relative h-full w-full'
          : 'relative aspect-video sm:aspect-square max-h-[340px] w-full mx-auto'
      }
      style={{ cursor, background: BG }}
    >
      {activated && (
        <Canvas
          flat
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: START_POSITION, fov: FOV, near: 0.01, far: 80 }}
          dpr={[1, 2]}
          // While the camera moves, render at reduced resolution (AdaptiveDpr +
          // OrbitControls `regress`); full quality returns the moment it stops.
          performance={{ min: 0.55 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false }}
          frameloop={inView ? 'demand' : 'never'}
          onPointerMissed={() => !dragging && setActiveRing(null)}
        >
          {/* No scene background: the canvas stays transparent so the card's
              white shows through untouched by the filmic tone mapping. */}
          <hemisphereLight color="#FFF4E0" groundColor="#6B6A45" intensity={0.25} />
          {/* The sun: high and front-left of the default camera, so the faces
              the learner sees are lit and every tree and slice casts a
              shadow onto the ground or the layer below. */}
          <directionalLight
            position={[-3.4, 6.2, 4.2]}
            intensity={2.0}
            color="#FFF1DC"
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-left={-2.8}
            shadow-camera-right={2.8}
            shadow-camera-top={2.8}
            shadow-camera-bottom={-2.8}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-bias={-0.0003}
            shadow-normalBias={0.012}
            shadow-radius={2.5}
          />

          <Suspense fallback={null}>
            <Environment files={HDR_URL} environmentIntensity={0.7} />
            {/* BVH-accelerated raycasting: hover/drag hit-tests ~600k triangles
                on every pointer move, which would otherwise stall the frame. */}
            <Bvh firstHitOnly>
              <Mountain
                view={view}
                reduce={reduce}
                activeRing={activeRing}
                setActiveRing={setActiveRing}
                controlsRef={controlsRef}
                gapsRef={gapsRef}
                liftRef={liftRef}
                onRearranged={onRearranged}
                onDraggingChange={setDragging}
              />
            </Bvh>
          </Suspense>

          {/* Soft grounding shadow under the diorama plinth. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]} receiveShadow>
            <planeGeometry args={[9, 9]} />
            <shadowMaterial opacity={0.14} />
          </mesh>

          <OrbitControls
            ref={controlsRef}
            target={START_TARGET}
            enablePan
            screenSpacePanning
            enableZoom
            zoomToCursor
            zoomSpeed={0.9}
            minDistance={0.3}
            maxDistance={16}
            enableRotate={view !== 'top'}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.05}
            enableDamping
            dampingFactor={0.08}
            regress
          />
          <AdaptiveDpr />
          <CameraRig view={view} viewNonce={viewNonce} reduce={reduce} controlsRef={controlsRef} liftRef={liftRef} />

          <EffectComposer multisampling={4}>
            <N8AO aoRadius={0.12} distanceFalloff={0.6} intensity={2.2} quality="medium" />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>
      )}

      {activated && <LoadingOverlay />}

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
        title={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
        className="absolute top-2 start-2 size-8 flex items-center justify-center rounded-[3px] border border-border bg-bg-elevated/95 text-fg-muted hover:border-accent/50 hover:text-fg transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          {fullscreen ? (
            <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" />
          ) : (
            <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />
          )}
        </svg>
      </button>

      {view === 'sliced' && rearranged && (
        <button
          type="button"
          onClick={resetLayers}
          className="absolute top-2 end-2 rounded-[3px] border border-border bg-bg-elevated/95 px-2.5 py-1 text-xs font-display font-bold text-fg-muted hover:border-accent/50 hover:text-fg transition-colors cursor-pointer"
        >
          ↺ איפוס שכבות
        </button>
      )}
    </div>
  );
}
