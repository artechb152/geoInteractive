'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type BorderType = 'mountain' | 'river' | 'coast' | 'desert' | 'latitude' | 'political';
type Border = {
id: BorderType;
label: string;
english: string;
category: 'natural' | 'artificial';
icon: IconName;
stability: number; // 1-5
defensibility: number; // 1-5
desc: string;
example: string;
strength: string;
weakness: string;
color: string;
bg: string;
border: string;
};
const BORDERS: Border[] = [
 {
id: 'mountain',
label: 'רכס הרים',
english: 'Mountain Range',
category: 'natural',
icon: 'mountain',
stability: 5,
defensibility: 5,
desc: 'מכשול גיאוגרפי גבוה. תנועה אפשרית רק במספר מעברים מצומצמים.',
example: 'הימלאיה (הודו-סין), אלפים (איטליה-שווייץ), הרי האטלס (מרוקו-אלג\'יריה). הימלאיה מנע מלחמות במשך אלפי שנים.',
strength: 'הגנה טבעית מצוינת. מעברים מתועלים — קל לאבטח.',
weakness: 'מעבר אזרחי קשה. אזורי גבול לרוב לא מאוכלסים.',
color: 'text-terrain-ridge',
bg: 'bg-terrain-ridge/10',
border: 'border-terrain-ridge/40',
 },
 {
id: 'river',
label: 'נהר רחב',
english: 'Wide River',
category: 'natural',
icon: 'wave',
stability: 4,
defensibility: 3,
desc: 'מכשול מים זורם. מצריך גשרים או חציה הנדסית לתנועה צבאית.',
example: 'הרין (גרמניה-צרפת), המיסיסיפי (בארה"ב לפעמים), ירדן (ישראל-ירדן).',
strength: 'חסם תנועה לכלים כבדים. גשרים = נקודות חנק שאפשר לאבטח.',
weakness: 'מי שמחזיק בגשר — שולט בקרב. ניתן לחצות בעונות מסוימות.',
color: 'text-terrain-sky',
bg: 'bg-terrain-sky/10',
border: 'border-terrain-sky/40',
 },
 {
id: 'coast',
label: 'קו חוף / אוקיינוס',
english: 'Coastline / Ocean',
category: 'natural',
icon: 'ship',
stability: 5,
defensibility: 5,
desc: 'גבול ימי שמצריך כלי שיט לחצייה. ההגנה הטבעית הכי טובה.',
example: 'בריטניה, ארה"ב, יפן, אוסטרליה. בריטניה לא נכבשה מאז 1066 — בעיקר בזכות התעלה.',
strength: 'אי אפשר לפלוש בלי נחיתה ימית/אווירית מתואמת. עלות גבוהה לתוקף.',
weakness: 'נמלים = נקודות חולשה. תקיפות ימיות אסטרטגיות אפשריות.',
color: 'text-accent-cool',
bg: 'bg-accent-cool/10',
border: 'border-accent-cool/40',
 },
 {
id: 'desert',
label: 'מדבר',
english: 'Desert',
category: 'natural',
icon: 'fuel',
stability: 3,
defensibility: 3,
desc: 'מרחב פתוח אבל בלתי נסבל לאדם רגיל. תנועה אפשרית עם לוגיסטיקה כבדה בלבד.',
example: 'הסהרה (מרוקו-אלג\'יריה), הנגב (ישראל-מצרים-ירדן), הגובי (מונגוליה-סין).',
strength: 'מרחק עצום. לוגיסטיקה אויב נחשפת. תצפית קלה.',
weakness: 'אפשר לעקוף, ולעיתים אזרחים נעים בו (בדואים). ניווט קל לאויב מאומן.',
color: 'text-terrain-sand',
bg: 'bg-terrain-sand/15',
border: 'border-terrain-sand/40',
 },
 {
id: 'latitude',
label: 'קו אורך/רוחב',
english: 'Latitude / Longitude',
category: 'artificial',
icon: 'compass',
stability: 2,
defensibility: 1,
desc: 'קו ישר על מפה. לרוב לא חופף לטופוגרפיה אמיתית. נקבע במשרד פוליטי.',
example: 'מקסיקו-ארה"ב חלקית, גבולות אפריקה (יושב צרפתי-בריטי), הקו ה-38 בקוריאה.',
strength: 'פשוט להגדיר משפטית. לא תלוי בגיאוגרפיה.',
weakness: 'הקו הזה הוא בדיוק הבעיה — אינו חופף לקבוצות אתניות, לא משפיע על תנועה. מקור חיכוך תמידי.',
color: 'text-status-warn',
bg: 'bg-status-warn/10',
border: 'border-status-warn/40',
 },
 {
id: 'political',
label: 'הסכם פוליטי',
english: 'Political Agreement',
category: 'artificial',
icon: 'flag',
stability: 2,
defensibility: 2,
desc: 'גבול שנקבע במשא ומתן מדיני, לעיתים בלי בסיס גיאוגרפי. דורש חידוש מתמיד.',
example: 'סייקס-פיקו 1916 (יצר את עיראק, סוריה, ירדן). גבולות אפריקה ב-1885 (בקונגרס ברלין).',
strength: 'דיפלומטי, מנומס. מקנה לגיטימציה בינלאומית.',
weakness: 'תלוי בקיום היחסים. כל זעזוע פוליטי = שאלת גבולות מחודשת. מאה שנה אחרי סייקס-פיקו עדיין יש מלחמות.',
color: 'text-status-danger',
bg: 'bg-status-danger/10',
border: 'border-status-danger/40',
 },
];
export function BordersScene() {
const [active, setActive] = useState<BorderType>('mountain');
const meta = BORDERS.find((b) => b.id === active)!;
return (
 <section id="scene-borders" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="11.3"
eyebrow="טיפולוגיית גבולות"
title={
 <>
 <span className="gradient-text">קו על מפה</span> — או חסם אמיתי?
 </>
 }
intro="גבול שעובר ברכס הרים מתפקד 1,000 שנה. גבול שצויר על מפה בפריז ב-1916 גורם למלחמה עד היום. בוא נראה 6 סוגי גבולות, מהיציבים ביותר ועד לפגיעים."
 />

 <InsightCard tone="cool" icon="spark" label="החלוקה הבסיסית">
 <strong className="text-fg">גבול טבעי</strong> נשען על מכשול גיאוגרפי (נהר, רכס, חוף).{' '}
 <strong className="text-fg">גבול מלאכותי</strong> נמשך על מפה לפי אורך/רוחב או הסכם פוליטי, לעיתים בלי קשר לטופוגרפיה ולקבוצות אתניות.
 <strong className="text-fg block mt-1.5">הלקח של מאה שנה:</strong> גבולות מלאכותיים נוטים להוליד סכסוכים. גבולות טבעיים נשארים יציבים.
 </InsightCard>

 {/* Selector grid */}
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
 {BORDERS.map((b) => {
const isActive = active === b.id;
return (
 <button
key={b.id}
onClick={() => setActive(b.id)}
className={cn(
 'surface p-3 text-right transition-all rounded-xl flex items-center gap-2.5',
isActive ? `${b.border} shadow-glow ${b.bg}` : 'hover:border-border-strong'
 )}
 >
 <div className={cn('size-10 rounded-lg flex items-center justify-center border-2 shrink-0', b.border, b.bg)}>
 <Icon name={b.icon} size={18} className={b.color} />
 </div>
 <div className="min-w-0">
 <div className={cn('font-display font-bold text-sm leading-tight', isActive && b.color)}>
 {b.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim">
 {b.category === 'natural' ? 'טבעי' : 'מלאכותי'} · יציבות {b.stability}/5
 </div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Visual + details */}
 <AnimatePresence mode="wait">
 <motion.div
key={meta.id}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className="surface-elevated p-5 rounded-2xl mb-6"
 >
 <BorderVisualization border={meta} />

 <div className="grid lg:grid-cols-2 gap-4 mt-5">
 <div>
 <div className="flex items-center gap-3 mb-3">
 <div className={cn('size-12 rounded-xl flex items-center justify-center border-2 shrink-0', meta.border, meta.bg)}>
 <Icon name={meta.icon} size={22} className={meta.color} />
 </div>
 <div>
 <div className={cn('font-display font-bold text-xl leading-tight', meta.color)}>{meta.label}</div>
 <div className="text-[10px] font-mono text-fg-dim">{meta.english} · {meta.category === 'natural' ? 'טבעי' : 'מלאכותי'}</div>
 </div>
 </div>

 <p className="text-sm text-fg leading-relaxed mb-3">{meta.desc}</p>

 {/* Stats */}
 <div className="grid grid-cols-2 gap-2 mb-3">
 <StatBar label="יציבות" value={meta.stability} color={meta.color} />
 <StatBar label="ניתנות להגנה" value={meta.defensibility} color={meta.color} />
 </div>
 </div>

 <div className="space-y-3">
 <div className="surface p-3 rounded-lg bg-status-ok/5 border-status-ok/30">
 <div className="text-sm font-display font-semibold text-status-ok mb-1 tracking-wider">חוזק</div>
 <p className="text-xs text-fg-muted leading-relaxed">{meta.strength}</p>
 </div>
 <div className="surface p-3 rounded-lg bg-status-warn/5 border-status-warn/30">
 <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider">חולשה</div>
 <p className="text-xs text-fg-muted leading-relaxed">{meta.weakness}</p>
 </div>
 <div className="surface p-3 rounded-lg bg-bg-accent/30">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה</div>
 <p className="text-xs text-fg leading-relaxed italic">{meta.example}</p>
 </div>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>

 <SoftDivider text="טבעי מול מלאכותי · המאזן ב-1916" />

 <div className="">
 <div className="flex gap-4 items-start">
 <div className="size-12 rounded-xl bg-status-warn/15 border border-status-warn/40 flex items-center justify-center shrink-0">
 <Icon name="compass" size={22} className="text-status-warn" />
 </div>
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider">
 סייקס-פיקו · השיעור של 110 שנה
 </div>
 <h3 className="font-display font-bold text-lg mb-2 leading-tight">
 איך 2 דיפלומטים בפריז יצרו 100 שנה של מלחמות
 </h3>
 <p className="text-sm text-fg-muted leading-relaxed text-pretty">
 ב-1916, סר מארק סייקס מבריטניה וצ\'רלס פיקו מצרפת ישבו בפריז ושירטטו את גבולות המזרח התיכון על מפה. הם השתמשו ב-<strong className="text-fg">סרגל</strong>. הקווים שהם משכו יצרו את עיראק, סוריה, לבנון, ירדן — מדינות שגבולותיהן לא חופפים לקבוצות אתניות (כורדים, סונים, שיעים, דרוזים), לא נשענים על מכשולים גיאוגרפיים, ולא מתאימים למבנה השבטי.
 <strong className="text-fg block mt-2">התוצאה ב-2025:</strong> מלחמות אזרחים מתמשכות בסוריה ובעיראק. דאעש קם בדיוק על תפר של מדינות מלאכותיות. גבולות שאיש לא מכיר באמת.
 <strong className="text-fg block mt-1.5">הלקח:</strong> גבול שלא נטוע בגיאוגרפיה — לא יחזיק.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function BorderVisualization({ border }: { border: Border }) {
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="bv-sky" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#dde6f0" />
 <stop offset="100%" stopColor="#e6ebf2" />
 </linearGradient>
 </defs>
 <rect x="0" y="0" width="100" height="56" fill="url(#bv-sky)" />

 {/* Two countries' territories */}
 <rect x="0" y="38" width="50" height="18" className="fill-status-danger/15" />
 <rect x="50" y="38" width="50" height="18" className="fill-accent-cool/15" />
 <text x="25" y="52" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">מדינה א</text>
 <text x="75" y="52" textAnchor="middle" className="fill-accent-cool font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">מדינה ב</text>

 {/* Border-specific rendering */}
 {border.id === 'mountain' && (
 <g>
 {/* Mountain range silhouette */}
 <path d="M40 38 L44 18 L48 28 L52 14 L56 26 L60 38 Z" className="fill-terrain-ridge stroke-terrain-ridge" strokeWidth="0.3" />
 <path d="M42 38 L46 22 L50 32 L54 20 L58 30 Z" className="fill-terrain-ridge/70" />
 {/* Snow peaks */}
 <path d="M51 16 L52 14 L53 16 Z" className="fill-white" />
 <text x="50" y="12" textAnchor="middle" className="fill-terrain-ridge font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
 רכס הרים
 </text>
 </g>
 )}

 {border.id === 'river' && (
 <g>
 {/* River cutting through */}
 <path d="M48 8 Q 52 20 49 32 Q 47 42 51 52" fill="none" className="stroke-terrain-sky" strokeWidth="3" />
 <path d="M48 8 Q 52 20 49 32 Q 47 42 51 52" fill="none" className="stroke-terrain-sky/60" strokeWidth="5" />
 {/* Bridge */}
 <rect x="46" y="28" width="8" height="2" rx="0.4" className="fill-fg/70" />
 <line x1="46" y1="30" x2="46" y2="34" className="stroke-fg" strokeWidth="0.3" />
 <line x1="54" y1="30" x2="54" y2="34" className="stroke-fg" strokeWidth="0.3" />
 <text x="50" y="26" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
 גשר
 </text>
 <text x="63" y="22" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
 נהר
 </text>
 </g>
 )}

 {border.id === 'coast' && (
 <g>
 {/* Land on left, ocean filling right */}
 <rect x="50" y="0" width="50" height="56" className="fill-terrain-sky/40" />
 {/* Wavy coast line */}
 <path d="M50 0 Q 48 10 50 20 Q 52 30 49 40 Q 47 50 50 56" fill="none" className="stroke-terrain-sky" strokeWidth="0.5" />
 {/* Waves */}
 {[12, 22, 32, 42].map((y, i) => (
 <path key={i} d={`M 55 ${y} q 2 -1.5 4 0 t 4 0 t 4 0 t 4 0 t 4 0`} fill="none" className="stroke-terrain-sky" strokeWidth="0.25" opacity="0.6" />
 ))}
 {/* Ship */}
 <g transform="translate(75 26)">
 <path d="M-3 0 L3 0 L2 2 L-2 2 Z" className="fill-fg" />
 <line x1="0" y1="-3" x2="0" y2="0" className="stroke-fg" strokeWidth="0.3" />
 </g>
 <text x="78" y="48" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
 ים פתוח
 </text>
 </g>
 )}

 {border.id === 'desert' && (
 <g>
 {/* Sand dunes */}
 <path d="M30 38 Q 38 32 46 36 Q 54 30 62 38" fill="none" className="stroke-terrain-sand" strokeWidth="0.4" />
 <path d="M32 40 Q 40 34 48 38 Q 56 32 64 40" fill="none" className="stroke-terrain-sand/70" strokeWidth="0.3" />
 <ellipse cx="50" cy="38" rx="20" ry="3" className="fill-terrain-sand/30" />
 <text x="50" y="35" textAnchor="middle" className="fill-terrain-sand font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
 דיונות חול
 </text>
 <text x="50" y="22" textAnchor="middle" className="fill-terrain-sand font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 ~50 ק"מ ריקים
 </text>
 </g>
 )}

 {border.id === 'latitude' && (
 <g>
 {/* Straight latitude line */}
 <line x1="0" y1="34" x2="100" y2="34" className="stroke-status-warn" strokeWidth="0.6" strokeDasharray="2 1" />
 <text x="50" y="30" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
 קו רוחב 38° · קו שרירותי
 </text>
 {/* Show that it crosses through cities/groups */}
 {[18, 38, 58, 78].map((x, i) => (
 <g key={i}>
 <rect x={x - 1.5} y="32" width="3" height="4" className="fill-fg/40" />
 <line x1={x} y1="32" x2={x} y2="36" className="stroke-status-warn" strokeWidth="0.3" />
 </g>
 ))}
 <text x="50" y="46" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 חוצה ערים וקהילות שלמות
 </text>
 </g>
 )}

 {border.id === 'political' && (
 <g>
 {/* Zig-zag artificial line */}
 <path d="M48 8 L 52 18 L 47 25 L 53 32 L 48 40 L 52 52" fill="none" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="2 1.2" />
 {/*"Signed agreement" stamp */}
 <g transform="translate(50 24)">
 <circle r="4" fill="none" className="stroke-status-danger" strokeWidth="0.4" />
 <text x="0" y="0" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
 הסכם
 </text>
 <text x="0" y="2.5" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="1.4"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
1916
 </text>
 </g>
 <text x="50" y="14" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
 סייקס-פיקו
 </text>
 <text x="50" y="50" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
 קווים פוליטיים — חיכוך נצחי
 </text>
 </g>
 )}
 </svg>
 </div>
 );
}
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
return (
 <div className="surface p-2.5 rounded-lg">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">{label}</div>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((i) => (
 <div
key={i}
className={cn(
 'h-1.5 flex-1 rounded-full',
i <= value ? `${color.replace('text-', 'bg-')}` : 'bg-bg-accent border border-border'
 )}
 />
 ))}
 </div>
 <div className={cn('text-xs font-display font-bold mt-1 tabular-nums', color)}>{value}/5</div>
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
