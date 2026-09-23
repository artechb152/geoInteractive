'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { HeightSampler } from './heightfield';
import { TRACK, WHEELBASE, WHEEL_RADIUS } from './vehicleController';
import { OCCLUSION_TINT } from './atmosphere';

/** Patch half-size (m) — a little wider/longer than the wheel footprint so the
 * soft falloff reaches past the tyres. */
const HALF_WIDTH = TRACK / 2 + 0.55;
const HALF_LENGTH = WHEELBASE / 2 + 0.95;
const SEG_X = 8;
const SEG_Z = 12;
/** Lift above the ground (m) to stay clear of the terrain surface. */
const LIFT = 0.025;
const OPACITY = 0.72;
/** Chassis clearance (m) at which the shadow has fully faded (airborne over a bump). */
const FADE_CLEARANCE = 0.7;

const WHEEL_NAMES = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'] as const;

let sharedTexture: THREE.CanvasTexture | null = null;

/** Soft occlusion footprint, drawn once: a broad body shadow plus four
 * tighter, darker tyre-contact patches. Blur via canvas shadowBlur (shape drawn
 * off-canvas so only its blurred shadow lands in view) for broad browser support. */
function getFootprintTexture() {
  if (sharedTexture) return sharedTexture;
  const pxPerM = 52;
  const w = Math.round(HALF_WIDTH * 2 * pxPerM);
  const h = Math.round(HALF_LENGTH * 2 * pxPerM);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const offset = w * 4;

  const blurRect = (cx: number, cy: number, rw: number, rh: number, blur: number, alpha: number) => {
    ctx.save();
    ctx.shadowColor = `rgba(255,255,255,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offset;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(cx - rw / 2 - offset, cy - rh / 2, rw, rh, Math.min(rw, rh) * 0.35);
    ctx.fill();
    ctx.restore();
  };

  // Body: the chassis blocking sky light between/around the wheels.
  blurRect(w / 2, h / 2, (TRACK + 0.25) * pxPerM, (WHEELBASE + 1.0) * pxPerM, 26, 0.55);
  // Tyre contact patches — the darkest, tightest occlusion.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      blurRect(w / 2 + (sx * TRACK * pxPerM) / 2, h / 2 + (sz * WHEELBASE * pxPerM) / 2, 0.32 * pxPerM, 0.62 * pxPerM, 10, 0.9);
    }
  }

  sharedTexture = new THREE.CanvasTexture(canvas);
  return sharedTexture;
}

const _fl = new THREE.Vector3();
const _fr = new THREE.Vector3();
const _rl = new THREE.Vector3();
const _rr = new THREE.Vector3();
const _center = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

/**
 * Ambient-occlusion "contact" shadow under the vehicle: the darkening where
 * the chassis blocks sky light, which the sun's shadow map can't provide on
 * its own (it is directional, so ground right under the car can still read
 * as sunlit and the car looks pasted on). A small grid re-draped over the
 * heightfield every frame, so it follows ruts, dunes and ledges instead of
 * floating as a flat decal.
 *
 * Placement is read from the vehicle's wheel nodes in the scene (not the
 * controller), so it stays decoupled from the vehicle rig.
 */
export function ContactShadow({ heightAt }: { heightAt: HeightSampler }) {
  const scene = useThree((s) => s.scene);
  const meshRef = useRef<THREE.Mesh>(null);
  const wheelsRef = useRef<THREE.Object3D[] | null>(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(HALF_WIDTH * 2, HALF_LENGTH * 2, SEG_X, SEG_Z);
    g.rotateX(-Math.PI / 2);
    // Flat layout kept as the local (x, z) basis; positions are rewritten each frame.
    g.userData.base = Float32Array.from(g.attributes.position.array as Float32Array);
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: OCCLUSION_TINT,
        alphaMap: getFootprintTexture(),
        transparent: true,
        opacity: OPACITY,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Priority 0.5: after VehicleRig moves the rig (0), before EffectComposer
  // renders (1) — otherwise the patch trails the car by a frame at speed.
  // (Any priority > 0 means manual rendering; the composer already does that.)
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!wheelsRef.current) {
      const found = WHEEL_NAMES.map((n) => scene.getObjectByName(n));
      if (found.some((o) => !o)) {
        mesh.visible = false;
        return;
      }
      wheelsRef.current = found as THREE.Object3D[];
    }

    // The rig moved this frame, after the last render — refresh world matrices first.
    const [fl, fr, rl, rr] = wheelsRef.current;
    for (const w of wheelsRef.current) w.updateWorldMatrix(true, false);
    fl.getWorldPosition(_fl);
    fr.getWorldPosition(_fr);
    rl.getWorldPosition(_rl);
    rr.getWorldPosition(_rr);
    _center.copy(_fl).add(_fr).add(_rl).add(_rr).multiplyScalar(0.25);
    _fwd.copy(_fl).add(_fr).sub(_rl).sub(_rr).setY(0);
    _right.copy(_fr).add(_rr).sub(_fl).sub(_rl).setY(0);
    if (_fwd.lengthSq() < 1e-6 || _right.lengthSq() < 1e-6) return;
    _fwd.normalize();
    _right.normalize();

    const clearance = _center.y - WHEEL_RADIUS - heightAt(_center.x, _center.z);
    const fade = 1 - THREE.MathUtils.clamp(clearance / FADE_CLEARANCE, 0, 1);
    mesh.visible = fade > 0.02;
    material.opacity = OPACITY * fade;
    if (!mesh.visible) return;

    const base = geometry.userData.base as Float32Array;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = base[i * 3];
      // Flat plane: local +Z points to the rear, so negate for "forward".
      const lz = -base[i * 3 + 2];
      const x = _center.x + _right.x * lx + _fwd.x * lz;
      const z = _center.z + _right.z * lx + _fwd.z * lz;
      pos.setXYZ(i, x, heightAt(x, z) + LIFT, z);
    }
    pos.needsUpdate = true;
  }, 0.5);

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
