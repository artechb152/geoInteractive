import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CAMERA_POSES, ROUTE_MAP } from "@/lib/scenario";
import { onSurface } from "@/lib/terrain";
import { useSim } from "@/lib/store";
import type { CameraMode, CameraPose, RouteId } from "@/lib/types";

// Cinematic transition timing and the "Route Preview" framing tuning.
const CAMERA_TRANSITION_SECONDS = 1.15;
const ROUTE_FRAME = {
  xOffset: 0.15,
  heightFactor: 0.62,
  heightPad: 50,
  depthFactor: 0.85,
  depthPad: 40,
} as const;

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function getPose(mode: CameraMode, routeId: RouteId | null): CameraPose {
  if (mode === "route") {
    if (routeId) {
      const waypoints = ROUTE_MAP[routeId].waypoints;
      let minx = Infinity;
      let maxx = -Infinity;
      let minz = Infinity;
      let maxz = -Infinity;
      let sumY = 0;
      for (const [wx, wz] of waypoints) {
        const [px, py, pz] = onSurface(wx, wz);
        if (px < minx) minx = px;
        if (px > maxx) maxx = px;
        if (pz < minz) minz = pz;
        if (pz > maxz) maxz = pz;
        sumY += py;
      }
      const cx = (minx + maxx) / 2;
      const cz = (minz + maxz) / 2;
      const avgY = sumY / waypoints.length;
      const span = Math.max(maxx - minx, maxz - minz);
      return {
        position: [
          cx + span * ROUTE_FRAME.xOffset,
          avgY + span * ROUTE_FRAME.heightFactor + ROUTE_FRAME.heightPad,
          cz + span * ROUTE_FRAME.depthFactor + ROUTE_FRAME.depthPad,
        ],
        target: [cx, avgY, cz],
      };
    }
    return CAMERA_POSES.strategic;
  }
  return CAMERA_POSES[mode];
}

export function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const cameraMode = useSim((s) => s.cameraMode);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const cameraNonce = useSim((s) => s.cameraNonce);

  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());
  const t = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    const pose = getPose(cameraMode, selectedRoute);
    startPos.current.copy(camera.position);
    startTarget.current.copy(
      controlsRef.current
        ? controlsRef.current.target
        : new THREE.Vector3(...CAMERA_POSES.strategic.target)
    );
    endPos.current.set(pose.position[0], pose.position[1], pose.position[2]);
    endTarget.current.set(pose.target[0], pose.target[1], pose.target[2]);
    t.current = 0;
    active.current = true;
  }, [camera, cameraMode, selectedRoute, cameraNonce]);

  useFrame((_, delta) => {
    if (!active.current || !controlsRef.current) return;
    t.current = Math.min(1, t.current + delta / CAMERA_TRANSITION_SECONDS);
    const e = easeInOutCubic(t.current);
    camera.position.lerpVectors(startPos.current, endPos.current, e);
    controlsRef.current.target.lerpVectors(
      startTarget.current,
      endTarget.current,
      e
    );
    controlsRef.current.update();
    if (t.current >= 1) active.current = false;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={22}
      maxDistance={640}
      maxPolarAngle={1.52}
      enablePan
    />
  );
}
