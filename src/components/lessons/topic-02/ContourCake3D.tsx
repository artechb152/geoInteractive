'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { MOUNTAIN } from './contourMountain.data';
import { ACCENT, CONTOUR_INK, CUT_COLOR, INDEX_LEVEL_M, WALL_COLOR } from './contourMountainStyle';

/**
 * The "mountain as a layer cake" diorama — a realistic mountain sculpted in
 * Blender (scripts/blender/build_contour_mountain.py): erosion ravines, rock
 * bands, scrub and trees, baked textures — pre-cut into five horizontal
 * slices at the contour heights (10–50 m). Trees belong to the slice they
 * stand on.
 *
 * Three views, driven from ContoursScene:
 *   whole  — the assembled mountain with its contour lines on the surface.
 *   sliced — the slices lift apart, and the learner can grab any slice and
 *            drag it up or down: everything above rides along, like lifting
 *            a cake layer. Each flat cream cut face is exactly the contour
 *            polygon — a contour line is the edge of a horizontal cut.
 *   top    — the camera swings straight down, north up: the 3D view turns
 *            into the 2D map beside it (same data).
 *
 * Contour lines are drawn at runtime from contourMountain.data.ts (the same
 * iso-lines the map draws), as screen-space lines that stay crisp at any
 * size. Hovering (or dragging) a slice sets `activeRing` so the matching
 * band lights up on the map, and vice versa.
 *
 * Rendered client-only via `next/dynamic` (Canvas can't SSR).
 */

export type MountainView = 'whole' | 'sliced' | 'top';

