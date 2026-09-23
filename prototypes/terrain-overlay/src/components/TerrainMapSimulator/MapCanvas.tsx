import {
  useMemo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { Point, SelectedFeatureId, TerrainArea, TerrainFeature } from '../../data/types';
import { LayerImage, LayerStatus, useMapLayers, type LayerName } from './MapLayers';
import Loupe from './Loupe';
import { layoutLabels } from './lib/labelLayout';
import { describeFeature, geographicOrder } from './lib/text';
import { layersFor, type CompareMode } from './lib/compare';

export interface QuizOverlay {
  /** צורה שמודגשת כשאלה ("מהי הצורה הזו?"). */
  markId?: string | null;
  /** צורה שנחשפת כתשובה נכונה. */
  revealId?: string | null;
  /** הצורה שהלומד בחר בטעות. */
  wrongId?: string | null;
  /** במצב "מצא במפה" — הלחיצה על המפה היא התשובה. */
  picking?: boolean;
}

interface MapCanvasProps {
  area: TerrainArea;
  selected?: TerrainFeature;
  previewId: SelectedFeatureId;
  showAll: boolean;
  seenIds: string[];
  /** 0 = השכבה התחתונה בלבד, 1 = העליונה בלבד. משמעותו תלויה במצב ההשוואה. */
  blend: number;
  compareMode: CompareMode;
  quiz?: QuizOverlay;
  /** נקודות הגילוי פועמות עד לבחירה הראשונה. */
  pulseDots: boolean;
  loupeAt: { x: number; y: number } | null;
  viewportSize: number;
  zoom: { k: number; x: number; y: number };
  worldStyle: CSSProperties;
  viewportRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  pointerHandlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: (e: ReactPointerEvent) => void;
    onPointerLeave: (e: ReactPointerEvent) => void;
  };
  onSelectFeature: (id: string) => void;
  onMapClick: (pt: Point, featureId: string | null) => void;
  onDoubleClickFeature: (id: string) => void;
  onLayersStatus: (s: 'loading' | 'ready' | 'error') => void;
  onFocusFeature: (id: string) => void;
  /** גרירת ידית הווילון. מקבל 0..1. */
  onWipe: (value: number) => void;
  /** שכבת-על נוספת שנשארת בתוך מרחב ה-viewBox (כלי חתך הגובה). */
  overlay?: ReactNode;
}

const LABEL_FONT = "700 15px 'Rubik', 'Assistant', 'Segoe UI', system-ui, sans-serif";

/**
 * MapCanvas — אזור המפה: שכבות התמונה המיושרות, ומעליהן שכבת SVG עם הצורות.
 *
 * שכבת ה-SVG אינה `aria-hidden`: כל אזור לחיצה הוא אלמנט אינטראקטיבי עם
 * `role="button"`, פוקוס מקלדת, ותווית מוקראת. עד לשינוי הזה המפה עצמה —
 * הפעולה המרכזית של הרכיב — הייתה נגישה לעכבר בלבד.
 *
 * הזום מיושם על `.tms-map__world`, ואילו החיתוך של הווילון יושב על העטיפה
 * שמעליו: חיתוך בתוך המרחב המותמר היה נגרר עם ההזזה, וקו הווילון היה בורח
 * מתחת לאצבע ברגע שהלומד מזיז את המפה.
 */
