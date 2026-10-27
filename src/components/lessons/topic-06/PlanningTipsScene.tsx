'use client';
import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SceneHeader } from './SceneHeader';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { NavTipsMap, TipsLegendGlyph, TIP_LEGS, type MapFocus, type NavFocus, type PlanFocus } from './NavTipsMap';

/**
 * „דגשים לתכנון ולניווט” — a practical bridge between the general four-stage
 * overview (OnboardingScene) and the techniques that follow. Two screens on
 * one learning map: what is prepared before leaving, and what is checked while
 * moving. The copy restates the lesson's existing explanations (OnboardingScene,
 * PlanningScene, content/topic-06.md); azimuth, north types and pacing stay in
 * their own sub-topics.
 */

type Tip<F extends MapFocus> = {
  id: F;
  title: string;
  /** the action, one sentence */
  what: string;
  /** why it helps, one sentence */
  why: string;
  /**
   * What the map shows in this state — the caption under it and the map's
   * accessible name. It describes the map; it does not repeat `what`.
   */
  map: string;
};

const PLAN_TIPS: Tip<PlanFocus>[] = [
  {
    id: 'ends',
    title: 'מכירים את המוצא ואת היעד',
    what: 'מאתרים במפה את המוצא (נ.ה) ואת היעד (נ.ס), ובוחרים לכל אחד סימנים לאימות בשטח.',
    why: 'כך יוצאים מהמקום הנכון, ובסוף מאשרים שמגיעים ליעד עצמו ולא רק לאזור קרוב אליו.',
    map: 'במפה: נ.ה ליד מבנה בולט, ונ.ס בקבוצת אורנים על קרקע סלעית.',
  },
  {
    id: 'route',
    title: 'בוחרים מסלול לפי תנאי השטח',
    what: 'משווים בין מסלולים אפשריים לפי המרחק, צורות הקרקע והקשיים הצפויים.',
    why: 'כך צופים קשיים בשטח עוד לפני היציאה.',
    map: 'במפה: הקו הישיר קצר יותר, אבל עובר מעל הפסגה. המסלול שנבחר עובר באוכף, הנקודה הנמוכה ברכס שבין שתי הפסגות.',
  },
  {
    id: 'legs',
    title: 'מחלקים את הדרך לקטעים',
    what: 'מחלקים את המסלול לקטעי דרך מנקודה לנקודה, ולכל קטע מגדירים כיוון ומרחק משוער.',
    why: 'כך יודעים בכל קטע לאן הולכים ולאיזה מרחק, וקל יותר לזהות סטייה.',
    map: 'במפה: ארבעה קטעי דרך בין נ.ה לנ.ס. החץ מראה את הכיוון, והתווית מציינת את המרחק המשוער.',
  },
  {
    id: 'checkpoints',
    title: 'קובעים נקודות לבדיקת המיקום',
    what: 'בוחרים לאורך המסלול סימנים שקל לזהות במפה ובשטח, ורושמים אותם בסיפור הדרך לפי סדר הופעתם.',
    why: 'בכל סימן כזה בודקים את המיקום, וסיפור דרך שנלמד מראש מפחית עומס מחשבתי בזמן התנועה.',
    map: 'במפה: עיקול הנחל, האוכף, חציית דרך העפר, ולבסוף האורנים על הקרקע הסלעית בנ.ס.',
  },
];

