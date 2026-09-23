import { describe, expect, it } from 'vitest';
import { TERRAIN_AREAS, getAreaById } from '../src/data/areas';
import {
  advance,
  buildDistractors,
  createQuiz,
  currentQuestion,
  proximityFeedback,
  scoreFor,
  submitAnswer,
  summarize,
} from '../src/components/TerrainMapSimulator/quiz/quizEngine';
import {
  advanceTour,
  backTour,
  createLesson,
  estimateMinutes,
  goalsFor,
  nextStage,
  stageIndex,
  tourOrder,
} from '../src/components/TerrainMapSimulator/lib/lesson';
import {
  availableModes,
  layersFor,
  normalizeMode,
} from '../src/components/TerrainMapSimulator/lib/compare';
import { buildHash, readDeepLink } from '../src/components/TerrainMapSimulator/lib/deepLink';
import {
  PASS_PERCENT,
  isComplete,
  isoDuration,
  snapshot,
  statement,
} from '../src/components/TerrainMapSimulator/lib/progress';
import {
  niceRange,
  pathCenter,
  typicalCut,
} from '../src/components/TerrainMapSimulator/lib/elevation';
import {
  compassOf,
  geographicOrder,
  segmentWithTerms,
} from '../src/components/TerrainMapSimulator/lib/text';
import { layoutLabels } from '../src/components/TerrainMapSimulator/lib/labelLayout';
import { GLOSSARY } from '../src/data/content';

const gilboa = getAreaById('gilboa');

describe('מנוע התרגול', () => {
  it('סבב באורך קבוע, וכל שאלה מצביעה לצורה קיימת', () => {
    const q = createQuiz(gilboa.features, { level: 1, length: 10 });
    expect(q.queue.length).toBe(10);
    const ids = new Set(gilboa.features.map((f) => f.id));
    for (const question of q.queue) expect(ids.has(question.featureId)).toBe(true);
  });

  it('ההסחות אינן כוללות את התשובה ואינן חוזרות על עצמן', () => {
    const target = gilboa.features.find((f) => f.id === 'spur')!;
    const distractors = buildDistractors(target, gilboa.features, 3);
    expect(distractors.length).toBe(3);
    expect(new Set(distractors).size).toBe(distractors.length);
    expect(distractors).not.toContain(target.id);
  });

  /**
   * ההסחה הראשונה היא הצורה המבלבלת ולא צורה אקראית: השאלה "שלוחה או גיא"
   * מלמדת את ההבחנה שבגללה טועים בשטח, ואילו "שלוחה או מדרון" נפתרת בניחוש.
   */
  it('ההסחה הראשונה היא הצורה המבלבלת', () => {
    for (const f of gilboa.features.filter((x) => x.confusedWith && !x.isConcept)) {
      const distractors = buildDistractors(f, gilboa.features, 3);
      expect(distractors[0], f.id).toBe(f.confusedWith);
    }
  });

  it('תשובה נכונה מוסיפה ניקוד, שגויה לא', () => {
    let q = createQuiz(gilboa.features, { level: 1, length: 10 });
    q = submitAnswer(q, gilboa.features, { correct: true, usedHint: false, ms: 1000 });
    expect(q.score).toBeGreaterThan(0);
    const after = submitAnswer(advance(q), gilboa.features, {
      correct: false,
      usedHint: false,
      ms: 1000,
    });
    expect(after.score).toBe(q.score);
  });

  it('רצף מוסיף בונוס, ורמז מוריד מהניקוד', () => {
    const base = createQuiz(gilboa.features, { level: 1, length: 10 });
    const plain = scoreFor({ ...base, streak: 0 }, false, false);
    const streaked = scoreFor({ ...base, streak: 4 }, false, false);
    const hinted = scoreFor({ ...base, streak: 0 }, true, false);
    expect(streaked).toBeGreaterThan(plain);
    expect(hinted).toBeLessThan(plain);
  });

  /**
   * הבאג שהתגלה בפיתוח: חזרה מרווחת בלי חסם הפכה סבב של 10 שאלות ל-29 אצל
   * לומד שמתקשה — כלומר "סבב קצר" שלא נגמר.
   */
  it('סבב מסתיים גם כשכל התשובות שגויות', () => {
    let q = createQuiz(gilboa.features, { level: 1, length: 10 });
    let guard = 0;
    while (q.status !== 'done' && guard++ < 200) {
      q = submitAnswer(q, gilboa.features, { correct: false, usedHint: false, ms: 500 });
      q = advance(q);
    }
    expect(q.status).toBe('done');
    expect(q.queue.length).toBeLessThanOrEqual(14);
  });

  it('הסיכום מונה את הצורות שנפלו', () => {
    let q = createQuiz(gilboa.features, { level: 1, length: 10 });
    const first = currentQuestion(q)!.featureId;
    q = submitAnswer(q, gilboa.features, { correct: false, usedHint: false, ms: 500 });
    const s = summarize(q);
    expect(s.missed).toContain(first);
    expect(s.percent).toBeGreaterThanOrEqual(0);
    expect(s.percent).toBeLessThanOrEqual(100);
  });

  it('משוב המרחק מתחדד ככל שמתקרבים', () => {
    const near = proximityFeedback(30);
    const far = proximityFeedback(600);
    expect(near).not.toBe(far);
    expect(near).toBeTruthy();
    expect(far).toBeTruthy();
  });
});

