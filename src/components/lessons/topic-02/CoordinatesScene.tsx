'use client';
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { FrameCorners } from '@/components/ui/FrameCorners';
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
example: '178350 / 666250',
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

 {/* Concept · matched pair feature cards */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 השפה של הנ"צ
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
 נקודת ציון <span className="text-fg-muted font-medium text-base sm:text-lg">(Grid Reference)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 ה"מספר האישי" של המיקום שלכם — <strong className="text-fg">צמד מספרים שקובע נקודה אחת בעולם</strong>. כל רשת קואורדינטות היא שפה אחרת לחישוב אותה נקודה, ולכל אחת יש כללים משלה.
 </p>
 </div>

 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 נקודת התורפה
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
 ספרה אחת שגויה הופכת ל-100 מ' של דו"צ
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 דו"צ (ירי דו-צדדי) הוא פגיעה בטעות בכוחותינו. רוב המקרים קורים מ<strong className="text-fg">בלבול של ספרה אחת בנ"צ</strong> או משימוש ברשת קואורדינטות לא נכונה — ההפרש בשטח קטלני.
 </p>
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
className="surface-elevated p-6 border border-border/50 rounded-[3px]"
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

 <div className="surface p-4 mb-4 font-display font-medium tracking-wide text-sm border border-border/40 rounded-[3px] bg-bg/50">
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

 {/* Digit-by-digit anatomy + hands-on pinpoint drill */}
 <DigitAnatomy />
 <GridReferenceExercise />

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
className="surface-elevated p-6 md:p-8 my-10 rounded-[4px] border border-border/50"
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
dangerLevel === 'danger' && 'border-status-danger/40 bg-status-danger/10 text-status-danger',
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
className="w-full h-2 bg-bg-accent rounded-[3px] appearance-none cursor-pointer accent-accent mb-2"
 />
 <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mb-8">
 <span>0 מ׳</span>
 <span>50 מ׳ (טווח רסיסים)</span>
 <span>100 מ׳ (החטאה מלאה)</span>
 </div>

 <div className="grid md:grid-cols-[1fr_1.6fr] gap-8 items-stretch">
 <div className="surface p-6 flex flex-col justify-center rounded-[3px] bg-bg/30">
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
 <strong>התוצאה:</strong> בלי תרגום נכון ← הקואורדינטה תתפרש כמיקום אחר לגמרי.
 </div>
 </div>

 <div className="surface relative aspect-video overflow-hidden rounded-[3px] border border-border/40">
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
 <circle cx="50" cy="32" r="1.2" className="fill-accent-hot" />
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
/* ─────────────────── DIGIT ANATOMY — WHAT EACH DIGIT MEANS ─────────────── */
/* Grid-square constants shared with the pinpoint drill below, so the
   worked example here and the interactive exercise refer to the same
   printed km-square (178 east / 666 north) — matching the corrected ITM
   example above (easting-first ordering). */
const GRID_EAST_KM = '178';
const GRID_NORTH_KM = '666';

/* Anatomy-only demo anchor, in metres. Every precision level (6/8/10
   digits) is derived from this ONE fixed point so the map, the digit
   callouts and the zoom always agree. Fictional area — no real-world tie. */
const ANATOMY_EAST_M = 178350;
const ANATOMY_NORTH_M = 666750;

type Precision = 6 | 8 | 10;
type DigitZone = 'km' | 'fine' | null;

type DigitSplit = { km: string; fine: string; full: string };

function splitDigits(totalMeters: number, precision: Precision): DigitSplit {
  const km = Math.floor(totalMeters / 1000);
  const remainder = totalMeters - km * 1000; // 0..999
  const kmStr = String(km);
  if (precision === 6) return { km: kmStr, fine: '', full: kmStr };
  const d1 = Math.floor(remainder / 100); // hundred-metres digit, 0-9
  if (precision === 8) return { km: kmStr, fine: String(d1), full: `${kmStr}${d1}` };
  const d2 = Math.floor((remainder - d1 * 100) / 10); // ten-metres digit, 0-9
  return { km: kmStr, fine: `${d1}${d2}`, full: `${kmStr}${d1}${d2}` };
}

// Fictional 6 km × 6 km demo tile shared by the map's SVG overlay and the
// zoom inset's background-image crop. 100 SVG units == 1 km, so the
// highlighted km-square always lands on a clean 100-unit cell. East
// increases rightward, north increases upward — never mirrored for RTL.
const MAP_EAST_MIN = 175;
const MAP_EAST_MAX = 181;
const MAP_NORTH_MIN = 663;
const MAP_NORTH_MAX = 669;
const MAP_VB = 600; // svg viewBox is 0 0 600 600
const WORLD_SPAN_KM = MAP_EAST_MAX - MAP_EAST_MIN; // 6

function eastToX(eastKm: number) {
  return (eastKm - MAP_EAST_MIN) * 100;
}
function northToY(northKm: number) {
  return MAP_VB - (northKm - MAP_NORTH_MIN) * 100;
}

const KM_EAST = Number(GRID_EAST_KM);
const KM_NORTH = Number(GRID_NORTH_KM);

// Fractional position of the demo anchor inside the full source image (0..1,
// image-space: x rightward, y downward) — reused as-is for the zoom inset's
// background-position, so the crop is always centred on the same point.
const DEMO_FRAC_X = (ANATOMY_EAST_M / 1000 - MAP_EAST_MIN) / WORLD_SPAN_KM;
const DEMO_FRAC_Y = 1 - (ANATOMY_NORTH_M / 1000 - MAP_NORTH_MIN) / WORLD_SPAN_KM;

const TERRAIN_MAP_SRC = '/reference-assets/coordinate-anatomy/terrain-map.png';

// Helper: compute CSS background-position percentage to center a given image
// fraction point inside a container scaled by `scalePct / 100`.
function centeredBgPercent(frac: number, scale: number) {
  // Solve for the CSS background-position percentage P such that the
  // image point at fraction `frac` lands at the CENTER of the container —
  // NOT at container-fraction P (those only coincide when frac === 0.5).
  // scale = background-size expressed as a ratio (e.g. 6 for "600%").
  return ((0.5 - frac * scale) / (1 - scale)) * 100;
}

function DigitAnatomy() {
  const reduce = useReducedMotion();
  const [precision, setPrecision] = useState<Precision>(8);
  const [activeZone, setActiveZone] = useState<DigitZone>(null);

  const east = splitDigits(ANATOMY_EAST_M, precision);
  const north = splitDigits(ANATOMY_NORTH_M, precision);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-10"
    >
      <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
        אנטומיה של נ&quot;צ: מה כל ספרה אומרת
      </div>
      <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight mb-4 text-balance">
        נ&quot;צ הוא לא מספר קסם — הוא שתי כתובות מדויקות, אחת בתוך השנייה
      </h3>
      <p className="text-fg leading-relaxed text-pretty mb-8 max-w-3xl">
        קוראים תמיד <strong className="text-fg">מזרח קודם, צפון אחר-כך</strong> — ואף פעם לא הפוך. בכל אחת משתי המחציות, שלוש הספרות הראשונות הן מספר משבצת הקילומטר <strong className="text-fg">המודפס על המפה עצמה</strong>; הספרות שאחריהן הן המיקום המדויק בתוך אותה משבצת, שאותו מודדים בעזרת <strong className="text-fg">מד קואורדינטות (&quot;מדקו&quot;)</strong> — סרגל שקוף שמחלק כל משבצת קילומטר לעשרה חלקים שווים.
      </p>

      {/* Digit readouts (visual right) + map (visual left) — first DOM child
          lands at inline-start/right in this RTL page, matching this same
          file's DatumShiftDemo two-column pattern one section up. */}
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-5">
          <DigitReadout
            axisLabel="Easting · מזרח"
            digits={east}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <DigitReadout
            axisLabel="Northing · צפון"
            digits={north}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <div className="p-4 sm:p-5 rounded-[3px] bg-bg/40 border border-border/40">
            <p className="text-sm text-fg-muted leading-relaxed">
              <strong className="text-fg">כל ספרה נוספת בתוך המשבצת מדייקת את המיקום פי 10 בכל ציר בנפרד:</strong> נ&quot;צ של 6 ספרות ({GRID_EAST_KM} / {GRID_NORTH_KM}) מצביע רק על משבצת קילומטר שלמה; נ&quot;צ של 8 ספרות (ספרה נוספת בכל צד, כמו בתרגיל שלמטה) מדייק עוד פי 10 בכל ציר; נ&quot;צ של 10 ספרות מדייק עוד פי 10 נוסף. אבל שימו לב — <strong className="text-fg">אורך הנ&quot;צ לא הופך אתכם למדויקים יותר מהמפה ומהעין שלכם.</strong> קריאה ארוכה בלי הערכה זהירה בשטח נותנת רק ביטחון-יתר מסוכן.
            </p>
          </div>
        </div>

        <AnatomyMap precision={precision} activeZone={activeZone} east={east} north={north} />
      </div>

      <PrecisionSelector precision={precision} onChange={setPrecision} />
    </motion.div>
  );
}

