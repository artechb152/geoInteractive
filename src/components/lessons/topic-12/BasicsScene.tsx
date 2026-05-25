'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Layer = 'elevation' | 'roads' | 'buildings' | 'threats';
type LayerData = {
id: Layer;
label: string;
english: string;
icon: IconName;
type: 'raster' | 'vector';
desc: string;
color: string;
bg: string;
border: string;
};
const LAYERS: LayerData[] = [
 {
id: 'elevation',
label: 'תבליט (גובה)',
english: 'DTM — Digital Terrain Model',
icon: 'mountain',
type: 'raster',
desc: 'מודל גובה ספרתי. כל פיקסל = ערך גובה במטרים. הבסיס לחישובי LOS, שיפועים, נסתרות.',
color: 'text-terrain-ridge',
bg: 'bg-terrain-ridge/10',
border: 'border-terrain-ridge/40',
 },
 {
id: 'roads',
label: 'דרכים',
english: 'Road Network',
icon: 'truck',
type: 'vector',
desc: 'קווים וקטוריים. לכל קו תכונות: סוג כביש, רוחב, מצב, יעד. בסיס ל-Network Analysis.',
color: 'text-accent',
bg: 'bg-accent/10',
border: 'border-accent/40',
 },
 {
id: 'buildings',
label: 'מבנים',
english: 'Buildings',
icon: 'capital',
type: 'vector',
desc: 'פוליגונים. כל מבנה עם תכונות: גובה, סוג, אוכלוסייה, רגישות. בסיס לתכנון תקיפה.',
color: 'text-accent-cool',
bg: 'bg-accent-cool/10',
border: 'border-accent-cool/40',
 },
 {
id: 'threats',
label: 'איומים',
english: 'Threat Sites',
icon: 'crosshair',
type: 'vector',
desc: 'נקודות. כל נקודה: סוג חימוש, טווח, סטטוס. בסיס ל-Buffer Analysis.',
color: 'text-status-danger',
bg: 'bg-status-danger/10',
border: 'border-status-danger/40',
 },
];
type Building = { id: number; type: string; height: number; pop: number; sensitive: boolean };
const BUILDINGS: Building[] = [
 { id: 1, type: 'מגורים', height: 12, pop: 80, sensitive: false },
 { id: 2, type: 'בית חולים', height: 8, pop: 200, sensitive: true },
 { id: 3, type: 'מסחרי', height: 15, pop: 30, sensitive: false },
 { id: 4, type: 'בית ספר', height: 4, pop: 150, sensitive: true },
];
export function BasicsScene() {
const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['elevation', 'roads']));
const [model, setModel] = useState<'raster' | 'vector'>('vector');
const [queriedSensitive, setQueriedSensitive] = useState(false);
const toggleLayer = (id: Layer) => {
setActiveLayers((prev) => {
const next = new Set(prev);
if (next.has(id)) next.delete(id);
else next.add(id);
return next;
 });
 };
