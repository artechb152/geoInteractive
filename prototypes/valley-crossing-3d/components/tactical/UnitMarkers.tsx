import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { onTerrain } from "@/lib/terrain";
import { UNIT_MARKERS, getVisibility } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { TACTICAL } from "@/lib/style";
import type { Faction, UnitMarker, Vec2 } from "@/lib/types";

const FACTION_COLOR: Record<Faction, string> = {
  friendly: TACTICAL.friendly,
  enemy: TACTICAL.enemy,
  observation: TACTICAL.observation,
};

const FACTION_GLOW: Record<Faction, string> = {
  friendly: TACTICAL.friendlyGlow,
  enemy: TACTICAL.enemyGlow,
  observation: TACTICAL.observationGlow,
};

// Build a flat ribbon "stroke" between two points in the billboard plane.
function strokeMatrix(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number
): THREE.Matrix4 {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-4;
  const angle = Math.atan2(dy, dx);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    angle
  );
  m.compose(
    new THREE.Vector3((ax + bx) * 0.5, (ay + by) * 0.5, 0),
    q,
    new THREE.Vector3(len, width, 1)
  );
  return m;
}

interface SymbolStroke {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  w: number;
}

// Glyph strokes per faction, drawn inside the frame plate (centered at origin).
function symbolStrokes(faction: Faction): SymbolStroke[] {
  if (faction === "friendly") {
    // Upward chevron (friendly air/maneuver cue).
    return [
      { ax: -0.46, ay: -0.18, bx: 0, by: 0.36, w: 0.18 },
      { ax: 0, ay: 0.36, bx: 0.46, by: -0.18, w: 0.18 },
    ];
  }
  if (faction === "enemy") {
    // Hostile X.
    return [
      { ax: -0.4, ay: -0.4, bx: 0.4, by: 0.4, w: 0.18 },
      { ax: -0.4, ay: 0.4, bx: 0.4, by: -0.4, w: 0.18 },
    ];
  }
  // observation: rendered separately as concentric rings + crosshair.
  return [
    { ax: -0.62, ay: 0, bx: -0.34, by: 0, w: 0.1 },
    { ax: 0.34, ay: 0, bx: 0.62, by: 0, w: 0.1 },
    { ax: 0, ay: -0.62, bx: 0, by: -0.34, w: 0.1 },
    { ax: 0, ay: 0.34, bx: 0, by: 0.62, w: 0.1 },
  ];
}

interface FrameProps {
  faction: Faction;
  color: string;
  glow: string;
}

// Billboarded NATO-style frame plate with inner glyph.
function SymbolPlate({ faction, color, glow }: FrameProps) {
  const strokes = useMemo(() => symbolStrokes(faction), [faction]);

  const strokeMatrices = useMemo(
    () => strokes.map((s) => strokeMatrix(s.ax, s.ay, s.bx, s.by, s.w)),
    [strokes]
  );

  const planeGeom = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  return (
    <Billboard position={[0, 6.6, 0]}>
      {/* faint backing plate for a professional "filled" symbol read */}
      <mesh position={[0, 0, -0.02]}>
        {faction === "enemy" ? (
          <circleGeometry args={[1.18, 4]} />
        ) : (
          <planeGeometry args={[2.05, 1.55]} />
        )}
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* frame: rectangle for friendly, diamond for enemy, ring for observation */}
      {faction === "friendly" && (
        <FrameRect width={1.85} height={1.35} thickness={0.12} glow={glow} />
      )}
      {faction === "enemy" && <FrameDiamond size={1.08} thickness={0.12} glow={glow} />}
      {faction === "observation" && (
        <>
          <mesh>
            <ringGeometry args={[0.78, 0.92, 48]} />
            <meshBasicMaterial color={glow} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.34, 0.44, 40]} />
            <meshBasicMaterial color={glow} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[0.2, 24]} />
            <meshBasicMaterial color={glow} />
          </mesh>
        </>
      )}

      {/* glyph strokes */}
      {strokeMatrices.length > 0 && (
        <instancedMesh
          args={[planeGeom, undefined, strokeMatrices.length]}
          onUpdate={(im) => {
            strokeMatrices.forEach((m, i) => im.setMatrixAt(i, m));
            im.instanceMatrix.needsUpdate = true;
          }}
        >
          <meshBasicMaterial
            color={glow}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </Billboard>
  );
}

