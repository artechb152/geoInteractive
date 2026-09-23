import { useMemo } from "react";
import { DoubleSide } from "three";
import * as THREE from "three";
import { ROAD_PATH } from "@/lib/scenario";
import { sampleSurfacePath, surfaceHeight } from "@/lib/terrain";
import { PALETTE } from "@/lib/style";

const HW = 3.0;
const EDGE_HW = 0.55;
const TRACK_HW = 0.32;
const TRACK_OFFSET = 1.0;

const ROAD_LIFT = 0.18;
const EDGE_LIFT = 0.205;
const TRACK_LIFT = 0.2;

type Sample = readonly [number, number, number];

/** Unit perpendicular (in the XZ plane) of the centerline tangent at index i. */
function perpAt(center: Sample[], i: number): readonly [number, number] {
  const count = center.length;
  const prev = center[Math.max(0, i - 1)];
  const next = center[Math.min(count - 1, i + 1)];
  let tx = next[0] - prev[0];
  let tz = next[2] - prev[2];
  const tLen = Math.hypot(tx, tz) || 1;
  tx /= tLen;
  tz /= tLen;
  return [-tz, tx];
}

/**
 * Build a triangle-strip ribbon offset around the centerline. The ribbon spans
 * [innerOffset - halfWidth, innerOffset + halfWidth] along the perpendicular,
 * letting the same centerline drive the main road, edge strips and tire tracks.
 */
function buildRibbon(
  center: Sample[],
  innerOffset: number,
  halfWidth: number,
  lift: number
): THREE.BufferGeometry {
  const count = center.length;
  const positions = new Float32Array(count * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const cx = center[i][0];
    const cz = center[i][2];
    const [perpX, perpZ] = perpAt(center, i);

    const lOff = innerOffset + halfWidth;
    const rOff = innerOffset - halfWidth;

    const lx = cx + perpX * lOff;
    const lz = cz + perpZ * lOff;
    const rx = cx + perpX * rOff;
    const rz = cz + perpZ * rOff;

    const ly = surfaceHeight(lx, lz) + lift;
    const ry = surfaceHeight(rx, rz) + lift;

    const base = i * 6;
    positions[base] = lx;
    positions[base + 1] = ly;
    positions[base + 2] = lz;
    positions[base + 3] = rx;
    positions[base + 4] = ry;
    positions[base + 5] = rz;
  }

  for (let i = 0; i < count - 1; i++) {
    const l0 = i * 2;
    const r0 = i * 2 + 1;
    const l1 = (i + 1) * 2;
    const r1 = (i + 1) * 2 + 1;
    indices.push(l0, r0, l1);
    indices.push(r0, r1, l1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function Road() {
  const ribbons = useMemo(() => {
    const center = sampleSurfacePath(ROAD_PATH, 2.5, 0) as Sample[];

    return {
      main: buildRibbon(center, 0, HW, ROAD_LIFT),
      edgeLeft: buildRibbon(center, HW - EDGE_HW * 0.5, EDGE_HW, EDGE_LIFT),
      edgeRight: buildRibbon(center, -(HW - EDGE_HW * 0.5), EDGE_HW, EDGE_LIFT),
      trackLeft: buildRibbon(center, TRACK_OFFSET, TRACK_HW, TRACK_LIFT),
      trackRight: buildRibbon(center, -TRACK_OFFSET, TRACK_HW, TRACK_LIFT),
    };
  }, []);

  return (
    <group>
      <mesh geometry={ribbons.main} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.roadDirt}
          roughness={1}
          metalness={0}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <mesh geometry={ribbons.edgeLeft} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.roadEdge}
          roughness={1}
          metalness={0}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh geometry={ribbons.edgeRight} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.roadEdge}
          roughness={1}
          metalness={0}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <mesh geometry={ribbons.trackLeft} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.roadDark}
          roughness={1}
          metalness={0}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
      <mesh geometry={ribbons.trackRight} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.roadDark}
          roughness={1}
          metalness={0}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
    </group>
  );
}
