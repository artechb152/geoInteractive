'use client';

/* ──────────────── כשהזמן משנה את מאזן הכוחות (predict → check) ────────────────
   מחליף את TimeAsymmetry (ציר זמן נגרר) שישב כאן קודם. שלושה סבבים של
   "חזו ואז בדקו": בכל סבב אירוע, שאלה עם שתי תחזיות, ואחרי הבדיקה — משוב
   שמתייחס לבחירה, ההסבר הסיבתי, וחשיפת הלחצים החדשים במפת הלחצים שלצד
   הכרטיס. כל הטקסטים מגיעים מ-TimePressureContent.ts (מועתקים מילה במילה
   מחבילת המסירה design/handoff/asymmetric-time-v3).

   מקור האמת: design/handoff/asymmetric-time-v3/IMPLEMENTATION-SPEC.md
   ותוכנית העבודה docs/superpowers/plans/2026-09-16-topic-01-time-pressure-interaction.md.

   מצב המפה נגזר תמיד מהסבב *הנצפה* (previousPressureIds/newPressureIds של
   אותו סבב בלבד) ולא מצבירה חוצת-סבבים — ולכן חזרה לסבב 1 אחרי סבב 3 לא
   "מדליפה" הדגשות של סבבים מאוחרים יותר. */

import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
import {
  ALL_MAP_NODE_IDS,
  ALL_NODE_IDS,
  ASSETS,
  BUTTONS,
  FEEDBACK_HEADINGS,
  INTRO,
  IRREGULAR,
  MAP_IMAGE_VIEWBOX,
  MAP_NODE_ANCHORS,
  MAP_TEXT,
  NODE_DEFINITIONS,
  NODE_LABELS,
  ROUNDS,
  SCENARIO_LABEL,
  TAKEAWAY,
  TITLE,
  TRANSFER,
  type MapNodeId,
  type PressureNodeId,
} from './TimePressureContent';

/* ─────────────────────────────── מצב ריצה ─────────────────────────────── */

type NodeVisualState = 'inactive' | 'previous' | 'current';
type RoundIndex = 0 | 1 | 2;
type ActiveView = RoundIndex | 'transfer';
type RoundRuntimeState = {
  selectedOptionId: string | null;
  submitted: boolean;
  firstAttemptCorrect: boolean | null;
};
type TransferRuntimeState = {
  claimId: string | null;
  evidenceId: string | null;
  submitted: boolean;
  firstAttemptCorrect: boolean | null;
};

const INITIAL_ROUND_STATE: RoundRuntimeState = {
  selectedOptionId: null,
  submitted: false,
  firstAttemptCorrect: null,
};

const INITIAL_TRANSFER_STATE: TransferRuntimeState = {
  claimId: null,
  evidenceId: null,
  submitted: false,
  firstAttemptCorrect: null,
};

/**
 * הכלל היחיד שכל שאר התנהגות המפה נגזרת ממנו: לכל סבב יש את רשימת הלחצים
 * שכבר נחשפו (previousPressureIds) ואת אלה שהוא עצמו חושף (newPressureIds),
 * והחדשים מודגשים רק אחרי שהתחזית נבדקה. אין צובר חוצה-סבבים.
 */
function computeNodeStates(
  view: ActiveView,
  roundStates: RoundRuntimeState[],
): Record<PressureNodeId, NodeVisualState> {
  const states = Object.fromEntries(
    ALL_NODE_IDS.map((id) => [id, 'inactive' as NodeVisualState]),
  ) as Record<PressureNodeId, NodeVisualState>;

  if (view === 'transfer') {
    // שאלת ההעברה היא תרחיש חדש ונפרד: כל מה שנחשף במהלך שלושת הסבבים נראה
    // ניטרלי ושווה, ושום זירה אינה "נוכחית" — כדי לא לרמז תשובה קדימה.
    const exposed = new Set(ROUNDS.flatMap((r) => r.newPressureIds));
    for (const id of ALL_NODE_IDS) if (exposed.has(id)) states[id] = 'previous';
    return states;
  }

  const round = ROUNDS[view];
  for (const id of round.previousPressureIds) states[id] = 'previous';
  if (roundStates[view].submitted) for (const id of round.newPressureIds) states[id] = 'current';
  return states;
}

/* ───────────────────────── מחרוזות ממשק (לא תוכן לימודי) ─────────────────────────
   חמש המחרוזות הבאות אינן ב-interaction-content.json — הן chrome מינימלי של
   הממשק (מצב נעול, תיאור נגיש לקווים, תגיות מצב, שורת הנחיה כשאין תווית פתוחה).
   מתועדות ב-design/docs/assumptions.md. */
const UI_LOCKED_STEP = 'טרם נפתח';
const UI_MAP_LINES_DESCRIPTION =
  'קווים מייצגים קשרי השפעה בין הזירות למוקד המרכזי, לא מסלולי תנועה';
const UI_NODE_PREVIOUS = 'נחשף קודם';
const UI_NODE_CURRENT = 'מוקד נוכחי';
const UI_DEFINITION_PROMPT = 'בחרו זירה במפה לקבלת הסבר קצר';

/* ─────────────────────────────── הרכיב הראשי ─────────────────────────────── */

