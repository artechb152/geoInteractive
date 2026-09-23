import { describe, expect, it } from 'vitest';
import { TERRAIN_AREAS, getAreaById } from '../src/data/areas';
import { FAMILIES, GLOSSARY, UI } from '../src/data/content';
import type { SignatureKind, TerrainArea } from '../src/data/types';

/**
 * בדיקות תקינות נתונים.
 *
 * הגאומטריה והתוכן הם נתונים "שקטים": נתיב SVG שנשבר, תווית שיצאה מגבולות
 * ה-viewBox, או חתימה שאין לה תרשים — כל אלה עוברים קומפילציה בלי מילה,
 * ונראים בשטח רק כמפה שבורה אצל לומד. הבדיקות האלה הן הרשת היחידה מתחתיהם,
 * והן רצות על **כל** האזורים ולא על מדגם.
 */

/** החתימות שיש להן תרשים ב-ContourSignature. */
const DRAWN_SIGNATURES: SignatureKind[] = [
  'rings',
  'crest',
  'bowtie',
  'parallel',
  'u',
  'v',
  'contours',
  'cliff',
  'depression',
  'flat',
  'shelf',
  'neck',
  'basin',
];

/**
 * שש-עשרה הצורות של יעד גרסה 1.0 (L-05).
 *
 * הבדיקה היא על **הספרייה**, לא על כל אזור: צורה שאין לה מופע מובהק באזור
 * מסוים פשוט אינה מיוצרת שם, וזו התנהגות נכונה של מנוע מונחה-נתונים. מה
 * שכן חייב להתקיים הוא שלכל אחת מ-16 יש מופע אמיתי **באיזשהו** אזור —
 * אחרת הלומד לא ייפגש בה לעולם.
 */
const REQUIRED_KINDS = [
  'contours',
  'ridge',
  'mountain',
  'dome',
  'hill',
  'spur',
  'shoulder',
  'saddle',
  'neck',
  'valley',
  'channel',
  'basin',
  'depression',
  'slope',
  'plain',
  'cliff',
];

const each = (fn: (area: TerrainArea) => void) => () => TERRAIN_AREAS.forEach(fn);

