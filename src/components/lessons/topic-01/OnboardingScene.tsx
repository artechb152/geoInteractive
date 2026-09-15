'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { OnboardingEditProvider, EditableBlock, EditableFrame } from './onboarding-edit-mode';

export type Feature = 'flat' | 'mountain' | 'river' | 'narrow';

// Split out via next/dynamic so the frame-player (and its canvas/preload
// logic) doesn't end up in the initial bundle for the rest of the lesson.
const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), {
  loading: () => <TerrainStageLoading />,
});

type Step = {
  id: Feature;
  label: string;
  caption: string;
  insight: string;
};

const STEPS: Step[] = [
  {
    id: 'flat',
    label: 'שטח פתוח (בלי מכשולים)',
    caption: 'אין הרים, אין נהרות. שני הצבאות יכולים פשוט ללכת ישר זה לעבר זה. שום דבר בשטח לא עוזר ולא מפריע לאף אחד.',
    insight: 'בלי השפעה של השטח, מי שיגבר הוא מי שיש לו יותר חיילים, נשק טוב יותר או אימון טוב יותר. כלומר: כוח מול כוח, ניקוד טהור.',
  },
  {
    id: 'mountain',
    label: 'הוספת הר',
    caption: 'פתאום יש מכשול. אי אפשר ללכת ישר יותר — חייבים לעקוף מימין או משמאל. מי שמטפס לראש ההר ראשון רואה את כל מי שזז למטה.',
    insight: 'מי שמחזיק את הנקודה הגבוהה ביותר רואה את האויב ראשון, יורה אליו ראשון, וקשה מאוד לתקוף אותו מלמטה. זאת הסיבה שצבאות תמיד נלחמים על פסגות.',
  },
  {
    id: 'river',
    label: 'הוספת נהר',
    caption: 'טנקים, משאיות ותותחים לא יכולים פשוט לחצות נהר בשחייה. הם חייבים גשר. ואם יש רק גשר אחד — כל הצבא חייב להצטופף ולעבור דרכו.',
    insight: 'מי ששולט בגשר היחיד — שולט בכל הקרב. אפילו קבוצה קטנה של 50 חיילים, אם היא חוסמת או מפוצצת את הגשר, יכולה לעצור צבא של עשרות אלפים.',
  },
  {
    id: 'narrow',
    label: 'צמצום המעבר',
    caption: 'הוספנו שני רכסי הרים בצדדים. עכשיו המעבר באמצע הצטמצם לסדק. צבא של 10,000 חיילים נאלץ לעבור אחד מאחורי השני — לא 1,000 בשורה אלא 50, חשופים מכל צד.',
    insight: 'כשהמרחב הצר מאלץ אותך להצטופף בטור — היתרון המספרי שלך נעלם. כוח קטן עם נשק טוב יכול לעצור צבא ענק. זאת הסיבה שכל מפקד מחפש את "נקודות החנק" של האויב.',
  },
];

