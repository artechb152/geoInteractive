'use client';
import { useEffect, useMemo, useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
// The terrain (slope from one height model, river, village, threat, paved road)
// and its map live beside the scene.
import { COST_RAMP, CostMap, END, FactorThumb, GRID, H, LegendSwatch, START, W, type Factor } from './CostSurfaceTerrain';

// Compute cost surface from grid + weights
function computeCost(weights: { slope: number; water: number; urban: number; threat: number }): number[][] {
const cost: number[][] = [];
for (let x = 0; x < W; x++) {
cost[x] = [];
for (let y = 0; y < H; y++) {
const c = GRID[x][y];
cost[x][y] =
(c.road ? 0.3 : 1) + // base cost — a paved road is cheap to move on
c.slope * (c.road ? 0.4 : 1) * weights.slope * 5 +
(c.road ? 0 : c.water) * weights.water * 8 + // the road crosses the river on a bridge
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

 // Binary-heap priority queue (recomputed on every slider step)
const queue: { x: number; y: number; d: number }[] = [
 { x: start[0], y: start[1], d: 0 },
 ];
const push = (n: { x: number; y: number; d: number }) => {
queue.push(n);
let i = queue.length - 1;
while (i > 0) {
const p = (i - 1) >> 1;
if (queue[p].d <= queue[i].d) break;
[queue[p], queue[i]] = [queue[i], queue[p]];
i = p;
 }
 };
const pop = () => {
const top = queue[0];
const last = queue.pop()!;
if (queue.length > 0) {
queue[0] = last;
let i = 0;
for (;;) {
const l = 2 * i + 1, r = l + 1;
let m = i;
if (l < queue.length && queue[l].d < queue[m].d) m = l;
if (r < queue.length && queue[r].d < queue[m].d) m = r;
if (m === i) break;
[queue[m], queue[i]] = [queue[i], queue[m]];
i = m;
 }
 }
return top;
 };
const visited = new Set<string>();
while (queue.length > 0) {
const u = pop();
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
const start = START;
const end = END;
const lcp = useMemo(() => leastCostPath(cost, start, end), [cost]);
// The traveller runs once along the path ~0.4 s after the sliders settle,
// and again on replay — never in a loop.
const [run, setRun] = useState(0);
const pathKey = lcp.path.map((p) => p.join(',')).join(' ');
useEffect(() => {
const id = window.setTimeout(() => setRun((r) => r + 1), 400);
return () => window.clearTimeout(id);
 }, [pathKey]);

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
title = {
  <>
    המסלול הכי קצר הוא לא תמיד <span className="text-accent-hover">המסלול הכי חכם</span>
  </>
}
intro="כל תא בשטח מקבל ציון קושי לתנועה — שיפוע, מכשולים, קרבה לאיום. משטח העלות שנוצר מזין אלגוריתם שמחפש את המסלול הזול ביותר מ-A ל-B, ולרוב הוא לא הקו הישר."
 />

 <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
 <div className="surface-elevated p-6 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
 <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
 הקלט
 </div>
 <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
 Cost Surface — ראסטר של "קושי לתנועה"
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 ראסטר שבו כל פיקסל קיבל ציון של קושי לתנועה. <strong className="text-fg">עלות גבוהה</strong> = שיפוע, בוץ, נחל, איום אש. <strong className="text-fg">עלות נמוכה</strong> = כביש סלול, שטח מוסתר, מסלול בטוח.
 </p>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty mt-3">
 <strong className="text-fg">"עלות" כאן היא לא מרחק ולא זמן</strong> — היא ציון מצטבר שנבנה מסכום גורמים: שיפוע (כמה קשה לטפס), מכשולים כמו נחל או שטח בנוי (כמה קשה לחצות או לעקוף), וקרבה לאיום (כמה מסוכן להיחשף). לכל גורם יש משקל שקובעים בסליידרים למטה — אותו תא בשטח יכול להיות "זול" במשימה שקטה ו"יקר" כשמעלים את משקל האיום.
 </p>
 </div>
 <div className="surface-elevated p-6 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
 <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
 הפלט
 </div>
 <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
 Least-Cost Path — אלגוריתם שזורם כמו מים
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 מחפש את הנתיב הזול ביותר מ-A ל-B. עוקף מכשולים, נדבק לדרך הקלה, ומגיע ליעד במסלול שעשוי להיראות ארוך יותר במבט על — אבל מהיר, בטוח וחסכוני יותר בפועל.
 </p>
 </div>
 </div>

 {/* Main interactive */}
 <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch mb-12">
 {/* Map */}
 <div className="surface-elevated p-4 rounded-2xl flex flex-col">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 משטח עלות חי · A ← B
 </div>
 <div className="flex items-center gap-2">
 <div className="chip text-[13px] border-brand/40 bg-brand/10 text-brand-dark">
 <Icon name="check" size={12} strokeWidth={2.5} />
 <span className="font-display font-medium tracking-wide">חיסכון: {savings}%</span>
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

 {/* square cells: the map keeps the grid's 30:18 aspect; map + legend stay together */}
 <div className="flex-1 min-h-0 flex flex-col justify-center">
 <div className="w-full aspect-[30/18] rounded-xl overflow-hidden bg-bg-accent">
 <CostMap cost={cost} path={lcp.path} showDirect={showDirect} runKey={run} />
 </div>

 <div className="mt-3 flex items-center gap-4 text-[13px] font-display font-medium tracking-wide text-fg-muted flex-wrap">
 <span className="flex items-center gap-1.5"><LegendSwatch fill={COST_RAMP[1]} /> עלות נמוכה</span>
 <span className="flex items-center gap-1.5"><LegendSwatch fill={COST_RAMP[3]} /> עלות בינונית</span>
 <span className="flex items-center gap-1.5"><LegendSwatch fill={COST_RAMP[6]} /> עלות גבוהה</span>
 <span className="flex items-center gap-1.5"><LegendSwatch line /> נתיב Least-Cost</span>
 </div>
 </div>
 </div>

 {/* Controls */}
 <div className="space-y-3">
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 משקלות עלות
 </div>
 <p className="text-[13px] text-fg-muted leading-relaxed mb-3">
 איך כל גורם משפיע על "עלות הנתיב"? 0 = לא חשוב. 1 = חשוב מאוד.
 </p>

 <WeightSlider
label="שיפוע (גובה)"
factor="slope"
value={weights.slope}
setValue={(v) => setWeights({ ...weights, slope: v })}
color="text-terrain-ridge"
 />
 <WeightSlider
label="מים (נחל)"
factor="water"
value={weights.water}
setValue={(v) => setWeights({ ...weights, water: v })}
color="text-terrain-sky"
 />
 <WeightSlider
label="שטח בנוי"
factor="urban"
value={weights.urban}
setValue={(v) => setWeights({ ...weights, urban: v })}
color="text-fg-muted"
 />
 <WeightSlider
label="קרבה לאיום"
factor="threat"
value={weights.threat}
setValue={(v) => setWeights({ ...weights, threat: v })}
color="text-status-danger"
 />
 </div>

 <div className="surface p-3 rounded-2xl flex items-center gap-2">
 <button
type="button"
aria-pressed={showDirect}
onClick={() => setShowDirect(!showDirect)}
className={cn(
 'flex-1 px-3 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
showDirect
 ? 'bg-accent text-bg-elevated'
 : 'border-2 border-border hover:border-border-strong'
 )}
 >
 <Icon name={showDirect ? 'check' : 'crosshair'} size={12} strokeWidth={2.5} />
 {showDirect ? 'מציג: קו ישיר ↔ LCP' : 'השווה לקו ישיר'}
 </button>
 </div>

 <div className="grid grid-cols-2 gap-2">
 {/* each number takes the colour of its line on the map */}
 <div className="surface p-3 rounded-2xl text-center">
 <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">עלות LCP</div>
 <div className="font-display font-bold text-xl text-accent tabular-nums">{lcp.total.toFixed(0)}</div>
 </div>
 <div className="surface p-3 rounded-2xl text-center">
 <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">קו ישיר</div>
 <div className="font-display font-bold text-xl text-fg tabular-nums">{directDist.toFixed(0)}</div>
 </div>
 </div>
 </div>
 </div>

 {/* Concept callout */}
 <div className="">
 <div className="flex gap-4 items-start">
 <Icon name="compass" size={32} className="text-brand-dark shrink-0" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">"כמו מים זורמים"
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
function WeightSlider({
label,
factor,
value,
setValue,
color,
}: {
label: string;
factor: Factor;
value: number;
setValue: (v: number) => void;
color: string;
}) {
return (
 <div className="mb-3 last:mb-0">
 <div className="flex items-baseline justify-between mb-1">
 <div className="text-[13px] font-medium">{label}</div>
 <div className={cn('text-sm font-display font-bold tabular-nums', color)}>
 {value.toFixed(1)}
 </div>
 </div>
 <div className="flex items-center gap-3">
 {/* where this factor sits on the map, at the strength its weight gives it */}
 <FactorThumb factor={factor} weight={value} />
 {/* a numeric scale unrolls left → right (0 at left); not mirrored for RTL */}
 <input
type="range"
dir="ltr"
min={0}
max={1}
step={0.05}
value={value}
onChange={(e) => setValue(Number(e.target.value))}
className="min-w-0 flex-1 accent-accent"
aria-label={label}
 />
 </div>
 </div>
 );
}
