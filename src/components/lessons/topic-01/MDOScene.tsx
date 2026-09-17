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
weakness: string;
strength: string;
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
strength: 'מגפיים על הקרקע: הדרך היחידה להכריע באמת. רק חיילים יכולים להיכנס פיזית, לטהר מבנים, להסתכל לאויב בעיניים ולהחזיק בשטח.',
weakness: 'בלי כוח קרקעי הכל וירטואלי: אפשר להפציץ ולצלם מלמעלה כמה שרוצים, אבל בלי חיילים על הקרקע אי אפשר באמת לכבוש כלום.',
 // On the dirt road, roughly mid-frame.
image: { src: `${ASSET_BASE}/mdo-object-ground-vehicle.png`, x: 750, y: 550, width: 195, aspect: 1486 / 692 },
 },
 {
id: 'air', label: 'אוויר', english: 'Air', icon: 'plane',
strength: 'האגרוף מהשמיים: מטוסי קרב ורחפנים שמחסלים מטרות בשניות, מחפים על החיילים מלמעלה ותוקפים עמוק בשטח האויב.',
weakness: 'בלי הגנה אווירית השמיים פתוחים: החיילים למטה חשופים לחלוטין להפצצות, ואין מי שיעזור להם להשמיד איומים מרחוק.',
 // High in the open sky, upper-right.
image: { src: `${ASSET_BASE}/mdo-object-aircraft.png`, x: 950, y: 90, width: 230, aspect: 1674 / 477 },
 },
 {
id: 'sea', label: 'ים', english: 'Sea', icon: 'ship',
strength: 'העורק הפתוח: ספינות קרב וצוללות שמגנות על החופים, מאפשרות לתקוף בהפתעה, ודואגות שאספקת נשק ודלק תמשיך לזרום.',
weakness: 'בלי שליטה בים המדינה במצור: אוניות מסע ואספקה לא מגיעות (קריטי במלחמה ארוכה), והחופים פרוצים לגמרי לפלישה.',
 // In the bay, lower-left.
image: { src: `${ASSET_BASE}/mdo-object-ship.png`, x: 60, y: 470, width: 230, aspect: 1658 / 762 },
 },
 {
id: 'space', label: 'חלל', english: 'Space', icon: 'satellite',
strength: 'העיניים של הצבא: לוויינים שנותנים ניווט GPS מדויק לכל פגז, משדרים תמונות חיות של האויב ושומרים על קשר בין כולם.',
weakness: 'בלי לוויינים הצבא עיוור וחירש: ה-GPS קורס (הטילים מפספסים והחיילים הולכים לאיבוד), ומערכות התקשורת נופלות.',
 // Upper-left sky, clear of the aircraft and the mountain skyline.
image: { src: `${ASSET_BASE}/mdo-object-satellite.png`, x: 420, y: 40, width: 150, aspect: 1454 / 792 },
caption: 'חלל · המחשה',
 },
 {
id: 'cyber', label: 'סייבר', english: 'Cyber', icon: 'bolt',
strength: 'הנשק השקוף: היכולת לשתק את האויב בלי לירות כדור אחד! לפרוץ לו למכשירי הקשר, לעוור לו את המכ"ם או לכבות לו את החשמל.',
weakness: 'בלי חומת סייבר נהיה חשופים לגמרי: האקרים יוכלו לזייף מטרות לחיילים, לנתק קשר ולהפיל לנו תשתיות (חשמל, מים, בנקים).',
 // Standing on the hillside, right edge, base planted on the ground.
image: { src: `${ASSET_BASE}/mdo-object-mast.png`, x: 1250, y: 260, width: 90, aspect: 433 / 1494 },
 // Lands on the antenna/dish cluster near the top, not mid-shaft.
anchorRel: [0.5, 0.35],
 },
];

/** Explanation shown below both columns: the "all connected" blurb while
    every domain is on, or — once anything is off — the full text for
    whichever inactive domain is currently selected in the tab row.
    `inactive` is always every currently-off domain, in DOMAINS order, so the
    tab row lists all of them regardless of which one is selected. */
function resolveExplanation(
domains: Domain[],
active: Set<string>,
selectedTab: string | null,
): { inactive: Domain[]; selected: Domain | null } {
const inactive = domains.filter((d) => !active.has(d.id));
if (inactive.length === 0) return { inactive, selected: null };
const selected = inactive.find((d) => d.id === selectedTab) ?? inactive[0];
return { inactive, selected };
}

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

