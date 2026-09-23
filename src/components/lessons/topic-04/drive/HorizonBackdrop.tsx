'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SoilConfig, TerrainHeightProfile } from './terrainConfigs';
import { fbm2 } from './terrainNoise';

/**
 * Distant ridgelines ringing the play area — the composition's background
 * layer. Two silhouette bands (a nearer, slightly darker one and a taller,
 * paler one behind it) fade up out of the fog colour, reading as aerial
 * perspective rather than props, and give the horizon an intentional line
 * instead of the bare sky gradient below it.
 *
 * Unlit, unfogged vertex-coloured strips: the base colour IS the fog colour,
 * so each ridge grows seamlessly out of the fully-fogged far ground.
 */

const SEGMENTS = 256;
const BASE_Y = -8;

type Layer = { radius: number; base: number; height: number; tint: 'ambient' | 'sky'; tintAmount: number; seed: number };

const LAYERS: Layer[] = [
  { radius: 118, base: 4, height: 13, tint: 'sky', tintAmount: 0.3, seed: 4200 },
  { radius: 84, base: 1.2, height: 6.5, tint: 'ambient', tintAmount: 0.42, seed: 4300 },
];

/** Silhouette character per terrain style — echoes the ground you're driving on. */
const PROFILE: Record<TerrainHeightProfile['style'], { amplitude: number; frequency: number; shape: (n: number) => number }> = {
  // Hard rock: flat-topped mesas with steep flanks.
  ledges: { amplitude: 1, frequency: 0.03, shape: (n) => Math.round(n * 3) / 3 * 0.75 + n * 0.25 },
  // Soft chalk: rounded rolling hills.
  terraces: { amplitude: 0.85, frequency: 0.022, shape: (n) => n },
  // Dunes: long smooth swells.
  dunes: { amplitude: 0.7, frequency: 0.014, shape: (n) => n * n * (3 - 2 * n) },
  // Loess plain: a low, nearly flat horizon.
  ruts: { amplitude: 0.35, frequency: 0.02, shape: (n) => n },
};

function buildRidge(layer: Layer, style: TerrainHeightProfile['style'], fog: THREE.Color, tint: THREE.Color) {
  const profile = PROFILE[style];
  const positions = new Float32Array((SEGMENTS + 1) * 3 * 3);
  const colors = new Float32Array((SEGMENTS + 1) * 3 * 3);
  const top = fog.clone().lerp(tint, layer.tintAmount);

  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const x = Math.cos(angle) * layer.radius;
    const z = Math.sin(angle) * layer.radius;
    // Noise sampled on the circle itself, so the ring closes seamlessly. Same
    // gradient noise as the terrain; remapped to ~0.5 ± 0.12 (measured on
    // these rings) so the (raw − 0.3) / 0.4 silhouette window below keeps
    // its coverage.
    const raw = 0.5 + 0.66 * fbm2(x * profile.frequency, z * profile.frequency, layer.seed, 4);
    const n = THREE.MathUtils.clamp((raw - 0.3) / 0.4, 0, 1);
    const h = layer.base + profile.shape(n) * layer.height * profile.amplitude;

    // Three rows: buried base, ground level, crest — all fog colour except the crest.
    const rows: Array<[number, THREE.Color]> = [
      [BASE_Y, fog],
      [0, fog],
      [h, top],
    ];
    rows.forEach(([y, color], r) => {
      const k = (i * 3 + r) * 3;
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      colors[k] = color.r;
      colors[k + 1] = color.g;
      colors[k + 2] = color.b;
    });
  }

  const indices: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    for (let r = 0; r < 2; r++) {
      const a = i * 3 + r;
      const b = a + 1;
      const c = a + 3;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function HorizonBackdrop({ soil }: { soil: SoilConfig }) {
  const { fog, ambient, sky } = soil.visual;
  const { style } = soil.height;

  const geometries = useMemo(() => {
    const fogColor = new THREE.Color(fog);
    const tints = { ambient: new THREE.Color(ambient), sky: new THREE.Color(sky) };
    return LAYERS.map((layer) => buildRidge(layer, style, fogColor, tints[layer.tint]));
  }, [fog, ambient, sky, style]);

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
