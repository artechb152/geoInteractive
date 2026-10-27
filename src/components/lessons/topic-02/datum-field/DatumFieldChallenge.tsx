'use client';

/* ─────────── הדמיה: מה קורה כשהדאטום לא תואם? — אותו מקום, שתי דרכים לתאר אותו ───────────
   Brief: design/docs/datum-field-challenge-followup-claude-2026-10-12.txt (replaces the
   find-and-fix task of 2026-10-11); screen card: design/docs/datum-field-challenge-screen-card-2026-10-12.md
   (clarity pass of 2026-10-26: datum tags, the real place vs the mark obtained, decisions before answers).

   One card, three stages in the same place: "משווים" (the same bridge in A and in B), "בודקים את
   הטעות" (A's numbers read as B, then a label change or a real conversion) and "מתרגלים" (two
   cases, each decided in three steps before the map shows anything). The panel — the question, the
   data with their datum tags, the action and its feedback and the way on directly after it — sits at
   the inline start (visual right) and takes the card's width beside a fixed map column (MAP_BOX_W) at
   the inline end, titled with the datum it uses; the lead above ends where the panel does. Neither
   column stretches to the other: each stage keeps room for its own feedback (ROOM), so the map and
   the controls stay put within a stage (layout pass 2026-10-27,
   design/docs/claude-datum-layout-2026-10-27.md). The map is one straight-down picture (field-map.webp,
   scripts/maps/build-datum-field-map.mjs); the grid, its margin values, the markers, the distance
   line and every number on it are live, placed through datumFieldProjection.ts. The model and the
   stages are pure (datumField.ts) and unit-tested.

   Surfaces follow design/docs/lessons-02-06-ui-cleanup-spec.md (one workspace; borderless insets;
   options with border and hover); text tiers follow the scene's own neighbours (Table 2). */

