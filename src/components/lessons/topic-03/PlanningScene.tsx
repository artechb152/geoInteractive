'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Checkpoint = {
id: string;
label: string;
feature: string;
icon: IconName;
};
const CHECKPOINTS: Checkpoint[] = [
 { id: '1', label: 'נקודה 1: יוצאים לדרך', feature: 'עוזבים את המבנים האחרונים בבסיס. לוקחים קשת חדה לכיוון מזרח ומחפשים את תחילת ערוץ הנחל.', icon: 'flag' },
 { id: '2', label: 'נקודה 2: עיקול הנחל', feature: 'מגיעים לסיבוב משמעותי בנחל. חוצים אותו לצד ימין ומטפסים בשיפוע מתון לכיוון צפון-מזרח.', icon: 'wave' },
 { id: '3', label: 'נקודה 3: אימות גובה', feature: 'עוקפים את הגבעה מצד שמאל (מערב). בשלב זה אתם אמורים לראות את תורן האנטנה בקו הרכס הרחוק.', icon: 'mountain' },
 { id: '4', label: 'נקודה 4: חציית ציר', feature: 'מגיעים לדרך עפר רחבה. חוצים אותה בזהירות וממשיכים בתוך חורשת העצים למשך 600 מטרים נוספים.', icon: 'truck' },
 { id: '5', label: 'היעד: נקודת הסיום', feature: 'הגעה לקרקע סלעית עם קבוצת עצי אורן בולטים. זהו היעד — מוודאים אימות אחרון ועוצרים.', icon: 'target' },
];
export function PlanningScene() {
return (
 <section id="scene-planning" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.2"
eyebrow="תכנון ציר ותנועה"
title={
 <>
 <span className="gradient-text">סיפור דרך</span> • התסריט שכותבים מראש
 </>
 }
intro="לפני שיוצאים לשטח, אנחנו בונים תוכנית מפורטת — מעין 'ספוילר' של מה שהעיניים שלכם אמורות לראות בכל קטע בדרך. ככה גם אם הלילה קשה והדרך מורכבת, אתם לא מאבדים את החוט."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">למה לכתוב את זה מראש?</strong>
 <br />
 בלילה, תחת לחץ או אחרי שעות של הליכה, המוח שלנו עובד פחות טוב. 'סיפור דרך' מוכן מראש מאפשר לכם לנווט על 'אוטומט' — פשוט לעקוב אחרי ההוראות של עצמכם מבלי להיתקע בחישובים מיותרים. זה ממש מציל חיים.
 </div>
 </div>
 </div>

 <RouteStoryBuilder />

 <div className="my-12">
 <PacingDemo />
 </div>

 <ConclusionCard />
 </section>
 );
}
function RouteStoryBuilder() {
const [active, setActive] = useState(0);
return (
 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch">
 <div className="space-y-3">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
 המסלול ב-5 נקודות אימות
 </div>
 {CHECKPOINTS.map((c, i) => {
const isActive = active === i;
const passed = active > i;
return (
 <motion.button
key={c.id}
onClick={() => setActive(i)}
whileHover={{ x: -3 }}
whileTap={{ scale: 0.98 }}
className={cn(
 'w-full surface p-4 text-right transition-all flex items-start gap-3 relative overflow-hidden',
isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong',
passed && !isActive && 'opacity-80'
 )}
 >
 {isActive && (
 <motion.span
layoutId="t3-route-bar"
className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
 />
 )}
 <span
className={cn(
 'size-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
isActive ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
 )}
 >
 {passed && !isActive ? (
 <Icon name="check" size={14} strokeWidth={2.5} />
 ) : (
 <span className="font-mono text-xs font-bold">{i + 1}</span>
 )}
 </span>
 <div className="flex-1 min-w-0 text-right">
 <div className={cn('text-sm font-medium leading-tight', isActive && 'text-accent')}>
 {c.label}
 </div>
 <div className="text-xs text-fg-muted mt-0.5 leading-relaxed">{c.feature}</div>
 </div>
 <Icon name={c.icon} size={18} className={cn('shrink-0 mt-0.5', isActive ? 'text-accent' : 'text-fg-dim')} />
 </motion.button>
 );
 })}
 </div>

 <div className="surface-elevated relative overflow-hidden">
 <RouteMap activeStep={active} />
 </div>
 </div>
 );
}
function RouteMap({ activeStep }: { activeStep: number }) {
 // 5 checkpoints positioned on a path
const POINTS = [
 { x: 12, y: 60 }, // start
 { x: 28, y: 50 }, // river bend
 { x: 48, y: 38 }, // hill
 { x: 68, y: 32 }, // road
 { x: 88, y: 22 }, // target
 ];
return (
 <div className="aspect-[4/3] relative">
 <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
 <rect x="0" y="0" width="100" height="75" className="fill-bg" />

 {/* Grid */}
 {Array.from({ length: 10 }).map((_, i) => (
 <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
 ))}
 {Array.from({ length: 8 }).map((_, i) => (
 <line key={'gy' + i} x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
 ))}

 {/* River (passes near point 2) */}
 <path d="M0 55 Q 28 50 50 55 T 100 60" fill="none" className="stroke-terrain-sky/60" strokeWidth="1.4" />

 {/* Hill (near point 3) */}
 <path d="M40 42 L48 28 L56 42 Z" className="fill-terrain-ridge/40 stroke-terrain-ridge/80" strokeWidth="0.3" />

 {/* Dirt road (near point 4) */}
 <path d="M55 35 Q 70 30 85 25" fill="none" className="stroke-terrain-sand/70" strokeWidth="0.7" strokeDasharray="1.5 0.8" />

 {/* Tower (near point 3) */}
 <line x1="44" y1="34" x2="44" y2="28" className="stroke-fg-muted" strokeWidth="0.4" />
 <circle cx="44" cy="28" r="0.6" className="fill-accent" />

 {/* Path connecting all points */}
 <motion.path
d={POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')}
fill="none"
className="stroke-accent/40"
strokeWidth="0.5"
strokeDasharray="1.2 1"
 />

 {/* Active leg highlight */}
 {activeStep > 0 && (
 <motion.path
initial={false}
d={POINTS.slice(0, activeStep + 1).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')}
fill="none"
className="stroke-accent"
strokeWidth="0.7"
 />
 )}

 {/* Checkpoints */}
 {POINTS.map((p, i) => {
const isActive = i === activeStep;
const isPassed = i < activeStep;
return (
 <g key={i}>
 {isActive && (
 <circle cx={p.x} cy={p.y} r="4" fill="none" className="stroke-accent">
 <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
 </circle>
 )}
 <circle
cx={p.x}
cy={p.y}
r="2"
className={cn(
isActive ? 'fill-accent' : isPassed ? 'fill-status-ok' : 'fill-bg-card stroke-border-strong'
 )}
strokeWidth={isActive || isPassed ? 0 : 0.4}
 />
 <text
x={p.x}
y={p.y - 3.5}
textAnchor="middle"
className={cn('text-[2.5px] font-display font-bold font-bold', isActive ? 'fill-accent' : isPassed ? 'fill-status-ok' : 'fill-fg-muted')}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
 {i === 4 ? 'B' : i + 1}
 </text>
 </g>
 );
 })}
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <span className="size-1.5 rounded-full bg-accent animate-pulse" />
 סיפור דרך · 5 נקודות אימות
 </div>
 </div>
 );
}
function PacingDemo() {
const [distance, setDistance] = useState(500);
const stepLength = 1.5; // אורך צמד צעדים ממוצע
const paces = Math.round(distance / stepLength);
return (
 <div className="surface-elevated p-6 sm:p-8">
 <h3 className="text-xl font-bold mb-4 text-center">ספירת צעדים — איך מודדים מרחק בלי GPS?</h3>
 <p className="text-sm text-fg-muted text-center mb-8 max-w-2xl mx-auto">
 השיטה הכי פשוטה והכי בטוחה: סופרים כמה 'צעדים כפולים' (כל פעם שרגל ימין פוגשת את הקרקע) אתם עושים.
 זהו 'מד המרחק' האנושי שלכם. גללו את הסרגל כדי לראות כמה צעדים תצטרכו לעשות.
 </p>

 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div className="space-y-6">
 <div className="flex justify-between items-end">
 <span className="text-xs font-mono text-fg-dim uppercase">מרחק שצריך לעבור:</span>
 <span className="text-4xl font-display font-bold text-accent">{distance} מ'</span>
 </div>
 <input
type="range"
min={50}
max={2000}
step={50}
value={distance}
onChange={(e) => setDistance(Number(e.target.value))}
className="w-full accent-accent"
aria-label="מרחק במטרים"
 />
 <div className="grid grid-cols-4 text-[10px] font-mono text-fg-dim">
 <span>50 מ'</span>
 <span className="text-center">500</span>
 <span className="text-center">1,000</span>
 <span className="text-left">2,000</span>
 </div>
 </div>

 <div className="surface p-6 rounded-2xl border-2 border-accent/20 flex flex-col items-center justify-center bg-accent/5">
 <div className="text-[10px] font-mono text-accent mb-2 uppercase tracking-widest">כמות צמדי צעדים משוערת</div>
 <div className="text-6xl font-display font-bold text-accent tabular-nums mb-2">{paces}</div>
 <div className="text-sm font-bold text-fg">זוגות צעדים</div>
 <div className="text-[10px] text-fg-dim mt-4">חישוב: {distance} מ' ÷ 1.5 מ' (אורך צמד צעדים) = {paces}</div>
 </div>
 </div>

 <div className="mt-8 grid sm:grid-cols-2 gap-4">
 <div className="surface p-4 flex gap-3 items-start">
 <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 font-bold">1</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">מדידה מראש:</strong> כל אחד צועד קצת אחרת. תמדדו כמה צעדים כפולים לוקח לכם לעבור 100 מטרים במישור.
 </p>
 </div>
 <div className="surface p-4 flex gap-3 items-start">
 <div className="size-8 rounded-lg bg-status-warn/10 flex items-center justify-center text-status-warn shrink-0 font-bold">!</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">פקטור שטח:</strong> בעלייה הצעד מתקצר (תספרו יותר), בירידה הוא מתארך. נווט מנוסה יודע 'לפצות' על זה בספירה.
 </p>
 </div>
 </div>
 </div>
 );
}
function ConclusionCard() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent-cool shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider">
 סיכום התכנון
 </div>
 <p className="text-fg leading-relaxed text-pretty">
 תכנון ציר הוא לא רק לסמן קו על מפה. זה לבנות <strong className="text-fg">סיפור</strong> שתוכלו לעקוב אחריו תוך כדי תנועה, ולאמת אותו בעזרת <strong className="text-fg">ספירת צעדים</strong> מדויקת. ככה — גם אם פתאום אין GPS, או שחשוך לגמרי — המסלול עצמו מנחה אתכם הביתה.
 </p>
 </div>
 </motion.div>
 );
}