return (
 <section id="scene-basics" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="12.1"
eyebrow="GIS Basics — שכבות וסוגי נתונים"
title={
 <>
 <span className="gradient-text">שכבות</span> + <span className="gradient-text">ראסטר/וקטור</span> = GIS
 </>
 }
intro="כל GIS בנוי משכבות. כל שכבה היא 'שקף שקוף'. ויש שני אופנים שהמחשב רואה את העולם — ראסטר (פיקסלים) או וקטור (אובייקטים). ההבדל הזה הוא הכל."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">העיקרון:</strong> כל סוג מידע = שכבה נפרדת. הלבשת שכבה על שכבה (<strong className="text-fg">Overlay</strong>) = תמונה רב-ממדית.
 <strong className="text-fg block mt-1.5">ראסטר</strong> (Raster) — רשת פיקסלים, כל פיקסל ערך אחד. מתאים לתופעות רציפות (גובה, טמפ׳).
 <strong className="text-fg block">וקטור</strong> (Vector) — אובייקטים בודדים (נקודות/קווים/פוליגונים), כל אחד עם <strong className="text-fg">טבלת תכונות</strong>. מתאים לשאילתות.
 </div>
 </div>
 </div>

 {/* Layer toggles */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
 {LAYERS.map((l) => {
const isActive = activeLayers.has(l.id);
return (
 <button
key={l.id}
onClick={() => toggleLayer(l.id)}
className={cn(
 'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
isActive ? `${l.border} shadow-glow ${l.bg}` : 'hover:border-border-strong opacity-70'
 )}
 >
 <div className={cn('size-10 rounded-lg flex items-center justify-center border-2 shrink-0', l.border, l.bg)}>
 <Icon name={l.icon} size={18} className={l.color} />
 </div>
 <div className="min-w-0">
 <div className={cn('font-display font-bold text-sm leading-tight', isActive && l.color)}>
 {l.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim">
 {l.type === 'raster' ? '◧ ראסטר' : '◢ וקטור'}
 </div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Map */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מפת GIS · {activeLayers.size}/4 שכבות פעילות
 </div>
 </div>
 <LayerMap activeLayers={activeLayers} />
 </div>

 <SoftDivider text="ראסטר מול וקטור · אותו אזור, שני אופנים" />

 {/* Raster vs Vector */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 השוואה: {model === 'raster' ? 'ראסטר — פיקסלים' : 'וקטור — אובייקטים'}
 </div>
 <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
 {(['raster', 'vector'] as const).map((m) => (
 <button
key={m}
onClick={() => setModel(m)}
className={cn(
 'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
model === m ? 'bg-accent text-bg shadow-glow' : 'text-fg-muted hover:text-fg'
 )}
 >
 {m === 'raster' ? '◧ ראסטר' : '◢ וקטור'}
 </button>
 ))}
 </div>
 </div>

 <RasterVectorCompare model={model} />

 <div className="mt-4 grid sm:grid-cols-2 gap-3">
 <div className={cn('surface p-4 rounded-xl', model === 'raster' ? 'border-accent shadow-glow' : 'opacity-60')}>
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">ראסטר</div>
 <div className="font-display font-bold mb-2 leading-tight">רשת פיקסלים · ערך אחד לכל תא</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">דוגמה:</strong> DTM (מודל גבהים), צילום לוויין, מפת טמפ׳. רזולוציה תלויה בגודל הפיקסל — קטן יותר = מדויק יותר אבל קובץ גדול.
 </p>
 </div>
 <div className={cn('surface p-4 rounded-xl', model === 'vector' ? 'border-accent shadow-glow' : 'opacity-60')}>
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">וקטור</div>
 <div className="font-display font-bold mb-2 leading-tight">אובייקטים גיאומטריים · עם טבלת תכונות</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">דוגמה:</strong> כבישים (קווים), מבנים (פוליגונים), אנטנות (נקודות). כל אובייקט = שורה בטבלה עם <strong className="text-fg">תכונות נשאלות</strong>.
 </p>
 </div>
 </div>
 </div>

 <SoftDivider text="הכוח של וקטור · שאילתות חכמות" />

 {/* Vector query demo */}
 <div className="surface-elevated p-5 rounded-2xl mb-12">
 <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
 טבלת תכונות · 4 מבנים בגזרה
 </div>

 <div className="overflow-x-auto -mx-5 px-5 mb-4">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="border-b border-border">
 <th className="text-right py-2 px-3 text-xs font-mono text-fg-dim">ID</th>
 <th className="text-right py-2 px-3 text-xs font-mono text-fg-dim">סוג</th>
 <th className="text-right py-2 px-3 text-xs font-mono text-fg-dim">גובה (מ׳)</th>
 <th className="text-right py-2 px-3 text-xs font-mono text-fg-dim">אוכלוסייה</th>
 <th className="text-right py-2 px-3 text-xs font-mono text-fg-dim">רגיש?</th>
 </tr>
 </thead>
 <tbody>
 {BUILDINGS.map((b) => {
const highlight = queriedSensitive && b.sensitive;
return (
 <tr key={b.id} className={cn('border-b border-border-subtle transition-colors', highlight && 'bg-status-warn/10')}>
 <td className="py-2 px-3 font-mono text-fg-dim">{b.id}</td>
 <td className="py-2 px-3 text-fg">{b.type}</td>
 <td className="py-2 px-3 tabular-nums">{b.height}</td>
 <td className="py-2 px-3 tabular-nums">{b.pop}</td>
 <td className="py-2 px-3">
 {b.sensitive ? (
 <span className="text-status-warn font-mono font-bold">✓ כן</span>
 ) : (
 <span className="text-fg-dim font-mono">לא</span>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 <div className="flex items-center gap-3 flex-wrap">
 <button
onClick={() => setQueriedSensitive(!queriedSensitive)}
className={cn(
 'px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all',
queriedSensitive
 ? 'bg-status-warn text-bg shadow-glow'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={queriedSensitive ? 'check' : 'compass'} size={14} strokeWidth={2.5} />
 {queriedSensitive ? 'מציג: SELECT WHERE sensitive = true' : 'הפעל שאילתה: מבנים רגישים'}
 </button>
 <p className="text-xs text-fg-muted">
 <strong className="text-fg">זה הכוח של וקטור:</strong> במקום לצייר ידנית, פקודה אחת ובחירה.
 </p>
 </div>
 </div>

 {/* Architecture callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="satellite" size={22} className="text-accent" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
 ארכיטקטורת עבודה
 </div>
 <h3 className="font-display font-bold text-lg leading-tight mb-2">
 איך שומרים ומנהלים את הנתונים?
 </h3>
 <div className="grid sm:grid-cols-2 gap-3 mt-3">
 <div className="surface p-3 rounded-lg">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">לוקלי</div>
 <div className="font-display font-bold text-sm mb-1">Shapefile / GDB</div>
 <p className="text-xs text-fg-muted leading-relaxed">קבצים על המחשב האישי. מתאים לניתוח עצמאי ופשוט. אין סנכרון.</p>
 </div>
 <div className="surface p-3 rounded-lg">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">רשתי</div>
 <div className="font-display font-bold text-sm mb-1">SDE — Spatial DB Engine</div>
 <p className="text-xs text-fg-muted leading-relaxed">שרת מרכזי. קמ"ן בחטיבה וקמ"ן באוגדה עובדים על אותה שכבה בו-זמנית. תמונה אחידה.</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
function LayerMap({ activeLayers }: { activeLayers: Set<Layer> }) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="basics-bg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#f3f5f9" />
 <stop offset="100%" stopColor="#e6ebf2" />
 </linearGradient>
 </defs>

 <rect x="0" y="0" width="100" height="56" fill="url(#basics-bg)" />

 {/* Layer 1: Elevation (raster heatmap) */}
 {activeLayers.has('elevation') && (
 <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 {Array.from({ length: 200 }).map((_, i) => {
const col = i % 20;
const row = Math.floor(i / 20);
const cx = col * 5;
const cy = row * 5.6;
 // Simple elevation noise
const e = Math.sin(col * 0.4) * Math.cos(row * 0.5) * 0.5 + 0.5;
const color = e > 0.7 ? '#7c5836' : e > 0.5 ? '#a47e51' : e > 0.3 ? '#c9a87a' : '#dfc497';
return (
 <rect key={i} x={cx} y={cy} width="5" height="5.6" fill={color} opacity="0.5" />
 );
 })}
 </motion.g>
 )}

 {/* Layer 2: Roads (vector lines) */}
 {activeLayers.has('roads') && (
 <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <path d="M0 30 L 30 28 L 60 32 L 100 30" fill="none" className="stroke-accent" strokeWidth="1.2" />
 <path d="M40 0 L 40 56" fill="none" className="stroke-accent" strokeWidth="0.8" />
 <path d="M70 0 L 75 56" fill="none" className="stroke-accent" strokeWidth="0.6" />
 </motion.g>
 )}

 {/* Layer 3: Buildings (vector polygons) */}
 {activeLayers.has('buildings') && (
 <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 {[
 { x: 20, y: 18, w: 6, h: 4 },
 { x: 50, y: 22, w: 8, h: 5 },
 { x: 30, y: 38, w: 7, h: 4 },
 { x: 78, y: 42, w: 6, h: 5 },
 { x: 60, y: 14, w: 5, h: 3 },
 ].map((b, i) => (
 <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="fill-accent-cool/70 stroke-accent-cool" strokeWidth="0.3" />
 ))}
 </motion.g>
 )}

 {/* Layer 4: Threats (vector points) */}
 {activeLayers.has('threats') && (
 <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 {[
 { x: 65, y: 28 },
 { x: 25, y: 45 },
 ].map((t, i) => (
 <g key={i}>
 <circle cx={t.x} cy={t.y} r="6" fill="none" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="0.7 0.5" />
 <circle cx={t.x} cy={t.y} r="1.2" className="fill-status-danger" />
 <circle cx={t.x} cy={t.y} r="3" fill="none" className="stroke-status-danger/50" strokeWidth="0.3">
 <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
 </circle>
 </g>
 ))}
 </motion.g>
 )}

 {/* If no layers — empty message */}
 {activeLayers.size === 0 && (
 <text x="50" y="28" textAnchor="middle" className="fill-fg-dim font-display" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
 אין שכבות פעילות
 </text>
 )}
 </svg>
 </div>
 );
}
function RasterVectorCompare({ model }: { model: 'raster' | 'vector' }) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <rect x="0" y="0" width="100" height="56" className="fill-bg-elevated" />

 {model === 'raster' ? (
 <g>
 {/* Pixelated representation */}
 {Array.from({ length: 280 }).map((_, i) => {
const col = i % 28;
const row = Math.floor(i / 28);
const x = col * 3.5;
const y = row * 5.6;
 // Simulate a"building" pixelated
const inBuilding = col >= 8 && col <= 14 && row >= 3 && row <= 6;
const inRoad = row === 7 || row === 8;
const fill = inBuilding ? '#5783c4' : inRoad ? '#a8855a' : '#d6dfe8';
return <rect key={i} x={x} y={y} width="3.5" height="5.6" fill={fill} stroke="#0a0f1a" strokeWidth="0.05" opacity="0.5" />;
 })}
 <text x="50" y="6" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
 ראסטר · 280 פיקסלים — כל אחד עם ערך
 </text>
 <text x="14" y="36" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="1.8"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >"מבנה"
 </text>
 <text x="50" y="48" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="1.8"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >"כביש"
 </text>
 </g>
 ) : (
 <g>
 {/* Clean vector representation */}
 <path d="M0 42 L 30 41 L 50 43 L 80 41 L 100 42" fill="none" className="stroke-accent" strokeWidth="1.6" />
 <path d="M0 47 L 30 46 L 50 48 L 80 46 L 100 47" fill="none" className="stroke-accent/50" strokeWidth="0.3" strokeDasharray="0.6 0.4" />

 <rect x="28" y="20" width="20" height="13" className="fill-accent-cool/30 stroke-accent-cool" strokeWidth="0.4" />

 <circle cx="72" cy="25" r="1.2" className="fill-status-danger" />
 <circle cx="72" cy="25" r="3" fill="none" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="0.5 0.4" />

 {/* Attribute table preview */}
 <g transform="translate(8 8)">
 <rect x="0" y="0" width="34" height="9" className="fill-bg-card stroke-fg-dim" strokeWidth="0.2" />
 <text x="2" y="3" className="fill-fg-dim font-display font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >id | type | width</text>
 <text x="2" y="6" className="fill-fg font-display font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >1 | road | 8m</text>
 <text x="2" y="8.5" className="fill-fg-muted font-display font-bold" fontSize="1.7"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >↑ טבלת תכונות</text>
 </g>

 <text x="50" y="54" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 וקטור · 4 אובייקטים — קווים, פוליגון, נקודה
 </text>

 {/* Labels */}
 <text x="50" y="29" textAnchor="middle" className="fill-accent-cool font-display font-bold font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 מבנה
 </text>
 <text x="72" y="22" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 איום
 </text>
 <text x="92" y="40" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 כביש
 </text>
 </g>
 )}
 </svg>
 </div>
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
