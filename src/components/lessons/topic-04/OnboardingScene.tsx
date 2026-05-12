'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { IntelCard } from '@/components/lesson/IntelCard';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'flat' | 'mountain' | 'valley' | 'analyzed';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'flat',
    label: 'מתחילים מהמראה התמים',
    icon: 'eye',
    popupTitle: 'מבט שטוח: רואים — אבל לא יודעים',
    popupBody:
      'מבט שטוח על הנוף. אנחנו רואים אדמה, סלעים וצמחייה, אבל חסר לנו המידע החשוב באמת: הגובה, העומק והמרחקים. בלי לנתח את צורת פני הקרקע (המורפולוגיה), אי אפשר לדעת איפה האויב יכול להסתתר או מאיפה כדאי להתקדם. הצבא לא יכול לקבל החלטות על סמך "תמונה יפה" בלבד.',
  },
  {
    id: 'mountain',
    label: 'מסמנים את הגובה',
    icon: 'mountain',
    popupTitle: 'גובה: היתרון הטופוגרפי הכי בסיסי',
    popupBody:
      'הוספת קווי גובה (קונטור) הופכת את המפה לתלת-ממדית. פתאום אפשר להבחין מהי פסגה ומהו עמק, וכמה הר הוא תלול. מי שתופס את השטח הגבוה רואה את האויב ראשון, יורה אליו ראשון ונהנה מיתרון לוגיסטי גדול — לכן צבאות תמיד נלחמים על פסגות.',
  },
  {
    id: 'valley',
    label: 'מסמנים מה מסתתר',
    icon: 'shield',
    popupTitle: 'שטח מת: מה שמוסתר מהעין שווה זהב',
    popupBody:
      '"שטח מת" (Dead Space) הוא אזור שמוסתר מאיתנו בגלל כפלי קרקע או מצוקים — אנחנו לא יכולים לראות מה קורה בו ולא לירות אליו בקו ישר. מפקד חכם משתמש בשטח מת כדי להגניב כוחות אל היעד, להחביא מפקדה ולהגן על האספקה שלו. מה שלא רואים — לא יורים בו.',
  },
  {
    id: 'analyzed',
    label: 'התמונה הצבאית המלאה',
    icon: 'crosshair',
    popupTitle: 'שטח שולט + שטח חיוני = תוכנית הקרב',
    popupBody:
      'עכשיו מסמנים שני סוגי שטחים מיוחדים: "שטח שולט" — הנקודות שמהן רואים הכל ושולטים באש על השטח מסביב; ו"שטח חיוני" — נקודות שכל מי שעובר בשטח חייב לעבור דרכן, כמו צומת או מעבר. המפה כבר לא ציור, היא תוכנית עבודה: איפה לתפוס תצפית, איפה לחסום את האויב, ואיפה יקרה הקרב.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'ממעט טנקים על הפסגה — בלמו מאות בעמק',
    place: 'בקעת הבכא · יום הכיפורים 1973',
    lesson: 'במלחמת יום הכיפורים, הסורים שלחו מאות טנקים דרך עמקים מבלי לאבטח את השטח השולט מסביב. כוחות צה"ל שהתמקמו בכיפות (הפסגות) נהנו מעליונות בתצפית ובאש, ובלמו כוחות גדולים מהם פי 5.',
    icon: 'mountain',
    accent: 'text-accent',
  },
  {
    headline: 'טור אמריקאי בוואדי — אש מ-3 כיוונים',
    place: 'אפגניסטן · 2008',
    lesson: 'יחידה אמריקאית התקדמה בתוך גיא (ואדי) צר. הטאליבן ניצל את השלוחות השולטות כדי לפתוח באש מ-3 כיוונים. התוצאה הייתה קטלנית, כי הכוח האמריקאי היה בנחיתות טופוגרפית מוחלטת בתוך העמק.',
    icon: 'crosshair',
    accent: 'text-status-danger',
  },
  {
    headline: 'אוכף בין פסגות — עוקפים את ההגנה',
    place: 'נורמנדי · קיץ 1944',
    lesson: 'במקום לתקוף חזיתית פסגות מבוצרות, יחידה בריטית זיהתה אוכף — נקודת שפל נוחה למעבר בין שתי כיפות. המעבר דרך האוכף אפשר להם לעקוף את קווי ההגנה ולהפתיע את הגרמנים מהאגף.',
    icon: 'check',
    accent: 'text-status-ok',
  },
  {
    headline: 'מבוצרים בעמק — בלי שטח שולט, בלי תקומה',
    place: 'דיאן ביאן פו · ויאטנם 1954',
    lesson: 'הצרפתים התמקמו בעמק עמוק והפקירו את השטח השולט (השלוחות והפסגות) לוייטנאמים. התוצאה: הכוח הצרפתי הפך למטרה נייחת בתוך "שטח השמדה", מה שהוביל לתבוסה מוחלטת במלחמה.',
    icon: 'shield',
    accent: 'text-status-warn',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('flat');
  const [expandedStep, setExpandedStep] = useState<View | null>('flat');

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
        step="04.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            <span className="gradient-text">איך מפקד "קורא" את השטח אחרת מתייר?</span>
          </>
        }
        intro="תייר רואה נוף יפה; מפקד רואה הזדמנויות ומכשולים. כדי להבין את שדה הקרב, עלינו לקלף את השכבות של פני השטח (המורפולוגיה). בוא נראה איך אותו הר משתנה ב-4 שלבים — מהמבט התמים ועד לניתוח הצבאי שיכריע את הקרב."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* Accordion list — first child → RIGHT in RTL (text on right) */}
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
                  aria-controls={`t4-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t4-onb-bar"
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
                      key={`t4-onb-panel-${s.id}`}
                      id={`t4-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-sm font-display font-semibold text-accent-hover mt-3 mb-2 tracking-wider">
                          למה זה משנה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                          {s.popupBody}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Visualization — second child → LEFT in RTL */}
        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <TerrainStage view={view} />
        </div>
      </div>

      <SoftDivider text="כשלא קוראים נכון את ההר — המחיר עצום" />

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

      <ReadyCallout title="עכשיו אתה מוכן">
        <p>הבנת ש"קריאת שטח" זה משהו שלם — לא ריגוש מהנוף. בשלוש הסצנות הבאות נצלול לעומק:
            <strong className="text-fg"> מאיזה סלע ההר עשוי, איך לזהות 5 צורות נוף קלאסיות, ואיך מסווגים שטח לפי הערך הצבאי שלו</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function TerrainStage({ view }: { view: View }) {
  const showHeights = view !== 'flat';
  const showHidden = view === 'valley' || view === 'analyzed';
  const showTactical = view === 'analyzed';

  const peaks = [
    { x: 18, y: 38, h: '420' },
    { x: 50, y: 30, h: '540' },
    { x: 82, y: 35, h: '480' },
  ];

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-4)" />

        {/* Mountain silhouettes */}
        <path
          d="M0 65 L18 38 L34 55 L50 30 L66 48 L82 35 L100 60 L100 75 L0 75 Z"
          className="fill-terrain-ridge/30 stroke-terrain-ridge/50"
          strokeWidth="0.3"
        />
        <path
          d="M0 70 L25 50 L45 60 L65 45 L85 58 L100 65 L100 75 L0 75 Z"
          className="fill-terrain-sand/15"
        />

        {/* Peak markers + height labels */}
        <motion.g initial={false} animate={{ opacity: showHeights ? 1 : 0 }} transition={{ duration: 0.4 }}>
          {peaks.map((p, i) => {
            const isCenter = i === 1;
            // When tactical view is on, tuck the center peak's height label
            // closer to the triangle so the "שטח שולט" header at the top has
            // room to breathe.
            const labelY = isCenter && showTactical ? p.y - 3.2 : p.y - 5;
            return (
              <g key={i}>
                <polygon
                  points={`${p.x},${p.y - 2.6} ${p.x - 2.6},${p.y + 2.6} ${p.x + 2.6},${p.y + 2.6}`}
                  className="fill-accent"
                />
                <text
                  x={p.x}
                  y={labelY}
                  textAnchor="middle"
                  className="fill-accent font-display font-bold"
                  fontSize="4.2"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                >
                  {p.h} מ׳
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* Hidden valley (dead space) */}
        <motion.g initial={false} animate={{ opacity: showHidden ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <rect
            x="33"
            y="49"
            width="20"
            height="15"
            rx="1.4"
            className="fill-status-ok/25 stroke-status-ok/80"
            strokeWidth="0.6"
            strokeDasharray="1.4 0.9"
          />
          <text
            x="43"
            y="56"
            textAnchor="middle"
            className="fill-status-ok font-display font-bold"
            fontSize="4.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinejoin="round"
          >
            שטח מת
          </text>
          <text
            x="43"
            y="61"
            textAnchor="middle"
            className="fill-status-ok font-sans font-semibold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            סמוי לאויב
          </text>
        </motion.g>

        {/* Tactical overlay — commanding + key terrain */}
        <motion.g initial={false} animate={{ opacity: showTactical ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Commanding terrain — ring around the highest peak */}
          <circle
            cx="50"
            cy="30"
            r="8"
            fill="none"
            className="stroke-accent"
            strokeWidth="0.7"
            strokeDasharray="1.4 0.9"
          />
          <text
            x="50"
            y="9"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="4.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            שטח שולט
          </text>

          {/* Key terrain — supply junction */}
          <circle cx="70" cy="58" r="2.6" className="fill-accent-hot" />
          <circle cx="70" cy="58" r="2.6" fill="none" className="stroke-accent-hot/50" strokeWidth="0.4">
            <animate attributeName="r" values="2.6;5;2.6" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text
            x="70"
            y="67.5"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            שטח חיוני
          </text>
          <text
            x="70"
            y="72"
            textAnchor="middle"
            className="fill-accent-hot font-sans font-semibold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            צומת אספקה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו הר · 4 שכבות הסתכלות
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
