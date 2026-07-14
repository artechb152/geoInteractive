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

 {/* Concept · matched pair — flat strip, no card box (matches reference) */}
 <div className="grid md:grid-cols-2 divide-y md:divide-y-0 divide-border/60 mb-10">
 <div className="flex flex-col gap-2 py-5 md:pe-8">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-dim">
 <span className="size-1.5 rounded-full bg-fg-dim" aria-hidden />
 השפה של הנ"צ
 </div>
 <h3 className="font-display font-bold text-xl sm:text-2xl text-balance leading-snug text-fg">
 נקודת ציון <span className="text-fg-muted font-medium text-sm sm:text-base">(Grid Reference)</span>
 </h3>
 <p className="text-sm sm:text-base text-fg-muted leading-relaxed text-pretty">
 ה"מספר האישי" של המיקום שלכם — <strong className="text-fg">צמד מספרים שקובע נקודה אחת בעולם</strong>. כל רשת קואורדינטות היא שפה אחרת לחישוב אותה נקודה, ולכל אחת יש כללים משלה.
 </p>
 </div>

 <div className="flex flex-col gap-2 py-5 md:ps-8 md:border-s border-border/60">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-dim">
 <span className="size-1.5 rounded-full bg-fg-dim" aria-hidden />
 נקודת התורפה
 </div>
 <h3 className="font-display font-bold text-xl sm:text-2xl text-balance leading-snug text-accent flex items-start gap-2">
 <span className="inline-flex items-center justify-center size-5 rounded-full bg-accent/15 text-accent text-xs font-bold shrink-0 mt-1" aria-hidden>!</span>
 <span>ספרה אחת שגויה הופכת ל-100 מ' של דו"צ</span>
 </h3>
 <p className="text-sm sm:text-base text-fg-muted leading-relaxed text-pretty">
 דו"צ (ירי דו-צדדי) הוא פגיעה בטעות בכוחותינו. רוב המקרים קורים מ<strong className="text-fg">בלבול של ספרה אחת בנ"צ</strong> או משימוש ברשת קואורדינטות לא נכונה — ההפרש בשטח קטלני.
 </p>
 </div>
 </div>

 {/* Grid of Systems — flat, divided by a single hairline (matches reference) */}
 <div className="relative grid md:grid-cols-2 mb-8">
 <div className="pointer-events-none absolute inset-y-0 inset-x-0 hidden md:flex items-center justify-center z-10" aria-hidden>
 <Icon name="spark" size={18} className="text-border-strong bg-bg" />
 </div>
 {SYSTEMS.map((s, i) => (
 <motion.article
key={s.id}
initial={{ opacity: 0, y: 18 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className={cn('flex flex-col py-2', i === 0 ? 'md:pe-8' : 'md:ps-8 md:border-s border-border/60')}
 >
 <div className="flex items-center gap-3 mb-3">
 <Icon name={s.id === 'wgs84' ? 'globe' : 'crosshair'} size={26} className="text-fg" />
 <div>
 <div className="font-display font-bold text-2xl sm:text-3xl text-fg">{s.short}</div>
 <div className="text-sm font-display font-semibold text-fg mt-0.5 tracking-wide">
 {s.scope}
 </div>
 </div>
 </div>

 <div className="text-xs text-fg-dim mb-4 font-medium italic">{s.long}</div>

 <div className="border-t border-border/60 pt-3 mb-3">
 <div className="flex items-start gap-2 text-[11px] tracking-wide text-fg-dim mb-2">
 <Icon name="target" size={13} className="mt-0.5 shrink-0" />
 <span>פורמט: {s.format}</span>
 </div>
 <div className="flex items-center gap-2">
 <Icon name="flag" size={14} className="text-fg-dim shrink-0" />
 <span dir="ltr" className="text-fg tabular-nums text-lg font-bold">{s.example}</span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-3">
 <div>
 <div className="text-sm font-display font-semibold text-fg mb-1.5 tracking-wide">יתרונות</div>
 <ul className="space-y-1.5 text-xs">
 {s.pros.map((p) => (
 <li key={p} className="flex gap-2 leading-tight">
 <span className="inline-flex items-center justify-center size-4 rounded-full border border-status-ok/50 text-status-ok shrink-0 mt-0.5">
 <Icon name="check" size={9} strokeWidth={3} />
 </span>
 <span className="text-fg-muted">{p}</span>
 </li>
 ))}
 </ul>
 </div>
 <div>
 <div className="text-sm font-display font-semibold text-fg mb-1.5 tracking-wide">מגבלות</div>
 <ul className="space-y-1.5 text-xs">
 {s.cons.map((c) => (
 <li key={c} className="flex gap-2 leading-tight">
 <span className="inline-flex items-center justify-center size-4 rounded-full border border-status-warn/50 text-status-warn shrink-0 mt-0.5 text-[9px] font-bold leading-none">
 !
 </span>
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
className="border-y border-border/60 py-8 my-10"
 >
 <div className="grid md:grid-cols-[1fr_1.7fr_0.85fr] gap-6 md:gap-0 items-stretch">
 {/* Column 1 — description, slider, readout, status */}
 <div className="flex flex-col md:pe-6">
 <div className="text-sm font-display font-semibold text-fg mb-5 tracking-wide">
 הדמיה מבצעית: מה קורה כשהשפה לא תואמת
 </div>

 <div className="text-xs font-display font-semibold text-fg-dim mb-2 tracking-wide uppercase">
 גודל הסטייה המשוערת
 </div>
 <input
type="range"
min={0}
max={100}
step={1}
value={shift}
onChange={(e) => setShift(Number(e.target.value))}
className="w-full h-2 bg-bg-accent rounded-[3px] appearance-none cursor-pointer accent-accent mb-2"
 />
 <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mb-6">
 <span>0 מ׳</span>
 <span>50 מ׳ (טווח רסיסים)</span>
 <span>100 מ׳ (החטאה מלאה)</span>
 </div>

 <div className={cn(
 'font-display font-bold text-4xl sm:text-5xl tabular-nums mb-4',
dangerLevel === 'safe' && 'text-status-ok',
dangerLevel === 'warn' && 'text-status-warn',
dangerLevel === 'danger' && 'text-status-danger',
 )}>
 {shift}<span className="text-lg sm:text-xl text-fg-muted ms-2">מ׳ סטייה</span>
 </div>

 <div className={cn(
 'inline-flex w-fit items-center px-4 py-2 rounded-lg text-sm font-bold transition-colors',
dangerLevel === 'safe' && 'bg-status-ok text-fg',
dangerLevel === 'warn' && 'bg-status-warn text-fg',
dangerLevel === 'danger' && 'bg-status-danger text-white',
 )}>
 {dangerLevel === 'safe' ? '✓ סטטוס: תקין' : dangerLevel === 'warn' ? '! סטטוס: סיכון' : '✗ סטטוס: סטייה קריטית'}
 </div>
 </div>

 {/* Column 2 — impact map */}
 <div className="relative min-h-[220px] md:min-h-0 aspect-video md:aspect-auto overflow-hidden md:border-s md:border-e border-border/60 md:px-6">
 <ImpactMap shift={shift} />
 </div>

 {/* Column 3 — consequence callout */}
 <div className="md:ps-6 flex">
 <div className={cn(
 'rounded-lg border p-5 flex flex-col justify-center w-full',
dangerLevel === 'safe' && 'border-status-ok/40 bg-status-ok/10',
dangerLevel === 'warn' && 'border-status-warn/40 bg-status-warn/10',
dangerLevel === 'danger' && 'border-status-danger/40 bg-status-danger/10',
 )}>
 <div className="text-sm font-display font-semibold text-fg-dim mb-2 tracking-wide">
 השלכה מבצעית בשטח
 </div>
 <p className={cn(
 'text-base sm:text-lg font-bold leading-snug',
dangerLevel === 'safe' && 'text-status-ok',
dangerLevel === 'warn' && 'text-status-warn',
dangerLevel === 'danger' && 'text-status-danger',
 )}>
 {consequenceText}
 </p>
 </div>
 </div>
 </div>

 {/* Full-width footnote — real explanatory copy preserved in full */}
 <div className="pt-4 mt-6 border-t border-border-subtle text-xs sm:text-sm text-fg-muted leading-relaxed">
 <strong className="text-fg block mb-1 underline">איך זה קורה בפועל?</strong>
 חייל א׳ מודד נ"צ ב-GPS (שעובד ב-WGS84) ושולח אותו ברשת. מפעיל הארטילריה מזין את המספרים למערכת — אבל המערכת מצפה ל-ITM.
 <br/><br/>
 <strong>התוצאה:</strong> בלי תרגום נכון ← הקואורדינטה תתפרש כמיקום אחר לגמרי.
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
 <stop offset="0%" className="text-accent-cool" stopColor="currentColor" stopOpacity="0.3" />
 <stop offset="100%" className="text-accent-cool" stopColor="currentColor" stopOpacity="0" />
 </radialGradient>
 </defs>

 <rect x="0" y="0" width="100" height="56" className="fill-bg" />

 {/* Tactical Grid Overlay */}
 {Array.from({ length: 11 }).map((_, i) => (
 <g key={i}>
 <line x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-border/30" strokeWidth="0.1" />
 <line x1="0" y1={i * 5.6} x2="100" y2={i * 5.6} className="stroke-border/30" strokeWidth="0.1" />
 </g>
 ))}

 {/* Target Zone */}
 <g>
 <circle cx="50" cy="32" r="8" fill="url(#targetGrad)" />
 <circle cx="50" cy="32" r="0.8" className="fill-accent-cool" />
 <circle cx="50" cy="32" r="6" fill="none" className="stroke-accent-cool/30" strokeWidth="0.2" strokeDasharray="1 1" />
 <text x="50" y="44" textAnchor="middle" className="fill-accent-cool text-[2.8px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מטרה מבוקשת</text>
 </g>

 {/* Impact Point */}
 <motion.g animate={{ x: offsetX, y: -offsetY }} transition={{ type: 'spring', stiffness: 50 }}>
 <circle cx="50" cy="32" r="1.2" className="fill-accent-hot" />
 <circle cx="50" cy="32" r="5" fill="none" className="stroke-accent-hot/40" strokeWidth="0.3">
 <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.5s" repeatCount="indefinite" />
 </circle>
 <text x="50" y="26" textAnchor="middle" className="fill-accent-hot text-[2.8px] font-display font-bold tracking-tighter"
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
className="border-y border-border/60 py-5 px-2 sm:px-4 flex items-center justify-center gap-3 sm:gap-4 text-center"
 >
 <Icon name="spark" size={14} className="text-border-strong shrink-0 hidden sm:block" aria-hidden />
 <p className="text-sm sm:text-base text-fg leading-relaxed max-w-3xl">
 <span className="text-fg-dim italic">השורה התחתונה: נ"צ הוא לא סתם מספר.</span> כל נ"צ בנוי משני צירים: הראשון הוא ה-<strong className="text-accent">מזרח (X)</strong> והשני הוא ה-<strong className="text-accent">צפון (Y)</strong>.
 תחשבו על זה כעל צירים מתמטיים - השילוב ביניהם יוצר נקודה יחידה ומוחלטת.
 {' '}
 <span className="text-fg-muted italic underline decoration-status-danger/30 decoration-2">חשוב לזכור:</span>{' '}
 טעויות בנ"צ הן הגורם המרכזי בעולם לתקלות מבצעיות ואובדן חיים.
 {' '}
 <strong className="text-fg">נ"צ מדויק = חיים. נ"צ שגוי = סכנה לכוחותינו.</strong>
 </p>
 <Icon name="spark" size={14} className="text-border-strong shrink-0 hidden sm:block" aria-hidden />
 </motion.div>
 );
}
