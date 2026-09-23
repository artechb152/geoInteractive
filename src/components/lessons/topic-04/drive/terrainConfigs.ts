/**
 * Terrain data for the trafficability driving lab (`/lab/trafficability-drive`).
 *
 * Soil ids and Hebrew copy are duplicated verbatim from `SOILS` in
 * ../TrafficabilityScene.tsx (which stays untouched until this lab is
 * reviewed and merged into the lesson) — see design/docs/assumptions.md.
 */

import type { TerrainMaterialProfile } from './terrainMaterial';

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
  /** Poster/thumb images for the picker + loading gate (not used by the 3D material). */
  textureDir: string;
  /** Layered ground material (soil / rock / moss / wet) — see terrainMaterial.ts. */
  material: TerrainMaterialProfile;
  /** Horizon haze: fog colour, sky-dome horizon and HorizonBackdrop base (see atmosphere.ts). */
  fog: string;
  /** Sky-dome zenith (sage family). */
  sky: string;
  /** Warm ground-bounce colour for the baked sky light. */
  ambient: string;
  /** Late-afternoon sunlight colour. Sun direction/intensity live in atmosphere.ts. */
  sun: string;
  /** Wheel kickup particles — off for hard rock (nothing to kick up). */
  kickup: { enabled: boolean; color: string; kind: 'dust' | 'splash' };
};

