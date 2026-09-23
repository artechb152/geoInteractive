// The full tactical scenario: stages, routes, zones, sight lines, markers and the
// stage-driven overlay visibility logic. This is the single source of mission data.

import { getHeight } from "./terrain";
import { ROUTE_COLORS } from "./style";
import type {
  CameraMode,
  CameraPose,
  DangerZone,
  ElementId,
  LayerState,
  MapLabel,
  MissionStage,
  IntelAction,
  KeyConcept,
  RevealState,
  RouteDef,
  RouteId,
  SightLine,
  SituationId,
  SituationModifier,
  StageGuide,
  StageInfo,
  TacticalElement,
  UnitMarker,
  Vec2,
  VisibilityState,
} from "./types";

export const STAGE_ORDER: MissionStage[] = [
  "brief",
  "highground",
  "movement",
  "overwatch",
  "chokepoint",
  "decision",
  "debrief",
];

export const STAGES: Record<MissionStage, StageInfo> = {
  brief: {
    id: "brief",
    index: 1,
    title: "תדריך משימה",
    subtitle: "מבצע חציית עמק",
    body: "הכוח הידידותי נדרש להגיע אל יעד בכפר שממוקם מעבר לעמק. הציר הישיר דרך העמק הוא המהיר ביותר, אך הוא חשוף לתצפית אויב מהרכס המזרחי. עליך לנתח את השטח, לזהות שטחים שולטים, אזורי חשיפה וצווארי בקבוק, ולבחור את ציר התנועה המתאים ביותר.",
    focus: null,
    cameraMode: "strategic",
  },
  highground: {
    id: "highground",
    index: 2,
    title: "ניתוח שטח שולט",
    subtitle: "גבעת תצפית מערבית",
    body: "השטח השולט מאפשר תצפית רחבה על העמק, הגשר והכפר. שליטה בנקודת גובה יכולה לספק התרעה מוקדמת, הבנת תמונת שטח טובה יותר ויתרון לפני תנועה בשטח חשוף.",
    focus: "western-hill",
    cameraMode: "highground",
  },
  movement: {
    id: "movement",
    index: 3,
    title: "ניתוח ציר תנועה",
    subtitle: "ציר העמק המרכזי",
    body: "ציר התנועה בעמק מאפשר תנועה מהירה, אך הוא עובר בשטח נמוך וחשוף. כוח שנע בעמק עלול להיות נצפה מהרכס ולסבול מחוסר אפשרויות תמרון.",
    focus: "valley-road",
    cameraMode: "soldier",
  },
  overwatch: {
    id: "overwatch",
    index: 4,
    title: "תצפית אויב",
    subtitle: "הרכס המזרחי",
    body: "רכס האויב שולט בתצפית על ציר העמק והגשר. המשמעות היא שהאויב יכול לזהות תנועה, לעקוב אחריה, ולהשפיע על המעבר בנקודות קריטיות.",
    focus: "enemy-ridge",
    cameraMode: "overwatch",
  },
  chokepoint: {
    id: "chokepoint",
    index: 5,
    title: "ניתוח צוואר בקבוק",
    subtitle: "מעבר הגשר",
    body: "הגשר והמעבר הצר יוצרים צוואר בקבוק. כאשר כל הכוח נדרש לעבור דרך נקודה אחת, חופש התמרון מצטמצם והסיכון למארב או חסימה עולה.",
    focus: "bridge",
    cameraMode: "chokepoint",
  },
  decision: {
    id: "decision",
    index: 6,
    title: "בחירת ציר",
    subtitle: "בחר דרך פעולה",
    body: "בחר את ציר התנועה המתאים ביותר על בסיס הניתוח שביצעת: מהירות, חשיפה, שליטה טקטית וסיכון בצוואר הבקבוק.",
    focus: null,
    cameraMode: "route",
  },
  debrief: {
    id: "debrief",
    index: 7,
    title: "סיכום ביצוע",
    subtitle: "הערכת הציר שנבחר",
    body: "סקור את התוצאה המוערכת של ציר התנועה שבחרת.",
    focus: null,
    cameraMode: "strategic",
  },
};

