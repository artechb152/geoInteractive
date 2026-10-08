'use client';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AnimatePresence, motion, useSpring, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { NorthGlyph } from './PrinciplesVisuals';
import { LocationCheckActivity } from './LocationCheckActivity';
import { BearingMap, CompassInstrument } from './CompassMapVisuals';
import { AZIMUTH_MAX, AZIMUTH_START, backAzimuth, backEquation, formatDeg, shortestTurn } from './compassMapGeometry';

const EASE = [0.22, 1, 0.36, 1] as const;

// Navigation reference sources:
// https://www.usgs.gov/faqs/what-do-different-north-arrows-a-usgs-topographic-map-mean
// https://www.ngdc.noaa.gov/geomag/declination.shtml
// https://www.gps.gov/gps-accuracy
// https://www.first.army.mil/Portals/102/STP%2021-1-SMCT.pdf

export function PrinciplesScene() {
  return (
    <section id="scene-principles" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.1"
        eyebrow="עקרונות הניווט"
        title={
          <>
          קביעת כיוון: אזימוט וסוגי צפון
          </>
        }
        intro="כדי לקבוע כיוון תנועה, צריך לדעת כיצד מודדים אזימוט ולאיזה צפון מתייחסים. בחלק זה נתרגל אזימוט ואזימוט חוזר, נכיר שלושה סוגי צפון ונבחן את מגבלות הניווט באמצעות GPS."
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
          אזימוט הוא זווית אופקית הנמדדת <strong className="text-fg">מכיוון הצפון, עם כיוון השעון</strong>. צפון הוא 0° או 360°, ומזרח הוא 90°. אזימוט חוזר מציין את הכיוון ההפוך, בהפרש של 180°.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
          ניווט ללא GPS זמין
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
          כשקליטת אותות הלוויין חסומה או משובשת, אי אפשר להסתמך על GPS לקביעת המיקום. במצב זה נעזרים <strong className="text-fg">במפה, במצפן ובסימני השטח</strong> כדי לשמור על ההתמצאות.
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
// Three norths
// ─────────────────────────────────────────────────────────────────────────────

type NorthId = 'magnetic' | 'grid' | 'true';

interface NorthMeta {
  label: string;
  english: string;
  /** text-* token — also read as the SVG label/arrow color via currentColor */
  color: string;
  /** bg tint (10% opacity) — selected-tab fill and tabpanel result tint, in this north's diagram colour */
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
    who: 'מדידת כיוון במצפן מגנטי',
    what: 'הכיוון שמורה הקצה הצפוני של מחט המצפן, בהתאם לשדה המגנטי המקומי של כדור הארץ.',
    why: 'ההפרש בינו לצפון אמיתי משתנה לפי המקום והזמן. מתכות ושדות מגנטיים סמוכים עלולים לשבש את הקריאה.',
  },
  grid: {
    label: 'צפון רשת',
    english: 'Grid North',
    color: 'text-terrain-olive',
    bg: 'bg-terrain-olive/10',
    border: 'border-terrain-olive',
    angle: 22,
    who: 'תכנון ומדידת כיוון במפת רשת',
    what: 'כיוון הצפון לאורך הקווים האנכיים של רשת הקואורדינטות במפה.',
    why: 'עשוי להיות שונה מצפון אמיתי ומצפון מגנטי. במעבר בין המפה למצפן מתחשבים בהפרש המתאים.',
  },
  true: {
    label: 'צפון אמיתי',
    english: 'True North',
    color: 'text-brand-dark',
    bg: 'bg-brand-dark/10',
    border: 'border-brand-dark',
    angle: 0,
    who: 'ייחוס גאוגרפי למדידת כיוונים',
    what: 'הכיוון אל הקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי.',
    why: 'מצפן מגנטי אינו מורה בהכרח לכיוון זה. ההפרש הזוויתי בין צפון מגנטי לצפון אמיתי נקרא נטייה מגנטית.',
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
          <dt className="mb-0.5 text-base font-display font-bold text-fg">שימוש עיקרי</dt>
          <dd className="text-fg">{meta.who}</dd>
        </div>
        <div>
          <dt className="mb-0.5 text-base font-display font-bold text-fg">הגדרה</dt>
          <dd className="leading-relaxed text-fg">{meta.what}</dd>
        </div>
        <div>
          <dt className="mb-0.5 text-base font-display font-bold text-fg">דגש לשימוש</dt>
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
 * It is the result of the tab choice, so the inset is tinted with the chosen
 * north's diagram colour (/10) — one cue family with the tab and its arrow.
 */
function NorthInfoPanel({ active, panelId, labelledBy }: { active: NorthId; panelId: string; labelledBy: string }) {
  const reduce = !!useReducedMotion();
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      tabIndex={0}
      className={cn('grid h-full rounded-xl p-4 transition-colors duration-200 ease-snap', NORTHS[active].bg)}
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
          שלושה סוגי צפון
        </h3>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg-muted">
          אזימוט נמדד ביחס לסוג מסוים של צפון: מגנטי, רשת או אמיתי. בחרו בכל סוג כדי לראות את ההגדרה ואת השימוש בו.
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
          <strong className="text-fg">במעבר בין מפה למצפן:</strong> בודקים את ההפרש בין צפון הרשת לצפון המגנטי ומתקנים את האזימוט בהתאם לנתונים העדכניים לאזור. הזוויות בתרשים הן להמחשה בלבד; המרווחים בין החצים אינם בקנה מידה.
        </div>
      </div>
    </div>
  );
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
    <div className="surface p-5 sm:p-6">
      <div>
        <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">
        עקרונות מרכזיים
        </div>
        <p className="text-base text-fg leading-relaxed text-pretty">
        קביעת כיוון נשענת על <strong className="text-fg">מדידת אזימוט ביחס לצפון המתאים</strong>. אזימוט חוזר מציין את הכיוון ההפוך, ובדיקת המיקום נעשית בעזרת מרחק וסימני שטח. שילוב הכלים האלה מאפשר לנווט גם כשאין אפשרות להסתמך על GPS.
        </p>
      </div>
    </div>
  );
}
