/**
 * placeholders.tsx — Placeholders מלוטשים (SVG בלבד) עד שנכסי Magnific יגיעו.
 *
 * מקור סמכות: docs/design-approval/papercut-mockup-design-lock.md §5.
 * כללים נעולים (§5.1):
 * - SVG/CSS בלבד, בטוקני הפלטה + סולם הדיורמה — בלי HEX חדש.
 * - בלי טקסט בתוך הגרפיקה. חייב "להיקרא בלי תוויות".
 * - יושב על צלחת bg (#FFFBF7) בדיוק — כדי שההחלפה בנכס (רקע קרם אפוי,
 *   תהליך no-transparent-bg) לא תשבור פריסה.
 * - role="img" + aria-label עברי מלא (אותו alt שיקבל הנכס).
 * - רמת גימור של הצגה ללקוח — לא "קופסה אפורה עם X".
 *
 * נושאי המיניאטורות (LESSON-NN-CARD) תואמים 1:1 לפרומפטי ההפקה
 * ב-project-knowledge/MAGNIFIC_ASSET_PROMPTS.md — כדי שההחלפה העתידית
 * תשמור על אותו סאבג'קט ולא "תקפוץ" ויזואלית.
 */
import { cn } from '@/lib/utils';
import {
  CONTOUR_ISLAND_PATH,
  CompassRose,
  PAPERCUT_COLORS,
  PlusMark,
  useSvgId,
} from './motifs';

const C = PAPERCUT_COLORS;

/* ─────────────────────────── עזרים פנימיים ─────────────────────────── */

/** מעוין איזומטרי 2:1 סביב הראשית — לוחות/אריחים. */
function isoDiamond(halfW: number): string {
  const halfH = halfW / 2;
  return `M 0 ${-halfH} L ${halfW} 0 L 0 ${halfH} L ${-halfW} 0 Z`;
}

/** לוח איזומטרי עם עובי נייר: פאת-צד מוסטת מטה + פאה עליונה. */
function IsoSlab({
  x,
  y,
  halfW,
  thickness = 10,
  top,
  side,
}: {
  x: number;
  y: number;
  halfW: number;
  thickness?: number;
  top: string;
  side: string;
}) {
  const d = isoDiamond(halfW);
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={d} transform={`translate(0 ${thickness})`} fill={side} />
      <path d={d} fill={top} />
    </g>
  );
}

/** טרסת קונטור אורגנית עם עובי נייר (side = top של השכבה שמתחת — מוסכמת הדיורמה). */
function Terrace({
  x,
  y,
  s,
  r = 0,
  top,
  side,
  thickness = 10,
}: {
  x: number;
  y: number;
  s: number;
  r?: number;
  top: string;
  side: string;
  thickness?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={CONTOUR_ISLAND_PATH} transform={`translate(0 ${thickness}) scale(${s})`} fill={side} />
      <path d={CONTOUR_ISLAND_PATH} transform={`scale(${s})`} fill={top} />
    </g>
  );
}

