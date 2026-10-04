'use client';

import { SceneHeader } from './SceneHeader';

const TERMS = [
  { term: 'אזימוט',                    def: 'זווית אופקית הנמדדת מכיוון הצפון עם כיוון השעון. צפון הוא 0° או 360°, ומזרח הוא 90°.' },
  { term: 'אזימוט חוזר',               def: 'הכיוון ההפוך לאזימוט נתון, בהפרש של 180°. הוא מסייע בקביעת כיוון חזרה, אך אינו מספיק לבדו לאימות המיקום.' },
  { term: 'צפון מגנטי',                def: 'הכיוון שמורה הקצה הצפוני של מחט המצפן. ההפרש בינו לצפון אמיתי משתנה לפי המקום והזמן.' },
  { term: 'צפון רשת',                  def: 'כיוון הצפון לאורך הקווים האנכיים של רשת הקואורדינטות במפה. משמש למדידת כיוונים במפת רשת.' },
  { term: 'צפון אמיתי',                def: 'הכיוון אל הקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי. משמש כייחוס גאוגרפי למדידת כיוונים.' },
  { term: 'GPS-Denied',                def: 'סביבה שבה אי אפשר להסתמך על GPS לניווט, למשל עקב שיבוש אותות או חסימת הקליטה.' },
  { term: 'סיפור דרך',                 def: 'תיאור מסודר של המסלול: כיוונים, מרחקים, סימנים צפויים בשטח ונקודות לבדיקת המיקום לאורך הדרך.' },
  { term: 'ספירת צעדים (Pacing)',      def: 'הערכת מרחק לפי מספר הצעדים הכפולים ואורך הצעד הכפול שנמדד אישית. תנאי השטח משפיעים על האומדן.' },
  { term: 'ניווט לפי טופוגרפיה',        def: 'בדיקת המיקום באמצעות השוואת צורות קרקע ועצמים מזוהים למפה. תוואי רציף, כגון דרך או ערוץ, יכול לשמש כ״מעקה״ לניווט.' },
  { term: 'ניווט עיוור (Dead Reckoning)', def: 'הערכת המיקום מתוך נקודת מוצא ידועה, כיוון התנועה והמרחק שעברנו. משלבים בדיקת סימני שטח כשניתן לזהותם.' },
  { term: 'שליטה בקצב',                def: 'התאמת קצב התנועה לשטח, לראות ולמשימה, תוך שמירה על היכולת לבדוק כיוון ומיקום.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            מושגי היסוד בניווט
          </>
        }
        intro="חזרה על המושגים המרכזיים בשיעור: קביעת כיוון, תכנון מסלול ובדיקת המיקום לאורך הדרך."
      />

      <CompletionBanner />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t, i) => (
          <div key={t.term} className="surface p-5">
            <div className="flex items-baseline gap-3">
              <span className="shrink-0 font-display text-base font-medium text-fg-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 font-display text-lg font-bold leading-snug text-fg md:text-xl">
                  {t.term}
                </div>
                <div className="text-base leading-relaxed text-fg-muted text-pretty">
                  {t.def}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompletionBanner() {
  return (
    <div className="mb-12">
      <div className="text-sm font-display font-semibold text-fg-muted">
        השלמתם את החלק הלימודי
      </div>
      <h3 className="mt-1.5 font-display text-2xl font-bold leading-tight text-fg text-balance sm:text-3xl">
        מכאן ממשיכים לתרגול ולבדיקת הידע
      </h3>
    </div>
  );
}
