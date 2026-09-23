import { useSim } from "@/lib/store";
import { CAMERA_VIEWS } from "@/lib/scenario";
import type { CameraMode } from "@/lib/types";

const ORDER: CameraMode[] = [
  "strategic",
  "soldier",
  "highground",
  "overwatch",
  "chokepoint",
  "route",
];

export function CameraControls() {
  const cameraMode = useSim((s) => s.cameraMode);
  const setMode = useSim((s) => s.setCameraMode);

  return (
    <div className="cam-row">
      {ORDER.map((m) => {
        const v = CAMERA_VIEWS[m];
        return (
          <button
            key={m}
            className={"cam-btn" + (cameraMode === m ? " active" : "")}
            onClick={() => setMode(m)}
            title={`${v.label} — ${v.teach}`}
            aria-label={v.label}
            aria-pressed={cameraMode === m}
          >
            <span className="cam-icon" aria-hidden="true">
              {v.icon}
            </span>
            <span>{v.short}</span>
          </button>
        );
      })}
      <button
        className="cam-btn cam-reset"
        onClick={() => setMode("strategic")}
        title="איפוס מבט — חזרה למבט האסטרטגי"
        aria-label="איפוס מבט לאסטרטגי"
      >
        <span className="cam-icon" aria-hidden="true">
          ↺
        </span>
        <span>איפוס</span>
      </button>
    </div>
  );
}
