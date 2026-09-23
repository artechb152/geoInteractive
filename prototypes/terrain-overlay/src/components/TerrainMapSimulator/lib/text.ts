import type { GlossaryTerm, Point, TerrainArea, TerrainFeature } from '../../../data/types';

/** מציב ערכים בתבנית `{key}`. ערך חסר נשאר כפי שהוא ולא הופך ל-"undefined". */
export function fillTemplate(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** הערכים הזמינים להצבה בטקסטי המילון, לפי האזור הפעיל. */
export function areaVars(area: TerrainArea): Record<string, string | number> {
  return {
    interval: area.stats.interval,
    indexInterval: area.stats.indexInterval,
    min: area.stats.min,
    max: area.stats.max,
    relief: area.stats.relief,
    scaleM: area.scaleBarM,
    groundWidthM: area.groundWidthM,
    areaName: area.name,
  };
}

/* --------------------------- קישור מונחים --------------------------- */

const SEPARATORS = ' \t\n,.;:!?"\'״׳()[]{}־-–—/ ';
const isSep = (ch: string | undefined) => ch === undefined || SEPARATORS.includes(ch);

export type TextSegment = { text: string; termId?: string };

/**
 * מפצל טקסט לקטעים, כשכל מונח מהמילון שמופיע בו מסומן — פעם אחת בלבד לכל
 * מונח, כדי שפסקה לא תיהפך לשדה קישורים.
 *
 * סריקה ידנית ולא regex: גבולות מילה (`\b`) אינם מוגדרים היטב לעברית.
 */
export function segmentWithTerms(text: string, glossary: GlossaryTerm[]): TextSegment[] {
  const entries: { needle: string; id: string }[] = [];
  for (const t of glossary) {
    for (const n of [t.term, ...(t.aliases ?? [])]) entries.push({ needle: n, id: t.id });
  }
  entries.sort((a, b) => b.needle.length - a.needle.length);

  const used = new Set<string>();
  const out: TextSegment[] = [];
  let buf = '';
  let i = 0;

  while (i < text.length) {
    let hit: { needle: string; id: string } | undefined;
    if (isSep(i === 0 ? undefined : text[i - 1])) {
      hit = entries.find(
        (e) => !used.has(e.id) && text.startsWith(e.needle, i) && isSep(text[i + e.needle.length]),
      );
    }
    if (hit) {
      if (buf) out.push({ text: buf });
      buf = '';
      out.push({ text: text.slice(i, i + hit.needle.length), termId: hit.id });
      used.add(hit.id);
      i += hit.needle.length;
    } else {
      buf += text[i];
      i++;
    }
  }
  if (buf) out.push({ text: buf });
  return out;
}

/* ------------------------ תיאור מרחבי לקורא מסך ------------------------ */

const COMPASS = [
  'בצפון',
  'בצפון-מזרח',
  'במזרח',
  'בדרום-מזרח',
  'בדרום',
  'בדרום-מערב',
  'במערב',
  'בצפון-מערב',
];

/** כיוון גאוגרפי של נקודה ביחס למרכז המפה (צפון = למעלה). */
export function compassOf(p: Point, size = 1000) {
  const dx = p.x - size / 2;
  const dy = p.y - size / 2;
  if (Math.hypot(dx, dy) < size * 0.12) return 'במרכז';
  // 0° = צפון, מתקדם עם כיוון השעון
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const idx = Math.round(((deg + 360) % 360) / 45) % 8;
  return COMPASS[idx];
}

/**
 * תיאור טקסטואלי מלא של המפה לקורא מסך: מה מוצג, מה טווח הגבהים, ואיפה כל
 * צורה יושבת ביחס למרכז ולשכנתה. זהו התחליף היחיד למפה ויזואלית, ולכן הוא
 * מפרט מיקום ולא רק רשימת שמות.
 */
export function describeArea(area: TerrainArea) {
  const layerLine =
    `שתי שכבות מיושרות של אותו שטח: תצלום אוויר אנכי, ומפה טופוגרפית שבה ` +
    `הפרש הגובה בין קווים סמוכים הוא ${area.stats.interval} מטרים.`;
  const extent =
    `רוחב השטח כ-${area.groundWidthM} מטרים, וטווח הגבהים בו נע בין ` +
    `${area.stats.min} ל-${area.stats.max} מטרים.`;
  const items = area.features.map((f) => {
    const where = compassOf(f.labelPoint);
    const elev = f.elevation ? `, בגובה ${f.elevation} מטרים` : '';
    return `${f.name} ${where}${elev}`;
  });
  return `${area.name}. ${layerLine} ${extent} סומנו ${area.features.length} צורות שטח: ${items.join('; ')}.`;
}

/** תיאור קצר של צורה בודדת — ל-aria-label של אזור הלחיצה. */
export function describeFeature(f: TerrainFeature) {
  return `${f.name}, ${compassOf(f.labelPoint)}${f.elevation ? `, בגובה ${f.elevation} מטרים` : ''}`;
}

/** סדר ניווט גאוגרפי: מצפון לדרום, וממזרח למערב בתוך אותו אזור רוחב. */
export function geographicOrder(features: TerrainFeature[]) {
  return features
    .slice()
    .sort((a, b) => a.labelPoint.y - b.labelPoint.y || b.labelPoint.x - a.labelPoint.x);
}
