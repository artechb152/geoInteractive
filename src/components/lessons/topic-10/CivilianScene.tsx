'use client';
import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { CivilianMap, type CivilianMapLabels, type CivilianSite } from './CivilianMap';
type SiteType = 'hospital' | 'mosque' | 'school' | 'water' | 'un' | 'media';
// Positions live in the district model (CivilianMap.tsx).
const SITES: CivilianSite[] = [
 { id: 's1', kind: 'hospital', label: 'בית חולים שיפא' },
 { id: 's2', kind: 'mosque', label: 'מסגד מרכזי' },
 { id: 's3', kind: 'school', label: 'בית ספר אונר"א' },
 { id: 's4', kind: 'water', label: 'מתקן מים' },
 { id: 's5', kind: 'un', label: 'מתחם או"ם' },
 { id: 's6', kind: 'media', label: 'משרדי תקשורת' },
];
/** Marker letters (unchanged from the previous map). */
const SITE_LETTER: Record<SiteType, string> = { hospital: 'H', mosque: 'M', school: 'S', water: 'W', un: 'U', media: 'P' };
/** In-map labels — terms from this scene. */
const MAP_LABELS: CivilianMapLabels = {
 corridor: 'ציר הומניטרי · פתוח 04:00–10:00',
 target: 'מטרה',
 force: 'כוחותינו',
};
type SiteMeta = {
type: SiteType;
label: string;
icon: IconName;
desc: string;
legal: string;
abuse: string;
};
const SITE_META: Record<SiteType, SiteMeta> = {
hospital: {
type: 'hospital',
label: 'בתי חולים',
icon: 'shield',
desc: 'אתר רפואי פעיל הנותן טיפול לאזרחים. מוגן ברמה הגבוהה ביותר במשפט הבינלאומי.',
legal: 'אמנת ז\'נווה: אסור לתקוף, אסור להשתמש למטרות צבאיות. סימון אסטרטגי במפות C2.',
abuse: 'חמאס מיקם מנהרות פיקוד מתחת לבית החולים שיפא (חשיפה צבאית ב-2023). שימוש ציני באוכלוסייה כמגן.',
 },
mosque: {
type: 'mosque',
label: 'מסגדים ובתי תפילה',
icon: 'pyramid',
desc: 'אתרי דת. מקבלים הגנה מיוחדת כל עוד הם משמשים למטרתם המקורית.',
legal: 'מותר לתקוף רק אם משמשים פעילות צבאית פעילה — דורש ראיות מודיעיניות מוצקות.',
abuse: 'מגדלי מסגדים שמשו כעמדות תצפית והפצת הוראות. דאעש השתמש במסגדים לאחסון נשק וגיוס.',
 },
school: {
type: 'school',
label: 'בתי ספר',
icon: 'people',
desc: 'מוסדות חינוך, רוב הזמן ריקים בלילה. אם פעילים — אזור הגנה גבוהה.',
legal: 'הגנה מוגברת על קטינים. תקיפה רק אם פעילים צבאית — ולא בזמן שילדים בתוך.',
abuse: 'בתי ספר של אונר"א שימשו לאחסון רקטות. גגות שימשו לעמדות שיגור.',
 },
water: {
type: 'water',
label: 'מתקני מים וחשמל',
icon: 'wave',
desc: 'תשתיות שמספקות לאוכלוסייה האזרחית. הגנה מיוחדת במשפט הבינלאומי.',
legal: 'אסור לתקוף תשתיות חיוניות לאוכלוסייה. אלא אם נעשה בהן שימוש כפול (Dual-Use).',
abuse: 'מתקני חשמל שימשו לעיתים לעמדות פיקוד. צירי תשתית = צירי לוגיסטיקה צבאית.',
 },
un: {
type: 'un',
label: 'מתקני או"ם ו-NGOs',
icon: 'flag',
desc: 'ארגונים בינלאומיים פועלים תחת חסות מוסכמת. דיפלומטית — לא תקיפים.',
legal: 'תקיפה = משבר דיפלומטי חמור. דורש ביקורת בינלאומית. מאוד מסוכן פוליטית.',
abuse: 'מתחם אונר"א ברפיח שימש לאחסון נשק. NGO היו נוכחים בלי לדווח על פעילות צבאית בקרבתם.',
 },
media: {
type: 'media',
label: 'משרדי תקשורת',
icon: 'megaphone',
desc: 'בנייני תקשורת מקומיים ובינלאומיים. עיתונאים זרים פועלים שם.',
legal: 'הגנה כלפי עיתונאים. תקיפה דורשת תיאום קפדני ולעיתים אזהרה מוקדמת.',
abuse: 'מגדל אל-ג\'אזירה בעזה 2021 — שימש גם לבסיס פיקוד צבאי. תקיפה אחרי אזהרה — סקנדל בינלאומי.',
 },
};
const SITE_TYPES = Object.keys(SITE_META) as SiteType[];
export function CivilianScene() {
const [activeSite, setActiveSite] = useState<SiteType | null>('hospital');
const [corridorActive, setCorridorActive] = useState(false);
// Bumped by the replay control (and on every switch-on) to run the corridor demo once.
const [corridorRun, setCorridorRun] = useState(0);
const meta = activeSite ? SITE_META[activeSite] : null;
const toggleCorridor = () => {
 if (!corridorActive) setCorridorRun((r) => r + 1);
 setCorridorActive(!corridorActive);
};
// Tabs: arrows follow the visual order (RTL — ArrowLeft/ArrowDown move forward).
const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
 const n = SITE_TYPES.length;
 let next: number;
 if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (i + 1) % n;
 else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
 else if (e.key === 'Home') next = 0;
 else if (e.key === 'End') next = n - 1;
 else return;
 e.preventDefault();
 setActiveSite(SITE_TYPES[next]);
 document.getElementById(`civ-tab-${SITE_TYPES[next]}`)?.focus();
};
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

 {/* Map with sensitive sites — district model in CivilianMap.tsx */}
 <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מפת אזור לחימה · 6 אתרים רגישים
 </div>
 <div className="flex items-center gap-2">
 {corridorActive && (
 <button
type="button"
onClick={() => setCorridorRun((r) => r + 1)}
aria-label="הפעלה חוזרת של ההדגמה"
className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 hover:bg-brand/[0.03] transition-colors inline-flex items-center justify-center"
 >
 <Icon name="refresh" size={15} />
 </button>
 )}
 <button
