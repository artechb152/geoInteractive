'use client';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import valleyAerial from './assets/valley-aerial.jpg';
import {
  LayerComposite,
  LayerStack,
  chipOverCell,
  RasterGridOverlay,
  RASTER_N,
  ROAD_CELLS,
  SITE_CELL,
  useCellColors,
  VectorAreaMap,
  type LayerId,
  type VectorFeature,
} from './BasicsMap';
import { LocalSchematic, NetworkSchematic, QueryBlocks } from './BasicsVisuals';
type Layer = LayerId;
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
// Buildings picked in the attribute table / block view (the query picks 2 and 4).
const [picked, setPicked] = useState<Set<number>>(new Set());
const toggleLayer = (id: Layer) => {
setActiveLayers((prev) => {
const next = new Set(prev);
if (next.has(id)) next.delete(id);
else next.add(id);
return next;
 });
 };
const runQuery = () => {
const on = !queriedSensitive;
setQueriedSensitive(on);
setPicked(on ? new Set(BUILDINGS.filter((b) => b.sensitive).map((b) => b.id)) : new Set());
 };
// One building at a time; clicking the only picked one again (or empty ground) clears.
const pickBuilding = (id: number | null) => {
setQueriedSensitive(false);
setPicked((prev) => (id === null || (prev.size === 1 && prev.has(id)) ? new Set() : new Set([id])));
 };
