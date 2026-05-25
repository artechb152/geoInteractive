'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

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
 { id: 't2', x: 30, y: 50, label: 'SAM קצר טווח', range: 8, type: 'MANPADS' },
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
return (
 <section id="scene-network" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="12.3"
eyebrow="ניתוח רשתות ומעגלי השפעה"
title={
 <>
 <span className="gradient-text">Network</span> + <span className="gradient-text">Buffer</span> Analysis
 </>
 }
intro={`גשר אחד יכול להפיל אוגדה שלמה. סוללת טילים מאיימת על 50 ק"מ. ניתוח רשתות חושף את הצומת הקריטי, וניתוח Buffer מציג איפה אסור לעבור.`}
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">Network Analysis</strong> — ניתוח טופולוגי של קווים מחוברים (כבישים, צינורות דלק, כבלי תקשורת). מזהה <strong className="text-fg">"נקודות כשל"</strong>: מה יקרה אם גשר מסוים יפוצץ? אילו כוחות יישארו מנותקים?
 <strong className="text-fg block mt-1.5">Buffer Analysis</strong> — שרטוט טבעות סביב אובייקטים. <strong className="text-fg">טבעת איום</strong> סביב סוללת SAM ="Kill Box". כל כוח שנמצא בתוך הטבעת — בסכנה.
 </div>
 </div>
 </div>

 {/* Network analysis */}
 <div className="surface-elevated p-4 rounded-2xl mb-6">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 רשת דרכים · בסיס (A) ← חזית (I)
 </div>
 <div className={cn(
 'chip',
isConnected ? 'border-status-ok/40 bg-status-ok/10 text-status-ok' : 'border-status-danger/40 bg-status-danger/10 text-status-danger'
 )}>
 <Icon name={isConnected ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
 <span className="font-mono">
 {isConnected ? `מחובר · ${path.length - 1} צמתי ביניים` : 'מנותק! החזית מבודדת'}
 </span>
 </div>
 </div>

 <NetworkMap
nodes={NODES}
edges={EDGES}
disabled={disabled}
path={path}
onToggle={toggleNode}
 />

 <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
 <div className="text-[10px] text-fg-dim">
 לחץ על צומת כדי"לפוצץ" אותו וראה את אפקט הדומינו
 </div>
 <button
onClick={reset}
disabled={disabled.size === 0}
className={cn(
 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
disabled.size > 0
 ? 'border-border hover:border-border-strong text-fg'
 : 'border-border text-fg-dim cursor-not-allowed opacity-50'
 )}
 >
 <Icon name="spark" size={12} />
 אפס נזק ({disabled.size})
 </button>
 </div>
 </div>

 {/* Targeting insight */}
 <div className="surface-elevated p-5 rounded-2xl mb-12">
 <div className="flex gap-3 items-start">
 <Icon name="crosshair" size={20} className="text-accent shrink-0 mt-0.5" />
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
 'chip',
threatsAffecting.length === 0 ? 'border-status-ok/40 bg-status-ok/10 text-status-ok' :
threatsAffecting.length === 1 ? 'border-status-warn/40 bg-status-warn/10 text-status-warn' :
 'border-status-danger/40 bg-status-danger/10 text-status-danger'
 )}>
 <Icon name={threatsAffecting.length === 0 ? 'check' : 'shield'} size={12} strokeWidth={2.5} />
 <span className="font-mono">
 {threatsAffecting.length === 0 ? 'בטוח' : `${threatsAffecting.length} איום${threatsAffecting.length > 1 ? 'ים' : ''} מאיים${threatsAffecting.length > 1 ? 'ים' : ''}`}
 </span>
 </div>
 </div>

 <BufferMap
threats={THREATS}
showBuffers={showThreatBuffers}
friendlyPos={friendlyPos}
setFriendlyPos={setFriendlyPos}
threatsAffecting={threatsAffecting.map((t) => t.id)}
 />

 <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
 <div className="text-[10px] text-fg-dim">
 לחץ על המפה כדי להזיז את הכוח הידידותי וראה איזה איומים מאיימים עליו
 </div>
 <button
