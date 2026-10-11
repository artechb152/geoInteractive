'use client';

/* ─────────── הדמיה: מה קורה כשהדאטום לא תואם? — משימת איתור ותיקון ───────────
   Replaces the slider demo (DatumShiftDemo) of CoordinatesScene. Brief:
   design/docs/datum-field-challenge-claude-prompt-2026-10-11.txt; the mockup
   (design/mockups/topic-02-datum-shift-2026-10-11/mockup-field-challenge.png)
   sets the composition only — colours, fonts and wording come from the site.

   One card: three steps across the top; the data and the decision at the
   inline start (visual right); the terrain at the inline end with the point
   picker under it; feedback in a band across the foot. The terrain is one
   Cycles render (terrain-base.webp); every marker, line and label over it is
   live HTML/SVG placed through datumFieldProjection.ts. The model and the task
   are pure (datumField.ts) and unit-tested. */

import { useEffect, useId, useReducer, useRef, useState, type Dispatch } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { FIRST_LANDMARK, LANDMARKS, LANDMARK_IDS, type LandmarkId } from './datumField.data';
import {
  fieldReducer, formatEN, gapAt, initialField, isConverted, isOpen, mapNumbers, readGap, restingT, stepStatuses,
  type Answer, type FieldAction, type FieldState, type StepStatus,
} from './datumField';
import { displayedPx, gapLine, northAt, requestedPx, TERRAIN_ASPECT } from './datumFieldProjection';
import { DATUM_FIELD_TERRAIN } from './datumFieldTerrain.data';

