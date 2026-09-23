import { useSim } from "@/lib/store";
import { STAGE_ORDER, STAGES } from "@/lib/scenario";

export function StageStepper() {
  const stage = useSim((s) => s.stage);
  const setStage = useSim((s) => s.setStage);
  const goToDebrief = useSim((s) => s.goToDebrief);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const current = STAGES[stage].index;

  return (
    <div className="stepper">
      {STAGE_ORDER.map((s, i) => {
        const info = STAGES[s];
        const done = info.index < current;
        const active = info.index === current;
        // Guard navigation: debrief needs a chosen route so the user can never
        // land on an empty phase.
        const disabled = s === "debrief" && !selectedRoute;

        const handle = () => {
          if (s === "debrief") goToDebrief();
          else setStage(s);
        };

        return (
          <div
            key={s}
            className={"step" + (active ? " active" : "") + (done ? " done" : "")}
          >
            <button
              className="step-node"
              onClick={handle}
              disabled={disabled}
              title={`שלב ${info.index} — ${info.title}`}
              aria-label={`מעבר לשלב ${info.index}: ${info.title}`}
            >
              {done ? "✓" : info.index}
            </button>
            {i < STAGE_ORDER.length - 1 && <span className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}
