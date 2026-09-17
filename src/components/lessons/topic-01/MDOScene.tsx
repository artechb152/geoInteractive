'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
type Domain = {
id: string;
label: string;
english: string;
icon: IconName;
 // One ~12–18 word sentence shown inline under this domain's row while
 // it's off — the damaged capability and its cost to the rest of the
 // force fused into a single line. No separate title: the row's own
 // name + switch state already say "this one's disconnected".
impact: string;
 // This domain's object layer: position + size in the shared field-photo
 // coordinate system (mdo-scene-background.png, 1448×1086px, measured
 // from the left/top edge — never mirrored for RTL). Height is derived
 // from the source PNG's own trimmed aspect ratio so it's never stretched.
 // The connection/marker anchor is derived from this same box (see
 // domainAnchor) instead of being specified separately, so the image
 // layer, the SVG marker, and the connection lines can never drift apart.
image: { src: string; width: number; aspect: number; x: number; y: number };
 // Fraction of the box (0..1, default [0.5, 0.5]) the anchor lands on.
 // Only the mast overrides Y to land on its antenna cluster instead of
 // the middle of its own tall, mostly-empty shaft.
anchorRel?: [number, number];
 // Decorative on-photo caption — only the satellite needs one: it's a
 // symbolic stand-in for the space domain, not a literal depiction, so it
 // says so directly on the image instead of only in the panel.
caption?: string;
};

/** Box (top-left + size) for a domain's object layer, in field-photo px. */
function domainBox(d: Domain): { x: number; y: number; width: number; height: number } {
return { x: d.image.x, y: d.image.y, width: d.image.width, height: d.image.width / d.image.aspect };
}

/** Connection/marker anchor for a domain, derived from its own image box
    (never stored independently) so repositioning the object always moves
    its anchor with it. */
function domainAnchor(d: Domain): [number, number] {
const box = domainBox(d);
const [rx, ry] = d.anchorRel ?? [0.5, 0.5];
return [box.x + rx * box.width, box.y + ry * box.height];
}

const ASSET_BASE = '/assets/lessons/topic01/scene-mdo';

const DOMAINS: Domain[] = [
 {
id: 'land', label: 'יבשה', english: 'Land', icon: 'mountain',
impact: 'אין החזקת שטח בפועל: אפשר להפציץ ולצלם מלמעלה, אבל בלי חיילים בשטח אי אפשר להכריע או לכבוש.',
 // Foreground of the clearing — closest object to the viewer; wheels get a ground-contact shadow (Task 2).
image: { src: `${ASSET_BASE}/mdo-object-ground-vehicle.png`, x: 730, y: 730, width: 255, aspect: 1486 / 692 },
 },
 {
id: 'air', label: 'אוויר', english: 'Air', icon: 'plane',
impact: 'השמיים פתוחים לגמרי: החיילים בשטח חשופים להפצצות, בלי מי שיזהה או יעצור איומים בזמן.',
 // Mid-upper sky, right of center — clear of the satellite and the horizon.
image: { src: `${ASSET_BASE}/mdo-object-aircraft.png`, x: 860, y: 210, width: 245, aspect: 1674 / 477 },
 },
 {
id: 'sea', label: 'ים', english: 'Sea', icon: 'ship',
impact: 'אספקה לחוף נחסמת: אוניות מסע ואספקה מתקשות להגיע, והחופים נשארים פרוצים לכל ניסיון פלישה.',
 // Afloat in the open sea, lower-left — hull sits in the water band below the horizon; gets a water-contact ripple (Task 2).
image: { src: `${ASSET_BASE}/mdo-object-ship.png`, x: 60, y: 435, width: 190, aspect: 1658 / 762 },
 },
 {
id: 'space', label: 'חלל', english: 'Space', icon: 'satellite',
impact: 'ניווט וקישור נפגעים: ה-GPS מאבד דיוק, מטרות מוחטאות וקשר בין הכוחות מתנתק כשהכי צריך אותו.',
 // Upper-left sky, clear of the aircraft — a symbolic stand-in for the space domain, not a literal depiction.
image: { src: `${ASSET_BASE}/mdo-object-satellite.png`, x: 315, y: 90, width: 115, aspect: 1454 / 792 },
caption: 'חלל · המחשה',
 },
 {
id: 'cyber', label: 'סייבר', english: 'Cyber', icon: 'bolt',
impact: 'ההגנה הדיגיטלית קורסת: האקרים יכולים לזייף מטרות, לשבש תקשורת ולהפיל תשתיות קריטיות בעורף.',
 // Standing on the grass hillside, base planted on the ground; feet get a contact shadow (Task 2).
image: { src: `${ASSET_BASE}/mdo-object-mast.png`, x: 1170, y: 490, width: 58, aspect: 433 / 1494 },
 // Lands on the antenna/dish cluster near the top, not mid-shaft.
anchorRel: [0.5, 0.35],
 },
];

