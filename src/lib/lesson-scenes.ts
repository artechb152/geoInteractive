import type { InteractionKind } from './lessons';

/**
 * מבנה הסצנות של כל שיעור — מראה סטטית של מערכי SCENES שבקבצי
 * TopicXXLesson.tsx. משמש את דף ה-Overview, כרטיסי הסילבוס ושורת
 * הסטטים בלי לייבא את קומפוננטות הסצנה הכבדות (client-only).
 *
 * ⚠️ לשמור מסונכרן: שינוי סדר/שם סצנה ב-TopicXXLesson חייב להשתקף כאן.
 */
export type SceneMeta = { id: string; label: string };

export const lessonScenes: Record<string, SceneMeta[]> = {
  'topic-01': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'levels', label: 'רמות מלחמה' },
    { id: 'mdo', label: 'MDO' },
    { id: 'asymmetric', label: 'לחימה אסימטרית' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-02': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'topography', label: 'טופוגרפיה' },
    { id: 'scale', label: 'קנה מידה' },
    { id: 'coordinates', label: 'קואורדינטות' },
    { id: 'contours', label: 'קווי גובה' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-03': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'principles', label: 'עקרונות הניווט' },
    { id: 'planning', label: 'תכנון ציר' },
    { id: 'combatnav', label: 'ניווט קרבי' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-04': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'geology', label: 'גיאולוגיה' },
    { id: 'landforms', label: 'תבניות נוף' },
    { id: 'tacticalterrain', label: 'שטח טקטי' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-05': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'trafficability', label: 'עבירות' },
    { id: 'engineering', label: 'הנדסה' },
    { id: 'cover', label: 'מחסה והסתרה' },
    { id: 'vegetation', label: 'תכסית וצומח' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-06': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'los', label: 'קו ראייה' },
    { id: 'viewshed', label: 'Viewshed' },
    { id: 'killchain', label: 'Kill Chain' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-07': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'climate', label: 'מיקרו-אקלים' },
    { id: 'sensors', label: 'בליעה ו-IR' },
    { id: 'platforms', label: 'תקרת ענן' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-08': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'loc', label: 'MSR / ASR' },
    { id: 'tail', label: 'בטן לוגיסטית' },
    { id: 'infrastructure', label: 'נמלים ומסופים' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-09': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'waterenergy', label: 'מים ואנרגיה' },
    { id: 'chokepoints', label: 'נקודות חנק' },
    { id: 'mahan', label: 'דוקטרינת מהן' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-10': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'urbanmorphology', label: 'גריד וקסבה' },
    { id: 'threedim', label: 'ממד אנכי ותת-קרקע' },
    { id: 'civilian', label: 'אזרחים ומשפט' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-11': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'depth', label: 'עומק אסטרטגי' },
    { id: 'buffer', label: 'אזורי חיץ' },
    { id: 'borders', label: 'טיפולוגיית גבולות' },
    { id: 'recap', label: 'סיכום' },
  ],
  'topic-12': [
    { id: 'hook', label: 'פתיחה' },
    { id: 'onboarding', label: 'לפני שמתחילים' },
    { id: 'basics', label: 'שכבות וסוגי נתונים' },
    { id: 'costsurface', label: 'משטח עלות' },
    { id: 'network', label: 'רשתות ו-Buffers' },
    { id: 'recap', label: 'סיכום' },
  ],
};

/** שם עברי קצר לכל סוג תרגול — לשורת הסטטים ולדף ה-Overview. */
export const interactionLabels: Record<InteractionKind, string> = {
  'concept-cards': 'כרטיסי מושג',
  'map-explorer': 'חוקר מפה',
  'navigation-sim': 'סימולטור ניווט',
  'terrain-classifier': 'מסווג צורות נוף',
  'mobility-grid': 'גריד עבירות',
  'los-simulator': 'סימולטור קווי ראייה',
  'weather-impact': 'השפעת מזג אוויר',
  'supply-chain': 'שרשרת אספקה',
  'chokepoint-map': 'מפת נקודות חנק',
  'urban-3d': 'ניווט אורבני תלת־ממדי',
  'border-strategy': 'משחק עומק אסטרטגי',
  'sensor-fusion': 'מיזוג סנסורים',
  'gis-layers': 'שכבות GIS',
};

/** שם עברי לרמת קושי. */
export const difficultyLabels: Record<'foundation' | 'intermediate' | 'advanced', string> = {
  foundation: 'יסוד',
  intermediate: 'בינוני',
  advanced: 'מתקדם',
};

/**
 * מיפוי נכסי Magnific לכל שיעור (design-system §20).
 * card = 1:1 לכרטיס בסילבוס · hook = 16:9 לדף ה-Overview ולסצנת הפתיחה.
 */
export const lessonAssets: Record<string, { card: string; hook: string; slug: string }> = {
  'topic-01': { slug: 'strategy-terrain', card: '/assets/isometric/lesson-01-strategy-terrain.png', hook: '/assets/isometric/lesson-01-strategy-terrain-hook.png' },
  'topic-02': { slug: 'map-reading', card: '/assets/isometric/lesson-02-map-reading.png', hook: '/assets/isometric/lesson-02-map-reading-hook.png' },
  'topic-03': { slug: 'navigation', card: '/assets/isometric/lesson-03-navigation.png', hook: '/assets/isometric/lesson-03-navigation-hook.png' },
  'topic-04': { slug: 'landforms', card: '/assets/isometric/lesson-04-landforms.png', hook: '/assets/isometric/lesson-04-landforms-hook.png' },
  'topic-05': { slug: 'mobility', card: '/assets/isometric/lesson-05-mobility.png', hook: '/assets/isometric/lesson-05-mobility-hook.png' },
  'topic-06': { slug: 'los', card: '/assets/isometric/lesson-06-los.png', hook: '/assets/isometric/lesson-06-los-hook.png' },
  'topic-07': { slug: 'weather', card: '/assets/isometric/lesson-07-weather.png', hook: '/assets/isometric/lesson-07-weather-hook.png' },
  'topic-08': { slug: 'logistics', card: '/assets/isometric/lesson-08-logistics.png', hook: '/assets/isometric/lesson-08-logistics-hook.png' },
  'topic-09': { slug: 'chokepoints', card: '/assets/isometric/lesson-09-chokepoints.png', hook: '/assets/isometric/lesson-09-chokepoints-hook.png' },
  'topic-10': { slug: 'urban', card: '/assets/isometric/lesson-10-urban.png', hook: '/assets/isometric/lesson-10-urban-hook.png' },
  'topic-11': { slug: 'borders', card: '/assets/isometric/lesson-11-borders.png', hook: '/assets/isometric/lesson-11-borders-hook.png' },
  'topic-12': { slug: 'gis-layers', card: '/assets/isometric/lesson-12-gis-layers.png', hook: '/assets/isometric/lesson-12-gis-layers-hook.png' },
};
