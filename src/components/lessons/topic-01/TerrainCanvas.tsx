'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, type ReactNode } from 'react';
import type { Feature } from './OnboardingScene';

/**
 * 3D POV-driven version of the terrain stage.
 *
 * Layout is axis-aligned (path runs south→north along -Z) so each step
 * can place the camera at a different on-the-ground vantage point and
 * the user "feels" they're standing in the terrain:
 *
 *   flat      — over the blue force's shoulder, looking across open ground
 *   mountain  — standing high above the dominant peak, looking down
 *   river     — pulled back from the south bank, framed wide on the bridge
 *   narrow    — wedged inside a tight corridor between flanking ridges
 *
 * The camera is animated frame-by-frame (CameraDirector) so transitions
 * between POVs feel cinematic instead of cut.
 *
 * Labels are gated per step so they only appear when they're the focal
 * point of the lesson, never as ambient clutter.
 */

const C = {
  ground: '#d8bd83',
  gridLine: '#5b7c5c',
  mountainLight: '#7a8a3f',
  mountainDark: '#5a6b4a',
  river: '#3d6b8e',
  // Bridge — stone deck with darker pylons + orange centre stripe.
  // Picked specifically NOT to blend with the sand terrain.
  bridgeDeck: '#8d8680',
  bridgePylon: '#5e5853',
  bridgeAccent: '#EB9E48',
  pathArrow: '#EB9E48',
  blue: '#5b9dd9',
  enemy: '#e2553a',
  enemyCommand: '#b83a22',
  chokepoint: '#EB9E48',
};

/** Blue force pin — visible only in `flat` (the user becomes it after). */
const BLUE_POS: [number, number, number] = [0, 0, 3.8];
/** Centre of the enemy formation. */
const ENEMY_POS: [number, number, number] = [0, 0, -3.8];

/** Camera POV per step. */
type POV = { pos: [number, number, number]; look: [number, number, number]; fov: number };
const POVS: Record<Feature, POV> = {
  flat: {
    // Over the blue force's shoulder, eye height, looking across open
    // ground toward the enemy formation in the distance.
    pos: [-0.4, 1.55, 4.6],
    look: [0.1, 0.4, -2.6],
    fov: 55,
  },
  mountain: {
    // Standing high on the dominant peak. Camera raised + look target
    // dropped below the ground plane so the view tilts clearly DOWN —
    // pedagogical "I'm on the high ground" feel.
    pos: [0.7, 3.05, 0.75],
    look: [0.0, -0.4, -3.4],
    fov: 52,
  },
  river: {
    // Pulled well south of the bank so the full water body fills the
    // mid-ground and the bridge sits centred and recognisable.
    pos: [0, 1.55, 4.7],
    look: [0, 0.25, 1.2],
    fov: 56,
  },
  narrow: {
    // Wedged into the corridor between the flanking ridges. Eye height
    // drops to shoulder level; FOV opens wider so both walls press
    // against the edges of the frame.
    pos: [0, 0.65, -0.9],
    look: [0, 0.2, -3.7],
    fov: 66,
  },
};

