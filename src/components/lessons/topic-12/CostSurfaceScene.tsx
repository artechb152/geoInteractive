'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

// Grid dimensions
const W = 22;
const H = 13;

// Generate a fixed terrain grid: each cell has slope, water, urban (0-1)
type Cell = { slope: number; water: number; urban: number; threat: number };
function generateGrid(): Cell[][] {
const g: Cell[][] = [];
for (let x = 0; x < W; x++) {
g[x] = [];
for (let y = 0; y < H; y++) {
 // Slope: 2 hills
const slope =
Math.exp(-(((x - 8) ** 2) / 22 + ((y - 4) ** 2) / 12)) * 0.9 +
Math.exp(-(((x - 15) ** 2) / 18 + ((y - 9) ** 2) / 14)) * 0.7;
 // River across middle
const water = Math.exp(-((y - 7 + Math.sin(x * 0.5) * 0.8) ** 2) * 1.4) * 0.85;
 // Urban patch
const urban =
x >= 11 && x <= 14 && y >= 2 && y <= 4 ? 0.9 :
x >= 17 && x <= 19 && y >= 8 && y <= 10 ? 0.7 : 0;
 // Threat near (16, 6)
const dx = x - 16;
const dy = y - 6;
const threat = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 5);
g[x][y] = { slope, water, urban, threat };
 }
 }
return g;
}
const GRID = generateGrid();

// Compute cost surface from grid + weights
function computeCost(weights: { slope: number; water: number; urban: number; threat: number }): number[][] {
const cost: number[][] = [];
for (let x = 0; x < W; x++) {
cost[x] = [];
for (let y = 0; y < H; y++) {
const c = GRID[x][y];
cost[x][y] =
1 + // base cost
c.slope * weights.slope * 5 +
c.water * weights.water * 8 +
c.urban * weights.urban * 4 +
c.threat * weights.threat * 12;
 }
 }
return cost;
}