import { useCallback, useEffect, useId, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { useRovingKeys } from '../scale/controls';
import { CASES, PLACES, SHIFT, type Action, type Datum, type EN, type PlaceId, type PracticeCase } from './datumField.data';
import {
  activityReducer, calcOptions, caseSource, caseTarget, checkedDiagnosis, convert, datumsMatch, directionOf, distance,
  ERROR_BEFORE, ERROR_MAP, ERROR_SOURCE, errorResult, formatEN, gridLines, initialActivity, interpret, isConversion,
  lerpEN, MODES, numbersOf, rightAction, sentCopy, sentOf,
  type ActivityAction, type ActivityState, type Diagnosis, type ErrorPhase, type Mode, type PracticeAnswer,
} from './datumField';
import { MAP_PX, toPicture, xOfE, yOfN } from './datumFieldProjection';

const MAP_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/datum-field-challenge/field-map.webp`;
const MAP_ALT =
  'מפת שטח במבט־על: עמק ובו נחל מתפתל מצפון לדרום, גשר מעל הנחל במזרח המפה, דרך ממערב למזרח, צומת דרכים מערבית לגשר וגבעות מתונות מסביב.';

// The activity's heading and lead, at the top of its own card (one envelope per activity), and the lesson-content tiers (Table 2).
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
// the lead ends where the panel's column ends, so the text reads as one column above the work and the map stands beside it
const LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl lg:max-w-[calc(100%-var(--map-col)-2rem)]';
/**
 * The map's column at desktop (px of the 1344 reference layout): the picture box plus its 3rem N margin. Sized so the
 * map stands between the panel's shortest stage (compare, 493) and its tallest (practice, 691), and the panel takes the
 * rest of the card's width (768, the lead's measure).
 */
const MAP_BOX_W = 430;
const MAP_COL = { '--map-col': `${MAP_BOX_W + 48}px` } as CSSProperties;
/**
 * Room kept for each stage's feedback: its tallest feedback at the reference layout (the card is always laid out at
 * 1344px), so the way on stays put when feedback appears — compare: one line + the before/after cells; error: the
 * conversion's two lines + cells; practice: a verdict with two lines. The summary keeps no room.
 */
const ROOM: Record<Mode, string> = { compare: 'min-h-[142px]', error: 'min-h-[168px]', practice: 'min-h-[108px]' };
/** Stage 2's action row: the copy button holds the two experiments' height, so the feedback starts at one place. */
const ACTION_ROW = 'min-h-[3.875rem]';
/** Practice step 3 holds the conversion's rule and pairs, so the check does not move while the action is chosen. */
const SEND_ROOM = 'min-h-[5.875rem]';
const HEADING = 'font-display font-bold leading-tight text-black text-base md:text-lg';
const LABEL = 'text-base font-display font-bold text-black';
const BODY = 'text-base leading-relaxed text-black';
const NUMBERS = 'font-display text-base font-bold tabular-nums text-black';
/** An inset inside the workspace: no border, no shadow. */
const INSET = 'rounded-xl bg-bg-accent/60';
/** An option or experiment: bordered, tinted while on (lessons-02-06 spec). */
const OPTION = 'rounded-xl border transition-colors duration-200 ease-snap motion-reduce:transition-none';
const OPTION_ON = 'border-accent bg-accent/10';
const OPTION_OFF = 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]';

const STAGE: Record<Mode, string> = { compare: 'משווים', error: 'בודקים את הטעות', practice: 'מתרגלים' };

// stage 1
const C_HEADING = 'גשר אחד, קואורדינטות בשני דאטומים';
const C_DO = 'עברו בין A ל־B ובדקו מה משתנה: המספרים או המקום בשטח?';
const C_SWITCH = 'הדאטום שבו מתארים את הגשר';
const C_CHANGED = 'המספרים השתנו, הגשר לא זז';
const C_TO_B = 'המפה מציגה עכשיו את רשת B. הגשר נשאר במקומו, ולכן נקרא בה במספרים אחרים.';
const C_TO_A = 'המפה מציגה שוב את רשת A, והגשר נקרא בה במספרים המקוריים. המקום עצמו לא השתנה.';
const C_NEXT = 'מה קורה בלי המרה?';
// stage 2
const E_HEADING = 'אותם מספרים נקראים בדאטום אחר';
const E_DO = 'העתיקו את מספרי המקור למפת היעד בלי המרה ובדקו היכן יופיע הסימון.';
const E_SENT = 'העותק שנשלח למפה';
const E_READ = 'המפה קוראת כ־B';
const E_COPY = 'העתקת המספרים ללא המרה';
const E_RELABEL = 'שינוי הכיתוב בלבד';
const E_RELABEL_HELP = 'רק האות בכותרת העותק משתנה';
const E_UNLABEL = 'ביטול שינוי הכיתוב';
const E_UNLABEL_HELP = 'חזרה לעותק שלפני הניסוי';
const E_CONVERT = 'המרת המספרים מ־A ל־B';
const E_CONVERT_HELP = 'E ו־N מחושבים מחדש לדאטום B';
const E_STEP: Record<Exclude<ErrorPhase, 'ready'>, string> = {
  raw: 'העתקה ללא המרה',
  relabeled: 'שינוי הכיתוב בלבד',
  converting: 'המרה A→B',
  converted: 'המרה A→B',
};
const E_MOVING = 'המחשת המעבר';
const E_MATCH = 'הסימון תואם למיקום הגשר';
const E_FIXED = 'ההמרה חישבה את המספרים מחדש, כך שבדאטום B הם מתארים את אותו גשר. השתנו המספרים, לא המקום.';
const E_LABELLED_LEAD = 'הכיתוב השתנה, הסימון לא זז';
const E_LABELLED = 'המספרים עדיין של A, והמפה ממשיכה לקרוא אותם כ־B. שינוי הכיתוב אינו המרה.';
const E_RESET = 'התחלה מחדש';
const E_NEXT = 'נסו על נתונים נוספים';
// stage 3
const P_DO = 'איזה צמד מספרים צריך לשלוח למפת היעד כדי לשמור על אותו מקום?';
const P_MATCH = 'האם הדאטומים תואמים?';
const P_MATCH_YES = 'כן, אותו דאטום';
const P_MATCH_NO = 'לא, דאטומים שונים';
const P_ACTION = 'מה עושים עם המספרים?';
const P_ACTIONS: Record<Action, string> = { keep: 'העתקה ללא המרה', relabel: 'שינוי הכיתוב בלבד', AtoB: 'המרה A→B', BtoA: 'המרה B→A' };
const P_SEND = 'אילו מספרים נשלחים למפה?';
const P_SEND_WAIT = 'יופיעו אחרי שתבחרו פעולה.';
const P_RULE = 'כלל ההמחשה בלבד, לא שיטת המרה כללית:';
const P_CHECK = 'בדיקת הנתונים';
const P_VERDICT: Record<Diagnosis['verdict'], string> = {
  right: 'נכון',
  identify: 'הטעות בזיהוי הדאטומים',
  action: 'הטעות בבחירת הפעולה',
  calc: 'הטעות בחישוב',
};
const P_SUMMARY =
  'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.';
// map
const M_REAL = 'המקום האמיתי';
const M_FOUND = 'הסימון שהתקבל';
const M_DISTANCE = 'הפער ביניהם';
const ON_GROUND: Record<PlaceId, string> = { bridge: 'הגשר', junction: 'הצומת' };
const SOURCE = 'נתוני המקור';
const TARGET = 'מפת היעד';

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
      <div className="surface-elevated p-6 lg:px-8 lg:pt-8" style={MAP_COL}>
        <h3 className={H3}>הדמיה: מה קורה כשהדאטום לא תואם?</h3>
        <p className={LEAD}>
          <strong className="text-fg">כדי לפרש מספרי קואורדינטות, צריך לדעת באיזו מערכת ייחוס ובאיזה דאטום הם נכתבו.</strong>{' '}
          במערכת מישורית, כמו מזרח וצפון במטרים, נדרשים גם ההיטל והפרמטרים שלו (על ההיטל – בחלק הבא).{' '}
          מפות ממקורות שונים עשויות להשתמש בדאטומים שונים: החלפת שם הדאטום אינה ממירה את המספרים, והמרה מתאימה מחשבת אותם מחדש, כך שיתארו את אותו מקום.{' '}
          בהדגמה נשווה שני ייצוגים של אותו גשר, נראה מה קורה כשמעבירים מספרים בלי המרה, ונתרגל בחירת נתונים למפת יעד.{' '}
          A ו־B הם דאטומים בדיוניים; ההבדל ביניהם מוצג כאן כהזזה קבועה לצורך ההמחשה בלבד.
        </p>

        <StageTabs mode={s.mode} uid={uid} onSelect={(mode) => dispatch({ type: 'setMode', mode })} />

        <div
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${s.mode}`}
          data-stage={s.mode}
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--map-col)] lg:gap-8"
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
  if (s.mode === 'compare') return s.compare.switched ? `${C_CHANGED}. ${s.compare.datum === 'B' ? C_TO_B : C_TO_A}` : '';
  if (s.mode === 'error') {
    switch (s.error.phase) {
      case 'raw':
        return `${E_RAW_LEAD}. ${E_RAW}`;
      case 'relabeled':
        return `${E_LABELLED_LEAD}. ${E_LABELLED}`;
      case 'converted':
        return `${E_MATCH}. ${E_FIXED}`;
      default:
        return '';
    }
  }
  const p = s.practice;
  if (p.summary) return P_SUMMARY;
  const d = checkedDiagnosis(p);
  return d ? `${P_VERDICT[d.verdict]}. ${explain(CASES[p.index], p.answer, d)}` : '';
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
            <StepNumber n={i + 1} on={on} />
            <span className="min-w-0 flex-1 font-display text-base font-bold leading-tight text-fg">{STAGE[m]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The stages' and the practice steps' number: one badge, on (orange) or off (sand). */
function StepNumber({ n, on, small }: { n: number; on?: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-xl font-display text-sm font-bold transition-colors duration-200 motion-reduce:transition-none',
        small ? 'size-7 rounded-lg' : 'size-8',
        on ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
      )}
    >
      <L>{n}</L>
    </span>
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
  const other: Datum = datum === 'A' ? 'B' : 'A';
  const switchId = `${uid}-switch`;
  const was = numbersOf('bridge', other);
  const now = numbersOf('bridge', datum);
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
          <Row key={d} on={d === datum} label="מספרי הגשר" tag={d} value={<L>{formatEN(numbersOf('bridge', d))}</L>} />
        ))}
      </div>

      {/* what the switch changed, and what it did not — only after a switch */}
      <FeedbackSlot className="mt-4" room={ROOM.compare}>
        {s.compare.switched && (
          <Feedback
            tone="info"
            after={
              <Compare
                cells={[
                  { name: 'E', value: <L>{`${was.e} → ${now.e}`}</L> },
                  { name: 'N', value: <L>{`${was.n} → ${now.n}`}</L> },
                  { name: 'הגשר', value: 'לא זז' },
                ]}
              />
            }
          >
            <p className={LABEL}>{C_CHANGED}</p>
            <p className={cn(BODY, 'mt-1')}>{datum === 'B' ? C_TO_B : C_TO_A}</p>
          </Feedback>
        )}
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
const E_RAW_LEAD = `הסימון שהתקבל רחוק ${GAP_BEFORE} מטר מהגשר`;
const E_RAW = 'מספרי A נקראו כאילו נמדדו ב־B. הגשר לא זז; רק הסימון במפה. נסו לתקן בשתי הדרכים.';

