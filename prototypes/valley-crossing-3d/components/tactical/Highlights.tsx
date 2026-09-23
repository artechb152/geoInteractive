import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { onTerrain } from "@/lib/terrain";
import { ELEMENT_MAP, getVisibility } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { elementKindColor } from "@/lib/style";

export function Highlights() {
  const stage = useSim((s) => s.stage);
  const layers = useSim((s) => s.layers);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const selectedElement = useSim((s) => s.selectedElement);
  const reveals = useSim((s) => s.reveals);

  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const vis = getVisibility({
    stage,
    layers,
    selectedRoute,
    selectedElement,
    reveals,
  });

  useFrame((state, delta) => {
    const ring = ringRef.current;
    const mat = ringMatRef.current;
    if (ring) ring.rotation.z += delta * 0.4;
    if (mat) {
      const t = state.clock.elapsedTime;
      mat.opacity = 0.4 + Math.sin(t * 2) * 0.25;
    }
  });

  const id = vis.highlightElement;
  if (!id) return null;

  const el = ELEMENT_MAP[id];
  const color = elementKindColor(el.kind);
  const base = onTerrain(el.position[0], el.position[1]);

  return (
    <group>
      <mesh ref={ringRef} position={base} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[el.radius * 0.55, el.radius * 0.62, 64]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[base[0], base[1] + 14, base[2]]}>
        <cylinderGeometry args={[0.4, 0.4, 28, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