/** דגלון ניווט כתום — נקודת המיקוד של הפלטה. */
function Flag({ x, y, h = 30, w = 22 }: { x: number; y: number; h?: number; w?: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - h} stroke={C.fgMuted} strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M ${x} ${y - h} L ${x + w} ${y - h + w * 0.28} L ${x} ${y - h + w * 0.56} Z`} fill={C.accent} />
    </g>
  );
}

/** אשכול עצים — עיגולים קטנים בגוני זית/רכס. */
function TreeCluster({ dots, tone = C.terrainRidge, opacity = 0.85 }: {
  dots: Array<[number, number, number]>;
  tone?: string;
  opacity?: number;
}) {
  return (
    <g fill={tone} fillOpacity={opacity}>
      {dots.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  );
}

/** פילטר צל רך משותף לכל placeholder (id ייחודי לכל מופע). */
function SoftShadowDefs({ id, blur = 10 }: { id: string; blur?: number }) {
  return (
    <defs>
      <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={blur} />
      </filter>
    </defs>
  );
}

/* ─────────────────────── TerrainSlabPlaceholder (HOME-01) ─────────────────────── */

const SLAB_TOP =
  'M 452 229 Q 480 217 508 229 L 786 343 Q 816 356 786 369 L 508 483 Q 480 495 452 483 L 174 369 Q 144 356 174 343 Z';

const HERO_TERRACES: Array<{ x: number; y: number; s: number; r: number; top: string; side: string }> = [
  { x: 470, y: 362, s: 1.5, r: 0, top: C.dioSand, side: C.dioSandSide },
  { x: 456, y: 344, s: 1.24, r: -3, top: C.dioSandDeep, side: C.dioSand },
  { x: 446, y: 327, s: 1.0, r: 2, top: C.dioTransition, side: C.dioSandDeep },
  { x: 438, y: 311, s: 0.78, r: -2, top: C.dioSageLight, side: C.dioTransition },
  { x: 432, y: 296, s: 0.57, r: 3, top: C.brand, side: C.dioSageLight },
  { x: 428, y: 282, s: 0.38, r: -4, top: C.dioSageOrange, side: C.brand },
  { x: 425, y: 270, s: 0.23, r: 0, top: C.accent, side: C.dioSageOrange },
  { x: 424, y: 260, s: 0.115, r: 0, top: C.dioPeak, side: C.accent },
];

const HERO_RIVER = 'M 552 336 C 584 346, 588 360, 622 375 C 658 391, 682 397, 702 405';

/**
 * TerrainSlabPlaceholder — לוח הטרֵיין של ההירו (Slot: HOME-01, יחס 16:9).
 * הר קונטור פייפרקאט על פלטפורמת bg-warm, נחל, דגלוני ניווט — לפי §5.2.
 */
export function TerrainSlabPlaceholder({
  className,
  ariaLabel = 'לוח טרֵיין פייפרקאט איזומטרי — הרים, נחל ודגלוני ניווט',
}: {
  className?: string;
  ariaLabel?: string;
}) {
  const shadowId = useSvgId('slab-shadow');
  return (
    <svg
      viewBox="0 0 960 540"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      data-placeholder="terrain-slab"
      className={cn('block size-full select-none', className)}
    >
      <SoftShadowDefs id={shadowId} blur={12} />
      <rect width="960" height="540" fill={C.bg} />

      {/* קווי גובה רפאים ברקע הצלחת */}
      <g transform="translate(150 110) scale(0.95)">
        {[1, 0.72, 0.46].map((ring) => (
          <path
            key={ring}
            d={CONTOUR_ISLAND_PATH}
            transform={`scale(${ring})`}
            fill="none"
            stroke={C.brandDark}
            strokeOpacity="0.08"
            strokeWidth={1 / ring}
          />
        ))}
      </g>
      <g transform="translate(835 105) rotate(30) scale(0.65)">
        {[1, 0.68].map((ring) => (
          <path
            key={ring}
            d={CONTOUR_ISLAND_PATH}
            transform={`scale(${ring})`}
            fill="none"
            stroke={C.brandDark}
            strokeOpacity="0.08"
            strokeWidth={1.4 / ring}
          />
        ))}
      </g>
      <PlusMark x={96} y={330} size={8} opacity={0.35} />
      <PlusMark x={886} y={252} size={8} opacity={0.35} />

      {/* צל קרקע רך */}
      <ellipse cx="480" cy="502" rx="345" ry="34" fill={C.brandDark} opacity="0.16" filter={`url(#${shadowId})`} />

      {/* פלטפורמת הלוח — bg-warm עם עובי חול מוצלל (מיפוי palette.md) */}
      <path d={SLAB_TOP} transform="translate(0 24)" fill={C.dioSandSide} />
      <path d={SLAB_TOP} fill={C.warm} />

      {/* קו-שפה קונטורי עדין סביב בסיס ההר */}
      <g transform="translate(474 366)">
        <path
          d={CONTOUR_ISLAND_PATH}
          transform="scale(1.68)"
          fill="none"
          stroke={C.brandDark}
          strokeOpacity="0.16"
          strokeWidth="0.6"
        />
      </g>

      {/* טרסות ההר — סולם הדיורמה: חול → מרווה → פסגה כתומה */}
      {HERO_TERRACES.map((t, i) => (
        <Terrace key={i} {...t} thickness={i === 0 ? 12 : 10} />
      ))}

      {/* נחל — נובע ממורד הגבעה וזורם אל שפת הלוח */}
      <circle cx="552" cy="336" r="7" fill={C.terrainSky} opacity="0.75" />
      <path d={HERO_RIVER} fill="none" stroke={C.terrainSky} strokeWidth="11" strokeLinecap="round" opacity="0.78" />
      <path d={HERO_RIVER} fill="none" stroke={C.elevated} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />

      {/* חורש על מדרגות המרווה */}
      <TreeCluster dots={[[352, 318, 7], [364, 325, 5.5], [342, 326, 6]]} />
      <TreeCluster dots={[[536, 352, 7], [548, 346, 5], [527, 358, 5.5]]} tone={C.terrainOlive} opacity={0.8} />
      <TreeCluster dots={[[300, 355, 6], [311, 361, 4.5]]} />

      {/* דגלוני ניווט — מוקד כתום */}
      <Flag x={424} y={258} h={46} w={28} />
      <Flag x={568} y={318} h={28} w={18} />
    </svg>
  );
}

/* ─────────────────────── MapBoardBackground (עיצוב קבוע, §5.3) ─────────────────────── */

/**
 * MapBoardBackground — רקע לוח המפה של מוקאפ השיעור (יחס 4:3).
 * שים לב: זה אינו placeholder זמני אלא העיצוב הקבוע (§3.7 — ללא slot ראסטר).
 * שכבת הסמנטיקה (ציר A→B, סמנים, מקרא) היא SVG נפרד שיושב מעליו במוקאפ.
 */