/** Structured guided explanation per stage (מה רואים / למה חשוב / מה לשים לב). */
export const STAGE_GUIDE: Record<MissionStage, StageGuide> = {
  brief: {
    see: "הכוח הידידותי נמצא בצד המערבי של השטח ונדרש להגיע אל הכפר שבצד המזרחי.",
    why: "הציר הישיר נראה פשוט ומהיר, אבל השטח בדרך כולל אזורי חשיפה, גשר צר ורכס אויב שיכול לשלוט בתצפית.",
    watch: "בדוק איפה יש גובה, איפה התנועה מוגבלת, ואיפה הכוח עלול להיות חשוף.",
  },
  highground: {
    see: "נקודת הגובה המערבית מסומנת וממנה נפתחים קווי ראייה לעמק, לגשר ולכפר.",
    why: "שטח שולט מאפשר להבין את תמונת השטח לפני שמכניסים כוח לאזור מסוכן.",
    watch: "שים לב כמה אזורים אפשר לראות מהגובה לעומת מה שנראה מתוך העמק.",
  },
  movement: {
    see: "ציר העמק מסומן בצהוב והכוח הידידותי יכול לנוע דרכו לכיוון הגשר והכפר.",
    why: "ציר תנועה מהיר אינו תמיד ציר בטוח. כאשר הוא עובר בשטח נמוך ופתוח, הכוח עלול להיות חשוף.",
    watch: "בדוק האם הציר עובר תחת רכס אויב, האם יש מחסה, והאם קיימות אפשרויות עקיפה.",
  },
  overwatch: {
    see: "כוחות אויב ממוקמים על הרכס המזרחי, וקווי הראייה שלהם מכסים את העמק והגשר.",
    why: "כוח שנע תחת תצפית אויב עלול להתגלות מוקדם ולאבד את יתרון ההפתעה.",
    watch: "שים לב אילו אזורים גלויים לאויב ואילו אזורים מוסתרים ממנו.",
  },
  chokepoint: {
    see: "הגשר והמעבר הצר מסומנים כאזור שבו כל הכוח חייב לעבור דרך נקודה אחת.",
    why: "צוואר בקבוק מצמצם את חופש התמרון. אם המעבר נחסם או נצפה על ידי האויב, כל התנועה עלולה להיעצר.",
    watch: "בדוק האם יש דרך לעקוף, האם כדאי לתפוס גובה קודם, והאם המעבר נמצא תחת תצפית.",
  },
  decision: {
    see: "עליך לבחור כיצד הכוח ינוע אל היעד: דרך העמק, דרך תפיסת שטח שולט תחילה, או דרך מעבר צדדי.",
    why: "הבחירה משפיעה על מהירות, רמת סיכון, חשיפה לאויב ויתרון טקטי.",
    watch: "אל תבחר רק לפי הדרך הקצרה. בדוק גם חשיפה, שליטה בגובה וצווארי בקבוק.",
  },
  debrief: {
    see: "הסימולטור מציג את הציר שבחרת ואת ההערכה הטקטית של ההחלטה.",
    why: "הסיכום עוזר להבין את המחיר והיתרון של ההחלטה שביצעת.",
    watch: "השווה בין מהירות, סיכון, חשיפה ויתרון טקטי.",
  },
};

