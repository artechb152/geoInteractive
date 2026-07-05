/**
 * placeholders.tsx — עיצוב קבוע (לא-placeholder) + רישום חריצי נכסי Magnific.
 *
 * מקור סמכות: docs/design-approval/papercut-mockup-design-lock.md §5.3, §6.2
 * ו-docs/design-approval/diagnostic-asset-placeholder-policy.md.
 *
 * שינוי מדיניות: איורי ה-placeholder המלוטשים (טרֵיין הירו, מיניאטורות כרטיסי
 * שיעור) הוסרו מהקובץ הזה. כל נכס Magnific עתידי חסר מוצג כעת דרך
 * MissingAssetPlaceholder.tsx (בלוק אבחוני, לא איור-לקוח) — ראו AssetSlot.tsx.
 * מה שנשאר כאן:
 * - MapBoardBackground: עיצוב קבוע (§5.3) — אין לו slot ראסטר, אינו "נכס עתידי".
 * - LESSON_CARD_SLOTS: מטא-דאטה בלבד (assetId/src/alt) לרישום חובות-הנכסים.
 */
import { cn } from '@/lib/utils';
import { CONTOUR_ISLAND_PATH, PAPERCUT_COLORS } from './motifs';

const C = PAPERCUT_COLORS;

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
    </svg>
  );
}

/* ─────────────────────── רישום חריצי כרטיסי השיעור (LESSON-NN-CARD) ─────────────────────── */

/**
 * רישום ה-slots של 12 כרטיסי השיעור — מזהים, קבצים עתידיים
 * (public/assets/isometric/, לפי MAGNIFIC_ASSET_PROMPTS.md) ו-alt עברי.
 * מטא-דאטה בלבד: הרינדור בפועל (כשהנכס חסר) הוא MissingAssetPlaceholder דרך AssetSlot.
 * grep על data-asset-id מוצא את כל חובות-הנכסים.
 */
export const LESSON_CARD_SLOTS: ReadonlyArray<{
  lesson: number;
  assetId: string;
  src: string;
  alt: string;
}> = [
  { lesson: 1, assetId: 'LESSON-01-CARD', src: '/assets/isometric/lesson-01-strategy-terrain.png', alt: 'איור פייפרקאט: לוח טרֵיין מדורג בשלוש רמות עם קו כתום מקשר' },
  { lesson: 2, assetId: 'LESSON-02-CARD', src: '/assets/isometric/lesson-02-map-reading.png', alt: 'איור פייפרקאט: עוגת קווי גובה טופוגרפית וסרגל נייר' },
  { lesson: 3, assetId: 'LESSON-03-CARD', src: '/assets/isometric/lesson-03-navigation.png', alt: 'איור פייפרקאט: מצפן על קפל שטח עם נתיב נקודות אל דגלון כתום' },
  { lesson: 4, assetId: 'LESSON-04-CARD', src: '/assets/isometric/lesson-04-landforms.png', alt: 'איור פייפרקאט: שלוש צורות נוף — גבעה מעוגלת, רכס ואוכף' },
  { lesson: 5, assetId: 'LESSON-05-CARD', src: '/assets/isometric/lesson-05-mobility.png', alt: 'איור פייפרקאט: משטח שטח עם נתיב עביר, כתם צמחייה ורכב זעיר' },
  { lesson: 6, assetId: 'LESSON-06-CARD', src: '/assets/isometric/lesson-06-los.png', alt: 'איור פייפרקאט: גבעה עם עמדת תצפית ומניפת שדה ראייה' },
  { lesson: 7, assetId: 'LESSON-07-CARD', src: '/assets/isometric/lesson-07-weather.png', alt: 'איור פייפרקאט: קפל שטח עם שכבת ענן נמוכה ומגדל חיישן מבצבץ' },
  { lesson: 8, assetId: 'LESSON-08-CARD', src: '/assets/isometric/lesson-08-logistics.png', alt: 'איור פייפרקאט: לוח שטח עם סרט דרך, משאית אספקה ומחסן' },
  { lesson: 9, assetId: 'LESSON-09-CARD', src: '/assets/isometric/lesson-09-chokepoints.png', alt: 'איור פייפרקאט: מיצר ימי צר בין שתי יבשות עם ספינה במעבר' },
  { lesson: 10, assetId: 'LESSON-10-CARD', src: '/assets/isometric/lesson-10-urban.png', alt: 'איור פייפרקאט: רובע עירוני איזומטרי עם מבנים בגבהים שונים' },
  { lesson: 11, assetId: 'LESSON-11-CARD', src: '/assets/isometric/lesson-11-borders.png', alt: 'איור פייפרקאט: לוח שטח מחולק בקו גבול מקווקו עם רצועת חיץ' },
  { lesson: 12, assetId: 'LESSON-12-CARD', src: '/assets/isometric/lesson-12-gis-layers.png', alt: 'איור פייפרקאט: שכבות מידע מעל בסיס שטח עם צמתים מקושרים' },
];
