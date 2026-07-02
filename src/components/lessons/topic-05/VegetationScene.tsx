'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type VegId = 'herbaceous' | 'batta' | 'griga' | 'forest';

type VegType = {
  id: VegId;
  label: string;
  english: string;
  height: string;
  winter: string;
  summer: string;
  cover: string;
  concealment: string;
  mobility: string;
  density: number; // 1-4 visual density indicator
};

const VEGETATION: VegType[] = [
  {
    id: 'herbaceous',
    label: 'עשבוני / חד־שנתי',
    english: 'Herbaceous / Annual',
    height: 'עד 0.3 מ\'',
    winter: 'צבוע בירוק בהיר לאחר הנביטה. בעונה זו קל לזהות שטחים שנוקו מאבנים (מסוקלים) ושבילים צרים שנוצרו על ידי חיות או רועי צאן (מרעולים).',
    summer: 'הצמחייה מתייבשת לחלוטין והופכת לזהובה-חומה. הקרקע נחשפת ויש סכנת שריפות גבוהה.',
    cover: 'אפסי. הצמחייה נמוכה מדי ולא מסוגלת להגן פיזית מפני פגיעות אש או רסיסים.',
    concealment: 'נמוכה. מספקת הסתרה רק כששוכבים על הקרקע — אדם שהולך או רץ ייחשף מיד.',
    mobility: 'מצוינת. השטח פתוח ללא מכשולים, וכלים כבדים (כמו טנקים ונגמ"שים) יכולים לנוע בחופשיות.',
    density: 1,
  },
  {
    id: 'batta',
    label: 'בתה',
    english: 'Batha',
    height: 'עד 0.5 מ\'',
    winter: 'שילוב של עשבים ושיחים נמוכים (עד חצי מטר). בעונה זו יש שינוי צבע בולט לירוק.',
    summer: 'השיחים נשארים, אך העשבים סביבם מתייבשים. בעונה זו קל לזהות שבילי הליכה בשטח.',
    cover: 'מינימלי. השיחים קטנים וחלשים מכדי לעצור קליעים, כך שאין הגנה אמיתית.',
    concealment: 'בינונית. מסתירה אדם שזוחל או כורע ברך, אך לא אדם שעומד או הולך רגיל.',
    mobility: 'טובה. רכבים עם שרשראות זחל (כמו טנקים) יעברו בקלות, אך רכבים על גלגלים יזדקקו לדרך מסודרת.',
    density: 2,
  },
  {
    id: 'griga',
    label: 'גריגה',
    english: 'Garigue',
    height: '0.5–2 מ\'',
    winter: 'ירוק כהה ועז, ולעיתים יש פריחה מורגשת בסוף החורף ובאביב.',
    summer: 'הצבע הופך לחום-אפור עם מעט ירוק. השיחים שומרים על הצפיפות שלהם, כך שההסתרה נשמרת לאורך כל השנה.',
    cover: 'משתנה. שיחים חזקים מסוימים (כמו אלון מצוי) עשויים לעצור רסיסים קטנים, אך לא יגנו מפני ירי של נשק קל.',
    concealment: 'גבוהה. הצמחייה מספיק סבוכה כך שאפילו ממרחק של 20 מטרים יהיה קשה מאוד להבחין בכם.',
    mobility: 'מוגבלת. התנועה הרגלית קשה ואיטית, ורכבים כבדים חייבים להיצמד לשבילים קיימים או שיידרשו דחפורים כדי לפלס להם דרך.',
    density: 3,
  },
  {
    id: 'forest',
    label: 'חורש (סגור / חצי-סגור / פתוח)',
    english: 'Forest / Maquis',
    height: 'מעל 2 מ\' (עד 5–6 מ\')',
    winter: 'עצים ירוקי-עד נשארים ירוקים, בעוד עצים נשירים עומדים בשלכת. לקראת האביב, צמרות העצים (החופה) מתמלאות ונסגרות.',
    summer: 'צמרות מלאות לחלוטין. ביער סגור, הענפים מתחברים זה לזה ומסתירים לגמרי את הקרקע ממי שמסתכל מלמעלה.',
    cover: 'טובה נקודתית. גזעי העצים העבים יכולים לשמש כמחסה ולתפקד כמו סלע שאפשר להסתתר מאחוריו ולהתגונן מירי.',
    concealment: 'גבוהה ביותר. בחורש סגור, כמעט בלתי אפשרי לזהות תנועה ממבט מהאוויר (רחפנים או מטוסים).',
    mobility: 'איטית מאוד. יש מעט מאוד שבילים לרכבים, וכוחות רגליים חייבים לנוע בטור צפוף. השטח מלא בנקודות חנק — אזורים צרים שקל לאויב לארוב בהם.',
    density: 4,
  },
];

