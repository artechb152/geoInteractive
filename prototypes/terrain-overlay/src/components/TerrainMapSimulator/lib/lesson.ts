import type { TerrainArea, TerrainFeature } from '../../../data/types';

/**
 * lesson.ts — מכונת המצבים של מסלול השיעור.
 *
 * בלי מסלול, הרכיב הוא ארגז חול: לומד נכנס, לוחץ על כמה דברים, ויוצא — בלי
 * שאיש הגדיר לו מה הוא אמור לדעת בסוף. חמישה שלבים עם התחלה, אמצע וסוף
 * הופכים את אותו התוכן בדיוק לשיעור.
 *
 * המודול טהור בכוונה: כל הלוגיקה כאן ניתנת לבדיקת יחידה בלי DOM.
 */

export type LessonStage = 'intro' | 'explore' | 'practice' | 'test' | 'summary';

export const LESSON_STAGES: LessonStage[] = ['intro', 'explore', 'practice', 'test', 'summary'];

export interface LessonState {
  stage: LessonStage;
  /** אינדקס הצורה בסיור המודרך. */
  step: number;
  /** מזהי הצורות שהלומד עבר עליהן בסיור, לפי הסדר. */
  order: string[];
  /** אחוז ההצלחה במבחן, אחרי שהסתיים. */
  testPercent?: number;
}

/**
 * סדר הסיור: המושג קודם לצורות, ואחריו זוגות מנוגדים סמוכים.
 *
 * זו לא קוסמטיקה. ההבחנות הקשות בשטח הן **בין** צורות דומות, ולומד שרואה
 * שלוחה ואחריה גיא לומד את ההבדל; לומד שרואה אותן במרחק חמש צורות זו מזו
 * לומד שתי עובדות נפרדות.
 */
export function tourOrder(area: TerrainArea): string[] {
  const rest = area.features.filter((f) => !f.isConcept);
  const concepts = area.features.filter((f) => f.isConcept);
  const out: TerrainFeature[] = [];
  const taken = new Set<string>();

  for (const f of rest) {
    if (taken.has(f.id)) continue;
    out.push(f);
    taken.add(f.id);
    const pair = f.confusedWith && rest.find((x) => x.id === f.confusedWith && !taken.has(x.id));
    if (pair) {
      out.push(pair);
      taken.add(pair.id);
    }
  }
  return [...concepts, ...out].map((f) => f.id);
}

export function createLesson(area: TerrainArea): LessonState {
  return { stage: 'intro', step: 0, order: tourOrder(area) };
}

/** מטרות הלמידה, נגזרות מהאזור עצמו ולא נכתבות ידנית לכל אזור. */
export function goalsFor(area: TerrainArea): string[] {
  const names = area.features.filter((f) => !f.isConcept).map((f) => f.name);
  const goals = [
    `לזהות ${names.length} צורות שטח במפה טופוגרפית ובתצלום אוויר: ${names.join(', ')}.`,
    `לקרוא את הפרש הגובה של המפה (${area.stats.interval} מ׳ בין קווים סמוכים) ולתרגם צפיפות קווים לתלילות.`,
    'להבחין בין צורה קמורה לקעורה לפי כיוון פניית הקווים ולפי מסלול המים.',
  ];
  const pairs = area.features.filter((f) => f.confusedWith);
  if (pairs.length) {
    const f = pairs[0];
    const other = area.features.find((x) => x.id === f.confusedWith);
    if (other) goals.push(`להבחין בין ${f.name} ל${other.name} — ההבחנה שהכי קל להיכשל בה.`);
  }
  return goals;
}

/** הערכת זמן בדקות. שתי דקות לצורה, ועוד עשר לתרגול ולמבחן. */
export function estimateMinutes(area: TerrainArea): number {
  return Math.round(area.features.length * 2 + 10);
}

export function stageIndex(stage: LessonStage): number {
  return LESSON_STAGES.indexOf(stage);
}

export function nextStage(stage: LessonStage): LessonStage {
  return LESSON_STAGES[Math.min(LESSON_STAGES.length - 1, stageIndex(stage) + 1)];
}

/** צעד קדימה בסיור. כשנגמרות הצורות — מעבר לשלב הבא. */
export function advanceTour(state: LessonState): LessonState {
  if (state.step + 1 < state.order.length) return { ...state, step: state.step + 1 };
  return { ...state, stage: 'practice', step: 0 };
}

export function backTour(state: LessonState): LessonState {
  return { ...state, step: Math.max(0, state.step - 1) };
}

export const TEST_LENGTH = 8;
export const TEST_PASS = 70;
