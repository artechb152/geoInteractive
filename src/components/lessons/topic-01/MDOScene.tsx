'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
type Domain = {
id: string;
label: string;
english: string;
icon: IconName;
weakness: string;
strength: string;
 // Anchor point on the field photo (mdo-field-domains.png, 1448×1086px),
 // measured from the left/top edge — never mirrored for RTL.
anchor: [number, number];
};
const DOMAINS: Domain[] = [
 {
id: 'land', label: 'יבשה', english: 'Land', icon: 'mountain',
strength: 'מגפיים על הקרקע: הדרך היחידה להכריע באמת. רק חיילים יכולים להיכנס פיזית, לטהר מבנים, להסתכל לאויב בעיניים ולהחזיק בשטח.',
weakness: 'בלי כוח קרקעי הכל וירטואלי: אפשר להפציץ ולצלם מלמעלה כמה שרוצים, אבל בלי חיילים על הקרקע אי אפשר באמת לכבוש כלום.',
anchor: [850, 565],
 },
 {
id: 'air', label: 'אוויר', english: 'Air', icon: 'plane',
strength: 'האגרוף מהשמיים: מטוסי קרב ורחפנים שמחסלים מטרות בשניות, מחפים על החיילים מלמעלה ותוקפים עמוק בשטח האויב.',
weakness: 'בלי הגנה אווירית השמיים פתוחים: החיילים למטה חשופים לחלוטין להפצצות, ואין מי שיעזור להם להשמיד איומים מרחוק.',
anchor: [1075, 139],
 },
 {
id: 'sea', label: 'ים', english: 'Sea', icon: 'ship',
strength: 'העורק הפתוח: ספינות קרב וצוללות שמגנות על החופים, מאפשרות לתקוף בהפתעה, ודואגות שאספקת נשק ודלק תמשיך לזרום.',
weakness: 'בלי שליטה בים המדינה במצור: אוניות מסע ואספקה לא מגיעות (קריטי במלחמה ארוכה), והחופים פרוצים לגמרי לפלישה.',
anchor: [165, 502],
 },
 {
id: 'space', label: 'חלל', english: 'Space', icon: 'satellite',
strength: 'העיניים של הצבא: לוויינים שנותנים ניווט GPS מדויק לכל פגז, משדרים תמונות חיות של האויב ושומרים על קשר בין כולם.',
weakness: 'בלי לוויינים הצבא עיוור וחירש: ה-GPS קורס (הטילים מפספסים והחיילים הולכים לאיבוד), ומערכות התקשורת נופלות.',
anchor: [500, 82],
 },
 {
id: 'cyber', label: 'סייבר', english: 'Cyber', icon: 'bolt',
strength: 'הנשק השקוף: היכולת לשתק את האויב בלי לירות כדור אחד! לפרוץ לו למכשירי הקשר, לעוור לו את המכ"ם או לכבות לו את החשמל.',
weakness: 'בלי חומת סייבר נהיה חשופים לגמרי: האקרים יוכלו לזייף מטרות לחיילים, לנתק קשר ולהפיל לנו תשתיות (חשמל, מים, בנקים).',
anchor: [1330, 367],
 },
];
export function MDOScene() {
const [active, setActive] = useState<Set<string>>(new Set(DOMAINS.map((d) => d.id)));
const [motionPaused, setMotionPaused] = useState(false);
const allOn = active.size === DOMAINS.length;
const allOff = active.size === 0;
const missing = DOMAINS.filter((d) => !active.has(d.id));
const pct = (active.size / DOMAINS.length) * 100;
function toggle(id: string) {
setActive((prev) => {
const next = new Set(prev);
if (next.has(id)) next.delete(id);
else next.add(id);
return next;
 });
 }
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

 <div className="mt-12 grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
 <div className="space-y-4">
 <SuperiorityIndicator on={allOn} off={allOff} count={active.size} pct={pct} />

 <AnimatePresence mode="popLayout">
 {!allOn && !allOff && (
 <motion.div
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
className="surface p-5 space-y-3"
 >
 <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
 מה כובה — ומה זה אומר
 </div>
 <ul className="space-y-2.5 text-base leading-relaxed text-black">
 {missing.map((d) => (
 <li key={d.id}>
 <div>
 <strong className="text-black">{d.label}:</strong>{' '}
 <span>{d.weakness}</span>
 </div>
 </li>
 ))}
 </ul>
 </motion.div>
 )}

 {allOff && (
 <motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="surface p-5 text-base leading-relaxed text-black"
 >
 כיבית את כל החמישה — הצבא שותק לחלוטין. אי אפשר לזוז, אי אפשר לראות, אי אפשר לדבר. הפעל לפחות ממד אחד כדי שהכוח יתחיל לפעול שוב.
 </motion.div>
 )}

 {allOn && (
 <motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="surface p-5 space-y-3"
 >
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">המצב האידיאלי ·"בועה" סביב האויב</div>
 <p className="text-base leading-relaxed text-black">
 כשכל החמישה דולקים יחד, הצבא שלנו יוצר סביב האויב מעין <strong className="text-black">בועה הרמטית</strong> —
 כלומר אזור שממנו הוא לא יכול לנוע, לא יכול לראות מה קורה, ולא יכול לתקשר עם הכוחות שלו.
 הוא בעצם <strong className="text-black">משותק</strong> — וכל פעולה שינסה — נחשפת ונחסמת לפני שהתחילה.
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 <div className="space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 לחץ על כל ממד כדי לכבות / להפעיל
 </div>
 <div className="flex items-center gap-3">
 <button
type="button"
onClick={() => setMotionPaused((p) => !p)}
aria-pressed={motionPaused}
aria-label={motionPaused ? 'תנועה מושהית, לחץ להפעלה' : 'תנועה פעילה, לחץ להשהיה'}
className="text-sm font-display font-semibold text-fg-muted hover:text-brand-dark transition-colors flex items-center gap-1"
 >
 {motionPaused ? 'הפעל תנועה' : 'השהה תנועה'}
 </button>
 <button
onClick={() => setActive(new Set(DOMAINS.map((d) => d.id)))}
className="text-sm font-display font-semibold text-fg-muted hover:text-brand-dark transition-colors flex items-center gap-1"
 >
 הפעל הכל
 </button>
 </div>
 </div>
 {/* No overflow-hidden here — the photo rounds its own corners below, but
     the overlay (rings/pulses/chips) must stay free to bleed slightly
     past the photo's edge for anchors close to it, e.g. "חלל" near the
     top, without getting clipped mid-animation. */}
 <div className="surface-elevated">
 <MDOFieldDiagram domains={DOMAINS} active={active} onToggle={toggle} paused={motionPaused} />
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
const MIN_ANCHOR_CLEARANCE = 100;

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
const baseBow = Math.min(150, Math.max(45, edgeLen * 0.2));

let best: [number, number] | null = null;
let bestScore = -Infinity;
let fallback: [number, number] = [mx + dx * baseBow, my + dy * baseBow];
let fallbackClearance = -Infinity;

for (const angle of CONTROL_ANGLES) {
const [rx, ry] = rotateVec([dx, dy], angle);
for (const mag of CONTROL_MAGNITUDES) {
const bow = baseBow * mag;
const control: [number, number] = [mx + rx * bow, my + ry * bow];
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
onToggle,
paused,
}: {
domains: Domain[];
active: Set<string>;
onToggle: (id: string) => void;
paused: boolean;
}) {
const byId = useMemo(() => Object.fromEntries(domains.map((d) => [d.id, d])), [domains]);
const centroid = useMemo<[number, number]>(() => {
const n = domains.length;
const sx = domains.reduce((s, d) => s + d.anchor[0], 0);
const sy = domains.reduce((s, d) => s + d.anchor[1], 0);
return [sx / n, sy / n];
 }, [domains]);

const edges = useMemo(
() =>
EDGES.map(([idA, idB]) => {
const a = byId[idA];
const b = byId[idB];
const avoid = domains.filter((d) => d.id !== idA && d.id !== idB).map((d) => d.anchor);
const control = edgeControl(a.anchor, b.anchor, centroid, avoid);
return { idA, idB, d: edgePath(a.anchor, b.anchor, control) };
 }),
[byId, centroid, domains],
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
 // motion (static arcs), while paused (user toggle) and while off-screen.
const motionEnabled = inView && !paused && !reduceMotion;

return (
 // Physical `left`/`top` (not inset-inline-start/logical) is deliberate
 // throughout this component: every position here is a photo-pixel
 // coordinate that must land on the same object regardless of page
 // direction. Logical properties would mirror them under RTL, which is
 // exactly what the brief prohibits for this image.
 <div ref={wrapRef} className="relative">
 <IsometricAsset
assetId="TOPIC01-MDO-FIELD-DOMAINS"
src="/assets/lessons/topic01/scene-mdo/mdo-field-domains.png"
alt="תצלום שטח מדומה שמשלב את חמשת הממדים: כלי רכב צבאי על דרך עפר (יבשה), אוניית מלחמה בים (ים), מטוס קרב בשמיים (אוויר), לוויין המחשה למרחב החלל, ותורן תקשורת המסמן את מרחב הסייבר"
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
 </defs>

 {edges.map(({ idA, idB, d }) => {
const bothActive = active.has(idA) && active.has(idB);
return (
 <g key={idA + idB} style={{ opacity: bothActive ? 1 : 0, transition: 'opacity 300ms ease' }}>
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

 {domains.map((d) => {
const isOn = active.has(d.id);
return (
 <g key={'ring-' + d.id} style={{ opacity: isOn ? 1 : 0, transition: 'opacity 300ms ease' }}>
 <ellipse cx={d.anchor[0]} cy={d.anchor[1]} rx="46" ry="30" fill="none" stroke="#D97E2B" strokeWidth="1.5" opacity="0.5" />
 {motionEnabled && isOn && (
 <ellipse cx={d.anchor[0]} cy={d.anchor[1]} rx="46" ry="30" fill="none" stroke="#D97E2B" strokeWidth="1.5">
 <animate attributeName="rx" values="46;78" dur="3.4s" repeatCount="indefinite" />
 <animate attributeName="ry" values="30;52" dur="3.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.55;0" dur="3.4s" repeatCount="indefinite" />
 </ellipse>
 )}
 </g>
 );
 })}
 </svg>

 {/* Real, keyboard-operable controls — a transparent-fill ring (the hit
     target) plus a caption chip below it. The ring never opaquely fills,
     so the vehicle/satellite/mast baked into the photo stays visible in
     every state — only the ring's border style and the chip communicate
     on/off, both of which the button's own aria-label states directly. */}
 {domains.map((d) => {
const isOn = active.has(d.id);
const extra = d.id === 'space' ? ' · המחשה' : d.id === 'cyber' ? ' · רשת חוצת ממדים' : '';
 // "יבשה" is grammatically feminine — every other domain label is
 // masculine, so this is the only one needing the feminine form.
const isFem = d.id === 'land';
const activeWord = isFem ? 'פעילה' : 'פעיל';
const inactiveWord = isFem ? 'לא פעילה' : 'לא פעיל';
const leftPct = (d.anchor[0] / FIELD_W) * 100;
const topPct = (d.anchor[1] / FIELD_H) * 100;
return (
 <div key={d.id}>
 <button
type="button"
onClick={() => onToggle(d.id)}
aria-pressed={isOn}
aria-label={`${d.label}${extra}: ${isOn ? `${activeWord}, לחץ לכיבוי` : `${inactiveWord}, לחץ להפעלה`}`}
className={cn(
 'absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent transition-all duration-200 ease-snap sm:size-16',
isOn
 ? 'border-accent shadow-[0_0_0_4px_theme(colors.accent.DEFAULT/15%)]'
 // A light halo (not just the tan border) keeps the dashed ring
 // readable over any patch of the photo — a dirt road or sand-toned
 // slope would otherwise wash the plain tan border out.
 : 'border-dashed border-border opacity-80 shadow-[0_0_0_1.5px_theme(colors.paper.bright/90%)] hover:opacity-100'
 )}
style={{ left: `${leftPct}%`, top: `${topPct}%` }}
 />
 {/* Decorative — the button's aria-label already carries this text.
     Wraps instead of a fixed nowrap width, and the left position is
     clamped by the same half-width — otherwise the longest caption
     (cyber's "· רשת חוצת ממדים") overflows the card's clipped edge,
     since its anchor sits close to the right side of the photo. */}
 <span
aria-hidden
className="chip absolute flex w-max max-w-[124px] -translate-x-1/2 items-center whitespace-normal text-center leading-snug border-border/60 bg-bg-elevated text-fg-muted"
style={{ left: `clamp(64px, ${leftPct}%, calc(100% - 64px))`, top: `calc(${topPct}% + 32px)` }}
 >
 <span className={cn('inline-block size-1.5 shrink-0 rounded-full', isOn ? 'bg-accent' : 'border border-fg-dim')} />
 {d.label}
{extra}
 </span>
 </div>
 );
 })}
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
function SuperiorityIndicator({ on, off, count, pct }: { on: boolean; off: boolean; count: number; pct: number }) {
return (
 <div className="surface-elevated p-5 sm:p-6 text-center">
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">כמה ממדים פעילים</div>
 <div className="font-display font-bold text-5xl tabular-nums mb-1">{count}/5</div>
 <div
className={cn(
 'text-sm font-display font-semibold tracking-wider flex items-center justify-center gap-1.5',
on && 'text-accent',
off && 'text-fg-muted',
 !on && !off && 'text-fg-muted'
 )}
 >
 {on && <>כוח מלא — שליטה מוחלטת</>}
 {off && <>הצבא משותק לחלוטין</>}
 {!on && !off && <>שליטה חלקית — {count} מתוך 5 ממדים פעילים</>}
 </div>

 <div className="mt-4 h-1.5 rounded-full bg-bg-accent overflow-hidden">
 <motion.div
className="h-full rounded-full bg-accent"
animate={{ width: `${pct}%` }}
transition={{ duration: 0.4 }}
 />
 </div>
 </div>
 </div>
 );
}
