/**
 * Header — כותרת המודול, תת־כותרת וכרטיס פתיחה.
 * תוכן סטטי; אין כאן מצב.
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__eyebrow">
        <span className="header__eyebrow-tick" aria-hidden="true" />
        תת־נושא 1.1 · גיאוגרפיה צבאית
      </div>

      <h1 className="header__title">רמות המלחמה והקשר המרחבי</h1>

      <p className="header__subtitle">
        כיצד משתנה ההבנה הגיאוגרפית כשעוברים מהתמונה האסטרטגית הרחבה ועד לקרב
        המגע בשטח?
      </p>

      <div className="intro-card">
        <div className="intro-card__bar" aria-hidden="true" />
        <p className="intro-card__text">
          המרחב אינו נראה אותו דבר בכל דרג. ברמה האסטרטגית הוא נתפס כזירה רחבה;
          ברמה האופרטיבית כמערכת של תנועה, מאמצים וצירי פעולה; וברמה הטקטית
          כתכסית מיידית שבה כל מטר וכל שנייה עשויים להשפיע.
        </p>
      </div>
    </header>
  )
}
