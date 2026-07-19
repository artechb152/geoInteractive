'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'גיאו-כלכלה (Geo-economics)', def: 'השילוב שבין גיאוגרפיה לכלכלה, המשמש כנשק וכאמצעי לחץ. במאה ה-21, זהו הלב של רוב הסכסוכים בעולם.' },
  { term: 'פוליטיקה של מים (הידרו-פוליטיקה)', def: 'מאבק פוליטי וצבאי על שליטה במקורות מים. הכלל: מי שיושב בתחילת הנהר שולט במדינות שבהמשכו.' },
  { term: 'סכר הרנסנס', def: 'סכר ענק שאתיופיה בונה על נהר הנילוס. המהלך מהווה איום קיומי על מצרים, שתלויה בנילוס כמעט לכל מי השתייה שלה.' },
  { term: 'אנרגיה כנשק', def: 'שימוש במשאבים כמו נפט וגז כדי לסחוט מדינות אחרות. למשל: חרם הנפט הערבי (1973) ופיצוץ צינורות הגז מרוסיה לאירופה (2022).' },
  { term: '"עמקי מימן"', def: 'אזורי ענק המתוכננים לייצר אנרגיה ירוקה וחדשנית (כמו בנגב). המטרה: לפזר את ייצור האנרגיה ולא להיות תלויים במדינה אחת.' },
  { term: 'נקודת חנק ימית', def: 'מעבר ים צר שדרכו עובר חלק עצום מהסחר העולמי. זוהי נקודת תורפה רגישה שקל מאוד לחסום.' },
  { term: 'מיצרי הורמוז', def: 'מעבר צר בין איראן לעומאן שדרכו עובר כ-21% מהנפט בעולם. איראן מאיימת לחסום אותו באופן קבוע.' },
  { term: 'מיצר בב אל-מנדב', def: 'השער לים סוף ולתעלת סואץ. ב-2023-2024, החות\'ים שיתקו שם את הסחר העולמי בעזרת טילים פשוטים ורחפנים.' },
  { term: 'מיצרי מלאקה', def: 'העורק הימי המרכזי שדרכו עובר 30% מהסחר העולמי. סין נמצאת בחרדה קיומית מזה שמישהו יחסום לה אותו ("דילמת מלאקה").' },
  { term: 'תעלת סואץ', def: 'הקיצור בין אירופה לאסיה (12% מהסחר העולמי). ב-2021, ספינה אחת שנתקעה שם הוכיחה כמה הכלכלה העולמית שברירית.' },
  { term: 'נתיבי סחר ימיים (SLOC)', def: '"הכבישים המהירים" של הים שדרכם עוברת התחבורה והמסחר הגלובלי. התפקיד המרכזי של חיל הים הוא לאבטח אותם.' },
  { term: 'דוקטרינת מהן (Mahan)', def: 'תפיסה אסטרטגית מ-1890 שאומרת: "מי ששולט בים — שולט בעולם". הכלל הזה מנהל את המעצמות עד היום.' },
  { term: '4 עמודי התווך לשליטה בים', def: 'כדי להיות מעצמה צריך: 1. צי מלחמה חזק, 2. בסיסים בעולם, 3. שליטה בנתיבי הסחר (SLOC), ו-4. בריתות עם מדינות חוף.' },
  { term: 'החגורה והדרך (Belt & Road)', def: 'תוכנית ענק של סין לבנות ולקנות נמלים ותשתיות בכל העולם, כדי להבטיח לעצמה שליטה במסחר העולמי.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="09.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="text-accent-hover">דקה אחת</span>
          </>
        }
        intro="סיכום מהיר של כל המושגים המרכזיים שלמדנו — בהגדרה אחת קצרה, ברורה וקליטה לכל אחד."
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
            כל הכבוד · סיימתם את שיעור הגיאו-כלכלה!
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתם רואים את מפת העולם <span className="text-accent-hover">בעיניים אסטרטגיות</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