/* The panel's ONE active/inactive visual language, used by each row's state
   indicator: active = filled accent with a small local glow; inactive =
   hollow, outlined, dimmed. The glow is a short-radius shadow built from the
   existing `accent` colour (#D97E2B) — the `shadow-glow` token's 40px spread
   is far too wide at this size. */
const STATE_ON = 'border-accent bg-accent text-white shadow-[0_0_8px_-1px_rgba(217,126,43,0.85)]';
const STATE_OFF = 'border-border bg-transparent text-fg-dim';

/** Transition used by every state flip in the panel: one-shot, driven purely
    by the class change, never an idle loop — and skipped entirely under
    `prefers-reduced-motion`, which lands the final state instantly. */
function flipTransition(motionOk: boolean) {
return motionOk ? 'transition-[background-color,border-color,box-shadow,color] duration-200 ease-snap' : 'transition-none';
}

/** One control-panel row: icon + name + an explicit state readout, and —
    only while this domain is off — its own impact sentence inline right
    below, so the control and its feedback live in the same place instead
    of a control list plus a separate answer area elsewhere. The switch
    itself is still the real `role="switch"` control (a far bigger hit
    target than any thumb), and state is legible three ways — the
    "פעיל"/"מנותק" word, a filled-vs-hollow dot of identical size, and
    `aria-checked` for AT; `aria-describedby` ties the switch to its own
    impact text once it's showing, so a screen reader announces why this
    one matters right after its state. The old iOS-style switch is folded
    into the state chip: colour alone never carries the state. */
function DomainRow({ d, isOn, motionOk, onToggle }: { d: Domain; isOn: boolean; motionOk: boolean; onToggle: () => void }) {
 // "יבשה" is grammatically feminine — every other domain label is
 // masculine, so this is the only one needing the feminine form.
const isFem = d.id === 'land';
const stateWord = isOn ? (isFem ? 'פעילה' : 'פעיל') : isFem ? 'לא פעילה' : 'לא פעיל';
const impactId = `mdo-impact-${d.id}`;
return (
 <div className="border-b border-border/40 last:border-b-0">
 <button
type="button"
role="switch"
aria-checked={isOn}
aria-label={`${d.label}: ${stateWord}, לחץ ל${isOn ? 'כיבוי' : 'הפעלה'}`}
aria-describedby={isOn ? undefined : impactId}
onClick={onToggle}
className={cn(
 'flex w-full items-center justify-between gap-2 px-3 py-2 text-start',
 'hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
flipTransition(motionOk),
 )}
 >
 <span className="flex min-w-0 items-center gap-2.5">
 <Icon name={d.icon} size={20} className={cn('shrink-0', isOn ? 'text-fg' : 'text-fg-dim')} aria-hidden />
 <span className="block truncate font-display text-sm font-bold text-fg">{d.label}</span>
 </span>
 {/* Fixed width + inline-start alignment so the five dots line up on
     one axis even though "מנותק" is wider than "פעיל". */}
 <span
aria-hidden
className={cn(
 'chip w-[72px] shrink-0 justify-start gap-1.5 px-2 py-0.5 text-[11px]',
flipTransition(motionOk),
isOn ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border text-fg-dim',
 )}
 >
 <span
className={cn(
 'size-2 shrink-0 rounded-full border',
flipTransition(motionOk),
isOn ? STATE_ON : STATE_OFF,
 )}
 />
 {isOn ? 'פעיל' : 'מנותק'}
 </span>
 </button>
 {!isOn && (
 <p id={impactId} className="-mt-1 px-3 pb-2 text-sm leading-tight text-fg-muted">
 {d.impact}
 </p>
 )}
 </div>
 );
}