// Dijkstra for grid
function leastCostPath(
cost: number[][],
start: [number, number],
end: [number, number]
): { path: [number, number][]; total: number } {
const dist: number[][] = [];
const prev: ([number, number] | null)[][] = [];
for (let x = 0; x < W; x++) {
dist[x] = [];
prev[x] = [];
for (let y = 0; y < H; y++) {
dist[x][y] = Infinity;
prev[x][y] = null;
 }
 }
dist[start[0]][start[1]] = 0;

 // Simple priority queue using a sorted array
const queue: { x: number; y: number; d: number }[] = [
 { x: start[0], y: start[1], d: 0 },
 ];
const visited = new Set<string>();
while (queue.length > 0) {
queue.sort((a, b) => a.d - b.d);
const u = queue.shift()!;
const key = `${u.x},${u.y}`;
if (visited.has(key)) continue;
visited.add(key);
if (u.x === end[0] && u.y === end[1]) break;
const neighbors: [number, number][] = [
 [u.x - 1, u.y],
 [u.x + 1, u.y],
 [u.x, u.y - 1],
 [u.x, u.y + 1],
 [u.x - 1, u.y - 1],
 [u.x + 1, u.y - 1],
 [u.x - 1, u.y + 1],
 [u.x + 1, u.y + 1],
 ];
for (const [nx, ny] of neighbors) {
if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
const diag = nx !== u.x && ny !== u.y;
const stepCost = cost[nx][ny] * (diag ? 1.414 : 1);
const alt = dist[u.x][u.y] + stepCost;
if (alt < dist[nx][ny]) {
dist[nx][ny] = alt;
prev[nx][ny] = [u.x, u.y];
queue.push({ x: nx, y: ny, d: alt });
 }
 }
 }

 // Trace path
const path: [number, number][] = [];
let cur: [number, number] | null = end;
while (cur) {
path.unshift(cur);
cur = prev[cur[0]][cur[1]];
 }
return { path, total: dist[end[0]][end[1]] };
}
export function CostSurfaceScene() {
const [weights, setWeights] = useState({ slope: 0.5, water: 0.7, urban: 0.4, threat: 1.0 });
const [showDirect, setShowDirect] = useState(false);
const cost = useMemo(() => computeCost(weights), [weights]);
const start: [number, number] = [1, 11];
const end: [number, number] = [20, 2];
const lcp = useMemo(() => leastCostPath(cost, start, end), [cost]);

 // Direct line for comparison
const directDist = useMemo(() => {
 // Sum of cost along straight line (rough Bresenham)
const dx = end[0] - start[0];
const dy = end[1] - start[1];
const steps = Math.max(Math.abs(dx), Math.abs(dy));
let total = 0;
for (let s = 0; s <= steps; s++) {
const x = Math.round(start[0] + (dx * s) / steps);
const y = Math.round(start[1] + (dy * s) / steps);
total += cost[x][y];
 }
return total;
 }, [cost]);
const savings = Math.round(((directDist - lcp.total) / directDist) * 100);
return (
 <section id="scene-costsurface" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="12.2"
eyebrow="משטח עלות ונתיב בעלות מינימלית"
title={
 <>
 <span className="gradient-text">Cost Surface</span> + <span className="gradient-text">Least-Cost Path</span>
 </>
 }
intro="קח את השטח הפיזי, הוסף איומים ומסלע, ושאל: מה הדרך הזולה ביותר מ-A ל-B? GIS עונה לך תוך 3 שניות — ובדרך כלל המסלול לא הקו הישר."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">Cost Surface</strong> — ראסטר שבו כל פיקסל קיבל ציון"קושי לתנועה". <strong className="text-fg">עלות גבוהה</strong> = שיפוע, בוץ, נחל, איום. <strong className="text-fg">עלות נמוכה</strong> = כביש, שטח מוסתר.
 <strong className="text-fg block mt-1.5">Least-Cost Path</strong> — אלגוריתם שמחפש את הנתיב הזול ביותר. כמו"מים זורמים" — עוקף מכשולים, נדבק לדרך הקלה. <strong className="text-fg">תוצאה:</strong> מסלול אולי ארוך יותר במבט על — אבל מהיר, בטוח, וחסכוני יותר.
 </div>
 </div>
 </div>

 {/* Main interactive */}
 <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch mb-12">
 {/* Map */}
 <div className="surface-elevated p-4 rounded-2xl">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 משטח עלות חי · A → B
 </div>
 <div className="chip border-status-ok/40 bg-status-ok/10 text-status-ok">
 <Icon name="check" size={12} strokeWidth={2.5} />
 <span className="font-mono">חיסכון: {savings}%</span>
 </div>
 </div>

 <CostMap cost={cost} path={lcp.path} start={start} end={end} showDirect={showDirect} />

 <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-fg-dim flex-wrap">
 <span className="flex items-center gap-1"><span className="size-2 bg-status-ok rounded-sm" /> עלות נמוכה</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-status-warn rounded-sm" /> עלות בינונית</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-status-danger rounded-sm" /> עלות גבוהה</span>
 <span className="flex items-center gap-1"><span className="size-2 bg-accent rounded-sm" /> נתיב Least-Cost</span>
 </div>
 </div>

 {/* Controls */}
 <div className="space-y-3">
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 משקלות עלות
 </div>
 <p className="text-xs text-fg-muted leading-relaxed mb-3">
 איך כל גורם משפיע על"עלות הנתיב"? 0 = לא חשוב. 1 = חשוב מאוד.
 </p>

 <WeightSlider
label="שיפוע (גובה)"
value={weights.slope}
setValue={(v) => setWeights({ ...weights, slope: v })}
color="text-terrain-ridge"
 />
 <WeightSlider
label="מים (נחל)"
value={weights.water}
setValue={(v) => setWeights({ ...weights, water: v })}
color="text-terrain-sky"
 />
 <WeightSlider
label="שטח בנוי"
value={weights.urban}
setValue={(v) => setWeights({ ...weights, urban: v })}
color="text-accent-cool"
 />
 <WeightSlider
label="קרבה לאיום"
value={weights.threat}
setValue={(v) => setWeights({ ...weights, threat: v })}
color="text-status-danger"
 />
 </div>

 <div className="surface p-3 rounded-xl flex items-center gap-2">
 <button
onClick={() => setShowDirect(!showDirect)}
className={cn(
 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
showDirect
 ? 'bg-status-danger text-bg shadow-glow'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={showDirect ? 'check' : 'crosshair'} size={12} strokeWidth={2.5} />
 {showDirect ? 'מציג: קו ישיר ↔ LCP' : 'השווה לקו ישיר'}
 </button>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="surface p-3 rounded-lg text-center">
 <div className="text-[10px] font-mono text-fg-dim">עלות LCP</div>
 <div className="font-display font-bold text-xl text-status-ok tabular-nums">{lcp.total.toFixed(0)}</div>
 </div>
 <div className="surface p-3 rounded-lg text-center">
 <div className="text-[10px] font-mono text-fg-dim">קו ישיר</div>
 <div className="font-display font-bold text-xl text-status-danger tabular-nums">{directDist.toFixed(0)}</div>
 </div>
 </div>
 </div>
 </div>

 {/* Concept callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="compass" size={22} className="text-accent" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">"כמו מים זורמים"
 </div>
 <h3 className="font-display font-bold text-lg leading-tight mb-2">
 הנתיב הזול לא תמיד הוא הקצר
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 ניתוח LOS הוא <strong className="text-fg">קווי</strong> — הוא בודק קו ישר אחד. <strong className="text-fg">Least-Cost Path</strong> חושב <strong className="text-fg">כמו מים</strong> — מחפש את הדרך הקלה ביותר ליעד, גם אם היא מפותלת.
 <strong className="text-fg block mt-1.5">למה זה חשוב לכוחות מיוחדים:</strong> פשיטה בעומק שטח אויב לא תכננת לפי קו ישר. תכננת ב-LCP, שמשקלל איומים + שטח מוסתר + עבירות. המסלול שבסוף מתחבא בוואדיות, עוקף שדות מוקשים, ומגיע ליעד <strong className="text-fg">לפני שהאויב שמע אותך</strong>.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function CostMap({
cost,
path,
start,
end,
showDirect,
}: {
cost: number[][];
path: [number, number][];
start: [number, number];
end: [number, number];
showDirect: boolean;
}) {
const cellW = 100 / W;
const cellH = 100 / H;

 // Find max cost for normalization
let maxCost = 1;
for (let x = 0; x < W; x++) {
for (let y = 0; y < H; y++) {
if (cost[x][y] > maxCost) maxCost = cost[x][y];
 }
 }
return (
 <div className="aspect-[22/13] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
 {/* Cost heatmap */}
 {Array.from({ length: W }).map((_, x) =>
Array.from({ length: H }).map((_, y) => {
const c = cost[x][y] / maxCost;
const color =
c > 0.7 ? '#dc2626' :
c > 0.5 ? '#f59e0b' :
c > 0.3 ? '#10b981' :
 '#22d3ee';
return (
 <rect
key={`${x}-${y}`}
x={x * cellW}
y={y * cellH}
width={cellW}
height={cellH}
fill={color}
opacity={0.15 + c * 0.5}
 />
 );
 })
 )}

 {/* Grid lines (subtle) */}
 {Array.from({ length: W + 1 }).map((_, i) => (
 <line key={`gx${i}`} x1={i * cellW} y1="0" x2={i * cellW} y2="100" className="stroke-fg-dim" strokeWidth="0.05" opacity="0.2" />
 ))}
 {Array.from({ length: H + 1 }).map((_, i) => (
 <line key={`gy${i}`} x1="0" y1={i * cellH} x2="100" y2={i * cellH} className="stroke-fg-dim" strokeWidth="0.05" opacity="0.2" />
 ))}

 {/* Direct line (if toggled) */}
 {showDirect && (
 <line
x1={start[0] * cellW + cellW / 2}
y1={start[1] * cellH + cellH / 2}
x2={end[0] * cellW + cellW / 2}
y2={end[1] * cellH + cellH / 2}
className="stroke-status-danger"
strokeWidth="0.7"
strokeDasharray="2 1.2"
opacity="0.8"
 />
 )}

 {/* Least-cost path */}
 <motion.polyline
points={path.map((p) => `${p[0] * cellW + cellW / 2},${p[1] * cellH + cellH / 2}`).join(' ')}
fill="none"
className="stroke-accent"
strokeWidth="1.2"
strokeLinejoin="round"
strokeLinecap="round"
initial={{ pathLength: 0 }}
animate={{ pathLength: 1 }}
transition={{ duration: 0.5 }}
 />

 {/* Animated traveler */}
 <motion.circle
r="1"
className="fill-accent"
animate={{
cx: path.map((p) => p[0] * cellW + cellW / 2),
cy: path.map((p) => p[1] * cellH + cellH / 2),
 }}
transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
 />

 {/* Start marker */}
 <circle cx={start[0] * cellW + cellW / 2} cy={start[1] * cellH + cellH / 2} r="2" className="fill-accent-cool" stroke="#ffffff" strokeWidth="0.4" />
 <text
x={start[0] * cellW + cellW / 2}
y={start[1] * cellH + cellH / 2 - 3}
textAnchor="middle"
className="fill-accent-cool font-display font-bold"
fontSize="3"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.95"
strokeLinejoin="round"
 >
A
 </text>

 {/* End marker */}
 <circle cx={end[0] * cellW + cellW / 2} cy={end[1] * cellH + cellH / 2} r="2" className="fill-accent-hot" stroke="#ffffff" strokeWidth="0.4" />
 <circle cx={end[0] * cellW + cellW / 2} cy={end[1] * cellH + cellH / 2} r="3.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
 <animate attributeName="r" values="2.5;5;2.5" dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
 </circle>
 <text
x={end[0] * cellW + cellW / 2}
y={end[1] * cellH + cellH / 2 - 3}
textAnchor="middle"
className="fill-accent-hot font-display font-bold"
fontSize="3"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.95"
strokeLinejoin="round"
 >
B
 </text>
 </svg>
 </div>
 );
}
function WeightSlider({
label,
value,
setValue,
color,
}: {
label: string;
value: number;
setValue: (v: number) => void;
color: string;
}) {
return (
 <div className="mb-3 last:mb-0">
 <div className="flex items-baseline justify-between mb-1">
 <div className="text-xs font-medium">{label}</div>
 <div className={cn('text-sm font-display font-bold tabular-nums', color)}>
 {value.toFixed(1)}
 </div>
 </div>
 <input
type="range"
min={0}
max={1}
step={0.05}
value={value}
onChange={(e) => setValue(Number(e.target.value))}
className="w-full accent-accent"
aria-label={label}
 />
 </div>
 );
}
