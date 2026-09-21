'use client';

/* ──────────────── ציר זמן — אקורדיון + סרט + שעון חול ────────────────
   Task 3 of docs/superpowers/plans/2026-09-21-topic-01-time-pressure-film-v3.md.
   מחליף את הגרסה הקודמת (Timeline strip + פאנל יחיד עם crossfade) במבנה
   השאול חזותית והתנהגותית מ-OnboardingScene.tsx: אקורדיון מימין (N סעיפים,
   נגזרים מ-STATIONS), מדיה משמאל (וידאו + שעון חול). כל התוכן המקורי
   מ-TimePressureContent.ts (כותרת, 5 תחנות, טבלה, שאלת מקור, הערת ציר זמן,
   3 פסקאות תובנה) נשמר. ראו:
   design/handoff/asymmetric-smooth-film-v3/CLAUDE-IMPLEMENTATION-FINAL.md
   design/handoff/asymmetric-smooth-film-v3/INTERACTION-ADDENDUM.md (§4/§5 — מכונת המצבים והחול)

   מכונת המצבים (§4.2): selectedIndex / currentIndex / viewedFrontId /
   visitedIndices / answers / phase — חמישה חלקי מצב נפרדים, לא מוזגים.
   expandedIndex הוא מצב שישי, נפרד גם הוא: איזה פאנל אקורדיון פתוח ויזואלית
   — סגירתו לבדה אינה משנה תחנה/סרט/חול (דרישה מפורשת בבריף). */

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { SandTimer } from './SandTimer';
import {
  INSIGHT_PARAGRAPHS,
  INSTRUCTION,
  JUST_ADDED_LABEL,
  NOT_IN_MODEL_LABEL,
  NOT_YET_ADDED_LABEL,
  QUESTION_HEADING,
  QUESTION_INSTRUCTION,
  SOURCE_QUESTION,
  STATIONS,
  TABLE_HEADER,
  TIMELINE_NOTE,
  TITLE,
  TRANSITION_QUESTIONS,
  UI,
  type Station,
  type StationId,
  type TransitionQuestion,
  type TransitionQuestionOption,
} from './TimePressureContent';

const STATION_COUNT = STATIONS.length;

/* קובצי המעבר — נתיבים מפורשים, לא נגזרים משמות STATIONS[].id: קובצי
   המדיה שאורגנו ותועדו ב-MEDIA-MAP.md משתמשים במילה "budget" בשם הקובץ
   (T01-field-to-budget.mp4) בעוד ה-id של התחנה הוא 'treasury' — שני שמות
   שונים לאותה תחנה, ממקורות שונים (תדריך ההפקה מול מודל התוכן). שינוי אחד
   מהם רק כדי ליישר קו היה נוגע בקבצים/במסמך שכבר תועדו ואושרו במשימה קודמת.
   המערך הזה מפורש בכוונה, לא string-interpolation מ-STATIONS[].id. אורכו
   הוא N−1 כנתון (כמו TRANSITION_QUESTIONS עצמו), אבל כל שימוש בו מוגן
   בגבולות שנגזרים מ-STATION_COUNT (ראו videoSrcFor). */
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

function questionFor(toIndex: number): TransitionQuestion | null {
  const toId = STATIONS[toIndex]?.id;
  if (!toId) return null;
  return TRANSITION_QUESTIONS.find((q) => q.toStationId === toId) ?? null;
}

/** נפח חול תחתון/עליון במנוחה לתחנה i מתוך N — §5, הנוסחה היחידה,
 * נגזרת תמיד מ-STATION_COUNT בפועל (לא 4/5 קבועים). */
function sandLevelsFor(index: number): { bottom: number; top: number } {
  if (STATION_COUNT <= 1) return { bottom: 10, top: 90 };
  const bottom = 10 + (80 * index) / (STATION_COUNT - 1);
  return { bottom, top: 100 - bottom };
}

