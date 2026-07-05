/**
 * motifs.tsx — ספריית המוטיבים המשותפת של מוקאפי האישור.
 *
 * מקור סמכות: docs/design-approval/papercut-mockup-design-lock.md §3.9–§3.10.
 * כללים נעולים:
 * - אפס HEX חדש: רק טוקני tailwind.config.ts + סולם הדיורמה של Hero.tsx (§4.1).
 * - אפס טקסט בתוך גרפיקה (עברית או לועזית).
 * - מוטיבי רקע הם טקסטורה בלבד — aria-hidden, pointer-events-none, לא מעל טקסט.
 * - ציר/חץ = כיוון עם משמעות: RouteMotif אסור כקישוט צף (ראו הערת השימוש שלו).
 * - מפות/מוטיבים לא מתהפכים ב-RTL — רק ה-chrome מסביבם.
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * ערכי הטוקנים מ-tailwind.config.ts + סולם הגבהים של דיורמת ה-Hero
 * (Hero.tsx CONTOURS). מסמך הנעילה (§4.1) אוסר כל HEX מחוץ לטבלה הזו.
 * לשמור מסונכרן עם הקונפיג — לא להוסיף ערכים.
 */
export const PAPERCUT_COLORS = {
  // — UI tokens —
  bg: '#FFFBF7',
  elevated: '#FFFFFF',
  bgAccent: '#F5EDDE',
  warm: '#FFDCB5',
  border: '#ECE4D2',
  borderStrong: '#C5B695',
  fg: '#000000',
  fgMuted: '#3a3a3a',
  fgDim: '#6a6a6a',
  accent: '#EB9E48',
  accentHover: '#F2B872',
  accentDeep: '#F7CFA0',
  brand: '#749C75',
  brandDark: '#5B7C5C',
  // — illustration-only tokens (terrain-*) —
  terrainSand: '#c2a26b',
  terrainOlive: '#7a8a3f',
  terrainRidge: '#5a6b4a',
  terrainSky: '#3d6b8e',
  terrainSteel: '#4a5663',
  // — Hero diorama elevation scale (top faces + shaded sides) —
  dioSand: '#f7e0b8',
  dioSandDeep: '#e8cc97',
  dioTransition: '#c8c389',
  dioSageLight: '#9bb389',
  dioSageOrange: '#b08c50',
  dioPeak: '#f5b865',
  dioSandSide: '#d8b97e',
} as const;

const C = PAPERCUT_COLORS;

