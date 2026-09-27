'use client';
import { useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  easeInOut,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import {
  HALO,
  PAPER,
  Checkpoint,
  Chevron,
  ContourTexture,
  LegendGlyph,
  PaperBush,
  PaperHill,
  PaperHouse,
  PaperPine,
  PaperRock,
  PaperTile,
  StartDot,
  TargetMark,
  TrackedPuck,
  UnitPuck,
  angleDeg,
  dist,
  lerpPt,
  linear,
  useSequence,
  useStep,
  useSvgId,
  useTrack,
  type Ease,
  type GlyphKind,
  type Key,
  type Pt,
} from './CombatNavVisuals';
type Method = 'handrail' | 'dead' | 'pace';
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
label: 'ניווט לפי טופוגרפיה',
english: 'Terrain Association · Handrailing',
icon: 'route' as never, // Not used
oneLiner: 'מתקדמים מסימן בולט אחד בשטח לסימן הבא, כמו יד שעוברת לאורך מעקה.',
detail: 'בשיטה הזו לא הולכים "על המצפן", אלא קוראים את השטח. בוחרים מראש במפה שרשרת של סימנים שקל לזהות בשטח, ומתקדמים מאחד לשני. הסימנים האלה הם תבליט – צורות הקרקע עצמה, כמו כיפה, רכס או ערוץ – ותכסית – מה שנמצא על הקרקע, כמו כפר, כביש או חורשה. ממש כמו שמעקה במדרגות מוביל את היד מצעד לצעד, שרשרת הסימנים "מובילה" אותנו לאורך הציר, ובכל סימן אפשר לוודא שאנחנו במקום הנכון.',
whenToUse: ['כשיש בשטח צורות קרקע בולטות – כיפות, רכסים, ערוצים – שקל לזהות גם במפה וגם בעין.', 'כשיש בדרך תכסית ברורה – כפר, כביש, חורשה – שיכולה לשמש נקודת אימות.', 'כשהראות מאפשרת להשוות כל הזמן בין המפה לשטח.'],
example: 'כוח צריך להגיע לכיכר המרכזית של כפר. במקום ללכת על אזימוט אחד ארוך, הציר שלו בנוי מסימנים: עוברים את הכיפה הראשונה, ממשיכים לשנייה ואז לשלישית – שלוש כיפות שבולטות גם במפה וגם בשטח (תבליט). מהכיפה השלישית כבר רואים את בתי הכפר, נכנסים אליו ומגיעים לכיכר המרכזית (תכסית). בכל כיפה הנווט יודע בדיוק איפה הוא, ולכן קשה מאוד ללכת לאיבוד.',
 },
 {
id: 'dead',
label: 'ניווט עיוור',
english: 'Dead Reckoning',
icon: 'compass',
oneLiner: 'לא רואים כלום ואין במה להיאחז – מחשבים מראש מרחק ואזימוט, והולכים לפיהם בלבד.',
detail: 'יש מצבים שבהם אי אפשר לקרוא את השטח: לא רואים כלום, או שאין בשטח שום סימן להיאחז בו. אז עוברים לניווט עיוור. לפני התנועה מחשבים במפה שני נתונים: האזימוט – הכיוון המדויק ליעד במעלות – והמרחק – כמה מטרים צריך לעבור. את המרחק מתרגמים למספר זוגות צעדים. בשטח הולכים על האזימוט במצפן וסופרים צעדים, עד שהספירה מגיעה למספר שחושב. השיטה דורשת משמעת ברזל – להמשיך לסמוך על המצפן ועל הספירה, גם כשתחושת הבטן אומרת שאתם הולכים לא נכון.',
whenToUse: ['בסופת חול, בערפל כבד או בחושך מוחלט, כשהראות יורדת לאפס.', 'בשטח שבו הכול נראה אותו דבר, כמו דיונות חול ענקיות.', 'בשטח מישורי וריק – מדבר פתוח או ימת מלח – שאין בו תבליט ולא תכסית להיאחז בהם.'],
example: 'כוח שמנווט במדבר נקלע לסופת חול, ואי אפשר לראות מטר קדימה. הנווט כבר חישב במפה: היעד נמצא באזימוט 62°, במרחק 1.2 קילומטרים. אורך זוג הצעדים שלו הוא 1.5 מטרים, כלומר 800 זוגות צעדים. הלוחמים מכוונים את המצפן ל־62°, צועדים וסופרים 800 זוגות צעדים – ומגיעים ליעד בלי שראו אותו לאורך כל הדרך.',
 },
 {
id: 'pace',
label: 'שליטה בקצב',
english: 'Pace & Path Control',
icon: 'spark',
oneLiner: 'משנים את קצב ההליכה וצורת התנועה בהתאם לתנאי השטח והסכנה.',
detail: 'בניווט אי אפשר לשמור על קצב הליכה אחיד. באזור פתוח שבו קל מאוד להתגלות, ההתקדמות תהיה איטית וזהירה – נעבור בריצות קצרות ("דילוגים") ממקום מסתור אחד לאחר (למשל, מסלע לשיח). לעומת זאת, כשאנחנו באזור שמעניק לנו הסתרה טבעית (כמו יער צפוף או ערוץ נחל עמוק), ננצל את ההזדמנות ונתקדם בתנועה רציפה ומהירה כדי לחסוך זמן.',
whenToUse: ['כשחוצים אזור פתוח וחשוף – מתקדמים לאט ובקפיצות ממחסה למחסה.', 'בתנועה באזור מוסתר – מתקדמים מהר, ברצף, אחד אחרי השני (בטור).', 'בכל מעבר בין סוגי שטח שונים – נדרשת ערנות כדי לשנות את קצב ההליכה מיד.'],
example: 'קבוצה צריכה לחצות שדה פתוח בלילה. הם יתקדמו לאט מאוד, כשחלקם עוצרים בכל פעם עם נשק מוכן כדי לשמור ולהגן ("לחפות") על אלו שמתקדמים קדימה. ברגע שהם יסיימו לחצות את השדה וייכנסו ליער סבוך שמסתיר אותם, כולם יסתדרו מיד בשורה ארוכה (טור) ויעברו להליכה מהירה ורצופה.',
 },
];