/** Key tactical concepts (clickable glossary in the side panel). */
export const KEY_CONCEPTS: KeyConcept[] = [
  {
    id: "high-ground",
    term: "שטח שולט",
    text: "נקודת גובה או אזור שמאפשר לראות ולהשפיע על שטח נמוך יותר.",
  },
  {
    id: "observation",
    term: "תצפית",
    text: "היכולת לראות אזור מסוים, לזהות תנועה ולהבין מה מתרחש בו.",
  },
  {
    id: "exposure",
    term: "חשיפה",
    text: "מצב שבו כוח נע באזור שניתן לראות אותו בקלות, ולכן הוא נמצא בסיכון גבוה יותר.",
  },
  {
    id: "choke",
    term: "צוואר בקבוק",
    text: "מעבר צר שמכריח כוח לעבור דרך נקודה מוגבלת, ולכן מקטין את חופש התמרון.",
  },
  {
    id: "axis",
    term: "ציר תנועה",
    text: "הדרך שבה הכוח בוחר לנוע מנקודת הפתיחה אל היעד.",
  },
];

/** Infantry squad positions (planar; lifted onto terrain at render time). */
export const FRIENDLY_SQUAD: Vec2[] = [
  [-97, -3],
  [-97, 3],
  [-93, -5],
  [-93, 5],
  [-90, 0],
];

export const ENEMY_SQUAD: Vec2[] = [
  [78, -20],
  [80, 5],
  [76, 28],
  [79, -4],
];

/** Compressed friendly cluster shown at the bridge during the choke-point stage. */
export const CHOKE_CLUSTER: Vec2[] = [
  [3, -2.5],
  [1, 2],
  [5, 0],
];

/** Civilian idle positions near the village (planar; lifted at render). */
export const CIVILIANS: Vec2[] = [
  [54, 12],
  [60, 5],
  [62, 13],
  [56, 3],
  [64, 9],
];

/** Number of intelligence actions the player may spend before deciding. */
export const INTEL_BUDGET = 3;

/** The intelligence-gathering actions. Each reveals overlays + adds a finding. */
export const INTEL_ACTIONS: IntelAction[] = [
  {
    id: "hill",
    label: "שלח תצפית לגבעה",
    finding: "התצפית מהגבעה חושפת שהעמק פתוח כמעט לכל אורכו.",
  },
  {
    id: "ridge",
    label: "סרוק את רכס האויב",
    finding: "הרכס המזרחי שולט בעיקר על הגשר ועל הציר המרכזי.",
  },
  {
    id: "side",
    label: "בדוק את המעבר הצדדי",
    finding: "המעבר הצדדי ארוך יותר, אך חלקו מוסתר מהרכס.",
  },
  {
    id: "civilians",
    label: "תשאל אזרחים בכפר",
    finding: "אזרחים בכפר מדווחים על תנועה חשודה ליד הגשר.",
  },
  {
    id: "bridge",
    label: "בדוק את הגשר",
    finding: "הגשר יוצר נקודת מעבר צרה שמגבילה תמרון.",
  },
];

/** Random per-run situation modifiers (chosen at mission start). */
export const SITUATIONS: Record<SituationId, SituationModifier> = {
  civilians: {
    id: "civilians",
    label: "תנועה אזרחית בכפר",
    text: "ניכרת תנועת אזרחים סביב הכפר. יש לנקוט זהירות בהתקרבות הסופית ליעד.",
  },
  lowvis: {
    id: "lowvis",
    label: "ראות מוגבלת",
    text: "האזור מכוסה באובך קל. חלק מקווי הראייה אינם ודאיים עד לביצוע תצפית.",
  },
  unverified: {
    id: "unverified",
    label: "דיווח לא מאומת",
    text: "התקבל דיווח לא מאומת על נוכחות אויב אפשרית ליד הגשר. נדרש אימות באמצעות סיור.",
  },
  timepressure: {
    id: "timepressure",
    label: "לחץ זמן",
    text: "חלון הזמן למשימה צר. מהירות ציר התנועה משמעותית יותר בהערכה הסופית.",
  },
  quietridge: {
    id: "quietridge",
    label: "רכס שקט",
    text: "רכס האויב נראה שקט בתחילה. סריקה עשויה לחשוף חוליות תצפית נסתרות.",
  },
};