export function TimePressureExperience() {
  const uid = useId();
  const titleId = `${uid}-title`;
  const panelId = `${uid}-round-panel`;

  const [activeView, setActiveView] = useState<ActiveView>(0);
  const [furthestRoundIndex, setFurthestRoundIndex] = useState<RoundIndex>(0);
  const [roundStates, setRoundStates] = useState<RoundRuntimeState[]>(() =>
    ROUNDS.map(() => ({ ...INITIAL_ROUND_STATE })),
  );
  const [transferState, setTransferState] = useState<TransferRuntimeState>({
    ...INITIAL_TRANSFER_STATE,
  });
  // הצמד שנבדק בפועל בלחיצת הבדיקה/ניסיון-חוזר האחרונה על שאלת ההעברה —
  // שדה נוסף ברמת הרכיב הראשי, לצד TransferRuntimeState המתועד (לא שינוי
  // של הצורה המתועדת עצמה), באותה רוח כמו resetCounter למטה. הכרחי ברמה
  // הזאת ולא כ-state מקומי בתוך TransferSection: TransferSection מתפרק
  // ומורכב מחדש בכל יציאה וחזרה ל-'transfer' (למשל לשונית סבב ואז "לבדיקת
  // ההבנה" שוב — טאבי הסבבים נשארים לחיצים גם כשצופים בהעברה), ו-state
  // מקומי היה מתאפס ל-null בכל פירוק כזה, מטשטש משוב/הצלחה שכבר הוצגו אף
  // שה-transferState המורם (submitted/claimId/evidenceId) שרד בלי שינוי.
  const [checkedTransferPair, setCheckedTransferPair] = useState<{
    claimId: string;
    evidenceId: string;
  } | null>(null);
  const [openNodeId, setOpenNodeId] = useState<MapNodeId | null>(null);
  // עולה בכל "התחלה מחדש" בלבד, ונכנס ל-revealKey למטה: כך זיכרון "כבר
  // נחשף" של PressureMap (ראו revealedRef שם) מתאפס גם הוא בעקיפין, וקווי
  // המפה חוזרים להיפתח באנימציה בסבב הבא אחרי איפוס, ולא נשארים "כבר נראו".
  const [resetCounter, setResetCounter] = useState(0);

  // focus עובר לכותרת הסבב (או לכותרת שאלת ההעברה) בכל החלפת תצוגה (לשונית
  // שלב / הבא / הקודם / מעבר ל-'transfer') — אבל לא בטעינה הראשונה, כדי לא
  // לחטוף focus ולגלול את הדף בכניסה לסצנה. ההשוואה היא לערך הקודם ולא לדגל
  // "כבר נטען", כדי ש-StrictMode בפיתוח (שמריץ את ה-effect פעמיים) לא ייחשב
  // בטעות כהחלפת תצוגה.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevViewRef = useRef<ActiveView | null>(null);
  // איפוס הוא גם החלפת activeView (בדרך כלל בחזרה ל-0) — אבל אחריו focus
  // צריך לנחות על כותרת הרכיב כולה, לא על כותרת כרטיס הסבב הראשון. הדגל
  // הזה גורם ל-effect הבא לדלג פעם אחת על ההעברה הרגילה ל-headingRef, בלי
  // לגעת בלוגיקת המעקב prevViewRef עצמה.
  const skipViewFocusRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (skipViewFocusRef.current) {
      skipViewFocusRef.current = false;
    } else if (prevViewRef.current !== null && prevViewRef.current !== activeView) {
      headingRef.current?.focus();
    }
    prevViewRef.current = activeView;
  }, [activeView]);

  const isRoundView = typeof activeView === 'number';
  const nodeStates = computeNodeStates(activeView, roundStates);

  // מפתח החשיפה: מזהה הסבב + האם נבדק. אנימציית הקו/התווית מתנגנת פעם אחת
  // למעבר שיוצר אותה, ולא בכל render חוזר של אותו צירוף.
  const revealKey = isRoundView
    ? `${resetCounter}-${ROUNDS[activeView].id}-${roundStates[activeView].submitted ? 'checked' : 'open'}`
    : `${resetCounter}-transfer`;

  const selectOption = (optionId: string) => {
    if (!isRoundView) return;
    setRoundStates((prev) =>
      prev.map((s, i) => (i === activeView ? { ...s, selectedOptionId: optionId } : s)),
    );
  };

  const checkPrediction = () => {
    if (!isRoundView) return;
    const round = ROUNDS[activeView];
    setRoundStates((prev) =>
      prev.map((s, i) =>
        i === activeView
          ? {
              ...s,
              submitted: true,
              // לעולם לא לדרוס תוצאת ניסיון ראשון שכבר נרשמה.
              firstAttemptCorrect:
                s.firstAttemptCorrect ?? s.selectedOptionId === round.correctOptionId,
            }
          : s,
      ),
    );
  };

  const advance = () => {
    if (!isRoundView) return;
    if (activeView === 2) {
      setActiveView('transfer');
      return;
    }
    const next = (activeView + 1) as RoundIndex;
    setActiveView(next);
    setFurthestRoundIndex((prev) => (next > prev ? next : prev));
  };

  const goBack = () => {
    if (!isRoundView || activeView === 0) return;
    setActiveView((activeView - 1) as RoundIndex);
  };

  const toggleNode = (id: MapNodeId) => setOpenNodeId((prev) => (prev === id ? null : id));

  const selectTransferClaim = (claimId: string) =>
    setTransferState((prev) => ({ ...prev, claimId }));

  const selectTransferEvidence = (evidenceId: string) =>
    setTransferState((prev) => ({ ...prev, evidenceId }));

  const checkTransfer = () => {
    // התנאי תואם את disabled בכפתור עצמו — הגנה כפולה, לא רק אסתטית: בלי
    // הבדיקה הזאת TypeScript לא יכול להבטיח ששני המזהים אינם null בשלב
    // ההקצאה ל-checkedTransferPair למטה.
    if (!transferState.claimId || !transferState.evidenceId) return;
    // מקפיא ברמת הרכיב הראשי את הצמד שנבדק כעת — ראו ההסבר ליד ההכרזה של
    // checkedTransferPair למעלה: זהו state ששורד בדיוק כמו roundStates
    // מעברי activeView, ולא state מקומי שהיה מתאפס בכל פירוק/הרכבה מחדש
    // של TransferSection.
    setCheckedTransferPair({ claimId: transferState.claimId, evidenceId: transferState.evidenceId });
    setTransferState((prev) => {
      const justComputedCorrectness =
        prev.claimId === TRANSFER.correctClaimId && prev.evidenceId === TRANSFER.correctEvidenceId;
      return {
        ...prev,
        submitted: true,
        // לעולם לא לדרוס תוצאת ניסיון ראשון — זהו המקום היחיד בפעילות שבו
        // אפשר לשלוח שוב אחרי כישלון, ולכן צריך שמירה מפורשת.
        firstAttemptCorrect: prev.firstAttemptCorrect ?? justComputedCorrectness,
      };
    });
  };

  const resetAll = () => {
    // אם activeView כבר 0, ה-effect הקשור אליו לא ירוץ כלל (React לא מריץ
    // effect כשה-dependency לא השתנה) — ואז אין מה לדלג עליו. מדלגים רק
    // כשהאיפוס באמת יגרום למעבר תצוגה, כדי לא "לבזבז" את הדגל על מעבר
    // עתידי לא קשור.
    if (activeView !== 0) {
      skipViewFocusRef.current = true;
    }
    setActiveView(0);
    setFurthestRoundIndex(0);
    setRoundStates(ROUNDS.map(() => ({ ...INITIAL_ROUND_STATE })));
    setTransferState({ ...INITIAL_TRANSFER_STATE });
    setCheckedTransferPair(null);
    setOpenNodeId(null);
    setResetCounter((c) => c + 1);
    titleRef.current?.focus();
  };

  return (
    <div className="mt-12">
      <div className="mb-5">
        <h3
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="font-display text-2xl font-bold leading-tight text-black outline-none sm:text-3xl"
        >
          {TITLE}
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">{INTRO}</p>
      </div>

      {/* שלושת השלבים — סדר מערך ROUNDS, כך שסבב 1 נוחת בימין החזותי ב-RTL.
          כפתור האיפוס יושב באותה שורה, ו-ms-auto דוחף אותו לקצה הנגדי
          (שמאל חזותי ב-RTL) בלי utility פיזי. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-labelledby={titleId} className="flex flex-wrap gap-3">
          {ROUNDS.map((round, i) => {
            const index = i as RoundIndex;
            const locked = index > furthestRoundIndex;
            const isActive = activeView === index;
            const done = roundStates[index].submitted;
            return (
              <button
                key={round.id}
                id={`${uid}-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                disabled={locked}
                onClick={() => setActiveView(index)}
                className={cn(
                  'flex min-w-[10.5rem] flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-start transition-colors duration-200 ease-snap',
                  isActive && 'border-accent bg-accent/10',
                  !isActive && !locked && 'border-border bg-bg-elevated hover:bg-bg-accent',
                  locked && 'cursor-not-allowed border-border-subtle bg-bg-accent',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums',
                      isActive && 'bg-accent text-white',
                      !isActive && !locked && 'bg-bg-accent text-fg-muted',
                      locked && 'bg-border-subtle text-fg-dim',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      'font-display text-base font-bold leading-tight',
                      isActive && 'text-accent',
                      !isActive && !locked && 'text-black',
                      locked && 'text-fg-dim',
                    )}
                  >
                    {round.stepLabel}
                  </span>
                  {done && (
                    <Icon name="check" size={16} strokeWidth={2.5} className="text-brand-dark" />
                  )}
                </span>
                {locked && <span className="ps-8 text-sm text-fg-dim">{UI_LOCKED_STEP}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={resetAll} className="btn-ghost ms-auto">
          {BUTTONS.reset}
        </button>
      </div>

      {/* האזור הראשי: כרטיס האירוע והתשובות ראשון ב-DOM (נוחת בימין החזותי
          ב-RTL), המפה הגדולה אחריו (שמאל). מתחת ל-lg הם נערמים. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,32%)_minmax(0,1fr)] lg:items-start">
        {isRoundView ? (
          <RoundCard
            key={ROUNDS[activeView].id}
            panelId={panelId}
            tabId={`${uid}-tab-${activeView}`}
            radioGroupName={`${uid}-round-${ROUNDS[activeView].id}`}
            round={ROUNDS[activeView]}
            state={roundStates[activeView]}
            headingRef={headingRef}
            isLastRound={activeView === 2}
            canGoBack={activeView > 0}
            onSelectOption={selectOption}
            onCheck={checkPrediction}
            onAdvance={advance}
            onBack={goBack}
          />
        ) : (
          <TransferSection
            panelId={panelId}
            headingRef={headingRef}
            state={transferState}
            checkedPair={checkedTransferPair}
            onSelectClaim={selectTransferClaim}
            onSelectEvidence={selectTransferEvidence}
            onCheck={checkTransfer}
          />
        )}

        <PressureMap
          nodeStates={nodeStates}
          openNodeId={openNodeId}
          onToggleNode={toggleNode}
          revealKey={revealKey}
        />
      </div>

      {/* רצועת השחקן הלא־סדיר: תמיד מוצגת (לא תלויה במצב סבב/העברה),
          מתחת למפה, כדרישת סעיף 5 בפריסת המפרט ("מתחת למפה"). */}
      <LandscapeStrip
        asset={ASSETS.irregular}
        villageSide="right"
        title={IRREGULAR.title}
        body={IRREGULAR.body}
        note={IRREGULAR.note}
      />

      {/* התובנה מופיעה אחרי כל ניסיון שנבדק בשאלת ההעברה — גם שגוי — ולא
          רק אחרי הצלחה. לעולם לא מותנית ב-firstAttemptCorrect. */}
      {transferState.submitted && (
        <LandscapeStrip
          asset={ASSETS.takeaway}
          villageSide="left"
          title={TAKEAWAY.title}
          body={TAKEAWAY.text}
          note={TAKEAWAY.note}
        />
      )}
    </div>
  );
}

