import type { TerrainFeature } from '../../../data/types';

/**
 * quizEngine — כל הלוגיקה של מצב התרגול, כמודול טהור (ללא React ו-DOM).
 *
 * זיהוי צורות שטח הוא מיומנות פרוצדורלית: היא נרכשת בתרגול עם משוב מיידי,
 * לא בקריאת הסבר. הפרדת הלוגיקה מהתצוגה נועדה גם לאפשר בדיקות יחידה על
 * הניקוד ועל בחירת ההסחות — בלי להריץ דפדפן.
 */

export type QuizMode = 'locate' | 'identify' | 'signature';

/** 1 = הצורה מודגשת ויש מקרא · 2 = בלי הדגשה · 3 = בלי מקרא. */
export type QuizLevel = 1 | 2 | 3;

export interface QuizQuestion {
  key: string;
  mode: QuizMode;
  /** מזהה הצורה הנכונה. */
  featureId: string;
  /** מזהי הצורות המוצעות (במצב "מהי הצורה"). */
  options: string[];
  prompt: string;
  /** true כשהשאלה חזרה בעקבות טעות קודמת. */
  repeat: boolean;
}

export interface QuizAnswer {
  featureId: string;
  mode: QuizMode;
  correct: boolean;
  usedHint: boolean;
  ms: number;
}

export interface QuizState {
  level: QuizLevel;
  timed: boolean;
  queue: QuizQuestion[];
  /** אורך הסבב המתוכנן, לפני חזרות. */
  plannedLength: number;
  index: number;
  score: number;
  streak: number;
  bestStreak: number;
  answers: QuizAnswer[];
  /** מזהי צורות שנענו נכון בלי רמז — כדי לא לחזור עליהן ללא צורך. */
  mastered: string[];
  status: 'running' | 'done';
}

export const QUIZ_LENGTH = 10;

const POINTS = {
  base: 100,
  streakStep: 10,
  streakCap: 5,
  hintCost: 40,
  repeatFactor: 0.5,
};

/** מספר השאלות שאחריהן צורה שנכשלה חוזרת (חזרה מרווחת פשוטה). */
const REPEAT_GAP = 3;

/** תקרת החזרות בסבב, כשליש מאורכו — סבב חייב להסתיים גם ללומד שמתקשה. */
const maxExtra = (plannedLength: number) => Math.max(2, Math.ceil(plannedLength / 3));

const shuffle = <T>(list: T[]): T[] => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const MODE_PROMPT: Record<QuizMode, (name: string) => string> = {
  locate: (name) => `היכן נמצא/ת ${name}? לחצו על המקום המתאים במפה.`,
  identify: () => 'מהי צורת השטח המסומנת?',
  signature: () => 'לפי חתימת קווי הגובה שמשמאל — אתרו את הצורה המתאימה במפה.',
};

/**
 * בונה הסחות משכנעות: קודם מהצורה שהכי קל להתבלבל איתה, אחר כך ממשפחת
 * הצורה, ורק אז אקראיות. הסחה אקראית הופכת את השאלה לקלה מדי ולא מלמדת
 * את ההבחנה שבגללה טועים בשטח.
 */
export function buildDistractors(
  target: TerrainFeature,
  pool: TerrainFeature[],
  count = 3,
): string[] {
  const out: string[] = [];
  const push = (f?: TerrainFeature) => {
    if (f && f.id !== target.id && !out.includes(f.id)) out.push(f.id);
  };
  push(pool.find((f) => f.id === target.confusedWith));
  for (const f of shuffle(pool.filter((f) => f.family === target.family))) push(f);
  for (const f of shuffle(pool)) push(f);
  return out.slice(0, count);
}

function makeQuestion(
  feature: TerrainFeature,
  pool: TerrainFeature[],
  mode: QuizMode,
  repeat = false,
): QuizQuestion {
  const options =
    mode === 'identify' ? shuffle([feature.id, ...buildDistractors(feature, pool)]) : [];
  return {
    key: `${feature.id}:${mode}:${repeat ? 'r' : 'q'}:${Math.random().toString(36).slice(2, 7)}`,
    mode,
    featureId: feature.id,
    options,
    prompt: MODE_PROMPT[mode](feature.name),
    repeat,
  };
}

/** בוחר מצב משחק לפי המיקום בסבב, כדי ששלושת המצבים יופיעו לסירוגין. */
const MODE_CYCLE: QuizMode[] = ['identify', 'locate', 'identify', 'signature'];

export function createQuiz(
  features: TerrainFeature[],
  {
    level = 1,
    timed = false,
    length = QUIZ_LENGTH,
  }: Partial<{ level: QuizLevel; timed: boolean; length: number }> = {},
): QuizState {
  const pool = features.filter((f) => !f.isConcept);
  const usable = pool.length ? pool : features;
  const queue: QuizQuestion[] = [];
  let bag: TerrainFeature[] = [];
  for (let i = 0; i < length; i++) {
    if (!bag.length) bag = shuffle(usable);
    const feature = bag.pop()!;
    // "מהי הצורה" דורש לפחות שתי צורות; אחרת נופלים ל"מצא במפה"
    const mode = usable.length >= 3 ? MODE_CYCLE[i % MODE_CYCLE.length] : 'locate';
    queue.push(makeQuestion(feature, usable, mode));
  }
  return {
    level,
    timed,
    queue,
    plannedLength: queue.length,
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    answers: [],
    mastered: [],
    status: 'running',
  };
}