export const SITUATION_IDS: SituationId[] = [
  "civilians",
  "lowvis",
  "unverified",
  "timepressure",
  "quietridge",
];

export const ROUTES: RouteDef[] = [
  {
    id: "valley",
    label: "ציר א",
    shortLabel: "ציר העמק",
    color: ROUTE_COLORS.valley,
    waypoints: [
      [-95, 0],
      [-70, 2],
      [-45, 1],
      [-20, 0],
      [0, 0],
      [12, 0],
      [28, 2],
      [45, 5],
      [58, 8],
    ],
    description: "ציר קצר וישיר דרך העמק והגשר.",
    known: "מהיר, ברור, מתאים לתנועה ישירה.",
    unknown: "רמת החשיפה המדויקת תלויה בתצפית מהרכס.",
    evaluation: {
      risk: "גבוה",
      speed: "מהיר",
      advantage: "נמוך",
      score: 45,
      feedback:
        "הציר המהיר ביותר, אך גם החשוף ביותר. התנועה בעמק ובמעבר הגשר נמצאת תחת תצפית אויב מהרכס, ולכן הסיכון המבצעי גבוה.",
    },
    metrics: { visibility: 25, exposure: 90, speed: 90, advantage: 25, chokeRisk: 90 },
    interactions: [
      "חוצה את קרקעית העמק הפתוחה.",
      "נע ישירות תחת הרכס של האויב.",
      "מתועל דרך צוואר הבקבוק בגשר.",
    ],
    recommendation:
      "אינו מומלץ אלא אם המהירות חשובה יותר מהישרדות.",
  },
  {
    id: "highground",
    label: "ציר ב",
    shortLabel: "תפיסת שטח שולט תחילה",
    color: ROUTE_COLORS.highground,
    waypoints: [
      [-95, 0],
      [-82, -6],
      [-72, -6],
      [-58, -2],
      [-40, -4],
      [-18, -2],
      [0, 0],
      [12, 0],
      [30, 3],
      [45, 6],
      [58, 8],
    ],
    description: "עלייה לנקודת גובה לפני המשך התנועה.",
    known: "מאפשרת תצפית טובה יותר לפני חצייה.",
    unknown: "עלולה לעכב את ההגעה ליעד ולחשוף את הכוח בזמן העלייה.",
    evaluation: {
      risk: "בינוני-נמוך",
      speed: "בינוני",
      advantage: "גבוה",
      score: 85,
      feedback:
        "ציר איטי יותר, אך חזק טקטית. תפיסת השטח השולט לפני החצייה מאפשרת תצפית, הבנת מצב טובה יותר וצמצום חשיפה מיותרת.",
    },
    metrics: { visibility: 90, exposure: 40, speed: 55, advantage: 90, chokeRisk: 55 },
    interactions: [
      "תופס תחילה את גבעת התצפית המערבית.",
      "מכסה את העמק ואת החצייה בתצפית.",
      "חוצה את הגשר תחת הגנה.",
    ],
    recommendation: "מומלץ לשליטה טקטית מאוזנת.",
  },
  {
    id: "sidepassage",
    label: "ציר ג",
    shortLabel: "מעבר צדדי",
    color: ROUTE_COLORS.sidepassage,
    waypoints: [
      [-95, 0],
      [-78, -18],
      [-55, -38],
      [-30, -50],
      [-5, -56],
      [8, -52],
      [22, -40],
      [38, -22],
      [50, -4],
      [58, 8],
    ],
    description: "עקיפה דרך מעבר צדדי ארוך יותר.",
    known: "עשוי להימנע מחלק מהעמק והגשר.",
    unknown: "השטח פחות מוכר, והזמן הנדרש גבוה יותר.",
    evaluation: {
      risk: "בינוני",
      speed: "איטי",
      advantage: "בינוני",
      score: 70,
      feedback:
        "ציר שעוקף חלק מאזורי הסיכון המרכזיים, אך הוא ארוך יותר ופחות ודאי. מתאים כאשר רוצים להימנע מהציר הראשי ומהגשר החשוף.",
    },
    metrics: { visibility: 55, exposure: 45, speed: 35, advantage: 60, chokeRisk: 30 },
    interactions: [
      "עוקף מצפון את קרקעית העמק החשופה.",
      "חוצה את הנהר במעבר מים רדוד.",
      "נשאר במחסה מרכס האויב לאורך רוב הדרך.",
    ],
    recommendation:
      "אפשרות חלופית כאשר העדיפות היא להימנע מתצפית האויב.",
  },
];

