'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { RouteMap, type RouteLeg } from './PlanningRouteMap';
type Checkpoint = {
id: string;
label: string;
feature: string;
icon: IconName;
};
const CHECKPOINTS: Checkpoint[] = [
 { id: '1', label: 'נקודה 1: נקודת ההתחלה (נ.ה)', feature: 'יציאה לנקודה 2 — אזימוט 035°, כ־500 מ׳: מאמתים את נקודת ההתחלה במפה ובשטח, ובודקים את הכיוון ואת המרחק לעיקול הנחל.', icon: 'flag' },
 { id: '2', label: 'נקודה 2: עיקול הנחל', feature: 'אזימוט 035°, כ־500 מ׳ מנקודה 1: מזהים את עיקול הנחל ומשווים את צורת הערוץ וסביבתו למפה. לאחר אימות המיקום ממשיכים לכיוון האוכף.', icon: 'wave' },
 { id: '3', label: 'נקודה 3: אוכף הרכס', feature: 'אזימוט 065°, כ־700 מ׳ מנקודה 2: מזהים את האוכף שבין שתי הפסגות. בודקים את התאמת צורת הקרקע, הכיוון והמרחק לתכנון כדי לאמת את המיקום.', icon: 'mountain' },
 { id: '4', label: 'נקודה 4: חציית דרך עפר', feature: 'אזימוט 050°, כ־500 מ׳ מנקודה 3: מזהים את דרך העפר ובודקים את כיוונה ואת נקודת החצייה ביחס לתכנון. ממשיכים ממנה אל החורשה.', icon: 'truck' },
 { id: '5', label: 'נקודה 5: נקודת הסיום (נ.ס)', feature: 'אזימוט 040°, כ־600 מ׳ מנקודה 4: עוברים בחורשה ומזהים את קבוצת האורנים בקרקע הסלעית. מאמתים את נקודת הסיום לפי הסימנים שסביבה והמרחק שעברנו.', icon: 'target' },
];
export function PlanningScene() {
return (
 <section id="scene-planning" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.2"
eyebrow="תכנון ציר ותנועה"
title={
          <>
          תכנון ציר: בניית <span className="gradient-text">סיפור דרך</span>
          </>
        }
intro="לפני היציאה מחלקים את המסלול לקטעים ומתארים את הכיוון, המרחק וסימני השטח בכל קטע. התכנון מסייע לעקוב אחר ההתקדמות ולזהות סטייה מהמסלול."
 />

 {/* Concept · read before the builder — plain info text (no cards), so the builder is the first strong surface */}
 <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-12">
 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 סיפור דרך <span className="font-medium text-fg-muted text-base md:text-lg">(Route Description)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 תיאור מסודר של המסלול, הכולל <strong className="text-fg">כיוונים, מרחקים וסימנים צפויים בשטח</strong>. בכל קטע בוחרים נקודות שבהן אפשר לבדוק את המיקום ביחס למפה.
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 תכנון מראש ובקרה בתנועה
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 הכנת סיפור הדרך מרכזת את הנתונים הדרושים לפני היציאה. במהלך התנועה ממשיכים <strong className="text-fg">להשוות בין התכנון לשטח</strong> ולבדוק כל אי־התאמה.
 </p>
 </div>
 </div>

 <RouteStoryBuilder />

 <div className="my-12">
 <PacingDemo />
 </div>

 <ConclusionCard />
 </section>
 );
}
// Azimuth (°) + distance (m) of each checkpoint's leg — the same numbers the
// card text opens with. They drive the to-scale map geometry and its leg tags.
// Card 1 = the departure bearing out of נ.ה; cards 2–5 = the leg arriving there.
const LEGS: RouteLeg[] = [
  { az: 35, m: 500 },
  { az: 35, m: 500 },
  { az: 65, m: 700 },
  { az: 50, m: 500 },
  { az: 40, m: 600 },
];