export function MDOScene() {
const [active, setActive] = useState<Set<string>>(new Set(DOMAINS.map((d) => d.id)));
const motionOk = !useReducedMotion();
function toggle(id: string) {
setActive((prev) => {
const next = new Set(prev);
if (next.has(id)) next.delete(id);
else next.add(id);
return next;
 });
 }
function activateAll() {
setActive(new Set(DOMAINS.map((d) => d.id)));
 }

 // Grid/flex `stretch` alone cannot cap the panel to the image's height:
 // an "auto" row track is sized by the TALLEST column's own natural content
 // height, so when the panel's content (unclamped) is taller than the
 // image, the row simply grows to fit the panel instead of the image
 // capping it — the reverse of what's wanted here. The image's aspect
 // ratio has to actively drive the panel's height, not just hope stretch
 // sorts it out, so its rendered height is measured and applied to the
 // panel directly. Desktop-only (matches the lg: 2-column breakpoint
 // below) — under that, the columns stack and the panel's natural height
 // is exactly what's wanted. The panel's own content (header, rows,
 // button) stays fixed-size regardless — this only aligns the envelope;
 // any leftover height is left as plain empty space, never stretched into
 // the rows.
const imageColRef = useRef<HTMLDivElement>(null);
const [panelHeight, setPanelHeight] = useState<number | null>(null);
const [isDesktop, setIsDesktop] = useState(false);
useEffect(() => {
const mq = window.matchMedia('(min-width: 1024px)');
setIsDesktop(mq.matches);
const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
mq.addEventListener('change', onChange);
return () => mq.removeEventListener('change', onChange);
 }, []);
useEffect(() => {
const el = imageColRef.current;
if (!el || typeof ResizeObserver === 'undefined') return;
const ro = new ResizeObserver(([entry]) => setPanelHeight(entry.contentRect.height));
ro.observe(el);
return () => ro.disconnect();
 }, []);
return (
 <section id="scene-mdo" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="01.2"
eyebrow="לחימה בכל הממדים יחד · MDO"
underline
title={
          <>
          המערכה המודרנית: שדה הקרב כבר מזמן לא מוגבל ל<span className="gradient-text">קרקע</span>
          </>
        }intro='פעם צבאות נלחמו בשדה קרב שטוח, פנים מול פנים. היום מלחמה מזכירה משחק רשת מורכב שמתנהל ב-5 זירות במקביל. לחצו על כל ממד בתמונת השטח כדי"לכבות" אותו, ותראו איך כל הצבא שלכם מאבד כוח.'
 />

 <div className="surface-elevated relative overflow-hidden grid sm:grid-cols-[7fr_3fr]">
 <div className="p-6 sm:p-8">
 <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">מה זה MDO?</h3>
 <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
 <p className="mt-2 text-base leading-relaxed text-fg-muted">
 ראשי תיבות של <span className="font-mono text-brand-dark">Multi-Domain Operations</span> (מבצעים רב-ממדיים).
 במקום שחיל האוויר יילחם לבד והשריון לבד – הכל קורה ביחד. כל 5 הממדים עובדים מסונכרנים באותה שנייה בדיוק.
 זה"המולטי-טאסקינג" שבלעדיו שום צבא לא יכול לנצח היום.
 </p>
 </div>
 <div className="flex items-center justify-center bg-bg-accent p-6 sm:p-8">
 <IsometricAsset
 assetId="TOPIC01-MDO-PENTAGON-DIAGRAM"
 src="/reference-assets/mdo-explainer-card/pentagon-diagram.png"
 alt="דיאגרמת פנטגון: חמישה תחומי לחימה — יבשה, אוויר, ים, חלל וסייבר — מחוברים סביב MDO במרכז"
 aspect="1/1"
 fit="contain"
 className="w-full max-w-[150px] bg-bg-accent sm:max-w-[180px]"
 />
 </div>
 </div>

 {/* One unified card — control panel and scene read as a single
     interactive surface, separated only by hairline borders, not nested
     cards. DOM order is [panel, image]: in RTL, the first grid child
     lands in the visual-right column, so the narrower (3fr) panel-share
     column must come first for the panel to sit on the right and the
     wider (7fr) image-share column second, for the image to sit on the
     visual left.
     The panel's envelope is locked to the image's height (`panelHeight`,
     measured off the image column via ResizeObserver below): the rows
     list is sized by its own content — including every currently-off
     domain's inline impact sentence — and never stretched to fill that
     height, while the counter+reset row is pushed to the very bottom via
     `mt-auto`. So the only "slack" is blank space above that bottom row,
     never a scrollbar. Worst case (all five off, all five sentences
     showing) is sized to still fit under the image's own height. */}
 <div className="mt-12 rounded-[28px] border border-border/60 bg-bg-accent p-4 shadow-elevated">
 <div className="grid gap-4 lg:grid-cols-[3fr_7fr]">
 <div
className="flex flex-col rounded-2xl border border-border/60 bg-bg-elevated p-3"
style={isDesktop && panelHeight ? { height: panelHeight } : undefined}
 >
 {/* One continuous surface with hairline dividers — five rows, not
     five separate little cards. `overflow-hidden` keeps each row's
     hover fill and inset focus ring inside the rounded corners. No
     header above this and no separate feedback area below it: each
     row carries its own control AND (while off) its own impact
     sentence inline, so every currently-off domain's explanation
     shows at once, in the fixed row order, right under its own
     switch — never a stretched row when everything's on, since nothing
     here flex-grows. */}
 <div className="overflow-hidden rounded-2xl border border-border/60 bg-bg-elevated">
 {DOMAINS.map((d) => (
 <DomainRow key={d.id} d={d} isOn={active.has(d.id)} motionOk={motionOk} onToggle={() => toggle(d.id)} />
 ))}
 </div>

 {/* Bottom row, pinned to the panel's own bottom via `mt-auto` (never
     a scrollbar, never stretched rows above it) — a small "x/5" count
     instead of a full header, beside the reset button rather than
     above it. */}
 <div className="mt-auto flex items-center gap-3 pt-2">
 <span className="shrink-0 text-xs font-medium tabular-nums text-fg-muted">
 {active.size}/{DOMAINS.length} פעילים
 </span>
 <button type="button" onClick={activateAll} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-display font-bold text-white transition-colors hover:bg-accent-hover">
 <Icon name="refresh" size={16} />
 הפעלת כל הממדים
 </button>
 </div>
 </div>

 <div ref={imageColRef} className="flex flex-col">
 <MDOFieldDiagram domains={DOMAINS} active={active} />
 </div>
 </div>
 </div>

 <RealWorldExamples />

 <ChokepointBand eyebrow="המסקנה: החוליה החלשה" className="mt-12">
אי אפשר לנצח מלחמה היום רק עם הטנקים הכי טובים או חיל האוויר הכי חזק. מספיק שממד אחד נופל – וכל הצבא קורס איתו. צבא חכם מתכנן מכה שמשלבת את כל הממדים יחד, ובמקביל דואג"לנתק" לאויב את החיבורים שלו כדי לשתק אותו.
 </ChokepointBand>
 </section>
 );
}
/* Field-photo dimensions (mdo-field-domains.png) — the SVG overlay shares
   this viewBox so lines/markers stay pinned to the same objects at any
   container width. */
