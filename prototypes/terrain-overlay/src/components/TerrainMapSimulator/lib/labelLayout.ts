import type { Point } from '../../../data/types';

/**
 * labelLayout — פתרון התנגשויות בין תוויות הצורות במצב "הצג הכול".
 *
 * הבעיה: התוויות מעוגנות לנקודות אמיתיות בשטח, ובשטח צפוף שתי צורות סמוכות
 * נותנות שתי תוויות זו על גבי זו. הפתרון הוא הרחקה איטרטיבית מהמיקום הרצוי
 * עם קו מוביל חזרה לעוגן — כך המיקום נשאר מובן גם אחרי ההזזה.
 */

export interface LabelInput {
  id: string;
  anchor: Point;
  text: string;
}

export interface LabelBox {
  id: string;
  anchor: Point;
  /** מרכז התווית אחרי פתרון ההתנגשויות. */
  pos: Point;
  width: number;
  height: number;
  /** true אם התווית הוזזה מספיק כדי להצדיק קו מוביל. */
  needsLeader: boolean;
}

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

/**
 * מדידת רוחב טקסט אמיתית. החישוב הקודם (`text.length * 12`) שגוי לעברית —
 * רוחב האות משתנה מאוד, והתוצאה הייתה מסגרות צרות מדי או רחבות מדי.
 */
export function measureText(text: string, font: string): number {
  const key = font + '|' + text;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (ctx === undefined) {
    ctx =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  let w: number;
  if (ctx) {
    ctx.font = font;
    w = ctx.measureText(text).width;
  } else {
    w = text.length * 9; // סביבה ללא DOM (בדיקות/SSR)
  }
  cache.set(key, w);
  return w;
}

interface Options {
  fontSize: number;
  fontFamily: string;
  fontWeight?: number | string;
  paddingX?: number;
  paddingY?: number;
  /** ההיסט הרצוי מעל נקודת העוגן. */
  offsetY?: number;
  bounds?: { width: number; height: number };
  iterations?: number;
}

export function layoutLabels(items: LabelInput[], opts: Options): LabelBox[] {
  const {
    fontSize,
    fontFamily,
    fontWeight = 700,
    paddingX = 11,
    paddingY = 6,
    offsetY = 26,
    bounds = { width: 1000, height: 1000 },
    iterations = 90,
  } = opts;

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const boxes: LabelBox[] = items.map((it) => ({
    id: it.id,
    anchor: it.anchor,
    pos: { x: it.anchor.x, y: it.anchor.y - offsetY },
    width: measureText(it.text, font) + paddingX * 2,
    height: fontSize + paddingY * 2,
    needsLeader: false,
  }));

  const overlap = (a: LabelBox, b: LabelBox) => {
    const ox = (a.width + b.width) / 2 - Math.abs(a.pos.x - b.pos.x);
    const oy = (a.height + b.height) / 2 + 3 - Math.abs(a.pos.y - b.pos.y);
    return ox > 0 && oy > 0 ? { ox, oy } : null;
  };

  for (let step = 0; step < iterations; step++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const hit = overlap(a, b);
        if (!hit) continue;
        moved = true;
        // דוחפים לאורך הציר שבו החפיפה קטנה יותר — מסלול הבריחה הקצר
        if (hit.oy <= hit.ox) {
          const d = (hit.oy / 2 + 0.5) * (a.pos.y <= b.pos.y ? -1 : 1);
          a.pos.y += d;
          b.pos.y -= d;
        } else {
          const d = (hit.ox / 2 + 0.5) * (a.pos.x <= b.pos.x ? -1 : 1);
          a.pos.x += d;
          b.pos.x -= d;
        }
      }
    }
    // משיכה עדינה חזרה אל העוגן, כדי שהתווית לא תיסחף רחוק מדי
    for (const b of boxes) {
      const tx = b.anchor.x;
      const ty = b.anchor.y - offsetY;
      b.pos.x += (tx - b.pos.x) * 0.04;
      b.pos.y += (ty - b.pos.y) * 0.04;
      b.pos.x = Math.min(bounds.width - b.width / 2 - 4, Math.max(b.width / 2 + 4, b.pos.x));
      b.pos.y = Math.min(bounds.height - b.height / 2 - 4, Math.max(b.height / 2 + 4, b.pos.y));
    }
    if (!moved) break;
  }

  for (const b of boxes) {
    b.needsLeader = Math.hypot(b.pos.x - b.anchor.x, b.pos.y - b.anchor.y) > offsetY + 6;
    b.pos.x = Math.round(b.pos.x * 10) / 10;
    b.pos.y = Math.round(b.pos.y * 10) / 10;
  }
  return boxes;
}
