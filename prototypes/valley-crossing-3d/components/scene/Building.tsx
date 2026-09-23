import { useMemo } from "react";
import { PALETTE } from "@/lib/style";

interface BuildingProps {
  position: [number, number, number];
  rotation?: number;
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  roofColor: string;
}

interface WindowInset {
  key: string;
  position: [number, number, number];
}

export function Building(props: BuildingProps): JSX.Element {
  const { position, rotation, width, depth, height, wallColor, roofColor } =
    props;

  const roofH = Math.max(width, depth) * 0.5;
  const roofRadius = (Math.hypot(width, depth) / 2) * 0.62;
  const eaveWidth = width + 0.5;
  const eaveDepth = depth + 0.5;

  const doorH = height * 0.55;
  const doorW = Math.min(0.9, width * 0.32);

  // Deterministic small variations keyed off the building footprint so the same
  // building always renders identically (Village placement is deterministic).
  const variant = useMemo(() => {
    const seed = width * 13.1 + depth * 7.7 + height * 3.3;
    const frac = (n: number): number => {
      const v = Math.sin(n) * 43758.5453;
      return v - Math.floor(v);
    };
    const windowCount = frac(seed) > 0.5 ? 2 : 1;
    const hasChimney = frac(seed + 5.2) > 0.55;
    const chimneyOffsetX = (frac(seed + 9.4) - 0.5) * width * 0.4;
    const chimneyOffsetZ = (frac(seed + 2.1) - 0.5) * depth * 0.4;
    return { windowCount, hasChimney, chimneyOffsetX, chimneyOffsetZ };
  }, [width, depth, height]);

  const windows = useMemo<WindowInset[]>(() => {
    const sillY = height * 0.6;
    const insets: WindowInset[] = [];
    if (variant.windowCount === 1) {
      insets.push({
        key: "win-front-0",
        position: [width * 0.24, sillY, depth / 2 + 0.04],
      });
    } else {
      insets.push(
        {
          key: "win-front-0",
          position: [-width * 0.26, sillY, depth / 2 + 0.04],
        },
        {
          key: "win-front-1",
          position: [width * 0.26, sillY, depth / 2 + 0.04],
        },
      );
    }
    // One side window for added relief.
    insets.push({
      key: "win-side-0",
      position: [width / 2 + 0.04, sillY, -depth * 0.18],
    });
    return insets;
  }, [width, depth, height, variant.windowCount]);

  return (
    <group position={position} rotation={[0, rotation ?? 0, 0]}>
      {/* Walls */}
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Overhanging eave just under the roof base */}
      <mesh castShadow receiveShadow position={[0, height + 0.12, 0]}>
        <boxGeometry args={[eaveWidth, 0.24, eaveDepth]} />
        <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} />
      </mesh>

      {/* Hip / pyramidal roof */}
      <mesh
        castShadow
        receiveShadow
        position={[0, height + 0.24 + roofH / 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[roofRadius, roofH, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} flatShading />
      </mesh>

      {/* Recessed doorway: dark frame box set slightly into the wall face */}
      <mesh receiveShadow position={[0, doorH / 2, depth / 2 + 0.02]}>
        <boxGeometry args={[doorW + 0.16, doorH + 0.16, 0.12]} />
        <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.95} />
      </mesh>
      <mesh position={[0, doorH / 2, depth / 2 - 0.02]}>
        <boxGeometry args={[doorW, doorH, 0.1]} />
        <meshStandardMaterial color="#241f19" roughness={1} />
      </mesh>

      {/* Window insets (dark recessed boxes) */}
      {windows.map((w) => {
        const isSide = w.key.startsWith("win-side");
        return (
          <mesh key={w.key} position={w.position}>
            <boxGeometry
              args={isSide ? [0.1, 0.6, 0.7] : [0.7, 0.6, 0.1]}
            />
            <meshStandardMaterial color="#26221b" roughness={1} />
          </mesh>
        );
      })}

      {/* Optional chimney */}
      {variant.hasChimney && (
        <mesh
          castShadow
          receiveShadow
          position={[
            variant.chimneyOffsetX,
            height + roofH * 0.55,
            variant.chimneyOffsetZ,
          ]}
        >
          <boxGeometry args={[0.55, roofH * 0.9, 0.55]} />
          <meshStandardMaterial color={PALETTE.bridgeStoneDark} roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}
