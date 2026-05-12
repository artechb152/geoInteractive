'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Pattern = 'grid' | 'casbah';
type PatternData = {
id: Pattern;
label: string;
english: string;
desc: string;
losRange: string;
movement: string;
attacker: string;
defender: string;
example: string;
icon: IconName;
color: string;
bg: string;
border: string;
};
const PATTERNS: PatternData[] = [
 {
id: 'grid',
label: 'גריד עירוני',
english: 'Urban Grid',
desc: 'רחובות ישרים, צולבים בזוויות 90°. ערים מודרניות מתוכננות (ניו-יורק, וושינגטון, חיפה חדשה).',
losRange: 'קווי ראייה ארוכים לאורך הרחובות — מאות מטרים בשדרה. אבל קצרים מאוד לרוחב (חסום ע"י מבנים).',
movement: 'תנועה צפויה — צמתים מסומנים מראש. כוח מתמרן יודע איפה לפנות.',
attacker: 'יתרון: יכולת לחזות תנועות אויב, חופש תמרון בצירים מקבילים. חיסרון: חשיפה ל-Enfilade ארוך לאורך השדרה.',
defender: 'יתרון: אש"צוואר בקבוק" בצמתים. חיסרון: צריך להגן על כל פינה — מספר רב של כיוונים.',
example: 'באג\'דאד 2003, האמריקאים נעו בשדרות הרחבות וחטפו RPG מטילי קצה בכל פינה. רחוב Haifa Street הפך לסיוט.',
icon: 'layers',
color: 'text-accent',
bg: 'bg-accent/10',
border: 'border-accent/40',
 },
 {
id: 'casbah',
label: 'קסבה / סמטאות',
english: 'Casbah / Old Quarter',
desc: 'מבנה לא-סדור, סמטאות מתפתלות, בניינים נצמדים. ערים עתיקות, מחנות פליטים, קסבות.',
losRange: 'קווי ראייה קצרים מאוד — לעיתים פחות מ-10 מטרים. כל פינה = הפתעה.',
movement: 'תנועה מסובכת. GPS לא תמיד מעודכן. ניווט פיזי דורש מורה דרך מקומי.',
attacker: 'חיסרון: מארבים בכל סיבוב, מטענים מאולתרים בקירות. כוח גדול הופך לטור צר ופגיע.',
defender: 'יתרון מובהק: מכיר את הצדדים, מצוי בכל פתח אחורי. יכול להגיע למקום ולהיעלם תוך דקות.',
example: 'בקסבה הצרפתית של אלג\'יר (1957), המורדים שלטו ברחובות הצרים. הצרפתים נאלצו לגייס יחידות צניחה ולשטוף בית-בית.',
icon: 'eye',
color: 'text-accent-hot',
bg: 'bg-accent-hot/10',
border: 'border-accent-hot/40',
 },
];
export function UrbanMorphologyScene() {
const [pattern, setPattern] = useState<Pattern>('grid');
const meta = PATTERNS.find((p) => p.id === pattern)!;
return (
 <section id="scene-morphology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="10.1"
eyebrow="מורפולוגיה עירונית"
title={
 <>
 <span className="gradient-text">גריד או קסבה</span>? אותה משימה — שני עולמות
 </>
 }
intro="המבנה הגיאומטרי של העיר קובע את הקרב יותר מסוג הכוחות. רחוב ישר ומחושב לעומת סמטה מתפתלת — לא רק חוויית מעבר, אלא דוקטרינת לחימה אחרת לגמרי."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">MOUT</strong> (Military Operations in Urban Terrain) — דוקטרינת לחימה בשטח בנוי.
 <strong className="text-fg block mt-1.5">המאפיין הקריטי:</strong> טווחי היתקלות יורדים מקילומטרים בשטח פתוח — ל<strong>מטרים בודדים בסמטה</strong>. היתרון של טנק, חיל אוויר וצי קטן בעיר. היתרון של מי שמכיר את הסביבה הופך עצום.
 </div>
 </div>
 </div>

 {/* Pattern selector */}
 <div className="grid grid-cols-2 gap-2 mb-4">
 {PATTERNS.map((p) => {
const isActive = pattern === p.id;
return (
 <button
key={p.id}
onClick={() => setPattern(p.id)}
className={cn(
 'surface p-4 text-right transition-all rounded-xl flex items-center gap-3',
isActive ? `${p.border} shadow-glow ${p.bg}` : 'hover:border-border-strong'
 )}
 >
 <div className={cn('size-12 rounded-xl flex items-center justify-center border-2 shrink-0', p.border, p.bg)}>
 <Icon name={p.icon} size={20} className={p.color} />
 </div>
 <div>
 <div className={cn('font-display font-bold leading-tight', isActive && p.color)}>
 {p.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim">{p.english}</div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Comparison map */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
 מבט אווירי · {meta.label}
 </div>
 <UrbanMap pattern={pattern} />
 <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-fg-dim flex-wrap">
 <span className="flex items-center gap-1"><span className="size-2 bg-accent-cool rounded-full" /> כוח שלנו</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-status-ok/40 rounded-sm" /> שטח מואר (LOS)</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-status-danger/40 rounded-sm" /> שטח מת</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-accent-hot rounded-full" /> איום פוטנציאלי</span>
 </div>
 </div>

 {/* Pattern details */}
 <AnimatePresence mode="wait">
 <motion.div
key={meta.id}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
 >
 <div className="mb-4">
 <div className={cn('text-sm font-display font-semibold mb-1 tracking-wider', meta.color)}>
 {meta.english}
 </div>
 <h3 className={cn('font-display font-bold text-2xl leading-tight mb-2', meta.color)}>{meta.label}</h3>
 <p className="text-sm text-fg leading-relaxed">{meta.desc}</p>
 </div>

 <div className="grid sm:grid-cols-2 gap-3 mb-4">
 <div className="surface p-4 rounded-xl">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="eye" size={11} />
 טווח LOS
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.losRange}</p>
 </div>
 <div className="surface p-4 rounded-xl">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="truck" size={11} />
 תנועה
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.movement}</p>
 </div>
 </div>

 <div className="grid sm:grid-cols-2 gap-3 mb-4">
 <div className="surface p-4 rounded-xl bg-accent-cool/5 border-accent-cool/30">
 <div className="text-sm font-display font-semibold text-accent-cool mb-1.5 tracking-wider">לתוקף</div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.attacker}</p>
 </div>
 <div className="surface p-4 rounded-xl bg-accent-hot/5 border-accent-hot/30">
 <div className="text-sm font-display font-semibold text-accent-hot mb-1.5 tracking-wider">למגן</div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.defender}</p>
 </div>
 </div>

 <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה היסטורית</div>
 <p className="text-xs text-fg leading-relaxed italic">"{meta.example}"</p>
 </div>
 </motion.div>
 </AnimatePresence>

 {/* Enfilade concept callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="crosshair" size={22} className="text-accent" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
Enfilade · המושג הקלאסי שמת בעיר
 </div>
 <h3 className="font-display font-bold text-lg mb-2 leading-tight">
 קו אש שמתפרס לכל אורך הציר
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 <strong className="text-fg">Enfilade</strong> = ירי לאורך ציר תנועה. צלף בקצה השדרה יכול לפגוע בכל מי שעובר בה — לפעמים ב-300 מטרים שלמים. בערים גריד, זה האיום הראשי.
 <strong className="text-fg block mt-1.5">הפתרון הקלאסי:</strong> תנועה דרך גגות (Rat-running), פריצה בקירות במקום שימוש בדלתות, או הימנעות מציר ארוך בכלל.
 <strong className="text-fg block mt-1.5">לזכור:</strong> בסטלינגרד, שדרה אחת ארוכה הפכה ל-"שדרת המוות". גרמני שהציץ — היה מת תוך 3 שניות.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function UrbanMap({ pattern }: { pattern: Pattern }) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="urban-bg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#e6ebf2" />
 <stop offset="100%" stopColor="#dde6f0" />
 </linearGradient>
 </defs>
 <rect x="0" y="0" width="100" height="56" fill="url(#urban-bg)" />

 {pattern === 'grid' && <GridLayout />}
 {pattern === 'casbah' && <CasbahLayout />}
 </svg>
 </div>
 );
}
function GridLayout() {
 // Grid: regular blocks with wide streets
const blocks: { x: number; y: number; w: number; h: number }[] = [];
for (let row = 0; row < 4; row++) {
for (let col = 0; col < 7; col++) {
blocks.push({ x: 8 + col * 13, y: 5 + row * 12, w: 9, h: 8 });
 }
 }
return (
 <g>
 {/* Streets background */}
 <rect x="0" y="0" width="100" height="56" className="fill-terrain-ridge/10" />

 {/* Blocks */}
 {blocks.map((b, i) => (
 <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="fill-terrain-ridge/60 stroke-terrain-ridge" strokeWidth="0.2" />
 ))}

 {/* Soldier position */}
 <g>
 <circle cx="15" cy="28" r="1.6" className="fill-accent-cool" />
 </g>

 {/* Long LOS cone — visible along horizontal street */}
 <polygon points="15,28 95,26 95,32 15,30" className="fill-status-ok" opacity="0.18" />
 <line x1="15" y1="28" x2="95" y2="28" className="stroke-status-ok" strokeWidth="0.3" strokeDasharray="1.5 0.8" />
 <text x="55" y="25" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
LOS ארוך · 800 מ׳
 </text>

 {/* Dead spaces (behind buildings) */}
 {[
 { x: 19, y: 16 },
 { x: 32, y: 16 },
 { x: 45, y: 16 },
 { x: 19, y: 40 },
 { x: 32, y: 40 },
 ].map((d, i) => (
 <rect key={i} x={d.x - 1} y={d.y - 1} width="10" height="10" className="fill-status-danger" opacity="0.15" />
 ))}

 {/* Threat from end of street */}
 <g>
 <circle cx="93" cy="28" r="1.3" className="fill-accent-hot" />
 <circle cx="93" cy="28" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
 <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
 </circle>
 <text x="93" y="24" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 צלף · Enfilade
 </text>
 </g>

 {/* Stats label */}
 <text x="50" y="53" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 רחובות ישרים · קווי אש ארוכים · תנועה צפויה
 </text>
 </g>
 );
}
function CasbahLayout() {
 // Casbah: irregular blocks, twisting alleys
const blocks: { x: number; y: number; w: number; h: number; rot?: number }[] = [
 { x: 8, y: 6, w: 9, h: 7 },
 { x: 19, y: 4, w: 8, h: 9 },
 { x: 29, y: 7, w: 10, h: 6 },
 { x: 41, y: 5, w: 7, h: 8 },
 { x: 50, y: 6, w: 9, h: 7 },
 { x: 61, y: 4, w: 8, h: 8 },
 { x: 71, y: 7, w: 7, h: 7 },
 { x: 80, y: 5, w: 9, h: 9 },
 // Row 2 — staggered
 { x: 7, y: 16, w: 7, h: 8 },
 { x: 16, y: 18, w: 9, h: 6 },
 { x: 27, y: 16, w: 8, h: 9 },
 { x: 37, y: 19, w: 10, h: 6 },
 { x: 49, y: 17, w: 7, h: 8 },
 { x: 58, y: 18, w: 9, h: 7 },
 { x: 69, y: 16, w: 8, h: 9 },
 { x: 79, y: 18, w: 9, h: 6 },
 // Row 3
 { x: 9, y: 27, w: 8, h: 8 },
 { x: 19, y: 28, w: 9, h: 7 },
 { x: 30, y: 26, w: 7, h: 9 },
 { x: 39, y: 29, w: 9, h: 6 },
 { x: 50, y: 27, w: 8, h: 8 },
 { x: 60, y: 28, w: 9, h: 7 },
 { x: 71, y: 26, w: 8, h: 9 },
 { x: 81, y: 28, w: 8, h: 7 },
 // Row 4
 { x: 8, y: 38, w: 9, h: 8 },
 { x: 19, y: 39, w: 7, h: 7 },
 { x: 28, y: 37, w: 9, h: 9 },
 { x: 39, y: 40, w: 8, h: 6 },
 { x: 49, y: 38, w: 9, h: 8 },
 { x: 60, y: 39, w: 7, h: 7 },
 { x: 69, y: 37, w: 9, h: 9 },
 { x: 80, y: 40, w: 8, h: 6 },
 ];
return (
 <g>
 {/* Streets background */}
 <rect x="0" y="0" width="100" height="56" className="fill-terrain-ridge/15" />

 {/* Blocks — irregular */}
 {blocks.map((b, i) => (
 <rect
key={i}
x={b.x}
y={b.y}
width={b.w}
height={b.h}
className="fill-terrain-ridge/60 stroke-terrain-ridge"
strokeWidth="0.2"
 />
 ))}

 {/* Soldier position */}
 <g>
 <circle cx="12" cy="32" r="1.6" className="fill-accent-cool" />
 </g>

 {/* Short LOS cone — just up to first corner */}
 <polygon points="12,32 22,30 23,34 12,33" className="fill-status-ok" opacity="0.25" />
 <text x="18" y="29" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
LOS &lt; 8 מ׳
 </text>

 {/* Dead spaces (everywhere) */}
 {[
 { x: 28, y: 32 },
 { x: 42, y: 30 },
 { x: 58, y: 32 },
 { x: 72, y: 28 },
 { x: 30, y: 42 },
 { x: 50, y: 44 },
 ].map((d, i) => (
 <circle key={i} cx={d.x} cy={d.y} r="3" className="fill-status-danger" opacity="0.18" />
 ))}

 {/* Multiple threats — appearing from all directions */}
 {[
 { x: 32, y: 35, label: 'מארב' },
 { x: 55, y: 40, label: 'IED' },
 { x: 78, y: 30, label: 'צלף' },
 ].map((t, i) => (
 <g key={i}>
 <circle cx={t.x} cy={t.y} r="1" className="fill-accent-hot" />
 <circle cx={t.x} cy={t.y} r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.25">
 <animate attributeName="r" values="1.6;4;1.6" dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
 <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
 </circle>
 <text x={t.x} y={t.y - 2.2} textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="1.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">
 {t.label}
 </text>
 </g>
 ))}

 {/* Stats label */}
 <text x="50" y="53" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 סמטאות מתפתלות · LOS קצרים · איומים מכל פינה
 </text>
 </g>
 );
}
