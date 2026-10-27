'use client';
import { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { RouteStoryBuilder } from './route-story/RouteStoryBuilder';
import { RadioRow } from './terrain-nav/RadioRow';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
// Laptop fit — every screen of this part is laid out at the 1920×1080 reference
// width and shrunk uniformly (never enlarged) to the room the site header and the
// lesson side nav leave. width = the section's content box at the reference
// viewport (max-w-lesson 1408 − 2 × lg:px-8). Screens 2–3 sit below the fold, so
// their height budget is one viewport minus the fixed site header (--header-h,
// 80px) and the 24px page inset above and below, not their page offset.
const PLANNING_FIT = { width: 1344, reserveTop: 104, reserveBottom: 24 } as const;

export function PlanningScene() {
return (
 <section id="scene-planning" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
 {/* Screen 1 · title + the one definition. Each screen of this part shrinks on its own, like a slide (see PLANNING_FIT). */}
 <LessonViewportFit referenceWidth={PLANNING_FIT.width} reserveBottom={PLANNING_FIT.reserveBottom}>
 <SceneHeader
step="03.2"
eyebrow="תכנון ציר ותנועה"
title={
          <>
          תכנון ציר: בניית <span className="gradient-text">סיפור דרך</span>
          </>
        }
intro={
 <>
 <strong className="text-fg">סיפור דרך (Route Description)</strong> הוא תיאור מסודר של המסלול בקטעים: לכל קטע כיוון, מרחק וסימני שטח. בסוף כל קטע בודקים את המיקום מול המפה.
 </>
}
 />
 </LessonViewportFit>

 {/* Screen 2 · route-story builder (list + map) */}
 <LessonViewportFit referenceWidth={PLANNING_FIT.width} reserveTop={PLANNING_FIT.reserveTop} reserveBottom={PLANNING_FIT.reserveBottom}>
 <RouteStoryBuilder />
 </LessonViewportFit>

 {/* Screen 3 · pacing demo — mt-12 sits on the unscaled wrapper, so the gap between the activities is the
     same 48px as everywhere else in the lesson */}
 <LessonViewportFit referenceWidth={PLANNING_FIT.width} reserveTop={PLANNING_FIT.reserveTop} reserveBottom={PLANNING_FIT.reserveBottom} className="mt-12">
 <PacingDemo />
 </LessonViewportFit>

 </section>
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

/** Double-pace lengths to compare (metres): the example's 1.5 and one shorter, one longer stride. */
const PACE_OPTIONS = [1.4, 1.5, 1.6] as const;
const fmtPace = (p: number) => p.toFixed(1);
const fmtStep = (p: number) => String(Math.round((p / 2) * 100) / 100);

/**
 * One stride: four footprints walking toward inline-end (left), a single step
 * between the two feet, a double step from one foot to the same foot again —
 * the one that is counted. A schematic, not a map; text anchors are explicit.
 */
function StepDiagram({ pace }: { pace: number }) {
  const xs = [86, 62, 38, 14];
  return (
    <svg
      viewBox="0 0 100 50"
      className="block w-full h-auto"
      role="img"
      aria-label={`צעד: מרגל אחת לרגל השנייה, כ־${fmtStep(pace)} מ׳. צעד כפול: עד שאותה רגל נוגעת שוב בקרקע, ${fmtPace(pace)} מ׳. סופרים את הצעדים הכפולים.`}
    >
      <line x1={3} y1={25} x2={97} y2={25} className="stroke-border-strong" strokeWidth={0.4} strokeDasharray="1.2 1" opacity={0.6} />
      {xs.map((x, k) => (
        <g key={k} transform={`translate(${x} ${k % 2 === 1 ? 21 : 29})`} className={k % 2 === 0 ? 'fill-accent' : 'fill-fg-dim'}>
          <ellipse cx={2.6} cy={0} rx={5.2} ry={2.3} />
          <circle cx={-3.9} cy={-1.6} r={1.05} />
          <circle cx={-4.4} cy={0.4} r={0.9} />
          <circle cx={-3.8} cy={2.2} r={0.72} />
        </g>
      ))}
      {/* single step: between the two different feet */}
      <path d={`M ${xs[0] + 2.6} 16.5 V 12.5 H ${xs[1] + 2.6} V 16.5`} className="stroke-fg-muted" strokeWidth={0.55} fill="none" />
      <text x={(xs[0] + xs[1]) / 2 + 2.6} y={8.6} textAnchor="middle" fontSize={5.6} fontWeight={600} className="fill-fg font-display">
        {`צעד ≈ ${fmtStep(pace)} מ׳`}
      </text>
      {/* double step: from a foot to the same foot again — the one that is counted */}
      <path d={`M ${xs[0] + 2.6} 33.5 V 37.5 H ${xs[2] + 2.6} V 33.5`} className="stroke-accent" strokeWidth={0.8} fill="none" />
      <text x={(xs[0] + xs[2]) / 2 + 2.6} y={46.4} textAnchor="middle" fontSize={5.6} fontWeight={800} className="fill-ember-deep font-display">
        {`צעד כפול = ${fmtPace(pace)} מ׳`}
      </text>
    </svg>
  );
}

function PacingDemo() {
const [distance, setDistance] = useState(500);
const [pace, setPace] = useState<number>(1.5); // the example's double pace; each navigator measures their own
const paceLabelId = useId();
const paces = Math.round(distance / pace);
const steps = Math.round((distance / pace) * 2);
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
 <p className="mt-2 mb-6 max-w-3xl text-base leading-relaxed text-fg-muted">
 את המרחק מתכננים במטרים, ובשטח סופרים <strong className="text-fg">צעדים כפולים</strong>: צעד כפול לכל נגיעה של אותה רגל בקרקע. אורך הצעד הכפול שונה מאדם לאדם.
 </p>

 <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)_auto_minmax(0,0.85fr)] gap-6 md:gap-5 items-stretch">
 {/* what is counted: one step vs one double step, at the chosen personal length */}
 <div className="rounded-xl bg-bg-accent/60 p-5 flex flex-col" data-qa="pace-length">
 <div id={paceLabelId} className="text-sm font-display font-semibold text-fg-muted">אורך הצעד הכפול שלכם (לפי מדידה אישית):</div>
 <RadioRow
   labelledBy={paceLabelId}
   options={PACE_OPTIONS.map((p) => ({ id: p, label: `${fmtPace(p)} מ׳` }))}
   value={pace}
   onChange={(p) => setPace(p)}
   className="mt-2"
   data="pace"
 />
 <div className="mt-auto pt-3">
 <StepDiagram pace={pace} />
 </div>
 </div>

 <div className="rounded-xl bg-bg-accent/60 p-5 sm:p-6 flex flex-col justify-center">
 <div className="flex justify-between items-end mb-4">
 <span className="text-sm font-display font-semibold text-fg-muted">מרחק מתוכנן:</span>
 <span className="text-4xl font-display font-bold text-fg tabular-nums">{distance.toLocaleString('en-US')} מ׳</span>
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
aria-label="מרחק מתוכנן במטרים"
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
 {val === 50 ? '50 מ׳' : val.toLocaleString('en-US')}
 </span>
 );
 })}
 </div>
 </div>

 {/* cause → effect: distance and pace length drive the count */}
 <div className="hidden md:grid place-items-center text-fg-muted" aria-hidden>
 <Icon name="arrow-left" size={20} strokeWidth={2} />
 </div>

 <div className="p-6 rounded-xl flex flex-col items-center justify-center text-center bg-bg-accent/60" data-qa="pace-result">
 <div className="text-sm font-display font-semibold text-fg-muted mb-2">סופרים בערך</div>
 <motion.div className="text-6xl font-display font-bold text-fg tabular-nums mb-2" aria-hidden>{pacesShown}</motion.div>
 <span className="sr-only" aria-live="polite">כ־{paces} צעדים כפולים, שהם כ־{steps} צעדים, למרחק של {distance} מטרים בצעד כפול של {fmtPace(pace)} מטרים</span>
 <div className="text-sm font-bold text-fg">צעדים כפולים</div>
 <div className="text-sm text-fg-muted mt-1 tabular-nums" data-qa="pace-steps">כ־{steps.toLocaleString('en-US')} צעדים, שניים בכל צעד כפול</div>
 <div dir="ltr" className="text-sm text-fg-muted mt-3 tabular-nums" data-qa="pace-calc">{distance.toLocaleString('en-US')} מ׳ ÷ {fmtPace(pace)} מ׳ ≈ {paces.toLocaleString('en-US')}</div>
 </div>
 </div>

 <div className="mt-6 grid sm:grid-cols-2 gap-6">
 <div className="flex gap-3 items-start" data-qa="pace-personal">
 <div className="w-4 shrink-0 text-center font-display font-bold text-sm leading-relaxed text-fg-muted">1</div>
 <div className="text-sm text-fg-muted leading-relaxed">
 <p>
 <strong className="text-fg">מדידה אישית ותנאי השטח:</strong> כל מנווט מודד את הצעד הכפול שלו בתנאים דומים לשטח, כי שיפוע, קרקע לא אחידה ומשקל הציוד משנים אותו.
 </p>
 {/* How to measure is extra detail: one click (or Enter) away, natively keyboard-operable. */}
 <details className="mt-1" data-qa="pace-measure">
 <summary className="w-fit cursor-pointer rounded font-display font-semibold text-fg underline decoration-border-strong decoration-2 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
 איך מודדים צעד כפול?
 </summary>
 <p className="mt-1">
 הולכים 100 מ׳ מדודים במישור וסופרים צעדים כפולים. מי שסופר 67 צעדים כפולים ב־100 מ׳ מקבל צעד כפול של כ־1.5 מ׳. חוזרים על המדידה כמה פעמים.
 </p>
 </details>
 </div>
 </div>
 <div className="flex gap-3 items-start" data-qa="pace-not-proof">
 <div className="w-4 shrink-0 text-center font-display font-bold text-sm leading-relaxed text-fg-muted">2</div>
 <p className="text-sm text-fg-muted leading-relaxed">
 <strong className="text-fg">הספירה אינה הוכחת הגעה:</strong> היא מעריכה כמה הלכתם, לא איפה אתם. בתום הספירה מחפשים את סימן השטח של סוף הקטע (בקטע א׳ זה עיקול הנחל), ורק הוא מאשר שהגעתם.
 </p>
 </div>
 </div>
 </div>
 );
}
