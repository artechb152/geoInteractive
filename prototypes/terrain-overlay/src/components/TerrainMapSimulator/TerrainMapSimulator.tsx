'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './TerrainMapSimulator.css';
import { TERRAIN_AREAS, DEFAULT_AREA_ID, getAreaById } from '../../data/areas';
import type { Point, SelectedFeatureId, TerrainFeature } from '../../data/types';
import { I18nProvider, dirFor, getDict, type Locale } from '../../i18n';
import MapCanvas from './MapCanvas';
import CompareSlider from './CompareSlider';
import ZoomControls from './ZoomControls';
import AreaPicker from './AreaPicker';
import FeatureLegend from './FeatureLegend';
import FeatureInfoCard from './FeatureInfoCard';
import CrossAreaCompare from './CrossAreaCompare';
import CheatSheet from './CheatSheet';
import ProgressBar from './ProgressBar';
import Onboarding, { KeyboardHelp } from './Onboarding';
import { GlossarySheet } from './Glossary';
import { LessonBar, LessonIntro } from './Lesson';
import ElevationProfile, { cutForFeature, type ProfileLine } from './ElevationProfile';
import QuizPanel from './quiz/QuizPanel';
import QuizSummary from './quiz/QuizSummary';
import {
  advance,
  createQuiz,
  currentQuestion,
  hintFor,
  proximityFeedback,
  submitAnswer,
  summarize,
  type QuizLevel,
  type QuizState,
} from './quiz/quizEngine';
import { useZoomPan } from './hooks/useZoomPan';
import { useLatestRef } from './hooks/useLatestRef';
import { useAnnounce, useLocalState, clearStoredState } from './hooks/useLocalState';
import { compassOf, describeArea } from './lib/text';
import {
  DEFAULT_FADE,
  DEFAULT_WIPE,
  availableModes,
  layersFor,
  normalizeMode,
  type CompareMode,
} from './lib/compare';
import { readDeepLink, shareUrl, writeDeepLink, type DeepLinkState } from './lib/deepLink';
import {
  ACTIVITY,
  DEFAULT_IRI,
  isoDuration,
  snapshot,
  statement,
  type CompletionResult,
  type ProgressEvent,
  type XapiStatement,
} from './lib/progress';
import {
  TEST_LENGTH,
  TEST_PASS,
  advanceTour,
  backTour,
  createLesson,
  nextStage,
  type LessonState,
} from './lib/lesson';

/* ------------------------------ אירועים ------------------------------ */

/** אירועי מדידה פדגוגית. אין בהם שום מזהה אישי. */
export type TmsEvent =
  | { type: 'area-view'; areaId: string }
  | { type: 'feature-view'; areaId: string; featureId: string; ms: number }
  | { type: 'quiz-start'; areaId: string; level: QuizLevel }
  | {
      type: 'quiz-answer';
      areaId: string;
      featureId: string;
      mode: string;
      correct: boolean;
      usedHint: boolean;
      ms: number;
    }
  | { type: 'quiz-complete'; areaId: string; score: number; percent: number; missed: string[] }
  | { type: 'glossary-open'; termId: string }
  | { type: 'compare-mode'; areaId: string; mode: CompareMode }
  | { type: 'lesson-stage'; areaId: string; stage: string }
  | { type: 'profile-open'; areaId: string; featureId?: string }
  | { type: 'error'; message: string };

export type TmsMode = 'explore' | 'quiz' | 'lesson';

export interface TerrainMapSimulatorProps {
  /** אזור פתיחה. כשמסופק — הרכיב נשלט מבחוץ ואינו זוכר אזור אחר. */
  areaId?: string;
  /** מצב פתיחה. */
  mode?: TmsMode;
  /** ערך פתיחה למחוון ההשוואה (0..1). */
  initialBlend?: number;
  /** מצב ההשוואה ההתחלתי. ברירת המחדל היא וילון, ולא שקיפות. */
  compareMode?: CompareMode;
  /** הסתרת המקרא — לשילוב בדף צר, או כשהמקרא מיותר במסך מבחן. */
  showLegend?: boolean;
  /** הסתרת בורר האזורים — כשהקורס מנהל בעצמו את רצף האזורים. */
  showAreaPicker?: boolean;
  /** הסתרת מחוון ההתקדמות. */
  showProgress?: boolean;
  /** שפת הממשק. קובעת גם את `dir` — אין `rtl` קשיח. */
  locale?: Locale;
  /** רמת הכותרת הנראית, לשילוב תקין בהיררכיית דף הקורס. */
  headingLevel?: 2 | 3 | 4;
  /** קריאה וכתיבה של המצב אל ה-hash. כבו כשיש כמה רכיבים באותו דף. */
  deepLink?: boolean;
  className?: string;
  /** אירועי מדידה גולמיים. */
  onEvent?: (event: TmsEvent) => void;
  /** כל שינוי במצב הלמידה. */
  onProgress?: (event: ProgressEvent) => void;
  /** אירוע יחיד ברגע שתנאי ההשלמה התקיים. */
  onComplete?: (result: CompletionResult) => void;
  /** ייצור הצהרות xAPI. הרכיב אינו שולח אותן לשום מקום — הקורס מחליט. */
  emitXapi?: boolean;
  onXapi?: (stmt: XapiStatement) => void;
  xapiBaseIri?: string;
}

type Sheet = 'help' | 'glossary' | 'summary' | 'areas' | null;

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const MOBILE_MAX = 620;