function RouteStoryBuilder() {
const [active, setActive] = useState(0);
const titleId = useId();
const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
const last = CHECKPOINTS.length - 1;

const go = (i: number, focus = false) => {
  const next = Math.max(0, Math.min(last, i));
  setActive(next);
  if (focus) btnRefs.current[next]?.focus();
};

// ↓ / ← (forward in RTL) → next checkpoint · ↑ / → → previous · Home / End
const onListKey = (e: React.KeyboardEvent<HTMLOListElement>) => {
  const from = btnRefs.current.indexOf(e.target as HTMLButtonElement);
  const base = from >= 0 ? from : active;
  const target: Record<string, number> = {
    ArrowDown: base + 1,
    ArrowLeft: base + 1,
    ArrowUp: base - 1,
    ArrowRight: base - 1,
    Home: 0,
    End: last,
  };
  if (!(e.key in target)) return;
  e.preventDefault();
  go(target[e.key], true);
};

return (
 <div data-qa="route-builder" className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6 items-start">
 <div>
 <div id={titleId} className="font-display text-lg font-bold leading-snug text-fg md:text-xl">
 סיפור דרך בחמש נקודות
 </div>
 <p className="mt-1 text-sm text-fg-muted leading-relaxed mb-4">
 בחרו נקודה כדי לראות במפה את קטע הדרך הקשור אליה. בכל תיאור מופיעים <strong className="text-fg">אזימוט</strong>, <strong className="text-fg">מרחק משוער</strong> וסימנים לבדיקת המיקום. הנתונים הם דוגמה לימודית.
 </p>
 <ol aria-labelledby={titleId} onKeyDown={onListKey} className="space-y-2.5">
 {CHECKPOINTS.map((c, i) => {
const isActive = active === i;
const passed = active > i;
// Split the bearing/distance lead from the description at the first colon.
const cut = c.feature.indexOf(':');
const head = cut > -1 ? c.feature.slice(0, cut + 1) : '';
const tail = cut > -1 ? c.feature.slice(cut + 1) : c.feature;
return (
 <li key={c.id}>
 <button
 type="button"
 ref={(el) => {
   btnRefs.current[i] = el;
 }}
 onClick={() => go(i)}
 aria-current={isActive ? 'step' : undefined}
 className={cn(
 // the list sits on the textured page: tint is a layer over a solid white base (same recipe as lesson 2's on-page options)
 'group relative isolate w-full p-4 text-start flex items-start gap-3 rounded-xl border bg-bg-elevated cursor-pointer transition-colors duration-200 ease-snap before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
 isActive
   ? 'border-accent before:bg-accent/10'
   : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]'
 )}
 >
 {/* state badge — mirrors the map marker: orange = current, sage ✓ = passed */}
 <span
className={cn(
 'size-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200',
isActive
 ? 'bg-accent text-white'
 : passed
 ? 'bg-brand/15 text-brand-dark'
 : 'text-fg-muted'
 )}
 >
 {passed && !isActive ? (
 <Icon name="check" size={18} strokeWidth={2.5} />
 ) : (
 <Icon name={c.icon} size={18} />
 )}
 </span>
 <div className="flex-1 min-w-0 text-start">
 <div className="font-display font-bold text-base leading-tight text-fg">
 {c.label}
 </div>
 <div className="text-sm mt-1 leading-relaxed text-fg-muted">
 {head && <span className="font-display font-bold tabular-nums text-fg">{head}</span>}
 {tail}
 </div>
 </div>
 </button>
 </li>
 );
 })}
 </ol>
 </div>

 <div className="lg:sticky lg:top-24 surface-elevated p-5 sm:p-6">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
 <span className="text-sm font-display font-semibold text-fg-muted">
 סיפור דרך · 5 נקודות אימות
 </span>
 <div className="flex items-center gap-2.5">
 <button
   type="button"
   onClick={() => go(active - 1)}
   disabled={active === 0}
   aria-label="הנקודה הקודמת"
   className="size-9 rounded-xl border border-border bg-bg-elevated grid place-items-center text-fg-muted transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] hover:text-fg disabled:opacity-40 disabled:pointer-events-none"
 >
   <Icon name="arrow-right" size={16} strokeWidth={2} />
 </button>
 <div className="flex items-center gap-1" aria-hidden>
   {CHECKPOINTS.map((c, i) => (
     <span
       key={c.id}
       className={cn(
         'h-1.5 rounded-full transition-all duration-300 ease-snap motion-reduce:transition-none',
         i === active ? 'w-6 bg-accent' : i < active ? 'w-3 bg-brand' : 'w-3 bg-border'
       )}
     />
   ))}
 </div>
 <span dir="ltr" className="text-sm font-display font-bold tabular-nums text-fg-muted w-8 text-center" aria-hidden>
   {active + 1}/{CHECKPOINTS.length}
 </span>
 <button
   type="button"
   onClick={() => go(active + 1)}
   disabled={active === last}
   aria-label="הנקודה הבאה"
   className="size-9 rounded-xl border border-border bg-bg-elevated grid place-items-center text-fg-muted transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] hover:text-fg disabled:opacity-40 disabled:pointer-events-none"
 >
   <Icon name="arrow-left" size={16} strokeWidth={2} />
 </button>
 </div>
 </div>
 <div className="overflow-hidden rounded-xl border border-border/70">
 <RouteMap
   legs={LEGS}
   activeStep={active}
   onSelect={(i) => go(i)}
   ariaLabel={`מפת סיפור הדרך — ${CHECKPOINTS[active].label}`}
 />
 </div>
 <p className="sr-only" aria-live="polite">
 {CHECKPOINTS[active].label}
 </p>
 </div>
 </div>
 );
}

