/**
 * Terrain data for the trafficability driving lab (`/lab/trafficability-drive`).
 *
 * Soil ids and Hebrew copy are duplicated verbatim from `SOILS` in
 * ../TrafficabilityScene.tsx (which stays untouched until this lab is
 * reviewed and merged into the lesson) — see design/docs/assumptions.md.
 */

export type SoilId = 'hard' | 'soft' | 'sand' | 'mud';

export type TerrainPhysics = {
  /** 0..1 — how much of the driver's steering/accel input actually translates to grip. Lower = more slip. */
  traction: number;
  /** Extra speed lost per second to rolling resistance (soft/loose ground eating momentum). */
  rollingResistance: number;
  /** How fast the vehicle sinks (0..1 depth) per second while slow/stopped here. 0 = never sinks. */
  sinkRate: number;
  /** Depth (0..1) at which the vehicle is considered stuck. */
  stuckDepth: number;
  /** Speed (m/s) above which sinking reverses (momentum keeps the vehicle up) — mirrors the "never stop in mud" lesson tip. */
  antiSinkSpeed: number;
  /** Multiplier on suspension bump amplitude — sharp rock vs. soft sand. */
  bumpiness: number;
  /** Multiplier on the vehicle's top speed. Kept close to 1 — terrain should mostly be felt through grip/slip/sink, not a speed cap. */
  topSpeedFactor: number;
};

export type TerrainVisual = {
  textureDir: string;
  /** World-space texture tiling repeats across the ~40m playable tile. */
  repeat: number;
  fog: string;
  sky: string;
  ambient: string;
  sun: string;
};

export type TerrainHeightProfile = {
  /** Overall vertical scale (m) of the terrain's large-scale relief. */
  macroAmplitude: number;
  /** Large-scale feature frequency — lower = broader hills/dunes. */
  macroFrequency: number;
  /** Small-scale surface roughness amplitude (m), felt as suspension chatter. */
  detailAmplitude: number;
  style: 'ledges' | 'terraces' | 'dunes' | 'ruts';
};

export type SoilConfig = {
  id: SoilId;
  label: string;
  english: string;
  desc: string;
  effect: string;
  tip: string;
  physics: TerrainPhysics;
  visual: TerrainVisual;
  height: TerrainHeightProfile;
};

const BASE_TEXTURE_PATH = '/assets/lessons/topic04/trafficability-drive/textures';

