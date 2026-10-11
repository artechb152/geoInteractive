'use client';
import { useId, useRef, type Dispatch, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from './Ltr';
import { FIRST_STATION, STATIONS, type StationId } from './measurementMission.data';
import { nextStation, orthometric, signed, solvedSet, workedSum, type MissionAction, type MissionState, type Verdict } from './measurementMission';
import { C_ELL, C_GEO } from './referenceBodiesStyle';

const STATION_BUTTONS: readonly StationId[] = ['A', 'B', 'C'];

/**
 * The measurement task (the "גליות וגובה" view): pick a station, read h and N,
 * work out H with the lesson's own formula (passed in as `formula`), check it.
 * State lives in the scene (missionReducer) so switching views keeps it;
 * answers, attempts and solutions are kept per station.
 */
export function MeasurementPanel({
  state,
  dispatch,
  formula,
  inputRef,
  compact = false,
}: {
  state: MissionState;
  dispatch: Dispatch<MissionAction>;
  /** The scene's existing H = h − N block. */
  formula: ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** A wide enough column (short screens): the answer field and both buttons share one row. */
  compact?: boolean;
}) {
  const uid = useId();
  const inputId = `${uid}-h`;
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
    <div className="space-y-3">
      <StationRow id={id} solved={solved} onSelect={(s) => dispatch({ type: 'select', id: s })} />

      {/* the station's two readings side by side */}
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border-subtle bg-bg-accent/50 px-3 py-1.5">
          <dt className="text-sm font-display font-semibold text-fg-muted">
            גובה אליפסואידלי{' '}
            <span className="font-bold" style={{ color: C_ELL }}>
              <L>h</L>
            </span>
          </dt>
          <dd className="font-display text-xl font-bold tabular-nums text-fg">
            <L>{h}</L> מ׳
          </dd>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-accent/50 px-3 py-1.5">
          <dt className="text-sm font-display font-semibold text-fg-muted">
            גליות{' '}
            <span className="font-bold" style={{ color: C_GEO }}>
              <L>N</L>
            </span>
          </dt>
          <dd className="font-display text-xl font-bold tabular-nums text-fg">
            <L>{signed(N)}</L> מ׳
          </dd>
        </div>
      </dl>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'check' });
        }}
        className="space-y-2.5 border-t border-border-subtle pt-3"
      >
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="text-base font-display font-bold text-black">
            מהו הגובה מעל פני הים?
          </label>
          {formula}
        </div>
        <div className={cn(compact && 'flex gap-2')}>
        <div
          className={cn(
            'flex h-12 overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 focus-within:ring-2 focus-within:ring-accent/50',
            compact && 'min-w-0 flex-1',
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
            aria-describedby={feedbackId}
            className="min-w-0 flex-1 bg-transparent px-4 text-end font-display text-xl font-bold tabular-nums text-fg outline-none"
          />
          <span aria-hidden className="grid w-12 shrink-0 place-items-center border-s border-border bg-bg-accent font-display font-bold text-fg-muted">
            מ׳
          </span>
        </div>
        <div className={cn('flex gap-2', compact ? 'shrink-0' : 'mt-2.5')}>
          <Button type="submit" variant="primary" size="md" className={compact ? undefined : 'flex-1'} disabled={cur.solved}>
            בדיקת תשובה
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="px-4"
            disabled={!anyProgress}
            onClick={() => {
              dispatch({ type: 'reset', first: FIRST_STATION });
              focusInput();
            }}
          >
            איפוס המשימה
          </Button>
        </div>
        </div>
      </form>

      {/* One steady slot for feedback: sized for the usual two lines, it grows only for C's extra line. */}
      <div id={feedbackId} aria-live="polite" className="min-h-[92px]">
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
  );
}

/** The station picker: the HTML alternative to the pins on the landscape (task and surface views). */
export function StationRow({ id, solved, onSelect }: { id: StationId; solved: ReadonlySet<StationId>; onSelect: (id: StationId) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h5 className="text-base font-display font-bold text-black">תחנת מדידה {id}</h5>
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
            {onNext && (
              <Button variant="secondary" size="sm" className="shrink-0" onClick={onNext}>
                לתחנה הבאה
              </Button>
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
          {complete && (
            <p className="pt-0.5 font-display text-base font-bold text-black">
              <L>3/3</L> – כל הגבהים חושבו.
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
