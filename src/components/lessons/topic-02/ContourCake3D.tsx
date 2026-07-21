'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

/**
 * Real 3D version of the "mountain as a layer cake" diagram.
 *
 * Each contour interval is an actual stacked cylinder (a terrace), so the
 * relationship between the side-on 3D solid and the top-down contour map is
 * literal rather than illustrated: looking straight down the +Y axis you'd
 * see exactly the nested rings the caller passed in `rings`.
 *
 * `rings` is ordered outer(lowest)→inner(peak) — the same ordering/shape as
 * a top-down contour map (see LayeredCartographyStage's `ContourRing[]`).
 * Radius is derived from `rx` by a fixed scale, so a caller that swaps in a
 * different ring stack (gentle/steep/cliff) gets a 3D model whose footprint
 * and height genuinely match the 2D lines — not two coincidentally-similar
 * pictures. Terrace thickness is constant (one contour interval = one
 * terrace), so a taller stack (e.g. `steep`, 9 rings) renders as a taller,
 * narrower cake than a shorter one (e.g. `gentle`, 4 rings) — the same
 * causal link ("more/closer lines = steeper") the 2D map shows via ring
 * spacing, made spatial.
 *
 * Rendered client-only via `next/dynamic` (Canvas can't SSR).
 */

const ACCENT = '#EB9E48';

const RADIUS_SCALE = 2.15 / 40; // 3D units per terrain-domain rx unit
const TERRACE_THICK = 0.24; // 3D units per 10 m contour interval

export type Cake3DRing = { h: number; rx: number; color: string };

/**
 * Which terraces get a floating height label. Naive "every Nth index"
 * thinning still lets two labels collide when the last couple of rings
 * happen to sit at nearly the same radius (e.g. `cliff`'s near-vertical
 * top) — close in index AND close in space. So: thin by index gap first,
 * then drop any trailing label that ended up too close (in radius) to the
 * peak label, which always wins.
 */
function labeledIndices(rings: Cake3DRing[]): boolean[] {
  const n = rings.length;
  const labeled = new Array(n).fill(false);
  if (n === 0) return labeled;
  labeled[0] = true;
  const minIndexGap = Math.max(1, Math.ceil(n / 5));
  let lastShown = 0;
  for (let i = 1; i < n - 1; i++) {
    if (i - lastShown >= minIndexGap) {
      labeled[i] = true;
      lastShown = i;
    }
  }
  if (n > 1) {
    const peak = rings[n - 1];
    for (let i = n - 2; i >= 0 && labeled[i]; i--) {
      if (Math.abs(rings[i].rx - peak.rx) < 3) labeled[i] = false;
      else break;
    }
    labeled[n - 1] = true;
  }
  return labeled;
}

function Terrace({
  ring,
  i,
  active,
  showLabel,
  onHover,
  onLeave,
}: {
  ring: Cake3DRing;
  i: number;
  active: boolean;
  showLabel: boolean;
  onHover: (n: number) => void;
  onLeave: () => void;
}) {
  const r = ring.rx * RADIUS_SCALE;
  const y = i * TERRACE_THICK + TERRACE_THICK / 2;

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
        <cylinderGeometry args={[r, r, TERRACE_THICK, 64]} />
        <meshStandardMaterial
          color={active ? ACCENT : ring.color}
          emissive={active ? ACCENT : '#000000'}
          emissiveIntensity={active ? 0.45 : 0}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Contour edge on the top rim — this is the "line" you'd see on a map. */}
      <mesh position={[0, y + TERRACE_THICK / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(r - 0.035, 0.001), r, 64]} />
        <meshBasicMaterial color={active ? ACCENT : '#2f3322'} transparent opacity={active ? 0.95 : 0.5} />
      </mesh>

      {/* Height label floating at the terrace edge — thinned on tall stacks. */}
      {(showLabel || active) && (
        <Html position={[r + 0.28, y, 0]} center distanceFactor={7} className="pointer-events-none select-none">
          <span
            className="px-1.5 py-0.5 text-xs font-display font-bold tabular-nums rounded-md whitespace-nowrap shadow-sm"
            style={{
              color: active ? ACCENT : '#4a4a3a',
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            {ring.h} מ׳
          </span>
        </Html>
      )}
    </group>
  );
}

/** Vertical height axis with an arrowhead + label. */
function HeightAxis({ top }: { top: number }) {
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
        <span className="text-xs font-display font-bold whitespace-nowrap" style={{ color: '#6a6456' }}>
          גובה ↑
        </span>
      </Html>
    </group>
  );
}

export default function ContourCake3D({
  rings,
  activeRing,
  setActiveRing,
  autoRotate = true,
}: {
  rings: Cake3DRing[];
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
  autoRotate?: boolean;
}) {
  const stackTop = rings.length * TERRACE_THICK;
  const axisTop = stackTop + 0.4;
  const labeled = labeledIndices(rings);

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
        <group position={[0, -stackTop / 2, 0]}>
          {rings.map((ring, i) => (
            <Terrace
              key={i}
              ring={ring}
              i={i}
              active={activeRing === i}
              showLabel={labeled[i]}
              onHover={setActiveRing}
              onLeave={() => setActiveRing(null)}
            />
          ))}

          <HeightAxis top={axisTop} />

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
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
