'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
// One terrain under both maps (roads, relief, ravine under bridge E).
import { BufferTerrainMap, NetworkRoadMap } from './NetworkTerrain';

// Network: nodes (junctions/bridges) and edges (roads)
type Node = { id: string; x: number; y: number; label: string; isCritical?: boolean };
const NODES: Node[] = [
 { id: 'A', x: 8, y: 30, label: 'בסיס עורף' },
 { id: 'B', x: 25, y: 22, label: 'צומת B' },
 { id: 'C', x: 25, y: 42, label: 'צומת C', isCritical: true },
 { id: 'D', x: 45, y: 18, label: 'צומת D' },
 { id: 'E', x: 50, y: 35, label: 'גשר E', isCritical: true },
 { id: 'F', x: 45, y: 52, label: 'צומת F' },
 { id: 'G', x: 68, y: 25, label: 'צומת G' },
 { id: 'H', x: 70, y: 45, label: 'צומת H' },
 { id: 'I', x: 88, y: 32, label: 'חזית I' },
];
const EDGES: [string, string][] = [
 ['A', 'B'], ['A', 'C'],
 ['B', 'D'], ['B', 'C'],
 ['C', 'F'], ['C', 'E'],
 ['D', 'E'], ['D', 'G'],
 ['E', 'F'], ['E', 'G'], ['E', 'H'],
 ['F', 'H'],
 ['G', 'I'], ['H', 'I'],
];

// Threat sites for buffer demo
type Threat = { id: string; x: number; y: number; label: string; range: number; type: string };
const THREATS: Threat[] = [
 { id: 't1', x: 55, y: 32, label: 'SAM S-400', range: 18, type: 'נ"מ ארוך טווח' },
 // y 47 (was 50): keeps the whole 8-unit ring inside the 56-unit-tall map
 { id: 't2', x: 30, y: 47, label: 'SAM קצר טווח', range: 8, type: 'MANPADS' },
];