describe('מסלול השיעור', () => {
  it('סדר הסיור מכסה כל צורה בדיוק פעם אחת', () => {
    for (const area of TERRAIN_AREAS) {
      const order = tourOrder(area);
      expect(order.length, area.id).toBe(area.features.length);
      expect(new Set(order).size, area.id).toBe(order.length);
    }
  });

  it('המושג נפתח ראשון, לפני הצורות', () => {
    const order = tourOrder(gilboa);
    const concept = gilboa.features.find((f) => f.isConcept);
    if (concept) expect(order[0]).toBe(concept.id);
  });

  it('זוג מבלבל מוצג ברצף — שם נמצאת ההבחנה', () => {
    const order = tourOrder(gilboa);
    const pair = gilboa.features.find(
      (f) => f.confusedWith && gilboa.features.some((x) => x.id === f.confusedWith),
    );
    if (!pair) return;
    const i = order.indexOf(pair.id);
    const j = order.indexOf(pair.confusedWith!);
    expect(Math.abs(i - j)).toBe(1);
  });

  it('הסיור מתקדם ועובר לתרגול כשנגמרות הצורות', () => {
    let state = createLesson(gilboa);
    state = { ...state, stage: 'explore' };
    for (let i = 0; i < state.order.length - 1; i++) state = advanceTour(state);
    expect(state.stage).toBe('explore');
    state = advanceTour(state);
    expect(state.stage).toBe('practice');
  });

  it('חזרה אחורה אינה יורדת מתחת לצורה הראשונה', () => {
    const state = backTour({ ...createLesson(gilboa), step: 0 });
    expect(state.step).toBe(0);
  });

  it('שלבי השיעור מתקדמים ונעצרים בסיכום', () => {
    expect(stageIndex('intro')).toBe(0);
    expect(nextStage('intro')).toBe('explore');
    expect(nextStage('summary')).toBe('summary');
  });

  it('מטרות הלמידה נגזרות מהאזור ומזכירות את הפרש הגובה שלו', () => {
    const goals = goalsFor(gilboa);
    expect(goals.length).toBeGreaterThanOrEqual(3);
    expect(goals.join(' ')).toContain(String(gilboa.stats.interval));
    expect(estimateMinutes(gilboa)).toBeGreaterThan(0);
  });
});

describe('מצבי ההשוואה', () => {
  it('מצב ההצללה מוצע רק באזור שיש לו שכבת הצללה', () => {
    for (const area of TERRAIN_AREAS) {
      const ids = availableModes(area).map((m) => m.id);
      expect(ids.includes('hillshade'), area.id).toBe(Boolean(area.layers.hillshade));
    }
  });

  it('מצב לא מוכר נופל בחזרה לווילון — לא לשקיפות', () => {
    expect(normalizeMode(gilboa, 'אין-כזה')).toBe('wipe');
    expect(normalizeMode(gilboa, null)).toBe('wipe');
    expect(normalizeMode(gilboa, 'split')).toBe('split');
  });

  it('מצב ההצללה מחליף את השכבה התחתונה, לא את העליונה', () => {
    expect(layersFor(gilboa, 'wipe')).toEqual(['aerial', 'topo']);
    expect(layersFor(gilboa, 'hillshade')).toEqual(['hillshade', 'topo']);
  });
});

describe('קישורים עמוקים', () => {
  it('קריאה וכתיבה הן פעולות הפוכות', () => {
    const state = { area: 'darga', feature: 'cliff', mode: 'quiz', compare: 'split', blend: 0.4 };
    const parsed = readDeepLink('', buildHash(state));
    expect(parsed.area).toBe('darga');
    expect(parsed.feature).toBe('cliff');
    expect(parsed.mode).toBe('quiz');
    expect(parsed.compare).toBe('split');
    expect(parsed.blend).toBeCloseTo(0.4, 2);
  });

  it('ערכי ברירת המחדל מושמטים — קישור נקי הוא קישור שנשלח', () => {
    expect(buildHash({ area: 'gilboa', mode: 'explore', compare: 'wipe' })).toBe('#area=gilboa');
    expect(buildHash({})).toBe('');
  });

  it('מקבל גם `?` וגם `#`, ומתעלם מערכים לא תקינים', () => {
    expect(readDeepLink('?area=meron', '').area).toBe('meron');
    expect(readDeepLink('', '#blend=abc').blend).toBeUndefined();
    expect(readDeepLink('', '#blend=250').blend).toBe(1);
  });
});