describe('מאגר האזורים', () => {
  it('מכיל לפחות שישה אזורים — היעד הכמותי של גרסה 1.0', () => {
    expect(TERRAIN_AREAS.length).toBeGreaterThanOrEqual(6);
  });

  it('מזהי האזורים ייחודיים', () => {
    const ids = TERRAIN_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('מוחזר אזור תקין גם למזהה שאינו קיים', () => {
    expect(getAreaById('אין-כזה')).toBe(TERRAIN_AREAS[0]);
    expect(getAreaById(null)).toBe(TERRAIN_AREAS[0]);
    expect(getAreaById(undefined)).toBe(TERRAIN_AREAS[0]);
  });

  it(
    'לכל אזור שדות תצוגה מלאים',
    each((area) => {
      expect(area.name, area.id).toBeTruthy();
      expect(area.region, area.id).toBeTruthy();
      expect(area.intro, area.id).toBeTruthy();
      expect(area.teaches, area.id).toBeTruthy();
      expect(area.groundWidthM, area.id).toBeGreaterThan(0);
      expect(area.scaleBarM, area.id).toBeGreaterThan(0);
      /* סרגל שארוך מהמפה עצמה אינו סרגל — הוא קו שיוצא מהמסגרת */
      expect(area.scaleBarM, area.id).toBeLessThan(area.groundWidthM);
    }),
  );

  it(
    'לכל אזור שכבות תמונה עם srcset ו-LQIP',
    each((area) => {
      for (const [name, layer] of Object.entries(area.layers)) {
        const where = `${area.id}/${name}`;
        expect(layer.avif, where).toContain('w');
        expect(layer.webp, where).toContain('w');
        expect(layer.fallback, where).toBeTruthy();
        expect(layer.lqip, where).toMatch(/^data:image\//);
        expect(layer.widths.length, where).toBeGreaterThan(0);
      }
    }),
  );

  it(
    'לכל אזור נתוני גובה סבירים',
    each((area) => {
      const s = area.stats;
      expect(s.max, area.id).toBeGreaterThan(s.min);
      expect(s.relief, area.id).toBe(s.max - s.min);
      expect(s.interval, area.id).toBeGreaterThan(0);
      expect(s.indexInterval, area.id).toBe(s.interval * 5);
      /* מרווח שגדול מכל התבליט מייצר מפה בלי אף קו גובה */
      expect(s.interval, area.id).toBeLessThan(s.relief);
    }),
  );

  it(
    'לכל אזור ייחוס לשלושת המקורות',
    each((area) => {
      expect(area.attribution.aerial, area.id).toBeTruthy();
      expect(area.attribution.topo, area.id).toBeTruthy();
      expect(area.attribution.dem, area.id).toBeTruthy();
    }),
  );
});

describe('צורות השטח', () => {
  it('כל 16 הצורות של גרסה 1.0 קיימות בספרייה', () => {
    const found = new Set(TERRAIN_AREAS.flatMap((a) => a.features.map((f) => f.id)));
    const missing = REQUIRED_KINDS.filter((k) => !found.has(k));
    expect(missing, `צורות חסרות: ${missing.join(', ')}`).toEqual([]);
  });

  it('כל צורה שנוצרה מוכרת — אין מזהה יתום', () => {
    const found = [...new Set(TERRAIN_AREAS.flatMap((a) => a.features.map((f) => f.id)))];
    const unknown = found.filter((k) => !REQUIRED_KINDS.includes(k));
    expect(unknown, `מזהים לא מוכרים: ${unknown.join(', ')}`).toEqual([]);
  });

  it(
    'מזהי הצורות ייחודיים בתוך כל אזור',
    each((area) => {
      const ids = area.features.map((f) => f.id);
      expect(new Set(ids).size, area.id).toBe(ids.length);
    }),
  );

  it(
    'לכל צורה נתיב לחיצה תקין',
    each((area) => {
      for (const f of area.features) {
        const where = `${area.id}/${f.id}`;
        expect(f.hitPath, where).toBeTruthy();
        /* נתיב חייב להתחיל בפקודת "עבור אל" — נתיב שמתחיל ב-L מתחבר לנקודה
           שרירותית ומייצר אזור לחיצה שגוי בשקט */
        expect(f.hitPath.trim()[0], where).toMatch(/[Mm]/);
        expect(f.hitPath.length, where).toBeGreaterThan(20);
        expect(f.hitPath, where).not.toContain('NaN');
        expect(f.hitPath, where).not.toContain('undefined');
      }
    }),
  );

  it(
    'נקודת התווית בתוך ה-viewBox',
    each((area) => {
      for (const f of area.features) {
        const where = `${area.id}/${f.id}`;
        expect(f.labelPoint.x, where).toBeGreaterThanOrEqual(0);
        expect(f.labelPoint.x, where).toBeLessThanOrEqual(area.viewBox.width);
        expect(f.labelPoint.y, where).toBeGreaterThanOrEqual(0);
        expect(f.labelPoint.y, where).toBeLessThanOrEqual(area.viewBox.height);
      }
    }),
  );

  it(
    'לכל חתימה יש תרשים ב-ContourSignature',
    each((area) => {
      for (const f of area.features) {
        expect(DRAWN_SIGNATURES, `${area.id}/${f.id}`).toContain(f.signature);
      }
    }),
  );

  it(
    'לכל משפחה יש כותרת במקרא',
    each((area) => {
      for (const f of area.features) {
        expect(FAMILIES[f.family], `${area.id}/${f.id}`).toBeDefined();
      }
    }),
  );

  it(
    'שדות התוכן קיימים ואינם ריקים',
    each((area) => {
      for (const f of area.features) {
        const where = `${area.id}/${f.id}`;
        // שם קצר הוא לגיטימי ("כתף", "הר"); טקסט הסבר קצר הוא תקלה
        expect(f.name.trim().length, `${where}.name`).toBeGreaterThan(1);
        for (const key of [
          'definition',
          'shortDescription',
          'aerialExplanation',
          'mapExplanation',
          'whyItMatters',
        ] as const) {
          expect(f[key], `${where}.${key}`).toBeTruthy();
          expect(String(f[key]).trim().length, `${where}.${key}`).toBeGreaterThan(25);
        }
        /* תבנית שלא הוצבה משאירה סוגריים מסולסלים בטקסט שהלומד קורא */
        expect(f.shortDescription, where).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(f.whyItMatters, where).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }),
  );

  it(
    '`confusedWith` מצביע לצורה שקיימת באותו אזור',
    each((area) => {
      const ids = new Set(area.features.map((f) => f.id));
      for (const f of area.features) {
        if (!f.confusedWith) continue;
        expect(ids.has(f.confusedWith), `${area.id}/${f.id} → ${f.confusedWith}`).toBe(true);
      }
    }),
  );

  it(
    'לכל אתגר יש תשובה — לא רק שאלה',
    each((area) => {
      for (const f of area.features) {
        if (!f.challenge) continue;
        expect(f.challenge.prompt, `${area.id}/${f.id}`).toBeTruthy();
        expect(f.challenge.answer, `${area.id}/${f.id}`).toBeTruthy();
        expect(f.challenge.answer, `${area.id}/${f.id}`).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }),
  );

  it(
    'מזהי המונחים של הצורה קיימים במילון',
    each((area) => {
      const terms = new Set(GLOSSARY.map((t) => t.id));
      for (const f of area.features) {
        for (const id of f.terms ?? []) {
          expect(terms.has(id), `${area.id}/${f.id} → ${id}`).toBe(true);
        }
      }
    }),
  );

  it(
    'סדר הערום לפי שטח מוגדר לכל צורה שיש לה שכנה חופפת',
    each((area) => {
      // בלי `hitArea` הצורה נדחפת לתחתית הערום ועלולה לחסום את שכנותיה (S-06)
      const withArea = area.features.filter((f) => f.hitArea !== undefined);
      expect(withArea.length, area.id).toBe(area.features.length);
    }),
  );
});

describe('תוכן שאינו תלוי-אזור', () => {
  it('מזהי המונחים במילון ייחודיים', () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('לכל מונח הגדרה של ממש', () => {
    for (const t of GLOSSARY) {
      expect(t.term, t.id).toBeTruthy();
      expect(t.definition.length, t.id).toBeGreaterThan(20);
    }
  });

  it('מחרוזות הממשק קיימות', () => {
    for (const [key, value] of Object.entries(UI)) {
      expect(String(value).trim(), key).not.toBe('');
    }
  });

  it('הפיסוק העברי תקני — גרש וגרשיים ולא אפוסטרוף לטיני', () => {
    const offenders: string[] = [];
    for (const area of TERRAIN_AREAS) {
      for (const f of area.features) {
        const text = [
          f.definition,
          f.localNote,
          f.aerialExplanation,
          f.mapExplanation,
          f.whyItMatters,
        ]
          .filter(Boolean)
          .join(' ');
        // "מ'" עם אפוסטרוף לטיני במקום "מ׳"
        if (/[א-ת]'/.test(text) || /[א-ת]"[א-ת]/.test(text)) {
          offenders.push(`${area.id}/${f.id}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