interface FrameRectProps {
  width: number;
  height: number;
  thickness: number;
  glow: string;
}

// Hollow rectangular frame from four thin strokes.
function FrameRect({ width, height, thickness, glow }: FrameRectProps) {
  const hw = width / 2;
  const hh = height / 2;
  const matrices = useMemo(
    () => [
      strokeMatrix(-hw, hh, hw, hh, thickness),
      strokeMatrix(-hw, -hh, hw, -hh, thickness),
      strokeMatrix(-hw, -hh, -hw, hh, thickness),
      strokeMatrix(hw, -hh, hw, hh, thickness),
    ],
    [hw, hh, thickness]
  );
  const geom = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  return (
    <instancedMesh
      args={[geom, undefined, matrices.length]}
      onUpdate={(im) => {
        matrices.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
      }}
    >
      <meshBasicMaterial color={glow} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

interface FrameDiamondProps {
  size: number;
  thickness: number;
  glow: string;
}

// Hollow diamond/lozenge frame from four thin strokes.
function FrameDiamond({ size, thickness, glow }: FrameDiamondProps) {
  const matrices = useMemo(
    () => [
      strokeMatrix(0, size, size, 0, thickness),
      strokeMatrix(size, 0, 0, -size, thickness),
      strokeMatrix(0, -size, -size, 0, thickness),
      strokeMatrix(-size, 0, 0, size, thickness),
    ],
    [size, thickness]
  );
  const geom = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  return (
    <instancedMesh
      args={[geom, undefined, matrices.length]}
      onUpdate={(im) => {
        matrices.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
      }}
    >
      <meshBasicMaterial color={glow} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

interface MarkerProps {
  faction: Faction;
  position: Vec2;
  label: string;
  color: string;
  showLabel: boolean;
}

function Marker({ faction, position, label, color, showLabel }: MarkerProps) {
  const glow = FACTION_GLOW[faction];

  const ringRef = useRef<THREE.Mesh>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const base = useMemo(() => onTerrain(position[0], position[1]), [position]);

  useFrame((state) => {
    const t = (Math.sin(state.clock.elapsedTime * 1.8) + 1) * 0.5;
    if (ringRef.current) {
      const s = 1 + t * 0.45;
      ringRef.current.scale.set(s, s, s);
    }
    if (ringMaterialRef.current) {
      ringMaterialRef.current.opacity = 0.75 - t * 0.6;
    }
  });

  return (
    <group position={base}>
      {/* static faint outer "plate" ring for a professional grounded look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[2.5, 2.7, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* faint inner filled disc to seat the symbol on the terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
        <circleGeometry args={[1.6, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* crisp pulsing ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <ringGeometry args={[1.7, 2.05, 48]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color={glow}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* thin glowing pole with a brighter core */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 6, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 6, 6]} />
        <meshBasicMaterial color={glow} />
      </mesh>

      {/* base collar where the pole meets the ground */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.18, 0.26, 0.3, 12]} />
        <meshBasicMaterial color={glow} />
      </mesh>

      <SymbolPlate faction={faction} color={color} glow={glow} />

      {showLabel && (
        <Html position={[0, 8, 0]} center distanceFactor={150} zIndexRange={[8, 0]}>
          <div className={"unit-label " + faction}>
            <span className="tick" />
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function UnitMarkers() {
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

  // Friendly and enemy forces are now shown as 3D infantry (Infantry.tsx); this
  // overlay only carries the abstract observation-point marker on the hill.
  const markers = useMemo<UnitMarker[]>(
    () =>
      UNIT_MARKERS.filter(
        (m) => m.faction === "observation" && vis.observationMarker
      ),
    [vis.observationMarker]
  );

  const showLabel = missionStarted && stage !== "debrief";

  return (
    <group>
      {markers.map((m) => (
        <Marker
          key={m.id}
          faction={m.faction}
          position={m.position}
          label={m.label}
          color={FACTION_COLOR[m.faction]}
          showLabel={showLabel}
        />
      ))}
    </group>
  );
}
