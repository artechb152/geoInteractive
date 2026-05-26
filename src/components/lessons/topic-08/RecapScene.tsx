'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'LOC (קווי אספקה)',         def: 'העורק הראשי שמחבר בין החיילים בשטח לבין בסיסי האספקה בעורף.' },
  { term: 'MSR (ציר ראשי)',           def: 'הדרך המרכזית שדרכה עובר רוב הציוד. המטרה מספר אחת של האויב.' },
  { term: 'ASR (ציר חלופי)',          def: 'תוכנית המגירה שלנו. כביש משני שמופעל רק כשהציר הראשי נחסם.' },
  { term: 'נקודת חנק (Choke Point)',  def: 'מקום צר במסלול. קל מאוד לאויב לחסום שם כוח גדול בעזרת מעט לוחמים ומוקשים.' },
  { term: 'הבטן הלוגיסטית',           def: 'האזור שמאחורי הכוחות, שם נוסעות משאיות האספקה. ככל שנתקדם, ה"בטן" הזו תתארך ותהיה חשופה יותר.' },
  { term: 'דחיפה (Push Logistics)',   def: 'שליחת ציוד לחזית כל הזמן מראש ("כמו סרט נע"). שפע של ציוד, אבל המון משאיות שחשופות לפגיעה.' },
  { term: 'משיכה (Pull Logistics)',   def: 'החיילים מזמינים רק מה שחסר להם באותו רגע. חסכוני ובטוח יותר, אבל דורש תקשורת מעולה.' },
  { term: 'ציידי לוגיסטיקה',          def: 'חוליות אויב שמסתננות מאחורי הקווים שלנו רק כדי לתקוף משאיות אספקה חסרות מגן.' },
  { term: 'נמל מים עמוקים',           def: 'נמל ענק שמתאים לספינות כבדות. שליטה בו מאפשרת רצף אספקה שמנצח מלחמות.' },
  { term: 'מיקוש ימי',                def: 'הדרך הזולה והיעילה ביותר לשתק נמל שלם. מוקש אחד בתעלת הכניסה וכל הספינות נתקעות.' },
  { term: 'מרכז תחבורה משולב (היברידי)', def: '"תחנה מרכזית" שמשלבת שדה תעופה, נמל ים, רכבת וכביש. פגיעה בו משתקת מדינה שלמה.' },
  { term: 'מרכז כובד (COG)',          def: 'הנקודה הרגישה ביותר (כמו נמל או צומת מרכזי). פגיעה בה תגרום לאפקט דומינו צבאי וכלכלי.' },
  { term: 'גשר אחד רחוק מדי',         def: 'מושג שמתאר שאפתנות יתר. כשקו האספקה נמתח מעבר ליכולת שלו, כל המבצע קורס (מבצע מרקט גארדן, 1944).' },
  { term: 'רומל ב-1942',              def: 'הגנרל הגרמני שניצח בקרבות, אבל הפסיד במערכה כי פשוט נגמר לטנקים שלו הדלק.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.4"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים שחייבים להכיר ב<span className="text-accent-hover">דקה אחת</span>
          </>
        }
        intro="ריכזנו עבורכם את כל המושגים המרכזיים שעברנו עליהם בשיעור, בהגדרה אחת קצרה, חדה וברורה."
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
            כל הכבוד! · סיימתם את שיעור הלוגיסטיקה
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתם רואים את שדה הקרב <span className="text-accent-hover">בעיניים של מפקד לוגיסטיקה</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
