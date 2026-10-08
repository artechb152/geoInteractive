// Learner-facing content of the scale scenes, in WGS84. Every coordinate names its source; every
// "shownOn" flag was checked on the generated rasters (scripts/maps/check-scale-sheets.mjs crops).
import type { LatLon } from './geo';
import type { SheetId } from './scaleSheets.data';

export type Landmark = LatLon & { name: string; source: string };

export const LANDMARKS = {
  summit: { lat: 32.68711, lon: 35.38962, name: 'פסגת הר תבור', source: 'OSM node 3663541539 (natural=peak, ele=557)' },
  basilica: { lat: 32.68626, lon: 35.39242, name: 'כנסיית ההשתנות', source: 'OSM way 255793567 (centre)' },
  shibli: { lat: 32.69372, lon: 35.396, name: 'שיבלי', source: 'OSM node 278476277 (place=village)' },
  road7266: { lat: 32.68983, lon: 35.38154, name: 'הדרך המתפתלת לפסגה', source: 'OSM way 202703846 (ref=7266, midpoint)' },
  route65: { lat: 32.69027, lon: 35.4189, name: 'כביש 65', source: 'OSM way 220996075 (ref=65, midpoint)' },
  kinneret: { lat: 32.8333, lon: 35.5833, name: 'הכנרת', source: 'Sea of Galilee 32°50′N 35°35′E (Wikipedia)' },
  reservoir: { lat: 32.66323, lon: 35.38019, name: 'המאגר שמדרום להר', source: 'OSM way 80859302 (natural=water)' },
  einDor: { lat: 32.65625, lon: 35.41704, name: 'עין דור', source: 'OSM node 278474123 (place=village)' },
  // Replaces עין קישיון (OSM node 7875569985), whose ring enclosed Route 65 — drawn on both maps of screen D.
  // IHM draws this spring's symbol exactly on the node, its name just below; 48 px from Route 65 at k = 1.
  einTavor: { lat: 32.6875, lon: 35.40834, name: 'עין תבור', source: 'OSM node 278473222 (natural=spring, GNS 50958)' },
  kfarTavor: { lat: 32.68781, lon: 35.42042, name: 'כפר תבור', source: 'OSM node 278473207 (place=village)' },
  afula: { lat: 32.60756, lon: 35.28909, name: 'עפולה', source: 'OSM node 278477139 (place=town)' },
  tiberias: { lat: 32.79385, lon: 35.53286, name: 'טבריה', source: 'OSM node 278473513 (place=town)' },
} satisfies Record<string, Landmark>;

export type LandmarkId = keyof typeof LANDMARKS;

/** What the map currently shows, appended to every map's accessible name (` · מוצג: …`), per representation. */
export const SHOWN_AS = { map: 'מפה טופוגרפית', ortho: 'תצלום אוויר (תצ״א)', compare: 'השוואה בווילון' } as const;
export const shownSuffix = (mode: keyof typeof SHOWN_AS) => ` · מוצג: ${SHOWN_AS[mode]}`;

/** Explore mode — locate buttons. `label` is the button text and the name drawn on the map. */
export type LocateItem = { id: LandmarkId; label: string };
export const LOCATE: readonly LocateItem[] = [
  { id: 'shibli', label: 'שיבלי' },
  { id: 'road7266', label: 'הדרך לפסגה' },
  { id: 'kinneret', label: 'הכנרת' },
  { id: 'summit', label: 'פסגת הר תבור' },
];

/** Measure mode — "הצג דוגמה": from the basilica (א) to the village of Shibli (ב). */
export const EXAMPLE_PAIR: readonly [LandmarkId, LandmarkId] = ['basilica', 'shibli'];

/** Explore mode — "הגדלה לעומת פירוט": the one sentence beside the ×5 vs 1:50,000 curtain (verbatim, user brief). */
export const ZOOM_SENTENCE = 'הגדלת המפה מגדילה את הפרטים שכבר קיימים; היא אינה מוסיפה מידע שלא הוצג במפת המקור.';

/**
 * Map-choice scenarios. Not wired into the lesson since the scale-lab merge (2026-10-08); kept with
 * ScaleChoose.tsx for a possible later move to the practice area.
 */
export type ScenarioId = 'local' | 'navigation' | 'regional';
/**
 * `at`: where the need can be seen on the target sheet. On a wrong choice that lacks this need, those
 * spots are ringed on the map (when they lie inside the chosen sheet) instead of the task points.
 */
export type Need = { label: string; shownOn: readonly SheetId[]; at?: readonly LandmarkId[] };
export type Scenario = {
  id: ScenarioId;
  title: string;
  task: string;
  points: readonly LandmarkId[];
  area?: readonly [LatLon, LatLon];
  needs: readonly Need[];
  target: SheetId;
  success: string;
};
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'local',
    title: 'תכנון מקומי',
    task: 'מתכננים תנועה רגלית בין המבנים במתחם הפסגה של הר תבור.',
    points: ['basilica'],
    area: [{ lat: 32.6855, lon: 35.388 }, { lat: 32.689, lon: 35.3935 }],
    needs: [{ label: 'כל מבנה בנפרד', shownOn: ['10k'], at: ['basilica'] }],
    target: '10k',
    success: 'רק במפה 1:10,000 מצויר כל מבנה במתחם, והמתחם כולו נכנס בקטע אחד. זו המפה לתכנון תנועה בין מבנים.',
  },
  {
    id: 'navigation',
    title: 'ניווט',
    task: 'ניווט רגלי מעין דור אל פסגת הר תבור, בדרכי עפר ובשבילים.',
    points: ['einDor', 'summit'],
    needs: [
      // Verified on the 10k raster: the tracks inside its footprint are drawn.
      { label: 'דרכי העפר', shownOn: ['10k', '50k'] },
      // No spring lies inside the 1:10,000 sheet's footprint, so '10k' is a scale-class claim (a 1:10,000
      // map draws springs) that cannot be seen on this raster. It never affects feedback: 1:10,000 fails
      // on coverage first (content test 'every other sheet has a reason').
      { label: 'המעיינות שבדרך', shownOn: ['10k', '50k'], at: ['einTavor'] },
    ],
    target: '50k',
    success: 'מפה 1:50,000 מכסה את כל הציר בקטע אחד, ומציגה את דרכי העפר והמעיינות שהנווט צריך.',
  },
  {
    id: 'regional',
    title: 'תכנון אזורי',
    task: 'מתכננים תנועה של כוח מעפולה לטבריה.',
    points: ['afula', 'tiberias'],
    // No main road lies inside the 1:10,000 sheet's footprint, so '10k' is a scale-class claim (a 1:10,000
    // map draws main roads) that cannot be seen on this raster. It never affects feedback: 1:10,000 fails
    // on coverage first (content test 'every other sheet has a reason').
    needs: [{ label: 'הכבישים הראשיים', shownOn: ['10k', '50k', '250k'] }],
    target: '250k',
    success: 'רק מפה 1:250,000 מכילה את כל האזור בקטע אחד, והכבישים הראשיים שצריך לתכנון מוצגים בה.',
  },
];
