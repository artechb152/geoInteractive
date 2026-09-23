// Instanced boulders, deterministically scattered. Rocks mass on rocky / steep
// slopes (the eastern ridge, hill crests) and along the riverbanks, and are kept
// clear of the road corridor and the village shelf. Two tones, full random
// rotation and varied non-uniform scale keep the field believable and natural.

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";

import {
  getHeight,
  slopeAt,
  onTerrain,
  riverCenterX,
  distToPolyline,
} from "@/lib/terrain";
import { ROAD_PATH } from "@/lib/scenario";
import { PALETTE } from "@/lib/style";
import type { Vec3 } from "@/lib/types";

type Boulder = {
  pos: Vec3;
  scale: Vec3;
  rot: Vec3;
  dark: boolean;
};

function hash(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 73.13 + z * 19.71 + seed * 41.37) * 24634.6345;
  return s - Math.floor(s);
}

const ROCK_LIMIT = 90;

export function Rocks() {
  const rocks = useMemo<Boulder[]>(() => {
    const out: Boulder[] = [];

    for (let x = -110; x <= 110; x += 9) {
      for (let z = -110; z <= 110; z += 9) {
        if (out.length >= ROCK_LIMIT) break;

        const jx = x + (hash(x, z, 1.3) - 0.5) * 8;
        const jz = z + (hash(x, z, 7.9) - 0.5) * 8;

        const slope = slopeAt(jx, jz);
        const height = getHeight(jx, jz);
        const riverDist = Math.abs(jx - riverCenterX(jz));
        const bank = riverDist > 9 && riverDist < 15;

        // Probability that this cell carries rock, weighted toward rocky and
        // steep ground, high crests and the immediate riverbanks.
        let chance = 0;
        if (slope > 0.28) chance += (slope - 0.28) * 1.6;
        if (height > 10) chance += (height - 10) * 0.05;
        if (bank) chance += 0.55;
        if (chance <= 0) continue;
        if (hash(jx, jz, 17.2) > chance) continue;

        if (distToPolyline(jx, jz, ROAD_PATH) <= 5) continue;
        if (Math.hypot(jx - 58, jz - 8) <= 14) continue;

        const base = 0.7 + hash(jx, jz, 3.1) * 1.9;
        const scale: Vec3 = [
          base * (0.82 + hash(jx, jz, 22.3) * 0.36),
          base * (0.6 + hash(jx, jz, 24.7) * 0.4),
          base * (0.82 + hash(jx, jz, 27.1) * 0.36),
        ];
        const rot: Vec3 = [
          hash(jx, jz, 5.5) * Math.PI * 2,
          hash(jx, jz, 8.2) * Math.PI * 2,
          hash(jx, jz, 11.4) * Math.PI * 2,
        ];

        out.push({
          pos: onTerrain(jx, jz, -0.3),
          scale,
          rot,
          dark: hash(jx, jz, 13.7) > 0.5,
        });
      }
      if (out.length >= ROCK_LIMIT) break;
    }

    return out;
  }, []);

  return (
    <Instances limit={rocks.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial flatShading roughness={1} metalness={0} />
      {rocks.map((r, i) => (
        <Instance
          key={i}
          position={r.pos}
          scale={r.scale}
          rotation={r.rot}
          color={r.dark ? PALETTE.rockDark : PALETTE.rock}
        />
      ))}
    </Instances>
  );
}
