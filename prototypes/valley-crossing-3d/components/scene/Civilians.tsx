// Stylized low-poly civilians + simple village props that make the objective
// village feel inhabited. Pure scene dressing: always rendered (not gated by the
// unitMarkers layer). Abstract, non-violent, muted earthy colors. Clarity over
// detail; low segment counts and reused refs keep it cheap.
//
// Prop-free: positions come from the scenario CIVILIANS list + a small hand-tuned
// prop layout around the village center, all lifted onto the terrain.

import { Fragment, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { onTerrain } from "@/lib/terrain";
import { CIVILIANS } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import type { Vec3 } from "@/lib/types";

// --- Village center (matches the Village layout / objective element) ---
const VILLAGE_X = 58;
const VILLAGE_Z = 8;

// --- Muted, earthy civilian palette (DIFFERENT from the soldier figures: no
//     helmet / rifle / backpack, just clothed body + bare rounded head). ---
const SKIN = "#a8967c";
const HAIR = "#3b3128";
const TORSO_COLORS = ["#8a7f6a", "#6f6457", "#9a9488", "#7d7468", "#8f8470"] as const;
const LEG_COLORS = ["#5a5346", "#655c4e", "#4f4940", "#5e564a", "#6a6052"] as const;

// --- Muted prop palette (kept local; physically plausible, non-emissive). ---
const WOOD = "#6a5638";
const WOOD_DARK = "#4f4029";
const BARREL = "#5d4d35";
const BARREL_RIM = "#7a6a4c";
const CLOTH = "#9a8f74";
const CLOTH_ALT = "#7e8a78";
const CLOTH_ALT2 = "#a89a86";
const POST = "#4a3a29";

// Deterministic pseudo-random in [0,1) (same hash style the rest of the scene uses).
function rand(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// === Civilian ==============================================================
// A reusable abstract person (~3.0-3.2 units tall), origin at the feet, FACING
// +Z so a parent can rotate it. Low-poly: 2 legs + torso + rounded head + hair.
interface CivilianProps {
  torso: string;
  legs: string;
}

function Civilian({ torso, legs }: CivilianProps) {
  return (
    <group>
      {/* Legs */}
      <mesh position={[-0.2, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.2, 7]} />
        <meshStandardMaterial color={legs} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.2, 7]} />
        <meshStandardMaterial color={legs} roughness={0.9} />
      </mesh>

      {/* Torso (slightly tapered tunic) */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <capsuleGeometry args={[0.4, 0.95, 4, 8]} />
        <meshStandardMaterial color={torso} roughness={0.85} />
      </mesh>

      {/* Arms hanging at the sides */}
      <mesh position={[-0.46, 1.85, 0]} rotation={[0, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.05, 7]} />
        <meshStandardMaterial color={torso} roughness={0.85} />
      </mesh>
      <mesh position={[0.46, 1.85, 0]} rotation={[0, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.05, 7]} />
        <meshStandardMaterial color={torso} roughness={0.85} />
      </mesh>

      {/* Head (rounded, bare — no helmet) */}
      <mesh position={[0, 2.62, 0]} castShadow>
        <sphereGeometry args={[0.27, 12, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* Hair cap */}
      <mesh position={[0, 2.74, -0.02]} scale={[1, 0.75, 1]} castShadow>
        <sphereGeometry args={[0.285, 12, 10]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} />
      </mesh>
    </group>
  );
}

// === Layout types ==========================================================
interface IdleCivilian {
  key: number;
  base: Vec3;
  facing: number;
  torso: string;
  legs: string;
}

interface Crate {
  key: string;
  position: Vec3;
  size: number;
  rotation: number;
}

interface Barrel {
  key: string;
  position: Vec3;
}

interface CartParts {
  position: Vec3;
  rotation: number;
}

interface LaundryProps {
  position: Vec3;
  rotation: number;
  cloths: { dx: number; color: string; w: number; h: number }[];
}

interface WalkPath {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ay: number;
  by: number;
  facingFwd: number;
  facingBack: number;
}

// === Civilians root ========================================================
export function Civilians() {
  const reveals = useSim((s) => s.reveals);
  const missionStarted = useSim((s) => s.missionStarted);
  const stage = useSim((s) => s.stage);

  const showSceneLabels = missionStarted && stage !== "debrief";
  const showLabel = reveals.civilianHint && showSceneLabels;

  // Idle civilians at the scenario positions, each lifted onto the terrain with a
  // varied tunic color and a stable initial facing toward the village center.
  const idle = useMemo<IdleCivilian[]>(
    () =>
      CIVILIANS.map((pos, i) => {
        const base = onTerrain(pos[0], pos[1]);
        const facing = Math.atan2(VILLAGE_X - pos[0], VILLAGE_Z - pos[1]);
        return {
          key: i,
          base,
          facing,
          torso: TORSO_COLORS[i % TORSO_COLORS.length],
          legs: LEG_COLORS[i % LEG_COLORS.length],
        };
      }),
    []
  );

  // Centroid of the civilian cluster (for the single optional label).
  const labelPos = useMemo<Vec3>(() => {
    let sx = 0;
    let sz = 0;
    for (const [x, z] of CIVILIANS) {
      sx += x;
      sz += z;
    }
    const n = CIVILIANS.length || 1;
    const cx = sx / n;
    const cz = sz / n;
    return onTerrain(cx, cz);
  }, []);

  // One civilian slowly walks back and forth on a short segment near the houses.
  const walk = useMemo<WalkPath>(() => {
    const ax = VILLAGE_X - 4;
    const az = VILLAGE_Z + 4;
    const bx = VILLAGE_X + 3;
    const bz = VILLAGE_Z + 5;
    const ay = onTerrain(ax, az)[1];
    const by = onTerrain(bx, bz)[1];
    // Headings for the two travel directions (figure faces +Z).
    const facingFwd = Math.atan2(bx - ax, bz - az);
    const facingBack = Math.atan2(ax - bx, az - bz);
    return { ax, az, bx, bz, ay, by, facingFwd, facingBack };
  }, []);

  // --- Village props (muted, simple, performance-friendly) ----------------

  // A couple of small stacked wooden crate piles near the buildings.
  const crates = useMemo<Crate[]>(() => {
    const piles: { dx: number; dz: number }[] = [
      { dx: -3.5, dz: -1.0 },
      { dx: 4.5, dz: 3.5 },
    ];
    const out: Crate[] = [];
    piles.forEach((p, pi) => {
      const x = VILLAGE_X + p.dx;
      const z = VILLAGE_Z + p.dz;
      const baseY = onTerrain(x, z)[1];
      // Bottom crate.
      const s0 = 0.95 + rand(pi * 2.3) * 0.2;
      out.push({
        key: `crate-${pi}-0`,
        position: [x, baseY + s0 / 2, z],
        size: s0,
        rotation: (rand(pi * 3.1) - 0.5) * 0.5,
      });
      // Top crate (slightly smaller, offset).
      const s1 = s0 * 0.78;
      out.push({
        key: `crate-${pi}-1`,
        position: [x + 0.18, baseY + s0 + s1 / 2, z - 0.1],
        size: s1,
        rotation: (rand(pi * 5.7) - 0.5) * 0.7,
      });
    });
    return out;
  }, []);

  // 2-3 short barrels grouped near a building corner.
  const barrels = useMemo<Barrel[]>(() => {
    const spots: { dx: number; dz: number }[] = [
      { dx: -2.4, dz: -1.8 },
      { dx: -1.6, dz: -2.3 },
      { dx: -2.0, dz: -2.9 },
    ];
    return spots.map((s, i) => {
      const x = VILLAGE_X + s.dx;
      const z = VILLAGE_Z + s.dz;
      const baseY = onTerrain(x, z)[1];
      return { key: `barrel-${i}`, position: [x, baseY + 0.55, z] };
    });
  }, []);

  // A small market cart: box top on two wheels + posts + a cloth-like roof.
  const cart = useMemo<CartParts>(() => {
    const x = VILLAGE_X + 2.5;
    const z = VILLAGE_Z - 3.5;
    const baseY = onTerrain(x, z)[1];
    return { position: [x, baseY, z], rotation: 0.3 };
  }, []);

  // A laundry line strung between two posts with a few hanging cloths.
  const laundry = useMemo<LaundryProps>(() => {
    const x = VILLAGE_X - 5.0;
    const z = VILLAGE_Z + 3.0;
    const baseY = onTerrain(x, z)[1];
    return {
      position: [x, baseY, z],
      rotation: 0.6,
      cloths: [
        { dx: -0.9, color: CLOTH, w: 0.7, h: 0.9 },
        { dx: 0.1, color: CLOTH_ALT, w: 0.6, h: 1.05 },
        { dx: 1.0, color: CLOTH_ALT2, w: 0.65, h: 0.8 },
      ],
    };
  }, []);

  // --- Animation refs (reused; no per-frame allocation) -------------------
  const idleRefs = useRef<(THREE.Group | null)[]>([]);
  const walkerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Idle civilians: gentle vertical bob + slow sway, phase-offset per index.
    for (let i = 0; i < idle.length; i++) {
      const g = idleRefs.current[i];
      if (!g) continue;
      const c = idle[i];
      g.position.y = c.base[1] + Math.sin(t * 1.1 + i * 1.7) * 0.04;
      g.rotation.y = c.facing + Math.sin(t * 0.4 + i) * 0.06;
    }

    // Walking civilian: slow ping-pong along the segment using a sin sweep.
    const w = walkerRef.current;
    if (w) {
      // p sweeps 0..1..0 smoothly; phase01 maps sin (-1..1) to 0..1.
      const phase01 = (Math.sin(t * 0.32) + 1) * 0.5;
      const x = walk.ax + (walk.bx - walk.ax) * phase01;
      const z = walk.az + (walk.bz - walk.az) * phase01;
      const y = walk.ay + (walk.by - walk.ay) * phase01;
      // Slight stride bob.
      w.position.set(x, y + Math.abs(Math.sin(t * 2.2)) * 0.05, z);
      // Face the direction of travel (derivative of sin sweep = cos).
      w.rotation.y = Math.cos(t * 0.32) >= 0 ? walk.facingFwd : walk.facingBack;
    }
  });

  return (
    <Fragment>
      {/* Idle civilians */}
      {idle.map((c, i) => (
        <group
          key={c.key}
          ref={(el) => {
            idleRefs.current[i] = el;
          }}
          position={[c.base[0], c.base[1], c.base[2]]}
          rotation={[0, c.facing, 0]}
        >
          <Civilian torso={c.torso} legs={c.legs} />
        </group>
      ))}

      {/* Walking civilian */}
      <group
        ref={walkerRef}
        position={[walk.ax, walk.ay, walk.az]}
        rotation={[0, walk.facingFwd, 0]}
      >
        <Civilian torso={TORSO_COLORS[2]} legs={LEG_COLORS[1]} />
      </group>

      {/* Stacked wooden crates */}
      {crates.map((c) => (
        <mesh
          key={c.key}
          position={c.position}
          rotation={[0, c.rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[c.size, c.size, c.size]} />
          <meshStandardMaterial
            color={c.size > 0.85 ? WOOD : WOOD_DARK}
            roughness={0.92}
          />
        </mesh>
      ))}

      {/* Barrels */}
      {barrels.map((b) => (
        <group key={b.key} position={b.position}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.1, 12]} />
            <meshStandardMaterial color={BARREL} roughness={0.9} />
          </mesh>
          {/* Top + bottom rims */}
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.1, 12]} />
            <meshStandardMaterial color={BARREL_RIM} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.42, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.1, 12]} />
            <meshStandardMaterial color={BARREL_RIM} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Market cart / stand */}
      <group position={cart.position} rotation={[0, cart.rotation, 0]}>
        {/* Wheels */}
        <mesh
          position={[-0.95, 0.5, 0.6]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.5, 0.5, 0.18, 12]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        <mesh
          position={[-0.95, 0.5, -0.6]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.5, 0.5, 0.18, 12]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        {/* Cart bed (box top) */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.55, 1.7]} />
          <meshStandardMaterial color={WOOD} roughness={0.9} />
        </mesh>
        {/* Support posts */}
        <mesh position={[1.0, 1.85, 0.7]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        <mesh position={[1.0, 1.85, -0.7]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        <mesh position={[-1.0, 1.85, 0.7]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        <mesh position={[-1.0, 1.85, -0.7]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        {/* Cloth roof (flat box, slightly tilted) */}
        <mesh position={[0, 2.6, 0]} rotation={[0.06, 0, 0]} castShadow>
          <boxGeometry args={[2.7, 0.08, 2.0]} />
          <meshStandardMaterial color={CLOTH} roughness={0.95} />
        </mesh>
      </group>

      {/* Laundry line */}
      <group position={laundry.position} rotation={[0, laundry.rotation, 0]}>
        {/* Two posts */}
        <mesh position={[-1.7, 1.1, 0]} castShadow>
          <boxGeometry args={[0.12, 2.2, 0.12]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        <mesh position={[1.7, 1.1, 0]} castShadow>
          <boxGeometry args={[0.12, 2.2, 0.12]} />
          <meshStandardMaterial color={POST} roughness={0.9} />
        </mesh>
        {/* The line itself (thin long box) */}
        <mesh position={[0, 2.05, 0]}>
          <boxGeometry args={[3.4, 0.03, 0.03]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        {/* Hanging cloths */}
        {laundry.cloths.map((cl, ci) => (
          <mesh
            key={`cloth-${ci}`}
            position={[cl.dx, 2.0 - cl.h / 2, 0]}
            castShadow
          >
            <boxGeometry args={[cl.w, cl.h, 0.04]} />
            <meshStandardMaterial color={cl.color} roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Optional cluster label (only when scouted + scene labels allowed) */}
      {showLabel && (
        <group position={labelPos}>
          <Html
            position={[0, 4.5, 0]}
            center
            distanceFactor={150}
            zIndexRange={[8, 0]}
          >
            <div className="unit-label">
              <span className="tick" />
              אזרחים
            </div>
          </Html>
        </group>
      )}
    </Fragment>
  );
}
