import { useSim } from "@/lib/store";
import { STAGES } from "@/lib/scenario";

export function MissionPanel() {
  const stage = useSim((s) => s.stage);
  const goNext = useSim((s) => s.goNext);
  const goPrev = useSim((s) => s.goPrev);
  const info = STAGES[stage];
  const backDisabled = info.index === 1;

  const showNext = stage !== "decision" && stage !== "debrief";
  const nextLabel =
    stage === "chokepoint" ? "המשך לבחירת ציר" : "המשך";

  return (
    <div className="panel mission-panel">
      <span className="hud-corner tl" />
      <span className="hud-corner br" />

      <div key={stage} className="fade-swap">
        <div className="mission-index">
          שלב {info.index} / 7 <span className="bar" />
        </div>
        <h2 className="mission-title">{info.title}</h2>
        <div className="mission-sub">{info.subtitle}</div>
      </div>

      <p key={"body-" + stage} className="mission-body fade-swap">
        {info.body}
      </p>

      <div className="mission-nav">
        <button className="nav-btn" disabled={backDisabled} onClick={goPrev}>
          חזור
        </button>
        {showNext && (
          <button className="nav-btn primary" onClick={goNext}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
