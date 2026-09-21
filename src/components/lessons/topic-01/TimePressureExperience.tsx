'use client';

/* ──────────────── ציר זמן — אקורדיון + סרט ────────────────
   מבנה השאול חזותית והתנהגותית מ-OnboardingScene.tsx: אקורדיון מימין (N
   סעיפים, נגזרים מ-STATIONS), וידאו משמאל. לחיצה על סעיף אקורדיון מציגה
   את התחנה שלו; אם היא התחנה הבאה ברצף (מיד אחרי הנוכחית), מתנגן סרט
   המעבר האמיתי בין שתי התחנות; כל בקשה אחרת (אחורה, או קדימה יותר מתחנה
   אחת) קופצת ישירות לתמונת התחנה, בלי סרט — בדיוק כמו עיון חוזר בתחנה
   שכבר נצפתה. אין שער שאלות, אין שעון חול, אין טבלת השוואה — לפי בקשת
   המשתמש מ-2026-09-21 (הוסרו לגמרי מהפעילות; ראו היסטוריית git לגרסה
   הקודמת אם ידרשו בעתיד). כל התוכן הנרטיבי המקורי מ-TimePressureContent.ts
   (כותרת, 5 תחנות, הערת ציר זמן, 3 פסקאות תובנה) נשמר. */

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { INSIGHT_PARAGRAPHS, INSTRUCTION, STATIONS, TIMELINE_NOTE, TITLE, UI } from './TimePressureContent';

const STATION_COUNT = STATIONS.length;

/* קובצי המעבר — נתיבים מפורשים, לא נגזרים משמות STATIONS[].id: קובצי
   המדיה שאורגנו ותועדו ב-MEDIA-MAP.md משתמשים במילה "budget" בשם הקובץ
   (T01-field-to-budget.mp4) בעוד ה-id של התחנה הוא 'treasury' — שני שמות
   שונים לאותה תחנה, ממקורות שונים (תדריך ההפקה מול מודל התוכן). המערך
   מפורש בכוונה, לא string-interpolation מ-STATIONS[].id; כל שימוש בו
   מוגן בגבולות שנגזרים מ-STATION_COUNT (ראו videoSrcFor). */
const TRANSITION_VIDEO_SRC: readonly string[] = [
  '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/transitions/T01-field-to-budget.mp4',
  '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/transitions/T02-budget-to-public.mp4',
  '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/transitions/T03-public-to-politics.mp4',
  '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/transitions/T04-politics-to-international.mp4',
];

function videoSrcFor(fromIndex: number): string | null {
  if (fromIndex < 0 || fromIndex >= STATION_COUNT - 1) return null;
  return TRANSITION_VIDEO_SRC[fromIndex] ?? null;
}

type Phase = 'idle' | 'loading' | 'playing';

