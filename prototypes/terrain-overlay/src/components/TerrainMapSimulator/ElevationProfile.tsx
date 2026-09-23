import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point, TerrainArea, TerrainFeature } from '../../data/types';
import { useI18n } from '../../i18n';
import { useLatestRef } from './hooks/useLatestRef';
import {
  loadElevation,
  niceRange,
  pathCenter,
  sampleLine,
  typicalCut,
  type ElevationGrid,
  type ProfileResult,
} from './lib/elevation';

export interface ProfileLine {
  a: Point;
  b: Point;
  /** true כשהקו נגזר מהצורה הנבחרת ולא צויר ביד. */
  automatic?: boolean;
}

interface ElevationProfileProps {
  area: TerrainArea;
  line: ProfileLine;
  feature?: TerrainFeature;
  /** אינדקס הדגימה שמסומן במפה (ריחוף על הגרף). */
  markerIndex: number | null;
  onMarker: (index: number | null) => void;
  onClose: () => void;
  onResult: (result: ProfileResult | null) => void;
}

const W = 640;
const H = 150;
const PAD = { top: 12, right: 14, bottom: 24, left: 46 };

/**
 * ElevationProfile — גרף חתך הגובה לאורך קו על המפה.
 *
 * הקישור הדו-כיווני הוא העיקר: ריחוף על הגרף מסמן את הנקודה במפה, וריחוף
 * על המפה מזיז את הסמן בגרף. בלעדיו הגרף הוא תמונה נוספת שהלומד צריך
 * לתרגם בעצמו — כלומר בדיוק הבעיה שהוא בא לפתור.
 */
export default function ElevationProfile({
  area,
  line,
  feature,
  markerIndex,
  onMarker,
  onClose,
  onResult,
}: ElevationProfileProps) {
  const t = useI18n();
  const [grid, setGrid] = useState<ElevationGrid | null>(null);
  const [failed, setFailed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let live = true;
    loadElevation(area.id).then((g) => {
      if (!live) return;
      if (g) setGrid(g);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [area.id]);

  const result = useMemo(
    () => (grid ? sampleLine(grid, line.a, line.b) : null),
    [grid, line.a, line.b],
  );

  const resultRef = useLatestRef(onResult);
  useEffect(() => {
    resultRef.current(result);
  }, [result, resultRef]);

  const geometry = useMemo(() => {
    if (!result) return null;
    const [lo, hi] = niceRange(result.min, result.max);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const xOf = (d: number) => PAD.left + (result.lengthM ? d / result.lengthM : 0) * innerW;
    const yOf = (e: number) => PAD.top + (1 - (e - lo) / (hi - lo || 1)) * innerH;
    const path = result.samples
      .map((s, i) => `${i ? 'L' : 'M'}${xOf(s.d).toFixed(1)},${yOf(s.elev).toFixed(1)}`)
      .join(' ');
    return {
      lo,
      hi,
      xOf,
      yOf,
      path,
      fill: `${path} L${xOf(result.lengthM).toFixed(1)},${H - PAD.bottom} L${PAD.left},${H - PAD.bottom} Z`,
      ticks: [lo, (lo + hi) / 2, hi],
    };
  }, [result]);

  const pick = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || !result || !geometry) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.left) / (W - PAD.left - PAD.right);
    const i = Math.round(ratio * (result.samples.length - 1));
    onMarker(i >= 0 && i < result.samples.length ? i : null);
  };

  const marker = result && markerIndex !== null ? result.samples[markerIndex] : null;

  return (
    <section className="tms-profile" aria-label={t.profileTitle}>
      <header className="tms-profile__head">
        <h3 className="tms-profile__title">
          {t.profileTitle}
          {feature && line.automatic ? ` — ${feature.name}` : ''}
        </h3>
        <p className="tms-profile__meta">
          {result ? (
            <>
              <span dir="ltr">{t.profileLength(Math.round(result.lengthM))}</span>
              {' · '}
              <span dir="ltr">
                {t.profileRange(Math.round(result.min), Math.round(result.max))}
              </span>
            </>
          ) : failed ? (
            'אין נתוני גובה לאזור הזה.'
          ) : (
            '…'
          )}
        </p>
        <button type="button" className="tms-btn tms-btn--sm tms-tap" onClick={onClose}>
          {t.profileClear}
        </button>
      </header>

      {geometry && result && (
        <svg
          ref={svgRef}
          className="tms-profile__chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={describe(result, feature)}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => onMarker(null)}
        >
          {geometry.ticks.map((v) => (
            <g key={v}>
              <line
                className="tms-profile__grid"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={geometry.yOf(v)}
                y2={geometry.yOf(v)}
              />
              <text
                className="tms-profile__tick"
                x={PAD.left - 6}
                y={geometry.yOf(v) + 4}
                textAnchor="end"
                direction="ltr"
              >
                {Math.round(v)}
              </text>
            </g>
          ))}

          <path className="tms-profile__fill" d={geometry.fill} />
          <path className="tms-profile__line" d={geometry.path} />

          {marker && (
            <g className="tms-profile__marker">
              <line
                x1={geometry.xOf(marker.d)}
                x2={geometry.xOf(marker.d)}
                y1={PAD.top}
                y2={H - PAD.bottom}
              />
              <circle cx={geometry.xOf(marker.d)} cy={geometry.yOf(marker.elev)} r={4.5} />
              <text x={geometry.xOf(marker.d)} y={PAD.top + 11} textAnchor="middle" direction="ltr">
                {Math.round(marker.elev)} מ׳
              </text>
            </g>
          )}

          {/* קצוות החתך — בלעדיהם אי אפשר לדעת איזה צד בגרף הוא איזה צד במפה */}
          <text className="tms-profile__end" x={PAD.left} y={H - 6} textAnchor="start">
            ‏א
          </text>
          <text className="tms-profile__end" x={W - PAD.right} y={H - 6} textAnchor="end">
            ‏ב
          </text>
        </svg>
      )}
    </section>
  );
}

function describe(result: ProfileResult, feature?: TerrainFeature): string {
  const rise = Math.round(result.max - result.min);
  const shape =
    result.samples[0].elev > result.samples[result.samples.length - 1].elev
      ? 'יורד משמאל לימין'
      : 'עולה משמאל לימין';
  return (
    `חתך גובה${feature ? ` דרך ${feature.name}` : ''} באורך ${Math.round(result.lengthM)} מטרים. ` +
    `הגובה נע בין ${Math.round(result.min)} ל-${Math.round(result.max)} מטרים, הפרש של ${rise} מטרים. ` +
    `החתך ${shape}.`
  );
}

/** חתך ברירת המחדל של צורה — בניצב לציר שלה. */
export function cutForFeature(feature: TerrainFeature): ProfileLine {
  const center = pathCenter(feature.hitPath, feature.labelPoint);
  const [a, b] = typicalCut(feature.hitPath, center);
  return { a, b, automatic: true };
}
