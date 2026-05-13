'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'גיאו-כלכלה',           def: 'הצומת בין גיאוגרפיה לכלכלה כזירת עימות אסטרטגי. במאה ה-21 — לב הסכסוכים.' },
  { term: 'הידרו-פוליטיקה',       def: 'מאבק פוליטי-צבאי על שליטה במקורות מים. מי שיושב במעלה הזרם — שולט במורד.' },
  { term: 'סכר הרנסנס',           def: 'סכר אתיופי על הנילוס הכחול. איום קיומי על מצרים שתלויה ב-95% מימי הנילוס.' },
  { term: 'אנרגיה כנשק',          def: 'OPEC 1973 / Nord Stream 2022 — נפט וגז כאמצעי לחץ פוליטי.' },
  { term: 'עמקי מימן',             def: 'אזורים מתוכננים לייצור מימן ירוק. ישראל בנגב, אוסטרליה. ביזור אנרגטי.' },
  { term: 'נקודת חנק ימית',       def: 'מיצר ים צר שעובר דרכו חלק משמעותי מהסחר העולמי. נקודת תורפה אסטרטגית.' },
  { term: 'מיצרי הורמוז',         def: 'בין איראן לעומאן. 21% מהנפט העולמי. סיכון איראני קבוע.' },
  { term: 'בב אל-מנדב',            def: 'הכניסה לים סוף. החות\'ים שיתקו את המעבר ב-2023–24 ברקטות בסיסיות.' },
  { term: 'מיצרי מלאקה',           def: '30% מהסחר העולמי. סין רואה בה "Malacca Dilemma" — תלות קיומית.' },
  { term: 'תעלת סואץ',            def: '12% מהסחר העולמי. אירוע "Ever Given" 2021 הוכיח את שבריריותה.' },
  { term: 'SLOC',                  def: 'Sea Lines of Communication — נתיבי תקשורת ומסחר ימיים. אבטחתם = תפקיד הצי.' },
  { term: 'דוקטרינת מהן',         def: 'אלפרד תייר מהן, 1890. שולט בים = שולט בעולם. עדיין מנהלת אסטרטגיה ב-2026.' },
  { term: '4 עמודי תווי הים',      def: 'צי קרבי + בסיסים קדמיים + SLOC מאובטח + בריתות חוף.' },
  { term: 'Belt and Road',         def: 'אסטרטגיית סין לקניית נמלים ובסיסים בכל העולם — מהן בגרסה סינית.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="09.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="gradient-text">דקה אחת</span>
          </>
        }
        intro="כל המושגים שעברנו בשיעור — בהגדרה אחת קצרה לכל אחד."
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
            whileHover={{ x: -4 }}
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
            כל הכבוד · סיימת את שיעור הגיאו-כלכלה
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה רואה מפת עולם <span className="gradient-text">בעיניים אסטרטגיות</span>
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
          <div className="font-display font-bold leading-tight">תרגול אינטראקטיבי</div>
          <div className="text-xs text-fg-muted mt-0.5">ניתוח נקודות חנק ומשאבים</div>
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
          <div className="font-display font-bold leading-tight">בדיקת ידע</div>
          <div className="text-xs text-fg-muted mt-0.5">שאלות קצרות לסיכום</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}
