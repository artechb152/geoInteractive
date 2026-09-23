// Stylized low-poly infantry figures (friendly + enemy) that make the tactical
// scenario easier to read at a glance. Clarity over detail: abstract training
// figures, subtle idle/scan/flow motion, one label per squad. No combat imagery.
//
// Prop-free: everything is derived from the store, scenario and terrain.
// Gated by the unitMarkers layer through getVisibility + the stage rules below.

import { Fragment, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { onTerrain, sampleSurfacePath } from "@/lib/terrain";
import {
  CHOKE_CLUSTER,
  ENEMY_SQUAD,
  FRIENDLY_SQUAD,
  ROUTE_MAP,
  getVisibility,
} from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { TACTICAL } from "@/lib/style";
import type { RouteId, Vec2, Vec3 } from "@/lib/types";

// --- Shared palette for the figure (kept local; not tactical-overlay colors) ---
const FATIGUE = "#6b7155";
const SKIN = "#9a8e7a";
const HELMET = "#2f3528";
const RIFLE = "#23251f";
const PACK = "#4f5340";

const FLOW_COUNT = 4;

// Average of a list of planar squad positions.
function centroid(points: Vec2[]): Vec2 {
  let sx = 0;
  let sz = 0;
  for (const [x, z] of points) {
    sx += x;
    sz += z;
  }
  const n = points.length || 1;
  return [sx / n, sz / n];
}

// === Soldier ===============================================================
// A reusable abstract figure (~3.4 units tall), origin at the feet, FACING +Z
// so a parent can rotate it to face a target. Low-poly, meshStandardMaterial.
interface SoldierProps {
  accent: string;
  ghost?: boolean;
  crouch?: boolean;
}

function Soldier({ accent, ghost = false, crouch = false }: SoldierProps) {
  const cast = !ghost;
  const opacity = 0.55;
  const emissiveIntensity = ghost ? 0.4 : 0;
  const emissive = ghost ? accent : "#000000";

  // Stance offsets: when crouching, the legs bend (shorter, pushed forward) and
  // the whole upper body drops + leans forward so the figure reads as kneeling.
  const legH = crouch ? 0.85 : 1.3;
  const legY = legH / 2;
  const legZ = crouch ? 0.18 : 0;
  // How far the torso/head/arms/gear drop when crouching.
  const drop = crouch ? 0.85 : 0;
  // Forward lean of the upper body when crouching.
  const lean = crouch ? 0.22 : 0;

  return (
    <group>
      {/* Legs */}
      <mesh
        position={[-0.22, legY, legZ]}
        rotation={[crouch ? 0.45 : 0, 0, 0]}
        castShadow={cast}
      >
        <cylinderGeometry args={[0.18, 0.18, legH, 8]} />
        <meshStandardMaterial
          color={FATIGUE}
          roughness={0.85}
          transparent={ghost}
          opacity={ghost ? opacity : 1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <mesh
        position={[0.22, legY, legZ]}
        rotation={[crouch ? 0.45 : 0, 0, 0]}
        castShadow={cast}
      >
        <cylinderGeometry args={[0.18, 0.18, legH, 8]} />
        <meshStandardMaterial
          color={FATIGUE}
          roughness={0.85}
          transparent={ghost}
          opacity={ghost ? opacity : 1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Upper body (torso + gear + arms + head), shifted as a unit for stance. */}
      <group position={[0, -drop, 0]} rotation={[lean, 0, 0]}>
        {/* Torso */}
        <mesh position={[0, 2.0, 0]} castShadow={cast}>
          <capsuleGeometry args={[0.42, 1.0, 4, 8]} />
          <meshStandardMaterial
            color={FATIGUE}
            roughness={0.8}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* Accent vest band */}
        <mesh position={[0, 2.1, 0]} castShadow={cast}>
          <cylinderGeometry args={[0.5, 0.5, 0.5, 10]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.7}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={accent}
            emissiveIntensity={ghost ? 0.5 : 0.18}
          />
        </mesh>

        {/* Chest plate accent (front-facing flat box) */}
        <mesh position={[0, 2.18, 0.4]} castShadow={cast}>
          <boxGeometry args={[0.5, 0.55, 0.12]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.65}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={accent}
            emissiveIntensity={ghost ? 0.5 : 0.22}
          />
        </mesh>

        {/* Backpack (box on the back) */}
        <mesh position={[0, 2.05, -0.46]} castShadow={cast}>
          <boxGeometry args={[0.6, 0.85, 0.34]} />
          <meshStandardMaterial
            color={PACK}
            roughness={0.9}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        {/* Backpack accent trim */}
        <mesh position={[0, 1.75, -0.64]} castShadow={cast}>
          <boxGeometry args={[0.6, 0.12, 0.04]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.7}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={accent}
            emissiveIntensity={ghost ? 0.5 : 0.18}
          />
        </mesh>

        {/* Arms (angled slightly toward the front) */}
        <mesh
          position={[-0.5, 2.0, 0.12]}
          rotation={[0.18, 0, 0.12]}
          castShadow={cast}
        >
          <cylinderGeometry args={[0.13, 0.13, 1.1, 8]} />
          <meshStandardMaterial
            color={FATIGUE}
            roughness={0.85}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh
          position={[0.5, 2.0, 0.12]}
          rotation={[0.18, 0, -0.12]}
          castShadow={cast}
        >
          <cylinderGeometry args={[0.13, 0.13, 1.1, 8]} />
          <meshStandardMaterial
            color={FATIGUE}
            roughness={0.85}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* Head */}
        <mesh position={[0, 2.85, 0]} castShadow={cast}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial
            color={SKIN}
            roughness={0.8}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* Helmet (flattened sphere) */}
        <mesh position={[0, 3.02, 0]} scale={[1, 0.6, 1]} castShadow={cast}>
          <sphereGeometry args={[0.34, 12, 12]} />
          <meshStandardMaterial
            color={HELMET}
            roughness={0.85}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        {/* Helmet accent band */}
        <mesh position={[0, 3.0, 0]}>
          <cylinderGeometry args={[0.345, 0.345, 0.07, 12]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.7}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={accent}
            emissiveIntensity={ghost ? 0.5 : 0.18}
          />
        </mesh>

        {/* Rifle (abstract dark box, held in front, slightly tilted) */}
        <mesh
          position={[0.28, 1.9, 0.45]}
          rotation={[0.32, 0, 0]}
          castShadow={cast}
        >
          <boxGeometry args={[0.09, 0.09, 0.95]} />
          <meshStandardMaterial
            color={RIFLE}
            roughness={0.8}
            transparent={ghost}
            opacity={ghost ? opacity : 1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      </group>
    </group>
  );
}

