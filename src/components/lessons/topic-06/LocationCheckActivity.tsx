'use client';

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, CircleDashed, Info, ListTree, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CANDIDATES, READINGS, type CandidateId } from './locationCheckScenario';
import { formatBearing, formatMetres } from './locationCheckGeometry';
import { INITIAL_STATE, directionCheck, distanceCheck, reducer, view, type Evaluation, type State } from './locationCheckState';
import { createLookStore } from './locationCheckViewStore';
import { LocationCheckMap, MAP_ASPECT, MapLegend } from './LocationCheckMap';
import { LocationCheckObservation, MEASURED_MARKER, OBSERVATION_ASPECT, type TapeMarker } from './LocationCheckObservation';

/**
 * "באיזה אזור אתם נמצאים?" — a decision between two location hypotheses
 * without GPS. The learner chooses area 1 or area 2 (on the map or with the
 * buttons); the map then shows that area's bearing to the road split and its
 * distance from the last known position, to compare with the two field
 * measurements. The check uses exactly those two computations
 * (locationCheckState.evaluate): the distance fits both areas, the direction
 * tells them apart. The groves are landmarks only.
 *
 * Layout (RTL, laid out at the lesson fit's 1344 px, ≤ 760 px tall in every
 * state): title, instruction and field readings on top; then one row — the
 * 3D observation (inline start, right), the map, and at the inline end a
 * narrow control column: in reading order the area choice, the check and the
 * reset on top, the map tools (legend, fullscreen) at its foot, level with
 * the map's bottom edge; under the row, the full-width result of the last
 * check, as tall as its tallest content.
 */

/** Width of the control column at the inline end of the views row (px). */
const CONTROLS_W = 176;

/** A numeric range kept left-to-right inside Hebrew text (U+2066 … U+2069 isolate). */
const ltr = (s: string) => `⁦${s}⁩`;
const RANGE = ltr(`${READINGS.distanceMinM}–${READINGS.distanceMaxM}`);

const CANDIDATE_LABEL = Object.fromEntries(CANDIDATES.map((c) => [c.id, c.label])) as Record<CandidateId, string>;

/** What the map shows for the chosen area, for screen readers (the same computed values). */
function areaValuesText(id: CandidateId) {
  const area = CANDIDATE_LABEL[id];
  return `במפה, מ${area}: הכיוון להתפצלות הדרך ${formatBearing(directionCheck(id).predictedDeg)}, והמרחק מהמיקום האחרון ${formatMetres(distanceCheck(id).predictedM)}.`;
}