/** מזהה SVG בטוח ל-url(#…) — useId מחזיר נקודתיים שחלק מהדפדפנים לא אוהבים בתוך fragment. */
export function useSvgId(prefix: string): string {
  const raw = useId();
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/** בלוב אורגני סגור (סביב ראשית הצירים, ~300×130) — הבסיס לאיי-קונטור ולטרסות. */
export const CONTOUR_ISLAND_PATH =
  'M -150 8 C -138 -42, -66 -66, 6 -60 C 78 -54, 138 -28, 142 8 C 138 44, 66 66, -14 62 C -90 58, -158 46, -150 8 Z';

/** סימון מדידה "+" זעיר — קריצת סוקרים מהרפרנס. stroke-accent בשקיפות נמוכה. */
export function PlusMark({
  x,
  y,
  size = 6,
  opacity = 0.4,
}: {
  x: number;
  y: number;
  size?: number;
  opacity?: number;
}) {
  return (
    <path
      d={`M ${x - size} ${y} H ${x + size} M ${x} ${y - size} V ${y + size}`}
      fill="none"
      stroke={C.accent}
      strokeOpacity={opacity}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  );
}

const BACKDROP_ISLANDS: Array<{ x: number; y: number; s: number; r: number; rings: number[] }> = [
  { x: 210, y: 180, s: 1.25, r: 0, rings: [1, 0.8, 0.6, 0.42] },
  { x: 1190, y: 310, s: 1.6, r: 24, rings: [1, 0.82, 0.63, 0.45, 0.28] },
  { x: 470, y: 770, s: 1.1, r: -14, rings: [1, 0.78, 0.55] },
  { x: 950, y: 70, s: 0.85, r: 40, rings: [1, 0.72, 0.46] },
];

/**
 * ContourBackdrop — קווי גובה סגורים ועדינים על הקנבס/הפאנל.
 * tone="page": רקע העמוד (מאחורי הכול, בתוך מיכל -z-10).
 * tone="inner": רקע פנימי עדין יותר לפאנל-מסך.
 * תקדים בקוד: DecorativeTopo ב-LeadCTA.tsx. שקיפות קונטורים ≤ 0.12 (נעול).
 */
export function ContourBackdrop({
  tone = 'page',
  className,
}: {
  tone?: 'page' | 'inner';
  className?: string;
}) {
  const contourOpacity = tone === 'page' ? 0.12 : 0.08;
  const plusOpacity = tone === 'page' ? 0.4 : 0.25;
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 size-full select-none', className)}
    >
      {BACKDROP_ISLANDS.map((isl, i) => (
        <g key={i} transform={`translate(${isl.x} ${isl.y}) rotate(${isl.r}) scale(${isl.s})`}>
          {isl.rings.map((ring) => (
            <path
              key={ring}
              d={CONTOUR_ISLAND_PATH}
              transform={`scale(${ring})`}
              fill="none"
              stroke={C.brandDark}
              strokeOpacity={contourOpacity}
              strokeWidth={1 / (isl.s * ring)}
            />
          ))}
        </g>
      ))}
      <path
        d="M -40 520 C 200 470, 380 560, 620 520 S 1080 460, 1480 540"
        fill="none"
        stroke={C.brandDark}
        strokeOpacity={contourOpacity}
        strokeWidth="1"
      />
      <path
        d="M -40 590 C 220 545, 420 625, 680 585 S 1120 525, 1480 615"
        fill="none"
        stroke={C.brandDark}
        strokeOpacity={contourOpacity}
        strokeWidth="1"
      />
      <path
        d="M -40 130 C 260 85, 460 175, 760 135 S 1200 90, 1480 160"
        fill="none"
        stroke={C.brandDark}
        strokeOpacity={contourOpacity}
        strokeWidth="1"
      />
      <PlusMark x={345} y={420} opacity={plusOpacity} />
      <PlusMark x={1055} y={645} opacity={plusOpacity} />
      <PlusMark x={760} y={225} opacity={plusOpacity} />
    </svg>
  );
}

/**
 * CompassRose — תוכן שושנת הרוחות (בתוך <g>, מערכת צירים ממורכזת ±50).
 * מיוצא בנפרד כדי שגם CompassEmblem וגם ה-placeholders ישתמשו באותה גאומטריה
 * (motifs.tsx הוא המקור היחיד — בלי העתק-הדבק בין קבצים).
 * בלי אותיות N/S/E/W — חייב להיקרא בלי תוויות. הצפון = מחט כתומה, למעלה.
 */
export function CompassRose() {
  return (
    <g>
      <circle r="46" fill={C.elevated} stroke={C.borderStrong} strokeWidth="1.5" />
      <circle r="38.5" fill="none" stroke={C.borderStrong} strokeWidth="0.75" strokeOpacity="0.7" />
      {Array.from({ length: 16 }).map((_, i) => (
        <line
          key={i}
          transform={`rotate(${i * 22.5})`}
          y1={-36}
          y2={i % 4 === 0 ? -31.5 : -33}
          stroke={C.borderStrong}
          strokeWidth={i % 4 === 0 ? 1.4 : 0.8}
        />
      ))}
      {/* קודקודים משניים (בין-רוחות) */}
      {[45, 135, 225, 315].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M 0 -26 L 4.5 -4.5 L 0 0 Z" fill={C.borderStrong} />
          <path d="M 0 -26 L -4.5 -4.5 L 0 0 Z" fill={C.borderStrong} opacity="0.55" />
        </g>
      ))}
      {/* קודקודים ראשיים — מזרח/דרום/מערב */}
      {[90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M 0 -38 L 6 -6 L 0 0 Z" fill={C.fgMuted} />
          <path d="M 0 -38 L -6 -6 L 0 0 Z" fill={C.fgDim} />
        </g>
      ))}
      {/* מחט הצפון — הפאזה הכתומה היחידה */}
      <path d="M 0 -38 L 6 -6 L 0 0 Z" fill={C.accent} />
      <path d="M 0 -38 L -6 -6 L 0 0 Z" fill={C.accentHover} />
      <circle r="4.5" fill={C.elevated} stroke={C.fgMuted} strokeWidth="1" />
      <circle r="2" fill={C.accent} />
    </g>
  );
}

