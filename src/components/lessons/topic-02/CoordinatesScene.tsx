'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
type System = {
id: 'itm' | 'wgs84';
short: string;
long: string;
scope: string;
format: string;
example: string;
pros: string[];
cons: string[];
color: string;
};
const SYSTEMS: System[] = [
 {
id: 'itm',
short: 'ITM',
long: 'רשת ישראל החדשה (Israeli Transverse Mercator)',
scope: 'השפה הצבאית של ישראל',
format: 'שני מספרים שלמים במטרים: מזרח (Easting) וצפון (Northing)',
example: '666250 / 178350',
pros: ['הדיוק הכי גבוה בתוך גבולות המדינה', 'מספרים שלמים וקצרים - קל לדווח בקשר', 'השפה העיקרית של המפות הצבאיות בשטח'],
cons: ['לא תעבוד מחוץ לגבולות ישראל', 'דורשת"תרגום" מתמטי קטן כדי להסתנכרן עם מכשירי GPS'],
color: 'text-accent',
 },
 {
id: 'wgs84',
short: 'WGS84',
long: 'תקן עולמי (World Geodetic System 1984)',
scope: 'השפה של ה-GPS וכל העולם',
format: 'קו אורך וקו רוחב במעלות - בדיוק כמו ב-Google Maps',
example: '35.2007° / 31.7857°',
pros: ['פועלת בכל נקודה על הגלובוס', 'הבסיס של כל סמארטפון ומכשיר ניווט אזרחי', 'חובה כשעובדים עם צבאות זרים (כמו נאט"ו)'],
cons: ['מספרים עם שברים עשרוניים - קשה ומסוכן להקריא בקשר', 'אם רוצים לעבוד מול מפה מקומית - חייבים להמיר'],
color: 'text-accent-cool',
 },
];
export function CoordinatesScene() {
const [shift, setShift] = useState(0);
return (
 <section id="scene-coordinates" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <SceneHeader
step="02.3"
eyebrow="קואורדינטות · נ״צ"
title={
          <>
          איך מתרגמים נקודה עצומה במרחב ל<span className="gradient-text">כתובת מבצעית מוחלטת</span>?
          </>
        }
        intro={`כשרוצים להגיד"תפגע כאן" — צריך מספר שכל המכשירים יבינו. זאת קואורדינטה: שני מספרים שמגדירים נקודה אחת ויחידה בעולם. הבעיה מתחילה כשיש כמה"שפות" (רשתות) שונות. אם אחד דיבר בשפה אחת והשני בשפה אחרת — הירי יחטיא את המטרה.`}
 />

 {/* Dictionary Callout */}
 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">מילון מבצעי קצר:</strong>
 <ul className="mt-3 space-y-2 text-fg-muted">
 <li className="flex gap-2">
 <span className="text-accent-cool font-bold">·</span>
 <span><strong className="text-fg">נ"צ (נקודת ציון):</strong> ה"מספר האישי" של המיקום שלכם. צמד מספרים שקובע נקודה אחת בעולם.</span>
 </li>
 <li className="flex gap-2">
 <span className="text-accent-cool font-bold">·</span>
 <span><strong className="text-fg">רשת קואורדינטות:</strong> השפה שבה משתמשים. לכל רשת יש שיטה אחרת לחישוב המיקום.</span>
 </li>
 <li className="flex gap-2">
 <span className="text-accent-cool font-bold">·</span>
 <span><strong className="text-fg">דו"צ (ירי דו־צדדי):</strong> פגיעה בטעות בכוחותינו. רוב המקרים האלו קורים בגלל בלבול של ספרה אחת בנ"צ או שימוש ברשת לא נכונה.</span>
 </li>
 </ul>
 </div>
 </div>
 </div>

 {/* Grid of Systems */}
 <div className="grid md:grid-cols-2 gap-5 mb-8">
 {SYSTEMS.map((s) => (
 <motion.article
key={s.id}
initial={{ opacity: 0, y: 18 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="surface-elevated p-6 border border-border/50 rounded-xl"
 >
 <div className="flex items-baseline justify-between mb-4">
 <div>
 <div className={cn('font-display font-bold text-4xl', s.color)}>{s.short}</div>
 <div className="text-sm font-display font-semibold text-fg-muted mt-1 tracking-wider font-bold">
 {s.scope}
 </div>
 </div>
 <Icon name="crosshair" size={28} className={s.color} />
 </div>

 <div className="text-xs text-fg-muted mb-4 font-medium italic">{s.long}</div>

 <div className="surface p-4 mb-4 font-mono text-sm border border-border/40 rounded-lg bg-bg/50">
 <div className="text-[10px] text-fg-dim mb-1 uppercase tracking-tighter">{s.format}</div>
 <div className="text-fg tabular-nums text-lg font-bold">{s.example}</div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-sm font-display font-semibold text-status-ok mb-1.5 tracking-wider font-bold">יתרונות</div>
 <ul className="space-y-1.5 text-xs">
 {s.pros.map((p) => (
 <li key={p} className="flex gap-2 leading-tight">
 <Icon name="check" size={11} className="text-status-ok mt-0.5 shrink-0" strokeWidth={3} />
 <span className="text-fg-muted">{p}</span>
 </li>
 ))}
 </ul>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-status-warn mb-1.5 tracking-wider font-bold">מגבלות</div>
 <ul className="space-y-1.5 text-xs">
 {s.cons.map((c) => (
 <li key={c} className="flex gap-2 leading-tight">
 <span className="text-status-warn font-bold shrink-0">·</span>
 <span className="text-fg-muted">{c}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </motion.article>
 ))}
 </div>

 {/* Simulation */}
 <DatumShiftDemo shift={shift} setShift={setShift} />

 {/* Final Summary Component */}
 <CoordinateAnatomy />
 </section>
 );
}
function DatumShiftDemo({ shift, setShift }: { shift: number; setShift: (n: number) => void }) {
const dangerLevel = shift < 15 ? 'safe' : shift < 40 ? 'warn' : 'danger';
const consequenceText =
shift < 15
 ? 'בסדר: הסטייה קטנה מאוד. הירי עדיין יפול בתוך אזור המטרה.'
 : shift < 40
 ? 'סיכון: כוחותינו נמצאים בטווח רסיסים מסוכן מנקודת הפגיעה.'
 : shift < 70
 ? 'דו"צ! הירי נופל ישירות על כוחותינו בגלל טעות בשפת המפה.'
 : 'קטסטרופה: המשימה נכשלה לחלוטין. חוסר התאמה מוחלט בין המערכות.';
return (
 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface-elevated p-6 md:p-8 my-10 rounded-2xl border border-border/50"
 >
 <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
 <div>
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider font-bold">
 הדמיה מבצעית: מה קורה כשהשפה לא תואמת
 </div>
 <div className="font-display font-bold text-5xl tabular-nums">
 {shift}<span className="text-2xl text-fg-muted ms-2">מ׳ סטייה</span>
 </div>
 </div>
 <div className={cn(
 'px-4 py-2 rounded-full border text-sm font-bold transition-colors',
dangerLevel === 'safe' && 'border-status-ok/40 bg-status-ok/10 text-status-ok',
dangerLevel === 'warn' && 'border-status-warn/40 bg-status-warn/10 text-status-warn',
dangerLevel === 'danger' && 'border-status-danger/40 bg-status-danger/10 text-status-danger shadow-[0_0_15px_rgba(239,68,68,0.2)]',
 )}>
 {dangerLevel === 'safe' ? '✓ סטטוס: תקין' : dangerLevel === 'warn' ? '! סטטוס: סיכון' : '✗ סטטוס: סטייה קריטית'}
 </div>
 </div>

 <input
type="range"
min={0}
max={100}
step={1}
value={shift}
onChange={(e) => setShift(Number(e.target.value))}
className="w-full h-2 bg-bg-accent rounded-lg appearance-none cursor-pointer accent-accent mb-2"
 />
 <div className="flex justify-between text-[10px] font-mono text-fg-dim mb-8">
 <span>0 מ׳</span>
 <span>50 מ׳ (טווח רסיסים)</span>
 <span>100 מ׳ (החטאה מלאה)</span>
 </div>

 <div className="grid md:grid-cols-[1fr_1.6fr] gap-8 items-stretch">
 <div className="surface p-6 flex flex-col justify-center rounded-xl bg-bg/30">
 <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider font-bold">
 השלכה מבצעית בשטח
 </div>
 <p className={cn(
 'text-lg font-bold leading-tight mb-4',
dangerLevel === 'safe' && 'text-status-ok',
dangerLevel === 'warn' && 'text-status-warn',
dangerLevel === 'danger' && 'text-status-danger',
 )}>
 {consequenceText}
 </p>
 <div className="pt-4 border-t border-border-subtle text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg block mb-1 underline">איך זה קורה בפועל?</strong>
 חייל א׳ מודד נ"צ ב-GPS (שעובד ב-WGS84) ושולח אותו ברשת. מפעיל הארטילריה מזין את המספרים למערכת — אבל המערכת מצפה ל-ITM.
 <br/><br/>
 <strong>התוצאה:</strong> בלי תרגום נכון → הקואורדינטה תתפרש כמיקום אחר לגמרי.
 </div>
 </div>

 <div className="surface relative aspect-video overflow-hidden rounded-xl border border-border/40 shadow-inner">
 <ImpactMap shift={shift} />
 </div>
 </div>
 </motion.div>
 );
}
function ImpactMap({ shift }: { shift: number }) {
 // Offset logic for the SVG impact point
const offsetX = Math.min(38, shift * 0.38);
const offsetY = shift * 0.15;
return (
 <svg viewBox="0 0 100 56" className="w-full h-full" preserveAspectRatio="none">
 <defs>
 <radialGradient id="targetGrad" cx="50%" cy="50%" r="50%">
 <stop offset="0%" stopColor="var(--accent-cool)" stopOpacity="0.3" />
 <stop offset="100%" stopColor="var(--accent-cool)" stopOpacity="0" />
 </radialGradient>
 </defs>
 
 <rect x="0" y="0" width="100" height="56" className="fill-bg-elevated" />

 {/* Tactical Grid Overlay */}
 {Array.from({ length: 11 }).map((_, i) => (
 <g key={i}>
 <line x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-border/20" strokeWidth="0.1" />
 <line x1="0" y1={i * 5.6} x2="100" y2={i * 5.6} className="stroke-border/20" strokeWidth="0.1" />
 </g>
 ))}

 {/* Target Zone */}
 <g>
 <circle cx="50" cy="32" r="8" fill="url(#targetGrad)" />
 <circle cx="50" cy="32" r="0.8" className="fill-accent-cool" />
 <circle cx="50" cy="32" r="6" fill="none" className="stroke-accent-cool/30" strokeWidth="0.2" strokeDasharray="1 1" />
 <text x="50" y="44" textAnchor="middle" className="fill-accent-cool/80 text-[2.8px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מטרה מבוקשת</text>
 </g>

 {/* Impact Point */}
 <motion.g animate={{ x: offsetX, y: -offsetY }} transition={{ type: 'spring', stiffness: 50 }}>
 <circle cx="50" cy="32" r="1.2" className="fill-accent-hot shadow-glow" />
 <circle cx="50" cy="32" r="5" fill="none" className="stroke-accent-hot/40" strokeWidth="0.3">
 <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.5s" repeatCount="indefinite" />
 </circle>
 <text x="50" y="26" textAnchor="middle" className="fill-accent-hot text-[2.8px] font-display font-bold font-bold tracking-tighter"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מיקום פגיעה בפועל</text>
 </motion.g>

 {/* Displacement line */}
 {shift > 4 && (
 <line
x1="50" y1="32"
x2={50 + offsetX} y2={32 - offsetY}
className="stroke-status-danger/40"
strokeWidth="0.2"
strokeDasharray="0.5 0.5"
 />
 )}
 </svg>
 );
}
function CoordinateAnatomy() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="surface-elevated p-8 rounded-xl flex flex-col md:flex-row gap-6 items-center"
 >
 <div className="p-4 bg-accent/10 rounded-full shrink-0">
 <Icon name="crosshair" size={32} className="text-accent" />
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider font-bold">
 השורה התחתונה: נ"צ הוא לא סתם מספר
 </div>
 <p className="text-base text-fg leading-relaxed max-w-3xl">
 כל נ"צ בנוי משני צירים: הראשון הוא ה-<strong className="text-accent">מזרח (X)</strong> והשני הוא ה-<strong className="text-accent">צפון (Y)</strong>. 
 <br/>
 תחשבו על זה כעל צירים מתמטיים - השילוב ביניהם יוצר נקודה יחידה ומוחלטת.
 <br/><br/>
 <span className="text-fg-muted italic underline decoration-status-danger/30 decoration-2">חשוב לזכור:</span> טעויות בנ"צ הן הגורם המרכזי בעולם לתקלות מבצעיות ואובדן חיים. 
 <strong className="text-fg"> נ"צ מדויק = חיים. נ"צ שגוי = סכנה לכוחותינו.</strong>
 </p>
 </div>
 </motion.div>
 );
}