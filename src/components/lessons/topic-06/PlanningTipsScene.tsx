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
  /** מה עושים */
  what: string;
  /** למה זה מועיל */
  why: string;
  /** What the map shows in this state — the caption under it and the map's accessible name. */
  map: string;
};

const PLAN_TIPS: Tip<PlanFocus>[] = [
  {
    id: 'ends',
    title: 'מכירים את המוצא ואת היעד',
    what: 'מאתרים במפה את המוצא (נ.ה) ואת היעד (נ.ס). לכל אחד מהם בוחרים סימנים שבעזרתם מאמתים אותו בשטח.',
    why: 'ניווט מתחיל מנקודה ידועה. סימנים שנבחרו מראש מאפשרים לוודא שיוצאים מהמקום הנכון, ובסוף הדרך לאשר שמגיעים ליעד עצמו, ולא רק לאזור קרוב אליו.',
    map: 'במפה: נ.ה ליד מבנה בולט, ונ.ס בקבוצת אורנים על קרקע סלעית. אלה הסימנים שבעזרתם מאמתים כל נקודה בשטח.',
  },
  {
    id: 'route',
    title: 'בוחרים מסלול לפי תנאי השטח',
    what: 'משווים בין מסלולים אפשריים. בכל אחד בוחנים את המרחק, את צורות הקרקע ואת הקשיים הצפויים.',
    why: 'המסלול הקצר ביותר אינו בהכרח המתאים ביותר. תכנון מראש מסייע לצפות קשיים בשטח עוד לפני היציאה.',
    map: 'במפה: הקו הישיר קצר יותר, אבל עובר מעל הפסגה. המסלול שנבחר עובר באוכף, הנקודה הנמוכה ברכס שבין שתי הפסגות, ונמנע מטיפוס על הפסגה.',
  },
  {
    id: 'legs',
    title: 'מחלקים את הדרך לקטעים',
    what: 'מחלקים את המסלול לקטעי דרך. לכל קטע דרך מגדירים כיוון, מרחק משוער וסימנים שצפויים להופיע לאורכו ובסופו.',
    why: 'כך יודעים בכל שלב לאן הולכים, כמה הולכים ומה אמור להופיע. קל יותר לעקוב אחר ההתקדמות ולזהות סטייה מהמסלול.',
    map: 'במפה: המסלול מחולק לארבעה קטעי דרך. בכל קטע דרך החץ מראה את הכיוון, והתווית מציינת את המרחק המשוער.',
  },
  {
    id: 'checkpoints',
    title: 'קובעים נקודות לבדיקת המיקום',
    what: 'בוחרים לאורך המסלול סימנים שקל לזהות במפה ובשטח, כמו עיקול נחל, אוכף או חציית דרך. מתארים אותם לפי הסדר בסיפור הדרך.',
    why: 'בדיקת המיקום בכל נקודה כזו מאפשרת לזהות סטייה מוקדם. שינון סיפור הדרך מראש מפחית את העומס המחשבתי בזמן התנועה.',
    map: 'במפה: סיפור הדרך לפי הסדר: עיקול הנחל, האוכף שבין שתי הפסגות, חציית דרך העפר, ולבסוף קבוצת האורנים על הקרקע הסלעית בנ.ס.',
  },
];

const NAV_TIPS: Tip<NavFocus>[] = [
  {
    id: 'verify',
    title: 'מאמתים מיקום וכיוון לפני ההתקדמות',
    what: 'יוצאים לכל קטע דרך מנקודה מזוהה. לפני שממשיכים, בודקים במפה ובמצפן את הכיוון לקטע הדרך הבא.',
    why: 'סטייה קטנה בכיוון מצטברת ככל שהמרחק גדל. בדיקה בתחילת קטע הדרך מצמצמת את הסיכון לצאת מנקודה שגויה או בכיוון שגוי.',
    map: 'במפה: המיקום הנוכחי בעיקול הנחל (נקודה 1) מזוהה, והחץ מראה את הכיוון לקטע הדרך הבא, אל האוכף.',
  },
  {
    id: 'compare',
    title: 'משווים בין הצפוי לנראה בשטח',
    what: 'בזמן התנועה משווים את הסימנים בשטח לסיפור הדרך: האם הם מופיעים בסדר הצפוי, והאם צורתם מתאימה למפה.',
    why: 'בדיקות חוזרות לאורך הדרך מסייעות לזהות סטייה מוקדם, לפני שהיא גדלה.',
    map: 'במפה: עיקול הנחל כבר מאחוריכם. הסימן הבא בסיפור הדרך הוא אוכף בין שתי פסגות, ולכן מחפשים בשטח את הצורה הזאת.',
  },
  {
    id: 'combine',
    title: 'משלבים כיוון, מרחק וסימני שטח',
    what: 'בודקים את המיקום בעזרת כמה נתונים יחד: הכיוון שבו הלכתם, המרחק שעברתם והסימנים שסביבכם.',
    why: 'קל לבלבל בין מקומות דומים. כשכל הנתונים מתאימים לתכנון, הבדיקה אמינה יותר מהסתמכות על סימן דומה אחד.',
    map: `במפה: הגעתם לאוכף. הכיוון מעיקול הנחל, המרחק (כ־${TIP_LEGS[1].m} מ׳) וצורת שתי הפסגות מתאימים יחד לתכנון.`,
  },
  {
    id: 'mismatch',
    title: 'בודקים אי־התאמה לפני שממשיכים',
    what: 'כשסימן צפוי אינו מופיע, או שהשטח אינו תואם לתכנון, בודקים מחדש את המיקום ואת הכיוון לפני שממשיכים. בסוף הדרך מאמתים גם את ההגעה ליעד.',
    why: 'בדיקה לפני שממשיכים מצמצמת את הסיכון להמשיך מנקודה שגויה. קרבה ליעד אינה מספיקה כדי לאשר הגעה, במיוחד בחושך או בראות מוגבלת.',
    map: `במפה: אחרי כ־${TIP_LEGS[2].m} מ׳ הייתם אמורים לחצות דרך עפר, אבל היא אינה מופיעה, ולכן בודקים מחדש את המיקום ואת הכיוון לפני שממשיכים. בנ.ס מאמתים את ההגעה לפי האורנים והקרקע הסלעית.`,
  },
];

