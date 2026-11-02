'use client';
/**
 * The live view of the navigation replay: the ground around one station, seen
 * from the navigator's eye (ground + 1.7 m). Loaded lazily (next/dynamic,
 * ssr:false) by ReplayView, which owns the frame, the controls, the loading
 * line and the fallback.
 *
 * Budget (desktop): one polar ground mesh (~0.7 M triangles at a station,
 * <1.4 M over the shared walking corridor, out to the same 16 km horizon);
 * everything else the view shows — sky, light, ground material, scanned
 * plants and rocks with levels of detail, trees — is scene/ReplayVisuals.tsx.
 * frameloop "demand" (look or walking frames), paused off-screen.
 */
import { memo, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { PerspectiveCamera } from 'three';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import { createReplayPreparation, type PreparedWorld as Built } from './replayPreparation';
import { worldOfStop, type StopId } from './replayRoute';
import { Markers, Picker, type PickFn, type ViewMarker } from './ReplayMarkers';
import type { WalkStore } from './replayWalk';
import { EYE_HEIGHT_M, verticalFovForAspect, type ViewStore } from './replayViewStore';
import type { W2 } from './replayWorld';
import { D2R } from './scene/visualConfig';
import { REPLAY_GL, ReplayVisuals, setupReplayRenderer } from './scene/ReplayVisuals';

export { REPLAY_ASSETS } from './scene/visualConfig';

export type SceneProps = {
  stationKey: StopId;
  station: W2;
  view: ViewStore;
  /** In view: draw on demand; off-screen: no frames at all. */
  active: boolean;
  onReady: () => void;
  /** A new station is being built (true) / drawn (false). */
  onBusy: (busy: boolean) => void;
  onLost: () => void;
  /** Every station of the replay: prepared in the background once the first is drawn. */
  walk: WalkStore;
  /** The lazy chunk is in: the wrapper's loading line takes over from next/dynamic's. */
  onMount?: () => void;
  /** Set by the scene: turns a click into what the eye looked at (the check's sign picking). */
  pickRef: MutableRefObject<PickFn | null>;
  /** Labels on identified signs and the guided pointer. */
  markers: ViewMarker[];
  reduce: boolean;
};

/**
 * Memoised: the view panel re-renders on every look change (its heading ribbon), and while walking the
 * look changes every frame — that must never re-reconcile the whole scene.
 */
export default memo(function ReplayScene3D(props: SceneProps) {
  const { onMount } = props;
  // before the first paint, so no frame goes by without a loading line
  useLayoutEffect(() => onMount?.(), [onMount]);
  return (
    <Canvas
      frameloop={props.active ? 'demand' : 'never'}
      dpr={[1, 2]}
      shadows="percentage"
      gl={REPLAY_GL}
      camera={{ fov: 54, near: 0.1, far: 30000, position: [props.station.x, 400, props.station.z] }}
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl, scene }) => {
        setupReplayRenderer(gl, scene);
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          props.onLost();
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
      data-replay-canvas=""
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
});

// ───────────────────────────────────────────── terrain building (cached per station)

// ───────────────────────────────────────────── the world

function World({ stationKey, station, view, onReady, onBusy, onLost, walk, pickRef, markers, reduce }: SceneProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const [built, setBuilt] = useState<Built | null>(null);

  const preparation = useRef<ReturnType<typeof createReplayPreparation> | null>(null);
  const walkTarget = useSyncExternalStore(walk.subscribe, walk.target, walk.target);
  const desired = worldOfStop(walkTarget ?? stationKey);
  useEffect(() => {
    const cache = createReplayPreparation();
    preparation.current = cache;
    const qa = window as unknown as {__replayPreparation?:()=>object;__replayGpu?:()=>object};
    const inspect = () => ({ready:cache.ready,size:cache.size});
    const gpu = () => ({geometries:gl.info.memory.geometries,textures:gl.info.memory.textures});
    qa.__replayPreparation=inspect;qa.__replayGpu=gpu;
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __replayScene?: unknown }).__replayScene = scene;
    return () => {
      cache.dispose(); preparation.current = null;
      if(qa.__replayPreparation===inspect)delete qa.__replayPreparation;
      if(qa.__replayGpu===gpu)delete qa.__replayGpu;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const id = walk.get().id;
    if (built?.key === desired) {
      onBusy(false);
      walk.ready(id);
      invalidate();
      return;
    }
    onBusy(true);
    preparation.current!.get(desired).then(b => {
      if (!cancelled) setBuilt(b);
    }).catch(() => { if (!cancelled) onLost(); });
    return () => { cancelled = true; };
    // A key identifies a prepared world. Camera/answer updates must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desired, walkTarget]);
  // dispose() frees the outgoing WebGL buffers; cached typed arrays remain
  // usable, so revisiting can upload them without another CPU build.
  useEffect(() => () => { built?.geometry.dispose(); }, [built]);
  useEffect(() => {
    if (!built) return;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    (window as unknown as { __replayStats?: object }).__replayStats = {
      station: stationKey, world: built.key,
      terrainTriangles: (built.geometry.index?.count ?? 0) / 3,
      shrubsNear: built.shrubsNear.length, shrubsFar: built.shrubsFar.length,
      cushions: built.cushions.length, grass: built.grass.length,
      stones: built.stones.length, rocks: built.rocks.length,
      eyeY: built.terrain.height(station.x, station.z) + EYE_HEIGHT_M,
    };
  }, [built, stationKey, station, gl, invalidate]);
  // First draw the current station. Then spend small CPU batches preparing
  // the next world (leg A's corridor during the opening check, then leg B's).
  useEffect(() => {
    if (!built) return;
    const cache = preparation.current!;
    const next = built.key === 'start' ? 'legA' : built.key === 'legA' ? 'legB' : null;
    if (!next) return;
    const id = window.setTimeout(() => { void cache.get(next).catch(() => {}); }, 180);
    return () => window.clearTimeout(id);
  }, [built]);

  if (!built) return null;
  return (
    <>
      <CameraRig view={view} station={station} built={built} walk={walk} />
      <ReplayVisuals built={built} />
      <Picker terrain={built.terrain} pickRef={pickRef} />
      <Markers markers={markers} terrain={built.terrain} reduce={reduce} />
      <FirstFrame stationKey={built.key} onReady={() => { onReady(); if (built.key === worldOfStop(walk.target() ?? stationKey)) walk.ready(); }} onBusy={onBusy} />
    </>
  );
}

function FirstFrame({ stationKey, onReady, onBusy }: { stationKey: string; onReady: () => void; onBusy: (b: boolean) => void }) {
  const frames = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    frames.current = 0;
    invalidate();
  }, [stationKey, invalidate]);
  useFrame(() => {
    frames.current++;
    if (frames.current === 2) {
      onBusy(false);
      onReady();
    } else if (frames.current < 2) invalidate();
  });
  return null;
}

