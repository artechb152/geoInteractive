'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'רמות המלחמה',         def: 'אסטרטגית · אופרטיבית · טקטית — אותה מלחמה ברזולוציה אחרת.' },
  { term: 'הרמה האסטרטגית',      def: 'מטכ״ל ודרג מדיני — זירות, בריתות, חלוקת משאבים לאומית.' },
  { term: 'הרמה האופרטיבית',     def: 'פיקוד מרחב / גיס — מערכות, מסדרונות תמרון, צורות קרב.' },
  { term: 'הרמה הטקטית',         def: 'דרג קרבי — Micro-geography, מרחק במטרים, זמן בשניות.' },
  { term: 'MDO',                  def: 'סנכרון 5 ממדים: יבשה, אוויר, ים, חלל, סייבר.' },
  { term: 'עליונות מרחבית',      def: 'מצב שבו האויב לא יכול לנוע, לראות או לתקשר באותו מרחב.' },
  { term: 'לחימה אסימטרית',      def: 'עימות בין צד חזק (צבא סדיר) לצד חלש (גרילה / טרור).' },
  { term: '3 עמודי הצד החלש',    def: 'ספיגה והתמדה · הרתעה אסימטרית · התשה.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            8 מושגים, <span className="gradient-text">דקה אחת</span>
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
            transition={{ delay: i * 0.05, duration: 0.4 }}
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
        <Icon name="check" size={48} strokeWidth={3} className="text-accent shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
            כל הכבוד · סיימת את השיעור הראשון
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            הבנת את <span className="gradient-text">היסודות של גיאוגרפיה צבאית</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