function ErrorPanel({ s, act }: { s: ActivityState; act: Act }) {
  const phase = s.error.phase;
  const moving = phase === 'converting';
  const sent = sentCopy(phase);
  const relabeled = phase === 'relabeled';
  const flashLabel = useFlash(s.run, relabeled);
  const flashNumbers = useFlash(s.run, phase === 'converted');

  return (
    <>
      <StageHeading>{E_HEADING}</StageHeading>
      <p className={cn(BODY, 'mt-1.5')}>{E_DO}</p>

      {/* the data's way: the source (kept, in A) → what was done → the copy sent → the map that reads it as B */}
      <div className="mt-4" data-flow="">
        <Row label={SOURCE} tag={ERROR_SOURCE.datum} value={<L>{formatEN(ERROR_SOURCE.numbers)}</L>} />
        <Flow text={phase === 'ready' ? null : E_STEP[phase]} strong />
        <div
          data-sent=""
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border px-3 py-1.5',
            sent ? 'border-transparent bg-bg-accent/60' : 'border-dashed border-border bg-bg-elevated',
          )}
        >
          <span className="flex min-h-6 items-center gap-2">
            <span className={LABEL}>{E_SENT}</span>
            {sent && !moving && <DatumTag d={sent.label} flash={flashLabel} copy />}
          </span>
          {/* no output numbers while the marker is still on its way */}
          <span
            className={cn(
              NUMBERS,
              'rounded-md px-1 transition-shadow duration-300 motion-reduce:transition-none',
              flashLabel && 'ring-2 ring-border-strong',
              flashNumbers && 'ring-2 ring-accent',
            )}
          >
            {moving ? (
              <span className="font-sans font-normal text-fg-muted">{E_MOVING}</span>
            ) : sent ? (
              <L>{formatEN(sent.numbers)}</L>
            ) : (
              <span className="font-sans font-normal text-fg-muted">—</span>
            )}
          </span>
        </div>
        <Flow text={sent ? E_READ : null} />
        <Row label={TARGET} tag={ERROR_MAP} />
      </div>

      {/* the actions, then their feedback right under them */}
      {phase === 'ready' ? (
        <div className={cn('mt-4', ACTION_ROW)}>
          <Button variant="primary" size="md" className="w-full px-4" data-focus="copy" onClick={() => act({ type: 'copyRaw' }, 'experiment')}>
            {E_COPY}
          </Button>
        </div>
      ) : (
        <div className={cn('mt-4 grid grid-cols-2 gap-2', ACTION_ROW)}>
          <Experiment
            label={relabeled ? E_UNLABEL : E_RELABEL}
            help={relabeled ? E_UNLABEL_HELP : E_RELABEL_HELP}
            focusKey="experiment"
            on={relabeled}
            onClick={() => act({ type: 'toggleLabel' })}
          />
          <Experiment label={E_CONVERT} help={E_CONVERT_HELP} on={moving || phase === 'converted'} inactive={moving} onClick={() => act({ type: 'convert' })} />
        </div>
      )}

      <FeedbackSlot className="mt-3" room={ROOM.error}>
        {phase === 'raw' && (
          <Feedback tone="info">
            <p className={LABEL}>{E_RAW_LEAD}</p>
            <p className={cn(BODY, 'mt-1')}>{E_RAW}</p>
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
            <p className={LABEL}>{E_LABELLED_LEAD}</p>
            <p className={cn(BODY, 'mt-1')}>{E_LABELLED}</p>
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
        {phase !== 'ready' && <ResetButton onClick={() => act({ type: 'resetError' }, 'copy')} />}
        <NextButton onClick={() => act({ type: 'setMode', mode: 'practice' }, 'heading')}>{E_NEXT}</NextButton>
      </Footer>
    </>
  );
}

