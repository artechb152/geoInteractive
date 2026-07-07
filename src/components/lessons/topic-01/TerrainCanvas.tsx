'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Feature } from './OnboardingScene';
import { sampleOnboardingField, RIVER_Z, type FeatureBlends } from './onboardingTerrainField';

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
 * The terrain itself is one procedurally sculpted, vertex-coloured surface
 * (onboardingTerrainField.ts) rather than separate cone/box props sitting on
 * a flat board — mountains, the river trench and the chokepoint walls are
 * all real elevation that rises/carves in as each step's blend factor
 * animates toward 1, and the route tubes hug that surface directly.
 *
 * Labels are gated per step so they only appear when they're the focal
 * point of the lesson, never as ambient clutter.
 */

const C = {
  groundLow: '#d8bd83',
  groundDeep: '#c2a26b',
  mountainLight: '#7a8a3f',
  mountainDark: '#5a6b4a',
  rock: '#8c7c62',
  peakHighlight: '#f3e8cf',
  crease: '#2e3626',
  river: '#3d6b8e',
  riverDeep: '#254a63',
  rim: '#c9b892',
  // Bridge — stone deck with darker pylons + orange centre stripe.
  // Picked specifically NOT to blend with the sand terrain.
  bridgeDeck: '#8d8680',
  bridgePylon: '#5e5853',
  bridgeAccent: '#EB9E48',
  pathArrow: '#EB9E48',
  blue: '#5b9dd9',
  enemy: '#e2553a',
  enemyCommand: '#b83a22',
  enemyDeep: '#832c1a',
  chokepoint: '#EB9E48',
  fog: '#f3e9dc',
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
    // Pulled back and up further than pass 1 so the now much taller,
    // sharper dominant peak reads as a real landform below the camera,
    // look target dropped well below the ground plane so the view tilts
    // clearly DOWN — pedagogical "I'm on the high ground looking down at
    // the valley" feel, with the enemy visible small in the distance for
    // scale contrast.
    pos: [2.3, 3.6, 3.0],
    look: [0.15, -0.35, -3.0],
    fov: 46,
  },
  river: {
    // Pulled back and raised slightly from pass 1 so both banks, the
    // mountain silhouette behind and the bridge all read together as one
    // "crossing problem" composition instead of the bridge alone filling
    // the frame.
    pos: [0, 2.0, 5.6],
    look: [0, 0.15, 1.3],
    fov: 52,
  },
  narrow: {
    // Wedged into the corridor between the flanking ridges. Eye height
    // drops to shoulder level; FOV opens wider so both walls press
    // against the edges of the frame.
    pos: [0, 0.65, -1.15],
    look: [0, 0.2, -3.7],
    fov: 62,
  },
};

export default function TerrainCanvas({ feature }: { feature: Feature }) {
  // Features accumulate, mirroring the original SVG: once added a
  // feature stays on through subsequent steps.
  const showRiver = feature === 'river' || feature === 'narrow';
  const showNarrow = feature === 'narrow';

  // Label gating — show each label only where it's the lesson focus.
  const enemyLabel = feature === 'flat' || feature === 'mountain';
  const bridgeLabel = feature === 'river';

  // Fragment, NOT a wrapping div: TerrainCanvas is rendered inside an
  // existing `relative` container (OnboardingScene's TerrainStage). An
  // extra div here previously made the WebGL canvas's ResizeObserver race
  // on viewport/accordion-height changes (see onboarding-edit-mode.tsx's
  // EditableFrame doc comment) — the Vignette overlay instead relies on
  // that same pre-existing ancestor for positioning.
  return (
    <>
      <Canvas
        shadows
        camera={{ position: POVS.flat.pos, fov: POVS.flat.fov, near: 0.1, far: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <CameraDirector feature={feature} />

        {/* Tighter near fog than pass 1 — gives real aerial-perspective
            separation between foreground props, the mid-ground terrain and
            the distant enemy/mountain silhouette, without hazing out
            close-up detail. */}
        <fog attach="fog" args={[C.fog, 7, 20]} />

        <ambientLight intensity={0.5} />
        <hemisphereLight color="#fff1d6" groundColor="#8f6f45" intensity={0.38} />
        {/* Cinematic key light — lower angle than pass 1 for longer, more
            directional shadows and stronger form definition. */}
        <directionalLight
          position={[7, 6.5, 4]}
          intensity={1.95}
          color="#ffdca0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-bias={-0.00035}
        />
        {/* Cool fill from the opposite side — keeps shadow faces readable
            without flattening the key light's contrast. */}
        <directionalLight position={[-6, 3.5, -3.5]} intensity={0.32} color="#a9c7db" />
        {/* Faint rim/back light — just enough to catch ridge edges without
            veiling the shadow side into an overall wash. */}
        <directionalLight position={[-1.5, 2.6, -9]} intensity={0.22} color="#ffcf94" />

        <TerrainSurface feature={feature} />

        <RiverWater show={showRiver} />
        <Bridge show={showRiver} showLabel={bridgeLabel} />
        <Chokepoint show={showNarrow} />

        <BlueArmyMarker position={BLUE_POS} hidden={feature !== 'flat'} />
        <EnemyForce position={ENEMY_POS} showLabel={enemyLabel} />

        <MovementPath feature={feature} />
      </Canvas>
      <Vignette />
    </>
  );
}

/** Cheap screen-space vignette + faint cool-to-warm grade — CSS overlay,
    zero render cost, restrained enough not to read as heavy post-processing. */
function Vignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 45%, rgba(35,28,16,0.16) 100%), ' +
          'linear-gradient(to bottom, rgba(70,90,110,0.05), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(40,28,14,0.08))',
      }}
    />
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

