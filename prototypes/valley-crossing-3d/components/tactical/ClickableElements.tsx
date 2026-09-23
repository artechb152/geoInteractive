import * as THREE from "three";
import { onTerrain } from "@/lib/terrain";
import { ELEMENTS } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import { TACTICAL } from "@/lib/style";

export function ClickableElements() {
  const hovered = useSim((s) => s.hoveredElement);
  const setHover = useSim((s) => s.setHoveredElement);
  const setSel = useSim((s) => s.setSelectedElement);

  return (
    <>
      {ELEMENTS.map((el) => (
        <group key={el.id}>
          <mesh
            position={onTerrain(el.position[0], el.position[1], 0.4)}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(el.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHover(null);
              document.body.style.cursor = "auto";
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSel(el.id);
            }}
          >
            <circleGeometry args={[el.radius, 40]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {hovered === el.id ? (
            <mesh
              position={onTerrain(el.position[0], el.position[1], 0.5)}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[el.radius - 1, el.radius, 56]} />
              <meshBasicMaterial
                color={TACTICAL.highlight}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : null}
        </group>
      ))}
    </>
  );
}
