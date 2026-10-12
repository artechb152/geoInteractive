'use client';

/* ─────────── הדמיה: מה קורה כשהדאטום לא תואם? — אותו מקום, שתי דרכים לתאר אותו ───────────
   Brief: design/docs/datum-field-challenge-followup-claude-2026-10-12.txt (replaces the
   find-and-fix task of 2026-10-11); screen card: design/docs/datum-field-challenge-screen-card-2026-10-12.md.

   One card, three stages in the same place: "משווים" (the same bridge in A and in B), "בודקים את
   הטעות" (A's numbers read as B, then a label change or a real conversion) and "מתרגלים" (two
   cases). The panel — the question, the source and target in short rows, the action and its
   feedback and the way on directly after it — sits at the inline start (visual right);
   the map shares the width equally at the inline end. The map is one straight-down picture
   (field-map.webp, scripts/maps/build-datum-field-map.mjs); the grid, its margin values, the
   markers, the distance line and every number on it are live, placed through
   datumFieldProjection.ts. The model and the stages are pure (datumField.ts) and unit-tested.

   Surfaces follow design/docs/lessons-02-06-ui-cleanup-spec.md (one workspace; borderless insets;
   options with border and hover); text tiers follow the scene's own neighbours (Table 2). */

import { useCallback, useEffect, useId, useReducer, useRef, useState, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { useRovingKeys } from '../scale/controls';
import { CASES, PLACES, SHIFT, type Datum, type EN, type PlaceId } from './datumField.data';
import {
  activityReducer, caseSource, caseTarget, checkedResult, distance, ERROR_BEFORE, ERROR_MAP, ERROR_SOURCE, errorResult,
  feedbackFor, formatEN, gridLines, initialActivity, interpret, isRight, lerpEN, MODES, numbersOf, optionGap, sentCopy,
  type ActivityAction, type ActivityState, type ErrorPhase, type Mode,
} from './datumField';
import { MAP_PX, toPicture, xOfE, yOfN } from './datumFieldProjection';

const MAP_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/datum-field-challenge/field-map.webp`;
const MAP_ALT =
  'מפת שטח במבט־על: עמק ובו נחל מתפתל מצפון לדרום, גשר מעל הנחל במזרח המפה, דרך ממערב למזרח, צומת דרכים מערבית לגשר וגבעות מתונות מסביב.';

// The scene's block heading and lead (CoordinatesScene H3 / LEAD), and the lesson-content tiers (Table 2).
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const HEADING = 'font-display font-bold leading-tight text-black text-base md:text-lg';
const LABEL = 'text-base font-display font-bold text-black';
const BODY = 'text-base leading-relaxed text-black';
const NUMBERS = 'font-display text-base font-bold tabular-nums text-black';
/** An inset inside the workspace: no border, no shadow. */
const INSET = 'rounded-xl bg-bg-accent/60';

const STAGE: Record<Mode, string> = { compare: 'משווים', error: 'בודקים את הטעות', practice: 'מתרגלים' };

// stage 1
const C_HEADING = 'גשר אחד, קואורדינטות בשני דאטומים';
const C_DO = 'A ו־B הם שמות של שני דאטומים — שתי מערכות ייחוס לחישוב קואורדינטות, ולא שתי נקודות בשטח. כל אחד מהם מעגן את המדידה אחרת, ולכן לאותו גשר מתקבלים מספרים שונים.';
const C_SWITCH = 'בחרו באיזה דאטום להציג את קואורדינטות הגשר';
const C_INITIAL = 'שני צמדי המספרים מתארים את אותו גשר. עברו ל־B: הרשת והמספרים ישתנו, והעיגול שמסמן את הגשר יישאר במקומו.';
const C_TO_B = 'הגשר נשאר באותו מקום. בהמרה לדאטום B המספרים שמייצגים אותו משתנים.';
const C_TO_A = 'הגשר נשאר באותו מקום. בהמרה חזרה לדאטום A המספרים שמייצגים אותו חוזרים לערכים הקודמים.';
const C_NEXT = 'מה קורה בלי המרה?';
// stage 2
const E_HEADING = 'למה מופיע סימון נוסף, הרחק מהגשר?';
const E_DO = 'קיבלנו את קואורדינטות הגשר בדאטום A, והמפה שלנו משתמשת בדאטום B. העתיקו את המספרים ללא המרה וראו לאיזה מקום המפה מפנה אותנו.';
const E_SENT = 'המספרים שנשלחו למפה';
const E_MAP = 'המפה מפרשת את הנתונים בדאטום B';
const E_COPY = 'העתקת המספרים ללא המרה';
const E_RELABEL = 'שינוי הכיתוב בלבד';
const E_RELABEL_HELP = 'מחליפים את האות בכותרת של עותק הנתונים; המספרים אינם משתנים.';
const E_UNLABEL = 'ביטול שינוי הכיתוב';
const E_CONVERT = 'המרת הנתונים מ־A ל־B';
const E_RAW = 'העיגול מסמן את הגשר האמיתי. המעוין מסמן לאן מפנים המספרים כשהמפה קוראת אותם בדאטום B. הם הועתקו מ־A ללא המרה, ולכן מתקבל פער של 60 מטר. זהו פער בסימון, לא תזוזה של הגשר.';
const E_LABELLED = 'הכיתוב השתנה, אבל המספרים עדיין נלקחו מדאטום A. המפה ממשיכה לקרוא אותם כ־B, ולכן הפער נשאר 60 מטר.';
const E_MOVING = 'המחשת המעבר';
const E_FIXED = 'המספרים הומרו לייצוג המתאים לדאטום B. כשהמפה קוראת אותם, הסימון חוזר לאותו גשר. השתנה הייצוג — המקום בשטח נשאר קבוע.';
const E_MATCH = 'הסימון תואם למיקום הגשר';
const E_NEXT = 'נסו על נתונים נוספים';
// stage 3
const P_DO = 'איזה צמד מספרים צריך לשלוח למפת היעד כדי לשמור על אותו מקום?';
const P_RULE = 'בהמחשה הזאת: A→B מחסיר (36,48); B→A מוסיף (36,48).';
const P_PREVIEW = 'תצוגה מקדימה';
const P_CHECK = 'בדיקת הנתונים';
const P_SUMMARY =
  'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.';
// map
const M_FOUND = 'המיקום לפי המספרים';
const M_DISTANCE = 'הפער מהמקום בשטח';
const ON_GROUND: Record<PlaceId, string> = { bridge: 'הגשר בשטח', junction: 'הצומת בשטח' };
const gridName = (d: Datum) => `רשת דאטום ${d}`;
const sourceName = (d: Datum) => `נתוני המקור · דאטום ${d}`;
const targetName = (d: Datum) => `מפת היעד · דאטום ${d}`;

/** The grid's slide between A and B (stage 1) and the marker's way to the bridge after a conversion. */
const GRID_S = 0.45;
const TRAVEL_S = 0.9;
const EASE_SNAP = [0.22, 1, 0.36, 1] as const;

/**
 * Where focus goes after an action that removes or replaces the control the learner used: the
 * new stage's or case's heading, the first experiment after the copy, the copy after a reset.
 */
type FocusKey = 'heading' | 'experiment' | 'copy';
type Act = (a: ActivityAction, focus?: FocusKey) => void;

export function DatumFieldChallenge() {
  const [s, dispatch] = useReducer(activityReducer, undefined, initialActivity);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<FocusKey | null>(null);
  const act = useCallback<Act>((a, focus) => {
    if (focus) focusNext.current = focus;
    dispatch(a);
  }, []);
  useEffect(() => {
    const key = focusNext.current;
    if (!key) return;
    focusNext.current = null;
    rootRef.current?.querySelector<HTMLElement>(`[data-focus="${key}"]`)?.focus();
  });

  // the map's grid: 0 = A's lines, 1 = B's lines. It slides only for an A/B switch inside stage 1;
  // entering a stage shows that stage's grid at once.
  const gridDatum = s.mode === 'compare' ? s.compare.datum : s.mode === 'error' ? ERROR_MAP : CASES[s.practice.index].target;
  const gridT = useEased(gridDatum === 'B' ? 1 : 0, s.mode === 'compare' && !reduce, GRID_S, s.mode);

  // a conversion's motion (0 → 1), tagged with its run: an older run's progress never shows
  const [travel, setTravel] = useState({ run: -1, p: 0 });
  useEffect(() => {
    if (s.error.phase !== 'converting') return;
    const run = s.run;
    if (reduce) {
      setTravel({ run, p: 1 });
      dispatch({ type: 'arrive', run });
      return;
    }
    const controls = animate(0, 1, {
      duration: TRAVEL_S,
      ease: EASE_SNAP,
      onUpdate: (p) => setTravel({ run, p }),
      onComplete: () => dispatch({ type: 'arrive', run }),
    });
    return () => controls.stop();
  }, [s.error.phase, s.run, reduce]);
  const travelP = s.error.phase === 'converting' ? (travel.run === s.run ? travel.p : 0) : 1;

  return (
    <div ref={rootRef} className="my-10" data-datum-activity="">
      <h3 className={H3}>הדמיה: מה קורה כשהדאטום לא תואם?</h3>
      <p className={LEAD}>
        <strong className="text-fg">לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה</strong> (על ההיטל – בחלק הבא).{' '}
        מפות ממקורות שונים עשויות להשתמש בדאטומים שונים. בהדגמה נראה איך מתארים את אותו גשר בשני דאטומים, ומדוע העתקת המספרים ביניהם ללא המרה עלולה להוביל למקום אחר.{' '}
        A ו־B הם דאטומים בדיוניים; ההבדל ביניהם מוצג כאן כהזזה קבועה לצורך ההמחשה בלבד.
      </p>

      <div className="surface-elevated p-6 lg:p-8">
        <StageTabs mode={s.mode} uid={uid} onSelect={(mode) => dispatch({ type: 'setMode', mode })} />

        <div
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${s.mode}`}
          data-stage={s.mode}
          className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8"
        >
          {/* the question, the data, the action and its feedback — inline start (visual right) */}
          <div className="flex min-w-0 flex-col" data-activity-panel="">
            {s.mode === 'compare' && <ComparePanel s={s} act={act} uid={uid} />}
            {s.mode === 'error' && <ErrorPanel s={s} act={act} />}
            {s.mode === 'practice' && <PracticePanel s={s} act={act} uid={uid} />}
          </div>

          {/* the map — inline end (visual left) */}
          <FieldMap scene={sceneOf(s, gridDatum, gridT, travelP)} />
        </div>

        {/* one polite message per change of state — never per animation frame */}
        <p aria-live="polite" className="sr-only">
          {announcement(s)}
        </p>
      </div>
    </div>
  );
}

