'use client';
import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SceneHeader } from './SceneHeader';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { PlanningLab } from './planning-lab/PlanningLab';
import { NavigationReplayScreen } from './navigation-replay/NavigationReplayActivity';

/**
 * „דגשים לתכנון ולניווט” — a practical bridge between the general four-stage
 * overview (OnboardingScene) and the techniques that follow. Two screens: what
 * is prepared before leaving — an open planning lab on a live terrain model and
 * its map (planning-lab/PlanningLab, 2026-10-29) — and what is checked while
 * moving — the navigation replay (navigation-replay/, „מתי עוצרים לבדוק?”),
 * four moments along a route over a live 3D model of the ground. The copy
 * restates the lesson's existing explanations (OnboardingScene, PlanningScene,
 * content/topic-06.md); azimuth, north types and pacing stay in their own
 * sub-topics.
 */

/**
 * Laptop fit — each of the three screens (the planning lab, the navigation replay, the
 * application question with its conclusion) shrinks on its own, like a slide,
 * so the whole screen fits under the site header once it is scrolled to. The
 * 1920×1080 layout is the reference: scale 1 there and on any screen with
 * room for it.
 *   - Width: the section's content width at the reference viewport
 *     (max-w-lesson − lg:px-8), the same 1344px as every other screen of
 *     lessons 2 and 6, so the tips show at the lesson's interface size.
 *   - Heights: the tallest state of each screen at the reference width
 *     (measured 2026-10-27, one card per screen; the question with its
 *     longest feedback and its button; the planning lab measured 2026-10-29 —
 *     its views and panel have fixed heights, 744px; the nav screen became the
 *     navigation replay on 2026-10-29: 1027px with its title, every state —
 *     the decision area reserves its tallest), so the scale
 *     stays steady while learners switch tips or answer. Inside the lesson
 *     (LessonFitUniform) they are ignored; they apply where the scene is
 *     rendered on its own (the archive).
 *   - Reserves are numeric because the screens sit deep in a scrolling page:
 *     the fixed 80px site header plus a 24px gap above, 24px of air below —
 *     the same reserves as the other topic-06 parts.
 *   - A screen shrunk by height is narrower than the column; it keeps to the
 *     inline start (right) so the three screens share one right edge.
 */
const FIT_WIDTH = 1344;
const FIT_HEIGHT = { plan: 744, nav: 1027, question: 532 } as const;
const FIT_RESERVE_TOP = 104;
const FIT_RESERVE_BOTTOM = 24;

function ScreenFit({ height, children }: { height: number; children: ReactNode }) {
  return (
    <LessonViewportFit
      referenceWidth={FIT_WIDTH}
      referenceHeight={height}
      reserveTop={FIT_RESERVE_TOP}
      reserveBottom={FIT_RESERVE_BOTTOM}
      align="start"
      fitTallerStates
    >
      {children}
    </LessonViewportFit>
  );
}

/** Motion language (INTERACTION_DNA): snap ease, ~0.3s panel swaps. */
const EASE = [0.22, 1, 0.36, 1] as const;

