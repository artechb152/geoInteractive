import { useSim } from "@/lib/store";
import { INTEL_BUDGET, ROUTE_MAP, ROUTES } from "@/lib/scenario";
import { riskClass, scoreColor } from "@/lib/format";
import { RouteMetricsList } from "./MetricBar";
import type { RouteMetrics, ScoutId } from "@/lib/types";

// How each scouting action reads back in the debrief — what it told the player.
const SCOUT_DONE: Record<ScoutId, string> = {
  hill: "התצפית מהגבעה חשפה את מידת החשיפה בעמק לפני ההחלטה.",
  ridge: "סריקת הרכס עזרה להבין מאיפה האויב שולט על הציר.",
  bridge: "בדיקת הגשר חשפה את צוואר הבקבוק שמגביל תמרון.",
  side: "בדיקת המעבר הצדדי חשפה חלופה מוסתרת חלקית.",
  civilians: "המידע מהאזרחים בכפר סיפק רמז על תנועה ליד הגשר.",
};

// ...and what staying blind to it cost.
const SCOUT_MISS: Record<ScoutId, string> = {
  hill: "לא בוצעה תצפית מהגבעה — חשיפת העמק נותרה לא ודאית.",
  ridge: "רכס האויב לא נסרק — שליטת האויב על הציר לא אומתה.",
  bridge: "הגשר לא נבדק — צוואר הבקבוק נותר נעלם בזמן ההחלטה.",
  side: "המעבר הצדדי לא נבדק — לא נודע אם קיימת חלופה מוסתרת.",
  civilians: "האזרחים בכפר לא תושאלו — מידע מקומי על הגשר לא נאסף.",
};

// Ordered by tactical importance so the lists read most-significant first.
const SCOUT_ORDER: ScoutId[] = ["ridge", "bridge", "hill", "side", "civilians"];

// Thresholds mirror the MetricBar colour bands so a bullet never contradicts a
// bar: "good" metrics are strengths at >=70 (green) and weaknesses at <40 (red);
// "risk" metrics are strengths at <40 (green) and weaknesses at >=70 (red).
function strengthsOf(m: RouteMetrics): string[] {
  const out: string[] = [];
  if (m.speed >= 70) out.push("קצב תנועה מהיר.");
  if (m.visibility >= 70) out.push("מספק תצפית חזקה.");
  if (m.advantage >= 70) out.push("יתרון טקטי גבוה.");
  if (m.exposure < 40) out.push("שומר על חשיפה נמוכה.");
  if (m.chokeRisk < 40) out.push("עוקף את צוואר הבקבוק בגשר.");
  return out;
}

function weaknessesOf(m: RouteMetrics): string[] {
  const out: string[] = [];
  if (m.exposure >= 70) out.push("חשוף מאוד לתצפית אויב.");
  if (m.chokeRisk >= 70) out.push("פגיע בצוואר הבקבוק בגשר.");
  if (m.speed < 40) out.push("קצב תנועה איטי.");
  if (m.visibility < 40) out.push("מספק תצפית מועטה על השטח.");
  if (m.advantage < 40) out.push("יתרון טקטי מוגבל.");
  return out;
}

export function Debrief() {
  const selectedRoute = useSim((s) => s.selectedRoute);
  const scoutedActions = useSim((s) => s.scoutedActions);
  const tryAnother = useSim((s) => s.tryAnotherRoute);
  const restart = useSim((s) => s.restart);

  if (!selectedRoute) return null;

  const route = ROUTE_MAP[selectedRoute];
  const ev = route.evaluation;
  const strengths = strengthsOf(route.metrics);
  const weaknesses = weaknessesOf(route.metrics);

  const gathered = SCOUT_ORDER.filter((id) => scoutedActions.includes(id));
  const missed = SCOUT_ORDER.filter((id) => !scoutedActions.includes(id));

  const best = ROUTES.reduce((a, b) =>
    b.evaluation.score > a.evaluation.score ? b : a
  );

  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ev.score / 100);

  return (
    <div className="debrief-wrap">
      <div className="panel debrief-panel">
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />

        <div className="debrief-head">
          <div className="debrief-score-ring">
            <svg width="104" height="104">
              <circle
                cx="52"
                cy="52"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
              />
              <circle
                cx="52"
                cy="52"
                r={r}
                fill="none"
                stroke={scoreColor(ev.score)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div className="debrief-score-val">{ev.score}</div>
              <div className="debrief-score-lbl">ציון</div>
            </div>
          </div>
          <div className="debrief-head-text">
            <div className="panel-eyebrow">סיכום ביצוע</div>
            <h2 className="debrief-route">{route.shortLabel}</h2>
            <div className="debrief-badges">
              <span className={"badge " + riskClass(ev.risk)}>סיכון: {ev.risk}</span>
              <span className="debrief-meta">מהירות: {ev.speed}</span>
              <span className="debrief-meta">יתרון: {ev.advantage}</span>
            </div>
          </div>
        </div>

        <div className="debrief-section-label">מדדים טקטיים</div>
        <RouteMetricsList metrics={route.metrics} />

        <div className="debrief-cols">
          <div>
            <div className="debrief-section-label good">חוזקות</div>
            <ul className="assess-list good">
              {strengths.length ? (
                strengths.map((s, i) => <li key={i}>{s}</li>)
              ) : (
                <li>אין חוזקות בולטות.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="debrief-section-label bad">חולשות</div>
            <ul className="assess-list bad">
              {weaknesses.length ? (
                weaknesses.map((w, i) => <li key={i}>{w}</li>)
              ) : (
                <li>אין חולשות משמעותיות.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="debrief-section-label">
          מודיעין שנאסף לפני ההחלטה
        </div>
        <div className="debrief-intel-summary">
          נוצלו {scoutedActions.length} מתוך {INTEL_BUDGET} פעולות מודיעין.
        </div>
        <div className="debrief-cols">
          <div>
            <div className="debrief-section-label good">מה נחקר</div>
            <ul className="assess-list good">
              {gathered.length ? (
                gathered.map((id) => <li key={id}>{SCOUT_DONE[id]}</li>)
              ) : (
                <li>לא בוצעה כל פעולת מודיעין לפני ההחלטה.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="debrief-section-label bad">מה לא נבדק</div>
            <ul className="assess-list bad">
              {missed.length ? (
                missed.map((id) => <li key={id}>{SCOUT_MISS[id]}</li>)
              ) : (
                <li>כל מקורות המידע נבדקו.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="debrief-section-label">המלצה סופית</div>
        <div className="debrief-rec">
          {route.recommendation}
          {route.id !== best.id && (
            <>
              {" "}
              הציר בעל הציון הגבוה ביותר: <strong>{best.shortLabel}</strong> (
              {best.evaluation.score}/100).
            </>
          )}
        </div>

        <div className="debrief-actions">
          <button className="btn ghost" onClick={tryAnother}>
            נסה ציר אחר
          </button>
          <button className="btn primary" onClick={restart}>
            נסה שוב עם מידע אחר
          </button>
        </div>
      </div>
    </div>
  );
}
