'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Blocker = {
 id: string;
 label: string;
 english: string;
 desc: string;
 example: string;
 color: string;
 bg: string;
 border: string;
};

const BLOCKERS: Blocker[] = [
 {
 id: 'terrain',
 label: 'תבליט',
 english: 'Terrain Relief',
 desc: 'הרים, גבעות, עמקים וקפלי קרקע טבעיים. אלו המכשולים ה"קשיחים" ביותר שחוסמים את קו הראייה.',
 example: 'טנק שמטפס על הרכס בגולן וחוצה את"קו הנראות ההדדית" – בשנייה אחת הוא מוסתר לחלוטין מאחורי ההר, ובשנייה הבאה הוא מופיע כמטרה גלויה על מסך המכ"ם של עמדת טילים שממול.',
 color: 'text-terrain-ridge',
 bg: 'bg-terrain-ridge/10',
 border: 'border-terrain-ridge/40',
 },
 {
 id: 'cover',
 label: 'תכסית',
 english: 'Surface Cover',
 desc: 'כל מה ש"מכסה" את פני הקרקע — מבנים, בניינים, יערות, פרדסים או מתקנים. אלו מכשולים ש"מלבישים" את השטח ויכולים להסתיר אותנו.',
 example: 'עמדת מסתור של מחבל בתוך פרדס סבוך בלבנון. העצים והמבנה מסתירים אותו מתצפית של רחפן. מצלמה תרמית אולי תצליח לזהות את חום הגוף שלו מבעד לעלים, אבל טיל שיירה לשם יפגע בעצים ויתפוצץ לפני שיגיע אליו.',
 color: 'text-terrain-olive',
 bg: 'bg-terrain-olive/10',
 border: 'border-terrain-olive/40',
 },
];