const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/contour-mountain/contour-mountain.glb`;
useGLTF.preload(MODEL_URL);

const HALF = MOUNTAIN.halfUnits;
const LEVEL_COUNT = MOUNTAIN.levels.length;
const SLICE_GAP = 0.3;         // default gap under each slice in the "sliced" view (model units)
const DEFAULT_TOTAL_LIFT = SLICE_GAP * MOUNTAIN.levels.length;
const MAX_GAP = 1.1;           // one gap can open this far by dragging
const MAX_TOTAL_LIFT = 2.4;    // …and all gaps together this far, so the stack stays in frame
const LINE_LIFT = 0.006;       // keeps the lines just above the surface they trace
const FOV = 30;

const toWorldX = (mx: number) => (mx / 50 - 1) * HALF;
const toWorldZ = (my: number) => (my / 50 - 1) * HALF;
const heightToY = (m: number) => (m * MOUNTAIN.verticalExaggeration) / MOUNTAIN.metersPerUnit;
const defaultGaps = () => Array.from({ length: LEVEL_COUNT }, () => SLICE_GAP);

const SUMMIT_POS: [number, number, number] = [
  toWorldX(MOUNTAIN.summit.x),
  heightToY(MOUNTAIN.summit.heightM),
  toWorldZ(MOUNTAIN.summit.y),
];

// OrbitControls instance — typed loosely: only enabled/target/update and the
// start event are used, and drei's exported ref type doesn't line up cleanly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlsRef = React.MutableRefObject<any>;

// ---------------------------------------------------------------- camera views

type CameraGoal = { phi: number; theta: number | null; radius: number; targetY: number };

// theta = 0 looks from due south (north is up the screen); a small positive
// theta swings the camera toward the east, so the steep WNW face shows in
// silhouette on the left and the long gentle spur runs out to the right.
const DEFAULT_THETA = 0.42;

function goalFor(view: MountainView, aspect: number): CameraGoal {
  const fit = Math.min(1, aspect);
  if (view === 'top') {
    const span = 2 * HALF + 0.35;
    return { phi: 0.0001, theta: 0, radius: span / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * fit), targetY: 0 };
  }
  if (view === 'sliced') return { phi: 1.02, theta: null, radius: 11.6 / fit, targetY: 1.1 };
  return { phi: 1.0, theta: null, radius: 9.6 / fit, targetY: 0.32 };
}

const START = goalFor('whole', 1);
const START_TARGET: [number, number, number] = [0, START.targetY, 0];
const START_POSITION: [number, number, number] = [
  START.radius * Math.sin(START.phi) * Math.sin(DEFAULT_THETA),
  START.targetY + START.radius * Math.cos(START.phi),
  START.radius * Math.sin(START.phi) * Math.cos(DEFAULT_THETA),
];

function CameraRig({
  view,
  reduce,
  controlsRef,
  gapsRef,
}: {
  view: MountainView;
  reduce: boolean;
  controlsRef: ControlsRef;
  gapsRef: React.MutableRefObject<number[]>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const animating = useRef(true);
  const prevView = useRef<MountainView | null>(null);
  const goal = useRef<CameraGoal>(goalFor(view, size.width / size.height));
  const spherical = useMemo(() => new THREE.Spherical(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const g = goalFor(view, size.width / size.height);
    // Leaving the top view (or first mount) returns to the canonical angle;
    // whole ↔ sliced keeps whatever angle the learner rotated to.
    if (prevView.current === null || prevView.current === 'top' || view === 'top') {
      g.theta = view === 'top' ? 0 : DEFAULT_THETA;
    }
    goal.current = g;
    animating.current = true;
    prevView.current = view;
  }, [view, size.width, size.height]);

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
    const g = goal.current;
    const full = animating.current;
    // In the sliced view the framing follows the stack: as the learner drags
    // layers apart, the camera rises and pulls back so the summit stays in
    // frame — even after they've rotated (angle is theirs, height/zoom ours).
    if (view === 'sliced') {
      const base = goalFor('sliced', size.width / size.height);
      const extra = Math.max(0, gapsRef.current.reduce((a, b) => a + b, 0) - DEFAULT_TOTAL_LIFT);
      g.targetY = base.targetY + 0.5 * extra;
      g.radius = base.radius * (1 + 0.28 * extra);
    } else if (!full) {
      return;
    }

    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    const phiGoal = full ? g.phi : spherical.phi;
    let dTheta = full ? (g.theta ?? spherical.theta) - spherical.theta : 0;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta)); // shortest way round
    const settled =
      Math.abs(phiGoal - spherical.phi) < 0.002 &&
      Math.abs(dTheta) < 0.002 &&
      Math.abs(g.radius - spherical.radius) < 0.01 &&
      Math.abs(g.targetY - controls.target.y) < 0.005;
    if (settled) {
      animating.current = false;
      return;
    }

    const k = reduce ? 1 : 1 - Math.exp(-5 * delta);
    spherical.phi += (phiGoal - spherical.phi) * k;
    spherical.theta += dTheta * k;
    spherical.radius += (g.radius - spherical.radius) * k;
    spherical.makeSafe();
    controls.target.y += (g.targetY - controls.target.y) * k;

    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
  });

  return null;
}

// ---------------------------------------------------------------- mountain

type Parts = {
  base: THREE.Object3D;
  slices: THREE.Object3D[];
  /** Per-slice clone of the textured terrain material, so one can glow alone. */
  sliceMats: THREE.MeshStandardMaterial[];
};

function useMountainParts(): Parts {
  const { scene } = useGLTF(MODEL_URL);
  return useMemo(() => {
    const root = scene.clone(true);
    // Depth order where surfaces coincide: contour line > terrain > cut face.
    // The terrain is pushed back a hair so the lines drawn exactly on it never
    // z-fight; the flat cut faces are pushed back further, because on gentle
    // slopes the terrain sits a sliver above the cut face hidden beneath it.
    const cut = new THREE.MeshStandardMaterial({
      color: CUT_COLOR,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: 4,
      polygonOffsetUnits: 4,
    });
    const wall = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 });

    const dress = (obj: THREE.Object3D) => {
      let terrain: THREE.MeshStandardMaterial | null = null;
      obj.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const src = child.material as THREE.MeshStandardMaterial;
        if (src.name === 'Terrain') {
          if (!terrain) {
            terrain = src.clone();
            terrain.polygonOffset = true;
            terrain.polygonOffsetFactor = 1;
            terrain.polygonOffsetUnits = 1;
          }
          child.material = terrain;
        } else if (src.name === 'Cut') {
          child.material = cut;
        } else if (src.name === 'Wall') {
          child.material = wall;
        } // 'Canopy' keeps its loaded material (per-tree vertex colours)
        child.castShadow = true;
        child.receiveShadow = true;
      });
      return { obj, terrain: terrain as THREE.MeshStandardMaterial | null };
    };

    const base = dress(root.getObjectByName('Base')!).obj;
    const dressed = MOUNTAIN.levels.map((_, i) => dress(root.getObjectByName(`Slice_${i + 1}`)!));
    return {
      base,
      slices: dressed.map((d) => d.obj),
      sliceMats: dressed.map((d) => d.terrain!),
    };
  }, [scene]);
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
  onRearranged,
  onDraggingChange,
}: {
  view: MountainView;
  reduce: boolean;
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
  controlsRef: ControlsRef;
  gapsRef: React.MutableRefObject<number[]>;
  onRearranged: () => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { base, slices, sliceMats } = useMountainParts();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
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
      m.emissiveIntensity = on ? 0.35 : 0;
    });
  }, [activeRing, sliceMats]);

  // Never leave window listeners behind if the canvas unmounts mid-drag.
  useEffect(() => () => drag.current?.cleanup(), []);

  const startDrag = (i: number, e: ThreeEvent<PointerEvent>) => {
    if (view !== 'sliced') return;
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
    };
    const end = (ev: PointerEvent) => {
      drag.current?.cleanup();
      drag.current = null;
      if (controls) controls.enabled = true;
      onDraggingChange(false);
      // Hover events were ignored mid-drag, so re-derive the highlight from
      // whatever is under the pointer now (nothing, if it was released off-canvas).
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
    groups.current.forEach((g, i) => {
      lift += view === 'sliced' ? gapsRef.current[i] : 0;
      if (g) g.position.y += (lift - g.position.y) * k;
    });
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

export default function ContourCake3D({
  view,
  activeRing,
  setActiveRing,
}: {
  view: MountainView;
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rearranged, setRearranged] = useState(false);
  const reduce = !!useReducedMotion();
  const controlsRef = useRef(null) as ControlsRef;
  const gapsRef = useRef<number[]>(defaultGaps());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Pause the render loop while the diorama is scrolled out of view so it
    // doesn't steal frame budget from animations elsewhere on the lesson.
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      className="relative aspect-video sm:aspect-square max-h-[340px] w-full mx-auto"
      style={{ cursor }}
    >
      <Canvas
        shadows
        camera={{ position: START_POSITION, fov: FOV, near: 0.1, far: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        frameloop={inView ? 'always' : 'never'}
        onPointerMissed={() => !dragging && setActiveRing(null)}
      >
        <ambientLight intensity={0.85} />
        <hemisphereLight color="#FFF4E0" groundColor="#6E7A4E" intensity={0.4} />
        {/* Key light high and front-left of the default camera (SSW), so the
            faces the learner sees are lit and the slices cast their shadows
            back onto the layer below. */}
        <directionalLight
          position={[-3.2, 8, 4.6]}
          intensity={1.3}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-3.4}
          shadow-camera-right={3.4}
          shadow-camera-top={3.4}
          shadow-camera-bottom={-3.4}
          shadow-bias={-0.0006}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[4.5, 3, 2]} intensity={0.3} color="#FFF8EC" />

        <Suspense
          fallback={
            <Html center style={{ left: 0 }} className="text-fg-dim text-sm whitespace-nowrap">
              טוען מודל תלת־ממד…
            </Html>
          }
        >
          <Mountain
            view={view}
            reduce={reduce}
            activeRing={activeRing}
            setActiveRing={setActiveRing}
            controlsRef={controlsRef}
            gapsRef={gapsRef}
            onRearranged={onRearranged}
            onDraggingChange={setDragging}
          />
        </Suspense>

        {/* Soft grounding shadow under the diorama plinth. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]} receiveShadow>
          <planeGeometry args={[9, 9]} />
          <shadowMaterial opacity={0.12} />
        </mesh>

        <OrbitControls
          ref={controlsRef}
          target={START_TARGET}
          enablePan={false}
          enableZoom={false}
          enableRotate={view !== 'top'}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.08}
        />
        <CameraRig view={view} reduce={reduce} controlsRef={controlsRef} gapsRef={gapsRef} />
      </Canvas>

      {view === 'sliced' && rearranged && (
        <button
          type="button"
          onClick={resetLayers}
          className="absolute top-2 end-2 rounded-[3px] border border-border bg-bg-elevated/95 px-2.5 py-1 text-xs font-display font-bold text-fg-muted hover:border-accent/50 hover:text-fg transition-colors cursor-pointer"
        >
          ↺ סדר מחדש
        </button>
      )}
    </div>
  );
}