export default function TerrainCanvas({ feature }: { feature: Feature }) {
  // Features accumulate, mirroring the original SVG: once added a
  // feature stays on through subsequent steps.
  const showMountain = feature === 'mountain' || feature === 'river' || feature === 'narrow';
  const showRiver = feature === 'river' || feature === 'narrow';
  const showNarrow = feature === 'narrow';

  // Label gating — show each label only where it's the lesson focus.
  const enemyLabel = feature === 'flat' || feature === 'mountain';
  const bridgeLabel = feature === 'river';
  const chokeLabel = feature === 'narrow';

  return (
    <Canvas
      shadows
      camera={{ position: POVS.flat.pos, fov: POVS.flat.fov, near: 0.1, far: 60 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <CameraDirector feature={feature} />

      <ambientLight intensity={0.55} />
      <hemisphereLight color="#ffe9c8" groundColor="#a87f4e" intensity={0.35} />
      <directionalLight
        position={[5, 9, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />

      <TerrainBoard />

      <MountainRidges show={showMountain} />
      <River show={showRiver} />
      <Bridge show={showRiver} showLabel={bridgeLabel} />
      <NarrowRidges show={showNarrow} />
      <Chokepoint show={showNarrow} showLabel={chokeLabel} />

      <BlueArmyMarker position={BLUE_POS} hidden={feature !== 'flat'} />
      <EnemyForce position={ENEMY_POS} showLabel={enemyLabel} />

      <MovementPath feature={feature} />
    </Canvas>
  );
}

/* ---------------- camera director ---------------- */

function CameraDirector({ feature }: { feature: Feature }) {
  const { camera } = useThree();
  const currentLook = useRef(new THREE.Vector3(...POVS.flat.look));
  const LAMBDA = 2.4;

  useFrame((_, delta) => {
    const target = POVS[feature];

    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.pos[0], LAMBDA, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.pos[1], LAMBDA, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.pos[2], LAMBDA, delta);

    currentLook.current.x = THREE.MathUtils.damp(currentLook.current.x, target.look[0], LAMBDA, delta);
    currentLook.current.y = THREE.MathUtils.damp(currentLook.current.y, target.look[1], LAMBDA, delta);
    currentLook.current.z = THREE.MathUtils.damp(currentLook.current.z, target.look[2], LAMBDA, delta);

    const perspective = camera as THREE.PerspectiveCamera;
    const nextFov = THREE.MathUtils.damp(perspective.fov, target.fov, LAMBDA, delta);
    if (Math.abs(nextFov - perspective.fov) > 0.005) {
      perspective.fov = nextFov;
      perspective.updateProjectionMatrix();
    }

    camera.lookAt(currentLook.current);
  });

  return null;
}

/* ---------------- generic helpers ---------------- */

function AnimatedFeature({ show, children }: { show: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const target = show ? 1 : 0;
  useFrame((_, delta) => {
    if (!ref.current) return;
    const next = THREE.MathUtils.damp(ref.current.scale.x, target, 7, delta);
    ref.current.scale.setScalar(Math.max(0.0001, next));
    ref.current.visible = next > 0.02;
  });
  return (
    <group ref={ref} scale={show ? 1 : 0.0001}>
      {children}
    </group>
  );
}

/* ---------------- terrain features ---------------- */

function TerrainBoard() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[10, 0.4, 9]} />
        <meshStandardMaterial color={C.ground} roughness={0.95} metalness={0} />
      </mesh>
      <gridHelper
        args={[10, 10, C.gridLine, C.gridLine]}
        position={[0, 0.005, 0]}
        material-opacity={0.22}
        material-transparent={true}
      />
    </group>
  );
}

function MountainRidges({ show }: { show: boolean }) {
  return (
    <AnimatedFeature show={show}>
      {/* Smaller flanking peak (west). */}
      <mesh castShadow receiveShadow position={[-0.6, 0.7, -0.4]}>
        <coneGeometry args={[1.1, 1.4, 7]} />
        <meshStandardMaterial color={C.mountainLight} roughness={0.85} />
      </mesh>
      {/* Dominant central peak — this is what the camera stands on
          in the `mountain` POV. */}
      <mesh castShadow receiveShadow position={[0.7, 0.85, 0.4]}>
        <coneGeometry args={[1.3, 1.7, 7]} />
        <meshStandardMaterial color={C.mountainDark} roughness={0.85} />
      </mesh>
    </AnimatedFeature>
  );
}

function River({ show }: { show: boolean }) {
  // Significantly wider than before (z-depth 2.4 vs 0.85) — shows up
  // as a real water body, not a ribbon. Centred at z=1.9.
  return (
    <AnimatedFeature show={show}>
      <mesh position={[0, 0.025, 1.9]} receiveShadow>
        <boxGeometry args={[10, 0.06, 2.4]} />
        <meshStandardMaterial
          color={C.river}
          roughness={0.18}
          metalness={0.1}
          emissive={C.river}
          emissiveIntensity={0.12}
        />
      </mesh>
    </AnimatedFeature>
  );
}

function Bridge({ show, showLabel }: { show: boolean; showLabel: boolean }) {
  // Architectural bridge — gray stone deck (NOT sand-coloured), four
  // pylons piercing the water, and a single orange centre stripe that
  // doubles as the tactical route marker. Designed so it reads as a
  // man-made crossing at a glance.
  return (
    <AnimatedFeature show={show}>
      <group position={[0, 0, 1.9]}>
        {/* Stone deck. */}
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.18, 2.5]} />
          <meshStandardMaterial color={C.bridgeDeck} roughness={0.7} />
        </mesh>
        {/* Centre route stripe — the tactical accent. */}
        <mesh position={[0, 0.275, 0]}>
          <boxGeometry args={[0.22, 0.02, 2.45]} />
          <meshStandardMaterial
            color={C.bridgeAccent}
            emissive={C.bridgeAccent}
            emissiveIntensity={0.55}
            roughness={0.4}
          />
        </mesh>
        {/* Pylons piercing into the river — 4 corners. */}
        {[
          [-0.7, 1.05],
          [0.7, 1.05],
          [-0.7, -1.05],
          [0.7, -1.05],
        ].map(([px, pz], i) => (
          <mesh key={i} castShadow position={[px, -0.05, pz]}>
            <boxGeometry args={[0.18, 0.55, 0.18]} />
            <meshStandardMaterial color={C.bridgePylon} roughness={0.75} />
          </mesh>
        ))}
        {showLabel && (
          <Html
            position={[0, 0.95, 0]}
            center
            distanceFactor={6}
            className="pointer-events-none select-none"
          >
            <span className="px-2 py-0.5 text-xs font-display font-bold text-accent bg-bg-elevated/95 rounded-md shadow-sm whitespace-nowrap">
              גשר
            </span>
          </Html>
        )}
      </group>
    </AnimatedFeature>
  );
}