/** Soft radial-gradient sprite texture, generated once at runtime (no network asset) — used as a cheap bloom-like glow behind tactical accents. */
let glowTextureCache: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (glowTextureCache) return glowTextureCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  glowTextureCache = texture;
  return texture;
}

function GlowSprite({
  position,
  color,
  scale = 0.9,
  opacity = 0.55,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  opacity?: number;
}) {
  const texture = useMemo(() => getGlowTexture(), []);
  return (
    <sprite position={position} scale={[scale, scale, scale]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/* ---------------- sculpted terrain ---------------- */

const TERRAIN_W = 9.2;
const TERRAIN_D = 8.4;
const TERRAIN_SEG_X = 56;
const TERRAIN_SEG_Z = 50;
const BLEND_EPSILON = 0.0004;
const BLEND_LAMBDA = 1.7;

const GROUND_LOW = new THREE.Color(C.groundLow);
const GROUND_DEEP = new THREE.Color(C.groundDeep);
const MTN_LIGHT = new THREE.Color(C.mountainLight);
const MTN_DARK = new THREE.Color(C.mountainDark);
const ROCK = new THREE.Color(C.rock);
const PEAK_HIGHLIGHT = new THREE.Color(C.peakHighlight);
const CREASE = new THREE.Color(C.crease);
const RIVER_TINT = new THREE.Color(C.river);

function smoothstep01(x: number, edge0: number, edge1: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Finite-difference step for estimating local slope from the height field —
// steeper slopes read as exposed rock/shadowed creases, giving the terrain
// believable land-shaping cues beyond flat height bands.
const SLOPE_EPS = 0.06;

function useTerrainGeometry() {
  return useMemo(() => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, TERRAIN_SEG_X, TERRAIN_SEG_Z);
    geometry.rotateX(-Math.PI / 2);
    const count = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return geometry;
  }, []);
}

function paintTerrain(geometry: THREE.BufferGeometry, blends: FeatureBlends) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const color = geometry.attributes.color as THREE.BufferAttribute;
  const tone = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const sample = sampleOnboardingField(x, z, blends);
    position.setY(i, sample.height);

    // Local slope via central difference — steeper ground reads as
    // exposed rock/shadow crease, gentler ground stays vegetated.
    const hx = sampleOnboardingField(x + SLOPE_EPS, z, blends).height;
    const hz = sampleOnboardingField(x, z + SLOPE_EPS, blends).height;
    const slope = Math.min(1, ((Math.abs(hx - sample.height) + Math.abs(hz - sample.height)) / SLOPE_EPS) * 0.4);

    tone.copy(GROUND_LOW);
    tone.lerp(GROUND_DEEP, smoothstep01(sample.shade, 0.02, 0.16) * 0.5);
    tone.lerp(MTN_LIGHT, smoothstep01(sample.shade, 0.09, 0.3));
    tone.lerp(MTN_DARK, smoothstep01(sample.shade, 0.3, 0.62));
    tone.lerp(ROCK, smoothstep01(sample.shade, 0.7, 0.92) * 0.8 + slope * 0.2);
    tone.lerp(PEAK_HIGHLIGHT, smoothstep01(sample.shade, 0.93, 1.0) * 0.8);
    tone.lerp(RIVER_TINT, sample.river * 0.6);
    tone.lerp(CREASE, sample.contour * 0.26 + slope * 0.13);

    // Tiny deterministic grain so flat shelves don't read as a pasted-on
    // flat colour patch.
    const grain = Math.sin(x * 97.3) * Math.sin(z * 61.7) * 0.014;
    tone.offsetHSL(0, 0, grain - slope * 0.03);

    color.setXYZ(i, tone.r, tone.g, tone.b);
  }

  position.needsUpdate = true;
  color.needsUpdate = true;
  geometry.computeVertexNormals();
}