export const ROUTE_MAP: Record<RouteId, RouteDef> = {
  valley: ROUTES[0],
  highground: ROUTES[1],
  sidepassage: ROUTES[2],
};

/** Physical dirt road (the constructed road through the valley and over the bridge). */
export const ROAD_PATH: Vec2[] = [
  [-92, 0],
  [-60, 1],
  [-30, 0],
  [-6, 0],
  [12, 0],
  [30, 2],
  [46, 5],
  [58, 8],
];

export const DANGER_ZONES: DangerZone[] = [
  { id: "dz-valley", position: [2, 2], radius: 24, label: "עמק חשוף", level: "high" },
  { id: "dz-bridge", position: [12, 0], radius: 13, label: "צוואר בקבוק בגשר", level: "extreme" },
  { id: "dz-approach", position: [42, 4], radius: 18, label: "אזור קטילה מהרכס", level: "high" },
  { id: "dz-side", position: [4, -52], radius: 13, label: "מעבר מים", level: "moderate" },
];

export const SIGHT_LINES: SightLine[] = [
  { id: "los-e2-valley", kind: "enemy", from: [80, 5], to: [2, 2] },
  { id: "los-e2-bridge", kind: "enemy", from: [80, 5], to: [12, 0] },
  { id: "los-e1-approach", kind: "enemy", from: [78, -20], to: [42, 4] },
  { id: "los-e3-village", kind: "enemy", from: [76, 28], to: [58, 8] },
  { id: "los-op-valley", kind: "friendly", from: [-72, -6], to: [2, 2] },
  { id: "los-op-bridge", kind: "friendly", from: [-72, -6], to: [12, 0] },
  { id: "los-op-village", kind: "friendly", from: [-72, -6], to: [58, 8] },
];

export const UNIT_MARKERS: UnitMarker[] = [
  { id: "friendly", faction: "friendly", position: [-95, 0], label: "כוח ידידותי" },
  { id: "obs", faction: "observation", position: [-72, -6], label: "נקודת תצפית" },
  { id: "enemy-1", faction: "enemy", position: [78, -20], label: "תצפית אויב" },
  { id: "enemy-2", faction: "enemy", position: [80, 5], label: "עמדת אויב" },
  { id: "enemy-3", faction: "enemy", position: [76, 28], label: "תצפית אויב" },
];

