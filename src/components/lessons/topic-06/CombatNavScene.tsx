'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
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
label: 'הליכה לאורך מעקה',
english: 'Handrailing',
icon: 'route' as never, // Not used
oneLiner: 'נעזרים בסימן דרך טבעי וארוך בשטח כדי לשמור על הכיוון, במקום ללכת בקו ישר.',
detail: 'ללכת בקו ישר אל היעד נשמע כמו הדרך ההגיונית והקצרה ביותר, אבל בשטח מסוכן היא לרוב תהיה חשופה וגלויה מדי. במקום זאת, בוחרים צורת נוף ארוכה ובולטת – כמו ערוץ נחל, שרשרת הרים (רכס) או שביל – והולכים במקביל אליה. ממש כמו שמעקה במדרגות עוזר לנו להרגיש בטוחים בחושך, ה"מעקה" הטבעי בשטח עוזר לנו לשמור על הכיוון מבלי ללכת לאיבוד, גם כשלא רואים כלום.',
whenToUse: ['בלילה, כשקשה לזהות פרטים קטנים בסביבה.', 'כשמנווטים באזור חדש ולחלוטין לא מוכר.', 'כשיש צורך לעקוף שטחים פתוחים שבהם קל להתגלות.'],
example: 'במקום לחצות שדה פתוח וחשוף בקו ישר (על בסיס כיוון המצפן), הקבוצה בוחרת ללכת בצמוד לתחתית של הר שמוביל לאותו כיוון. כך כולם נשארים מוסתרים מעיני האויב, ויודעים שהם בכיוון הנכון כל עוד ההר לצידם.',
 },
 {
id: 'dead',
label: 'ניווט עיוור',
english: 'Dead Reckoning',
icon: 'compass',
oneLiner: 'מנווטים"על עיוור" בעזרת מצפן וספירת צעדים בלבד.',
detail: 'זוהי שיטת ניווט למצבי קיצון שבהם אי אפשר להיאחז בשום סימן בשטח. מתבססים רק על שני דברים: הליכה בכיוון מוגדר מראש במצפן (שנקרא"אזימוט") וספירת צעדים מדויקת כדי לדעת איזה מרחק עברנו. השיטה הזו דורשת משמעת ברזל – להמשיך לסמוך על המצפן והספירה שלכם, גם אם תחושת הבטן צועקת שאתם הולכים בכיוון הלא נכון.',
whenToUse: ['בזמן סופת חול או ערפל כבד, כשהראות יורדת לאפס.', 'באזורים כמו דיונות חול ענקיות שבהם הכל נראה אותו דבר.', 'במדבר פתוח או ימת מלח – שטחים ריקים לגמרי שאין בהם צמחייה, מבנים או הרים (מה שנקרא בשפה המקצועית שטח"חסר תכסית").'],
example: 'כוח שמנווט במדבר נקלע לפתע לסופת חול, ואי אפשר לראות מטר קדימה. במקום להתבלבל, הלוחמים מכוונים את המצפן לזווית קבועה מראש (למשל 62 מעלות) ופשוט צועדים וסופרים 800 צעדים. כך, למרות"העיוורון" המוחלט בדרך, הם עוברים 1.2 קילומטרים ומגיעים בדיוק ליעד המתוכנן.ד',
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

// — Per-technique supporting content for the left "explanation board" —
type LegendKind = 'line' | 'dash' | 'dot' | 'box';
type LegendItem = { kind: LegendKind; className: string; label: string };
type SupportData = { caption: string; legend: LegendItem[] };

const SUPPORT: Record<Method, SupportData> = {
handrail: {
caption: 'התרשים מראה תנועה לאורך רוב הדרך במקביל למעקה ברור, ורק בנקודת השבירה פנייה קצרה אל היעד — במקום לחצות שטח פתוח בקו ישר וחשוף.',
legend: [
 { kind: 'line', className: 'bg-terrain-ridge', label: 'מעקה טבעי — תחתית רכס להיאחז בה' },
 { kind: 'line', className: 'bg-accent', label: 'מסלול בטוח — הליכה במקביל למעקה' },
 { kind: 'dot', className: 'bg-accent', label: 'נקודת שבירה — פנייה ליעד' },
 { kind: 'dash', className: 'bg-status-danger', label: 'קו ישר — חשוף לאויב' },
 { kind: 'dot', className: 'bg-accent-cool', label: 'נקודת זינוק (A)' },
 { kind: 'dot', className: 'bg-accent-hot', label: 'נקודת יעד (B)' },
],
},
dead: {
caption: 'התרשים ממחיש ניווט ״על עיוור״ בתוך סופת חול: נשענים רק על כיוון המצפן וספירת הצעדים, בלי שום סימן בשטח.',
legend: [
 { kind: 'dash', className: 'bg-accent', label: 'אזימוט — כיוון מצפן קבוע (62°)' },
 { kind: 'dot', className: 'bg-accent', label: 'הלוחם — מנווט במצפן וספירת צעדים' },
 { kind: 'box', className: 'bg-fg-dim', label: 'סופת חול — ראות אפסית' },
 { kind: 'dot', className: 'bg-accent-cool', label: 'נקודת זינוק (A)' },
 { kind: 'dot', className: 'bg-accent-hot', label: 'נקודת יעד (B)' },
],
},
pace: {
caption: 'התרשים מראה כיצד מתאימים את קצב התנועה לשטח: לאט ובדילוגים בשטח פתוח, מהיר ורציף כשיש הסתרה טבעית.',
legend: [
 { kind: 'box', className: 'bg-terrain-sand', label: 'שטח פתוח — חשוף, קצב איטי ודילוגים' },
 { kind: 'box', className: 'bg-terrain-olive', label: 'יער עבות — מוסתר, קצב מהיר ורציף' },
 { kind: 'dot', className: 'bg-accent-cool', label: 'תנועת הכוח לאורך המסלול' },
],
},
};

function Swatch({ kind, className }: { kind: LegendKind; className: string }) {
if (kind === 'dot') return <span className={cn('size-2.5 rounded-full shrink-0', className)} />;
if (kind === 'box') return <span className={cn('size-3 rounded-xl shrink-0', className)} />;
if (kind === 'dash')
return (
 <span className="inline-flex items-center gap-[2px] w-4 shrink-0">
 <span className={cn('h-[3px] w-1 rounded-full', className)} />
 <span className={cn('h-[3px] w-1 rounded-full', className)} />
 <span className={cn('h-[3px] w-1 rounded-full', className)} />
 </span>
 );
return <span className={cn('h-[3px] w-4 rounded-full shrink-0', className)} />;
}

export function CombatNavScene() {
const [active, setActive] = useState<Method>('handrail');
const activeIndex = METHODS.findIndex((m) => m.id === active);
const activeData = METHODS[activeIndex];
const support = SUPPORT[active];
return (
 <section id="scene-combat" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.3"
eyebrow="ניווט קרבי"
title={
          <>
          הדרך הארוכה היא הקצרה: איך מנווטים כש<span className="gradient-text">אי אפשר ללכת בקו ישר</span>
          </>
        }
intro="ניווט בשטח עוין הוא לא עוד טיול בטבע. המטרה היא לא רק להגיע ליעד, אלא להגיע אליו בבטחה: להישאר מוסתרים, להימנע מסכנות בדרך, ולהתאים את ההליכה לתנאי השטח. הנה שלוש טכניקות ניווט מיוחדות למצבי קיצון שכל אחד יכול להבין."
 />

 <div className="grid lg:grid-cols-[1fr_1.7fr] gap-6 items-start">
 {/* Accordion list — first child → RIGHT in RTL (text on right) */}
 <div className="space-y-3">
 {METHODS.map((m, i) => {
const isActive = active === m.id;
return (
 <div
key={m.id}
className={cn(
 'surface overflow-hidden transition-colors relative',
isActive
 ? 'border-brand-dark bg-brand/5'
 : 'hover:border-border-strong hover:bg-bg-accent/30'
 )}
 >
 <button
type="button"
onClick={() => setActive(m.id)}
aria-expanded={isActive}
className="w-full p-4 text-right flex items-center gap-3"
 >
 <span
className={cn(
 'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
isActive ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted'
 )}
 >
 <span className="font-display font-bold text-sm">{i + 1}</span>
 </span>
 <div className="flex-1 min-w-0 text-right">
 <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">
 טכניקה {i + 1}
 </div>
 <div className={cn('font-display font-bold leading-tight', isActive ? 'text-brand-dark' : 'text-fg')}>
 {m.label}
 </div>
 <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-0.5">{m.english}</div>
 </div>
 <motion.span
animate={{ rotate: isActive ? 180 : 0 }}
transition={{ duration: 0.25 }}
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
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
className="overflow-hidden"
 >
 <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-3">
 <div className="mt-3">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 מה זה ולמה זה עובד
 </div>
 <p className="text-sm text-fg leading-relaxed">{m.detail}</p>
 </div>

 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider">
 מתי משתמשים בזה
 </div>
 <ul className="space-y-1.5 text-sm">
 {m.whenToUse.map((u) => (
 <li key={u} className="flex gap-2">
 <Icon name="check" size={14} className="text-accent-cool mt-0.5 shrink-0" strokeWidth={2.5} />
 <span className="text-fg leading-relaxed">{u}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="pt-2 border-t border-border-subtle">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
 דוגמה
 </div>
 <p className="text-sm text-fg-muted leading-relaxed">{m.example}</p>
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
     One cohesive instructional surface: the shared topo grid + warm
     terrain wash run continuously under the header, diagram and legend,
     so the diagram reads as part of the board — not an image dropped in
     a card. Sticky + viewport-capped on desktop so the whole module
     stays fully visible while the long accordion is read: balance
     without a forced fixed height. */}
 <div className="lg:sticky lg:top-24 self-start">
 <div className="relative overflow-hidden rounded-2xl border border-border shadow-elevated bg-bg-elevated topo-bg flex flex-col lg:h-[calc(100vh-7rem)]">
 {/* Warm terrain wash framing the board top → bottom */}
 <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-accent/50 via-transparent to-brand/5" />

 {/* Board header — updates with the active technique */}
 <div className="relative flex items-center justify-between gap-3 px-5 pt-5 pb-3">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
 <Icon name="spark" size={18} />
 </span>
 <div className="min-w-0">
 <div className="text-sm font-display font-bold text-fg leading-tight">הסבר חזותי</div>
 <div className="text-xs text-fg-dim truncate">
 {activeData.label} · {activeData.english}
 </div>
 </div>
 </div>
 <span className="chip border-accent/30 bg-accent/10 text-accent shrink-0">טכניקה {activeIndex + 1}</span>
 </div>

 {/* Diagram — drawn directly on the board (transparent SVG). A soft
     radial light lifts the centre for legibility while the grid and
     warm tones bleed to the edges, so nothing looks boxed-in. Flexes
     to fill the capped board height on desktop; natural on mobile. */}
 <div className="relative flex-1 min-h-[230px] lg:min-h-0">
 <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_62%_at_50%_46%,rgba(255,255,255,0.92),transparent_78%)]" />
 <AnimatePresence mode="wait">
 <motion.div
key={active}
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.3 }}
className="absolute inset-0"
 >
 {active === 'handrail' && <HandrailVisual />}
 {active === 'dead' && <DeadReckoningVisual />}
 {active === 'pace' && <PaceControlVisual />}
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Caption + legend — part of the same surface, no separate panel */}
 <div className="relative px-5 pb-5 pt-3 space-y-3">
 <p className="text-sm text-fg-muted leading-relaxed">{support.caption}</p>
 <div className="pt-3 border-t border-border-subtle/70">
 <div className="text-[11px] font-display font-semibold text-fg-dim mb-2 tracking-wider">מקרא</div>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
 {support.legend.map((it) => (
 <li key={it.label} className="flex items-center gap-2 text-xs text-fg-muted leading-snug">
 <Swatch kind={it.kind} className={it.className} />
 <span>{it.label}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 </div>
 </div>

 <ConclusionCard />
 </section>
 );
}
function HandrailVisual() {
// Safe route: from A, hug the ridge (parallel) for ~80% of the way, then a
// sharp break upward at the break point and a short final leg to B.
const ROUTE = 'M10 50 C 28 48 54 46 74 45 L 84 16';
// The direct, exposed line A→B straight across open ground.
const DIRECT = { x1: 10, y1: 50, x2: 84, y2: 16 };
const BREAK = { x: 74, y: 45 };
// Small filled arrowhead, tip at +x; rotate to point along travel.
const ARROW = '-1.2,-1.3 1.8,0 -1.2,1.3';
// Direction arrows along the safe route (parallel leg → up-turn to B).
const routeArrows = [
 { x: 28, y: 48.2, rot: -6 },
 { x: 44.6, y: 46.8, rot: -4 },
 { x: 61.4, y: 45.7, rot: -3 },
 { x: 79, y: 30.5, rot: -71 },
];
// Downslope hachure ticks that read the ridge as a linear landform.
const hachures = [
 [14, 55.4], [26, 54.6], [38, 54.2], [50, 54], [62, 53.9], [74, 53.8], [86, 53.4],
];
return (
 <div className="aspect-[4/3] sm:aspect-auto h-full relative">
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
 {/* No opaque base — the cohesive board surface shows through */}

 {/* Open, exposed ground (the whole board reads as open terrain; the
     ridge + its sheltered lane are the only cover) */}
 <rect x="0" y="0" width="100" height="75" className="fill-terrain-sand/8" />

 {/* Sheltered lane hugging the ridge — where the safe route stays */}
 <path d="M10 50 C 28 48 54 46 74 45" fill="none" className="stroke-brand/10" strokeWidth="7" strokeLinecap="round" />

 {/* The"handrail" — a long, continuous ridge running most of the board.
     Soft landform body + crest line + downslope hachures. */}
 <path d="M5 57 C 26 55 52 54 74 54 S 92 53 97 52" fill="none" className="stroke-terrain-ridge/20" strokeWidth="8" strokeLinecap="round" />
 <path d="M5 57 C 26 55 52 54 74 54 S 92 53 97 52" fill="none" className="stroke-terrain-ridge/70" strokeWidth="0.8" />
 {hachures.map(([x, y], i) => (
 <line key={i} x1={x} y1={y} x2={x} y2={y + 3} className="stroke-terrain-ridge/40" strokeWidth="0.35" strokeLinecap="round" />
 ))}

 {/* Direct path (red — risky, crosses open ground) */}
 <line x1={DIRECT.x1} y1={DIRECT.y1} x2={DIRECT.x2} y2={DIRECT.y2} className="stroke-status-danger/55" strokeWidth="0.6" strokeDasharray="1.6 1.1" />
 <polygon points={ARROW} className="fill-status-danger/60" transform="translate(72 22) rotate(-25) scale(0.8)" />
 {/* Exposure cues along the open crossing */}
 {[[44, 34.4], [60, 27]].map(([x, y], i) => (
 <g key={i}>
 <circle cx={x} cy={y} r="2.4" fill="none" className="stroke-status-danger/35" strokeWidth="0.3" />
 <circle cx={x} cy={y} r="0.9" className="fill-status-danger/70" />
 </g>
 ))}

 {/* Safe route (green — the hero) with soft glow + direction arrows */}
 <path d={ROUTE} fill="none" className="stroke-accent/25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 <path d={ROUTE} fill="none" className="stroke-accent" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
 {routeArrows.map((a, i) => (
 <polygon key={i} points={ARROW} className="fill-accent" transform={`translate(${a.x} ${a.y}) rotate(${a.rot})`} />
 ))}

 {/* Break point — the decision to turn off the handrail toward B */}
 <circle cx={BREAK.x} cy={BREAK.y} r="3" fill="none" className="stroke-accent/50" strokeWidth="0.4" />
 <circle cx={BREAK.x} cy={BREAK.y} r="1.5" className="fill-accent" />

 {/* Start (A) — sits at the foot of the ridge */}
 <circle cx="10" cy="50" r="2" className="fill-accent-cool" />
 <text x="7" y="46" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3.4"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">A</text>

 {/* End (B) — off the handrail, out in the open */}
 <circle cx="84" cy="16" r="2" className="fill-accent-hot" />
 <text x="88" y="13" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.4"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">B</text>

 {/* Labels — short Hebrew, white halo, spaced to never overlap */}
 <text x="30" y="38" textAnchor="middle" transform="rotate(-25 30 38)" className="fill-status-danger font-display font-bold" fontSize="3"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">קו ישר חשוף</text>

 <text x="52" y="43" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">הליכה במקביל</text>

 <text x="66" y="36.5" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="3"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">נקודת שבירה</text>

 <text x="86" y="42" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2.9"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">פנייה ליעד</text>

 <text x="42" y="66.5" textAnchor="middle" className="fill-terrain-ridge font-display font-bold" fontSize="3.4"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">מעקה טבעי</text>
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <Icon name="spark" size={11} className="text-accent" />
 הליכה לאורך מעקה
 </div>
 </div>
 );
}
function DeadReckoningVisual() {
// Blind navigation: no terrain to lean on — only a compass bearing and a
// counted number of paces carry the force from A to B through the storm.
const AZ = { x1: 16, y1: 58, x2: 86, y2: 18 };
const ARROW = '-1.1,-1.2 1.7,0 -1.1,1.2';
// Wind-driven sand streaks sweeping across the board [x1,y1,x2,y2,opacity].
const streaks: [number, number, number, number, number][] = [
 [6, 8, 34, 18, 0.18], [45, 5, 80, 17, 0.13], [62, 18, 94, 29, 0.12],
 [4, 30, 28, 39, 0.16], [70, 42, 99, 53, 0.13], [30, 60, 64, 71, 0.12],
 [12, 46, 42, 56, 0.15], [50, 50, 86, 62, 0.1],
];
return (
 <div className="aspect-[4/3] sm:aspect-auto h-full relative">
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
 {/* Featureless desert floor */}
 <rect x="0" y="0" width="100" height="75" className="fill-terrain-sand/10" />

 {/* Sandstorm veil — palette haze, kept light enough to read through */}
 <rect x="0" y="0" width="100" height="75" className="fill-terrain-ridge/25" />
 <rect x="0" y="0" width="100" height="75" className="fill-fg/20" />
 {/* Blown-sand streaks (white dust + sand), giving the storm direction */}
 {streaks.map(([x1, y1, x2, y2, o], i) => (
 <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i % 2 ? '#ffffff' : '#c2a26b'} strokeOpacity={o} strokeWidth="1.6" strokeLinecap="round" />
 ))}

 {/* Planned bearing A→B — the invisible thread the navigator trusts */}
 <line x1={AZ.x1} y1={AZ.y1} x2={AZ.x2} y2={AZ.y2} className="stroke-accent/80" strokeWidth="0.6" strokeDasharray="2 1.2" />
 {/* Pace ticks along the bearing — the counted steps (every 3rd major) */}
 {[0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.81, 0.9].map((s, i) => {
const bx = 16 + s * 70, by = 58 - s * 40;
const major = i % 3 === 2;
const h = major ? 2.2 : 1.3;
const px = 0.4962 * h, py = 0.8683 * h;
return <line key={i} x1={bx - px} y1={by - py} x2={bx + px} y2={by + py} className="stroke-accent/70" strokeWidth={major ? 0.5 : 0.3} strokeLinecap="round" />;
 })}
 {/* Travel-direction arrows on the bearing */}
 {[[30, 50], [72, 26]].map(([x, y], i) => (
 <polygon key={i} points={ARROW} className="fill-accent" transform={`translate(${x} ${y}) rotate(-30)`} />
 ))}

 {/* Compass — the instrument the whole move depends on */}
 <g>
 <circle cx="22" cy="24" r="9" className="fill-bg-elevated/60 stroke-accent/50" strokeWidth="0.5" />
 <circle cx="22" cy="24" r="6.6" fill="none" className="stroke-accent/25" strokeWidth="0.3" />
 {Array.from({ length: 12 }).map((_, i) => {
const a = (i * 30) * Math.PI / 180;
return <line key={i} x1={22 + Math.sin(a) * 6.6} y1={24 - Math.cos(a) * 6.6} x2={22 + Math.sin(a) * 9} y2={24 - Math.cos(a) * 9} className="stroke-accent/40" strokeWidth="0.3" />;
 })}
 {/* North marker on the housing */}
 <polygon points="22,13.6 20.8,16 23.2,16" className="fill-accent" />
 {/* Magnetic needle pointing along the bearing (up-right) */}
 <polygon points="28.1,20.5 22.6,25 21.4,23" className="fill-accent-hot" />
 <polygon points="16.7,27 22.6,25 21.4,23" className="fill-fg-muted" />
 <circle cx="22" cy="24" r="0.8" className="fill-fg-muted" />
 </g>
 <text x="22" y="38" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3.2"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">אזימוט 62°</text>

 {/* Navigator — hooded figure reading a compass on the bearing */}
 <g>
 <ellipse cx="40" cy="47.6" rx="2.4" ry="0.8" className="fill-fg/15" />
 <path d="M36.8 47.8 C37.3 42.3 42.7 42.3 43.2 47.8 Z" className="fill-accent" />
 <circle cx="40" cy="41.8" r="1.5" className="fill-accent" />
 <line x1="42.6" y1="44.6" x2="45.6" y2="43.6" className="stroke-accent" strokeWidth="0.5" strokeLinecap="round" />
 <circle cx="46" cy="43.4" r="1" className="fill-accent" />
 <circle cx="46" cy="43.4" r="0.4" className="fill-bg-elevated" />
 </g>
 <text x="60" y="40" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">800 צעדים</text>

 {/* Start (A) */}
 <circle cx="16" cy="58" r="2" className="fill-accent-cool" />
 <text x="12" y="62" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3.2"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">A</text>

 {/* End (B) */}
 <circle cx="86" cy="18" r="2" className="fill-accent-hot" />
 <text x="90" y="15" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.2"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">B</text>
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <Icon name="spark" size={11} className="text-accent" />
 סופת חול · ראות אפסית
 </div>
 </div>
 );
}
// A recognizable pine — layered canopy, trunk and soft ground shadow — so the
// forest reads as trees on its own, not as a field of dots.
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
return (
 <g>
 <ellipse cx={x} cy={y + 2.2 * s} rx={2.7 * s} ry={0.85 * s} className="fill-terrain-olive/25" />
 <rect x={x - 0.5 * s} y={y - 0.2 * s} width={1 * s} height={2.6 * s} className="fill-terrain-olive" />
 <polygon points={`${x - 2.4 * s},${y + 0.6 * s} ${x + 2.4 * s},${y + 0.6 * s} ${x},${y - 3 * s}`} className="fill-terrain-olive/70 stroke-terrain-olive" strokeWidth="0.3" strokeLinejoin="round" />
 <polygon points={`${x - 1.7 * s},${y - 1.4 * s} ${x + 1.7 * s},${y - 1.4 * s} ${x},${y - 4.6 * s}`} className="fill-terrain-olive/85 stroke-terrain-olive" strokeWidth="0.3" strokeLinejoin="round" />
 </g>
 );
}
// A friendly personnel marker — cool dot with a light ring so it reads on both
// the open sand and the shaded forest.
function Unit({ x, y }: { x: number; y: number }) {
return (
 <g>
 <circle cx={x} cy={y} r="1.6" className="fill-accent-cool" />
 <circle cx={x} cy={y} r="1.6" fill="none" className="stroke-bg-elevated" strokeWidth="0.3" />
 </g>
 );
}
function PaceControlVisual() {
const ARROW = '-1.1,-1.2 1.7,0 -1.1,1.2';
const pines: [number, number, number][] = [
 [57, 31, 1.1], [66, 24, 1.35], [75, 32, 1.0], [84, 26, 1.2], [93, 35, 0.95],
 [55, 66, 1.0], [60, 58, 1.2], [70, 63, 1.05], [80, 59, 1.3], [90, 63, 1.0], [64, 52, 0.9],
];
return (
 <div className="aspect-[4/3] sm:aspect-auto h-full relative">
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
 {/* Open, exposed terrain (left half) */}
 <rect x="0" y="0" width="50" height="75" className="fill-terrain-sand/12" />
 {/* Sparse exposure cues — a few rocks + dry tufts keep it feeling bare */}
 {[[12, 45], [22, 64], [38, 60]].map(([x, y], i) => (
 <ellipse key={i} cx={x} cy={y} rx="1.7" ry="1" className="fill-terrain-sand/60" />
 ))}
 {[[28, 66], [42, 53], [9, 58]].map(([x, y], i) => (
 <g key={i} className="stroke-terrain-olive/45" strokeWidth="0.35" strokeLinecap="round">
 <line x1={x} y1={y} x2={x - 1} y2={y - 2.4} />
 <line x1={x} y1={y} x2={x} y2={y - 2.9} />
 <line x1={x} y1={y} x2={x + 1} y2={y - 2.4} />
 </g>
 ))}
 <text x="25" y="12" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="3.5"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">שטח פתוח</text>
 <text x="25" y="70" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.6"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">חשוף · קצב איטי + דילוגים</text>

 {/* Forest (right half) */}
 <rect x="50" y="0" width="50" height="75" className="fill-terrain-olive/30" />
 {pines.map(([x, y, s], i) => (
 <Pine key={i} x={x} y={y} s={s} />
 ))}
 <text x="75" y="12" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="3.5"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">יער עבות</text>
 <text x="74" y="70" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">מוסתר · קצב מהיר ורציף</text>

 {/* Boundary between the two terrain regimes */}
 <line x1="50" y1="6" x2="50" y2="69" className="stroke-fg-dim/70" strokeWidth="0.3" strokeDasharray="1 1" />

 {/* OPEN — slow bounding overwatch: staccato dashed rushes + a covering unit */}
 <line x1="15" y1="55" x2="30" y2="50" className="stroke-accent-cool/60" strokeWidth="0.4" strokeDasharray="0.6 0.9" strokeLinecap="round" />
 <polygon points={ARROW} className="fill-accent-cool" transform="translate(30 50) rotate(-18) scale(0.8)" />
 <line x1="33" y1="49" x2="46" y2="45" className="stroke-accent-cool/60" strokeWidth="0.4" strokeDasharray="0.6 0.9" strokeLinecap="round" />
 <polygon points={ARROW} className="fill-accent-cool" transform="translate(46 45) rotate(-17) scale(0.8)" />
 {/* Covering (overwatch) sightline from the rear unit */}
 <line x1="14" y1="55" x2="33" y2="50" className="stroke-accent-cool/35" strokeWidth="0.3" strokeDasharray="0.5 0.7" />
 <Unit x={14} y={55} />
 <Unit x={31} y={49} />
 <text x="21" y="42" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.4"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">חוליה + חיפוי</text>

 {/* FOREST — fast continuous column: one smooth arrow, units tight in file */}
 <line x1="47" y1="44.5" x2="90" y2="44" className="stroke-accent-cool" strokeWidth="0.6" strokeLinecap="round" />
 <polygon points={ARROW} className="fill-accent-cool" transform="translate(90 44) rotate(-1)" />
 {[58, 64, 70, 76].map((x, i) => (
 <Unit key={i} x={x} y={44} />
 ))}
 <text x="67" y="38" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.4"
        paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">טור מהיר ורציף</text>
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <Icon name="spark" size={11} className="text-accent" />
 מתאימים קצב לסביבה
 </div>
 </div>
 );
}
function ConclusionCard() {
return (
 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="mt-6 surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
 המסקנה
 </div>
 <p className="text-fg leading-relaxed text-pretty">
בניווט בסביבה עוינת, המטרה היא לא להגיע הכי מהר, אלא להגיע בבטחה, ללא התגלות, ובדיוק לנקודה הנכונה.
המשמעות היא שלפעמים ההחלטה החכמה ביותר תהיה לעשות מסלול עוקף וארוך של קילומטר וחצי (פעולה שנקראת"איגוף"), במקום לחתוך 800 מטר בקו ישר וחשוף. לפעמים המשמעות היא לסמוך נטו על ספירת הצעדים שלכם בתוך סופת חול עיוורת, ולפעמים – לדעת מתי לרוץ מהר בתוך יער, ומתי להתקדם לאט ובזהירות בשטח פתוח. סוד ההצלחה האמיתי בניווט הוא הגמישות והיכולת"לקרוא" את השטח. </p>
 </div>
 </motion.div>
 );
}
