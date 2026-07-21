'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useSpring, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
export function PrinciplesScene() {
return (
 <section id="scene-principles" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.1"
eyebrow="עקרונות הניווט"
title={
          <>
          המתמטיקה של הניווט: איך קובעים <span className="gradient-text">כיוון מוחלט</span> בשטח לא מוכר?
          </>
        }
intro="ניווט הוא לא ניחוש - הוא מדע של דיוק. הכל מתחיל ב'אזימוט': הכלי שמאפשר לכם לדעת בדיוק לאן ללכת, גם באמצע שום מקום ובחושך מוחלט."
 />

 {/* Concept · matched pair feature cards */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
 <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 השפה של הניווט
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
 אזימוט <span className="text-fg-muted font-medium text-base sm:text-lg">(Azimuth)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 הזווית המדויקת ליעד שלכם — <strong className="text-fg">בין 0° ל-360° מצפון</strong>. 0° זה צפון, 90° זה מזרח. ה"אזימוט החוזר" הוא פשוט הכיוון ההפוך (±180°) — הדרך הבטוחה הביתה.
 </p>
 </div>

 <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 הרגע הקריטי
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
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
function AzimuthExplorer() {
const [azimuth, setAzimuth] = useState(47);
// The dial needle sweeps to its target with a damped spring so it reads like a real
// compass hand. Every number on screen (digit readout, direction word, back azimuth)
// is derived from that same animated angle — never from the raw slider value — so
// what you read always matches exactly where the needle is pointing, mid-sweep or not.
const angle = useSmoothedAngle(azimuth);
const displayAzimuth = Math.round(((angle % 360) + 360) % 360);
const back = (displayAzimuth + 180) % 360;
const direction =
displayAzimuth < 22 || displayAzimuth >= 338 ? 'צפון'
 : displayAzimuth < 67 ? 'צפון־מזרח'
 : displayAzimuth < 112 ? 'מזרח'
 : displayAzimuth < 157 ? 'דרום־מזרח'
 : displayAzimuth < 202 ? 'דרום'
 : displayAzimuth < 247 ? 'דרום־מערב'
 : displayAzimuth < 292 ? 'מערב'
 : 'צפון־מערב';
return (
 <div className="relative overflow-hidden rounded-2xl border border-border shadow-elevated bg-bg-elevated select-none">
 {/* Single navigation-instrument board: a 2-col / 2-row grid on desktop (data
     block + card share the right column, the compass spans both rows on the
     left) that collapses to plain DOM-order stacking on mobile — data block,
     then compass, then the back-azimuth card — via the `lg:` grid placement
     below being inert until that breakpoint. */}
 <div className="relative grid gap-8 p-6 sm:p-8 lg:gap-x-10 lg:p-10 lg:grid-cols-[1fr_1.3fr]">
 {/* 1. Title, 2. slider, 3–7. big azimuth / direction / back-azimuth / equation / note
     — first in DOM → right in RTL, top on mobile */}
 <div className="lg:col-start-1 lg:row-start-1 flex flex-col gap-5 lg:border-e lg:border-border-subtle/70 lg:pe-8">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 תנו למצפן סיבוב — בחרו כיוון
 </div>

 <div>
 <input
type="range"
min={0}
max={359}
step={1}
value={azimuth}
onChange={(e) => setAzimuth(Number(e.target.value))}
className="w-full accent-accent"
aria-label="אזימוט"
aria-valuetext={`${displayAzimuth} מעלות, כיוון ${direction}`}
 />
 <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mt-1.5">
 <span>0° צפון</span>
 <span>90° מזרח</span>
 <span>180° דרום</span>
 <span>270° מערב</span>
 </div>
 </div>

 <div>
 <div className="font-mono font-bold text-6xl sm:text-7xl leading-none tabular-nums text-fg">
 {displayAzimuth}<span className="text-3xl sm:text-4xl text-accent-hot align-top">°</span>
 </div>
 <div className="mt-2 text-lg sm:text-xl font-display font-semibold text-fg-muted">
 {direction}
 </div>

 <div className="mt-4 pt-4 border-t border-border-subtle flex items-baseline gap-2.5">
 <span className="text-xs font-display font-semibold text-fg-dim tracking-wider">אזימוט חוזר</span>
 <span className="font-mono font-bold text-2xl sm:text-3xl tabular-nums text-accent-cool">
 {back}°
 </span>
 </div>
 <div className="mt-2 font-mono text-sm text-fg-muted tabular-nums">
 {displayAzimuth}° {displayAzimuth >= 180 ? '−' : '+'} 180° = {back}°
 </div>
 <p className="mt-2 text-xs text-fg-muted leading-relaxed">
 הלכתם ליעד ב-{displayAzimuth}°? כדי לחזור בדיוק הביתה לנקודת המוצא, אתם צריכים את הדרך ההפוכה: {back}°.
 </p>
 </div>
 </div>

 {/* The compass instrument — second in DOM → left in RTL, spans both rows on
     desktop so it sits beside the whole data + card stack; falls between them
     on mobile. Sized to be the visual centerpiece: large on desktop, never
     stretched on mobile. */}
 <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 relative flex flex-col items-center justify-center gap-4">
 <div className="relative aspect-square w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[440px]">
 {/* Circular contact shadow — a rounded-full box shadow reads as the
     instrument's own cast shadow on the table, not a rectangular card shadow */}
 <div aria-hidden className="absolute inset-[3%] rounded-full shadow-pine-card" />
 <CompassDial angle={angle} />
 </div>
 <div className="relative flex items-center gap-4 text-[11px] font-display font-medium tracking-wide text-fg-muted">
 <span className="inline-flex items-center gap-1.5">
 <span className="h-[3px] w-4 rounded-full bg-accent-hot" aria-hidden />
 אזימוט
 </span>
 <span className="inline-flex items-center gap-1.5">
 <span
className="h-[3px] w-4 rounded-full bg-accent-cool/60"
aria-hidden
style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 5px)' }}
 />
 אזימוט חוזר
 </span>
 </div>
 </div>

 {/* 8–9. "When to use it" + dynamic example card — third in DOM → sits under
     the data block at bottom of the shared column on desktop, but after the
     compass on mobile (see grid note above). */}
 <div className="lg:col-start-1 lg:row-start-2 lg:border-e lg:border-border-subtle/70 lg:pe-8">
 <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4 sm:p-5">
 <h4 className="text-sm font-display font-semibold text-fg tracking-wide mb-2">מתי משתמשים באזימוט חוזר?</h4>
 <p className="text-xs text-fg-muted leading-relaxed">
 כדי לחזור הביתה בבטחה, כדי לוודא שחברים שלכם נמצאים במיקום הנכון, או כדי לבצע נסיגה חכמה דרך נתיב שכבר בדקתם וסימנתם כבטוח.
 </p>
 <div className="mt-3 pt-3 border-t border-border-subtle/70">
 <div className="text-[11px] font-display font-semibold text-fg-dim tracking-wider mb-1">דוגמה</div>
 <p className="text-xs text-fg leading-relaxed">
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
const currentMod = ((unwrapped.current % 360) + 360) % 360;
let delta = (target - currentMod) % 360;
if (delta > 180) delta -= 360;
else if (delta < -180) delta += 360;
unwrapped.current += delta;
spring.set(unwrapped.current);
 }, [target, spring]);
useMotionValueEvent(spring, 'change', (v) => setAngle(v));
return reduceMotion ? target : angle;
}
function CompassDial({ angle }: { angle: number }) {
const uid = useId();
const faceClipId = `compass-face-clip-${uid}`;
const needleShadowId = `compass-needle-shadow-${uid}`;
return (
 <svg
viewBox="-50 -50 100 100"
className="relative w-full h-full"
preserveAspectRatio="xMidYMid meet"
aria-hidden="true"
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

 {/* Housing — a single solid, monochrome ring (no gradient), a crisp edge on
     its own boundary, and a thin seam where it meets the face */}
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

 {/* Tick marks — 5° minor / 10° medium / 30° major, thin ink-toned hairlines */}
 {Array.from({ length: 72 }).map((_, i) => {
const deg = i * 5;
const isMajor = deg % 30 === 0;
const isMedium = !isMajor && deg % 10 === 0;
const a = ((deg - 90) * Math.PI) / 180;
const outer = 39.6;
const inner = isMajor ? 32.2 : isMedium ? 35.4 : 37.7;
return (
 <line
key={deg}
x1={Math.cos(a) * inner}
y1={Math.sin(a) * inner}
x2={Math.cos(a) * outer}
y2={Math.sin(a) * outer}
className={isMajor ? 'stroke-fg/65' : isMedium ? 'stroke-fg-muted/55' : 'stroke-fg-dim/45'}
strokeWidth={isMajor ? 0.55 : isMedium ? 0.32 : 0.2}
strokeLinecap="round"
 />
 );
 })}

 {/* Degree numbers every 30°, except the cardinal points (which get letters below).
     Medium weight, minimal halo — reads as printed on the instrument, not a sticker. */}
 {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
const a = ((deg - 90) * Math.PI) / 180;
const r = 27.4;
return (
 <text
key={deg}
x={Math.cos(a) * r}
y={Math.sin(a) * r + 1.1}
textAnchor="middle"
className="fill-fg-muted font-mono font-medium text-[3.4px]"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="0.32"
        strokeLinejoin="round"
      >
 {deg}
 </text>
 );
 })}

 {/* Cardinal letters — same dark ink as the numbers; N is only a size/weight step up */}
 {[
 { deg: 0, label: 'N', primary: true },
 { deg: 90, label: 'E', primary: false },
 { deg: 180, label: 'S', primary: false },
 { deg: 270, label: 'W', primary: false },
 ].map((c) => {
const a = ((c.deg - 90) * Math.PI) / 180;
const r = 25;
return (
 <text
key={c.label}
x={Math.cos(a) * r}
y={Math.sin(a) * r + (c.primary ? 2.2 : 1.9)}
textAnchor="middle"
className={cn(
 'font-display fill-fg',
c.primary ? 'font-bold text-[7px]' : 'font-semibold text-[5.6px]'
 )}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="0.35"
        strokeLinejoin="round"
      >
 {c.label}
 </text>
 );
 })}

 {/* Static contact shadow beneath the needle pivot */}
 <ellipse cx="0.5" cy="1.3" rx="3.2" ry="1.5" className="fill-fg/8" />

 {/* Azimuth + back-azimuth needles, anchored at the dial center */}
 <CompassNeedles angle={angle} needleShadowId={needleShadowId} />

 {/* Center pin — a plain rivet, not an eye: one thin ring, one small dot, no highlight */}
 <circle cx="0" cy="0" r="2.6" className="fill-bg stroke-fg-dim/70" strokeWidth="0.4" />
 <circle cx="0" cy="0" r="1.1" className="fill-fg-dim" />
 </svg>
 );
}
/**
 * Two needles drawn pointing straight up from the dial center (0,0) and rotated
 * with the native SVG `transform="rotate(a)"` — which always pivots around the
 * user-space origin (0,0 == viewBox center). This keeps both needles permanently
 * anchored to the center; only their angle changes, so they sweep smoothly like
 * real compass hands instead of jumping. `angle` is the same damped-spring value
 * (see useSmoothedAngle) that drives the digit readout, so needle and number can
 * never disagree.
 */
