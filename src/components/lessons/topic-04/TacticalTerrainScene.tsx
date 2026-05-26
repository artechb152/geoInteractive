'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Type = 'commanding' | 'key' | 'dead';
type TypeData = {
id: Type;
label: string;
english: string;
shortDef: string;
fullDef: string;
example: string;
whoUses: string;
icon: IconName;
color: string;
borderColor: string;
};
const TYPES: TypeData[] = [
 {
id: 'commanding',
label: 'שטח שולט',
english: 'Commanding Terrain',
shortDef: 'מקום שמי שתופס אותו — שולט על הסביבה',
fullDef: 'תא שטח המעניק לכוח האוחז בו עליונות חזותית וקינטית. השליטה נובעת מהיכולת לשתק באש ובתצפית את נתיבי הפעולה והאספקה של האויב.',
example:"רמת הגולן היא 'המגרש הביתי' של המונח הזה: מי שמחזיק ברכסים שולט בתצפית ובאש על כל אזור הצפון. המאבק העיקש עליה במלחמות 1967 ו-1973 נבע מההבנה הפשוטה שמי שיושב על 'גב ההר' מכתיב את התנאים למי שנמצא בעמק למטה, ונהנה מעליונות טקטית מוחלטת.",
whoUses: 'תוקפים — שואפים לכבוש אותו ראשונים. מגנים — מבססים שם את העיגון של ההגנה.',
icon: 'mountain',
color: 'text-accent',
borderColor: 'border-r-accent',
 },
 {
id: 'key',
label: 'שטח חיוני',
english: 'Key Terrain',
shortDef: 'מקום שאם תפסיד אותו — תפסיד את כל המשימה',
fullDef: 'שטח שהשליטה בו מעניקה יתרון מכריע להצלחת המשימה כולה. זהו"הלב" של המבצע – אם הוא בידינו, המשימה אפשרית; אם הוא בידי האויב, המשימה בסכנה (למשל: הגשר היחיד על הנהר).',
example:"במלחמות ישראל, הגשרים על הירדן לא היו סתם מבני בטון; הם היו 'צוואר הבקבוק' של המערכה. חסימה של גשר בודד יכלה לעצור אוגדה שלמה מלהגיע לחזית בזמן. שטח חיוני הוא המקום שבלעדיו התוכנית המבצעית קורסת – גם אם הוא נמוך וקטן, הערך שלו להצלחת המשימה הוא עצום.",
whoUses: 'מתכננים מבצעיים — מסמנים מראש"שטח חיוני" ובונים את התוכנית סביב להגן/לתקוף אותו.',
icon: 'crosshair',
color: 'text-accent-hot',
borderColor: 'border-r-accent-hot',
 },
 {
id: 'dead',
label: 'שטח מת',
english: 'Dead Space',
shortDef: 'מקום שהאויב לא יכול לראות או לירות אליו',
fullDef: 'מרחב המוסתר מעיני האויב ומאש ישירה בגלל"מיסוך טופוגרפי" (כמו כפל קרקע). זהו השטח שבו מתרחשת התחבולה – שם אנו מסתירים את הכוחות לפני ההתקפה.',
example: 'במהלך הלחימה בעזה (2014), חמאס ניצל שטחים מתים בתוך סבך עירוני ובכפלי קרקע כדי להקים תשתיות טרור. השטח המת אפשר להם להתנייד ולהכין מארבים הרחק מעיני מערכי התצפית והאוויר של צה"ל.',
whoUses: 'חי"ר ומחבלים — משתמשים בשטח מת כדי להתקדם בלי להיחשף. גם תותחי האויב מתחבאים שם.',
icon: 'shield',
color: 'text-status-ok',
borderColor: 'border-r-status-ok',
 },
];
export function TacticalTerrainScene() {
const [active, setActive] = useState<Type>('commanding');
const [showAll, setShowAll] = useState(true);
const meta = TYPES.find((t) => t.id === active)!;
return (
 <section id="scene-tactical" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="04.3"
eyebrow="שטח טקטי"
title={
 <>
 <span className="gradient-text">לא כל נקודה על המפה שווה אותו דבר</span>
 </>
 }
intro='בשדה הקרב, לכל פיסת אדמה יש"תג מחיר" צבאי. מפקדים מחלקים את המרחב ל-3 קטגוריות טקטיות המאפשרות להחליט איפה לרכז את הכוח העיקרי, מהו"הקו האדום" ואיפה ניתן להפתיע את האויב.'
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">למה צריך 3 קטגוריות?</strong>{' '}
 כי לא כל מקום צריך להישמר באותה מידה. שטח שולט = להחזיק בכל מחיר. שטח חיוני = לאבטח. שטח מת = לנצל.
 לא לכל פיסת אדמה אותו ערך — וצבא חכם יודע איפה להשקיע את המשאבים.
 </div>
 </div>
 </div>

 <TacticalMap activeType={active} showAll={showAll} setShowAll={setShowAll} />

 <div className="mt-8 grid lg:grid-cols-3 gap-3 mb-6">
 {TYPES.map((t, i) => {
const isActive = active === t.id;
return (
 <motion.button
key={t.id}
onClick={() => setActive(t.id)}
whileHover={{ y: -3 }}
whileTap={{ scale: 0.98 }}
className={cn(
 'surface text-right p-5 transition-all relative overflow-hidden',
isActive ? 'border-accent bg-accent/5' : 'hover:border-border-strong'
 )}
 >
 {isActive && (
 <div aria-hidden className="absolute -end-12 -top-12 size-32 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
 )}
 <div className="relative flex items-start gap-3 mb-3">
 <Icon name={t.icon} size={32} className={cn('shrink-0 mt-0.5', isActive ? 'text-accent' : t.color)} />
 <div className="min-w-0 flex-1">
 <h4 className={cn('font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2', isActive && 'text-accent')}>
 {t.label}
 </h4>
 <div className="text-[10px] font-mono text-fg-dim mt-0.5">{t.english}</div>
 </div>
 </div>
 <p className={cn('text-sm leading-relaxed', isActive ? 'text-fg' : 'text-fg-muted')}>
 {t.shortDef}
 </p>
 </motion.button>
 );
 })}
 </div>

 <AnimatePresence mode="wait">
 <motion.div
key={active}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className={cn('surface-elevated p-6 sm:p-7 border-r-4 mb-6', meta.borderColor)}
 >
 <div className="flex items-center gap-3 mb-4">
 <Icon name={meta.icon} size={22} className={meta.color} />
 <h3 className="font-display font-bold text-2xl leading-tight text-accent-deep">{meta.label}</h3>
 <span className="font-mono text-xs text-fg-dim">{meta.english}</span>
 </div>

 <div className="grid md:grid-cols-2 gap-5">
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">הגדרה מלאה</div>
 <p className="text-sm leading-relaxed text-fg">{meta.fullDef}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">מי משתמש בזה</div>
 <p className="text-sm leading-relaxed text-fg-muted">{meta.whoUses}</p>
 </div>
 </div>

 <div className="mt-5 pt-5 border-t border-border-subtle">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={18} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">דוגמה היסטורית</div>
 <p className="text-sm text-fg leading-relaxed">{meta.example}</p>
 </div>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>

 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">המסקנה</div>
<p className="text-fg leading-relaxed text-pretty">
 המפה היא לא סתם קווים וצבעים — היא <strong className="text-fg">לוח שחמט תלת-ממדי</strong>. 
 ברגע שתלמדו לזהות שטח שולט, חיוני ומת, תפסיקו לקרוא מידע יבש ותתחילו לראות תוכנית קרב חיה. ההבנה הזו היא שהופכת תצפיתן למפקד.
</p>
 </div>
 </motion.div>
 </section>
 );
}
function TacticalMap({
activeType,
showAll,
setShowAll,
}: {
activeType: Type;
showAll: boolean;
setShowAll: (v: boolean) => void;
}) {
const showCommand = showAll || activeType === 'commanding';
const showKey = showAll || activeType === 'key';
const showDead = showAll || activeType === 'dead';
return (
 <div className="surface-elevated relative overflow-hidden max-w-3xl mx-auto">
 <div className="aspect-[16/8] relative">
 <svg viewBox="0 0 160 100" className="w-full h-full" preserveAspectRatio="none">
 <defs>
 <linearGradient id="ground-tac" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#f3f5f9" />
 <stop offset="100%" stopColor="#e6ebf2" />
 </linearGradient>
 </defs>

 <rect x="0" y="0" width="160" height="100" fill="url(#ground-tac)" />

 {/* Grid */}
 {Array.from({ length: 16 }).map((_, i) => (
 <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="100" className="stroke-border-subtle" strokeWidth="0.08" />
 ))}
 {Array.from({ length: 10 }).map((_, i) => (
 <line key={'gy' + i} x1="0" y1={i * 10} x2="160" y2={i * 10} className="stroke-border-subtle" strokeWidth="0.08" />
 ))}

 {/* Terrain — main mountain ridge */}
 <path d="M0 70 L20 35 L40 50 L60 25 L80 45 L100 30 L120 55 L140 40 L160 65 L160 100 L0 100 Z"
className="fill-terrain-ridge/25 stroke-terrain-ridge/50" strokeWidth="0.3" />
 <path d="M0 80 L25 65 L50 75 L80 60 L110 70 L140 62 L160 75 L160 100 L0 100 Z"
className="fill-terrain-sand/15" />

 {/* Road network */}
 <path d="M5 85 Q 50 80 80 78 T 155 75" fill="none" className="stroke-fg-muted/50" strokeWidth="0.5" />
 <path d="M80 78 L80 95" fill="none" className="stroke-fg-muted/40" strokeWidth="0.4" strokeDasharray="1 0.6" />

 {/* Bridge / junction (key terrain) */}
 <motion.g initial={false} animate={{ opacity: showKey ? 1 : 0.15 }} transition={{ duration: 0.4 }}>
 <circle cx="80" cy="78" r="2.5" className="fill-accent-hot" />
 <circle cx="80" cy="78" r="6" fill="none" className="stroke-accent-hot/50" strokeWidth="0.4" strokeDasharray="0.8 0.6">
 <animate attributeName="r" values="5;9;5" dur="2.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
 </circle>
 <text x="80" y="92" textAnchor="middle" className="fill-accent-hot text-[2.6px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >שטח חיוני</text>
 <text x="80" y="95.5" textAnchor="middle" className="fill-accent-hot text-[1.9px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >צומת דרכים יחיד</text>
 </motion.g>

 {/* Commanding terrain — main peak */}
 <motion.g initial={false} animate={{ opacity: showCommand ? 1 : 0.15 }} transition={{ duration: 0.4 }}>
 <circle cx="60" cy="25" r="9" fill="none" className="stroke-accent" strokeWidth="0.5" strokeDasharray="1.2 0.8" />
 <polygon points="60,23 57,29 63,29" className="fill-accent" />
 <text x="60" y="14" textAnchor="middle" className="fill-accent text-[2.6px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >שטח שולט</text>
 <text x="60" y="17.5" textAnchor="middle" className="fill-accent text-[1.9px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >פסגה · רואה הכל</text>

 {/* Lines of sight from commanding terrain */}
 <line x1="60" y1="25" x2="80" y2="78" className="stroke-accent/30" strokeWidth="0.2" strokeDasharray="0.5 0.8" />
 <line x1="60" y1="25" x2="120" y2="55" className="stroke-accent/30" strokeWidth="0.2" strokeDasharray="0.5 0.8" />
 <line x1="60" y1="25" x2="20" y2="35" className="stroke-accent/30" strokeWidth="0.2" strokeDasharray="0.5 0.8" />
 </motion.g>

 {/* Dead space — behind the right ridge */}
 <motion.g initial={false} animate={{ opacity: showDead ? 1 : 0.15 }} transition={{ duration: 0.4 }}>
 <rect x="115" y="62" width="30" height="20" rx="2" className="fill-status-ok/15 stroke-status-ok/60" strokeWidth="0.4" strokeDasharray="1 0.7" />
 <text x="130" y="73" textAnchor="middle" className="fill-status-ok text-[2.6px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >שטח מת</text>
 <text x="130" y="77" textAnchor="middle" className="fill-status-ok text-[1.9px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >סמוי מהפסגה</text>
 {/* Hidden assets in dead space */}
 <circle cx="125" cy="69" r="0.8" className="fill-status-ok" />
 <circle cx="135" cy="71" r="0.8" className="fill-status-ok" />
 </motion.g>
 </svg>

 <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
 <span className="size-1.5 rounded-full bg-accent animate-pulse" />
 מפה טקטית · שלושת סוגי השטח
 </div>

 <button
onClick={() => setShowAll(!showAll)}
className="absolute top-3 end-3 chip border-border bg-bg/60 backdrop-blur text-[10px] text-fg-muted hover:text-accent hover:border-accent transition-colors"
 >
 {showAll ? 'הראה רק פעיל' : 'הראה את כל השלושה'}
 </button>
 </div>
 </div>
 );
}