export function LOSScene() {
 const [observerH, setObserverH] = useState(6);
 const [hillH, setHillH] = useState(20);
 const [targetX, setTargetX] = useState(85);
 const [targetH, setTargetH] = useState(2);

 // Geometry — the side-view profile
 // Observer is at x=10, ground level at y=60. Hill in the middle: x=45..55, peak at x=50.
 // Convert heights (0-30) to SVG y-offsets (smaller y = higher).
 const observerX = 10;
 const groundY = 60;
 const obsEyeY = groundY - observerH;
 const hillPeakY = groundY - hillH;
 const targetY = groundY - targetH;

 // LOS check: does the line from (observerX, obsEyeY) to (targetX, targetY) clear the hill peak (50, hillPeakY)?
 // The line at x=50: y = obsEyeY + (50 - observerX) * (targetY - obsEyeY) / (targetX - observerX)
 const lineAtHill = obsEyeY + (50 - observerX) * (targetY - obsEyeY) / (targetX - observerX);
 // If line is above (smaller y) than hillPeakY, LOS is blocked
 const isBlocked = lineAtHill > hillPeakY;
 // Clearance — positive if line clears above peak
 const clearance = hillPeakY - lineAtHill;

 // Where does the line cross the hill peak's height? (intervisibility crossing)
 // y_line(x) = obsEyeY + (x - observerX) * (targetY - obsEyeY) / (targetX - observerX)
 // Solve y_line(x) = hillPeakY → x = observerX + (hillPeakY - obsEyeY) * (targetX - observerX) / (targetY - obsEyeY)
 const intervisCrossX = observerX + (hillPeakY - obsEyeY) * (targetX - observerX) / (targetY - obsEyeY);

 return (
 <section id="scene-los" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
 step="06.1"
 eyebrow="איך עובד קו ראייה?"
 title={
 <>
 <span className="gradient-text">הקו הישר</span> — שמשנה את כל התמונה
 </>
 }
 intro="בעולם האמיתי, קו הראייה הוא קו דמיוני וישר שנמתח בינינו לבין המטרה. מספיק שמכשול אחד בדרך יחתוך את הקו הזה – והראייה נחסמת. כאן למטה תוכלו לשחק עם הנתונים ולראות בזמן אמת מתי רואים את המטרה ומתי היא נעלמת."
 />

 <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 מושג מפתח
 </div>
 <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
 LOS · קו הראייה
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 הקו הדמיוני והישר שמחבר בין התצפיתן (או המצלמה) לבין המטרה. אם הוא נחתך באמצע על-ידי הר (תבליט) או בניין (תכסית) — אומרים ש<strong className="text-fg">"שברנו את ה-LOS"</strong> והמטרה מוסתרת.
 </p>
 </div>
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 הרגע הקריטי
 </div>
 <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
 קו נראות הדדית
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 הנקודה המדויקת שבה עוברים מהסתרה מוחלטת לחשיפה מלאה — בלי שום שלב ביניים. עובד כמו <strong className="text-fg">מתג של אור</strong>: רגע אחד הסתרה גמורה, וברגע הבא מטרה גלויה לחלוטין.
 </p>
 </div>
 </div>

 {/* Main interactive */}
 <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-stretch mb-12">
 {/* Visualization */}
 <div className="surface-elevated p-4 rounded-2xl overflow-hidden flex flex-col">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-2">
 תצוגה צדדית · הזיזו את הפרמטרים מימין
 </div>
 <div className="flex-1 min-h-[260px]">
 <LOSProfile
 observerX={observerX}
 obsEyeY={obsEyeY}
 groundY={groundY}
 hillPeakY={hillPeakY}
 targetX={targetX}
 targetY={targetY}
 isBlocked={isBlocked}
 intervisCrossX={intervisCrossX}
 />
 </div>
 </div>

 {/* Controls */}
 <div className="space-y-3">
 {/* Status banner */}
 <AnimatePresence mode="wait">
 <motion.div
 key={isBlocked ? 'blocked' : 'clear'}
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -6 }}
 transition={{ duration: 0.2 }}
 className={cn(
 'rounded-xl border-2 p-4',
 isBlocked
 ? 'border-status-danger/50 bg-status-danger/5'
 : 'border-status-ok/50 bg-status-ok/5'
 )}
 >
 <div className="flex items-center gap-2.5 mb-1.5">
 <Icon
 name={isBlocked ? 'shield' : 'eye'}
 size={20}
 strokeWidth={2.5}
 className={isBlocked ? 'text-status-danger' : 'text-status-ok'}
 />
 <div className={cn('font-display font-bold text-base', isBlocked ? 'text-status-danger' : 'text-status-ok')}>
 {isBlocked ? 'קו הראייה חסום' : 'קו הראייה פתוח'}
 </div>
 </div>
 <p className="text-xs text-fg-muted leading-relaxed">
 {isBlocked ? (
 <>הרכס חותך את קו הראייה וחוסם אותו (בהפרש של <strong className="text-status-danger">{Math.abs(clearance).toFixed(1)} מטרים</strong>). המטרה מוסתרת לחלוטין.</>
 ) : (
 <>קו הראייה עובר מעל ההר (במרווח של <strong className="text-status-ok">{clearance.toFixed(1)} מטרים</strong>). המטרה גלויה לגמרי וניתן לפגוע בה.</>
 )}
 </p>
 </motion.div>
 </AnimatePresence>

 {/* Sliders */}
 <div className="surface p-4 rounded-xl space-y-3">
 <Slider
 label="גובה התצפיתן"
 hint="גובה העין מעל הקרקע"
 value={observerH}
 setValue={setObserverH}
 min={0}
 max={20}
 unit="מ'"
 />
 <Slider
 label="גובה הרכס החוסם"
 hint="גובה ההר באמצע הדרך"
 value={hillH}
 setValue={setHillH}
 min={0}
 max={30}
 unit="מ'"
 />
 <Slider
 label="גובה המטרה"
 hint="גובה האובייקט במטרה"
 value={targetH}
 setValue={setTargetH}
 min={0}
 max={15}
 unit="מ'"
 />
 <Slider
 label="מרחק המטרה"
 hint="כמה רחוק נמצא היעד"
 value={targetX}
 setValue={setTargetX}
 min={60}
 max={95}
 unit="מ'"
 />
 </div>

 <div className="surface p-3 rounded-xl text-xs text-fg-muted bg-bg-accent/30 border border-border">
 <strong className="text-fg block mb-1">טיפ:</strong>
 שחקו עם גובה ההר או הגביהו את התצפיתן — שימו לב איך"קו הנראות ההדדית" זז ופתאום חושף את המטרה.
 </div>
 </div>
 </div>

 <SoftDivider text="מה יכול לחסום לנו את קו הראייה?" />

 {/* Blocker types */}
 <div className="grid md:grid-cols-2 gap-4 mb-12">
 {BLOCKERS.map((b) => (
 <motion.div
 key={b.id}
 initial={{ opacity: 0, y: 12 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, amount: 0.3 }}
 className={cn('surface-elevated p-5 rounded-2xl border-r-4', b.bg, b.border.replace('border-', 'border-r-'))}
 >
 <div className="flex items-center gap-3 mb-3">
 <Icon name={b.id === 'terrain' ? 'mountain' : 'layers'} size={32} className={cn('shrink-0', b.color)} />
 <div>
 <div className={cn('font-display font-bold text-lg leading-tight', b.color)}>{b.label}</div>
 <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">{b.english}</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">{b.desc}</p>
 <div className="text-xs text-fg-muted bg-bg-accent/40 border border-border rounded-lg p-3 leading-relaxed">
 <strong className="text-fg block mb-1">דוגמה מבצעית:</strong>
 {b.example}
 </div>
 </motion.div>
 ))}
 </div>

 {/* Intervisibility line callout */}
 <div className="surface-elevated p-6 rounded-2xl">
 <div className="flex gap-4 items-start">
 <Icon name="bolt" size={32} className="text-accent shrink-0" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
 קו הנראות ההדדית
 </div>
 <h3 className="font-display font-bold text-lg leading-tight mb-2">
 הגבול הדק שבין הסתרה מלאה לחשיפה קטלנית
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 כשמתקדמים במעלה הר (רכס), אנחנו מוסתרים לחלוטין מהאויב שנמצא מעבר אליו. אבל ברגע שחוצים את הפסגה ומופיעים מעליה – אנחנו נחשפים אליו לגמרי ובבת אחת. אין כאן שלב ביניים. עלייה מעבר להר שווה לחשיפה ודאית.<br/><br/>
 בגלל זה, עמדות הגנה צבאיות תמיד יתמקמו <strong className="text-fg">קצת מאחורי הקו הזה</strong> (כדי לא להיחשף), ויכוונו את הנשק שלהם <strong className="text-fg">בדיוק אל קו הפסגה</strong> כדי לפגוע במי שחוצה אותו.<br/><br/>
 <span className="opacity-80">(אגב, ידעתם שבמרחקים עצומים, אפילו כדור הארץ עצמו מסתיר? בגלל הצורה הכדורית של כדור הארץ, בטווחים של מעל 25 ק"מ חיילים שעומדים בגובה הים פשוט נעלמים מעבר לאופק!)</span>
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}

