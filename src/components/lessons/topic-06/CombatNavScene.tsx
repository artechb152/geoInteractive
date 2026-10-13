'use client';
import { Fragment, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import {
  HALO,
  PAPER,
  Chevron,
  LegendGlyph,
  PaperTile,
  StartDot,
  TargetMark,
  UnitPuck,
  angleDeg,
  lerpPt,
  linear,
  useSequence,
  useStep,
  useSvgId,
  useTrack,
  type GlyphKind,
  type Pt,
} from './CombatNavVisuals';
import { TerrainAssociationActivity } from './terrain-nav/TerrainAssociationActivity';
type Method = 'handrail' | 'dead';
type MethodData = {
id: Method;
label: string;
english: string;
icon: IconName;
oneLiner: string;
detail: string;
whenToUse: string[];
example: string;
};
const METHODS: MethodData[] = [
 {
id: 'handrail',
label: 'ניווט לפי השטח',
english: 'Terrain Association',
icon: 'route' as never, // Not used
oneLiner: 'מתקדמים בעזרת סימנים מזוהים בשטח ומשווים אותם למפה לאורך הדרך.',
detail: 'בוחרים במפה סימנים שניתן לזהות בשטח ובודקים את המיקום ביחס אליהם. הסימנים יכולים להיות תבליט, כגון כיפה, רכס או ערוץ, ותכסית, כגון כפר, כביש או חורשה. משלבים את הזיהוי עם בדיקת כיוון ומרחק. כאשר נעזרים בתוואי רציף, כמו דרך או ערוץ המקבילים למסלול, הוא משמש כ״מעקה״ לניווט.',
whenToUse: ['כשיש צורות קרקע בולטות שניתן לזהות במפה ובשטח.', 'כשיש עצמים מזוהים לאורך המסלול שיכולים לשמש נקודות לבדיקת המיקום.', 'כשהראות מאפשרת להשוות בין הסימנים בשטח לבין המפה.'],
example: 'בהמחשה, המסלול עובר בשלוש כיפות ומסתיים בכיכר המרכזית בכפר. בכל כיפה בודקים את מיקומה ביחס לכיפות האחרות ולכפר, ומשווים לכיוון ולמרחק המתוכננים. כך מצמצמים את הסיכון לטעות בין סימנים דומים.',
 },
 {
id: 'dead',
label: 'ניווט עיוור',
english: 'Dead Reckoning',
icon: 'compass',
oneLiner: 'מעריכים את המיקום מתוך נקודת מוצא ידועה, כיוון התנועה והמרחק שעברנו.',
detail: 'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש. בהליכה אפשר להעריך את המרחק באמצעות ספירת צעדים כפולים, לפי מדידה אישית. שגיאות בכיוון ובספירה מצטברות לאורך הדרך, ולכן בודקים את המיקום בעזרת סימני שטח בכל הזדמנות. השלמת הספירה אינה כשלעצמה אישור להגעה ליעד.',
whenToUse: ['כשקשה לזהות סימני שטח בגלל ראות מוגבלת.', 'כשיש מעט סימנים מובחנים לאורך קטע מהמסלול.', 'כשנקודת המוצא ידועה וניתן לעקוב אחר הכיוון והמרחק.'],
example: 'בהמחשה, היעד נמצא באזימוט 62° ובמרחק 1.2 ק״מ. בהנחה של 1.5 מטר לצעד כפול, מתקבל אומדן של 800 צעדים כפולים. התרשים מציג תנועה ללא סטייה; בשטח נדרש לאמת את המיקום גם לאחר השלמת הספירה.',
 },
];

// English shown only where the lesson relies on the term itself (the recap and
// the quiz both use "Dead Reckoning"); it sits inline beside the Hebrew name.
const INLINE_TERM: ReadonlySet<Method> = new Set<Method>(['dead']);

// — Per-technique supporting content: the lab's caption and legend (technique 1), the explanation board (technique 2) —
// `kind` picks the legend glyph, which mirrors the diagram mark 1:1.
type LegendItem = { kind: GlyphKind; label: string };
type SupportData = { badge: string; caption: string; legend: LegendItem[] };

const SUPPORT: Record<Method, SupportData> = {
handrail: {
badge: 'מסימן לסימן בשטח',
caption: 'המסלול עובר בשלוש כיפות ומסתיים בכיכר הכפר. בכל נקודה משווים את הסימנים בשטח למפה לפני שממשיכים.',
legend: [
 { kind: 'hill', label: 'כיפה — צורת קרקע בולטת (תבליט)' },
 { kind: 'village', label: 'כפר — מבנים על הקרקע (תכסית)' },
 { kind: 'route', label: 'הציר — מסימן לסימן' },
 { kind: 'checkpoint', label: 'נקודה לבדיקת המיקום' },
 { kind: 'start', label: 'נקודת מוצא (A)' },
 { kind: 'target', label: 'היעד — הכיכר המרכזית בכפר (B)' },
],
},
dead: {
badge: 'סופת חול · ראות מוגבלת',
caption: 'הדגמה של תנועה לפי אזימוט ומרחק בתנאי ראות מוגבלת. החישוב מניח 1.5 מטר לצעד כפול ואינו מציג שגיאות כיוון או ספירה.',
legend: [
 { kind: 'bearing', label: 'אזימוט — כיוון מצפן קבוע (62°)' },
 { kind: 'distance', label: 'מרחק — 1.2 ק״מ, כ־800 צעדים כפולים' },
 { kind: 'unit', label: 'מנווט — מצפן וספירת צעדים' },
 { kind: 'storm', label: 'סופת חול — ראות מוגבלת' },
 { kind: 'start', label: 'נקודת מוצא (A)' },
 { kind: 'target', label: 'נקודת יעד (B)' },
],
},
};

/** Props every board diagram receives. */
type VisualProps = {
  /** Start the demo (board has entered the viewport). */
  play: boolean;
  /** Bumped by the replay control to run the demo again. */
  run: number;
  /** Accessible description of the diagram (the board caption). */
  label: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Laptop fit — the part's three learning screens (the opening, technique 1,
// technique 2 with the closing principles) are each their own
// LessonViewportFit, shrunk uniformly like a slide so a laptop shows the same
// view as the 1920 × 1080 reference.
// ─────────────────────────────────────────────────────────────────────────────

/** Content width of the section at the reference viewport (max-w-6xl minus lg:px-8). */
const SCREEN_REFERENCE_WIDTH = 1088;
/**
 * The part scrolls through several screens, so the automatic reserves (which
 * count everything below a wrapper) don't apply: a screen in view sits under
 * the fixed 80px site header with the section's 24px top gap, plus 24px of air
 * below it.
 */
const SCREEN_RESERVE_TOP = 104;
const SCREEN_RESERVE_BOTTOM = 24;
/**
 * Every screen fits against the height the 1920 × 1080 viewport leaves for it
 * rather than its own height: scale 1 at 1080px tall, and the same scale on
 * every screen of the part, so the type keeps one size from screen to screen.
 * Technique 1 (the lab, ~1410px) is taller than this budget, as it is at the
 * reference; a laptop shows the same part of it and the rest scrolls.
 */
const SCREEN_REFERENCE_HEIGHT = 1080 - SCREEN_RESERVE_TOP - SCREEN_RESERVE_BOTTOM;

function ScreenFit({ className, children }: { className?: string; children: ReactNode }) {
return (
 <LessonViewportFit
referenceWidth={SCREEN_REFERENCE_WIDTH}
referenceHeight={SCREEN_REFERENCE_HEIGHT}
reserveTop={SCREEN_RESERVE_TOP}
reserveBottom={SCREEN_RESERVE_BOTTOM}
className={className}
 >
 {children}
 </LessonViewportFit>
);
}

export function CombatNavScene() {
const reduce = !!useReducedMotion();
// Quiet anchors to the two parts of the page — both stay in the scroll; nothing is hidden.
// The scroll target is the part's screen wrapper: it is never transformed, so its
// scroll margin keeps the part clear of the site header at every fit scale.
const scrollToPart = (id: string) => {
const part = document.getElementById(id);
(part?.closest<HTMLElement>('[data-lesson-viewport-fit]') ?? part)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
};
return (
 <section id="scene-combat" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <ScreenFit>
 <SceneHeader
step="03.3"
eyebrow="טכניקות ניווט"
title="התאמת הניווט לתנאי השטח"
intro="סימני השטח, הראות והמשימה משפיעים על אופן הניווט ועל קצב התנועה. נבחן ניווט לפי טופוגרפיה וניווט לפי כיוון ומרחק. כל שיטה מוצגת בהמשך עם הסבר והמחשה."
 />

 {/* Two terms the techniques rely on — this sub-topic comes before azimuth and route
     planning are taught, so they are introduced briefly here (plain info text, no cards,
     the same opening as the principles and planning sub-topics). */}
 <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-10">
 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 אזימוט <span className="text-fg-muted font-medium text-base sm:text-lg">(Azimuth)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 זווית הנמדדת במעלות <strong className="text-fg">מכיוון הצפון, עם כיוון השעון</strong>, ומתארת את כיוון התנועה. בחלק זה האזימוט ניתן כנתון מוכן. את מדידתו ואת הערכת המרחק בספירת צעדים כפולים (זוגות צעדים) נתרגל בהמשך השיעור.
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 קטע דרך
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 חלק מהמסלול בין שתי נקודות מזוהות. בסוף כל קטע דרך נמצאת <strong className="text-fg">נקודה לבדיקת המיקום</strong>: בודקים בה את המיקום לפני שממשיכים לקטע הדרך הבא.
 </p>
 </div>
 </div>

 <nav aria-label="חלקי תת־הנושא" className="-mt-4 mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-black">
 <span>בחלק זה:</span>
 {METHODS.map((m, i) => (
 <Fragment key={m.id}>
 {i > 0 && <span aria-hidden className="text-fg-dim">·</span>}
 <button
type="button"
onClick={() => scrollToPart(`combatnav-${m.id}`)}
className="rounded font-display font-semibold underline decoration-border-strong decoration-2 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
 >
 {m.label}
 {INLINE_TERM.has(m.id) && ` (${m.english})`}
 </button>
 </Fragment>
 ))}
 </nav>
 </ScreenFit>

 <ScreenFit className="scroll-mt-24">
 <TerrainSection data={METHODS[0]} support={SUPPORT.handrail} onContinue={() => scrollToPart('combatnav-dead')} />
 </ScreenFit>

 {/* Technique 2 and the closing principles share one screen, as at the reference. */}
 <ScreenFit className="mt-12 scroll-mt-24">
 <DeadReckoningSection data={METHODS[1]} support={SUPPORT.dead} />
 <ConclusionCard />
 </ScreenFit>
 </section>
 );
}

/** The technique's copy in three tiers: sub-heading → body / list (Table 2 of checking-design-fidelity). */
function SubHeading({ children }: { children: React.ReactNode }) {
return <div className="text-base font-display font-bold text-black mb-1.5">{children}</div>;
}

function WhenToUse({ items }: { items: string[] }) {
return (
 <ul className="list-disc ps-5 space-y-1.5 text-base marker:text-fg-dim">
 {items.map((u) => (
 <li key={u} className="leading-relaxed text-black">
 {u}
 </li>
 ))}
 </ul>
);
}

/* ═══ Technique 1 — ניווט לפי השטח ═════════════════════════════════════
   The principle in a visible paragraph above the lab; the lab itself — a
   live terrain model and the topographic map drawn from the same data, with
   learn and practice modes (terrain-nav/TerrainAssociationActivity); when to
   use the method and the example in cards after it. */
function TerrainSection({ data, support, onContinue }: { data: MethodData; support: SupportData; onContinue: () => void }) {
return (
 <section id={`combatnav-${data.id}`} aria-labelledby={`combatnav-${data.id}-title`} className="scroll-mt-24">
 <h3 id={`combatnav-${data.id}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
 {data.label}
 </h3>
 <div className="mt-4 max-w-4xl">
 <SubHeading>עקרון הפעולה</SubHeading>
 <p className="text-base leading-relaxed text-black">{data.detail}</p>
 </div>

 <div className="mt-6">
 <TerrainAssociationActivity copy={{ badge: support.badge, caption: support.caption, legend: support.legend }} onContinue={onContinue} />
 </div>

 <div className="mt-6 grid gap-6 md:grid-cols-2">
 <div className="surface p-5 sm:p-6">
 <SubHeading>מתי משתמשים בשיטה</SubHeading>
 <WhenToUse items={data.whenToUse} />
 </div>
 {/* "דוגמה" label removed (2026-09-28 user decision, same as PrinciplesScene) — the scenario reads as an example on its own */}
 <div className="surface p-5 sm:p-6">
 <p className="text-base leading-relaxed text-black">{data.example}</p>
 </div>
 </div>
 </section>
);
}

/* ═══ Technique 2 — ניווט עיוור ═══════════════════════════════════════
   The approved text and the existing demonstration board, unchanged except
   that the text is no longer folded into an accordion.
   Integration point: when a dead-reckoning alternative is chosen
   (design/mockups/dead-reckoning-concepts-2026-10-12), its separate
   DeadReckoningActivity replaces the board below; the text stays. */
function DeadReckoningSection({ data, support }: { data: MethodData; support: SupportData }) {
const [run, setRun] = useState(0);
const boardRef = useRef<HTMLDivElement>(null);
// The demo waits until the learner can actually see the board, then plays
// once (the replay control re-runs it).
const boardSeen = useInView(boardRef, { once: true, amount: 0.3 });
return (
 <section id={`combatnav-${data.id}`} aria-labelledby={`combatnav-${data.id}-title`} className="scroll-mt-24">
 <h3 id={`combatnav-${data.id}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
 {data.label}
 {INLINE_TERM.has(data.id) && (
 <>
 {' '}
 <span className="text-xl font-medium text-fg-muted sm:text-2xl">({data.english})</span>
 </>
 )}
 </h3>

 {/* Text column 1fr (reads at ~50 chars/line) · board 1.35fr. */}
 <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start">
 <div className="surface p-5 sm:p-6 space-y-5">
 <div>
 <SubHeading>עקרון הפעולה</SubHeading>
 <p className="text-base leading-relaxed text-black">{data.detail}</p>
 </div>
 <div>
 <SubHeading>מתי משתמשים בשיטה</SubHeading>
 <WhenToUse items={data.whenToUse} />
 </div>
 {/* "דוגמה" label removed (2026-09-28 user decision, same as PrinciplesScene) — the scenario reads as an example on its own */}
 <p className="text-base leading-relaxed text-black">{data.example}</p>
 </div>

 {/* Explanation board — second child → LEFT in RTL. A clean elevated surface
     holding the header, diagram and legend; sticky below the fixed site
     header (h-20) and capped to the viewport on desktop — the cap frozen at
     its 1080px-tall result (100vh − 7rem), as the screen is laptop-fitted. */}
 <div className="lg:sticky lg:top-24 self-start">
 <div
ref={boardRef}
role="group"
aria-label={`הסבר חזותי · ${data.label}`}
className="surface-elevated overflow-hidden flex flex-col lg:max-h-[968px]"
 >
 <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-2">
 <div className="min-w-0">
 <div className="text-base font-display font-bold text-fg leading-tight">הסבר חזותי</div>
 <div className="mt-0.5 text-sm text-fg-muted truncate">
 {data.label}
 {INLINE_TERM.has(data.id) && (
 <>
 {' '}
 <span className="font-medium">({data.english})</span>
 </>
 )}
 </div>
 </div>
 <span className="text-sm font-display font-semibold text-fg-muted shrink-0">טכניקה 2</span>
 </div>

 <div className="shrink-0 flex items-center justify-between gap-3 px-5">
 <span className="text-sm font-display font-semibold text-fg-muted">{support.badge}</span>
 <button
type="button"
onClick={() => setRun((r) => r + 1)}
aria-label="הפעלה חוזרת של ההדגמה"
className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 hover:bg-brand/[0.03] transition-colors inline-flex items-center justify-center"
 >
 <Icon name="refresh" size={15} />
 </button>
 </div>

 <div className="relative w-full aspect-[4/3] min-h-[230px] lg:min-h-0 shrink">
 <div className="absolute inset-0 px-2">
 <DeadReckoningVisual play={boardSeen} run={run} label={support.caption} />
 </div>
 </div>

 <div className="shrink-0 px-5 pb-5 pt-2 space-y-4">
 <p className="text-sm text-fg-muted leading-relaxed">{support.caption}</p>
 {/* "מקרא" heading removed (2026-09-28 user decision, pattern 4) — the swatch list reads as a legend on its own, like every other legend in lessons 2 & 6 */}
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
 {support.legend.map((it) => (
 <li key={it.label} className="flex items-center gap-2 text-[13px] text-fg-muted leading-snug">
 <LegendGlyph kind={it.kind} />
 <span>{it.label}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 </div>
 </section>
);
}

/* ═══ Technique 2 — ניווט עיוור ═══════════════════════════════════════
   Dead reckoning: nothing to lean on in the storm — only the pre-computed
   azimuth (62°) and distance (1.2 km = 800 pace pairs).
   Demo: the compass bearing is set (0° → 62°), the planned line appears,
   then the force walks it inside a tiny circle of visibility while the
   pace count ticks to 800 — and only then is B revealed. */
const DR_A: Pt = { x: 16, y: 58 };
const DR_RAD = (62 * Math.PI) / 180;
const DR_LEN = 76;
const DR_DIR: Pt = { x: Math.sin(DR_RAD), y: -Math.cos(DR_RAD) };
const DR_B: Pt = { x: DR_A.x + DR_DIR.x * DR_LEN, y: DR_A.y + DR_DIR.y * DR_LEN };
const DR_NORMAL: Pt = { x: -DR_DIR.y, y: DR_DIR.x };
const DR_C: Pt = { x: 25, y: 20 }; // compass centre
const DR_R = 8.2;
const DR_WALK = [1.8, 7.4] as const;
const DR_T = 8.6;
const DR_PAIRS = 800;
// A tick every 100 pace pairs along the bearing (the 800th is B itself).
const DR_TICKS = [1, 2, 3, 4, 5, 6, 7].map((k) => k / 8);
const DR_TICK_TIMES = DR_TICKS.map((s) => DR_WALK[0] + s * (DR_WALK[1] - DR_WALK[0]));
const DR_BEARING = angleDeg(DR_A, DR_B);
// Wind-driven sand streaks sweeping across the slab [x1, y1, x2, y2].
const DR_STREAKS: [number, number, number, number][] = [
 [6, 14, 34, 10], [42, 9, 74, 5], [58, 22, 92, 17], [4, 32, 28, 28],
 [66, 36, 98, 31], [28, 50, 60, 45], [10, 44, 40, 40], [48, 60, 86, 55],
];
// Dune ripples: the ground is there — you just can't see it.
const DR_RIPPLES = [
 'M8 20 q 5 -2 10 0 t 10 0', 'M44 14 q 5 -2 10 0 t 10 0', 'M70 30 q 5 -2 10 0 t 10 0',
 'M12 40 q 5 -2 10 0 t 10 0', 'M40 30 q 5 -2 10 0 t 10 0', 'M30 58 q 5 -2 10 0 t 10 0',
 'M62 50 q 5 -2 10 0 t 10 0', 'M78 60 q 4 -1.6 8 0',
];

const polar = (deg: number, r: number): Pt => {
const a = (deg * Math.PI) / 180;
return { x: DR_C.x + Math.sin(a) * r, y: DR_C.y - Math.cos(a) * r };
};

function DeadReckoningVisual({ play, run, label }: VisualProps) {
const id = useSvgId('dr');
const { t, reduce } = useSequence(DR_T, play, run);
// 1 · set the bearing on the compass
const az = useTrack(t, [[0, 0], [0.25, 0], [1.25, 62]]);
const wedge = useTransform(az, (a) => {
const e = polar(a, 4.6);
return `M${DR_C.x} ${DR_C.y} L${DR_C.x} ${DR_C.y - 4.6} A4.6 4.6 0 0 1 ${e.x} ${e.y} Z`;
});
const shaftX = useTransform(az, (a) => polar(a, DR_R - 2.6).x);
const shaftY = useTransform(az, (a) => polar(a, DR_R - 2.6).y);
const head = useTransform(az, (a) => {
const tip = polar(a, DR_R - 0.9);
const l = polar(a - 11, DR_R - 3);
const r = polar(a + 11, DR_R - 3);
return `${tip.x},${tip.y} ${l.x},${l.y} ${r.x},${r.y}`;
});
// 2 · the planned line appears   3 · walk it, counting pace pairs
const plan = useTrack(t, [[0, 0], [0.9, 0], [1.6, 1]], linear);
const walked = useTrack(t, [[0, 0], [DR_WALK[0], 0], [DR_WALK[1], 1]], linear);
const walkedVis = useTransform(walked, (v) => (v > 0.002 ? 1 : 0));
const ux = useTransform(walked, (v) => DR_A.x + DR_DIR.x * DR_LEN * v);
const uy = useTransform(walked, (v) => DR_A.y + DR_DIR.y * DR_LEN * v);
const ticks = useStep(t, DR_TICK_TIMES);
// 4 · only on arrival does B come out of the storm
const reveal = useTrack(t, [[0, 0], [DR_WALK[1], 0], [DR_WALK[1] + 0.8, 9]]);
const arrived = useStep(t, [DR_WALK[1]]) === 1;
const drift = useTrack(t, [[0, -3], [DR_T, 7]], linear);
return (
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
 <defs>
 <radialGradient id={`${id}-hole`}>
 <stop offset="0%" stopColor="#000" />
 <stop offset="55%" stopColor="#000" />
 <stop offset="100%" stopColor="#fff" />
 </radialGradient>
 <mask id={`${id}-vis`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="75">
 <rect x="0" y="0" width="100" height="75" fill="#fff" />
 <motion.circle cx={ux} cy={uy} r={7} fill={`url(#${id}-hole)`} />
 <motion.circle cx={DR_B.x} cy={DR_B.y} r={reveal} fill={`url(#${id}-hole)`} />
 </mask>
 </defs>

 <PaperTile>
 {/* Featureless dunes — present, but not visible in the storm */}
 <g fill="none" stroke={PAPER.rim} strokeWidth="0.45" strokeLinecap="round">
 {DR_RIPPLES.map((d, i) => (
 <path key={i} d={d} />
 ))}
 </g>
 {/* End (B) — hidden in the storm until the count is complete */}
 <TargetMark {...DR_B} pulse={arrived && !reduce} />
 <text x={DR_B.x + 4.6} y={DR_B.y - 2.8} textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.2" {...HALO}>B</text>
 {/* Sandstorm veil — only a small circle around the force stays clear */}
 <g mask={`url(#${id}-vis)`}>
 <rect x="0" y="0" width="100" height="75" className="fill-tanline-contour" fillOpacity={0.78} />
 <motion.g style={{ x: drift }} stroke="#ffffff" strokeOpacity={0.5} strokeWidth="1.3" strokeLinecap="round">
 {DR_STREAKS.map(([x1, y1, x2, y2], i) => (
 <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
 ))}
 </motion.g>
 </g>
 </PaperTile>

 {/* Compass — the instrument the whole move depends on. The needle keeps
     pointing north; the orange index is set to the bearing. */}
 <g>
 <circle cx={DR_C.x + 0.5} cy={DR_C.y + 0.9} r={DR_R + 0.3} className="fill-fg" fillOpacity={0.18} />
 <circle cx={DR_C.x} cy={DR_C.y} r={DR_R} className="fill-paper-bright" stroke={PAPER.rim} strokeWidth="0.6" />
 {Array.from({ length: 12 }).map((_, i) => {
const a = polar(i * 30, DR_R - 0.5);
const b = polar(i * 30, DR_R - (i % 3 === 0 ? 2 : 1.3));
return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PAPER.rim} strokeWidth="0.35" strokeLinecap="round" />;
 })}
 <polygon points={`${DR_C.x},${DR_C.y - DR_R + 0.6} ${DR_C.x - 1},${DR_C.y - DR_R + 2.5} ${DR_C.x + 1},${DR_C.y - DR_R + 2.5}`} className="fill-fg" />
 <motion.path d={wedge} className="fill-accent stroke-accent" fillOpacity={0.18} strokeWidth="0.3" />
 <polygon points={`${DR_C.x},${DR_C.y - 5.2} ${DR_C.x - 0.8},${DR_C.y} ${DR_C.x + 0.8},${DR_C.y}`} className="fill-fg-muted" />
 <polygon points={`${DR_C.x},${DR_C.y + 5.2} ${DR_C.x - 0.8},${DR_C.y} ${DR_C.x + 0.8},${DR_C.y}`} fill={PAPER.rim} />
 <motion.line x1={DR_C.x} y1={DR_C.y} x2={shaftX} y2={shaftY} className="stroke-accent" strokeWidth="0.8" strokeLinecap="round" />
 <motion.polygon points={head} className="fill-accent" />
 <circle cx={DR_C.x} cy={DR_C.y} r="0.8" className="fill-fg" />
 </g>
 <text x={DR_C.x} y={DR_C.y + DR_R + 5} textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.1" {...HALO}>אזימוט 62°</text>

 {/* Planned bearing A→B — the thread the navigator trusts — with a tick
     every 100 pace pairs that lights up as it's counted */}
 <motion.g style={{ opacity: plan }}>
 <line x1={DR_A.x} y1={DR_A.y} x2={DR_B.x} y2={DR_B.y} className="stroke-accent" strokeWidth="0.7" strokeDasharray="2 1.3" strokeLinecap="round" />
 {DR_TICKS.map((s, i) => {
const p = lerpPt(DR_A, DR_B, s);
const h = i === 3 ? 1.8 : 1.2;
return (
 <line key={i} x1={p.x - DR_NORMAL.x * h} y1={p.y - DR_NORMAL.y * h} x2={p.x + DR_NORMAL.x * h} y2={p.y + DR_NORMAL.y * h}
className={ticks > i ? 'stroke-accent' : 'stroke-fg-dim'} strokeWidth={i === 3 ? 0.6 : 0.45} strokeLinecap="round" />
 );
 })}
 {[0.31, 0.69].map((s) => (
 <Chevron key={s} at={lerpPt(DR_A, DR_B, s)} rot={DR_BEARING} />
 ))}
 </motion.g>
 <motion.path d={`M${DR_A.x} ${DR_A.y} L${DR_B.x} ${DR_B.y}`} fill="none" className="stroke-accent" strokeWidth="1" strokeLinecap="round" style={{ pathLength: walked, opacity: walkedVis }} />

 {/* Start (A) */}
 <StartDot {...DR_A} />
 <text x={DR_A.x} y={DR_A.y + 6} textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3.2" {...HALO}>A</text>

 {/* The navigator */}
 <UnitPuck x={ux} y={uy} />

 {/* The two pre-computed numbers + the live pace count */}
 <g>
 <rect x="58.5" y="44.3" width="34" height="19.5" rx="1.8" className="fill-fg" fillOpacity={0.14} />
 <rect x="58" y="43.5" width="34" height="19.5" rx="1.8" className="fill-paper-bright stroke-tanline" strokeWidth="0.3" />
 <text x="75" y="49" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8">מרחק: 1.2 ק״מ</text>
 <text x="75" y="53.4" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8">כ־800 צעדים כפולים</text>
 <line x1="61.5" y1="55.5" x2="88.5" y2="55.5" className="stroke-border-subtle" strokeWidth="0.3" />
 <PaceCount walked={walked} />
 </g>
 </svg>
 );
}

/** Live pace-pair counter, "000 / 800" (digits only, isolated LTR). */
function PaceCount({ walked }: { walked: MotionValue<number> }) {
const [n, setN] = useState(() => Math.round(walked.get() * DR_PAIRS));
useMotionValueEvent(walked, 'change', (v) => {
const k = Math.round(v * DR_PAIRS);
setN((p) => (p === k ? p : k));
});
return (
 <text x="75" y="60.9" textAnchor="middle" direction="ltr" unicodeBidi="isolate" className="font-display font-bold tabular-nums" aria-hidden>
 <tspan className="fill-accent" fontSize="4.2">{String(n).padStart(3, '0')}</tspan>
 <tspan className="fill-fg-dim" fontSize="2.8" dx="0.8">/ {DR_PAIRS}</tspan>
 </text>
 );
}

function ConclusionCard() {
return (
 <div className="mt-6 surface p-5 sm:p-6">
 <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">
 עקרונות לבחירת שיטת הניווט
 </div>
 <p className="text-base text-fg leading-relaxed text-pretty">
בחירת השיטה תלויה בסימנים הזמינים, בראות ובתנאי התנועה. משלבים זיהוי שטח עם מדידת כיוון והערכת מרחק, ומתאימים את הקצב כך שניתן יהיה לבדוק את המיקום לאורך הדרך. כשמשתנים התנאים, בוחנים מחדש את השיטה ואת הקצב. </p>
 </div>
 );
}
