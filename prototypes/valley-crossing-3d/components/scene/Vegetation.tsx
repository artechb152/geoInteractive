// Instanced trees + shrubs, deterministically scattered across the terrain.
// Every placement is excluded from the road corridor, the river channel and the
// village shelf so vegetation never clips into structures or routes.
//
// Density is terrain-aware: trees mass on the western hill flanks, the northern
// and southern framing high ground and near (but not in) the river corridor,
// while the open central valley floor stays deliberately sparse so it reads as
// exposed. Shrubs scatter more widely, including the valley edges.

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

interface TreePlacement {
  pos: Vec3;
  scale: number;
  foliage: string;
  rot: number;
  tilt: number;
  lean: number;
}

interface ShrubPlacement {
  pos: Vec3;
  scale: number;
  squash: number;
  rot: number;
  alt: boolean;
}

/** Deterministic 0..1 hash from a planar cell + salt. */
function hash(x: number, z: number, salt: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

const TREE_LIMIT = 220;
const SHRUB_LIMIT = 170;

const FOLIAGE_TONES = [
  PALETTE.treeFoliage,
  PALETTE.treeFoliageAlt,
  PALETTE.treeFoliage3,
] as const;

/**
 * 0..1 desirability for a tree at a planar point. High on the western hill
 * flanks, the N/S framing high ground and the river-fringe belt; low on the
 * open valley floor.
 */
function treeDensity(x: number, z: number): number {
  let d = 0.12;

  // Western observation hill flanks.
  const hill = Math.hypot((x + 72) / 32, (z + 6) / 36);
  d += Math.max(0, 1 - hill) * 0.85;

  // Northern + southern framing high ground.
  d += Math.max(0, 1 - Math.abs(z + 100) / 70) * 0.55;
  d += Math.max(0, 1 - Math.abs(z - 100) / 70) * 0.55;

  // River-fringe belt: dense just outside the channel, fading with distance.
  const river = Math.abs(x - riverCenterX(z));
  if (river > 12 && river < 30) {
    const t = 1 - (river - 12) / 18;
    d += t * 0.5;
  }

  // Suppress the open central valley so it reads exposed.
  const valley = Math.hypot((x - 6) / 60, z / 40);
  d -= Math.max(0, 1 - valley) * 0.8;

  return d;
}

export function Vegetation() {
  const trees = useMemo<TreePlacement[]>(() => {
    const out: TreePlacement[] = [];
    for (let cx = -112; cx <= 112; cx += 7) {
      for (let cz = -112; cz <= 112; cz += 7) {
        const x = cx + (hash(cx, cz, 1.3) - 0.5) * 6.5;
        const z = cz + (hash(cx, cz, 4.7) - 0.5) * 6.5;
        const y = getHeight(x, z);
        if (y < 3.5 || y > 17) continue;
        if (slopeAt(x, z) >= 0.55) continue;
        if (distToPolyline(x, z, ROAD_PATH) <= 7) continue;
        if (Math.abs(x - riverCenterX(z)) <= 12) continue;
        if (Math.hypot(x - 58, z - 8) <= 20) continue;

        if (hash(cx, cz, 21.5) > treeDensity(x, z)) continue;

        const h = hash(cx, cz, 9.1);
        const tone = Math.floor(hash(cx, cz, 2.6) * FOLIAGE_TONES.length);
        out.push({
          pos: onTerrain(x, z),
          scale: 0.78 + h * 0.75,
          foliage: FOLIAGE_TONES[Math.min(tone, FOLIAGE_TONES.length - 1)],
          rot: hash(cx, cz, 6.4) * Math.PI * 2,
          tilt: (hash(cx, cz, 14.2) - 0.5) * 0.16,
          lean: (hash(cx, cz, 18.9) - 0.5) * 0.14,
        });
      }
    }
    return out.slice(0, TREE_LIMIT);
  }, []);

  const shrubs = useMemo<ShrubPlacement[]>(() => {
    const out: ShrubPlacement[] = [];
    for (let cx = -112; cx <= 112; cx += 6.5) {
      for (let cz = -112; cz <= 112; cz += 6.5) {
        const x = cx + (hash(cx, cz, 3.1) - 0.5) * 7;
        const z = cz + (hash(cx, cz, 5.9) - 0.5) * 7;
        const y = getHeight(x, z);
        if (y < 3.2 || y > 15) continue;
        if (slopeAt(x, z) >= 0.6) continue;
        if (distToPolyline(x, z, ROAD_PATH) <= 4) continue;
        if (Math.abs(x - riverCenterX(z)) <= 11) continue;
        if (Math.hypot(x - 58, z - 8) <= 19) continue;

        // Shrubs spread more widely than trees, including valley edges, but
        // still thin out across the most open valley floor.
        const valley = Math.hypot((x - 6) / 58, z / 38);
        const openFloor = Math.max(0, 1 - valley) * 0.45;
        if (hash(cx, cz, 23.8) < openFloor) continue;

        const s = hash(cx, cz, 8.2);
        out.push({
          pos: onTerrain(x, z),
          scale: 0.55 + s * 0.65,
          squash: 0.7 + hash(cx, cz, 16.6) * 0.2,
          rot: hash(cx, cz, 12.9) * Math.PI * 2,
          alt: hash(cx, cz, 19.4) > 0.5,
        });
      }
    }
    return out.slice(0, SHRUB_LIMIT);
  }, []);

  return (
    <>
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 1, 6]} />
        <meshStandardMaterial color={PALETTE.treeTrunk} roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.pos[0], t.pos[1] + 1.1 * t.scale, t.pos[2]]}
            rotation={[t.lean, t.rot, t.tilt]}
            scale={[t.scale, 2.3 * t.scale, t.scale]}
          />
        ))}
      </Instances>

      <Instances limit={trees.length} castShadow>
        <coneGeometry args={[1.9, 4.2, 7]} />
        <meshStandardMaterial flatShading roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.pos[0], t.pos[1] + 3.4 * t.scale, t.pos[2]]}
            rotation={[t.lean, t.rot, t.tilt]}
            scale={[t.scale, t.scale, t.scale]}
            color={t.foliage}
          />
        ))}
      </Instances>

      <Instances limit={trees.length} castShadow>
        <coneGeometry args={[1.25, 3.2, 7]} />
        <meshStandardMaterial flatShading roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.pos[0], t.pos[1] + 5.6 * t.scale, t.pos[2]]}
            rotation={[t.lean, t.rot + 0.5, t.tilt]}
            scale={[t.scale, t.scale, t.scale]}
            color={t.foliage}
          />
        ))}
      </Instances>

      <Instances limit={shrubs.length} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
        {shrubs.map((s, i) => (
          <Instance
            key={i}
            position={[s.pos[0], s.pos[1] + s.scale * s.squash * 0.35, s.pos[2]]}
            rotation={[0, s.rot, 0]}
            scale={[s.scale * 1.1, s.scale * s.squash, s.scale * 1.1]}
            color={s.alt ? PALETTE.shrubAlt : PALETTE.shrub}
          />
        ))}
      </Instances>
    </>
  );
}