function NarrowRidges({ show }: { show: boolean }) {
  // Tight chokepoint — ridges pushed in to x=±1.4 with overlapping
  // base radii, so the corridor between them is only ~0.6 units wide
  // at the ground and visibly tighter higher up. Each ridge is also
  // elongated in z (scale 2.5) so it reads as a wall, not a peak.
  return (
    <AnimatedFeature show={show}>
      <mesh castShadow receiveShadow position={[-1.4, 0.7, -2.2]} scale={[1, 1, 2.5]}>
        <coneGeometry args={[1.1, 1.5, 7]} />
        <meshStandardMaterial color={C.mountainDark} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.4, 0.7, -2.2]} scale={[1, 1, 2.5]}>
        <coneGeometry args={[1.1, 1.5, 7]} />
        <meshStandardMaterial color={C.mountainDark} roughness={0.85} />
      </mesh>
    </AnimatedFeature>
  );
}

function Chokepoint({ show, showLabel }: { show: boolean; showLabel: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.4) * 0.18;
    ringRef.current.scale.set(pulse, pulse, 1);
    const m = ringRef.current.material as THREE.MeshStandardMaterial;
    m.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  });

  return (
    <AnimatedFeature show={show}>
      <group position={[0, 0, -2.2]}>
        <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.06, 16, 48]} />
          <meshStandardMaterial
            color={C.chokepoint}
            emissive={C.chokepoint}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
        {showLabel && (
          <Html
            position={[0, 0.55, 0]}
            center
            distanceFactor={6}
            className="pointer-events-none select-none"
          >
            <span className="px-2 py-0.5 text-xs font-display font-bold text-accent bg-bg-elevated/95 rounded-md shadow-sm whitespace-nowrap">
              נקודת חנק
            </span>
          </Html>
        )}
      </group>
    </AnimatedFeature>
  );
}

