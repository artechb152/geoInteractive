'use client';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDeg } from '../compassMapGeometry';
import {
  DECLINATION_MAX,
  DECLINATION_MIN,
  DECLINATION_START,
  GRID_NORTH_ANGLE,
  azimuthFrom,
  bearings,
  clampDeclination,
  declinationText,
  formatSigned,
  referenceAngle,
} from './northLabGeometry';
import { NORTHS, NORTH_IDS, type NorthId } from './norths';
import { NorthLabMap } from './NorthLabMap';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "שלושה סוגי צפון" — a reference lab: the target B never moves; choosing a
 * north moves only the start of the measurement, and the declination slider
 * turns MN. One state (active north + declination) drives the map, the arc,
 * the large reading and the comparison table; the three original info fields
 * of the chosen north stay visible underneath.
 *
 * Every drawn angle and every number comes from the same smoothed values
 * (useSmoothed / useArcStart), so mid-animation they always agree; the slider
 * and assistive tech carry the target value. Reduced motion: values jump.
 */
export function NorthLab() {
  const [active, setActive] = useState<NorthId>('magnetic');
  const [declination, setDeclination] = useState(DECLINATION_START);
  const reduce = !!useReducedMotion();
  const decl = useSmoothed(declination, reduce);
  const arcStart = useArcStart(active, decl, reduce);
  const values = bearings(decl);

  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (id: NorthId) => `${uid}-north-tab-${id}`;
  const panelId = `${uid}-north-panel`;

  // Announce the reading once the learner pauses for a beat — never mid-drag,
  // and not on page load.
  const [touched, setTouched] = useState(false);
  const stateKey = `${active}:${declination}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setSettledKey(stateKey), 550);
    return () => window.clearTimeout(t);
  }, [stateKey]);
  const announcement =
    touched && settledKey === stateKey
      ? `${readingLabel(active)} ${Math.round(azimuthFrom(referenceAngle(active, declination)))} מעלות`
      : '';

  const select = (id: NorthId) => {
    setTouched(true);
    setActive(id);
  };
  const changeDeclination = (v: number) => {
    setTouched(true);
    setDeclination(clampDeclination(v));
  };
  const reset = () => {
    setTouched(true);
    setActive('magnetic');
    setDeclination(DECLINATION_START);
  };

  // RTL row: Left steps forward (next choice to the left), Right steps back.
  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === 'ArrowLeft') next = (idx + 1) % NORTH_IDS.length;
    else if (e.key === 'ArrowRight') next = (idx + NORTH_IDS.length - 1) % NORTH_IDS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = NORTH_IDS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(NORTH_IDS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="north-lab">
      <div className="mb-6">
        <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
          שלושה סוגי צפון
        </h3>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg-muted">
          אזימוט נמדד ביחס לסוג מסוים של צפון: מגנטי, רשת או אמיתי. בחרו בכל סוג כדי לראות את ההגדרה ואת השימוש בו.
        </p>
      </div>

      {/* Desktop: the controls column at the inline start (right), the map at the
          end (left), as in the selected mockup; DOM order starts with the controls. */}
      <div className="grid gap-x-7 gap-y-4 lg:grid-cols-[304px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1" data-controls>
          <p className="font-display text-base font-bold leading-tight text-black md:text-lg">שנו את נקודת הייחוס</p>

          <div role="tablist" aria-label="בחירת סוג צפון" className="grid grid-cols-3 gap-2">
            {NORTH_IDS.map((id, idx) => {
              const isActive = id === active;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(id)}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(id)}
                  onKeyDown={(e) => onTabKey(e, idx)}
                  data-north={id}
                  className={cn(
                    'flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center',
                    'font-display text-base font-semibold leading-tight text-fg text-balance transition-colors duration-200 ease-snap',
                    isActive
                      ? 'border-accent bg-accent/10 ring-1 ring-inset ring-accent'
                      : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  )}
                >
                  {NORTHS[id].label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-bg-accent px-4 py-4 text-center" data-reading>
            <p className="font-display text-base font-bold leading-snug text-black">{readingLabel(active)}</p>
            <p dir="ltr" className="mt-2 font-display text-5xl font-bold leading-none tabular-nums text-fg" data-readout="reading">
              {formatDeg(azimuthFrom(arcStart))}
            </p>
          </div>

          <ComparisonTable values={values} active={active} />

          <DeclinationControl value={declination} shown={decl} onChange={changeDeclination} onReset={reset} />
        </div>

        <div className="lg:col-start-2 lg:row-start-1">
          <NorthLabMap declination={decl} arcStart={arcStart} active={active} />
        </div>
      </div>

      <NorthInfoStrip active={active} panelId={panelId} labelledBy={tabId(active)} />

      <p className="mt-4 text-base leading-relaxed text-black">
        <strong className="font-bold">במעבר בין מפה למצפן:</strong> בודקים את ההפרש בין צפון הרשת לצפון המגנטי ומתקנים את האזימוט בהתאם לנתונים העדכניים לאזור. הזוויות בדוגמה הן להמחשה בלבד; בחלונית ההפרדה המוגדלת המרווחים בין החצים אינם בקנה מידה.
      </p>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}

const readingLabel = (id: NorthId) => `האזימוט ביחס ל${NORTHS[id].label}`;

// ─────────────────────────────────────────────────────────────────────────────
// Motion — one source per value
// ─────────────────────────────────────────────────────────────────────────────

/** One damped spring toward `target` (AzimuthExplorer's feel). Reduced motion: the target itself. */
function useSmoothed(target: number, reduce: boolean) {
  const spring = useSpring(target, { stiffness: 170, damping: 22, mass: 0.6 });
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (reduce) spring.jump(target);
    else spring.set(target);
  }, [target, reduce, spring]);
  useMotionValueEvent(spring, 'change', setValue);
  return reduce ? target : value;
}

/**
 * Start of the measurement arc: the chosen north's angle (from the smoothed
 * declination) plus a short-lived offset that sweeps it from the previous
 * north when the choice changes — so with the offset at rest the arc starts
 * exactly on the chosen arrow, and the reading is always derived from it.
 */
function useArcStart(active: NorthId, declination: number, reduce: boolean) {
  const offset = useMotionValue(0);
  const [off, setOff] = useState(0);
  useMotionValueEvent(offset, 'change', setOff);
  const prev = useRef(active);
  const shown = useRef(referenceAngle(active, declination));
  const anim = useRef<ReturnType<typeof animate> | null>(null);

  useLayoutEffect(() => {
    if (prev.current === active) return;
    prev.current = active;
    anim.current?.stop();
    const delta = shown.current - referenceAngle(active, declination);
    if (reduce || Math.abs(delta) < 0.01) {
      offset.jump(0);
      setOff(0);
      return;
    }
    offset.jump(delta);
    setOff(delta);
    anim.current = animate(offset, 0, { duration: 0.4, ease: EASE });
  }, [active, declination, reduce, offset]);
  useEffect(() => () => anim.current?.stop(), []);

  const start = referenceAngle(active, declination) + (reduce ? 0 : off);
  useLayoutEffect(() => {
    shown.current = start;
  });
  return start;
}

// ─────────────────────────────────────────────────────────────────────────────
// Controls
// ─────────────────────────────────────────────────────────────────────────────

/** Legend key: a short upward arrow in the north's diagram colour. */
function NorthSwatch({ id }: { id: NorthId }) {
  return (
    <svg viewBox="0 0 12 18" className={cn('h-[18px] w-3 shrink-0', NORTHS[id].color)} aria-hidden>
      <path d="M6 17V7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 1 1.8 8.4h8.4Z" fill="currentColor" />
    </svg>
  );
}

function ComparisonTable({ values, active }: { values: Record<NorthId, number>; active: NorthId }) {
  const titleId = useId();
  return (
    <div className="rounded-2xl bg-bg-accent p-4" data-comparison>
      <p id={titleId} className="font-display text-base font-bold leading-snug text-black">
        השוואת אזימוטים לאותו יעד
      </p>
      <div className="mt-2 rounded-xl border border-border bg-bg-elevated p-1">
        <table aria-labelledby={titleId} className="w-full border-separate border-spacing-0">
          <tbody>
            {NORTH_IDS.map((id) => {
              const isActive = id === active;
              return (
                <tr key={id} data-row={id} aria-current={isActive ? 'true' : undefined} className={cn(isActive && 'bg-accent/10')}>
                  <th scope="row" className="rounded-s-lg py-1.5 pe-2 ps-2 text-start align-middle">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={cn('h-5 w-1 shrink-0 rounded-full', isActive ? 'bg-accent' : 'bg-transparent')} />
                      <NorthSwatch id={id} />
                      <span className={cn('text-base leading-snug text-black', isActive ? 'font-bold' : 'font-normal')}>{NORTHS[id].label}</span>
                    </span>
                  </th>
                  <td className="rounded-e-lg py-1.5 pe-3 text-end align-middle">
                    <span dir="ltr" className="font-display text-lg font-bold leading-none tabular-nums text-fg" data-value={id}>
                      {formatDeg(values[id])}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The declination slider is an instrument scale, so it is NOT mirrored for
 * RTL: −10° at the left, +10° at the right. Marks sit at their true positions,
 * aligned with the thumb centre. Arrows ±1°, Shift + arrows ±5°, Home/End.
 */
const THUMB_PX = 26;
const sliderPos = (v: number) =>
  `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${(v - DECLINATION_MIN) / (DECLINATION_MAX - DECLINATION_MIN)})`;

function DeclinationControl({
  value,
  shown,
  onChange,
  onReset,
}: {
  value: number;
  shown: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(value + step);
  };
  const marks = [DECLINATION_MIN, 0, DECLINATION_MAX];
  return (
    <div className="rounded-2xl bg-bg-accent p-4" data-declination>
      <div className="flex items-baseline justify-between gap-3">
        <p id={labelId} className="font-display text-base font-bold leading-snug text-black">
          נטייה מגנטית לדוגמה
        </p>
        <p dir="ltr" className="font-display text-xl font-bold leading-none tabular-nums text-fg" data-readout="declination">
          {formatSigned(shown)}
        </p>
      </div>
      <p id={hintId} className="mt-1 text-base leading-snug text-black">
        הזיזו את המחוון וצפו בשינוי המדידה.
      </p>

      <div dir="ltr" className="relative mt-3 w-full" data-slider>
        <div className="relative h-[26px]">
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-bg-elevated ring-1 ring-inset ring-border" />
          <div
            aria-hidden
            className="absolute start-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-accent"
            style={{ width: sliderPos(value) }}
          />
          <input
            type="range"
            min={DECLINATION_MIN}
            max={DECLINATION_MAX}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onKeyDown={onKeyDown}
            aria-labelledby={labelId}
            aria-describedby={hintId}
            aria-valuetext={declinationText(value)}
            className={cn(
              'absolute inset-0 h-[26px] w-full cursor-pointer appearance-none bg-transparent',
              // the focus ring goes on the thumb (below), not around the whole track
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              '[&::-webkit-slider-runnable-track]:h-[26px] [&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:size-[26px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
              // pseudo-elements don't get preflight's `border-style: solid`, so set it explicitly
              '[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-bg-elevated',
              '[&::-webkit-slider-thumb]:shadow-elevated',
              '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-[26px] [&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-bg-elevated',
              // keyboard focus: a white gap + ink ring around the thumb
              '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_3px_#FFFFFF,0_0_0_6px_#38432E]',
              '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_3px_#FFFFFF,0_0_0_6px_#38432E]',
            )}
          />
        </div>
        <div aria-hidden className="relative mt-1.5 h-7">
          {marks.map((v) => (
            <span key={v} className="absolute top-0 flex w-0 flex-col items-center" style={{ insetInlineStart: sliderPos(v) }}>
              <span className="h-2 w-px bg-fg-muted" />
              <span className="mt-1 whitespace-nowrap text-sm font-semibold leading-none tabular-nums text-fg">{formatSigned(v)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border-subtle pt-2.5">
        <p className="text-base leading-snug text-black">
          <span className="font-display font-bold">{NORTHS.grid.label}</span>{' '}
          <span dir="ltr" className="font-display font-bold tabular-nums text-fg" data-readout="grid-angle">
            {formatSigned(GRID_NORTH_ANGLE)}
          </span>
        </p>
        <Button variant="secondary" size="sm" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden />
          איפוס
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Info strip — the three original fields of the chosen north
// ─────────────────────────────────────────────────────────────────────────────

function NorthInfoContent({ id }: { id: NorthId }) {
  const meta = NORTHS[id];
  return (
    <>
      <h4 className="font-display text-lg font-bold leading-snug text-black md:text-xl">
        {meta.label} <span className="text-base font-medium text-fg-muted sm:text-lg">({meta.english})</span>
      </h4>
      <dl className="mt-3 grid gap-x-8 gap-y-4 lg:grid-cols-3">
        <div>
          <dt className="mb-1 text-base font-display font-bold text-black">שימוש עיקרי</dt>
          <dd className="text-base leading-relaxed text-black">{meta.who}</dd>
        </div>
        <div>
          <dt className="mb-1 text-base font-display font-bold text-black">הגדרה</dt>
          <dd className="text-base leading-relaxed text-black">{meta.what}</dd>
        </div>
        <div>
          <dt className="mb-1 text-base font-display font-bold text-black">דגש לשימוש</dt>
          <dd className="text-base leading-relaxed text-black">{meta.why}</dd>
        </div>
      </dl>
    </>
  );
}

/**
 * The tab panel. All three contents are stacked invisibly in the same grid
 * cell to reserve the tallest height, so switching never makes the card jump;
 * the visible one cross-fades on top. Neutral surface — the north colours stay
 * a legend for the map.
 */
function NorthInfoStrip({ active, panelId, labelledBy }: { active: NorthId; panelId: string; labelledBy: string }) {
  const reduce = !!useReducedMotion();
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="mt-6 grid rounded-2xl bg-bg-accent px-6 py-5"
      data-info={active}
    >
      {NORTH_IDS.map((id) => (
        <div key={id} aria-hidden className="invisible [grid-area:1/1]">
          <NorthInfoContent id={id} />
        </div>
      ))}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          className="[grid-area:1/1]"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.22, ease: EASE } }}
          exit={reduce ? undefined : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
        >
          <NorthInfoContent id={active} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