// BFS for connectivity from A to I
function findPath(disabled: Set<string>): string[] {
if (disabled.has('A') || disabled.has('I')) return [];
const visited = new Set<string>();
const queue: { id: string; path: string[] }[] = [{ id: 'A', path: ['A'] }];
while (queue.length > 0) {
const { id, path } = queue.shift()!;
if (id === 'I') return path;
if (visited.has(id)) continue;
visited.add(id);
for (const [a, b] of EDGES) {
const next = a === id ? b : b === id ? a : null;
if (next && !visited.has(next) && !disabled.has(next)) {
queue.push({ id: next, path: [...path, next] });
 }
 }
 }
return [];
}
export function NetworkScene() {
const [disabled, setDisabled] = useState<Set<string>>(new Set());
const [showThreatBuffers, setShowThreatBuffers] = useState(true);
const [friendlyPos, setFriendlyPos] = useState({ x: 40, y: 40 });
const path = useMemo(() => findPath(disabled), [disabled]);
const isConnected = path.length > 0;

 // Compute which threats threaten the friendly position
const threatsAffecting = THREATS.filter((t) => {
const dx = t.x - friendlyPos.x;
const dy = t.y - friendlyPos.y;
return Math.sqrt(dx * dx + dy * dy) <= t.range;
 });
const toggleNode = (id: string) => {
setDisabled((prev) => {
const next = new Set(prev);
if (next.has(id)) next.delete(id);
else next.add(id);
return next;
 });
 };
const reset = () => setDisabled(new Set());
// Convoy drives the route once after each change (after the domino settles) and on replay.
const [run, setRun] = useState(0);
const blownKey = [...disabled].sort().join('-');
useEffect(() => {
const id = window.setTimeout(() => setRun((r) => r + 1), 900);
return () => window.clearTimeout(id);
 }, [blownKey]);
// Picked threat card → its ring is emphasised. Picking it again, or the map, clears.
const [focusedThreat, setFocusedThreat] = useState<string | null>(null);
return (
 <section id="scene-network" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="12.3"
eyebrow="ניתוח רשתות ומעגלי השפעה"
title = {
  <>
    GIS לא רק מציג מפה — הוא <span className="text-accent-hover">מזהה מה יקרוס ומה מסוכן</span>
  </>
}
intro={`גשר אחד יכול להפיל אוגדה שלמה. סוללת טילים מאיימת על 50 ק"מ. ניתוח רשתות חושף את הצומת הקריטי, וניתוח Buffer מציג איפה אסור לעבור.`}
 />

 <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
 <div className="surface-elevated p-6 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
 <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
 ניתוח טופולוגי
 </div>
 <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
 Network Analysis — מי מתחבר למי, ומה קורה כשמנתקים
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 ניתוח של קווים מחוברים — כבישים, צינורות דלק, כבלי תקשורת. מזהה את <strong className="text-fg">נקודות הכשל</strong>: מה יקרה אם גשר מסוים יפוצץ? אילו כוחות יישארו מנותקים? אילו צמתים שולטים על הזרימה?
 </p>
 </div>
 <div className="surface-elevated p-6 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
 <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
 ניתוח מרחבי
 </div>
 <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
 Buffer Analysis — טבעות איום סביב מטרות
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 שרטוט טבעות סביב אובייקטים על המפה. <strong className="text-fg">טבעת איום</strong> סביב סוללת SAM היא <strong className="text-fg">"Kill Box"</strong> — כל כוח שנמצא בתוך הטבעת נמצא בסכנה ודורש מסלול חלופי.
 </p>
 </div>
 </div>

 {/* Network analysis */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 רשת דרכים · בסיס (A) ← חזית (I)
 </div>
 <div className="flex items-center gap-2">
 <div className={cn(
 'chip text-[13px]',
isConnected ? 'border-brand/40 bg-brand/10 text-brand-dark' : 'border-status-danger/40 bg-status-danger/10 text-status-danger'
 )}>
 <Icon name={isConnected ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
 <span className="font-display font-medium tracking-wide">
 {isConnected ? `מחובר · ${path.length - 1} צמתי ביניים` : 'מנותק! החזית מבודדת'}
 </span>
 </div>
 <button
type="button"
onClick={() => setRun((r) => r + 1)}
aria-label="הפעלה חוזרת של ההדגמה"
className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
 >
 <Icon name="refresh" size={15} />
 </button>
 </div>
 </div>

 <div className="aspect-[100/56] relative rounded-xl overflow-hidden">
 <NetworkRoadMap
nodes={NODES}
edges={EDGES}
disabled={disabled}
path={path}
onToggle={toggleNode}
runKey={run}
 />
 </div>

 <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
 <div className="text-[13px] text-fg-dim">
 לחץ על צומת כדי"לפוצץ" אותו וראה את אפקט הדומינו
 </div>
 <button
type="button"
onClick={() => disabled.size > 0 && reset()}
aria-disabled={disabled.size === 0}
className={cn(
 'px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
disabled.size > 0
 ? 'border-border hover:border-border-strong text-fg'
 : 'border-border text-fg-dim cursor-not-allowed opacity-50'
 )}
 >
 אפס נזק ({disabled.size})
 </button>
 </div>
 </div>

 {/* Targeting insight */}
 <div className="surface-elevated p-5 rounded-2xl mb-12">
 <div className="flex gap-3 items-start">
 <Icon name="crosshair" size={20} className="text-brand-dark shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">Targeting חכם:</strong> פגיעה ב<strong className="text-fg">צומת קריטי</strong> (נקודות עם דגל ⚠ במפה) מנתקת מספר מסלולים בו-זמנית. זה אפקט הדומינו — פגיעה במטרה אחת משתקת גזרה רחבה. נסה לפוצץ את גשר E או צומת C ותראה.
 </div>
 </div>
 </div>

 <SoftDivider text="Buffer Analysis · מעגלי השפעה ואיום" />

 {/* Buffer analysis */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מעגלי השפעה · כוח ידידותי מול 2 איומים
 </div>
 <div className={cn(
 'chip text-[13px]',
threatsAffecting.length === 0 ? 'border-brand/40 bg-brand/10 text-brand-dark' :
threatsAffecting.length === 1 ? 'border-status-warn/60 bg-status-warn/10 text-tanline-badge' :
 'border-status-danger/40 bg-status-danger/10 text-status-danger'
 )}>
 <Icon name={threatsAffecting.length === 0 ? 'check' : 'shield'} size={12} strokeWidth={2.5} />
 <span className="font-display font-medium tracking-wide">
 {threatsAffecting.length === 0 ? 'בטוח' : `${threatsAffecting.length} איום${threatsAffecting.length > 1 ? 'ים' : ''} מאיים${threatsAffecting.length > 1 ? 'ים' : ''}`}
 </span>
 </div>
 </div>

 <div className="aspect-[100/56] relative rounded-xl overflow-hidden">
 <BufferTerrainMap
nodes={NODES}
edges={EDGES}
threats={THREATS}
showBuffers={showThreatBuffers}
friendlyPos={friendlyPos}
setFriendlyPos={setFriendlyPos}
threatsAffecting={threatsAffecting.map((t) => t.id)}
focused={focusedThreat}
onBackground={() => setFocusedThreat(null)}
labels={{ friendly: 'כוח ידידותי', killBox: 'Kill Box' }}
 />
 </div>

 <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
 <div className="text-[13px] text-fg-dim">
 לחץ על המפה כדי להזיז את הכוח הידידותי וראה איזה איומים מאיימים עליו
 </div>
 <button
type="button"
aria-pressed={showThreatBuffers}
onClick={() => setShowThreatBuffers(!showThreatBuffers)}
className={cn(
 'px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
showThreatBuffers
 ? 'bg-accent text-bg-elevated'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={showThreatBuffers ? 'check' : 'shield'} size={12} strokeWidth={2.5} />
 {showThreatBuffers ? 'Buffer פעיל' : 'הצג Buffer'}
 </button>
 </div>
 </div>

 {/* Threats details — each card picks its threat on the map */}
 <div className="grid sm:grid-cols-2 gap-3 mb-12">
 {THREATS.map((t, i) => {
const isAffecting = threatsAffecting.some((tt) => tt.id === t.id);
const isPicked = focusedThreat === t.id;
return (
 <motion.button
type="button"
key={t.id}
aria-pressed={isPicked}
onClick={() => setFocusedThreat(isPicked ? null : t.id)}
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.08 }}
className={cn(
 'surface p-4 rounded-2xl border-s-4 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
isAffecting ? 'border-s-status-danger bg-status-danger/5' : 'border-s-status-warn',
isPicked && 'ring-2 ring-accent'
 )}
 >
 <div className="flex items-center gap-3">
 <Icon name="crosshair" size={30} className={cn(isAffecting ? 'text-status-danger' : 'text-tanline-badge', 'shrink-0')} />
 <div className="flex-1">
 <div className={cn('font-display font-bold leading-tight', isAffecting && 'text-status-danger')}>
 {t.label}
 </div>
 <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">{t.type} · טווח {t.range}</div>
 </div>
 {isAffecting && (
 <div className="text-status-danger font-display font-bold tracking-wide text-[13px]">
 ⚠ בסכנה
 </div>
 )}
 </div>
 </motion.button>
 );
 })}
 </div>

 {/* Use case callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <Icon name="spark" size={32} className="text-brand-dark shrink-0" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 שימוש מבצעי כפול
 </div>
 <h3 className="font-display font-bold text-lg leading-tight mb-2">
Network + Buffer = ניתוח שטח מלא
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 <strong className="text-fg">Network Analysis</strong> מספרת לך מה יקרה אם תפצץ צומת. אבל לפני שתעשה זאת, <strong className="text-fg">Buffer Analysis</strong> מגלה לך אם הצומת כבר בטווח של איום אויב — או אם פגיעה תפגע באזרחים.
 <strong className="text-fg block mt-1.5">השילוב הוא תפיסת קבלת ההחלטות המודרנית:</strong> לפני כל פעולה, GIS מציג את ההשלכה הטכנית (Network) ואת ההשלכה הקטלנית (Buffer) במפה אחת.
 </p>
 </div>
 </div>
 </div>
 </section>
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
