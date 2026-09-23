'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { SoilConfig } from './terrainConfigs';
import type { HeightSampler } from './heightfield';
import { VehicleController, type DriveInput, type DriveStatus } from './vehicleController';

const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic04/trafficability-drive/models/vehicle.glb`;

useGLTF.preload(MODEL_URL);

function useArrowKeys(active: boolean) {
  const input = useRef<DriveInput>({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    if (!active) {
      input.current = { forward: false, back: false, left: false, right: false };
      return;
    }
    const keys: Record<string, keyof DriveInput> = {
      ArrowUp: 'forward',
      ArrowDown: 'back',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    const onDown = (e: KeyboardEvent) => {
      const key = keys[e.key];
      if (!key) return;
      e.preventDefault();
      input.current[key] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      const key = keys[e.key];
      if (!key) return;
      e.preventDefault();
      input.current[key] = false;
    };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp, { passive: false });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      input.current = { forward: false, back: false, left: false, right: false };
    };
  }, [active]);

  return input;
}

const CAM_DISTANCE = 6.4;
const CAM_HEIGHT = 2.6;
const LOOK_AHEAD = 3.2;
const LOOK_HEIGHT = 1.1;

type WheelTag = 'FL' | 'FR' | 'RL' | 'RR';

export function VehicleRig({
  soil,
  heightAt,
  active,
  recoverToken,
  onStatus,
}: {
  soil: SoilConfig;
  heightAt: HeightSampler;
  active: boolean;
  recoverToken: number;
  onStatus: (status: DriveStatus, speedKph: number) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const { camera } = useThree();
  const rigRef = useRef<THREE.Group>(null);
  const input = useArrowKeys(active);
  const lastStatus = useRef<DriveStatus>('ok');
  const camPos = useRef<THREE.Vector3 | null>(null);

  const controllerRef = useRef<VehicleController | null>(null);
  if (!controllerRef.current) controllerRef.current = new VehicleController(soil, heightAt);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    controllerRef.current?.setSoil(soil, heightAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soil.id, heightAt]);

  useEffect(() => {
    if (recoverToken > 0) controllerRef.current?.teleportToSpawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverToken]);

  const wheels = useMemo(() => {
    const tags: WheelTag[] = ['FL', 'FR', 'RL', 'RR'];
    const map = {} as Record<WheelTag, { obj: THREE.Object3D; baseY: number } | null>;
    for (const tag of tags) {
      const obj = scene.getObjectByName(`Wheel_${tag}`) ?? null;
      if (obj) {
        obj.rotation.order = 'YXZ';
        map[tag] = { obj, baseY: obj.position.y };
      } else {
        map[tag] = null;
      }
    }
    return map;
  }, [scene]);

  useFrame((_, delta) => {
    const controller = controllerRef.current;
    if (!controller || !rigRef.current) return;

    const pose = controller.update(delta, input.current);

    rigRef.current.position.copy(pose.position);
    rigRef.current.rotation.order = 'YXZ';
    rigRef.current.rotation.set(pose.pitch, pose.heading, pose.roll);

    (Object.keys(wheels) as WheelTag[]).forEach((tag) => {
      const entry = wheels[tag];
      if (!entry) return;
      const w = pose.wheels[tag];
      entry.obj.rotation.set(w.spin, w.steer, 0);
      entry.obj.position.y = entry.baseY + w.suspension;
    });

    if (pose.status !== lastStatus.current) {
      lastStatus.current = pose.status;
      onStatus(pose.status, pose.speedKph);
    }

    // Chase camera: smoothed follow behind + above, looking slightly ahead.
    const fwd = new THREE.Vector2(Math.sin(pose.heading), -Math.cos(pose.heading));
    const desired = new THREE.Vector3(
      pose.position.x - fwd.x * CAM_DISTANCE,
      pose.position.y + CAM_HEIGHT,
      pose.position.z - fwd.y * CAM_DISTANCE,
    );
    if (!camPos.current) {
      camPos.current = desired.clone();
      camera.position.copy(desired);
    } else {
      camPos.current.x = THREE.MathUtils.damp(camPos.current.x, desired.x, 4, delta);
      camPos.current.y = THREE.MathUtils.damp(camPos.current.y, desired.y, 4, delta);
      camPos.current.z = THREE.MathUtils.damp(camPos.current.z, desired.z, 4, delta);
      camera.position.copy(camPos.current);
    }
    const lookTarget = new THREE.Vector3(
      pose.position.x + fwd.x * LOOK_AHEAD,
      pose.position.y + LOOK_HEIGHT,
      pose.position.z + fwd.y * LOOK_AHEAD,
    );
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={rigRef}>
      <primitive object={scene} />
    </group>
  );
}
