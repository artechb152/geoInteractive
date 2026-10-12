'use client';
import { useId, useRef, type Dispatch, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from './Ltr';
import { FIRST_STATION, STATIONS, type StationId } from './measurementMission.data';
import { nextStation, orthometric, signed, solvedSet, workedSum, type MissionAction, type MissionState, type Verdict } from './measurementMission';
import { C_ELL, C_GEO, C_H } from './referenceBodiesStyle';

const STATION_BUTTONS: readonly StationId[] = ['A', 'B', 'C'];

/**
 * The measurement task (the "גליות וגובה" view), as one strip under the two
 * figures, in two grid columns that follow them: at inline-start (right, under
 * the model) the picked station's h and N, each beside what it means; at
 * inline-end (left, under the section) the question with H's meaning and the
 * lesson's own formula (passed in as `formula`), the answer field and its two
 * actions, and the feedback right under the field. Reading and focus run the
 * same way: the readings, then the question, the field, its actions, the
 * feedback (and its "next station").
 * This strip is the only place the numbers are shown before a check (the
 * station is picked in the model's caption, on the model or on the section).
 * State lives in the scene (missionReducer) so switching views keeps it;
 * answers, attempts and solutions are kept per station.
 */
export function MeasurementPanel({
  state,
  dispatch,
  formula,
  inputRef,
}: {
  state: MissionState;
  dispatch: Dispatch<MissionAction>;
  /** The scene's existing H = h − N block. */
  formula: ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const uid = useId();
  const inputId = `${uid}-h`;
  const defId = `${uid}-def`;
  const feedbackId = `${uid}-feedback`;
  const id = state.station;
  const cur = state.byStation[id];
  const { h, N } = STATIONS[id];
  const solved = solvedSet(state);
  const next = cur.solved ? nextStation(id, solved) : null;
  const complete = solved.size === STATION_BUTTONS.length;
  const anyProgress = solved.size > 0 || STATION_BUTTONS.some((s) => state.byStation[s].attempts > 0);
  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());
  const wrong = cur.verdict !== null && cur.verdict !== 'correct';

  return (
    <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* inline-start (right, under the model): the station's two readings, each with what it means */}
      <dl className="grid min-w-0 content-start gap-2" data-task="readings">
        <div className="rounded-xl border border-border-subtle bg-bg-accent/50 px-3 py-1.5">
          <dt className="text-sm leading-5 text-fg-muted">
            <strong className="font-display text-fg">
              גובה אליפסואידלי (<span style={{ color: C_ELL }}><L>h</L></span>)
            </strong>{' '}
            – הגובה מעל האליפסואיד.
          </dt>
          <dd className="font-display text-xl font-bold tabular-nums text-fg">
            <L>{h}</L> מ׳
          </dd>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-accent/50 px-3 py-1.5">
          <dt className="text-sm leading-5 text-fg-muted">
            <strong className="font-display text-fg">
              גליות (<span style={{ color: C_GEO }}><L>N</L></span>)
            </strong>{' '}
            – הפרש הגובה בין הגיאואיד לאליפסואיד.
          </dt>
          <dd className="font-display text-xl font-bold tabular-nums text-fg">
            <L>{signed(N)}</L> מ׳
          </dd>
        </div>
      </dl>

      {/* inline-end (left, under the section): the question, the formula, the answer, its actions, and the
          feedback right under the field */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'check' });
        }}
        className="min-w-0 space-y-2"
        data-task="answer"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <label htmlFor={inputId} className="text-base font-display font-bold text-black">
              מהו הגובה מעל פני הים?
            </label>
            <p id={defId} className="text-sm leading-5 text-fg-muted">
              <strong className="font-display text-fg">
                גובה אורתומטרי (<span style={{ color: C_H }}><L>H</L></span>)
              </strong>{' '}
              – הגובה מעל פני הים (הגיאואיד).
            </p>
          </div>
          {formula}
        </div>
        <div className="flex gap-2">
          <div
            className={cn(
              'flex h-12 min-w-0 flex-1 overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 focus-within:ring-2 focus-within:ring-accent/50',
              wrong ? 'border-accent' : 'border-border focus-within:border-accent',
            )}
          >
            <input
              ref={inputRef}
              id={inputId}
              dir="ltr"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              readOnly={cur.solved}
              value={cur.draft}
              onChange={(e) => dispatch({ type: 'edit', value: e.target.value })}
              aria-invalid={wrong || undefined}
              aria-describedby={`${defId} ${feedbackId}`}
              className="min-w-0 flex-1 bg-transparent px-4 text-end font-display text-xl font-bold tabular-nums text-fg outline-none"
            />
            <span aria-hidden className="grid w-12 shrink-0 place-items-center border-s border-border bg-bg-accent font-display font-bold text-fg-muted">
              מ׳
            </span>
          </div>
          <Button type="submit" variant="primary" size="md" className="shrink-0" disabled={cur.solved}>
            בדיקת תשובה
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="shrink-0 px-4"
            disabled={!anyProgress}
            onClick={() => {
              dispatch({ type: 'reset', first: FIRST_STATION });
              focusInput();
            }}
          >
            איפוס המשימה
          </Button>
        </div>

        {/* the feedback, right under the answer: its slot holds the tallest one (C right: the sum and N = 0), so no
            check moves the field or the page; until the first check it says what to compare */}
        <div className="min-h-[6.75rem]" data-task="feedback">
          {!cur.verdict && <p className="text-base leading-relaxed text-fg-muted">השוו בין חצי הגובה בחתך לבין נתוני התחנה שנבחרה.</p>}
          <div id={feedbackId} aria-live="polite">
            {cur.verdict && (
              <Feedback
                id={id}
                verdict={cur.verdict}
                complete={complete}
                onNext={
                  cur.solved && next
                    ? () => {
                        dispatch({ type: 'select', id: next });
                        focusInput();
                      }
                    : null
                }
              />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/** The station picker: the HTML alternative to the pins on the landscape (task and surface views). */
export function StationRow({
  id,
  solved,
  onSelect,
  compact = false,
}: {
  id: StationId;
  solved: ReadonlySet<StationId>;
  onSelect: (id: StationId) => void;
  /** The buttons alone, where the caption has no room for "תחנת מדידה X" (the pressed button names it). */
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {!compact && <h5 className="text-base font-display font-bold text-black">תחנת מדידה {id}</h5>}
      <div role="group" aria-label="בחירת תחנה" className="flex gap-1.5">
        {STATION_BUTTONS.map((s) => {
          const active = s === id;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              aria-label={`תחנה ${s}${solved.has(s) ? ' (נפתרה)' : ''}`}
              onClick={() => onSelect(s)}
              className={cn(
                'relative grid size-9 place-items-center rounded-xl border font-display text-sm font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              {s}
              {solved.has(s) && (
                <span aria-hidden className="absolute -top-1.5 -end-1.5 grid size-4 place-items-center rounded-full bg-brand-dark text-white">
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Feedback({ id, verdict, complete, onNext }: { id: StationId; verdict: Verdict; complete: boolean; onNext: (() => void) | null }) {
  const { N } = STATIONS[id];
  if (verdict === 'correct') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/[0.08] p-3">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
          <Icon name="check" size={18} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg font-bold leading-snug text-black">
              נכון. <L>H = {orthometric(id)}</L> מ׳
            </p>
            {onNext ? (
              <Button variant="secondary" size="sm" className="shrink-0" onClick={onNext}>
                לתחנה הבאה
              </Button>
            ) : (
              // all three done: said where "next" would stand, so the last answer is no taller than the others
              complete && (
                <p className="shrink-0 font-display text-base font-bold text-black">
                  <L>3/3</L> – כל הגבהים חושבו.
                </p>
              )
            )}
          </div>
          <p className="text-base leading-relaxed text-black">
            <L>{workedSum(id)}</L>
          </p>
          {N === 0 && (
            <p className="text-base leading-relaxed text-black">
              המשטחים נפגשים: <L>N = 0</L>, ולכן <L>H = h</L>.
            </p>
          )}
        </div>
      </div>
    );
  }
  const hint: ReactNode = {
    empty: 'הזינו ערך לגובה מעל פני הים, ואז בדקו את התשובה.',
    invalid: 'הזינו מספר בלבד. יחידת המידה (מ׳) כבר מופיעה לצד השדה.',
    'gave-h': (
      <>
        הערך שהזנתם הוא <L>h</L>, הגובה מעל האליפסואיד. כדי לחשב את הגובה מעל פני הים (<L>H</L>), חסרו ממנו את הגליות (<L>N</L>).
      </>
    ),
    'added-n': (
      <>
        בדקו את סימן הפעולה: בנוסחה מחסירים את <L>N</L> מ־<L>h</L>.{N < 0 && <> בתחנה זו <L>N</L> שלילי, ולכן חיסורו מגדיל את הגובה.</>}
      </>
    ),
    wrong: (
      <>
        עדיין לא. חשבו לפי <L>H = h − N</L>: חסרו את הגליות מהגובה האליפסואידלי ונסו שוב.
      </>
    ),
  }[verdict];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/60 bg-bg-elevated p-3">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-accent text-accent">
        <Icon name="x" size={16} strokeWidth={2.5} />
      </span>
      <p className="min-w-0 text-base leading-relaxed text-black">{hint}</p>
    </div>
  );
}