type="button"
onClick={toggleCorridor}
aria-pressed={corridorActive}
className={cn(
 'h-8 px-3 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer',
corridorActive
 ? 'border-accent bg-accent/10 text-fg'
 : 'border-border hover:border-border-strong text-fg'
 )}
 >
 <Icon name={corridorActive ? 'check' : 'compass'} size={13} strokeWidth={2.5} className={corridorActive ? 'text-accent-deep' : 'text-brand-dark'} />
 {corridorActive ? 'ציר הומניטרי פעיל' : 'הפעל ציר הומניטרי'}
 </button>
 </div>
 </div>

 <div className="aspect-[16/9] relative rounded-xl overflow-hidden border border-border-subtle">
 <CivilianMap
sites={SITES}
letters={SITE_LETTER}
active={activeSite}
onSelect={setActiveSite}
corridor={corridorActive}
corridorRun={corridorRun}
labels={MAP_LABELS}
 />
 </div>

 {corridorActive && (
 <motion.div
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
className="mt-3 surface p-3 rounded-2xl bg-brand/5 border-brand/30"
 >
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 ציר הומניטרי הופעל
 </div>
 <p className="text-[13px] text-fg leading-relaxed">
 חלון זמן מוגדר (לרוב 4–6 שעות). כוחותינו <strong>עוצרים פעילות התקפית</strong> בציר. אזרחים יוצאים מאזורי לחימה דרום-צפון.
 סיוע הומניטרי (מזון, מים, תרופות) נכנס. <strong>סיכון:</strong> ניצול הציר ע"י האויב להעברת לוחמים או נשק.
 </p>
 </motion.div>
 )}
 </div>

 {/* Site type tabs — the keyboard path for the map's sites */}
 <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4" role="tablist" aria-label="מפת אזור לחימה · 6 אתרים רגישים">
 {SITE_TYPES.map((t, i) => {
const m = SITE_META[t];
const isActive = activeSite === t;
return (
 <button
key={t}
id={`civ-tab-${t}`}
type="button"
role="tab"
aria-selected={isActive}
aria-controls="civ-panel"
tabIndex={isActive || (activeSite === null && i === 0) ? 0 : -1}
onClick={() => setActiveSite(t)}
onKeyDown={(e) => onTabKey(e, i)}
className={cn(
 'surface p-3 text-center transition-all rounded-xl flex flex-col items-center gap-2 cursor-pointer',
isActive ? 'border-accent bg-accent/10' : 'hover:border-border-strong'
 )}
 >
 <Icon name={m.icon} size={24} className={cn(isActive ? 'text-accent-deep' : 'text-brand-dark', 'shrink-0')} />
 <div className="font-display font-bold text-[13px] leading-tight text-fg">
 {m.label}
 </div>
 </button>
 );
 })}
 </div>

 {/* Site details */}
 <AnimatePresence mode="wait">
 {meta && (
 <motion.div
key={meta.type}
id="civ-panel"
role="tabpanel"
aria-labelledby={`civ-tab-${meta.type}`}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25 }}
className="surface-elevated p-6 rounded-2xl border-s-4 border-s-brand mb-10"
 >
 <div className="flex items-center gap-3 mb-4">
 <Icon name={meta.icon} size={32} className="text-brand-dark shrink-0" />
 <div>
 <h3 className="font-display font-bold text-2xl leading-tight text-fg">{meta.label}</h3>
 </div>
 </div>

 <div className="grid md:grid-cols-3 gap-4">
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">מהות האתר</div>
 <p className="text-sm text-fg leading-relaxed">{meta.desc}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="scale" size={13} />
 מסגרת משפטית
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.legal}</p>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-status-warn mb-1.5 tracking-wider flex items-center gap-1.5">
 <Icon name="mask" size={13} />
 ניצול ציני
 </div>
 <p className="text-sm text-fg-muted leading-relaxed">{meta.abuse}</p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Humanitarian corridor concept */}
 <div className="grid md:grid-cols-2 gap-4">
 <div className="">
 <div className="flex items-center gap-3 mb-3">
 <Icon name="people" size={32} className="text-brand-dark shrink-0" />
 <div>
 <div className="font-display font-bold text-lg text-brand-dark leading-tight">ציר הומניטרי</div>
 <div className="text-[13px] font-mono text-fg-dim">Humanitarian Corridor</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 נתיב מעבר מוגדר במרחב ולעיתים גם בזמן, שנקבע בהסכמה בין צדדים ללחימה. מטרתו: פינוי אזרחים בטוח, או הכנסת סיוע הומניטרי (מזון, תרופות).
 </p>
 <div className="surface p-3 rounded-2xl bg-bg-accent/30 border border-border">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">דרישות תיאום</div>
 <p className="text-[13px] text-fg-muted leading-relaxed">
 עצירת פעילות התקפית, הקצאת כוחות לאבטחה, תיאום עם ארגונים בינלאומיים. סיכון: ניצול הציר להעברת לוחמים/נשק.
 </p>
 </div>
 </div>

 <div className="">
 <div className="flex items-center gap-3 mb-3">
 <Icon name="scale" size={32} className="text-brand-dark shrink-0" />
 <div>
 <div className="font-display font-bold text-lg text-fg leading-tight">ROE — כללי הפעלת אש</div>
 <div className="text-[13px] font-mono text-fg-dim">Rules of Engagement</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 ההגדרות המדויקות מתי, איפה, ועל מי מותר לחייל לפתוח באש. בעיר — הן <strong className="text-fg">מורכבות מאוד</strong> בגלל סמיכות לאזרחים.
 </p>
 <div className="surface p-3 rounded-2xl bg-bg-accent/30 border border-border">
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">דוגמה ל-ROE</div>
 <p className="text-[13px] text-fg-muted leading-relaxed">"אש רק בתגובה לאש מזוהה" /"תקיפה רק אחרי אזהרה ופינוי" /"הימנעות מירי לכיוון אתר רגיש מסומן". כל סיטואציה אחרת.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