// English shown only where the lesson relies on the term itself (the recap and
// the quiz both use "Dead Reckoning"); it sits inline beside the Hebrew name.
const INLINE_TERM: ReadonlySet<Method> = new Set<Method>(['dead']);

// — Per-technique supporting content for the left "explanation board" —
// `kind` picks the legend glyph, which mirrors the diagram mark 1:1.
type LegendItem = { kind: GlyphKind; label: string };
type SupportData = { badge: string; caption: string; legend: LegendItem[] };

const SUPPORT: Record<Method, SupportData> = {
handrail: {
badge: 'מסימן לסימן בשטח',
caption: 'התרשים מראה ציר שבנוי משרשרת סימנים בשטח: שלוש כיפות (תבליט) ואחריהן כפר עם כיכר מרכזית (תכסית). בכל סימן הנווט מוודא שהוא במקום הנכון וממשיך לסימן הבא.',
legend: [
 { kind: 'hill', label: 'כיפה — צורת קרקע בולטת (תבליט)' },
 { kind: 'village', label: 'כפר — מבנים על הקרקע (תכסית)' },
 { kind: 'route', label: 'הציר — מסימן לסימן' },
 { kind: 'checkpoint', label: 'נקודת אימות — "אני כאן"' },
 { kind: 'start', label: 'נקודת זינוק (A)' },
 { kind: 'target', label: 'היעד — הכיכר המרכזית בכפר (B)' },
],
},
dead: {
badge: 'סופת חול · ראות אפסית',
caption: 'התרשים ממחיש ניווט עיוור בתוך סופת חול: לפני התנועה מחשבים אזימוט ומרחק, ובדרך נשענים רק על המצפן ועל ספירת זוגות הצעדים.',
legend: [
 { kind: 'bearing', label: 'אזימוט — כיוון מצפן קבוע (62°)' },
 { kind: 'distance', label: 'מרחק — 1.2 ק״מ = 800 זוגות צעדים' },
 { kind: 'unit', label: 'הלוחם — מנווט במצפן וספירת צעדים' },
 { kind: 'storm', label: 'סופת חול — ראות אפסית' },
 { kind: 'start', label: 'נקודת זינוק (A)' },
 { kind: 'target', label: 'נקודת יעד (B)' },
],
},
pace: {
badge: 'מתאימים קצב לסביבה',
caption: 'התרשים מראה כיצד מתאימים את קצב התנועה לשטח: לאט ובדילוגים בשטח פתוח, מהיר ורציף כשיש הסתרה טבעית.',
legend: [
 { kind: 'open', label: 'שטח פתוח — חשוף, קצב איטי ודילוגים' },
 { kind: 'forest', label: 'יער עבות — מוסתר, קצב מהיר ורציף' },
 { kind: 'unit', label: 'תנועת הכוח לאורך המסלול' },
],
},
};

/** Motion language (INTERACTION_DNA): snap ease, ~0.3s diagram swaps. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Props every board diagram receives. */
type VisualProps = {
  /** Start the demo (board has entered the viewport). */
  play: boolean;
  /** Bumped by the replay control to run the demo again. */
  run: number;
  /** Accessible description of the diagram (the board caption). */
  label: string;
};

