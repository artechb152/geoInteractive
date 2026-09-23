import { useSim } from "@/lib/store";
import { CameraControls } from "./CameraControls";
import { StageStepper } from "./StageStepper";
import { LayerToggles } from "./LayerToggles";

export function BottomBar() {
  const restart = useSim((s) => s.restart);

  return (
    <div className="panel bottom-bar">
      <div className="bar-group">
        <div className="bar-label">שלב משימה</div>
        <StageStepper />
      </div>

      <div className="bar-sep" />

      <div className="bar-group">
        <div className="bar-label">מצלמה</div>
        <CameraControls />
      </div>

      <div className="bar-sep" />

      <div className="bar-group">
        <div className="bar-label">שכבות</div>
        <LayerToggles />
      </div>

      <div className="bar-sep" />

      <div className="bar-group">
        <div className="bar-label">בקרה</div>
        <button
          className="icon-btn"
          onClick={restart}
          title="התחל משימה מחדש"
          aria-label="התחל משימה מחדש"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