const FIELD_W = 1448;
const FIELD_H = 1086;

/** Keeps a Bézier control point inside the visible field-photo frame (with a
    small margin) so a connection arc never bows out past the image's own
    edges. A quadratic Bézier stays within the convex hull of its three
    points, so clamping the control point alongside the two anchor points
    (always in-frame, since every domain's box is) keeps the whole curve
    in-frame too. */
function clampToField([x, y]: [number, number], margin = 10): [number, number] {
return [Math.min(FIELD_W - margin, Math.max(margin, x)), Math.min(FIELD_H - margin, Math.max(margin, y))];
}

/* Connections drawn between domains — a curated subset (not a complete
   graph), chosen for teaching value rather than geometric completeness. */
const EDGES: [string, string][] = [
['land', 'air'],
['land', 'sea'],
['space', 'air'],
['space', 'land'],
['cyber', 'space'],
['cyber', 'land'],
['cyber', 'sea'],
];

function quadPoint(a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] {
const u = 1 - t;
return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

/** Sampled closest distance from a quadratic Bézier curve to a point — cheap
    approximation (24 steps), fine for the anchor-clearance check below. */
function minDistToCurve(a: [number, number], c: [number, number], b: [number, number], p: [number, number]) {
let best = Infinity;
for (let i = 0; i <= 24; i++) {
const [x, y] = quadPoint(a, c, b, i / 24);
best = Math.min(best, Math.hypot(x - p[0], y - p[1]));
 }
return best;
}

 // Ring radius (~32px at sm:size-16) converted back to field-photo units at
 // roughly the diagram's rendered scale, plus the glow's spread — an arc
 // passing closer than this to an anchor it doesn't connect to would visibly
 // cut through that anchor's ring.
const MIN_ANCHOR_CLEARANCE = 80;

function rotateVec(v: [number, number], deg: number): [number, number] {
const r = (deg * Math.PI) / 180;
const cos = Math.cos(r);
const sin = Math.sin(r);
return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos];
}