function CompassNeedles({ angle, needleShadowId }: { angle: number; needleShadowId: string }) {
return (
 <>
 {/* Back azimuth (azimuth + 180°) — secondary: thin dashed line + small open
     chevron, cool color already used for "reference" directions elsewhere in
     this lesson (ThreeNorthsCard). Clearly lighter-weight than the main needle. */}
 <g transform={`rotate(${angle + 180})`}>
 <line
x1="0"
y1="-3"
x2="0"
y2="-19"
className="stroke-accent-cool/50"
strokeWidth="0.8"
strokeDasharray="1.3 1.2"
strokeLinecap="round"
 />
 <polyline
points="-1.6,-16.5 0,-19.5 1.6,-16.5"
className="stroke-accent-cool/65"
strokeWidth="0.7"
fill="none"
strokeLinecap="round"
strokeLinejoin="round"
 />
 </g>
 {/* Forward azimuth — primary: a narrow, sharp navigation needle (not a flat
     triangle). Two layers only: a dark red-orange body (accent-hot, the same
     "serious" semantic accent as the reference), plus a lighter facet along
     one edge for volume — no gradient, no glow. A small, subtle drop shadow
     and a short south tail complete the real-needle read. */}
 <g transform={`rotate(${angle})`} filter={`url(#${needleShadowId})`}>
 <polygon points="0,3 -1,7.2 0,6 1,7.2" className="fill-fg-dim/60" />
 <polygon points="0,-30 -1.6,-9 0,-3.2 1.6,-9" className="fill-accent-hot" />
 <polygon points="0,-30 0,-3.2 1.6,-9" className="fill-accent/55" />
 </g>
 </>
 );
}
function ThreeNorthsCard() {
const [active, setActive] = useState<'magnetic' | 'grid' | 'true'>('magnetic');
const NORTHS = {
magnetic: {
label: 'צפון מגנטי',
english: 'Magnetic North',
color: 'text-accent-hot',
bg: 'bg-accent-hot/10',
border: 'border-accent-hot',
angle: 7, // visualization offset
who: 'המצפן שביד שלכם',
what: 'הכיוון שאליו נמשכת מחט המצפן. הוא"נצמד" למגנט הענק של כדור הארץ, אבל המגנט הזה קצת זז כל שנה.',
why: 'יתרון: עובד תמיד, בלי סוללות. חיסרון: צריך לתקן את הסטייה שלו כשמשווים אותו למפה.',
 },
grid: {
label: 'צפון רשת',
english: 'Grid North',
color: 'text-accent',
bg: 'bg-accent/10',
border: 'border-accent',
angle: 0,
who: 'המפה הצבאית',
what: 'הצפון של המפות. אלו הקווים הישרים שמודפסים על הנייר. זה הצפון הכי נוח לחישובים בתוך החמ"ל.',
why: 'יתרון: קל לתכנון נ"צ ומסלולים. חיסרון: הוא לא תואם בדיוק את המצפן או את הכוכבים.',
 },
true: {
label: 'צפון אמיתי',
english: 'True North',
color: 'text-accent-cool',
bg: 'bg-accent-cool/10',
border: 'border-accent-cool',
angle: -3,
who: 'כוכבים, GPS וניווט מתקדם',
what: 'הנקודה המדויקת של הקוטב הצפוני. שם נמצא כוכב הצפון. זהו כיוון קבוע ויציב שלא משתנה לעולם.',
why: 'יתרון: הכי מדויק שיש. חיסרון: אי אפשר למדוד אותו עם מצפן פשוט בשטח.',
 },
 };
const meta = NORTHS[active];
return (
 <div className="surface-elevated p-6 sm:p-8">
 <div className="mb-6">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">הצפון הוא לא אחד: הכירו את שלושת הצפונים</h3>
 <p className="text-fg-muted text-sm">
 זה נשמע מבלבל, אבל בשטח יש 3 סוגי"צפון". כדי לא ללכת לאיבוד, אתם חייבים להכיר את ההבדלים ביניהם.
 </p>
 </div>

 <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-stretch">
 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 {(Object.entries(NORTHS) as [keyof typeof NORTHS, typeof NORTHS[keyof typeof NORTHS]][]).map(([id, n], i) => {
const isActive = id === active;
return (
 <button
key={id}
onClick={() => setActive(id)}
className={cn(
 'surface p-3 text-right transition-all rounded-xl relative overflow-hidden flex items-center gap-3',
isActive ? 'border-accent bg-bg-elevated' : 'bg-bg-elevated border-border hover:border-accent/50'
 )}
 >
 {isActive && (
 <motion.span
layoutId="t3-norths-bar"
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-e-full"
 />
 )}
 <span
className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all font-display font-bold text-sm tabular-nums',
isActive ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 {i + 1}
 </span>
 <div className="flex-1 min-w-0 text-right">
 <div className="font-display font-bold text-base text-fg leading-tight">
 {n.label}
 </div>
 <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-0.5">{n.english}</div>
 </div>
 </button>
 );
 })}
 </div>

 <div className={cn('surface-elevated p-5 border-r-4 transition-colors', meta.border)}>
 <div className={cn('text-sm font-display font-semibold mb-2 tracking-wider', meta.color)}>
 {meta.label}
 </div>
 <dl className="space-y-2.5 text-sm">
 <div>
 <dt className="text-fg-dim text-xs mb-0.5">במה משתמשים?</dt>
 <dd className="text-fg">{meta.who}</dd>
 </div>
 <div>
 <dt className="text-fg-dim text-xs mb-0.5">מה זה בעצם?</dt>
 <dd className="text-fg leading-relaxed">{meta.what}</dd>
 </div>
 <div>
 <dt className="text-fg-dim text-xs mb-0.5">למה כן? / למה לא?</dt>
 <dd className="text-fg-muted leading-relaxed">{meta.why}</dd>
 </div>
 </dl>
 </div>
 </div>

 <div className="surface aspect-square sm:aspect-auto sm:min-h-[280px] flex flex-col items-center justify-center p-6 relative overflow-hidden gap-3">
 <svg viewBox="-50 -50 100 100" className="w-full h-full max-w-[260px]">
 <circle cx="0" cy="0" r="40" className="fill-bg-elevated stroke-border" strokeWidth="0.4" />

 {Object.entries(NORTHS).map(([id, n]) => {
const isActive = id === active;
const a = ((n.angle - 90) * Math.PI) / 180;
const x = Math.cos(a) * 36;
const y = Math.sin(a) * 36;
return (
 <g key={id}>
 <motion.line
x1="0"
y1="0"
x2={x}
y2={y}
className={cn('transition-all', n.color)}
stroke="currentColor"
strokeWidth={isActive ? 1.2 : 0.5}
opacity={isActive ? 1 : 0.45}
 />
 <motion.polygon
points={`${x},${y} ${x - 1.5},${y + 3} ${x + 1.5},${y + 3}`}
transform={`rotate(${n.angle} ${x} ${y})`}
className={n.color}
fill="currentColor"
opacity={isActive ? 1 : 0.5}
animate={{ opacity: isActive ? 1 : 0.5 }}
 />
 </g>
 );
 })}

 <circle cx="0" cy="0" r="1.8" className="fill-bg stroke-fg" strokeWidth="0.4" />
 <text x="0" y="48" textAnchor="middle" className="fill-fg-dim text-[3px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
 *ההפרש מוגזם להמחשה ויזואלית
 </text>
 </svg>

 <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
 {(Object.entries(NORTHS) as [keyof typeof NORTHS, typeof NORTHS[keyof typeof NORTHS]][]).map(([id, n]) => {
const isActive = id === active;
return (
 <div
key={id}
className={cn(
 'flex items-center gap-1.5 transition-opacity',
isActive ? 'opacity-100' : 'opacity-50'
 )}
 >
 <span className={cn('inline-block size-2.5 rounded-full', n.color)} style={{ backgroundColor: 'currentColor' }} />
 <span className={cn('font-display font-semibold tracking-wide whitespace-nowrap', n.color)}>{n.label}</span>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 <div className="mt-5 surface p-4 flex gap-3 items-start">
 <Icon name="spark" size={18} className="text-status-warn shrink-0 mt-0.5" />
 <div className="text-xs leading-relaxed">
 <strong className="text-fg">שימו לב:</strong> אם תמדדו כיוון במצפן ותסמנו אותו ישר על המפה בלי"לתקן" את הסטייה - תפספסו את המטרה. בישראל הסטייה קטנה, אבל בניווטים ארוכים כל מעלה קובעת.
 </div>
 </div>
 </div>
 );
}
function GpsDeniedCard() {
const items: { icon: IconName; title: string; desc: string }[] = [
 {
icon: 'bolt',
title: 'מלחמה אלקטרונית',
desc: 'האויב משדר רעש"שמחשיך" את הלוויינים ברדיוס של מאות קילומטרים. פתאום המכשיר פשוט מפסיק לעבוד.',
 },
 {
icon: 'mountain',
title: 'מחסומים טבעיים',
desc: 'לוויינים לא רואים דרך בטון, סלעים או אדמה. במנהרות, בתוך מבנים סבוכים או בואדיות עמוקים - ה-GPS מתעוור.',
 },
 {
icon: 'satellite',
title: 'תקלות והשבתה',
desc: 'לוויינים יכולים ליפול, להתקלקל או להיפגע. צבא חכם תמיד שומר על היכולת לנצח גם עם מפת נייר ומצפן.',
 },
 ];
return (
 <div className="surface-elevated p-6 sm:p-8">
 <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
 <div>
 <h3 className="font-display font-bold text-xl leading-tight mb-2">למה אסור לסמוך רק על ה-GPS?</h3>
 <p className="text-fg-muted text-sm leading-relaxed">
 היום הכל עובד על GPS, וזו בדיוק הבעיה. זה נוח, עד שמישהו מחליט לכבות לכם את האור.
 <br /><br />
 המונח <strong className="text-fg">"GPS-Denied"</strong> מתאר כל מצב שבו המערכות הלווייניות מושבתות. נווט טוב הוא מי ששולט בשיטות ה"אולד-סקול" - מפה, מצפן וספירת צעדים - כי אלו הכלים היחידים שלא צריכים קליטה או סוללה.
 </p>
 </div>
 <div className="space-y-3">
 {items.map((it, i) => (
 <motion.div
key={it.title}
initial={{ opacity: 0, x: 10 }}
whileInView={{ opacity: 1, x: 0 }}
viewport={{ once: true }}
transition={{ delay: i * 0.08 }}
className="surface p-4 flex items-start gap-3 hover:border-accent/40 transition-colors"
 >
 <div className="size-10 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-center justify-center text-status-danger shrink-0">
 <Icon name={it.icon} size={18} />
 </div>
 <div>
 <h4 className="font-display font-semibold mb-0.5 text-sm">{it.title}</h4>
 <p className="text-xs text-fg-muted leading-relaxed">{it.desc}</p>
 </div>
 </motion.div>
 ))}
 </div>
 </div>
 </div>
 );
}
function ConclusionCard() {
return (
 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
 השורה התחתונה
 </div>
 <p className="text-fg leading-relaxed text-pretty">
 ניווט הוא לא"בערך". זה <strong className="text-fg">אזימוט מדויק</strong>, הבנה של סוגי הצפונים, ומוכנות מלאה לרגע שבו הטכנולוגיה תפסיק לעבוד. היכולת הזו היא מה שמבדיל בין כוח שמגיע ליעד לבין כוח שהולך לאיבוד בשטח אויב.
 </p>
 </div>
 </motion.div>
 );
}