/**
 * An experiment: a direct action that says what it changes before it is used, marked while its
 * result is on the map. While it cannot act (the conversion's own motion) it says so with
 * aria-disabled and keeps focus, instead of dropping it.
 */
function Experiment({
  label,
  help,
  on,
  onClick,
  inactive,
  focusKey,
}: {
  label: string;
  help: string;
  on: boolean;
  onClick: () => void;
  inactive?: boolean;
  focusKey?: FocusKey;
}) {
  const helpId = useId();
  return (
    <button
      type="button"
      onClick={inactive ? undefined : onClick}
      aria-label={label}
      aria-describedby={helpId}
      aria-disabled={inactive || undefined}
      data-focus={focusKey}
      className={cn(
        OPTION,
        'min-h-12 px-2.5 py-2 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'aria-disabled:cursor-default aria-disabled:opacity-60',
        on ? OPTION_ON : OPTION_OFF,
      )}
    >
      <span className="block font-display text-[15px] font-bold leading-tight text-fg">{isolateArrow(label)}</span>
      <span id={helpId} className="mt-1 block text-[15px] leading-snug text-fg-muted">
        {isolateArrow(help)}
      </span>
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

/* stage 3 — two cases, each decided in three steps before the map shows the result */

/** The explanation of a verdict: which step went wrong, what it did to the numbers, and the gap it made. */
function explain(c: PracticeCase, x: PracticeAnswer, d: Diagnosis): string {
  const place = PLACES[c.place].name;
  const gap = Math.round(d.gap);
  const away = gap > 0 ? ` הסימון נפל ${gap} מטר מ${place}.` : '';
  switch (d.verdict) {
    case 'right':
      return c.right;
    case 'identify':
      return datumsMatch(c)
        ? `גם נתוני המקור וגם מפת היעד בדאטום ${c.source}: הדאטומים תואמים, ואין מה להמיר.${away}`
        : `נתוני המקור בדאטום ${c.source} ומפת היעד בדאטום ${c.target}: הדאטומים שונים, ולכן צריך להמיר.${away}`;
    case 'action': {
      const a = x.action!;
      if (datumsMatch(c)) return `הדאטומים תואמים, ולכן אין מה להמיר. ההמרה הזיזה את הסימון ${gap} מטר מ${place}.`;
      if (a === 'keep') return `המספרים נשלחו בלי המרה, ומפת היעד קראה את מספרי ${c.source} כאילו הם ב־${c.target}.${away}`;
      if (a === 'relabel') return `שינוי הכיתוב ל־${c.target} לא שינה את המספרים, ולכן המפה עדיין קוראת אותם במקום אחר.${away}`;
      const dir = directionOf(a);
      return `הכיוון הפוך: הנתונים ב־${c.source} ומפת היעד ב־${c.target}, ולכן ממירים ${c.source}→${c.target}. המרה ${dir.from}→${dir.to} הרחיקה את הסימון ל־${gap} מטר מ${place}.`;
    }
    case 'calc':
      return d.calc === 'swapped'
        ? `הכיוון נכון, אבל ההזזות התחלפו: בהמחשה E משתנה ב־${SHIFT.e} ו־N ב־${SHIFT.n}.${away}`
        : `הכיוון נכון, אבל רק E הומר. בהמחשה גם N משתנה, ב־${SHIFT.n}.${away}`;
  }
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
        <CaseRecap />
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
  const x = p.answer;
  const d = checkedDiagnosis(p);
  const last = p.index === CASES.length - 1;
  const sent = sentOf(c, x);
  const canCheck = !p.checked && sent !== null;
  const started = x.match !== null || x.action !== null;
  const pairs = calcOptions(c, x.action);
  const name = (step: string) => `${uid}-${c.id}-${step}`;
  return (
    <>
      {/* the case and its question: one block, where focus lands on a new case */}
      <div tabIndex={-1} data-focus="heading" className="outline-none">
        <p className={cn(LABEL, 'mb-1')}>
          מקרה <L>{p.index + 1}</L> מתוך <L>{CASES.length}</L> · {place.name}
        </p>
        <h4 className={HEADING}>{P_DO}</h4>
      </div>

      {/* the case's data on one line: the source at the start (right), the target map after it */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Row label={SOURCE} tag={c.source} value={<L>{formatEN(caseSource(c))}</L>} />
        <Row label={TARGET} tag={c.target} />
      </div>

      {/* step 1: identify */}
      <Step n={1} label={P_MATCH} data="match">
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <Choice key={String(v)} name={name('match')} value={v ? 'same' : 'different'} on={x.match === v} onChange={() => act({ type: 'setMatch', match: v })}>
              <span className="font-display text-[15px] font-bold leading-tight text-fg">{v ? P_MATCH_YES : P_MATCH_NO}</span>
            </Choice>
          ))}
        </div>
      </Step>

      {/* step 2: the action */}
      <Step n={2} label={P_ACTION} data="action">
        {/* one row, one line per label */}
        <div className={cn('grid gap-2', c.actions.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {c.actions.map((a) => (
            <Choice key={a} name={name('action')} value={a} on={x.action === a} onChange={() => act({ type: 'setAction', action: a })}>
              <span className="font-display text-[15px] font-bold leading-tight text-fg">{isolateArrow(P_ACTIONS[a])}</span>
            </Choice>
          ))}
        </div>
      </Step>

      {/* step 3: the numbers the action sends — chosen only for a conversion */}
      <Step n={3} label={P_SEND} data="send">
        <div className={SEND_ROOM}>
          {x.action === null ? (
            <p className={cn(BODY, 'text-fg-muted')}>{P_SEND_WAIT}</p>
          ) : !isConversion(x.action) ? (
            <Row label="העותק שנשלח" tag={x.action === 'relabel' ? c.target : c.source} value={<><L>{formatEN(caseSource(c))}</L> <span className="font-sans font-normal text-fg-muted">(ללא שינוי)</span></>} />
          ) : (
            <>
              <Rule action={x.action} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {pairs.map((o, i) => (
                  <Choice key={`${x.action}-${i}`} name={name('calc')} value={String(i)} on={x.calc === i} onChange={() => act({ type: 'setCalc', option: i })}>
                    {/* one line, as every pair in the activity */}
                    <span dir="ltr" className={cn(NUMBERS, 'whitespace-nowrap')}>
                      {formatEN(o)}
                    </span>
                  </Choice>
                ))}
              </div>
            </>
          )}
        </div>
      </Step>

      <PrimaryAction className="mt-3 w-full" inactive={!canCheck} onClick={() => act({ type: 'check' })}>
        {P_CHECK}
      </PrimaryAction>

      <FeedbackSlot className="mt-3" room={ROOM.practice}>
        {d && (
          <Feedback tone={d.verdict === 'right' ? 'right' : 'wrong'}>
            <p className={LABEL} data-verdict={d.verdict}>
              {P_VERDICT[d.verdict]}
            </p>
            <p className={cn(BODY, 'mt-1')}>{isolateArrow(explain(c, x, d))}</p>
          </Feedback>
        )}
      </FeedbackSlot>

      <Footer>
        {p.index > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => act({ type: 'goCase', index: p.index - 1 }, 'heading')}>
            <Icon name="arrow-right" size={16} strokeWidth={2} />
            למקרה הקודם
          </Button>
        ) : null}
        {started && <ResetButton onClick={() => act({ type: 'resetCase' }, 'heading')} />}
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
 * The summary's recap: per case, the place, the source's and the target map's datums, the right action and the
 * numbers it sends — the marks the summary map shows on both places. Only after both cases are solved.
 */
function CaseRecap() {
  return (
    <ul className="mt-3 space-y-2" data-recap="">
      {CASES.map((c, i) => (
        <li key={c.id} className={cn(INSET, 'px-3 py-2.5')}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className={LABEL}>
              מקרה <L>{i + 1}</L> · {PLACES[c.place].name}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-2">
                <span className={BODY}>{SOURCE}</span>
                <DatumTag d={c.source} />
              </span>
              <span className="flex items-center gap-2">
                <span className={BODY}>{TARGET}</span>
                <DatumTag d={c.target} />
              </span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
            <span className={BODY}>{isolateArrow(P_ACTIONS[rightAction(c)])}</span>
            <span className={NUMBERS}>
              <L>{formatEN(convert(caseSource(c), c.source, c.target))}</L>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A practice step: its number, its question, and its choices (a radio group). */
function Step({ n, label, data, children }: { n: number; label: string; data: string; children: ReactNode }) {
  return (
    <fieldset className="mt-3 min-w-0" data-step={data}>
      <legend className="mb-2 p-0">
        <span className="flex items-center gap-2">
          <StepNumber n={n} small />
          <span className={LABEL}>{label}</span>
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

/** One choice of a practice step: a native radio (arrows, Space) inside a bordered option. */
function Choice({ name, value, on, onChange, children }: { name: string; value: string; on: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={cn(
        OPTION,
        'flex min-h-11 cursor-pointer items-center gap-2 px-2.5 py-2',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2',
        on ? OPTION_ON : OPTION_OFF,
      )}
    >
      <input type="radio" name={name} value={value} checked={on} onChange={onChange} className="sr-only" />
      <RadioDot on={on} />
      {children}
    </label>
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

/**
 * The schematic rule of the chosen conversion, as task data: scoped to this illustration, the formula
 * left to right with its axes named. Never shown as a general way to convert between datums.
 */
function Rule({ action }: { action: 'AtoB' | 'BtoA' }) {
  const { from, to } = directionOf(action);
  const sign = from === 'A' ? '−' : '+';
  return (
    <div className={cn(INSET, 'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2')} data-rule="">
      <span className="text-base leading-relaxed text-fg-muted">{P_RULE}</span>
      <span dir="ltr" className={NUMBERS}>{`${from}→${to}: E ${sign} ${SHIFT.e}, N ${sign} ${SHIFT.n}`}</span>
    </div>
  );
}

/* ─────────────────── shared panel parts ─────────────────── */

/**
 * The name of a datum wherever one is given — the source, a copy's label, the target map, the map's
 * own title — in one shape. `copy` marks the label of the copy sent (the label experiment changes it).
 */
function DatumTag({ d, flash, copy }: { d: Datum; flash?: boolean; copy?: boolean }) {
  return (
    <span
      data-datum-tag={d}
      data-copy-label={copy ? d : undefined}
      className={cn(
        'inline-grid h-6 shrink-0 place-items-center whitespace-nowrap rounded-md border border-border-strong bg-bg-elevated px-1.5 font-display text-sm font-bold text-black',
        'transition-shadow duration-300 motion-reduce:transition-none',
        flash && 'ring-2 ring-accent ring-offset-1',
      )}
    >
      <span>
        דאטום <L>{d}</L>
      </span>
    </span>
  );
}

/** A data row: a borderless inset with its datum tag; the active datum's row is tinted. */
function Row({ label, tag, value, on }: { label: string; tag?: Datum; value?: ReactNode; on?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl px-3 py-1.5 transition-colors duration-200 ease-snap motion-reduce:transition-none',
        on ? 'bg-accent/15' : 'bg-bg-accent/60',
      )}
    >
      <span className="flex min-h-6 items-center gap-2">
        <span className={LABEL}>{label}</span>
        {tag && <DatumTag d={tag} />}
      </span>
      {value !== undefined && <span className={NUMBERS}>{value}</span>}
    </div>
  );
}

/** A short link between two rows of the data's way: a line down and what happened on it (`strong`: the learner's action). */
function Flow({ text, strong }: { text: string | null; strong?: boolean }) {
  return (
    <div className="flex h-6 items-center gap-2 ps-5" aria-hidden={!text} data-flow-step={text ?? ''}>
      <svg width="12" height="22" viewBox="0 0 12 26" aria-hidden className={cn('shrink-0', text ? 'text-fg-muted' : 'text-border')}>
        <path d="M6 1v20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M2 17l4 5 4-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text && <span className={strong ? LABEL : BODY}>{isolateArrow(text)}</span>}
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

/**
 * Where a stage's feedback appears. With `room`, it keeps that stage's tallest feedback's height (ROOM), so showing,
 * changing or clearing feedback never moves the way on; without it, it takes only what it holds.
 */
function FeedbackSlot({ children, className, room }: { children: ReactNode; className?: string; room?: string }) {
  return <div className={cn(room ?? 'empty:hidden', className)}>{children}</div>;
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

/**
 * The way on, right after the stage's feedback room: never pushed down to line up with the map. It holds a md
 * button's height (pt-4 + 48 + the rule) while empty, without its rule, so the card keeps its height when a button appears.
 */
function Footer({ children }: { children: ReactNode }) {
  return (
    <div
      data-activity-navigation=""
      className="mt-4 flex min-h-[4.0625rem] flex-wrap items-center gap-3 border-t border-border-subtle pt-4 empty:border-transparent"
    >
      {children}
    </div>
  );
}

function NextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button variant="secondary" size="md" className="min-w-0 flex-1 px-4" onClick={onClick}>
      {children}
      <Icon name="arrow-left" size={16} strokeWidth={2} />
    </Button>
  );
}

/** Starts the stage (or the case on screen) again; quieter than the way on. */
function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Icon name="refresh" size={16} strokeWidth={2} />
      {E_RESET}
    </Button>
  );
}

/* ─────────────────── the map ─────────────────── */

type MapLabel = { text?: string; numbers?: EN };
type MapScene = {
  /** The map's title and the datum it uses. */
  title: string;
  datum: Datum;
  /** 0 = A's grid lines, 1 = B's (fractions while sliding). */
  gridT: number;
  targets: { at: EN; label: MapLabel }[];
  results: { at: EN; label: MapLabel; moving?: boolean }[];
  /** The gap in metres, or null while the marker is still on its way. */
  measure: { from: EN; to: EN; gap: number | null } | null;
  legend: ('target' | 'result' | 'measure')[];
  /** The legend's line is kept while it is empty (stages 2–3), so the map's column does not grow when it appears. */
  legendRoom: boolean;
};

function sceneOf(s: ActivityState, gridDatum: Datum, gridT: number, travelP: number): MapScene {
  const bridge = PLACES.bridge.ground;
  if (s.mode === 'compare') {
    return {
      title: 'המפה',
      datum: gridDatum,
      gridT,
      targets: [{ at: bridge, label: { text: ON_GROUND.bridge, numbers: numbersOf('bridge', s.compare.datum) } }],
      results: [],
      measure: null,
      legend: [],
      legendRoom: false,
    };
  }
  if (s.mode === 'error') {
    const phase: ErrorPhase = s.error.phase;
    const sent = sentCopy(phase);
    const moving = phase === 'converting';
    const at = moving ? lerpEN(ERROR_BEFORE, bridge, travelP) : errorResult(phase);
    const results = at && sent ? [{ at, moving, label: moving ? { text: E_MOVING } : { numbers: sent.numbers } }] : [];
    const gap = at ? distance(at, bridge) : 0;
    return {
      title: TARGET,
      datum: gridDatum,
      gridT,
      targets: [{ at: bridge, label: { text: ON_GROUND.bridge } }],
      results,
      // the gap is read only at rest: no number for a marker still on its way
      measure: at && gap >= 1 ? { from: bridge, to: at, gap: moving ? null : gap } : null,
      legend: results.length ? ['target', 'result', ...(at && gap >= 1 ? (['measure'] as const) : [])] : [],
      legendRoom: true,
    };
  }
  const p = s.practice;
  if (p.summary) {
    return {
      title: TARGET,
      datum: gridDatum,
      gridT,
      targets: CASES.map((c) => ({ at: caseTarget(c), label: { text: ON_GROUND[c.place] } })),
      // each case's right numbers, read by its target map
      results: CASES.map((c) => ({ at: interpret(convert(caseSource(c), c.source, c.target), c.target), label: {} })),
      measure: null,
      legend: ['target', 'result'],
      legendRoom: true,
    };
  }
  const c = CASES[p.index];
  const target = caseTarget(c);
  // the decisions reach the map only once checked
  const d = checkedDiagnosis(p);
  return {
    title: TARGET,
    datum: gridDatum,
    gridT,
    targets: [{ at: target, label: { text: ON_GROUND[c.place] } }],
    results: d ? [{ at: d.at, label: { numbers: d.sent.numbers } }] : [],
    measure: d && d.gap >= 1 ? { from: target, to: d.at, gap: d.gap } : null,
    legend: d ? ['target', 'result', ...(d.gap >= 1 ? (['measure'] as const) : [])] : [],
    legendRoom: true,
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
  const [k, setK] = useState(MAP_PX.w / MAP_BOX_W);
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
  // the dimension line, sized on screen; too close for one, the legend leaves it out too
  const line = scene.measure ? measurePath(scene.measure.from, scene.measure.to, k) : null;
  // a line too short to carry its number clear of the ring and the diamond: the number goes next to the diamond instead
  const besideMark = !line || (!!scene.measure && screenLength(scene.measure.from, scene.measure.to, k) < LABEL_ON_LINE);

  return (
    // the map at the top of its column, its legend right under it; neither column is stretched to the other
    <figure className="m-0 min-w-0" data-map={load}>
      <div>
        {/* the map's own title: which datum it reads every pair in — above its start (right) edge */}
        <div className="me-12 mb-2 flex min-h-7 items-center gap-2" data-map-title={scene.datum}>
          <span className={LABEL}>{scene.title}</span>
          <DatumTag d={scene.datum} />
        </div>

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

            <MapLayers scene={scene} eLines={eLines} nLines={nLines} line={line} besideMark={besideMark} />

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
      </div>

      {/* under the map itself: its start (right) edge, clear of the N margin on the left */}
      {scene.legend.length > 0 ? (
        <figcaption className="me-12 mt-1 min-h-5">
          <Legend scene={scene} line={line !== null} />
        </figcaption>
      ) : (
        scene.legendRoom && <div aria-hidden className="mt-1 h-5" />
      )}
    </figure>
  );
}

const CHIP = 'inline-flex flex-col items-center rounded-lg border border-border bg-bg-elevated/95 px-2 py-0.5';

/** The live layers, in picture fractions from the one transform. Never mirrored. */
function MapLayers({
  scene,
  eLines,
  nLines,
  line,
  besideMark,
}: {
  scene: MapScene;
  eLines: { v: number; x: number }[];
  nLines: { v: number; y: number }[];
  /** The dimension line's path, or null when the two markers are too close for one. */
  line: string | null;
  /** The gap's number next to the diamond rather than beside the line (no line, or one too short for it). */
  besideMark: boolean;
}) {
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
        {line && <Measure d={line} />}
      </svg>

      {scene.measure && scene.measure.gap !== null && (
        <MeasureLabel from={scene.measure.from} to={scene.measure.to} gap={scene.measure.gap} beside={besideMark} />
      )}

      {scene.targets.map((t, i) => (
        <Marker key={`t${i}`} kind="target" at={t.at} />
      ))}
      {scene.results.map((r, i) => (
        <Marker key={`r${i}`} kind="result" at={r.at} />
      ))}

      {/* labels: the result's on the side away from the target, the target's on the other side */}
      {scene.targets.map((t, i) => {
        if (!t.label.text) return null;
        const r = scene.results[i];
        const below = !r || distance(r.at, t.at) < 1 || r.at.n >= t.at.n;
        return <Chip key={`tl${i}`} at={t.at} side={below ? 'below' : 'above'} label={t.label} kind="target" />;
      })}
      {result && (result.label.text || result.label.numbers) && target && (
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

/**
 * The dimension line's path between the two markers (picture px), from clear of the target's ring to
 * clear of the diamond — or null when they are too close on screen for a line (k: picture px per
 * screen px).
 */
function measurePath(from: EN, to: EN, k: number): string | null {
  const a = toPicture(from);
  const b = toPicture(to);
  const ax = a.x * MAP_PX.w;
  const ay = a.y * MAP_PX.h;
  const bx = b.x * MAP_PX.w;
  const by = b.y * MAP_PX.h;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const s0 = 23 * k;
  const s1 = Math.max(s0, len - 14 * k);
  if (s1 - s0 < 4 * k) return null;
  const p0 = { x: ax + ux * s0, y: ay + uy * s0 };
  const p1 = { x: ax + ux * s1, y: ay + uy * s1 };
  const cap = 7 * k;
  const nx = -uy * cap;
  const ny = ux * cap;
  return `M${p0.x} ${p0.y}L${p1.x} ${p1.y}M${p0.x + nx} ${p0.y + ny}L${p0.x - nx} ${p0.y - ny}M${p1.x + nx} ${p1.y + ny}L${p1.x - nx} ${p1.y - ny}`;
}

/** Shortest line, in screen px, whose number sits beside its middle clear of the target's ring and the diamond. */
const LABEL_ON_LINE = 120;

/** The distance between two ground positions on screen (k: picture px per screen px). */
function screenLength(from: EN, to: EN, k: number): number {
  const a = toPicture(from);
  const b = toPicture(to);
  return Math.hypot((b.x - a.x) * MAP_PX.w, (b.y - a.y) * MAP_PX.h) / k;
}

/** A dimension line between the two markers: square ends, no arrowhead (a distance, not a route). */
function Measure({ d }: { d: string }) {
  return (
    <g data-measure="" fill="none" strokeLinecap="round">
      <path d={d} className="stroke-bg-elevated" strokeWidth={4.5} vectorEffect="non-scaling-stroke" opacity={0.95} />
      <path d={d} className="stroke-fg" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/**
 * The gap in metres: beside the line, on its eastern side, clear of the labels above and below the
 * markers — or, when the markers are too close for a line or the line too short for its number
 * (`beside`), next to the diamond, on the side away from the target, clear of its ring.
 */
function MeasureLabel({ from, to, gap, beside }: { from: EN; to: EN; gap: number; beside: boolean }) {
  const a = toPicture(from);
  const b = toPicture(to);
  let style: CSSProperties;
  if (beside) {
    const east = b.x >= a.x;
    style = { left: pct(b.x), top: pct(b.y), transform: east ? 'translate(18px, -50%)' : 'translate(calc(-100% - 18px), -50%)' };
  } else {
    const dx = (b.x - a.x) * MAP_PX.w;
    const dy = (b.y - a.y) * MAP_PX.h;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx < 0) {
      nx = -nx;
      ny = -ny;
    }
    style = {
      left: pct((a.x + b.x) / 2),
      top: pct((a.y + b.y) / 2),
      transform: `translate(calc(-50% + ${(nx * 30).toFixed(1)}px), calc(-50% + ${(ny * 30).toFixed(1)}px))`,
    };
  }
  return (
    <span data-measure-label="" className="absolute" style={style}>
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
        {label.text && <span className="font-display text-sm font-bold leading-snug text-black whitespace-nowrap">{label.text}</span>}
        {label.numbers && (
          <span className={cn('font-display text-sm font-bold leading-snug tabular-nums whitespace-nowrap', label.text ? 'text-fg-muted' : 'text-black')}>
            <L>{formatEN(label.numbers)}</L>
          </span>
        )}
      </span>
    </span>
  );
}

/** The map's legend: T6 (lessons-02-06 spec), each item with the symbol drawn on the map. */
function Legend({ scene, line }: { scene: MapScene; line: boolean }) {
  const item = 'flex items-center gap-1.5';
  const text = 'text-sm leading-snug text-fg-muted';
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" data-legend="">
      {scene.legend.includes('target') && (
        <li className={item}>
          {/* the map's ring and ticks, redrawn at legend size (a scaled-down ring would lose its stroke) */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="stroke-fg" fill="none" strokeWidth={1.5} strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M9 1v2.5M9 14.5V17M1 9h2.5M14.5 9H17" />
          </svg>
          <span className={text}>{M_REAL}</span>
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
      {scene.legend.includes('measure') && line && (
        <li className={item}>
          <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden className="stroke-fg" fill="none" strokeWidth={1.75} strokeLinecap="round">
            <path d="M2 6h18M2 2v8M20 2v8" />
          </svg>
          <span className={text}>{M_DISTANCE}</span>
        </li>
      )}
    </ul>
  );
}
