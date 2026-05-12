'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Pillar = {
id: string;
label: string;
english: string;
icon: IconName;
desc: string;
modern: string;
color: string;
bg: string;
border: string;
};
const PILLARS: Pillar[] = [
 {
id: 'fleet',
label: 'צי קרבי חזק',
english: 'Strong Battle Fleet',
icon: 'ship',
desc: 'מהן טען שמדינה ימית חייבת צי שיכול לנצח בקרב גלוי בים פתוח — לא רק להגן על חופים.',
modern: 'הצי האמריקאי עם 11 נושאות מטוסים מסתובב בכל האוקיינוסים. צי סין צמח מצי חוף לצי גלובלי תוך 20 שנה.',
color: 'text-accent',
bg: 'bg-accent/10',
border: 'border-accent/40',
 },
 {
id: 'bases',
label: 'בסיסים קדמיים',
english: 'Forward Bases',
icon: 'port',
desc: 'בסיסי תדלוק ותחזוקה לאורך נתיבי השיט. אי אפשר להישאר בים בלי תחנות.',
modern: 'ארה"ב: Diego Garcia, Yokosuka, בחריין, נאפולי. סין: ג\'יבוטי, חמבנטוטה (סרי לנקה), Belt and Road.',
color: 'text-accent-cool',
bg: 'bg-accent-cool/10',
border: 'border-accent-cool/40',
 },
 {
id: 'sloc',
label: 'אבטחת SLOC',
english: 'Sea Lines of Communication',
icon: 'compass',
desc: '"נתיבי תקשורת ימיים" — הדרכים שעוברות בים. שמירה עליהם זה תפקיד הצי המרכזי.',
modern: 'משימת הצי החמישי בבחריין: שמירה על הורמוז. כוחות משימה רב-לאומיים סביב בב אל-מנדב כנגד החות\'ים.',
color: 'text-status-ok',
bg: 'bg-status-ok/10',
border: 'border-status-ok/40',
 },
 {
id: 'alliances',
label: 'בריתות חוף',
english: 'Coastal Alliances',
icon: 'flag',
desc: 'מדינות חוף שותפות שמספקות גישה לנמלים, מים טריטוריאליים ומידע.',
modern: 'NATO, AUKUS (אוסטרליה-בריטניה-ארה"ב), Quad (יפן-הודו-אוסטרליה-ארה"ב). כל ברית = שליטה בים אזורי.',
color: 'text-accent-hot',
bg: 'bg-accent-hot/10',
border: 'border-accent-hot/40',
 },
];
type Power = {
id: 'us' | 'china';
label: string;
english: string;
color: string;
bases: { x: number; y: number; name: string }[];
fleets: { x: number; y: number }[];
};
const POWERS: Power[] = [
 {
id: 'us',
label: 'ארה"ב',
english: 'United States',
color: 'accent-cool',
bases: [
 { x: 22, y: 32, name: 'Norfolk' },
 { x: 14, y: 36, name: 'San Diego' },
 { x: 50, y: 28, name: 'Naples' },
 { x: 56, y: 38, name: 'Bahrain' },
 { x: 78, y: 38, name: 'Yokosuka' },
 { x: 70, y: 50, name: 'Diego Garcia' },
 ],
fleets: [
 { x: 30, y: 40 }, // Atlantic
 { x: 55, y: 44 }, // Indian Ocean / Med
 { x: 75, y: 42 }, // Asia
 ],
 },
 {
id: 'china',
label: 'סין',
english: 'China',
color: 'accent-hot',
bases: [
 { x: 76, y: 36, name: 'Hong Kong' },
 { x: 56, y: 46, name: 'Djibouti' },
 { x: 71, y: 48, name: 'Hambantota' },
 { x: 77, y: 42, name: 'Subi Reef' },
 ],
fleets: [
 { x: 78, y: 40 }, // South China Sea
 { x: 65, y: 46 }, // Indian Ocean
 ],
 },
];
export function MahanScene() {
const [activePower, setActivePower] = useState<'both' | 'us' | 'china'>('both');
const [activePillar, setActivePillar] = useState<string>('fleet');
const meta = PILLARS.find((p) => p.id === activePillar)!;
return (
 <section id="scene-mahan" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="09.3"
eyebrow="דוקטרינת מהן ו-SLOC"
title={
 <>
 <span className="gradient-text">דוקטרינה בת 130 שנה</span>. שעדיין מנהלת את העולם.
 </>
 }
intro="ב-1890 כתב אסטרטג ימי אמריקאי בשם אלפרד תייר מהן ספר שעיצב את כל המאה ה-20 ועדיין מעצב את המאה ה-21: 'The Influence of Sea Power upon History'. הרעיון פשוט: שולט בים — שולט בעולם."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">SLOC (Sea Lines of Communication)</strong> — נתיבי התקשורת והמסחר הימיים. מהן טען שמדינה ימית חזקה חייבת:
 (1) צי קרבי שיכול לנצח בים פתוח, (2) בסיסים קדמיים, (3) הגנה על SLOC, ו-(4) בריתות עם מדינות חוף.
 <strong className="text-fg block mt-1.5">ארה"ב</strong> בנתה את הצי שלה במאה ה-20 בדיוק לפי המתכון הזה. <strong className="text-fg">סין</strong> עושה אותו דבר כרגע.
 </div>
 </div>
 </div>

 {/* 4 Pillars of Mahan */}
 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
 {PILLARS.map((p) => {
const isActive = activePillar === p.id;
return (
 <button
key={p.id}
onClick={() => setActivePillar(p.id)}
className={cn(
 'surface p-4 text-right transition-all rounded-xl flex flex-col items-start gap-2',
isActive ? `${p.border} shadow-glow ${p.bg}` : 'hover:border-border-strong'
 )}
 >
 <div className={cn('size-10 rounded-xl flex items-center justify-center border-2', p.border, p.bg)}>
 <Icon name={p.icon} size={18} className={p.color} />
 </div>
 <div className="flex-1">
 <div className={cn('font-display font-bold leading-tight', isActive && p.color)}>{p.label}</div>
 <div className="text-[10px] font-mono text-fg-dim mt-0.5">{p.english}</div>
 </div>
 </button>
 );
 })}
 </div>

 <AnimatePresence mode="wait">
 <motion.div
key={meta.id}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className={cn('surface-elevated p-5 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
 >
 <div className="grid md:grid-cols-2 gap-4">
 <div>
 <div className={cn('text-sm font-display font-semibold mb-1.5 tracking-wider', meta.color)}>
 העיקרון של מהן
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.desc}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-accent-hover mb-1.5 tracking-wider">היישום המודרני</div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.modern}</p>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>

 <SoftDivider text="המאבק על הים · ארה״ב מול סין" />

 {/* Power projection map */}
 <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 השלכה ימית גלובלית · {activePower === 'both' ? 'שתי המעצמות' : activePower === 'us' ? 'ארה"ב' : 'סין'}
 </div>
 <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
 {(['both', 'us', 'china'] as const).map((p) => (
 <button
key={p}
onClick={() => setActivePower(p)}
className={cn(
 'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
activePower === p ? 'bg-accent text-bg shadow-glow' : 'text-fg-muted hover:text-fg'
 )}
 >
 {p === 'both' ? 'הצג שניהם' : p === 'us' ? 'ארה"ב' : 'סין'}
 </button>
 ))}
 </div>
 </div>

 <PowerMap powers={POWERS} activePower={activePower} />

 <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-fg-dim flex-wrap">
 <span className="flex items-center gap-1">
 <span className="size-2 bg-accent-cool rounded-full" /> ארה"ב — בסיסים וצי
 </span>
 <span className="flex items-center gap-1">
 <span className="size-2 bg-accent-hot rounded-full" /> סין — בסיסים וצי
 </span>
 <span className="flex items-center gap-1">
 <span className="size-2 bg-accent rounded-sm" /> SLOC קריטי
 </span>
 </div>
 </div>

 {/* Conclusion */}
 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="spark" size={22} className="text-accent" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
 שורה תחתונה לדור שלך
 </div>
 <h3 className="font-display font-bold text-lg mb-2 leading-tight">
 העולם של 2050 ייקבע במים, לא ביבשה
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 סין משקיעה <strong className="text-fg">$1 טריליון</strong> ב-Belt and Road כדי לקנות נמלים בכל אסיה ואפריקה. ארה"ב מקימה את AUKUS עם בריטניה ואוסטרליה כדי לאזן.
 ההודים בונים צי. הים האדום הופך לזירה פעילה.
 <strong className="text-fg block mt-1.5">ההגדרה של מהן מ-1890 עדיין רלוונטית:</strong> מי ששולט בנתיבי הים — שולט במסחר. מי ששולט במסחר — שולט בכלכלה. מי ששולט בכלכלה — שולט באסטרטגיה.
 במאה ה-21 זה רק מתחזק.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function PowerMap({
powers,
activePower,
}: {
powers: Power[];
activePower: 'both' | 'us' | 'china';
}) {
const sloc = [
 'M30 40 Q 40 38 50 38 Q 60 38 70 40',
 'M50 36 Q 55 40 60 42 Q 65 44 72 48',
 'M76 38 Q 72 42 70 48 Q 68 52 82 52',
 ];
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="ocean-power" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#dde6f0" />
 <stop offset="100%" stopColor="#cbd5e1" />
 </linearGradient>
 </defs>

 <rect x="0" y="0" width="100" height="56" fill="url(#ocean-power)" />

 {/* Continents (simplified, same as ChokepointsScene) */}
 <path d="M5 18 L18 14 L26 22 L24 32 L18 38 L10 42 L5 38 L4 28 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M22 38 L28 38 L30 46 L26 54 L24 54 L21 46 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M44 18 L52 14 L56 18 L54 26 L48 30 L42 28 L42 22 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M46 30 L54 28 L58 32 L60 42 L56 50 L50 52 L46 48 L44 38 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M56 22 L70 20 L82 22 L88 28 L86 36 L80 40 L72 36 L64 32 L58 32 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M74 40 L82 42 L84 48 L80 52 L74 50 L72 44 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
 <path d="M82 50 L90 50 L92 54 L86 54 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />

 {/* SLOCs */}
 {sloc.map((d, i) => (
 <path
key={i}
d={d}
fill="none"
className="stroke-accent"
strokeWidth="0.35"
strokeDasharray="1.5 1"
opacity="0.55"
 />
 ))}

 {/* Power assets */}
 {powers.map((power) => {
const isVisible = activePower === 'both' || activePower === power.id;
if (!isVisible) return null;
return (
 <g key={power.id}>
 {/* Bases */}
 {power.bases.map((b, i) => (
 <g key={`${power.id}-base-${i}`}>
 <rect
x={b.x - 1}
y={b.y - 1}
width="2"
height="2"
className={cn(
power.color === 'accent-cool' ? 'fill-accent-cool' : 'fill-accent-hot'
 )}
stroke="#ffffff"
strokeWidth="0.3"
 />
 <text
x={b.x}
y={b.y - 2}
textAnchor="middle"
className={cn(
power.color === 'accent-cool' ? 'fill-accent-cool' : 'fill-accent-hot',
 'font-display font-bold'
 )}
fontSize="1.4"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.6"
strokeLinejoin="round"
 >
 {b.name}
 </text>
 </g>
 ))}

 {/* Fleets — larger circles with radiating"influence" */}
 {power.fleets.map((f, i) => (
 <g key={`${power.id}-fleet-${i}`}>
 <circle
cx={f.x}
cy={f.y}
r="8"
fill="none"
className={cn(
power.color === 'accent-cool' ? 'stroke-accent-cool' : 'stroke-accent-hot'
 )}
strokeWidth="0.3"
strokeDasharray="0.8 0.6"
opacity="0.3"
 />
 <circle
cx={f.x}
cy={f.y}
r="2.4"
className={cn(
power.color === 'accent-cool' ? 'fill-accent-cool/50 stroke-accent-cool' : 'fill-accent-hot/50 stroke-accent-hot'
 )}
strokeWidth="0.4"
 />
 <circle
cx={f.x}
cy={f.y}
r="0.9"
className={cn(
power.color === 'accent-cool' ? 'fill-accent-cool' : 'fill-accent-hot'
 )}
 />
 </g>
 ))}
 </g>
 );
 })}

 {/* Animated traffic blip */}
 <motion.circle
r="0.6"
className="fill-accent"
animate={{ offsetDistance: ['0%', '100%'] }}
transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
style={{
offsetPath: 'path("M30 40 Q 40 38 50 38 Q 60 38 70 40")',
 }}
 />
 </svg>
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
