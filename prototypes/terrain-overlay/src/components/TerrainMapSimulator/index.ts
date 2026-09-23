/**
 * נקודת הכניסה הציבורית של הרכיב.
 *
 * הייצוא העוטף כולל ErrorBoundary: שילוב בדף קורס לא אמור להסתכן בכך שחריגה
 * ברכיב אחד תפיל את כל הדף. מי שרוצה לטפל בשגיאות בעצמו מייבא את הגרסה
 * ה"חשופה".
 */
export { default } from './TerrainMapSimulatorSafe';
export { default as TerrainMapSimulator } from './TerrainMapSimulatorSafe';
export { default as TerrainMapSimulatorUnsafe } from './TerrainMapSimulator';

export type { TerrainMapSimulatorProps, TmsEvent, TmsMode } from './TerrainMapSimulator';
export type { CompareMode } from './lib/compare';
export type {
  ProgressEvent,
  ProgressSnapshot,
  CompletionResult,
  XapiStatement,
} from './lib/progress';
export type { DeepLinkState } from './lib/deepLink';
export type { LessonStage } from './lib/lesson';

export type {
  TerrainArea,
  TerrainFeature,
  SignatureKind,
  FeatureFamily,
  AreaDifficulty,
  AreaStats,
  Challenge,
  GlossaryTerm,
  ImageLayer,
  Point,
} from '../../data/types';

export { TERRAIN_AREAS, DEFAULT_AREA_ID, getAreaById } from '../../data/areas';
export { GLOSSARY, FAMILIES, FAMILY_ORDER } from '../../data/content';

/** בוררי מצב ההשוואה — שימושי לקורס שרוצה להציע אותם בממשק שלו. */
export { COMPARE_MODES, availableModes } from './lib/compare';

/** תשתית ה-i18n. הוספת שפה אינה דורשת שינוי באף רכיב. */
export { getDict, dirFor, LOCALES } from '../../i18n';
export type { Locale, Dict } from '../../i18n';

/** ניקוי המצב השמור — לכפתור "אפס התקדמות" שהקורס מציב בעצמו. */
export { clearStoredState } from './hooks/useLocalState';