/**
 * A value that eases to its target, or jumps when `smooth` is off or `resetKey` changed (a new
 * stage shows its own state at once). Refs are only touched inside the effect.
 */
function useEased(target: number, smooth: boolean, duration: number, resetKey: string) {
  const [v, setV] = useState(target);
  const current = useRef(target);
  const lastKey = useRef(resetKey);
  useEffect(() => {
    const jump = !smooth || lastKey.current !== resetKey;
    lastKey.current = resetKey;
    if (jump) {
      current.current = target;
      setV(target);
      return;
    }
    const controls = animate(current.current, target, {
      duration,
      ease: EASE_SNAP,
      onUpdate: (x) => {
        current.current = x;
        setV(x);
      },
    });
    return () => controls.stop();
  }, [target, smooth, duration, resetKey]);
  return v;
}

/** True for `ms` after `key` changes while `active`: a brief emphasis that then fades. */
function useFlash(key: unknown, active: boolean, ms = 1400) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!active) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [key, active, ms]);
  return on && active;
}

function announcement(s: ActivityState): string {
  if (s.mode === 'compare') return s.compare.switched ? (s.compare.datum === 'B' ? C_TO_B : C_TO_A) : '';
  if (s.mode === 'error') {
    switch (s.error.phase) {
      case 'raw':
        return E_RAW;
      case 'relabeled':
        return E_LABELLED;
      case 'converted':
        return `${E_MATCH}. ${E_FIXED}`;
      default:
        return '';
    }
  }
  const p = s.practice;
  if (p.summary) return P_SUMMARY;
  const c = CASES[p.index];
  const done = checkedResult(p);
  if (done) return feedbackFor(c, c.options[done.option]) ?? '';
  if (p.choice !== null) return previewLine(optionGap(c, c.options[p.choice]), PLACES[c.place].name);
  return '';
}