export const currentQuestion = (s: QuizState): QuizQuestion | undefined => s.queue[s.index];

/** ניקוד לשאלה בודדת — כולל בונוס רצף וקנס רמז. */
export function scoreFor(state: QuizState, usedHint: boolean, repeat: boolean) {
  const streakBonus = Math.min(state.streak, POINTS.streakCap) * POINTS.streakStep;
  const raw = POINTS.base + streakBonus - (usedHint ? POINTS.hintCost : 0);
  return Math.max(10, Math.round(raw * (repeat ? POINTS.repeatFactor : 1)));
}

/**
 * רושם תשובה ומחזיר מצב חדש. צורה שנכשלה נדחפת חזרה לתור אחרי שלוש שאלות
 * — חזרה מרווחת פשוטה, שמבטיחה שהפער שהתגלה ייבדק שוב באותו סבב.
 */
export function submitAnswer(
  state: QuizState,
  features: TerrainFeature[],
  { correct, usedHint, ms }: { correct: boolean; usedHint: boolean; ms: number },
): QuizState {
  const q = currentQuestion(state);
  if (!q || state.status === 'done') return state;

  const answer: QuizAnswer = { featureId: q.featureId, mode: q.mode, correct, usedHint, ms };
  const streak = correct ? state.streak + 1 : 0;
  const queue = state.queue.slice();

  if (!correct) {
    /**
     * חזרה מרווחת — אבל חסומה: בלי תקרה, כל טעות מוסיפה שאלה, ולומד
     * שמתקשה נכנס לסבב שאינו נגמר. מותרת חזרה אחת פתוחה לכל צורה,
     * ועד שליש מאורך הסבב חזרות בסך הכול.
     */
    const feature = features.find((f) => f.id === q.featureId);
    const at = state.index + REPEAT_GAP + 1;
    const alreadyQueued = queue
      .slice(state.index + 1)
      .some((pending) => pending.featureId === q.featureId && pending.repeat);
    const extras = queue.length - state.plannedLength;
    if (feature && !alreadyQueued && extras < maxExtra(state.plannedLength) && at <= queue.length) {
      queue.splice(at, 0, makeQuestion(feature, features, q.mode, true));
    }
  }

  return {
    ...state,
    queue,
    answers: [...state.answers, answer],
    score: state.score + (correct ? scoreFor(state, usedHint, q.repeat) : 0),
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    mastered:
      correct && !usedHint && !state.mastered.includes(q.featureId)
        ? [...state.mastered, q.featureId]
        : state.mastered,
  };
}

export function advance(state: QuizState): QuizState {
  const index = state.index + 1;
  return index >= state.queue.length
    ? { ...state, index: state.queue.length, status: 'done' }
    : { ...state, index };
}

/** סיכום לפי צורה — הבסיס למסך הסיכום ולתרגול חוזר ממוקד. */
export function summarize(state: QuizState) {
  const byFeature = new Map<string, { right: number; wrong: number }>();
  for (const a of state.answers) {
    const rec = byFeature.get(a.featureId) ?? { right: 0, wrong: 0 };
    if (a.correct) rec.right++;
    else rec.wrong++;
    byFeature.set(a.featureId, rec);
  }
  const correct = state.answers.filter((a) => a.correct).length;
  const total = state.answers.length || 1;
  return {
    correct,
    total: state.answers.length,
    percent: Math.round((correct / total) * 100),
    bestStreak: state.bestStreak,
    score: state.score,
    /** צורות שנכשלו לפחות פעם אחת — אלה שכדאי לחזור עליהן. */
    missed: [...byFeature.entries()].filter(([, r]) => r.wrong > 0).map(([id]) => id),
    byFeature,
  };
}

/** ציון עובר לסבב תרגול. */
export const PASS_PERCENT = 70;

/** רמז טקסטואלי לפי מצב השאלה. */
export function hintFor(
  q: QuizQuestion,
  feature: TerrainFeature | undefined,
  compass: string,
): string {
  if (!feature) return '';
  if (q.mode === 'identify') {
    return `רמז: ${feature.mapExplanation}`;
  }
  return `רמז: הצורה נמצאת ${compass} המפה.`;
}

/** משוב מרחק ללחיצה שהחטיאה — "קרוב" מעודד המשך חיפוש באותו אזור. */
export function proximityFeedback(distance: number): string {
  if (distance < 90) return 'קרוב מאוד — הצורה ממש כאן בסביבה. נסו שוב.';
  if (distance < 220) return 'קרוב. אתם באזור הנכון, אבל לא על הצורה עצמה.';
  if (distance < 400) return 'רחוק. חפשו באזור אחר של המפה.';
  return 'רחוק מאוד — זה הצד ההפוך של המפה.';
}