// Small fan of angle/magnitude candidates tried around the base outward
// bow, closest-to-base first, so the search prefers the smallest deviation
// that still clears every anchor the edge doesn't touch.
const CONTROL_ANGLES = [0, 25, -25, 45, -45, 65, -65, 85, -85];
const CONTROL_MAGNITUDES = [1, 1.3, 1.7, 2.1];

/** Quadratic-Bézier control point, bowed outward from the layout's centroid
    so the 7 arcs fan out through open sky/sea instead of overlapping. Pure
    outward-magnitude escalation can't resolve every case — when an edge's
    midpoint and a third anchor sit on the same side of the centroid, the
    curve stays roughly collinear with that anchor no matter how far out it
    bows. So candidates also rotate the bow direction, and pick the smallest
    rotation (then smallest magnitude) that clears every other anchor by
    MIN_ANCHOR_CLEARANCE; if nothing clears fully, fall back to whichever
    candidate had the largest worst-case clearance. */
function edgeControl(
a: [number, number],
b: [number, number],
centroid: [number, number],
avoid: [number, number][],
): [number, number] {
const mx = (a[0] + b[0]) / 2;
const my = (a[1] + b[1]) / 2;
let dx = mx - centroid[0];
let dy = my - centroid[1];
const dlen = Math.hypot(dx, dy) || 1;
dx /= dlen;
dy /= dlen;
const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
const baseBow = Math.min(80, Math.max(35, edgeLen * 0.2));

let best: [number, number] | null = null;
let bestScore = -Infinity;
let fallback: [number, number] = clampToField([mx + dx * baseBow, my + dy * baseBow]);
let fallbackClearance = -Infinity;

for (const angle of CONTROL_ANGLES) {
const [rx, ry] = rotateVec([dx, dy], angle);
for (const mag of CONTROL_MAGNITUDES) {
const bow = baseBow * mag;
const control: [number, number] = clampToField([mx + rx * bow, my + ry * bow]);
const clearance = avoid.length ? Math.min(...avoid.map((p) => minDistToCurve(a, control, b, p))) : Infinity;
if (clearance > fallbackClearance) {
fallbackClearance = clearance;
fallback = control;
 }
if (clearance >= MIN_ANCHOR_CLEARANCE) {
const score = -Math.abs(angle) * 10 - mag;
if (score > bestScore) {
bestScore = score;
best = control;
 }
 }
 }
 }
return best ?? fallback;
}

