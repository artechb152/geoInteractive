import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { onTerrain } from "@/lib/terrain";
import { SIGHT_LINES, getVisibility } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { TACTICAL } from "@/lib/style";
import type { SightLine, Vec3 } from "@/lib/types";

function Sight({ line }: { line: SightLine }) {
  const isEnemy = line.kind === "enemy";
  const { a, b, color } = useMemo(() => {
    const from: Vec3 = onTerrain(line.from[0], line.from[1], 3.4);
    const to: Vec3 = onTerrain(line.to[0], line.to[1], 1.1);
    return {
      a: from,
      b: to,
      color: isEnemy ? TACTICAL.losEnemy : TACTICAL.losFriendly,
    };
  }, [line.from, line.to, isEnemy]);

  return (
    <group>
      <Line
        points={[a, b]}
        color={color}
        lineWidth={isEnemy ? 1.7 : 1.4}
        transparent
        opacity={isEnemy ? 0.6 : 0.5}
        dashed
        dashSize={isEnemy ? 2.8 : 1.3}
        gapSize={isEnemy ? 1.9 : 1.0}
      />
      {/* observer (origin) marker */}
      <mesh position={a}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {/* observed point */}
      <mesh position={b}>
        <sphereGeometry args={[0.45, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export function LineOfSight() {
  const stage = useSim((s) => s.stage);
  const layers = useSim((s) => s.layers);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const selectedElement = useSim((s) => s.selectedElement);
  const reveals = useSim((s) => s.reveals);

  const vis = getVisibility({
    stage,
    layers,
    selectedRoute,
    selectedElement,
    reveals,
  });

  const lines = SIGHT_LINES.filter((line) =>
    line.kind === "enemy"
      ? vis.enemyLOSIds.includes(line.id)
      : vis.friendlyLOSIds.includes(line.id)
  );

  return (
    <group>
      {lines.map((line) => (
        <Sight key={line.id} line={line} />
      ))}
    </group>
  );
}
