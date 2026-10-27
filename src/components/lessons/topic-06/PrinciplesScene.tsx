'use client';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useSpring, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { LESSON_FIT_MAX_HEIGHT, LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { LocationCheckActivity } from './LocationCheckActivity';
import { BearingMap, CompassInstrument } from './CompassMapVisuals';
import { NorthLab } from './north-lab/NorthLab';
import { AZIMUTH_MAX, AZIMUTH_START, backAzimuth, backEquation, formatDeg, shortestTurn } from './compassMapGeometry';

// Navigation reference sources:
// https://www.usgs.gov/faqs/what-do-different-north-arrows-a-usgs-topographic-map-mean
// https://www.ngdc.noaa.gov/geomag/declination.shtml
// https://www.gps.gov/gps-accuracy
// https://www.first.army.mil/Portals/102/STP%2021-1-SMCT.pdf

// ─────────────────────────────────────────────────────────────────────────────
// Laptop fit — each learning screen of this part (compass + map, the three
// norths, the location check) is its own LessonViewportFit, shrunk uniformly
// like a slide so laptops show the same view as the 1920 × 1080 reference.
// ─────────────────────────────────────────────────────────────────────────────

/** Content width of the section at the reference viewport (max-w-lesson minus lg:px-8). */
const SCREEN_REFERENCE_WIDTH = 1344;
/**
 * The scene scrolls through several screens, so the automatic reserves (which
 * count everything below a wrapper) don't apply: a screen in view sits under
 * the fixed 80px site header with the section's 24px top gap, plus 24px of air
 * below it.
 */
const SCREEN_RESERVE_TOP = 104;
const SCREEN_RESERVE_BOTTOM = 24;
/**
 * The compass + map screen (990px), the three-norths lab (1321px) and the
 * location check (818px) are taller than LESSON_FIT_MAX_HEIGHT, so they are
 * fitted as that height rather than their full height: a laptop shrinks them
 * to the same width as the other lesson screens (not a narrower, height-bound
 * one) and their foot scrolls. 1920 × 1080 stays at scale 1.
 */
const VIEW_REFERENCE_HEIGHT = LESSON_FIT_MAX_HEIGHT;

function ScreenFit({ referenceHeight, children }: { referenceHeight?: number; children: ReactNode }) {
  return (
    <LessonViewportFit
      referenceWidth={SCREEN_REFERENCE_WIDTH}
      referenceHeight={referenceHeight}
      reserveTop={SCREEN_RESERVE_TOP}
      reserveBottom={SCREEN_RESERVE_BOTTOM}
    >
      {children}
    </LessonViewportFit>
  );
}

export function PrinciplesScene() {
  return (
    <section id="scene-principles" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      {/* The part header shrinks with the screens, as in the other sub-topics of the lesson. */}
      <ScreenFit>
        <SceneHeader
          step="03.1"
          eyebrow="עקרונות הניווט"
          title={
            <>
            קביעת כיוון: אזימוט וסוגי צפון
            </>
          }
          intro="כדי לקבוע כיוון תנועה, צריך לדעת איך מודדים אזימוט ומאיזה צפון."
        />
      </ScreenFit>

      {/* The azimuth definition sits under the compass it describes, and the GPS
          context opens the location check (LocationCheckActivity). */}

      <ScreenFit referenceHeight={VIEW_REFERENCE_HEIGHT}>
        <AzimuthExplorer />
      </ScreenFit>

      <div className="my-12">
        <ScreenFit referenceHeight={VIEW_REFERENCE_HEIGHT}>
          <NorthLab />
        </ScreenFit>
      </div>

      {/* The location check and the closing line share one screen, as in the techniques sub-topic. */}
      <div className="mt-12">
        <ScreenFit referenceHeight={VIEW_REFERENCE_HEIGHT}>
          <GpsDeniedCard />
          <ConclusionCard />
        </ScreenFit>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Azimuth explorer — "מצפן ומפה": one degree slider drives the compass and the map
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * One azimuth, two synchronized views: a realistic compass (rendered body +
 * live pointers) and a fictional topographic map on which B circles the fixed
 * origin A at a fixed distance. The degree slider is the only control — the
 * compass and the map are passive, north stays up. The back azimuth, its
 * dashed ray and the equation are always shown.
 *
 * Every pointer, number and the equation come from one animated angle
 * (useSmoothedAngle), so mid-sweep they always agree; the slider and assistive
 * tech carry the target value.
 */
function AzimuthExplorer() {
  const [azimuth, setAzimuth] = useState(AZIMUTH_START);
  const angle = useSmoothedAngle(azimuth);
  const eq = backEquation(angle);
  const azimuthLabel = formatDeg(eq.azimuth);
  const backLabel = formatDeg(eq.back);

  // Announce the back azimuth once the learner stops moving the slider for a
  // beat — never mid-drag. Tracked as "the value that settled" so a new value
  // is un-settled in the same render it appears.
  const [settledValue, setSettledValue] = useState<number | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setSettledValue(azimuth), 550);
    return () => window.clearTimeout(t);
  }, [azimuth]);
  const settled = settledValue === azimuth;

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="compass-map">
      {/* Desktop: compass column at the inline start (right), map at the end
          (left) with the card title above it, as in the selected mockup. */}
      <div className="grid gap-x-7 gap-y-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl lg:col-start-2 lg:row-start-1 lg:self-end lg:text-end">
          מהמצפן אל המפה
        </h3>
        <p className="text-lg leading-snug text-black lg:col-start-1 lg:row-start-1 lg:self-end">
          הזיזו את המחוון וצפו בשינוי הכיוון.
        </p>

        <div className="flex flex-col lg:col-start-1 lg:row-start-2">
          <div className="mx-auto aspect-square w-full max-w-[340px]">
            <CompassInstrument angle={angle} azimuthLabel={azimuthLabel} backLabel={backLabel} />
          </div>
          <AzimuthReadouts azimuth={azimuthLabel} back={backLabel} />
          <AzimuthSlider value={azimuth} onChange={setAzimuth} />
          {/* The definition, beside the instrument; the back azimuth is the band below. */}
          <p className="mt-5 text-base leading-relaxed text-black" data-azimuth-definition>
            <strong className="font-bold">אזימוט (Azimuth)</strong> הוא זווית אופקית הנמדדת מכיוון הצפון, עם כיוון השעון: צפון{' '}
            <span dir="ltr">0°</span> או <span dir="ltr">360°</span>, מזרח <span dir="ltr">90°</span>.
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <BearingMap angle={angle} azimuthLabel={azimuthLabel} backLabel={backLabel} />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-bg-accent px-6 py-5 text-center sm:flex-row sm:justify-center sm:gap-10 sm:text-start">
        <p className="max-w-md text-lg leading-snug text-black">
          {/* each "180°" is an LTR island, so the degree sign stays after the digits;
              nowrap keeps a value with its word */}
          אזימוט חוזר מצביע לכיוון ההפוך: מתחת <span className="whitespace-nowrap">ל־<span dir="ltr">180°</span></span>{' '}
          <span className="whitespace-nowrap">מוסיפים <span dir="ltr">180°</span></span>, ומ־<span dir="ltr">180°</span> ומעלה{' '}
          <span className="whitespace-nowrap">מפחיתים <span dir="ltr">180°</span></span>.
        </p>
        <span aria-hidden className="hidden w-px self-stretch bg-border sm:block" />
        <p dir="ltr" className="shrink-0 font-display text-4xl font-bold leading-none tabular-nums text-fg" data-equation>
          {azimuthLabel} {eq.op} 180° = {backLabel}
        </p>
      </div>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {settled ? `אזימוט חוזר ${backAzimuth(azimuth)} מעלות` : ''}
      </span>
    </div>
  );
}

