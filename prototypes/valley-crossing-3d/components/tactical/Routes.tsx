import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { sampleSurfacePath } from "@/lib/terrain";
import { ROUTE_COLORS } from "@/lib/style";
import { getVisibility, ROUTE_MAP } from "@/lib/scenario";
import { useSim } from "@/lib/store";
import type { RouteId, Vec3 } from "@/lib/types";

const ARROW_COUNT = 10;
const FLOW_SPEED = 0.06;
const ARROW_LIFT = 1.1;
const NODE_LIFT = 1.0;

/** Flat double-wing chevron pointing along +Z, built once and reused per arrow. */
function makeChevronGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.95);
  shape.lineTo(0.85, -0.3);
  shape.lineTo(0.5, -0.3);
  shape.lineTo(0, 0.42);
  shape.lineTo(-0.5, -0.3);
  shape.lineTo(-0.85, -0.3);
  shape.lineTo(0, 0.95);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: false,
  });
  geo.center();
  // Shape lies in XY; rotate so the chevron lies flat and points along +Z.
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI);
  return geo;
}

function Arrows({ points, color }: { points: Vec3[]; color: string }) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const path = useMemo(
    () => points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [points]
  );

  const chevronGeometry = useMemo(() => makeChevronGeometry(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const n = path.length;
    if (n < 2) return;

    for (let i = 0; i < ARROW_COUNT; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;

      const p = (i / ARROW_COUNT + t * FLOW_SPEED) % 1;
      const fIndex = p * (n - 1);
      const index = Math.min(n - 2, Math.floor(fIndex));
      const frac = fIndex - index;

      const current = path[index];
      const next = path[index + 1];

      group.position.set(
        current.x + (next.x - current.x) * frac,
        current.y + (next.y - current.y) * frac + ARROW_LIFT,
        current.z + (next.z - current.z) * frac
      );
      group.lookAt(next.x, next.y + ARROW_LIFT, next.z);

      // Brightness ripple: chevrons brighten as they near the head of the flow.
      const wave = 0.55 + 0.45 * Math.sin((p - t * FLOW_SPEED) * Math.PI * 4);
      const mesh = group.children[0] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + 0.4 * wave;
    }
  });

  return (
    <>
      {Array.from({ length: ARROW_COUNT }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          <mesh geometry={chevronGeometry}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={1}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Glowing pulse ring + core that marks a route endpoint. */
function EndpointNode({
  position,
  color,
}: {
  position: Vec3;
  color: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);

    if (ringRef.current) {
      const s = 1 + pulse * 0.55;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * (1 - pulse);
    }
    if (coreRef.current) {
      const cs = 0.92 + pulse * 0.16;
      coreRef.current.scale.set(cs, cs, cs);
    }
  });

  return (
    <group position={[position[0], position[1] + NODE_LIFT, position[2]]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.85, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.35, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Routes() {
  const stage = useSim((s) => s.stage);
  const layers = useSim((s) => s.layers);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const selectedElement = useSim((s) => s.selectedElement);
  const reveals = useSim((s) => s.reveals);

  const vis = useMemo(
    () => getVisibility({ stage, layers, selectedRoute, selectedElement, reveals }),
    [stage, layers, selectedRoute, selectedElement, reveals]
  );

  const routes = useMemo(
    () =>
      vis.routeIds.map((id: RouteId) => ({
        id,
        pts: sampleSurfacePath(ROUTE_MAP[id].waypoints, 3, 0.7),
        emphasized: selectedRoute ? id === selectedRoute : vis.routeIds.length === 1,
      })),
    [vis.routeIds, selectedRoute]
  );

  // Single ref to the currently emphasized line; pulsed each frame.
  const emphasizedLine = useRef<THREE.Object3D | null>(null);

  useFrame((state) => {
    const obj = emphasizedLine.current;
    if (!obj) return;
    const mat = (obj as unknown as { material?: THREE.Material }).material;
    if (mat) {
      mat.opacity = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 2.4);
    }
  });

  return (
    <group>
      {routes.map(({ id, pts, emphasized }) => (
        <group key={id}>
          <Line
            ref={
              emphasized
                ? (el) => {
                    emphasizedLine.current = el as unknown as THREE.Object3D | null;
                  }
                : undefined
            }
            points={pts}
            color={ROUTE_COLORS[id]}
            lineWidth={emphasized ? 5 : 2.5}
            transparent
            opacity={emphasized ? 1 : 0.5}
            dashed={!emphasized}
            dashSize={2}
            gapSize={1.4}
            toneMapped={!emphasized}
          />
          {emphasized && pts.length >= 2 && (
            <>
              <Arrows points={pts} color={ROUTE_COLORS[id]} />
              <EndpointNode position={pts[0]} color={ROUTE_COLORS[id]} />
              <EndpointNode position={pts[pts.length - 1]} color={ROUTE_COLORS[id]} />
            </>
          )}
        </group>
      ))}
    </group>
  );
}