describe('התקדמות ודיווח', () => {
  it('השלמה דורשת גם צפייה בכל הצורות וגם מעבר תרגול', () => {
    const all = gilboa.features.map((f) => f.id);
    expect(isComplete(all, all.length, undefined)).toBe(false);
    expect(isComplete(all, all.length, PASS_PERCENT - 1)).toBe(false);
    expect(isComplete(all.slice(0, 2), all.length, 100)).toBe(false);
    expect(isComplete(all, all.length, PASS_PERCENT)).toBe(true);
  });

  it('התמונה מחשבת יחס נכון', () => {
    const snap = snapshot(
      gilboa,
      gilboa.features.slice(0, 3).map((f) => f.id),
      2,
      80,
    );
    expect(snap.total).toBe(gilboa.features.length);
    expect(snap.ratio).toBeCloseTo(3 / gilboa.features.length, 5);
    expect(snap.areasVisited).toBe(2);
  });

  it('הצהרת xAPI תקנית', () => {
    const s = statement(
      'completed',
      { id: 'area/gilboa', name: 'רכס הגלבוע', type: 'module' },
      { success: true, completion: true },
    );
    expect(s.verb.id).toContain('completed');
    expect(s.object.id).toContain('area/gilboa');
    expect(s.object.definition.name['he-IL']).toBe('רכס הגלבוע');
    expect(s.result?.success).toBe(true);
    expect(() => new Date(s.timestamp).toISOString()).not.toThrow();
  });

  it('משך זמן בפורמט ISO-8601', () => {
    expect(isoDuration(90)).toBe('PT90S');
    expect(isoDuration(-5)).toBe('PT0S');
  });
});

describe('חתך גובה', () => {
  it('החתך האופייני חוצה את הצורה ונשאר בגבולות המפה', () => {
    for (const f of gilboa.features) {
      const c = pathCenter(f.hitPath, f.labelPoint);
      const [a, b] = typicalCut(f.hitPath, c);
      for (const p of [a, b]) {
        expect(p.x, f.id).toBeGreaterThanOrEqual(0);
        expect(p.x, f.id).toBeLessThanOrEqual(1000);
        expect(p.y, f.id).toBeGreaterThanOrEqual(0);
        expect(p.y, f.id).toBeLessThanOrEqual(1000);
      }
      expect(Math.hypot(b.x - a.x, b.y - a.y), f.id).toBeGreaterThan(20);
    }
  });

  it('הסקאלה האנכית עוטפת את הטווח — גם כשהתבליט זעום', () => {
    const [lo, hi] = niceRange(10, 12);
    expect(lo).toBeLessThanOrEqual(10);
    expect(hi).toBeGreaterThanOrEqual(12);
    const [lo2, hi2] = niceRange(287, 539);
    expect(lo2).toBeLessThanOrEqual(287);
    expect(hi2).toBeGreaterThanOrEqual(539);
  });
});

describe('טקסט ותוויות', () => {
  it('כיוון גאוגרפי נגזר מהמיקום', () => {
    expect(compassOf({ x: 500, y: 100 })).toContain('צפון');
    expect(compassOf({ x: 500, y: 900 })).toContain('דרום');
  });

  it('סדר גאוגרפי יציב וכולל את כל הצורות', () => {
    const order = geographicOrder(gilboa.features);
    expect(order.length).toBe(gilboa.features.length);
    expect(new Set(order.map((f) => f.id)).size).toBe(order.length);
  });

  it('מונחים בטקסט מזוהים ומקבלים מזהה', () => {
    const segs = segmentWithTerms('הפרש הגובה במפה זו הוא 10 מ׳', GLOSSARY);
    expect(segs.some((s) => s.termId)).toBe(true);
    expect(segs.map((s) => s.text).join('')).toBe('הפרש הגובה במפה זו הוא 10 מ׳');
  });

  it('פריסת התוויות פותרת התנגשויות', () => {
    const boxes = layoutLabels(
      [
        { id: 'a', anchor: { x: 500, y: 500 }, text: 'אוכף' },
        { id: 'b', anchor: { x: 505, y: 503 }, text: 'קו רכס' },
        { id: 'c', anchor: { x: 510, y: 506 }, text: 'שלוחה' },
      ],
      { fontSize: 15, offsetY: 28 },
    );
    expect(boxes.length).toBe(3);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.abs(a.pos.x - b.pos.x) < (a.width + b.width) / 2;
        const overlapY = Math.abs(a.pos.y - b.pos.y) < (a.height + b.height) / 2;
        expect(overlapX && overlapY, `${a.id}↔${b.id}`).toBe(false);
      }
    }
  });
});