type LegendItem = { kind: 'route' | 'ahead' | 'walked' | 'checkpoint' | 'position'; label: string };

const PLAN_LEGEND: LegendItem[] = [
  { kind: 'route', label: 'המסלול המתוכנן' },
  { kind: 'checkpoint', label: 'נקודה לבדיקת המיקום' },
];
const NAV_LEGEND: LegendItem[] = [
  { kind: 'position', label: 'מיקום נוכחי' },
  { kind: 'walked', label: 'הדרך שעברתם' },
  { kind: 'ahead', label: 'המשך המסלול המתוכנן' },
];

/**
 * Laptop fit — each of the three screens (planning tips, navigation tips, the
 * application question with its conclusion) shrinks on its own, like a slide,
 * so the whole screen fits under the site header once it is scrolled to. The
 * 1920×1080 layout is the reference: scale 1 there and on any screen with
 * room for it.
 *   - Width: the section's content width at lg+ (max-w-6xl − lg:px-8).
 *   - Heights: the tallest state of each screen at the reference width
 *     (measured: plan 721px for every tip; nav 747px with tip 4 open; the
 *     question 690px with feedback and the retry button), so the scale stays
 *     steady while learners switch tips or answer.
 *   - Reserves are numeric because the screens sit deep in a scrolling page:
 *     the fixed 80px site header plus a 24px gap above, 24px of air below —
 *     the same reserves as the other topic-06 parts.
 *   - A screen shrunk by height is narrower than the column; it keeps to the
 *     inline start (right) so the three screens share one right edge.
 */
const FIT_WIDTH = 1088;
const FIT_HEIGHT = { plan: 721, nav: 747, question: 690 } as const;
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
    <section id="scene-tips" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        title="דגשים לתכנון ולניווט"
        intro="מה מכינים לפני היציאה, ומה בודקים במהלך התנועה? נבחן את שניהם על אותה מפה לימודית, ונראה כיצד התכנון מסייע לזהות סטייה מהמסלול."
      />

      <ScreenFit height={FIT_HEIGHT.plan}>
        <TipsScreen
          screenId="plan"
          title="לפני שיוצאים: מה צריך לתכנן?"
          intro="בחרו דגש כדי לראות במפה את הפרט המתאים ולקרוא מה עושים ולמה זה מועיל."
          boardLabel="מפת התכנון · לפני היציאה"
          tips={PLAN_TIPS}
          legend={PLAN_LEGEND}
        />
      </ScreenFit>

      <div className="mt-12">
        <ScreenFit height={FIT_HEIGHT.nav}>
          <TipsScreen
            screenId="nav"
            title="במהלך הניווט: מה צריך לבדוק?"
            intro="אותה מפה, עכשיו בזמן התנועה. בחרו דגש כדי לראות את המיקום הנוכחי ומה בודקים בו."
            boardLabel="אותה מפה · במהלך הניווט"
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
 * One screen: the tips as an accordion (one open at a time, the first open on
 * entry) beside the shared map board. Choosing a tip updates the map and the
 * caption under it, so every map highlight also has a text description.
 */
