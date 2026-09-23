'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import type { SoilConfig } from './terrainConfigs';
import type { HeightSampler } from './heightfield';
import { VehicleController, type DriveInput, type DriveStatus, type VehiclePose } from './vehicleController';
import { ChaseCamera } from './chaseCamera';
import { DustField } from './DustField';
import { ContactShadow } from './ContactShadow';
import { tuneVehicleMaterials } from './vehicleMaterials';

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
  const poseRef = useRef<VehiclePose | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  const controllerRef = useRef<VehicleController | null>(null);
  if (!controllerRef.current) controllerRef.current = new VehicleController(soil, heightAt);
  const chaseCamRef = useRef<ChaseCamera | null>(null);
  if (!chaseCamRef.current) chaseCamRef.current = new ChaseCamera(heightAt);

  useEffect(() => tuneVehicleMaterials(scene), [scene]);

  useEffect(() => {
    controllerRef.current?.setSoil(soil, heightAt);
    chaseCamRef.current?.setHeightSampler(heightAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soil.id, heightAt]);

  useEffect(() => {
    if (recoverToken > 0) {
      controllerRef.current?.teleportToSpawn();
      chaseCamRef.current?.snap();
    }
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
    poseRef.current = pose;

    // Controller pose → three's frame (model nose is −Z, right is +X): yaw is
    // −heading (vehicleToWorld), +pitch lifts the nose, +roll lifts the right
    // side. Forward rolling and right steer are negative X / Y rotations.
    rigRef.current.position.copy(pose.position);
    rigRef.current.rotation.order = 'YXZ';
    rigRef.current.rotation.set(pose.pitch, -pose.heading, pose.roll);

    (Object.keys(wheels) as WheelTag[]).forEach((tag) => {
      const entry = wheels[tag];
      if (!entry) return;
      const w = pose.wheels[tag];
      entry.obj.rotation.set(-w.spin, -w.steer, 0);
      entry.obj.position.y = entry.baseY + w.suspension;
    });

    if (pose.status !== lastStatus.current) {
      lastStatus.current = pose.status;
      onStatus(pose.status, pose.speedKph);
    }

    // Camera runs in this same frame callback, after the pose update, so it
    // never frames a one-frame-stale vehicle.
    chaseCamRef.current?.update(camera as THREE.PerspectiveCamera, pose, delta, reducedMotion);
  });

  return (
    <>
      <group ref={rigRef}>
        <primitive object={scene} />
      </group>
      <ContactShadow heightAt={heightAt} />
      <DustField soil={soil} heightAt={heightAt} poseRef={poseRef} />
    </>
  );
}