/* ─────────────────── stages ─────────────────── */

function StageTabs({ mode, uid, onSelect }: { mode: Mode; uid: string; onSelect: (m: Mode) => void }) {
  // RTL arrows (← the next stage), Home/End; modified keys stay with the browser and assistive tech
  const { onKeyDown, register } = useRovingKeys(MODES, mode, onSelect);
  return (
    <div role="tablist" aria-label="שלבי הפעילות" className="mb-6 grid grid-cols-3 gap-2" onKeyDown={onKeyDown}>
      {MODES.map((m, i) => {
        const on = m === mode;
        return (
          <button
            key={m}
            ref={register(m)}
            type="button"
            role="tab"
            id={`${uid}-tab-${m}`}
            aria-selected={on}
            aria-controls={`${uid}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(m)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-1.5 text-start transition-colors duration-200 ease-snap motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
              on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
            )}
          >
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-xl font-display text-sm font-bold transition-colors duration-200 motion-reduce:transition-none',
                on ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
              )}
            >
              <L>{i + 1}</L>
            </span>
            <span className="min-w-0 flex-1 font-display text-base font-bold leading-tight text-fg">{STAGE[m]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A stage's heading: where focus lands when the learner moves on with the panel's own button. */
function StageHeading({ children }: { children: ReactNode }) {
  return (
    <h4 tabIndex={-1} data-focus="heading" className={cn(HEADING, 'outline-none')}>
      {children}
    </h4>
  );
}

/* stage 1 — the same bridge, two descriptions */

function ComparePanel({ s, act, uid }: { s: ActivityState; act: Act; uid: string }) {
  const datum = s.compare.datum;
  const switchId = `${uid}-switch`;
  return (
    <>
      <StageHeading>{C_HEADING}</StageHeading>
      <p className={cn(BODY, 'mt-1.5')}>{C_DO}</p>

      <p className={cn(LABEL, 'mt-5 mb-2')} id={switchId}>
        {C_SWITCH}
      </p>
      <Segmented
        labelledBy={switchId}
        items={[
          { id: 'A', label: 'דאטום A' },
          { id: 'B', label: 'דאטום B' },
        ]}
        value={datum}
        onChange={(d) => act({ type: 'setDatum', datum: d })}
      />

      <div className="mt-4 space-y-2">
        {(['A', 'B'] as const).map((d) => (
          <Row key={d} on={d === datum} label={`מספרי הגשר בדאטום ${d}`} value={<L>{formatEN(numbersOf('bridge', d))}</L>} />
        ))}
      </div>

      <FeedbackSlot className="mt-4">
        <Feedback tone="info">
          <p className={BODY}>{s.compare.switched ? (datum === 'B' ? C_TO_B : C_TO_A) : C_INITIAL}</p>
        </Feedback>
      </FeedbackSlot>

      <Footer>
        <NextButton onClick={() => act({ type: 'setMode', mode: 'error' }, 'heading')}>{C_NEXT}</NextButton>
      </Footer>
    </>
  );
}

/* stage 2 — the error, and what fixes it */

/** Stage 2's readings, from the model: the converted pair and the gaps (m) before and after. */
const CONVERTED = sentCopy('converted')!.numbers;
const gapOfPhase = (phase: ErrorPhase) => Math.round(distance(errorResult(phase)!, PLACES.bridge.ground));
const GAP_BEFORE = Math.round(distance(ERROR_BEFORE, PLACES.bridge.ground));

function ErrorPanel({ s, act }: { s: ActivityState; act: Act }) {
  const phase = s.error.phase;
  const moving = phase === 'converting';
  const sent = sentCopy(phase);
  const relabeled = phase === 'relabeled';
  const flashLabel = useFlash(s.run, relabeled);
  const helpId = `${useId()}-help`;
  const step = phase === 'ready' ? null : phase === 'raw' || phase === 'relabeled' ? 'מספרים ללא שינוי' : 'המרה A→B';

  return (
    <>
      <StageHeading>{E_HEADING}</StageHeading>
      <p className={cn(BODY, 'mt-1.5')}>{E_DO}</p>

      {/* the data's way: the source (kept, in A) → the copy sent → the map that reads it as B */}
      <div className="mt-4">
        <Row label={sourceName(ERROR_SOURCE.datum)} value={<L>{formatEN(ERROR_SOURCE.numbers)}</L>} />
        <Flow text={step} />
        <div
          data-sent=""
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border px-3 py-1.5',
            sent ? 'border-transparent bg-bg-accent/60' : 'border-dashed border-border bg-bg-elevated',
          )}
        >
          <span className="flex items-center gap-2">
            <span className={LABEL}>{E_SENT}</span>
            {sent && !moving && (
              <span
                data-copy-label={sent.label}
                className={cn(
                  'grid h-6 min-w-6 place-items-center rounded-md border px-1.5 font-display text-sm font-bold text-black transition-shadow duration-300 motion-reduce:transition-none',
                  sent.label === 'B' ? 'border-accent' : 'border-border',
                  flashLabel && 'ring-2 ring-accent ring-offset-1',
                )}
              >
                <span className="sr-only">כיתוב: דאטום </span>
                <L>{sent.label}</L>
              </span>
            )}
          </span>
          {/* no output numbers while the marker is still on its way */}
          <span className={cn(NUMBERS, 'rounded-md px-1 transition-shadow duration-300 motion-reduce:transition-none', flashLabel && 'ring-2 ring-border-strong')}>
            {moving ? (
              <span className="font-sans font-normal text-fg-muted">{E_MOVING}</span>
            ) : sent ? (
              <L>{formatEN(sent.numbers)}</L>
            ) : (
              <span className="font-sans font-normal text-fg-muted">—</span>
            )}
          </span>
        </div>
        <Flow text={sent ? 'פירוש כ־B' : null} />
        <Row label={E_MAP} />
      </div>

      {/* the actions, then their feedback right under them */}
      {phase === 'ready' ? (
        <div className="mt-4">
          <Button variant="primary" size="md" className="w-full px-4" data-focus="copy" onClick={() => act({ type: 'copyRaw' }, 'experiment')}>
            {E_COPY}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            <Experiment
              label={relabeled ? E_UNLABEL : E_RELABEL}
              focusKey="experiment"
              describedBy={helpId}
              on={relabeled}
              onClick={() => act({ type: 'toggleLabel' })}
            />
            <Experiment label={E_CONVERT} on={moving || phase === 'converted'} inactive={moving} onClick={() => act({ type: 'convert' })} />
          </div>
          <p id={helpId} className={cn(BODY, 'mt-1.5')}>
            <span className="font-display font-bold">{E_RELABEL}:</span> {E_RELABEL_HELP}
          </p>
        </div>
      )}

      <FeedbackSlot className="mt-3">
        {phase === 'raw' && (
          <Feedback tone="info">
            <p className={BODY}>{E_RAW}</p>
          </Feedback>
        )}
        {phase === 'relabeled' && (
          <Feedback
            tone="info"
            after={
              <Compare
                cells={[
                  { name: 'כיתוב', value: <L>{`${ERROR_SOURCE.datum} → ${sentCopy('relabeled')!.label}`}</L> },
                  { name: 'מספרים', value: 'ללא שינוי' },
                  { name: 'פער', value: <><L>{`${GAP_BEFORE} → ${gapOfPhase('relabeled')}`}</L> מ׳</> },
                ]}
              />
            }
          >
            <p className={BODY}>{E_LABELLED}</p>
          </Feedback>
        )}
        {moving && (
          <Feedback tone="info">
            <p className={cn(LABEL, 'flex items-center gap-2')}>
              <span aria-hidden className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
              {E_MOVING}
            </p>
          </Feedback>
        )}
        {phase === 'converted' && (
          <Feedback
            tone="right"
            after={
              <Compare
                cells={[
                  { name: 'E', value: <L>{`${ERROR_SOURCE.numbers.e} → ${CONVERTED.e}`}</L> },
                  { name: 'N', value: <L>{`${ERROR_SOURCE.numbers.n} → ${CONVERTED.n}`}</L> },
                  { name: 'פער', value: <><L>{`${GAP_BEFORE} → ${gapOfPhase('converted')}`}</L> מ׳</> },
                ]}
              />
            }
          >
            <p className={LABEL}>{E_MATCH}</p>
            <p className={cn(BODY, 'mt-1')}>{E_FIXED}</p>
          </Feedback>
        )}
      </FeedbackSlot>

      <Footer>
        <NextButton onClick={() => act({ type: 'setMode', mode: 'practice' }, 'heading')}>{E_NEXT}</NextButton>
      </Footer>
    </>
  );
}

/**
 * An experiment: a direct action, marked while its result is on the map. While it cannot act (the
 * conversion's own motion) it says so with aria-disabled and keeps focus, instead of dropping it.
 */
function Experiment({
  label,
  on,
  onClick,
  inactive,
  describedBy,
  focusKey,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  inactive?: boolean;
  describedBy?: string;
  focusKey?: FocusKey;
}) {
  return (
    <button
      type="button"
      onClick={inactive ? undefined : onClick}
      aria-disabled={inactive || undefined}
      aria-describedby={describedBy}
      data-focus={focusKey}
      className={cn(
        'min-h-12 rounded-xl border px-2.5 py-2 font-display text-[15px] font-bold leading-tight text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'aria-disabled:cursor-default aria-disabled:opacity-60',
        on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
      )}
    >
      {isolateArrow(label)}
    </button>
  );
}

/** Before → after, three short cells, plain inside the feedback inset. */
function Compare({ cells }: { cells: { name: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2">
      {cells.map((c, i) => (
        <div key={i} className="text-center">
          <dt className={LABEL}>{c.name}</dt>
          <dd className={cn(NUMBERS, 'whitespace-nowrap')}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* stage 3 — two cases */

function previewLine(gap: number, place: string) {
  return gap < 0.5 ? `${P_PREVIEW}: הסימון מופיע על ${place}.` : `${P_PREVIEW}: הסימון מופיע ${Math.round(gap)} מטר מ${place}.`;
}

function PracticePanel({ s, act, uid }: { s: ActivityState; act: Act; uid: string }) {
  const p = s.practice;
  if (p.summary) {
    return (
      <>
        <StageHeading>סיכום התרגול</StageHeading>
        <FeedbackSlot className="mt-3">
          <Feedback tone="right">
            <p className={BODY}>{P_SUMMARY}</p>
          </Feedback>
        </FeedbackSlot>
        <Footer>
          <Button variant="secondary" size="md" className="px-4" onClick={() => act({ type: 'restartPractice' }, 'heading')}>
            <Icon name="refresh" size={16} strokeWidth={2} />
            תרגול חוזר
          </Button>
          <NextButton onClick={() => act({ type: 'backToDemo' }, 'heading')}>חזרה להדגמה</NextButton>
        </Footer>
      </>
    );
  }

  const c = CASES[p.index];
  const place = PLACES[c.place];
  const done = checkedResult(p);
  const last = p.index === CASES.length - 1;
  const canCheck = p.choice !== null && p.checked !== p.choice;
  return (
    <>
      {/* the case and its question: one block, where focus lands on a new case */}
      <div tabIndex={-1} data-focus="heading" className="outline-none">
        <p className={cn(LABEL, 'mb-1')}>
          מקרה <L>{p.index + 1}</L> מתוך <L>{CASES.length}</L> · {place.name}
        </p>
        <h4 className={HEADING}>{P_DO}</h4>
      </div>

      <div className="mt-3 space-y-2">
        <Row label={sourceName(c.source)} value={<L>{formatEN(caseSource(c))}</L>} />
        <Row label={targetName(c.target)} />
      </div>
      <Rule />

      <fieldset className="mt-3 min-w-0">
        <legend className="sr-only">בחרו צמד מספרים</legend>
        <div className="grid grid-cols-3 gap-2">
          {c.options.map((o, i) => {
            const on = p.choice === i;
            return (
              <label
                key={`${c.id}-${i}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors duration-200 ease-snap motion-reduce:transition-none',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2',
                  on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-option-${c.id}`}
                  value={i}
                  checked={on}
                  onChange={() => act({ type: 'choose', option: i })}
                  className="sr-only"
                />
                <RadioDot on={on} />
                <span dir="ltr" className={cn(NUMBERS, 'flex flex-col leading-snug')}>
                  <span>E {o.e}</span>
                  <span>N {o.n}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <PrimaryAction className="mt-3 w-full" inactive={!canCheck} onClick={() => act({ type: 'check' })}>
        {P_CHECK}
      </PrimaryAction>

      <FeedbackSlot className="mt-3">
        {done ? (
          <Feedback tone={done.right ? 'right' : 'wrong'}>
            <p className={BODY}>{feedbackFor(c, c.options[done.option])}</p>
          </Feedback>
        ) : (
          p.choice !== null && (
            <Feedback tone="info">
              <p className={BODY}>{previewLine(optionGap(c, c.options[p.choice]), place.name)}</p>
            </Feedback>
          )
        )}
      </FeedbackSlot>

      <Footer>
        {p.index > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => act({ type: 'goCase', index: p.index - 1 }, 'heading')}>
            <Icon name="arrow-right" size={16} strokeWidth={2} />
            למקרה הקודם
          </Button>
        ) : null}
        {p.solved[p.index] &&
          (last ? (
            p.solved.every(Boolean) && <NextButton onClick={() => act({ type: 'showSummary' }, 'heading')}>לסיכום התרגול</NextButton>
          ) : (
            <NextButton onClick={() => act({ type: 'goCase', index: p.index + 1 }, 'heading')}>למקרה הבא</NextButton>
          ))}
      </Footer>
    </>
  );
}

/**
 * The lesson's primary button (Button primary · md, same classes), with aria-disabled instead of
 * disabled: after "בדיקת הנתונים" it keeps focus while the verdict is read out.
 */
function PrimaryAction({ children, onClick, inactive, className }: { children: ReactNode; onClick: () => void; inactive: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-disabled={inactive || undefined}
      onClick={inactive ? undefined : onClick}
      className={cn(
        'inline-flex items-center justify-center select-none whitespace-nowrap font-display transition-all duration-200 ease-snap',
        'h-12 px-6 text-[15px] gap-2 rounded-xl',
        'bg-cta-ember font-bold text-white shadow-cta-ember hover:brightness-105 active:translate-y-px',
        inactive && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The schematic rule, as task data: the sentence, and the formula left to right with its axes named. */
function Rule() {
  return (
    <div className={cn(INSET, 'mt-3 px-3 py-2.5')}>
      <p className={BODY}>{clauses(P_RULE)}</p>
      {/* in the sentence's order (A→B first, at the start), each formula left to right */}
      <div className={cn(NUMBERS, 'mt-1 flex flex-wrap gap-x-5 gap-y-0.5')}>
        <span dir="ltr">{`A→B: E − ${SHIFT.e}, N − ${SHIFT.n}`}</span>
        <span dir="ltr">{`B→A: E + ${SHIFT.e}, N + ${SHIFT.n}`}</span>
      </div>
    </div>
  );
}

/** The rule's clauses kept whole (a line breaks only between them), their Latin and number runs isolated. */
function clauses(text: string): ReactNode[] {
  const [lead, ...rest] = text.split(': ');
  const parts = rest.join(': ').split('; ');
  return [
    `${lead}: `,
    ...parts.flatMap((p, i) => [
      <span key={i} className="whitespace-nowrap">
        {isolate(p)}
        {i < parts.length - 1 ? ';' : ''}
      </span>,
      i < parts.length - 1 ? ' ' : '',
    ]),
  ];
}

/** Latin and number runs of a Hebrew sentence, each in its own LTR isolate. */
function isolate(text: string): ReactNode[] {
  return text.split(/([A-Z]→[A-Z]|\(\d+,\d+\))/).map((part, i) => (i % 2 ? <L key={i}>{part}</L> : part));
}

/* ─────────────────── shared panel parts ─────────────────── */

/** A data row: a borderless inset; the active datum's row is tinted. */
function Row({ label, value, on }: { label: string; value?: ReactNode; on?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl px-3 py-1.5 transition-colors duration-200 ease-snap motion-reduce:transition-none',
        on ? 'bg-accent/15' : 'bg-bg-accent/60',
      )}
    >
      <span className={LABEL}>{label}</span>
      {value !== undefined && <span className={NUMBERS}>{value}</span>}
    </div>
  );
}

/** A short link between two rows of the data's way: a line down and what happened on it. */
function Flow({ text }: { text: string | null }) {
  return (
    <div className="flex h-6 items-center gap-2 ps-5" aria-hidden={!text}>
      <svg width="12" height="22" viewBox="0 0 12 26" aria-hidden className={cn('shrink-0', text ? 'text-fg-muted' : 'text-border')}>
        <path d="M6 1v20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M2 17l4 5 4-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text && <span className={BODY}>{isolateArrow(text)}</span>}
    </div>
  );
}

const isolateArrow = (t: string): ReactNode[] => t.split(/([A-Z]→[A-Z])/).map((part, i) => (i % 2 ? <L key={i}>{part}</L> : part));

const DATUMS = ['A', 'B'] as const;

function Segmented({
  labelledBy,
  items,
  value,
  onChange,
}: {
  labelledBy: string;
  items: { id: Datum; label: string }[];
  value: Datum;
  onChange: (v: Datum) => void;
}) {
  // the lesson's segmented radio group (datum/DatumGuided.tsx), same classes; the lesson's roving keys
  const { onKeyDown, register } = useRovingKeys(DATUMS, value, onChange);
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border bg-bg-accent p-1" onKeyDown={onKeyDown}>
      {items.map((x) => {
        const on = value === x.id;
        return (
          <button
            key={x.id}
            ref={register(x.id)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-datum={x.id}
            onClick={() => onChange(x.id)}
            className={cn(
              'h-9 rounded-lg font-display text-base font-bold transition-colors duration-200 ease-snap motion-reduce:transition-none cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'bg-brand-dark text-bg-elevated' : 'text-fg hover:bg-brand/[0.08]',
            )}
          >
            {x.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ease-snap motion-reduce:transition-none',
        on ? 'border-accent' : 'border-border-strong',
      )}
    >
      {on && <span className="size-2.5 rounded-full bg-accent" />}
    </span>
  );
}

/** Feedback takes only the room it needs; empty states do not reserve a blank block. */
function FeedbackSlot({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('empty:hidden', className)}>{children}</div>;
}

/** Feedback next to the action: an inset tinted by its meaning; one glyph (✓ / ✕) when it is a verdict. */
function Feedback({ tone, children, after }: { tone: 'info' | 'wrong' | 'right'; children: ReactNode; after?: ReactNode }) {
  return (
    <div
      data-feedback={tone}
      className={cn('rounded-xl p-3.5', tone === 'right' ? 'bg-brand/[0.08]' : tone === 'wrong' ? 'bg-bg-accent' : 'bg-bg-accent/60')}
    >
      <div className="flex gap-3">
        {tone !== 'info' && (
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
              tone === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong text-fg',
            )}
          >
            <Icon name={tone === 'right' ? 'check' : 'x'} size={15} strokeWidth={2.5} />
          </span>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {after}
    </div>
  );
}

/** Continue directly after the explanation, independent of the map's height. */
function Footer({ children }: { children: ReactNode }) {
  return <div data-activity-navigation="" className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">{children}</div>;
}

function NextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button variant="secondary" size="md" className="min-w-0 flex-1 px-4" onClick={onClick}>
      {children}
      <Icon name="arrow-left" size={16} strokeWidth={2} />
    </Button>
  );
}

/* ─────────────────── the map ─────────────────── */

type MapLabel = { text: string; numbers?: EN };
type MapScene = {
  datum: Datum;
  /** 0 = A's grid lines, 1 = B's (fractions while sliding). */
  gridT: number;
  targets: { at: EN; label: MapLabel }[];
  results: { at: EN; label: MapLabel; moving?: boolean }[];
  /** The gap in metres, or null while the marker is still on its way. */
  measure: { from: EN; to: EN; gap: number | null } | null;
  legend: ('target' | 'result' | 'measure' | 'grid')[];
  targetName: string;
};

function sceneOf(s: ActivityState, gridDatum: Datum, gridT: number, travelP: number): MapScene {
  const bridge = PLACES.bridge.ground;
  if (s.mode === 'compare') {
    return {
      datum: gridDatum,
      gridT,
      targets: [{ at: bridge, label: { text: 'הגשר', numbers: numbersOf('bridge', s.compare.datum) } }],
      results: [],
      measure: null,
      legend: ['target', 'grid'],
      targetName: ON_GROUND.bridge,
    };
  }
  if (s.mode === 'error') {
    const phase: ErrorPhase = s.error.phase;
    const sent = sentCopy(phase);
    const moving = phase === 'converting';
    const at = moving ? lerpEN(ERROR_BEFORE, bridge, travelP) : errorResult(phase);
    const results = at && sent ? [{ at, moving, label: moving ? { text: E_MOVING } : { text: M_FOUND, numbers: sent.numbers } }] : [];
    const gap = at ? distance(at, bridge) : 0;
    return {
      datum: gridDatum,
      gridT,
      targets: [{ at: bridge, label: { text: ON_GROUND.bridge } }],
      results,
      // the gap is read only at rest: no number for a marker still on its way
      measure: at && gap >= 1 ? { from: bridge, to: at, gap: moving ? null : gap } : null,
      legend: ['target', 'result', 'measure', 'grid'],
      targetName: ON_GROUND.bridge,
    };
  }
  const p = s.practice;
  if (p.summary) {
    return {
      datum: gridDatum,
      gridT,
      targets: CASES.map((c) => ({ at: caseTarget(c), label: { text: ON_GROUND[c.place] } })),
      results: CASES.map((c) => {
        const right = c.options.find((o) => isRight(c, o))!;
        return { at: interpret(right, c.target), label: { text: '' } };
      }),
      measure: null,
      legend: ['target', 'result', 'grid'],
      targetName: 'הגשר והצומת בשטח',
    };
  }
  const c = CASES[p.index];
  const target = caseTarget(c);
  const name = ON_GROUND[c.place];
  const option = p.choice === null ? null : c.options[p.choice];
  const at = option && interpret(option, c.target);
  const gap = at ? distance(at, target) : 0;
  return {
    datum: gridDatum,
    gridT,
    targets: [{ at: target, label: { text: name } }],
    results: at && option ? [{ at, label: { text: p.checked === p.choice ? M_FOUND : P_PREVIEW, numbers: option } }] : [],
    measure: at && gap >= 1 ? { from: target, to: at, gap } : null,
    legend: ['target', 'result', 'measure', 'grid'],
    targetName: name,
  };
}

type LoadState = 'pending' | 'ready' | 'failed';
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
/** Margin values: the lesson's dense-instrument size (lessons-02-06 spec §3), bold, on the paper. */
const MARGIN = 'absolute font-display text-[13px] font-bold tabular-nums text-fg-muted whitespace-nowrap';

function FieldMap({ scene }: { scene: MapScene }) {
  const [load, setLoad] = useState<LoadState>('pending');
  const boxRef = useRef<HTMLDivElement>(null);
  // picture pixels per screen pixel (the markers and the line's ends are sized on screen)
  const [k, setK] = useState(MAP_PX.w / 524);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.clientWidth > 0 && setK(MAP_PX.w / el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  // load/error can fire before hydration (static HTML, cache): read the element itself
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setLoad(img.naturalWidth > 0 ? 'ready' : 'failed');
  }, [attempt]);
  const src = attempt ? `${MAP_SRC}?retry=${attempt}` : MAP_SRC;

  // the grid the model defines (gridLines), at the current slide between A's and B's lines
  const grid = gridLines(scene.gridT);
  const eLines = grid.e.map((l) => ({ v: l.value, x: xOfE(l.ground) }));
  const nLines = grid.n.map((l) => ({ v: l.value, y: yOfN(l.ground) }));

  return (
    <figure className="m-0 flex min-w-0 flex-col" data-map={load}>
      {/* the map keeps its own orientation: west on the left, whatever the reading direction */}
      <div dir="ltr" className="grid grid-cols-[3rem_minmax(0,1fr)]">
        {/* N values, on the west margin */}
        <div aria-hidden className="relative">
          {nLines.map((l) => (
            <span key={`n${l.v}`} data-grid-n={l.v} className={cn(MARGIN, 'end-1')} style={{ top: pct(l.y), transform: 'translateY(-50%)' }}>
              N {l.v}
            </span>
          ))}
        </div>

        <div
          ref={boxRef}
          data-map-box=""
          className="relative overflow-hidden rounded-lg border border-border bg-bg-accent"
          style={{ aspectRatio: `${MAP_PX.w} / ${MAP_PX.h}` }}
          aria-busy={load === 'pending' || undefined}
        >
          {load === 'pending' && (
            // the site's asset loading surface (IsometricAsset): tan wash + soft sheen, only after a short delay
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 animate-asset-surface-in bg-tanline/35 motion-reduce:[animation-duration:0s]">
                <div className="absolute inset-0 hidden bg-gradient-to-l from-transparent via-paper-bright/70 to-transparent motion-safe:block motion-safe:animate-asset-sheen" />
              </div>
            </div>
          )}
          {load !== 'failed' && (
            // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
            <img
              key={attempt}
              ref={imgRef}
              src={src}
              alt={MAP_ALT}
              width={MAP_PX.w}
              height={MAP_PX.h}
              decoding="async"
              draggable={false}
              data-asset-img=""
              suppressHydrationWarning
              onLoad={() => setLoad('ready')}
              onError={() => setLoad('failed')}
              className={cn(
                'absolute inset-0 size-full select-none transition-opacity duration-300 ease-out motion-reduce:transition-none',
                load === 'ready' ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}

          <MapLayers scene={scene} eLines={eLines} nLines={nLines} k={k} />

          {load === 'failed' && (
            <div dir="rtl" role="alert" className="absolute inset-x-3 top-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated/95 px-3 py-2">
              <p className={BODY}>לא ניתן לטעון את מפת השטח.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLoad('pending');
                  setAttempt((n) => n + 1);
                }}
              >
                נסו שוב
              </Button>
            </div>
          )}
        </div>

        <span />
        {/* E values, on the south margin */}
        <div aria-hidden className="relative h-6">
          {eLines.map((l) => (
            <span key={`e${l.v}`} data-grid-e={l.v} className={cn(MARGIN, 'top-1')} style={{ left: pct(l.x), transform: 'translateX(-50%)' }}>
              E {l.v}
            </span>
          ))}
        </div>
      </div>

      {/* under the map itself: its start (right) edge, clear of the N margin on the left */}
      <figcaption className="me-12 mt-1">
        <Legend scene={scene} />
      </figcaption>
    </figure>
  );
}

const CHIP = 'inline-flex flex-col items-center rounded-lg border border-border bg-bg-elevated/95 px-2 py-0.5';

/** The live layers, in picture fractions from the one transform. Never mirrored. */
function MapLayers({ scene, eLines, nLines, k }: { scene: MapScene; eLines: { v: number; x: number }[]; nLines: { v: number; y: number }[]; k: number }) {
  const W = MAP_PX.w;
  const H = MAP_PX.h;
  const target = scene.targets[0];
  const result = scene.results[0];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        {/* the grid of the datum in use: thin, exact */}
        <g data-grid={scene.datum} className="stroke-fg" strokeOpacity={0.42} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {eLines.map((l) => (
            <line key={`e${l.v}`} x1={l.x * W} x2={l.x * W} y1={0} y2={H} vectorEffect="non-scaling-stroke" />
          ))}
          {nLines.map((l) => (
            <line key={`n${l.v}`} x1={0} x2={W} y1={l.y * H} y2={l.y * H} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {scene.measure && <Measure from={scene.measure.from} to={scene.measure.to} k={k} />}
      </svg>

      {scene.measure && scene.measure.gap !== null && <MeasureLabel from={scene.measure.from} to={scene.measure.to} gap={scene.measure.gap} />}

      {scene.targets.map((t, i) => (
        <Marker key={`t${i}`} kind="target" at={t.at} />
      ))}
      {scene.results.map((r, i) => (
        <Marker key={`r${i}`} kind="result" at={r.at} />
      ))}

      {/* labels: the result's on the side away from the target, the target's on the other side */}
      {scene.targets.map((t, i) => {
        const r = scene.results[i];
        const below = !r || distance(r.at, t.at) < 1 || r.at.n >= t.at.n;
        return <Chip key={`tl${i}`} at={t.at} side={below ? 'below' : 'above'} label={t.label} kind="target" />;
      })}
      {result && result.label.text && target && (
        <Chip at={result.at} side={distance(result.at, target.at) < 1 || result.at.n >= target.at.n ? 'above' : 'below'} label={result.label} kind="result" />
      )}
    </div>
  );
}

function Marker({ kind, at }: { kind: 'target' | 'result'; at: EN }) {
  const p = toPicture(at);
  return (
    <span data-marker={kind} className="absolute" style={{ left: pct(p.x), top: pct(p.y), transform: 'translate(-50%, -50%)' }}>
      {kind === 'target' ? <TargetGlyph size={56} /> : <ResultGlyph size={18} />}
    </span>
  );
}

/** The target: an open ring with four ticks around the place, so the bridge or the junction shows inside it. */
function TargetGlyph({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 60 60" className="block overflow-visible">
      <g fill="none" strokeLinecap="round" className="stroke-bg-elevated" strokeWidth={4.5} opacity={0.95}>
        <circle cx="30" cy="30" r="20" />
        <path d="M30 2v7M30 51v7M2 30h7M51 30h7" />
      </g>
      <g fill="none" strokeLinecap="round" className="stroke-fg" strokeWidth={2}>
        <circle cx="30" cy="30" r="20" />
        <path d="M30 2v7M30 51v7M2 30h7M51 30h7" />
      </g>
    </svg>
  );
}

/** The computed location: a filled diamond — a different shape, not only a different colour. */
function ResultGlyph({ size }: { size: number }) {
  return <span aria-hidden className="block rotate-45 rounded-[3px] border-2 border-bg-elevated bg-accent" style={{ width: size, height: size }} />;
}

/** A dimension line between the two markers: square ends, no arrowhead (a distance, not a route). */
function Measure({ from, to, k }: { from: EN; to: EN; k: number }) {
  const W = MAP_PX.w;
  const H = MAP_PX.h;
  const a = toPicture(from);
  const b = toPicture(to);
  const ax = a.x * W;
  const ay = a.y * H;
  const bx = b.x * W;
  const by = b.y * H;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  // start clear of the target's ring and stop clear of the diamond (k: picture px per screen px)
  const s0 = 23 * k;
  const s1 = Math.max(s0, len - 14 * k);
  const p0 = { x: ax + ux * s0, y: ay + uy * s0 };
  const p1 = { x: ax + ux * s1, y: ay + uy * s1 };
  const cap = 7 * k;
  const nx = -uy * cap;
  const ny = ux * cap;
  const d = `M${p0.x} ${p0.y}L${p1.x} ${p1.y}M${p0.x + nx} ${p0.y + ny}L${p0.x - nx} ${p0.y - ny}M${p1.x + nx} ${p1.y + ny}L${p1.x - nx} ${p1.y - ny}`;
  if (s1 - s0 < 4 * k) return null;
  return (
    <g data-measure="" fill="none" strokeLinecap="round">
      <path d={d} className="stroke-bg-elevated" strokeWidth={4.5} vectorEffect="non-scaling-stroke" opacity={0.95} />
      <path d={d} className="stroke-fg" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function MeasureLabel({ from, to, gap }: { from: EN; to: EN; gap: number }) {
  const a = toPicture(from);
  const b = toPicture(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // the side of the line toward the east, clear of the labels above and below the markers
  const dx = (b.x - a.x) * MAP_PX.w;
  const dy = (b.y - a.y) * MAP_PX.h;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (nx < 0) {
    nx = -nx;
    ny = -ny;
  }
  return (
    <span
      data-measure-label=""
      className="absolute"
      style={{ left: pct(mx), top: pct(my), transform: `translate(calc(-50% + ${(nx * 30).toFixed(1)}px), calc(-50% + ${(ny * 30).toFixed(1)}px))` }}
    >
      <span dir="rtl" className={cn(CHIP, 'whitespace-nowrap font-display text-sm font-bold tabular-nums text-black')}>
        <span>
          <L>{Math.round(gap)}</L> מ׳
        </span>
      </span>
    </span>
  );
}

function Chip({ at, side, label, kind }: { at: EN; side: 'above' | 'below'; label: MapLabel; kind: 'target' | 'result' }) {
  const p = toPicture(at);
  // near a side edge the chip leans inward instead of leaving the map
  const ax = p.x < 0.2 ? '-18%' : p.x > 0.8 ? '-82%' : '-50%';
  const gap = kind === 'target' ? 30 : 15;
  const ty = side === 'below' ? `${gap}px` : `calc(-100% - ${gap}px)`;
  return (
    <span data-chip={kind} className="absolute" style={{ left: pct(p.x), top: pct(p.y), transform: `translate(${ax}, ${ty})` }}>
      <span dir="rtl" className={CHIP}>
        <span className="font-display text-sm font-bold leading-snug text-black whitespace-nowrap">{label.text}</span>
        {label.numbers && (
          <span className="font-display text-sm font-bold leading-snug tabular-nums text-fg-muted">
            <L>{formatEN(label.numbers)}</L>
          </span>
        )}
      </span>
    </span>
  );
}

/** The map's legend: T6 (lessons-02-06 spec), each item with the symbol drawn on the map. */
function Legend({ scene }: { scene: MapScene }) {
  const item = 'flex items-center gap-1.5';
  const text = 'text-sm leading-snug text-fg-muted';
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" data-legend="">
      {scene.legend.includes('target') && (
        <li className={item}>
          <TargetGlyph size={18} />
          <span className={text}>{scene.targetName}</span>
        </li>
      )}
      {scene.legend.includes('result') && (
        <li className={item}>
          <span className="grid size-[18px] place-items-center">
            <ResultGlyph size={10} />
          </span>
          <span className={text}>{M_FOUND}</span>
        </li>
      )}
      {scene.legend.includes('measure') && (
        <li className={item}>
          <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden className="stroke-fg" fill="none" strokeWidth={1.75} strokeLinecap="round">
            <path d="M2 6h18M2 2v8M20 2v8" />
          </svg>
          <span className={text}>{M_DISTANCE}</span>
        </li>
      )}
      {scene.legend.includes('grid') && (
        <li className={item}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="stroke-fg" strokeOpacity={0.55} fill="none" strokeWidth={1}>
            <path d="M6 1v16M12 1v16M1 6h16M1 12h16" />
          </svg>
          <span className={text}>{gridName(scene.datum)}</span>
        </li>
      )}
    </ul>
  );
}
