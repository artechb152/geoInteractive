'use client';

import { SceneHeader } from './SceneHeader';

const TERMS = [
  { term: 'אזימוט',                    def: 'זווית במעלות (0–360) שאומרת באיזה כיוון בדיוק ללכת מצפון.' },
  { term: 'אזימוט חוזר',               def: 'הכיוון ההפוך — לחזור משם שהגעת. מוסיפים/מחסרים 180°.' },
  { term: 'צפון מגנטי',                def: 'הכיוון שאליו מצביע המצפן. זז כל שנה — לא בדיוק "צפון אמיתי".' },
  { term: 'צפון רשת',                  def: 'הצפון לפי הקווים האנכיים על המפה. הכיוון שכל הרשת מתבססת עליו.' },
  { term: 'צפון אמיתי',                def: 'ציר הסיבוב של כדור הארץ. שם נמצא כוכב הצפון.' },
  { term: 'GPS-Denied',                def: 'מצב שבו אין GPS — האויב משבש, או נמצאים מתחת לאדמה.' },
  { term: 'סיפור דרך',                 def: 'תוכנית מסלול כתובה מראש: מה רואים בכל שלב, ובאיזה סדר.' },
  { term: 'ספירת צעדים (Pacing)',      def: 'מודדים מרחק על ידי ספירת זוגות צעדים × אורך הצעד.' },
  { term: 'ניווט לפי טופוגרפיה ("מעקה")', def: 'מתקדמים מסימן לסימן בשטח — כיפות (תבליט), כפר (תכסית) — ומוודאים מיקום בכל אחד.' },
  { term: 'ניווט עיוור (Dead Reckoning)', def: 'לא רואים כלום ואין במה להיאחז: מחשבים אזימוט ומרחק, והולכים לפי מצפן וספירת צעדים.' },
  { term: 'שליטה בקצב',                def: 'קצב איטי ומאובטח בשטח חשוף, מהיר ורציף בשטח מוסתר.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            11 מושגים, דקה אחת
          </>
        }
        intro="כל מה שעברנו בשיעור — בהגדרה אחת קצרה לכל מושג."
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
        כל הכבוד · סיימת את שיעור הניווטים
      </div>
      <h3 className="mt-1.5 font-display text-2xl font-bold leading-tight text-fg text-balance sm:text-3xl">
        עכשיו אתה יודע להגיע ליעד גם בלי GPS
      </h3>
    </div>
  );
}
