'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'מיקרו-אקלים (אקלים מקומי)',  def: 'מזג אוויר שמשתנה באזור קטן בגלל צורת השטח. למשל: עמק שלוכד לחות לעומת הר פתוח.' },
  { term: 'תחזית אזורית',        def: 'תמונת המצב הכללית. אי אפשר להסתמך רק עליה, חייבים לרדת לפרטים הקטנים של השטח עצמו.' },
  { term: 'עומס חום/קור (WBGT)',  def: 'השילוב של טמפרטורה, לחות ורוח. המדד שקובע כמה מהר הגוף יתעייף או יקרוס בשטח.' },
  { term: 'עומס חום כבד',        def: 'מצב שמחייב לשתות עד 1.5 ליטר בשעה כדי למנוע מכת חום ואובדן שיקול דעת.' },
  { term: 'היפותרמיה (מכת קור)', def: 'חום הגוף צונח מתחת ל-35 מעלות. פוגע במוח וביכולת ההחלטה עוד לפני שמרגישים בסכנה.' },
  { term: 'אפקט מקרר הרוח (Wind Chill)', def: 'הטמפרטורה שהגוף מרגיש בפועל כשיש רוח. רוח חזקה גורמת לקור להרגיש הרבה יותר גרוע.' },
  { term: 'בליעה אטמוספרית',     def: 'מצב שבו אדי מים, גשם או אבק חוסמים ("בולעים") את השדר של החיישנים ומעוורים אותם.' },
  { term: 'היעלמות תרמית (Thermal Crossover)', def: 'השעות שבהן המטרה (כמו טנק) והאדמה באותה טמפרטורה, ומצלמות החום פשוט לא רואות כלום.' },
  { term: 'הצלבת חיישנים',       def: 'השימוש בכמה סוגי טכנולוגיות יחד. כשהמצלמה מתעוורת בגלל עננים, המכ"ם מחפה עליה.' },
  { term: 'תקרת ענן',            def: 'קו הגובה שבו מתחילים עננים שמסתירים את הקרקע. קובע אילו כלי טיס יכולים לעבוד בבטחה.' },
  { term: 'MANPADS (טילי נ"מ)',  def: 'טילי כתף קטלניים שמגיעים עד לגובה של כ-5 ק"מ. הסכנה הגדולה של כלי טיס שחודרים את העננים.' },
  { term: 'כלי טיס אסטרטגיים',   def: 'לוויינים ומל"טים ענקיים. לרוב חגים הרחק מעל העננים ומוגנים מטילי כתף.' },
  { term: 'כלי טיס טקטיים',      def: 'מסוקים ורחפנים קטנים. טסים נמוך ומספקים דיוק גבוה, אבל חשופים לאש מהקרקע.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="gradient-text">דקה של קריאה</span>
          </>
        }
        intro="כל המושגים החשובים שלמדנו בחלק הזה, מסוכמים במשפט אחד פשוט לכל אחד. עברו עליהם כדי לוודא שהכל יושב טוב בראש."
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
                <div
                  className="text-sm text-fg-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: t.def }}
                />
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
            כל הכבוד · סיימתם את שיעור אקלים ומזג אוויר!
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            מעכשיו אתם מבינים שמזג אוויר הוא <span className="gradient-text">כלי נשק פעיל</span>, לא רק תפאורה.
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
          <div className="text-xs text-fg-muted mt-0.5">בואו ננתח מזג אוויר ונקבל החלטות בשטח</div>
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
          <div className="font-display font-bold leading-tight">בחינת ידע</div>
          <div className="text-xs text-fg-muted mt-0.5">כמה שאלות קצרות כדי לסגור פינה</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}