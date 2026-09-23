import type { TerrainArea } from '../../../data/types';

/**
 * progress.ts — מודל ההתקדמות ונקודת החיבור למערכת הלמידה.
 *
 * בקורס מתוקשב, מקטע שאינו מדווח השלמה הוא מקטע שאי אפשר לשבץ במסלול למידה
 * מחייב. שלוש שכבות, מהפשוטה למורכבת:
 *   1. `onProgress` — אירוע גולמי, לכל שינוי במצב הלמידה.
 *   2. `onComplete` — אירוע יחיד כשהתנאי הפדגוגי התקיים.
 *   3. `emitXapi`   — אותם אירועים בעטיפת xAPI תקנית, למי שיש לו LRS.
 *
 * שום דבר לא נשלח לשרת מכאן. הקורס מקבל אובייקט ומחליט מה לעשות איתו.
 */

export interface ProgressSnapshot {
  areaId: string;
  /** מזהי הצורות שנצפו באזור הנוכחי. */
  seen: string[];
  /** סך הצורות באזור. */
  total: number;
  /** 0..1 — צפייה בצורות בלבד, בלי התרגול. */
  ratio: number;
  /** מספר האזורים שהלומד נגע בהם. */
  areasVisited: number;
  /** אחוז הצלחה בתרגול האחרון, אם היה. */
  lastQuizPercent?: number;
  /** האם תנאי ההשלמה התקיים. */
  complete: boolean;
}

export interface ProgressEvent extends ProgressSnapshot {
  /** מה גרם לאירוע. */
  reason: 'feature-seen' | 'area-changed' | 'quiz-finished' | 'lesson-stage' | 'reset';
}

export interface CompletionResult {
  areaId: string;
  /** 0..100 — ציון התרגול, או צפייה בצורות אם לא נערך תרגול. */
  score: number;
  passed: boolean;
  seen: string[];
  missed: string[];
  /** משך השהייה הכולל ברכיב, בשניות. */
  durationSec: number;
}

/** אחוז ההצלחה שמעליו התרגול נחשב עובר. */
export const PASS_PERCENT = 70;

/**
 * תנאי ההשלמה: **גם** צפייה בכל הצורות **וגם** מעבר תרגול.
 * צפייה לבדה מודדת נוכחות, לא ידיעה; תרגול לבדו מאפשר לנחש את הדרך פנימה.
 */
export function isComplete(seen: string[], total: number, quizPercent?: number): boolean {
  return seen.length >= total && (quizPercent ?? -1) >= PASS_PERCENT;
}

export function snapshot(
  area: TerrainArea,
  seen: string[],
  areasVisited: number,
  lastQuizPercent?: number,
): ProgressSnapshot {
  const total = area.features.length;
  return {
    areaId: area.id,
    seen,
    total,
    ratio: total ? Math.min(1, seen.length / total) : 0,
    areasVisited,
    lastQuizPercent,
    complete: isComplete(seen, total, lastQuizPercent),
  };
}

/* --------------------------------- xAPI --------------------------------- */

const VERBS = {
  experienced: { id: 'http://adlnet.gov/expapi/verbs/experienced', display: 'experienced' },
  answered: { id: 'http://adlnet.gov/expapi/verbs/answered', display: 'answered' },
  completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: 'completed' },
} as const;

export type XapiVerb = keyof typeof VERBS;

export interface XapiStatement {
  verb: { id: string; display: { 'he-IL': string; 'en-US': string } };
  object: {
    id: string;
    definition: {
      name: { 'he-IL': string };
      type: string;
    };
  };
  result?: {
    score?: { scaled: number; raw: number; min: number; max: number };
    success?: boolean;
    completion?: boolean;
    duration?: string;
  };
  timestamp: string;
}

/** בסיס ה-IRI של האובייקטים. ניתן לעקיפה מהקורס דרך ה-prop `xapiBaseIri`. */
export const DEFAULT_IRI = 'https://example.org/terrain-map-simulator';

/** ISO-8601 duration — הפורמט היחיד ש-LRS מקבל עבור `result.duration`. */
export function isoDuration(seconds: number): string {
  return `PT${Math.max(0, Math.round(seconds))}S`;
}

export function statement(
  verb: XapiVerb,
  object: { id: string; name: string; type: string },
  result?: XapiStatement['result'],
  baseIri = DEFAULT_IRI,
): XapiStatement {
  return {
    verb: {
      id: VERBS[verb].id,
      display: { 'he-IL': VERBS[verb].display, 'en-US': VERBS[verb].display },
    },
    object: {
      id: `${baseIri}/${object.id}`,
      definition: {
        name: { 'he-IL': object.name },
        type: object.type,
      },
    },
    ...(result ? { result } : {}),
    timestamp: new Date().toISOString(),
  };
}

export const ACTIVITY = {
  area: 'http://adlnet.gov/expapi/activities/module',
  feature: 'http://adlnet.gov/expapi/activities/objective',
  question: 'http://adlnet.gov/expapi/activities/question',
  assessment: 'http://adlnet.gov/expapi/activities/assessment',
} as const;
