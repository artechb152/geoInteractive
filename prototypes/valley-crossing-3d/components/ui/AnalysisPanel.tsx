import { useState } from "react";
import { useSim } from "@/lib/store";
import {
  ELEMENT_MAP,
  INTEL_ACTIONS,
  KEY_CONCEPTS,
  ROUTE_MAP,
  SITUATIONS,
  STAGES,
  STAGE_GUIDE,
} from "@/lib/scenario";
import { elementKindColor } from "@/lib/style";
import { riskClass, scoreBand } from "@/lib/format";
import { RouteMetricsList } from "./MetricBar";

function GuideSection({ label, text }: { label: string; text: string }) {
  return (
    <div className="guide-section">
      <div className="guide-label">{label}</div>
      <div className="guide-text">{text}</div>
    </div>
  );
}

export function AnalysisPanel() {
  const stage = useSim((s) => s.stage);
  const selectedElement = useSim((s) => s.selectedElement);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const setSel = useSim((s) => s.setSelectedElement);
  const guidedMode = useSim((s) => s.guidedMode);
  const toggleGuided = useSim((s) => s.toggleGuided);
  const situationId = useSim((s) => s.situationId);
  const actionPoints = useSim((s) => s.actionPoints);
  const scoutedActions = useSim((s) => s.scoutedActions);
  const findings = useSim((s) => s.findings);
  const performScout = useSim((s) => s.performScout);
  const [openConcept, setOpenConcept] = useState<string | null>(null);

  const situation = SITUATIONS[situationId];

  const el = selectedElement ? ELEMENT_MAP[selectedElement] : null;
  const showRouteEval =
    !el && !!selectedRoute && (stage === "decision" || stage === "debrief");
  const route = showRouteEval && selectedRoute ? ROUTE_MAP[selectedRoute] : null;
  const guide = STAGE_GUIDE[stage];

  let contextTitle: string;
  let contextSub: string;
  let key: string;
  if (el) {
    contextTitle = el.name;
    contextSub =
      el.kind === "enemy"
        ? "עמדת אויב"
        : el.kind === "objective"
          ? "יעד המשימה"
          : el.kind === "friendly"
            ? "שטח מפתח ידידותי"
            : "מאפיין שטח";
    key = "el-" + el.id;
  } else if (route) {
    contextTitle = route.shortLabel;
    contextSub = "הערכת ציר";
    key = "rt-" + route.id;
  } else {
    contextTitle = STAGES[stage].title;
    contextSub = `מודיעין שלב ${STAGES[stage].index}`;
    key = "st-" + stage;
  }

  const kindColor = el ? elementKindColor(el.kind) : "";
  const kindLabel = el
    ? el.kind === "enemy"
      ? "אויב"
      : el.kind === "friendly"
        ? "ידידותי"
        : el.kind === "objective"
          ? "יעד"
          : "ניטרלי"
    : "";

  return (
    <div className="panel analysis-panel">
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />

      <div className="analysis-head">
        <div className="panel-eyebrow">תמצית מודיעין</div>
        <button
          className={"guided-toggle" + (guidedMode ? " on" : "")}
          onClick={toggleGuided}
          aria-pressed={guidedMode}
          title="מצב הסבר מודרך"
        >
          <span className="guided-knob" />
          מצב מודרך
        </button>
      </div>

      <h3 className="analysis-context">{contextTitle}</h3>
      <div className="analysis-contextsub">{contextSub}</div>

      <div className="analysis-scroll">
        <div key={key + (guidedMode ? "-g" : "")} className="fade-swap">
          {el ? (
            <div className="info-card">
              <span className="info-kind" style={{ color: kindColor }}>
                <span className="dot" style={{ background: kindColor }} />
                {kindLabel}
              </span>
              <div className="info-role" style={{ color: kindColor }}>
                {el.role}
              </div>
              <p className="info-summary">{el.summary}</p>
              <div className="intel-label">הערכה</div>
              <ul className="info-list">
                {el.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              <button
                className="btn ghost clear-btn"
                onClick={() => setSel(null)}
              >
                נקה בחירה
              </button>
            </div>
          ) : route ? (
            <div className="mini-eval">
              <div className="mini-eval-head">
                <div className="mini-eval-score">
                  {route.evaluation.score}
                  <small>/100</small>
                </div>
                <div className="mini-eval-bar">
                  <span className={"badge " + riskClass(route.evaluation.risk)}>
                    רמת סיכון: {route.evaluation.risk}
                  </span>
                  <div className="score-bar">
                    <span
                      className={"score-fill " + scoreBand(route.evaluation.score)}
                      style={{ width: route.evaluation.score + "%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="intel-label">מדדים טקטיים</div>
              <RouteMetricsList metrics={route.metrics} />
              <div className="intel-label">השפעות שטח עיקריות</div>
              <ul className="info-list">
                {route.interactions.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
              <div className="intel-label">המלצה</div>
              <div className="reco-box">{route.recommendation}</div>
              <div className="intel-label">הערכת שדה</div>
              <div className="eval-feedback">{route.evaluation.feedback}</div>
            </div>
          ) : (
            <div className="intel-section">
              <div className="situation-card">
                <div className="situation-eyebrow">
                  <span className="dot" />
                  גורם מצב
                </div>
                <div className="situation-name">{situation.label}</div>
                <p className="situation-text">{situation.text}</p>
              </div>

              {stage !== "debrief" && (
                <div className="intel-gather">
                  <div className="intel-gather-head">
                    <div className="intel-gather-title">
                      איסוף מידע לפני החלטה
                    </div>
                    <div className="intel-points">
                      נותרו פעולות מודיעין:{" "}
                      <strong>{actionPoints}</strong>
                    </div>
                  </div>

                  <div className="intel-actions">
                    {INTEL_ACTIONS.map((a) => {
                      const done = scoutedActions.includes(a.id);
                      const locked = !done && actionPoints <= 0;
                      return (
                        <button
                          key={a.id}
                          className={
                            "intel-action" +
                            (done ? " done" : locked ? " locked" : "")
                          }
                          disabled={done || locked}
                          onClick={() => performScout(a.id)}
                        >
                          <span className="intel-action-label">{a.label}</span>
                          <span className="intel-action-state">
                            {done ? "✓" : locked ? "—" : "›"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="intel-label">
                    ממצאים שהתגלו
                    <span className="findings-count">{findings.length}</span>
                  </div>
                  {findings.length ? (
                    <ul className="findings-list">
                      {findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="findings-empty">
                      טרם נאסף מידע. בחר פעולת מודיעין כדי לחשוף את השטח.
                    </div>
                  )}
                </div>
              )}

              <GuideSection label="מה רואים עכשיו?" text={guide.see} />
              {guidedMode && (
                <>
                  <GuideSection label="למה זה חשוב?" text={guide.why} />
                  <GuideSection label="מה לשים לב אליו?" text={guide.watch} />
                </>
              )}

              <div className="intel-hint">
                <span className="dot" />
                לחץ על מאפיין שטח מודגש בתצוגה התלת-ממדית — גבעה, ציר העמק, גשר,
                רכס, כפר או מעבר צדדי — כדי לקרוא את הערכתו הטקטית.
              </div>

              <div className="intel-label">מושגים מרכזיים</div>
              <div className="concepts">
                {KEY_CONCEPTS.map((c) => (
                  <button
                    key={c.id}
                    className={
                      "concept-chip" + (openConcept === c.id ? " open" : "")
                    }
                    onClick={() =>
                      setOpenConcept(openConcept === c.id ? null : c.id)
                    }
                    aria-expanded={openConcept === c.id}
                  >
                    {c.term}
                  </button>
                ))}
              </div>
              {openConcept && (
                <div className="concept-explain">
                  {KEY_CONCEPTS.find((c) => c.id === openConcept)?.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