type AgType = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  desc: string;
  ops: string;
  examples: string;
};

const AGRICULTURE: AgType[] = [
  {
    id: 'field',
    label: 'גידולי שדה (גד״ש)',
    english: 'Field Crops',
    icon: 'layers',
    desc: 'שדות של צמחייה נמוכה וצפופה (כמו חיטה או תירס) המשתנה מאוד בהתאם לעונות השנה, עם צבעים שמתחלפים מהר. שטחים אלו מושקים ומעובדים באופן קבוע.',
    ops: 'בקיץ השטח עלול להיות קצור וחשוף לגמרי ללא הסתרה. בחורף, לעומת זאת, האדמה הופכת לבוץ עמוק שמקשה מאוד על תנועת רכבים. הליכה ברגל היא קלה יחסית, אך תנועת כלי רכב כבדים תלויה בעונה ובמצב הקרקע.',
    examples: 'חיטה, תירס, חמניות, כותנה',
  },
  {
    id: 'orchard',
    label: 'מטעים מודרניים',
    english: 'Modern Orchards',
    icon: 'mountain',
    desc: 'עצים הנטועים בשורות ישרות ומסודרות עם רווחים קבועים ביניהן, ומגיעים לרוב לגובה של 3-4 מטרים. השטח דורש תחזוקה שוטפת ונוכחות חקלאים לאורך כל השנה.',
    ops: 'הרווחים בין השורות נוחים לתנועת רכבים, אך הם "מתעלים" את התנועה — כלומר, מכריחים לנוע בנתיבים ישרים וצפויים מראש. העלים (העלווה) מספקים הסתרה טובה ממבט מהאוויר בקיץ, אך בחורף, כשהעצים עומדים בשלכת, השטח נחשף לגמרי.',
    examples: 'הדרים, פרדסים, נשירים, בננות',
  },
  {
    id: 'traditional',
    label: 'חקלאות מסורתית',
    english: 'Traditional',
    icon: 'star',
    desc: 'נטיעה פחות מסודרת עם מרווחים גדולים יותר בין העצים (כמו בוסתנים ועצי זית). העצים לרוב בוגרים וגדולים, אך מקבלים פחות השקיה וטיפול שוטף בהשוואה למטעים המודרניים.',
    ops: 'המרווחים הגדולים מאפשרים תנועה נוחה יחסית בין העצים. הגזעים העבים יכולים לשמש כמחסה מצוין מפני ירי. חשוב לקחת בחשבון נוכחות של אזרחים בעונות ספציפיות, כמו למשל בזמן מסיק הזיתים בסתיו.',
    examples: 'זיתים, בוסתן, גפן ותאנה',
  },
];

const AG_TRIANGLE = [
  { label: 'הצמח', desc: 'המאפיינים הפיזיים של הצמחייה - סוג העץ, גובהו, רוחב הצמרת שלו, האם הוא קוצני, והאם הוא משיר עלים בחורף או נשאר ירוק כל השנה.', icon: 'pyramid' as IconName, color: 'text-status-ok' },
  { label: 'פעילות האדם', desc: 'העבודות שמתבצעות בשטח, כמו יישור הקרקע, שתילה, גיזום או קטיף. פעולות אלו יוצרות לוח זמנים עונתי שמושך אזרחים לאזור.', icon: 'people' as IconName, color: 'text-accent' },
  { label: 'ארגון השטח', desc: 'התשתיות הפיזיות - מדרגות חקלאיות (טרסות), חומות, ערימות אבנים שפונו מהשדה (סוללות סיקול), עמודי מתכת, גדרות וצינורות השקיה. כל אלו עלולים להגביל את התנועה ולהכתיב נתיבים ספציפיים.', icon: 'layers' as IconName, color: 'text-accent-cool' },
];

