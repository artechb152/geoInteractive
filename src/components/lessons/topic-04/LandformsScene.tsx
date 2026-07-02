'use client';
import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Form = 'hill' | 'spur' | 'valley' | 'saddle' | 'depression';
type FormData = {
id: Form;
label: string;
english: string;
description: string;
contourHint: string;
tactical: string;
example: string;
};
const FORMS: FormData[] = [
 {
id: 'hill',
label: 'כיפה',
english: 'Hill / Peak',
description: 'התרוממות בולטת של פני השטח מעל סביבתה.',
contourHint: 'במפה: רצף של קווי גובה סגורים זה בתוך זה. המעגל הפנימי ביותר הוא הפסגה..',
tactical: 'מאפשרת תצפית פנורמית ושליטה באש. היא העוגן של המגן והיעד המרכזי של התוקף.',
example: 'במלחמת יום הכיפורים: כל הקרבות בגולן היו על כיפות (תל פאריס, חרמונית, ועוד). מי שאיבד את הכיפה — איבד את הקרב המקומי.',
 },
 {
id: 'spur',
label: 'שלוחה',
english: 'Spur / Ridge',
description: 'שטח גבוה וצר המשתפל בהדרגה מהפסגה לכיוון השטח הנמוך.',
contourHint: 'קווי גובה בצורת V או U, כאשר הקודקוד מצביע לכיוון השטח הנמוך.',
tactical: 'נתיב התקדמות מועדף לחי"ר, המעניק יתרון גובה על העמקים מסביב.',
example: 'בלחימה בלבנון, יחידות הסיור נצמדו לשלוחות ככל האפשר — תצפית רחבה, מעט מארבים, יציאה נוחה אם מסתבכים.',
 },
 {
id: 'valley',
label: 'גיא / ואדי',
english: 'Valley / Draw',
description: 'השטח הנמוך הכלוי בין שתי שלוחות.',
contourHint: 'קווי גובה בצורת V המצביעים לכיוון הפסגה. הקו המחבר את הקודקודים הוא קו ניקוז המים.',
tactical: 'שטח נמוך המוסתר מהסביבה. מעולה להסתרת לוגיסטיקה, אך מסוכן מאוד לתנועה קרבית בשל חשיפה למארבים מהשלוחות מעליו.',
example: 'במבצע"לבנון השנייה" 2006: יחידות שעברו בוואדיות סבלו ממארבים מהשלוחות. כל ואדי לא מאובטח = מלכודת פוטנציאלית.',
 },
 {
id: 'saddle',
label: 'אוכף',
english: 'Saddle',
description: 'נקודת השפל הנמוכה ביותר על קו הרכס, הממוקמת בין שתי כיפות סמוכות.',
contourHint: 'האוכף מופיע כרווח הצר שבין שתי קבוצות סמוכות של קווי גובה סגורים (שתי כיפות). הוא נראה כמו"צוואר בקבוק" המחבר בין שני שטחים גבוהים.',
tactical: 'יוצר"אפקט משפך" – כיוון שזהו המעבר הנוח ביותר, כולם נמשכים אליו. לכן, זהו מקום קלאסי למארבים ולתכנון שטחי השמדה.',
example: 'מעבר ה-Ardennes במלחמת העולם השנייה — אוכף שכולם חשבו שאי אפשר לעבור בו. הגרמנים הפתיעו ועברו בו.',
 },
 {
id: 'depression',
label: 'שקע',
english: 'Depression',
description: 'שטח סגור הנמוך מסביבתו הקרובה.',
contourHint: 'קווי גובה סגורים עם זיזים ("קוצים") הפונים פנימה.',
tactical: 'מייצר שטח מת (אזור סמוי) מכל הכיוונים. אידיאלי להסתרת מפקדות או תותחים המוגנים מאש בכינון ישיר.',
example: 'תותחי הסורים במלחמת יום הכיפורים הוסתרו בשקעים על רמת הגולן — ולכן צה"ל התקשה לזהות אותם מהאוויר.',
 },
];
type Slope = {
id: string;
label: string;
description: string;
contourHint: string;
};
const SLOPES: Slope[] = [
 { id: 'even', label: 'מדרון קצוב', description: 'בעל שיפוע קבוע ואחיד לאורך כל הדרך.', contourHint: 'המרווחים בין קווי הגובה זהים.' },
 { id: 'convex', label: 'מדרון קמור', description: 'השיפוע מתחיל בצורה מתונה בחלק העליון והופך לתלול מאוד ככל שיורדים.', contourHint: 'קווים מרווחים למעלה וצפופים למטה.' },
 { id: 'concave', label: 'מדרון קעור', description: 'השיפוע תלול מאוד למעלה והופך למתון ושטוח בבסיסו.', contourHint: 'קווים צפופים מאוד למעלה ומרווחים למטה.' },
 { id: 'shoulder', label: 'כתף', description: 'רצף השיפוע נקטע באמצע על ידי קטע מישורי, ויוצר צורה של"מדרגה" על ההר.', contourHint: 'קווים צפופים ← קווים מרווחים מאוד ← חזרה לקווים צפופים.' },
];
export function LandformsScene() {
const [active, setActive] = useState<Form>('hill');
const [slope, setSlope] = useState(SLOPES[0].id);
const meta = FORMS.find((f) => f.id === active)!;
return (
 <section id="scene-landforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="04.2"
eyebrow="תבניות נוף"
title = {
  <>
    5 צורות שטח ש<span className="gradient-text">יכולות להכריע קרב</span>
  </>
}intro="מתוך אינספור צורות בטבע, קיימות 5 צורות יסוד טופוגרפיות שמעצבות כל שדה קרב יבשתי. מפקד שיודע לזהות אותן על המפה מבין מיד מי שולט בשטח, איפה האויב יציב מארב ומאיפה הכי בטוח להתקדם."
 />

 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start mb-12">
 {/* Accordion list — first child → RIGHT in RTL (text on right) */}
 <div className="space-y-3">
 {FORMS.map((f, i) => {
const isActive = active === f.id;
return (
 <div
key={f.id}
className={cn(
 'surface overflow-hidden transition-colors relative',
isActive ? 'border-brand-dark bg-brand/5' : 'hover:border-border-strong'
 )}
 >
 {isActive && (
 <motion.span
layoutId="t4-form-bar"
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
 )}
 <button
type="button"
onClick={() => setActive(f.id)}
aria-expanded={isActive}
className="w-full p-4 text-right flex items-center gap-3"
 >
 <span
className={cn(
 'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all font-display text-sm font-bold',
isActive ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted'
 )}
 >
 {i + 1}
 </span>
 <div className="flex-1 min-w-0">
 <div className={cn('font-display font-bold leading-tight', isActive ? 'text-brand-dark' : 'text-fg')}>
 {f.label}
 </div>
 <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-0.5">{f.english}</div>
 </div>
 <motion.span
animate={{ rotate: isActive ? 180 : 0 }}
transition={{ duration: 0.25 }}
className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
 >
 <svg
width="18"
height="18"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
 >
 <path d="m6 9 6 6 6-6" />
 </svg>
 </motion.span>
 </button>

 <AnimatePresence initial={false}>
 {isActive && (
 <motion.div
key={`panel-${f.id}`}
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
className="overflow-hidden"
 >
 <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-3">
 <div className="mt-3">
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider">
 מה זה?
 </div>
 <p className="text-sm leading-relaxed text-fg">{f.description}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 איך מזהים במפה?
 </div>
 <p className="text-sm leading-relaxed text-fg">{f.contourHint}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider">
 משמעות צבאית
 </div>
 <p className="text-sm leading-relaxed text-fg">{f.tactical}</p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>

 {/* Visualization — second child → LEFT in RTL. Two linked boards:
     the landform in reality (oblique relief) + the same form on the map. */}
 <div className="surface-elevated relative overflow-hidden sticky top-6 p-3 sm:p-4">
 <motion.div
key={active}
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.3 }}
 >
 <FormVisual form={active} />
 </motion.div>
 </div>
 </div>

 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface p-5 mb-12 flex gap-3 items-start"
 >
 <Icon name="spark" size={20} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">דוגמה היסטורית</div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.example}</p>
 </div>
 </motion.div>

 <SoftDivider text="עוד שכבה: לא רק צורת ההר — גם צורת המדרון" />

 <SlopeAnalyzer slopes={SLOPES} active={slope} onSelect={setSlope} />
 </section>
 );
}
// Short cues shown under each board — bind "reality" to "map" per form.
const REALITY_META: Record<Form, { realWorld: string; mapCue: string }> = {
  hill: { realWorld: 'בליטה מעוגלת מעל הסביבה', mapCue: 'טבעות סגורות סביב הפסגה' },
  spur: { realWorld: 'אצבע גבוהה שיורדת מהרכס', mapCue: 'הקודקוד מצביע אל השטח הנמוך' },
  valley: { realWorld: 'תעלת ניקוז בין שתי שלוחות', mapCue: 'הקודקוד מצביע אל הפסגה' },
  saddle: { realWorld: 'המעבר הנמוך בין שתי כיפות', mapCue: 'רווח צר בין שתי קבוצות טבעות' },
  depression: { realWorld: 'קערה נמוכה מכל סביבתה', mapCue: 'טבעות עם זיזים הפונים פנימה' },
};

function FormVisual({ form }: { form: Form }) {
  const m = REALITY_META[form];
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BoardFrame kind="real" sub={m.realWorld}>
          {form === 'hill' && <RealityHill />}
          {form === 'spur' && <RealitySpur />}
          {form === 'valley' && <RealityValley />}
          {form === 'saddle' && <RealitySaddle />}
          {form === 'depression' && <RealityDepression />}
        </BoardFrame>
        <BoardFrame kind="map" sub={m.mapCue} mapGrid>
          {form === 'hill' && <MapHill />}
          {form === 'spur' && <MapSpur />}
          {form === 'valley' && <MapValley />}
          {form === 'saddle' && <MapSaddle />}
          {form === 'depression' && <MapDepression />}
        </BoardFrame>
      </div>
      <p className="mt-3 text-center text-[11px] sm:text-xs text-fg-dim">
        אותה צורה — פעם כפי שהיא בשטח, פעם כפי שהיא מצוירת בקווי גובה
      </p>
    </div>
  );
}

function BoardFrame({
  kind,
  sub,
  mapGrid,
  labelText,
  icon,
  children,
}: {
  kind: 'real' | 'map';
  sub: string;
  mapGrid?: boolean;
  labelText?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  const label = labelText ?? (kind === 'real' ? 'במציאות' : 'במפה');
  const ic: IconName = icon ?? (kind === 'real' ? 'mountain' : 'layers');
  return (
    <figure className="min-w-0 m-0">
      <figcaption className="flex items-baseline gap-1.5 mb-1.5 px-0.5">
        <Icon name={ic} size={13} className="text-accent shrink-0 self-center" />
        <span className="text-[11px] sm:text-xs font-display font-bold text-fg tracking-wider shrink-0">
          {label}
        </span>
        <span className="text-[10px] sm:text-[11px] text-fg-dim truncate">· {sub}</span>
      </figcaption>
      <div className="relative rounded-xl border border-border bg-bg-elevated overflow-hidden aspect-[100/62]">
        <svg viewBox="0 0 100 62" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="100" height="62" className="fill-bg-elevated" />
          {mapGrid && <MapGrid />}
          {children}
        </svg>
      </div>
    </figure>
  );
}

function MapGrid() {
  return (
    <g>
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="62" className="stroke-border-subtle" strokeWidth="0.08" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={'gy' + i} x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}
    </g>
  );
}

/* ── Reality boards — oblique relief, light from upper-left ───────────────── */
/* Opacity is set via native SVG fill/stroke-opacity attributes (not Tailwind
   `/NN` colour modifiers) so shading renders identically in dev and in the
   static export, independent of which utilities the JIT happens to emit. */

function RealityHill() {
  return (
    <g>
      <ellipse cx="50" cy="52" rx="34" ry="5" className="fill-terrain-ridge" fillOpacity={0.12} />
      <path d="M14 52 C 18 30, 34 15, 50 15 C 66 15, 82 30, 86 52 Z" className="fill-terrain-olive" fillOpacity={0.8} />
      <path d="M50 15 C 66 15, 82 30, 86 52 L 42 52 C 46 38, 48 24, 50 15 Z" className="fill-terrain-ridge" fillOpacity={0.42} />
      <path d="M14 52 C 18 30, 34 15, 50 15 C 66 15, 82 30, 86 52" fill="none" className="stroke-terrain-ridge" strokeWidth="0.7" />
      <path d="M23 46 C 34 40, 66 40, 77 46" fill="none" className="stroke-terrain-ridge" strokeOpacity={0.45} strokeWidth="0.4" />
      <path d="M29 38 C 38 33, 62 33, 71 38" fill="none" className="stroke-terrain-ridge" strokeOpacity={0.45} strokeWidth="0.4" />
      <path d="M37 29 C 43 26, 57 26, 63 29" fill="none" className="stroke-terrain-ridge" strokeOpacity={0.45} strokeWidth="0.4" />
      <polygon points="50,11 47.5,16 52.5,16" className="fill-accent" />
    </g>
  );
}

function RealitySpur() {
  const front =
    'M0 52 C 8 55, 18 57, 24 50 C 27 46, 30 45, 34 51 C 40 60, 46 62, 50 62 C 54 62, 60 60, 66 51 C 70 45, 73 46, 76 50 C 82 57, 92 55, 100 52';
  return (
    <g>
      {/* hillside body: high ground across the top → wavy front edge */}
      <path
        d="M0 24 C 25 18, 75 18, 100 24 L 100 52 C 92 55, 82 57, 76 50 C 73 46, 70 45, 66 51 C 60 60, 54 62, 50 62 C 46 62, 40 60, 34 51 C 30 45, 27 46, 24 50 C 18 57, 8 55, 0 52 L 0 24 Z"
        className="fill-terrain-olive"
        fillOpacity={0.6}
      />
      {/* lit spur crest bulging toward the viewer (high spine) */}
      <path d="M50 25 C 43 34, 41 48, 45 57 C 47 60, 53 60, 55 57 C 59 48, 57 34, 50 25 Z" className="fill-terrain-olive" fillOpacity={0.32} />
      {/* shadowed draws (re-entrants) each side, receding up the slope */}
      <path d="M24 50 C 27 46, 30 45, 34 51 C 31 44, 30 36, 30 30 C 27 38, 25 45, 24 50 Z" className="fill-terrain-ridge" fillOpacity={0.4} />
      <path d="M76 50 C 73 46, 70 45, 66 51 C 69 44, 70 36, 70 30 C 73 38, 75 45, 76 50 Z" className="fill-terrain-ridge" fillOpacity={0.44} />
      {/* streams gathering in each draw */}
      <path d="M30 31 C 30 40, 30 48, 29 51" fill="none" className="stroke-terrain-sky" strokeOpacity={0.6} strokeWidth="0.5" />
      <path d="M70 31 C 70 40, 70 48, 71 51" fill="none" className="stroke-terrain-sky" strokeOpacity={0.6} strokeWidth="0.5" />
      {/* draped form-lines: dip DOWN over the spur, notch UP into the draws */}
      {[30, 38, 46].map((y) => (
        <path
          key={y}
          d={`M0 ${y} Q 14 ${y + 2} 24 ${y - 5} Q 28 ${y - 7} 32 ${y - 4} Q 42 ${y + 4} 50 ${y + 6} Q 58 ${y + 4} 68 ${y - 4} Q 72 ${y - 7} 76 ${y - 5} Q 86 ${y + 2} 100 ${y}`}
          fill="none"
          className="stroke-terrain-ridge"
          strokeOpacity={0.4}
          strokeWidth="0.35"
        />
      ))}
      <path d={front} fill="none" className="stroke-terrain-ridge" strokeWidth="0.55" />
      {/* descent arrow down the spur spine */}
      <line x1="50" y1="30" x2="50" y2="52" className="stroke-accent" strokeWidth="0.7" />
      <polygon points="50,54.4 48.1,50.6 51.9,50.6" className="fill-accent" />
    </g>
  );
}

function RealityValley() {
  return (
    <g>
      {/* left hillside */}
      <path d="M0 20 C 14 26, 30 40, 44 62 L 0 62 Z" className="fill-terrain-olive" fillOpacity={0.8} />
      <path d="M0 20 C 14 26, 30 40, 44 62 L 30 62 C 20 44, 10 30, 0 26 Z" className="fill-terrain-ridge" fillOpacity={0.38} />
      {/* right hillside */}
      <path d="M100 20 C 86 26, 70 40, 56 62 L 100 62 Z" className="fill-terrain-olive" fillOpacity={0.85} />
      <path d="M100 20 C 86 26, 70 40, 56 62 L 70 62 C 80 44, 90 30, 100 26 Z" className="fill-terrain-ridge" fillOpacity={0.5} />
      {/* valley floor */}
      <path d="M44 62 C 48 44, 50 34, 50 24 C 50 34, 52 44, 56 62 Z" className="fill-terrain-sand" fillOpacity={0.5} />
      {/* stream along the floor */}
      <path d="M50 26 C 49 40, 49 52, 50 62" fill="none" className="stroke-terrain-sky" strokeWidth="1" strokeLinecap="round" />
      {/* hillside outlines */}
      <path d="M0 20 C 14 26, 30 40, 44 62" fill="none" className="stroke-terrain-ridge" strokeWidth="0.6" />
      <path d="M100 20 C 86 26, 70 40, 56 62" fill="none" className="stroke-terrain-ridge" strokeWidth="0.6" />
      {/* water-flow arrow */}
      <line x1="50" y1="34" x2="50" y2="54" className="stroke-terrain-sky" strokeWidth="0.7" />
      <polygon points="50,56.4 48.1,52.6 51.9,52.6" className="fill-terrain-sky" />
    </g>
  );
}

function RealitySaddle() {
  return (
    <g>
      <ellipse cx="50" cy="55" rx="44" ry="5" className="fill-terrain-ridge" fillOpacity={0.12} />
      {/* connecting saddle surface (low ground between the peaks) */}
      <path d="M30 55 C 36 46, 42 41, 50 41 C 58 41, 64 46, 70 55 Z" className="fill-terrain-olive" fillOpacity={0.55} />
      {/* left peak */}
      <path d="M2 55 C 8 30, 20 19, 30 24 C 37 29, 39 43, 37 55 Z" className="fill-terrain-olive" fillOpacity={0.85} />
      <path d="M30 24 C 37 29, 39 43, 37 55 L 25 55 C 29 40, 27 30, 30 24 Z" className="fill-terrain-ridge" fillOpacity={0.46} />
      {/* right peak */}
      <path d="M98 55 C 92 30, 80 19, 70 24 C 63 29, 61 43, 63 55 Z" className="fill-terrain-olive" fillOpacity={0.85} />
      <path d="M70 24 C 63 29, 61 43, 63 55 L 75 55 C 71 40, 73 30, 70 24 Z" className="fill-terrain-ridge" fillOpacity={0.52} />
      <path d="M2 55 C 8 30, 20 19, 30 24 C 37 29, 39 43, 37 55" fill="none" className="stroke-terrain-ridge" strokeWidth="0.6" />
      <path d="M98 55 C 92 30, 80 19, 70 24 C 63 29, 61 43, 63 55" fill="none" className="stroke-terrain-ridge" strokeWidth="0.6" />
      <path d="M37 55 C 41 47, 45 42, 50 41.5 C 55 42, 59 47, 63 55" fill="none" className="stroke-terrain-ridge" strokeWidth="0.5" />
      {/* peak markers */}
      <polygon points="25,16 22.5,21 27.5,21" className="fill-accent" />
      <polygon points="75,16 72.5,21 77.5,21" className="fill-accent" />
      {/* crossing route funnelling over the low pass */}
      <path d="M18 52 C 34 50, 42 43, 50 42 C 58 43, 66 50, 82 52" fill="none" className="stroke-accent-hot" strokeWidth="0.7" strokeDasharray="2 1.3" strokeLinecap="round" />
      <circle cx="50" cy="42" r="1.4" className="fill-accent-hot" />
    </g>
  );
}

function RealityDepression() {
  return (
    <g>
      {/* level ground on every side — the pit is sunk INTO it */}
      <rect x="0" y="14" width="100" height="48" className="fill-terrain-sand" fillOpacity={0.25} />
      <line x1="0" y1="20" x2="100" y2="20" className="stroke-terrain-ridge" strokeOpacity={0.22} strokeWidth="0.3" />
      <line x1="0" y1="27" x2="100" y2="27" className="stroke-terrain-ridge" strokeOpacity={0.16} strokeWidth="0.25" />
      {/* rim of the pit (opening) */}
      <ellipse cx="50" cy="34" rx="34" ry="8.5" className="fill-bg-elevated stroke-terrain-ridge" strokeWidth="0.7" />
      {/* inner walls stepping DOWN (darker = deeper) */}
      <ellipse cx="50" cy="40" rx="24" ry="6" className="fill-terrain-ridge" fillOpacity={0.2} />
      <ellipse cx="50" cy="45" rx="15" ry="4" className="fill-terrain-ridge" fillOpacity={0.28} />
      <ellipse cx="50" cy="49" rx="7" ry="2.2" className="fill-terrain-ridge" fillOpacity={0.4} />
      {/* arrow diving into the pit */}
      <line x1="50" y1="33" x2="50" y2="47" className="stroke-accent" strokeWidth="0.7" />
      <polygon points="50,49.4 48.1,45.6 51.9,45.6" className="fill-accent" />
    </g>
  );
}

/* ── Map (contour) boards — viewBox 100×62, centre ≈ (50,30) ──────────────── */

function MapHill() {
  return (
    <g>
      {[[36, 20], [28, 15], [20, 11], [12, 7], [5, 3]].map(([rx, ry], i) => (
        <ellipse key={i} cx="50" cy="30" rx={rx} ry={ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
      ))}
      <polygon points="50,26.5 47.5,31 52.5,31" className="fill-accent" />
    </g>
  );
}

function MapSpur() {
  return (
    <g>
      {[16, 24, 32, 40].map((y, i) => (
        <path key={i} d={`M18 ${y} Q 50 ${y + 14} 82 ${y}`} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
      ))}
      <line x1="50" y1="16" x2="50" y2="44" className="stroke-accent" strokeWidth="0.6" />
      <polygon points="50,47 47.8,42.6 52.2,42.6" className="fill-accent" />
      <text x="50" y="53.5" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
        אל השטח הנמוך
      </text>
    </g>
  );
}

function MapValley() {
  return (
    <g>
      {[46, 38, 30, 22].map((y, i) => (
        <path key={i} d={`M18 ${y} Q 50 ${y - 14} 82 ${y}`} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
      ))}
      {/* drainage line along the valley axis (water — points nowhere) */}
      <path d="M18 47 L 50 34 L 82 47" fill="none" className="stroke-terrain-sky" strokeWidth="0.7" />
      {/* map-reading direction cue (accent = direction, not water) */}
      <line x1="50" y1="45" x2="50" y2="21" className="stroke-accent" strokeWidth="0.6" />
      <polygon points="50,18 47.8,22.4 52.2,22.4" className="fill-accent" />
      <text x="50" y="10" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
        אל הפסגה
      </text>
      <text x="50" y="56" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
        קו ניקוז
      </text>
    </g>
  );
}

function MapSaddle() {
  const rings: [number, number][] = [[13, 9], [9, 6], [5, 3.5]];
  return (
    <g>
      {rings.map(([rx, ry], i) => (
        <ellipse key={'l' + i} cx="30" cy="30" rx={rx} ry={ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
      ))}
      {rings.map(([rx, ry], i) => (
        <ellipse key={'r' + i} cx="70" cy="30" rx={rx} ry={ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
      ))}
      {/* the narrow pass between the two hilltops */}
      <path d="M45 30 Q 50 27 55 30" fill="none" className="stroke-accent-hot" strokeWidth="0.5" strokeDasharray="1 0.6" />
      <path d="M45 30 Q 50 33 55 30" fill="none" className="stroke-accent-hot" strokeWidth="0.5" strokeDasharray="1 0.6" />
      <circle cx="50" cy="30" r="1.2" className="fill-accent-hot" />
      <text x="50" y="49" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
        אוכף
      </text>
    </g>
  );
}

function MapDepression() {
  return (
    <g>
      {[[30, 17], [22, 12], [14, 8], [7, 4]].map(([rx, ry], i) => (
        <g key={i}>
          <ellipse cx="50" cy="30" rx={rx} ry={ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.32} />
          {Array.from({ length: 8 }).map((_, j) => {
            const a = (j * 45 * Math.PI) / 180;
            const x1 = 50 + Math.cos(a) * rx;
            const y1 = 30 + Math.sin(a) * ry;
            const x2 = 50 + Math.cos(a) * (rx - 1.6);
            const y2 = 30 + Math.sin(a) * (ry - 1.6);
            return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-accent" strokeWidth="0.22" />;
          })}
        </g>
      ))}
      <text x="50" y="31.2" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
        נמוך
      </text>
    </g>
  );
}
function SlopeAnalyzer({ slopes, active, onSelect }: { slopes: Slope[]; active: string; onSelect: (id: string) => void }) {
const meta = slopes.find((s) => s.id === active)!;
const reduce = useReducedMotion();
return (
 <div className="surface-elevated p-6 sm:p-8">
 <div className="mb-6">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">4 סוגי מדרונות — איך השלוחות בנויות בפועל</h3>
 <p className="text-fg-muted text-sm">
 אפילו שלוחה"פשוטה" יכולה להיות מורכבת ממקטעי שיפוע שונים. ההבחנה ביניהם משנה לחלוטין את קצב התנועה ואת קווי הראייה.
 </p>
 </div>

 <div className="grid sm:grid-cols-4 gap-2 mb-5">
 {slopes.map((s, i) => {
const isActive = active === s.id;
return (
 <button
key={s.id}
type="button"
onClick={() => onSelect(s.id)}
className={cn(
 'p-3 rounded-xl border-2 text-start transition-all relative overflow-hidden flex items-center gap-3',
isActive ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
 {isActive && (
 <motion.span
 layoutId="t4-slope-bar"
 className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-e-full"
 />
 )}
 <span
 className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all font-display font-bold text-sm',
 isActive ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 {i + 1}
 </span>
 <div className="font-display font-bold text-sm text-fg leading-tight flex-1">
 {s.label}
 </div>
 </button>
 );
 })}
 </div>

 {/* Two linked boards — the same slope from the side (profile) and from above (contours) */}
 <motion.div
   key={active}
   initial={reduce ? false : { opacity: 0 }}
   animate={{ opacity: 1 }}
   transition={{ duration: reduce ? 0 : 0.3 }}
   className="mb-6"
 >
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <BoardFrame kind="real" labelText="מהצד" sub="פרופיל השטח">
       <SlopeSideProfile slope={active} />
     </BoardFrame>
     <BoardFrame kind="map" labelText="מלמעלה" sub="קווי גובה" mapGrid>
       <SlopeContourMap slope={active} />
     </BoardFrame>
   </div>
   <p className="mt-3 text-center text-[11px] sm:text-xs text-fg-dim">
     אותו מדרון — פעם כפרופיל מהצד, פעם כקווי גובה במבט־על. ככל שקווי הגובה צפופים יותר, המדרון תלול יותר.
   </p>
 </motion.div>

 <motion.div
   key={`text-${active}`}
   initial={reduce ? false : { opacity: 0, y: 6 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: reduce ? 0 : 0.3 }}
   className="grid sm:grid-cols-2 gap-3"
 >
   <div className="surface-elevated p-5">
     <div className="text-sm font-display font-semibold text-accent-cool mb-2 tracking-wider">
       מה זה?
     </div>
     <p className="text-sm leading-relaxed text-fg">{meta.description}</p>
   </div>
   <div className="surface p-5">
     <div className="text-sm font-display font-semibold text-accent mb-2 tracking-wider">
       איך מזהים במפה?
     </div>
     <p className="text-sm leading-relaxed text-fg-muted">{meta.contourHint}</p>
   </div>
 </motion.div>
 </div>
 );
}
// [d, e] normalized — d = horizontal distance from the foot (0) to the crest (1),
// e = height in equal contour intervals (0 = foot, 1 = crest). The same crossings feed
// both the side profile and the map view, so a steep segment reads as tight contours.
const SLOPE_GEO: Record<string, [number, number][]> = {
  even: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8], [1, 1]],
  convex: [[0, 0], [0.04, 0.2], [0.16, 0.4], [0.36, 0.6], [0.64, 0.8], [1, 1]],
  concave: [[0, 0], [0.36, 0.2], [0.64, 0.4], [0.84, 0.6], [0.96, 0.8], [1, 1]],
  shoulder: [[0, 0], [0.1, 0.2], [0.2, 0.4], [0.75, 0.6], [0.86, 0.8], [1, 1]],
};

// Shared foot(0)→crest(1) horizontal mapping, so both boards line up 1:1.
const slopeX = (d: number) => 11 + d * 78;

// Side view — a cross-section from the foot up to the crest. The silhouette shape and
// the spacing of the equal-height crossings let each slope type read on its own.
function SlopeSideProfile({ slope }: { slope: string }) {
  const pts = SLOPE_GEO[slope] ?? SLOPE_GEO.even;
  const py = (e: number) => 50 - e * 38;
  const crest = pts.map(([d, e], i) => `${i === 0 ? 'M' : 'L'} ${slopeX(d).toFixed(1)} ${py(e).toFixed(1)}`).join(' ');
  const body = `${crest} L ${slopeX(1).toFixed(1)} 50 L ${slopeX(0).toFixed(1)} 50 Z`;
  return (
    <g>
      {/* equal-height reference lines — where each meets the slope is one contour */}
      {[0.2, 0.4, 0.6, 0.8, 1].map((e) => (
        <line key={e} x1="9" y1={py(e)} x2="91" y2={py(e)} className="stroke-terrain-ridge/35" strokeWidth="0.25" strokeDasharray="1.4 1.2" />
      ))}
      <line x1="7" y1="50" x2="93" y2="50" className="stroke-terrain-ridge/50" strokeWidth="0.4" />
      <path d={body} className="fill-terrain-olive/45" />
      <path d={crest} fill="none" className="stroke-terrain-ridge" strokeWidth="0.7" />
      {pts.slice(1, 5).map(([d, e], i) => (
        <circle key={i} cx={slopeX(d)} cy={py(e)} r="1.2" className="fill-accent" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.5" />
      ))}
      {/* crest marker */}
      <polygon points={`${slopeX(1)},6.5 ${(slopeX(1) - 2.4).toFixed(1)},11.5 ${(slopeX(1) + 2.4).toFixed(1)},11.5`} className="fill-accent" />
      <text x="16" y="58.5" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="4.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round">תחתית</text>
      <text x="76" y="9.5" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="4.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round">פסגה</text>
    </g>
  );
}

// Map view — the same slope as contour lines seen from above. Line spacing = steepness
// (tight = steep); the short ticks point downhill, toward the foot. Drawn as lines on the
// map grid — like the other contour boards in this file, not a shaded chart.
function SlopeContourMap({ slope }: { slope: string }) {
  const pts = SLOPE_GEO[slope] ?? SLOPE_GEO.even;
  const top = 16;
  const bot = 47;
  const mid = (top + bot) / 2;
  return (
    <g>
      {pts.map(([d], i) => {
        const x = slopeX(d);
        const isCrest = i === pts.length - 1;
        return (
          <g key={i}>
            <line x1={x} y1={top} x2={x} y2={bot} className="stroke-accent" strokeWidth={isCrest ? 0.7 : 0.42} />
            {/* downhill tick — points toward the foot (lower ground) */}
            <line x1={x} y1={mid} x2={x - 2.3} y2={mid} className="stroke-accent" strokeWidth="0.42" />
          </g>
        );
      })}
      <text x="16" y="57" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="4" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.1" strokeLinejoin="round">תחתית</text>
      <text x="84" y="57" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="4" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.1" strokeLinejoin="round">פסגה</text>
      <text x="50" y="9.5" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="3.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">צפוף = תלול · מרווח = מתון</text>
    </g>
  );
}
function SoftDivider({ text }: { text: string }) {
return (
 <div className="my-12 flex items-center gap-4">
 <div className="h-px flex-1 bg-border-subtle" />
 <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
 <div className="h-px flex-1 bg-border-subtle" />
 </div>
 );
}
