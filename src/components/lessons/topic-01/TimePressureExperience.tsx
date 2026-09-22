'use client';

/* ──────────────── ציר זמן — אקורדיון + נגן פריימים ────────────────
   מבנה השאול חזותית והתנהגותית מ-OnboardingScene.tsx: אקורדיון מימין (N
   סעיפים, נגזרים מ-STATIONS), נגן פריימים משמאל — אותה טכנולוגיית
   canvas+webp-frame-sequence של SceneOnboardingFramePlayer.tsx (ראו
   TimePressureFramePlayer.tsx), לא <video> mp4 כמו קודם. לחיצה על סעיף
   אקורדיון מציגה את התחנה שלו; הנגן תמיד מנגן רצף פריימים אמיתי כדי
   להגיע אליה (קדימה, אחורה, קפיצה מרובת-תחנות) — אין קפיצה ישירה לתמונה
   בלי הנפשה, ואין אפשרות לדלג על ההנפשה עצמה (החלטת מוצר 2026-09-22, כמו
   ב-onboarding).

   נעילת רצף (החלטת מוצר 2026-09-22): בהתחלה מותר להתקדם רק לתחנה הבאה
   ברצף (currentIndex+1) — אי אפשר לדלג ישר, למשל מתחנה 1 לתחנה 3, לפני
   שביקרו בתחנה 3 בפועל. ברגע שתחנה כלשהי כבר נצפתה (maxVisitedIndex
   מתעדכן בכל settle), היא "משוחררת" לצפייה חוזרת/דילוג חופשי אליה בכל
   כיוון — ראו isUnlocked. תחנות שעדיין לא נפתחו מוצגות עם מנעול,
   ה-accordion שלהן אינו ניתן ללחיצה. אין שער שאלות, אין שעון חול, אין
   טבלת השוואה — לפי בקשת המשתמש מ-2026-09-21 (הוסרו לגמרי מהפעילות; ראו
   היסטוריית git לגרסה הקודמת אם ידרשו בעתיד). כל התוכן הנרטיבי המקורי
   מ-TimePressureContent.ts (כותרת, 5 תחנות, הערת ציר זמן, 3 פסקאות תובנה)
   נשמר. */

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { TimePressureFramePlayer, type TimePressureFramePlayerHandle } from './TimePressureFramePlayer';
import { INSIGHT_PARAGRAPHS, STATIONS, TITLE, UI } from './TimePressureContent';

const STATION_COUNT = STATIONS.length;

type Phase = 'idle' | 'loading' | 'playing';

