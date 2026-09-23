import { useSim } from "@/lib/store";
import type { MissionStage } from "@/lib/types";

const PHASES = ["תדריך", "ניתוח", "בחירה", "סיכום"];

function phaseIndex(stage: MissionStage): number {
  if (stage === "brief") return 0;
  if (stage === "decision") return 2;
  if (stage === "debrief") return 3;
  return 1; // highground / movement / overwatch / chokepoint
}

export function MissionProgress() {
  const stage = useSim((s) => s.stage);
  const current = phaseIndex(stage);

  return (
    <div className="mphase" aria-label="התקדמות משימה">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={
            "mphase-step" +
            (i === current ? " active" : "") +
            (i < current ? " done" : "")
          }
        >
          <span className="mphase-dot" />
          <span className="mphase-name">{p}</span>
          {i < PHASES.length - 1 && (
            <span className="mphase-arrow" aria-hidden="true">
              ‹
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
