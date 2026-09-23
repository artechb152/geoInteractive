import { useMemo } from "react";
import * as THREE from "three";

import {
  WORLD,
  RIVER_LEVEL,
  getHeight,
  slopeAt,
  smoothstep,
  riverCenterX,
} from "@/lib/terrain";
import { PALETTE } from "@/lib/style";

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      WORLD.size,
      WORLD.size,
      WORLD.segments,
      WORLD.segments
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getHeight(x, z));
    }

    const colors = new Float32Array(count * 3);

    const grassLow = new THREE.Color(PALETTE.grassLow);
    const grassDry = new THREE.Color(PALETTE.grassDry);
    const grassHigh = new THREE.Color(PALETTE.grassHigh);
    const dirt = new THREE.Color(PALETTE.dirt);
    const dirtDark = new THREE.Color(PALETTE.dirtDark);
    const rockLow = new THREE.Color(PALETTE.rockLow);
    const rockMid = new THREE.Color(PALETTE.rockMid);
    const rockHigh = new THREE.Color(PALETTE.rockHigh);
    const sand = new THREE.Color(PALETTE.sand);
    const mud = new THREE.Color(PALETTE.mud);

    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const s = slopeAt(x, z);

      // base dry-grass field with patchy variation
      const patch = Math.sin(x * 0.08 + z * 0.05) * 0.5 + 0.5;
      const micro = Math.sin(x * 0.5 + z * 0.37) * 0.5 + 0.5;
      c.copy(grassLow).lerp(grassDry, patch);
      // worn dirt patches breaking up the grass
      c.lerp(dirt, smoothstep(0.55, 0.95, micro) * 0.35);
      // higher ground gets paler highland grass
      c.lerp(grassHigh, smoothstep(9, 18, y) * 0.5);

      // rocky slopes (two-tone)
      const rockAmt = smoothstep(0.28, 0.62, s);
      if (rockAmt > 0) {
        const rock = rockLow.clone().lerp(rockMid, micro);
        c.lerp(rock, rockAmt);
      }
      // exposed high rock on steep peaks
      c.lerp(rockHigh, smoothstep(0.5, 0.85, s) * smoothstep(13, 24, y) * 0.85);

      // riverbanks: muddy edge fading to dry sand
      const bankDist = Math.abs(x - riverCenterX(z));
      if (y < RIVER_LEVEL + 3.5 && bankDist < 13) {
        const bank = smoothstep(RIVER_LEVEL + 3.5, RIVER_LEVEL + 0.2, y);
        const wet = mud.clone().lerp(sand, smoothstep(0, 1, micro));
        c.lerp(wet, bank * 0.9);
      }

      // fake ambient occlusion: darken low/valley ground for depth
      c.lerp(dirtDark, smoothstep(6.5, 1.5, y) * 0.28);

      // subtle per-vertex brightness jitter
      const jitter =
        1 + (Math.sin(x * 1.7 + z * 2.3) * 0.5 + 0.5 - 0.5) * 0.07;
      c.multiplyScalar(jitter);

      const o = i * 3;
      colors[o] = c.r;
      colors[o + 1] = c.g;
      colors[o + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.96}
        metalness={0}
      />
    </mesh>
  );
}