function DigitZoneButton({
  children,
  label,
  active,
  disabled,
  onActivate,
  onDeactivate,
  className,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={disabled ? undefined : onActivate}
      onMouseLeave={disabled ? undefined : onDeactivate}
      onFocus={disabled ? undefined : onActivate}
      onBlur={disabled ? undefined : onDeactivate}
      onClick={disabled ? undefined : onActivate}
      aria-pressed={disabled ? undefined : active}
      aria-label={label}
      className={cn(
        'rounded-[3px] px-1 -mx-1 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-elevated',
        disabled ? 'opacity-35 cursor-default' : 'cursor-pointer',
        active && !disabled && 'bg-accent/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

function DigitReadout({
  axisLabel,
  digits,
  activeZone,
  onZoneChange,
}: {
  axisLabel: string;
  digits: DigitSplit;
  activeZone: DigitZone;
  onZoneChange: (zone: DigitZone) => void;
}) {
  const hasFine = digits.fine.length > 0;
  return (
    <div className="p-4 sm:p-5 rounded-[3px] border border-border/40 bg-bg/30">
      <div className="text-xs font-display font-semibold tracking-wider mb-3 text-fg-muted">{axisLabel}</div>
      <bdi dir="ltr" className="flex items-baseline gap-1 font-display font-bold text-4xl sm:text-5xl tabular-nums mb-3">
        <DigitZoneButton
          label={`שלוש הספרות הראשונות של ${axisLabel}: ${digits.km} — מספר משבצת הקילומטר המודפס על המפה`}
          active={activeZone === 'km'}
          onActivate={() => onZoneChange('km')}
          onDeactivate={() => onZoneChange(null)}
          className="text-fg"
        >
          {digits.km}
        </DigitZoneButton>
        <DigitZoneButton
          label={
            hasFine
              ? `הספרה האחרונה של ${axisLabel}: ${digits.fine} — המיקום בתוך המשבצת, נמדד במד הקואורדינטות`
              : `אין ספרת מיקום פנימית ברמת דיוק של 6 ספרות`
          }
          active={activeZone === 'fine'}
          disabled={!hasFine}
          onActivate={() => onZoneChange('fine')}
          onDeactivate={() => onZoneChange(null)}
          className="text-accent"
        >
          {hasFine ? digits.fine : '–'}
        </DigitZoneButton>
      </bdi>
      <div className="flex flex-col gap-1 text-[11px] text-fg-muted leading-snug">
        <span className={cn('flex items-center gap-1.5 transition-colors motion-reduce:transition-none', activeZone === 'km' && 'text-fg font-semibold')}>
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-fg" aria-hidden />
          מספר משבצת ק&quot;מ — מודפס על המפה
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 transition-colors motion-reduce:transition-none',
            !hasFine && 'opacity-40',
            activeZone === 'fine' && hasFine && 'text-accent font-semibold',
          )}
        >
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-accent" aria-hidden />
          מיקום בתוך המשבצת — נמדד במדקו
        </span>
      </div>
    </div>
  );
}

function AnatomyMap({
  precision,
  activeZone,
  east,
  north,
}: {
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const kmX = eastToX(KM_EAST);
  const kmY = northToY(KM_NORTH + 1); // top edge (higher northing = smaller y)
  const KM_SIZE = 100;

  const showHundredCell = precision === 8 || precision === 10;
  const fineD1e = showHundredCell ? Number(east.fine[0]) : undefined;
  const fineD1n = showHundredCell ? Number(north.fine[0]) : undefined;
  const fineX = fineD1e !== undefined ? kmX + fineD1e * 10 : undefined;
  const fineY = fineD1n !== undefined ? kmY + (9 - fineD1n) * 10 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square rounded-[4px] overflow-hidden">
        {/* Raster layer, faded into the page canvas via a graduated CSS
            mask — the pixels themselves are never degraded, so the exact
            same file can be reused unscaled for the zoom inset below. */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export; reused pixel-identical for the zoom inset */}
          <img
            src={TERRAIN_MAP_SRC}
            alt="מפת שטח דמיונית להדגמה, ללא שיוך למיקום אמיתי"
            draggable={false}
            className="size-full object-cover"
          />
        </div>

        <FrameCorners tone="sage" />

        <svg
          viewBox={`0 0 ${MAP_VB} ${MAP_VB}`}
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {Array.from({ length: WORLD_SPAN_KM + 1 }).map((_, i) => {
            const eastKm = MAP_EAST_MIN + i;
            const northKm = MAP_NORTH_MIN + i;
            return (
              <g key={i}>
                <line x1={i * 100} y1="0" x2={i * 100} y2={MAP_VB} className="stroke-fg/20" strokeWidth="1" />
                <line x1="0" y1={MAP_VB - i * 100} x2={MAP_VB} y2={MAP_VB - i * 100} className="stroke-fg/20" strokeWidth="1" />
                <text x={i * 100 + 4} y={MAP_VB - 4} fontSize="11" textAnchor="start" className="fill-fg/50 font-display font-semibold">
                  {eastKm}
                </text>
                <text x="4" y={MAP_VB - i * 100 - 6} fontSize="11" textAnchor="start" className="fill-fg/50 font-display font-semibold">
                  {northKm}
                </text>
              </g>
            );
          })}

          <rect
            x={kmX}
            y={kmY}
            width={KM_SIZE}
            height={KM_SIZE}
            fill="none"
            className={cn('transition-all motion-reduce:transition-none', activeZone === 'km' ? 'stroke-fg' : 'stroke-fg/70')}
            strokeWidth={activeZone === 'km' ? 4 : 2.5}
          />

          {fineX !== undefined && fineY !== undefined && (
            <rect
              x={fineX}
              y={fineY}
              width={10}
              height={10}
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/40 stroke-accent' : 'fill-accent/20 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 2.5 : 1.5}
            />
          )}
        </svg>

        <AnatomyZoomInset layout="overlay" precision={precision} activeZone={activeZone} east={east} north={north} />
      </div>

      <AnatomyZoomInset layout="stacked" precision={precision} activeZone={activeZone} east={east} north={north} />
    </div>
  );
}

function AnatomyZoomInset({
  layout,
  precision,
  activeZone,
  east,
  north,
}: {
  layout: 'overlay' | 'stacked';
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const showHundredCell = precision === 8 || precision === 10;
  const showTenCell = precision === 10;

  // Crop window, in km: the whole km-square while showing the 100 m cell;
  // the 100 m cell itself once the 10 m subdivision needs to be legible.
  const cropKm = showTenCell ? 0.1 : 1;
  const scalePct = (WORLD_SPAN_KM / cropKm) * 100;

  const d1e = showHundredCell ? Number(east.fine[0]) : 0;
  const d1n = showHundredCell ? Number(north.fine[0]) : 0;
  const d2e = showTenCell ? Number(east.fine[1]) : 0;
  const d2n = showTenCell ? Number(north.fine[1]) : 0;

  // The inset's own local grid is always 0..100, representing whichever
  // physical cell is currently framed (the 1 km square, or — at 10
  // digits — the 100 m cell within it).
  const cellX = showTenCell ? d2e * 10 : d1e * 10;
  const cellY = showTenCell ? (9 - d2n) * 10 : (9 - d1n) * 10;
  const showCell = showHundredCell;

  return (
    <div
      className={cn(
        'relative aspect-square rounded-[4px] overflow-hidden',
        layout === 'overlay'
          ? /* Physical placement (top/right, not logical start/end) — this
               diagram-internal anchor must not flip under RTL, exactly like
               this same file's GridSquare overlay a few hundred lines down. */
            'hidden lg:block lg:absolute lg:top-3 lg:right-3 lg:w-[38%]'
          : 'lg:hidden w-full max-w-[200px] mx-auto',
      )}
    >
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${TERRAIN_MAP_SRC})`,
          backgroundSize: `${scalePct}% ${scalePct}%`,
          backgroundPosition: `${centeredBgPercent(DEMO_FRAC_X, scalePct / 100)}% ${centeredBgPercent(DEMO_FRAC_Y, scalePct / 100)}%`,
        }}
        role="img"
        aria-label={showTenCell ? 'תקריב על תא של 10 מטר בתוך משבצת המאה מטר, מאותה מפה' : 'תקריב על משבצת הקילומטר, מאותה מפה'}
      />

      <FrameCorners tone="accent" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" className="stroke-fg/25" strokeWidth="0.6" />
            <line x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} className="stroke-fg/25" strokeWidth="0.6" />
          </g>
        ))}
        <rect x="0" y="0" width="100" height="100" fill="none" className="stroke-fg/70" strokeWidth="1.2" />

        {showCell && (
          <g transform={`translate(${cellX} ${cellY})`}>
            <rect
              width="10"
              height="10"
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/35 stroke-accent' : 'fill-accent/15 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 1.4 : 0.9}
            />
            {/* Center marker — a visual anchor only, not a claim of finer accuracy. */}
            <circle cx="5" cy="5" r="1.1" className="fill-accent" />
          </g>
        )}
      </svg>

      <div className="absolute bottom-1.5 right-1.5 rounded-[2px] bg-bg-elevated/85 px-1.5 py-0.5 text-[9px] font-display font-semibold text-fg-muted">
        {showTenCell ? '100 מ׳' : '1 ק״מ'}
      </div>
    </div>
  );
}

const PRECISION_OPTIONS: { value: Precision; label: string; meters: string }[] = [
  { value: 6, label: '6 ספרות', meters: 'תא של 1 ק״מ בכל ציר' },
  { value: 8, label: '8 ספרות', meters: 'תא של 100 מ׳ בכל ציר' },
  { value: 10, label: '10 ספרות', meters: 'תא של 10 מ׳ בכל ציר' },
];

function PrecisionGlyph({ level, active }: { level: Precision; active: boolean }) {
  const tone = active ? 'stroke-accent' : 'stroke-fg-muted';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="2" y="2" width="24" height="24" className={tone} strokeWidth="1.5" />
      {level !== 6 && <rect x="7" y="7" width="14" height="14" className={tone} strokeWidth="1.5" />}
      {level === 10 && <rect x="11" y="11" width="6" height="6" className={tone} strokeWidth="1.5" />}
      <circle cx="14" cy="14" r="1.4" className={active ? 'fill-accent' : 'fill-fg-muted'} />
    </svg>
  );
}

function PrecisionSelector({ precision, onChange }: { precision: Precision; onChange: (p: Precision) => void }) {
  return (
    <div className="mt-8 pt-6 border-t border-border-subtle">
      <div className="text-sm font-display font-semibold text-fg mb-4">כל ספרה נוספת — פי 10 דיוק בכל ציר</div>
      <div role="group" aria-label="רמת דיוק הנ״צ" className="flex flex-wrap items-center gap-3 sm:gap-2">
        {PRECISION_OPTIONS.map((opt, i) => (
          <div key={opt.value} className="flex items-center gap-3 sm:gap-2">
            <button
              type="button"
              aria-pressed={precision === opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-2.5 rounded-[3px] border px-3 py-2 text-start transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                precision === opt.value ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-fg-muted',
              )}
            >
              <PrecisionGlyph level={opt.value} active={precision === opt.value} />
              <span>
                <span className={cn('block text-sm font-display font-bold', precision === opt.value ? 'text-accent' : 'text-fg')}>
                  {opt.label}
                </span>
                <span className="block text-[11px] text-fg-muted">{opt.meters}</span>
              </span>
            </button>
            {i < PRECISION_OPTIONS.length - 1 && <Icon name="arrow-left" size={14} className="text-fg-dim shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── PINPOINT DRILL — "דקירת נ&quot;צ" ──────────────────── */
/* Scaffolding + fading (per interactions-and-practice.md): a narrated
   worked example first (Walkthrough), then independent practice with
   near-transfer variants (Practice) — each click computes the grid
   reference of the cell the learner picked and checks it against the
   target, satisfying the "click a point, get a correctness check of the
   computed נ"צ" requirement. Both share one 10×10 GridSquare so a cell's
   (eDigit, nDigit) IS its own reference — no pointer-position math needed. */

type GridTarget = { eDigit: number; nDigit: number };

const DEMO_TARGET: GridTarget = { eDigit: 4, nDigit: 7 };

const PRACTICE_TARGETS: GridTarget[] = [
  { eDigit: 2, nDigit: 8 },
  { eDigit: 7, nDigit: 3 },
  { eDigit: 5, nDigit: 5 },
];

function refOf(t: GridTarget) {
  return `${GRID_EAST_KM}${t.eDigit} / ${GRID_NORTH_KM}${t.nDigit}`;
}

function GridSquare({
  interactive,
  onCellClick,
  highlightCol,
  highlightRow,
  target,
  guess,
}: {
  interactive: boolean;
  onCellClick?: (eDigit: number, nDigit: number) => void;
  highlightCol?: number;
  highlightRow?: number;
  target?: GridTarget;
  guess?: GridTarget & { correct: boolean };
}) {
  return (
    <div className="w-full max-w-[340px] mx-auto">
      <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] font-display font-semibold tracking-wide text-fg-dim">
        <span>צפון (Northing) {GRID_NORTH_KM}–{Number(GRID_NORTH_KM) + 1}</span>
      </div>
      <div className="relative aspect-square rounded-[3px] border border-border-strong overflow-hidden bg-bg-elevated">
        {/* viewBox extends left+bottom of the 0..100 grid so axis tick digits
            sit in their own margin, instead of both axes' "0" tick colliding
            in the bottom-left corner cell. */}
        <svg viewBox="-14 0 114 114" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden>
          <rect x="0" y="0" width="100" height="100" className="fill-bg-elevated stroke-border-strong" strokeWidth="0.6" />
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={i}>
              <line x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" className="stroke-border/30" strokeWidth="0.3" />
              <line x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} className="stroke-border/30" strokeWidth="0.3" />
            </g>
          ))}
          {highlightCol !== undefined && (
            <rect x={highlightCol * 10} y="0" width="10" height="100" className="fill-accent/12" />
          )}
          {highlightRow !== undefined && (
            <rect x="0" y={90 - highlightRow * 10} width="100" height="10" className="fill-accent-cool/12" />
          )}
          {/* easting ticks, below the square, ascending left→right (never mirrored) */}
          {Array.from({ length: 10 }).map((_, i) => (
            <text key={'e' + i} x={i * 10 + 5} y="107" textAnchor="middle" fontSize="4" className="fill-fg-dim font-display font-semibold">
              {i}
            </text>
          ))}
          {/* northing ticks, left of the square, ascending bottom→top */}
          {Array.from({ length: 10 }).map((_, i) => (
            <text key={'n' + i} x="-7" y={95 - i * 10 + 1.2} textAnchor="middle" fontSize="4" className="fill-fg-dim font-display font-semibold">
              {i}
            </text>
          ))}
          {target && (
            <g transform={`translate(${target.eDigit * 10 + 5} ${95 - target.nDigit * 10})`}>
              <circle r="3.2" fill="none" className="stroke-status-ok" strokeWidth="0.6" strokeDasharray="1.2 1" />
              <circle r="0.9" className="fill-status-ok" />
            </g>
          )}
          {guess && (
            <g transform={`translate(${guess.eDigit * 10 + 5} ${95 - guess.nDigit * 10})`}>
              <circle r="2.6" className={guess.correct ? 'fill-status-ok/70' : 'fill-status-danger/70'} />
            </g>
          )}
        </svg>
        {/* 10×10 clickable/focusable overlay — cell (col,row) IS (eDigit,nDigit).
            Positioned in physical (non-logical) px because it must line up
            exactly with the 0..100 grid square inside the -14..100 viewBox —
            a diagram-alignment concern, not RTL text flow. */}
        <div
          className="absolute grid grid-cols-10 grid-rows-10"
          style={{ left: `${(14 / 114) * 100}%`, right: 0, top: 0, bottom: `${(14 / 114) * 100}%` }}
        >
          {Array.from({ length: 10 }).flatMap((_, row) =>
            Array.from({ length: 10 }).map((_, col) => {
              const eDigit = col;
              const nDigit = 9 - row;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  disabled={!interactive}
                  aria-label={`משבצת ${GRID_EAST_KM}${eDigit} / ${GRID_NORTH_KM}${nDigit}`}
                  onClick={() => onCellClick?.(eDigit, nDigit)}
                  className={cn(
                    'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                    interactive && 'hover:bg-accent/8 cursor-pointer',
                  )}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] font-display font-semibold tracking-wide text-fg-dim">
        <span>מזרח (Easting) {GRID_EAST_KM}–{Number(GRID_EAST_KM) + 1}</span>
      </div>
    </div>
  );
}

const WALKTHROUGH_STEPS: { title: string; body: string; highlightCol?: number; highlightRow?: number; showTarget?: boolean }[] = [
  {
    title: '1 · המשבצת המודפסת',
    body: `זו משבצת קילומטר בודדת מהמפה — בדיוק כמו הדוגמה שראיתם למעלה. הקווים המודפסים נותנים את שלוש הספרות הראשונות של כל ציר: מזרח ${GRID_EAST_KM}, צפון ${GRID_NORTH_KM}.`,
  },
  {
    title: '2 · קודם מזרח',
    body: 'מניחים את מד הקואורדינטות לאורך התחתית ומעריכים כמה חלקים מתוך עשרה הנקודה מרוחקת מהקו השמאלי — זו הספרה הרביעית בציר המזרח.',
    highlightCol: DEMO_TARGET.eDigit,
  },
  {
    title: '3 · אחר-כך צפון',
    body: 'אותו דבר על הציר האנכי: סופרים כמה חלקים מתוך עשרה מהתחתית — זו הספרה הרביעית בציר הצפון.',
    highlightRow: DEMO_TARGET.nDigit,
  },
  {
    title: '4 · מרכיבים את הנ"צ',
    body: `מחברים את שתי המחציות: מזרח ${GRID_EAST_KM}${DEMO_TARGET.eDigit}, צפון ${GRID_NORTH_KM}${DEMO_TARGET.nDigit}. זה נ"צ מלא של הנקודה — בסדר הנכון, מזרח לפני צפון.`,
    highlightCol: DEMO_TARGET.eDigit,
    highlightRow: DEMO_TARGET.nDigit,
    showTarget: true,
  },
];

function DigitWalkthrough() {
  const [step, setStep] = useState(0);
  const s = WALKTHROUGH_STEPS[step];
  const last = step === WALKTHROUGH_STEPS.length - 1;
  return (
    <div className="grid md:grid-cols-[1fr_1.1fr] gap-6 items-center">
      <div>
        <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">שלב הדגמה — כך עושים את זה</div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <h4 className="font-display font-bold text-lg leading-tight mb-2">{s.title}</h4>
            <p className="text-sm text-fg-muted leading-relaxed mb-4">{s.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
          >
            הקודם
          </button>
          {!last && (
            <button
              type="button"
              onClick={() => setStep((v) => Math.min(WALKTHROUGH_STEPS.length - 1, v + 1))}
              className="btn-primary text-sm px-4 py-2"
            >
              הבא
            </button>
          )}
        </div>
      </div>
      <GridSquare
        interactive={false}
        highlightCol={s.highlightCol}
        highlightRow={s.highlightRow}
        target={s.showTarget ? DEMO_TARGET : undefined}
      />
    </div>
  );
}

function DigitPractice() {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<(GridTarget & { correct: boolean }) | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);

  const target = PRACTICE_TARGETS[index];
  const done = index >= PRACTICE_TARGETS.length;

  const handleClick = (eDigit: number, nDigit: number) => {
    const correct = eDigit === target.eDigit && nDigit === target.nDigit;
    setAttempt({ eDigit, nDigit, correct });
    if (correct) setSolvedCount((c) => c + 1);
  };

  const next = () => {
    setAttempt(null);
    setIndex((i) => i + 1);
  };

  const reset = () => {
    setAttempt(null);
    setIndex(0);
    setSolvedCount(0);
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl font-display font-bold text-accent tabular-nums mb-2">
          {solvedCount}/{PRACTICE_TARGETS.length}
        </div>
        <p className="text-fg-muted text-sm mb-4">דקירות נכונות מתוך {PRACTICE_TARGETS.length} תרגילים.</p>
        <button type="button" onClick={reset} className="btn-secondary text-sm px-4 py-2">
          תרגלו שוב
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_1.1fr] gap-6 items-center">
      <div>
        <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">
          תרגול עצמאי — תרגיל {index + 1} מתוך {PRACTICE_TARGETS.length}
        </div>
        <p className="text-sm text-fg leading-relaxed mb-4">
          דקרו על המפה את הנקודה בעלת הנ&quot;צ: <strong className="text-fg tabular-nums">{refOf(target)}</strong>
        </p>
        <AnimatePresence mode="wait">
          {attempt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-[3px] border p-3 text-sm mb-4',
                attempt.correct
                  ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
                  : 'border-status-danger/40 bg-status-danger/10 text-status-danger',
              )}
            >
              {attempt.correct
                ? `בדיוק! דקרתם ${refOf(attempt)} — תואם.`
                : `דקרתם ${refOf(attempt)}, אבל הנ"צ המבוקש הוא ${refOf(target)} (מסומן בעיגול הירוק המקווקו). נסו שוב.`}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          {attempt && !attempt.correct && (
            <button type="button" onClick={() => setAttempt(null)} className="btn-secondary text-sm px-4 py-2">
              נסו שוב
            </button>
          )}
          {attempt?.correct && (
            <button type="button" onClick={next} className="btn-primary text-sm px-4 py-2">
              התרגיל הבא
            </button>
          )}
        </div>
      </div>
      <GridSquare
        interactive={!attempt}
        onCellClick={handleClick}
        target={attempt && !attempt.correct ? target : undefined}
        guess={attempt ?? undefined}
      />
    </div>
  );
}

