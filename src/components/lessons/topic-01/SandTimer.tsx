'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * SandTimer — שעון חול וקטורי, נספח 5 ("שעון החול — התנהגות ומשמעות") ב-
 * design/handoff/asymmetric-smooth-film-v3/INTERACTION-ADDENDUM.md.
 *
 * רכיב תצוגה טהור בלבד: אין כאן טיימר, אין נגישה לוידאו/לתחנות, אין state
 * פנימי של הפעילות. כל מה שנראה על המסך נגזר ישירות מה-props בכל רינדור —
 * שינוי `bottomPercent` בזמן `phase="idle"` (ביקור חוזר בתחנה) "קופץ" מיידית
 * לערך החדש כי שום דבר כאן לא מונפש; זה בכוונה (ראו §5: "אין צבירה שנייה,
 * אין... סרט של חול שעולה בחזרה"). האנימציה של מעבר בין תחנות (phase =
 * "transitioning") באחריות הקורא: הוא זה שמעדכן את transitionProgress
 * פריים-אחר-פריים (או קופץ ישר ל-1 תחת reduced motion) — הרכיב הזה רק
 * מצייר את הערך הרגעי שקיבל, בלי הנחות על איך הגיע אליו.
 *
 * שכבת התנועה היחידה שהרכיב עצמו מנהל היא הטפטוף הסביבתי (גרגירים נופלים
 * בצוואר בלולאה, דוהים לפני המגע בערמה) — עצמאית לגמרי מ-phase, ונשלטת רק
 * על-ידי ambientMotionEnabled/reducedMotion (הכפתור "עצרו/הפעילו את תנועת
 * החול" בקומפוננטה הקוראת הוא זה שהופך את ambientMotionEnabled).
 */

export type SandTimerPhase = 'idle' | 'transitioning';

export type SandTimerProps = {
  /** נפח חדר תחתון במנוחה, 0–100 (ערך עיצוב פנימי — לעולם לא מוצג כטקסט/%). */
  bottomPercent: number;
  /** התקדמות 0–1 של מעבר בתהליך; משמעותי רק כש-phase === 'transitioning'. */
  transitionProgress?: number;
  /** בזמן מעבר, הערך שאליו bottomPercent מתקדם ככל ש-transitionProgress עולה. */
  targetBottomPercent?: number;
  phase: SandTimerPhase;
  /** טפטוף סביבתי דלוק/כבוי — בלתי תלוי ב-phase; הקורא הופך את זה מהכפתור הנגיש. */
  ambientMotionEnabled: boolean;
  /** מקור אמת יחיד ל-reduced motion, מחושב פעם אחת אצל הקורא (Task 3). */
  reducedMotion: boolean;
  className?: string;
};

const clamp01to100 = (value: number) => Math.min(100, Math.max(0, value));
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── גיאומטריה — viewBox קבוע 44×64 (יחס גובה־רוחב "צר וגבוה", כנדרש
//    לעמודת צד קומפקטית ליד הסרט). כל המספרים למטה יחסית ל-viewBox הזה. ──
const VB_W = 44;
const VB_H = 64;

// חדר עליון: רחב למעלה (y=4), מצטמצם לצוואר (y=30).
const TOP_TOP_Y = 4;
const TOP_NECK_Y = 30;
const TOP_CHAMBER_H = TOP_NECK_Y - TOP_TOP_Y; // 26
const TOP_WIDE_L = 6;
const TOP_WIDE_R = 38;
const NECK_L = 20;
const NECK_R = 24;

// חדר תחתון: צר למעלה (y=34), מתרחב לבסיס (y=60). סימטרי לעליון.
const BOTTOM_NECK_Y = 34;
const BOTTOM_BASE_Y = 60;
const BOTTOM_CHAMBER_H = BOTTOM_BASE_Y - BOTTOM_NECK_Y; // 26

const TOP_CHAMBER_PATH = `M${TOP_WIDE_L},${TOP_TOP_Y} L${TOP_WIDE_R},${TOP_TOP_Y} L${NECK_R},${TOP_NECK_Y} L${NECK_L},${TOP_NECK_Y} Z`;
const BOTTOM_CHAMBER_PATH = `M${NECK_L},${BOTTOM_NECK_Y} L${NECK_R},${BOTTOM_NECK_Y} L${TOP_WIDE_R},${BOTTOM_BASE_Y} L${TOP_WIDE_L},${BOTTOM_BASE_Y} Z`;

// שלושה גרגירי טפטוף, כל אחד עם דיליי משלו כדי שהלולאה לא תיראה מכנית.
const DRIP_PARTICLES = [
  { cx: NECK_L + 1, delay: 0 },
  { cx: (NECK_L + NECK_R) / 2, delay: 0.5 },
  { cx: NECK_R - 1, delay: 1 },
];
const DRIP_START_Y = TOP_NECK_Y + 1.5; // ממש מתחת לצוואר
const DRIP_END_Y = BOTTOM_NECK_Y - 0.5; // דוהה *לפני* הכניסה לחדר התחתון (לא נוגע בערמה)

export function SandTimer({
  bottomPercent,
  transitionProgress,
  targetBottomPercent,
  phase,
  ambientMotionEnabled,
  reducedMotion,
  className,
}: SandTimerProps) {
  const uid = useId();
  const systemReducedMotion = useReducedMotion();

  const restingBottom = clamp01to100(bottomPercent);
  const effectiveBottom =
    phase === 'transitioning' && targetBottomPercent !== undefined
      ? lerp(restingBottom, clamp01to100(targetBottomPercent), clamp01(transitionProgress ?? 0))
      : restingBottom;
  const effectiveTop = 100 - effectiveBottom;

  const topFillH = (TOP_CHAMBER_H * effectiveTop) / 100;
  const topFillY = TOP_NECK_Y - topFillH;
  const bottomFillH = (BOTTOM_CHAMBER_H * effectiveBottom) / 100;
  const bottomFillY = BOTTOM_BASE_Y - bottomFillH;

  // הטפטוף כבוי אם המפעיל ביקש reduced motion (prop מפורש או ה-hook של
  // המערכת כברירת מחדל), אם הקורא כיבה אותו דרך ambientMotionEnabled, או
  // כשהלשונית/הרכיב לא גלויים — זו אחריות הקורא (unmount), לא כאן.
  const dripActive = ambientMotionEnabled && !reducedMotion && !systemReducedMotion;

  const topClipId = `${uid}-sand-timer-top-clip`;
  const bottomClipId = `${uid}-sand-timer-bottom-clip`;

  return (
    <div className={cn('h-16 w-11', className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="size-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={topClipId}>
            <rect x={0} y={topFillY} width={VB_W} height={Math.max(0, topFillH)} />
          </clipPath>
          <clipPath id={bottomClipId}>
            <rect x={0} y={bottomFillY} width={VB_W} height={Math.max(0, bottomFillH)} />
          </clipPath>
        </defs>

        {/* מסגרת עץ: שני מכסים אופקיים + שני עמודי צד — קיבוע ויזואלי,
            לא זכוכית. brand.dark. */}
        <rect x={2} y={1} width={VB_W - 4} height={4} rx={2} className="fill-brand-dark" />
        <rect x={2} y={VB_H - 5} width={VB_W - 4} height={4} rx={2} className="fill-brand-dark" />
        <rect x={2} y={5} width={2} height={VB_H - 10} className="fill-brand-dark" />
        <rect x={VB_W - 4} y={5} width={2} height={VB_H - 10} className="fill-brand-dark" />

        {/* זכוכית: שני חדרי הטרפז, קו-מתאר בלבד + טינט קל. border.DEFAULT / border.subtle. */}
        <path d={TOP_CHAMBER_PATH} className="fill-border-subtle/30 stroke-border" strokeWidth={1} strokeLinejoin="round" />
        <path d={BOTTOM_CHAMBER_PATH} className="fill-border-subtle/30 stroke-border" strokeWidth={1} strokeLinejoin="round" />

        {/* חול: אזור מלא בכל חדר, חתוך ל"ערמה" בעלת פני שטח שטוחים דרך
            ה-clipPath שגובהו נגזר מהאחוז האפקטיבי. terrain.sand. */}
        <g clipPath={`url(#${topClipId})`}>
          <path d={TOP_CHAMBER_PATH} className="fill-terrain-sand" />
        </g>
        <g clipPath={`url(#${bottomClipId})`}>
          <path d={BOTTOM_CHAMBER_PATH} className="fill-terrain-sand" />
        </g>

        {/* זרם דק וקבוע בצוואר — רמז חזותי לחיבור בין החדרים, לא מונפש. */}
        <rect x={(VB_W - 1) / 2} y={TOP_NECK_Y} width={1} height={BOTTOM_NECK_Y - TOP_NECK_Y} className="fill-terrain-sand/70" />

        {/* טפטוף סביבתי: גרגירים נופלים בצוואר בלולאה, דוהים ממש לפני
            המגע בערמה (§5) — קישוט תזמון בלבד, לא קשור לנפח הערמה בפועל. */}
        {dripActive &&
          DRIP_PARTICLES.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.cx}
              r={0.75}
              className="fill-terrain-sand"
              initial={{ cy: DRIP_START_Y, opacity: 0 }}
              animate={{ cy: [DRIP_START_Y, DRIP_END_Y], opacity: [0, 0.9, 0] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatDelay: 0.6,
                delay: p.delay,
                ease: 'easeIn',
                times: [0, 0.7, 1],
              }}
            />
          ))}
      </svg>
    </div>
  );
}

export default SandTimer;
