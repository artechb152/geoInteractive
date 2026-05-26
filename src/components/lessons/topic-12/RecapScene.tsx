'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'GIS',                    def: 'Geographic Information System — מערכת לעיגון, ניתוח והצגת מידע גיאוגרפי.' },
  { term: 'שכבות (Layers)',         def: 'כל סוג מידע = שקף נפרד. Overlay של שכבות = תמונה רב-ממדית.' },
  { term: 'Georeferencing',         def: 'הצמדת כל פיסת מידע לקואורדינטה. הבסיס לכל GIS.' },
  { term: 'ראסטר (Raster)',         def: 'רשת פיקסלים. כל פיקסל ערך אחד. מתאים לרציפות (גובה, טמפ׳).' },
  { term: 'וקטור (Vector)',         def: 'אובייקטים גיאומטריים: נקודות/קווים/פוליגונים. עם טבלת תכונות.' },
  { term: 'DTM',                    def: 'Digital Terrain Model — מודל גובה ספרתי. ראסטר ערכי גובה.' },
  { term: 'Attribute Table',        def: 'טבלת תכונות לכל אובייקט וקטורי. מאפשר שאילתות חכמות.' },
  { term: 'Shapefile / GDB',        def: 'קבצי GIS לוקליים. למשתמש אחד, ניתוח עצמאי.' },
  { term: 'SDE',                    def: 'Spatial Database Engine — שרת מרכזי. כמה משתמשים על אותה שכבה.' },
  { term: 'Viewshed',               def: 'אלגוריתם שמחשב אילו תאי שטח נצפים מנקודה. "מקור אור" וירטואלי.' },
  { term: 'Cost Surface',           def: 'ראסטר בו כל פיקסל קיבל "ציון קושי לתנועה". משקלל איומים ושטח.' },
  { term: 'Least-Cost Path',        def: 'אלגוריתם למציאת המסלול הזול ביותר. "כמו מים זורמים".' },
  { term: 'Network Analysis',       def: 'ניתוח טופולוגי של רשתות. מזהה "נקודות כשל" — צמתים קריטיים.' },
  { term: 'Buffer',                 def: 'טבעת מסביב לאובייקט. למשל "Kill Box" סביב סוללת טילים.' },
  { term: 'Targeting',              def: 'בחירת נקודת תקיפה דרך GIS. צומת קריטי = אפקט דומינו.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="12.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="text-accent-hover">דקה אחת</span>
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

      <FinalCard />
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
            כל הכבוד · סיימת את שיעור ה-GIS — וגם את הקורס כולו!
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה רואה את העולם <span className="text-accent-hover">כשכבות של מודיעין</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FinalCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-10 relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-bl from-accent/15 via-bg-elevated to-bg-elevated p-7 sm:p-8"
    >
      <div className="absolute -end-20 -top-20 size-56 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute -start-20 -bottom-20 size-56 rounded-full bg-accent-cool/15 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="text-sm font-display font-semibold text-accent mb-2 tracking-wider">
          הקורס הסתיים
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3">
          13 שיעורים. <span className="text-accent-deep">דרך חשיבה אחת.</span>
        </h3>
        <p className="text-fg-muted leading-relaxed text-pretty">
          סיימת מסע של 13 שיעורים בגיאוגרפיה צבאית — מרמות המלחמה ועד GIS יישומי.
          עכשיו אתה רואה כל מפה כמו מתכנן: שכבות, איומים, מסלולים, ונקודות תורפה.
          זה לא הסוף — זה הקרקע. כל מבצע שתפגוש מהיום ייראה לך אחרת.
        </p>
      </div>
    </motion.div>
  );
}