export function VegetationScene() {
  const [active, setActive] = useState<VegId>('herbaceous');
  const [activeAg, setActiveAg] = useState<string>(AGRICULTURE[0].id);

  const meta = VEGETATION.find((v) => v.id === active)!;
  const agMeta = AGRICULTURE.find((a) => a.id === activeAg)!;

  return (
    <section id="scene-vegetation" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.4"
        eyebrow="ניתוח תכסית"
title = {
  <>
    <span className="gradient-text">הצמחייה בשטח</span> יכולה להסתיר, לחסום — או לחשוף אתכם
  </>
}        intro="צורת פני השטח (התבליט) קובעת איפה נוח להתקדם, אבל הצמחייה היא זו שקובעת מי ומה יכול להסתתר שם. אותה גבעה בדיוק תיראה ותתפקד אחרת לגמרי אם היא חולית וחשופה או אם יש עליה יער צפוף."
      />

      <div className="mb-6">
        <InsightCard tone="cool" icon="spark" label="5 גורמים משפיעים על התפתחות הצומח בטבע">
          המבנה הטופוגרפי (גובה וכיוון המדרון), סוג הסלע והקרקע, האקלים, ופעילות האדם.
          <span className="block mt-2">
            <strong className="text-fg">למשל:</strong> מדרון שפונה צפונה (נקרא "מפנה צפוני") מקבל פחות שמש ישירה, ולכן הצמחייה בו תהיה צפופה וגבוהה יותר. לעומתו, מדרון שפונה דרומה יהיה חשוף יותר לשמש, ולכן הצמחייה בו תהיה דלילה ונמוכה. ההבנה הזו יכולה לעזור לכם להחליט, למשל, מאיזה צד קל יותר לטפס או להסתתר.
          </span>
        </InsightCard>
      </div>

      {/* 4 vegetation types */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {VEGETATION.map((v, i) => {
          const isActive = active === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl flex flex-col gap-3 relative overflow-hidden',
                isActive ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t5-veg-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                />
              )}
              <VegSilhouette density={v.density} />
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all font-display font-bold text-sm',
                    isActive ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base text-fg leading-tight">
                    {v.label}
                  </div>
                  <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">{v.english} · {v.height}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-12"
        >
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
            <h3 className="font-display font-bold text-2xl leading-tight">{meta.label}</h3>
            <div className="text-xs font-display font-medium tracking-wide text-fg-dim">{meta.english} · {meta.height}</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <InsightCard tone="sky" label="בחורף">
              {meta.winter}
            </InsightCard>
            <InsightCard tone="sand" label="בקיץ">
              {meta.summer}
            </InsightCard>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <InsightCard tone="warn" icon="shield" label="מחסה">
              {meta.cover}
            </InsightCard>
            <InsightCard tone="sky" icon="eye" label="הסתרה">
              {meta.concealment}
            </InsightCard>
            <InsightCard tone="accent" icon="truck" label="ניידות">
              {meta.mobility}
            </InsightCard>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="חקלאות — תכסית אזרחית מלאכותית" />

      {/* Agriculture types */}
      <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-5 max-w-3xl">
        שטחים חקלאיים נחשבים ל<strong className="text-fg">"תכסית מלאכותית"</strong> — כלומר, כיסוי שטח שנוצר והונדס על ידי בני אדם. הם מאופיינים בנטיעות מסודרות, קרקע חרושה ותשתיות כמו צינורות השקיה, גדרות ודרכי גישה. המאפיינים האלה משפיעים מאוד על היכולת לנוע ולהסתתר בתוכם, וחשוב לזכור שהם מושכים אליהם אזרחים (חקלאים) שעובדים בשטח.
      </p>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {AGRICULTURE.map((a) => {
          const isActive = activeAg === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveAg(a.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl relative overflow-hidden',
                isActive ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t5-ag-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                />
              )}
              <div className="flex items-start gap-3 mb-2">
                <span
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all',
                    isActive ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
                  )}
                >
                  <Icon name={a.icon} size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base text-fg leading-tight">
                    {a.label}
                  </div>
                  <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">{a.english}</div>
                </div>
              </div>
              <div className="text-xs text-fg-muted leading-relaxed">{a.examples}</div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={agMeta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-12"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <InsightCard tone="cool" label="מה זה בעצם?">
              {agMeta.desc}
            </InsightCard>
            <InsightCard tone="accent" label="משמעות מבצעית">
              {agMeta.ops}
            </InsightCard>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="משולש החקלאות: 3 שכבות שצריך לנתח" />

      {/* Triangle model */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {AG_TRIANGLE.map((t, i) => {
          const tone =
            t.color === 'text-status-ok' ? 'ok'
            : t.color === 'text-accent-cool' ? 'cool'
            : 'accent';
          return (
            <InsightCard
              key={t.label}
              tone={tone}
              icon={t.icon}
              label={`שכבה ${i + 1}`}
              title={t.label}
            >
              {t.desc}
            </InsightCard>
          );
        })}
      </div>

      <InsightCard tone="accent" icon="spark" label="ההשפעה המשולבת על הפעילות בשטח">
        השילוב של צמחייה, מבנה הקרקע ונוכחות אזרחים קובע איך נוכל להיכנס לשטח (ניידות), מי יוכל לראות אותנו (הסתרה), כמה רחוק נוכל לראות (תצפית), ומה יחסום או יסיט כדורים בזמן ירי (הפרעה לאש).
        <span className="block mt-2">
          <strong className="text-fg">לדוגמה — בפרדס בקיץ:</strong> יש אמנם נוחות תנועה בין שורות העצים והסתרה מעולה מהאוויר בזכות העלים, אך מנגד שדה הראייה מוגבל מאוד, ענפי העצים עלולים לשבש מסלול של ירי, ויש סיכוי גבוה להיתקל בחקלאים שעובדים שם. אין שטח שדומה למשנהו.
        </span>
      </InsightCard>
    </section>
  );
}

function VegSilhouette({ density }: { density: number }) {
  // Map to palette tokens: terrain-olive=#7a8a3f, brand=#749C75, brand-dark=#5B7C5C, terrain-ridge=#5a6b4a
  const colors = ['#7a8a3f', '#749C75', '#5B7C5C', '#5a6b4a'];
  const color = colors[density - 1];

  return (
    <div className="aspect-[2/1] relative w-full">
      <svg viewBox="0 0 100 50" className="w-full h-full rounded-lg">
        <rect x="0" y="0" width="100" height="50" className="fill-bg-accent" />
        {/* Ground line */}
        <line x1="0" y1="42" x2="100" y2="42" className="stroke-border-strong" strokeWidth="0.3" opacity="0.4" />

        {density === 1 && (
          // herbaceous: tiny strokes
          Array.from({ length: 30 }).map((_, i) => {
            const x = (i * 3.5) % 100;
            return (
              <line
                key={i}
                x1={x}
                y1="42"
                x2={x + 0.5}
                y2="40"
                stroke={color}
                strokeWidth="0.3"
              />
            );
          })
        )}
        {density === 2 && (
          // batta: short bushes
          Array.from({ length: 14 }).map((_, i) => {
            const x = 5 + (i * 7);
            return (
              <ellipse
                key={i}
                cx={x}
                cy="38"
                rx="2.2"
                ry="3.5"
                fill={color}
                opacity="0.85"
              />
            );
          })
        )}
        {density === 3 && (
          // griga: medium shrubs
          Array.from({ length: 8 }).map((_, i) => {
            const x = 8 + (i * 12);
            return (
              <ellipse
                key={i}
                cx={x}
                cy="33"
                rx="4.5"
                ry="7"
                fill={color}
                opacity="0.9"
              />
            );
          })
        )}
        {density === 4 && (
          // forest: tall trees with canopy
          Array.from({ length: 6 }).map((_, i) => {
            const x = 8 + (i * 16);
            return (
              <g key={i}>
                <line x1={x} y1="42" x2={x} y2="30" className="stroke-fg" strokeWidth="1" />
                <ellipse cx={x} cy="22" rx="7" ry="10" fill={color} opacity="0.95" />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}