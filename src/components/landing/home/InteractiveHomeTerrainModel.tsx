'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';

/**
 * InteractiveHomeTerrainModel — premium isometric-papercut terrain diorama
 * for the home hero (replaces the static home-hero-terrain-mockup.png
 * render used by HomeHero).
 *
 * v4 — sculpted in Blender, not procedurally in three.js. Two rebuild
 * passes (v2: canvas-texture-on-a-flat-plane, v3: procedurally displaced
 * geometry with hand-rolled ridge/warp/FBM/terrace math) kept hitting the
 * same wall: getting genuinely sculptural relief, clean carved terracing,
 * and premium matte materials out of hand-written displacement math is
 * exactly the kind of problem a real sculpting tool solves natively. The
 * terrain/slab/tree/flag geometry, materials, and composition were built
 * directly in Blender (via the Blender MCP) reusing the same tuned relief
 * design (ridge placement, terrace/groove logic, river spline + carved
 * cross-section, composition anchors) ported to Python, then exported as a
 * single static glTF binary: `public/assets/models/home-hero-terrain.glb`.
 *
 * This file only owns what's still a runtime/interaction concern: loading
 * that asset, the orthographic camera + hero framing, the studio light
 * rig + ACES tone mapping, drei's <ContactShadows>, and the drag-to-rotate
 * gate (pauses on drag, resumes after idle, fully skipped under
 * `prefers-reduced-motion`).
 *
 * Colours baked into the glb are the approved "illustration palette" from
 * design/design-spec.md §8 plus the ember accent from tailwind.config.ts —
 * see design/assumptions.md. Orange is confined to the flag's pennant only.
 *
 * Rendered client-only via next/dynamic from HomeTerrainDiorama.tsx
 * (Canvas can't SSR); WebGL support + runtime errors are gated there.
 */

const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/models/home-hero-terrain.glb`;

// Matches the Blender build: CORE_THICKNESS (0.2) + LIP_THICKNESS (0.035).
const SLAB_TOP_Y = 0.235;

// The geoHome.glb export places the diorama offset from the origin
// (slab bottom at y=0.206, x/z shifted −0.04/+0.11). This anchors it back
// to the origin the camera/shadow/controls constants were tuned against
// (slab bottom at y=0, slab centred on x/z).
const MODEL_OFFSET: [number, number, number] = [0.04, -0.206, -0.11];

function TerrainModel() {
  const { scene } = useGLTF(MODEL_URL);
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);
  return (
    <group position={MODEL_OFFSET}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

const TARGET_WORLD_SPAN = 3.9;

function ResponsiveOrtho() {
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const size = useThree((state) => state.size);

  useEffect(() => {
    const shortSide = Math.min(size.width, size.height);
    camera.zoom = shortSide / TARGET_WORLD_SPAN;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/** Gently pauses auto-rotate while the user drags, resuming after a short idle delay. */
function useAutoRotateGate(reduce: boolean) {
  // Typed loosely: only `autoRotate` is toggled here, and drei's exported
  // OrbitControls ref type doesn't line up cleanly with a partial shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  const onStart = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  };
  const onEnd = () => {
    if (reduce) return;
    resumeTimer.current = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.autoRotate = true;
    }, 2500);
  };

  return { controlsRef, onStart, onEnd };
}

// Elevation ~36° (a "product photography" angle), azimuth ~30° off either
// axis (never the mirrored-45° diamond), positioned on the +x/-z side — the
// flag's side — so the knoll sits near/large while the tree cluster
// (-x/+z) recedes into the background for depth. Matches the camera used
// to look-dev the model in Blender.
const INITIAL_CAMERA_POSITION: [number, number, number] = [2.55, 3.7, -4.42];
// Pivot nudged toward the flag site (not dead-centre on the slab) and
// raised to roughly the knoll's mid-height.
const CONTROLS_TARGET: [number, number, number] = [0.14, SLAB_TOP_Y + 0.1, -0.09];

export default function InteractiveHomeTerrainModel() {
  const reduce = !!useReducedMotion();
  const { controlsRef, onStart, onEnd } = useAutoRotateGate(reduce);

  return (
    <Canvas
      className="size-full"
      orthographic
      camera={{ position: INITIAL_CAMERA_POSITION, zoom: 100, near: 0.1, far: 20 }}
      dpr={[1, 3]}
      shadows="soft"
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: 'none' }}
    >
      <ResponsiveOrtho />

      {/* Soft studio rig — broad ambient/hemisphere fill kept moderate, a
          soft key light raking from the flag-front side (matches the
          camera azimuth) that now casts real shadows (the Blender-sculpted
          geometry is clean enough not to acne the way the old fine-noise
          procedural mesh did), a gentle opposite fill, and a cool rim/kicker
          catching bevel edges and ridgelines from behind. */}
      <ambientLight intensity={0.48} />
      <hemisphereLight color="#E8DCC4" groundColor="#55613C" intensity={0.3} />
      <directionalLight
        position={[3.0, 5.0, -2.4]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-bias={-0.0007}
        shadow-radius={2.5}
      />
      <directionalLight position={[-2.6, 2.0, 2.8]} intensity={0.26} />
      <directionalLight position={[-1.4, 4.2, -0.9]} intensity={0.14} color="#F8F2E7" />

      <Suspense fallback={null}>
        <TerrainModel />
      </Suspense>

      {/* Single baked contact-shadow pass (frames=1) — nothing in world
          space moves (only the camera orbits), so one soft blurred shadow
          under the slab/trees/flag is correct and free after the first
          frame. Layered under the real-time shadow above for extra
          close-contact grounding (tree/flag base shadows). */}
      <ContactShadows
        position={[0, -SLAB_TOP_Y - 0.005, 0]}
        opacity={0.35}
        scale={5.5}
        blur={2.4}
        far={1.6}
        resolution={1024}
        color="#38432E"
        frames={1}
      />

      <OrbitControls
        ref={controlsRef}
        target={CONTROLS_TARGET}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.68}
        maxPolarAngle={1.2}
        autoRotate={!reduce}
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.08}
        onStart={onStart}
        onEnd={onEnd}
      />
    </Canvas>
  );
}
