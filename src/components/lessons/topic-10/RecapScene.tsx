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
            {TERMS.length} מושגים, <span className="gradient-text">דקה אחת</span>
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

      <NextStepCard />
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
      className="mb-8 relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-bl from-accent/10 via-bg-elevated to-bg-elevated p-6 sm:p-7"
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
          <div className="relative size-14 rounded-full bg-accent flex items-center justify-center text-bg shadow-glow">
            <Icon name="check" size={28} strokeWidth={3} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
            כל הכבוד · סיימת את שיעור הלוחמה בשטח בנוי
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            מעכשיו אתה מבין שעיר היא לא רק רחובות, אלא <span className="gradient-text">קוביית רוביק תלת-ממדית</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NextStepCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="mt-10 grid sm:grid-cols-2 gap-3"
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            const practiceTab = Array.from(tabs).find((t) => t.textContent?.includes('תרגול'));
            (practiceTab as HTMLElement | undefined)?.click();
          }, 400);
        }}
        className="group surface p-5 sm:p-6 hover:border-accent/50 hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4"
      >
        <div className="size-12 rounded-xl bg-accent/10 border border-accent/40 flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
          <Icon name="spark" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">השלב הבא</div>
          <div className="font-display font-bold leading-tight">תרגול בשטח</div>
          <div className="text-xs text-fg-muted mt-0.5">בואו נראה איך אתם מנווטים ומסווגים מטרות</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            const checkTab = Array.from(tabs).find((t) => t.textContent?.includes('בדיקת ידע'));
            (checkTab as HTMLElement | undefined)?.click();
          }, 400);
        }}
        className="group surface p-5 sm:p-6 hover:border-accent/50 hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4"
      >
        <div className="size-12 rounded-xl bg-accent-cool/10 border border-accent-cool/40 flex items-center justify-center text-accent-cool shrink-0 group-hover:scale-110 transition-transform">
          <Icon name="check" size={22} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">או</div>
          <div className="font-display font-bold leading-tight">בוחן פתע קצר</div>
          <div className="text-xs text-fg-muted mt-0.5">כמה שאלות מהירות לסיכום</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}