function edgePath(a: [number, number], b: [number, number], c: [number, number]) {
return `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
}

/**
 * MDOFieldDiagram — realistic field photo with an orange, glowing SVG layer
 * of Bézier connections drawn on top. Replaces the abstract pentagon
 * diagram: the photo itself never moves/scales — only the connection
 * lines, travelling light points and anchor pulses animate, and only
 * between domains that are both switched on.
 */
function MDOFieldDiagram({
domains,
active,
}: {
domains: Domain[];
active: Set<string>;
}) {
 // `anchor` is derived once here (from each domain's own image box) and
 // carried alongside it for the rest of this component — every consumer
 // below (edges, markers) reads it from here rather than recomputing it,
 // so the image layer and its connection point can never disagree.
const positioned = useMemo(() => domains.map((d) => ({ ...d, anchor: domainAnchor(d) })), [domains]);
const byId = useMemo(() => Object.fromEntries(positioned.map((d) => [d.id, d])), [positioned]);
const centroid = useMemo<[number, number]>(() => {
const n = positioned.length;
const sx = positioned.reduce((s, d) => s + d.anchor[0], 0);
const sy = positioned.reduce((s, d) => s + d.anchor[1], 0);
return [sx / n, sy / n];
 }, [positioned]);

const edges = useMemo(
() =>
EDGES.map(([idA, idB]) => {
const a = byId[idA];
const b = byId[idB];
const avoid = positioned.filter((d) => d.id !== idA && d.id !== idB).map((d) => d.anchor);
const control = edgeControl(a.anchor, b.anchor, centroid, avoid);
return { idA, idB, d: edgePath(a.anchor, b.anchor, control) };
 }),
[byId, centroid, positioned],
 );

const reduceMotion = useReducedMotion();
const [inView, setInView] = useState(true);
const wrapRef = useRef<HTMLDivElement>(null);

useEffect(() => {
const el = wrapRef.current;
if (!el || typeof IntersectionObserver === 'undefined') return;
 // Stop the travelling-light/pulse loops when the diagram scrolls off
 // screen — same pattern as ContourCake3D's off-screen render pause.
const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
rootMargin: '200px',
 });
observer.observe(el);
return () => observer.disconnect();
 }, []);

 // Single switch for every looping SMIL animation below: off for reduced
 // motion (static arcs) and while off-screen.
const motionEnabled = inView && !reduceMotion;
 // The on/off crossfade is a one-shot transition, not a loop, so it survives
 // going off-screen — but reduced motion still lands it instantly. Shared by
 // the edges and the markers.
const fade = reduceMotion ? 'none' : 'opacity 300ms ease';

return (
 // Physical `left`/`top` (not inset-inline-start/logical) is deliberate
 // throughout this component: every position here is a photo-pixel
 // coordinate that must land on the same object regardless of page
 // direction. Logical properties would mirror them under RTL, which is
 // exactly what the brief prohibits for this image.
 <div ref={wrapRef} className="relative">
 <IsometricAsset
assetId="TOPIC01-MDO-SCENE-BACKGROUND"
src={`${ASSET_BASE}/mdo-scene-background.png`}
alt="נוף חוף וגבעות מדומה — הרקע לאינטראקציית חמשת הממדים; כלי הלחימה של כל ממד מוצגים כשכבות נפרדות מעליו"
aspect="4/3"
fit="contain"
eager
className="w-full rounded-2xl"
 />

 {/* Decorative connections layer — purely reinforces what the buttons
     and status text below already state, so it's hidden from AT. */}
 <svg
viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
preserveAspectRatio="xMidYMid meet"
className="pointer-events-none absolute inset-0 size-full"
aria-hidden="true"
 >
 <defs>
 {/* Generous filter region so the soft glow never clips at a path's
     bounding-box edge. */}
 <filter id="mdoLineGlow" x="-60%" y="-60%" width="220%" height="220%">
 <feGaussianBlur stdDeviation="6" />
 </filter>
 {/* Wider blur for the marker halo that lifts each node off the photo. */}
 <filter id="mdoNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
 <feGaussianBlur stdDeviation="8" />
 </filter>
 </defs>

 {/* One independent group per domain: its object image, then its
     target-lock marker on top of it, both gated on that domain's own
     `active` entry and nothing else — a domain with no surviving
     connections (several pairs have no curated edge at all, by design)
     still has to read unmistakably as "on". Turning it off fades the
     WHOLE group (the actual object layer included, not a mask over it)
     over the same 300ms as the connections below. The marker itself: a
     soft halo to separate it from the photo, a cream-backed ring that
     stays legible over both bright sky and dark foliage, a lit core, and
     four ticks — the earlier 13×9 hairline ellipse rendered at roughly a
     6.6px radius at this container width and simply vanished into the
     terrain. */}
 {positioned.map((d) => {
const isOn = active.has(d.id);
const [cx, cy] = d.anchor;
const box = domainBox(d);
return (
 <g key={'domain-' + d.id} data-domain={d.id} style={{ opacity: isOn ? 1 : 0, transition: fade }}>
 <image href={d.image.src} x={box.x} y={box.y} width={box.width} height={box.height} preserveAspectRatio="xMidYMid meet" />
 <circle cx={cx} cy={cy} r="29" fill="#D97E2B" opacity="0.22" filter="url(#mdoNodeGlow)" />
 <circle cx={cx} cy={cy} r="18" fill="none" stroke="#FDFBF3" strokeWidth="4.5" opacity="0.4" />
 <circle cx={cx} cy={cy} r="18" fill="none" stroke="#D97E2B" strokeWidth="2.5" opacity="0.85" />
 {[
 [0, -1],
 [0, 1],
 [-1, 0],
 [1, 0],
 ].map(([ux, uy]) => (
 <line
key={`${ux},${uy}`}
x1={cx + ux * 22}
y1={cy + uy * 22}
x2={cx + ux * 28}
y2={cy + uy * 28}
stroke="#D97E2B"
strokeWidth="2"
strokeLinecap="round"
opacity="0.7"
 />
 ))}
 <circle cx={cx} cy={cy} r="7" fill="#D97E2B" />
 <circle cx={cx} cy={cy} r="3" fill="#FDFBF3" opacity="0.95" />
 {motionEnabled && isOn && (
 <circle cx={cx} cy={cy} r="18" fill="none" stroke="#D97E2B" strokeWidth="2.5">
 <animate attributeName="r" values="18;40" dur="3.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.75;0" dur="3.4s" repeatCount="indefinite" />
 </circle>
 )}
 {/* Decorative caption — the satellite is a symbolic stand-in for
     the space domain, not a literal depiction, so it says so
     directly on the photo (the button in the panel says the same
     thing in its aria-label). */}
 {d.caption && (
 <>
 <rect x={cx - 58} y={box.y - 30} width="116" height="21" rx="10.5" fill="#FDFBF3" opacity="0.92" />
 <text x={cx} y={box.y - 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="#4A5240">
 {d.caption}
 </text>
 </>
 )}
 </g>
 );
 })}

 {/* Connections — drawn above the object layer so the glowing arcs and
     travelling light points read as an overlay network, the same way
     they did when every object was baked into one photo. */}
 {edges.map(({ idA, idB, d }) => {
 // Per-pair only: an edge is drawn iff BOTH of its own endpoints are
 // on. Never an aggregate/threshold rule over the active count.
const bothActive = active.has(idA) && active.has(idB);
return (
 <g key={idA + idB} data-edge={`${idA}-${idB}`} style={{ opacity: bothActive ? 1 : 0, transition: fade }}>
 <path d={d} fill="none" stroke="#D97E2B" strokeWidth={9} opacity={0.28} filter="url(#mdoLineGlow)" />
 <path d={d} fill="none" stroke="#D97E2B" strokeWidth={2.25} opacity={0.92} strokeLinecap="round" />
 {motionEnabled && bothActive && (
 <>
 <circle r="4.5" fill="#D97E2B">
 <animateMotion dur="4.2s" repeatCount="indefinite" path={d} />
 </circle>
 <circle r="4.5" fill="#D97E2B" opacity="0.75">
 <animateMotion dur="4.2s" begin="-2.1s" repeatCount="indefinite" path={d} />
 </circle>
 <circle r="3.5" fill="#FDFBF3" opacity="0.9">
 <animateMotion dur="4.2s" begin="-3.4s" repeatCount="indefinite" path={d} />
 </circle>
 </>
 )}
 </g>
 );
 })}
 </svg>
 </div>
 );
}
function RealWorldExamples() {
const cases = [
 {
title: 'אוקראינה נגד רוסיה',
year: '2022 ואילך',
desc:"אוקראינה בולמת צבא ענק בעזרת שילוב זירות: חיילים בשוחות (יבשה) מפעילים רחפנים קטלניים (אוויר) כדי לתקוף ספינות (ים), כשהם מנווטים דרך אינטרנט לווייני של 'סטארלינק' (חלל), בזמן שרוסיה מנסה להפיל להם את הרשת ללא הפסקה (סייבר).",
domainIds: ['land', 'air', 'sea', 'space', 'cyber'],
photoAssetId: 'TOPIC01-MDO-CASE-UKRAINE',
photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-UKRAINE.png',
photoAlt: 'חייל בשטח מפעיל רחפן תקיפה, בשמיים מעליו לוויין תקשורת',
 },
 {
title:"החות'ים משתקים את הים האדום",
year: '2023–2024',
desc: 'איך ארגון טרור מתימן משתק את הסחר העולמי? הם תוקפים אוניות סחר (ים) בעזרת כטב"מים וטילים (אוויר), ומקבלים מיקומים מדויקים על האוניות ממערכות ולוויינים של איראן (חלל וסייבר). הוכחה שגם ארגון קטן יכול לשלב ממדים.',
domainIds: ['air', 'sea', 'space', 'cyber'],
photoAssetId: 'TOPIC01-MDO-CASE-HOUTHIS',
photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-HOUTHIS.png',
photoAlt: 'אוניית סחר בים האדום, כטב"ם תוקף מהאוויר ותצפית חופית עוקבת',
 },
 {
title: 'תקיפת איראן (אוקטובר 2024)',
year: '2024',
desc:"מטוסי קרב (אוויר) הפציצו מטרות במרחק אלפי קילומטרים. כדי שזה יצליח, לוויינים (חלל) שידרו להם מיקום מדויק בזמן אמת, ולוחמי סייבר 'עיוורו' את מערכות ההגנה של איראן עוד לפני שהמטוסים התקרבו. שילוב מושלם ששמר על כוחותינו.",
domainIds: ['air', 'space'],
photoAssetId: 'TOPIC01-MDO-CASE-IRAN',
photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-IRAN.png',
photoAlt: 'מטוס קרב בטיסה מעל שטח איראן, לוויין משדר מיקום ממעל',
 },
 ];
return (
 <div className="mt-12">
 <div>
 <div className="mb-5">
 <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">איך זה נראה בעולם האמיתי</h3>
 <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
 <p className="mt-2 text-base leading-relaxed text-fg-muted">3 דוגמאות עכשוויות שבהן ראינו MDO בפועל</p>
 </div>
 <div className="grid gap-4 md:grid-cols-3">
 {cases.map((c, i) => (
 <motion.article
key={c.title}
initial={{ opacity: 0, y: 18 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.08 }}
className="surface p-5 text-center"
 >
 <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
 {c.year}
 </div>
 <h4 className="font-display font-bold leading-tight text-black text-lg md:text-xl text-balance mt-0.5 mb-3">{c.title}</h4>
 <IsometricAsset
assetId={c.photoAssetId}
src={c.photoSrc}
alt={c.photoAlt}
aspect="4/3"
fit="cover"
className="rounded-lg overflow-hidden"
 />
 <p className="mt-3 text-base leading-relaxed text-black text-pretty">{c.desc}</p>
 <div className="mt-4 flex flex-wrap items-start justify-center gap-3">
 {DOMAINS.filter((d) => c.domainIds.includes(d.id)).map((d) => (
 <div key={d.id} className="flex flex-col items-center gap-1.5">
 <div className="flex size-9 items-center justify-center rounded-full border border-border">
 <Icon name={d.icon} size={16} className="text-fg" />
 </div>
 <span className="text-[11px] text-fg-muted">{d.label}</span>
 </div>
 ))}
 </div>
 </motion.article>
 ))}
 </div>
 </div>
 </div>
 );
}
function ChokepointBand({
eyebrow,
className,
children,
}: {
eyebrow: React.ReactNode;
className?: string;
children: React.ReactNode;
}) {
return (
 <div className={cn('relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8', className)}>
 <div className="grid gap-6 sm:grid-cols-[1fr_1.4fr]">
 <div className="flex flex-col justify-center">
 <div className="mb-1 text-sm font-display font-bold tracking-wide text-ember">
 {eyebrow}
 </div>
 <p className="text-base leading-relaxed text-paper-bright/90">{children}</p>
 </div>
 <div className="relative min-h-[200px]">
 <IsometricAsset
assetId="TOPIC01-MDO-CHAIN-BROKEN"
src="/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CHAIN-BROKEN.png"
alt="שרשרת שבורה — סמל לחוליה חלשה המנתקת את החיבור בין הממדים"
aspect="4/3"
fit="cover"
className="rounded-xl border border-border [aspect-ratio:auto] h-full w-full"
 />
 </div>
 </div>
 </div>
 );
}