const NAV_TIPS: Tip<NavFocus>[] = [
  {
    id: 'verify',
    title: 'מאמתים מיקום וכיוון לפני ההתקדמות',
    what: 'יוצאים לכל קטע דרך מנקודה מזוהה, ובודקים במפה ובמצפן את הכיוון לקטע הבא.',
    why: 'כך לא יוצאים מנקודה שגויה או בכיוון שגוי.',
    map: 'במפה: אתם בעיקול הנחל (נקודה 1), והחץ מראה את הכיוון לקטע הבא, אל האוכף.',
  },
  {
    id: 'compare',
    title: 'משווים בין הצפוי לנראה בשטח',
    what: 'בתנועה משווים את הסימנים בשטח לסיפור הדרך: האם הם מופיעים בסדר הצפוי ובצורה שבמפה.',
    why: 'סימן שמופיע שלא בסדר הצפוי, או בצורה אחרת, מרמז על סטייה, ומגלים אותה כשהיא עוד קטנה.',
    map: 'במפה: עיקול הנחל מאחוריכם. הסימן הבא הוא אוכף בין שתי פסגות, ואותו מחפשים בשטח.',
  },
  {
    id: 'combine',
    title: 'משלבים כיוון, מרחק וסימני שטח',
    what: 'בודקים את המיקום לפי כמה נתונים יחד: הכיוון שבו הלכתם, המרחק שעברתם והסימנים סביבכם.',
    why: 'קל לבלבל בין מקומות דומים, והתאמה של כל הנתונים אמינה יותר מהסתמכות על סימן דומה אחד.',
    map: `במפה: הגעתם לאוכף. הכיוון מעיקול הנחל, המרחק (כ־${TIP_LEGS[1].m} מ׳) וצורת שתי הפסגות מתאימים לתכנון.`,
  },
  {
    id: 'mismatch',
    title: 'בודקים אי־התאמה לפני שממשיכים',
    what: 'כשסימן צפוי אינו מופיע או שהשטח אינו תואם לתכנון, לא ממשיכים מיד: משווים את הסביבה למפה ובודקים כיוון ומרחק מהנקודה המזוהה האחרונה.',
    why: 'כך לא ממשיכים מנקודה שגויה, וחוזרים למסלול כל עוד זה קל.',
    map: `במפה: כ־${TIP_LEGS[2].m} מ׳ אחרי האוכף הייתם אמורים לחצות דרך עפר, אבל היא לא הופיעה. הדרך שעברתם מראה שהכיוון סטה מהמסלול.`,
  },
];

type LegendItem = { kind: 'route' | 'ahead' | 'walked' | 'checkpoint' | 'verified' | 'position'; label: string };

const PLAN_LEGEND: LegendItem[] = [
  { kind: 'route', label: 'המסלול המתוכנן' },
  { kind: 'checkpoint', label: 'נקודה לבדיקת המיקום' },
];
const NAV_LEGEND: LegendItem[] = [
  { kind: 'position', label: 'מיקום נוכחי' },
  { kind: 'walked', label: 'הדרך שעברתם' },
  { kind: 'verified', label: 'נקודה מזוהה' },
  { kind: 'ahead', label: 'המשך המסלול המתוכנן' },
];

/**
 * Laptop fit — each of the three screens (planning tips, navigation tips, the
 * application question with its conclusion) shrinks on its own, like a slide,
 * so the whole screen fits under the site header once it is scrolled to. The
 * 1920×1080 layout is the reference: scale 1 there and on any screen with
 * room for it.
 *   - Width: the section's content width at the reference viewport
 *     (max-w-lesson − lg:px-8), the same 1344px as every other screen of
 *     lessons 2 and 6, so the tips show at the lesson's interface size.
 *   - Heights: the tallest state of each screen at the reference width
 *     (measured 2026-10-27, one card per screen: plan and nav for every tip;
 *     the question with its longest feedback and its button), so the scale
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
const FIT_HEIGHT = { plan: 863, nav: 841, question: 532 } as const;
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
        <TipsScreen
          screenId="plan"
          title="לפני שיוצאים: מה צריך לתכנן?"
          intro="בחרו דגש וראו אותו במפה."
          boardLabel="מפת התכנון"
          boardNote="דוגמה לימודית, נפרדת מסיפור הדרך שבהמשך"
          tips={PLAN_TIPS}
          legend={PLAN_LEGEND}
        />
      </ScreenFit>

      <div className="mt-12">
        <ScreenFit height={FIT_HEIGHT.nav}>
          <TipsScreen
            screenId="nav"
            title="במהלך הניווט: מה צריך לבדוק?"
            intro="בחרו דגש וראו במפה מה בודקים במיקום הנוכחי."
            boardLabel="אותה מפה, עם המיקום הנוכחי"
            tips={NAV_TIPS}
            legend={NAV_LEGEND}
          />
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

/**
 * One screen, one card: the title, the instruction, the tips as an accordion
 * (one open at a time, the first open on entry) and the shared map board as an
 * inset beside them. Choosing a tip updates the map and the caption under it,
 * so every map highlight also has a text description.
 */
