'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'MOUT',                  def: 'ראשי תיבות של לוחמה בשטח בנוי (לש"ב). האופן שבו צבא מנהל קרב בתוך עיר צפופה.' },
  { term: 'שבירת קווי ראייה',     def: 'בעיר אי אפשר לראות רחוק. הקרב הופך למפגש פנים-אל-פנים, והיתרון של מטוסי קרב וטנקים צונח משמעותית.' },
  { term: 'גריד עירוני',           def: 'עיר שמתוכננת כמו לוח שחמט. קל לנווט בה, אבל הרחובות הישרים והארוכים חושפים את החיילים למלכודות אש מרחוק.' },
  { term: 'קסבה / סמטאות',         def: 'מבוך של רחובות עקומים וצפופים. קל מאוד ללכת לאיבוד, וכל סיבוב פינה עלול להסתיר מארב מטווח אפס.' },
  { term: 'Enfilade',              def: '"אש לאורך הציר" (אנפילייד) – מצב קטלני שבו צלף יושב בקצה רחוב ישר ופוגע בכל מי שמנסה לעבור בו.' },
  { term: 'הממד האנכי',           def: 'מגדלים בעיר שמשמשים כ"גבעות בטון". מי ששולט בגג מקבל תצפית מעולה ויכול לירות טילי נ"ט על טנקים מלמעלה.' },
  { term: 'תת-קרקע',               def: 'עולם המנהרות והביוב. אזור שהמטוסים לא יכולים לראות וה-GPS לא קולט בו, ומשמש את האויב לתנועה חשאית ממתחת לרגליים.' },
  { term: 'GPS-Denied',            def: '"אזור ללא קליטה" – מקומות (כמו מנהרות או סמטאות צפופות) שבהם ה-GPS מת, וחייבים לנווט לפי מפות מודפסות וזיכרון.' },
  { term: 'קרב תלת-ממדי',          def: 'לחימה מכל הכיוונים במקביל: פנים-אל-פנים ברחוב, אש מגגות הבניינים מעל, ומחבלים שקופצים ממנהרות למטה.' },
  { term: 'אתר רגיש',              def: 'בתי חולים, בתי ספר, מסגדים ומתקני או"ם. מוסדות שזוכים להגנה מיוחדת ואסור לתקוף אותם סתם כך ללא הצדקה מובהקת.' },
  { term: 'Dual-Use',              def: '"שימוש כפול" – תשתית אזרחית (כמו רשת חשמל) שהאויב מנצל גם לצרכים צבאיים, מה שיוצר דילמה משפטית אם מותר להרוס אותה.' },
  { term: 'ROE',                   def: 'הוראות פתיחה באש (Rules of Engagement). החוקים הנוקשים שקובעים לחייל בדיוק מתי, איפה ועל מי מותר לו לירות.' },
  { term: 'ציר הומניטרי',          def: 'כביש מאובטח שנפתח לזמן קצוב. מאפשר לאזרחים לברוח מאזור הלחימה ולהכניס אליהם אוכל, מים ותרופות.' },
  { term: 'ניצול ציני',            def: 'טקטיקה שבה האויב ממקם מפקדות ונשק בכוונה ליד אזרחים (מגן אנושי), כדי שהצבא יימנע מלתקוף אותו.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="text-accent-hover">דקה אחת</span>
          </>
        }
        intro="הנה כל המושגים המרכזיים שעברנו עליהם, מתומצתים לשורה אחת נטולת בולשיט כדי שישבו טוב בראש."
      />

      <CompletionBanner />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t, i) => (
          <motion.div
            key={t.term}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            className="surface p-5 relative overflow-hidden"
          >
            <div aria-hidden className="absolute -end-8 -top-8 size-20 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <span className="font-mono text-xs text-accent mt-1 shrink-0">
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
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="size-14 rounded-full bg-accent/20 absolute inset-0"
          />
          <div className="relative size-14 rounded-full bg-accent flex items-center justify-center text-bg-elevated">
            <Icon name="check" size={28} strokeWidth={3} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
            כל הכבוד · סיימת את שיעור הלוחמה בשטח בנוי
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            מעכשיו אתה מבין שעיר היא לא רק רחובות, אלא <span className="text-accent-hover">קוביית רוביק תלת-ממדית</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