/* ---------------- forces ---------------- */

/** Single blue pillar — the user's start point. Vanishes from non-flat
    steps because the camera has moved onto the terrain itself. */
function BlueArmyMarker({
  position,
  hidden,
}: {
  position: [number, number, number];
  hidden: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, delta) => {
    if (haloRef.current) {
      const t = clock.getElapsedTime();
      const pulse = 1 + Math.sin(t * 1.6) * 0.22;
      haloRef.current.scale.set(pulse, pulse, 1);
    }
    if (groupRef.current) {
      const target = hidden ? 0 : 1;
      const next = THREE.MathUtils.damp(groupRef.current.scale.x, target, 5, delta);
      groupRef.current.scale.setScalar(Math.max(0.0001, next));
      groupRef.current.visible = next > 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={haloRef} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.66, 32]} />
        <meshStandardMaterial
          color={C.blue}
          transparent
          opacity={0.35}
          emissive={C.blue}
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.42, 32]} />
        <meshStandardMaterial color={C.blue} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.55, 16]} />
        <meshStandardMaterial color={C.blue} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.68, 0]}>
        <coneGeometry args={[0.22, 0.28, 16]} />
        <meshStandardMaterial color={C.blue} roughness={0.5} />
      </mesh>
      <Html
        position={[0, 1.18, 0]}
        center
        distanceFactor={6}
        className="pointer-events-none select-none"
      >
        <span
          className="px-2 py-0.5 text-xs font-display font-bold rounded-md shadow-sm bg-bg-elevated/95 whitespace-nowrap"
          style={{ color: C.blue }}
        >
          צבא כחול
        </span>
      </Html>
    </group>
  );
}

/**
 * Enemy force — a wedge of seven small red units plus a central
 * "command" cone, sitting on a translucent red ground footprint with a
 * pulsing halo. Reads as "a hostile formation occupying this ground,"
 * not as a single round map pin.
 */
function EnemyForce({
  position,
  showLabel,
}: {
  position: [number, number, number];
  showLabel: boolean;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.5) * 0.16;
    haloRef.current.scale.set(pulse, pulse, 1);
  });

  // Wedge tip points south (+Z), TOWARD the blue side / camera.
  const units: [number, number][] = [
    [0, 0.55], // tip — frontmost (closest to blue)
    [-0.35, 0.15], [0.35, 0.15],
    [-0.65, -0.3], [0.65, -0.3],
    [-0.3, -0.7], [0.3, -0.7],
  ];

  return (
    <group position={position}>
      {/* Pulsing ground halo (always present — gives the formation
          visual weight even at distance). */}
      <mesh ref={haloRef} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.35, 36]} />
        <meshStandardMaterial
          color={C.enemy}
          transparent
          opacity={0.32}
          emissive={C.enemy}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Solid red footprint so the formation reads as occupied ground. */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.95, 36]} />
        <meshStandardMaterial color={C.enemy} roughness={0.55} transparent opacity={0.4} />
      </mesh>

      {/* Wedge of small units. Each is a short cylindrical body + cone
          cap — a compact "pawn" silhouette that reads as a soldier at
          medium camera distance. */}
      {units.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 0.32, 12]} />
            <meshStandardMaterial color={C.enemy} roughness={0.55} />
          </mesh>
          <mesh castShadow position={[0, 0.4, 0]}>
            <coneGeometry args={[0.11, 0.18, 12]} />
            <meshStandardMaterial color={C.enemy} roughness={0.55} />
          </mesh>
        </group>
      ))}

      {/* Central command unit — slightly bigger, darker red, sits a bit
          back of the wedge centre. Gives the formation a "leader" focal
          point and helps readability at distance. */}
      <group position={[0, 0, -0.2]}>
        <mesh castShadow position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.13, 0.17, 0.45, 14]} />
          <meshStandardMaterial color={C.enemyCommand} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 0.55, 0]}>
          <coneGeometry args={[0.16, 0.26, 14]} />
          <meshStandardMaterial color={C.enemyCommand} roughness={0.55} />
        </mesh>
      </group>

      {showLabel && (
        <Html
          position={[0, 1.15, -0.2]}
          center
          distanceFactor={6}
          className="pointer-events-none select-none"
        >
          <span
            className="px-2 py-0.5 text-xs font-display font-bold rounded-md shadow-sm bg-bg-elevated/95 whitespace-nowrap"
            style={{ color: C.enemy }}
          >
            כוח אויב
          </span>
        </Html>
      )}
    </group>
  );
}