/** Azimuth and back azimuth as plain display text — azimuth on the left, as in the mockup. */
function AzimuthReadouts({ azimuth, back }: { azimuth: string; back: string }) {
  return (
    <div className="mt-1 flex flex-row-reverse items-stretch" data-readouts>
      <div className="flex-1 text-center">
        <div dir="ltr" className="font-display text-5xl font-bold leading-none tabular-nums text-fg" data-readout="azimuth">
          {azimuth}
        </div>
        <div className="mt-2 text-xl font-bold leading-tight text-fg">אזימוט</div>
      </div>
      <span aria-hidden className="w-px bg-border" />
      <div className="flex-1 text-center">
        <div dir="ltr" className="font-display text-5xl font-bold leading-none tabular-nums text-fg" data-readout="back">
          {back}
        </div>
        <div className="mt-2 text-xl leading-tight text-black">אזימוט חוזר</div>
      </div>
    </div>
  );
}

/**
 * The degree slider — the activity's only control. Like the compass it is an
 * instrument scale, so it is NOT mirrored for RTL: 0° at the left, 359° at the
 * right. Scale marks sit at their true positions (90° at 90/359 of the travel),
 * aligned with the thumb centre. Arrows ±1°, Shift + arrows ±10°, Home/End and
 * PageUp/PageDown work as on any native slider.
 */