function TerrainSurface({ feature }: { feature: Feature }) {
  const geometry = useTerrainGeometry();
  const blendsRef = useRef<FeatureBlends>({ mountain: 0, river: 0, narrow: 0 });

  useEffect(() => {
    paintTerrain(geometry, blendsRef.current);
    // Geometry identity is stable (useMemo, no deps) — this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  useFrame((_, delta) => {
    const targetMountain = feature === 'mountain' || feature === 'river' || feature === 'narrow' ? 1 : 0;
    const targetRiver = feature === 'river' || feature === 'narrow' ? 1 : 0;
    const targetNarrow = feature === 'narrow' ? 1 : 0;

    const b = blendsRef.current;
    const next: FeatureBlends = {
      mountain: THREE.MathUtils.damp(b.mountain, targetMountain, BLEND_LAMBDA, delta),
      river: THREE.MathUtils.damp(b.river, targetRiver, BLEND_LAMBDA, delta),
      narrow: THREE.MathUtils.damp(b.narrow, targetNarrow, BLEND_LAMBDA, delta),
    };

    const changed =
      Math.abs(next.mountain - b.mountain) > BLEND_EPSILON ||
      Math.abs(next.river - b.river) > BLEND_EPSILON ||
      Math.abs(next.narrow - b.narrow) > BLEND_EPSILON;

    blendsRef.current = next;
    if (changed) paintTerrain(geometry, next);
  });

  return (
    <group>
      {/* Rim — the "controlled terrain table" the sculpted surface sits inside.
          Sunk well below the deepest river trench so the water plane never
          ends up buried inside this solid box. */}
      <mesh receiveShadow position={[0, -0.32, 0]}>
        <boxGeometry args={[10, 0.26, 9]} />
        <meshStandardMaterial color={C.rim} roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={geometry} receiveShadow castShadow position={[0, 0.002, 0]}>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0} />
      </mesh>
    </group>
  );
}

/* ---------------- river ---------------- */

function RiverWater({ show }: { show: boolean }) {
  // Narrower than the carved trench (which spans the full sloped bank
  // width) so the sculpted terrain banks stay visible around the water.
  return (
    <AnimatedFeature show={show}>
      <mesh position={[0, -0.075, RIVER_Z]} receiveShadow>
        <boxGeometry args={[9.4, 0.045, 1.85]} />
        <meshStandardMaterial
          color={C.riverDeep}
          roughness={0.15}
          metalness={0.15}
          emissive={C.river}
          emissiveIntensity={0.1}
        />
      </mesh>
    </AnimatedFeature>
  );
}

