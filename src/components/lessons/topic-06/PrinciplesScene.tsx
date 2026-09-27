'use client';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AnimatePresence, motion, useSpring, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { GpsDeniedIllustration, NorthGlyph } from './PrinciplesVisuals';

const EASE = [0.22, 1, 0.36, 1] as const;

export function PrinciplesScene() {
  return (
    <section id="scene-principles" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.1"
        eyebrow="עקרונות הניווט"
        title={
          <>
          המתמטיקה של הניווט: איך קובעים כיוון מוחלט בשטח לא מוכר?
          </>
        }
        intro="ניווט הוא לא ניחוש - הוא מדע של דיוק. הכל מתחיל ב'אזימוט': הכלי שמאפשר לכם לדעת בדיוק לאן ללכת, גם באמצע שום מקום ובחושך מוחלט."
      />

      {/* Opening · two short term definitions as plain info text (no cards), so the
          azimuth instrument below is the first strong surface on the screen. Each one
          previews a block below it (azimuth → the compass board, GPS-Denied → the GPS
          block). */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-10">
        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
          אזימוט <span className="text-fg-muted font-medium text-base sm:text-lg">(Azimuth)</span>
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
          הזווית המדויקת ליעד שלכם — <strong className="text-fg">בין 0° ל-360° מצפון</strong>. 0° זה צפון, 90° זה מזרח. ה"אזימוט החוזר" הוא פשוט הכיוון ההפוך (±180°) — הדרך הבטוחה הביתה.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
          GPS-Denied: כשהטכנולוגיה בוגדת
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
          כשהאויב משבש את הלוויינים, או כשנמצאים מתחת לאדמה — <strong className="text-fg">חוזרים למפה ולמצפן</strong>. נווט טוב יודע לפעול גם כשכל המסכים כבים.
          </p>
        </div>
      </div>

      <AzimuthExplorer />

      <div className="my-12">
        <ThreeNorthsCard />
      </div>

      <div className="my-12">
        <GpsDeniedCard />
      </div>

      <ConclusionCard />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Azimuth explorer — slider tape + draggable compass dial driving one value
// ─────────────────────────────────────────────────────────────────────────────

const normDeg = (d: number) => ((d % 360) + 360) % 360;

function directionOf(az: number) {
  return az < 22 || az >= 338 ? 'צפון'
    : az < 67 ? 'צפון־מזרח'
    : az < 112 ? 'מזרח'
    : az < 157 ? 'דרום־מזרח'
    : az < 202 ? 'דרום'
    : az < 247 ? 'דרום־מערב'
    : az < 292 ? 'מערב'
    : 'צפון־מערב';
}

function AzimuthExplorer() {
  const [azimuth, setAzimuth] = useState(47);
  // The dial needle sweeps to its target with a damped spring so it reads like a real
  // compass hand. Every number on screen (digit readout, direction word, back azimuth)
  // is derived from that same animated angle — never from the raw slider value — so
  // what you read always matches exactly where the needle is pointing, mid-sweep or not.
  const angle = useSmoothedAngle(azimuth);
  const displayAzimuth = Math.round(normDeg(angle)) % 360;
  const back = (displayAzimuth + 180) % 360;
  const direction = directionOf(displayAzimuth);

  // Assistive tech gets the *target* value (not the mid-sweep spring value).
  const targetBack = (azimuth + 180) % 360;
  const valueText = `${azimuth} מעלות, כיוון ${directionOf(azimuth)}`;

  // "Settled" = the learner stopped moving the needle for a beat. Only then does
  // the dial draw the ±180° sweep from the needle to the back-azimuth needle, so
  // the relation is demonstrated as a consequence of the choice, not as noise
  // during the drag.
  // Tracked as "the value that settled" so a new value is un-settled in the very
  // same render it appears (no one-frame flash of a stale sweep).
  const [settledValue, setSettledValue] = useState<number | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setSettledValue(azimuth), 550);
    return () => window.clearTimeout(t);
  }, [azimuth]);
  const settled = settledValue === azimuth;

  return (
    <div className="surface-elevated relative overflow-hidden select-none">
      {/* Single navigation-instrument board: a 2-col / 2-row grid on desktop (data
          block + card share the right column, the compass spans both rows on the
          left) that collapses to plain DOM-order stacking on mobile — data block,
          then compass, then the back-azimuth card — via the `lg:` grid placement
          below being inert until that breakpoint. */}
      <div className="relative grid gap-8 p-6 lg:p-8 lg:gap-x-10 lg:grid-cols-[1fr_1.3fr]">
        {/* 1. Title, 2. slider, 3–7. big azimuth / direction / back-azimuth / equation / note */}
        <div className="lg:col-start-1 lg:row-start-1 flex flex-col gap-6 lg:pe-8">
          <div>
            <div className="mb-3 text-base font-display font-bold text-fg">
            תנו למצפן סיבוב — בחרו כיוון
            </div>
            <AzimuthTape value={azimuth} onChange={setAzimuth} valueText={valueText} />
          </div>

          <div>
            <div className="font-mono font-bold text-6xl sm:text-7xl leading-none tabular-nums text-fg">
            {displayAzimuth}<span className="text-3xl sm:text-4xl text-accent-hot align-top">°</span>
            </div>
            <div className="mt-2 text-lg sm:text-xl font-display font-semibold text-fg-muted">
            {direction}
            </div>

            {/* Back-azimuth readout (the result of the choice) — an inset tinted in the
                same cool blue as the dashed back needle and its bezel tag on the dial
                (data/legend colour), so the three read as one thing. */}
            <div className="mt-5 rounded-xl bg-accent-cool/10 p-4">
              <div className="flex items-baseline gap-2.5">
                <span aria-hidden className="inline-block w-5 self-center border-t-2 border-dashed border-accent-cool" />
                <span className="text-sm font-display font-semibold text-fg-muted">אזימוט חוזר</span>
                <span className="font-mono font-bold text-2xl sm:text-3xl tabular-nums text-accent-cool">
                {back}°
                </span>
              </div>
              <div className="mt-2 font-mono text-sm text-fg-muted tabular-nums">
              {displayAzimuth}° <span className="font-semibold text-accent-cool">{displayAzimuth >= 180 ? '−' : '+'} 180°</span> = {back}°
              </div>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">
              הלכתם ליעד ב-{displayAzimuth}°? כדי לחזור בדיוק הביתה לנקודת המוצא, אתם צריכים את הדרך ההפוכה: {back}°.
              </p>
            </div>
          </div>

          {/* Polite, settled-only announcement (never mid-sweep) */}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {settled ? `${azimuth}° ${directionOf(azimuth)}. אזימוט חוזר ${targetBack}°` : ''}
          </span>
        </div>

        {/* The compass instrument — second in DOM → left in RTL, spans both rows on
            desktop. Drag / click anywhere on the dial to aim the needle; arrow keys
            work when it has focus. */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 relative flex flex-col items-center justify-center gap-4">
          <CompassDialControl
            angle={angle}
            azimuth={azimuth}
            displayAzimuth={displayAzimuth}
            back={back}
            settled={settled}
            onChange={setAzimuth}
            valueText={valueText}
          />
          <div className="relative flex items-center gap-5 text-sm font-display font-medium text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-accent-hot" aria-hidden />
              אזימוט
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-accent-cool" aria-hidden />
              אזימוט חוזר
            </span>
          </div>
        </div>

        {/* 8–9. "When to use it" + dynamic example — plain info text (no box), so it
            reads as explanation, apart from the tinted result readout above */}
        <div className="lg:col-start-1 lg:row-start-2 lg:pe-8">
          <div>
            <h4 className="text-base font-display font-bold text-fg mb-1.5">מתי משתמשים באזימוט חוזר?</h4>
            <p className="text-sm text-fg-muted leading-relaxed">
            כדי לחזור הביתה בבטחה, כדי לוודא שחברים שלכם נמצאים במיקום הנכון, או כדי לבצע נסיגה חכמה דרך נתיב שכבר בדקתם וסימנתם כבטוח.
            </p>
            <div className="mt-3">
              <p className="text-sm text-fg leading-relaxed">
              אם הלכתם באזימוט <strong className="font-mono">{displayAzimuth}°</strong>, האזימוט החוזר לנקודת המוצא הוא{' '}
              <strong className="font-mono text-accent-cool">{back}°</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The slider is the compass rose unrolled into a tape. Like the dial itself it is
 * an instrument scale, so it is NOT mirrored for RTL: 0° sits at the left and
 * values grow to the right — dragging right turns the needle clockwise, exactly
 * as the needle tip moves at the top of the dial. Scale labels sit at their true
 * positions (90° at ¼, 180° at ½, 270° at ¾), aligned with the thumb centre.
 */
const TAPE_THUMB_PX = 24;
const tapePos = (v: number) => `calc(${TAPE_THUMB_PX / 2}px + (100% - ${TAPE_THUMB_PX}px) * ${v / 359})`;

function AzimuthTape({
  value,
  onChange,
  valueText,
}: {
  value: number;
  onChange: (v: number) => void;
  valueText: string;
}) {
  const labels = [
    { v: 0, text: '0° צפון' },
    { v: 90, text: '90° מזרח' },
    { v: 180, text: '180° דרום' },
    { v: 270, text: '270° מערב' },
  ];
  return (
    <div dir="ltr" className="relative">
      <div className="relative h-6">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <div
          aria-hidden
          className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent-hot/70"
          style={{ width: tapePos(value) }}
        />
        <input
          type="range"
          min={0}
          max={359}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="אזימוט"
          aria-valuetext={valueText}
          className={cn(
            'absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            '[&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            // pseudo-elements don't get preflight's `border-style: solid`, so set it explicitly
            '[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent-hot [&::-webkit-slider-thumb]:bg-bg-elevated',
            '[&::-webkit-slider-thumb]:shadow-elevated [&::-webkit-slider-thumb]:transition-shadow',
            '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent-hot [&::-moz-range-thumb]:bg-bg-elevated',
            '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
          )}
        />
      </div>
      {/* scale ticks every 30°, cardinal ticks taller */}
      <div aria-hidden className="relative mt-1 h-2">
        {Array.from({ length: 12 }, (_, i) => i * 30).map((v) => (
          <span
            key={v}
            className={cn('absolute top-0 w-px', v % 90 === 0 ? 'h-2 bg-fg-dim/80' : 'h-1.5 bg-fg-dim/40')}
            style={{ insetInlineStart: tapePos(v) }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-5 text-[13px] leading-5 font-display font-medium text-fg-muted">
        {labels.map((l) => (
          <span key={l.v} className="absolute top-0 flex w-0 justify-center" style={{ insetInlineStart: tapePos(l.v) }}>
            <span dir="rtl" className="whitespace-nowrap">{l.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Drives a single damped-spring angle toward `target`, always taking the shortest
 * rotational path (so 359°→0° sweeps forward 1°, never backward through 358°).
 * Shared by the digit readout and the dial needle so they can never drift apart
 * — see AzimuthExplorer. Under prefers-reduced-motion, the raw target is returned
 * directly and the spring is left idle.
 */
function useSmoothedAngle(target: number) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(target, { stiffness: 170, damping: 22, mass: 0.6 });
  const [angle, setAngle] = useState(target);
  const unwrapped = useRef(target);
  useEffect(() => {
    const currentMod = normDeg(unwrapped.current);
    let delta = (target - currentMod) % 360;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    unwrapped.current += delta;
    spring.set(unwrapped.current);
  }, [target, spring]);
  useMotionValueEvent(spring, 'change', (v) => setAngle(v));
  return reduceMotion ? target : angle;
}

/**
 * Makes the dial itself a control (role="slider"): press/drag anywhere on the
 * face to aim the needle at the pointer, or use the keyboard when focused
 * (←/→/↑/↓ ±1°, Shift or PageUp/PageDown ±10°, Home = north). Values wrap
 * around 0/360 like a real compass.
 */
function CompassDialControl({
  angle,
  azimuth,
  displayAzimuth,
  back,
  settled,
  onChange,
  valueText,
}: {
  angle: number;
  azimuth: number;
  displayAzimuth: number;
  back: number;
  settled: boolean;
  onChange: (v: number) => void;
  valueText: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const angleFromPointer = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.x + r.width / 2);
    const dy = clientY - (r.y + r.height / 2);
    // ignore the pivot area — the angle is meaningless that close to the centre
    if (Math.hypot(dx, dy) < r.width * 0.06) return null;
    return Math.round(normDeg((Math.atan2(dx, -dy) * 180) / Math.PI)) % 360;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // No preventDefault: the native mousedown focuses the dial (tabIndex=0), so
    // arrow keys keep working after a click without a keyboard-style focus ring.
    ref.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    const a = angleFromPointer(e.clientX, e.clientY);
    if (a !== null) onChange(a);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const a = angleFromPointer(e.clientX, e.clientY);
    if (a !== null) onChange(a);
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = azimuth + big;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = azimuth - big;
        break;
      case 'PageUp':
        next = azimuth + 10;
        break;
      case 'PageDown':
        next = azimuth - 10;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 359;
        break;
    }
    if (next === null) return;
    e.preventDefault();
    onChange(normDeg(next));
  };

  return (
    <div className="relative aspect-square w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[440px]">
      {/* Circular contact shadow — the instrument's own cast shadow on the table */}
      <div aria-hidden className="absolute inset-[3%] rounded-full shadow-pine-card" />
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="מצפן"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={azimuth}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'relative size-full touch-none rounded-full',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <CompassDial angle={angle} azimuth={azimuth} displayAzimuth={displayAzimuth} back={back} settled={settled} />
      </div>
    </div>
  );
}

/** Point on the dial at compass bearing `deg` (0 = up, clockwise), radius `r`. */
function dialPoint(deg: number, r: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function CompassDial({
  angle,
  azimuth,
  displayAzimuth,
  back,
  settled,
}: {
  angle: number;
  azimuth: number;
  displayAzimuth: number;
  back: number;
  settled: boolean;
}) {
  const uid = useId();
  const reduce = !!useReducedMotion();
  const faceClipId = `compass-face-clip-${uid}`;
  const needleShadowId = `compass-needle-shadow-${uid}`;

  // Azimuth wedge — "the angle measured clockwise from north" made visible.
  const a = normDeg(angle);
  const WEDGE_R = 20;
  let wedge: string | null = null;
  if (a > 0.5 && a < 359.5) {
    const p = dialPoint(a, WEDGE_R);
    wedge = `M 0 0 L 0 ${-WEDGE_R} A ${WEDGE_R} ${WEDGE_R} 0 ${a > 180 ? 1 : 0} 1 ${p.x} ${p.y} Z`;
  }

  // ±180° sweep from the needle to the back needle (drawn once the value settles).
  const SWEEP_R = 14.5;
  const forward = azimuth < 180;
  const sweepFrom = dialPoint(azimuth, SWEEP_R);
  const sweepTo = dialPoint(azimuth + 180, SWEEP_R);
  const sweepPath = `M ${sweepFrom.x} ${sweepFrom.y} A ${SWEEP_R} ${SWEEP_R} 0 0 ${forward ? 1 : 0} ${sweepTo.x} ${sweepTo.y}`;
  const sweepLabelAt = dialPoint(forward ? azimuth + 90 : azimuth - 90, SWEEP_R);

  return (
    // direction:ltr — an instrument face: keeps "+180°" / "−180°" from being
    // bidi-reordered to "180°+" by the page's RTL cascade.
    <svg
      viewBox="-50 -50 100 100"
      className="relative w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ direction: 'ltr' }}
    >
      <defs>
        <clipPath id={faceClipId}>
          <circle cx="0" cy="0" r="40" />
        </clipPath>
        {/* #38432E below is the literal value of the `fg` token — filter flood-color
            can't reference Tailwind classes, so it's duplicated here rather than
            inventing a new color. */}
        <filter id={needleShadowId} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0.3" dy="0.5" stdDeviation="0.4" floodColor="#38432E" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Housing — a single solid, monochrome ring, a crisp edge on its own
          boundary, and a thin seam where it meets the face */}
      <circle cx="0" cy="0" r="45.1" className="fill-border-strong" />
      <circle cx="0" cy="0" r="45.1" className="fill-none stroke-fg/20" strokeWidth="0.3" />
      <circle cx="0" cy="0" r="40.6" className="fill-bg" />
      <circle cx="0" cy="0" r="40.6" className="fill-none stroke-fg/25" strokeWidth="0.45" />

      {/* Faint topographic contour texture, clipped to the face — no labels or roads */}
      <g clipPath={`url(#${faceClipId})`} opacity="0.4" fill="none" className="stroke-border-strong" strokeWidth="0.3">
        <path d="M -32,-11 C -20,-19 -8,-5 6,-15 C 18,-23 28,-11 35,-17" />
        <path d="M -30,5 C -16,-1 -2,13 12,3 C 22,-3 30,7 37,1" />
        <path d="M -27,19 C -15,27 -1,17 13,25 C 21,29 27,19 33,23" />
        <path d="M -13,-3 C -7,-9 3,-7 7,-3 C 11,1 7,7 1,5 C -5,3 -9,1 -13,-3 Z" opacity="0.7" />
      </g>

      {/* Azimuth wedge from N to the needle */}
      {wedge && (
        <>
          <path d={wedge} className="fill-accent-hot/[0.07]" />
          <path d={wedge} className="fill-none stroke-accent-hot/45" strokeWidth="0.4" strokeLinejoin="round" />
        </>
      )}

      {/* Tick marks — 5° minor / 10° medium / 30° major, thin ink-toned hairlines */}
      {Array.from({ length: 72 }).map((_, i) => {
        const deg = i * 5;
        const isMajor = deg % 30 === 0;
        const isMedium = !isMajor && deg % 10 === 0;
        const outer = dialPoint(deg, 39.6);
        const inner = dialPoint(deg, isMajor ? 32.2 : isMedium ? 35.4 : 37.7);
        return (
          <line
            key={deg}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            className={isMajor ? 'stroke-fg/65' : isMedium ? 'stroke-fg-muted/55' : 'stroke-fg-dim/45'}
            strokeWidth={isMajor ? 0.55 : isMedium ? 0.32 : 0.2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Degree numbers every 30°, except the cardinal points (which get letters below) */}
      {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
        const p = dialPoint(deg, 27.2);
        return (
          <text
            key={deg}
            x={p.x}
            y={p.y + 1.35}
            textAnchor="middle"
            className="fill-fg-muted font-mono font-medium text-[4px]"
          >
            {deg}
          </text>
        );
      })}

      {/* Cardinal letters — N is only a size/weight step up */}
      {[
        { deg: 0, label: 'N', primary: true },
        { deg: 90, label: 'E', primary: false },
        { deg: 180, label: 'S', primary: false },
        { deg: 270, label: 'W', primary: false },
      ].map((c) => {
        const p = dialPoint(c.deg, 25);
        return (
          <text
            key={c.label}
            x={p.x}
            y={p.y + (c.primary ? 2.2 : 1.9)}
            textAnchor="middle"
            className={cn('font-display fill-fg', c.primary ? 'font-bold text-[7px]' : 'font-semibold text-[5.6px]')}
          >
            {c.label}
          </text>
        );
      })}

      {/* ±180° relation: a cool-blue half-turn from the needle to the back needle */}
      <AnimatePresence>
        {settled && (
          <motion.g
            key={`sweep-${azimuth}`}
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <motion.path
              d={sweepPath}
              fill="none"
              className="stroke-accent-cool"
              strokeWidth="0.7"
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            />
            <motion.g
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : 0.35 }}
            >
              <rect
                x={sweepLabelAt.x - 7.4}
                y={sweepLabelAt.y - 2.9}
                width="14.8"
                height="5.8"
                rx="2.9"
                className="fill-bg-elevated stroke-accent-cool/60"
                strokeWidth="0.35"
              />
              <text
                x={sweepLabelAt.x}
                y={sweepLabelAt.y + 1.4}
                textAnchor="middle"
                className="fill-accent-cool font-mono font-bold text-[4px]"
              >
                {forward ? '+' : '−'}180°
              </text>
            </motion.g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Static contact shadow beneath the needle pivot */}
      {/* (was `fill-fg/8` — not a generated opacity step, so it rendered solid black) */}
      <ellipse cx="0.5" cy="1.3" rx="3.2" ry="1.5" className="fill-fg/[0.08]" />

      {/* Azimuth + back-azimuth needles, anchored at the dial center */}
      <CompassNeedles angle={angle} needleShadowId={needleShadowId} />

      {/* Center pin — a plain rivet */}
      <circle cx="0" cy="0" r="2.6" className="fill-bg stroke-fg-dim/70" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="1.1" className="fill-fg-dim" />

      {/* Bezel tags — the live values printed right where each needle points.
          The red one doubles as the grab handle. */}
      <BezelTag deg={angle + 180} text={`${back}°`} tone="back" shadowId={needleShadowId} />
      <BezelTag deg={angle} text={`${displayAzimuth}°`} tone="forward" shadowId={needleShadowId} />
    </svg>
  );
}

function BezelTag({
  deg,
  text,
  tone,
  shadowId,
}: {
  deg: number;
  text: string;
  tone: 'forward' | 'back';
  shadowId: string;
}) {
  const p = dialPoint(deg, 42.85);
  const h = 6.6;
  const w = text.length * 2.45 + 3.6;
  return (
    <g transform={`translate(${p.x} ${p.y})`} filter={`url(#${shadowId})`}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={h / 2}
        className={tone === 'forward' ? 'fill-accent-hot' : 'fill-accent-cool'}
        stroke="#FFFFFF"
        strokeWidth="0.5"
      />
      <text x="0" y="1.45" textAnchor="middle" fill="#FFFFFF" className="font-mono font-bold text-[4px]">
        {text}
      </text>
    </g>
  );
}

/**
 * Two needles drawn pointing straight up from the dial center (0,0) and rotated
 * with the native SVG `transform="rotate(a)"` — which always pivots around the
 * user-space origin (0,0 == viewBox center). `angle` is the same damped-spring
 * value (see useSmoothedAngle) that drives the digit readout, so needle and
 * number can never disagree.
 */
function CompassNeedles({ angle, needleShadowId }: { angle: number; needleShadowId: string }) {
  return (
    <>
      {/* Back azimuth (azimuth + 180°) — secondary: dashed cool-blue line + open
          chevron, same color as its bezel tag and the readout box. */}
      <g transform={`rotate(${angle + 180})`}>
        <line
          x1="0"
          y1="-3"
          x2="0"
          y2="-21.5"
          className="stroke-accent-cool"
          strokeWidth="0.9"
          strokeDasharray="1.6 1.2"
          strokeLinecap="round"
        />
        <polyline
          points="-2,-18.8 0,-22.2 2,-18.8"
          className="stroke-accent-cool"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Forward azimuth — primary: a narrow, sharp navigation needle */}
      <g transform={`rotate(${angle})`} filter={`url(#${needleShadowId})`}>
        <polygon points="0,3 -1,7.2 0,6 1,7.2" className="fill-fg-dim/60" />
        <polygon points="0,-30 -1.6,-9 0,-3.2 1.6,-9" className="fill-accent-hot" />
        <polygon points="0,-30 0,-3.2 1.6,-9" className="fill-accent/55" />
      </g>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Three norths
// ─────────────────────────────────────────────────────────────────────────────

type NorthId = 'magnetic' | 'grid' | 'true';

interface NorthMeta {
  label: string;
  english: string;
  /** text-* token — also read as the SVG label/arrow color via currentColor */
  color: string;
  /** bg tint (10% opacity) — selected-tab fill, in this north's diagram colour */
  bg: string;
  /** border-* token — selected-tab border, in this north's diagram colour */
  border: string;
  /** degrees from vertical, fan-out for the map diagram only — not real declination data */
  angle: number;
  who: string;
  what: string;
  why: string;
}

const NORTHS: Record<NorthId, NorthMeta> = {
  magnetic: {
    label: 'צפון מגנטי',
    english: 'Magnetic North',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot',
    angle: -30,
    who: 'המצפן שביד שלכם',
    what: 'הכיוון שאליו נמשכת מחט המצפן. הוא "נצמד" למגנט הענק של כדור הארץ, אבל המגנט הזה קצת זז כל שנה.',
    why: 'יתרון: עובד תמיד, בלי סוללות. חיסרון: צריך לתקן את הסטייה שלו כשמשווים אותו למפה.',
  },
  grid: {
    label: 'צפון רשת',
    english: 'Grid North',
    color: 'text-terrain-olive',
    bg: 'bg-terrain-olive/10',
    border: 'border-terrain-olive',
    angle: 22,
    who: 'המפה הצבאית',
    what: 'הצפון של המפות. אלו הקווים הישרים שמודפסים על הנייר. זה הצפון הכי נוח לחישובים בתוך החמ"ל.',
    why: 'יתרון: קל לתכנון נ"צ ומסלולים. חיסרון: הוא לא תואם בדיוק את המצפן או את הכוכבים.',
  },
  true: {
    label: 'צפון אמיתי',
    english: 'True North',
    color: 'text-brand-dark',
    bg: 'bg-brand-dark/10',
    border: 'border-brand-dark',
    angle: 0,
    who: 'כוכבים, GPS וניווט מתקדם',
    what: 'הנקודה המדויקת של הקוטב הצפוני. שם נמצא כוכב הצפון. זהו כיוון קבוע ויציב שלא משתנה לעולם.',
    why: 'יתרון: הכי מדויק שיש. חיסרון: אי אפשר למדוד אותו עם מצפן פשוט בשטח.',
  },
};

const NORTH_IDS: NorthId[] = ['magnetic', 'grid', 'true'];

/** Future Magnific renders (transparent background) land at these paths. */
const NORTH_ICON_ASSET_SRC: Record<NorthId, string> = {
  magnetic: '/assets/isometric/lesson-03-north-magnetic.png',
  grid: '/assets/isometric/lesson-03-north-grid.png',
  true: '/assets/isometric/lesson-03-north-true.png',
};

/**
 * Flip to true once real renders exist at NORTH_ICON_ASSET_SRC (none do yet).
 * Until then every card shows the purpose-drawn SVG glyph (NorthGlyph), bare and
 * in that north's diagram colour (a legend key for its arrow) — never a broken
 * <img>. If a file ever fails to load post-flip, onError falls back to the same glyph.
 */
const useGeneratedNorthIcons = false;

function NorthTypeIcon({ id }: { id: NorthId }) {
  const [broken, setBroken] = useState(false);
  const showImage = useGeneratedNorthIcons && !broken;
  const meta = NORTHS[id];
  return (
    <span
      data-asset-slot={`north-icon-${id}`}
      data-asset-src={NORTH_ICON_ASSET_SRC[id]}
      className="relative flex size-5 shrink-0 items-center justify-center"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
        <img src={NORTH_ICON_ASSET_SRC[id]} alt="" className="size-full object-contain" onError={() => setBroken(true)} />
      ) : (
        <NorthGlyph id={id} className={cn(meta.color, 'size-5')} />
      )}
    </span>
  );
}

function NorthChoiceCard({
  id,
  meta,
  isActive,
  onSelect,
  onKeyDown,
  tabId,
  panelId,
  buttonRef,
}: {
  id: NorthId;
  meta: NorthMeta;
  isActive: boolean;
  onSelect: () => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
  tabId: string;
  panelId: string;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex w-[210px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-start',
        'transition-colors duration-200 ease-snap lg:w-full lg:shrink',
        // Selected = this north's own diagram colour (border + 10% fill) — the single cue.
        isActive
          ? cn(meta.border, meta.bg)
          : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
      )}
    >
      <NorthTypeIcon id={id} />
      <span className="min-w-0 flex-1 font-display text-base font-semibold leading-tight text-fg">
        {meta.label}
      </span>
    </button>
  );
}

// ── Map diagram geometry — a small polar coordinate system anchored at a
//    single bottom-center origin; all three arrows, their angle-arcs and every
//    label are derived from it so the fan-out stays internally consistent.
//    Angles are asymmetric on purpose so the visual gap matches which printed
//    number (6.2° vs 2.3°) it illustrates — bigger gap next to the bigger number.
//    Labels sit beyond each arrow tip; the "total" label hangs off the outer end
//    of its arc so it never lands on the true-north shaft. ──
const MAP_ORIGIN = { x: 250, y: 314 };
const MAP_SHAFT_LEN = 228;
const MAP_HEAD_LEN = 20;
const MAP_HEAD_HALF = 9;
const MAP_LABEL_RADIUS = 260;
const MAP_ARC_RADIUS = 118;
const MAP_ARC_NUMBER_RADIUS = 146;
const MAP_TOTAL_ARC_RADIUS = 178;
const MAP_TOTAL_LABEL = { angle: -42, radius: 184 };

function mapPolar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: MAP_ORIGIN.x + Math.sin(rad) * radius, y: MAP_ORIGIN.y - Math.cos(rad) * radius };
}

/** Triangular arrowhead perpendicular to the shaft direction — works at any angle. */
function mapArrowHead(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const tip = mapPolar(angleDeg, MAP_SHAFT_LEN);
  const base = mapPolar(angleDeg, MAP_SHAFT_LEN - MAP_HEAD_LEN);
  const px = Math.cos(rad);
  const py = Math.sin(rad);
  return {
    tip,
    sideA: { x: base.x - px * MAP_HEAD_HALF, y: base.y - py * MAP_HEAD_HALF },
    sideB: { x: base.x + px * MAP_HEAD_HALF, y: base.y + py * MAP_HEAD_HALF },
  };
}

function mapArcPath(fromDeg: number, toDeg: number, radius: number) {
  const p1 = mapPolar(fromDeg, radius);
  const p2 = mapPolar(toDeg, radius);
  const sweep = toDeg > fromDeg ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 ${sweep} ${p2.x} ${p2.y}`;
}

/** Grid lines printed on the map sheet — aligned to grid north, so the concept is literally visible. */
function mapGridLines(angleDeg: number, spacing: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const d = { x: Math.sin(rad), y: -Math.cos(rad) };
  const n = { x: Math.cos(rad), y: Math.sin(rad) };
  const c = { x: 250, y: 170 };
  const lines: string[] = [];
  for (let k = -8; k <= 8; k++) {
    const a = { x: c.x + n.x * k * spacing, y: c.y + n.y * k * spacing };
    lines.push(`M ${a.x - d.x * 420} ${a.y - d.y * 420} L ${a.x + d.x * 420} ${a.y + d.y * 420}`);
    const b = { x: c.x + d.x * k * spacing, y: c.y + d.y * k * spacing };
    lines.push(`M ${b.x - n.x * 420} ${b.y - n.y * 420} L ${b.x + n.x * 420} ${b.y + n.y * 420}`);
  }
  return lines.join(' ');
}

function NorthArrow({
  angle,
  colorClass,
  label,
  english,
  isActive,
  reduceMotion,
}: {
  angle: number;
  colorClass: string;
  label: string;
  english: string;
  isActive: boolean;
  reduceMotion: boolean;
}) {
  const head = mapArrowHead(angle);
  const shaftEnd = mapPolar(angle, MAP_SHAFT_LEN - MAP_HEAD_LEN + 2);
  const labelAt = mapPolar(angle, MAP_LABEL_RADIUS);
  const transition = { duration: reduceMotion ? 0 : 0.3, ease: EASE };

  return (
    // direction:ltr pins text-anchor to a fixed, predictable edge regardless of
    // the page's RTL cascade — the Hebrew glyphs inside still shape correctly.
    <g style={{ direction: 'ltr' }}>
      {isActive && (
        <motion.line
          x1={MAP_ORIGIN.x}
          y1={MAP_ORIGIN.y}
          x2={shaftEnd.x}
          y2={shaftEnd.y}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={10}
          className={colorClass}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={transition}
        />
      )}
      <motion.line
        x1={MAP_ORIGIN.x}
        y1={MAP_ORIGIN.y}
        x2={shaftEnd.x}
        y2={shaftEnd.y}
        stroke="currentColor"
        strokeLinecap="round"
        className={colorClass}
        initial={false}
        // on activation the shaft re-draws itself out from the origin (cause → effect);
        // deactivating simply fades/thins it back to the muted state
        animate={{
          pathLength: isActive && !reduceMotion ? [0, 1] : 1,
          opacity: isActive ? 1 : 0.3,
          strokeWidth: isActive ? 4.5 : 2,
        }}
        transition={{ ...transition, pathLength: { duration: reduceMotion ? 0 : 0.45, ease: EASE } }}
      />
      <motion.polygon
        points={`${head.tip.x},${head.tip.y} ${head.sideA.x},${head.sideA.y} ${head.sideB.x},${head.sideB.y}`}
        fill="currentColor"
        className={colorClass}
        initial={false}
        animate={{ opacity: isActive ? 1 : 0.3 }}
        transition={{ ...transition, delay: isActive && !reduceMotion ? 0.3 : 0 }}
      />
      <text
        x={labelAt.x}
        y={labelAt.y}
        textAnchor="middle"
        fill="currentColor"
        className={cn(
          'font-display transition-[font-size,color] duration-200',
          isActive ? cn(colorClass, 'text-[17px] font-bold') : 'text-fg-dim text-[14px] font-semibold',
        )}
      >
        {label}
      </text>
      <text
        x={labelAt.x}
        y={labelAt.y + 15}
        textAnchor="middle"
        fill="currentColor"
        className="text-fg-dim font-display text-[12px] font-medium tracking-wide"
      >
        {english}
      </text>
    </g>
  );
}

const MAP_BG_ASSET_SRC = '/assets/isometric/lesson-03-three-norths-map-bg.webp';

/**
 * Flip to true once a real topographic-map render exists at MAP_BG_ASSET_SRC
 * (none does yet). Until then this falls back to a warm paper field; the
 * contour lines and the printed grid are drawn in SVG by NorthsDiagram —
 * never a broken <img>. onError re-falls-back if a future file fails to load.
 */
const useGeneratedMapBackground = false;

function NorthsMapBackground() {
  const [broken, setBroken] = useState(false);
  const showImage = useGeneratedMapBackground && !broken;
  return (
    <div aria-hidden data-asset-slot="three-norths-map-bg" data-asset-src={MAP_BG_ASSET_SRC} className="absolute inset-0 overflow-hidden">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
        <img src={MAP_BG_ASSET_SRC} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <div className="absolute inset-0 bg-paper-bright" />
      )}
    </div>
  );
}

function NorthsDiagram({ active }: { active: NorthId }) {
  const reduceMotion = !!useReducedMotion();
  const drawOrder = [...NORTH_IDS.filter((id) => id !== active), active];

  const arc1Path = mapArcPath(NORTHS.magnetic.angle, NORTHS.true.angle, MAP_ARC_RADIUS);
  const arc2Path = mapArcPath(NORTHS.true.angle, NORTHS.grid.angle, MAP_ARC_RADIUS);
  const totalArcPath = mapArcPath(NORTHS.magnetic.angle, NORTHS.grid.angle, MAP_TOTAL_ARC_RADIUS);
  const num1 = mapPolar((NORTHS.magnetic.angle + NORTHS.true.angle) / 2, MAP_ARC_NUMBER_RADIUS);
  const num2 = mapPolar((NORTHS.true.angle + NORTHS.grid.angle) / 2, MAP_ARC_NUMBER_RADIUS);
  const numTotal = mapPolar(MAP_TOTAL_LABEL.angle, MAP_TOTAL_LABEL.radius);
  // true north is the reference for both deviations → both arcs matter when it's active
  const arc1Relevant = active === 'magnetic' || active === 'true';
  const arc2Relevant = active === 'grid' || active === 'true';
  const fade = { duration: reduceMotion ? 0 : 0.3, ease: EASE };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50">
      <NorthsMapBackground />
      <svg
        viewBox="0 0 500 340"
        className="relative h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`תרשים שלושת כיווני הצפון. הכיוון הנבחר כרגע: ${NORTHS[active].label}`}
      >
        {/* printed map grid, aligned to grid north — lights up when grid north is selected */}
        <motion.path
          d={mapGridLines(NORTHS.grid.angle, 46)}
          fill="none"
          stroke="currentColor"
          className="text-terrain-olive"
          strokeWidth="0.8"
          initial={false}
          animate={{ opacity: active === 'grid' ? 0.3 : 0.1 }}
          transition={fade}
        />

        {/* faint contour lines — illustrative texture only, no real geography */}
        <g fill="none" className="stroke-border-strong" strokeWidth="0.8" opacity="0.3">
          <path d="M10,70 C 100,45 180,95 280,65 C 350,42 430,70 490,52" />
          <path d="M6,130 C 110,105 190,145 290,115 C 360,92 440,120 494,102" />
          <path d="M10,210 C 110,190 200,225 300,198 C 370,178 440,205 492,190" />
          <path d="M20,260 C 120,242 210,270 310,248 C 380,232 440,255 486,242" />
        </g>

        {/* total angular spread — neutral, widest ring */}
        <path d={totalArcPath} fill="none" className="stroke-fg-dim" strokeWidth="1.3" strokeDasharray="2 3" opacity="0.6" />
        {/* per-pair angular differences — tinted to the type they border, lit up when relevant to the active choice */}
        <motion.path
          d={arc1Path}
          fill="none"
          stroke="currentColor"
          className={NORTHS.magnetic.color}
          strokeWidth="1.8"
          strokeDasharray="3 3"
          initial={false}
          animate={{ opacity: arc1Relevant ? 0.9 : 0.25 }}
          transition={fade}
        />
        <motion.path
          d={arc2Path}
          fill="none"
          stroke="currentColor"
          className={NORTHS.grid.color}
          strokeWidth="1.8"
          strokeDasharray="3 3"
          initial={false}
          animate={{ opacity: arc2Relevant ? 0.9 : 0.25 }}
          transition={fade}
        />

        {/* illustrative angular-difference values — not current real-world declination data */}
        <motion.text
          x={num1.x}
          y={num1.y}
          textAnchor="middle"
          fill="currentColor"
          className="text-fg font-display text-[15px] font-bold"
          initial={false}
          animate={{ opacity: arc1Relevant ? 1 : 0.45 }}
          transition={fade}
        >
          6.2°
        </motion.text>
        <motion.text
          x={num2.x}
          y={num2.y}
          textAnchor="middle"
          fill="currentColor"
          className="text-fg font-display text-[15px] font-bold"
          initial={false}
          animate={{ opacity: arc2Relevant ? 1 : 0.45 }}
          transition={fade}
        >
          2.3°
        </motion.text>
        <text x={numTotal.x} y={numTotal.y} textAnchor="middle" fill="currentColor" className="text-fg-muted font-display text-[13px] font-semibold">
          סה״כ 8.5°
        </text>

        {drawOrder.map((id) => (
          <NorthArrow
            key={id}
            angle={NORTHS[id].angle}
            colorClass={NORTHS[id].color}
            label={NORTHS[id].label}
            english={NORTHS[id].english}
            isActive={id === active}
            reduceMotion={reduceMotion}
          />
        ))}

        {/* origin waypoint — neutral, not tied to any one north's color */}
        <circle cx={MAP_ORIGIN.x} cy={MAP_ORIGIN.y} r="8" className="fill-bg stroke-fg-dim/70" strokeWidth="1.6" />
        <circle cx={MAP_ORIGIN.x} cy={MAP_ORIGIN.y} r="3.8" className="fill-fg-dim" />
      </svg>
    </div>
  );
}

function NorthInfoContent({ id }: { id: NorthId }) {
  const meta = NORTHS[id];
  return (
    <>
      <div className="flex items-center gap-2.5">
        <NorthTypeIcon id={id} />
        <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{meta.label}</h4>
      </div>
      <dl className="mt-4 space-y-3.5 text-sm">
        <div>
          <dt className="mb-0.5 font-display text-sm font-semibold text-fg-muted">במה משתמשים?</dt>
          <dd className="text-fg">{meta.who}</dd>
        </div>
        <div>
          <dt className="mb-0.5 font-display text-sm font-semibold text-fg-muted">מה זה בעצם?</dt>
          <dd className="leading-relaxed text-fg">{meta.what}</dd>
        </div>
        <div>
          <dt className="mb-0.5 font-display text-sm font-semibold text-fg-muted">למה כן? / למה לא?</dt>
          <dd className="leading-relaxed text-fg-muted">{meta.why}</dd>
        </div>
      </dl>
    </>
  );
}

/**
 * Info panel (role=tabpanel). All three contents are stacked invisibly in the
 * same grid cell to reserve the tallest height, so switching tabs never makes
 * the card jump; the visible one cross-fades on top (AnimatePresence, wait).
 */
function NorthInfoPanel({ active, panelId, labelledBy }: { active: NorthId; panelId: string; labelledBy: string }) {
  const reduce = !!useReducedMotion();
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="grid h-full rounded-xl bg-bg-accent/60 p-4"
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
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.22, ease: EASE } }}
          exit={reduce ? undefined : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
        >
          <NorthInfoContent id={active} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ThreeNorthsCard() {
  const [active, setActive] = useState<NorthId>('magnetic');
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (id: NorthId) => `${uid}-north-tab-${id}`;
  const panelId = `${uid}-north-panel`;

  // RTL tablist: stacked vertically on desktop, a horizontal strip on mobile —
  // Down/Left step forward, Up/Right step back, so both layouts feel natural.
  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = (idx + 1) % NORTH_IDS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = (idx + NORTH_IDS.length - 1) % NORTH_IDS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = NORTH_IDS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(NORTH_IDS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="surface-elevated p-6 lg:p-8">
      <div className="mb-6">
        <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
          הצפון הוא לא אחד: הכירו את שלושת הצפונים
        </h3>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg-muted">
          זה נשמע מבלבל, אבל בשטח יש 3 סוגי "צפון". כדי לא ללכת לאיבוד, אתם חייבים להכיר את ההבדלים ביניהם.
        </p>
      </div>

      {/* [ בחירה ] [ תרשים ] [ מידע ] בסדר-DOM, ש-order מסדר מחדש לרצף
          1→2→3 שממופה בעקביות הן לערימת המובייל (למעלה→מטה) והן, ב-RTL,
          לרצועה 1=ימין/2=מרכז/3=שמאל בדסקטופ — ולכן אין צורך ב-lg:order
          נפרד לכל שבירת-מסך. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[0.85fr_1.9fr_1fr] lg:gap-6">
        <div
          className="order-1 flex gap-2.5 overflow-x-auto p-1 lg:flex-col lg:gap-3 lg:overflow-visible lg:p-0"
          role="tablist"
          aria-label="בחירת סוג צפון"
        >
          {NORTH_IDS.map((id, idx) => (
            <NorthChoiceCard
              key={id}
              id={id}
              meta={NORTHS[id]}
              isActive={id === active}
              onSelect={() => setActive(id)}
              onKeyDown={(e) => onTabKey(e, idx)}
              tabId={tabId(id)}
              panelId={panelId}
              buttonRef={(el) => {
                tabRefs.current[idx] = el;
              }}
            />
          ))}
        </div>

        <div className="order-2">
          <NorthsDiagram active={active} />
        </div>

        <div className="order-3">
          <NorthInfoPanel active={active} panelId={panelId} labelledBy={tabId(active)} />
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-bg-accent/60 p-4">
        <div className="text-sm leading-relaxed text-fg-muted">
          <strong className="text-fg">שימו לב:</strong> אם תמדדו כיוון במצפן ותסמנו אותו ישר על המפה בלי "לתקן" את הסטייה - תפספסו את המטרה. בישראל הסטייה קטנה, אבל בניווטים ארוכים כל מעלה קובעת.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS-Denied + conclusion
// ─────────────────────────────────────────────────────────────────────────────

function GpsDeniedCard() {
  const items: { title: string; desc: string }[] = [
    {
      title: 'מלחמה אלקטרונית',
      desc: 'האויב משדר רעש"שמחשיך" את הלוויינים ברדיוס של מאות קילומטרים. פתאום המכשיר פשוט מפסיק לעבוד.',
    },
    {
      title: 'מחסומים טבעיים',
      desc: 'לוויינים לא רואים דרך בטון, סלעים או אדמה. במנהרות, בתוך מבנים סבוכים או בואדיות עמוקים - ה-GPS מתעוור.',
    },
    {
      title: 'תקלות והשבתה',
      desc: 'לוויינים יכולים ליפול, להתקלקל או להיפגע. צבא חכם תמיד שומר על היכולת לנצח גם עם מפת נייר ומצפן.',
    },
  ];
  // Static explanation block → a flat info card (no shadow), so the two interactive
  // boards above stay the workspaces of this screen.
  return (
    <div className="surface p-5 sm:p-6">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-8 items-stretch">
        <div className="flex flex-col">
          <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2">למה אסור לסמוך רק על ה-GPS?</h3>
          <p className="text-fg-muted text-base leading-relaxed">
          היום הכל עובד על GPS, וזו בדיוק הבעיה. זה נוח, עד שמישהו מחליט לכבות לכם את האור.
          <br /><br />
          המונח <strong className="text-fg">"GPS-Denied"</strong> מתאר כל מצב שבו המערכות הלווייניות מושבתות. נווט טוב הוא מי ששולט בשיטות ה"אולד-סקול" - מפה, מצפן וספירת צעדים - כי אלו הכלים היחידים שלא צריכים קליטה או סוללה.
          </p>
          <div aria-hidden className="min-h-5 flex-1" />
          <div className="rounded-xl bg-bg-accent/60 px-4 pb-3 pt-4">
            <GpsDeniedIllustration />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={it.title} className="flex flex-1 flex-col justify-center rounded-xl bg-bg-accent/60 p-4">
              <h4 className="text-base font-display font-bold text-fg mb-1">{it.title}</h4>
              <p className="text-sm text-fg-muted leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConclusionCard() {
  // Closing takeaway — a flat info card: no stripe, no icon tile, no entrance motion.
  return (
    <div className="surface p-5 sm:p-6">
      <div>
        <div className="text-sm font-display font-semibold text-fg-muted mb-1">
        השורה התחתונה
        </div>
        <p className="text-fg leading-relaxed text-pretty">
        ניווט הוא לא"בערך". זה <strong className="text-fg">אזימוט מדויק</strong>, הבנה של סוגי הצפונים, ומוכנות מלאה לרגע שבו הטכנולוגיה תפסיק לעבוד. היכולת הזו היא מה שמבדיל בין כוח שמגיע ליעד לבין כוח שהולך לאיבוד בשטח אויב.
        </p>
      </div>
    </div>
  );
}
