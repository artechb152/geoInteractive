import { useMemo } from "react";
import { BRIDGE } from "@/lib/terrain";
import { PALETTE } from "@/lib/style";

const DECK_THICKNESS = 0.5;
const DECK_TOP = BRIDGE.deckY;
const DECK_CENTER_Y = DECK_TOP - DECK_THICKNESS / 2;
const DECK_LENGTH = BRIDGE.spanX * 2;
const DECK_WIDTH = BRIDGE.halfZ * 2;

const PIER_X = [BRIDGE.x - 5.5, BRIDGE.x + 5.5];
const ABUTMENT_X = [BRIDGE.x - BRIDGE.spanX, BRIDGE.x + BRIDGE.spanX];
const RAIL_Z = [BRIDGE.halfZ - 0.2, -(BRIDGE.halfZ - 0.2)];
const BEAM_Z = [BRIDGE.halfZ - 0.9, -(BRIDGE.halfZ - 0.9)];

const RAIL_TOP_Y = DECK_TOP + 1.05;
const RAIL_LOW_Y = DECK_TOP + 0.55;
const POST_HEIGHT = 1.2;
const POST_CENTER_Y = DECK_TOP + POST_HEIGHT / 2;

const PIER_HEIGHT = DECK_CENTER_Y - DECK_THICKNESS / 2;
const PIER_CENTER_Y = PIER_HEIGHT / 2;
const BEAM_CENTER_Y = DECK_CENTER_Y - DECK_THICKNESS / 2 - 0.25;

type Plank = {
  x: number;
  color: string;
};

type Brace = {
  x: number;
  z: number;
  rotZ: number;
};