export function MapBoardBackground({
  className,
  ariaLabel = 'לוח מפה פייפרקאט במבט-על — גבעות, נחל, חורש ומשטחי חול',
}: {
  className?: string;
  ariaLabel?: string;
}) {
  const hills: Array<{ x: number; y: number; s: number; r: number }> = [
    { x: 215, y: 165, s: 1.15, r: 0 },
    { x: 630, y: 118, s: 0.62, r: 140 },
    { x: 588, y: 442, s: 0.9, r: 60 },
    { x: 105, y: 398, s: 0.5, r: -30 },
  ];
  const river = 'M 690 28 C 640 120, 540 150, 480 220 C 420 290, 350 320, 315 400 C 290 458, 230 520, 165 575';
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={ariaLabel}
      data-placeholder="map-board"
      className={cn('block size-full select-none', className)}
    >
      <rect width="800" height="600" fill={C.bg} />

      {/* שטיפות נייר חמות עדינות */}
      <g transform="translate(640 500) scale(1.5)">
        <path d={CONTOUR_ISLAND_PATH} fill={C.dioSand} fillOpacity="0.3" />
      </g>
      <g transform="translate(120 60) scale(1.2) rotate(16)">
        <path d={CONTOUR_ISLAND_PATH} fill={C.bgAccent} fillOpacity="0.55" />
      </g>

      {/* גושי גבעות — מילויי מרווה שקופים + טבעות קונטור */}
      {hills.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.r}) scale(${h.s})`}>
          <path d={CONTOUR_ISLAND_PATH} fill={C.dioSageLight} fillOpacity="0.38" />
          <path d={CONTOUR_ISLAND_PATH} transform="scale(0.74)" fill={C.brand} fillOpacity="0.4" />
          <path d={CONTOUR_ISLAND_PATH} transform="scale(0.5)" fill={C.brandDark} fillOpacity="0.3" />
          {[1, 0.74, 0.5, 0.28].map((ring) => (
            <path
              key={ring}
              d={CONTOUR_ISLAND_PATH}
              transform={`scale(${ring})`}
              fill="none"
              stroke={C.brandDark}
              strokeOpacity="0.3"
              strokeWidth={0.9 / (h.s * ring)}
            />
          ))}
        </g>
      ))}

      {/* משטחי חול יבשים */}
      <g transform="translate(432 505) scale(0.5) rotate(-12)">
        <path d={CONTOUR_ISLAND_PATH} fill={C.dioSand} fillOpacity="0.75" />
        <path d={CONTOUR_ISLAND_PATH} transform="scale(0.6)" fill="none" stroke={C.dioSandSide} strokeOpacity="0.7" strokeWidth="1.6" />
      </g>
      <g transform="translate(706 300) scale(0.4) rotate(24)">
        <path d={CONTOUR_ISLAND_PATH} fill={C.dioSand} fillOpacity="0.6" />
      </g>

      {/* נחל */}
      <path d={river} fill="none" stroke={C.terrainSky} strokeWidth="14" strokeLinecap="round" opacity="0.5" />
      <path d={river} fill="none" stroke={C.elevated} strokeWidth="4" strokeLinecap="round" opacity="0.6" />

      {/* חורש — אשכולות עצים לאורך הגדות והמורדות */}
      <TreeCluster
        dots={[[330, 122, 6.5], [344, 130, 5], [320, 133, 5.5], [336, 143, 4.5], [352, 118, 4.5]]}
        opacity={0.55}
      />
      <TreeCluster
        dots={[[478, 328, 7], [494, 336, 5.5], [466, 340, 5.5], [486, 350, 4.5], [504, 322, 5], [470, 318, 4.5]]}
        tone={C.terrainOlive}
        opacity={0.5}
      />
      <TreeCluster dots={[[692, 518, 6], [706, 526, 5], [682, 530, 4.5], [698, 540, 4]]} opacity={0.5} />
      <TreeCluster dots={[[88, 238, 5.5], [102, 246, 4.5], [80, 250, 4]]} tone={C.terrainOlive} opacity={0.5} />
      <TreeCluster dots={[[238, 300, 5], [252, 306, 4.5], [230, 312, 4]]} opacity={0.5} />

      {/* קווי גובה פתוחים בשטחים הריקים */}
      <path d="M 40 480 C 160 440, 240 472, 340 450 S 520 470, 600 452" fill="none" stroke={C.brandDark} strokeOpacity="0.13" strokeWidth="1" />
      <path d="M 420 58 C 520 38, 600 72, 720 50" fill="none" stroke={C.brandDark} strokeOpacity="0.13" strokeWidth="1" />
      <path d="M 60 550 C 180 520, 260 548, 380 528" fill="none" stroke={C.brandDark} strokeOpacity="0.13" strokeWidth="1" />

      {/* סימוני מדידה */}
      <PlusMark x={140} y={140} size={7} opacity={0.3} />
      <PlusMark x={660} y={222} size={7} opacity={0.3} />
      <PlusMark x={360} y={558} size={7} opacity={0.3} />
    </svg>
  );
}

/* ─────────────────────── LessonCardPlaceholder (LESSON-NN-CARD) ─────────────────────── */

export type LessonCardVariant =
  | 'strategy'
  | 'cartography'
  | 'navigation'
  | 'landforms'
  | 'mobility'
  | 'los'
  | 'weather'
  | 'logistics'
  | 'chokepoint'
  | 'urban'
  | 'borders'
  | 'gis';

/**
 * רישום ה-slots של 12 כרטיסי השיעור — מזהים, קבצים עתידיים
 * (public/assets/isometric/, לפי MAGNIFIC_ASSET_PROMPTS.md) ו-alt עברי.
 * grep על data-asset-id מוצא את כל חובות-הנכסים.
 */
export const LESSON_CARD_SLOTS: ReadonlyArray<{
  lesson: number;
  assetId: string;
  src: string;
  variant: LessonCardVariant;
  alt: string;
}> = [
  { lesson: 1, assetId: 'LESSON-01-CARD', src: '/assets/isometric/lesson-01-strategy-terrain.png', variant: 'strategy', alt: 'איור פייפרקאט: לוח טרֵיין מדורג בשלוש רמות עם קו כתום מקשר' },
  { lesson: 2, assetId: 'LESSON-02-CARD', src: '/assets/isometric/lesson-02-map-reading.png', variant: 'cartography', alt: 'איור פייפרקאט: עוגת קווי גובה טופוגרפית וסרגל נייר' },
  { lesson: 3, assetId: 'LESSON-03-CARD', src: '/assets/isometric/lesson-03-navigation.png', variant: 'navigation', alt: 'איור פייפרקאט: מצפן על קפל שטח עם נתיב נקודות אל דגלון כתום' },
  { lesson: 4, assetId: 'LESSON-04-CARD', src: '/assets/isometric/lesson-04-landforms.png', variant: 'landforms', alt: 'איור פייפרקאט: שלוש צורות נוף — גבעה מעוגלת, רכס ואוכף' },
  { lesson: 5, assetId: 'LESSON-05-CARD', src: '/assets/isometric/lesson-05-mobility.png', variant: 'mobility', alt: 'איור פייפרקאט: משטח שטח עם נתיב עביר, כתם צמחייה ורכב זעיר' },
  { lesson: 6, assetId: 'LESSON-06-CARD', src: '/assets/isometric/lesson-06-los.png', variant: 'los', alt: 'איור פייפרקאט: גבעה עם עמדת תצפית ומניפת שדה ראייה' },
  { lesson: 7, assetId: 'LESSON-07-CARD', src: '/assets/isometric/lesson-07-weather.png', variant: 'weather', alt: 'איור פייפרקאט: קפל שטח עם שכבת ענן נמוכה ומגדל חיישן מבצבץ' },
  { lesson: 8, assetId: 'LESSON-08-CARD', src: '/assets/isometric/lesson-08-logistics.png', variant: 'logistics', alt: 'איור פייפרקאט: לוח שטח עם סרט דרך, משאית אספקה ומחסן' },
  { lesson: 9, assetId: 'LESSON-09-CARD', src: '/assets/isometric/lesson-09-chokepoints.png', variant: 'chokepoint', alt: 'איור פייפרקאט: מיצר ימי צר בין שתי יבשות עם ספינה במעבר' },
  { lesson: 10, assetId: 'LESSON-10-CARD', src: '/assets/isometric/lesson-10-urban.png', variant: 'urban', alt: 'איור פייפרקאט: רובע עירוני איזומטרי עם מבנים בגבהים שונים' },
  { lesson: 11, assetId: 'LESSON-11-CARD', src: '/assets/isometric/lesson-11-borders.png', variant: 'borders', alt: 'איור פייפרקאט: לוח שטח מחולק בקו גבול מקווקו עם רצועת חיץ' },
  { lesson: 12, assetId: 'LESSON-12-CARD', src: '/assets/isometric/lesson-12-gis-layers.png', variant: 'gis', alt: 'איור פייפרקאט: שכבות מידע מעל בסיס שטח עם צמתים מקושרים' },
];

const VARIANT_LABEL: Record<LessonCardVariant, string> = Object.fromEntries(
  LESSON_CARD_SLOTS.map((s) => [s.variant, s.alt]),
) as Record<LessonCardVariant, string>;

/* — אמנות הווריאנטים — כל אחת <g> על במה של 240×240, אובייקט ממורכז — */

function StrategyArt() {
  return (
    <g>
      <IsoSlab x={120} y={148} halfW={72} thickness={12} top={C.dioSand} side={C.dioSandSide} />
      <IsoSlab x={120} y={124} halfW={50} thickness={11} top={C.dioSageLight} side={C.dioSand} />
      <IsoSlab x={120} y={102} halfW={30} thickness={10} top={C.brand} side={C.dioSageLight} />
      {/* קו כתום דק שמחבר את שלוש הרמות */}
      <path d="M 120 78 L 120 148" fill="none" stroke={C.accent} strokeWidth="2.5" />
      {[102, 124, 148].map((y) => (
        <circle key={y} cx="120" cy={y} r="3" fill={C.accent} />
      ))}
      <circle cx="120" cy="78" r="4.5" fill={C.accent} />
      <circle cx="120" cy="78" r="1.9" fill={C.elevated} />
    </g>
  );
}

function CartographyArt() {
  return (
    <g>
      {/* עוגת קווי גובה — חול → מרווה */}
      <Terrace x={112} y={138} s={0.6} top={C.dioSand} side={C.dioSandSide} thickness={9} />
      <Terrace x={106} y={124} s={0.46} r={-4} top={C.dioSandDeep} side={C.dioSand} thickness={8} />
      <Terrace x={102} y={111} s={0.33} r={3} top={C.dioTransition} side={C.dioSandDeep} thickness={8} />
      <Terrace x={99} y={99} s={0.2} top={C.dioSageLight} side={C.dioTransition} thickness={7} />
      <Terrace x={98} y={90} s={0.1} top={C.brand} side={C.dioSageLight} thickness={6} />
      {/* סרגל נייר מונח באלכסון */}
      <g transform="translate(163 145) rotate(-32)">
        <rect x="-34" y="-6" width="68" height="12" rx="2.5" fill={C.elevated} stroke={C.borderStrong} strokeWidth="1" />
        {[-26, -18, -10, -2, 6, 14, 22].map((tx, i) => (
          <line key={tx} x1={tx} y1="-6" x2={tx} y2={i % 2 === 0 ? 0 : -2.5} stroke={C.fgDim} strokeWidth="1" />
        ))}
      </g>
    </g>
  );
}

function NavigationArt() {
  return (
    <g>
      {/* קפל שטח */}
      <Terrace x={124} y={152} s={0.62} r={4} top={C.dioSageLight} side={C.dioTransition} thickness={9} />
      {/* נתיב נקודות אל דגלון — קדימה = שמאלה (RTL) */}
      <path
        d="M 112 128 C 100 120, 92 112, 84 102"
        fill="none"
        stroke={C.accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.1 7.5"
      />
      <Flag x={80} y={98} h={26} w={17} />
      {/* המצפן יושב על הקפל */}
      <g transform="translate(134 136) scale(0.78)">
        <CompassRose />
      </g>
    </g>
  );
}

function LandformsArt() {
  return (
    <g>
      <rect x="34" y="166" width="172" height="13" rx="6.5" fill={C.dioSand} />
      {/* גבעת כיפה */}
      <path d="M 40 168 A 30 30 0 0 1 100 168 Z" fill={C.dioSageLight} />
      <path d="M 52 168 A 18 18 0 0 1 88 168" fill="none" stroke={C.bg} strokeOpacity="0.55" strokeWidth="1.4" />
      {/* רכס */}
      <path d="M 92 168 L 131 110 L 131 168 Z" fill={C.brand} />
      <path d="M 131 110 L 170 168 L 131 168 Z" fill={C.terrainRidge} />
      {/* אוכף */}
      <path d="M 158 168 C 166 146, 177 146, 185 157 C 193 146, 204 146, 212 168 Z" fill={C.dioTransition} />
      <path d="M 170 168 C 176 156, 182 154, 185 160" fill="none" stroke={C.bg} strokeOpacity="0.5" strokeWidth="1.2" />
      <Flag x={131} y={110} h={22} w={15} />
    </g>
  );
}

function MobilityArt() {
  return (
    <g>
      {/* אריח שטח במבט-על */}
      <rect x="42" y="72" width="156" height="106" rx="16" fill={C.dioSageLight} fillOpacity="0.55" stroke={C.borderStrong} strokeWidth="1" />
      {/* כתם צמחייה מחוספס */}
      <g transform="translate(78 148) scale(0.24) rotate(-10)">
        <path d={CONTOUR_ISLAND_PATH} fill={C.brand} fillOpacity="0.65" />
      </g>
      <TreeCluster dots={[[66, 152, 5], [78, 158, 4.5], [58, 160, 4], [72, 146, 4]]} opacity={0.7} />
      {/* נתיב עביר חלק — מלמטה-ימין למעלה-שמאל */}
      <path
        d="M 190 162 C 158 152, 140 128, 116 116 C 98 106, 82 96, 66 88"
        fill="none"
        stroke={C.terrainSand}
        strokeWidth="15"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* רכב זעיר באמצע הנתיב */}
      <g transform="translate(124 120) rotate(24)">
        <rect x="-9" y="-5" width="18" height="10" rx="2.5" fill={C.fgMuted} />
        <rect x="-4" y="-3" width="7" height="6" rx="1.5" fill={C.fgDim} />
        <circle cx="0" cy="-6.5" r="2" fill={C.accent} />
      </g>
    </g>
  );
}

function LosArt() {
  return (
    <g>
      {/* הגבעה */}
      <path d="M 36 172 Q 120 84 204 172 Z" fill={C.dioSageLight} />
      <path d="M 68 172 Q 120 116 172 172" fill="none" stroke={C.bg} strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M 92 172 Q 120 142 148 172" fill="none" stroke={C.bg} strokeOpacity="0.4" strokeWidth="1.2" />
      {/* מניפת שדה-הראייה — נפרשת מהעמדה במורד המערבי */}
      <path d="M 120 122 L 34 168 Q 100 190 160 178 Z" fill={C.dioTransition} fillOpacity="0.75" />
      <path d="M 120 122 L 34 168" fill="none" stroke={C.dioSageOrange} strokeOpacity="0.55" strokeWidth="1.2" />
      <path d="M 120 122 L 160 178" fill="none" stroke={C.dioSageOrange} strokeOpacity="0.55" strokeWidth="1.2" />
      {/* עמדת תצפית על הפסגה */}
      <rect x="112" y="106" width="16" height="18" rx="2.5" fill={C.fgMuted} />
      <line x1="120" y1="106" x2="120" y2="88" stroke={C.fgMuted} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="120" cy="85" r="3.4" fill={C.accent} />
    </g>
  );
}

function WeatherArt() {
  return (
    <g>
      {/* קפל השטח */}
      <Terrace x={120} y={156} s={0.62} top={C.dioSageLight} side={C.dioTransition} thickness={10} />
      <Terrace x={114} y={142} s={0.4} r={-5} top={C.brand} side={C.dioSageLight} thickness={9} />
      {/* מגדל החיישן — מבצבץ מעל הענן */}
      <line x1="132" y1="130" x2="132" y2="66" stroke={C.fgMuted} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="123" y1="76" x2="141" y2="76" stroke={C.fgMuted} strokeWidth="2" strokeLinecap="round" />
      <line x1="126" y1="86" x2="138" y2="86" stroke={C.fgMuted} strokeWidth="2" strokeLinecap="round" />
      <circle cx="132" cy="62" r="3.2" fill={C.accent} />
      {/* שכבת ענן נמוכה */}
      <path
        d="M 50 128 C 46 114, 62 104, 78 109 C 84 94, 108 91, 120 102 C 132 93, 152 97, 156 109 C 172 107, 182 118, 174 128 C 178 136, 170 142, 158 142 L 66 142 C 54 142, 48 136, 50 128 Z"
        fill={C.elevated}
        stroke={C.borderStrong}
        strokeWidth="1.1"
      />
      <ellipse cx="112" cy="138" rx="46" ry="5" fill={C.bgAccent} opacity="0.9" />
    </g>
  );
}

function LogisticsArt() {
  return (
    <g>
      <IsoSlab x={120} y={146} halfW={84} thickness={12} top={C.dioSand} side={C.dioSandSide} />
      {/* סרט הדרך — מפינת הלוח אל המחסן */}
      <path
        d="M 58 152 C 86 142, 104 150, 126 142 C 146 135, 158 128, 170 122"
        fill="none"
        stroke={C.terrainSand}
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* מחסן — קוביית מרווה עם דגלון */}
      <g transform="translate(176 116)">
        <path d="M 0 -9 L 18 0 L 0 9 L -18 0 Z" transform="translate(0 14)" fill={C.terrainRidge} />
        <path d="M -18 0 L 0 9 L 0 23 L -18 14 Z" fill={C.brand} />
        <path d="M 18 0 L 0 9 L 0 23 L 18 14 Z" fill={C.terrainRidge} />
        <path d="M 0 -9 L 18 0 L 0 9 L -18 0 Z" fill={C.dioSageLight} />
      </g>
      <Flag x={176} y={104} h={22} w={15} />
      {/* משאית אספקה זעירה על הדרך */}
      <g transform="translate(100 146) rotate(-8)">
        <rect x="-12" y="-6" width="17" height="11" rx="2" fill={C.fgMuted} />
        <rect x="5" y="-3" width="8" height="8" rx="2" fill={C.fgDim} />
        <circle cx="-6" cy="6" r="2.6" fill={C.terrainSteel} />
        <circle cx="7" cy="6" r="2.6" fill={C.terrainSteel} />
      </g>
    </g>
  );
}

function ChokepointArt() {
  const clipId = useSvgId('choke-clip');
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x="36" y="58" width="168" height="132" rx="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* ים */}
        <rect x="36" y="58" width="168" height="132" fill={C.terrainSky} fillOpacity="0.3" />
        {/* יבשה מערבית ומזרחית — נצמדות זו לזו סביב מעבר צר */}
        <path
          d="M 36 58 L 106 58 C 120 82, 98 102, 112 122 C 120 134, 102 160, 110 190 L 36 190 Z"
          fill={C.dioSageLight}
          stroke={C.brandDark}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <path
          d="M 204 58 L 140 58 C 130 80, 150 102, 136 122 C 128 134, 146 160, 138 190 L 204 190 Z"
          fill={C.dioTransition}
          stroke={C.brandDark}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        {/* אדוות משני צידי נקודת החנק */}
        <path d="M 116 82 q 6 -4 12 0" fill="none" stroke={C.terrainSky} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 118 166 q 6 -4 12 0" fill="none" stroke={C.terrainSky} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
        {/* ספינה זעירה בלב המעבר הצר */}
        <g transform="translate(124 126)">
          <path d="M -8 0 L -4.5 -4.5 L 4.5 -4.5 L 8 0 L 4.5 4.5 L -4.5 4.5 Z" fill={C.elevated} stroke={C.terrainSteel} strokeWidth="1.3" />
          <circle r="2" fill={C.accent} />
        </g>
      </g>
      <rect x="36" y="58" width="168" height="132" rx="18" fill="none" stroke={C.borderStrong} strokeWidth="1.25" />
    </g>
  );
}

/** קובייה איזומטרית 2:1 — עזר לבניינים. */
function IsoBox({
  x,
  baseY,
  a,
  b,
  h,
  top,
  lit,
  shade,
}: {
  x: number;
  baseY: number;
  a: number;
  b: number;
  h: number;
  top: string;
  lit: string;
  shade: string;
}) {
  const R = { x: x + a, y: baseY - a / 2 };
  const L = { x: x - b, y: baseY - b / 2 };
  const B = { x: x + a - b, y: baseY - a / 2 - b / 2 };
  return (
    <g>
      <path d={`M ${x} ${baseY} L ${R.x} ${R.y} L ${R.x} ${R.y - h} L ${x} ${baseY - h} Z`} fill={shade} />
      <path d={`M ${x} ${baseY} L ${L.x} ${L.y} L ${L.x} ${L.y - h} L ${x} ${baseY - h} Z`} fill={lit} />
      <path d={`M ${x} ${baseY - h} L ${R.x} ${R.y - h} L ${B.x} ${B.y - h} L ${L.x} ${L.y - h} Z`} fill={top} />
    </g>
  );
}

function UrbanArt() {
  return (
    <g>
      {/* משטח רחובות */}
      <IsoSlab x={112} y={168} halfW={86} thickness={8} top={C.bgAccent} side={C.borderStrong} />
      {/* מבנים בגבהים שונים */}
      <IsoBox x={100} baseY={168} a={34} b={26} h={72} top={C.elevated} lit={C.bgAccent} shade={C.terrainSteel} />
      <IsoBox x={152} baseY={176} a={28} b={20} h={42} top={C.elevated} lit={C.bgAccent} shade={C.terrainSteel} />
      <IsoBox x={62} baseY={180} a={24} b={18} h={30} top={C.elevated} lit={C.bgAccent} shade={C.terrainSteel} />
      {/* חלונות — פאה מוארת של המגדל */}
      {[0, 1, 2].map((col) =>
        [0, 1, 2, 3].map((row) => (
          <path
            key={`${col}-${row}`}
            d={`M ${80 + col * 7} ${118 + col * 3.5 + row * 13} l 5 2.5 l 0 8 l -5 -2.5 Z`}
            fill={C.terrainSteel}
            fillOpacity="0.4"
          />
        )),
      )}
      {/* יחידת גג כתומה — המוקד */}
      <IsoBox x={106} baseY={92} a={11} b={9} h={9} top={C.accentHover} lit={C.accent} shade={C.dioSageOrange} />
    </g>
  );
}

function BordersArt() {
  return (
    <g>
      {/* לוח השטח */}
      <path d={isoDiamond(84)} transform="translate(120 158)" fill={C.dioSandSide} />
      <path d={isoDiamond(84)} transform="translate(120 146)" fill={C.dioSand} />
      {/* האזור הרחוק — מרווה */}
      <path
        d="M 36 146 C 80 138, 100 154, 130 144 C 160 136, 180 150, 204 146 L 120 104 Z"
        fill={C.dioSageLight}
      />
      {/* רצועת חיץ — גוון שלישי (bg-warm) */}
      <path
        d="M 36 146 C 80 138, 100 154, 130 144 C 160 136, 180 150, 204 146"
        fill="none"
        stroke={C.warm}
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* קו הגבול המקווקו */}
      <path
        d="M 36 146 C 80 138, 100 154, 130 144 C 160 136, 180 150, 204 146"
        fill="none"
        stroke={C.fgMuted}
        strokeWidth="2.2"
        strokeDasharray="7 4.5"
        strokeLinecap="round"
      />
      {/* נקודת מעבר — מוקד כתום */}
      <circle cx="130" cy="144" r="5.5" fill={C.bg} stroke={C.accent} strokeWidth="2.2" />
      <circle cx="130" cy="144" r="2" fill={C.accent} />
      {/* רמזים טופוגרפיים בשני הצדדים */}
      <TreeCluster dots={[[86, 126, 4.5], [97, 131, 3.8]]} opacity={0.75} />
      <path d="M 150 162 q 8 -6 16 0" fill="none" stroke={C.dioSandSide} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 126 170 q 7 -5 14 0" fill="none" stroke={C.dioSandSide} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function GisArt() {
  return (
    <g>
      {/* בסיס שטח */}
      <Terrace x={120} y={172} s={0.52} top={C.dioSageLight} side={C.dioTransition} thickness={9} />
      {/* שלוש שכבות-מידע מרחפות */}
      <g transform="translate(120 132)">
        <path d={isoDiamond(58)} fill={C.elevated} fillOpacity="0.92" stroke={C.borderStrong} strokeWidth="1.1" />
        <g transform="scale(0.32)">
          <path d={CONTOUR_ISLAND_PATH} fill={C.dioSageLight} fillOpacity="0.8" />
        </g>
      </g>
      <g transform="translate(120 102)">
        <path d={isoDiamond(58)} fill={C.bgAccent} fillOpacity="0.92" stroke={C.borderStrong} strokeWidth="1.1" />
        {[[-38, -10, 26, 22], [-19, -19.5, 45, 12.5], [19, -19.5, -45, 12.5], [38, -10, -26, 22]].map(
          ([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.brandDark} strokeOpacity="0.3" strokeWidth="0.9" />
          ),
        )}
      </g>
      <g transform="translate(120 72)">
        <path d={isoDiamond(58)} fill={C.elevated} fillOpacity="0.92" stroke={C.accent} strokeWidth="1.5" />
      </g>
      {/* צמתים מקושרים בין השכבות */}
      <path
        d="M 138 128 L 104 98 L 126 68"
        fill="none"
        stroke={C.accent}
        strokeWidth="1.2"
        strokeDasharray="2.5 3"
        opacity="0.8"
      />
      <circle cx="138" cy="128" r="2.8" fill={C.accent} />
      <circle cx="104" cy="98" r="2.8" fill={C.accent} />
      <circle cx="126" cy="68" r="2.8" fill={C.accent} />
    </g>
  );
}

const VARIANT_ART: Record<LessonCardVariant, () => React.ReactElement> = {
  strategy: StrategyArt,
  cartography: CartographyArt,
  navigation: NavigationArt,
  landforms: LandformsArt,
  mobility: MobilityArt,
  los: LosArt,
  weather: WeatherArt,
  logistics: LogisticsArt,
  chokepoint: ChokepointArt,
  urban: UrbanArt,
  borders: BordersArt,
  gis: GisArt,
};

/** צל הקרקע לכל וריאנט — התאמות קטנות כדי שהצל יישב מתחת לאובייקט. */
const VARIANT_SHADOW: Partial<Record<LessonCardVariant, { cy: number; rx: number }>> = {
  strategy: { cy: 172, rx: 82 },
  cartography: { cy: 168, rx: 78 },
  navigation: { cy: 178, rx: 78 },
  landforms: { cy: 184, rx: 90 },
  mobility: { cy: 186, rx: 84 },
  los: { cy: 178, rx: 90 },
  weather: { cy: 180, rx: 76 },
  logistics: { cy: 172, rx: 92 },
  chokepoint: { cy: 198, rx: 84 },
  urban: { cy: 190, rx: 92 },
  borders: { cy: 186, rx: 90 },
  gis: { cy: 196, rx: 72 },
};

/**
 * LessonCardPlaceholder — מיניאטורת כרטיס שיעור (Slot: LESSON-NN-CARD, יחס 1:1).
 * אובייקט יחיד ממורכז לפי נושא השיעור; חייב להיקרא גם ב-56px (§5.4).
 * מקבל `lesson` (1–12) או `variant` מפורש.
 */
export function LessonCardPlaceholder({
  lesson,
  variant,
  className,
  ariaLabel,
}: {
  lesson?: number;
  variant?: LessonCardVariant;
  className?: string;
  ariaLabel?: string;
}) {
  const idx = Math.min(Math.max(lesson ?? 1, 1), LESSON_CARD_SLOTS.length) - 1;
  const v = variant ?? LESSON_CARD_SLOTS[idx].variant;
  const Art = VARIANT_ART[v];
  const shadow = VARIANT_SHADOW[v] ?? { cy: 186, rx: 80 };
  const shadowId = useSvgId('card-shadow');
  return (
    <svg
      viewBox="0 0 240 240"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? VARIANT_LABEL[v]}
      data-placeholder={`lesson-card-${v}`}
      className={cn('block size-full select-none', className)}
    >
      <SoftShadowDefs id={shadowId} blur={6} />
      <rect width="240" height="240" fill={C.bg} />
      {/* טבעת קונטור רפאים בפינה */}
      <g transform="translate(206 34) scale(0.32) rotate(18)">
        <path d={CONTOUR_ISLAND_PATH} fill="none" stroke={C.brandDark} strokeOpacity="0.09" strokeWidth="3" />
      </g>
      <ellipse
        cx="120"
        cy={shadow.cy}
        rx={shadow.rx}
        ry="11"
        fill={C.brandDark}
        opacity="0.13"
        filter={`url(#${shadowId})`}
      />
      <Art />
    </svg>
  );
}