export default function MapCanvas({
  area,
  selected,
  previewId,
  showAll,
  seenIds,
  blend,
  compareMode,
  quiz,
  pulseDots,
  loupeAt,
  viewportSize,
  zoom,
  worldStyle,
  viewportRef,
  svgRef,
  pointerHandlers,
  onSelectFeature,
  onMapClick,
  onDoubleClickFeature,
  onLayersStatus,
  onFocusFeature,
  onWipe,
  overlay,
}: MapCanvasProps) {
  const features = area.features;
  const preview =
    previewId && previewId !== selected?.id ? features.find((f) => f.id === previewId) : undefined;

  const [baseLayer, topLayer] = layersFor(area, compareMode);
  const layers = useMapLayers(area, [baseLayer, topLayer] as LayerName[], onLayersStatus);

  /**
   * סדר הערום: הגדולה קודם, הקטנה אחרונה. ב-SVG האחרון מנצח בחפיפה, וקודם
   * לכן צורה קטנה שנכנסה מוקדם במערך הייתה חסומה לחלוטין ע"י שכנתה הגדולה.
   */
  const stacked = useMemo(
    () => features.slice().sort((a, b) => (b.hitArea ?? 1e9) - (a.hitArea ?? 1e9)),
    [features],
  );
  const navOrder = useMemo(() => geographicOrder(features), [features]);

  /** תוויות "הצג הכול" — אחרי פתרון התנגשויות. */
  const labels = useMemo(
    () =>
      showAll
        ? layoutLabels(
            features.map((f) => ({ id: f.id, anchor: f.labelPoint, text: f.name })),
            { fontSize: 15, fontFamily: LABEL_FONT.split('px ')[1], offsetY: 28 },
          )
        : [],
    [features, showAll],
  );

  const inv = 1 / zoom.k; // ניגוד-סקאלה לשמירת גודל טקסט קבוע בכל רמת זום

  const handleKeyDown = (e: React.KeyboardEvent<SVGPathElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onSelectFeature(id);
      return;
    }
    const dir =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const i = navOrder.findIndex((f) => f.id === id);
    const next = navOrder[(i + dir + navOrder.length) % navOrder.length];
    const el = svgRef.current?.querySelector<SVGPathElement>(`[data-hit="${next.id}"]`);
    el?.focus();
    onFocusFeature(next.id);
  };

  /** לחיצה על המפה — במצב תרגול היא התשובה עצמה. */
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const target = e.target as Element;
    const id = target.getAttribute?.('data-hit') ?? null;
    const ctm = svg.getScreenCTM();
    let pt: Point = { x: 500, y: 500 };
    if (ctm) {
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const local = p.matrixTransform(ctm.inverse());
      pt = { x: local.x, y: local.y };
    }
    onMapClick(pt, id);
  };

  const highlightClass =
    'tms-highlight' +
    (quiz?.revealId && quiz.revealId === selected?.id ? ' tms-highlight--correct' : '');

  const marked = quiz?.markId ? features.find((f) => f.id === quiz.markId) : undefined;
  const revealed = quiz?.revealId ? features.find((f) => f.id === quiz.revealId) : undefined;
  const wrong = quiz?.wrongId ? features.find((f) => f.id === quiz.wrongId) : undefined;

  /* --------------------------- שכבת הצורות --------------------------- */

  const featureOverlay = (
    <svg
      className="tms-map__overlay"
      ref={svgRef}
      viewBox={`0 0 ${area.viewBox.width} ${area.viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`מפת ${area.name} — ${features.length} צורות שטח מסומנות. ניתן לבחור צורה במקלדת ולנווט בין הצורות בחיצים.`}
      onClick={handleClick}
      onDoubleClick={(e) => {
        const id = (e.target as Element).getAttribute?.('data-hit');
        if (id) onDoubleClickFeature(id);
      }}
    >
      {/* אזורי לחיצה — אלמנטים אינטראקטיביים נגישים */}
      {stacked.map((feature) => (
        <path
          key={feature.id}
          className="tms-feature"
          d={feature.hitPath}
          data-hit={feature.id}
          role="button"
          tabIndex={0}
          aria-label={describeFeature(feature)}
          aria-pressed={feature.id === selected?.id}
          onKeyDown={(e) => handleKeyDown(e, feature.id)}
          onFocus={() => onFocusFeature(feature.id)}
          /* ריחוף מסמן את הנקודה של אותה צורה. הנקודה עצמה `pointer-events: none`
             — אחרת היא הייתה חוטפת את הלחיצה מאזור הלחיצה שמתחתיה. */
          onPointerEnter={() => onFocusFeature(feature.id)}
        />
      ))}

      {/* סמני גילוי */}
      {!showAll &&
        features.map((feature) =>
          feature.id === selected?.id ? null : (
            <circle
              key={`dot-${feature.id}`}
              className={
                'tms-feature-dot' +
                (seenIds.includes(feature.id) ? ' tms-feature-dot--seen' : '') +
                (feature.id === previewId ? ' tms-feature-dot--hot' : '') +
                (pulseDots ? ' tms-feature-dot--pulse' : '')
              }
              cx={feature.labelPoint.x}
              cy={feature.labelPoint.y}
              r={7 * inv}
            />
          ),
        )}

      {/* "הצג הכול" — מתאר בלבד + תוויות שאינן מתנגשות */}
      {showAll && (
        <g className="tms-all-layer">
          {features.map((feature) => (
            <g key={`all-${feature.id}`} className={`tms-all tms-all--${feature.family}`}>
              <path className="tms-all__casing" d={feature.hitPath} />
              <path className="tms-all__outline" d={feature.hitPath} />
            </g>
          ))}
          {labels.map((box) => {
            const feature = features.find((f) => f.id === box.id)!;
            return (
              <g key={`lbl-${box.id}`} pointerEvents="none">
                {box.needsLeader && (
                  <>
                    <line
                      className="tms-all__leader-casing"
                      x1={box.anchor.x}
                      y1={box.anchor.y}
                      x2={box.pos.x}
                      y2={box.pos.y}
                    />
                    <line
                      className="tms-all__leader"
                      x1={box.anchor.x}
                      y1={box.anchor.y}
                      x2={box.pos.x}
                      y2={box.pos.y}
                    />
                  </>
                )}
                <circle
                  className="tms-all__anchor"
                  cx={box.anchor.x}
                  cy={box.anchor.y}
                  r={3.5 * inv}
                />
                <g transform={`translate(${box.pos.x} ${box.pos.y}) scale(${inv})`}>
                  <rect
                    x={-box.width / 2}
                    y={-box.height / 2}
                    width={box.width}
                    height={box.height}
                    rx={7}
                    className="tms-all__bg"
                  />
                  <text x={0} y={5} textAnchor="middle" className="tms-all__text">
                    {feature.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* תצוגה מקדימה */}
      {preview && (
        <g className="tms-preview" pointerEvents="none">
          <path className="tms-preview__outline" d={preview.hitPath} />
          {preview.accentPaths?.map((d, i) => (
            <path key={i} className="tms-preview__outline" d={d} fill="none" />
          ))}
        </g>
      )}

      {/* סימון שאלת תרגול ("מהי הצורה הזו?") */}
      {marked && !revealed && (
        <g className="tms-highlight" key={`mark-${marked.id}`} pointerEvents="none">
          <path className="tms-highlight__casing" pathLength={1} d={marked.hitPath} />
          <path className="tms-highlight__outline" pathLength={1} d={marked.hitPath} />
        </g>
      )}

      {/* משוב תרגול: הנכונה בירוק, השגויה באדום */}
      {wrong && (
        <g
          className="tms-highlight tms-highlight--wrong"
          key={`w-${wrong.id}`}
          pointerEvents="none"
        >
          <path className="tms-highlight__casing" pathLength={1} d={wrong.hitPath} />
          <path className="tms-highlight__outline" pathLength={1} d={wrong.hitPath} />
        </g>
      )}
      {revealed && (
        <g
          className="tms-highlight tms-highlight--correct"
          key={`r-${revealed.id}`}
          pointerEvents="none"
        >
          <path className="tms-highlight__casing" pathLength={1} d={revealed.hitPath} />
          <path className="tms-highlight__outline" pathLength={1} d={revealed.hitPath} />
          {revealed.accentPaths?.map((d, i) => (
            <path key={i} className="tms-highlight__accent" pathLength={1} d={d} />
          ))}
        </g>
      )}

      {/* הצורה הנבחרת — מצוירת מחדש (key) כדי להפעיל את אנימציית ה"ציור" */}
      {selected && !quiz?.markId && (
        <g key={selected.id} className={highlightClass} pointerEvents="none">
          {selected.showOutline !== false && (
            <>
              <path className="tms-highlight__casing" pathLength={1} d={selected.hitPath} />
              <path className="tms-highlight__outline" pathLength={1} d={selected.hitPath} />
            </>
          )}
          {selected.accentPaths?.map((d, i) => (
            <path key={`c${i}`} className="tms-highlight__casing" pathLength={1} d={d} />
          ))}
          {selected.accentPaths?.map((d, i) => (
            <path key={`a${i}`} className="tms-highlight__accent" pathLength={1} d={d} />
          ))}
          {selected.flowArrow && (
            <g
              className="tms-flow"
              transform={`translate(${selected.flowArrow.x},${selected.flowArrow.y}) rotate(${selected.flowArrow.angle}) scale(${inv})`}
            >
              <path className="tms-flow__casing" d="M0,0 L26,0 M18,-7 L26,0 L18,7" />
              <path className="tms-flow__arrow" d="M0,0 L26,0 M18,-7 L26,0 L18,7" />
            </g>
          )}
        </g>
      )}

      {selected && !showAll && !quiz?.markId && (
        <FeatureLabel
          x={selected.labelPoint.x}
          y={selected.labelPoint.y}
          text={selected.name}
          scale={inv}
        />
      )}

      {overlay}
    </svg>
  );

  /** עותק דקורטיבי של ההדגשה, לחלון השני במצב "זה לצד זה". */
  const echoOverlay = (
    <svg
      className="tms-map__overlay tms-map__overlay--echo"
      viewBox={`0 0 ${area.viewBox.width} ${area.viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {selected && (
        <g className="tms-highlight" pointerEvents="none">
          <path className="tms-highlight__casing" d={selected.hitPath} />
          <path className="tms-highlight__outline" d={selected.hitPath} />
        </g>
      )}
      {(marked || revealed) && (
        <g className="tms-highlight" pointerEvents="none">
          <path className="tms-highlight__casing" d={(revealed ?? marked)!.hitPath} />
          <path className="tms-highlight__outline" d={(revealed ?? marked)!.hitPath} />
        </g>
      )}
    </svg>
  );

  /* ---------------------------- הרכבת השכבות ---------------------------- */

  const pct = Math.round(blend * 100);

  const body =
    compareMode === 'split' ? (
      /* שני חלונות מסונכרנים. שניהם מקבלים את אותו transform ומציגים בדיוק
         את אותו קטע שטח, ולכן ההשוואה היא בין השכבות ולא בין שני מקומות. */
      <div className="tms-map__split">
        <div className="tms-map__pane">
          <div className="tms-map__world" style={worldStyle}>
            <LayerImage area={area} name={topLayer} state={layers} />
            {echoOverlay}
          </div>
          <span className="tms-map__pane-tag">{LAYER_TAG[topLayer]}</span>
        </div>
        <div className="tms-map__pane">
          <div className="tms-map__world" style={worldStyle}>
            <LayerImage area={area} name={baseLayer} state={layers} priority />
            {featureOverlay}
          </div>
          <span className="tms-map__pane-tag">{LAYER_TAG[baseLayer]}</span>
        </div>
      </div>
    ) : (
      <>
        <div className="tms-map__stack">
          <div className="tms-map__world" style={worldStyle}>
            <LayerImage area={area} name={baseLayer} state={layers} priority />
          </div>
        </div>
        <div
          className="tms-map__stack"
          style={
            compareMode === 'wipe' ? { clipPath: `inset(0 ${100 - pct}% 0 0)` } : { opacity: blend }
          }
        >
          <div className="tms-map__world" style={worldStyle}>
            <LayerImage area={area} name={topLayer} state={layers} />
          </div>
        </div>
        <div className="tms-map__world" style={worldStyle}>
          {featureOverlay}
        </div>
      </>
    );

  return (
    <div
      className={
        'tms-map__viewport' +
        (quiz?.picking ? ' tms-map__viewport--picking' : '') +
        ` tms-map__viewport--${compareMode}`
      }
      ref={viewportRef}
      {...pointerHandlers}
    >
      {body}

      <LayerStatus area={area} state={layers} />

      {compareMode === 'wipe' && (
        <WipeHandle
          value={blend}
          leftLabel={LAYER_TAG[topLayer]}
          rightLabel={LAYER_TAG[baseLayer]}
          onChange={onWipe}
        />
      )}

      {/* ריהוט המפה — אינו זז ואינו גדל עם הזום */}
      <svg
        className="tms-map__furniture"
        viewBox={`0 0 ${area.viewBox.width} ${area.viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <g className="tms-north" transform="translate(56, 62)">
          <circle className="tms-north__bg" cx="0" cy="-6" r="30" />
          <path className="tms-north__arrow" d="M0,-28 L8,2 L0,-5 L-8,2 Z" />
          <text className="tms-north__label" x="0" y="22" textAnchor="middle">
            צ
          </text>
        </g>
        <ScaleBar area={area} k={zoom.k} />
      </svg>

      {loupeAt && (
        <Loupe
          area={area}
          at={loupeAt}
          size={viewportSize}
          k={zoom.k}
          offset={{ x: zoom.x, y: zoom.y }}
        />
      )}
    </div>
  );
}

const LAYER_TAG: Record<LayerName, string> = {
  aerial: 'תצ״א',
  topo: 'מפה',
  hillshade: 'הצללה',
};

/**
 * WipeHandle — ידית הווילון.
 *
 * הווילון נבחר כברירת מחדל מפני שהשקיפות היא הגרועה שבמצבים באמצע הטווח:
 * ב-50% שתי השכבות בוציות ואף אחת מהן אינה קריאה. כאן שתי השכבות חדות ב-100%,
 * וההשוואה מקומית ומדויקת — העין משווה שני צדדים של קו אחד.
 *
 * הידית עצמה אינה מקבלת פוקוס: הפעולה כבר נגישה במלואה דרך מחוון הטווח שבסרגל
 * הפקדים, ושתי נקודות עצירה לאותו ערך רק מכפילות את מסלול המקלדת.
 */
function WipeHandle({
  value,
  leftLabel,
  rightLabel,
  onChange,
}: {
  value: number;
  leftLabel: string;
  rightLabel: string;
  onChange: (v: number) => void;
}) {
  const drag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const host = e.currentTarget.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const move = (ev: PointerEvent) =>
      onChange(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e.nativeEvent);
  };

  return (
    <div
      className="tms-wipe"
      style={{ left: `${value * 100}%` }}
      onPointerDown={drag}
      aria-hidden="true"
    >
      <span className="tms-wipe__line" />
      <span className="tms-wipe__grip">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M9 6 L4 12 L9 18 M15 6 L20 12 L15 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="tms-wipe__tag tms-wipe__tag--start">{leftLabel}</span>
      <span className="tms-wipe__tag tms-wipe__tag--end">{rightLabel}</span>
    </div>
  );
}

const NICE_BARS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

/**
 * ScaleBar — סרגל קנה המידה.
 *
 * שני תיקונים: התווית יושבת **מעל** הסרגל (בעיגון לצדו היא נשפכה שמאלה
 * בכיוון RTL וכיסתה את הסרגל), והמרחק שהיא מציינת מתעדכן עם הזום — סרגל
 * קבוע היה משקר ברגע שהלומד מתקרב.
 */
function ScaleBar({ area, k }: { area: TerrainArea; k: number }) {
  const target = area.scaleBarM / k;
  const meters = NICE_BARS.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  const units = Math.round((meters / area.groundWidthM) * area.viewBox.width * k);
  const label = meters >= 1000 ? `${meters / 1000} ק״מ` : `${meters} מ׳`;
  return (
    <g className="tms-scale" transform="translate(40, 946)">
      <rect className="tms-scale__bg" x="-10" y="-34" width={units + 20} height="46" rx="6" />
      <text className="tms-scale__label" x="0" y="-16" textAnchor="start">
        {label}
      </text>
      <rect className="tms-scale__bar" x="0" y="-4" width={units} height="8" />
      <rect className="tms-scale__seg" x="0" y="-4" width={units / 2} height="8" />
    </g>
  );
}

/**
 * FeatureLabel — תווית השם של הצורה הנבחרת.
 *
 * הרוחב נמדד ולא מוערך לפי `text.length`: אות עברית רחבה מאות לטינית, וגם
 * ההערכה הקודמת (`length * 15`) הייתה מייצרת תיבה צרה מדי לשמות ארוכים.
 */
function FeatureLabel({
  x,
  y,
  text,
  scale,
}: {
  x: number;
  y: number;
  text: string;
  scale: number;
}) {
  const width = useMemo(
    () => Math.max(72, measureText(text, "700 22px 'Rubik', sans-serif") + 34),
    [text],
  );
  return (
    <g className="tms-callout" pointerEvents="none">
      <circle className="tms-callout__dot" cx={x} cy={y} r={4.5 * scale} />
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <line className="tms-callout__leader" x1="0" y1="0" x2="0" y2="-26" />
        <g transform="translate(0, -45)">
          <rect
            x={-width / 2}
            y={-18}
            width={width}
            height={36}
            rx={9}
            className="tms-callout__bg"
          />
          <text x={0} y={7} textAnchor="middle" className="tms-callout__text">
            {text}
          </text>
        </g>
      </g>
    </g>
  );
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** מדידת רוחב טקסט אמיתית, עם נפילה חיננית ל-SSR ולסביבת בדיקות ללא canvas. */
function measureText(text: string, font: string): number {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) return text.length * 13;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