export function Bridge() {
  const planks = useMemo<Plank[]>(() => {
    const count = 14;
    const usable = DECK_LENGTH - 0.6;
    const step = usable / (count - 1);
    const start = BRIDGE.x - usable / 2;
    const result: Plank[] = [];
    for (let i = 0; i < count; i += 1) {
      result.push({
        x: start + step * i,
        color: i % 2 === 0 ? PALETTE.bridgeWood : PALETTE.bridgeWoodDark,
      });
    }
    return result;
  }, []);

  const postX = useMemo<number[]>(() => {
    const positions: number[] = [];
    const reach = BRIDGE.spanX - 0.6;
    for (let x = -reach; x <= reach + 0.001; x += 2.6) {
      positions.push(BRIDGE.x + x);
    }
    return positions;
  }, []);

  const braces = useMemo<Brace[]>(() => {
    const result: Brace[] = [];
    const angle = 0.62;
    for (const px of PIER_X) {
      for (const bz of BEAM_Z) {
        result.push({ x: px - 2.4, z: bz, rotZ: angle });
        result.push({ x: px + 2.4, z: bz, rotZ: -angle });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {/* Main deck */}
      <mesh castShadow receiveShadow position={[BRIDGE.x, DECK_CENTER_Y, 0]}>
        <boxGeometry args={[DECK_LENGTH, DECK_THICKNESS, DECK_WIDTH]} />
        <meshStandardMaterial color={PALETTE.bridgeWood} roughness={0.9} metalness={0} />
      </mesh>

      {/* Transverse plank detail on the deck surface */}
      {planks.map((plank, i) => (
        <mesh
          key={`plank-${i}`}
          castShadow
          receiveShadow
          position={[plank.x, DECK_TOP + 0.06, 0]}
        >
          <boxGeometry args={[0.72, 0.12, DECK_WIDTH - 0.3]} />
          <meshStandardMaterial color={plank.color} roughness={0.92} metalness={0} />
        </mesh>
      ))}

      {/* Longitudinal under-deck support beams */}
      {BEAM_Z.map((bz) => (
        <mesh key={`beam-${bz}`} castShadow position={[BRIDGE.x, BEAM_CENTER_Y, bz]}>
          <boxGeometry args={[DECK_LENGTH - 1.5, 0.5, 0.45]} />
          <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} metalness={0} />
        </mesh>
      ))}

      {/* Diagonal braces between piers and deck (truss feel) */}
      {braces.map((brace, i) => (
        <mesh
          key={`brace-${i}`}
          castShadow
          position={[brace.x, DECK_CENTER_Y - 1.0, brace.z]}
          rotation={[0, 0, brace.rotZ]}
        >
          <boxGeometry args={[0.32, 2.4, 0.32]} />
          <meshStandardMaterial color={PALETTE.woodBeam} roughness={0.9} metalness={0} />
        </mesh>
      ))}

      {/* Stone end abutments anchoring the deck into the banks */}
      {ABUTMENT_X.map((ax) => (
        <group key={`abutment-${ax}`}>
          <mesh
            castShadow
            receiveShadow
            position={[ax, DECK_CENTER_Y - 0.9, 0]}
          >
            <boxGeometry args={[2.6, 3.2, BRIDGE.halfZ * 2 + 0.6]} />
            <meshStandardMaterial color={PALETTE.bridgeStone} roughness={0.95} metalness={0} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[ax, DECK_TOP - 0.05, 0]}
          >
            <boxGeometry args={[2.9, 0.7, BRIDGE.halfZ * 2 + 0.9]} />
            <meshStandardMaterial color={PALETTE.bridgeStone} roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* Stone support piers descending into the riverbed */}
      {PIER_X.map((px) => (
        <group key={`pier-${px}`}>
          <mesh
            castShadow
            receiveShadow
            position={[px, PIER_CENTER_Y, 0]}
          >
            <boxGeometry args={[1.8, PIER_HEIGHT, BRIDGE.halfZ * 1.7]} />
            <meshStandardMaterial color={PALETTE.bridgeStoneDark} roughness={1} metalness={0} />
          </mesh>
          {/* Stepped base */}
          <mesh
            castShadow
            receiveShadow
            position={[px, 0.4, 0]}
          >
            <boxGeometry args={[2.6, 0.8, BRIDGE.halfZ * 1.9]} />
            <meshStandardMaterial color={PALETTE.bridgeStoneDark} roughness={1} metalness={0} />
          </mesh>
          {/* Angled cutwater facing upstream/downstream */}
          <mesh
            castShadow
            position={[px, PIER_HEIGHT * 0.45, BRIDGE.halfZ * 0.85]}
            rotation={[0, Math.PI / 4, 0]}
          >
            <boxGeometry args={[1.3, PIER_HEIGHT * 0.7, 1.3]} />
            <meshStandardMaterial color={PALETTE.bridgeStoneDark} roughness={1} metalness={0} />
          </mesh>
          <mesh
            castShadow
            position={[px, PIER_HEIGHT * 0.45, -BRIDGE.halfZ * 0.85]}
            rotation={[0, Math.PI / 4, 0]}
          >
            <boxGeometry args={[1.3, PIER_HEIGHT * 0.7, 1.3]} />
            <meshStandardMaterial color={PALETTE.bridgeStoneDark} roughness={1} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* Side railings: top handrail + lower rail */}
      {RAIL_Z.map((rz) => (
        <group key={`rail-${rz}`}>
          <mesh castShadow position={[BRIDGE.x, RAIL_TOP_Y, rz]}>
            <boxGeometry args={[DECK_LENGTH, 0.22, 0.24]} />
            <meshStandardMaterial color={PALETTE.bridgeWood} roughness={0.9} metalness={0} />
          </mesh>
          <mesh castShadow position={[BRIDGE.x, RAIL_LOW_Y, rz]}>
            <boxGeometry args={[DECK_LENGTH, 0.16, 0.2]} />
            <meshStandardMaterial color={PALETTE.bridgeWood} roughness={0.9} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* Vertical railing posts */}
      {RAIL_Z.map((rz) =>
        postX.map((px) => (
          <mesh key={`post-${rz}-${px}`} castShadow position={[px, POST_CENTER_Y, rz]}>
            <boxGeometry args={[0.26, POST_HEIGHT, 0.26]} />
            <meshStandardMaterial color={PALETTE.bridgeWood} roughness={0.9} metalness={0} />
          </mesh>
        ))
      )}
    </group>
  );
}