export function CombatNavScene() {
const [active, setActive] = useState<Method>('handrail');
const [run, setRun] = useState(0);
const reduce = !!useReducedMotion();
const boardRef = useRef<HTMLDivElement>(null);
// The demo waits until the learner can actually see the board, then plays
// once per selection (replay control re-runs it).
const boardSeen = useInView(boardRef, { once: true, amount: 0.3 });
const activeIndex = METHODS.findIndex((m) => m.id === active);
const activeData = METHODS[activeIndex];
const support = SUPPORT[active];
const swap = {
  initial: reduce ? false : ({ opacity: 0, y: 8 } as const),
  animate: { opacity: 1, y: 0 },
  exit: reduce ? undefined : { opacity: 0, y: -6 },
  transition: { duration: 0.3, ease: EASE },
};
return (
 <section id="scene-combat" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.3"
eyebrow="טכניקות ניווט"
title="הדרך הארוכה היא הקצרה: איך מנווטים כשאי אפשר ללכת בקו ישר"
intro="ניווט בשטח עוין הוא לא עוד טיול בטבע. המטרה היא לא רק להגיע ליעד, אלא להגיע אליו בבטחה: להישאר מוסתרים, להימנע מסכנות בדרך, ולהתאים את ההליכה לתנאי השטח. הנה שלוש טכניקות ניווט מיוחדות למצבי קיצון שכל אחד יכול להבין."
 />

 {/* Text column 1fr (reads at ~50 chars/line) · board 1.35fr. */}
 <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start">
 {/* Accordion list — first child → RIGHT in RTL (text on right). One open at a time. */}
 <div className="space-y-3">
 {METHODS.map((m, i) => {
const isActive = active === m.id;
const btnId = `combatnav-btn-${m.id}`;
const panelId = `combatnav-panel-${m.id}`;
return (
 <div
key={m.id}
className={cn(
 'overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 ease-snap',
isActive
 ? 'border-brand/45'
 : 'border-border hover:border-brand/30 hover:bg-brand/[0.03]'
 )}
 >
 <button
type="button"
id={btnId}
onClick={() => setActive(m.id)}
aria-expanded={isActive}
aria-controls={isActive ? panelId : undefined}
className="w-full p-4 text-start flex items-center gap-3 rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
 >
 <span className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-bg-accent text-fg-muted">
 <span className="font-display font-bold text-sm">{i + 1}</span>
 </span>
 <div className="flex-1 min-w-0 text-start">
 <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">
 {m.label}
 {INLINE_TERM.has(m.id) && (
 <>
 {' '}
 <span className="text-base font-medium text-fg-muted">({m.english})</span>
 </>
 )}
 </div>
 </div>
 <motion.span
animate={{ rotate: isActive ? 180 : 0 }}
transition={{ duration: reduce ? 0 : 0.25 }}
className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
 >
 <svg
width="18"
height="18"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
 >
 <path d="m6 9 6 6 6-6" />
 </svg>
 </motion.span>
 </button>

 <AnimatePresence initial={false}>
 {isActive && (
 <motion.div
key={`panel-${m.id}`}
id={panelId}
role="region"
aria-labelledby={btnId}
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
className="overflow-hidden"
 >
 <div className="px-4 pb-5 pt-1 space-y-5">
 <div>
 <div className="text-base font-display font-bold text-fg mb-1.5">
 מה זה ולמה זה עובד
 </div>
 <p className="text-base leading-relaxed text-fg">{m.detail}</p>
 </div>

 <div>
 <div className="text-base font-display font-bold text-fg mb-1.5">
 מתי משתמשים בזה
 </div>
 <ul className="list-disc ps-5 space-y-1.5 text-base marker:text-fg-dim">
 {m.whenToUse.map((u) => (
 <li key={u} className="leading-relaxed text-fg">
 {u}
 </li>
 ))}
 </ul>
 </div>

 <div>
 <div className="text-base font-display font-bold text-fg mb-1.5">
 דוגמה
 </div>
 <p className="text-base leading-relaxed text-fg">{m.example}</p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>

 {/* Explanation board — second child → LEFT in RTL.
     The screen's one workspace: a clean elevated surface holding the
     header, diagram and legend (no background texture). Sticky below
     the fixed site header (h-20) and capped to the viewport on desktop,
     so the whole module stays in view while the long accordion is read;
     the diagram is the only part that flexes when height is short. */}
 <div className="lg:sticky lg:top-24 self-start">
 <div
ref={boardRef}
role="group"
aria-label={`הסבר חזותי · ${activeData.label}`}
className="surface-elevated overflow-hidden flex flex-col lg:max-h-[calc(100vh-7rem)]"
 >
 {/* Board header — updates with the active technique */}
 <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-2">
 <div className="min-w-0">
 <div className="text-base font-display font-bold text-fg leading-tight">הסבר חזותי</div>
 <div className="mt-0.5 text-sm text-fg-muted truncate">
 {activeData.label}
 {INLINE_TERM.has(active) && (
 <>
 {' '}
 <span className="font-medium">({activeData.english})</span>
 </>
 )}
 </div>
 </div>
 <span className="text-sm font-display font-semibold text-fg-muted shrink-0">טכניקה {activeIndex + 1}</span>
 </div>

 {/* Diagram toolbar — what this diagram shows · replay the demo */}
 <div className="shrink-0 flex items-center justify-between gap-3 px-5">
 <AnimatePresence mode="wait" initial={false}>
 <motion.span key={active} {...swap} className="text-sm font-display font-semibold text-fg">
 {support.badge}
 </motion.span>
 </AnimatePresence>
 <button
type="button"
onClick={() => setRun((r) => r + 1)}
aria-label="הפעלה חוזרת של ההדגמה"
className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 hover:bg-brand/[0.03] transition-colors inline-flex items-center justify-center"
 >
 <Icon name="refresh" size={15} />
 </button>
 </div>

 {/* Diagram — a papercut terrain slab drawn on the board.
     Keeps 4:3 by default; shrinks (never crops) on short screens. */}
 <div className="relative w-full aspect-[4/3] min-h-[230px] lg:min-h-0 shrink">
 <AnimatePresence mode="wait" initial={false}>
 <motion.div key={active} {...swap} className="absolute inset-0 px-2">
 {active === 'handrail' && <HandrailVisual play={boardSeen} run={run} label={support.caption} />}
 {active === 'dead' && <DeadReckoningVisual play={boardSeen} run={run} label={support.caption} />}
 {active === 'pace' && <PaceControlVisual play={boardSeen} run={run} label={support.caption} />}
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Caption + legend — part of the same surface, swaps with the diagram */}
 <div className="shrink-0 px-5 pb-5 pt-2">
 <AnimatePresence mode="wait" initial={false}>
 <motion.div key={active} {...swap} className="space-y-4">
 <p className="text-sm text-fg-muted leading-relaxed">{support.caption}</p>
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-2">מקרא</div>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
 {support.legend.map((it) => (
 <li key={it.label} className="flex items-center gap-2 text-[13px] text-fg-muted leading-snug">
 <LegendGlyph kind={it.kind} />
 <span>{it.label}</span>
 </li>
 ))}
 </ul>
 </div>
 </motion.div>
 </AnimatePresence>
 </div>
 </div>
 </div>
 </div>

 <ConclusionCard />
 </section>
 );
}

/* ═══ Technique 1 — ניווט לפי טופוגרפיה ═══════════════════════════════
   Terrain association: the route is a chain of recognizable features —
   three hilltops (relief) and then a village's central square (land cover).
   Schematic, not a real map; progresses right → left.
   Demo: the force walks leg by leg; on every hilltop it stops, the
   checkpoint ticks ✓ ("אני כאן"), then it moves on to the next feature. */
const HR_A: Pt = { x: 88, y: 57 };
const HR_HILLS = [
 { x: 73, y: 47, label: 'כיפה 1' },
 { x: 55.5, y: 37.5, label: 'כיפה 2' },
 { x: 38, y: 28.5, label: 'כיפה 3' },
];
const HR_B: Pt = { x: 17, y: 19.5 };
const HR_PTS: Pt[] = [HR_A, ...HR_HILLS, HR_B];
const HR_ROUTE = HR_PTS.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
const HR_LEGS = HR_PTS.slice(1).map((p, i) => dist(HR_PTS[i], p));
const HR_FRAC = HR_LEGS.map((_, i) => HR_LEGS.slice(0, i + 1).reduce((a, b) => a + b, 0) / HR_LEGS.reduce((a, b) => a + b, 0));
// Timeline (seconds): leave each point at DEPART[i], reach the next at ARRIVE[i].
const HR_DEPART = [0.5, 2.6, 4.7, 6.8];
const HR_ARRIVE = [1.8, 3.9, 6.0, 8.3];
const HR_T = 9;
const hrTrack = (pick: (p: Pt) => number): Key[] => [
 [0, pick(HR_A)],
 ...HR_DEPART.flatMap((d, i): Key[] => [[d, pick(HR_PTS[i])], [HR_ARRIVE[i], pick(HR_PTS[i + 1])]]),
];
const HR_X = hrTrack((p) => p.x);
const HR_Y = hrTrack((p) => p.y);
const HR_DRAW: Key[] = [[0, 0], ...HR_DEPART.flatMap((d, i): Key[] => [[d, i ? HR_FRAC[i - 1] : 0], [HR_ARRIVE[i], HR_FRAC[i]]])];
// "אני כאן" callout: shown while the force stands on a hilltop.
const HR_CALLOUT: Key[] = [
 [0, 0],
 ...HR_ARRIVE.slice(0, 3).flatMap((a, i): Key[] => [[a, 0], [a + 0.15, 1], [HR_DEPART[i + 1] - 0.15, 1], [HR_DEPART[i + 1], 0]]),
];
// Village houses around the central square (top-left corners); the SE
// sector stays open as the street the route enters by.
const HR_HOUSES: [number, number][] = [
 [9, 12], [13.2, 12], [17.4, 12], [21.6, 12.7],
 [6.6, 16.5], [6.6, 20.9], [25.2, 15.9],
 [9.6, 25.9], [13.8, 25.9], [18, 25.9],
];
const HR_CONTOURS = [
 'M4 44 C 18 38, 30 52, 48 50 S 78 36, 96 42',
 'M4 54 C 20 48, 34 64, 58 60 S 84 50, 96 55',
 'M30 5 C 34 12, 46 13, 52 5',
 'M62 66 C 68 60, 84 60, 96 63',
 'M58 5 C 62 16, 82 18, 96 12',
];

function HandrailVisual({ play, run, label }: VisualProps) {
const { t, reduce } = useSequence(HR_T, play, run);
const ux = useTrack(t, HR_X);
const uy = useTrack(t, HR_Y);
const drawn = useTrack(t, HR_DRAW);
const callout = useTrack(t, HR_CALLOUT, linear);
const step = useStep(t, HR_ARRIVE); // hilltops confirmed (0–3), 4 = at the square
const chevrons = HR_PTS.slice(1).map((p, i) => ({ at: lerpPt(HR_PTS[i], p, 0.5), rot: angleDeg(HR_PTS[i], p) }));
return (
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
 <PaperTile>
 <ContourTexture paths={HR_CONTOURS} />
 </PaperTile>

 {/* Relief — three papercut hilltops */}
 {HR_HILLS.map((h) => (
 <PaperHill key={h.label} x={h.x} y={h.y} />
 ))}

 {/* Land cover — a village: houses around an open central square */}
 <rect x="12.4" y="16.1" width="9.2" height="6.8" rx="1.4" className="fill-paper-bright" stroke={PAPER.rim} strokeWidth="0.35" strokeDasharray="1 0.7" />
 {HR_HOUSES.map(([x, y], i) => (
 <PaperHouse key={i} x={x} y={y} />
 ))}

 {/* The planned route (dashed) → the part already walked (solid) */}
 <path d={HR_ROUTE} fill="none" className="stroke-accent" strokeOpacity={0.6} strokeWidth="0.7" strokeDasharray="1.6 1.2" strokeLinecap="round" strokeLinejoin="round" />
 <motion.path d={HR_ROUTE} fill="none" className="stroke-accent" strokeOpacity={0.22} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: drawn }} />
 <motion.path d={HR_ROUTE} fill="none" className="stroke-accent" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: drawn }} />
 {chevrons.map((c, i) => (
 <Chevron key={i} at={c.at} rot={c.rot} />
 ))}

 {/* Checkpoints on each hilltop — "I am here" */}
 {HR_HILLS.map((h, i) => (
 <Checkpoint key={h.label} x={h.x} y={h.y} confirmed={step > i} animated={!reduce} />
 ))}

 {/* Labels — below each feature, clear of the route */}
 {HR_HILLS.map((h) => (
 <text key={h.label} x={h.x} y={h.y + 11} textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8" {...HALO}>{h.label}</text>
 ))}
 <text x="44" y="59" textAnchor="middle" fill={PAPER.g3} className="font-display font-bold" fontSize="3.1" {...HALO}>תבליט: שלוש כיפות</text>
 <text x={HR_B.x} y="9.7" textAnchor="middle" className="fill-tanline-badge font-display font-bold" fontSize="3" {...HALO}>תכסית: כפר</text>
 <text x="16" y="33.3" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.8" {...HALO}>כיכר מרכזית (B)</text>

 {/* Start (A) */}
 <StartDot {...HR_A} />
 <text x={HR_A.x} y={HR_A.y + 6} textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3.2" {...HALO}>A</text>

 {/* Destination (B) — the village's central square */}
 <TargetMark {...HR_B} pulse={step === 4 && !reduce} />

 {/* The force */}
 <UnitPuck x={ux} y={uy} />
 {!reduce && (
 <motion.g style={{ x: ux, y: uy, opacity: callout }} aria-hidden>
 <path d="M2.4 -3.1 L4 -4.6 L5.6 -4.6 Z" fill="#ffffff" className="stroke-accent" strokeWidth="0.3" strokeLinejoin="round" />
 <rect x="2.4" y="-9.4" width="12.8" height="4.8" rx="2.4" fill="#ffffff" className="stroke-accent" strokeWidth="0.35" />
 <text x="8.8" y="-5.9" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8">אני כאן</text>
 </motion.g>
 )}
 </svg>
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
 <text x="75" y="53.4" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8">800 זוגות צעדים</text>
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

/* ═══ Technique 3 — שליטה בקצב ═══════════════════════════════════════
   Open, exposed ground → slow bounds from cover to cover, one team moving
   while the other covers. Concealing forest → one fast, continuous column.
   Demo: the whole move plays through; the label of the regime the force is
   in lights up, so the pace change reads as caused by the terrain. */
const PC_COVER = [
 { x: 12, y: 51, kind: 'rock' },
 { x: 22, y: 47.5, kind: 'bush' },
 { x: 32, y: 44, kind: 'rock' },
 { x: 42, y: 40.5, kind: 'bush' },
] as const;
const PC_E: Pt = { x: 54, y: 39 }; // trail enters the forest
const PC_X: Pt = { x: 90, y: 37.5 }; // …and leaves it
const PC_T = 7.9;
const PC_TIMES = [0, 0.6, 1.4, 2.3, 3.1, 4.0, 4.6, 5.2, 7.2];
const PC_EASE: Ease[] = [easeInOut, easeInOut, easeInOut, easeInOut, easeInOut, easeInOut, easeInOut, linear];
const PC_MEMBER: Pt[] = [{ x: -1.8, y: -2.9 }, { x: 1.8, y: -2.9 }];
const pcAt = (c: Pt, m: Pt): Pt => ({ x: c.x + m.x, y: c.y + m.y });
const pcCentre = (c: Pt): Pt => ({ x: c.x, y: c.y - 2.9 });
const PC_LEN = dist(PC_E, PC_X);
const PC_DIR: Pt = { x: (PC_X.x - PC_E.x) / PC_LEN, y: (PC_X.y - PC_E.y) / PC_LEN };
const pcSlot = (k: number): Pt => ({ x: PC_E.x - PC_DIR.x * 3.5 * k, y: PC_E.y - PC_DIR.y * 3.5 * k });
const pcShift = (p: Pt): Pt => ({ x: p.x + PC_X.x - PC_E.x, y: p.y + PC_X.y - PC_E.y });
const [R0, R1, R2, R3] = PC_COVER;
// Waypoints per unit at PC_TIMES. Team β (0,1) bounds first; team α (2,3) covers, then swaps.
const PC_UNITS: Pt[][] = [
 [pcAt(R0, PC_MEMBER[0]), pcAt(R0, PC_MEMBER[0]), pcAt(R2, PC_MEMBER[0]), pcAt(R2, PC_MEMBER[0]), pcAt(R2, PC_MEMBER[0]), pcAt(R2, PC_MEMBER[0]), pcSlot(0), pcSlot(0), pcShift(pcSlot(0))],
 [pcAt(R0, PC_MEMBER[1]), pcAt(R0, PC_MEMBER[1]), pcAt(R2, PC_MEMBER[1]), pcAt(R2, PC_MEMBER[1]), pcAt(R2, PC_MEMBER[1]), pcAt(R2, PC_MEMBER[1]), pcSlot(1), pcSlot(1), pcShift(pcSlot(1))],
 [pcAt(R1, PC_MEMBER[0]), pcAt(R1, PC_MEMBER[0]), pcAt(R1, PC_MEMBER[0]), pcAt(R1, PC_MEMBER[0]), pcAt(R3, PC_MEMBER[0]), pcAt(R3, PC_MEMBER[0]), pcAt(R3, PC_MEMBER[0]), pcSlot(2), pcShift(pcSlot(2))],
 [pcAt(R1, PC_MEMBER[1]), pcAt(R1, PC_MEMBER[1]), pcAt(R1, PC_MEMBER[1]), pcAt(R1, PC_MEMBER[1]), pcAt(R3, PC_MEMBER[1]), pcAt(R3, PC_MEMBER[1]), pcAt(R3, PC_MEMBER[1]), pcSlot(3), pcShift(pcSlot(3))],
];
const pcKeys = (pts: Pt[], pick: (p: Pt) => number): Key[] => pts.map((p, i) => [PC_TIMES[i], pick(p)]);
// Bounds in the open (dashed, exposed): [from, to, start, end].
const PC_RUSHES: [Pt, Pt, number, number][] = [
 [pcCentre(R0), pcCentre(R2), 0.6, 1.4],
 [pcCentre(R1), pcCentre(R3), 2.3, 3.1],
 [pcCentre(R2), lerpPt(pcSlot(0), pcSlot(1), 0.5), 4.0, 4.6],
];
// The team that holds still covers the bound: [position, from, to].
const PC_WATCH: [Pt, number, number][] = [
 [pcCentre(R1), 0.35, 1.65],
 [pcCentre(R2), 2.05, 3.35],
 [pcCentre(R3), 3.75, 4.8],
];
const PC_FOREST_RUN = [5.2, 7.2] as const;
const PC_PINES: [number, number, number][] = [
 [56.5, 25.5, 0.95], [62.5, 20, 1.05], [69.5, 25.5, 0.9], [78, 20.5, 1.1], [85.5, 25.5, 0.95], [92, 20, 0.85],
 [56, 50.5, 1.0], [63.5, 48.5, 1.1], [71.5, 51, 0.95], [79.5, 48.5, 1.1], [87.5, 51, 1.0], [93, 47, 0.8],
 [59.5, 57.5, 0.9], [67.5, 56.5, 0.85], [83.5, 57, 0.9], [91.5, 56.5, 0.85],
];
const PC_TUFTS: [number, number][] = [[8, 58], [26, 57], [38, 52.5], [46, 58], [11, 32], [31, 27], [19, 21]];
// Cover "fan" pointing ahead of the covering team.
const pcFan = (p: Pt) => {
const a = polarFrom(p, -17 - 16, 11);
const b = polarFrom(p, -17 + 16, 11);
const c = polarFrom(p, -17, 12.4);
return `M${p.x} ${p.y} L${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y} Z`;
};
function polarFrom(p: Pt, deg: number, r: number): Pt {
const a = (deg * Math.PI) / 180;
return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
}

function PaceControlVisual({ play, run, label }: VisualProps) {
const { t } = useSequence(PC_T, play, run);
// 0 = in the open · 1 = in the forest · 2 = done (neutral, also reduced motion)
const phase = useStep(t, [5.1, PC_T - 0.05]);
const forestDrawn = useTrack(t, [[0, 0], [PC_FOREST_RUN[0], 0], [PC_FOREST_RUN[1], 1]], linear);
const forestVis = useTrack(t, [[0, 0], [PC_FOREST_RUN[0] - 0.02, 0], [PC_FOREST_RUN[0], 1]], linear);
const forestChevrons = useStep(t, [0.35, 0.75].map((s) => PC_FOREST_RUN[0] + s * (PC_FOREST_RUN[1] - PC_FOREST_RUN[0])));
return (
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
 <PaperTile>
 {/* Forest floor (right) with a soft, irregular tree line */}
 <path d="M50 0 C 46 14, 54 26, 49 38 S 47 56, 51 75 L 100 75 L 100 0 Z" fill={PAPER.g1} />
 {/* Sparse exposure cues in the open — dry tufts */}
 {PC_TUFTS.map(([x, y], i) => (
 <g key={i} stroke={PAPER.g2} strokeOpacity={0.7} strokeWidth="0.35" strokeLinecap="round">
 <line x1={x} y1={y} x2={x - 1} y2={y - 2.2} />
 <line x1={x} y1={y} x2={x} y2={y - 2.7} />
 <line x1={x} y1={y} x2={x + 1} y2={y - 2.2} />
 </g>
 ))}
 </PaperTile>

 {/* Region + regime labels — the active regime lights up */}
 <text x="27" y="11.8" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="3.5" {...HALO}>שטח פתוח</text>
 <text x="27" y="62.6" textAnchor="middle" className={cn('font-display font-bold transition-colors duration-300', phase === 0 ? 'fill-accent' : 'fill-fg-muted')} fontSize="2.8" {...HALO}>חשוף · קצב איטי + דילוגים</text>
 <text x="73" y="11.8" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="3.5" {...HALO}>יער עבות</text>
 <text x="73" y="62.6" textAnchor="middle" className={cn('font-display font-bold transition-colors duration-300', phase === 1 ? 'fill-accent' : 'fill-fg-muted')} fontSize="2.8" {...HALO}>מוסתר · קצב מהיר ורציף</text>

 {/* Cover in the open — rocks and bushes to bound between */}
 {PC_COVER.map((c, i) => (c.kind === 'rock' ? <PaperRock key={i} x={c.x} y={c.y} /> : <PaperBush key={i} x={c.x} y={c.y} />))}

 {/* The forest */}
 {PC_PINES.map(([x, y, s], i) => (
 <PaperPine key={i} x={x} y={y} s={s} />
 ))}

 {/* OPEN — overwatch fans + short dashed bounds */}
 {PC_WATCH.map(([p, a, b], i) => (
 <CoverFan key={i} t={t} at={p} from={a} to={b} />
 ))}
 {PC_RUSHES.map(([from, to, a, b], i) => (
 <RushTrace key={i} t={t} from={from} to={to} start={a} end={b} />
 ))}
 <text x="22" y="37.6" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8" {...HALO}>חוליה + חיפוי</text>

 {/* FOREST — one fast, continuous column */}
 <motion.path d={`M${PC_E.x} ${PC_E.y} L${PC_X.x} ${PC_X.y}`} fill="none" className="stroke-accent" strokeWidth="0.9" strokeLinecap="round" style={{ pathLength: forestDrawn, opacity: forestVis }} />
 {[0.35, 0.75].map((s, i) => (
 <g key={s} className={cn('transition-opacity duration-200', forestChevrons > i ? 'opacity-100' : 'opacity-0')}>
 <Chevron at={lerpPt(PC_E, PC_X, s)} rot={angleDeg(PC_E, PC_X)} />
 </g>
 ))}
 <text x="72" y="33.2" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.8" {...HALO}>טור מהיר ורציף</text>

 {/* The force — four units */}
 {PC_UNITS.map((pts, i) => (
 <TrackedPuck key={i} t={t} xs={pcKeys(pts, (p) => p.x)} ys={pcKeys(pts, (p) => p.y)} ease={PC_EASE} r={1.6} />
 ))}
 </svg>
 );
}

/** A bound across open ground: a dashed trace that grows with the rushing team. */
function RushTrace({ t, from, to, start, end }: { t: MotionValue<number>; from: Pt; to: Pt; start: number; end: number }) {
const x2 = useTrack(t, [[start, from.x], [end, to.x]]);
const y2 = useTrack(t, [[start, from.y], [end, to.y]]);
const shown = useTrack(t, [[start - 0.02, 0], [start, 1]], linear);
const arrived = useTrack(t, [[end - 0.1, 0], [end, 1]], linear);
return (
 <g>
 <motion.line x1={from.x} y1={from.y} x2={x2} y2={y2} className="stroke-accent" strokeWidth="0.6" strokeDasharray="1.2 1" strokeLinecap="round" style={{ opacity: shown }} />
 <motion.g style={{ opacity: arrived }}>
 <Chevron at={lerpPt(from, to, 0.62)} rot={angleDeg(from, to)} scale={0.8} />
 </motion.g>
 </g>
 );
}

/** Overwatch: the team holding still covers the ground ahead of the bound. */
function CoverFan({ t, at, from, to }: { t: MotionValue<number>; at: Pt; from: number; to: number }) {
const opacity = useTrack(t, [[from, 0], [from + 0.2, 1], [to - 0.2, 1], [to, 0]], linear);
return (
 <motion.path d={pcFan(at)} className="fill-accent-cool stroke-accent-cool" fillOpacity={0.2} strokeOpacity={0.55} strokeWidth="0.3" strokeLinejoin="round" style={{ opacity }} />
 );
}

function ConclusionCard() {
return (
 <div className="mt-6 surface p-5 sm:p-6">
 <div className="text-base font-display font-bold text-fg mb-1.5">
 המסקנה
 </div>
 <p className="text-base text-fg leading-relaxed text-pretty">
בניווט בסביבה עוינת, המטרה היא לא להגיע הכי מהר, אלא להגיע בבטחה, ללא התגלות, ובדיוק לנקודה הנכונה.
המשמעות היא שלפעמים ההחלטה החכמה ביותר תהיה לבחור ציר ארוך יותר שעובר בסימנים ברורים בשטח – כיפות, כפר – במקום לחתוך בקו ישר. לפעמים המשמעות היא לסמוך נטו על האזימוט והמרחק שחישבתם מראש, כשסופת חול מסתירה הכול, ולפעמים – לדעת מתי לרוץ מהר בתוך יער, ומתי להתקדם לאט ובזהירות בשטח פתוח. סוד ההצלחה האמיתי בניווט הוא הגמישות והיכולת "לקרוא" את השטח. </p>
 </div>
 );
}