/* ───────── רכיבי עזר משותפים: כרטיס רדיו + פאנל משוב (סבב + העברה) ───────── */

function PredictionOption({
  id,
  name,
  text,
  checked,
  disabled,
  onSelect,
}: {
  id: string;
  name: string;
  text: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors duration-200 ease-snap',
        'has-[:checked]:border-accent has-[:checked]:bg-accent/10',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg-elevated',
        disabled ? 'cursor-default' : 'cursor-pointer hover:bg-bg-accent',
      )}
    >
      <input
        type="radio"
        name={name}
        value={id}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span
        aria-hidden
        className="mt-1 size-5 shrink-0 rounded-full border-2 border-border-strong bg-bg-elevated transition-all duration-200 ease-snap peer-checked:border-[6px] peer-checked:border-accent"
      />
      <span className="text-base leading-relaxed text-black text-pretty">{text}</span>
    </label>
  );
}

/* note אופציונלי: רק הסבב מציג הסבר סיבתי מתחת למשוב, ההעברה לא. ה-wrapper
   עם aria-live ו-render המותנה נשארים אצל כל קורא (תלויים ב-state שלו). */
function FeedbackPanel({
  variant,
  heading,
  body,
  note,
}: {
  variant: 'correct' | 'incorrect';
  heading: string;
  body: string;
  note?: string;
}) {
  const correct = variant === 'correct';
  return (
    <div
      className={cn(
        'mt-4 rounded-xl border p-4',
        correct ? 'border-status-ok/50 bg-status-ok/10' : 'border-accent/40 bg-accent/5',
      )}
    >
      <p className="flex items-center gap-2 font-display text-base font-bold text-black">
        <Icon
          name={correct ? 'check' : 'spark'}
          size={18}
          strokeWidth={2.5}
          className={correct ? 'text-status-ok' : 'text-accent'}
        />
        {heading}
      </p>
      <p className="mt-2 text-base leading-relaxed text-black text-pretty">{body}</p>
      {note && (
        <p className="mt-3 border-t border-border-subtle pt-3 text-base leading-relaxed text-fg-muted text-pretty">
          {note}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── כרטיס האירוע והתשובות ───────────────────────── */

function RoundCard({
  panelId,
  tabId,
  radioGroupName,
  round,
  state,
  headingRef,
  isLastRound,
  canGoBack,
  onSelectOption,
  onCheck,
  onAdvance,
  onBack,
}: {
  panelId: string;
  tabId: string;
  radioGroupName: string;
  round: (typeof ROUNDS)[number];
  state: RoundRuntimeState;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  isLastRound: boolean;
  canGoBack: boolean;
  onSelectOption: (optionId: string) => void;
  onCheck: () => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const correct = state.selectedOptionId === round.correctOptionId;
  const feedback = state.selectedOptionId ? round.feedbackByOption[state.selectedOptionId] : null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="surface-elevated p-5 sm:p-6"
    >
      <span className="chip border-border bg-bg-accent text-fg-muted">{SCENARIO_LABEL}</span>

      <h4
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-display text-xl font-bold leading-tight text-black outline-none"
      >
        {round.title}
      </h4>
      <p className="mt-2 text-base leading-relaxed text-black text-pretty">{round.event}</p>

      <fieldset className="mt-5 min-w-0 border-0 p-0">
        <legend className="mb-3 p-0 font-display text-base font-bold leading-snug text-black">
          {round.question}
        </legend>
        <div className="flex flex-col gap-3">
          {round.options.map((opt) => (
            <PredictionOption
              key={opt.id}
              id={opt.id}
              name={radioGroupName}
              text={opt.text}
              checked={state.selectedOptionId === opt.id}
              disabled={state.submitted}
              onSelect={() => onSelectOption(opt.id)}
            />
          ))}
        </div>
      </fieldset>

      {/* אזור ההכרזה היחיד של הסבב: כותרת המשוב, המשוב לבחירה וההסבר
          הסיבתי מופיעים יחד בעדכון אחד — לא בשלבים. */}
      <div aria-live="polite">
        {state.submitted && feedback && (
          <FeedbackPanel
            variant={correct ? 'correct' : 'incorrect'}
            heading={correct ? FEEDBACK_HEADINGS.correct : FEEDBACK_HEADINGS.incorrect}
            body={feedback}
            note={round.causalExplanation}
          />
        )}
      </div>

      {/* סדר ה-DOM: הפעולה הראשית ראשונה בשורת justify-end — ולכן נוחתת בימין
          החזותי ב-RTL, בדיוק כמו בלוק "בדוק תשובות" ב-LevelsScene. */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {state.submitted ? (
          <button type="button" onClick={onAdvance} className="btn-primary">
            {isLastRound ? BUTTONS.transfer : BUTTONS.next}
            <Icon name="arrow-left" size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheck}
            disabled={!state.selectedOptionId}
            className={cn(
              'btn-primary',
              !state.selectedOptionId &&
                'cursor-not-allowed opacity-45 hover:brightness-100 active:translate-y-0',
            )}
          >
            {BUTTONS.check}
          </button>
        )}
        {canGoBack && (
          <button type="button" onClick={onBack} className="btn-secondary">
            {BUTTONS.previous}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── שאלת ההעברה (הגשר) ─────────────────────────── */

/* שדות הרדיו כאן נשארים ניתנים לעריכה אחרי ניסיון *שגוי* — כדי לאפשר תיקון
   ושליחה חוזרת — וננעלים (disabled={fullyCorrect} ב-PredictionOption) רק
   אחרי שהצמד נבדק ונמצא נכון במלואו, בדיוק כמו RoundCard שנועל מיד עם
   submitted. checked נגזר תמיד מהבחירה החיה, אבל המשוב/ה"הצלחה" נגזרים מ־
   `checkedPair` — צמד קפוא של הבדיקה האחרונה בפועל (prop מהרכיב הראשי; לא
   יכול להיות state מקומי כאן כי TransferSection מתפרק ומורכב מחדש בכל
   מעבר תצוגה) — כדי שתיקון רדיו לבדו לא "יזייף" הצלחה לפני לחיצה על נסו
   לתקן. אותו `fullyCorrect` גוזר גם את נעילת הרדיו וגם את היעלמות הכפתור,
   כך שלעולם אין מצב שבו הבאנר מציג הצלחה בעוד הרדיו החי כבר סותר אותה. */
function TransferSection({
  panelId,
  headingRef,
  state,
  checkedPair,
  onSelectClaim,
  onSelectEvidence,
  onCheck,
}: {
  // Same id every round tab's aria-controls already points at (see the
  // main-component's shared `panelId`). The transfer stage is reached with
  // all 3 round tabs still enabled (round 3 doesn't lock itself), so those
  // tabs' aria-controls must keep resolving to a real, currently-visible
  // element once RoundCard unmounts and this section mounts in its place —
  // otherwise it dangles at a nonexistent id (fix for a Task 3 review finding).
  panelId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  state: TransferRuntimeState;
  checkedPair: { claimId: string; evidenceId: string } | null;
  onSelectClaim: (claimId: string) => void;
  onSelectEvidence: (evidenceId: string) => void;
  onCheck: () => void;
}) {
  const uid = useId();

  const claimCorrect = checkedPair?.claimId === TRANSFER.correctClaimId;
  const evidenceCorrect = checkedPair?.evidenceId === TRANSFER.correctEvidenceId;
  const fullyCorrect = state.submitted && !!checkedPair && claimCorrect && evidenceCorrect;

  let feedbackText: string | null = null;
  if (state.submitted && checkedPair) {
    if (claimCorrect && evidenceCorrect) feedbackText = TRANSFER.success;
    else if (!claimCorrect && evidenceCorrect) feedbackText = TRANSFER.wrongClaim;
    else if (claimCorrect && !evidenceCorrect) feedbackText = TRANSFER.wrongEvidence;
    else feedbackText = TRANSFER.wrongBoth;
  }

  return (
    <div id={panelId} className="surface-elevated p-5 sm:p-6">
      <h4
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-xl font-bold leading-tight text-black outline-none"
      >
        {TRANSFER.title}
      </h4>
      <p className="mt-2 text-base leading-relaxed text-black text-pretty">{TRANSFER.event}</p>
      <p className="mt-2 text-base leading-relaxed text-fg-muted text-pretty">
        {TRANSFER.instruction}
      </p>

      <fieldset className="mt-5 min-w-0 border-0 p-0">
        <legend className="mb-3 p-0 font-display text-base font-bold leading-snug text-black">
          {TRANSFER.claimQuestion}
        </legend>
        <div className="flex flex-col gap-3">
          {TRANSFER.claims.map((opt) => (
            <PredictionOption
              key={opt.id}
              id={opt.id}
              name={`${uid}-transfer-claim`}
              text={opt.text}
              checked={state.claimId === opt.id}
              disabled={fullyCorrect}
              onSelect={() => onSelectClaim(opt.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 min-w-0 border-0 p-0">
        <legend className="mb-3 p-0 font-display text-base font-bold leading-snug text-black">
          {TRANSFER.evidenceQuestion}
        </legend>
        <div className="flex flex-col gap-3">
          {TRANSFER.evidence.map((opt) => (
            <PredictionOption
              key={opt.id}
              id={opt.id}
              name={`${uid}-transfer-evidence`}
              text={opt.text}
              checked={state.evidenceId === opt.id}
              disabled={fullyCorrect}
              onSelect={() => onSelectEvidence(opt.id)}
            />
          ))}
        </div>
      </fieldset>

      {/* אזור הכרזה יחיד, בדיוק כמו בכרטיס הסבב. */}
      <div aria-live="polite">
        {state.submitted && feedbackText && (
          <FeedbackPanel
            variant={fullyCorrect ? 'correct' : 'incorrect'}
            heading={fullyCorrect ? FEEDBACK_HEADINGS.complete : FEEDBACK_HEADINGS.incorrect}
            body={feedbackText}
          />
        )}
      </div>

      {/* אחרי צמד נכון אין עוד פעולה לבצע כאן — הכפתור נעלם ומפנה מקום
          לתובנה (LandscapeStrip עם TAKEAWAY) שמופיעה מתחת לרשת כולה. */}
      {!fullyCorrect && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCheck}
            disabled={!state.claimId || !state.evidenceId}
            className={cn(
              'btn-primary',
              (!state.claimId || !state.evidenceId) &&
                'cursor-not-allowed opacity-45 hover:brightness-100 active:translate-y-0',
            )}
          >
            {state.submitted ? BUTTONS.retryTransfer : BUTTONS.checkTransfer}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── רצועת נוף רחבה (שחקן לא־סדיר / תובנה) ───────────────────── */

/* הרצועה (2172×724 במקור) עוטפת ביחס שטוח בהרבה מהמקורי (2172/300 ≈ 7.24
   לעומת 3.0 של הנכס) כדי ש-fit="cover" יחתוך אך ורק למעלה/למטה, לעולם לא
   בצדדים — position="center" (ברירת המחדל) מספיק. */
const STRIP_ASPECT_CLASS = 'aspect-[2172/300]';

/* שחקן לא־סדיר / תובנה חולקות בדיוק את אותה מסגרת ומשתנות רק באסֵט, בצד
   שבו יושב הכפר בתמונת המקור (villageSide — פיזי במכוון, כמו ACTOR_BANNER
   ב-AsymmetricScene.tsx: תלוי בתוכן התמונה, לא בשפת העמוד) ובשלוש מחרוזות
   הטקסט. */
function LandscapeStrip({
  asset,
  villageSide,
  title,
  body,
  note,
}: {
  asset: { assetId: string; src: string; alt: string };
  villageSide: 'right' | 'left';
  title: string;
  body: string;
  note: string;
}) {
  const villageOnRight = villageSide === 'right';
  return (
    <div className="surface-elevated relative mt-5 overflow-hidden">
      <div className={cn('relative w-full', STRIP_ASPECT_CLASS)}>
        <IsometricAsset
          assetId={asset.assetId}
          src={asset.src}
          alt={asset.alt}
          aspect="21/9"
          fit="cover"
          className="absolute inset-0 size-full [aspect-ratio:auto]"
        />
        {/* הכפר יושב בצד villageSide בתמונת המקור — לכן ה-scrim אטום בצד
            הטקסט (הצד הנגדי) ושקוף בצד הכפר. */}
        <div
          aria-hidden
          className={cn(
            'absolute inset-0',
            villageOnRight
              ? 'bg-gradient-to-r from-bg-elevated via-bg-elevated/85 to-transparent'
              : 'bg-gradient-to-l from-bg-elevated via-bg-elevated/85 to-transparent',
          )}
        />
        <div
          className={cn(
            'relative z-10 flex h-full items-center',
            villageOnRight ? 'justify-end' : 'justify-start',
          )}
        >
          <div className="max-w-md px-6 py-5 sm:px-8">
            <h4 className="font-display text-lg font-bold leading-tight text-black sm:text-xl">
              {title}
            </h4>
            <p className="mt-2 text-base leading-relaxed text-black text-pretty">{body}</p>
            <p className="mt-2 text-base leading-relaxed text-fg-muted text-pretty">{note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── מפת הלחצים ─────────────────────────────── */

/* קווי הקשר וצבעיהם. אין hex חדש — הכל טוקנים קיימים: לבן (bg-elevated)
   לקווים הניטרליים, כתום (accent) למוקד הנוכחי, ודיו-זית (fg) ל-casing.
   היפוך מהגרסה הקודמת: שם הקו היה כהה על casing בהיר — ועל הצילום העירוני
   הבהיר הוא נבלע לגמרי (מצב inactive לא נראה בפועל כלל). כאן הקו עצמו לבן
   ומתחתיו casing כהה — אותה שיטה שבה קווי מפה נמשכים מעל אורתופוטו, והיא
   קריאה גם מעל שמיים בהירים וגם מעל צמחייה כהה.
   ההבחנה בין המצבים אינה נשענת על צבע בלבד: inactive מקווקו ודק, previous
   רציף ועבה יותר, current רציף, עבה, כתום ועם הילה. ה-casing אינו נושא
   משמעות בפני עצמו. */
const LINE_CLASS: Record<NodeVisualState, string> = {
  inactive: 'stroke-bg-elevated',
  previous: 'stroke-bg-elevated',
  current: 'stroke-accent',
};
const LINE_WIDTH: Record<NodeVisualState, number> = { inactive: 5, previous: 7, current: 11 };
const LINE_OPACITY: Record<NodeVisualState, number> = { inactive: 0.92, previous: 1, current: 1 };
const LINE_CASING_EXTRA = 8;
/* מקווקו רק ב-inactive — "עוד לא חלק מהסיפור". יחידות viewBox (1536 רוחב). */
const LINE_DASH = '26 18';
/* נקודות קצה על עוגן הזירה — מה שהופך את הקווים לרשת ולא לשריטות על צילום. */
const DOT_RADIUS: Record<NodeVisualState, number> = { inactive: 11, previous: 13, current: 17 };
const DOT_CLASS: Record<NodeVisualState, string> = {
  inactive: 'fill-bg-elevated stroke-fg',
  previous: 'fill-bg-elevated stroke-fg',
  current: 'fill-accent stroke-bg-elevated',
};
/* עקומת ה-snap של הפרויקט (transitionTimingFunction.snap) כערכי bezier. */
const SNAP_EASE = [0.22, 1, 0.36, 1] as const;

function PressureMap({
  nodeStates,
  openNodeId,
  onToggleNode,
  revealKey,
}: {
  nodeStates: Record<PressureNodeId, NodeVisualState>;
  openNodeId: MapNodeId | null;
  onToggleNode: (id: MapNodeId) => void;
  revealKey: string;
}) {
  const uid = useId();
  const definitionId = `${uid}-node-definition`;
  const reduce = !!useReducedMotion();

  /* זיכרון "כבר נחשף", מחוץ למנגנון ה-key של React. ה-key בלבד אינו מספיק:
     React משווה רק מול ה-render הקודם, ולכן יציאה מסבב שכבר נבדק וחזרה אליו
     מפרקת ומרכיבה מחדש את אותם אלמנטים — ואז initial נקרא שוב והחשיפה הייתה
     מתנגנת בכל ביקור חוזר. ה-Set זוכר לכל צירוף סבב+נבדק אילו זירות כבר
     נחשפו פעם אחת, וכל ביקור נוסף נטען ישר במצב הסופי (ללא תנועה).
     "התחלה מחדש" משנה את resetCounter שמגיע מלמעלה כחלק מ-revealKey, כך
     שהמפתחות של הסבב הבא אחרי איפוס לא קיימים עדיין ב-Set הזה, והחשיפה
     חוזרת להיפתח באנימציה — בלי צורך לגעת ברכיב הזה בעצמו. */
  const revealedRef = useRef<Set<string>>(new Set());
  const shouldAnimateReveal = (id: PressureNodeId) =>
    !reduce &&
    nodeStates[id] === 'current' &&
    !revealedRef.current.has(`${revealKey}:${id}`);

  // סימון אחרי ה-commit (ולא תוך כדי render) — כדי ש-StrictMode בפיתוח,
  // שמריץ את ה-render פעמיים, לא יבטל את החשיפה הראשונה בעצמו.
  useEffect(() => {
    for (const id of ALL_NODE_IDS) {
      if (nodeStates[id] === 'current') revealedRef.current.add(`${revealKey}:${id}`);
    }
  });

  const { width: vbW, height: vbH } = MAP_IMAGE_VIEWBOX;
  const [cxFraction, cyFraction] = MAP_NODE_ANCHORS.center.anchor;
  const cx = cxFraction * vbW;
  const cy = cyFraction * vbH;

  return (
    /* בלי padding חיצוני: התמונה היא הכרטיס. overflow-hidden גוזר אותה
       לרדיוס של surface-elevated, והכותרת יורדת לרצועת-על מעל הצילום — כך
       שאין שורת כותרת שדוחפת את המפה למטה ומקטינה אותה. */
    <div className="surface-elevated overflow-hidden">
      {/* עוטף ביחס האמיתי של הנכס (1536×1024). ה-aspect שמועבר ל-IsometricAsset
          נומינלי בלבד ומבוטל ב-[aspect-ratio:auto], כך שהעוטף הוא שקובע את
          צורת התיבה — אותה מוסכמה כמו יתר קריאות ה-*-BANNER בקובץ הסצנה.
          fit="contain" ולא "cover": אסור לחתוך את המפה. */}
      <div
        className="relative w-full"
        style={{ aspectRatio: `${vbW} / ${vbH}` }}
      >
        <IsometricAsset
          assetId={ASSETS.map.assetId}
          src={ASSETS.map.src}
          alt={ASSETS.map.alt}
          aspect="4/3"
          fit="contain"
          className="absolute inset-0 size-full bg-bg-accent [aspect-ratio:auto]"
        />

        {/* עומק: ויניטה פנימית רכה בקצוות. currentColor נלקח מ-text-fg/… כדי
            שלא ייכנס לכאן hex חדש — הצל עצמו הוא דיו-הזית של הפרויקט. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 text-fg/40 shadow-[inset_0_0_38px_-8px_currentColor,inset_0_0_120px_-46px_currentColor]"
        />

        {/* שכבת הקווים בלבד — התוויות, התגיות והכפתורים הם HTML מעל. */}
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          {ALL_NODE_IDS.map((id) => {
            const nodeState = nodeStates[id];
            const [fx, fy] = MAP_NODE_ANCHORS[id].anchor;
            const animatesIn = shouldAnimateReveal(id);
            const nx = fx * vbW;
            const ny = fy * vbH;
            /* x1/y1 בזירה ו-x2/y2 במוקד: אותו קטע בדיוק, אבל pathLength
               נמשך מהזירה פנימה אל המוקד — כיוון הלחץ. */
            const ends = { x1: nx, y1: ny, x2: cx, y2: cy };
            // ציור חד-פעמי של הקו בחשיפה. ללא לולאה וללא תנועה מתמשכת.
            const draw = animatesIn
              ? {
                  initial: { pathLength: 0 },
                  animate: { pathLength: 1 },
                  transition: { duration: 0.5, ease: SNAP_EASE },
                }
              : { initial: false as const };
            return (
              <motion.g
                key={`${revealKey}-${id}`}
                initial={animatesIn ? { opacity: 0 } : false}
                animate={{ opacity: LINE_OPACITY[nodeState] }}
                transition={{ duration: reduce ? 0 : 0.42, ease: 'easeOut' }}
              >
                {/* הילה — רק במוקד הנוכחי, ומרחיבה את נוכחותו על הצילום. */}
                {nodeState === 'current' && (
                  <motion.line
                    {...ends}
                    {...draw}
                    strokeWidth={LINE_WIDTH.current + 22}
                    strokeLinecap="round"
                    strokeOpacity={0.3}
                    className="stroke-accent"
                  />
                )}
                <motion.line
                  {...ends}
                  {...draw}
                  strokeWidth={LINE_WIDTH[nodeState] + LINE_CASING_EXTRA}
                  strokeLinecap="round"
                  strokeOpacity={0.5}
                  className="stroke-fg"
                />
                <motion.line
                  {...ends}
                  {...draw}
                  strokeWidth={LINE_WIDTH[nodeState]}
                  strokeLinecap="round"
                  strokeDasharray={nodeState === 'inactive' ? LINE_DASH : undefined}
                  className={LINE_CLASS[nodeState]}
                />
                <motion.circle
                  cx={nx}
                  cy={ny}
                  r={DOT_RADIUS[nodeState]}
                  strokeWidth={4}
                  initial={animatesIn ? { r: 0 } : false}
                  animate={animatesIn ? { r: DOT_RADIUS.current } : {}}
                  transition={{ duration: 0.45, ease: SNAP_EASE }}
                  className={DOT_CLASS[nodeState]}
                />
              </motion.g>
            );
          })}

          {/* הילה רכה סביב נקודת ההתכנסות — הסמן עצמו הוא אלמנט HTML למטה
              (חייב לשבת מעל תווית המוקד, ולכן לא יכול להיות כאן ב-SVG). */}
          <circle cx={cx} cy={cy} r={34} className="fill-fg" fillOpacity={0.22} />
        </svg>

        {/* רצועת הכותרת — סרגל חצי-אטום בראש התמונה (במקום שורת כותרת מעליה).
            pointer-events-none כדי לא לחסום תוויות שמתקרבות לקצה העליון. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-bg-elevated/90 via-bg-elevated/55 to-transparent px-4 pb-8 pt-3 sm:px-5">
          <h4 className="font-display text-lg font-bold leading-tight text-black">
            {MAP_TEXT.title}
          </h4>
          <p className="mt-0.5 text-sm font-medium leading-snug text-fg-muted">
            {MAP_TEXT.subtitle}
          </p>
        </div>

        <p className="sr-only">{UI_MAP_LINES_DESCRIPTION}</p>

        {/* שש התוויות ממוקמות בקואורדינטות פיזיות (left/top) מתוך המניפסט —
            במכוון, ולא ב-utility לוגי: המיקום הגאוגרפי על התמונה לא מתהפך
            ב-RTL. מתועד ב-design/docs/assumptions.md. */}
        {ALL_MAP_NODE_IDS.map((id) => {
          const [lx, ly] = MAP_NODE_ANCHORS[id].label;
          const isHub = id === 'center';
          const nodeState = isHub ? null : nodeStates[id as PressureNodeId];
          const isCurrent = nodeState === 'current';
          const isPrevious = nodeState === 'previous';
          const chipAnimatesIn = isCurrent && shouldAnimateReveal(id as PressureNodeId);
          const isOpen = openNodeId === id;
          return (
            <div
              key={id}
              className="absolute z-10 flex flex-col items-center gap-1"
              style={{ left: `${lx * 100}%`, top: `${ly * 100}%`, translate: '-50% -50%' }}
            >
              <motion.button
                key={`${revealKey}-label-${id}`}
                type="button"
                aria-expanded={isOpen}
                aria-controls={definitionId}
                onClick={() => onToggleNode(id)}
                initial={chipAnimatesIn ? { scale: 0.82 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: SNAP_EASE }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border-2 font-display font-bold shadow-[0_4px_14px_theme(colors.fg.DEFAULT/35%)] transition-colors duration-200 ease-snap',
                  /* המוקד המרכזי גדול יותר, שובר שורה לשתי שורות ועטוף
                     במסגרת דיו כהה — זהות ויזואלית נפרדת מחמש הזירות. */
                  isHub
                    ? 'max-w-[9.5rem] rounded-xl bg-bg-elevated px-4 py-2 text-center text-base leading-tight text-black'
                    : 'whitespace-nowrap px-3 py-1.5 text-sm',
                  !isHub &&
                    (isCurrent
                      ? 'bg-bg-elevated text-accent ring-4 ring-accent/25'
                      : 'bg-bg-elevated text-black'),
                  // צבע המסגרת נקבע פעם אחת (בלי הסתמכות על סדר ה-CSS):
                  // פתוח ← מרווה, מוקד נוכחי ← כתום, מוקד מרכזי ← דיו, אחרת tan.
                  isOpen
                    ? 'border-brand-dark'
                    : isHub
                      ? 'border-fg'
                      : isCurrent
                        ? 'border-accent'
                        : 'border-border hover:border-border-strong',
                )}
              >
                {/* מצב "נחשף קודם" — סימן וי קטן בתוך התווית עצמה במקום תגית
                    טקסט חוזרת מתחת לכל זירה שנחשפה. הצורה (icon) נושאת את
                    המשמעות, לא הצבע, והמילים עצמן נשארות בטקסט הנגיש. */}
                {isPrevious && (
                  <>
                    <Icon
                      name="check"
                      size={13}
                      strokeWidth={3}
                      className="shrink-0 text-brand-dark"
                    />
                    <span className="sr-only">{`${UI_NODE_PREVIOUS} — `}</span>
                  </>
                )}
                {isCurrent && <span className="sr-only">{`${UI_NODE_CURRENT} — `}</span>}
                {NODE_LABELS[id]}
              </motion.button>
              {/* רק המוקד הנוכחי מקבל תגית נפרדת — היא הפוקוס היחיד במסך. */}
              {isCurrent ? (
                <motion.span
                  key={`${revealKey}-chip-${id}`}
                  aria-hidden
                  initial={chipAnimatesIn ? { opacity: 0, scale: 0.82 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: SNAP_EASE }}
                  className="chip whitespace-nowrap border-accent bg-accent text-white shadow-glow"
                >
                  <Icon name="target" size={12} strokeWidth={2.5} className="shrink-0" />
                  {UI_NODE_CURRENT}
                </motion.span>
              ) : null}
            </div>
          );
        })}

        {/* סמן המוקד — נקודת ההתכנסות עצמה, על התמונה. יושב על עוגן ה-center
            מאותו מניפסט (קואורדינטה פיזית, כמו התוויות), ב-z גבוה מהתוויות
            כדי שייראה גם כשתווית המוקד עולה עליו. טבעת כפולה — צורה שאין לאף
            זירה אחרת, ולכן לא נשענת על צבע בלבד. */}
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 size-6 rounded-full border-[3px] border-fg bg-bg-elevated shadow-[0_2px_8px_theme(colors.fg.DEFAULT/50%)]"
          style={{
            left: `${cxFraction * 100}%`,
            top: `${cyFraction * 100}%`,
            translate: '-50% -50%',
          }}
        >
          <span className="absolute inset-[3px] rounded-full bg-fg" />
        </div>
      </div>

      {/* אזור ההגדרות המשותף — הגדרה כללית של הזירה בלבד. ההסבר הסיבתי של
          הסבב לעולם לא מופיע כאן, אלא רק בכרטיס האירוע אחרי בדיקה.
          כשאין זירה פתוחה זו שורה אחת דקה בתחתית הכרטיס (ולא תיבה ריקה
          בגובה 5.5rem); ה-id, ה-aria-live וסדר ה-DOM לא השתנו. */}
      <div
        id={definitionId}
        aria-live="polite"
        className="border-t border-border/60 bg-bg-accent px-4 py-2.5 sm:px-5"
      >
        {openNodeId ? (
          <>
            <h5 className="font-display text-base font-bold leading-tight text-black">
              {NODE_LABELS[openNodeId]}
            </h5>
            <p className="mt-1 text-base leading-relaxed text-fg-muted text-pretty">
              {NODE_DEFINITIONS[openNodeId]}
            </p>
          </>
        ) : (
          <p className="text-sm leading-snug text-fg-dim">{UI_DEFINITION_PROMPT}</p>
        )}
      </div>
    </div>
  );
}