const SLIDER_THUMB_PX = 26;
const sliderPos = (v: number) => `calc(${SLIDER_THUMB_PX / 2}px + (100% - ${SLIDER_THUMB_PX}px) * ${v / AZIMUTH_MAX})`;

function AzimuthSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const marks = [0, 90, 180, 270, AZIMUTH_MAX];
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 10 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -10 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(Math.max(0, Math.min(AZIMUTH_MAX, value + step)));
  };
  return (
    <div dir="ltr" className="relative mt-5 w-full" data-slider>
      <div className="relative h-[26px]">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <div
          aria-hidden
          className="absolute start-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-accent"
          style={{ width: sliderPos(value) }}
        />
        <input
          type="range"
          min={0}
          max={AZIMUTH_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={onKeyDown}
          aria-label="אזימוט"
          aria-valuetext={`${value} מעלות, ${directionOf(value)}`}
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
            <span className="mt-1 whitespace-nowrap text-sm font-semibold leading-none tabular-nums text-fg">{v}°</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Drives a single damped-spring angle toward `target`, always taking the shortest
 * rotational path (so 359°→0° sweeps forward 1°, never backward through 358°).
 * Shared by every pointer and number so they can never drift apart — see
 * AzimuthExplorer. Under prefers-reduced-motion, the raw target is returned
 * directly and the spring is left idle.
 */
function useSmoothedAngle(target: number) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(target, { stiffness: 170, damping: 22, mass: 0.6 });
  const [angle, setAngle] = useState(target);
  const unwrapped = useRef(target);
  useEffect(() => {
    unwrapped.current += shortestTurn(unwrapped.current, target);
    spring.set(unwrapped.current);
  }, [target, spring]);
  useMotionValueEvent(spring, 'change', (v) => setAngle(v));
  return reduceMotion ? target : angle;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS-Denied + conclusion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GPS-Denied station: the location check without GPS — an eye-level 3D
 * observation and a printed map of one fictional terrain, with the three short
 * reasons GPS may be unavailable underneath (LocationCheckActivity).
 */
function GpsDeniedCard() {
  return <LocationCheckActivity />;
}

function ConclusionCard() {
  // Closing takeaway — a flat info card: no stripe, no icon tile, no entrance motion.
  return (
    <div className="mt-6 surface p-5 sm:p-6">
      <p className="text-base text-fg leading-relaxed text-pretty">
        מודדים <strong className="text-fg">אזימוט ביחס לצפון המתאים</strong>, ובודקים את המיקום לפי כיוון, מרחק וסימני שטח, גם כשאין GPS.
      </p>
    </div>
  );
}