export function LocationCheckActivity() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [lookStore] = useState(createLookStore);
  const { result, solved } = view(state);
  const mapView = useFullscreen<HTMLDivElement>();
  const sel = state.selections;
  const uid = useId();

  // Dev-only handle for scripts/qa/shot-location-check.mjs (set a look, read the state).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __lc?: unknown };
    w.__lc = { look: lookStore, state };
    return () => {
      delete w.__lc;
    };
  }, [lookStore, state]);

  const reset = () => {
    dispatch({ type: 'reset' });
    lookStore.reset();
  };

  const checked = !!result && result.kind !== 'missing';

  const markers: TapeMarker[] = [MEASURED_MARKER];
  if (result && result.kind !== 'missing' && !result.direction.consistent) {
    markers.push({ bearingDeg: result.direction.predictedDeg, label: `לפי המפה מ${CANDIDATE_LABEL[result.candidateId]}`, tone: 'predicted' });
  }

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="location-check">
      {/* Task */}
      <div className="min-w-0">
        <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">באיזה אזור אתם נמצאים?</h3>
        <p className="mt-1.5 text-base leading-relaxed text-black">כשקליטת אותות הלוויין חסומה או משובשת, אי אפשר להסתמך על GPS, וקובעים את המיקום לפי המפה, המצפן וסימני השטח. בחרו אזור והשוו את הכיוון והמרחק במפה למדידות מהשטח.</p>
        <p className="mt-1.5 text-base leading-relaxed text-black" data-field-readings>
          נמדד בשטח: כיוון להתפצלות הדרך <bdi dir="ltr" className="font-bold">{formatBearing(READINGS.forkBearingDeg)}</bdi>
          {' · '}מרחק מהמיקום האחרון <strong>כ־{READINGS.distanceM} מ׳</strong>.
        </p>
      </div>

      {/* The two views at one height (column widths follow their aspects), then the control column. */}
      <div
        className="mt-4 grid gap-3"
        style={{ gridTemplateColumns: `minmax(0, ${OBSERVATION_ASPECT}fr) minmax(0, ${MAP_ASPECT}fr) ${CONTROLS_W}px` }}
      >
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border/70" data-panel="observation">
            <LocationCheckObservation lookStore={lookStore} markers={markers} />
          </div>
        </div>
        <div className="min-w-0">
          <div
            ref={mapView.ref}
            className={cn('overflow-hidden rounded-xl border border-border/70 bg-white', mapView.fullscreen && 'flex items-center justify-center p-4')}
            data-panel="map"
          >
            <LocationCheckMap
              selectedCandidate={sel.candidateId}
              checked={checked}
              solved={solved}
              lookStore={lookStore}
              onSelectCandidate={(id) => dispatch({ type: 'selectCandidate', id })}
              className="block h-auto max-h-full w-full"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          {/* Decision, in reading order: choose an area → check it → start over. */}
          <div className="flex flex-col gap-4" data-decision>
            <ChoiceRow
              id={`${uid}-area`}
              title="בחרו אזור"
              options={CANDIDATES.map((c) => ({ id: c.id, label: c.label }))}
              value={sel.candidateId}
              onChange={(id) => dispatch({ type: 'selectCandidate', id })}
            />
            <div className="flex flex-col gap-1">
              <Button variant="primary" size="md" className="w-full" onClick={() => dispatch({ type: 'check' })}>
                בדקו את הבחירה
              </Button>
              <Button variant="ghost" size="md" className="w-full" onClick={reset} title="איפוס הפעילות">
                <RotateCcw className="size-4" aria-hidden />
                איפוס
              </Button>
            </div>
          </div>
          {/* Map tools at the foot of the column, level with the map's bottom edge. */}
          <MapTools
            className="mt-auto"
            area={!!sel.candidateId}
            checked={checked}
            solved={solved}
            fullscreen={mapView.fullscreen}
            onToggleFullscreen={mapView.toggle}
          />
        </div>
      </div>

      {/* The result, under the views row — it never moves it. */}
      <Feedback model={feedbackOf(state)} attempt={state.attempts} />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

