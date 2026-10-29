'use client';
import { Fragment, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import type { IconName } from '@/components/Icon';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import type { GlyphKind } from './CombatNavVisuals';
import { TerrainAssociationActivity } from './terrain-nav/TerrainAssociationActivity';
import { DeadReckoningActivity, type DeadReckoningCopy } from './dead-reckoning/DeadReckoningActivity';
type Method = 'handrail' | 'dead';
type MethodData = {
id: Method;
label: string;
english: string;
icon: IconName;
oneLiner: string;
/** The principle, ending with when the method fits (one sentence). */
detail: string;
};
const METHODS: MethodData[] = [
 {
id: 'handrail',
label: 'ניווט לפי השטח',
english: 'Terrain Association',
icon: 'route' as never, // Not used
oneLiner: 'מתקדמים בעזרת סימנים מזוהים בשטח ומשווים אותם למפה לאורך הדרך.',
detail: 'בוחרים סימנים שאפשר לזהות במפה ובשטח: תבליט (כמו כיפה או ערוץ) ותכסית (כמו כפר או חורשה), ובודקים את המיקום ביחס אליהם, יחד עם כיוון ומרחק. תוואי רציף לאורך המסלול, כמו דרך או ערוץ, יכול לשמש ״מעקה״. השיטה מתאימה כשיש סימנים בולטים לאורך הדרך והראות מאפשרת להשוות אותם למפה.',
 },
 {
id: 'dead',
label: 'ניווט עיוור',
english: 'Dead Reckoning',
icon: 'compass',
oneLiner: 'מעריכים את המיקום מתוך נקודת מוצא ידועה, כיוון התנועה והמרחק שעברנו.',
// No count here: step 1 of the activity asks for it (task 28); what the finished count proves is step 3's answer.
detail: 'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש. את המרחק מעריכים בספירת צעדים כפולים, לפי מדידה אישית. שגיאות בכיוון ובספירה מצטברות, ולכן בודקים את המיקום מול סימני שטח בכל הזדמנות. השיטה מתאימה כשהראות מוגבלת או שיש מעט סימנים מובחנים, ובתנאי שנקודת המוצא ידועה.',
 },
];

// English shown only where the lesson relies on the term itself (the recap and
// the quiz both use "Dead Reckoning"); it sits inline beside the Hebrew name.
const INLINE_TERM: ReadonlySet<Method> = new Set<Method>(['dead']);

// — Per-technique supporting content: the lab's caption and legend (technique 1), the sandstorm's board copy (technique 2) —
// `kind` picks the legend glyph, which mirrors the diagram mark 1:1.
type LegendItem = { kind: GlyphKind; label: string };
type SupportData = { badge?: string; caption: string; legend: LegendItem[] };

const SUPPORT: Record<'handrail', SupportData> = {
handrail: {
caption: 'הציר עובר בשלוש כיפות ומסתיים בכיכר המרכזית בכפר (B).',
legend: [
 { kind: 'hill', label: 'כיפה — צורת קרקע בולטת (תבליט)' },
 { kind: 'village', label: 'כפר — מבנים על הקרקע (תכסית)' },
 { kind: 'route', label: 'הציר — מסימן לסימן' },
 { kind: 'checkpoint', label: 'נקודה לבדיקת המיקום' },
 { kind: 'start', label: 'נקודת מוצא (A)' },
 { kind: 'target', label: 'היעד — הכיכר המרכזית בכפר (B)' },
],
},
};

/**
 * Technique 2 in a sandstorm (dead-reckoning/DeadReckoningActivity): the conditions chip, and the principle
 * (METHODS.dead.detail), which closes the task once its last decision is made — shown earlier, it would
 * answer the activity's own questions (the count, what the finished count proves).
 */
const DEAD_COPY: Omit<DeadReckoningCopy, 'principle'> = { badge: 'סופת חול · ראות כ־30 מ׳' };

// ─────────────────────────────────────────────────────────────────────────────
// Laptop fit — the part's three learning screens (the opening, technique 1,
// technique 2 with the closing principles) are each their own
// LessonViewportFit, shrunk uniformly like a slide so a laptop shows the same
// view as the 1920 × 1080 reference.
// ─────────────────────────────────────────────────────────────────────────────

/** Content width of the section at the reference viewport (max-w-lesson minus lg:px-8). */
const SCREEN_REFERENCE_WIDTH = 1344;
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
 * Technique 1 (the lab, ~1340px) is taller than this budget, as it is at the
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
 <section id="scene-combat" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
 <ScreenFit>
 <SceneHeader
step="03.3"
eyebrow="טכניקות ניווט"
title="התאמת הניווט לתנאי השטח"
intro="הסימנים הזמינים והראות קובעים איך מנווטים: לפי השטח או לפי כיוון ומרחק בלבד."
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
 זווית הנמדדת במעלות <strong className="text-fg">מכיוון הצפון, עם כיוון השעון</strong>, ומתארת את כיוון התנועה. כאן הוא ניתן כנתון מוכן.
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 קטע דרך
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 חלק מהמסלול בין שתי נקודות מזוהות. בסופו נמצאת <strong className="text-fg">נקודה לבדיקת המיקום</strong>, ושם מוודאים היכן אתם לפני שממשיכים.
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
 <DeadReckoningSection data={METHODS[1]} />
 <ConclusionCard />
 </ScreenFit>
 </section>
 );
}

