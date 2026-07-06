'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'אזימוט',                    def: 'זווית במעלות (0–360) שאומרת באיזה כיוון בדיוק ללכת מצפון.' },
  { term: 'אזימוט חוזר',               def: 'הכיוון ההפוך — לחזור משם שהגעת. מוסיפים/מחסרים 180°.' },
  { term: 'צפון מגנטי',                def: 'הכיוון שאליו מצביע המצפן. זז כל שנה — לא בדיוק "צפון אמיתי".' },
  { term: 'צפון רשת',                  def: 'הצפון לפי הקווים האנכיים על המפה. הכיוון שכל הרשת מתבססת עליו.' },
  { term: 'צפון אמיתי',                def: 'ציר הסיבוב של כדור הארץ. שם נמצא כוכב הצפון.' },
  { term: 'GPS-Denied',                def: 'מצב שבו אין GPS — האויב משבש, או נמצאים מתחת לאדמה.' },
  { term: 'סיפור דרך',                 def: 'תוכנית מסלול כתובה מראש: מה רואים בכל שלב, ובאיזה סדר.' },
  { term: 'ספירת צעדים (Pacing)',      def: 'מודדים מרחק על ידי ספירת זוגות צעדים × אורך הצעד.' },
  { term: 'הליכת מעקה (Handrailing)',  def: 'הולכים במקביל לתוואי בולט (נחל, רכס) במקום בקו ישר.' },
  { term: 'ניווט עיוור (Dead Reckoning)', def: 'אזימוט + צעדים בלבד, בלי לראות שטח. לסערות חול וערפל.' },
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
            11 מושגים, <span className="gradient-text">דקה אחת</span>
          </>
        }
        intro="כל מה שעברנו בשיעור — בהגדרה אחת קצרה לכל מושג."
      />

      <CompletionBanner />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t, i) => (
          <motion.div
            key={t.term}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="surface p-5 relative overflow-hidden"
          >
            <div aria-hidden className="absolute -end-8 -top-8 size-20 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <span className="font-display font-medium tracking-wide text-xs text-accent mt-1 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold mb-1 leading-tight">
                  {t.term}
                </div>
                <div className="text-sm text-fg-muted leading-relaxed">
                  {t.def}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CompletionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-8 relative overflow-hidden rounded-[4px] border border-accent/30 bg-gradient-to-bl from-accent/10 via-bg-elevated to-bg-elevated p-6 sm:p-7"
    >
      <div className="absolute -end-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute -start-16 -bottom-16 size-48 rounded-full bg-accent-cool/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <Icon name="check" size={48} strokeWidth={3} className="text-accent shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
            כל הכבוד · סיימת את שיעור הניווטים
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה יודע <span className="gradient-text">להגיע ליעד גם בלי GPS</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