/** A small help disclosure: a trigger button and a note next to it; Esc or a click outside closes it. */
function InfoPopover({
  label,
  children,
  placement = 'below',
  trigger,
  className,
}: {
  label: string;
  children: ReactNode;
  placement?: 'below' | 'above';
  trigger?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md text-black hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {trigger ?? <Info className="size-4" aria-hidden />}
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={cn(
            'absolute end-0 z-30 w-80 rounded-xl border border-border bg-bg-elevated p-3 text-start font-sans text-base font-normal leading-snug text-black shadow-elevated',
            placement === 'below' ? 'top-full mt-2' : 'bottom-full mb-2',
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}

/** A labelled two-option radio group (roving tab stop; arrow keys move and select). */
function ChoiceRow<T extends string>({
  id,
  title,
  options,
  value,
  onChange,
}: {
  id: string;
  title: string;
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIdx = Math.max(0, options.findIndex((o) => o.id === value));
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let nextIdx = -1;
    // RTL: the next option sits to the left.
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nextIdx = (i + 1) % options.length;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nextIdx = (i + options.length - 1) % options.length;
    if (nextIdx < 0) return;
    e.preventDefault();
    onChange(options[nextIdx].id);
    refs.current[nextIdx]?.focus();
  };
  return (
    <div className="flex flex-col gap-2" data-choice="area">
      <span id={id} className="whitespace-nowrap font-display text-base font-bold text-black">
        {title}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-2 gap-2">
        {options.map((o, i) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === focusIdx ? 0 : -1}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'relative flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl px-3.5 font-display text-base leading-none text-black transition-colors duration-200 ease-snap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                // Selected = thicker border, tint and bold — not colour alone, and no ✓: only the feedback after a check says right or wrong.
                on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-fg-dim/60 bg-bg-elevated font-semibold hover:border-accent/60 hover:bg-accent/[0.04]',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Fullscreen for one element: its ref, whether it is the fullscreen element, and a toggle. */
function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else ref.current?.requestFullscreen?.();
  };
  return { ref, fullscreen, toggle };
}

/** The map's legend and fullscreen buttons; the legend opens above them, over the map. */
function MapTools({
  area,
  checked,
  solved,
  fullscreen,
  onToggleFullscreen,
  className,
}: {
  area: boolean;
  checked: boolean;
  solved: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)} data-map-tools>
      <InfoPopover
        label="מקרא המפה"
        placement="above"
        className="flex-1 [&>button]:w-full"
        trigger={
          <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold">
            <ListTree className="size-4" aria-hidden />
            מקרא
          </span>
        }
      >
        <MapLegend area={area} result={checked} solved={solved} />
      </InfoPopover>
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המפה במסך מלא'}
        title={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המפה במסך מלא'}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-paper-bright/70 text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- feedback

/**
 * What the result area shows. A verdict only while the chosen area is the one
 * that was checked; an area not checked yet — chosen for the first time, or
 * changed after a check — is named as unchecked. A check made with no area
 * judged nothing (view() reports it as not stale), so choosing an area after
 * it is a first choice.
 */
type FeedbackModel =
  | { kind: 'empty' }
  | { kind: 'missing' }
  | { kind: 'pending'; area: CandidateId; previous: CandidateId | null }
  | Exclude<Evaluation, { kind: 'missing' }>;

function feedbackOf(state: State): FeedbackModel {
  const { result } = view(state);
  if (result) return result.kind === 'missing' ? { kind: 'missing' } : result;
  const area = state.selections.candidateId;
  if (!area) return { kind: 'empty' };
  const last = state.attempt?.result;
  return { kind: 'pending', area, previous: last && last.kind !== 'missing' ? last.candidateId : null };
}

/** A bearing, left-to-right in Hebrew text; same figures as the map's value plates. */
const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="tabular-nums">
    {formatBearing(v)}
  </bdi>
);

const TOLERANCE = ltr(`${READINGS.forkBearingToleranceDeg}°`);

/** One measurement: the checked area's value on the map beside the field value, and why they match or not. */
type Row = { ok: boolean; label: string; map: ReactNode; field: ReactNode; why: ReactNode };

/**
 * The verdict for the checked area. Every number comes from the evaluation
 * (computed from the coordinates). A wrong check says which measurement to
 * match again, never which area does.
 */
function verdictOf(r: Exclude<Evaluation, { kind: 'missing' }>): { title: string; rows: Row[]; next: ReactNode } {
  const area = CANDIDATE_LABEL[r.candidateId];
  const d = r.direction;
  const dist = r.distance;
  const fitsBoth = dist.fitsCandidates === CANDIDATES.length;
  const rows: Row[] = [
    {
      ok: d.consistent,
      label: 'כיוון להתפצלות הדרך',
      map: <Deg v={d.predictedDeg} />,
      field: <Deg v={d.observedDeg} />,
      why: (
        <>
          פער {ltr(`${Math.round(d.differenceDeg)}°`)}, מותר עד {TOLERANCE}
        </>
      ),
    },
    {
      ok: dist.consistent,
      label: 'מרחק מהמיקום האחרון',
      map: formatMetres(dist.predictedM),
      field: `כ־${READINGS.distanceM} מ׳`,
      why: `${dist.consistent ? 'בטווח' : 'מחוץ לטווח'} ${RANGE} מ׳`,
    },
  ];
  if (r.kind === 'supported') {
    return {
      title: `${area} מתאים לשתי המדידות`,
      rows,
      // The measurements support an area, not a point in it; the map's point is the scenario's viewpoint.
      next: `${fitsBoth ? 'המרחק מתאים לשני האזורים, ולכן הכיוון הוא שמכריע.' : 'גם הכיוון וגם המרחק מתאימים.'} המדידות תומכות באזור, לא בנקודה מדויקת בתוכו. במצב אמיתי ממשיכים לבדוק את ההתאמה לאורך הדרך.`,
    };
  }
  const next =
    !d.consistent && dist.consistent ? (
      <>
        {fitsBoth && 'המרחק מתאים לשני האזורים ואינו מכריע ביניהם. '}בדקו במפה מאיזה אזור הכיוון להתפצלות הדרך קרוב ל־<Deg v={d.observedDeg} />.
      </>
    ) : d.consistent ? (
      `בדקו במפה איזה אזור נמצא כ־${READINGS.distanceM} מ׳ מהמיקום האחרון.`
    ) : (
      <>
        בדקו במפה איזה אזור נותן גם כיוון קרוב ל־<Deg v={d.observedDeg} /> להתפצלות הדרך וגם מרחק בטווח {RANGE} מ׳.
      </>
    );
  return { title: `${area} אינו מתאים למדידות`, rows, next };
}

/** Fixed-height result area (as tall as its tallest content, a verdict): what was checked, each measurement on the map beside the field, and what to do next. */
function Feedback({ model, attempt }: { model: FeedbackModel; attempt: number }) {
  let kind: string = model.kind;
  let key = `${model.kind}-${attempt}`;
  let tone: string;
  let body: ReactNode;
  if (model.kind === 'empty') {
    tone = 'border-dashed border-border bg-bg-accent/50';
    body = null;
  } else if (model.kind === 'missing') {
    tone = 'border-border bg-bg-accent';
    body = (
      <>
        <FeedbackTitle icon={<Info className="size-5" aria-hidden />}>עדיין לא נבחר אזור</FeedbackTitle>
        <p className="mt-1 text-base leading-snug text-black">בחרו אזור במפה או בכפתורי האזור, ואז לחצו ״בדקו את הבחירה״.</p>
      </>
    );
  } else if (model.kind === 'pending') {
    // Nothing here may read as a verdict on the new choice.
    const area = CANDIDATE_LABEL[model.area];
    kind = model.previous ? 'stale' : 'pending';
    key = `${kind}-${model.area}`;
    tone = 'border-dashed border-border-strong bg-bg-accent';
    body = (
      <>
        <FeedbackTitle icon={<CircleDashed className="size-5" aria-hidden />}>
          {model.previous ? `הבחירה השתנתה — ${area} עדיין לא נבדק` : `${area} נבחר — עדיין לא נבדק`}
        </FeedbackTitle>
        <p className="mt-1 text-base leading-snug text-black">
          {model.previous
            ? `התוצאה הקודמת הייתה של ${CANDIDATE_LABEL[model.previous]}. לחצו ״בדקו את הבחירה״ כדי לבדוק את ${area}.`
            : 'לחצו ״בדקו את הבחירה״ כדי להשוות אותו למדידות מהשטח.'}
          <span className="sr-only"> {areaValuesText(model.area)}</span>
        </p>
      </>
    );
  } else {
    const ok = model.kind === 'supported';
    const v = verdictOf(model);
    tone = ok ? 'border-brand bg-brand/10' : 'border-accent-hot/60 bg-bg-accent';
    body = (
      <>
        <FeedbackTitle icon={ok ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}>{v.title}</FeedbackTitle>
        <ul className="mt-1.5 divide-y divide-border/70" aria-label="השוואה למדידות מהשטח">
          {v.rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[13.5rem_8rem_12rem_minmax(0,1fr)] items-center gap-x-4 py-1 text-base leading-snug text-black" data-row={row.ok ? 'match' : 'mismatch'}>
              <span className="flex items-center gap-2">
                <StateIcon ok={row.ok} />
                {row.label}
              </span>
              <span>
                במפה <b className="font-bold">{row.map}</b>
              </span>
              <span>
                נמדד בשטח <b className="font-bold">{row.field}</b>
              </span>
              <span>
                <b className="font-bold">{row.ok ? 'מתאים' : 'אינו מתאים'}</b>: {row.why}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-base leading-snug text-black">{v.next}</p>
      </>
    );
  }
  return (
    // Fixed height = the tallest state, a verdict (title, two rows, one line of next steps: 117 px, plus padding and
    // border), so a result never lengthens the card or moves the controls. Announced once per check or choice.
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('mt-3 h-[144px] rounded-xl border px-4 py-3', tone)} data-feedback={kind}>
      <div key={key}>{body}</div>
    </div>
  );
}

/** Match / no match by shape as well as colour; the row's own words say it in text. */
function StateIcon({ ok }: { ok: boolean }) {
  return ok ? <Check className="size-4 shrink-0 text-brand-dark" strokeWidth={3} aria-hidden /> : <X className="size-4 shrink-0 text-accent-hot" strokeWidth={3} aria-hidden />;
}

function FeedbackTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-display text-base font-bold leading-snug text-black">
      {icon}
      {children}
    </div>
  );
}
