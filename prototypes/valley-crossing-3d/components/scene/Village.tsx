import { useMemo } from "react";
import { getHeight } from "@/lib/terrain";
import { PALETTE } from "@/lib/style";
import { Building } from "./Building";

const CENTER_X = 58;
const CENTER_Z = 8;

interface BuildingLayout {
  key: string;
  position: [number, number, number];
  rotation: number;
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  roofColor: string;
}

interface WallLayout {
  key: string;
  position: [number, number, number];
  rotation: number;
  length: number;
}

interface SandbagLayout {
  key: string;
  position: [number, number, number];
  rotation: number;
  width: number;
  height: number;
}

function rand(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const WALL_COLORS = [
  PALETTE.buildingWall,
  PALETTE.buildingWallAlt,
  PALETTE.buildingWall3,
] as const;

const ROOF_COLORS = [PALETTE.roof, PALETTE.roofAlt, PALETTE.roof3] as const;

export function Village(): JSX.Element {
  const buildings = useMemo<BuildingLayout[]>(() => {
    // Hand-tuned loose courtyard cluster around the objective center. Local
    // offsets are relative to (CENTER_X, CENTER_Z); the road approaches from the
    // west (-X) so the western edge is kept comparatively open.
    const spots: { dx: number; dz: number; size: number }[] = [
      { dx: -1.5, dz: -2.0, size: 1.25 }, // large central structure
      { dx: 6.0, dz: -5.5, size: 0.95 },
      { dx: 8.5, dz: 1.5, size: 1.05 },
      { dx: 6.5, dz: 7.5, size: 0.85 },
      { dx: 0.5, dz: 9.0, size: 1.0 },
      { dx: -6.5, dz: 7.0, size: 0.9 },
      { dx: -9.0, dz: 0.5, size: 0.8 },
      { dx: -7.0, dz: -6.5, size: 1.0 },
      { dx: -1.0, dz: -9.0, size: 0.9 },
      { dx: 9.5, dz: -10.0, size: 0.85 },
      { dx: 3.5, dz: 3.5, size: 0.75 }, // small infill near courtyard
    ];

    return spots.map((spot, i) => {
      const x = CENTER_X + spot.dx + (rand(i * 2.1) - 0.5) * 1.2;
      const z = CENTER_Z + spot.dz + (rand(i * 3.7) - 0.5) * 1.2;
      const width = (4 + rand(i * 5.9) * 3) * spot.size;
      const depth = (3.5 + rand(i * 7.3) * 2.5) * spot.size;
      const height = (3 + rand(i * 9.1) * 2.2) * spot.size;
      const rotation = Math.round(rand(i * 11.7) * 4) * (Math.PI / 2)
        + (rand(i * 13.3) - 0.5) * 0.3;
      const wallIdx = Math.floor(rand(i * 17.1) * WALL_COLORS.length);
      const roofIdx = Math.floor(rand(i * 19.5) * ROOF_COLORS.length);
      return {
        key: `village-building-${i}`,
        position: [x, getHeight(x, z), z],
        rotation,
        width,
        depth,
        height,
        wallColor: WALL_COLORS[wallIdx],
        roofColor: ROOF_COLORS[roofIdx],
      };
    });
  }, []);

  // Perimeter courtyard wall: connected thin stone segments partially enclosing
  // the cluster, with a deliberate gap on the western (road approach) side.
  const walls = useMemo<WallLayout[]>(() => {
    const R = 13.5;
    // Angles in radians around the center. The western arc (around PI) is left
    // open as the road approach gap.
    const corners = [
      -2.5, -1.7, -0.9, -0.1, 0.7, 1.5, 2.3, // eastern / northern / southern arc
    ].map((a) => ({
      x: Math.cos(a) * R,
      z: Math.sin(a) * R,
    }));

    const segments: WallLayout[] = [];
    for (let i = 0; i < corners.length - 1; i += 1) {
      const a = corners[i];
      const b = corners[i + 1];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz) + 0.4;
      const angle = Math.atan2(dz, dx);
      const wx = CENTER_X + mx;
      const wz = CENTER_Z + mz;
      segments.push({
        key: `village-wall-${i}`,
        position: [wx, getHeight(wx, wz), wz],
        rotation: angle,
        length,
      });
    }
    return segments;
  }, []);

  // Sandbag barriers near the western edge, facing the valley.
  const sandbags = useMemo<SandbagLayout[]>(() => {
    const specs: { dx: number; dz: number; rot: number; w: number }[] = [
      { dx: -12.5, dz: -2.5, rot: 0.35, w: 3.0 },
      { dx: -13.0, dz: 1.5, rot: -0.2, w: 2.4 },
      { dx: -11.5, dz: 4.5, rot: 0.5, w: 2.0 },
    ];
    return specs.flatMap((s, i) => {
      const x = CENTER_X + s.dx;
      const z = CENTER_Z + s.dz;
      const baseY = getHeight(x, z);
      // Two stacked tiers for a low protective berm.
      return [
        {
          key: `village-sandbag-${i}-0`,
          position: [x, baseY + 0.3, z] as [number, number, number],
          rotation: s.rot,
          width: s.w,
          height: 0.6,
        },
        {
          key: `village-sandbag-${i}-1`,
          position: [x, baseY + 0.85, z] as [number, number, number],
          rotation: s.rot,
          width: s.w * 0.78,
          height: 0.5,
        },
      ];
    });
  }, []);

  // Single watchtower as a focal landmark on the south-east corner.
  const tower = useMemo(() => {
    const x = CENTER_X + 9.5;
    const z = CENTER_Z - 2.5;
    const baseY = getHeight(x, z);
    const postH = 6.0;
    const half = 0.9;
    const posts: { key: string; x: number; z: number }[] = [
      { key: "p0", x: half, z: half },
      { key: "p1", x: -half, z: half },
      { key: "p2", x: half, z: -half },
      { key: "p3", x: -half, z: -half },
    ];
    return { x, baseY, z, postH, half, posts };
  }, []);

  const well = useMemo<[number, number, number]>(() => {
    const x = CENTER_X + 1.4;
    const z = CENTER_Z + 2.6;
    return [x, getHeight(x, z), z];
  }, []);

  return (
    <group>
      {buildings.map((b) => (
        <Building
          key={b.key}
          position={b.position}
          rotation={b.rotation}
          width={b.width}
          depth={b.depth}
          height={b.height}
          wallColor={b.wallColor}
          roofColor={b.roofColor}
        />
      ))}

      {/* Perimeter courtyard wall */}
      {walls.map((w) => (
        <mesh
          key={w.key}
          castShadow
          receiveShadow
          position={[w.position[0], w.position[1] + 0.6, w.position[2]]}
          rotation={[0, w.rotation, 0]}
        >
          <boxGeometry args={[w.length, 1.2, 0.4]} />
          <meshStandardMaterial color={PALETTE.bridgeStone} roughness={0.95} />
        </mesh>
      ))}

      {/* Sandbag barriers (western valley-facing edge) */}
      {sandbags.map((s) => (
        <mesh
          key={s.key}
          castShadow
          receiveShadow
          position={s.position}
          rotation={[0, s.rotation, 0]}
        >
          <boxGeometry args={[s.width, s.height, 1.1]} />
          <meshStandardMaterial color={PALETTE.sandbag} roughness={1} />
        </mesh>
      ))}

      {/* Watchtower */}
      <group position={[tower.x, tower.baseY, tower.z]}>
        {tower.posts.map((p) => (
          <mesh
            key={p.key}
            castShadow
            receiveShadow
            position={[p.x, tower.postH / 2, p.z]}
          >
            <boxGeometry args={[0.3, tower.postH, 0.3]} />
            <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} />
          </mesh>
        ))}
        {/* Platform */}
        <mesh castShadow receiveShadow position={[0, tower.postH + 0.15, 0]}>
          <boxGeometry args={[tower.half * 2 + 0.8, 0.3, tower.half * 2 + 0.8]} />
          <meshStandardMaterial color={PALETTE.bridgeWood} roughness={0.9} />
        </mesh>
        {/* Railing ring */}
        <mesh
          castShadow
          receiveShadow
          position={[0, tower.postH + 0.75, tower.half + 0.4]}
        >
          <boxGeometry args={[tower.half * 2 + 0.8, 0.9, 0.12]} />
          <meshStandardMaterial color={PALETTE.bridgeWoodDark} roughness={0.9} />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          position={[0, tower.postH + 0.75, -(tower.half + 0.4)]}
        >
          <boxGeometry args={[tower.half * 2 + 0.8, 0.9, 0.12]} />
          <meshStandardMaterial color={PALETTE.bridgeWoodDark} roughness={0.9} />
        </mesh>
        {/* Small roof */}
        <mesh
          castShadow
          receiveShadow
          position={[0, tower.postH + 1.7, 0]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <coneGeometry args={[tower.half * 2.0, 1.6, 4]} />
          <meshStandardMaterial color={PALETTE.roof} roughness={0.8} flatShading />
        </mesh>
      </group>

      {/* Central well */}
      <group position={[well[0], well[1], well[2]]}>
        <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.7, 0.8, 1.1, 12]} />
          <meshStandardMaterial color={PALETTE.bridgeStone} roughness={0.95} />
        </mesh>
        {/* Well posts + small roof */}
        <mesh castShadow receiveShadow position={[0.55, 1.5, 0]}>
          <boxGeometry args={[0.16, 1.8, 0.16]} />
          <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.55, 1.5, 0]}>
          <boxGeometry args={[0.16, 1.8, 0.16]} />
          <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          position={[0, 2.6, 0]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <coneGeometry args={[1.0, 0.8, 4]} />
          <meshStandardMaterial
            color={PALETTE.roofAlt}
            roughness={0.85}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}
