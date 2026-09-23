import { useSim } from "@/lib/store";
import { ROUTES } from "@/lib/scenario";
import { riskClass, scoreBand } from "@/lib/format";

// Neutral accent used before a route is committed — no risk/quality grading
// leaks through colour until the player actually selects the route.
const NEUTRAL_ACCENT = "rgba(148, 173, 209, 0.9)";

export function RouteDecision() {
  const selectedRoute = useSim((s) => s.selectedRoute);
  const selectRoute = useSim((s) => s.selectRoute);
  const goToDebrief = useSim((s) => s.goToDebrief);

  return (
    <div className="panel route-panel">
      <div className="route-panel-head">
        <div>
          <div className="panel-eyebrow">בחירת ציר</div>
          <h3 className="panel-title">בחר ציר תנועה</h3>
          <div className="route-panel-hint">
            בחר ציר על בסיס המידע שאספת. הערכת הציר תיחשף לאחר הבחירה.
          </div>
        </div>
        <button
          className="btn primary"
          disabled={!selectedRoute}
          onClick={goToDebrief}
        >
          המשך לסיכום ביצוע
        </button>
      </div>

      <div className="route-cards">
        {ROUTES.map((r) => {
          const ev = r.evaluation;
          const selected = selectedRoute === r.id;
          return (
            <button
              key={r.id}
              className={"route-card neutral" + (selected ? " selected revealed" : "")}
              style={
                {
                  "--card-accent": selected ? r.color : NEUTRAL_ACCENT,
                } as React.CSSProperties
              }
              onClick={() => selectRoute(r.id)}
              aria-pressed={selected}
            >
              <div className="route-letter">{r.label}</div>
              <div className="route-name">{r.shortLabel}</div>
              <div className="route-desc">{r.description}</div>

              <div className="route-intel">
                <div className="route-intel-block known">
                  <div className="route-intel-label">מידע ידוע</div>
                  <div className="route-intel-text">{r.known}</div>
                </div>
                <div className="route-intel-block unknown">
                  <div className="route-intel-label">מידע לא ודאי</div>
                  <div className="route-intel-text">{r.unknown}</div>
                </div>
              </div>

              {selected ? (
                <div className="route-reveal">
                  <div className="route-reveal-eyebrow">הערכת הציר</div>

                  <div className="route-stats">
                    <div className="route-stat">
                      <span className="route-stat-label">רמת סיכון</span>
                      <span className={"badge " + riskClass(ev.risk)}>
                        {ev.risk}
                      </span>
                    </div>
                    <div className="route-stat">
                      <span className="route-stat-label">מהירות</span>
                      <span className="route-stat-value">{ev.speed}</span>
                    </div>
                    <div className="route-stat">
                      <span className="route-stat-label">יתרון טקטי</span>
                      <span className="route-stat-value">{ev.advantage}</span>
                    </div>
                  </div>

                  <div className="route-score">
                    <span className="route-score-num">
                      {ev.score}
                      <small>/100</small>
                    </span>
                    <span className="score-bar">
                      <span
                        className={"score-fill " + scoreBand(ev.score)}
                        style={{ width: ev.score + "%" }}
                      />
                    </span>
                  </div>

                  <div className="route-feedback">{ev.feedback}</div>
                  <div className="route-reco">{r.recommendation}</div>
                </div>
              ) : (
                <div className="route-cta neutral">בחר ציר זה</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
