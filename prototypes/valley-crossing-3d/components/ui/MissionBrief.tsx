import { useSim } from "@/lib/store";

const LEARN = [
  {
    icon: "▲",
    title: "שטח שולט",
    text: "הבנה כיצד נקודת גובה מאפשרת תצפית, שליטה והתרעה מוקדמת.",
  },
  {
    icon: "➔",
    title: "ציר תנועה",
    text: "זיהוי צירים מהירים לעומת צירים מסוכנים וחשופים.",
  },
  {
    icon: "◎",
    title: "תצפית אויב",
    text: "הבנה מאיפה האויב רואה את הכוח ומה המשמעות של תנועה תחת תצפית.",
  },
  {
    icon: "⌒",
    title: "צוואר בקבוק",
    text: "זיהוי נקודות שבהן הכוח נאלץ לעבור דרך מעבר צר ומסוכן.",
  },
];

export function MissionBrief() {
  const startMission = useSim((s) => s.startMission);

  return (
    <div className="brief-wrap">
      <div className="panel brief-panel intro-panel">
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />

        <div className="intro-head">
          <div className="brand-mark brief-mark">
            <span className="brand-mark-core" />
          </div>
          <div>
            <div className="panel-eyebrow">מערכת אימון מבצעית</div>
            <h1 className="brief-title">סימולטור ניתוח שטח טקטי</h1>
            <div className="intro-subtitle">
              למד כיצד לקרוא שטח, לזהות סכנות, להבין יתרונות גובה ולבחור ציר
              תנועה נכון.
            </div>
          </div>
        </div>

        <p className="intro-text">
          הסימולטור מציג תרחיש שבו כוח ידידותי צריך לנוע מנקודת פתיחה אל יעד
          בכפר. בדרך קיימים עמק חשוף, גשר צר, רכס אויב, שטח שולט וצירי תנועה
          שונים. המטרה שלך היא להבין את השטח לפני התנועה: איפה הכוח חשוף, מאיפה
          האויב יכול לצפות, מהו צוואר בקבוק, ואיזה ציר תנועה נותן את היתרון
          הטקטי הטוב ביותר.
        </p>

        <div className="intro-learn-title">מה תלמד בסימולטור?</div>
        <div className="intro-cards">
          {LEARN.map((c) => (
            <div key={c.title} className="intro-card">
              <span className="intro-card-icon" aria-hidden="true">
                {c.icon}
              </span>
              <div className="intro-card-title">{c.title}</div>
              <div className="intro-card-text">{c.text}</div>
            </div>
          ))}
        </div>

        <button className="btn primary brief-start" onClick={startMission}>
          התחל סימולציה
        </button>
      </div>
    </div>
  );
}
