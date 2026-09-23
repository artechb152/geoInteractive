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
        />
      </mesh>

      {/* Boundary markers — clear "this is the edge of the playable area" cue. */}
      {markers.map((m, i) => (
        <mesh key={i} position={[m.x, m.y + 0.35, m.z]} castShadow>
          <coneGeometry args={[0.12, 0.7, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#D97E2B' : '#F8F2E7'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function preloadTerrainTextures(soil: SoilConfig) {
  useTexture.preload(`${soil.visual.textureDir}/diffuse.webp`);
  useTexture.preload(`${soil.visual.textureDir}/normal.webp`);
  useTexture.preload(`${soil.visual.textureDir}/roughness.webp`);
}