function TipsScreen<F extends MapFocus>({
  screenId,
  title,
  intro,
  boardLabel,
  boardNote,
  tips,
  legend,
}: {
  screenId: string;
  title: string;
  intro: string;
  boardLabel: string;
  boardNote?: string;
  tips: Tip<F>[];
  legend: LegendItem[];
}) {
  const [active, setActive] = useState<F>(tips[0].id);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tips.findIndex((t) => t.id === active);
  const activeTip = tips[activeIndex];
  const last = tips.length - 1;

  // ↓ / ↑ move between the tip headers, Home / End jump to the first / last (WAI-ARIA accordion).
  const onHeaderKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const target: Record<string, number> = { ArrowDown: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last };
    if (!(e.key in target)) return;
    e.preventDefault();
    btnRefs.current[target[e.key]]?.focus();
  };

  return (
    <div role="group" aria-labelledby={`${uid}-title`} data-tips-screen={screenId} className="surface-elevated p-6 lg:p-8">
      <h3 id={`${uid}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        {title}
      </h3>
      <p className="mt-2 mb-6 max-w-2xl text-base leading-relaxed text-fg-muted">{intro}</p>

      {/* Text column 1fr · board 1.35fr — the same split as the techniques screen. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start">
        {/* Accordion — first child → RIGHT in RTL. Its headers match the four-stage accordion of the lesson's opening. */}
        <div className="space-y-3">
          {tips.map((t, i) => {
            const isActive = active === t.id;
            const btnId = `${uid}-btn-${t.id}`;
            const panelId = `${uid}-panel-${t.id}`;
            return (
              <div
                key={t.id}
                className={cn(
                  'relative isolate overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 ease-snap',
                  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                  isActive ? 'border-brand/45' : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]',
                )}
              >
                <button
                  type="button"
                  id={btnId}
                  ref={(el) => {
                    btnRefs.current[i] = el;
                  }}
                  onClick={() => setActive(t.id)}
                  onKeyDown={(e) => onHeaderKey(e, i)}
                  aria-expanded={isActive}
                  aria-controls={isActive ? panelId : undefined}
                  className="w-full p-4 text-start flex items-center gap-3 rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      isActive ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    <span className="font-display font-bold text-base">{i + 1}</span>
                  </span>
                  <div className="flex-1 min-w-0 text-start">
                    <div className="font-display font-bold leading-snug text-black text-lg md:text-xl">{t.title}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.25 }}
                    className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key={`panel-${t.id}`}
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 pt-1 space-y-2">
                        <p className="text-base leading-relaxed text-black">{t.what}</p>
                        <p className="text-base leading-relaxed text-black">{t.why}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Map board — second child → LEFT in RTL; an inset in the screen's card. */}
        <div className="lg:sticky lg:top-24 self-start rounded-xl bg-bg-accent/60 p-4 sm:p-5" data-tips-board>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="text-sm font-display font-semibold text-fg-muted">{boardLabel}</div>
              {boardNote && <div className="mt-0.5 text-sm text-fg-muted">{boardNote}</div>}
            </div>
            <span dir="ltr" className="text-sm font-display font-bold tabular-nums text-fg-muted" aria-hidden>
              {activeIndex + 1}/{tips.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70">
            <NavTipsMap focus={activeTip.id} ariaLabel={activeTip.map} />
          </div>
          {/* Two lines kept for every caption (2 × 26px), so the board keeps its height across tips. */}
          <p className="mt-4 min-h-[3.25rem] text-base leading-relaxed text-black" aria-live="polite" data-tips-caption>
            {activeTip.map}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2" data-tips-legend>
            {legend.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-[13px] text-fg-muted leading-snug">
                <TipsLegendGlyph kind={it.kind} />
                <span>{it.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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
