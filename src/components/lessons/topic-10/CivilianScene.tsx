'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type SiteType = 'hospital' | 'mosque' | 'school' | 'water' | 'un' | 'media';
type Site = {
id: string;
type: SiteType;
label: string;
position: { x: number; y: number };
};
const SITES: Site[] = [
 { id: 's1', type: 'hospital', label: 'בית חולים שיפא', position: { x: 35, y: 28 } },
 { id: 's2', type: 'mosque', label: 'מסגד מרכזי', position: { x: 58, y: 35 } },
 { id: 's3', type: 'school', label: 'בית ספר אונר"א', position: { x: 72, y: 42 } },
 { id: 's4', type: 'water', label: 'מתקן מים', position: { x: 22, y: 45 } },
 { id: 's5', type: 'un', label: 'מתחם או"ם', position: { x: 50, y: 18 } },
 { id: 's6', type: 'media', label: 'משרדי תקשורת', position: { x: 82, y: 30 } },
];
type SiteMeta = {
type: SiteType;
label: string;
icon: IconName;
desc: string;
legal: string;
abuse: string;
color: string;
bg: string;
border: string;
};
const SITE_META: Record<SiteType, SiteMeta> = {
hospital: {
type: 'hospital',
label: 'בתי חולים',
icon: 'shield',
desc: 'אתר רפואי פעיל הנותן טיפול לאזרחים. מוגן ברמה הגבוהה ביותר במשפט הבינלאומי.',
legal: 'אמנת ז\'נווה: אסור לתקוף, אסור להשתמש למטרות צבאיות. סימון אסטרטגי במפות C2.',
abuse: 'חמאס מיקם מנהרות פיקוד מתחת לבית החולים שיפא (חשיפה צבאית ב-2023). שימוש ציני באוכלוסייה כמגן.',
color: 'text-status-danger',
bg: 'bg-status-danger/10',
border: 'border-status-danger/40',
 },
mosque: {
type: 'mosque',
label: 'מסגדים ובתי תפילה',
icon: 'pyramid',
desc: 'אתרי דת. מקבלים הגנה מיוחדת כל עוד הם משמשים למטרתם המקורית.',
legal: 'מותר לתקוף רק אם משמשים פעילות צבאית פעילה — דורש ראיות מודיעיניות מוצקות.',
abuse: 'מגדלי מסגדים שמשו כעמדות תצפית והפצת הוראות. דאעש השתמש במסגדים לאחסון נשק וגיוס.',
color: 'text-accent-hot',
bg: 'bg-accent-hot/10',
border: 'border-accent-hot/40',
 },
school: {
type: 'school',
label: 'בתי ספר',
icon: 'people',
desc: 'מוסדות חינוך, רוב הזמן ריקים בלילה. אם פעילים — אזור הגנה גבוהה.',
legal: 'הגנה מוגברת על קטינים. תקיפה רק אם פעילים צבאית — ולא בזמן שילדים בתוך.',
abuse: 'בתי ספר של אונר"א שימשו לאחסון רקטות. גגות שימשו לעמדות שיגור.',
color: 'text-accent',
bg: 'bg-accent/10',
border: 'border-accent/40',
 },
water: {
type: 'water',
label: 'מתקני מים וחשמל',
icon: 'wave',
desc: 'תשתיות שמספקות לאוכלוסייה האזרחית. הגנה מיוחדת במשפט הבינלאומי.',
legal: 'אסור לתקוף תשתיות חיוניות לאוכלוסייה. אלא אם נעשה בהן שימוש כפול (Dual-Use).',
abuse: 'מתקני חשמל שימשו לעיתים לעמדות פיקוד. צירי תשתית = צירי לוגיסטיקה צבאית.',
color: 'text-terrain-sky',
bg: 'bg-terrain-sky/10',
border: 'border-terrain-sky/40',
 },
un: {
type: 'un',
label: 'מתקני או"ם ו-NGOs',
icon: 'flag',
desc: 'ארגונים בינלאומיים פועלים תחת חסות מוסכמת. דיפלומטית — לא תקיפים.',
legal: 'תקיפה = משבר דיפלומטי חמור. דורש ביקורת בינלאומית. מאוד מסוכן פוליטית.',
abuse: 'מתחם אונר"א ברפיח שימש לאחסון נשק. NGO היו נוכחים בלי לדווח על פעילות צבאית בקרבתם.',
color: 'text-accent-cool',
bg: 'bg-accent-cool/10',
border: 'border-accent-cool/40',
 },
media: {
type: 'media',
label: 'משרדי תקשורת',
icon: 'megaphone',
desc: 'בנייני תקשורת מקומיים ובינלאומיים. עיתונאים זרים פועלים שם.',
legal: 'הגנה כלפי עיתונאים. תקיפה דורשת תיאום קפדני ולעיתים אזהרה מוקדמת.',
abuse: 'מגדל אל-ג\'אזירה בעזה 2021 — שימש גם לבסיס פיקוד צבאי. תקיפה אחרי אזהרה — סקנדל בינלאומי.',
color: 'text-status-warn',
bg: 'bg-status-warn/10',
border: 'border-status-warn/40',
 },
};
export function CivilianScene() {
const [activeSite, setActiveSite] = useState<SiteType>('hospital');
const [corridorActive, setCorridorActive] = useState(false);
const meta = SITE_META[activeSite];
return (
 <section id="scene-civilian" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="10.3"
eyebrow="המרחב האזרחי-משפטי"
title = {
  <>
    בעיר, גם כשיש מטרה — <span className="text-accent-hover">לא כל פעולה מותרת</span>
  </>
}
intro="בעיר, האוכלוסייה האזרחית והתשתיות שלה מגבילות את מה שמותר לך לעשות. בית חולים, מסגד, בית ספר — כל אחד עם רמת הגנה משפטית, ורמת ניצול אפשרי על ידי האויב. בוא נראה."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">הדילמה הקלאסית של MOUT:</strong> כוח צבאי חייב להגיע למטרה. אבל המטרה ממוקמת באזור עם בית חולים פעיל, מסגד עם פעילות לחימה, ומחנה פליטים מאוכלס.
 <strong className="text-fg block mt-1.5">3 שיקולים מקבילים:</strong> משפטי (אמנת ז\'נווה, ROE), מבצעי (סיכון הכוח), ומוסרי (פגיעה בחפים מפשע).
 ארגוני טרור מנצלים את הדילמה הזו במכוון.
 </div>
 </div>
 </div>

 {/* Map with sensitive sites */}
 <div className="surface-elevated p-4 rounded-[4px] mb-6 overflow-hidden">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מפת אזור לחימה · 6 אתרים רגישים
 </div>
 <button
onClick={() => setCorridorActive(!corridorActive)}
className={cn(
 'px-3 py-1.5 rounded-[3px] text-xs font-bold transition-all flex items-center gap-1.5',
corridorActive
 ? 'bg-status-ok text-bg'
 : 'border border-border hover:border-border-strong text-fg'
 )}
 >
 <Icon name={corridorActive ? 'check' : 'compass'} size={12} strokeWidth={2.5} />
 {corridorActive ? 'ציר הומניטרי פעיל' : 'הפעל ציר הומניטרי'}
 </button>
 </div>

 <CityMap sites={SITES} activeSite={activeSite} corridorActive={corridorActive} onSelect={setActiveSite} />

 {corridorActive && (
 <motion.div
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
className="mt-3 surface p-3 rounded-[3px] bg-status-ok/5 border-status-ok/30"
 >
 <div className="text-sm font-display font-semibold text-status-ok mb-1 tracking-wider">
 ציר הומניטרי הופעל
 </div>
 <p className="text-xs text-fg leading-relaxed">
 חלון זמן מוגדר (לרוב 4–6 שעות). כוחותינו <strong>עוצרים פעילות התקפית</strong> בציר. אזרחים יוצאים מאזורי לחימה דרום-צפון.
 סיוע הומניטרי (מזון, מים, תרופות) נכנס. <strong>סיכון:</strong> ניצול הציר ע"י האויב להעברת לוחמים או נשק.
 </p>
 </motion.div>
 )}
 </div>

 {/* Site type selector */}
 <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
 {(Object.keys(SITE_META) as SiteType[]).map((t) => {
const m = SITE_META[t];
const isActive = activeSite === t;
return (
 <button
key={t}
onClick={() => setActiveSite(t)}
className={cn(
 'surface p-3 text-center transition-all rounded-[3px] flex flex-col items-center gap-2',
isActive ? `${m.border} ${m.bg}` : 'hover:border-border-strong'
 )}
 >
 <Icon name={m.icon} size={24} className={cn(m.color, 'shrink-0')} />
 <div className={cn('font-display font-bold text-[10px] leading-tight', isActive && m.color)}>
 {m.label}
 </div>
 </button>
 );
 })}
 </div>

 {/* Site details */}
 <AnimatePresence mode="wait">
 <motion.div
key={meta.type}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className={cn('surface-elevated p-6 rounded-[4px] border-r-4 mb-10', meta.border.replace('border-', 'border-r-'))}
 >
 <div className="flex items-center gap-3 mb-4">
 <Icon name={meta.icon} size={32} className={cn(meta.color, 'shrink-0')} />
 <div>
 <h3 className="font-display font-bold text-2xl leading-tight text-accent-deep">{meta.label}</h3>
 </div>
 </div>

 <div className="grid md:grid-cols-3 gap-4">
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">מהות האתר</div>
 <p className="text-sm text-fg leading-relaxed">{meta.desc}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="scale" size={11} />
 מסגרת משפטית
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.legal}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-status-warn mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="mask" size={11} />
 ניצול ציני
 </div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.abuse}</p>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>

 {/* Humanitarian corridor concept */}
 <div className="grid md:grid-cols-2 gap-4">
 <div className="">
 <div className="flex items-center gap-3 mb-3">
 <Icon name="people" size={32} className="text-status-ok shrink-0" />
 <div>
 <div className="font-display font-bold text-lg text-status-ok leading-tight">ציר הומניטרי</div>
 <div className="text-[10px] font-mono text-fg-dim">Humanitarian Corridor</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 נתיב מעבר מוגדר במרחב ולעיתים גם בזמן, שנקבע בהסכמה בין צדדים ללחימה. מטרתו: פינוי אזרחים בטוח, או הכנסת סיוע הומניטרי (מזון, תרופות).
 </p>
 <div className="surface p-3 rounded-[3px] bg-bg-accent/30 border border-border">
 <div className="text-sm font-display font-semibold text-status-ok mb-1 tracking-wider">דרישות תיאום</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 עצירת פעילות התקפית, הקצאת כוחות לאבטחה, תיאום עם ארגונים בינלאומיים. סיכון: ניצול הציר להעברת לוחמים/נשק.
 </p>
 </div>
 </div>

 <div className="">
 <div className="flex items-center gap-3 mb-3">
 <Icon name="scale" size={32} className="text-accent shrink-0" />
 <div>
 <div className="font-display font-bold text-lg text-accent-deep leading-tight">ROE — כללי הפעלת אש</div>
 <div className="text-[10px] font-mono text-fg-dim">Rules of Engagement</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 ההגדרות המדויקות מתי, איפה, ועל מי מותר לחייל לפתוח באש. בעיר — הן <strong className="text-fg">מורכבות מאוד</strong> בגלל סמיכות לאזרחים.
 </p>
 <div className="surface p-3 rounded-[3px] bg-bg-accent/30 border border-border">
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">דוגמה ל-ROE</div>
 <p className="text-xs text-fg-muted leading-relaxed">"אש רק בתגובה לאש מזוהה" /"תקיפה רק אחרי אזהרה ופינוי" /"הימנעות מירי לכיוון אתר רגיש מסומן". כל סיטואציה אחרת.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function CityMap({
sites,
activeSite,
corridorActive,
onSelect,
}: {
sites: Site[];
activeSite: SiteType;
corridorActive: boolean;
onSelect: (t: SiteType) => void;
}) {
return (
 <div className="aspect-[16/9] relative rounded-[3px] overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="urban-bg-civ" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#e6ebf2" />
 <stop offset="100%" stopColor="#dde6f0" />
 </linearGradient>
 </defs>
 <rect x="0" y="0" width="100" height="56" fill="url(#urban-bg-civ)" />

 {/* City blocks (background) */}
 {Array.from({ length: 5 }).map((_, row) =>
Array.from({ length: 8 }).map((_, col) => {
const x = 8 + col * 11;
const y = 8 + row * 9;
return (
 <rect
key={`${row}-${col}`}
x={x}
y={y}
width="8"
height="6"
className="fill-terrain-ridge/30 stroke-terrain-ridge/50"
strokeWidth="0.15"
 />
 );
 })
 )}

 {/* Humanitarian corridor (animated when active) */}
 {corridorActive && (
 <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
 <rect x="3" y="48" width="94" height="6" className="fill-status-ok/20 stroke-status-ok" strokeWidth="0.4" strokeDasharray="2 1" />
 <text x="50" y="52" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
 ציר הומניטרי · פתוח 04:00–10:00
 </text>
 {/* Civilian movement */}
 {[15, 35, 55, 75].map((x, i) => (
 <motion.circle
key={i}
r="0.6"
className="fill-status-ok"
animate={{ cx: [x, x + 25] }}
transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
style={{ cy: 51 }}
 />
 ))}
 </motion.g>
 )}

 {/* Sensitive sites */}
 {sites.map((s) => {
const m = SITE_META[s.type];
const isActive = activeSite === s.type;
return (
 <g key={s.id} onClick={() => onSelect(s.type)} style={{ cursor: 'pointer' }}>
 {/* Pulse ring for active */}
 {isActive && (
 <circle cx={s.position.x} cy={s.position.y} r="3" fill="none" className={cn('stroke-current', m.color)} strokeWidth="0.3">
 <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
 </circle>
 )}
 {/* Protection ring */}
 <circle cx={s.position.x} cy={s.position.y} r="4" fill="none" className={cn('stroke-current', m.color)} strokeWidth="0.2" strokeDasharray="0.6 0.4" opacity="0.5" />
 {/* Marker */}
 <circle cx={s.position.x} cy={s.position.y} r={isActive ? 2 : 1.5} className={cn(m.color, 'fill-current')} stroke="#ffffff" strokeWidth="0.4" />
 {/* Letter inside */}
 <text x={s.position.x} y={s.position.y + 0.8} textAnchor="middle" className="fill-bg font-display font-bold" fontSize={isActive ? 2 : 1.6}>
 {s.type === 'hospital' ? 'H' : s.type === 'mosque' ? 'M' : s.type === 'school' ? 'S' : s.type === 'water' ? 'W' : s.type === 'un' ? 'U' : 'P'}
 </text>
 {/* Label */}
 <text
x={s.position.x}
y={s.position.y - 3.5}
textAnchor="middle"
className={cn('font-display font-bold font-bold', m.color)}
fontSize="2"
paintOrder="stroke"
stroke="#ffffff"
strokeWidth="0.7"
strokeLinejoin="round"
 >
 {s.label}
 </text>
 </g>
 );
 })}
 </svg>
 </div>
 );
}