function Bridge({ show, showLabel }: { show: boolean; showLabel: boolean }) {
  // Architectural bridge — gray stone deck (NOT sand-coloured), four
  // pylons piercing the water, low guard rails, and a single orange
  // centre stripe that doubles as the tactical route marker.
  return (
    <AnimatedFeature show={show}>
      <group position={[0, 0, RIVER_Z]}>
        {/* Stone deck. */}
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.18, 2.5]} />
          <meshStandardMaterial color={C.bridgeDeck} roughness={0.75} />
        </mesh>
        {/* Low guard rails along both edges. */}
        {[-0.78, 0.78].map((rx) => (
          <mesh key={rx} position={[rx, 0.33, 0]} castShadow>
            <boxGeometry args={[0.06, 0.12, 2.5]} />
            <meshStandardMaterial color={C.bridgePylon} roughness={0.8} />
          </mesh>
        ))}
        {/* Centre route stripe — the tactical accent, lifted with a soft
            glow so it reads as an active waypoint marker, not paint. */}
        <mesh position={[0, 0.275, 0]}>
          <boxGeometry args={[0.22, 0.02, 2.45]} />
          <meshStandardMaterial
            color={C.bridgeAccent}
            emissive={C.bridgeAccent}
            emissiveIntensity={0.7}
            roughness={0.4}
          />
        </mesh>
        <GlowSprite position={[0, 0.3, 0.9]} color={C.bridgeAccent} scale={0.6} opacity={0.18} />
        <GlowSprite position={[0, 0.3, -0.9]} color={C.bridgeAccent} scale={0.6} opacity={0.18} />
        {/* Pylons piercing into the river — 4 corners. */}
        {[
          [-0.7, 1.05],
          [0.7, 1.05],
          [-0.7, -1.05],
          [0.7, -1.05],
        ].map(([px, pz], i) => (
          <mesh key={i} castShadow position={[px, -0.12, pz]}>
            <boxGeometry args={[0.18, 0.65, 0.18]} />
            <meshStandardMaterial color={C.bridgePylon} roughness={0.78} />
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

/* ---------------- chokepoint ---------------- */

function Chokepoint({ show }: { show: boolean }) {
  // No text label here (unlike the bridge/forces): at this POV's very close,
  // wide-FOV angle a screen-space Html label consistently projects off the
  // edge of the frame and clips against the card's overflow-hidden edge.
  // The glowing double-ring plus the terrain walls physically closing in
  // around it already read as "chokepoint" without needing text.
  const ringRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.14;
      ringRef.current.scale.set(pulse, pulse, 1);
      const m = ringRef.current.material as THREE.MeshStandardMaterial;
      m.opacity = 0.65 + Math.sin(t * 2.4) * 0.2;
    }
    if (outerRef.current) {
      const pulse2 = 1 + Math.sin(t * 2.4 + Math.PI * 0.5) * 0.1;
      outerRef.current.scale.set(pulse2, pulse2, 1);
      const m2 = outerRef.current.material as THREE.MeshStandardMaterial;
      m2.opacity = 0.35 + Math.sin(t * 2.4 + Math.PI * 0.5) * 0.15;
    }
  });

  return (
    <AnimatedFeature show={show}>
      <group position={[0, 0, -2.2]}>
        <GlowSprite position={[0, 0.06, 0]} color={C.chokepoint} scale={1.1} opacity={0.22} />
        {/* Thin outer ring — game-HUD "target lock" read. */}
        <mesh ref={outerRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.02, 12, 48]} />
          <meshStandardMaterial
            color={C.chokepoint}
            emissive={C.chokepoint}
            emissiveIntensity={0.7}
            transparent
            opacity={0.4}
          />
        </mesh>
        {/* Inner solid ring — the primary accent. */}
        <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.065, 16, 48]} />
          <meshStandardMaterial
            color={C.chokepoint}
            emissive={C.chokepoint}
            emissiveIntensity={0.9}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
    </AnimatedFeature>
  );
}

/* ---------------- steady-state blends (for embedding props/paths) ---------------- */

const BLENDS_MOUNTAIN: FeatureBlends = { mountain: 1, river: 0, narrow: 0 };
const BLENDS_NARROW: FeatureBlends = { mountain: 1, river: 1, narrow: 1 };

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
      <GlowSprite position={[0, 0.05, 0]} color={C.blue} scale={0.9} opacity={0.18} />
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
      {/* Conditionally mounted (not just scaled/hidden via the group) —
          an Html label left mounted inside a scaled-to-0 group can still
          render at a stale screen position once the camera moves far
          enough for the projection to land back inside the frame. */}
      {!hidden && (
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
      )}
    </group>
  );
}

/**
 * Small stylised soldier — tapered torso, shoulders (for a human
 * silhouette width, not a plain pin), a rounded head and a darker domed
 * helmet for definition. Deliberately abstract/low-poly (no gear, no
 * weapon) — just enough shape language to read as "a person," not a
 * cone or chess pawn.
 */
