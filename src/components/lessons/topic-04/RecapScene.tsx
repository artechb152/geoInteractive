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
          <div className="relative size-14 rounded-full bg-accent flex items-center justify-center text-bg-elevated">
            <Icon name="check" size={28} strokeWidth={3} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
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