/** Terrain shape, layered large → medium → small (see landforms.ts). */
export type TerrainHeightProfile = {
  style: 'ledges' | 'terraces' | 'dunes' | 'ruts';
  /** Height scale (m) of the large landforms: knolls, basins, dune ridges, channels. */
  reliefAmplitude: number;
  /** Scale (m) of the style's medium structure: ledge / terrace step height, secondary dunes, hummocks. */
  mediumAmplitude: number;
  /** Small surface roughness (m), felt as suspension chatter. */
  detailAmplitude: number;
  /** Height (m) of the low hills on the visual-only apron just past the boundary stakes. */
  outerRelief: number;
  /** How the shared route (terrainRoute.ts) is cut into this ground. */
  route: {
    /** 0..1: how far the track bed is graded toward a smooth, level bed (1 = fully engineered road). */
    grade: number;
    /** Depth (m) of the twin wheel ruts. */
    rutDepth: number;
    /** Height (m) of the spoil berm along each track edge. */
    bermHeight: number;
  };
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
      // Terra rossa soil with pale limestone breaking through on ledge risers,
      // boulder crowns and a few outcrop clusters; sage scrub in the gaps.
      // Ground grain borrows the calm mud texture — the rock photo only shows where rock is exposed.
      material: {
        textures: {
          ground: { dir: `${BASE_TEXTURE_PATH}/mud`, scale: 3.2, contrast: 0.1, normalStrength: 0.55 },
          rock: { dir: `${BASE_TEXTURE_PATH}/hard`, scale: 4.8, contrast: 1, normalStrength: 1 },
        },
        palette: {
          soilLight: '#9c8469',
          soilDark: '#766350',
          soilAlt: '#957260',
          rockLight: '#c9bfad',
          rockDark: '#877d6e',
          moss: '#87915e',
          mossDark: '#5d6743',
        },
        soil: { variation: 0.35, altAmount: 0.45, ridgeLight: 0.25 },
        rock: { amount: 1, slope: [0.08, 0.24], ridge: 0.6, cluster: 0.9, clusterThreshold: 0.6, creviceMoss: 0.7 },
        moss: { amount: 0.5, hollowBias: 0.8, heightBias: 0 },
        wet: { amount: 0, darken: 1 },
        roughness: { soil: 0.96, rock: 0.84, moss: 0.92, wet: 0.4 },
      },
      fog: '#e8d7ba',
      sky: '#a9bbb3',
      ambient: '#9a8563',
      sun: '#ffd8a6',
      kickup: { enabled: false, color: '#9a8f78', kind: 'dust' },
    },
    height: {
      style: 'ledges',
      reliefAmplitude: 3,
      mediumAmplitude: 0.55,
      detailAmplitude: 0.07,
      outerRelief: 4.5,
      // A rough bulldozed trail: graded, but ledge steps still cross it.
      route: { grade: 0.75, rutDepth: 0.025, bermHeight: 0.14 },
    },
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
      // Pale chalky clay; chalk shows only on the steeper terrace risers,
      // grass patches settle on the flat treads.
      material: {
        textures: {
          ground: { dir: `${BASE_TEXTURE_PATH}/soft`, scale: 3.6, contrast: 0.14, normalStrength: 0.55 },
          rock: { dir: `${BASE_TEXTURE_PATH}/hard`, scale: 4.2, contrast: 0.6, normalStrength: 0.7 },
        },
        palette: {
          soilLight: '#b8a785',
          soilDark: '#978669',
          soilAlt: '#b09a77',
          rockLight: '#ddd4c2',
          rockDark: '#aea38f',
          moss: '#939a6b',
          mossDark: '#6f7a4f',
        },
        soil: { variation: 0.3, altAmount: 0.35, ridgeLight: 0.2 },
        rock: { amount: 0.75, slope: [0.1, 0.26], ridge: 0.25, cluster: 0.35, clusterThreshold: 0.66, creviceMoss: 0.3 },
        moss: { amount: 0.45, hollowBias: 0.5, heightBias: -0.2 },
        wet: { amount: 0, darken: 1 },
        roughness: { soil: 0.94, rock: 0.86, moss: 0.92, wet: 0.4 },
      },
      fog: '#ecdab6',
      sky: '#b0c1ab',
      ambient: '#a58d62',
      sun: '#ffd9a4',
      kickup: { enabled: true, color: '#c9b48a', kind: 'dust' },
    },
    height: {
      style: 'terraces',
      reliefAmplitude: 3.2,
      mediumAmplitude: 0.7,
      detailAmplitude: 0.035,
      outerRelief: 4,
      // Soft ground is easy to engineer: the road is cut cleanly through the hills.
      route: { grade: 0.92, rutDepth: 0.05, bermHeight: 0.16 },
    },
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
      // No exposed stone; lighter crests, warmer troughs, rare dry scrub in the low ground.
      material: {
        textures: {
          ground: { dir: `${BASE_TEXTURE_PATH}/sand`, scale: 4.5, contrast: 0.12, normalStrength: 0.7 },
        },
        palette: {
          soilLight: '#cfb88f',
          soilDark: '#b0956f',
          soilAlt: '#c6a67f',
          rockLight: '#cfb88f',
          rockDark: '#b0956f',
          moss: '#a09a6c',
          mossDark: '#7f7c57',
        },
        soil: { variation: 0.28, altAmount: 0.4, ridgeLight: 0.45 },
        rock: { amount: 0, slope: [1, 1], ridge: 0, cluster: 0, clusterThreshold: 1, creviceMoss: 0 },
        moss: { amount: 0.22, hollowBias: 0.8, heightBias: -0.8 },
        wet: { amount: 0, darken: 1 },
        roughness: { soil: 0.97, rock: 0.9, moss: 0.93, wet: 0.4 },
      },
      fog: '#efddb6',
      sky: '#adc2c0',
      ambient: '#bb9f70',
      sun: '#ffdcaa',
      kickup: { enabled: true, color: '#e3cd96', kind: 'dust' },
    },
    height: {
      style: 'dunes',
      reliefAmplitude: 2.4,
      mediumAmplitude: 0.3,
      detailAmplitude: 0.02,
      outerRelief: 3.5,
      // Just a vehicle track over the dunes: it mostly follows the ground.
      route: { grade: 0.45, rutDepth: 0.07, bermHeight: 0.08 },
    },
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
      // Saturated loess: glossy dark water in the puddles and ruts, grass
      // holding on the slightly higher, drier ground.
      material: {
        textures: {
          ground: { dir: `${BASE_TEXTURE_PATH}/mud`, scale: 3, contrast: 0.16, normalStrength: 0.8 },
        },
        palette: {
          soilLight: '#78634f',
          soilDark: '#4f4136',
          soilAlt: '#63523d',
          rockLight: '#78634f',
          rockDark: '#4f4136',
          moss: '#6e7a4e',
          mossDark: '#4f5a38',
        },
        soil: { variation: 0.3, altAmount: 0.35, ridgeLight: 0.15 },
        rock: { amount: 0, slope: [1, 1], ridge: 0, cluster: 0, clusterThreshold: 1, creviceMoss: 0 },
        moss: { amount: 0.5, hollowBias: -0.9, heightBias: 0.7 },
        wet: { amount: 0.9, darken: 0.55 },
        roughness: { soil: 0.85, rock: 0.8, moss: 0.9, wet: 0.28 },
      },
      fog: '#dad3bc',
      sky: '#a4b1a1',
      ambient: '#76705a',
      sun: '#f6d9b0',
      kickup: { enabled: true, color: '#3a3226', kind: 'splash' },
    },
    height: {
      style: 'ruts',
      reliefAmplitude: 1,
      mediumAmplitude: 0.14,
      detailAmplitude: 0.03,
      outerRelief: 1.6,
      // Dirt road churned into deep ruts; puddles sit on the track itself.
      route: { grade: 0.7, rutDepth: 0.12, bermHeight: 0.1 },
    },
  },
};

export const SOIL_ORDER: SoilId[] = ['hard', 'soft', 'sand', 'mud'];

/** Shared playable tile half-size (m) — same for every terrain so runs are comparable. */
export const TILE_HALF_SIZE = 22;
/** Radius (m) around spawn kept gentle/similar across terrains before unique features ramp in. */
export const CALM_START_RADIUS = 7;
export const CALM_BLEND_RADIUS = 15;
