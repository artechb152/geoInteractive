'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Scale = {
id: '10k' | '50k' | '250k';
ratio: number;
label: string;
size: 'גדול' | 'בינוני' | 'קטן';
use: string;
who: string;
detail: string[];
};
const SCALES: Scale[] = [
 {
id: '10k',
ratio: 10000,
label: '1:10,000',
size: 'גדול',
who: 'מפת עיר / ניווט טקטי',
use: 'תכנון פשיטה או מעצר ברמת הלוחם הבודד והצוות.',
detail: ['"זום חזק" פנימה', 'רואים בניינים, גדרות ועצים בודדים', 'כל קו גובה = 5 מטרים'],
 },
 {
id: '50k',
ratio: 50000,
label: '1:50,000',
size: 'בינוני',
who: 'ניווט רגלי - הסטנדרט הצה"לי',
use: 'השפה המשותפת של הצבא. תכנון תנועת גדוד וחטיבה.',
detail: ['איזון בין פירוט לשטח', 'רואים יישובים, ערוצי נחלים ודרכי עפר', 'כל קו גובה = 10 מטרים'],
 },
 {
id: '250k',
ratio: 250000,
label: '1:250,000',
size: 'קטן',
who: 'תכנון אסטרטגי / טיסות',
use: 'ראיית"התמונה הגדולה". תנועת אוגדות ומטוסים במרחב.',
detail: ['"זום החוצה" למבט על', 'רואים ערים ככתם ורק כבישים ארציים', 'קווי גובה כלליים (50-100 מ\')'],
 },
];
export function ScaleScene() {
const [scale, setScale] = useState<Scale>(SCALES[1]);
const [mapDistance, setMapDistance] = useState(4); // cm
const realKm = (mapDistance * scale.ratio) / 100000;
return (
 <section id="scene-scale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <SceneHeader
step="02.2"
eyebrow="קנה מידה"
title={
          <>
          איך יחס של מספר אחד קטן — <span className="gradient-text">משנה את כל התמונה המבצעית</span>
          </>
        }intro={`קנה מידה הוא הדרך שלנו להבין כמה השטח"התכווץ" כדי להיכנס למפה. הנוסחה פשוטה: 1 ס"מ במפה = X סנטימטרים במציאות. למשל ב-1:50,000, כל ס"מ במפה שווה ל-500 מטר בשטח.`}
 />

 {/* Concept · slim divided takeaway row */}
 <div className="surface p-4 sm:p-5 rounded-[3px] mb-10 grid sm:grid-cols-2 gap-4 sm:gap-0">
 <div className="flex flex-col gap-2 sm:pe-6 sm:border-e sm:border-border">
 <div className="flex items-center gap-2">
 <SearchIcon className="size-4 text-accent shrink-0" />
 <h3 className="font-display font-bold text-base sm:text-lg leading-snug text-fg">
 גדול או קטן? <span className="text-fg-muted font-medium">לפי הפירוט — לא המספר</span>
 </h3>
 </div>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 אל תסתכלו על המספר הגדול במכנה — תחשבו על רמת הפירוט. <strong className="text-fg">1:10,000 הוא קנה מידה גדול</strong> כי רואים בו פרטים גדולים וברורים (כמו זום חזק פנימה).
 </p>
 </div>

 <div className="flex flex-col gap-2 sm:ps-6">
 <div className="flex items-center gap-2">
 <SwapIcon className="size-4 text-accent shrink-0" />
 <h3 className="font-display font-bold text-base sm:text-lg leading-snug text-fg">
 ככל שהמספר גדול יותר — קנה המידה קטן יותר
 </h3>
 </div>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 ב-1:250,000 כל ס"מ במפה שווה ל-2.5 ק"מ בשטח — רואים את התמונה הגדולה אבל מאבדים את הפרטים. <strong className="text-fg">קנה מידה קטן = זום החוצה</strong>.
 </p>
 </div>
 </div>

 {/* Scale Selection — vertical panel list, mirrors "בחר קנה מידה" mockup */}
 <div className="surface p-4 sm:p-5 rounded-[3px] mb-6">
 <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
 בחר קנה מידה
 </div>
 <div className="flex flex-col gap-3">
 {SCALES.map((s) => {
const active = s.id === scale.id;
const scaleIconName = s.id === '10k' ? 'crosshair' : s.id === '50k' ? 'compass' : 'plane';
return (
 <button
key={s.id}
onClick={() => setScale(s)}
className={cn(
 'p-3 sm:p-4 text-start transition-all relative flex items-center gap-3 rounded-[3px] border w-full',
active ? 'border-accent bg-bg-elevated' : 'bg-bg-elevated border-border hover:border-accent/50'
 )}
 >
 <span
className={cn(
 'size-11 sm:size-12 rounded-full flex items-center justify-center shrink-0 border transition-all',
active ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 <Icon name={scaleIconName} size={20} strokeWidth={1.8} />
 </span>
 <div className="flex-1 min-w-0 text-start">
 <div className="flex items-baseline gap-2">
 <span className="font-display font-bold text-xl sm:text-2xl text-fg tabular-nums leading-none">
 {s.label}
 </span>
 <span className="text-sm text-fg-dim font-display font-medium">{s.size}</span>
 </div>
 <div className="text-xs sm:text-[13px] text-fg-muted mt-1 leading-snug">
 {s.who}
 </div>
 </div>
 {active && (
 <span className="size-6 rounded-full bg-accent text-bg-elevated flex items-center justify-center shrink-0">
 <Icon name="check" size={13} strokeWidth={3} />
 </span>
 )}
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
 {/* Map Preview Area */}
 <div className="surface-elevated bg-bg relative overflow-hidden border border-border/50 rounded-[3px]">
 <ScalePreview scale={scale} />
 </div>

 {/* Sidebar Controls & Info */}
 <div className="space-y-4">
 <div className="surface-elevated p-5 rounded-[3px]">
 <div className="flex items-center justify-between mb-1">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מחשבון"מה המרחק?"
 </div>
 <RulerIcon className="size-4 text-fg-dim shrink-0" />
 </div>
 <div className="text-xs text-fg-muted mb-4 pb-3 border-b border-border-subtle">
 כמה נלך ברגל? מדדו בס"מ וקבלו את המרחק האמיתי
 </div>

 {/* Matches the mockup's start→end "equation" reading (like the numerals/
     percent rule: this mini-calculator reads input then output, laid out
     start to end, even inside the RTL page). DOM order is unchanged
     (input, arrow, output); `row-reverse` flips only the visual placement
     so the input sits at the inline end and the output at the inline
     start, matching the reference image. */}
 <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-2 sm:gap-4">
 <div className="flex flex-col items-center gap-1">
 <input
type="number"
min={0.1}
max={100}
step={0.1}
value={mapDistance}
onChange={(e) => setMapDistance(Number(e.target.value) || 0)}
className="w-16 bg-transparent border-b border-transparent focus:border-accent px-0 py-0 font-display font-bold text-3xl sm:text-4xl tabular-nums text-accent text-center outline-none transition-colors"
 />
 <span className="text-fg-muted text-xs">ס״מ במפה</span>
 </div>

 <svg
width="16"
height="16"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
className="text-fg-dim shrink-0 sm:-rotate-90"
aria-hidden
 >
 <path d="M12 5v14M19 12l-7 7-7-7" />
 </svg>

 <div className="flex flex-col items-center gap-1">
 <span className="font-display font-bold text-3xl sm:text-4xl tabular-nums text-fg">
 {realKm.toFixed(2)}
 </span>
 <span className="text-fg-muted text-xs">ק״מ בשטח</span>
 </div>
 </div>
 <div className="text-center text-[11px] text-fg-dim mt-2">מרחק אווירי בשטח</div>

 <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-fg-dim font-display font-medium tracking-wide italic">
 * טיפ: במפת 1:50,000, פשוט מחלקים את הס"מ ב-2 כדי לקבל ק"מ.
 </div>
 </div>

 <AnimatePresence mode="wait">
 <motion.div
key={scale.id}
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -20 }}
transition={{ duration: 0.2 }}
className="surface p-5 rounded-[3px]"
 >
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">
 רזולוציה קרטוגרפית
 </div>
 <ul className="space-y-2 text-sm mb-4">
 {scale.detail.map((d) => (
 <li key={d} className="flex gap-2 items-start">
 <Icon name="check" size={14} className="text-accent mt-0.5 shrink-0" strokeWidth={3} />
 <span className="leading-tight">{d}</span>
 </li>
 ))}
 </ul>
 <div className="pt-3 border-t border-border-subtle">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">משימה אופיינית</div>
 <div className="text-sm text-accent font-bold leading-relaxed">{scale.use}</div>
 </div>
 </motion.div>
 </AnimatePresence>
 </div>
 </div>

 <ProjectionCallout />
 </section>
 );
}
function ScalePreview({ scale }: { scale: Scale }) {
const detailLevel = scale.id === '10k' ? 'high' : scale.id === '50k' ? 'medium' : 'low';
const gridStep = detailLevel === 'low' ? 20 : detailLevel === 'medium' ? 10 : 5;
const gridCount = detailLevel === 'low' ? 6 : detailLevel === 'medium' ? 11 : 21;
return (
 <div className="relative w-full h-full min-h-[320px] bg-bg">
 <svg viewBox="0 0 100 75" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
 <rect x="0" y="0" width="100" height="75" className="fill-bg" />

 {/* Dynamic Grid based on scale */}
 {Array.from({ length: gridCount }).map((_, i) => (
 <g key={i}>
 <line x1={i * gridStep} y1="0" x2={i * gridStep} y2="75" className="stroke-border-subtle" strokeWidth="0.05" />
 <line x1="0" y1={i * gridStep} x2="100" y2={i * gridStep} className="stroke-border-subtle" strokeWidth="0.05" />
 </g>
 ))}

 {/* Decorative coordinate-frame ticks — schematic grid-index labels (the
     raw internal SVG grid coordinate, not a real-world reference), purely a
     "topo map" chrome cue; no fabricated place/coordinate data */}
 {Array.from({ length: gridCount }).map((_, i) => {
if (i === 0 || i % 2 !== 0) return null;
return (
 <text
key={`gx-${i}`}
x={i * gridStep}
y="3.2"
textAnchor="middle"
style={{ fontSize: '2px' }}
className="fill-border-strong font-display font-medium tabular-nums"
 >
 {i * gridStep}
 </text>
 );
 })}
 {Array.from({ length: gridCount }).map((_, i) => {
if (i === 0 || i % 2 !== 0) return null;
return (
 <text
key={`gy-${i}`}
x="1.5"
y={i * gridStep + 1}
textAnchor="start"
style={{ fontSize: '2px' }}
className="fill-border-strong font-display font-medium tabular-nums"
 >
 {i * gridStep}
 </text>
 );
 })}
 <rect x="0" y="0" width="100" height="75" fill="none" className="stroke-border-strong/50" strokeWidth="0.15" />

 {/* Contours - Representing a hill */}
 {(detailLevel === 'high'
 ? [{ rx: 40, ry: 28 }, { rx: 32, ry: 22 }, { rx: 26, ry: 18 }, { rx: 20, ry: 14 }, { rx: 14, ry: 10 }, { rx: 8, ry: 6 }]
 : detailLevel === 'medium'
 ? [{ rx: 35, ry: 24 }, { rx: 25, ry: 17 }, { rx: 15, ry: 11 }, { rx: 7, ry: 5 }]
 : [{ rx: 30, ry: 22 }, { rx: 18, ry: 13 }]
 ).map((c, i) => (
 <ellipse key={i} cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-border-strong/60" strokeWidth={detailLevel === 'high' ? 0.2 : 0.4} />
 ))}

 {/* High Scale Details: Small houses, individual objects */}
 {detailLevel === 'high' && [
 [25, 55], [27, 56], [29, 54], [31, 56], [33, 55], [35, 57], [62, 50], [64, 52], [66, 51], [68, 50],
 ].map(([x, y], i) => (
 <rect key={i} x={x} y={y} width="1" height="1" className="fill-fg-muted" rx="0.2" />
 ))}

 {/* Medium Scale: Built-up area polygons */}
 {detailLevel === 'medium' && [
 [25, 55, 6, 4], [62, 50, 8, 5],
 ].map(([x, y, w, h], i) => (
 <rect key={i} x={x} y={y} width={w} height={h} className="fill-fg-muted/40 stroke-fg-muted/50" strokeWidth="0.1" />
 ))}

 {/* Low Scale: Large labeled regions */}
 {detailLevel === 'low' && [
 { x: 20, y: 50, w: 14, h: 10, label: 'גזרת תכנון א\'' },
 { x: 60, y: 45, w: 18, h: 12, label: 'גזרת תכנון ב\'' },
 ].map((p, i) => (
 <g key={i}>
 <rect x={p.x} y={p.y} width={p.w} height={p.h} className="fill-fg-muted/20 stroke-fg-muted/40" strokeWidth="0.2" />
 <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 0.5} textAnchor="middle" className="fill-fg-dim text-[2.5px] font-display font-bold font-bold tracking-tighter"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >{p.label}</text>
 </g>
 ))}

 {/* Main Road */}
 <path d={detailLevel === 'low' ?"M0 60 L 100 50" :"M0 60 Q 30 58 50 56 T 100 50"} fill="none" className="stroke-accent/60" strokeWidth={detailLevel === 'high' ? 0.4 : 0.8} 
 />

 {/* Scale Bar — boxed ruler with quarter tick marks (visual only; the two
     endpoint captions keep their exact existing conditional values) */}
 <g transform="translate(68, 68)">
 <rect x="-3" y="-5.5" width="28" height="9.5" fill="none" className="stroke-border-strong/50" strokeWidth="0.15" />
 <rect x="0" y="0" width="22" height="1.5" className="fill-fg/20" />
 <rect x="0" y="0" width="11" height="1.5" className="fill-accent" />
 {[0, 5.5, 11, 16.5, 22].map((tx) => (
 <line key={tx} x1={tx} y1="0" x2={tx} y2="1.5" className="stroke-bg" strokeWidth="0.15" />
 ))}
 <text x="0" y="-1.5" textAnchor="start" className="fill-fg-dim text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >0</text>
 <text x="22" y="-1.5" textAnchor="end" className="fill-fg-dim text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
 {scale.id === '10k' ? '500 מ׳' : scale.id === '50k' ? '2.5 ק״מ' : '12.5 ק״מ'}
 </text>
 <text x="11" y="3.6" textAnchor="middle" style={{ fontSize: '1.6px' }} className="fill-fg-dim font-display font-medium"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.7"
        strokeLinejoin="round"
      >
 {scale.label}
 </text>
 </g>
 </svg>

 <div className="absolute top-4 start-4 chip border-accent/20 bg-bg/80 backdrop-blur-md text-[10px] text-accent font-bold font-display tracking-wide px-2 py-1 rounded">
 {scale.label}
 </div>
 </div>
 );
}
function ProjectionCallout() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="mt-8 surface-elevated p-6 rounded-[3px]"
 >
 <div className="flex gap-4 items-start">
 <Icon name="globe" size={24} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider font-bold">
 למה כל מפה"משקרת" קצת?
 </div>
 <p className="text-fg leading-relaxed text-sm mb-6 text-pretty">
 כדור הארץ הוא כדור עגול, אבל המפה שלכם היא דף שטוח. אי אפשר לשטח כדור בלי למתוח או לקרוע אותו – תחשבו על ניסיון לשטח קליפה של תפוז על שולחן.
 השיטה שבה בוחרים"למתוח" את העולם נקראת <strong>היטל</strong>, וכל בחירה כזו היא פשרה בין דיוק במרחק, בצורה או בכיוון.
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-border">
 <div className="lg:pe-4">
 <ProjectionTile icon="cylinder" name="Transverse Mercator" scope="היטל צבאי מקומי" tradeoff="המדויק ביותר לישראל. משמש את צה''ל לניווט, תצפית וירי ארטילרי."
 />
 </div>
 <div className="lg:px-4">
 <ProjectionTile icon="globe" name="Web Mercator" scope="גוגל מפות (Web)" tradeoff="נוח לניווט עירוני, אבל מעוות שטחים (גרינלנד נראית גדולה מאפריקה)."
 />
 </div>
 <div className="lg:px-4">
 <ProjectionTile icon="grid-globe" name="UTM" scope="סטנדרט נאט''ו" tradeoff="מחלק את העולם ל-60 רצועות דיוק. חיוני לעבודה עם צבאות זרים."
 />
 </div>
 <div className="lg:ps-4">
 <div className="flex items-start gap-2 mb-1">
 <svg
width="18"
height="18"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
className="text-accent shrink-0 mt-0.5"
aria-hidden
 >
 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
 <path d="M12 9v4" />
 <path d="M12 17h.01" />
 </svg>
 <span className="font-display font-bold text-sm text-accent leading-snug">טעות קריטית</span>
 </div>
 <p className="text-fg-muted text-xs leading-relaxed">
 שימוש בהיטל לא נכון בתכנון מסלול של טיל ארוך טווח יגרום להחטאת המטרה בעשרות קילומטרים בגלל עיוותי המפה.
 </p>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 );
}
function ProjectionTile({
icon,
name,
scope,
tradeoff,
}: {
icon: 'cylinder' | 'globe' | 'grid-globe';
name: string;
scope: string;
tradeoff: string;
}) {
return (
 <div>
 <div className="mb-2 text-accent-cool">
 {icon === 'cylinder' && (
 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
 <ellipse cx="12" cy="5" rx="8" ry="2.5" />
 <path d="M4 5v10c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5" />
 <path d="M4 10c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5" />
 </svg>
 )}
 {icon === 'globe' && <Icon name="globe" size={22} strokeWidth={1.5} />}
 {icon === 'grid-globe' && (
 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
 <circle cx="12" cy="12" r="9" />
 <path d="M3 9h18M3 15h18M9 3a20 20 0 0 0 0 18M15 3a20 20 0 0 0 0 18" />
 </svg>
 )}
 </div>
 <div className="font-bold text-sm text-accent-cool mb-1">{name}</div>
 <div className="text-[10px] text-fg-dim mb-2 uppercase tracking-wider font-display font-medium">{scope}</div>
 <div className="text-fg-muted text-xs leading-relaxed">{tradeoff}</div>
 </div>
 );
}
function SearchIcon({ className }: { className?: string }) {
return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
 <circle cx="11" cy="11" r="7" />
 <path d="m20 20-3.5-3.5" />
 </svg>
 );
}
function SwapIcon({ className }: { className?: string }) {
return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
 <path d="M4 8h13M13 4l4 4-4 4" />
 <path d="M20 16H7M11 12l-4 4 4 4" />
 </svg>
 );
}
function RulerIcon({ className }: { className?: string }) {
return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
 <rect x="3" y="8" width="18" height="8" rx="1" transform="rotate(-45 12 12)" />
 <path d="M8.5 9.5 10 11M11.5 6.5 13 8M14.5 3.5 16 5" transform="rotate(-45 12 12)" />
 </svg>
 );
}