function CameraRig({ view, station, built, walk }: { view: ViewStore; station: W2; built: Built; walk: WalkStore }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const off = view.subscribe(() => invalidate());
    const offWalk = walk.subscribe(() => invalidate());
    return () => { off(); offWalk(); };
  }, [view, walk, invalidate]);
  useEffect(() => invalidate(), [station, built, invalidate]);
  useFrame((_, dt) => {
    walk.step(dt * 1000);
    const pose = walk.pose();
    const at = pose?.at ?? station;
    if (pose && walk.phase() !== 'preparing') view.set({yawDeg:pose.yawDeg,pitchDeg:pose.pitchDeg,vfovDeg:pose.vfovDeg});
    const running = view.step(performance.now());
    const l = view.get();
    camera.position.set(at.x, built.terrain.height(at.x,at.z) + EYE_HEIGHT_M, at.z);
    (window as unknown as {__replayEye?:object}).__replayEye={x:at.x,z:at.z,y:camera.position.y,ground:built.terrain.height(at.x,at.z),phase:walk.phase()};
    camera.rotation.set(l.pitchDeg * D2R, -l.yawDeg * D2R, 0, 'YXZ');
    const vfov = verticalFovForAspect(l.vfovDeg, camera.aspect);
    if (Math.abs(camera.fov - vfov) > 1e-3) { camera.fov = vfov; camera.updateProjectionMatrix(); }
    if (running || walk.phase() === 'walking') invalidate();
  });
  return null;
}
