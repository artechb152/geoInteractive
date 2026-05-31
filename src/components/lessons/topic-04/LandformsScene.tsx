'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
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
title={
 <>
5 צורות נוף ש<span className="gradient-text">חוזרות בכל מלחמה</span>
 </>
 }
intro="מתוך אינספור צורות בטבע, קיימות 5 צורות יסוד טופוגרפיות שמעצבות כל שדה קרב יבשתי. מפקד שיודע לזהות אותן על המפה מבין מיד מי שולט בשטח, איפה האויב יציב מארב ומאיפה הכי בטוח להתקדם."
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
 מה זה
 </div>
 <p className="text-sm leading-relaxed text-fg">{f.description}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 איך מזהים במפה
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

 {/* Visualization — second child → LEFT in RTL */}
 <div className="surface-elevated relative overflow-hidden min-h-[320px] sticky top-6">
 <AnimatePresence mode="wait">
 <motion.div
key={active}
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.3 }}
className="absolute inset-0"
 >
 <FormVisual form={active} />
 </motion.div>
 </AnimatePresence>
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
function FormVisual({ form }: { form: Form }) {
return (
 <div className="aspect-[4/3] sm:aspect-auto h-full relative">
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
 <rect x="0" y="0" width="100" height="75" className="fill-bg" />
 {/* Grid */}
 {Array.from({ length: 10 }).map((_, i) => (
 <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
 ))}
 {Array.from({ length: 8 }).map((_, i) => (
 <line key={'gy' + i} x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
 ))}

 {form === 'hill' && <HillContours />}
 {form === 'spur' && <SpurContours />}
 {form === 'valley' && <ValleyContours />}
 {form === 'saddle' && <SaddleContours />}
 {form === 'depression' && <DepressionContours />}
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <Icon name="layers" size={11} className="text-accent" />
 תצוגה במפה טופוגרפית
 </div>
 </div>
 );
}
function HillContours() {
return (
 <g>
 {[
 { rx: 36, ry: 22 },
 { rx: 28, ry: 17 },
 { rx: 20, ry: 12 },
 { rx: 12, ry: 7 },
 { rx: 5, ry: 3 },
 ].map((c, i) => (
 <ellipse key={i} cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
 ))}
 <polygon points="50,36 47,42 53,42" className="fill-accent" />
 <text x="50" y="38" textAnchor="middle" className="fill-accent text-[2.3px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >פסגה</text>
 </g>
 );
}
function SpurContours() {
 // V-shapes pointing down (toward lower ground at bottom)
return (
 <g>
 {[18, 26, 34, 42, 50].map((y, i) => (
 <path
key={i}
d={`M ${20} ${y} Q ${50} ${y + 12} ${80} ${y}`}
fill="none"
className="stroke-accent"
strokeWidth={i === 0 ? 0.5 : 0.3}
 />
 ))}
 <text x="50" y="68" textAnchor="middle" className="fill-accent text-[2.5px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >↓ שלוחה יורדת</text>
 <text x="50" y="14" textAnchor="middle" className="fill-fg-muted text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >הרכס</text>
 </g>
 );
}
function ValleyContours() {
 // V-shapes pointing UP (opposite of spur)
return (
 <g>
 {[58, 50, 42, 34, 26].map((y, i) => (
 <path
key={i}
d={`M ${20} ${y} Q ${50} ${y - 12} ${80} ${y}`}
fill="none"
className="stroke-accent"
strokeWidth={i === 0 ? 0.5 : 0.3}
 />
 ))}
 <text x="50" y="68" textAnchor="middle" className="fill-accent text-[2.5px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >↑ הגיא יורד</text>
 <line x1="20" y1="58" x2="50" y2="46" className="stroke-terrain-sky" strokeWidth="0.6" />
 <line x1="50" y1="46" x2="80" y2="58" className="stroke-terrain-sky" strokeWidth="0.6" />
 <text x="50" y="44" textAnchor="middle" className="fill-terrain-sky text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >קו ניקוז</text>
 </g>
 );
}
function SaddleContours() {
 // Two hills with low pass between
return (
 <g>
 {/* Left hill */}
 {[
 { rx: 14, ry: 9 },
 { rx: 10, ry: 6 },
 { rx: 6, ry: 4 },
 ].map((c, i) => (
 <ellipse key={'l' + i} cx="28" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
 ))}
 {/* Right hill */}
 {[
 { rx: 14, ry: 9 },
 { rx: 10, ry: 6 },
 { rx: 6, ry: 4 },
 ].map((c, i) => (
 <ellipse key={'r' + i} cx="72" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
 ))}
 {/* Saddle indicator */}
 <ellipse cx="50" cy="38" rx="5" ry="3" fill="none" className="stroke-accent-hot" strokeWidth="0.5" strokeDasharray="0.8 0.6" />
 <text x="50" y="39" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >אוכף</text>
 <text x="28" y="28" textAnchor="middle" className="fill-fg-muted text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >כיפה</text>
 <text x="72" y="28" textAnchor="middle" className="fill-fg-muted text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >כיפה</text>
 </g>
 );
}
function DepressionContours() {
return (
 <g>
 {[
 { rx: 28, ry: 18 },
 { rx: 20, ry: 13 },
 { rx: 13, ry: 8 },
 { rx: 7, ry: 4 },
 ].map((c, i) => (
 <g key={i}>
 <ellipse cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
 {/* Tick marks pointing inward to indicate depression */}
 {Array.from({ length: 8 }).map((_, j) => {
const a = (j * 45 * Math.PI) / 180;
const x1 = 50 + Math.cos(a) * c.rx;
const y1 = 38 + Math.sin(a) * c.ry;
const x2 = 50 + Math.cos(a) * (c.rx - 1.5);
const y2 = 38 + Math.sin(a) * (c.ry - 1.5);
return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-accent" strokeWidth="0.2" />;
 })}
 </g>
 ))}
 <text x="50" y="40" textAnchor="middle" className="fill-accent text-[2.5px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >↓ שקע</text>
 <text x="50" y="14" textAnchor="middle" className="fill-fg-muted text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >הזיזים פונים פנימה = השטח שם נמוך</text>
 </g>
 );
}
function SlopeAnalyzer({ slopes, active, onSelect }: { slopes: Slope[]; active: string; onSelect: (id: string) => void }) {
const meta = slopes.find((s) => s.id === active)!;
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
 'p-3 rounded-xl border-2 text-right transition-all relative overflow-hidden flex items-center gap-3',
isActive ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
 {isActive && (
 <motion.span
 layoutId="t4-slope-bar"
 className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
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

 <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-stretch">
 <div className="surface bg-bg-elevated relative overflow-hidden h-full min-h-[260px]">
 <SlopeProfile slope={active} />
 </div>

 <motion.div
key={active}
initial={{ opacity: 0, x: 10 }}
animate={{ opacity: 1, x: 0 }}
className="space-y-3"
 >
 <div className="surface-elevated p-5">
 <div className="text-sm font-display font-semibold text-accent-cool mb-2 tracking-wider">
 מה זה
 </div>
 <p className="text-sm leading-relaxed text-fg">{meta.description}</p>
 </div>
 <div className="surface p-5">
 <div className="text-sm font-display font-semibold text-accent mb-2 tracking-wider">
 איך מזהים במפה
 </div>
 <p className="text-sm leading-relaxed text-fg-muted">{meta.contourHint}</p>
 </div>
 </motion.div>
 </div>
 </div>
 );
}
function SlopeProfile({ slope }: { slope: string }) {
const PATHS: Record<string, string> = {
even: 'M 5 60 L 90 12',
convex: 'M 5 60 Q 30 50 60 25 L 90 18',
concave: 'M 5 60 L 35 50 Q 65 35 90 12',
shoulder: 'M 5 60 L 30 35 L 60 32 L 90 12',
 };
return (
 <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
 <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

 {/* Grid */}
 {Array.from({ length: 10 }).map((_, i) => (
 <g key={i}>
 <line x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
 <line x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
 </g>
 ))}

 {/* Ground line */}
 <line x1="0" y1="65" x2="100" y2="65" className="stroke-border-strong" strokeWidth="0.3" strokeDasharray="1 0.5" />

 {/* The slope profile */}
 <path d={PATHS[slope]} fill="none" className="stroke-accent" strokeWidth="0.8" />

 {/* Filled below */}
 <path d={`${PATHS[slope]} L 90 65 L 5 65 Z`} className="fill-terrain-ridge/20" />

 {/* Labels */}
 <text x="5" y="69" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >תחתית</text>
 <text x="90" y="9" textAnchor="end" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >פסגה</text>
 </svg>
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
