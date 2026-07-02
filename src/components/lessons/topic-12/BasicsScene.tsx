'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import valleyAerial from './assets/valley-aerial.jpg';
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
title = {
  <>
    GIS מתחיל ברעיון פשוט: <span className="text-accent-hover">כל מידע הוא שכבה שאפשר לחקור</span>
  </>
}intro="כל GIS בנוי משכבות. כל שכבה היא 'שקף שקוף'. ויש שני אופנים שהמחשב רואה את העולם — ראסטר (פיקסלים) או וקטור (אובייקטים). ההבדל הזה הוא הכל."
 />

 {/* Layers lead-in — the core "חישוב על שכבות" idea, kept to one operational sentence */}
 <p className="max-w-3xl text-base text-fg leading-relaxed text-pretty mb-6">
 כל שכבה עונה על שאלה אחת — לדוגמה: <strong className="text-fg">איפה גבוה? איפה עובר כביש? איפה יושב איום?</strong> מדליקים כמה שכבות יחד, וההצלבה ביניהן הופכת לתמונה אחת שאפשר להחליט לפיה.
 </p>

 {/* Layer toggles */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
 {LAYERS.map((l) => {
const isActive = activeLayers.has(l.id);
return (
 <button
key={l.id}
onClick={() => toggleLayer(l.id)}
className={cn(
 'relative p-4 text-right transition-all duration-300 ease-snap rounded-2xl border flex items-center gap-3',
isActive
 ? 'border-accent bg-bg-elevated'
 : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
{isActive && (
 <motion.span
layoutId="t12-basics-bar"
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
)}
 <span
className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
isActive
 ? 'bg-accent text-bg-elevated border-accent'
 : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 <Icon name={l.icon} size={18} strokeWidth={2.25} />
 </span>
 <div className="min-w-0 flex-1">
 <div className="font-display font-bold text-base text-fg leading-tight">
 {l.label}
 </div>
 <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">
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

 {/* Raster vs Vector — same real area, two encodings */}
 <div className="surface-elevated p-4 rounded-2xl mb-12">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 אותו שטח מבצעי · פעם כראסטר, פעם כוקטור
 </div>

 <RasterVectorCompare />

 <div className="mt-4 surface p-4 rounded-xl flex gap-3 items-start">
 <Icon name="satellite" size={20} className="text-accent shrink-0 mt-0.5" />
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 <strong className="text-fg">אותו שטח, שתי שיטות אחסון.</strong> ראסטר עונה על <strong className="text-fg">״מה יש בכל נקודה״</strong> — גובה, כיסוי, חום. וקטור עונה על <strong className="text-fg">״אילו אובייקטים יש ומה מותר לשאול עליהם״</strong> — כביש, מבנה, טווח. בניתוח מבצעי משתמשים בשניהם יחד: הראסטר הוא הרקע, הוקטור הוא מה שמחליטים עליו — למשל, לספור מבנים בטווח 200 מטר מהכביש כדי להחליט היכן למקם מחסום.
 </p>
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
 <th className="text-right py-2 px-3 text-xs font-display font-medium tracking-wide text-fg-dim">ID</th>
 <th className="text-right py-2 px-3 text-xs font-display font-medium tracking-wide text-fg-dim">סוג</th>
 <th className="text-right py-2 px-3 text-xs font-display font-medium tracking-wide text-fg-dim">גובה (מ׳)</th>
 <th className="text-right py-2 px-3 text-xs font-display font-medium tracking-wide text-fg-dim">אוכלוסייה</th>
 <th className="text-right py-2 px-3 text-xs font-display font-medium tracking-wide text-fg-dim">רגיש?</th>
 </tr>
 </thead>
 <tbody>
 {BUILDINGS.map((b) => {
const highlight = queriedSensitive && b.sensitive;
return (
 <tr key={b.id} className={cn('border-b border-border-subtle transition-colors', highlight && 'bg-status-warn/10')}>
 <td className="py-2 px-3 font-display font-medium tracking-wide text-fg-dim tabular-nums">{b.id}</td>
 <td className="py-2 px-3 text-fg">{b.type}</td>
 <td className="py-2 px-3 tabular-nums">{b.height}</td>
 <td className="py-2 px-3 tabular-nums">{b.pop}</td>
 <td className="py-2 px-3">
 {b.sensitive ? (
 <span className="text-status-warn font-display font-bold tracking-wide">✓ כן</span>
 ) : (
 <span className="text-fg-dim font-display font-medium tracking-wide">לא</span>
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
 ? 'bg-accent text-bg-elevated'
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
 <Icon name="satellite" size={32} className="text-accent shrink-0" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
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
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">רשתי</div>
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
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden bg-bg-accent">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <rect x="0" y="0" width="100" height="56" className="fill-bg-accent" />

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
const colorClass = e > 0.7 ? 'fill-terrain-ridge' : e > 0.5 ? 'fill-terrain-olive' : e > 0.3 ? 'fill-terrain-sand' : 'fill-bg-warm';
return (
 <rect key={i} x={cx} y={cy} width="5" height="5.6" className={colorClass} opacity="0.5" />
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
function RasterVectorCompare() {
return (
 <div className="grid gap-4 md:grid-cols-2">
 {/* ── RASTER panel: real satellite image ── */}
 <figure className="relative overflow-hidden rounded-xl border border-border bg-bg-accent">
 <div className="relative aspect-square">
 <img
src={valleyAerial.src}
alt="תצלום לוויין אמיתי של אזור כפרי הררי — כביש מתפתל, יישוב על גבעה ושדות חקלאיים. דוגמה לשכבת ראסטר: כל פיקסל מחזיק ערך אחד."
className="absolute inset-0 h-full w-full object-cover"
loading="lazy"
draggable={false}
 />
 {/* pixel-grid overlay signals 'this image is a grid of value-cells'.
     Dual-tone (dark casing + light line) so the grid reads over both the
     dark forest and the light dirt-road / bare-field areas of the photo. */}
 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
 {Array.from({ length: 15 }).map((_, i) => (
 <line key={`gvd${i}`} x1={((i + 1) * 100) / 16} y1="0" x2={((i + 1) * 100) / 16} y2="100" stroke="#1c1c1c" strokeWidth="0.4" opacity="0.18" />
 ))}
 {Array.from({ length: 15 }).map((_, i) => (
 <line key={`ghd${i}`} x1="0" y1={((i + 1) * 100) / 16} x2="100" y2={((i + 1) * 100) / 16} stroke="#1c1c1c" strokeWidth="0.4" opacity="0.18" />
 ))}
 {Array.from({ length: 15 }).map((_, i) => (
 <line key={`gvl${i}`} x1={((i + 1) * 100) / 16} y1="0" x2={((i + 1) * 100) / 16} y2="100" stroke="#FFFBF7" strokeWidth="0.18" opacity="0.32" />
 ))}
 {Array.from({ length: 15 }).map((_, i) => (
 <line key={`ghl${i}`} x1="0" y1={((i + 1) * 100) / 16} x2="100" y2={((i + 1) * 100) / 16} stroke="#FFFBF7" strokeWidth="0.18" opacity="0.32" />
 ))}
 <rect x={(6 * 100) / 16} y={(4 * 100) / 16} width={100 / 16} height={100 / 16} fill="none" stroke="#EB9E48" strokeWidth="0.9" />
 </svg>
 <span className="chip absolute top-2 end-2 border-border bg-bg-elevated/90 text-fg backdrop-blur-sm font-display font-semibold">◧ ראסטר</span>
 <span className="chip absolute bottom-2 start-2 border-border bg-bg-elevated/90 text-fg-muted backdrop-blur-sm">כל פיקסל = ערך אחד</span>
 </div>
 <figcaption className="border-t border-border-subtle bg-bg-elevated p-3">
 <div className="font-display font-bold text-sm text-fg leading-tight mb-0.5">תצלום לוויין · שכבת רקע רציפה</div>
 <p className="text-xs text-fg-muted leading-relaxed text-pretty">
 ערך לכל פיקסל: צבע, גובה, חום. מצוין ל<strong className="text-fg">תמונה של כל השטח</strong> — אבל אי אפשר לשאול אותו ״כמה מבנים יש?״
 </p>
 </figcaption>
 </figure>

 {/* ── VECTOR panel: same area as clean objects ── */}
 <figure className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
 <div className="relative aspect-square">
 <VectorMap />
 <span className="chip absolute top-2 end-2 border-border bg-bg-elevated/90 text-fg backdrop-blur-sm font-display font-semibold">◢ וקטור</span>
 {/* attribute table — the core 'each object is a row' idea */}
 <div className="absolute top-2 start-2 rounded-lg border border-border bg-bg-elevated/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
 <div className="mb-0.5 text-[9px] font-display font-medium tracking-wide text-fg-dim">טבלת תכונות</div>
 <table className="text-[9px] leading-tight tabular-nums">
 <tbody>
 <tr className="text-fg-dim"><td className="pe-2 text-start">id</td><td className="pe-2 text-start">סוג</td><td className="text-start">שם</td></tr>
 <tr className="text-fg font-medium"><td className="pe-2 text-start">1</td><td className="pe-2 text-start">כביש</td><td className="text-start">ראשי</td></tr>
 <tr className="text-fg font-medium"><td className="pe-2 text-start">2</td><td className="pe-2 text-start">אתר</td><td className="text-start">תצפית</td></tr>
 </tbody>
 </table>
 </div>
 </div>
 <figcaption className="border-t border-border-subtle bg-bg-elevated p-3">
 <div className="font-display font-bold text-sm text-fg leading-tight mb-0.5">אובייקטים · נקודות · קווים · פוליגונים</div>
 <p className="text-xs text-fg-muted leading-relaxed text-pretty">
 כל אובייקט נפרד עם טבלת תכונות. מצוין ל<strong className="text-fg">שאילתות חכמות</strong> — ״כל המבנים בטווח 200 מטר מכביש ראשי״.
 </p>
 </figcaption>
 </figure>
 </div>
 );
}
function VectorMap() {
return (
 <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
 <rect x="0" y="0" width="100" height="100" className="fill-bg-elevated" />

 {/* Agricultural fields (polygons) — same tilled patches as the photo */}
 <g className="fill-brand/10 stroke-brand-dark/50" strokeWidth="0.25">
 <polygon points="1,70 22,67 27,86 3,90" />
 <polygon points="24,80 43,77 47,95 27,97" />
 <polygon points="45,84 62,82 64,97 47,98" />
 <polygon points="86,2 99,1 99,15 88,16" />
 </g>

 {/* Contour lines (elevation as vector) around the hilltop settlement.
     Top edge kept below the attribute-table overlay so they never collide. */}
 <g fill="none" className="stroke-fg-dim" strokeWidth="0.25" opacity="0.4">
 <ellipse cx="74" cy="33" rx="23" ry="15" />
 <ellipse cx="75" cy="32" rx="15" ry="9" />
 <ellipse cx="76" cy="31" rx="8" ry="5" />
 <ellipse cx="15" cy="52" rx="14" ry="10" />
 </g>

 {/* Seasonal stream / wadi (line) */}
 <path d="M0 80 C 12 79, 20 87, 31 87 C 41 87, 45 93, 53 94" fill="none" className="stroke-terrain-sky" strokeWidth="0.7" strokeLinecap="round" opacity="0.85" />

 {/* Main road (winding) — white casing then accent, matches the photo's S-curve */}
 <path d="M16 6 C 27 7, 34 8, 31 17 C 28 27, 21 30, 22 41 C 23 50, 34 46, 37 53 C 40 60, 47 51, 49 56 C 52 63, 61 58, 67 59 C 75 60, 79 56, 83 63 C 88 70, 78 75, 81 82 C 83 89, 78 93, 84 100" fill="none" stroke="#FFFBF7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
 <path d="M16 6 C 27 7, 34 8, 31 17 C 28 27, 21 30, 22 41 C 23 50, 34 46, 37 53 C 40 60, 47 51, 49 56 C 52 63, 61 58, 67 59 C 75 60, 79 56, 83 63 C 88 70, 78 75, 81 82 C 83 89, 78 93, 84 100" fill="none" className="stroke-accent" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

 {/* Secondary track up to the settlement (dashed) */}
 <path d="M67 59 C 70 52, 66 46, 72 41" fill="none" className="stroke-accent/60" strokeWidth="0.6" strokeDasharray="1 0.8" strokeLinecap="round" />
 {/* Settlement loop road */}
 <path d="M66 30 C 66 24, 72 21, 79 22 C 87 23, 90 28, 88 33 C 86 38, 78 39, 72 37 C 68 36, 66 34, 66 30 Z" fill="none" className="stroke-accent/70" strokeWidth="0.5" />

 {/* Buildings (polygons) — the settlement cluster */}
 <g className="fill-accent-cool/70 stroke-accent-cool" strokeWidth="0.2">
 <rect x="70" y="26" width="3" height="2.2" />
 <rect x="74" y="25" width="2.6" height="2" />
 <rect x="77.5" y="26.5" width="3.2" height="2.4" />
 <rect x="71.5" y="29.5" width="2.4" height="2" />
 <rect x="75" y="29" width="3" height="2.4" />
 <rect x="79" y="30" width="2.6" height="2.2" />
 <rect x="82.5" y="27.5" width="3" height="2.2" />
 <rect x="73" y="32.5" width="2.8" height="2" />
 <rect x="77" y="33" width="3" height="2.2" />
 <rect x="81" y="33" width="2.4" height="2" />
 </g>

 {/* Point feature — observation / threat site with buffer ring */}
 <circle cx="54" cy="43" r="4.5" fill="none" className="stroke-status-danger/60" strokeWidth="0.35" strokeDasharray="0.9 0.7" />
 <circle cx="54" cy="43" r="1.1" className="fill-status-danger" />

 {/* Feature labels — white halo, placed clear of one another */}
 <text x="59" y="23" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.05" strokeLinejoin="round">מבנים</text>
 <text x="53" y="37" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.05" strokeLinejoin="round">אתר תצפית</text>
 <text x="31" y="64" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.05" strokeLinejoin="round">כביש ראשי</text>
 <text x="21" y="75" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.05" strokeLinejoin="round">נחל אכזב</text>
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