export function TimePressureExperience() {
  const uid = useId();
  const reducedMotion = !!useReducedMotion();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [announcement, setAnnouncement] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preloadVideoRef = useRef<HTMLVideoElement | null>(null);
  const requestTokenRef = useRef(0);
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wasPlayingRef = useRef(false);
  const didMountRef = useRef(false);

  const current = STATIONS[currentIndex];
  const isTransitioning = phase === 'loading' || phase === 'playing';

  const clearVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.removeAttribute('src');
    v.load();
  };

  const settleTo = (target: number) => {
    requestTokenRef.current += 1;
    clearVideo();
    setPhase('idle');
    setPendingTarget(null);
    setCurrentIndex(target);
    setAnnouncement(UI.liveUpdate(STATIONS[target], target + 1));
  };

  /** בקשת תחנה — נקודת הכניסה היחידה לכל ניווט (לחיצת אקורדיון). רק
   * בקשה לתחנה הבאה ברצף (target === currentIndex + 1) מפעילה את סרט
   * המעבר האמיתי; כל בקשה אחרת (אחורה, או קדימה של יותר מתחנה אחת) קופצת
   * ישירות, בלי נגינה — עיון חופשי בכל תחנה, ללא שער או סדר מחייב. */
  const requestStation = (target: number) => {
    if (target < 0 || target >= STATION_COUNT || target === currentIndex) return;

    const forwardAdjacent = target === currentIndex + 1;
    const src = forwardAdjacent ? videoSrcFor(currentIndex) : null;

    if (reducedMotion || !src) {
      settleTo(target);
      return;
    }

    requestTokenRef.current += 1;
    const token = requestTokenRef.current;
    setPendingTarget(target);
    setPhase('loading');

    const v = videoRef.current;
    if (!v) {
      settleTo(target);
      return;
    }
    v.src = src;
    v.load();
    v.oncanplay = () => {
      if (requestTokenRef.current !== token) return;
      setPhase('playing');
      v.play().catch(() => {
        if (requestTokenRef.current === token) settleTo(target);
      });
    };
    v.onerror = () => {
      if (requestTokenRef.current === token) settleTo(target);
    };
  };

  const handleHeaderClick = (i: number) => {
    if (i === expandedIndex) {
      // סגירת האקורדיון הפעיל בלבד — אינה משנה תחנה/סרט.
      setExpandedIndex(null);
      return;
    }
    setExpandedIndex(i);
    requestStation(i);
  };

  const handleSkipAnimation = () => {
    if (pendingTarget !== null) settleTo(pendingTarget);
  };

  const handleReset = () => {
    requestTokenRef.current += 1;
    clearVideo();
    setCurrentIndex(0);
    setPhase('idle');
    setPendingTarget(null);
    setExpandedIndex(0);
  };

  // סיום הסרט מוביל תמיד ליעד המבוקש — פעם אחת, בלי לולאה.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => {
      if (pendingTarget !== null) settleTo(pendingTarget);
    };
    v.addEventListener('ended', onEnded);
    return () => v.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTarget]);

  // עצירה בעת מעבר ללשונית אחרת; חזרה אינה "משלימה" זמן שנעדר.
  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        wasPlayingRef.current = phase === 'playing' && !v.paused;
        v.pause();
      } else if (wasPlayingRef.current && phase === 'playing') {
        v.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  // טעינה מראש מוגבלת: תמונת התחנה הבאה + סרטון המעבר הבא, תחנה אחת קדימה.
  // הווידאו מוטען מראש דרך <video preload> חבוי, לא <link rel="preload"
  // as="video"> — דפדפני Chromium אינם תומכים בפועל בערך "video" עבור
  // preload (אזהרת קונסולה "unsupported `as` value" אף שהוא תקני להלכה).
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const nextStation = STATIONS[currentIndex + 1];
    if (nextStation) {
      const imgLink = document.createElement('link');
      imgLink.rel = 'preload';
      imgLink.as = 'image';
      imgLink.href = nextStation.image.src;
      document.head.appendChild(imgLink);
      links.push(imgLink);
    }
    const nextVideoSrc = videoSrcFor(currentIndex);
    const preloadVideo = preloadVideoRef.current;
    if (preloadVideo && nextVideoSrc) {
      preloadVideo.src = nextVideoSrc;
      preloadVideo.load();
    }
    return () => {
      links.forEach((l) => document.head.removeChild(l));
      if (preloadVideo) {
        preloadVideo.removeAttribute('src');
        preloadVideo.load();
      }
    };
  }, [currentIndex]);

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
        <p className="mt-2 text-base leading-relaxed text-fg-muted">{INSTRUCTION}</p>
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* אקורדיון (ימין) + וידאו (שמאל) — אותו מבנה חזותי כמו OnboardingScene */}
      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-stretch">
        {/* פאנל השלבים — ילד ראשון → ימין ב-RTL */}
        <div className="space-y-1">
          {STATIONS.map((station, i) => {
            const passed = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isPendingTarget = i === pendingTarget;
            const expanded = expandedIndex === i;
            const showTargetBadge = isPendingTarget && isTransitioning;

            return (
              <div
                key={station.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  isCurrent || isPendingTarget
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !isCurrent && !isPendingTarget && 'opacity-80',
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
                  className="w-full p-4 text-start flex items-center gap-3 relative"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      passed || isCurrent
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    {passed && !isCurrent && !isPendingTarget ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-display font-bold text-fg-dim tracking-wide">{station.timeLabel}</div>
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">
                      {station.frontLabel}
                    </div>
                  </div>
                  {showTargetBadge && (
                    <span className="shrink-0 text-xs font-display font-bold text-accent">מעבר אל…</span>
                  )}
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="22"
                      height="22"
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
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <p className="mt-2 text-base leading-relaxed text-black">{station.stationText}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <button type="button" onClick={handleReset} className="btn-ghost text-sm mt-2">
            {UI.resetActivity}
          </button>
        </div>

        {/* וידאו — ילד שני → שמאל ב-RTL */}
        <div className="surface-elevated bg-bg-accent p-3 sm:p-4">
          <div className="relative min-h-[220px] rounded-xl overflow-hidden bg-bg" style={{ aspectRatio: '16 / 9' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              preload="metadata"
              poster={current.image.src}
              aria-label={current.image.alt}
              className="absolute inset-0 size-full object-contain bg-bg"
            />
            {/* וידאו חבוי, לא-ניתן-לצפייה: מקדים בטעינה את סרטון המעבר
                הבא (תחנה אחת קדימה בלבד) כדי שלא יהיה המתנה כשמגיעים
                אליו בפועל. אין לו תפקיד ויזואלי. */}
            <video ref={preloadVideoRef} muted preload="auto" aria-hidden className="hidden" />
            {phase === 'loading' && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <div className="flex items-center gap-2 rounded-full bg-bg-elevated/90 px-3 py-1.5 shadow-sm">
                  <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
                  <span className="text-xs font-display font-bold text-fg-dim">טוען...</span>
                </div>
              </div>
            )}
            {phase === 'playing' && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <button type="button" onClick={handleSkipAnimation} className="btn-ghost text-xs bg-bg-elevated/90">
                  {UI.skipAnimation}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* שורת סיכום */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusChip tone="accent">{UI.regularSummary(currentIndex + 1)}</StatusChip>
        <StatusChip tone="neutral">{UI.irregularSummary}</StatusChip>
        <span className="text-sm text-fg-muted">{UI.summaryTag}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">{TIMELINE_NOTE}</p>

      <InsightDisclosureWrapper />
    </div>
  );
}

/* ───────────────────────────── InsightDisclosure ─────────────────────────────
   ללא שינוי — גילוי פשוט, זמין תמיד, לא מותנה בהתקדמות בפעילות. */

function InsightDisclosureWrapper() {
  const [open, setOpen] = useState(false);
  const uid = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-insight`}
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary mt-5"
      >
        {UI.toggleInsight}
      </button>
      {open && (
        <div id={`${uid}-insight`} className="surface-elevated mt-3 p-5 sm:p-6">
          <h4 className="font-display text-xl font-bold leading-tight text-black">{UI.insightHeading}</h4>
          {INSIGHT_PARAGRAPHS.map((p) => (
            <p key={p} className="mt-3 text-base leading-relaxed text-black text-pretty">
              {p}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
