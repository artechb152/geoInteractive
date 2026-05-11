'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'soldier' | 'chain' | 'routes' | 'tail';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'soldier',
    label: 'החייל בקצה — תלוי לחלוטין',
    icon: 'people',
    popupTitle: 'לוחם בודד = צרכן של 50 ק"ג / יום',
    popupBody:
      'חייל בחזית צורך כל יום: מים (8 ל\'), מנות קרב (2 ק"ג), תחמושת (5–15 ק"ג), דלק (לרכב), חלפים, רפואי. סה"כ ~50 ק"ג ביום. <strong>כפול מספר החיילים, כפול ימי הלחימה</strong>. בלי שרשרת אספקה תקינה — הוא קורס תוך 72 שעות. אוגדה ללא דלק היא חולה.',
  },
  {
    id: 'chain',
    label: 'שרשרת האספקה (LOC) — הצינור',
    icon: 'truck',
    popupTitle: 'מבסיס האם עד הסלע בקצה',
    popupBody:
      '<strong>LOC</strong> (Lines of Communication) — המערכת הגיאוגרפית והפיזית שמקשרת בין הדרג הלוחם לבסיסי האספקה: כבישים, מסילות ברזל, נתיבי שיט, רשתות תקשורת. <strong>קצב התקדמות הכוח מוגבל ע"י יכולתו לאבטח את ה-LOC שלו</strong>. נפוליאון התקדם 1000 ק"מ עד מוסקבה. ה-LOC לא יכול היה לעקוב. הצבא הגדול בעולם התפרק.',
  },
  {
    id: 'routes',
    label: 'MSR + ASR — ראשי ועתודה',
    icon: 'compass',
    popupTitle: 'תוכנית ראשית + תוכנית מגירה',
    popupBody:
      '<strong>MSR (Main Supply Route)</strong> — הציר המרכזי שדרכו זורמת המסה הקריטית. כל מאמץ מודיעיני של האויב מתמקד בו. <strong>ASR (Alternate Supply Route)</strong> — נתיב משני, ממופה ומאושר מראש, מופעל רק כש-MSR לא שמיש (חסימה פיזית, הצפה, מארב). שני צירים ביד אחד = אופציה. ציר אחד בלבד = הימור.',
  },
  {
    id: 'tail',
    label: 'הבטן הלוגיסטית — נקודת התורפה',
    icon: 'shield',
    popupTitle: 'הזנב שגדל עם החדירה',
    popupBody:
      '<strong>"הבטן הלוגיסטית"</strong> = העומק הגיאוגרפי שבו פרושות יחידות התמך (תחזוקה, חימוש, רפואה). דוקטרינת <strong>Push Logistics</strong>: הציוד נדחף לחזית. ככל שהכוח מעמיק חדירה — הבטן מתארכת, איטית יותר, וקשה להגנה. "ציידי לוגיסטיקה" מנצלים את המרחבים הלא מאובטחים בעורף. רומל לא פושל בקרב — הוא נחתך מהדלק.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם מת בלי קרב',
    place: 'פלישת נפוליאון לרוסיה · 1812',
    lesson: 'נפוליאון יצא עם 600,000 חיילים ו-LOC ארוך מפריז למוסקבה. הרוסים לא נלחמו — הם נסוגו ושרפו הכל. ב-1,000 ק"מ מהבסיס, ללא דלק, ללא מזון, ללא תחבושות. בנובמבר נפלגו 90% מהצבא. הקרב היחיד שניצח אותו היה ה-LOC.',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: 'שועל המדבר נחתך מהדלק',
    place: 'אל-עלמיין, צפון אפריקה · 1942',
    lesson: 'רומל ניצח 24 חודש קרב אחר קרב. הבעיה: בנמל בנגזי, הצוללות הבריטיות הטביעו מכליות. הדלק לא הגיע. ב-23 באוקטובר, רומל הרים את מקלחת ידיו בטוב — הכוח שלו לא יכול היה לזוז. תוך חודש: 1,500 ק"מ נסיגה. הדלק קבע, לא הטנקים.',
    icon: 'ship',
    accent: 'text-accent',
  },
  {
    headline: 'גשר אחד רחוק מדי',
    place: 'מבצע "Market Garden", הולנד · ספטמבר 1944',
    lesson: 'בעלות הברית תכננו לכבוש סדרה של גשרים עד ארנהיים — כדי לפתוח LOC עמוק לגרמניה. כל גשר נכבש, חוץ מהאחרון. ה-LOC נשבר, היחידות בעומק לא קיבלו אספקה, והמבצע נכשל. "גשר אחד רחוק מדי" — המונח שנכנס לתורת הלחימה.',
    icon: 'compass',
    accent: 'text-status-warn',
  },
  {
    headline: 'נצור עם 250,000 חיילים = 0 אספקה',
    place: 'סטלינגרד, חזית מזרחית · 1942–43',
    lesson: 'הצבא ה-6 הגרמני נכבש בעיר. הקיף הסובייטי סגר עליהם — וה-LOC נחתך לחלוטין. גרינג הבטיח לחיל האוויר להזין 700 טון ביום באוויר; הגיעו 100. תוך 3 חודשים: רעב, קור, התמוטטות. 250,000 חיילים נכנעו. הניצחון לא היה בקרב — היה ב-LOC.',
    icon: 'shield',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('soldier');
  const [expandedStep, setExpandedStep] = useState<View | null>('soldier');

  const handleStepClick = (id: View) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setView(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            <span className="gradient-text">הצינור</span> שמחזיק את המלחמה
          </>
        }
        intro="אף מלחמה גדולה לא הוכרעה בקרב גלוי. כולן הוכרעו בלוגיסטיקה. בוא נראה איך מבסיס האם שבעורף, דרך הצינור הגיאוגרפי, עד החייל בסלע בקצה — כל פגם בשרשרת מוריד את הכל."
      />

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'surface overflow-hidden transition-colors',
                  active
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t8-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t8-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      active ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-mono text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium leading-tight', active && 'text-accent')}>{s.label}</div>
                  </div>
                  <Icon
                    name={s.icon}
                    size={20}
                    className={cn('transition-colors shrink-0', active ? 'text-accent' : 'text-fg-dim')}
                  />
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-accent' : 'text-fg-dim')}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key={`t8-onb-panel-${s.id}`}
                      id={`t8-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-xs font-mono text-accent mt-3 mb-2 tracking-widest uppercase">
                          למה זה משנה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: s.popupBody }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <SupplyChainStage view={view} />
        </div>
      </div>

      <SoftDivider text="ההיסטוריה מלאה בקרבות שהפסידו על LOC, לא על אש" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <motion.article
            key={h.headline}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 relative overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-bl from-bg-elevated via-bg-card to-bg-card opacity-100"
            />
            <div className="relative flex items-start gap-4">
              <div className="size-12 rounded-xl bg-bg-elevated border border-border-strong flex items-center justify-center shrink-0">
                <Icon name={h.icon} size={22} className={h.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase flex items-center gap-2">
                  <span className="size-1 rounded-full bg-fg-dim" />
                  {h.place}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mb-2 text-balance">
                  {h.headline}
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed text-pretty">{h.lesson}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-bl from-accent/10 via-bg-elevated to-bg-elevated p-6 sm:p-7 flex gap-4 sm:gap-5 items-center"
      >
        <div className="absolute -end-12 -top-12 size-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative size-12 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-glow">
          <Icon name="arrow-left" size={20} />
        </div>
        <div className="relative flex-1">
          <div className="text-xs font-mono text-accent mb-1.5 tracking-widest uppercase">עכשיו אתה מוכן</div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
            הבנת שלוגיסטיקה זה לא "תמיכה" — זה הקרב המקביל. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך עובדים MSR ו-ASR בפועל, איך הבטן הלוגיסטית גדלה ונחשפת, ולמה נמלי מים עמוקים שווים אוגדה שלמה</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function SupplyChainStage({ view }: { view: View }) {
  const showBase = view !== 'soldier';
  const showRoutes = view === 'routes' || view === 'tail';
  const showASR = view === 'routes' || view === 'tail';
  const showTail = view === 'tail';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-8" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-8)" />

        {/* Terrain hints */}
        <path d="M0 58 L25 50 L45 55 L65 48 L85 52 L100 50 L100 75 L0 75 Z" className="fill-terrain-sand/20" />

        {/* Front line zone (right side) */}
        <rect x="80" y="0" width="20" height="75" className="fill-status-danger/8" />
        <line x1="80" y1="0" x2="80" y2="75" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="1 0.8" />
        <text
          x="90"
          y="9"
          textAnchor="middle"
          className="fill-status-danger font-display font-bold"
          fontSize="3.2"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          חזית
        </text>

        {/* Soldier at the tip (always visible) */}
        <motion.g
          initial={false}
          animate={view === 'soldier' ? { scale: 1.2 } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <circle cx="89" cy="40" r="2.5" className="fill-accent-hot" />
          <circle cx="89" cy="40" r="4" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <text
            x="89"
            y="36"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            לוחם
          </text>
          {view === 'soldier' && (
            <text
              x="89"
              y="49"
              textAnchor="middle"
              className="fill-accent-hot font-sans"
              fontSize="2.4"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinejoin="round"
            >
              50 ק"ג / יום
            </text>
          )}
        </motion.g>

        {/* Base in the rear (left) */}
        <motion.g initial={false} animate={{ opacity: showBase ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <rect x="6" y="36" width="9" height="9" rx="1" className="fill-accent-cool" />
          <rect x="8" y="38" width="2" height="3" className="fill-bg" />
          <rect x="11" y="38" width="2" height="3" className="fill-bg" />
          <text
            x="10.5"
            y="34"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            בסיס
          </text>
          <text
            x="10.5"
            y="50"
            textAnchor="middle"
            className="fill-accent-cool font-sans"
            fontSize="2.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            עורף
          </text>
        </motion.g>

        {/* Simple chain (step 2): basic LOC line */}
        <motion.g initial={false} animate={{ opacity: view === 'chain' ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <line
            x1="15"
            y1="40"
            x2="87"
            y2="40"
            className="stroke-accent"
            strokeWidth="0.7"
            strokeDasharray="2 1"
          />
          <text
            x="50"
            y="36"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            LOC — קו אספקה
          </text>
        </motion.g>

        {/* MSR + ASR routes (step 3, 4) */}
        <motion.g initial={false} animate={{ opacity: showRoutes ? 1 : 0 }} transition={{ duration: 0.3 }}>
          {/* MSR — primary, thick */}
          <path
            d="M15 40 Q 30 38 50 42 Q 70 46 87 40"
            fill="none"
            className="stroke-accent"
            strokeWidth="1.2"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            MSR · ראשי
          </text>
        </motion.g>

        {/* ASR — alternate, thinner dashed */}
        <motion.g initial={false} animate={{ opacity: showASR ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <path
            d="M15 40 Q 30 28 50 25 Q 70 22 87 40"
            fill="none"
            className="stroke-accent-cool"
            strokeWidth="0.7"
            strokeDasharray="2 1.2"
          />
          <text
            x="50"
            y="22"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            ASR · עתודה
          </text>
        </motion.g>

        {/* Logistical tail — supply vehicles + vulnerability zones */}
        <motion.g initial={false} animate={{ opacity: showTail ? 1 : 0 }} transition={{ duration: 0.3 }}>
          {/* Supply vehicles spread along the MSR */}
          {[25, 38, 50, 62, 75].map((x, i) => {
            const y = 38 + (i === 2 ? 2 : i === 1 || i === 3 ? 1.5 : 1);
            return (
              <g key={i}>
                <rect x={x - 1.4} y={y - 0.8} width="2.8" height="1.6" rx="0.3" className="fill-accent" />
                <circle cx={x - 0.8} cy={y + 0.9} r="0.4" className="fill-fg" />
                <circle cx={x + 0.8} cy={y + 0.9} r="0.4" className="fill-fg" />
              </g>
            );
          })}
          {/* Vulnerability zone (logistics raider threat) */}
          <ellipse cx="45" cy="58" rx="14" ry="6" className="fill-status-danger/15 stroke-status-danger" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
          <text
            x="45"
            y="68"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.85"
            strokeLinejoin="round"
          >
            "ציידי לוגיסטיקה"
          </text>
          <text
            x="45"
            y="71"
            textAnchor="middle"
            className="fill-status-danger font-sans"
            fontSize="2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.7"
            strokeLinejoin="round"
          >
            איגוף עמוק לעורף
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אנטומיה של LOC · 4 שכבות
      </div>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
