'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'קו ראייה (LOS)',           def: 'הקו הדמיוני והישר שמחבר בין התצפיתן למטרה. זה הבסיס לכל מה שאנחנו רואים (או לא רואים) בשטח.' },
  { term: 'שבירת LOS / חסימת ראייה',    def: 'מצב שבו הר, עץ או בניין חותכים את קו הראייה שלנו, ומסתירים מאיתנו את המטרה לחלוטין.' },
  { term: 'תבליט',                    def: 'תוואי השטח הטבעי (הרים, גבעות, עמקים). אלו המכשולים הקשים והקבועים ביותר שחוסמים לנו את הראייה.' },
  { term: 'תכסית',                    def: 'כל מה שמכסה את הקרקע (בניינים, יערות, פרדסים). אלו מכשולים שיכולים להסתיר אותנו, ולפעמים אפשר גם לעקוף או להרוס אותם.' },
  { term: 'קו נראות הדדית',           def: 'הנקודה המדויקת בפסגת הר שבה עוברים מהסתרה מוחלטת לחשיפה מלאה מול האויב. עובד ממש כמו מתג של אור.' },
  { term: 'שטח מת (Dead Space)',     def: 'אזור שלגמרי מוסתר מהעיניים שלנו בגלל הר או בניין שמפריעים. המקום המושלם עבור האויב להתחבא בו.' },
  { term: 'מודל גבהים (DEM)',        def: 'מפה תלת-ממדית בתוך המחשב, שבה לכל נקודה ופיקסל בשטח יש גובה משלו.' },
  { term: 'ניתוח ראות (Viewshed)',   def: 'אלגוריתם שבודק מה אפשר לראות מנקודה מסוימת. צובע בירוק את מה שגלוי, ובאדום את מה שמוסתר.' },
  { term: 'ראות מצטברת (Cumulative)', def: 'חיבור של כמה תצפיות יחד כדי לבדוק את כל הכיסוי שלנו, ולמצוא "אזורים עיוורים" שאף אחד לא מסתכל עליהם.' },
  { term: 'מסלול חסכוני (Least-Cost Path)', def: 'המסלול שהכי קל פיזית ללכת בו, שגם מנצל "שטחים מתים" כדי שנוכל להתגנב בלי שיתפסו אותנו.' },
  { term: 'שרשרת התקיפה (Kill Chain)', def: '4 שלבי חובה (איתור, נעילה, שיגור, בדיקת פגיעה) שכל אחד מהם חייב קו ראייה פתוח כדי להצליח.' },
  { term: 'נעילה ויזואלית',           def: 'מצב שבו טיל חכם או מצלמה "ננעלים" על המטרה, וחייבים לראות אותה ברצף בלי שום הסתרה עד רגע הפגיעה.' },
  { term: 'בדיקת תוצאות (BDA)',       def: 'השלב שלאחר התקיפה, שבו משיגים קו ראייה חדש (למשל עם רחפן) כדי לוודא שהמטרה באמת הושמדה.' },
  { term: 'מרחב כיסוי רציף',          def: 'אזור שיש עליו מעקב מוחלט של מצלמות וחיישנים, כך שאי אפשר להתחבא בו או לחמוק ממנו.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="06.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים שחובה להכיר, <span className="gradient-text">בדקה אחת</span>
          </>
        }
        intro="ריכזנו עבורכם את כל המושגים המרכזיים שלמדנו, עם הגדרה אחת קצרה וברורה לכל מושג. עברו עם העכבר כדי לקרוא."
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
            כל הכבוד! · סיימתם את שיעור קווי הראייה
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתם מסתכלים על השטח ממש כמו <span className="gradient-text">מנתחי מודיעין</span>
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
          <div className="text-xs text-fg-muted mt-0.5">בואו ננתח יחד קווי ראייה ונסמן שטחים מתים</div>
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
          <div className="text-xs text-fg-muted mt-0.5">כמה שאלות קצרות לוודא שהכל מובן</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}