/** One control-panel row: icon + name + an explicit state readout — the
    full weakness/strength copy lives in the explanation area below, not
    here, so the row never repeats it. The whole row is the real
    `role="switch"` control (a far bigger hit target than any thumb), and
    state is legible three ways — the "פעיל"/"מנותק" word, a filled-vs-hollow
    dot of identical size, and `aria-checked` for AT. The old iOS-style
    switch is folded into this indicator: colour alone never carries the
    state. */
function DomainRow({ d, isOn, motionOk, onToggle }: { d: Domain; isOn: boolean; motionOk: boolean; onToggle: () => void }) {
 // "יבשה" is grammatically feminine — every other domain label is
 // masculine, so this is the only one needing the feminine form.
const isFem = d.id === 'land';
const stateWord = isOn ? (isFem ? 'פעילה' : 'פעיל') : isFem ? 'לא פעילה' : 'לא פעיל';
return (
 <button
type="button"
role="switch"
aria-checked={isOn}
aria-label={`${d.label}: ${stateWord}, לחץ ל${isOn ? 'כיבוי' : 'הפעלה'}`}
onClick={onToggle}
className={cn(
 'flex w-full items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 text-start last:border-b-0',
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
 );
}

export function MDOScene() {
const [active, setActive] = useState<Set<string>>(new Set(DOMAINS.map((d) => d.id)));
 // Which inactive domain's full explanation is showing below the columns.
 // `null` means "show the all-active blurb" — only meaningful while
 // `active` really does cover every domain; the moment anything is off,
 // `resolveExplanation` below falls back to the first inactive domain even
 // if this is stale, so it never needs defensive clearing on every toggle.
const [selectedTab, setSelectedTab] = useState<string | null>(null);
const motionOk = !useReducedMotion();
function toggle(id: string) {
setActive((prev) => {
const wasOn = prev.has(id);
const next = new Set(prev);
if (wasOn) next.delete(id);
else next.add(id);

if (wasOn) {
 // Turning a domain off jumps straight to its own explanation, so
 // "what changed" is immediately visible without hunting for a tab.
setSelectedTab(id);
 } else {
 // Reactivating drops its tab. If it was the one showing, land on
 // another still-off domain, or back on the all-active blurb.
setSelectedTab((cur) => (cur === id ? (DOMAINS.find((d) => !next.has(d.id))?.id ?? null) : cur));
 }
return next;
 });
 }
function activateAll() {
setActive(new Set(DOMAINS.map((d) => d.id)));
setSelectedTab(null);
 }
const { inactive, selected } = resolveExplanation(DOMAINS, active, selectedTab);

 // Roving-tabindex focus targets for the explanation tabs, keyed by domain
 // id, so arrow-key navigation can move focus without re-rendering refs.
const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, id: string) {
const ids = inactive.map((d) => d.id);
const i = ids.indexOf(id);
let next: number | null = null;
 // WAI-ARIA tabs pattern for RTL: Left Arrow advances (reading direction),
 // Right Arrow goes back.
if (e.key === 'ArrowLeft') next = (i + 1) % ids.length;
else if (e.key === 'ArrowRight') next = (i - 1 + ids.length) % ids.length;
else if (e.key === 'Home') next = 0;
else if (e.key === 'End') next = ids.length - 1;
if (next === null) return;
e.preventDefault();
const nextId = ids[next];
setSelectedTab(nextId);
tabRefs.current[nextId]?.focus();
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

 {/* One unified card — control panel, scene and explanation read as a
     single interactive surface, separated only by hairline borders, not
     nested cards. DOM order is [panel, image]: in RTL, the first grid
     child lands in the visual-right column, so the narrower (3fr)
     panel-share column must come first for the panel to sit on the right
     and the wider (7fr) image-share column second, for the image to sit
     on the visual left.
     The panel's envelope is locked to the image's height (`panelHeight`,
     measured off the image column via ResizeObserver below) purely so the
     two columns' borders line up — its own content (header, rows, button)
     never stretches to fill that height; any slack is just empty space.
     The explanation strip is a separate full-width row below both
     columns, so it can grow with the selected paragraph's length without
     touching that ratio at all. */}
 <div className="mt-12 rounded-[28px] border border-border/60 bg-bg-accent p-4 shadow-elevated">
 <div className="grid gap-4 lg:grid-cols-[3fr_7fr]">
 <div
className="flex flex-col rounded-2xl border border-border/60 bg-bg-elevated p-4"
style={isDesktop && panelHeight ? { height: panelHeight } : undefined}
 >
 {/* Header strip: the label and the tabular counter. */}
 <div className="flex items-center justify-between gap-2">
 <div className="text-base font-display font-bold text-fg">הממדים הפעילים</div>
 <div className="font-display font-bold text-lg tabular-nums text-fg">{active.size}/5</div>
 </div>

 {/* One continuous surface with hairline dividers — five rows of a
     single panel, not five separate little cards. `overflow-hidden`
     keeps each row's hover fill and inset focus ring inside the
     rounded corners. Icon + name + the switch's own state readout
     only — the domain's actual explanation lives in the strip below
     the columns, not repeated here. */}
 <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-bg-elevated">
 {DOMAINS.map((d) => (
 <DomainRow key={d.id} d={d} isOn={active.has(d.id)} motionOk={motionOk} onToggle={() => toggle(d.id)} />
 ))}
 </div>

 <button type="button" onClick={activateAll} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-display font-bold text-white transition-colors hover:bg-accent-hover">
 <Icon name="refresh" size={16} />
 הפעלת כל הממדים
 </button>
 </div>

 <div ref={imageColRef} className="flex flex-col">
 <MDOFieldDiagram domains={DOMAINS} active={active} />
 </div>
 </div>

 {/* Explanation strip — full width, below both columns. All active:
     one short line about the combined effect. Otherwise: a compact tab
     per inactive domain (always all of them, in DOMAINS order) and,
     below it, the selected domain's own approved copy in full — never
     truncated, never scrolled. Selecting a tab only swaps which
     explanation shows; it never touches `active`. */}
 <div className="mt-4 border-t border-border/50 pt-4">
 {selected ? (
 <>
 <div role="tablist" aria-label="ממדים מנותקים" className="flex flex-wrap gap-2">
 {inactive.map((d) => {
const isSel = d.id === selected.id;
return (
 <button
key={d.id}
ref={(el) => {
tabRefs.current[d.id] = el;
 }}
type="button"
role="tab"
id={`mdo-tab-${d.id}`}
aria-selected={isSel}
aria-controls="mdo-explanation-panel"
tabIndex={isSel ? 0 : -1}
onClick={() => setSelectedTab(d.id)}
onKeyDown={(e) => onTabKeyDown(e, d.id)}
className={cn(
 'chip gap-1.5 px-3 py-1.5 text-xs',
flipTransition(motionOk),
isSel ? STATE_ON : 'border-border bg-transparent text-fg-muted hover:text-fg',
 )}
 >
 <Icon name={d.icon} size={14} aria-hidden />
 {d.label}
 </button>
 );
 })}
 </div>
 <div
key={selected.id}
role="tabpanel"
id="mdo-explanation-panel"
aria-labelledby={`mdo-tab-${selected.id}`}
className="mt-3 flex items-start gap-2.5"
 >
 <Icon name={selected.icon} size={18} className="mt-0.5 shrink-0 text-accent" />
 <div className="min-w-0">
 <div className="text-sm font-display font-bold text-accent">{selected.label} נותק</div>
 <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{selected.weakness}</p>
 </div>
 </div>
 </>
 ) : (
 <div className="flex items-start gap-2.5">
 <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-accent" />
 <div className="min-w-0">
 <div className="text-sm font-display font-bold text-accent">עליונות מלאה</div>
 <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">כל חמשת הממדים פעילים יחד — יתרון מוחלט על פני האויב.</p>
 </div>
 </div>
 )}
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
 <feGaussianBlur stdDeviation="11" />
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
 <circle cx={cx} cy={cy} r="36" fill="#D97E2B" opacity="0.34" filter="url(#mdoNodeGlow)" />
 <circle cx={cx} cy={cy} r="22" fill="none" stroke="#FDFBF3" strokeWidth="5.5" opacity="0.5" />
 <circle cx={cx} cy={cy} r="22" fill="none" stroke="#D97E2B" strokeWidth="3" opacity="0.95" />
 {[
 [0, -1],
 [0, 1],
 [-1, 0],
 [1, 0],
 ].map(([ux, uy]) => (
 <line
key={`${ux},${uy}`}
x1={cx + ux * 28}
y1={cy + uy * 28}
x2={cx + ux * 35}
y2={cy + uy * 35}
stroke="#D97E2B"
strokeWidth="2.5"
strokeLinecap="round"
opacity="0.85"
 />
 ))}
 <circle cx={cx} cy={cy} r="8.5" fill="#D97E2B" />
 <circle cx={cx} cy={cy} r="3.5" fill="#FDFBF3" opacity="0.95" />
 {motionEnabled && isOn && (
 <circle cx={cx} cy={cy} r="22" fill="none" stroke="#D97E2B" strokeWidth="3">
 <animate attributeName="r" values="22;50" dur="3.4s" repeatCount="indefinite" />
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