function TipsScreen<F extends MapFocus>({
  screenId,
  title,
  intro,
  boardLabel,
  tips,
  legend,
}: {
  screenId: string;
  title: string;
  intro: string;
  boardLabel: string;
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
    <div role="group" aria-labelledby={`${uid}-title`} data-tips-screen={screenId}>
      <h3 id={`${uid}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        {title}
      </h3>
      <p className="mt-2 mb-6 max-w-2xl text-base leading-relaxed text-fg-muted">{intro}</p>

      {/* Text column 1fr · board 1.35fr — the same split as the techniques screen. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start">
        {/* Accordion — first child → RIGHT in RTL. */}
        <div className="space-y-3">
          {tips.map((t, i) => {
            const isActive = active === t.id;
            const btnId = `${uid}-btn-${t.id}`;
            const panelId = `${uid}-panel-${t.id}`;
            return (
              <div
                key={t.id}
                className={cn(
                  // Items sit on the textured page: the hover tint rides on the opaque white base via ::before.
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
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      isActive ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    <span className="font-display font-bold text-sm">{i + 1}</span>
                  </span>
                  <div className="flex-1 min-w-0 text-start">
                    <div className="font-display font-bold leading-snug text-black text-base md:text-lg">{t.title}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.25 }}
                    className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
                      <div className="px-4 pb-5 pt-1 space-y-4">
                        <div>
                          <div className="text-base font-display font-bold text-black mb-1.5">מה עושים</div>
                          <p className="text-base leading-relaxed text-black">{t.what}</p>
                        </div>
                        <div>
                          <div className="text-base font-display font-bold text-black mb-1.5">למה זה מועיל</div>
                          <p className="text-base leading-relaxed text-black">{t.why}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Map board — second child → LEFT in RTL (the route-story board frame). */}
        <div className="lg:sticky lg:top-24 self-start surface-elevated p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="text-sm font-display font-semibold text-fg-muted">{boardLabel}</div>
              <div className="mt-0.5 text-sm text-fg-muted">דוגמה לימודית נפרדת מסיפור הדרך שבהמשך השיעור</div>
            </div>
            <span dir="ltr" className="text-sm font-display font-bold tabular-nums text-fg-muted" aria-hidden>
              {activeIndex + 1}/{tips.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70">
            <NavTipsMap focus={activeTip.id} ariaLabel={activeTip.map} />
          </div>
          <p className="mt-4 text-base leading-relaxed text-black" aria-live="polite">
            {activeTip.map}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
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

const OPTIONS: Option[] = [
  {
    id: 'looks',
    label: 'כן. הצומת נראה כמו הצומת שבתכנון.',
    correct: false,
    feedback: 'מראה דומה אינו מספיק כדי לאשר את המיקום. המרחק וסדר הסימנים אינם תואמים לתכנון, ולכן משווים גם אותם ואת הסביבה למפה לפני שמאשרים.',
  },
  {
    id: 'direction',
    label: 'כן, אם הכיוון שבו הלכתם תואם לתכנון.',
    correct: false,
    feedback: 'התאמה בכיוון בלבד אינה מספיקה כשהמרחק וסדר הסימנים אינם תואמים. משווים את כל הנתונים ואת הסביבה למפה לפני שמאשרים את המיקום.',
  },
  {
    id: 'recheck',
    label: 'לא בשלב זה. קודם בודקים את המיקום מול המפה.',
    correct: true,
    feedback: 'הדמיון החזותי לבדו אינו מספיק. משווים למפה גם את המרחק, את סדר הסימנים ואת הסביבה, ורק אז מחליטים אם זהו הצומת.',
  },
];

function ApplicationQuestion() {
  const [picked, setPicked] = useState<string | null>(null);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const choice = OPTIONS.find((o) => o.id === picked) ?? null;

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="tips-question">
      <div className="text-sm font-display font-semibold text-fg-muted">שאלת יישום</div>
      <h3 id={`${uid}-stem`} className="mt-1.5 max-w-3xl font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance">
        {QUESTION_STEM}
      </h3>

      <div role="group" aria-labelledby={`${uid}-stem`} className="mt-5 max-w-3xl space-y-2">
        {OPTIONS.map((o) => {
          const isPicked = picked === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setPicked(o.id)}
              aria-pressed={isPicked}
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

      {/* Feedback — announced once per choice; a wrong choice keeps the options open for another try. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="max-w-3xl">
        <AnimatePresence mode="wait" initial={false}>
          {choice && (
            <motion.div
              key={choice.id}
              initial={reduce ? false : { opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={reduce ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'p-4 rounded-xl text-base leading-relaxed border flex gap-2.5 items-start',
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {choice && (
        <div className="mt-4">
          <button type="button" onClick={() => setPicked(null)} className="btn-secondary">
            ניסיון נוסף
          </button>
        </div>
      )}
    </div>
  );
}

function ConclusionCard() {
  return (
    <div className="mt-6 surface p-5 sm:p-6">
      <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">מהתכנון לבדיקה בשטח</div>
      <p className="text-base text-fg leading-relaxed text-pretty">
        התכנון קובע מה צפוי לאורך הדרך, ובמהלך הניווט משווים את השטח לתכנון. כך אפשר לזהות סטייה מוקדם.{' '}
        <strong className="text-fg">כעת נכיר טכניקות ניווט ונבחן כיצד בוחרים ביניהן לפי הסימנים הזמינים ותנאי הראות.</strong>
      </p>
    </div>
  );
}