export const ELEMENTS: TacticalElement[] = [
  {
    id: "western-hill",
    name: "גבעה מערבית — שטח שולט",
    kind: "friendly",
    position: [-72, -6],
    radius: 28,
    role: "יתרון תצפית",
    summary: "נקודת תצפית שולטת על ציר ההתקרבות המערבי.",
    details: [
      "השטח הגבוה ביותר בצד הידידותי של העמק.",
      "מאפשר תצפית על העמק, הגשר והכפר.",
      "תפיסתו תחילה מבטיחה תצפית לפני החצייה.",
      "איטי יותר לטיפוס, אך מצמצם משמעותית את סיכון התנועה.",
    ],
  },
  {
    id: "valley-road",
    name: "ציר העמק",
    kind: "neutral",
    position: [-6, 0],
    radius: 26,
    role: "שטח נמוך וחשוף",
    summary: "ציר מרכזי מהיר אך חשוף.",
    details: [
      "הציר הישיר ביותר אל היעד.",
      "עובר בשטח נמוך ופתוח.",
      "חשוף לתצפית ולאש משני הרכסים.",
      "מציע מהירות במחיר חוסר מחסה והסתרה.",
    ],
  },
  {
    id: "bridge",
    name: "גשר הנהר — צוואר בקבוק",
    kind: "neutral",
    position: [12, 0],
    radius: 13,
    role: "צוואר בקבוק",
    summary: "המעבר היחיד מעל הנהר; מתעל את התנועה.",
    details: [
      "המעבר היחיד מעל מכשול הנהר.",
      "מתעל את הכוח לנקודה צרה אחת.",
      "אין מרחב תמרון בעת מגע.",
      "אזור התעניינות סביר של האויב.",
    ],
  },
  {
    id: "enemy-ridge",
    name: "רכס מזרחי — בשליטת אויב",
    kind: "enemy",
    position: [78, 0],
    radius: 30,
    role: "תצפית אויב",
    summary: "תצפית אויב השולטת בעמק.",
    details: [
      "מאויש על ידי גורמי תצפית של האויב.",
      "שולט בעמק, בציר ובגשר.",
      "מספק שדות תצפית ואש ארוכים.",
      "יש לנטרל או לעקוף כדי לצמצם סיכון.",
    ],
  },
  {
    id: "village",
    name: "כפר — היעד",
    kind: "objective",
    position: [58, 8],
    radius: 18,
    role: "יעד / מחסה",
    summary: "יעד המשימה במזרח; המבנים מספקים מחסה.",
    details: [
      "יעד התנועה הסופי.",
      "ממוקם למרגלות רכס האויב.",
      "צירי ההתקרבות נצפים מהשטח השולט.",
      "השתלטות עליו משלימה את המשימה.",
    ],
  },
  {
    id: "side-passage",
    name: "מעבר צדדי",
    kind: "neutral",
    position: [-22, -48],
    radius: 30,
    role: "ציר חלופי",
    summary: "עקיפה צפונית מוסתרת; איטית יותר.",
    details: [
      "עוקף מצפון את קרקעית העמק החשופה.",
      "נמנע מצוואר הבקבוק בגשר דרך מעבר מים.",
      "נשאר במחסה מרכס האויב לאורך רוב הדרך.",
      "ארוך ואיטי יותר, עם שטח פחות ודאי.",
    ],
  },
];

export const ELEMENT_MAP: Record<ElementId, TacticalElement> = ELEMENTS.reduce(
  (acc, el) => {
    acc[el.id] = el;
    return acc;
  },
  {} as Record<ElementId, TacticalElement>
);

export const MAP_LABELS: MapLabel[] = [
  { id: "lbl-hill", text: "גבעה מערבית", position: [-72, -6], kind: "terrain" },
  { id: "lbl-valley", text: "עמק מרכזי", position: [6, -4], kind: "terrain" },
  { id: "lbl-river", text: "נהר", position: [16, -34], kind: "terrain" },
  { id: "lbl-bridge", text: "גשר", position: [12, 0], kind: "structure" },
  { id: "lbl-ridge", text: "רכס מזרחי", position: [78, 0], kind: "enemy" },
  { id: "lbl-village", text: "כפר · יעד", position: [58, 8], kind: "objective" },
  { id: "lbl-side", text: "מעבר צדדי", position: [-24, -46], kind: "route" },
];

/** Which map labels to show per stage — kept minimal so floating labels never
 *  clutter the view or collide with the squad / observation / zone labels.
 *  (The hill is named by the observation marker, the ridge by the enemy squad,
 *  and the bridge by its choke-point zone, so those map labels are omitted.) */
