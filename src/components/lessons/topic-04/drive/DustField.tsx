'use client';

import { type RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SoilConfig } from './terrainConfigs';
import type { HeightSampler } from './heightfield';
import type { VehiclePose } from './vehicleController';
import { TRACK, WHEELBASE } from './vehicleController';

const POOL_SIZE = 36;

/** Soft radial-falloff disc, generated once at runtime — no image asset needed. */
let sharedTexture: THREE.Texture | null = null;
function getSoftDiscTexture() {
  if (sharedTexture) return sharedTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedTexture = new THREE.CanvasTexture(canvas);
  return sharedTexture;
}

type Particle = {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  baseScale: number;
};

/**
 * Wheel kickup — dust puffs (sand/soft rock) or mud splashes, spawned from a
 * fixed pool of THREE.Sprite objects (cheap: inherently camera-facing, no
 * per-instance shader work needed at this particle count). Reads the vehicle
 * controller's pose from a ref written by VehicleRig's own frame loop — it
 * does not step the controller itself.
 */
export function DustField({
  soil,
  heightAt,
  poseRef,
}: {
  soil: SoilConfig;
  heightAt: HeightSampler;
  poseRef: RefObject<VehiclePose | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<Particle[]>([]);
  const spawnAccum = useRef(0);
  const emitSide = useRef(0);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const texture = getSoftDiscTexture();
    const arr: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        color: new THREE.Color(soil.visual.kickup.color),
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.setScalar(0.01);
      group.add(sprite);
      arr.push({ sprite, velocity: new THREE.Vector3(), life: 0, maxLife: 1, active: false, baseScale: 0.3 });
    }
    particlesRef.current = arr;
    return () => {
      for (const p of arr) {
        group.remove(p.sprite);
        p.sprite.material.dispose();
      }
      particlesRef.current = [];
    };
  }, [soil.id, soil.visual.kickup.color]);

  useFrame((_, delta) => {
    const pose = poseRef.current;
    const particles = particlesRef.current;
    if (!pose || particles.length === 0) return;

    const gravity = soil.visual.kickup.kind === 'splash' ? 6.5 : 0.7;
    for (const p of particles) {
      if (!p.active) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.velocity.y -= gravity * delta;
      p.sprite.position.addScaledVector(p.velocity, delta);
      const groundY = heightAt(p.sprite.position.x, p.sprite.position.z);
      if (p.sprite.position.y < groundY) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.sprite.scale.setScalar(p.baseScale * (0.6 + t * 0.8));
      (p.sprite.material as THREE.SpriteMaterial).opacity = (1 - t) * 0.5;
    }

    if (!soil.visual.kickup.enabled) return;
    const speed = pose.speedKph / 3.6;
    if (speed < 1.2) return;

    spawnAccum.current += delta * Math.min(speed, 6) * 5;
    if (spawnAccum.current < 1) return;
    spawnAccum.current = 0;

    const free = particles.find((p) => !p.active);
    if (!free) return;

    emitSide.current = 1 - emitSide.current;
    const sideSign = emitSide.current === 0 ? -1 : 1;
    const cos = Math.cos(pose.heading);
    const sin = Math.sin(pose.heading);
    const localX = (sideSign * TRACK) / 2;
    const localZ = WHEELBASE / 2 + 0.25;
    const wx = pose.position.x + localX * cos + localZ * sin;
    const wz = pose.position.z - localX * sin + localZ * cos;
    const wy = heightAt(wx, wz);

    const isSplash = soil.visual.kickup.kind === 'splash';
    free.active = true;
    free.life = 0;
    free.maxLife = isSplash ? 0.55 + Math.random() * 0.25 : 1.0 + Math.random() * 0.5;
    free.baseScale = isSplash ? 0.16 + Math.random() * 0.12 : 0.3 + Math.random() * 0.25;
    free.sprite.position.set(wx, wy + 0.12, wz);
    free.sprite.visible = true;
    (free.sprite.material as THREE.SpriteMaterial).opacity = 0.5;

    const backX = -sin;
    const backZ = cos;
    const kick = isSplash ? 2.2 : 1.1;
    free.velocity.set(
      backX * kick * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.8,
      (isSplash ? 2.6 : 1.0) * (0.6 + Math.random() * 0.6),
      backZ * kick * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.8,
    );
  });

  return <group ref={groupRef} />;
}