export function TimePressureExperience() {
  const uid = useId();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [announcement, setAnnouncement] = useState('');

  const playerRef = useRef<TimePressureFramePlayerHandle | null>(null);
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const didMountRef = useRef(false);

  const handlePhaseChange = (nextPhase: Phase, target: number | null) => {
    setPhase(nextPhase);
    setPendingTarget(target);
  };

  const handleSettle = (index: number) => {
    setCurrentIndex(index);
    setMaxVisitedIndex((prev) => Math.max(prev, index));
    setAnnouncement(UI.liveUpdate(STATIONS[index], index + 1));
  };

  /** תחנה "משוחררת" אם היא כבר נצפתה בעבר, או אם היא בדיוק התחנה הבאה
   * ברצף מהנוכחית — כל תחנה אחרת (דילוג קדימה למקום שעוד לא ביקרו בו)
   * נשארת נעולה. */
  const isUnlocked = (i: number) => i <= maxVisitedIndex || i === currentIndex + 1;

  /** בקשת תחנה — נקודת הכניסה היחידה לכל ניווט (לחיצת אקורדיון). הנגן
   * עצמו מחליט על מסלול הפריימים (קדימה/אחורה/רב-תחנתי) — ראו
   * TimePressureFramePlayer.request; כאן רק שער הנעילה. */
  const requestStation = (target: number) => {
    if (target < 0 || target >= STATION_COUNT || target === currentIndex) return;
    if (!isUnlocked(target)) return;
    playerRef.current?.request(target);
  };

  const handleHeaderClick = (i: number) => {
    if (!isUnlocked(i)) return;
    if (i === expandedIndex) {
      // סגירת האקורדיון הפעיל בלבד — אינה משנה תחנה/הנפשה.
      setExpandedIndex(null);
      return;
    }
    setExpandedIndex(i);
    requestStation(i);
  };

  // מיקוד לכותרת סעיף התחנה הנוכחית בסיום מעבר — אבל לא בעליית הרכיב
  // (שם currentIndex=0 "משתנה" פעם ראשונה וגורר גלילה קופצנית לא רצויה).
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (phase === 'idle') headerRefs.current[currentIndex]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  return (
    <div className="mt-12">
      {/* כותרת + הנחיה */}
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
          {TITLE}
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        </h3>
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* אקורדיון (ימין) + נגן פריימים (שמאל) — אותו מבנה חזותי כמו OnboardingScene */}
      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-stretch">
        {/* פאנל השלבים — ילד ראשון → ימין ב-RTL */}
        <div className="space-y-1">
          {STATIONS.map((station, i) => {
            const passed = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isPendingTarget = i === pendingTarget;
            const expanded = expandedIndex === i;
            const locked = !isUnlocked(i);

            return (
              <div
                key={station.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  isCurrent || isPendingTarget
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !isCurrent && !isPendingTarget && 'opacity-80',
                  locked && 'opacity-60 hover:border-border hover:bg-bg-elevated',
                )}
              >
                <button
                  ref={(el) => {
                    headerRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => handleHeaderClick(i)}
                  aria-expanded={expanded}
                  aria-controls={`time-pressure-panel-${uid}-${station.id}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={locked}
                  disabled={locked}
                  className={cn(
                    'w-full p-3 text-start flex items-center gap-2.5 relative',
                    locked && 'cursor-not-allowed',
                  )}
                >
                  <span
                    className={cn(
                      'size-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      passed || isCurrent
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    {!locked && passed && !isCurrent && !isPendingTarget ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'font-display font-bold tracking-wide',
                        isCurrent || isPendingTarget ? 'text-accent' : 'text-brand-dark',
                        'text-base md:text-lg',
                      )}
                    >
                      {station.timeLabel}
                    </div>
                    <div className="font-display font-medium leading-tight transition-colors text-fg-muted text-base md:text-lg">
                      {station.frontLabel}
                    </div>
                  </div>
                  {!locked && (
                    <motion.span
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </motion.span>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key={`panel-${station.id}`}
                      id={`time-pressure-panel-${uid}-${station.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-brand/20">
                        <p className="mt-2 text-base leading-relaxed text-black">{station.stationText}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* נגן פריימים — ילד שני → שמאל ב-RTL; ללא מסגרת/רקע — התמונה תופסת
            את מלוא גובה עמודת האקורדיון (items-stretch) */}
        <div className="relative min-h-[220px] rounded-xl overflow-hidden bg-bg h-full">
          <TimePressureFramePlayer ref={playerRef} initialIndex={0} onPhaseChange={handlePhaseChange} onSettle={handleSettle} />
          {phase === 'loading' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-bg-elevated/90 px-3 py-1.5 shadow-sm">
                <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
                <span className="text-xs font-display font-bold text-fg-dim">טוען...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <InsightDisclosureWrapper />
    </div>
  );
}

/* ───────────────────────────── InsightDisclosure ─────────────────────────────
   תמיד פתוחה — אין כפתור גילוי, אין כותרת פנימית. */

function InsightDisclosureWrapper() {
  return (
    <div className="surface-elevated mt-5 p-5 sm:p-6">
      {INSIGHT_PARAGRAPHS.map((p) => (
        <p key={p} className="mt-3 first:mt-0 text-base leading-relaxed text-black text-pretty">
          {p}
        </p>
      ))}
    </div>
  );
}
