import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RIVER_LEVEL } from "@/lib/terrain";
import { PALETTE } from "@/lib/style";

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(56, 248, 1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.y = RIVER_LEVEL + Math.sin(t * 0.6) * 0.04;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[12, RIVER_LEVEL, 0]}>
      <meshStandardMaterial
        color={PALETTE.water}
        roughness={0.18}
        metalness={0.12}
        transparent
        opacity={0.86}
        emissive={PALETTE.waterDeep}
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}