// Footprint pair (walking toward inline-end — the same way the RTL slider grows)
function FootPair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={cn('h-7 w-10', className)} aria-hidden>
      <g fill="currentColor">
        {/* rear foot (upper): sole + toes, pointing toward inline-end */}
        <ellipse cx={19.5} cy={5.8} rx={5.4} ry={2.4} />
        <circle cx={12.3} cy={4.2} r={1.15} />
        <circle cx={11.9} cy={6.5} r={0.95} />
        <circle cx={12.6} cy={8.4} r={0.75} />
        {/* front foot (lower) */}
        <ellipse cx={10} cy={14} rx={5.4} ry={2.4} />
        <circle cx={2.8} cy={12.4} r={1.15} />
        <circle cx={2.4} cy={14.7} r={0.95} />
        <circle cx={3.1} cy={16.6} r={0.75} />
      </g>
    </svg>
  );
}

const PACE_MIN = 50;
const PACE_MAX = 2000;
const THUMB_PX = 24;
const TRAIL_MARKS = 10;
/** inline-start offset of a slider fraction, matching the native thumb centre */
const alongTrack = (fr: number) => `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${fr})`;

function PacingDemo() {
const [distance, setDistance] = useState(500);
const stepLength = 1.5; // Illustrative double-pace length, not a universal average.
const paces = Math.round(distance / stepLength);
const reduce = useReducedMotion();
const frac = (distance - PACE_MIN) / (PACE_MAX - PACE_MIN);
const lastMark = Math.floor(frac * (TRAIL_MARKS - 1) + 1e-6);
// the big count rolls to the new value (instant under reduced motion)
const paceSpring = useSpring(paces, { stiffness: 240, damping: 32 });
const pacesShown = useTransform(paceSpring, (v) => Math.round(v));
useEffect(() => {
  if (reduce) paceSpring.jump(paces);
  else paceSpring.set(paces);
}, [paces, reduce, paceSpring]);
return (
 <div data-qa="pacing" className="surface-elevated p-6 lg:p-8">
 <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">ספירת צעדים: הערכת מרחק</h3>
 <p className="mt-2 mb-8 max-w-2xl text-base leading-relaxed text-fg-muted">
 צעד כפול הוא זוג צעדים; סופרים בכל פעם שאותה רגל נוגעת בקרקע. שנו את המרחק במחוון כדי לראות את מספר הצעדים הכפולים המשוער. בהדגמה מניחים אורך של 1.5 מטר לצעד כפול; בפועל נדרשת מדידה אישית.
 </p>

 <div className="grid md:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1fr)] gap-6 md:gap-5 items-stretch">
 <div className="rounded-xl bg-bg-accent/60 p-5 sm:p-6 flex flex-col justify-center">
 <div className="flex justify-between items-end mb-4">
 <span className="text-sm font-display font-semibold text-fg-muted">מרחק מתוכנן:</span>
 <span className="text-4xl font-display font-bold text-fg tabular-nums">{distance} מ׳</span>
 </div>

 {/* footprint trail — grows with the distance, head mark rides above the thumb */}
 <div className="relative h-8" aria-hidden>
 <div className="absolute inset-x-3 top-1/2 border-t border-dashed border-border-strong/40" />
 {Array.from({ length: TRAIL_MARKS }).map((_, i) => {
   const on = i <= lastMark;
   const isHead = i === lastMark;
   return (
     <span
       key={i}
       className={cn(
         'absolute top-1/2 -translate-y-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2 transition-[opacity,transform] duration-200 ease-snap motion-reduce:transition-none',
         on ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
         isHead ? 'text-accent' : 'text-fg-dim/75'
       )}
       style={{ insetInlineStart: alongTrack(i / (TRAIL_MARKS - 1)) }}
     >
       <FootPair />
     </span>
   );
 })}
 </div>

 <div className="relative h-8 mt-1">
 <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-bg-elevated border border-border/80" aria-hidden />
 <div
   className="absolute start-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-cta-ember"
   style={{ width: alongTrack(frac) }}
   aria-hidden
 />
 <input
type="range"
min={50}
max={2000}
step={50}
value={distance}
onChange={(e) => setDistance(Number(e.target.value))}
className={cn(
  'absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent rounded-full',
  '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-1 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent'
)}
aria-label="מרחק במטרים"
aria-valuetext={`${distance} מטרים`}
 />
 </div>
 <div className="relative h-7 mt-1.5 text-[13px] font-display font-medium text-fg-muted">
 {[50, 500, 1000, 1500, 2000].map((val) => {
 const pct = ((val - 50) / (2000 - 50)) * 100; // מיקום אמיתי על הסרגל (מהקצה הימני, RTL)
 return (
 <span
 key={val}
 className={cn(
   'absolute top-0 flex flex-col items-center rtl:translate-x-1/2 ltr:-translate-x-1/2 whitespace-nowrap tabular-nums transition-colors duration-200',
   distance >= val && 'text-fg font-semibold'
 )}
 style={{ insetInlineStart: alongTrack(pct / 100) }}
 >
 <span className="block h-1.5 w-px bg-border-strong/70 mb-0.5" aria-hidden />
 {val === 50 ? '50 מ׳' : val.toLocaleString()}
 </span>
 );
 })}
 </div>
 </div>

 {/* cause → effect: slider distance drives the pace count */}
 <div className="hidden md:grid place-items-center text-fg-muted" aria-hidden>
 <Icon name="arrow-left" size={20} strokeWidth={2} />
 </div>

 <div className="p-6 rounded-xl flex flex-col items-center justify-center text-center bg-bg-accent/60">
 <div className="text-sm font-display font-semibold text-fg-muted mb-2">מספר משוער</div>
 <motion.div className="text-6xl font-display font-bold text-fg tabular-nums mb-2" aria-hidden>{pacesShown}</motion.div>
 <span className="sr-only" aria-live="polite">כ־{paces} צעדים כפולים למרחק של {distance} מטרים</span>
 <div className="text-sm font-bold text-fg">צעדים כפולים</div>
 <div className="text-sm text-fg-muted mt-4 tabular-nums">חישוב לדוגמה: {distance} מ׳ ÷ 1.5 מ׳ ≈ {paces} צעדים כפולים</div>
 </div>
 </div>

 <div className="mt-8 grid sm:grid-cols-2 gap-6">
 <div className="flex gap-3 items-start">
 <div className="w-4 shrink-0 text-center font-display font-bold text-sm leading-relaxed text-fg-muted">1</div>
 <p className="text-sm text-fg-muted leading-relaxed">
 <strong className="text-fg">מדידה אישית:</strong> הולכים קטע מדוד של 100 מטר במישור וסופרים צעדים כפולים. חוזרים על המדידה כדי לקבל אומדן מייצג.
 </p>
 </div>
 <div className="flex gap-3 items-start">
 <div className="w-4 shrink-0 text-center font-display font-bold text-sm leading-relaxed text-fg-muted">!</div>
 <p className="text-sm text-fg-muted leading-relaxed">
 <strong className="text-fg">התאמה לתנאים:</strong> שיפוע, קרקע לא אחידה ומשקל הציוד משפיעים על אורך הצעד. מתרגלים את הספירה בתנאים דומים ומשלבים אותה עם בדיקת סימני שטח.
 </p>
 </div>
 </div>
 </div>
 );
}
function ConclusionCard() {
return (
 <div className="surface p-5 sm:p-6">
 <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">
 סיכום התכנון
 </div>
 <p className="text-base text-fg leading-relaxed text-pretty">
 <strong className="text-fg">סיפור דרך</strong> מקשר בין המסלול במפה לבין הסימנים הצפויים בשטח. <strong className="text-fg">ספירת צעדים</strong> מוסיפה אומדן למרחק שעברנו. השילוב בין כיוון, מרחק וסימני שטח מסייע לבדוק את ההתקדמות לאורך המסלול.
 </p>
 </div>
 );
}