type Phase = 'idle' | 'question' | 'feedback' | 'loading' | 'playing';
type AnswerState = { selectedOptionId: TransitionQuestionOption['id'] | null; submitted: boolean };

export function TimePressureExperience() {
  const uid = useId();
  const reducedMotion = !!useReducedMotion();

  // ── מכונת המצבים (§4.2) ──────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([0]));
  const [phase, setPhase] = useState<Phase>('idle');
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  // מצב שישי, נפרד: איזה פאנל אקורדיון פתוח ויזואלית — לא זהה ל-currentIndex.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  // עיון בחזית קודמת דרך הטבלה — קיים מהמימוש הקודם, אורתוגונלי לכל השאר.
  const [viewedFrontId, setViewedFrontId] = useState<StationId | null>(null);

  const [transitionProgress, setTransitionProgress] = useState(0);
  const [ambientMotionEnabled, setAmbientMotionEnabled] = useState(true);
  const [skipAheadNotice, setSkipAheadNotice] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preloadVideoRef = useRef<HTMLVideoElement | null>(null);
  const requestTokenRef = useRef(0);
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const wasPlayingRef = useRef(false);

  const current = STATIONS[currentIndex];
  const viewedIndex = viewedFrontId ? STATIONS.findIndex((s) => s.id === viewedFrontId) : -1;
  const viewingPrevious = viewedIndex >= 0 && viewedIndex < currentIndex;
  const panelStation: Station = viewedIndex >= 0 ? STATIONS[viewedIndex] : current;
  const panelText = viewedFrontId === null ? current.stationText : panelStation.frontDetail;

  const viewFront = (id: StationId) => setViewedFrontId(id);
  const backToAdded = () => setViewedFrontId(null);

  // ── עזרי מדיה/חול ───────────────────────────────────────────────

  const clearVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.removeAttribute('src');
    v.load();
  };

  /** מסיימים כל מעבר פעיל מיידית ליעדו (§5/§7: דילוג/כשל/reduced-motion/
   * דריסה על-ידי בקשה חדשה — כולם "מגיעים" לתחנה בלי המתנה נוספת). */
  const settleTransition = (toIndex: number) => {
    requestTokenRef.current += 1;
    clearVideo();
    setPhase('idle');
    setSelectedIndex(null);
    setTransitionProgress(0);
    setCurrentIndex(toIndex);
    setVisitedIndices((prev) => {
      const next = new Set(prev);
      next.add(toIndex);
      return next;
    });
    setViewedFrontId(null);
    setAnnouncement(UI.liveUpdate(STATIONS[toIndex], toIndex + 1));
  };

  /** בקשת תחנה — נקודת הכניסה היחידה לכל ניווט (לחיצת אקורדיון).
   *
   * אם מעבר פעיל באמצע נגינה/טעינה, מסיימים אותו קודם כדילוג (§5/§7) —
   * ומחשבים את "מבוקר הביקורים האפקטיבי" הזה מקומית (effectiveVisited/
   * effectiveCurrent) במקום לקרוא את visitedIndices/currentIndex מה-closure:
   * setState אסינכרוני, כך שמייד אחרי הקריאה ל-settleTransition הערכים
   * הישנים עדיין "יושבים" במשתנים המקומיים של הקריאה הנוכחית לפונקציה. בלי
   * החישוב המקומי הזה, "גבול ההתקדמות הבא" היה מחושב מהתחנה הישנה (לפני
   * הדילוג) ולא מהתחנה שאליה בדיוק סיימנו לדלג. */
  const requestStation = (target: number) => {
    if (target < 0 || target >= STATION_COUNT) return;

    let effectiveVisited = visitedIndices;

    if (phase === 'playing' || phase === 'loading') {
      const settledTo = selectedIndex ?? currentIndex;
      settleTransition(settledTo);
      effectiveVisited = new Set(visitedIndices).add(settledTo);
    } else if (phase === 'question' || phase === 'feedback') {
      // חזרה לאחור בזמן שאלה מבטלת את יעד המעבר; תשובה שכבר הוגשה נשמרת
      // ב-answers (לא נוגעים בה כאן) — §4 "חזרה לאחור בזמן שאלה מבטלת...".
      requestTokenRef.current += 1;
      setSelectedIndex(null);
      setPhase('idle');
    }

    if (effectiveVisited.has(target)) {
      // קפיצה חופשית: תמיד מותרת, בלי שאלה ובלי נגינה חוזרת.
      requestTokenRef.current += 1;
      clearVideo();
      setCurrentIndex(target);
      setViewedFrontId(null);
      return;
    }

    // תחנה שטרם נצפתה: לעולם פותחים רק את גבול ההתקדמות המיידי הבא, לא את
    // התחנה שבפועל נלחצה — "מתקדמים תחנה אחת בכל פעם" (§4.1).
    const nextBoundary = Math.max(...Array.from(effectiveVisited)) + 1;
    setSkipAheadNotice(target !== nextBoundary);

    requestTokenRef.current += 1;
    setSelectedIndex(nextBoundary);
    setExpandedIndex(nextBoundary);
    // אם השאלה הזו כבר נענתה בעבר (חזרה לאחור ואז קדימה שוב) — ממשיכים
    // ממש ממשוב, לא מאפסים לשאלה ריקה (§4.1 "התשובה והמשוב נשמרים").
    const boundaryQuestion = questionFor(nextBoundary);
    const alreadySubmitted = boundaryQuestion ? !!answers[boundaryQuestion.id]?.submitted : false;
    setPhase(alreadySubmitted ? 'feedback' : 'question');
  };

  const handleHeaderClick = (i: number) => {
    if (i === expandedIndex) {
      // סגירת האקורדיון הפעיל בלבד — אינה משנה תחנה/סרט/חול.
      setExpandedIndex(null);
      return;
    }
    setExpandedIndex(i);
    requestStation(i);
  };

  const handleSelectOption = (question: TransitionQuestion, optionId: TransitionQuestionOption['id']) => {
    setAnswers((prev) => ({ ...prev, [question.id]: { selectedOptionId: optionId, submitted: false } }));
  };

  const handleCheckAnswer = (question: TransitionQuestion) => {
    const answer = answers[question.id];
    if (!answer?.selectedOptionId) return;
    const option = question.options.find((o) => o.id === answer.selectedOptionId);
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], submitted: true } }));
    setPhase('feedback');
    if (option) {
      setAnnouncement(`${option.correct ? 'תשובה נכונה. ' : 'תשובה שגויה. '}${option.feedback}`);
    }
  };

  const handleRetry = (question: TransitionQuestion) => {
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], submitted: false } }));
    setPhase('question');
  };

  const handleContinue = (question: TransitionQuestion) => {
    if (selectedIndex === null) return;
    const fromIndex = currentIndex;
    const toIndex = selectedIndex;
    const src = videoSrcFor(fromIndex);

    if (reducedMotion || !src) {
      settleTransition(toIndex);
      return;
    }

    requestTokenRef.current += 1;
    const token = requestTokenRef.current;
    setTransitionProgress(0);
    setPhase('loading');

    const v = videoRef.current;
    if (!v) {
      settleTransition(toIndex);
      return;
    }
    v.src = src;
    v.load();
    v.oncanplay = () => {
      if (requestTokenRef.current !== token) return;
      setPhase('playing');
      v.play().catch(() => {
        if (requestTokenRef.current === token) settleTransition(toIndex);
      });
    };
    v.onerror = () => {
      if (requestTokenRef.current === token) settleTransition(toIndex);
    };
  };

  const handleSkipAnimation = () => {
    if (selectedIndex === null) return;
    settleTransition(selectedIndex);
  };

  const handleReset = () => {
    requestTokenRef.current += 1;
    clearVideo();
    setCurrentIndex(0);
    setSelectedIndex(null);
    setVisitedIndices(new Set([0]));
    setPhase('idle');
    setAnswers({});
    setExpandedIndex(0);
    setViewedFrontId(null);
    setTransitionProgress(0);
    setSkipAheadNotice(false);
  };

  // ── אירועי הווידאו — timeupdate הוא מקור האמת היחיד להתקדמות; אין
  //    טיימר עצמאי. buffering/waiting פשוט לא מפיקים timeupdate, כך
  //    שההתקדמות קופאת מעצמה בלי טיפול מיוחד. ────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      if (phase !== 'playing' || !v.duration) return;
      setTransitionProgress(Math.min(1, v.currentTime / v.duration));
    };
    const onEnded = () => {
      if (selectedIndex !== null) settleTransition(selectedIndex);
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedIndex]);

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

  // מיקוד לכותרת השאלה בפתיחתה, וליעד תיוג המעבר החדש בסיומו — לא בלולאות
  // רינדור סתמיות, רק בעקבות בקשה מפורשת.
  useEffect(() => {
    if (phase === 'question') {
      questionHeadingRef.current?.focus();
    }
  }, [phase, selectedIndex]);
  useEffect(() => {
    if (phase === 'idle') {
      headerRefs.current[currentIndex]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const activeQuestion = selectedIndex !== null ? questionFor(selectedIndex) : null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;

  const restLevels = sandLevelsFor(currentIndex);
  const targetLevels = selectedIndex !== null ? sandLevelsFor(selectedIndex) : null;
  const isTransitioning = phase === 'loading' || phase === 'playing';

  const panelKey = `${current.id}-${viewedFrontId ?? 'default'}`;
  const fadeTransition = reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' as const };

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

      {/* אקורדיון (ימין) + מדיה (שמאל) — אותו מבנה חזותי כמו OnboardingScene */}
      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-stretch">
        {/* פאנל השלבים — ילד ראשון → ימין ב-RTL */}
        <div className="space-y-1">
          {STATIONS.map((station, i) => {
            const visited = visitedIndices.has(i);
            const isCurrent = i === currentIndex && phase === 'idle';
            const isPendingTarget = i === selectedIndex;
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
                  visited && !isCurrent && !isPendingTarget && 'opacity-80',
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
                      visited || isCurrent
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    {visited && !isCurrent && !isPendingTarget ? (
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
                        {isPendingTarget && activeQuestion && (phase === 'question' || phase === 'feedback') ? (
                          <QuestionPanel
                            question={activeQuestion}
                            answer={activeAnswer}
                            phase={phase}
                            skipAheadNotice={skipAheadNotice}
                            headingRef={questionHeadingRef}
                            onSelect={(optionId) => handleSelectOption(activeQuestion, optionId)}
                            onCheck={() => handleCheckAnswer(activeQuestion)}
                            onRetry={() => handleRetry(activeQuestion)}
                            onContinue={() => handleContinue(activeQuestion)}
                          />
                        ) : (
                          <p className="mt-2 text-base leading-relaxed text-black">{station.stationText}</p>
                        )}
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

        {/* מדיה — ילד שני → שמאל ב-RTL */}
        <div className="surface-elevated bg-bg-accent p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex gap-3 items-stretch flex-1">
            {/* וידאו — ילד ראשון בשורה הפנימית → ימין השורה (לא קשור לצד
                העמודה החיצונית; שעון החול הוא זה שצריך לשבת בקצה השמאלי
                החזותי של הווידאו, כפי שהשורה השנייה מבטיחה). */}
            <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden bg-bg" style={{ aspectRatio: '16 / 9' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                preload="metadata"
                poster={current.image.src}
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
              {isTransitioning && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <button type="button" onClick={handleSkipAnimation} className="btn-ghost text-xs bg-bg-elevated/90">
                    {UI.skipAnimation}
                  </button>
                </div>
              )}
            </div>

            {/* שעון חול — קצה שמאלי חזותי (inline-end), עמודה קומפקטית */}
            <div className="shrink-0 w-16 flex flex-col items-center justify-center gap-2">
              <SandTimer
                bottomPercent={restLevels.bottom}
                targetBottomPercent={targetLevels?.bottom}
                transitionProgress={transitionProgress}
                phase={isTransitioning ? 'transitioning' : 'idle'}
                ambientMotionEnabled={ambientMotionEnabled && !reducedMotion}
                reducedMotion={reducedMotion}
              />
              <span className="text-[11px] font-display font-bold text-fg-muted text-center leading-tight">
                {UI.sandtimerLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs leading-relaxed text-fg-dim text-pretty flex-1 min-w-0">{UI.sandtimerCaption}</p>
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setAmbientMotionEnabled((v) => !v)}
                className="btn-ghost text-xs shrink-0"
              >
                {ambientMotionEnabled ? UI.stopMotion : UI.resumeMotion}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* טבלת השוואה */}
      <ComparisonTable currentIndex={currentIndex} viewedFrontId={viewedFrontId} onViewFront={viewFront} />

      {viewingPrevious && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusChip tone="neutral">{UI.viewingPrevious(panelStation.frontLabel)}</StatusChip>
          <button type="button" onClick={backToAdded} className="btn-ghost text-sm">
            {UI.backToAdded}
          </button>
        </div>
      )}
      {viewingPrevious && (
        <AnimatePresence mode="wait">
          <motion.p
            key={panelKey}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={fadeTransition}
            className="mt-2 text-sm leading-relaxed text-fg-muted text-pretty"
          >
            {panelText}
          </motion.p>
        </AnimatePresence>
      )}

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

/* ─────────────────────────────── QuestionPanel ───────────────────────────────
   שאלת הגבול — בתוך פאנל האקורדיון של התחנה שמנסים להגיע אליה. הסרט
   ותמונת התחנה הנוכחית (לא היעד) נשארים מוצגים לאורך כל השאלה (§4 שלב 2). */

function QuestionPanel({
  question,
  answer,
  phase,
  skipAheadNotice,
  headingRef,
  onSelect,
  onCheck,
  onRetry,
  onContinue,
}: {
  question: TransitionQuestion;
  answer: AnswerState | undefined;
  phase: Phase;
  skipAheadNotice: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSelect: (optionId: TransitionQuestionOption['id']) => void;
  onCheck: () => void;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const groupUid = useId();
  const submitted = phase === 'feedback' && !!answer?.submitted;
  const selectedOption = question.options.find((o) => o.id === answer?.selectedOptionId);

  return (
    <div className="mt-2 space-y-3">
      <h4
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-lg font-bold leading-tight text-black outline-none"
      >
        {QUESTION_HEADING}
      </h4>
      <p className="text-sm leading-relaxed text-fg-muted">{QUESTION_INSTRUCTION}</p>
      {skipAheadNotice && (
        <p className="text-sm leading-relaxed text-accent">{UI.sequentialProgressNotice}</p>
      )}

      <fieldset>
        <legend className="text-base leading-relaxed text-black mb-3">{question.prompt}</legend>
        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const isSelected = answer?.selectedOptionId === option.id;
            const showResult = submitted && isSelected;
            const isCorrectReveal = submitted && option.correct;
            return (
              <label
                key={option.id}
                className={cn(
                  'flex items-start gap-2.5 text-start p-3 rounded-xl border text-sm transition-all duration-300 ease-snap cursor-pointer',
                  isCorrectReveal
                    ? 'border-status-ok/50 bg-status-ok/10'
                    : showResult
                      ? 'border-status-danger/50 bg-status-danger/10'
                      : isSelected
                        ? 'border-brand/45 bg-brand/[0.05]'
                        : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <input
                  type="radio"
                  name={`${groupUid}-${question.id}`}
                  value={option.id}
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => onSelect(option.id)}
                  className="mt-1 shrink-0"
                />
                <span className="flex-1 text-black">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!submitted && (
        <button
          type="button"
          onClick={onCheck}
          disabled={!answer?.selectedOptionId}
          className={cn('btn-primary', !answer?.selectedOptionId && 'opacity-45 cursor-not-allowed')}
        >
          בדקו את התשובה
        </button>
      )}

      {submitted && selectedOption && (
        <div className="space-y-3">
          <p
            className={cn(
              'text-sm leading-relaxed rounded-xl border p-3',
              selectedOption.correct
                ? 'text-status-ok border-status-ok/50 bg-status-ok/10'
                : 'text-status-danger border-status-danger/50 bg-status-danger/10',
            )}
          >
            {selectedOption.feedback}
          </p>
          <p className="text-sm leading-relaxed text-fg-muted">{question.explanation}</p>
          <div className="flex flex-wrap gap-3">
            {!selectedOption.correct && (
              <button type="button" onClick={onRetry} className="btn-secondary text-sm">
                נסו שוב
              </button>
            )}
            <button type="button" onClick={onContinue} className="btn-primary">
              {question.continueLabel}
              <Icon name="arrow-left" size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── ComparisonTable ─────────────────────────────
   ללא שינוי מהמימוש הקודם — עדיין נגזר מ-currentIndex בלבד (לא selectedIndex),
   בהתאם ל-§4.2: "הסרט, ספירת החזיתות והחול עדיין משויכים ל-currentIndex". */

function RegularStatusCell({ i, currentIndex }: { i: number; currentIndex: number }) {
  if (i > currentIndex) return <StatusChip tone="dim">{NOT_YET_ADDED_LABEL}</StatusChip>;
  if (i === currentIndex) return <StatusChip tone="accent">{JUST_ADDED_LABEL}</StatusChip>;
  return (
    <StatusChip tone="neutral" icon={<Icon name="check" size={12} strokeWidth={3} />}>
      {STATIONS[i].frontLabel}
    </StatusChip>
  );
}

function ComparisonTable({
  currentIndex,
  viewedFrontId,
  onViewFront,
}: {
  currentIndex: number;
  viewedFrontId: StationId | null;
  onViewFront: (id: StationId) => void;
}) {
  return (
    <div className="surface-elevated mt-5 overflow-hidden">
      <div className="border-b border-border-subtle p-4 sm:p-5">
        <h4 className="font-display text-lg font-bold leading-tight text-black sm:text-xl">
          {SOURCE_QUESTION}
        </h4>
      </div>

      <div className="grid grid-cols-3 border-b border-border-strong bg-bg-accent">
        <div className="flex items-center p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.front}
          </span>
        </div>
        <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.regular}
          </span>
        </div>
        <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.irregular}
          </span>
        </div>
      </div>

      {STATIONS.map((station, i) => {
        const reached = i <= currentIndex;
        return (
          <div key={station.id} className="grid grid-cols-3 border-b border-border-subtle last:border-b-0">
            <div className="flex items-center p-3 sm:p-4">
              {reached ? (
                <button
                  type="button"
                  onClick={() => onViewFront(station.id)}
                  aria-current={viewedFrontId === station.id ? 'true' : undefined}
                  className={cn(
                    'rounded-sm text-start font-display text-base font-bold underline-offset-4 hover:underline',
                    viewedFrontId === station.id ? 'text-accent' : 'text-black',
                  )}
                >
                  {station.frontLabel}
                </button>
              ) : (
                <span className="font-display text-base font-bold text-fg-dim">{station.frontLabel}</span>
              )}
            </div>
            <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
              <RegularStatusCell i={i} currentIndex={currentIndex} />
            </div>
            <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
              {i === 0 ? (
                <RegularStatusCell i={0} currentIndex={currentIndex} />
              ) : (
                <StatusChip tone="dim">{NOT_IN_MODEL_LABEL}</StatusChip>
              )}
            </div>
          </div>
        );
      })}
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
