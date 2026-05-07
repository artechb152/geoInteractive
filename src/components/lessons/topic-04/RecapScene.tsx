'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'מסלע',                def: 'החומר המוצק שמרכיב את קרום כדור הארץ. סוג הסלע משפיע על אופי הנוף.' },
  { term: 'סלעי יסוד',           def: 'נוצרו ממאגמה. קשים מאוד (גרניט, בזלת). מבסיסים מבוצרים מצוינים.' },
  { term: 'סלעי משקע',           def: 'משכבות שנדחסו (גיר, אבן חול). רכים יותר. קל לחפור בהם מנהרות.' },
  { term: 'כוחות אנדוגניים',     def: 'כוחות מבפנים — טקטוניים. יוצרים הרים שלמים (מקרו-טופוגרפיה).' },
  { term: 'כוחות אקסוגניים',     def: 'כוחות מבחוץ — מים, רוח. מעצבים תוואי קטן (מיקרו-טופוגרפיה).' },
  { term: 'כיפה',                def: 'גבעה / הר. במפה — מעגלים סגורים. יעד קלאסי לשליטה.' },
  { term: 'שלוחה',               def: 'אזור גבוה צר וארוך שיורד מפסגה. במפה — V עם קודקוד למטה.' },
  { term: 'גיא / ואדי',          def: 'אזור נמוך בין שלוחות. במפה — V עם קודקוד למעלה. סכנת מארבים.' },
  { term: 'אוכף',                def: 'נקודת שפל בין שתי כיפות. כולם נמשכים אליו = שטח השמדה.' },
  { term: 'שקע',                 def: 'אזור סגור ונמוך. שטח מת מצוין להחבאת תותחים ומפקדות.' },
  { term: 'שטח שולט',            def: 'מקום שמי שתופס אותו רואה ויורה לכל הסביבה.' },
  { term: 'שטח חיוני',           def: 'מקום שאם תפסיד אותו — תפסיד את המשימה. לא חייב להיות גבוה.' },
  { term: 'שטח מת',              def: 'מקום שהאויב לא יכול לראות או לירות אליו. אזור בטוח.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="04.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            13 מושגים, <span className="gradient-text">דקה אחת</span>
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
            כל הכבוד · סיימת את שיעור הטופוגרפיה
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה רואה הר <span className="gradient-text">בעיניים של מפקד</span>
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
          <div className="text-xs text-fg-muted mt-0.5">סווג צורות נוף ושטח טקטי</div>
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
          <div className="text-xs text-fg-muted mt-0.5">5 שאלות קצרות</div>
        </div>
        <Icon name="arrow-left" size={18} className="text-fg-dim group-hover:text-accent transition-colors shrink-0" />
      </a>
    </motion.div>
  );
}