function LOSProfile({
 observerX,
 obsEyeY,
 groundY,
 hillPeakY,
 targetX,
 targetY,
 isBlocked,
 intervisCrossX,
}: {
 observerX: number;
 obsEyeY: number;
 groundY: number;
 hillPeakY: number;
 targetX: number;
 targetY: number;
 isBlocked: boolean;
 intervisCrossX: number;
}) {
 // The terrain profile
 const hillBaseLeft = 38;
 const hillBaseRight = 62;
 const hillPeakX = 50;

 // SVG y range: 0 (top) to 75 (bottom). groundY = 60.
 return (
 <div className="relative w-full h-full min-h-[260px]">
 <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
 <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

 {/* Ground */}
 <path
 d={`M0 ${groundY} L${hillBaseLeft} ${groundY} L${hillPeakX} ${hillPeakY} L${hillBaseRight} ${groundY} L100 ${groundY} L100 75 L0 75 Z`}
 className="fill-terrain-sand/30 stroke-terrain-ridge"
 strokeWidth="0.3"
 />

 {/* Ground reference line */}
 <line x1="0" y1={groundY} x2="100" y2={groundY} className="stroke-fg-dim" strokeWidth="0.12" opacity="0.4" strokeDasharray="0.5 0.5" />

 {/* Intervisibility line marker (dashed vertical line above the hill peak) */}
 <line
 x1={hillPeakX}
 y1={hillPeakY}
 x2={hillPeakX}
 y2={hillPeakY - 10}
 className="stroke-accent-hot"
 strokeWidth="0.35"
 strokeDasharray="1 0.7"
 />
 <text
 x={hillPeakX}
 y={hillPeakY - 12}
 textAnchor="middle"
 className="fill-accent-hot font-display font-bold"
 fontSize="2.6"
 paintOrder="stroke"
 stroke="#ffffff"
 strokeWidth="0.85"
 strokeLinejoin="round"
 >
 קו נראות
 </text>

 {/* Observer pole */}
 <line x1={observerX} y1={groundY} x2={observerX} y2={obsEyeY} className="stroke-accent-cool" strokeWidth="0.4" strokeDasharray="0.5 0.5" />
 <circle cx={observerX} cy={obsEyeY} r="1.8" className="fill-accent-cool" />
 <text
 x={observerX}
 y={obsEyeY - 3}
 textAnchor="middle"
 className="fill-accent-cool font-display font-bold"
 fontSize="3"
 paintOrder="stroke"
 stroke="#ffffff"
 strokeWidth="1"
 strokeLinejoin="round"
 >
 תצפיתן
 </text>

 {/* Target pole */}
 <line x1={targetX} y1={groundY} x2={targetX} y2={targetY} className="stroke-accent-hot" strokeWidth="0.4" strokeDasharray="0.5 0.5" />
 <circle cx={targetX} cy={targetY} r="1.8" className="fill-accent-hot" />
 <text
 x={targetX}
 y={targetY - 3}
 textAnchor="middle"
 className="fill-accent-hot font-display font-bold"
 fontSize="3"
 paintOrder="stroke"
 stroke="#ffffff"
 strokeWidth="1"
 strokeLinejoin="round"
 >
 מטרה
 </text>

 {/* LOS line — full or blocked */}
 {!isBlocked ? (
 <motion.line
 x1={observerX}
 y1={obsEyeY}
 x2={targetX}
 y2={targetY}
 className="stroke-status-ok"
 strokeWidth="0.5"
 initial={false}
 animate={{ pathLength: 1 }}
 />
 ) : (
 <>
 {/* Line from observer up to hill peak, blocked */}
 <line
 x1={observerX}
 y1={obsEyeY}
 x2={Math.min(intervisCrossX, hillPeakX)}
 y2={obsEyeY + (Math.min(intervisCrossX, hillPeakX) - observerX) * (targetY - obsEyeY) / (targetX - observerX)}
 className="stroke-status-danger"
 strokeWidth="0.5"
 />
 {/* Block X marker on the hill */}
 <g transform={`translate(${hillPeakX} ${hillPeakY})`}>
 <circle r="2.6" className="fill-status-danger/20 stroke-status-danger" strokeWidth="0.4" />
 <line x1="-1.6" y1="-1.6" x2="1.6" y2="1.6" className="stroke-status-danger" strokeWidth="0.6" strokeLinecap="round" />
 <line x1="-1.6" y1="1.6" x2="1.6" y2="-1.6" className="stroke-status-danger" strokeWidth="0.6" strokeLinecap="round" />
 </g>
 {/* Continuation (ghost) line to target — what would have been visible */}
 <line
 x1={observerX}
 y1={obsEyeY}
 x2={targetX}
 y2={targetY}
 className="stroke-status-danger"
 strokeWidth="0.3"
 strokeDasharray="0.6 0.6"
 opacity="0.4"
 />
 </>
 )}

 {/* Dead space indicator behind hill (only when blocked) */}
 {isBlocked && (
 <g>
 <path
 d={`M${hillPeakX} ${hillPeakY} L${hillBaseRight} ${groundY} L${targetX} ${groundY} L${targetX} ${targetY} Z`}
 className="fill-status-danger/10"
 />
 <text
 x={(hillPeakX + targetX) / 2}
 y={(hillPeakY + groundY) / 2 + 2}
 textAnchor="middle"
 className="fill-status-danger font-display font-bold"
 fontSize="2.6"
 paintOrder="stroke"
 stroke="#ffffff"
 strokeWidth="0.8"
 strokeLinejoin="round"
 >
 שטח מת
 </text>
 </g>
 )}
 </svg>
 </div>
 );
}

function Slider({
 label,
 hint,
 value,
 setValue,
 min,
 max,
 unit,
}: {
 label: string;
 hint: string;
 value: number;
 setValue: (v: number) => void;
 min: number;
 max: number;
 unit: string;
}) {
 return (
 <div>
 <div className="flex items-baseline justify-between mb-1">
 <div>
 <div className="text-xs font-medium">{label}</div>
 <div className="text-[10px] text-fg-dim">{hint}</div>
 </div>
 <div className="text-sm font-display font-bold text-accent tabular-nums">
 {value} <span className="text-[10px] text-fg-muted">{unit}</span>
 </div>
 </div>
 <input
 type="range"
 min={min}
 max={max}
 step={1}
 value={value}
 onChange={(e) => setValue(Number(e.target.value))}
 className="w-full accent-accent"
 aria-label={label}
 />
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