function GridReferenceExercise() {
  const [mode, setMode] = useState<'demo' | 'practice'>('demo');
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="surface-elevated p-6 md:p-8 my-10 rounded-[4px] border border-border/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <Icon name="crosshair" size={24} className="text-accent shrink-0" />
        <div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight text-balance">תרגיל: דקירת נ&quot;צ</h3>
          <p className="text-sm text-fg-muted mt-1">קודם הדגמה מונחית, ואז מתרגלים לבד — לוחצים על המשבצת הנכונה ומקבלים בדיקה מיידית.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={cn(
            'px-4 py-2 rounded-[3px] text-sm font-display font-semibold border transition-colors',
            mode === 'demo' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-elevated text-fg-muted hover:border-fg-muted',
          )}
        >
          1. הדגמה
        </button>
        <button
          type="button"
          onClick={() => setMode('practice')}
          className={cn(
            'px-4 py-2 rounded-[3px] text-sm font-display font-semibold border transition-colors',
            mode === 'practice' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-elevated text-fg-muted hover:border-fg-muted',
          )}
        >
          2. תרגול עצמאי
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {mode === 'demo' ? <DigitWalkthrough /> : <DigitPractice />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function CoordinateAnatomy() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="surface-elevated p-8 rounded-[3px] flex flex-col md:flex-row gap-6 items-center"
 >
 <Icon name="crosshair" size={48} className="text-accent shrink-0" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider font-bold">
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