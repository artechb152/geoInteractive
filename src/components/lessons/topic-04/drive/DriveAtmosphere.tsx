'use client';

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { SkyDome } from './SkyDome';
import {
  SHADOW_FOCUS_AHEAD,
  SHADOW_HALF_EXTENT,
  SHADOW_MAP_SIZE,
  SUN_DIRECTION,
  type AtmosphereMood,
} from './atmosphere';

/** Distance (m) the light sits from its focus point along the sun direction. */
const LIGHT_DISTANCE = 60;
const TEXEL = (SHADOW_HALF_EXTENT * 2) / SHADOW_MAP_SIZE;

// Shadow-camera basis (matches three's lookAt from light → target with +Y up),
// used to snap the moving shadow box to whole texels so shadow edges don't
// shimmer while the chase camera drives the box around.
const LIGHT_X = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIRECTION).normalize();
const LIGHT_Y = new THREE.Vector3().crossVectors(SUN_DIRECTION, LIGHT_X).normalize();

const _forward = new THREE.Vector3();
const _focus = new THREE.Vector3();

/** The single late-afternoon sun. Its shadow box follows the chase camera
 * (centred a little ahead of it) instead of covering the whole tile, which
 * keeps texels small enough for crisp contact under the vehicle while still
 * letting every visible hill and hollow cast/receive shadow. */
function SunLight({ mood }: { mood: AtmosphereMood }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = cam.bottom = -SHADOW_HALF_EXTENT;
    cam.right = cam.top = SHADOW_HALF_EXTENT;
    cam.near = 10;
    cam.far = LIGHT_DISTANCE + 50;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    // Low sun = grazing angle on flat ground, and the terrain now shadows
    // itself; normalBias does most of the acne prevention without detaching
    // the vehicle's shadow (peter-panning — ContactShadow covers the gap).
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.05;
    light.shadow.radius = 3;
  }, []);

  // After VehicleRig has moved the chase camera this frame (priority 0), so the
  // box never lags the camera.
  useFrame(({ camera }) => {
    const light = lightRef.current;
    if (!light) return;
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, 1);
    _forward.normalize();
    _focus.copy(camera.position).addScaledVector(_forward, SHADOW_FOCUS_AHEAD);

    const dx = _focus.dot(LIGHT_X);
    const dy = _focus.dot(LIGHT_Y);
    _focus.addScaledVector(LIGHT_X, Math.round(dx / TEXEL) * TEXEL - dx);
    _focus.addScaledVector(LIGHT_Y, Math.round(dy / TEXEL) * TEXEL - dy);

    light.target.position.copy(_focus);
    light.target.updateMatrixWorld();
    light.position.copy(_focus).addScaledVector(SUN_DIRECTION, LIGHT_DISTANCE);
  }, 0.5);

  return <directionalLight ref={lightRef} color={mood.sun} intensity={mood.sunIntensity} castShadow />;
}

/**
 * Everything that sets the time of day: baked sky light (IBL), the visible
 * sky, distance haze and the sun. Terrain, vehicle and props only need
 * standard PBR materials to sit inside it.
 */
export function DriveAtmosphere({ mood, moodKey }: { mood: AtmosphereMood; moodKey: string }) {
  return (
    <>
      {/* Re-baked once per mood (keyed) — a static gradient needs no per-frame updates. */}
      <Environment key={moodKey} resolution={128} frames={1} environmentIntensity={mood.skyFill}>
        <SkyDome mood={mood} disc={false} />
      </Environment>
      <SkyDome mood={mood} followCamera />

      {/* Exponential-squared haze in the horizon colour: near ground stays
          crisp, the tile edge and distant ridges fade toward the sky. */}
      <fogExp2 attach="fog" args={[mood.horizon, mood.haze]} />

      <SunLight mood={mood} />
    </>
  );
}