/**
 * CompassEmblem — אמבלמת המצפן (Slot עתידי: UI-COMPASS-ROSE).
 * גדלים מהנעילה: הירו size-16 md:size-20 (ברירת מחדל), header — להעביר size-9.
 * דקורטיבי: הכותרת שלידו נושאת את המשמעות, לכן aria-hidden.
 */
export function CompassEmblem({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-50 -50 100 100"
      className={cn('size-16 shrink-0 md:size-20', className)}
    >
      <CompassRose />
    </svg>
  );
}

/**
 * DotGrid — גריד נקודות עדין; חלופה נקודתית ל-topo-bg הקווי. שימוש חסכוני.
 * ממלא את המיכל (המיכל חייב להיות relative).
 */
export function DotGrid({ className }: { className?: string }) {
  const id = useSvgId('dotgrid');
  return (
    <svg
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 size-full select-none', className)}
    >
      <defs>
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.4" fill={C.brandDark} fillOpacity="0.16" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * RouteMotif — ציר מתוכנן קטן: נקודת זינוק ← ציר מקווקו ← סיכת יעד.
 *
 * ⚠️ כללי שימוש (נעולים, §1.9 + §3.10):
 * - לא קישוט צף! מותר רק כשהוא מסמן מסלול/התקדמות אמיתיים בהקשרו.
 * - על גבי מפה — חובה צ'יפ מקרא "ציר מתוכנן" לצידו (HTML, לא בתוך ה-SVG).
 * - מצויר RTL-נכון מלידה: הזינוק בימין, היעד בשמאל ("קדימה" = שמאלה).
 *   ה-SVG לא מתהפך — אין לעטוף אותו ב-scaleX(-1).
 */
export function RouteMotif({
  className,
  ariaLabel,
}: {
  className?: string;
  /** ברירת מחדל: דקורטיבי (aria-hidden). להעביר תווית עברית כשהמוטיב נושא מידע. */
  ariaLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 48"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn('block', className)}
    >
      {/* נקודת זינוק — בקצה הימני (התחלה ב-RTL) */}
      <circle cx="105" cy="35" r="5.5" fill={C.brandDark} />
      <circle cx="105" cy="35" r="2.3" fill={C.elevated} />
      {/* הציר המתוכנן — מקווקו, לכיוון שמאל (קדימה ב-RTL) */}
      <path
        d="M 99 33 C 84 26, 68 40, 52 32 C 42 27, 32 28, 26 26"
        fill="none"
        stroke={C.accent}
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      {/* נקודת ביניים */}
      <circle cx="64" cy="34" r="3.2" fill={C.elevated} stroke={C.accent} strokeWidth="1.75" />
      {/* סיכת היעד — בקצה השמאלי */}
      <g transform="translate(20 20)">
        <path
          d="M 0 8 C -5.5 2 -7 -1 -7 -4.5 C -7 -9 -3.8 -12 0 -12 C 3.8 -12 7 -9 7 -4.5 C 7 -1 5.5 2 0 8 Z"
          fill={C.accent}
        />
        <circle cy="-4.5" r="2.6" fill={C.elevated} />
      </g>
    </svg>
  );
}
