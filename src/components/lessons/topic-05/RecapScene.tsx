'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
          <div className="text-xs text-fg-muted mt-0.5">ניתוח עבירות וסיווג מחסה/הסתרה</div>
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
