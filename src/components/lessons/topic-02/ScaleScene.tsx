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

 {/* Concept · matched pair feature cards */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
 <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 הכלל המנחה
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
 גדול או קטן? <span className="text-fg-muted font-medium text-base sm:text-lg">לפי הפירוט — לא המספר</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 אל תסתכלו על המספר הגדול במכנה — תחשבו על רמת הפירוט. <strong className="text-fg">1:10,000 הוא קנה מידה גדול</strong> כי רואים בו פרטים גדולים וברורים (כמו זום חזק פנימה).
 </p>
 </div>

 <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 ההיגיון ההפוך
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
 ככל שהמספר גדול יותר — קנה המידה קטן יותר
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 ב-1:250,000 כל ס"מ במפה שווה ל-2.5 ק"מ בשטח — רואים את התמונה הגדולה אבל מאבדים את הפרטים. <strong className="text-fg">קנה מידה קטן = זום החוצה</strong>.
 </p>
 </div>
 </div>

 {/* Scale Selection — OnboardingScene step-card pattern */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
 {SCALES.map((s) => {
const active = s.id === scale.id;
return (
 <button
key={s.id}
onClick={() => setScale(s)}
className={cn(
 'surface p-4 text-right transition-all relative overflow-hidden flex items-center gap-3 rounded-xl',
active ? 'border-accent bg-bg-elevated' : 'bg-bg-elevated border-border hover:border-accent/50'
 )}
 >
 {active && (
 <motion.span
layoutId="t2-scale-bar"
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
 )}
 <span
className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all',
active ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 <span className="font-display font-bold text-sm tabular-nums">{s.size === 'גדול' ? 'L' : s.size === 'בינוני' ? 'M' : 'S'}</span>
 </span>
 <div className="flex-1 min-w-0 text-right">
 <div className="font-display font-bold text-base text-fg leading-tight">
 {s.label}
 </div>
 <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-0.5">
 קנה {s.size} · {s.who}
 </div>
 </div>
 </button>
 );
 })}
 </div>

 <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
 {/* Map Preview Area */}
 <div className="surface-elevated bg-bg relative overflow-hidden border border-border/50 rounded-xl">
 <ScalePreview scale={scale} />
 </div>

 {/* Sidebar Controls & Info */}
 <div className="space-y-4">
 <div className="surface-elevated p-5 rounded-xl">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
 מחשבון"מה המרחק?"
 </div>
 <div className="text-xs text-fg-muted mb-3">
 כמה נלך ברגל? מדדו בס"מ וקבלו את המרחק האמיתי
 </div>

 <div className="flex items-end gap-2 mb-3">
 <input
type="number"
min={0.1}
max={100}
step={0.1}
value={mapDistance}
onChange={(e) => setMapDistance(Number(e.target.value) || 0)}
className="w-24 bg-bg-accent border border-border rounded-lg px-3 py-2 font-display font-medium tracking-wide text-xl tabular-nums focus:border-accent outline-none transition-colors"
 />
 <span className="text-fg-muted text-sm pb-2.5">ס״מ במפה</span>
 </div>

 <div className="flex items-center gap-2 text-fg-dim my-2">
 <svg
width="14"
height="14"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
className="sm:-rotate-90"
aria-hidden
 >
 <path d="M12 5v14M19 12l-7 7-7-7" />
 </svg>
 <span className="text-xs">מרחק אווירי בשטח</span>
 </div>

 <div className="flex items-baseline gap-2">
 <span className="font-display font-bold text-4xl tabular-nums text-accent">
 {realKm.toFixed(2)}
 </span>
 <span className="text-fg-muted text-sm font-medium">ק״מ</span>
 </div>

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
className="surface p-5 border-r-2 border-accent rounded-xl"
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
 <div className="text-sm text-fg font-medium leading-relaxed">{scale.use}</div>
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
return (
 <div className="relative w-full h-full min-h-[320px] bg-bg">
 <svg viewBox="0 0 100 75" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
 <rect x="0" y="0" width="100" height="75" className="fill-bg" />

 {/* Dynamic Grid based on scale */}
 {Array.from({ length: detailLevel === 'low' ? 6 : detailLevel === 'medium' ? 11 : 21 }).map((_, i) => {
const step = detailLevel === 'low' ? 20 : detailLevel === 'medium' ? 10 : 5;
return (
 <g key={i}>
 <line x1={i * step} y1="0" x2={i * step} y2="75" className="stroke-border-subtle" strokeWidth="0.05" />
 <line x1="0" y1={i * step} x2="100" y2={i * step} className="stroke-border-subtle" strokeWidth="0.05" />
 </g>
 );
 })}

 {/* Contours - Representing a hill */}
 {(detailLevel === 'high'
 ? [{ rx: 40, ry: 28 }, { rx: 32, ry: 22 }, { rx: 26, ry: 18 }, { rx: 20, ry: 14 }, { rx: 14, ry: 10 }, { rx: 8, ry: 6 }]
 : detailLevel === 'medium'
 ? [{ rx: 35, ry: 24 }, { rx: 25, ry: 17 }, { rx: 15, ry: 11 }, { rx: 7, ry: 5 }]
 : [{ rx: 30, ry: 22 }, { rx: 18, ry: 13 }]
 ).map((c, i) => (
 <ellipse key={i} cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent/40" strokeWidth={detailLevel === 'high' ? 0.2 : 0.4} />
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

 {/* Scale Bar */}
 <g transform="translate(68, 68)">
 <rect x="0" y="0" width="22" height="1.5" className="fill-fg/20" />
 <rect x="0" y="0" width="11" height="1.5" className="fill-accent" />
 <text x="0" y="-1.5" className="fill-fg-dim text-[2px] font-display font-bold"
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
className="mt-8 surface-elevated p-6 rounded-xl"
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

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <ProjectionTile name="Transverse Mercator" scope="היטל צבאי מקומי" tradeoff="המדויק ביותר לישראל. משמש את צה''ל לניווט, תצפית וירי ארטילרי." 
 />
 <ProjectionTile name="Web Mercator" scope="גוגל מפות (Web)" tradeoff="נוח לניווט עירוני, אבל מעוות שטחים (גרינלנד נראית גדולה מאפריקה)." 
 />
 <ProjectionTile name="UTM" scope="סטנדרט נאט''ו" tradeoff="מחלק את העולם ל-60 רצועות דיוק. חיוני לעבודה עם צבאות זרים." 
 />
 </div>

 <div className="mt-6 p-4 bg-accent-cool/5 rounded-lg border border-accent-cool/10 text-xs text-fg-muted flex items-center gap-3">
 <svg
width="16"
height="16"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
className="text-accent-cool shrink-0"
aria-hidden
 >
 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
 <path d="M12 9v4" />
 <path d="M12 17h.01" />
 </svg>
 <span>
 <strong className="text-fg-dim">טעות קריטית:</strong> שימוש בהיטל לא נכון בתכנון מסלול של טיל ארוך טווח יגרום להחטאת המטרה בעשרות קילומטרים בגלל עיוותי המפה.
 </span>
 </div>
 </div>
 </div>
 </motion.div>
 );
}
function ProjectionTile({ name, scope, tradeoff }: { name: string; scope: string; tradeoff: string }) {
return (
 <div className="surface p-4 border-t-2 border-accent-cool/20 rounded-b-lg">
 <div className="font-bold text-sm text-accent-cool mb-1">{name}</div>
 <div className="text-[10px] text-fg-dim mb-3 uppercase tracking-wider font-display font-medium">{scope}</div>
 <div className="text-fg-muted text-xs leading-relaxed">{tradeoff}</div>
 </div>
 );
}