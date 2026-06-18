'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

/**
 * Real 3D version of the "mountain as a layer cake" diagram.
 *
 * Each contour interval is an actual stacked cylinder (a terrace), so the
 * relationship between the side-on 3D solid and the top-down contour map is
 * literal rather than illustrated: looking straight down the +Y axis you'd
 * see exactly the nested rings drawn in `ContoursAsMap`.
 *
 * Index 0 = lowest band (10 m, widest, bottom); last index = peak (50 m,
 * narrowest, top). Colours run sand → green as we climb, matching the map's
 * elevation ramp. Hovering a terrace lifts `activeRing` so the corresponding
 * ring highlights in the top-down view (and vice-versa).
 *
 * Rendered client-only via `next/dynamic` (Canvas can't SSR).
 */

const ACCENT = '#EB9E48';

// Elevation ramp — low sand to high green, mirrors the 2D map bands.
const BANDS = [
  { h: 10, color: '#d8bd83' },
  { h: 20, color: '#c2a26b' },
  { h: 30, color: '#8a9a55' },
  { h: 40, color: '#6f8050' },
  { h: 50, color: '#5a6b4a' },
];

const THICK = 0.44;                       // terrace height (one contour interval)
const radiusAt = (i: number) => 2.15 - i * 0.38;  // bottom widest → peak narrowest
const yAt = (i: number) => i * THICK + THICK / 2; // stacked on top of each other

function Terrace({
  i,
  active,
  onHover,
  onLeave,
}: {
  i: number;
  active: boolean;
  onHover: (n: number) => void;
  onLeave: () => void;
}) {
  const r = radiusAt(i);
  const y = yAt(i);
  const band = BANDS[i];

  return (
    <group>
      <mesh
        position={[0, y, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(i);
        }}
        onPointerOut={() => onLeave()}
      >
        <cylinderGeometry args={[r, r, THICK, 64]} />
        <meshStandardMaterial
          color={active ? ACCENT : band.color}
          emissive={active ? ACCENT : '#000000'}
          emissiveIntensity={active ? 0.45 : 0}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Contour edge on the top rim — this is the "line" you'd see on a map. */}
      <mesh position={[0, y + THICK / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.035, r, 64]} />
        <meshBasicMaterial color={active ? ACCENT : '#2f3322'} transparent opacity={active ? 0.95 : 0.5} />
      </mesh>

      {/* Height label floating at the terrace edge. */}
      <Html position={[r + 0.28, y, 0]} center distanceFactor={7} className="pointer-events-none select-none">
        <span
          className="px-1.5 py-0.5 text-xs font-display font-bold tabular-nums rounded-md whitespace-nowrap shadow-sm"
          style={{
            color: active ? ACCENT : '#4a4a3a',
            background: 'rgba(255,255,255,0.92)',
          }}
        >
          {band.h} מ׳
        </span>
      </Html>
    </group>
  );
}

/** Vertical height axis with an arrowhead + label. */
function HeightAxis() {
  const top = yAt(BANDS.length - 1) + THICK / 2 + 0.4;
  return (
    <group position={[-2.7, 0, 0]}>
      <mesh position={[0, top / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, top, 8]} />
        <meshBasicMaterial color="#9a9486" />
      </mesh>
      <mesh position={[0, top, 0]}>
        <coneGeometry args={[0.07, 0.18, 12]} />
        <meshBasicMaterial color="#9a9486" />
      </mesh>
      <Html position={[0, top + 0.25, 0]} center distanceFactor={7} className="pointer-events-none select-none">
        <span
          className="text-xs font-display font-bold whitespace-nowrap"
          style={{ color: '#6a6456' }}
        >
          גובה ↑
        </span>
      </Html>
    </group>
  );
}

export default function ContourCake3D({
  activeRing,
  setActiveRing,
}: {
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
}) {
  return (
    <div className="aspect-video sm:aspect-square max-h-[300px] w-full mx-auto cursor-grab active:cursor-grabbing">
      <Canvas
        shadows
        camera={{ position: [3.8, 3.4, 4.8], fov: 42, near: 0.1, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <hemisphereLight color="#ffe9c8" groundColor="#a87f4e" intensity={0.4} />
        <directionalLight
          position={[4, 9, 5]}
          intensity={1.15}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0004}
        />

        {/* Centre the stack vertically around the origin. */}
        <group position={[0, -(yAt(BANDS.length - 1) + THICK / 2) / 2, 0]}>
          {BANDS.map((_, i) => (
            <Terrace
              key={i}
              i={i}
              active={activeRing === i}
              onHover={setActiveRing}
              onLeave={() => setActiveRing(null)}
            />
          ))}

          <HeightAxis />

          {/* Soft contact shadow under the base. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <circleGeometry args={[3, 64]} />
            <shadowMaterial opacity={0.16} />
          </mesh>
        </group>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={4.5}
          maxDistance={9}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
