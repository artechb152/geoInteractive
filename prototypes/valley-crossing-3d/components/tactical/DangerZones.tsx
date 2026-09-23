import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { onTerrain } from "@/lib/terrain";
import { DANGER_ZONES, getVisibility } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { TACTICAL } from "@/lib/style";
import type { DangerZone as DangerZoneType, Vec3 } from "@/lib/types";

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

const LEVEL = {
  extreme: { color: TACTICAL.danger, fill: 0.2, ring: 0.85, label: "חמור", speed: 2.2 },
  high: { color: TACTICAL.danger, fill: 0.15, ring: 0.62, label: "גבוה", speed: 1.6 },
  moderate: { color: TACTICAL.warn, fill: 0.1, ring: 0.48, label: "בינוני", speed: 1.1 },
} as const;

function Zone({ zone, showLabel }: { zone: DangerZoneType; showLabel: boolean }) {
  const cfg = LEVEL[zone.level];
  const fillRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);
  const sweepRef = useRef<THREE.Group>(null);

  const center = useMemo<Vec3>(
    () => onTerrain(zone.position[0], zone.position[1], 0.6),
    [zone.position]
  );
  const ticks = useMemo(
    () => [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = (Math.sin(t * cfg.speed) + 1) * 0.5;
    if (fillRef.current) fillRef.current.opacity = cfg.fill * (0.7 + pulse * 0.6);
    if (ringRef.current) ringRef.current.opacity = cfg.ring * (0.7 + pulse * 0.3);
    if (sweepRef.current) sweepRef.current.rotation.z = -t * 0.7;
  });

  return (
    <group>
      <mesh rotation={FLAT} position={center}>
        <circleGeometry args={[zone.radius, 56]} />
        <meshBasicMaterial
          ref={fillRef}
          color={cfg.color}
          transparent
          opacity={cfg.fill}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={FLAT} position={center}>
        <ringGeometry args={[zone.radius - 0.6, zone.radius, 64]} />
        <meshBasicMaterial
          ref={ringRef}
          color={cfg.color}
          transparent
          opacity={cfg.ring}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <group ref={sweepRef} rotation={FLAT} position={center}>
        {ticks.map((a, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(a) * (zone.radius - 0.3),
              Math.sin(a) * (zone.radius - 0.3),
              0,
            ]}
            rotation={[0, 0, a]}
          >
            <planeGeometry args={[1.5, 0.32]} />
            <meshBasicMaterial
              color={cfg.color}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {showLabel && (
        <Html
          position={[zone.position[0], center[1] + 2, zone.position[1]]}
          center
          distanceFactor={150}
          zIndexRange={[8, 0]}
        >
          <div className={"zone-label " + zone.level}>
            {zone.label}
            <span className="zone-level">{cfg.label}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

export function DangerZones() {
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
  const zones = DANGER_ZONES.filter((z) => vis.exposureZoneIds.includes(z.id));
  if (!zones.length) return null;

  const showLabel = missionStarted && stage !== "debrief";

  return (
    <group>
      {zones.map((zone) => (
        <Zone key={zone.id} zone={zone} showLabel={showLabel} />
      ))}
    </group>
  );
}