// === Ground ring ===========================================================
// Soft pulsing ring seated at a squad centroid.
interface GroundRingProps {
  color: string;
}

function GroundRing({ color }: GroundRingProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    m.opacity = 0.18 + (Math.sin(state.clock.elapsedTime * 1.8) + 1) * 0.5 * 0.22;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
      <ringGeometry args={[2.4, 3.4, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// === Friendly / Choke squad ================================================
// Idle figures facing east toward the objective, with a subtle bob + sway.
interface StaticSquadProps {
  positions: Vec2[];
  label: string;
  className: string;
  showLabel: boolean;
}

function StaticSquad({ positions, label, className, showLabel }: StaticSquadProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const soldiers = useMemo(
    () =>
      positions.map((pos, i) => {
        const base = onTerrain(pos[0], pos[1]);
        // Face east toward an objective ~20 units ahead in +x.
        const tx = pos[0] + 20;
        const tz = pos[1];
        const facing = Math.atan2(tx - pos[0], tz - pos[1]);
        // Alternate stance so the squad reads naturally (not identical clones).
        const crouch = i % 2 === 1;
        return { base, facing, crouch, key: i };
      }),
    [positions]
  );

  const center = useMemo(() => centroid(positions), [positions]);
  const centerPos = useMemo<Vec3>(
    () => onTerrain(center[0], center[1]),
    [center]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < soldiers.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      const s = soldiers[i];
      g.position.y = s.base[1] + Math.sin(t * 1.5 + i) * 0.05;
      g.rotation.y = s.facing + Math.sin(t * 0.6 + i) * 0.03;
    }
  });

  return (
    <group>
      {soldiers.map((s, i) => (
        <group
          key={s.key}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={[s.base[0], s.base[1], s.base[2]]}
          rotation={[0, s.facing, 0]}
        >
          <Soldier accent={TACTICAL.friendly} crouch={s.crouch} />
        </group>
      ))}

      <group position={centerPos}>
        <GroundRing color={TACTICAL.friendly} />
        {showLabel && (
          <Html
            position={[0, 5, 0]}
            center
            distanceFactor={150}
            zIndexRange={[8, 0]}
          >
            <div className={"unit-label " + className}>
              <span className="tick" />
              {label}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// === Enemy squad ===========================================================
// Lookout figures facing the bridge, slowly scanning left/right.
interface EnemySquadProps {
  showLabel: boolean;
}

function EnemySquad({ showLabel }: EnemySquadProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const soldiers = useMemo(
    () =>
      ENEMY_SQUAD.map((pos, i) => {
        const base = onTerrain(pos[0], pos[1]);
        // Face the bridge at [12, 0].
        const facing = Math.atan2(12 - pos[0], 0 - pos[1]);
        // Alternate stance so the lookout team reads naturally.
        const crouch = i % 2 === 1;
        return { base, facing, crouch, key: i };
      }),
    []
  );

  const center = useMemo(() => centroid(ENEMY_SQUAD), []);
  const centerPos = useMemo<Vec3>(
    () => onTerrain(center[0], center[1]),
    [center]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < soldiers.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      g.rotation.y = soldiers[i].facing + Math.sin(t * 0.5 + i) * 0.22;
    }
  });

  return (
    <group>
      {soldiers.map((s, i) => (
        <group
          key={s.key}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={[s.base[0], s.base[1], s.base[2]]}
          rotation={[0, s.facing, 0]}
        >
          <Soldier accent={TACTICAL.enemy} crouch={s.crouch} />
        </group>
      ))}

      <group position={centerPos}>
        <GroundRing color={TACTICAL.enemy} />
        {showLabel && (
          <Html
            position={[0, 5, 0]}
            center
            distanceFactor={150}
            zIndexRange={[8, 0]}
          >
            <div className="unit-label enemy">
              <span className="tick" />
              כוח אויב · חוליית תצפית
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// === Flow squad ============================================================
// Ghost figures looping along the selected route to preview the maneuver.
interface FlowSquadProps {
  route: RouteId;
  showLabel: boolean;
}

function FlowSquad({ route, showLabel }: FlowSquadProps) {
  const soldierRefs = useRef<(THREE.Group | null)[]>([]);
  const labelRef = useRef<THREE.Group>(null);

  const pts = useMemo<Vec3[]>(
    () => sampleSurfacePath(ROUTE_MAP[route].waypoints, 3, 0),
    [route]
  );

  const indices = useMemo(
    () => Array.from({ length: FLOW_COUNT }, (_, i) => i),
    []
  );

  useFrame((state) => {
    const n = pts.length;
    if (n < 2) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < FLOW_COUNT; i++) {
      const g = soldierRefs.current[i];
      if (!g) continue;

      const p = (i / FLOW_COUNT + t * 0.05) % 1;
      const fIndex = p * (n - 1);
      const idx = Math.min(n - 2, Math.floor(fIndex));
      const frac = fIndex - idx;

      const cur = pts[idx];
      const next = pts[idx + 1];

      const x = cur[0] + (next[0] - cur[0]) * frac;
      const y = cur[1] + (next[1] - cur[1]) * frac;
      const z = cur[2] + (next[2] - cur[2]) * frac;

      g.position.set(x, y, z);
      // Figure faces +Z, so heading = atan2(dx, dz).
      g.rotation.y = Math.atan2(next[0] - cur[0], next[2] - cur[2]);

      // Attach the single label to the lead soldier.
      if (i === 0 && labelRef.current) {
        labelRef.current.position.set(x, y + 5, z);
      }
    }
  });

  return (
    <group>
      {indices.map((i) => (
        <group
          key={i}
          ref={(el) => {
            soldierRefs.current[i] = el;
          }}
        >
          <Soldier accent={TACTICAL.friendly} ghost />
        </group>
      ))}

      {showLabel && (
        <group ref={labelRef}>
          <Html center distanceFactor={150} zIndexRange={[8, 0]}>
            <div className="unit-label friendly">
              <span className="tick" />
              כוח בתנועה
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

// === Infantry root =========================================================
export function Infantry() {
  const stage = useSim((s) => s.stage);
  const layers = useSim((s) => s.layers);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const selectedElement = useSim((s) => s.selectedElement);
  const reveals = useSim((s) => s.reveals);
  const missionStarted = useSim((s) => s.missionStarted);

  const vis = getVisibility({
    stage,
    layers,
    selectedRoute,
    selectedElement,
    reveals,
  });

  // Squad labels must never show over the intro/debrief modals or the HUD.
  const showSceneLabels = missionStarted && stage !== "debrief";

  const layersUnit = layers.unitMarkers;
  const showFlow =
    layersUnit && !!selectedRoute && (stage === "decision" || stage === "debrief");
  const showChoke = layersUnit && stage === "chokepoint";
  const showStart = vis.friendlyMarker && !showFlow && !showChoke;
  const showEnemy = vis.enemyMarkers;

  return (
    <Fragment>
      {showStart && (
        <StaticSquad
          positions={FRIENDLY_SQUAD}
          label="כוח ידידותי"
          className="friendly"
          showLabel={showSceneLabels}
        />
      )}
      {showChoke && (
        <StaticSquad
          positions={CHOKE_CLUSTER}
          label="כוח בצוואר בקבוק"
          className="friendly"
          showLabel={showSceneLabels}
        />
      )}
      {showEnemy && <EnemySquad showLabel={showSceneLabels} />}
      {showFlow && selectedRoute && (
        <FlowSquad route={selectedRoute} showLabel={showSceneLabels} />
      )}
    </Fragment>
  );
}
