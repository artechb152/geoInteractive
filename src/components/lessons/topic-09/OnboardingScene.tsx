'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'resource' | 'control' | 'leverage' | 'global';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'resource',
    label: 'משאב טבעי — סחורה',
    icon: 'oil',
    popupTitle: 'במאה ה-20 משאב היה כסף',
    popupBody:
      'בעבר, משאבים כמו נפט, מים, גז ומתכות היו פשוט סחורה. מי שהיה לו מכר, ומי שהיה צריך קנה בשוק החופשי. <strong>היום זה כבר לא המצב.</strong> במאה ה-21, מי ששולט במיקום הגיאוגרפי של המשאבים מחזיק בכוח אדיר להפעיל לחץ על מדינות אחרות. הסחורה של פעם הפכה לנשק של היום.',
  },
  {
    id: 'control',
    label: 'שליטה גיאוגרפית — מי בעל המקור',
    icon: 'mountain',
    popupTitle: 'מי שיושב במעלה — שולט',
    popupBody:
      'מי שיושב קרוב למקור – הוא זה ששולט. קחו לדוגמה <strong>פוליטיקה של מים</strong> (הידרו-פוליטיקה): נהר הנילוס זורם מאתיופיה למצרים. ברגע שאתיופיה בונה סכר בשטחה, היא יכולה להחליט כמה מים יגיעו למצרים, שחייבת אותם כדי לשרוד. באותו אופן, מי ששולט באסדת גז בים קובע אם למדינה שלמה יהיה חימום בחורף. <strong>הגיאוגרפיה הפכה לכלי שלטון:</strong> מה שמשנה זה לא למי יש יותר משאבים, אלא מי יושב על ה"ברז".',
  },
  {
    id: 'leverage',
    label: 'כלי לחץ — נשק אסטרטגי',
    icon: 'bolt',
    popupTitle: 'ברגע שאתה שולט — אתה לוחץ',
    popupBody:
      'ברגע שאתה שולט בברז, אתה יכול להפעיל לחץ פוליטי וצבאי בלי לירות אפילו כדור אחד. למשל, במלחמת האזרחים ב<strong>סוריה</strong>, השליטה בסכרים אפשרה לאיים בצמא על אוכלוסיות שלמות. ב-<strong>1973</strong>, מדינות הנפט הערביות עצרו את אספקת הנפט למערב כעונש על התמיכה בישראל. גם השימוש ב<strong>גז הרוסי</strong> כדי לאיים על אירופה הוא דוגמה חיה לכך. לעיתים קרובות, הלחץ הכלכלי הזה יעיל וזול הרבה יותר ממלחמה.',
  },
  {
    id: 'global',
    label: 'נקודת תורפה גלובלית',
    icon: 'globe',
    popupTitle: 'הכלכלה העולמית רגישה לנקודות בודדות',
    popupBody:
      'הכלכלה העולמית תלויה בנקודות תורפה. רוב הסחורות בעולם עוברות בים דרך <strong>מיצרים צרים</strong> (כמו מיצר הורמוז או בב אל-מנדב). המקומות האלה כל כך רגישים, שאפילו ארגון טרור קטן עם כמה רקטות יכול לחסום אותם ולתקוע את המסחר העולמי. <strong>היום, גורם מקומי יכול לזעזע את כלכלת העולם כולו</strong>. בגלל זה הצי האמריקאי מסייר באוקיינוסים בלי הפסקה – גישה שמבוססת על תפיסה אסטרטגית עתיקה (דוקטרינת מֵהָן) שאומרת פשוט: "מי ששולט בים, שולט בעולם".',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'סכר אחד מאיים על מדינה שלמה',
    place: 'סכר הרנסנס האתיופי · 2011–היום',
    lesson: 'אתיופיה החלה לבנות סכר ענק על נהר הנילוס. המהלך הזה הפחיד את מצרים, שמקבלת מהנילוס כמעט את כל מי השתייה שלה (כ-95%). המאבק סביב הסכר יצר איומים במלחמה ולחץ דיפלומטי כבד, והוכיח עיקרון פשוט: המדינה ששולטת במקור הנהר, קובעת את גורל המדינה שנמצאת בהמשכו.',
    icon: 'wave',
    accent: 'text-terrain-sky',
  },
  {
    headline: '7% מסחר העולם נחסם — ע"י ארגון לא-מדינתי',
    place: 'בב אל-מנדב, ים סוף · 2023–24',
    lesson: 'החות\'ים בתימן תקפו ספינות סוחר במיצרי בב אל-מנדב שבים סוף. בעקבות זאת, חברות ספנות ענקיות נאלצו לשנות מסלול ולהקיף את כל יבשת אפריקה במקום לעבור בתעלת סואץ. השינוי הזה ייקר משמעותית את השילוח והאריך אותו בשבועות. זהו מקרה קלאסי שבו ארגון מקומי קטן מצליח לשבש את הכלכלה העולמית כולה.',
    icon: 'ship',
    accent: 'text-accent-hot',
  },
  {
    headline: 'הנשק שגרם למיתון עולמי',
    place: 'אמברגו הנפט הערבי · אוקטובר 1973',
    lesson: 'בעקבות מלחמת יום הכיפורים (1973), מדינות הנפט הערביות החליטו להעניש את ארה"ב ומדינות נוספות שתמכו בישראל, והפסיקו למכור להן נפט. התוצאה הייתה הרסנית: תחנות דלק נותרו ריקות, המחירים זינקו פי ארבעה והעולם נכנס למיתון קשה. זו הייתה ההוכחה לכך שנפט יכול להיות נשק קטלני לא פחות מטילים.',
    icon: 'oil',
    accent: 'text-accent',
  },
  {
    headline: 'צינור גז התפוצץ — אירופה איבדה מקור',
    place: 'נורד סטרים, הים הבלטי · ספטמבר 2022',
    lesson: 'בספטמבר 2022, צינורות תת-ימיים ענקיים שהובילו גז מרוסיה לגרמניה פוצצו במעמקי הים בפעולה מסתורית. בבת אחת, אירופה איבדה את אחד ממקורות האנרגיה המרכזיים שלה. המקרה הזה ממחיש עד כמה תשתיות אנרגיה הן נקודות תורפה אסטרטגיות שניתן לפגוע בהן בקלות יחסית.',
    icon: 'fuel',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('resource');
  const [expandedStep, setExpandedStep] = useState<View | null>('resource');

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
        step="09.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    איך <span className="text-accent-hover">משאב טבע</span> הופך לכלי לחץ עולמי
  </>
}
        intro="פעם, ערכו של משאב (כמו נפט או מים) נמדד רק בכסף. היום הוא נמדד בכוח שהוא מעניק למי ששולט בו. בחלק זה נראה בארבעה שלבים פשוטים איך באר נפט, נהר או צינור גז הופכים לכלים שמשנים את יחסי הכוחות בעולם."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t9-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t9-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-[3px] flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active ? 'bg-brand-dark text-bg-elevated border-brand-dark' : passed ? 'bg-status-ok/15 text-status-ok border-status-ok/30' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-display font-semibold leading-tight transition-colors text-fg')}>{s.label}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
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
                      key={`t9-onb-panel-${s.id}`}
                      id={`t9-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
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

        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[280px]">
          <ResourceFlowStage view={view} />
        </div>
      </div>

      <SoftDivider text="4 סיפורים שבהם משאב הפך לכלי לחץ" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <IntelCard
            key={h.headline}
            place={h.place}
            headline={h.headline}
            lesson={h.lesson}
            icon={h.icon}
            accent={h.accent}
          />
        ))}
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>
          הבנתם שמשאב הוא לא רק כסף – הוא נשק לכל דבר. בשלבים הבאים נצלול פנימה ונראה:{' '}
          <strong className="text-fg">
            איך בדיוק מים ואנרגיה הופכים לכלי לחץ פוליטי, אילו מיצרים קובעים את סדר היום העולמי, ולמה תפיסות צבאיות עתיקות עדיין מנהלות את העולם שלנו היום.
          </strong>
        </p>
      </ReadyCallout>
    </section>
  );
}

function ResourceFlowStage({ view }: { view: View }) {
  const showSource = view !== 'resource' || true;
  const showControl = view === 'control' || view === 'leverage' || view === 'global';
  const showLeverage = view === 'leverage' || view === 'global';
  const showGlobal = view === 'global';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-9" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-9)" />

        {/* Two countries / regions, separated by a border */}
        <path d="M0 65 L20 55 L40 60 L100 60 L100 75 L0 75 Z" className="fill-terrain-sand/20" />
        <line x1="55" y1="0" x2="55" y2="75" className="stroke-fg-dim" strokeWidth="0.3" strokeDasharray="1 0.8" />

        {/* Upstream region (left) — "Source" */}
        <text x="22" y="10" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          מדינת המקור (במעלה הנהר)
        </text>

        {/* Downstream region (right) — "Dependent" */}
        <text x="78" y="10" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          המדינה התלויה (במורד הנהר)
        </text>

        {/* Flow line (resource flowing left → right) */}
        <motion.path
          d="M12 38 Q 35 36 55 38 Q 75 40 92 42"
          fill="none"
          className={showLeverage ? 'stroke-status-warn' : 'stroke-terrain-sky'}
          strokeWidth="2"
          opacity={showLeverage ? 0.5 : 1}
        />
        {!showLeverage && (
          <motion.circle
            r="1"
            className="fill-terrain-sky"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M12 38 Q 35 36 55 38 Q 75 40 92 42")',
            }}
          />
        )}
        <text x="32" y="33" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
          זרימת משאב
        </text>

        {/* Source point (resource) — always visible */}
        <motion.g initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <circle cx="12" cy="38" r="2.4" className="fill-accent" />
          <text x="12" y="34" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            משאב
          </text>
          <text x="12" y="44" textAnchor="middle" className="fill-fg-dim font-sans" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            נילוס · נפט · גז
          </text>
        </motion.g>

        {/* Control point (dam / facility) */}
        <motion.g initial={false} animate={{ opacity: showControl ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {/* Dam icon */}
          <rect x="33" y="34" width="3" height="8" rx="0.4" className="fill-terrain-ridge" />
          <line x1="33" y1="34" x2="36" y2="34" className="stroke-terrain-ridge" strokeWidth="0.6" />
          <line x1="33" y1="42" x2="36" y2="42" className="stroke-terrain-ridge" strokeWidth="0.6" />
          <text x="34.5" y="30" textAnchor="middle" className="fill-terrain-ridge font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            סכר
          </text>
          <text x="34.5" y="48" textAnchor="middle" className="fill-terrain-ridge font-sans" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            שליטה גיאוגרפית
          </text>
        </motion.g>

        {/* Leverage / threat indicator (when control is exercised as pressure) */}
        <motion.g initial={false} animate={{ opacity: showLeverage ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          {/* Squeeze indicator */}
          <g transform="translate(34 38)">
            <path d="M-7 0 L-3 -3 M-7 0 L-3 3" stroke="currentColor" strokeWidth="0.5" className="text-status-warn" />
            <path d="M7 0 L3 -3 M7 0 L3 3" stroke="currentColor" strokeWidth="0.5" className="text-status-warn" />
          </g>
          <text x="34.5" y="55" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            לחץ פוליטי
          </text>
        </motion.g>

        {/* Dependent country impact */}
        <motion.g initial={false} animate={{ opacity: showLeverage ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
          {/* Drying soil / wilting */}
          {[68, 75, 82, 89].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1="60"
              x2={x - 0.4}
              y2="62"
              className="stroke-status-warn"
              strokeWidth="0.4"
              opacity="0.6"
            />
          ))}
          <text x="78" y="58" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            יובש / מחסור
          </text>
        </motion.g>

        {/* Global market impact (ring around the whole) */}
        <motion.g initial={false} animate={{ opacity: showGlobal ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <ellipse cx="50" cy="38" rx="42" ry="20" fill="none" className="stroke-accent-hot" strokeWidth="0.3" strokeDasharray="1.5 1" opacity="0.7" />
          <text x="50" y="14" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            הדהוד בשווקים העולמיים
          </text>
          {/* Spreading ring */}
          <circle cx="50" cy="38" r="3" fill="none" className="stroke-accent-hot/40" strokeWidth="0.3">
            <animate attributeName="r" values="5;25;5" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        איך משאב הופך לנשק – 4 שלבים
      </div>
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