export function PlanningTipsScene() {
  return (
    <section id="scene-tips" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      {/* The part header shrinks with the screens, as in the other sub-topics of the lesson. */}
      <LessonViewportFit referenceWidth={FIT_WIDTH} reserveBottom={FIT_RESERVE_BOTTOM}>
        <SceneHeader
          title="דגשים לתכנון ולניווט"
          intro="מה מכינים לפני היציאה, ומה בודקים במהלך התנועה?"
        />
      </LessonViewportFit>

      <ScreenFit height={FIT_HEIGHT.plan}>
        <div data-tips-screen="plan">
          <PlanningLab
            title="לפני שיוצאים: מה צריך לתכנן?"
            intro="בנו את התכנון על המפה ובחנו אותו בשטח: מוצא ויעד מזוהים, דרך שנבחרת לפי צורות הקרקע, כיוון ומרחק בכל קטע, וסימנים לבדיקת המיקום."
          />
        </div>
      </ScreenFit>

      <div className="mt-12">
        <ScreenFit height={FIT_HEIGHT.nav}>
          <NavigationReplayScreen />
        </ScreenFit>
      </div>

      <div className="mt-12">
        <ScreenFit height={FIT_HEIGHT.question}>
          <div data-tips-screen="question">
            <ApplicationQuestion />
            <ConclusionCard />
          </div>
        </ScreenFit>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Application question — a choice with reasoned feedback; retry is open and
// nothing here blocks moving on to the next sub-topic.
// ─────────────────────────────────────────────────────────────────────────────

type Option = { id: string; label: string; correct: boolean; feedback: string };

const QUESTION_STEM =
  'הגעתם לצומת שנראה כמו הצומת המתוכנן, אבל המרחק וסדר הסימנים אינם תואמים. האם אפשר לאשר שזהו הצומת?';

/**
 * Two "yes" and two "no" answers, so the answer is not the odd one out. Each
 * wrong answer targets one misconception (looks alone, direction alone, keep
 * walking), and its feedback says why it fails without quoting the right one.
 */
const OPTIONS: Option[] = [
  {
    id: 'looks',
    label: 'כן. הצומת נראה כמו הצומת שבתכנון.',
    correct: false,
    feedback: 'מראה דומה אינו מספיק: קל לבלבל בין מקומות דומים. כאן המרחק וסדר הסימנים אינם תואמים לתכנון, ולכן ייתכן שזה צומת אחר.',
  },
  {
    id: 'continue',
    label: 'לא. ממשיכים בכיוון המתוכנן עד הסימן הבא.',
    correct: false,
    feedback: 'אם זה אינו הצומת, ממשיכים מנקודה שגויה, וכל צעד נוסף מגדיל את הסטייה. אי־התאמה לתכנון היא סיבה לבדוק לפני שממשיכים.',
  },
  {
    id: 'recheck',
    label: 'לא. קודם בודקים את המיקום מול המפה.',
    correct: true,
    feedback: 'הצומת אמנם נראה נכון, אבל המרחק וסדר הסימנים מרמזים שאולי זה צומת דומה אחר. משווים למפה את המרחק, את סדר הסימנים ואת הסביבה, ומאשרים רק כשכולם מתאימים.',
  },
  {
    id: 'direction',
    label: 'כן, אם הכיוון שבו הלכתם תואם לתכנון.',
    correct: false,
    feedback: 'כיוון נכון לבדו אינו מספיק: גם בכיוון הנכון אפשר להגיע לצומת דומה, לפני הצומת המתוכנן או אחריו. כאן המרחק וסדר הסימנים אינם תואמים לתכנון.',
  },
];

function ApplicationQuestion() {
  const [picked, setPicked] = useState<string | null>(null);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const choice = OPTIONS.find((o) => o.id === picked) ?? null;

  // Reset removes its own button, so focus goes back to the first answer.
  const reset = () => {
    setPicked(null);
    optionRefs.current[0]?.focus();
  };

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="tips-question">
      {/* The lesson's activity tiers: card title, then the question as its sub-heading. */}
      <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">שאלת יישום</h3>
      <h4 id={`${uid}-stem`} className="mt-2 font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance">
        {QUESTION_STEM}
      </h4>

      {/* Two answers per row across the card's width (reading order: right, left, then the next row). */}
      <div role="group" aria-labelledby={`${uid}-stem`} className="mt-5 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o, i) => {
          const isPicked = picked === o.id;
          return (
            <button
              key={o.id}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setPicked(o.id)}
              aria-pressed={isPicked}
              data-option={o.id}
              className={cn(
                'w-full text-start px-4 py-3 rounded-xl border transition-all duration-300 ease-snap text-base leading-relaxed text-black flex items-center gap-3',
                !isPicked && 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                isPicked && o.correct && 'bg-status-ok/10 border-status-ok/50',
                isPicked && !o.correct && 'bg-status-danger/10 border-status-danger/50',
              )}
            >
              <span
                className={cn(
                  'grid place-items-center size-5 shrink-0 rounded-full border transition-colors',
                  !isPicked && 'border-border',
                  isPicked && o.correct && 'border-status-ok bg-status-ok text-bg-elevated',
                  isPicked && !o.correct && 'border-status-danger bg-status-danger text-bg-elevated',
                )}
                aria-hidden
              >
                {isPicked && (o.correct ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />)}
              </span>
              <span className="flex-1 text-pretty leading-relaxed">{o.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback — announced once per choice; a wrong choice keeps the options open for another try.
          The block opens once; switching answers swaps its content in place, so nothing below jumps. */}
      <div role="status" aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false}>
          {choice && (
            <motion.div
              key="feedback"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
              data-tips-feedback={choice.correct ? 'correct' : 'wrong'}
            >
              <motion.div
                key={choice.id}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'mt-4 p-4 rounded-xl text-base leading-relaxed border flex gap-2.5 items-start',
                  choice.correct ? 'border-status-ok/50 bg-status-ok/10' : 'border-status-danger/50 bg-status-danger/10',
                )}
              >
                <span
                  className={cn(
                    'grid place-items-center size-5 shrink-0 rounded-full mt-0.5',
                    choice.correct ? 'bg-status-ok text-bg-elevated' : 'bg-status-danger text-bg-elevated',
                  )}
                  aria-hidden
                >
                  {choice.correct ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <span className="text-black text-pretty">
                  <strong className={cn('font-bold me-1', choice.correct ? 'text-status-ok' : 'text-status-danger')}>
                    {choice.correct ? 'נכון.' : 'עוד לא.'}
                  </strong>
                  {choice.feedback}
                  {!choice.correct && <span className="block mt-1 text-sm text-fg-muted">בחרו תשובה אחרת ונסו שוב.</span>}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset — outside the live region, opening with the feedback (the same timing). */}
      <AnimatePresence initial={false}>
        {choice && (
          <motion.div
            key="reset"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden -m-1 p-1"
          >
            <div className="pt-4">
              <button type="button" onClick={reset} className="btn-secondary" data-tips-reset>
                {choice.correct ? 'התחלה מחדש' : 'ניסיון נוסף'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConclusionCard() {
  return (
    <div className="mt-6 surface p-5 sm:p-6">
      <p className="text-base text-fg leading-relaxed text-pretty">
        התכנון קובע מה צפוי בדרך, ובתנועה משווים את השטח לתכנון.{' '}
        <strong className="text-fg">בחלק הבא: טכניקות ניווט, ואיך בוחרים ביניהן לפי הסימנים הזמינים והראות.</strong>
      </p>
    </div>
  );
}