export const STAGE_MAP_LABELS: Record<MissionStage, string[]> = {
  brief: ["lbl-village", "lbl-bridge"],
  highground: ["lbl-valley", "lbl-bridge", "lbl-village"],
  movement: ["lbl-valley", "lbl-river", "lbl-bridge", "lbl-village"],
  overwatch: ["lbl-valley", "lbl-bridge"],
  chokepoint: [],
  decision: ["lbl-bridge", "lbl-village", "lbl-side"],
  debrief: ["lbl-bridge", "lbl-village"],
};

/** Static, hand-tuned cinematic camera poses (route is computed at runtime).
 *  Every pose sits above the terrain and looks slightly down at a sensible focus
 *  so transitions never end on a disorienting or buried angle. */
export const CAMERA_POSES: Record<Exclude<CameraMode, "route">, CameraPose> = {
  // High 3/4 overview of the whole area of operations.
  strategic: { position: [122, 116, 172], target: [2, 4, 0] },
  // Ground level at the western edge of the valley, looking east down the road.
  soldier: { position: [-30, getHeight(-30, 0) + 3.5, 3], target: [22, 2.5, -1] },
  // On/above the western observation hill, looking east across the valley.
  highground: { position: [-82, getHeight(-72, -6) + 12, -4], target: [28, 3, 4] },
  // On the enemy ridge, looking west and down onto the valley and bridge.
  overwatch: { position: [88, getHeight(82, 2) + 12, 6], target: [8, 2, 1] },
  // Three-quarter framing of the bridge crossing and the river choke.
  chokepoint: { position: [-6, 13, 22], target: [12, 4.5, 0] },
};

/** Camera-view metadata: label, button glyph, and what each view teaches. */
export const CAMERA_VIEWS: Record<
  CameraMode,
  { label: string; short: string; icon: string; teach: string }
> = {
  strategic: {
    label: "מבט אסטרטגי",
    short: "אסטרטגי",
    icon: "▦",
    teach: "מבט-על על כלל אזור הפעילות.",
  },
  soldier: {
    label: "מבט לוחם",
    short: "מבט לוחם",
    icon: "▼",
    teach: "גובה הקרקע — תחושת החשיפה של הכוח בעמק.",
  },
  highground: {
    label: "מבט משטח שולט",
    short: "שטח שולט",
    icon: "▲",
    teach: "מהגבעה המערבית — מדוע שטח שולט חשוב.",
  },
  overwatch: {
    label: "מבט תצפית אויב",
    short: "תצפית אויב",
    icon: "◎",
    teach: "נקודת מבט האויב מהרכס המזרחי.",
  },
  chokepoint: {
    label: "מבט צוואר בקבוק",
    short: "צוואר בקבוק",
    icon: "⌒",
    teach: "הגשר — מעבר היחיד מעל הנהר.",
  },
  route: {
    label: "תצוגת ציר",
    short: "תצוגת ציר",
    icon: "➔",
    teach: "ממסגר את ציר התנועה הנבחר.",
  },
};

type RouteSpec = "all" | "selected" | "none" | RouteId[];
type IdSpec = "all" | "none" | string[];

interface StageOverlay {
  routes: RouteSpec;
  exposure: IdSpec;
  enemyLOS: IdSpec;
  friendlyLOS: IdSpec;
  enemyMarkers: boolean;
  friendlyMarker: boolean;
  observationMarker: boolean;
}

/** Which overlays are relevant at each stage. Stage-SPECIFIC (not cumulative)
 *  so the user only sees what matters at each step and the scene stays uncluttered.
 *  Layer toggles can still hide any of these on top of the stage logic. */