const layerLabels = Object.fromEntries(LAYERS.map((l) => [l.id, l.label])) as Record<Layer, string>;
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

 <p className="max-w-3xl text-base text-fg leading-relaxed text-pretty mb-6">
  <strong className="text-fg">קואורדינטה</strong> היא הכתובת המדויקת של נקודה בשטח בתוך מערכת ייחוס נתונה — זוג מספרים שמצביע על מיקום אחד ויחיד, בלי תלות בשפה או בשיטת הסימון על המפה. זה מה ש-Georeferencing עושה בפועל: מחבר כל פיסת מידע — פיקסל בראסטר, נקודה בוקטור — לקואורדינטה שלה. ברגע שלכל שכבה יש אותה ״שפת מיקום״, אפשר להצליב תבליט, כבישים ואיומים בדיוק זה על זה. בלי זה, השכבות היו נופלות זו לצד זו, לא זו על זו.
 </p>

 {/* Layer toggles */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
 {LAYERS.map((l) => {
const isActive = activeLayers.has(l.id);
return (
 <button
key={l.id}
type="button"
aria-pressed={isActive}
onClick={() => toggleLayer(l.id)}
className={cn(
 'relative overflow-hidden p-4 text-start transition-all duration-300 ease-snap rounded-xl border flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
isActive
 ? 'border-accent bg-bg-elevated'
 : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
{isActive && (
 <motion.span
layoutId={`t12-basics-bar-${l.id}`}
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-s-full"
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
 <div className="font-display font-medium tracking-wide text-[13px] text-fg-dim mt-0.5">
 {l.type === 'raster' ? '◧ ראסטר' : '◢ וקטור'}
 </div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Map — the composed top-down view (inline-start) + the same layers as a stack of transparent sheets */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מפת GIS · {activeLayers.size}/4 שכבות פעילות
 </div>
 </div>
 <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-center">
 <div className="aspect-square relative rounded-xl overflow-hidden bg-bg-accent">
 <LayerComposite activeLayers={activeLayers} emptyLabel="אין שכבות פעילות" />
 </div>
 <div className="aspect-[224/150] relative">
 <LayerStack activeLayers={activeLayers} labels={layerLabels} onToggle={toggleLayer} />
 </div>
 </div>
 </div>

 <SoftDivider text="ראסטר מול וקטור · אותו אזור, שני אופנים" />

 {/* Raster vs Vector — same real area, two encodings */}
 <div className="surface-elevated p-4 rounded-2xl mb-12">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 אותו שטח מבצעי · פעם כראסטר, פעם כוקטור
 </div>

 <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-4">
  <strong className="text-fg">מהו ראסטר בפועל:</strong> הראסטר הוא הדרך שבה מחשב מייצג משטח רציף — הוא מחלק את השטח לרשת של תאים (פיקסלים), ולכל תא נותן ערך מספרי אחד: גובה, טמפרטורה, צפיפות צמחייה. ככל שהתא קטן יותר, כך הרזולוציה גבוהה יותר. בצבא, הראסטר המרכזי הוא DTM — מודל גובה ספרתי שמתאר את גובה הקרקע החשופה בלבד, ללא צמחייה ומבנים שנוספים כשכבות נפרדות, והוא הבסיס לחישובי LOS, נסתרות ושיפועים.
 </p>

 <RasterVectorCompare />

 <div className="mt-4 surface p-4 rounded-2xl flex gap-3 items-start">
 <Icon name="satellite" size={20} className="text-brand-dark shrink-0 mt-0.5" />
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 <strong className="text-fg">אותו שטח, שתי שיטות אחסון.</strong> ראסטר עונה על <strong className="text-fg">״מה יש בכל נקודה״</strong> — גובה, כיסוי, חום. וקטור עונה על <strong className="text-fg">״אילו אובייקטים יש ומה מותר לשאול עליהם״</strong> — כביש, מבנה, טווח. בניתוח מבצעי משתמשים בשניהם יחד: הראסטר הוא הרקע, הוקטור הוא מה שמחליטים עליו — למשל, לספור מבנים בטווח 200 מטר מהכביש כדי להחליט היכן למקם מחסום.
 </p>
 </div>
 </div>

 <SoftDivider text="הכוח של וקטור · שאילתות חכמות" />

 <p className="max-w-3xl text-sm text-fg-muted leading-relaxed text-pretty mb-4">
 <strong className="text-fg">מה זו טבלת תכונות?</strong> כל אובייקט וקטורי במפה — כביש, מבנה, איום — הוא בעצם שורה בטבלה שיושבת מאחורי הצורה הגרפית שלו. כל עמודה בשורה היא תכונה: סוג, גובה, אוכלוסייה, רגישות. בלי הטבלה הזו, הצורה על המפה היא רק קו או מלבן. איתה, אפשר לשאול עליה שאלה ולקבל תשובה — לא רק להסתכל.
 </p>

 {/* Vector query demo */}
 <div className="surface-elevated p-5 rounded-2xl mb-12">
 <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
 טבלת תכונות · 4 מבנים בגזרה
 </div>

 <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-center mb-4">
 <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="border-b border-border">
 <th className="text-start py-2 px-3 text-[13px] font-display font-medium tracking-wide text-fg-dim">ID</th>
 <th className="text-start py-2 px-3 text-[13px] font-display font-medium tracking-wide text-fg-dim">סוג</th>
 <th className="text-start py-2 px-3 text-[13px] font-display font-medium tracking-wide text-fg-dim">גובה (מ׳)</th>
 <th className="text-start py-2 px-3 text-[13px] font-display font-medium tracking-wide text-fg-dim">אוכלוסייה</th>
 <th className="text-start py-2 px-3 text-[13px] font-display font-medium tracking-wide text-fg-dim">רגיש?</th>
 </tr>
 </thead>
 <tbody>
 {BUILDINGS.map((b) => {
const highlight = picked.has(b.id);
return (
 <tr
key={b.id}
onClick={() => pickBuilding(b.id)}
className={cn('relative cursor-pointer border-b border-border-subtle transition-colors', highlight ? 'bg-accent/10' : 'hover:bg-bg-accent')}
 >
 <td className={cn('py-2 px-3 font-display font-medium tracking-wide tabular-nums border-s-2', highlight ? 'border-s-accent text-fg font-bold' : 'border-s-transparent text-fg-dim')}>
 {/* the ID is the keyboard handle for the row (row click is the mouse path) */}
 <button
type="button"
aria-pressed={highlight}
aria-label={b.type}
onClick={(e) => {
e.stopPropagation();
pickBuilding(b.id);
 }}
className="rounded-xl px-1 -mx-1 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
 >
 {b.id}
 </button>
 </td>
 <td className="py-2 px-3 text-fg">{b.type}</td>
 <td className="py-2 px-3 tabular-nums">{b.height}</td>
 <td className="py-2 px-3 tabular-nums">{b.pop}</td>
 <td className="py-2 px-3">
 {b.sensitive ? (
 <span className="text-brand-dark font-display font-bold tracking-wide">✓ כן</span>
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
 <div className="aspect-[108/73] w-full max-w-[400px] mx-auto">
 <QueryBlocks buildings={BUILDINGS} selected={picked} onSelect={pickBuilding} />
 </div>
 </div>

 <div className="flex items-center gap-3 flex-wrap">
 <button
type="button"
aria-pressed={queriedSensitive}
onClick={runQuery}
className={cn(
 'px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
queriedSensitive
 ? 'bg-accent text-bg-elevated'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={queriedSensitive ? 'check' : 'compass'} size={14} strokeWidth={2.5} />
 {queriedSensitive ? 'מציג: SELECT WHERE sensitive = true' : 'הפעל שאילתה: מבנים רגישים'}
 </button>
 <p className="text-[13px] text-fg-muted">
 <strong className="text-fg">זה הכוח של וקטור:</strong> במקום לצייר ידנית, פקודה אחת ובחירה.
 </p>
 </div>
 </div>

 {/* Architecture callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <Icon name="satellite" size={32} className="text-brand-dark shrink-0" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 ארכיטקטורת עבודה
 </div>
 <h3 className="font-display font-bold text-lg leading-tight mb-2">
 איך שומרים ומנהלים את הנתונים?
 </h3>
 <div className="grid sm:grid-cols-2 gap-3 mt-3">
 <div className="surface p-3 rounded-2xl flex items-center gap-3">
 <div className="min-w-0 flex-1">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">לוקלי</div>
 <div className="font-display font-bold text-sm mb-1">Shapefile / GDB</div>
 <p className="text-[13px] text-fg-muted leading-relaxed">קבצים על המחשב האישי. מתאים לניתוח עצמאי ופשוט. אין סנכרון.</p>
 </div>
 <LocalSchematic />
 </div>
 <div className="surface p-3 rounded-2xl flex items-center gap-3">
 <div className="min-w-0 flex-1">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">רשתי</div>
 <div className="font-display font-bold text-sm mb-1">SDE — Spatial DB Engine</div>
 <p className="text-[13px] text-fg-muted leading-relaxed">שרת מרכזי. קמ"ן בחטיבה וקמ"ן באוגדה עובדים על אותה שכבה בו-זמנית. תמונה אחידה.</p>
 </div>
 <NetworkSchematic />
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
// "Raster vs vector" — the same area twice. Picking a raster cell shows its single
// value; picking a vector feature (or its attribute row) outlines the raster cells
// it crosses. Re-picking the same thing, or empty ground, clears the pick.
const START_CELL = 4 * RASTER_N + 6;
function RasterVectorCompare() {
const colors = useCellColors(valleyAerial.src);
const [cell, setCell] = useState<number | null>(START_CELL);
const [feature, setFeature] = useState<VectorFeature | null>(null);
const traced = feature === 'road' ? ROAD_CELLS : feature === 'site' ? new Set([SITE_CELL]) : null;
const pickCell = (e: MouseEvent<HTMLDivElement>) => {
const r = e.currentTarget.getBoundingClientRect();
const cx = Math.min(RASTER_N - 1, Math.floor(((e.clientX - r.left) / r.width) * RASTER_N));
const cy = Math.min(RASTER_N - 1, Math.floor(((e.clientY - r.top) / r.height) * RASTER_N));
const id = cy * RASTER_N + cx;
setCell((prev) => (prev === id ? null : id));
 };
// Arrow keys move the pixel in map directions (a map is never mirrored for RTL).
const moveCell = (e: KeyboardEvent<HTMLDivElement>) => {
const d: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
if (e.key === 'Escape') {
setCell(null);
return;
 }
const step = d[e.key];
if (!step) return;
e.preventDefault();
setCell((prev) => {
const p = prev ?? START_CELL;
const x = Math.max(0, Math.min(RASTER_N - 1, (p % RASTER_N) + step[0]));
const y = Math.max(0, Math.min(RASTER_N - 1, Math.floor(p / RASTER_N) + step[1]));
return y * RASTER_N + x;
 });
 };
const pickRow = (f: VectorFeature) => setFeature((prev) => (prev === f ? null : f));
// a chip that sits over the picked pixel fades out of the way
const underChip = chipOverCell(cell);
return (
 <div className="grid gap-4 md:grid-cols-2">
 {/* ── RASTER panel: real satellite image ── */}
 <figure className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-accent">
 <div
className="relative aspect-square cursor-crosshair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
tabIndex={0}
role="group"
aria-label="כל פיקסל = ערך אחד"
onClick={pickCell}
onKeyDown={moveCell}
 >
 <img
src={valleyAerial.src}
alt="אורתופוטו של אזור כפרי הררי — כביש מתפתל, יישוב על גבעה ושדות חקלאיים. דוגמה לשכבת ראסטר: כל פיקסל מחזיק ערך אחד."
className="absolute inset-0 h-full w-full object-cover"
loading="lazy"
draggable={false}
 />
 {/* pixel-grid overlay signals 'this image is a grid of value-cells' */}
 <RasterGridOverlay selectedCell={cell} colors={colors} traced={traced} />
 <span className={cn('chip text-[13px] absolute top-2 end-2 border-border bg-bg-elevated/90 text-fg backdrop-blur-sm font-display font-semibold transition-opacity', underChip === 'top' && 'opacity-20')}>◧ ראסטר</span>
 <span className={cn('chip text-[13px] absolute bottom-2 start-2 border-border bg-bg-elevated/90 text-fg-muted backdrop-blur-sm transition-opacity', underChip === 'bottom' && 'opacity-20')}>
 {cell !== null && (
 <span aria-hidden className="size-3.5 rounded-[5px] border border-border shrink-0" style={{ backgroundColor: colors?.[cell] }} />
 )}
 כל פיקסל = ערך אחד
 </span>
 </div>
 <figcaption className="flex-1 border-t border-border-subtle bg-bg-elevated p-3">
 <div className="font-display font-bold text-sm text-fg leading-tight mb-0.5">אורתופוטו · שכבת רקע רציפה</div>
 <p className="text-[13px] text-fg-muted leading-relaxed text-pretty">
 ערך לכל פיקסל: צבע, גובה, חום. מצוין ל<strong className="text-fg">תמונה של כל השטח</strong> — אבל אי אפשר לשאול אותו ״כמה מבנים יש?״
 </p>
 <p className="text-[13px] text-fg-muted leading-relaxed text-pretty mt-2">
  <strong className="text-fg">זהו אורתופוטו</strong> — תמונה (אווירית או לוויינית) שעברה תיקון גיאומטרי (אורתורקטיפיקציה) שמסיר את עיוותי זווית הצילום וגובה השטח, כך שכל פיקסל יושב במיקום האמיתי שלו. בזכות זה אפשר למדוד עליו מרחקים ולהלביש עליו שכבות וקטוריות בדיוק — בתצלום רגיל (לא מתוקן) המרחקים משתבשים ליד הקצוות.
 </p>
 </figcaption>
 </figure>

 {/* ── VECTOR panel: same area as clean objects ── */}
 <figure className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated">
 <div className="relative aspect-square">
 <VectorAreaMap
selected={feature}
onSelect={setFeature}
labels={{ buildings: 'מבנים', site: 'אתר תצפית', road: 'כביש ראשי', wadi: 'נחל אכזב' }}
 />
 <span className="chip text-[13px] absolute top-2 end-2 border-border bg-bg-elevated/90 text-fg backdrop-blur-sm font-display font-semibold">◢ וקטור</span>
 </div>
 <figcaption className="flex-1 border-t border-border-subtle bg-bg-elevated p-3">
 <div className="font-display font-bold text-sm text-fg leading-tight mb-0.5">אובייקטים · נקודות · קווים · פוליגונים</div>
 <p className="text-[13px] text-fg-muted leading-relaxed text-pretty">
 כל אובייקט נפרד עם טבלת תכונות. מצוין ל<strong className="text-fg">שאילתות חכמות</strong> — ״כל המבנים בטווח 200 מטר מכביש ראשי״.
 </p>
 {/* attribute table — the core 'each object is a row' idea; rows are linked to the map */}
 <div className="mt-3 rounded-xl border border-border bg-bg-elevated px-3 py-2">
 <div className="mb-1 text-[13px] font-display font-medium tracking-wide text-fg-dim">טבלת תכונות</div>
 <table className="w-full text-[13px] leading-snug tabular-nums">
 <tbody>
 <tr className="text-fg-dim"><td className="pe-3 py-0.5 text-start">id</td><td className="pe-3 py-0.5 text-start">סוג</td><td className="py-0.5 text-start">שם</td></tr>
 <tr onClick={() => pickRow('road')} className={cn('cursor-pointer font-medium transition-colors', feature === 'road' ? 'bg-accent/15 text-fg font-bold' : 'text-fg hover:bg-bg-accent')}><td className="pe-3 py-0.5 text-start">1</td><td className="pe-3 py-0.5 text-start">כביש</td><td className="py-0.5 text-start">ראשי</td></tr>
 <tr onClick={() => pickRow('site')} className={cn('cursor-pointer font-medium transition-colors', feature === 'site' ? 'bg-accent/15 text-fg font-bold' : 'text-fg hover:bg-bg-accent')}><td className="pe-3 py-0.5 text-start">2</td><td className="pe-3 py-0.5 text-start">אתר</td><td className="py-0.5 text-start">תצפית</td></tr>
 </tbody>
 </table>
 </div>
 </figcaption>
 </figure>
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
