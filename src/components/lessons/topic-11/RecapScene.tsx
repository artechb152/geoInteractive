'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'עומק אסטרטגי',        def: 'המרחק הפיזי מאזור הלחימה ועד לערי הבירה והאזרחים. ככל שיש יותר עומק – יש יותר זמן להגיב.' },
  { term: 'מדינה צרה',            def: 'מדינה בלי עומק אסטרטגי (כמו ישראל). אי אפשר לסגת לאחור, ולכן חייבים לתקוף ראשונים ולהעביר את הלחימה החוצה.' },
  { term: 'נסיגה אסטרטגית',        def: 'נשק יום הדין של מדינות ענק (כמו רוסיה): נסיגה מכוונת לאחור כדי למשוך את האויב פנימה, לעייף אותו ולנתק את קווי האספקה שלו.' },
  { term: 'אזור חיץ',              def: 'שטח ריק מצבא (מפורז) שמפריד בין שתי מדינות אויבות. המטרה: למנוע חיכוך יומיומי ולתת התרעה מוקדמת בזמן פלישה.' },
  { term: 'DMZ',                   def: 'ראשי תיבות של "אזור מפורז" (Demilitarized Zone). הדוגמה המפורסמת ביותר היא שטח ההפרדה המתוח בין צפון לדרום קוריאה.' },
  { term: 'גדר חכמה',              def: 'מכשול פיזי שמשולבת בו טכנולוגיה (חיישני נגיעה ומצלמות). טכנולוגיה שמנסה להוות תחליף וירטואלי במקומות שבהם אין עומק אמיתי.' },
  { term: 'חיישנים סייסמיים',      def: 'סנסורים שקבורים באדמה ויודעים לזהות רעידות קלות - מצעדים של מחבלים, דרך רכבים ועד חפירת מנהרות, 24 שעות ביממה.' },
  { term: 'גבול טבעי',             def: 'קו גבול שנקבע על בסיס מכשול גיאוגרפי אמיתי (כמו רכס הרים גבוה או נהר רחב). נחשב לגבול היציב והבטוח ביותר.' },
  { term: 'גבול מלאכותי',          def: 'קו דמיוני ששורטט על המפה בלי שום קשר לטופוגרפיה בשטח או לעמים שחיים שם. מתכון כמעט בטוח לסכסוכים אלימים.' },
  { term: 'סייקס-פיקו',            def: 'הסכם מ-1916 שבו דיפלומטים אירופאים שרטטו את גבולות המזרח התיכון עם סרגל. הפך לסמל הרסני לסכנות של גבולות מלאכותיים.' },
  { term: 'מכשול אורוגרפי',        def: 'המונח המקצועי לרכס הרים שמשמש כגבול. לדוגמה: הרי ההימלאיה או האלפים, שמפרידים בהצלחה בין עמים במשך אלפי שנים.' },
  { term: 'דוקטרינה התקפית',       def: 'תפיסת הפעלה צבאית שאומרת: "ההגנה הטובה ביותר היא התקפה". חובה במדינות שאין להן שטח לספוג בו מכה.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="text-accent-hover">דקה אחת</span>
          </>
        }
        intro="כל המושגים המרכזיים שלמדנו בשיעור."
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
            כל הכבוד! סיימת את שיעור הגבולות והעומק המרחבי
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה מבין שצורה של מדינה היא לא סתם ציור – אלא <span className="text-accent-hover">גורל אסטרטגי</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
