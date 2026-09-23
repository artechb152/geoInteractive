'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import type { SoilConfig } from './terrainConfigs';
import { TILE_HALF_SIZE } from './terrainConfigs';
import { buildTerrainGeometry, type HeightSampler } from './heightfield';

const BOUNDARY_MARKERS = 28;

export function Terrain({ soil, heightAt }: { soil: SoilConfig; heightAt: HeightSampler }) {
  const geometry = useMemo(() => buildTerrainGeometry(heightAt), [heightAt]);

  const [diffuse, normal, roughness] = useTexture([
    `${soil.visual.textureDir}/diffuse.webp`,
    `${soil.visual.textureDir}/normal.webp`,
    `${soil.visual.textureDir}/roughness.webp`,
  ]);

  useEffect(() => {
    for (const tex of [diffuse, normal, roughness]) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(soil.visual.repeat, soil.visual.repeat);
      tex.anisotropy = 4;
      tex.needsUpdate = true;
    }
    diffuse.colorSpace = THREE.SRGBColorSpace;
  }, [diffuse, normal, roughness, soil.visual.repeat]);

  const markers = useMemo(() => {
    const radius = TILE_HALF_SIZE - 0.6;
    return Array.from({ length: BOUNDARY_MARKERS }, (_, i) => {
      const angle = (i / BOUNDARY_MARKERS) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      return { x, z, y: heightAt(x, z) };
    });
  }, [heightAt]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          map={diffuse}
          normalMap={normal}
          roughnessMap={roughness}
          roughness={1}
          vertexColors
        />
      </mesh>

      {/* Boundary markers — plain survey stakes with a small hazard-tape
          flag, rather than bright traffic cones, so the edge-of-area cue
          doesn't read as a toy prop. */}
      {markers.map((m, i) => (
        <group key={i} position={[m.x, m.y, m.z]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.64, 6]} />
            <meshStandardMaterial color="#4a4032" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.56, 0]} rotation={[0, (i * Math.PI) / 7, 0]} castShadow>
            <boxGeometry args={[0.16, 0.07, 0.01]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#c94f36' : '#e8e2d2'} roughness={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function preloadTerrainTextures(soil: SoilConfig) {
  useTexture.preload(`${soil.visual.textureDir}/diffuse.webp`);
  useTexture.preload(`${soil.visual.textureDir}/normal.webp`);
  useTexture.preload(`${soil.visual.textureDir}/roughness.webp`);
}