const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/datum-field-challenge`;
const TERRAIN_SRC = `${ASSETS}/terrain-base.webp`;
const THUMB_SRC: Record<LandmarkId, string> = {
  bridge: `${ASSETS}/thumb-bridge.webp`,
  junction: `${ASSETS}/thumb-junction.webp`,
  summit: `${ASSETS}/thumb-summit.webp`,
};
const FRAME = DATUM_FIELD_TERRAIN.image;

// The scene's own block heading and lead (CoordinatesScene H3 / LEAD), and the lesson-content tiers.
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const HEADING = 'font-display font-bold leading-tight text-black text-base md:text-lg';
const LABEL = 'text-base font-display font-bold text-black';
const BODY = 'text-base leading-relaxed text-black';

const STEPS = ['קבלו נקודה', 'בדקו את המיקום', 'תקנו את הטעות'] as const;
const ANSWERS: readonly { id: Answer; label: string }[] = [
  { id: 'label', label: 'שינוי התווית בלבד' },
  { id: 'convert', label: 'המרת הקואורדינטות' },
];
const FEEDBACK_WRONG = 'שינוי התווית בלבד אינו ממיר את הקואורדינטות.';
const FEEDBACK_DONE = 'ההמרה משנה את הקואורדינטות ושומרת על המיקום המבוקש.';
const HINT = 'השוו בין דאטום המקור לדאטום במפה.';
const TERRAIN_ALT = 'דגם שטח: גבעות סלע בהירות עם צמחייה דלילה, עמק ובו נחל צר, גשר מעל הנחל במרכז, צומת דרכי עפר משמאל ופסגה מימין.';

/** The displayed location's trip to the landmark once the numbers are converted. */
const TRAVEL_S = 1.1;
const EASE_SNAP = [0.22, 1, 0.36, 1] as const;
/** Below this gap (m) the distance chip would sit on the markers it measures. */
const CHIP_MIN_M = 14;
const NORTH = northAt(FIRST_LANDMARK);
const NORTH_DEG = (Math.atan2(NORTH.x, -NORTH.y) * 180) / Math.PI;

export function DatumFieldChallenge() {
  const [state, dispatch] = useReducer(fieldReducer, undefined, initialField);
  const reduce = !!useReducedMotion();
  const uid = useId();
  // progress of a conversion's motion (0 → 1), tagged with its run so an earlier run's progress
  // never shows; at rest the phase alone places the marker
  const [travel, setTravel] = useState({ run: -1, p: 0 });
  const t = state.phase === 'converting' ? (travel.run === state.run ? travel.p : 0) : restingT(state);
  const gap = gapAt(state.landmark, t);
  // the wording reads the resting gap: 60 m until the marker arrives, then 0
  const reading = readGap(gapAt(state.landmark, restingT(state)));

  useEffect(() => {
    if (state.phase !== 'converting') return;
    const run = state.run;
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
  }, [state.phase, state.run, reduce]);

  const announce = state.phase === 'wrong' ? FEEDBACK_WRONG : state.phase === 'done' ? `${FEEDBACK_DONE} ${reading.status}.` : '';

  return (
    <div className="my-10">
      <h3 className={H3}>הדמיה: מה קורה כשהדאטום לא תואם?</h3>
      <p className={LEAD}>
        <strong className="text-fg">לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה</strong> (על ההיטל – בחלק הבא).{' '}
        ההדמיה ממחישה זאת: בחרו נקודה, בחנו את הפער בין המיקום המבוקש למיקום המוצג ובחרו כיצד לתקן אותו.{' '}
        זוהי המחשה סכמטית: ערכי הסטייה נבחרים לצורך ההדגמה בלבד.
      </p>

      <div className="surface-elevated p-6 lg:p-8">
        <Steps statuses={stepStatuses(state)} />

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_2.4fr] lg:gap-10">
          {/* data and decision — inline-start (visual right) */}
          <Panel state={state} dispatch={dispatch} gap={gap} status={reading.status} uid={uid} />

          {/* the terrain and the point picker — inline-end (visual left) */}
          <div className="flex min-w-0 flex-col gap-3">
            <Terrain landmark={state.landmark} t={t} gap={gap} />
            <LandmarkPicker landmark={state.landmark} dispatch={dispatch} uid={uid} />
          </div>
        </div>

        <FeedbackBand state={state} consequence={reading.consequence} onReset={() => dispatch({ type: 'reset' })} />
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── steps ─────────────────── */

function Steps({ statuses }: { statuses: readonly StepStatus[] }) {
  return (
    <ol aria-label="שלבי המשימה" className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {STEPS.map((label, i) => {
        const st = statuses[i];
        return (
          <li key={label} aria-current={st === 'active' ? 'step' : undefined} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className={cn('h-px w-8 sm:w-12', statuses[i - 1] === 'done' ? 'bg-brand/50' : 'bg-border')} />}
            <span
              className={cn(
                'flex items-center gap-2 rounded-xl border py-1.5 pe-4 ps-1.5 transition-colors duration-200 ease-snap motion-reduce:transition-none',
                st === 'active' ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated',
              )}
            >
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full font-display text-sm font-bold transition-colors duration-200 ease-snap motion-reduce:transition-none',
                  st === 'done' ? 'bg-brand-dark text-bg-elevated' : st === 'active' ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                )}
              >
                {st === 'done' ? <Icon name="check" size={15} strokeWidth={2.5} /> : <L>{i + 1}</L>}
              </span>
              <span className={LABEL}>{label}</span>
              {st === 'done' && <span className="sr-only"> (הושלם)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────────── panel: data, gap, decision ─────────────────── */

function Panel({
  state,
  dispatch,
  gap,
  status,
  uid,
}: {
  state: FieldState;
  dispatch: Dispatch<FieldAction>;
  gap: number;
  status: string;
  uid: string;
}) {
  const id = state.landmark;
  const converted = isConverted(state);
  const open = isOpen(state);
  const hintId = `${uid}-hint`;
  const row = cn(
    'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border bg-bg-accent/50 px-3 py-2.5 transition-colors duration-200 ease-snap motion-reduce:transition-none',
    state.hint ? 'border-accent' : 'border-border-subtle',
  );
  const numbers = 'flex items-center gap-1.5 font-display text-base font-bold tabular-nums text-black';

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl className="space-y-2">
        <div className={row}>
          <dt className={LABEL}>
            דאטום מקור: <L>A</L>
          </dt>
          <dd className={numbers}>
            <L>{formatEN(LANDMARKS[id].a)}</L>
          </dd>
        </div>
        <div className={row}>
          <dt className={LABEL}>
            דאטום במפה: <L>B</L>
          </dt>
          <dd className={numbers}>
            {converted && <Icon name="check" size={16} strokeWidth={2.5} className="text-brand-dark" />}
            <L>{formatEN(mapNumbers(id, converted))}</L>
          </dd>
        </div>
      </dl>

      {/* the gap, read from the marker's own position (metres of the plane) */}
      <div className="rounded-xl bg-bg-accent/60 p-4">
        <div className="mb-1 flex items-center gap-2">
          {state.phase === 'done' ? (
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-brand-dark text-white">
              <Icon name="check" size={13} strokeWidth={3} />
            </span>
          ) : (
            <span aria-hidden className="grid size-5 place-items-center">
              <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
            </span>
          )}
          <span className={LABEL}>{status}</span>
        </div>
        <div className="font-display text-4xl font-bold tabular-nums text-black">
          <L>{Math.round(gap)}</L>
          <span className="ms-2 text-xl">מ׳ סטייה</span>
        </div>
      </div>

      <fieldset disabled={!open} className="min-w-0">
        <legend className={cn(HEADING, 'mb-2')}>איך מתקנים את המיקום המוצג?</legend>
        <div className="space-y-2">
          {ANSWERS.map((a) => {
            const on = state.answer === a.id;
            return (
              <label
                key={a.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 ease-snap motion-reduce:transition-none',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2',
                  on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated',
                  open ? 'cursor-pointer' : 'cursor-default',
                  open && !on && 'hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-answer`}
                  value={a.id}
                  checked={on}
                  onChange={() => dispatch({ type: 'selectAnswer', answer: a.id })}
                  className="sr-only"
                />
                <RadioDot on={on} />
                <span className={LABEL}>{a.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button variant="primary" size="md" className="flex-1 px-4" disabled={!open || state.answer === null} onClick={() => dispatch({ type: 'check' })}>
          בדיקת הבחירה
        </Button>
        {/* the lesson's toggle button, at the button row's height */}
        <button
          type="button"
          aria-expanded={state.hint}
          aria-controls={hintId}
          disabled={!open}
          onClick={() => dispatch({ type: 'toggleHint' })}
          className={cn(
            'h-12 rounded-xl border px-5 font-display text-[15px] font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'disabled:cursor-not-allowed disabled:opacity-45',
            state.hint ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
          )}
        >
          רמז
        </button>
      </div>
      {/* one line kept for the hint, so showing it never moves the card */}
      <div id={hintId} aria-live="polite" className="min-h-[1.625rem]">
        {state.hint && <p className={BODY}>{HINT}</p>}
      </div>
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

/* ─────────────────── the terrain and its live overlay ─────────────────── */

type LoadState = 'pending' | 'ready' | 'failed';

function Terrain({ landmark, t, gap }: { landmark: LandmarkId; t: number; gap: number }) {
  const [load, setLoad] = useState<LoadState>('pending');
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // load/error can fire before hydration (static HTML, cache): read the element itself
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setLoad(img.naturalWidth > 0 ? 'ready' : 'failed');
  }, [attempt]);

  const src = attempt ? `${TERRAIN_SRC}?retry=${attempt}` : TERRAIN_SRC;

  return (
    <div data-terrain={load} className="relative aspect-[25/14] overflow-hidden rounded-xl bg-bg-accent/60" aria-busy={load === 'pending' || undefined}>
      {/* the site's asset loading surface (IsometricAsset): tan wash + soft sheen, only after a short delay */}
      {load === 'pending' && (
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
          alt={TERRAIN_ALT}
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

      {load === 'failed' && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-tanline/35 p-6 text-center">
          <p className={BODY}>לא ניתן לטעון את תמונת השטח.</p>
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

      {/* no markers without the ground they stand on */}
      {load === 'ready' && <Overlay landmark={landmark} t={t} gap={gap} />}
    </div>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const CHIP = 'shadow-[0_1px_3px_rgba(40,50,35,0.25)]';

/**
 * The live layer, all in picture fractions from the one projection: the
 * requested location (a crosshair, fixed on the landmark), the displayed
 * location (an accent diamond), the dashed line between them draped on the
 * ground with its length in metres, and north. Positions are physical
 * coordinates of the picture, so reading direction never moves them.
 */
function Overlay({ landmark, t, gap }: { landmark: LandmarkId; t: number; gap: number }) {
  const req = requestedPx(landmark);
  const disp = displayedPx(landmark, t);
  const line = gapLine(landmark, t);
  // the distance chip rides the line a little nearer the crosshair, clear of the displayed location's label
  const mid = displayedPx(landmark, t + (1 - t) * 0.56);
  // the line's direction on screen (box-height units) and its normal toward the upper side
  const dx = (disp.x - req.x) * TERRAIN_ASPECT;
  const dy = disp.y - req.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  const showGap = gap >= 0.5;
  const showChip = gap >= CHIP_MIN_M;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        {showGap && (
          <polyline
            data-gap-line=""
            points={line.map((p) => `${(p.x * FRAME.w).toFixed(1)},${(p.y * FRAME.h).toFixed(1)}`).join(' ')}
            fill="none"
            className="stroke-accent"
            strokeWidth={2.5}
            strokeDasharray="7 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* requested location: a crosshair fixed on the landmark, its centre open so the landmark shows */}
      <span data-marker="requested" className="absolute" style={{ left: pct(req.x), top: pct(req.y), transform: 'translate(-50%, -50%)' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" className="block overflow-visible">
          <g fill="none" strokeLinecap="round" className="stroke-bg-elevated" strokeWidth={3.5} opacity={0.9}>
            <circle cx="20" cy="20" r="12.5" />
            <path d="M20 1.5v8M20 30.5v8M1.5 20h8M30.5 20h8" />
          </g>
          <g fill="none" strokeLinecap="round" className="stroke-fg" strokeWidth={1.75}>
            <circle cx="20" cy="20" r="12.5" />
            <path d="M20 1.5v8M20 30.5v8M1.5 20h8M30.5 20h8" />
          </g>
        </svg>
      </span>

      {/* displayed location: where the map puts the numbers */}
      <span data-marker="displayed" className="absolute" style={{ left: pct(disp.x), top: pct(disp.y), transform: 'translate(-50%, -50%)' }}>
        <span className="block size-4 rotate-45 rounded-[3px] border-2 border-bg-elevated bg-accent shadow-[0_2px_6px_rgba(40,50,35,0.35)]" />
      </span>

      {/* labels: the requested one under its crosshair, the displayed one over its diamond */}
      <span className="absolute" style={{ left: pct(req.x), top: pct(req.y), transform: 'translate(-50%, 25px)' }}>
        <StatusChip tone="neutral" className={CHIP} icon={<CrosshairGlyph />}>
          מיקום מבוקש
        </StatusChip>
      </span>
      <span className="absolute" style={{ left: pct(disp.x), top: pct(disp.y), transform: 'translate(-50%, calc(-100% - 16px))' }}>
        <StatusChip tone="neutral" className={CHIP} icon={<span aria-hidden className="size-2 rotate-45 rounded-[1px] bg-accent" />}>
          מיקום מוצג
        </StatusChip>
      </span>
      {showChip && (
        <span
          className="absolute"
          style={{ left: pct(mid.x), top: pct(mid.y), transform: `translate(calc(-50% + ${(nx * 27).toFixed(1)}px), calc(-50% + ${(ny * 27).toFixed(1)}px))` }}
        >
          <StatusChip tone="neutral" className={cn(CHIP, 'tabular-nums')}>
            <L>{Math.round(gap)}</L> מ׳
          </StatusChip>
        </span>
      )}

      {/* north: a map glyph, drawn where the picture puts north (never mirrored) */}
      <span className="absolute flex flex-col items-center text-fg" style={{ left: 12, top: 10 }}>
        <span className="font-display text-[11px] font-bold leading-none">N</span>
        <svg width="10" height="13" viewBox="0 0 10 12" fill="currentColor" className="mt-0.5" style={{ transform: `rotate(${NORTH_DEG.toFixed(1)}deg)` }}>
          <path d="M5 0 L10 12 L5 9 L0 12 Z" />
        </svg>
      </span>
    </div>
  );
}

function CrosshairGlyph() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-fg" strokeWidth={1.6} strokeLinecap="round">
      <circle cx="6" cy="6" r="3.2" />
      <path d="M6 .5v2.2M6 9.3v2.2M.5 6h2.2M9.3 6h2.2" />
    </svg>
  );
}

/* ─────────────────── point picker ─────────────────── */

function LandmarkPicker({ landmark, dispatch, uid }: { landmark: LandmarkId; dispatch: Dispatch<FieldAction>; uid: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">בחירת נקודה</legend>
      <div className="grid grid-cols-3 gap-3">
        {LANDMARK_IDS.map((id) => {
          const on = id === landmark;
          return (
            <label
              key={id}
              className={cn(
                'group relative block cursor-pointer overflow-hidden rounded-xl border transition-colors duration-200 ease-snap motion-reduce:transition-none',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2',
                on ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-brand/30',
              )}
            >
              <input
                type="radio"
                name={`${uid}-landmark`}
                value={id}
                checked={on}
                onChange={() => dispatch({ type: 'selectLandmark', id })}
                className="sr-only"
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- static export; the name beside it says what it shows */}
              <img src={THUMB_SRC[id]} alt="" aria-hidden draggable={false} decoding="async" className="block aspect-[21/9] w-full select-none object-cover" />
              <span
                className={cn(
                  'flex items-center gap-2 px-3 py-2 transition-colors duration-200 ease-snap motion-reduce:transition-none',
                  on ? 'bg-accent/10' : 'bg-bg-elevated group-hover:bg-brand/[0.03]',
                )}
              >
                <RadioDot on={on} />
                <span className={LABEL}>{LANDMARKS[id].name}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ─────────────────── feedback band ─────────────────── */

function FeedbackBand({ state, consequence, onReset }: { state: FieldState; consequence: string; onReset: () => void }) {
  const kind = state.phase === 'wrong' ? 'wrong' : state.phase === 'done' ? 'done' : 'info';
  return (
    <div
      data-band={kind}
      className={cn(
        'mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4 sm:px-5 transition-colors duration-200 ease-snap motion-reduce:transition-none',
        kind === 'done' ? 'border-brand/30 bg-brand/[0.08]' : kind === 'wrong' ? 'border-border bg-bg-accent' : 'border-border-subtle bg-bg-accent/60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          kind === 'done' ? 'bg-brand-dark text-white' : kind === 'wrong' ? 'border-2 border-accent text-accent' : 'border-2 border-border-strong text-fg',
        )}
      >
        <Icon name={kind === 'done' ? 'check' : kind === 'wrong' ? 'x' : 'crosshair'} size={18} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={LABEL}>{kind === 'done' ? FEEDBACK_DONE : kind === 'wrong' ? FEEDBACK_WRONG : 'משמעות הסטייה בהדמיה'}</p>
        <p className={BODY}>{consequence}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <Icon name="refresh" size={16} strokeWidth={2} />
        איפוס
      </Button>
    </div>
  );
}
