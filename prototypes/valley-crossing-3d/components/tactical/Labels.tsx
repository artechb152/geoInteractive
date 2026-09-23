import { Html } from "@react-three/drei";
import { onTerrain } from "@/lib/terrain";
import { MAP_LABELS, STAGE_MAP_LABELS } from "@/lib/scenario";
import { useSim } from "@/lib/store";

export function Labels() {
  const labelsOn = useSim((s) => s.layers.labels);
  const stage = useSim((s) => s.stage);
  const missionStarted = useSim((s) => s.missionStarted);
  // Hide all floating 3D labels while the intro is up or during the debrief
  // modal, so they never bleed through on top of full-screen overlays.
  const showSceneLabels = missionStarted && stage !== "debrief";
  if (!labelsOn || !showSceneLabels) return null;

  // Stage-specific subset keeps floating labels minimal and avoids collisions
  // with the squad / observation / zone labels.
  const allowed = STAGE_MAP_LABELS[stage];
  const labels = MAP_LABELS.filter((l) => allowed.includes(l.id));

  return (
    <>
      {labels.map((l) => {
        const offset =
          l.kind === "structure"
            ? 6
            : l.kind === "enemy"
              ? 12
              : l.kind === "objective"
                ? 7
                : 10;
        const kindClass =
          l.kind === "enemy"
            ? "enemy"
            : l.kind === "objective"
              ? "objective"
              : l.kind === "structure"
                ? "structure"
                : l.kind === "route"
                  ? "route"
                  : "";
        return (
          <Html
            key={l.id}
            position={onTerrain(l.position[0], l.position[1], offset)}
            center
            distanceFactor={150}
            zIndexRange={[8, 0]}
          >
            <div className={("map-label " + kindClass).trim()}>{l.text}</div>
          </Html>
        );
      })}
    </>
  );
}