/** The technique's copy in three tiers: sub-heading → body / list (Table 2 of checking-design-fidelity). */
function SubHeading({ children }: { children: React.ReactNode }) {
return <div className="text-base font-display font-bold text-black mb-1.5">{children}</div>;
}

/* ═══ Technique 1 — ניווט לפי השטח ═════════════════════════════════════
   One card: the title and the principle (ending with when the method fits)
   head it; the lab itself — a live terrain model and the topographic map
   drawn from the same data, with learn and practice modes
   (terrain-nav/TerrainAssociationActivity). The lab's caption already says
   what the route passes, so there is no walk-through below it. */
function TerrainSection({ data, support, onContinue }: { data: MethodData; support: SupportData; onContinue: () => void }) {
return (
 <section id={`combatnav-${data.id}`} aria-labelledby={`combatnav-${data.id}-title`} className="scroll-mt-24">
 <TerrainAssociationActivity
 copy={{ badge: support.badge, caption: support.caption, legend: support.legend }}
 onContinue={onContinue}
 // The title sits beside the lab's mode switch, the principle under it — the views beside the task column, one screen.
 title={
 <h3 id={`combatnav-${data.id}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
 {data.label}
 </h3>
 }
 intro={
 <div>
 <SubHeading>עקרון הפעולה</SubHeading>
 <p className="text-base leading-relaxed text-black">{data.detail}</p>
 </div>
 }
 />
 </section>
);
}

/* ═══ Technique 2 — ניווט עיוור ═══════════════════════════════════════
   One card (dead-reckoning/DeadReckoningActivity): the title, the one-line
   description and the conditions chip head it, beside the task's progress;
   the navigator's own view inside the sandstorm fills it, with the planning
   map on demand, the compass and the pace counter under it. The task —
   prepare the count and the compass, walk the leg in 100-pair segments past
   one landmark, decide what the finished count proves — teaches the
   principle, which closes the card at the end. */
function DeadReckoningSection({ data }: { data: MethodData }) {
return (
 <section id={`combatnav-${data.id}`} aria-labelledby={`combatnav-${data.id}-title`} className="scroll-mt-24">
 <DeadReckoningActivity
 copy={{ ...DEAD_COPY, principle: data.detail }}
 title={
 <h3 id={`combatnav-${data.id}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
 {data.label}
 {INLINE_TERM.has(data.id) && (
 <>
 {' '}
 <span className="text-xl font-medium text-fg-muted sm:text-2xl">({data.english})</span>
 </>
 )}
 </h3>
 }
 intro={<p className="text-lg leading-snug text-black">{data.oneLiner}</p>}
 />
 </section>
);
}

function ConclusionCard() {
return (
 <div className="mt-6 surface p-5 sm:p-6">
 <p className="text-base text-fg leading-relaxed text-pretty">
משלבים בין השיטות: זיהוי שטח לצד כיוון ומרחק, ומתקדמים בקצב שמאפשר לבדוק את המיקום בדרך. <strong className="text-fg">כשהתנאים משתנים, בוחנים מחדש את השיטה ואת הקצב.</strong>
 </p>
 </div>
 );
}
