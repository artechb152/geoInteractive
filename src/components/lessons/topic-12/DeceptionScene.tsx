'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Target = 'real' | 'decoy' | 'hidden';
type TargetData = {
id: Target;
label: string;
english: string;
optical: string;
sar: string;
ir: string;
conclusion: string;
isReal: boolean;
};
const TARGETS: TargetData[] = [
 {
id: 'real',
label: 'טנק אמיתי בשטח פתוח',
english: 'Real Tank · Open Terrain',
optical: '✓ נראה. סוג זוהה: T-72. צבעו צבא רוסי.',
sar: '✓ החזר מתכת חזק. תואם גודל וצורה של טנק.',
ir: '✓ חתימת חום ממנוע. ~60°C.',
conclusion: 'כל הסנסורים מאשרים. <strong className="text-status-ok">מטרה אמיתית — אפשר לתקוף.</strong>',
isReal: true,
 },
 {
id: 'decoy',
label: 'טנק מתנפח עם גוף חימום',
english: 'Inflatable Decoy + Heater',
optical: '✓ נראה כמו טנק (אמיתי-למראה).',
sar: '✗ אין החזר מתכת. רק"מסה רכה".',
ir: '✓ חתימת חום (גוף חימום מותקן).',
conclusion: 'הפער בין IMINT/IR ל-SAR חושף את ההונאה. <strong className="text-status-warn">דמה — לא לתקוף!</strong>',
isReal: false,
 },
 {
id: 'hidden',
label: 'טנק אמיתי מתחת לרשת הסוואה',
english: 'Real Tank · Camouflage Net',
optical: '✗ לא נראה — רשת מסתירה.',
sar: '✓ החזר מתכת חזק עובר דרך הרשת!',
ir: '✗ הרשת מקררת חתימה.',
conclusion: 'SAR חודר את ההסוואה. <strong className="text-accent">מטרה אמיתית — חבויה היטב, אבל גלויה ל-SAR.</strong>',
isReal: true,
 },
];
const OSINT_TOOLS = [
 {
label: 'Planet Labs',
icon: 'satellite' as IconName,
desc: 'חברה אמריקאית עם ~200 ננו-לוויינים. תמונה יומית של כל היבשה.',
public: '~3 מ׳ רזולוציה זמין לציבור',
 },
 {
label: 'Maxar / WorldView',
icon: 'satellite' as IconName,
desc: 'לוויינים גדולים עם רזולוציה סופר-גבוהה. מתועד טנקים רוסיים באוקראינה לפני הפלישה.',
public: '30 ס"מ — בתשלום',
 },
 {
label: 'OpenStreetMap',
icon: 'globe' as IconName,
desc: 'מפה גלובלית פתוחה. כולל מבני צבא רגישים שהומפו על ידי מתנדבים.',
public: 'חינם · עדכון שוטף',
 },
 {
label: 'Sentinel Hub (ESA)',
icon: 'eye' as IconName,
desc: 'תמונות לוויין חינמיות של האיחוד האירופי. גם SAR פתוח לציבור.',
public: 'חינם · 5–10 מ׳',
 },
];
export function DeceptionScene() {
const [target, setTarget] = useState<Target>('real');
const [sensorMode, setSensorMode] = useState<'optical' | 'sar' | 'fusion'>('optical');
const meta = TARGETS.find((t) => t.id === target)!;
return (
 <section id="scene-deception" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="12.3"
eyebrow="OSINT והונאה"
title={
 <>
 <span className="gradient-text">SAR ראה</span> מה שהעין פספסה
 </>
 }
intro="כתגובה ליכולות איסוף עצומות, צבאות בונים הונאות מתוחכמות. טנק מתנפח עם גוף חימום. מחנה אוהלים ריק. אבל הצלבת סנסורים חושפת את האמת — אם יודעים מה לחפש."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">העיקרון:</strong> כל סנסור רואה <strong className="text-fg">חלק אחר של המציאות</strong>. הונאה טובה מטעה סנסור אחד — אבל כמעט בלתי אפשרי להטעות את כולם בו זמנית.
 <strong className="text-fg block mt-1.5">תפקיד המנתח:</strong> לחפש את <strong className="text-fg">הפער</strong> בין המקורות. אם המצלמה רואה טנק וה-SAR לא — כנראה דמה. אם רק SAR רואה — כנראה אמיתי תחת הסוואה.
 </div>
 </div>
 </div>

 {/* Target + sensor selector */}
 <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 תצוגת סנסור · {sensorMode === 'optical' ? 'אופטי בלבד' : sensorMode === 'sar' ? 'SAR בלבד' : 'הצלבת מקורות'}
 </div>
 <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
 {(['optical', 'sar', 'fusion'] as const).map((m) => (
 <button
key={m}
onClick={() => setSensorMode(m)}
className={cn(
 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
sensorMode === m ? 'bg-accent text-bg shadow-glow' : 'text-fg-muted hover:text-fg'
 )}
 >
 {m === 'optical' ? 'אופטי' : m === 'sar' ? 'SAR' : 'הצלבה'}
 </button>
 ))}
 </div>
 </div>

 <SensorView target={target} mode={sensorMode} />
 </div>

 {/* Target selector */}
 <div className="grid grid-cols-3 gap-2 mb-4">
 {TARGETS.map((t) => {
const isActive = target === t.id;
return (
 <button
key={t.id}
onClick={() => setTarget(t.id)}
className={cn(
 'surface p-3 text-right transition-all rounded-xl',
isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
 )}
 >
 <div className={cn('font-display font-bold text-sm leading-tight', isActive && 'text-accent')}>
 {t.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim mt-0.5">{t.english}</div>
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
className="surface-elevated p-5 rounded-2xl mb-12"
 >
 <div className="grid sm:grid-cols-3 gap-3 mb-4">
 <div className="surface p-3 rounded-lg">
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider flex items-center gap-1.5">
 <Icon name="eye" size={11} /> אופטי
 </div>
 <p className="text-xs text-fg leading-relaxed">{meta.optical}</p>
 </div>
 <div className="surface p-3 rounded-lg">
 <div className="text-sm font-display font-semibold text-accent-hot mb-1 tracking-wider flex items-center gap-1.5">
 <Icon name="bolt" size={11} /> SAR
 </div>
 <p className="text-xs text-fg leading-relaxed">{meta.sar}</p>
 </div>
 <div className="surface p-3 rounded-lg">
 <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider flex items-center gap-1.5">
 <Icon name="fuel" size={11} /> IR תרמי
 </div>
 <p className="text-xs text-fg leading-relaxed">{meta.ir}</p>
 </div>
 </div>

 <div className={cn(
 'p-4 rounded-lg border-2',
meta.isReal ? 'bg-status-ok/10 border-status-ok/40' : 'bg-status-warn/10 border-status-warn/40'
 )}>
 <div className={cn(
 'text-sm font-display font-semibold mb-1 tracking-wider flex items-center gap-1.5',
meta.isReal ? 'text-status-ok' : 'text-status-warn'
 )}>
 <Icon name={meta.isReal ? 'check' : 'mask'} size={11} strokeWidth={2.5} />
 מסקנה מבצעית
 </div>
 <p
className="text-sm text-fg leading-relaxed"
dangerouslySetInnerHTML={{ __html: meta.conclusion }}
 />
 </div>
 </motion.div>
 </AnimatePresence>

 <SoftDivider text="OSINT · המודיעין של כולם" />

 {/* OSINT explanation */}
 <div className="mb-6">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-status-warn/15 border border-status-warn/40 flex items-center justify-center shrink-0">
 <Icon name="megaphone" size={22} className="text-status-warn" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider">
OSINT — Open Source Intelligence
 </div>
 <h3 className="font-display font-bold text-lg mb-2 leading-tight">
 דמוקרטיזציה של מודיעין: יכולות שמורות למעצמות — היום זמינות לכולם
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 ב-2010 היה צריך לוויין צבאי כדי לדעת איפה טנק רוסי. <strong className="text-fg">היום</strong> חברות מסחריות (Planet, Maxar) משחררות תמונות ברזולוציה של עשרות סנטימטרים לכל דורש. בשילוב רשתות חברתיות (Twitter, Telegram, TikTok) ומפות פתוחות (OpenStreetMap), נוצר מצב שבו <strong className="text-fg">מיליציות, ארגוני טרור, ואפילו עיתונאים</strong> מחזיקים ביכולות מודיעין שפעם היו שמורות למעצמות בלבד.
 </p>
 </div>
 </div>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
 {OSINT_TOOLS.map((t, i) => (
 <motion.div
key={t.label}
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.06 }}
className="surface p-4 rounded-xl"
 >
 <div className="flex items-center gap-2 mb-2">
 <div className="size-9 rounded-lg bg-bg-accent border border-border flex items-center justify-center">
 <Icon name={t.icon} size={16} className="text-accent" />
 </div>
 <div className="font-display font-bold text-sm leading-tight">{t.label}</div>
 </div>
 <p className="text-xs text-fg-muted leading-relaxed mb-2">{t.desc}</p>
 <div className="text-[10px] font-mono text-accent">{t.public}</div>
 </motion.div>
 ))}
 </div>

 <SoftDivider text="3 הונאות קלאסיות" />

 {/* Deception techniques */}
 <div className="grid md:grid-cols-3 gap-3">
 {[
 {
label: 'מטרות דמה',
icon: 'mask' as IconName,
desc: 'טנקים מתנפחים, רכבים מקרטון, מבני דמה. לעיתים כוללים גופי חימום קטנים כדי להטעות סנסורים תרמיים.',
counter: 'SAR מזהה היעדר מתכת. הצלבה חושפת.',
color: 'text-status-warn',
border: 'border-r-status-warn',
bg: 'bg-status-warn/5',
 },
 {
label: 'הטעיה דמוגרפית',
icon: 'people' as IconName,
desc: 'מחנות אוהלים ריקים, רכבי תחבורה ריקים בשיירות. יוצר רושם של ריכוז כוחות שלא קיים.',
counter: 'תנועה אנושית בפועל נצפית במצלמות תרמיות לאורך זמן.',
color: 'text-accent-hot',
border: 'border-r-accent-hot',
bg: 'bg-accent-hot/5',
 },
 {
label: 'לוחמה אלקטרונית',
icon: 'bolt' as IconName,
desc: 'שיבוש GPS, זיוף מיקום, הזרקת אותות מזויפים לחיישנים. הטעיית מערכות הניווט והאיסוף של האויב.',
counter: 'אימות צולב עם מערכות לא-GPS (מצפן, ניווט אינרציאלי).',
color: 'text-accent-cool',
border: 'border-r-accent-cool',
bg: 'bg-accent-cool/5',
 },
 ].map((d, i) => (
 <motion.div
key={d.label}
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.08 }}
className={cn('surface-elevated p-5 rounded-2xl border-r-4', d.border, d.bg)}
 >
 <div className="flex items-center gap-2.5 mb-3">
 <div className={cn('size-11 rounded-xl flex items-center justify-center border-2 shrink-0', d.color.replace('text-', 'border-') + '/40', d.color.replace('text-', 'bg-') + '/10')}>
 <Icon name={d.icon} size={20} className={d.color} />
 </div>
 <div className={cn('font-display font-bold leading-tight', d.color)}>{d.label}</div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">{d.desc}</p>
 <div className="surface p-2.5 rounded-lg bg-bg-accent/30">
 <div className="text-sm font-display font-semibold text-status-ok mb-0.5 tracking-wider flex items-center gap-1.5">
 <Icon name="check" size={11} strokeWidth={2.5} /> נגד-הונאה
 </div>
 <p className="text-xs text-fg-muted leading-relaxed">{d.counter}</p>
 </div>
 </motion.div>
 ))}
 </div>
 </section>
 );
}
function SensorView({ target, mode }: { target: Target; mode: 'optical' | 'sar' | 'fusion' }) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="optical-bg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#dde6f0" />
 <stop offset="100%" stopColor="#e6ebf2" />
 </linearGradient>
 <linearGradient id="sar-bg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#1a1f2e" />
 <stop offset="100%" stopColor="#0c1218" />
 </linearGradient>
 </defs>

 {/* Background depends on mode */}
 {mode === 'optical' && <rect x="0" y="0" width="100" height="56" fill="url(#optical-bg)" />}
 {mode === 'sar' && <rect x="0" y="0" width="100" height="56" fill="url(#sar-bg)" />}
 {mode === 'fusion' && (
 <>
 <rect x="0" y="0" width="50" height="56" fill="url(#optical-bg)" />
 <rect x="50" y="0" width="50" height="56" fill="url(#sar-bg)" />
 <line x1="50" y1="0" x2="50" y2="56" className="stroke-accent" strokeWidth="0.3" strokeDasharray="1 0.6" />
 <text x="25" y="6" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 אופטי
 </text>
 <text x="75" y="6" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#0c1218" strokeWidth="0.8" strokeLinejoin="round">
SAR
 </text>
 </>
 )}

 {/* Terrain */}
 <path
d="M0 42 L25 38 L50 42 L75 38 L100 42 L100 56 L0 56 Z"
className={mode === 'sar' || mode === 'fusion' ? 'fill-fg/20' : 'fill-terrain-sand/30'}
 />

 {/* Target rendering */}
 {target === 'real' && (
 <>
 {/* Real tank — both views show it */}
 {(mode === 'optical' || mode === 'fusion') && (
 <g transform="translate(35 35)">
 <rect x="-4" y="-2.5" width="8" height="2.5" rx="0.4" className="fill-terrain-olive" />
 <rect x="-1.5" y="-4" width="3" height="1.5" rx="0.3" className="fill-terrain-olive" />
 <rect x="1.5" y="-3.7" width="3" height="0.5" className="fill-terrain-olive" />
 <rect x="-4.5" y="-1.5" width="9" height="1" rx="0.5" className="fill-terrain-olive/80" />
 <text x="0" y="5" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
 ✓ טנק T-72
 </text>
 </g>
 )}
 {(mode === 'sar' || mode === 'fusion') && (
 <g transform={`translate(${mode === 'fusion' ? 75 : 65} 35)`}>
 {/* SAR bright return on metal */}
 <rect x="-4" y="-2.5" width="8" height="2.5" rx="0.4" className="fill-accent-hot" opacity="0.85" />
 <rect x="-1.5" y="-4" width="3" height="1.5" rx="0.3" className="fill-accent-hot" opacity="0.95" />
 <text x="0" y="5" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#0c1218" strokeWidth="0.7" strokeLinejoin="round">
 ✓ החזר מתכת
 </text>
 </g>
 )}
 </>
 )}

 {target === 'decoy' && (
 <>
 {(mode === 'optical' || mode === 'fusion') && (
 <g transform="translate(35 35)">
 {/* Optical: looks like a tank */}
 <rect x="-4" y="-2.5" width="8" height="2.5" rx="0.4" className="fill-terrain-olive/85" />
 <rect x="-1.5" y="-4" width="3" height="1.5" rx="0.3" className="fill-terrain-olive/85" />
 <rect x="1.5" y="-3.7" width="3" height="0.5" className="fill-terrain-olive/85" />
 <text x="0" y="5" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
 ✓ נראה כמו טנק
 </text>
 </g>
 )}
 {(mode === 'sar' || mode === 'fusion') && (
 <g transform={`translate(${mode === 'fusion' ? 75 : 65} 35)`}>
 {/* SAR: NO return — only diffuse */}
 <ellipse cx="0" cy="-1.5" rx="4" ry="2" fill="none" className="stroke-fg-dim" strokeWidth="0.4" strokeDasharray="0.5 0.4" opacity="0.6" />
 <text x="0" y="-5" textAnchor="middle" className="fill-status-warn font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#0c1218" strokeWidth="0.7" strokeLinejoin="round">
 ✗ אין מתכת!
 </text>
 <text x="0" y="6" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="1.6" paintOrder="stroke" stroke="#0c1218" strokeWidth="0.6" strokeLinejoin="round">
 ← הונאה!
 </text>
 </g>
 )}
 </>
 )}

 {target === 'hidden' && (
 <>
 {(mode === 'optical' || mode === 'fusion') && (
 <g transform="translate(35 35)">
 {/* Optical: vegetation cover only */}
 <ellipse cx="0" cy="-1.5" rx="6" ry="2.5" className="fill-terrain-olive/50" />
 <ellipse cx="-2" cy="-2.5" rx="2" ry="1" className="fill-terrain-olive/40" />
 <ellipse cx="2" cy="-2.3" rx="2.5" ry="1" className="fill-terrain-olive/40" />
 <text x="0" y="5" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
 צמחייה/הסוואה
 </text>
 </g>
 )}
 {(mode === 'sar' || mode === 'fusion') && (
 <g transform={`translate(${mode === 'fusion' ? 75 : 65} 35)`}>
 {/* SAR: penetrates camo, sees metal */}
 <rect x="-4" y="-2.5" width="8" height="2.5" rx="0.4" className="fill-accent-hot" opacity="0.9" />
 <rect x="-1.5" y="-4" width="3" height="1.5" rx="0.3" className="fill-accent-hot" opacity="0.95" />
 <circle cx="0" cy="-1.5" r="6" fill="none" className="stroke-accent-hot" strokeWidth="0.3" strokeDasharray="0.5 0.4" opacity="0.5" />
 <text x="0" y="-6" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#0c1218" strokeWidth="0.7" strokeLinejoin="round">
 ✓ SAR חודר!
 </text>
 </g>
 )}
 </>
 )}

 {/* Mode label */}
 {mode !== 'fusion' && (
 <text x="50" y="6" textAnchor="middle" className={cn('font-display font-bold font-bold', mode === 'optical' ? 'fill-accent' : 'fill-accent-hot')} fontSize="3" paintOrder="stroke" stroke={mode === 'optical' ? '#ffffff' : '#0c1218'} strokeWidth="1" strokeLinejoin="round">
 {mode === 'optical' ? '👁 תצוגה אופטית' : '📡 תצוגת SAR'}
 </text>
 )}

 {/* SAR scanline animation */}
 {(mode === 'sar' || mode === 'fusion') && (
 <motion.line
x1={mode === 'fusion' ? 50 : 0}
y1="0"
x2={mode === 'fusion' ? 50 : 0}
y2="56"
className="stroke-accent-hot"
strokeWidth="0.4"
opacity="0.5"
animate={{ x: mode === 'fusion' ? [50, 100, 50] : [0, 100, 0] }}
transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
 />
 )}
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
