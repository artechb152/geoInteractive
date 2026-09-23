'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SoilConfig } from './terrainConfigs';
import { TILE_HALF_SIZE } from './terrainConfigs';
import { buildTerrainGeometry, type HeightSampler } from './heightfield';
import { bakeTerrainMasks, preloadTerrainMaterial, useTerrainMaterial } from './terrainMaterial';

const BOUNDARY_MARKERS = 28;
const FLAG_COLORS = ['#c94f36', '#e8e2d2'];

/** Boundary markers — plain survey stakes with a small hazard-tape flag,
 * rather than bright traffic cones, so the edge-of-area cue doesn't read as a
 * toy prop. Instanced: two draw calls for all 28 instead of 56 meshes. */
function BoundaryStakes({ heightAt }: { heightAt: HeightSampler }) {
  const stakesRef = useRef<THREE.InstancedMesh>(null);
  const flagsRef = useRef<THREE.InstancedMesh>(null);

  const { stakeGeometry, flagGeometry, stakeMaterial, flagMaterial } = useMemo(
    () => ({
      stakeGeometry: new THREE.CylinderGeometry(0.022, 0.028, 0.64, 6),
      flagGeometry: new THREE.BoxGeometry(0.16, 0.07, 0.01),
      stakeMaterial: new THREE.MeshStandardMaterial({ color: '#4a4032', roughness: 0.9 }),
      flagMaterial: new THREE.MeshStandardMaterial({ roughness: 0.65 }),
    }),
    [],
  );

  useEffect(
    () => () => {
      stakeGeometry.dispose();
      flagGeometry.dispose();
      stakeMaterial.dispose();
      flagMaterial.dispose();
    },
    [stakeGeometry, flagGeometry, stakeMaterial, flagMaterial],
  );

  useLayoutEffect(() => {
    const stakes = stakesRef.current;
    const flags = flagsRef.current;
    if (!stakes || !flags) return;
    const radius = TILE_HALF_SIZE - 0.6;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    for (let i = 0; i < BOUNDARY_MARKERS; i++) {
      const angle = (i / BOUNDARY_MARKERS) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      const y = heightAt(x, z);
      stakes.setMatrixAt(i, m.compose(p.set(x, y + 0.32, z), q.identity(), one));
      flags.setMatrixAt(i, m.compose(p.set(x, y + 0.56, z), q.setFromAxisAngle(up, (i * Math.PI) / 7), one));
      flags.setColorAt(i, color.set(FLAG_COLORS[i % 2]));
    }
    stakes.instanceMatrix.needsUpdate = true;
    flags.instanceMatrix.needsUpdate = true;
    if (flags.instanceColor) flags.instanceColor.needsUpdate = true;
    // Instances span the whole tile; bounds must cover all of them.
    stakes.computeBoundingSphere();
    flags.computeBoundingSphere();
  }, [heightAt]);

  return (
    <>
      <instancedMesh ref={stakesRef} args={[stakeGeometry, stakeMaterial, BOUNDARY_MARKERS]} castShadow />
      <instancedMesh ref={flagsRef} args={[flagGeometry, flagMaterial, BOUNDARY_MARKERS]} castShadow />
    </>
  );
}

export function Terrain({ soil, heightAt }: { soil: SoilConfig; heightAt: HeightSampler }) {
  const geometry = useMemo(() => {
    const g = buildTerrainGeometry(heightAt);
    bakeTerrainMasks(g);
    return g;
  }, [heightAt]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useTerrainMaterial(soil.visual.material, geometry);

  return (
    <group>
      {/* Casts as well as receives: under the low sun, hill and ledge
          shadows are what make the relief readable (see atmosphere.ts). */}
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <BoundaryStakes heightAt={heightAt} />
    </group>
  );
}

export function preloadTerrainTextures(soil: SoilConfig) {
  preloadTerrainMaterial(soil.visual.material);
}