/* ---------------- movement path ---------------- */

function MovementPath({ feature }: { feature: Feature }) {
  const flat = useMemo(
    () =>
      buildCurve([
        [0, 0.05, 3.6],
        [0, 0.05, 0],
        [0, 0.05, -3.4],
      ]),
    [],
  );
  const mountainW = useMemo(
    () =>
      buildCurve([
        [0, 0.05, 3.6],
        [-1.7, 0.05, 2.0],
        [-2.1, 0.05, 0],
        [-1.0, 0.05, -1.7],
        [0, 0.05, -3.4],
      ]),
    [],
  );
  const mountainE = useMemo(
    () =>
      buildCurve([
        [0, 0.05, 3.6],
        [1.7, 0.05, 2.0],
        [2.1, 0.05, 0],
        [1.0, 0.05, -1.7],
        [0, 0.05, -3.4],
      ]),
    [],
  );
  const river = useMemo(
    () =>
      buildCurve([
        [0, 0.05, 3.6],
        [0, 0.05, 2.6],
        [0, 0.05, 1.9], // through bridge
        [-0.7, 0.05, 0.4],
        [-1.0, 0.05, -1.7],
        [0, 0.05, -3.4],
      ]),
    [],
  );
  const narrow = useMemo(
    () =>
      buildCurve([
        [0, 0.05, 3.6],
        [0, 0.05, 1.9], // bridge
        [0.2, 0.05, 0],
        [0, 0.05, -2.2], // chokepoint
        [0, 0.05, -3.4],
      ]),
    [],
  );

  return (
    <>
      <AnimatedFeature show={feature === 'flat'}>
        <PathTube curve={flat} />
      </AnimatedFeature>
      <AnimatedFeature show={feature === 'mountain'}>
        <PathTube curve={mountainW} />
        <PathTube curve={mountainE} />
      </AnimatedFeature>
      <AnimatedFeature show={feature === 'river'}>
        <PathTube curve={river} />
      </AnimatedFeature>
      <AnimatedFeature show={feature === 'narrow'}>
        <PathTube curve={narrow} />
      </AnimatedFeature>
    </>
  );
}

function buildCurve(points: [number, number, number][]) {
  const v3 = points.map((p) => new THREE.Vector3(...p));
  return new THREE.CatmullRomCurve3(v3, false, 'catmullrom', 0.4);
}

function PathTube({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const { tipPos, tipQuat } = useMemo(() => {
    const endPoint = curve.getPointAt(1);
    const tangent = curve.getTangentAt(0.999).normalize();
    const halfHeight = 0.15;
    const pos = endPoint.clone().sub(tangent.clone().multiplyScalar(halfHeight));
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tangent,
    );
    return { tipPos: pos, tipQuat: quat };
  }, [curve]);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 80, 0.055, 8, false]} />
        <meshStandardMaterial
          color={C.pathArrow}
          emissive={C.pathArrow}
          emissiveIntensity={0.35}
          roughness={0.5}
        />
      </mesh>
      <mesh position={tipPos} quaternion={tipQuat}>
        <coneGeometry args={[0.16, 0.3, 12]} />
        <meshStandardMaterial
          color={C.pathArrow}
          emissive={C.pathArrow}
          emissiveIntensity={0.45}
        />
      </mesh>
    </group>
  );
}