export function OnboardingScene() {
  const [step, setStep] = useState<Feature>('flat');
  // Whether the current step's explanation panel is expanded; null = collapsed.
  // Defaults to the first step being open so the user sees content immediately.
  const [expandedStep, setExpandedStep] = useState<Feature | null>('flat');

  const handleStepClick = (id: Feature) => {
    if (expandedStep === id) {
      // Clicking the open panel collapses it (the visualization on the left
      // stays — `step` doesn't change).
      setExpandedStep(null);
    } else {
      // Open this step and update the visualization to match.
      setStep(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
    <OnboardingEditProvider>
      <EditableBlock id="title-intro" label="כותרת + טקסט פתיחה">
      <SceneHeader
        step="01.0"
        eyebrow="לפני שמתחילים"
        underline
        title="איך גבעה רנדומלית, נהר או שביל צר הופכים לשובר השוויון של שדה הקרב?"
        intro="תארו לכם שני צבאות שעומדים להילחם. עכשיו, בואו נשחק עם השטח: תוסיפו הר,  נהר, ותראו איך כל שינוי טופוגרפי קטן משנה לגמרי את חוקי המשחק. לא צריך שום ידע צבאי – רק היגיון בריא"
      />
      </EditableBlock>

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-stretch">
        {/* Control panel — first child → RIGHT in RTL (text on right). */}
        <EditableBlock id="accordion-panel" label="פאנל השלבים" className="space-y-1">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === step) > i;
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
                  aria-controls={`step-panel-${s.id}`}
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
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">
                      {s.label}
                    </div>
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
                      key={`panel-${s.id}`}
                      id={`step-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-3">
                        <div className="mt-2">
                          <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                            מה קורה בשלב הזה?
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.caption}</p>
                        </div>
                        <div className="pt-2 border-t border-border-subtle">
                          <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                            ולמה זה משנה?
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.insight}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </EditableBlock>

        {/* Visualization — second child → LEFT in RTL. EditableFrame (not
            EditableBlock) so it doesn't add a wrapper div. */}
        <EditableFrame id="visual-frame" label="סרטון תצוגה">
        {/* No aspect-video here on purpose: the row stretches this to match
            the accordion column's height (items-stretch on the parent
            grid), and TerrainStage's canvas already cover-fits whatever
            box it's given (SceneOnboardingFramePlayer's drawCover), so it
            never distorts. min-h is only a floor for a very short/empty
            accordion state. */}
        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[320px] h-full [&_video]:!w-full [&_video]:!h-full">
          <TerrainStage feature={step} />
        </div>
        </EditableFrame>
      </div>

      <EditableBlock id="history-panel" label="פאנל 4 סיפורים היסטוריים" className="mt-12 mb-12">
        <HistoricalCasesPanel />
      </EditableBlock>

      <EditableBlock id="ready-callout" label="תיבת סיכום">
      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנתם את ההיגיון? מעולה. כל מה שראיתם עכשיו מבוסס על אינסטינקט בריא. בצבא, לאינסטינקטים האלה יש שמות, חוקים והגדרות. עכשיו ניקח את ההיגיון שלכם ונתרגם אותו לשפה שבה גנרלים מתכננים מלחמות. נתחיל מהבסיס: שלוש הרמות של המלחמה
            <strong className="text-black font-bold"> שלוש הרמות שבהן צבא חושב על מלחמה</strong>.</p>
      </ReadyCallout>
      </EditableBlock>

    </OnboardingEditProvider>
    </section>
  );
}

function TerrainStage({ feature }: { feature: Feature }) {
  return (
    <div className="relative w-full h-full">
      <SceneOnboardingFramePlayer targetState={feature} />
    </div>
  );
}

const CORNER_MARK_PATH: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
  tl: 'M16,0 H0 V16',
  tr: 'M0,0 H16 V16',
  bl: 'M0,0 V16 H16',
  br: 'M16,0 V16 H0',
};

const CORNER_MARK_POSITION: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
  tl: 'top-4 left-4',
  tr: 'top-4 right-4',
  bl: 'bottom-4 left-4',
  br: 'bottom-4 right-4',
};

// Viewfinder-style corner brackets on the terrain video — "this is running
// footage" framing. Positioned on the frame's physical corners (not
// RTL start-/end-) since they belong to the video's own visual frame, the
// same rule that keeps the terrain illustration itself from mirroring.
function CornerMark({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg
      aria-hidden
      className={cn(
        // Dark outline (4 chained zero-blur drop-shadows in one `filter`
        // property — stacking separate drop-shadow-[…] utilities doesn't
        // work, they all write the same --tw-drop-shadow var) so the
        // light stroke reads on both bright sky and light terrain.
        // overflow-visible: the bl/br strokes sit exactly on the viewBox
        // edge (y=16) — inside a fractional-height (aspect-video) ancestor
        // that pushes this bottom-positioned box to a sub-pixel offset, the
        // SVG's default overflow:hidden clips that edge stroke away
        // entirely, leaving only the vertical arm. Not an issue for the
        // top marks since their stroke sits on the y=0 edge instead.
        'pointer-events-none absolute z-10 overflow-visible text-paper-bright',
        '[filter:drop-shadow(1px_0_0_rgba(0,0,0,0.75))_drop-shadow(-1px_0_0_rgba(0,0,0,0.75))_drop-shadow(0_1px_0_rgba(0,0,0,0.75))_drop-shadow(0_-1px_0_rgba(0,0,0,0.75))]',
        CORNER_MARK_POSITION[corner],
      )}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d={CORNER_MARK_PATH[corner]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TerrainStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-sm font-display leading-snug">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
      </div>
    </div>
  );
}
