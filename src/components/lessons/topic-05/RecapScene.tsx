'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon } from '@/components/Icon';

const TERMS = [
  { term: 'עבירות (Trafficability)',  def: 'יכולת פיזית של הקרקע לתמוך במעבר כלי תחת לחץ סגולי נתון.' },
  { term: 'שיפוע 30% / 60%',           def: 'כלי גלגלי עד 30%, זחלילי עד 60%. מעל = החלקה והתהפכות.' },
  { term: 'מסלע קשה',                  def: 'גיר, דולומיט, בזלת. נוף תלול, טרשים = חסימה למעבר רכב.' },
  { term: 'מסלע רך',                   def: 'קרטון, חרסית. נוף מעוגל וניתן לפילוס הנדסי קל.' },
  { term: 'חול רטוב',                  def: 'סכנת שקיעה בעצירה. תנועה רציפה בלבד; זחל אחד במים.' },
  { term: 'מסדרון תמרון',              def: 'נתיב ארוך נטול מכשולים שמאפשר לאוגדה לזוז במלוא עוצמה.' },
  { term: 'מכשול טבעי',                def: 'נהר, מצוק, יער עבות. שלד מערך ההגנה — אבל לא לבד.' },
  { term: 'מכשול מלאכותי',             def: 'מוקשים, תעלת נ"ט, תלתלית. השלמה הנדסית למכשול טבעי.' },
  { term: 'שילוב סינרגטי',              def: 'מכשול טבעי + מלאכותי = רשת עצירה כמעט בלתי עבירה.' },
  { term: 'קידום ניידות',               def: 'Breaching: גשרים, פינוי מוקשים, פילוס דרכים — פריצה לעומק.' },
  { term: 'שלילת ניידות',                def: 'Counter-Mobility: מיקוש, פיצוץ גשרים — תיעול לשטח השמדה.' },
  { term: 'מחסה (Cover)',               def: 'הגנה פיזית קשיחה שעוצרת אש. סלע, בטון, קפל קרקע עבה.' },
  { term: 'הסתרה (Concealment)',        def: 'מניעת *גילוי* בלבד. שיח, ערפל, חורש — לא עוצרים כדור.' },
  { term: 'נקודת חנק',                  def: 'הצרה של חזית התנועה — מאפשרת השמדת כוח גדול בכוח קטן.' },
  { term: 'בתה / גריגה / חורש',         def: 'תצורות צומח ים-תיכוניות לפי גובה: 0.5 / 0.5–2 / 2+ מטרים.' },
  { term: 'מפנה צפוני / דרומי',         def: 'צפוני = פחות שמש = צומח צפוף. דרומי = חשוף = דליל.' },
  { term: 'משולש החקלאות',              def: '3 שכבות לניתוח: הצמח, פעילות האדם, ארגון השטח.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.5"
        eyebrow="סיכום השיעור"
        title={
          <>
            {TERMS.length} מושגים, <span className="gradient-text">דקה אחת</span>
          </>
        }
        intro="כל המושגים שעברנו בשיעור — בהגדרה אחת קצרה לכל אחד."
      />

      <CompletionBanner />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t) => (
          <InsightCard key={t.term} tone="accent" title={t.term}>
            {t.def}
          </InsightCard>
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
            כל הכבוד · סיימת את שיעור הניידות והתמרון
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight">
            עכשיו אתה רואה שטח <span className="gradient-text">בעיניים של מתכנן תמרון</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
