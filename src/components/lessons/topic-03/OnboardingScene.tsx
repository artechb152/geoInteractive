'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

export type View = 'flat' | 'mountain' | 'valley' | 'analyzed';

// Split out via next/dynamic so the frame-player (and its canvas/preload
// logic) doesn't end up in the initial bundle for the rest of the lesson —
// same technology as topic-01/02/04/OnboardingScene.tsx.
const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), {
  loading: () => <ManeuverStageLoading />,
});

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
      'הוספת קווי גובה (קונטור) הופכת את המפה לתלת-ממדית. פתאום אפשר להבחין מהי פסגה ומהו עמק, וכמה הר הוא תלול. מי שתופס את השטח הגבוה רואה את האויב ראשון, יורה אליו ראשון ונהנה מיתרון לוגיסטי גדול — לכן צבאות לרוב נלחמים על הפסגות.',
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
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="04.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    <span className="gradient-text">איך לוחמים קוראים שטח — ולא רק מסתכלים עליו?</span>
  </>
}        intro="תייר רואה נוף יפה; מפקד רואה הזדמנויות ומכשולים. כדי להבין את שדה הקרב, עלינו לקלף את השכבות של פני השטח (המורפולוגיה). בוא נראה איך אותו הר משתנה ב-4 שלבים — מהמבט התמים ועד לניתוח הצבאי שיכריע את הקרב."
      />

      <div className="grid md:grid-cols-[32fr_68fr] gap-6">
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
                  aria-controls={`t4-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">{s.label}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="22"
                      height="22"
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
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20 md:min-h-[236px]">
                        <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {s.popupTitle}
                        </div>
                        <p className="text-base leading-relaxed text-black">
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
        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px] [&_canvas]:!w-full [&_canvas]:!h-full">
          <SceneOnboardingFramePlayer targetState={view} />
        </div>
      </div>

      {/* Historical examples — same panel layout as topic-02
          (topic-02/HistoricalCasesPanel.tsx), per user request 2026-09-15.
          Replaced the IntelCard grid; the four examples moved into the
          panel's own CASES array (topic-03/HistoricalCasesPanel.tsx). */}
      <div className="mt-20 mb-12">
        <HistoricalCasesPanel />
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנת ש"קריאת שטח" זה משהו שלם — לא ריגוש מהנוף. בשלוש הסצנות הבאות נצלול לעומק:
            <strong className="text-fg"> מאיזה סלע ההר עשוי, איך לזהות 5 צורות נוף קלאסיות, ואיך מסווגים שטח לפי הערך הצבאי שלו</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function ManeuverStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-xs font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
      </div>
    </div>
  );
}
