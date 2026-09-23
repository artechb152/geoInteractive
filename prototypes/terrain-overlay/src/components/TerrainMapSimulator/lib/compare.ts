import type { TerrainArea } from '../../../data/types';
import type { LayerName } from '../MapLayers';

/**
 * מצבי ההשוואה בין השכבות.
 *
 * `wipe` הוא ברירת המחדל, ולא `fade`. שקיפות היא המצב הגרוע ביותר האפשרי
 * באמצע הטווח: ב-50% שתי השכבות בוציות ואף אחת מהן אינה קריאה — כלומר
 * ברירת המחדל שהלומד ראה ראשון הייתה בדיוק המצב הכי פחות קריא.
 */
export type CompareMode = 'wipe' | 'fade' | 'split' | 'hillshade';

export interface CompareModeInfo {
  id: CompareMode;
  label: string;
  /** הסבר קצר — מוצג כ-title ובחלונית העזרה. */
  hint: string;
  /** האם המחוון רלוונטי במצב הזה. */
  usesSlider: boolean;
  /** מצב שדורש שכבת הצללה — מוסתר באזור שאין לו אחת. */
  needsHillshade?: boolean;
}

export const COMPARE_MODES: CompareModeInfo[] = [
  {
    id: 'wipe',
    label: 'וילון',
    hint: 'קו מפריד נגרר. שתי השכבות חדות ב-100%, וההשוואה מקומית ומדויקת.',
    usesSlider: true,
  },
  {
    id: 'fade',
    label: 'שקיפות',
    hint: 'מעבר רציף בין השכבות. שימושי לראות איפה בדיוק יושב קו גובה על השטח.',
    usesSlider: true,
  },
  {
    id: 'split',
    label: 'זה לצד זה',
    hint: 'שני חלונות מסונכרנים — הזום וההזזה משותפים לשניהם.',
    usesSlider: false,
  },
  {
    id: 'hillshade',
    label: 'הצללה',
    hint: 'תבליט השטח מואר מצפון-מערב — הגשר בין התצלום למפה.',
    usesSlider: true,
    needsHillshade: true,
  },
];

/** המצבים הזמינים באזור מסוים. אזור בלי שכבת הצללה פשוט אינו מציע אותה. */
export function availableModes(area: TerrainArea): CompareModeInfo[] {
  return COMPARE_MODES.filter((m) => !m.needsHillshade || Boolean(area.layers.hillshade));
}

/**
 * שתי השכבות שהמצב מרכיב: `[תחתונה, עליונה]`.
 * ‎`blend = 0`‎ מציג את התחתונה, ‎`blend = 1`‎ את העליונה.
 */
export function layersFor(area: TerrainArea, mode: CompareMode): [LayerName, LayerName] {
  if (mode === 'hillshade' && area.layers.hillshade) return ['hillshade', 'topo'];
  return ['aerial', 'topo'];
}

/** האם המצב תקף לאזור — מגן על deep-link שמצביע למצב שאינו קיים כאן. */
export function normalizeMode(area: TerrainArea, mode: string | null | undefined): CompareMode {
  const list = availableModes(area);
  return (list.find((m) => m.id === mode)?.id ?? 'wipe') as CompareMode;
}

/**
 * ברירות מחדל נפרדות לכל משפחת מצבים. ערך יחיד משותף היה גורר את הווילון
 * ואת השקיפות לאותו מספר, ואז מעבר בין המצבים היה נוחת בדיוק על 50% השקיפות
 * שממנה ניסינו להיפטר.
 */
export const DEFAULT_WIPE = 0.5;
export const DEFAULT_FADE = 0;