function Soldier({
  x,
  z,
  rotationY = 0,
  scale = 1,
  color = C.enemy,
  helmetColor = C.enemyCommand,
}: {
  x: number;
  z: number;
  rotationY?: number;
  scale?: number;
  color?: string;
  helmetColor?: string;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Legs/torso — tapers slightly toward the shoulders. */}
      <mesh castShadow position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.075, 0.1, 0.26, 10]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Shoulders — gives the torso human width instead of reading as a
          plain pillar. */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[0.21, 0.06, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Head. */}
      <mesh castShadow position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.075, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Domed helmet, in the darker shade, so the head reads distinctly
          at a glance instead of blending into the body silhouette. */}
      <mesh castShadow position={[0, 0.385, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.088, 12, 8]} />
        <meshStandardMaterial color={helmetColor} roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Enemy force — a wedge of seven small red soldiers plus a central
 * "command" figure, sitting on a translucent red ground footprint with a
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
      {/* Scorched/disturbed-ground decal — larger and darker than the
          footprint, grounds the formation and reads as "occupied,
          fought-over terrain" rather than a floating marker. */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 36]} />
        <meshStandardMaterial color={C.crease} roughness={0.95} transparent opacity={0.22} />
      </mesh>
      <GlowSprite position={[0, 0.08, -0.15]} color={C.enemy} scale={1.3} opacity={0.13} />
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

      {/* Wedge of small soldiers, each an individual humanoid figure.
          Slight deterministic yaw per unit so the formation reads as
          individually-facing soldiers, not a stamped row of identical
          toys. */}
      {units.map(([x, z], i) => (
        <Soldier key={i} x={x} z={z} rotationY={Math.sin(i * 12.9) * 0.35} />
      ))}

      {/* Central command soldier — bigger, darker uniform, sits a bit
          back of the wedge centre. Gives the formation a "leader" focal
          point and helps readability at distance. */}
      <Soldier x={0} z={-0.2} scale={1.35} color={C.enemyCommand} helmetColor={C.enemyDeep} />

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

const BLENDS_FLAT: FeatureBlends = { mountain: 0, river: 0, narrow: 0 };
const BLENDS_RIVER: FeatureBlends = { mountain: 1, river: 1, narrow: 0 };
const PATH_EMBED = 0.045;

/** Lifts each (x, z) waypoint onto the sculpted surface so the route tube
    hugs real terrain instead of floating at a constant height. */
function embed(points: [number, number][], blends: FeatureBlends): [number, number, number][] {
  return points.map(([x, z]) => {
    const h = sampleOnboardingField(x, z, blends).height;
    return [x, h + PATH_EMBED, z];
  });
}

function MovementPath({ feature }: { feature: Feature }) {
  const flat = useMemo(
    () =>
      buildCurve(
        embed(
          [
            [0, 3.6],
            [0, 0],
            [0, -3.4],
          ],
          BLENDS_FLAT,
        ),
      ),
    [],
  );
  const mountainW = useMemo(
    () =>
      buildCurve(
        embed(
          [
            [0, 3.6],
            [-1.7, 2.0],
            [-2.1, 0],
            [-1.0, -1.7],
            [0, -3.4],
          ],
          BLENDS_MOUNTAIN,
        ),
      ),
    [],
  );
  const mountainE = useMemo(
    () =>
      buildCurve(
        embed(
          [
            [0, 3.6],
            [1.7, 2.0],
            [2.1, 0],
            [1.0, -1.7],
            [0, -3.4],
          ],
          BLENDS_MOUNTAIN,
        ),
      ),
    [],
  );
  const river = useMemo(
    () =>
      buildCurve(
        embed(
          [
            [0, 3.6],
            [0, 2.6],
            [0, 1.9], // through bridge
            [-0.7, 0.4],
            [-1.0, -1.7],
            [0, -3.4],
          ],
          BLENDS_RIVER,
        ),
      ),
    [],
  );
  const narrow = useMemo(
    () =>
      buildCurve(
        embed(
          [
            [0, 3.6],
            [0, 1.9], // bridge
            [0.2, 0],
            [0, -2.2], // chokepoint
            [0, -3.4],
          ],
          BLENDS_NARROW,
        ),
      ),
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
      {/* Soft, wide, low-opacity glow underlay — reads as the route being
          painted/embedded into the ground rather than a floating pipe. */}
      <mesh>
        <tubeGeometry args={[curve, 64, 0.1, 6, false]} />
        <meshStandardMaterial
          color={C.pathArrow}
          emissive={C.pathArrow}
          emissiveIntensity={0.7}
          transparent
          opacity={0.09}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[curve, 80, 0.05, 8, false]} />
        <meshStandardMaterial
          color={C.pathArrow}
          emissive={C.pathArrow}
          emissiveIntensity={0.4}
          roughness={0.45}
        />
      </mesh>
      {/* Flattened 4-sided chevron/blade tip instead of a spike cone —
          reads like a game waypoint marker. */}
      <mesh position={tipPos} quaternion={tipQuat} scale={[1.3, 0.5, 1.3]} castShadow>
        <coneGeometry args={[0.19, 0.34, 4]} />
        <meshStandardMaterial
          color={C.pathArrow}
          emissive={C.pathArrow}
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );
}