export const STAGE_OVERLAYS: Record<MissionStage, StageOverlay> = {
  brief: {
    routes: "none",
    exposure: "none",
    enemyLOS: "none",
    friendlyLOS: "none",
    enemyMarkers: true,
    friendlyMarker: true,
    observationMarker: false,
  },
  highground: {
    routes: "none",
    exposure: "none",
    enemyLOS: "none",
    friendlyLOS: "all",
    enemyMarkers: false,
    friendlyMarker: true,
    observationMarker: true,
  },
  movement: {
    routes: ["valley"],
    exposure: ["dz-valley", "dz-bridge", "dz-approach"],
    enemyLOS: "none",
    friendlyLOS: "none",
    enemyMarkers: false,
    friendlyMarker: true,
    observationMarker: false,
  },
  overwatch: {
    routes: "none",
    exposure: "none",
    enemyLOS: "all",
    friendlyLOS: "none",
    enemyMarkers: true,
    friendlyMarker: false,
    observationMarker: false,
  },
  chokepoint: {
    routes: "none",
    exposure: ["dz-bridge"],
    enemyLOS: ["los-e2-bridge"],
    friendlyLOS: "none",
    enemyMarkers: true,
    friendlyMarker: false,
    observationMarker: false,
  },
  decision: {
    routes: "all",
    exposure: "all",
    enemyLOS: "all",
    friendlyLOS: "all",
    enemyMarkers: true,
    friendlyMarker: true,
    observationMarker: true,
  },
  debrief: {
    routes: "selected",
    exposure: "all",
    enemyLOS: "all",
    friendlyLOS: "all",
    enemyMarkers: true,
    friendlyMarker: true,
    observationMarker: true,
  },
};

const ALL_ROUTE_IDS: RouteId[] = ["valley", "highground", "sidepassage"];

const ZONE_BY_REVEAL: Record<string, keyof RevealState> = {
  "dz-valley": "valleyZone",
  "dz-bridge": "bridgeZone",
  "dz-approach": "approachZone",
  "dz-side": "sideZone",
};

/** Resolve which overlays should be visible. Forces/routes/markers are stage-driven;
 *  line-of-sight and exposure zones are INTEL — hidden until revealed by scouting
 *  (everything is revealed at the debrief). Everything is also gated by the layer
 *  toggles. */
export function getVisibility(args: {
  stage: MissionStage;
  layers: LayerState;
  selectedRoute: RouteId | null;
  selectedElement: ElementId | null;
  reveals: RevealState;
}): VisibilityState {
  const { stage, layers, selectedRoute, selectedElement, reveals } = args;
  const cfg = STAGE_OVERLAYS[stage];
  const revealAll = stage === "debrief";

  let routeIds: RouteId[] = [];
  if (layers.routes) {
    if (cfg.routes === "all") routeIds = ALL_ROUTE_IDS;
    else if (cfg.routes === "selected")
      routeIds = selectedRoute ? [selectedRoute] : [];
    else if (cfg.routes === "none") routeIds = [];
    else routeIds = cfg.routes;
  }

  const exposureZoneIds = layers.dangerZones
    ? DANGER_ZONES.filter(
        (z) => revealAll || reveals[ZONE_BY_REVEAL[z.id]]
      ).map((z) => z.id)
    : [];

  const enemyLineIds = SIGHT_LINES.filter((l) => l.kind === "enemy").map((l) => l.id);
  const friendlyLineIds = SIGHT_LINES.filter((l) => l.kind === "friendly").map(
    (l) => l.id
  );

  return {
    routeIds,
    exposureZoneIds,
    enemyLOSIds:
      layers.lineOfSight && (revealAll || reveals.enemyLOS) ? enemyLineIds : [],
    friendlyLOSIds:
      layers.lineOfSight && (revealAll || reveals.friendlyLOS)
        ? friendlyLineIds
        : [],
    enemyMarkers: layers.unitMarkers && cfg.enemyMarkers,
    friendlyMarker: layers.unitMarkers && cfg.friendlyMarker,
    observationMarker: layers.unitMarkers && cfg.observationMarker,
    labels: layers.labels,
    highlightElement: selectedElement ?? STAGES[stage].focus,
  };
}
