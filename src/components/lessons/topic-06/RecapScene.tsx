'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'קו ראייה (LOS)',           def: 'קו ישר בין נקודת תצפית (עין / חיישן) למטרה. הבסיס המתמטי לראייה בקרב.' },
  { term: 'שבירת LOS',                def: 'חיתוך הקו ע"י תבליט (הר) או תכסית (עץ / בניין). המטרה הופכת מוסתרת.' },
  { term: 'תבליט',                    def: 'פני הקרקע — רכס, גבעה, קפל. שובר LOS "קשה" וגיאומטרי.' },
  { term: 'תכסית',                    def: 'מבנים וצמרות עצים. שובר LOS "רך" אבל יכול להיות זמני.' },
  { term: 'קו נראות הדדית',           def: 'הקו שבו המטרה הופכת פתאום נראית. מתג, לא הדרגתיות.' },
  { term: 'שטח מת (Dead Space)',     def: 'אזור שמוסתר מנקודת תצפית בגלל רכס או תכסית. מסתור אידיאלי.' },
  { term: 'DEM',                      def: 'מודל גבהים ספרתי — ייצוג דיגיטלי תלת-ממדי של פני השטח לחישובי GIS.' },
  { term: 'Viewshed',                 def: 'אלגוריתם שצובע כל פיקסל ירוק (מואר) או אדום (מת) מנקודה.' },
  { term: 'Cumulative Viewshed',      def: 'כיסוי קולקטיבי של מספר תצפיתנים. מאתר "פערי כיסוי" — נתיבי חדירה.' },
  { term: 'Least-Cost Path',          def: 'נתיב שעוקף רכסים תלולים ונצמד לשטחים מתים. "מודל הזרימה".' },
  { term: 'Kill Chain',               def: '4 שלבים: איתור → נעילה → שיגור → פגיעה. כל אחד תלוי ב-LOS.' },
  { term: 'נעילה ויזואלית',           def: 'חימוש מונחה לייזר/וידאו דורש קשר עין רציף מתחילת המעוף לסוף.' },
  { term: 'BDA',                      def: 'Battle Damage Assessment — הערכת נזק אחרי הפגיעה. דורש LOS חדש.' },
  { term: 'מרחב כיסוי רציף',          def: 'תא שטח שבו בכל רגע נתון מישהו רואה כל אובייקט בתוכו.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="06.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="gradient-text">דקה אחת</span>
          </>
        }
        intro="כל המושגים שעברנו בשיעור — בהגדרה אחת קצרה לכל אחד. רחף כדי לראות את ההגדרה."
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
            className="surface p-5 group hover:border-accent/40 hover:shadow-elevated transition-all duration-300 relative overflow-hidden"
          >
            <div aria-hidden className="absolute -end-8 -top-8 size-20 rounded-full bg-accent/5 group-hover:bg-accent/10 blur-2xl transition-colors pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <span className="font-mono text-xs text-accent mt-1 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold mb-1 leading-tight group-hover:text-accent transition-colors">
                  {t.term}
                </div>
                <div className="text-sm text-fg-muted opacity-70 group-hover:opacity-100 transition-opacity leading-relaxed">
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
          <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
            כל הכבוד · סיימת את שיעור קווי הראייה
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה רואה שדה קרב <span className="gradient-text">בעיניים של מתכנן Kill Chain</span>
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
          <div className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">השלב הבא</div>
          <div className="font-display font-bold leading-tight">תרגול אינטראקטיבי</div>
          <div className="text-xs text-fg-muted mt-0.5">ניתוח LOS וסימון שטחים מתים</div>
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
          <div className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">או</div>
          <div className="font-display font-bold leading-tight">בדיקת ידע</div>
          <div className="text-xs text-fg-muted mt-0.5">שאלות קצרות לסיכום</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}