/**
 * TerrainMapSimulator — סימולטור זיהוי צורות שטח.
 *
 * שכבות מיושרות של אותו שטח (תצ״א, מפה טופוגרפית והצללת תבליט), שכבת צורות
 * שחולצה ממודל גובה אמיתי, זום ולופה, חתך גובה, מצב תרגול, מסלול שיעור
 * מובנה, ובורר בין מספר אזורי לימוד.
 * Client Component (מצב ואירועים).
 */
export default function TerrainMapSimulator({
  areaId: areaIdProp,
  mode: modeProp = 'explore',
  initialBlend,
  compareMode: compareModeProp,
  showLegend = true,
  showAreaPicker = true,
  showProgress = true,
  locale = 'he',
  headingLevel = 2,
  deepLink = true,
  className,
  onEvent,
  onProgress,
  onComplete,
  emitXapi = false,
  onXapi,
  xapiBaseIri = DEFAULT_IRI,
}: TerrainMapSimulatorProps) {
  const t = getDict(locale);

  /* ---------------------------- קישור עמוק ---------------------------- */

  /**
   * הקישור נקרא **פעם אחת** בעלייה. קריאה מתמשכת הייתה נלחמת בכתיבה שהרכיב
   * עצמו מבצע, והמצב היה קופץ אחורה בכל שינוי.
   *
   * `useState` עם פונקציית אתחול ולא `useRef(...).current`: שניהם מחשבים
   * פעם אחת, אבל רק הראשון מיועד לקריאה בזמן רינדור. `ref` שנקרא ברינדור
   * אינו בטוח תחת רינדור מקבילי, וזה מה שכלל `react-hooks/refs` מסמן.
   */
  const [initial] = useState<DeepLinkState>(() =>
    deepLink && typeof window !== 'undefined'
      ? readDeepLink(window.location.search, window.location.hash)
      : {},
  );

  /* ------------------------------- מצב ------------------------------- */

  /* הקישור העמוק גובר על המצב השמור — ראו ההסבר ב-useLocalState. */
  const [storedAreaId, setStoredAreaId] = useLocalState(
    'area',
    DEFAULT_AREA_ID,
    initial.area && getAreaById(initial.area).id === initial.area ? initial.area : null,
  );
  const areaId = areaIdProp ?? storedAreaId;
  const area = getAreaById(areaId);

  const modes = useMemo(() => availableModes(area), [area]);
  const [compareMode, setCompareModeRaw] = useLocalState<CompareMode>(
    'compare',
    compareModeProp ?? 'wipe',
    initial.compare ? normalizeMode(area, initial.compare) : null,
  );
  /* ברירות מחדל נפרדות: הווילון נפתח באמצע (שם הוא הכי קריא), והשקיפות
     נפתחת ב-0 (תצ״א מלא). ערך משותף היה גורר את השקיפות בדיוק ל-50% —
     המצב שבו שתי השכבות בוציות ואף אחת אינה קריאה. */
  const [wipe, setWipe] = useLocalState(
    'wipe',
    initialBlend ?? DEFAULT_WIPE,
    initial.blend ?? null,
  );
  const [fade, setFade] = useLocalState(
    'blend',
    initialBlend ?? DEFAULT_FADE,
    initial.blend ?? null,
  );
  const usesWipe = compareMode === 'wipe' || compareMode === 'split';
  const blend = usesWipe ? wipe : fade;
  const setBlend = usesWipe ? setWipe : setFade;

  const [seenByArea, setSeenByArea] = useLocalState<Record<string, string[]>>('seen', {});
  const [quizByArea, setQuizByArea] = useLocalState<Record<string, number>>('quizPercent', {});
  const [tourDone, setTourDone] = useLocalState('tour', false);

  const [selectedId, setSelectedId] = useState<SelectedFeatureId>(initial.feature ?? null);
  const [previewId, setPreviewId] = useState<SelectedFeatureId>(null);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [compareFeatureId, setCompareFeatureId] = useState<string | null>(null);
  const [loupe, setLoupe] = useState(false);
  const [loupeAt, setLoupeAt] = useState<{ x: number; y: number } | null>(null);
  const [layersStatus, setLayersStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [compact, setCompact] = useState(false);
  const [viewportSize, setViewportSize] = useState(860);

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedAt = useRef(0);
  /* חותמת הכניסה מחושבת בפונקציית אתחול ולא בגוף הרינדור: `Date.now()`
     בזמן רינדור הוא קריאה לא-טהורה, ותחת StrictMode היא מחזירה ערך אחר
     בכל אחד משני הרינדורים. */
  const [startedAt] = useState(() => Date.now());
  /* מזהה יציב לכותרת, מחושב פעם אחת. `useState` ולא `useRef` כדי שקריאתו
     בזמן רינדור תהיה חוקית. */
  const [headingId] = useState(() => `tms-title-${Math.random().toString(36).slice(2, 8)}`);

  const { message: live, announce } = useAnnounce();
  const emit = useCallback((e: TmsEvent) => onEvent?.(e), [onEvent]);

  const seenIds = useMemo(() => seenByArea[area.id] ?? [], [seenByArea, area.id]);
  const selected = area.features.find((f) => f.id === selectedId);

  /* ------------------------------- xAPI ------------------------------- */

  const xapiRef = useLatestRef({ emitXapi, onXapi, xapiBaseIri });
  const xapi = useCallback(
    (...args: Parameters<typeof statement>) => {
      const cfg = xapiRef.current;
      if (!cfg.emitXapi || !cfg.onXapi) return;
      cfg.onXapi(statement(args[0], args[1], args[2], cfg.xapiBaseIri));
    },
    [xapiRef],
  );

  /* ---------------------------- התקדמות ---------------------------- */

  const progress = useMemo(
    () => snapshot(area, seenIds, Object.keys(seenByArea).length, quizByArea[area.id]),
    [area, seenIds, seenByArea, quizByArea],
  );

  const progressRef = useLatestRef({ onProgress, onComplete });
  const completedRef = useRef(false);

  const report = useCallback(
    (reason: ProgressEvent['reason'], snap = progress) => {
      progressRef.current.onProgress?.({ ...snap, reason });
    },
    [progress, progressRef],
  );

  /* השלמה מדווחת פעם אחת בלבד לכל אזור. LMS שמקבל את אותו `completed` חמש
     פעמים רושם חמש השלמות, וזה נראה כמו רמאות בדוח. */
  useEffect(() => {
    if (!progress.complete || completedRef.current) return;
    completedRef.current = true;
    const missed = area.features.filter((f) => !seenIds.includes(f.id)).map((f) => f.id);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    const score = progress.lastQuizPercent ?? Math.round(progress.ratio * 100);
    progressRef.current.onComplete?.({
      areaId: area.id,
      score,
      passed: score >= TEST_PASS,
      seen: seenIds,
      missed,
      durationSec,
    });
    xapi(
      'completed',
      { id: `area/${area.id}`, name: area.name, type: ACTIVITY.area },
      {
        score: { scaled: score / 100, raw: score, min: 0, max: 100 },
        success: score >= TEST_PASS,
        completion: true,
        duration: isoDuration(durationSec),
      },
    );
  }, [area, progress, progressRef, seenIds, startedAt, xapi]);

  // מעבר אזור מאפס את שומר ההשלמה — כל אזור הוא יחידת למידה בפני עצמה
  useEffect(() => {
    completedRef.current = progress.complete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id]);

  /* ------------------------------- זום ------------------------------- */

  const zoom = useZoomPan(viewportRef, {
    min: ZOOM_MIN,
    max: ZOOM_MAX,
    onZoomChange: (k) => announce(t.zoomLevel(k.toFixed(1))),
  });

  const featureRect = useCallback((id: string) => {
    const el = svgRef.current?.querySelector<SVGGraphicsElement>(`[data-hit="${id}"]`);
    if (!el || typeof el.getBBox !== 'function') return null;
    try {
      const b = el.getBBox();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch {
      return null;
    }
  }, []);

  const zoomToFeature = useCallback(
    (id: string, yFraction = 0.5) => {
      const rect = featureRect(id);
      if (rect) zoom.zoomToRect(rect, { yFraction });
    },
    [featureRect, zoom],
  );

  /* ------------------------------ תרגול ------------------------------ */

  const [mode, setMode] = useState<TmsMode>((initial.mode as TmsMode | undefined) ?? modeProp);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [phase, setPhase] = useState<'asking' | 'feedback'>('asking');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const questionStart = useRef(0);

  const [lesson, setLesson] = useState<LessonState | null>(null);

  const question = quiz ? currentQuestion(quiz) : undefined;
  const quizFeature = question ? area.features.find((f) => f.id === question.featureId) : undefined;

  const startQuiz = useCallback(
    (level: QuizLevel = 1, only?: string[], length?: number) => {
      const pool = only?.length ? area.features.filter((f) => only.includes(f.id)) : area.features;
      if (pool.length < 2) {
        announce(t.quizNotEnough);
        return;
      }
      setQuiz(
        createQuiz(pool, {
          level,
          timed: false,
          length: length ?? (only?.length ? Math.max(4, only.length * 2) : 10),
        }),
      );
      setMode((m) => (m === 'lesson' ? m : 'quiz'));
      setSheet(null);
      setPhase('asking');
      setChosenId(null);
      setHint(null);
      setNudge(null);
      setSelectedId(null);
      setShowAll(false);
      questionStart.current = Date.now();
      setSeconds(0);
      emit({ type: 'quiz-start', areaId: area.id, level });
    },
    [announce, area.features, area.id, emit, t],
  );

  const exitQuiz = useCallback(() => {
    setMode('explore');
    setLesson(null);
    setQuiz(null);
    setPhase('asking');
    setChosenId(null);
    setHint(null);
    setNudge(null);
  }, []);

  const resolveAnswer = useCallback(
    (featureId: string) => {
      if (!quiz || !question || phase === 'feedback') return;
      const correct = featureId === question.featureId;
      const ms = Date.now() - questionStart.current;
      setChosenId(featureId);
      setPhase('feedback');
      setNudge(null);
      const next = submitAnswer(quiz, area.features, { correct, usedHint: Boolean(hint), ms });
      setQuiz(next);
      emit({
        type: 'quiz-answer',
        areaId: area.id,
        featureId: question.featureId,
        mode: question.mode,
        correct,
        usedHint: Boolean(hint),
        ms,
      });
      xapi(
        'answered',
        {
          id: `area/${area.id}/question/${question.mode}/${question.featureId}`,
          name: quizFeature?.name ?? question.featureId,
          type: ACTIVITY.question,
        },
        { success: correct, completion: true, duration: isoDuration(ms / 1000) },
      );
      announce(correct ? t.quizCorrect : t.quizWrong(quizFeature?.name ?? ''));
    },
    [
      announce,
      area.features,
      area.id,
      emit,
      hint,
      phase,
      question,
      quiz,
      quizFeature?.name,
      t,
      xapi,
    ],
  );

  const nextQuestion = useCallback(() => {
    if (!quiz) return;
    const next = advance(quiz);
    setQuiz(next);
    setPhase('asking');
    setChosenId(null);
    setHint(null);
    setNudge(null);
    questionStart.current = Date.now();
    setSeconds(0);
    if (next.status === 'done') {
      const s = summarize(next);
      setSheet('summary');
      setQuizByArea((prev) => ({ ...prev, [area.id]: Math.max(prev[area.id] ?? 0, s.percent) }));
      emit({
        type: 'quiz-complete',
        areaId: area.id,
        score: s.score,
        percent: s.percent,
        missed: s.missed,
      });
      xapi(
        'completed',
        { id: `area/${area.id}/assessment`, name: area.name, type: ACTIVITY.assessment },
        {
          score: { scaled: s.percent / 100, raw: s.percent, min: 0, max: 100 },
          success: s.percent >= TEST_PASS,
          completion: true,
        },
      );
      report('quiz-finished', { ...progress, lastQuizPercent: s.percent });
      setLesson((l) => (l ? { ...l, stage: 'summary', testPercent: s.percent } : l));
    }
  }, [area.id, area.name, emit, progress, quiz, report, setQuizByArea, xapi]);

  useEffect(() => {
    if (!quiz?.timed || phase !== 'asking') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, quiz?.timed]);

  /* ---------------------------- אינטראקציה ---------------------------- */

  const markSeen = useCallback(
    (id: string) => {
      setSeenByArea((prev) => {
        const list = prev[area.id] ?? [];
        return list.includes(id) ? prev : { ...prev, [area.id]: [...list, id] };
      });
    },
    [area.id, setSeenByArea],
  );

  const selectFeature = useCallback(
    (id: string) => {
      if (mode === 'quiz' || (mode === 'lesson' && quiz)) {
        resolveAnswer(id);
        return;
      }
      setSelectedId((prev) => {
        const next = prev === id ? null : id;
        // דיווח זמן השהייה על הצורה הקודמת — "כמה זמן" הוא הנתון הפדגוגי,
        // לא עצם הלחיצה
        if (prev) {
          emit({
            type: 'feature-view',
            areaId: area.id,
            featureId: prev,
            ms: Date.now() - selectedAt.current,
          });
        }
        if (next) {
          const f = area.features.find((x) => x.id === next);
          markSeen(next);
          selectedAt.current = Date.now();
          announce(f ? t.selected(f.name, f.definition) : '');
          if (f) {
            xapi('experienced', {
              id: `area/${area.id}/feature/${f.id}`,
              name: f.name,
              type: ACTIVITY.feature,
            });
          }
        } else {
          announce(t.cleared);
        }
        return next;
      });
    },
    [announce, area.features, area.id, emit, markSeen, mode, quiz, resolveAnswer, t, xapi],
  );

  // דיווח התקדמות אחרי שהצורה נרשמה כנצפית
  const seenCount = seenIds.length;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    report('feature-seen');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenCount]);

  const clearSelection = useCallback(() => {
    setSelectedId((prev) => {
      if (prev) {
        emit({
          type: 'feature-view',
          areaId: area.id,
          featureId: prev,
          ms: Date.now() - selectedAt.current,
        });
        announce(t.cleared);
        rootRef.current
          ?.querySelector<HTMLButtonElement>(`.tms-legend__chip[data-id="${prev}"]`)
          ?.focus();
      }
      return null;
    });
  }, [announce, area.id, emit, t]);

  /* ---------------------------- חתך גובה ---------------------------- */

  const [profile, setProfile] = useState<ProfileLine | null>(null);
  const [drawing, setDrawing] = useState<{ a: Point; b: Point } | null>(null);
  const [profileArm, setProfileArm] = useState(false);
  const [markerIndex, setMarkerIndex] = useState<number | null>(null);
  const [profileResult, setProfileResult] = useState<{
    samples: { at: Point }[];
  } | null>(null);

  const openProfileFor = useCallback(
    (featureId: string) => {
      const f = area.features.find((x) => x.id === featureId);
      if (!f) return;
      setProfile(cutForFeature(f));
      setProfileArm(false);
      emit({ type: 'profile-open', areaId: area.id, featureId });
    },
    [area.features, area.id, emit],
  );

  /** לחיצה על המפה — במצב "מצא במפה" זו התשובה עצמה. */
  const handleMapClick = useCallback(
    (pt: Point, featureId: string | null) => {
      if (zoom.wasDragged()) return;
      if (profileArm) {
        setDrawing((d) => {
          if (!d) return { a: pt, b: pt };
          setProfile({ a: d.a, b: pt });
          setProfileArm(false);
          emit({ type: 'profile-open', areaId: area.id });
          return null;
        });
        return;
      }
      if (quiz && phase === 'asking' && question) {
        if (question.mode === 'identify') return;
        if (featureId) {
          resolveAnswer(featureId);
          return;
        }
        // החטאה על שטח ריק אינה תשובה שגויה — היא הזדמנות לרמז מרחק
        const target = quizFeature;
        if (target) {
          const d = Math.hypot(target.labelPoint.x - pt.x, target.labelPoint.y - pt.y);
          const msg = proximityFeedback(d);
          setNudge(msg);
          announce(msg);
        }
        return;
      }
      if (featureId) selectFeature(featureId);
      else if (selectedId) clearSelection();
    },
    [
      announce,
      area.id,
      clearSelection,
      emit,
      phase,
      profileArm,
      question,
      quiz,
      quizFeature,
      resolveAnswer,
      selectFeature,
      selectedId,
      zoom,
    ],
  );

  const takeHint = useCallback(() => {
    if (!question || !quizFeature) return;
    const text = hintFor(question, quizFeature, compassOf(quizFeature.labelPoint));
    setHint(text);
    announce(text);
  }, [announce, question, quizFeature]);

  const openTerm = useCallback(
    (id: string) => {
      setTermId(id);
      setSheet('glossary');
      emit({ type: 'glossary-open', termId: id });
    },
    [emit],
  );

  const switchArea = useCallback(
    (id: string) => {
      if (id === area.id) return;
      setStoredAreaId(id);
      setSelectedId(null);
      setPreviewId(null);
      setShowAll(false);
      setSheet(null);
      setCompareFeatureId(null);
      setProfile(null);
      setProfileArm(false);
      exitQuiz();
      zoom.reset();
      const next = getAreaById(id);
      announce(t.areaChanged(next.name, next.intro));
      emit({ type: 'area-view', areaId: id });
      report(
        'area-changed',
        snapshot(next, seenByArea[id] ?? [], Object.keys(seenByArea).length, quizByArea[id]),
      );
    },
    [announce, area.id, emit, exitQuiz, quizByArea, report, seenByArea, setStoredAreaId, t, zoom],
  );

  const setCompareMode = useCallback(
    (next: CompareMode) => {
      setCompareModeRaw(next);
      emit({ type: 'compare-mode', areaId: area.id, mode: next });
      const info = modes.find((m) => m.id === next);
      announce(info ? `${info.label}. ${info.hint}` : '');
    },
    [announce, area.id, emit, modes, setCompareModeRaw],
  );

  const resetProgress = useCallback(() => {
    clearStoredState();
    setSeenByArea({});
    setQuizByArea({});
    setTourDone(false);
    completedRef.current = false;
    announce(t.resetDone);
    report('reset', snapshot(area, [], 0));
  }, [announce, area, report, setQuizByArea, setSeenByArea, setTourDone, t]);

  /* ------------------------------ שיעור ------------------------------ */

  const lessonFeature = lesson?.stage === 'explore' ? lesson.order[lesson.step] : undefined;

  /**
   * הסיור המודרך בוחר את הצורה עבור הלומד.
   *
   * זהו סנכרון מכוון של מצב פנימי אל שלב השיעור, ולא נגזרת: הלומד רשאי
   * לבטל את הבחירה או לבחור צורה אחרת בתוך אותו שלב, ולכן הבחירה אינה
   * יכולה להיות מחושבת מ-`lessonFeature` בכל רינדור.
   */
  useEffect(() => {
    if (!lessonFeature) return;
    setSelectedId(lessonFeature);
    markSeen(lessonFeature);
    selectedAt.current = Date.now();
  }, [lessonFeature, markSeen]);

  const startLesson = useCallback(() => {
    const state = createLesson(area);
    setLesson({ ...state, stage: 'explore' });
    setMode('lesson');
    setShowAll(false);
    emit({ type: 'lesson-stage', areaId: area.id, stage: 'explore' });
    report('lesson-stage');
  }, [area, emit, report]);

  const lessonNext = useCallback(() => {
    setLesson((l) => {
      if (!l) return l;
      const next = advanceTour(l);
      if (next.stage !== l.stage) {
        emit({ type: 'lesson-stage', areaId: area.id, stage: next.stage });
        startQuiz(1);
      }
      return next;
    });
  }, [area.id, emit, startQuiz]);

  const lessonSkipStage = useCallback(() => {
    setLesson((l) => {
      if (!l) return l;
      const stage = nextStage(l.stage);
      emit({ type: 'lesson-stage', areaId: area.id, stage });
      if (stage === 'practice') startQuiz(1);
      if (stage === 'test') startQuiz(2, undefined, TEST_LENGTH);
      return { ...l, stage, step: 0 };
    });
  }, [area.id, emit, startQuiz]);

  /* ------------------------------ תופעות ------------------------------ */

  // גודל המרובע ומצב "צר" — קובעים את פריסת הכרטיס ואת התנהגות הזום
  useEffect(() => {
    const measure = () => {
      setViewportSize(viewportRef.current?.clientWidth ?? 860);
      setCompact(window.innerWidth <= MOBILE_MAX);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    emit({ type: 'area-view', areaId: area.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id]);

  // הכתובת משקפת את המצב, כדי שהעתקה שלה תשחזר בדיוק את מה שנראה על המסך
  useEffect(() => {
    if (!deepLink) return;
    writeDeepLink({
      area: area.id,
      feature: selectedId ?? undefined,
      mode,
      compare: compareMode,
      blend,
    });
  }, [area.id, blend, compareMode, deepLink, mode, selectedId]);

  /**
   * גובה לוח התרגול נמדד ומוזרם כמשתנה CSS, כדי שסרגל הפקדים ירד אל מתחתיו
   * במקום להתנגש בו. הגובה משתנה לפי מספר התשובות ואורך המשוב, ולכן ערך קבוע
   * היה נשבר בכל שאלה שנייה.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const panel = frame.querySelector<HTMLElement>('.tms-quiz');
    if (!panel) {
      frame.style.removeProperty('--tms-quiz-h');
      return;
    }
    const apply = () => frame.style.setProperty('--tms-quiz-h', `${panel.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [mode, phase, quiz?.index, hint, nudge]);

  // במסך צר הכרטיס מכסה את תחתית המפה — מזיזים את הצורה אל החלק העליון
  useEffect(() => {
    if (!compact || !selectedId || quiz) return;
    const id = window.setTimeout(() => zoomToFeature(selectedId, 0.34), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, selectedId]);

  // קיצורי מקלדת גלובליים (מתועדים בחלונית ?)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const inside = root.contains(document.activeElement);
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (e.key === 'Escape') {
        if (sheet) setSheet(null);
        else if (profile) setProfile(null);
        else if (selectedId) clearSelection();
        return;
      }
      if (!inside || typing) return;

      const digit = Number(e.key);
      if (digit >= 1 && digit <= 9 && area.features[digit - 1]) {
        e.preventDefault();
        selectFeature(area.features[digit - 1].id);
        return;
      }

      /**
       * חיצים מזיזים את המחוון גם כשהפוקוס אינו עליו — אבל לא כשהוא על
       * המפה, שם אותם חיצים מנווטים בין הצורות. שני שימושים לאותו מקש הם
       * בסדר; שני שימושים באותו רגע הם באג.
       */
      const onMap = target?.classList?.contains('tms-feature');
      if (!onMap && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? -0.05 : 0.05;
        setBlend(Math.min(1, Math.max(0, Number((blend + step).toFixed(2)))));
        return;
      }

      switch (e.key.toLowerCase()) {
        case '?':
        case '/':
          if (e.key === '?' || e.shiftKey) {
            e.preventDefault();
            setSheet('help');
          }
          break;
        case 'a':
          setBlend(0);
          break;
        case 'm':
          setBlend(1);
          break;
        case 'e':
          setShowAll((v) => !v);
          break;
        case 'g':
          setSheet('glossary');
          break;
        case 'l':
          setLoupe((v) => !v);
          break;
        case 'c': {
          const i = modes.findIndex((m) => m.id === compareMode);
          setCompareMode(modes[(i + 1) % modes.length].id);
          break;
        }
        case 'p':
          if (selectedId) openProfileFor(selectedId);
          else setProfileArm((v) => !v);
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoom.zoomByCenter(1.4);
          break;
        case '-':
          e.preventDefault();
          zoom.zoomByCenter(1 / 1.4);
          break;
        case '0':
          zoom.reset();
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    area.features,
    blend,
    clearSelection,
    compareMode,
    modes,
    openProfileFor,
    profile,
    selectFeature,
    selectedId,
    setBlend,
    setCompareMode,
    sheet,
    zoom,
  ]);

  useEffect(() => {
    if (layersStatus === 'error') {
      emit({ type: 'error', message: `layer load failed: ${area.id}` });
    }
  }, [area.id, emit, layersStatus]);

  /* ---------------------------- מיקום הכרטיס ---------------------------- */

  /**
   * מיקום לפי גבולות הצורה בפועל ולא לפי נקודת התווית בלבד — כרטיס שמכסה
   * את הצורה שהוא מסביר הוא הכשל הקלאסי כאן.
   */
  const [placement, setPlacement] = useState<{ h: 'left' | 'right'; v: 'top' | 'bottom' }>({
    h: 'left',
    v: 'bottom',
  });

  /**
   * המיקום נמדד **אחרי** ה-commit ולא בזמן הרינדור.
   *
   * `featureRect` קורא `svgRef.current` ומודד `getBBox()`. ברינדור הראשון
   * שאחרי הבחירה ה-path עוד לא נמצא ב-DOM, ולכן המדידה נפלה חזרה לנקודת
   * התווית — וזו בדיוק הנפילה ש-M-09 בא לתקן: הכרטיס נפתח לפי נקודה ולא
   * לפי גבולות הצורה, ולעיתים מכסה את מה שהוא מסביר. `useLayoutEffect`
   * מודד כשה-path כבר קיים, ולפני שהדפדפן צובע.
   */
  useLayoutEffect(() => {
    if (!selected) return;
    const rect = featureRect(selected.id);
    const cx = rect ? rect.x + rect.width / 2 : selected.labelPoint.x;
    const cy = rect ? rect.y + rect.height / 2 : selected.labelPoint.y;
    setPlacement({
      h: cx < area.viewBox.width / 2 ? 'right' : 'left',
      v: cy > area.viewBox.height * 0.55 ? 'top' : 'bottom',
    });
  }, [area.viewBox.height, area.viewBox.width, featureRect, selected]);

  /* ------------------------------ הודעות ------------------------------ */

  const statusText = useMemo(() => {
    if (profileArm) return t.profileHint;
    if (quiz) return t.hintQuiz;
    if (layersStatus === 'loading') return t.hintLoading;
    if (selected) return `${selected.name} — ${selected.definition.slice(0, 90)}…`;
    if (showAll) return t.hintShowAll;
    const left = area.features.length - seenIds.length;
    if (left > 0 && seenIds.length > 0) return t.hintRemaining(left);
    return t.hint;
  }, [area.features.length, layersStatus, profileArm, quiz, seenIds.length, selected, showAll, t]);

  const Heading = `h${headingLevel}` as 'h2';

  const quizOverlay = useMemo(() => {
    if (!quiz || !question) return undefined;
    const revealing = phase === 'feedback';
    return {
      markId: question.mode === 'identify' ? question.featureId : null,
      revealId: revealing ? question.featureId : null,
      wrongId: revealing && chosenId !== question.featureId ? chosenId : null,
      picking: question.mode !== 'identify' && phase === 'asking',
    };
  }, [chosenId, phase, question, quiz]);

  const [lowLayer, highLayer] = layersFor(area, compareMode);
  const layerNames: [string, string] = [
    lowLayer === 'hillshade' ? t.layerHillshade : t.layerAerial,
    highLayer === 'topo' ? t.layerTopo : t.layerAerial,
  ];

  const markerPoint =
    profileResult && markerIndex !== null ? profileResult.samples[markerIndex]?.at : undefined;

  /* ------------------------------ תצוגה ------------------------------ */

  return (
    <I18nProvider value={t}>
      <div
        className={'tms' + (className ? ' ' + className : '')}
        dir={dirFor(locale)}
        lang={t.localeTag}
        ref={rootRef}
        aria-labelledby={headingId}
      >
        <header className="tms__header">
          <div>
            <Heading className="tms__title" id={headingId}>
              {t.titleWithArea(area.name)}
            </Heading>
            <p className="tms__subtitle">{t.subtitle}</p>
          </div>
          <div className="tms__toolbar">
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              aria-pressed={mode === 'explore'}
              onClick={exitQuiz}
            >
              {t.modeExplore}
            </button>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              aria-pressed={mode === 'lesson'}
              onClick={() => {
                setLesson(createLesson(area));
                setMode('lesson');
              }}
            >
              {t.modeLesson}
            </button>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              aria-pressed={mode === 'quiz'}
              onClick={() => startQuiz(1)}
            >
              {t.modeQuiz}
            </button>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              onClick={() => setSheet('glossary')}
            >
              {t.glossary}
            </button>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              onClick={() => setSheet('help')}
              aria-label={t.helpLabel}
            >
              ?
            </button>
          </div>
        </header>

        {showProgress && (
          <ProgressBar
            progress={progress}
            shareHref={shareUrl({
              area: area.id,
              feature: selectedId ?? undefined,
              mode,
              compare: compareMode,
              blend,
            })}
            onReset={resetProgress}
          />
        )}

        {showAreaPicker && (
          <AreaPicker areas={TERRAIN_AREAS} activeId={area.id} onSelect={switchArea} />
        )}

        {mode === 'lesson' && lesson && lesson.stage !== 'intro' && (
          <LessonBar
            state={lesson}
            feature={area.features.find((f) => f.id === lessonFeature)}
            onPrev={() => setLesson((l) => (l ? backTour(l) : l))}
            onNext={lessonNext}
            onSkipStage={lessonSkipStage}
            onExit={exitQuiz}
          />
        )}

        <div className="tms__frame" ref={frameRef}>
          <MapCanvas
            area={area}
            selected={selected}
            previewId={previewId}
            showAll={showAll}
            seenIds={seenIds}
            blend={blend}
            compareMode={compareMode}
            quiz={quizOverlay}
            pulseDots={seenIds.length === 0 && layersStatus === 'ready'}
            loupeAt={loupe ? loupeAt : null}
            viewportSize={viewportSize}
            zoom={zoom.view}
            worldStyle={zoom.style}
            viewportRef={viewportRef}
            svgRef={svgRef}
            pointerHandlers={{
              ...zoom.handlers,
              onPointerMove: (e) => {
                zoom.handlers.onPointerMove(e);
                if (!loupe) return;
                const r = viewportRef.current?.getBoundingClientRect();
                if (r) setLoupeAt({ x: e.clientX - r.left, y: e.clientY - r.top });
              },
              onPointerLeave: (e) => {
                zoom.handlers.onPointerLeave(e);
                setLoupeAt(null);
              },
            }}
            onSelectFeature={selectFeature}
            onMapClick={handleMapClick}
            onDoubleClickFeature={(id) => zoomToFeature(id)}
            onLayersStatus={setLayersStatus}
            onFocusFeature={setPreviewId}
            onWipe={setWipe}
            overlay={
              profile || drawing ? (
                <ProfileLineOverlay line={profile ?? drawing!} marker={markerPoint} />
              ) : undefined
            }
          />

          <div className="tms__control-bar">
            <div className="tms__control-group">
              <CompareSlider
                value={blend}
                mode={compareMode}
                modes={modes}
                layerNames={layerNames}
                onChange={setBlend}
                onModeChange={setCompareMode}
              />
            </div>
            <div className="tms__control-group">
              <ZoomControls
                k={zoom.view.k}
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                loupe={loupe}
                onZoomIn={() => zoom.zoomByCenter(1.4)}
                onZoomOut={() => zoom.zoomByCenter(1 / 1.4)}
                onReset={zoom.reset}
                onToggleLoupe={() => setLoupe((v) => !v)}
              />
              {!quiz && (
                <>
                  <button
                    type="button"
                    className="tms-btn tms-btn--sm tms-tap"
                    aria-pressed={showAll}
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {t.showAll}
                  </button>
                  <button
                    type="button"
                    className="tms-btn tms-btn--sm tms-tap"
                    aria-pressed={profileArm}
                    onClick={() => {
                      setProfileArm((v) => !v);
                      setDrawing(null);
                    }}
                  >
                    {t.profileStart}
                  </button>
                </>
              )}
            </div>
          </div>

          {quiz && question && (
            <QuizPanel
              state={quiz}
              question={question}
              features={area.features}
              phase={phase}
              chosenId={chosenId}
              nudge={nudge}
              hint={hint}
              seconds={seconds}
              onAnswer={resolveAnswer}
              onHint={takeHint}
              onNext={nextQuestion}
              onExit={exitQuiz}
            />
          )}

          {selected && !quiz ? (
            <FeatureInfoCard
              feature={selected}
              area={area}
              placement={placement.h}
              vertical={placement.v}
              compact={compact}
              onClose={clearSelection}
              onOpenTerm={openTerm}
              onCompare={(id) => selectFeature(id)}
              onCompareAreas={(id) => {
                setCompareFeatureId(id);
                setSheet('areas');
              }}
              onProfile={openProfileFor}
            />
          ) : (
            <p className={'tms__status' + (quiz ? ' tms__status--quiz' : '')}>{statusText}</p>
          )}

          {/* ייחוס: נפתח לפי דרישה, עם הקטעים הלועזיים מבודדים לכיוון LTR */}
          <details className="tms__attribution">
            <summary>{t.attribution}</summary>
            <dl className="tms__attribution-body">
              <div>
                <dt>{t.layerAerial}:</dt>
                <dd dir="ltr" lang="en">
                  {area.attribution.aerial}
                </dd>
              </div>
              <div>
                <dt>{t.layerTopo}:</dt>
                <dd dir="ltr" lang="en">
                  {area.attribution.topo}
                </dd>
              </div>
              <div>
                <dt>מודל גובה:</dt>
                <dd dir="ltr" lang="en">
                  {area.attribution.dem}
                </dd>
              </div>
            </dl>
          </details>
        </div>

        {profile && (
          <ElevationProfile
            area={area}
            line={profile}
            feature={selected}
            markerIndex={markerIndex}
            onMarker={setMarkerIndex}
            onClose={() => {
              setProfile(null);
              setMarkerIndex(null);
            }}
            onResult={setProfileResult}
          />
        )}

        {showLegend && (
          <FeatureLegend
            features={area.features}
            selectedId={selectedId}
            seenIds={seenIds}
            answerMode={Boolean(quiz) && question?.mode === 'identify'}
            onSelect={selectFeature}
            onPreview={setPreviewId}
            onClear={clearSelection}
          />
        )}

        <CheatSheet area={area} />

        {/* תיאור טקסטואלי מלא — התחליף היחיד למפה עבור משתמש קורא-מסך */}
        <p className="tms-sr-only">{describeArea(area)}</p>
        <p className="tms-sr-only" aria-live="polite" aria-atomic="true">
          {live}
        </p>

        {mode === 'lesson' && lesson?.stage === 'intro' && (
          <LessonIntro area={area} onStart={startLesson} onSkip={exitQuiz} />
        )}
        {!tourDone && layersStatus !== 'loading' && mode !== 'lesson' && (
          <Onboarding
            onDone={() => {
              setTourDone(true);
              announce('ההכוונה הסתיימה. אפשר להתחיל.');
            }}
          />
        )}
        {sheet === 'help' && <KeyboardHelp onClose={() => setSheet(null)} />}
        {sheet === 'glossary' && (
          <GlossarySheet
            area={area}
            focusId={termId}
            onClose={() => {
              setSheet(null);
              setTermId(null);
            }}
          />
        )}
        {sheet === 'areas' && compareFeatureId && (
          <CrossAreaCompare
            areas={TERRAIN_AREAS}
            featureId={compareFeatureId}
            activeAreaId={area.id}
            onClose={() => setSheet(null)}
            onGoToArea={(id) => {
              setSheet(null);
              switchArea(id);
            }}
          />
        )}
        {sheet === 'summary' && quiz && (
          <QuizSummary
            state={quiz}
            area={area}
            onRetryMissed={() => startQuiz(quiz.level, summarize(quiz).missed)}
            onRestart={() => startQuiz(quiz.level)}
            onClose={() => {
              setSheet(null);
              if (mode !== 'lesson') exitQuiz();
            }}
            onPrint={() => window.print()}
          />
        )}
      </div>
    </I18nProvider>
  );
}

/** קו החתך על המפה, עם הסמן שמתאים לנקודה שמרחפים עליה בגרף. */
function ProfileLineOverlay({ line, marker }: { line: { a: Point; b: Point }; marker?: Point }) {
  return (
    <g className="tms-cut" pointerEvents="none">
      <line className="tms-cut__casing" x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />
      <line className="tms-cut__line" x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />
      <circle className="tms-cut__end" cx={line.a.x} cy={line.a.y} r={9} />
      <circle className="tms-cut__end" cx={line.b.x} cy={line.b.y} r={9} />
      <text className="tms-cut__label" x={line.a.x} y={line.a.y + 5} textAnchor="middle">
        א
      </text>
      <text className="tms-cut__label" x={line.b.x} y={line.b.y + 5} textAnchor="middle">
        ב
      </text>
      {marker && <circle className="tms-cut__marker" cx={marker.x} cy={marker.y} r={10} />}
    </g>
  );
}

export type { TerrainFeature };
export type { CompareMode } from './lib/compare';
export type { ProgressEvent, CompletionResult, XapiStatement } from './lib/progress';
