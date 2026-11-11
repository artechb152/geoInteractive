'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { NavigationExamplesPanel } from './NavigationExamplesPanel';

const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), { ssr: false });

type Phase = 'plan' | 'start' | 'travel' | 'arrive';

type Step = {
  id: Phase;
  label: string;
  icon: IconName;
  caption: string;
  insight: string;
};

const STEPS: Step[] = [
  {
    id: 'plan',
    label: 'תכנון: בחירת המסלול',
    icon: 'flag',
    caption: 'מסמנים במפה מוצא (A) ויעד (B) ומשווים בין מסלולים לפי מרחק, תנאי שטח וחשיפה.',
    insight: 'המסלול הקצר ביותר אינו בהכרח המתאים. בתכנון גם בוחרים מראש היכן בודקים את המיקום.',
  },
  {
    id: 'start',
    label: 'יציאה: קביעת כיוון',
    icon: 'compass',
    caption: 'לפני היציאה מוודאים את המיקום ומכוונים את המצפן לפי האזימוט המתוכנן.',
    insight: 'סטייה קטנה בכיוון מצטברת ככל שהמרחק גדל.',
  },
  {
    id: 'travel',
    label: 'בתנועה: בדיקת המיקום',
    icon: 'eye',
    caption: 'בתנועה משווים סימנים בולטים בשטח, כמו הגבעה והדקלים, למיקומם במפה.',
    insight: 'כך מזהים סטייה מוקדם. אם השטח אינו תואם את המפה, בודקים שוב את המיקום והכיוון לפני שממשיכים.',
  },
  {
    id: 'arrive',
    label: 'הגעה: אימות היעד',
    icon: 'target',
    caption: 'באזור היעד מזהים את הנקודה לפי סימנים שנבחרו מראש, כמו צומת או מבנה בולט.',
    insight: 'קרבה ליעד אינה אישור הגעה. בחושך או בראות מוגבלת קל לבלבל בין מקומות דומים.',
  },
];

// Laptop fit (LessonViewportFit): each of the two screens of this part is
// shrunk uniformly, like a slide, from its 1920×1080 composition. The section
// uses max-w-lesson and lg:px-8, so the reference width is the section's
// content box there (1408 − 2·32). Heights are the screens measured at that
// width (2026-10-19): screen 1 = header + mb-8 + accordion/stage row (the row
// height is the same with every step open; all-closed is shorter), screen 2
// = examples band + ReadyCallout (2026-10-26; the band is the same height for
// every example, see NavigationExamplesPanel). Any column narrower than 1344px
// (1440 with the side nav: 1052px) shrinks the screens too, so they keep the
// 1920 line breaks instead of reflowing.
const FIT_WIDTH = 1344;
const FIT_HEIGHT_STEPS = 777;
const FIT_HEIGHT_CASES = 1050;
// Viewport px above a screen when it is read in place: the site header
// (--header-h, 5rem from lg) plus the shell's 24px top gap that sits above
// the section at scroll 0. Mirrored below screen 1, whose bottom would
// otherwise be measured to include screen 2.
const FIT_GAP = 24;
const FIT_TOP = 80 + FIT_GAP;

export function OnboardingScene() {
  const [phase, setPhase] = useState<Phase>('plan');
  const [expandedStep, setExpandedStep] = useState<Phase | null>('plan');

  const handleStepClick = (id: Phase) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setPhase(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_STEPS}
        reserveBottom={FIT_GAP}
      >
        <SceneHeader
          title="ניווט בשטח: מתכנון ועד הגעה"
          intro="איך מגיעים ליעד בשטח לא מוכר? בחרו שלב וראו מה עושים בו."
        />

        {/* One card holds the four stages and the illustration they drive (one envelope per activity);
            the lesson's activity padding, so its content edges line up with the cards that follow. */}
        <div data-activity="nav-stages" className="surface-elevated p-6 lg:p-8 grid md:grid-cols-[2fr_3fr] gap-6">
          <div className="space-y-3">
            {STEPS.map((s, i) => {
              const active = phase === s.id;
              const expanded = expandedStep === s.id;
              const passed = STEPS.findIndex((x) => x.id === phase) > i;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'relative isolate rounded-xl border bg-bg-elevated overflow-hidden transition-colors duration-200 ease-snap',
                    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                    active
                      ? 'border-brand/45'
                      : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleStepClick(s.id)}
                    aria-expanded={expanded}
                    aria-controls={`step-panel-${s.id}`}
                    className="w-full p-4 text-start flex items-center gap-3 cursor-pointer rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
                  >
                    <span
                      className={cn(
                        'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ease-snap',
                        active || passed ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted'
                      )}
                    >
                      {passed && !active ? (
                        <Icon name="check" size={18} strokeWidth={2.5} />
                      ) : (
                        <span className="font-display text-base font-bold">{i + 1}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold leading-snug text-black text-lg md:text-xl">
                        {s.label}
                      </div>
                    </div>
                    <motion.span
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                    >
                      <svg
                        width="20"
                        height="20"
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
                        key={`panel-${s.id}`}
                        id={`step-panel-${s.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 pt-1 space-y-2">
                          <p className="text-base leading-relaxed text-black">{s.caption}</p>
                          <p className="text-base leading-relaxed text-black">{s.insight}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-bg-accent relative overflow-hidden min-h-[280px]">
            <MissionStage phase={phase} />
          </div>
        </div>
      </LessonViewportFit>

      {/* mt-12 sits on the unscaled wrapper so the gap between the screens
          stays the original 48px. */}
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_CASES}
        reserveTop={FIT_TOP}
        className="mt-12"
      >
        {/* Same structure as lesson 2's practical-examples panel; its own file. */}
        <NavigationExamplesPanel />
      </LessonViewportFit>
    </section>
  );
}

function MissionStage({ phase }: { phase: Phase }) {
  return <div className="relative w-full h-full" role="img" aria-label="המחשת שלבי הניווט: תכנון, קביעת כיוון, בדיקת מיקום ואימות היעד"><SceneOnboardingFramePlayer targetState={phase} /></div>;
}
