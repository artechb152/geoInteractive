'use client';

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { BatteryLow, Check, CircleHelp, Compass, Footprints, Info, ListTree, Maximize2, Minimize2, Mountain, RadioTower, RotateCcw, SatelliteDish, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { CANDIDATES, READINGS, type CandidateId } from './locationCheckScenario';
import { formatBearing, formatMetres } from './locationCheckGeometry';
import { INITIAL_STATE, directionCheck, distanceCheck, reducer, view, type Evaluation, type GpsReasonId } from './locationCheckState';
import { createLookStore, type LookStore } from './locationCheckViewStore';
import { LocationCheckMap, MAP_ASPECT, MapLegend } from './LocationCheckMap';
import { LocationCheckObservation, MEASURED_MARKER, OBSERVATION_ASPECT, roadSplitLook, type TapeMarker } from './LocationCheckObservation';

/**
 * "באיזה אזור אתם נמצאים?" — a decision between two location hypotheses
 * without GPS. The learner chooses area 1 or area 2 (on the map or with the
 * buttons); the map then shows that area's bearing to the road split and its
 * distance from the last known position, to compare with the two field
 * measurements. The check uses exactly those two computations
 * (locationCheckState.evaluate): the distance fits both areas, the direction
 * tells them apart. The groves are landmarks only.
 *
 * Desktop layout (RTL), one screen at 1440 × 1122: title, instruction and the
 * two measurements on top; the 3D observation (inline start, right) and the
 * map (left) side by side at one height; the area choice, the check and a
 * fixed-height feedback box at the bottom. Why GPS may be unavailable lives in
 * a help dialog.
 */

/** A numeric range kept left-to-right inside Hebrew text (U+2066 … U+2069 isolate). */
const ltr = (s: string) => `⁦${s}⁩`;
const RANGE = ltr(`${READINGS.distanceMinM}–${READINGS.distanceMaxM}`);

const CANDIDATE_LABEL = Object.fromEntries(CANDIDATES.map((c) => [c.id, c.label])) as Record<CandidateId, string>;

const GPS_REASONS: { id: GpsReasonId; title: string; icon: ReactNode; text: string }[] = [
  {
    id: 'blocked',
    title: 'חסימת קליטה',
    icon: <Mountain className="size-5" aria-hidden />,
    text: 'מבנים ושטח גבוה עלולים לחסום את אותות הלוויינים. המכשיר עלול להציג מיקום לא מדויק או לא להציג מיקום כלל.',
  },
  {
    id: 'interference',
    title: 'הפרעת אותות',
    icon: <RadioTower className="size-5" aria-hidden />,
    text: 'שידורי הפרעה עלולים למנוע מהמכשיר לקלוט את אותות הלוויינים ולקבוע מיקום.',
  },
  {
    id: 'battery',
    title: 'סוללה ריקה',
    icon: <BatteryLow className="size-5" aria-hidden />,
    text: 'בלי סוללה המכשיר אינו פועל. אפשר להמשיך להיעזר במפת נייר ובמצפן.',
  },
];

/** What the map shows for the chosen area, for screen readers (the same computed values). */
function areaValuesText(id: CandidateId) {
  const area = CANDIDATE_LABEL[id];
  return `במפה, מ${area}: הכיוון להתפצלות הדרך ${formatBearing(directionCheck(id).predictedDeg)}, והמרחק מהמיקום האחרון ${formatMetres(distanceCheck(id).predictedM)}.`;
}

export function LocationCheckActivity() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [lookStore] = useState(createLookStore);
  const { stale, result, solved } = view(state);
  const sel = state.selections;
  const uid = useId();
  // The view can turn only when it is live 3D (not the static picture).
  const interactive = useSyncExternalStore(lookStore.subscribe, lookStore.getInteractive, () => false);
  const helpRef = useRef<HTMLDialogElement>(null);

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
    <div className="surface-elevated p-5 lg:p-6" data-activity="location-check">
      {/* Task */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="font-display text-2xl font-bold leading-tight text-black">באיזה אזור אתם נמצאים?</h3>
            <StatusChip tone="neutral" icon={<SatelliteDish className="size-3.5" aria-hidden />} className="text-black">
              GPS לא זמין
            </StatusChip>
          </div>
          <p className="mt-1.5 text-base leading-relaxed text-black">בחרו אזור והשוו את הכיוון והמרחק במפה למדידות מהשטח.</p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => helpRef.current?.showModal()}>
          <CircleHelp className="size-4" aria-hidden />
          למה אין GPS?
        </Button>
      </div>

      {/* The two measurements — fixed evidence, both always part of the check */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5" data-measurements>
        <Measurement
          icon={<Compass className="size-5" aria-hidden />}
          label="כיוון להתפצלות הדרך:"
          help="התפצלות הדרך היא המקום שבו הדרך מתחלקת לשני כיוונים. הכיוון אליה נמדד במצפן, ביחס לצפון הרשת במפה. סיבוב המבט אינו משנה את המדידה."
        >
          <bdi dir="ltr" className="font-mono tabular-nums">
            {formatBearing(READINGS.forkBearingDeg)}
          </bdi>
        </Measurement>
        <button
          type="button"
          onClick={() => lookStore.setTarget(roadSplitLook())}
          disabled={!interactive}
          className="rounded-md px-1 font-display text-base font-semibold text-black underline decoration-accent decoration-2 underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:no-underline disabled:opacity-45"
        >
          הראו את התפצלות הדרך
        </button>
        <span aria-hidden className="mx-1 h-6 w-px bg-border" />
        <Measurement
          icon={<Footprints className="size-5" aria-hidden />}
          label="מרחק מהמיקום האחרון:"
          help={`המרחק הוערך לפי ספירת צעדים. בבדיקה מתקבל טווח של ${RANGE} מ׳.`}
        >
          כ־
          <bdi dir="ltr" className="font-mono tabular-nums">
            {Math.round(READINGS.distanceM)}
          </bdi>{' '}
          מ׳
        </Measurement>
      </div>

      {/* The two views, one height: column widths follow their aspects. */}
      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `minmax(0, ${OBSERVATION_ASPECT}fr) minmax(0, ${MAP_ASPECT}fr)` }}>
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border/70" data-panel="observation">
            <LocationCheckObservation lookStore={lookStore} markers={markers} />
          </div>
        </div>
        <MapColumn
          selectedCandidate={sel.candidateId}
          checked={checked}
          solved={solved}
          lookStore={lookStore}
          onSelectCandidate={(id) => dispatch({ type: 'selectCandidate', id })}
        />
      </div>

      {/* Decision */}
      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-2.5">
          <ChoiceRow
            id={`${uid}-area`}
            title="בחרו אזור"
            options={CANDIDATES.map((c) => ({ id: c.id, label: c.label }))}
            value={sel.candidateId}
            onChange={(id) => dispatch({ type: 'selectCandidate', id })}
          />
          <p className="sr-only" aria-live="polite">
            {sel.candidateId ? areaValuesText(sel.candidateId) : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="md" className="flex-1" onClick={() => dispatch({ type: 'check' })}>
              בדקו את הבחירה
            </Button>
            <Button variant="ghost" size="md" onClick={reset} title="איפוס הפעילות">
              <RotateCcw className="size-4" aria-hidden />
              איפוס
            </Button>
          </div>
        </div>
        <Feedback result={result} stale={stale} attempt={state.attempts} />
      </div>

      <GpsHelpDialog dialogRef={helpRef} value={state.gpsReason} onChange={(id) => dispatch({ type: 'setGpsReason', id })} />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

/** A small help disclosure: a trigger button and a note next to it; Esc or a click outside closes it. */
function InfoPopover({ label, children, placement = 'below', trigger }: { label: string; children: ReactNode; placement?: 'below' | 'above'; trigger?: ReactNode }) {
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
    <span ref={ref} className="relative inline-flex">
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

function Measurement({ icon, label, help, children }: { icon: ReactNode; label: string; help: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-accent px-3 py-1.5 font-display text-base text-black">
      {icon}
      <span className="font-semibold">{label}</span>
      <span className="font-bold">{children}</span>
      <InfoPopover label={`הסבר: ${label.replace(':', '')}`}>{help}</InfoPopover>
    </div>
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-choice="area">
      <span id={id} className="whitespace-nowrap font-display text-base font-bold text-black">
        {title}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                // Selected = thicker border, tint, bold and a check mark — not colour alone.
                on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-fg-dim/60 bg-bg-elevated font-semibold hover:border-accent/60 hover:bg-accent/[0.04]',
              )}
            >
              {on && (
                <span aria-hidden className="absolute -top-2 end-2 flex size-4 items-center justify-center rounded-full bg-accent text-white">
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapColumn({
  selectedCandidate,
  checked,
  solved,
  lookStore,
  onSelectCandidate,
}: {
  selectedCandidate: CandidateId | null;
  checked: boolean;
  solved: boolean;
  lookStore: LookStore;
  onSelectCandidate: (id: CandidateId) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
  return (
    <div className="min-w-0">
      <div ref={ref} className={cn('overflow-hidden rounded-xl border border-border/70 bg-white', fullscreen && 'flex items-center justify-center p-4')} data-panel="map">
        <LocationCheckMap
          selectedCandidate={selectedCandidate}
          checked={checked}
          solved={solved}
          lookStore={lookStore}
          onSelectCandidate={onSelectCandidate}
          className="block h-auto max-h-full w-full"
        />
      </div>
      {/* Map tools, at the inline end under the map. */}
      <div className="mt-2.5 flex items-center justify-end gap-2" data-map-tools>
        <InfoPopover
          label="מקרא המפה"
          placement="above"
          trigger={
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold">
              <ListTree className="size-4" aria-hidden />
              מקרא
            </span>
          }
        >
          <MapLegend area={!!selectedCandidate} result={checked} solved={solved} />
        </InfoPopover>
        <button
          type="button"
          onClick={toggle}
          aria-label={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המפה במסך מלא'}
          title={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המפה במסך מלא'}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-paper-bright/70 text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- feedback

type Verdict = { title: string; lines: ReactNode[]; chips: { ok: boolean; text: string }[]; details: { ok: boolean; text: ReactNode }[] };

const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="font-mono tabular-nums">
    {formatBearing(v)}
  </bdi>
);

/** Why the chosen area fits the measurements or not. Every number comes from the evaluation (computed from the coordinates). */
function verdictOf(r: Exclude<Evaluation, { kind: 'missing' }>): Verdict {
  const area = CANDIDATE_LABEL[r.candidateId];
  const d = r.direction;
  const dist = r.distance;
  const metres = Math.round(dist.predictedM);
  const fitsBoth = dist.fitsCandidates === CANDIDATES.length;
  const chips = [
    { ok: d.consistent, text: d.consistent ? 'הכיוון מתאים' : 'הכיוון אינו מתאים' },
    { ok: dist.consistent, text: dist.consistent ? (fitsBoth ? 'המרחק מתאים לשני האזורים' : 'המרחק מתאים') : 'המרחק אינו מתאים' },
  ];
  const details = [
    {
      ok: d.consistent,
      text: (
        <>
          הכיוון מ{area} להתפצלות הדרך לפי המפה: <Deg v={d.predictedDeg} />. הכיוון שנמדד בשטח: <Deg v={d.observedDeg} /> (סטייה מותרת עד {ltr(`${READINGS.forkBearingToleranceDeg}°`)}).
        </>
      ),
    },
    {
      ok: dist.consistent,
      text: `המרחק מהמיקום האחרון ל${area} לפי המפה: ${metres} מ׳. המרחק שהוערך בשטח: כ־${READINGS.distanceM} מ׳ (טווח ${RANGE} מ׳).${fitsBoth ? ' שני האזורים באותו מרחק מהמיקום האחרון.' : ''}`,
    },
  ];
  if (r.kind === 'supported') {
    return {
      title: `${area} מתאים למדידות.`,
      lines: [
        <>
          הכיוון מ{area} להתפצלות הדרך הוא <Deg v={d.predictedDeg} />, כמו שנמדד בשטח.{' '}
          {fitsBoth ? 'המרחק מתאים לשני האזורים, ולכן הכיוון הוא שמכריע.' : 'גם המרחק מתאים.'}
        </>,
      ],
      chips,
      details,
    };
  }
  const outOfRange = `${metres} מ׳ — מחוץ לטווח ${RANGE} מ׳`;
  const line = !d.consistent ? (
    dist.consistent ? (
      <>
        {fitsBoth ? 'המרחק מתאים לשני האזורים' : 'המרחק מתאים'}, אבל הכיוון מ{area} להתפצלות הדרך הוא <Deg v={d.predictedDeg} /> ולא <Deg v={d.observedDeg} /> כפי שנמדד בשטח.
      </>
    ) : (
      <>
        הכיוון מ{area} להתפצלות הדרך הוא <Deg v={d.predictedDeg} /> ולא <Deg v={d.observedDeg} />, והמרחק מהמיקום האחרון הוא {outOfRange}.
      </>
    )
  ) : (
    `הכיוון מתאים, אבל המרחק מהמיקום האחרון ל${area} הוא ${outOfRange}.`
  );
  return { title: `${area} אינו מתאים למדידות.`, lines: [line], chips, details };
}

/** Fixed-height result area: the verdict and a short reason; the full reasoning on demand. */
function Feedback({ result, stale, attempt }: { result: Evaluation | null; stale: boolean; attempt: number }) {
  let tone = 'border-dashed border-border bg-bg-accent/50';
  let body: ReactNode = <p className="text-base leading-snug text-black">אחרי שתבחרו אזור ותשוו, לחצו ״בדקו את הבחירה״.</p>;
  let kind = 'empty';
  if (stale) {
    kind = 'stale';
    tone = 'border-dashed border-border-strong bg-bg-accent';
    body = <FeedbackTitle icon={<RotateCcw className="size-5" aria-hidden />}>הבחירה השתנתה — בדקו שוב</FeedbackTitle>;
  } else if (result?.kind === 'missing') {
    kind = 'missing';
    tone = 'border-border bg-bg-accent';
    body = <FeedbackTitle icon={<Info className="size-5" aria-hidden />}>בחרו אזור לפני הבדיקה.</FeedbackTitle>;
  } else if (result) {
    kind = result.kind;
    const v = verdictOf(result);
    tone = result.kind === 'supported' ? 'border-brand bg-brand/10' : 'border-accent-hot/60 bg-bg-accent';
    body = (
      <>
        <div className="flex items-start justify-between gap-2">
          <FeedbackTitle icon={result.kind === 'supported' ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}>{v.title}</FeedbackTitle>
          <InfoPopover
            label="פירוט הבדיקה"
            placement="above"
            trigger={<span className="inline-flex items-center gap-1 whitespace-nowrap font-display text-base font-semibold underline decoration-accent decoration-2 underline-offset-4">פירוט</span>}
          >
            <ul className="space-y-1.5">
              {v.details.map((row, i) => (
                <li key={i} className="flex gap-2">
                  <StateIcon ok={row.ok} />
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
          </InfoPopover>
        </div>
        <div className="mt-1 space-y-0.5 text-base leading-snug text-black">
          {v.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="סיכום הבדיקה">
          {v.chips.map((c) => (
            <li key={c.text} className="flex items-center gap-1 font-display text-base font-semibold text-black">
              <StateIcon ok={c.ok} />
              {c.text}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    // Fixed height: a verdict never lengthens the card or moves the views. Announced once per check.
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('h-[140px] rounded-xl border px-4 py-3', tone)} data-feedback={kind}>
      <div key={`${kind}-${attempt}`}>{body}</div>
    </div>
  );
}

function StateIcon({ ok }: { ok: boolean }) {
  return (
    <span className="mt-0.5 shrink-0">
      {ok ? <Check className="size-4 text-brand-dark" aria-hidden /> : <X className="size-4 text-accent-hot" aria-hidden />}
      <span className="sr-only">{ok ? 'מתאים:' : 'אינו מתאים:'}</span>
    </span>
  );
}

function FeedbackTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-display text-base font-bold leading-snug text-black">
      {icon}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- help

/** "למה אין GPS?" — background, not needed for the task: a closable modal dialog. */
function GpsHelpDialog({ dialogRef, value, onChange }: { dialogRef: React.RefObject<HTMLDialogElement | null>; value: GpsReasonId; onChange: (id: GpsReasonId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const active = GPS_REASONS.find((r) => r.id === value)!;
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (i + 1) % GPS_REASONS.length;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (i + GPS_REASONS.length - 1) % GPS_REASONS.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(GPS_REASONS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${uid}-title`}
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      className="w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-border bg-bg-elevated p-0 text-black shadow-elevated backdrop:bg-black/40"
      data-dialog="gps-help"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h4 id={`${uid}-title`} className="font-display text-xl font-bold text-black">
            למה אין GPS?
          </h4>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="סגירה"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-base leading-relaxed text-black">
          כש<strong>GPS לא זמין</strong>, נעזרים במפה ובמצפן. בחרו סיבה להסבר קצר.
        </p>
        <div role="radiogroup" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-text`} className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {GPS_REASONS.map((r, i) => {
            const on = r.id === value;
            return (
              <button
                key={r.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => onChange(r.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start font-display text-base font-bold text-black transition-colors duration-200 ease-snap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  on ? 'border-2 border-accent bg-accent/10' : 'border border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                {r.icon}
                {r.title}
              </button>
            );
          })}
        </div>
        <p id={`${uid}-text`} className="mt-3 text-base leading-relaxed text-black">
          {active.text}
        </p>
      </div>
    </dialog>
  );
}