onClick={() => setShowThreatBuffers(!showThreatBuffers)}
className={cn(
 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5',
showThreatBuffers
 ? 'bg-status-danger text-bg shadow-glow'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={showThreatBuffers ? 'check' : 'shield'} size={12} strokeWidth={2.5} />
 {showThreatBuffers ? 'Buffer פעיל' : 'הצג Buffer'}
 </button>
 </div>
 </div>

 {/* Threats details */}
 <div className="grid sm:grid-cols-2 gap-3 mb-12">
 {THREATS.map((t, i) => {
const isAffecting = threatsAffecting.some((tt) => tt.id === t.id);
return (
 <motion.div
key={t.id}
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.08 }}
className={cn(
 'surface p-4 rounded-xl border-r-4 transition-all',
isAffecting ? 'border-r-status-danger bg-status-danger/5 shadow-glow' : 'border-r-status-warn'
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn(
 'size-11 rounded-xl flex items-center justify-center border-2',
isAffecting ? 'border-status-danger bg-status-danger/15' : 'border-status-warn/40 bg-status-warn/10'
 )}>
 <Icon name="crosshair" size={18} className={isAffecting ? 'text-status-danger' : 'text-status-warn'} />
 </div>
 <div className="flex-1">
 <div className={cn('font-display font-bold leading-tight', isAffecting && 'text-status-danger')}>
 {t.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim">{t.type} · טווח {t.range}</div>
 </div>
 {isAffecting && (
 <div className="text-status-danger font-mono font-bold text-xs">
 ⚠ בסכנה
 </div>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>

 {/* Use case callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="spark" size={22} className="text-accent" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
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
function NetworkMap({
nodes,
edges,
disabled,
path,
onToggle,
}: {
nodes: Node[];
edges: [string, string][];
disabled: Set<string>;
path: string[];
onToggle: (id: string) => void;
}) {
const nodeMap = new Map(nodes.map((n) => [n.id, n]));
const pathSet = new Set(path);
const pathEdges = new Set<string>();
for (let i = 0; i < path.length - 1; i++) {
pathEdges.add([path[i], path[i + 1]].sort().join('-'));
 }
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <rect x="0" y="0" width="100" height="56" className="fill-bg-elevated" />

 {/* Grid background */}
 {Array.from({ length: 11 }).map((_, i) => (
 <line key={`gx${i}`} x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-border-subtle" strokeWidth="0.08" />
 ))}
 {Array.from({ length: 6 }).map((_, i) => (
 <line key={`gy${i}`} x1="0" y1={i * 11} x2="100" y2={i * 11} className="stroke-border-subtle" strokeWidth="0.08" />
 ))}

 {/* Edges */}
 {edges.map(([a, b]) => {
const na = nodeMap.get(a)!;
const nb = nodeMap.get(b)!;
const edgeKey = [a, b].sort().join('-');
const isOnPath = pathEdges.has(edgeKey);
const isBroken = disabled.has(a) || disabled.has(b);
return (
 <line
key={edgeKey}
x1={na.x}
y1={na.y}
x2={nb.x}
y2={nb.y}
className={
isBroken ? 'stroke-status-danger' :
isOnPath ? 'stroke-status-ok' :
 'stroke-fg-dim'
 }
strokeWidth={isOnPath ? 0.9 : 0.5}
strokeDasharray={isBroken ? '1.5 1' : undefined}
opacity={isBroken ? 0.4 : 1}
 />
 );
 })}

 {/* Nodes */}
 {nodes.map((n) => {
const isDisabled = disabled.has(n.id);
const isOnPath = pathSet.has(n.id);
const isEndpoint = n.id === 'A' || n.id === 'I';
return (
 <g key={n.id} onClick={() => !isEndpoint && onToggle(n.id)} style={{ cursor: isEndpoint ? 'default' : 'pointer' }}>
 {/* Pulse on path */}
 {isOnPath && !isDisabled && (
 <circle cx={n.x} cy={n.y} r="3" fill="none" className="stroke-status-ok" strokeWidth="0.3">
 <animate attributeName="r" values="2;5;2" dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
 </circle>
 )}
 {/* Critical marker */}
 {n.isCritical && !isDisabled && (
 <circle cx={n.x} cy={n.y} r="3.5" fill="none" className="stroke-status-warn" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
 )}
 {/* Node circle */}
 <circle
cx={n.x}
cy={n.y}
r={isEndpoint ? 2.2 : 1.8}
className={
isDisabled ? 'fill-status-danger/30 stroke-status-danger' :
n.id === 'A' ? 'fill-accent-cool stroke-accent-cool' :
n.id === 'I' ? 'fill-accent-hot stroke-accent-hot' :
isOnPath ? 'fill-status-ok stroke-status-ok' :
 'fill-bg-card stroke-fg'
 }
strokeWidth="0.4"
 />
 {/* Disabled X */}
 {isDisabled && (
 <g>
 <line x1={n.x - 1.4} y1={n.y - 1.4} x2={n.x + 1.4} y2={n.y + 1.4} className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
 <line x1={n.x - 1.4} y1={n.y + 1.4} x2={n.x + 1.4} y2={n.y - 1.4} className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
 </g>
 )}
 {/* Label */}
 <text
x={n.x}
y={n.y + 0.8}
textAnchor="middle"
className={cn(
 'font-display font-bold',
isDisabled ? 'fill-status-danger' :
isEndpoint ? 'fill-bg' :
isOnPath ? 'fill-bg' : 'fill-fg'
 )}
fontSize="2.2"
 >
 {n.id}
 </text>
 {/* Critical badge */}
 {n.isCritical && !isDisabled && (
 <text x={n.x + 2.5} y={n.y - 2} className="fill-status-warn font-display font-bold font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
 ⚠
 </text>
 )}
 </g>
 );
 })}

 {/* Animated traffic blip along path */}
 {path.length > 1 && (
 <motion.circle
r="0.8"
className="fill-accent"
animate={{
cx: path.map((id) => nodeMap.get(id)!.x),
cy: path.map((id) => nodeMap.get(id)!.y),
 }}
transition={{ duration: path.length * 1.2, repeat: Infinity, ease: 'linear' }}
 />
 )}
 </svg>
 </div>
 );
}
function BufferMap({
threats,
showBuffers,
friendlyPos,
setFriendlyPos,
threatsAffecting,
}: {
threats: Threat[];
showBuffers: boolean;
friendlyPos: { x: number; y: number };
setFriendlyPos: (p: { x: number; y: number }) => void;
threatsAffecting: string[];
}) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg
viewBox="0 0 100 56"
preserveAspectRatio="none"
className="w-full h-full"
style={{ cursor: 'crosshair' }}
onClick={(e) => {
const svg = e.currentTarget as SVGSVGElement;
const rect = svg.getBoundingClientRect();
const x = ((e.clientX - rect.left) / rect.width) * 100;
const y = ((e.clientY - rect.top) / rect.height) * 56;
setFriendlyPos({ x, y });
 }}
 >
 <rect x="0" y="0" width="100" height="56" className="fill-bg-elevated" />

 {/* Terrain hints */}
 <path d="M0 40 L25 36 L50 42 L75 38 L100 40 L100 56 L0 56 Z" className="fill-terrain-sand/20" />

 {/* Grid */}
 {Array.from({ length: 11 }).map((_, i) => (
 <line key={i} x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-border-subtle" strokeWidth="0.08" opacity="0.4" />
 ))}

 {/* Threat buffers */}
 {showBuffers && threats.map((t) => (
 <g key={t.id} className="pointer-events-none">
 {/* Outer buffer ring */}
 <circle cx={t.x} cy={t.y} r={t.range} fill="currentColor" className="text-status-danger" opacity="0.08" />
 {/* Ring border */}
 <circle cx={t.x} cy={t.y} r={t.range} fill="none" className="stroke-status-danger" strokeWidth="0.4" strokeDasharray="1.5 0.8" opacity="0.5" />
 {/* Inner ring (50%) */}
 <circle cx={t.x} cy={t.y} r={t.range * 0.6} fill="none" className="stroke-status-danger" strokeWidth="0.25" strokeDasharray="0.8 0.5" opacity="0.4" />
 {/* Range label */}
 <text x={t.x + t.range - 2} y={t.y - 1} className="fill-status-danger font-display font-bold" fontSize="1.6" paintOrder="stroke" stroke="#0a0f1a" strokeWidth="0.6" strokeLinejoin="round">
Kill Box
 </text>
 </g>
 ))}

 {/* Threat markers */}
 {threats.map((t) => (
 <g key={`marker-${t.id}`} className="pointer-events-none">
 <circle cx={t.x} cy={t.y} r="1.5" className="fill-status-danger" stroke="#ffffff" strokeWidth="0.4" />
 <circle cx={t.x} cy={t.y} r="3" fill="none" className="stroke-status-danger/50" strokeWidth="0.3">
 <animate attributeName="r" values="2;5;2" dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
 </circle>
 <text
x={t.x}
y={t.y - 3.5}
textAnchor="middle"
className="fill-status-danger font-display font-bold"
fontSize="2.2"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.75"
strokeLinejoin="round"
 >
 {t.label}
 </text>
 </g>
 ))}

 {/* Friendly position (draggable target) */}
 <g className="pointer-events-none">
 <circle
cx={friendlyPos.x}
cy={friendlyPos.y}
r="2"
className={cn(
threatsAffecting.length === 0 ? 'fill-accent-cool stroke-accent-cool' : 'fill-status-warn stroke-status-warn'
 )}
stroke="#ffffff"
strokeWidth="0.4"
 />
 <circle
cx={friendlyPos.x}
cy={friendlyPos.y}
r="4"
fill="none"
className={threatsAffecting.length === 0 ? 'stroke-accent-cool' : 'stroke-status-warn'}
strokeWidth="0.3"
 >
 <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
 </circle>
 <text
x={friendlyPos.x}
y={friendlyPos.y + 4.5}
textAnchor="middle"
className={cn(
 'font-display font-bold',
threatsAffecting.length === 0 ? 'fill-accent-cool' : 'fill-status-warn'
 )}
fontSize="2.2"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.75"
strokeLinejoin="round"
 >
 כוח ידידותי
 </text>
 </g>
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
