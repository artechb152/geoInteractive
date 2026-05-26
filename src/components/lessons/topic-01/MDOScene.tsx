'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Domain = {
id: string;
label: string;
english: string;
icon: IconName;
weakness: string;
strength: string;
 // Position around the central sphere
angle: number; // degrees
};
const DOMAINS: Domain[] = [
 {
id: 'land', label: 'יבשה', english: 'Land', icon: 'mountain',
strength: 'מגפיים על הקרקע: הדרך היחידה להכריע באמת. רק חיילים יכולים להיכנס פיזית, לטהר מבנים, להסתכל לאויב בעיניים ולהחזיק בשטח.',
weakness: 'בלי כוח קרקעי הכל וירטואלי: אפשר להפציץ ולצלם מלמעלה כמה שרוצים, אבל בלי חיילים על הקרקע אי אפשר באמת לכבוש כלום.',
angle: -90,
 },
 {
id: 'air', label: 'אוויר', english: 'Air', icon: 'plane',
strength: 'האגרוף מהשמיים: מטוסי קרב ורחפנים שמחסלים מטרות בשניות, מחפים על החיילים מלמעלה ותוקפים עמוק בשטח האויב.',
weakness: 'בלי הגנה אווירית השמיים פתוחים: החיילים למטה חשופים לחלוטין להפצצות, ואין מי שיעזור להם להשמיד איומים מרחוק.',
angle: -18,
 },
 {
id: 'sea', label: 'ים', english: 'Sea', icon: 'ship',
strength: 'העורק הפתוח: ספינות קרב וצוללות שמגנות על החופים, מאפשרות לתקוף בהפתעה, ודואגות שאספקת נשק ודלק תמשיך לזרום.',
weakness: 'בלי שליטה בים המדינה במצור: אוניות מסע ואספקה לא מגיעות (קריטי במלחמה ארוכה), והחופים פרוצים לגמרי לפלישה.',
angle: 54,
 },
 {
id: 'space', label: 'חלל', english: 'Space', icon: 'satellite',
strength: 'העיניים של הצבא: לוויינים שנותנים ניווט GPS מדויק לכל פגז, משדרים תמונות חיות של האויב ושומרים על קשר בין כולם.',
weakness: 'בלי לוויינים הצבא עיוור וחירש: ה-GPS קורס (הטילים מפספסים והחיילים הולכים לאיבוד), ומערכות התקשורת נופלות.',
angle: 126,
 },
 {
id: 'cyber', label: 'סייבר', english: 'Cyber', icon: 'bolt',
strength: 'הנשק השקוף: היכולת לשתק את האויב בלי לירות כדור אחד! לפרוץ לו למכשירי הקשר, לעוור לו את המכ"ם או לכבות לו את החשמל.',
weakness: 'בלי חומת סייבר נהיה חשופים לגמרי: האקרים יוכלו לזייף מטרות לחיילים, לנתק קשר ולהפיל לנו תשתיות (חשמל, מים, בנקים).',
angle: 198,
 },
];
export function MDOScene() {
const [active, setActive] = useState<Set<string>>(new Set(DOMAINS.map((d) => d.id)));
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
 <section id="scene-mdo" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="01.2"
eyebrow="לחימה בכל הממדים יחד · MDO"
title={
          <>
          המערכה המודרנית: שדה הקרב כבר מזמן לא מוגבל ל<span className="gradient-text">קרקע</span>
          </>
        }intro='פעם צבאות נלחמו בשדה קרב שטוח, פנים מול פנים. היום מלחמה מזכירה משחק רשת מורכב שמתנהל ב-5 זירות במקביל. לחצו על כל זירה בפנטגון כדי"לכבות" אותה, ותראו איך כל הצבא שלכם מאבד כוח.'
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">מה זה MDO?</strong>{' '}
 ראשי תיבות של <span className="font-mono text-accent-cool">Multi-Domain Operations</span> (מבצעים רב-ממדיים).
 במקום שחיל האוויר יילחם לבד והשריון לבד – הכל קורה ביחד. כל 5 הממדים עובדים מסונכרנים באותה שנייה בדיוק.
 זה"המולטי-טאסקינג" שבלעדיו שום צבא לא יכול לנצח היום.
 </div>
 </div>
 </div>

 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
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
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-status-warn tracking-wider">
 <Icon name="spark" size={12} />
 מה כובה — ומה זה אומר
 </div>
 <ul className="space-y-2.5 text-sm">
 {missing.map((d) => (
 <li key={d.id} className="flex gap-2.5">
 <Icon name={d.icon} size={16} className="text-fg-dim shrink-0 mt-0.5" />
 <div>
 <strong className="text-fg">{d.label}:</strong>{' '}
 <span className="text-fg-muted">{d.weakness}</span>
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
className="surface p-5 text-sm text-fg-muted"
 >
 כיבית את כל החמישה — הצבא שותק לחלוטין. אי אפשר לזוז, אי אפשר לראות, אי אפשר לדבר. הפעל לפחות ממד אחד כדי שהכוח יתחיל לפעול שוב.
 </motion.div>
 )}

 {allOn && (
 <motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="surface-elevated p-5 flex gap-3 items-start"
 >
 <Icon name="shield" size={20} className="text-accent shrink-0 mt-0.5" />
 <div className="text-sm">
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">המצב האידיאלי ·"בועה" סביב האויב</div>
 <p className="text-fg-muted leading-relaxed">
 כשכל החמישה דולקים יחד, הצבא שלנו יוצר סביב האויב מעין <strong className="text-fg">בועה הרמטית</strong> —
 כלומר אזור שממנו הוא לא יכול לנוע, לא יכול לראות מה קורה, ולא יכול לתקשר עם הכוחות שלו.
 הוא בעצם <strong className="text-fg">משותק</strong> — וכל פעולה שינסה — נחשפת ונחסמת לפני שהתחילה.
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 <div className="surface-elevated p-6 sm:p-8 relative overflow-hidden">
 <div aria-hidden className="absolute inset-0 topo-bg opacity-20 pointer-events-none" />
 <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-cool/5 pointer-events-none" />
 <div className="relative">
 <div className="flex items-center justify-between mb-4">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 לחץ על כל ממד כדי לכבות / להפעיל
 </div>
 <button
onClick={() => setActive(new Set(DOMAINS.map((d) => d.id)))}
className="text-xs font-mono text-fg-dim hover:text-accent transition-colors flex items-center gap-1"
 >
 <Icon name="check" size={10} strokeWidth={2.5} />
 הפעל הכל
 </button>
 </div>
 <SuperioritySphere domains={DOMAINS} active={active} onToggle={toggle} />
 </div>
 </div>
 </div>

 <RealWorldExamples />

 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="mt-6 surface p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
 המסקנה: החוליה החלשה
 </div>
 <p className="text-fg leading-relaxed text-pretty">
אי אפשר לנצח מלחמה היום רק עם הטנקים הכי טובים או חיל האוויר הכי חזק. מספיק שממד אחד נופל – וכל הצבא קורס איתו. צבא חכם מתכנן מכה שמשלבת את כל הממדים יחד, ובמקביל דואג"לנתק" לאויב את החיבורים שלו כדי לשתק אותו.
 </p>
 </div>
 </motion.div>
 </section>
 );
}
function SuperioritySphere({
domains,
active,
onToggle,
}: {
domains: Domain[];
active: Set<string>;
onToggle: (id: string) => void;
}) {
const allOn = active.size === domains.length;
const radius = 38;
return (
 <div className="relative aspect-square max-w-md mx-auto">
 <svg viewBox="-50 -50 100 100" className="w-full h-full">

 {/* Pulse rings when allOn — colourless motion, identical timing to
     the original design. Uses the central-sphere outline colour so
     they read as the sphere "breathing" rather than separate FX. */}
 {allOn && (
 <>
 <circle cx="0" cy="0" r="22" fill="none" className="stroke-accent" strokeWidth="0.4" opacity="0.5">
 <animate attributeName="r" values="20;42;20" dur="3.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.6;0;0.6" dur="3.5s" repeatCount="indefinite" />
 </circle>
 <circle cx="0" cy="0" r="22" fill="none" className="stroke-accent" strokeWidth="0.4" opacity="0.5">
 <animate attributeName="r" values="20;42;20" dur="3.5s" begin="1s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.6;0;0.6" dur="3.5s" begin="1s" repeatCount="indefinite" />
 </circle>
 </>
 )}

 {/* Central sphere — outline only, no fill. Solid when allOn,
     dashed when partial. */}
 <circle cx="0" cy="0" r="22" fill="none" className={cn('transition-colors', allOn ? 'stroke-accent' : 'stroke-border')} strokeWidth="0.5" strokeDasharray={allOn ? '0' : '1 1.2'} />

 {/* Soft inner halo when allOn — barely-there ring that pulses
     once per rotation, restoring the depth the central sphere had. */}
 {allOn && (
 <circle cx="0" cy="0" r="3" fill="none" className="stroke-accent" strokeWidth="0.25">
 <animate attributeName="r" values="2;8;2" dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
 </circle>
 )}

 {/* Lines between consecutive active domains — break only the segments touching an inactive node */}
 {domains.map((d, i) => {
const next = domains[(i + 1) % domains.length];
if (!active.has(d.id) || !active.has(next.id)) return null;
const a = (d.angle * Math.PI) / 180;
const b = (next.angle * Math.PI) / 180;
return (
 <motion.line
key={d.id + next.id}
initial={{ pathLength: 0, opacity: 0 }}
animate={{ pathLength: 1, opacity: 1 }}
transition={{ duration: 0.6, ease: 'easeOut' }}
x1={Math.cos(a) * radius}
y1={Math.sin(a) * radius}
x2={Math.cos(b) * radius}
y2={Math.sin(b) * radius}
className="stroke-accent/40"
strokeWidth="0.3"
strokeDasharray="0.6 0.6"
 />
 );
 })}

 {/* Lines from each active domain to center — animated draw-in
     when a domain comes online, plus a steady pulse along their
     dashed length to feel like flowing data. */}
 {domains.filter((d) => active.has(d.id)).map((d) => {
const a = (d.angle * Math.PI) / 180;
return (
 <g key={'spoke-' + d.id}>
 <motion.line
initial={{ pathLength: 0 }}
animate={{ pathLength: 1 }}
transition={{ duration: 0.5, ease: 'easeOut' }}
x1="0"
y1="0"
x2={Math.cos(a) * radius}
y2={Math.sin(a) * radius}
className="stroke-accent/30"
strokeWidth="0.25"
 />
 {/* Pulse dot travelling along the spoke into the centre */}
 <motion.circle
r="0.6"
className="fill-accent"
animate={{
cx: [Math.cos(a) * radius, 0],
cy: [Math.sin(a) * radius, 0],
opacity: [0.9, 0],
 }}
transition={{ duration: 1.8, repeat: Infinity, ease: 'easeIn' }}
 />
 </g>
 );
 })}

 {/* Center label */}
 <text x="0" y="-1" textAnchor="middle" className={cn('text-[5px] font-display font-bold', allOn ? 'fill-accent' : 'fill-fg-dim')}>
 עליונות
 </text>
 <text x="0" y="5" textAnchor="middle" className={cn('text-[3.5px] font-display font-bold', allOn ? 'fill-accent/80' : 'fill-fg-dim')}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
MDO
 </text>
 </svg>

 {/* Domain nodes positioned absolutely on top */}
 {domains.map((d) => {
const a = (d.angle * Math.PI) / 180;
const isOn = active.has(d.id);
 // px positioning relative to container center (50%, 50%)
const tx = Math.cos(a) * 38; // % from center
const ty = Math.sin(a) * 38;
return (
 <div
key={d.id}
className="absolute -translate-x-1/2 -translate-y-1/2"
style={{
left: `${50 + tx}%`,
top: `${50 + ty}%`,
 }}
 >
 <motion.button
onClick={() => onToggle(d.id)}
whileHover={{ scale: isOn ? 1.05 : 1.08 }}
whileTap={{ scale: 0.95 }}
className={cn(
 'group size-16 sm:size-[72px] rounded-2xl border-2 transition-colors duration-200 flex flex-col items-center justify-center gap-0.5',
isOn
 ? 'bg-bg-elevated border-accent'
 : 'bg-bg-card/80 border-border-strong opacity-50 hover:opacity-100 hover:border-accent hover:bg-accent/10'
 )}
aria-pressed={isOn}
 >
 <Icon
name={d.icon}
size={22}
className={cn(
 'transition-colors',
isOn ? 'text-accent' : 'text-fg-dim group-hover:text-accent'
 )}
 />
 <span
className={cn(
 'text-xs font-medium transition-colors',
isOn ? 'text-fg' : 'text-fg-dim group-hover:text-fg'
 )}
 >
 {d.label}
 </span>
 </motion.button>
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
icon: 'shield' as const,
accent: 'text-accent-cool',
 },
 {
title:"החות'ים משתקים את הים האדום",
year: '2023–2024',
desc: 'איך ארגון טרור מתימן משתק את הסחר העולמי? הם תוקפים אוניות סחר (ים) בעזרת כטב"מים וטילים (אוויר), ומקבלים מיקומים מדויקים על האוניות ממערכות ולוויינים של איראן (חלל וסייבר). הוכחה שגם ארגון קטן יכול לשלב ממדים.',
icon: 'ship' as const,
accent: 'text-accent-hot',
 },
 {
title: 'תקיפת איראן (אוקטובר 2024)',
year: '2024',
desc:"מטוסי קרב (אוויר) הפציצו מטרות במרחק אלפי קילומטרים. כדי שזה יצליח, לוויינים (חלל) שידרו להם מיקום מדויק בזמן אמת, ולוחמי סייבר 'עיוורו' את מערכות ההגנה של איראן עוד לפני שהמטוסים התקרבו. שילוב מושלם ששמר על כוחותינו.",
icon: 'plane' as const,
accent: 'text-accent',
 },
 ];
return (
 <div className="mt-12">
 <div className="mb-5">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">איך זה נראה בעולם האמיתי</h3>
 <p className="text-fg-muted text-sm">3 דוגמאות עכשוויות שבהן ראינו MDO בפועל</p>
 </div>
 <div className="grid md:grid-cols-3 gap-4">
 {cases.map((c, i) => (
 <motion.article
key={c.title}
initial={{ opacity: 0, y: 18 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ delay: i * 0.08 }}
className="surface p-5"
 >
 <div className="flex items-start gap-3 mb-3">
 <div className="flex-1 min-w-0">
 <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">
 {c.year}
 </div>
 <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">{c.title}</h4>
 </div>
 </div>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">{c.desc}</p>
 </motion.article>
 ))}
 </div>
 </div>
 );
}
function SuperiorityIndicator({ on, off, count, pct }: { on: boolean; off: boolean; count: number; pct: number }) {
return (
 <div className="surface-elevated p-6 text-center relative overflow-hidden">
 <div className="relative">
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">כמה ממדים פעילים</div>
 <div className="font-display font-bold text-5xl tabular-nums mb-1">{count}/5</div>
 <div
className={cn(
 'text-sm font-medium flex items-center justify-center gap-1.5',
on && 'text-accent',
off && 'text-status-danger',
 !on && !off && 'text-status-warn'
 )}
 >
 {on && <><Icon name="check" size={14} strokeWidth={2.5} /> כוח מלא — שליטה מוחלטת</>}
 {off && <>הצבא משותק לחלוטין</>}
 {!on && !off && <>שליטה חלקית · {Math.round(pct)}% מהיכולת</>}
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