export const SOIL_CONFIGS: Record<SoilId, SoilConfig> = {
  hard: {
    id: 'hard',
    label: 'אדמה סלעית קשה',
    english: 'למשל: סלעי גיר, דולומיט או בזלת',
    desc: 'קרקע חזקה ויציבה שיוצרת נוף תלול ומחוספס. תמצאו בה מצוקים, "מדרגות" אבן טבעיות, ו"טרשים" (סלעים חדים שבולטים מהאדמה).',
    effect: 'היתרון: האדמה יציבה ולכן רכבים לא ישקעו בה. החיסרון: סלעים חדים עלולים לקרוע צמיגים ואפילו שרשראות של טנקים, ומצוקים גבוהים פשוט יחסמו לכם את הדרך.',
    tip: 'באזורים שמלאים בסלעים בולטים, מומלץ לנוע רק ברגל. רכבים יצטרכו לחפש מסלול עוקף, או לחכות שדחפורים של חיל ההנדסה יפנו להם את הדרך.',
    physics: {
      traction: 0.92,
      rollingResistance: 0.06,
      sinkRate: 0,
      stuckDepth: 1,
      antiSinkSpeed: 0,
      bumpiness: 1.6,
      topSpeedFactor: 1.0,
    },
    visual: {
      textureDir: `${BASE_TEXTURE_PATH}/hard`,
      repeat: 9,
      fog: '#cfc3ac',
      sky: '#cbd9df',
      ambient: '#8a8f78',
      sun: '#fff3d6',
    },
    height: { macroAmplitude: 1.4, macroFrequency: 0.09, detailAmplitude: 0.16, style: 'ledges' },
  },
  soft: {
    id: 'soft',
    label: 'אדמה סלעית רכה',
    english: 'למשל: סלעי קירטון או אדמת חרסית',
    desc: 'סלע חלש שמתפורר בקלות ויוצר נוף של גבעות עגולות ומתונות. קל מאוד לחפור בו ולשנות אותו, ולכן הרבה פעמים תראו באזורים האלה "טראסות" (מדרגות חקלאיות שנחצבו בהר).',
    effect: 'שטח שנוח מאוד למעבר. האדמה הרכה מאפשרת לפלס דרכים בקלות, לחפור עמדות מסתור מתחת לאדמה ולבנות חומות עפר להגנה.',
    tip: 'גן עדן לחיל ההנדסה: בולדוזרים (דחפורים כבדים) יכולים פשוט "לחתוך" את הגבעות ולפרוץ מסלולי נסיעה חדשים לגמרי תוך שעות בודדות.',
    physics: {
      traction: 0.88,
      rollingResistance: 0.1,
      sinkRate: 0.03,
      stuckDepth: 1,
      antiSinkSpeed: 1.5,
      bumpiness: 0.7,
      topSpeedFactor: 1.0,
    },
    visual: {
      textureDir: `${BASE_TEXTURE_PATH}/soft`,
      repeat: 8,
      fog: '#e2d3b0',
      sky: '#dce6d8',
      ambient: '#a79a72',
      sun: '#fff6df',
    },
    height: { macroAmplitude: 0.9, macroFrequency: 0.06, detailAmplitude: 0.07, style: 'terraces' },
  },
  sand: {
    id: 'sand',
    label: 'חול ודיונות',
    english: 'Sand & Dunes',
    desc: 'חול יבש גורם לגלגלים להחליק, "לפרפר" במקום ולאבד אחיזה. חול רטוב ליד הים מסוכן אפילו יותר – ברגע שתעצרו עליו עם רכב, הוא עלול לשקוע פנימה מיד.',
    effect: 'רכבים רגילים פשוט ישקעו כאן. טנקים יצליחו לעבור, אבל כל עצירה מסכנת אותם. הטיפ לנהיגת טנק על חוף הים: סעו כך שזחל (שרשרת) אחד יהיה בתוך המים והשני על החול הרטוב, כדי לאזן ולמנוע שקיעה.',
    tip: 'החוק הכי חשוב: לא לעצור לרגע! חייבים לשמור על נסיעה רציפה. לפני שנכנסים לשטח כזה, חובה לבדוק במפות מיוחדות איפה החול ספוג במים ואיפה בטוח לנסוע.',
    physics: {
      traction: 0.55,
      rollingResistance: 0.22,
      sinkRate: 0.09,
      stuckDepth: 1,
      antiSinkSpeed: 3.2,
      bumpiness: 0.5,
      topSpeedFactor: 0.92,
    },
    visual: {
      textureDir: `${BASE_TEXTURE_PATH}/sand`,
      repeat: 10,
      fog: '#e8d9b2',
      sky: '#bcdcec',
      ambient: '#c2ab7c',
      sun: '#fff8e0',
    },
    height: { macroAmplitude: 1.1, macroFrequency: 0.045, detailAmplitude: 0.05, style: 'dunes' },
  },
  mud: {
    id: 'mud',
    label: 'אדמה בוצית / אדמת לס',
    english: 'Saturated / Loess',
    desc: 'אדמה שספגה המון מים (אחרי גשם חזק). היא הופכת לחלשה ולא מסוגלת להחזיק עליה משקל. רכבים משוריינים כבדים (רק"ם), משאיות ותותחים פשוט ירסקו אותה וישקעו עמוק בבוץ.',
    effect: 'אחרי גשם, שביל עפר שהיה נוח אתמול הופך למלכודת טובענית. טנקים שוקעים, גלגלים מסתחררים ומפרפרים במקום, ומשאיות האספקה פשוט נתקעות הרחק מאחור.',
    tip: 'ההמלצה: חובה לחכות יום-יומיים אחרי סערה כדי שהאדמה תתייבש קצת, לפני שמכניסים אליה רכבים כבדים. אם המשימה דחופה, חייבים למצוא מסלול חלופי שעובר על כביש סלול או על אדמה סלעית קשה.',
    physics: {
      traction: 0.4,
      rollingResistance: 0.3,
      sinkRate: 0.16,
      stuckDepth: 1,
      antiSinkSpeed: 3.8,
      bumpiness: 0.55,
      topSpeedFactor: 0.85,
    },
    visual: {
      textureDir: `${BASE_TEXTURE_PATH}/mud`,
      repeat: 7,
      fog: '#9aa08c',
      sky: '#a9b3a2',
      ambient: '#6c705a',
      sun: '#e9e6cf',
    },
    height: { macroAmplitude: 0.35, macroFrequency: 0.05, detailAmplitude: 0.06, style: 'ruts' },
  },
};

export const SOIL_ORDER: SoilId[] = ['hard', 'soft', 'sand', 'mud'];

/** Shared playable tile half-size (m) — same for every terrain so runs are comparable. */
export const TILE_HALF_SIZE = 22;
/** Radius (m) around spawn kept gentle/similar across terrains before unique features ramp in. */
export const CALM_START_RADIUS = 7;
export const CALM_BLEND_RADIUS = 15;
