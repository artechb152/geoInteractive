import { useEffect, useState, type CSSProperties } from 'react';
import type { ImageLayer, TerrainArea } from '../../data/types';
import { useLatestRef } from './hooks/useLatestRef';

export type LayerName = 'aerial' | 'topo' | 'hillshade';

const SIZES = '(max-width: 900px) 100vw, 860px';

/** תיאור מוקרא לכל שכבה. שכבה בלי טקסט חלופי אמיתי אינה קיימת לקורא מסך. */
export function layerAlt(area: TerrainArea, name: LayerName): string {
  if (name === 'aerial') return `תצלום אוויר אנכי של ${area.name}`;
  if (name === 'hillshade')
    return `הצללת תבליט של ${area.name} — התבליט כפי שהוא נראה באור מצפון-מערב`;
  return `מפה טופוגרפית של ${area.name}, עם קווי גובה כל ${area.stats.interval} מטרים`;
}

export interface LayersState {
  ready: boolean;
  anyFailed: boolean;
  slow: boolean;
  attempt: number;
  retry: () => void;
  markLoaded: (name: LayerName) => void;
  markFailed: (name: LayerName) => void;
}

/**
 * useMapLayers — מצב הטעינה של השכבות שהמצב הנוכחי באמת צריך.
 *
 * הספירה היא על **כל** השכבות הפעילות ולא על אחת: מעקב אחרי התצ״א בלבד הסתיר
 * את השלד בזמן שהמפה עוד הייתה בדרך. הרשימה דינמית כי מצב "הצללה" מגיש
 * שכבה שמצב "וילון" אינו נוגע בה, ואין טעם להמתין לשכבה שאינה מוצגת.
 */
export function useMapLayers(
  area: TerrainArea,
  names: LayerName[],
  onStatus?: (status: 'loading' | 'ready' | 'error') => void,
): LayersState {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  const [slowElapsed, setSlowElapsed] = useState(false);

  const key = (n: LayerName) => `${area.id}:${n}`;
  const ready = names.every((n) => loaded[key(n)]);
  const anyFailed = names.some((n) => failed[key(n)]);

  const statusRef = useLatestRef(onStatus);
  useEffect(() => {
    statusRef.current?.(anyFailed ? 'error' : ready ? 'ready' : 'loading');
  }, [anyFailed, ready, statusRef]);

  /**
   * התראה על טעינה איטית — עדיף מסך שמסביר על פני שלד מהבהב לנצח.
   *
   * האפקט קובע רק ש**חלף** הזמן; האם להציג את ההודעה נגזר בזמן רינדור.
   * איפוס המצב בתוך האפקט עצמו הוא עדכון שגורר רינדור נוסף מיד אחרי
   * שהשכבות נטענו — בדיוק מה שכלל `react-hooks/set-state-in-effect` מסמן.
   */
  useEffect(() => {
    setSlowElapsed(false);
    const t = window.setTimeout(() => setSlowElapsed(true), 8000);
    return () => window.clearTimeout(t);
  }, [area.id, attempt]);

  const slow = slowElapsed && !ready && !anyFailed;

  return {
    ready,
    anyFailed,
    slow,
    attempt,
    retry: () => {
      setFailed({});
      setLoaded({});
      setAttempt((n) => n + 1);
    },
    markLoaded: (n) => setLoaded((s) => ({ ...s, [key(n)]: true })),
    markFailed: (n) => setFailed((s) => ({ ...s, [key(n)]: true })),
  };
}

interface LayerImageProps {
  area: TerrainArea;
  name: LayerName;
  state: LayersState;
  /** true עבור השכבה שנטענת ראשונה — היא ה-LCP של הרכיב. */
  priority?: boolean;
  style?: CSSProperties;
}

/** שכבת תמונה אחת: AVIF/WebP עם srcset, ו-fallback יחיד לדפדפנים ישנים. */
export function LayerImage({ area, name, state, priority, style }: LayerImageProps) {
  const data: ImageLayer | undefined = area.layers[name];
  if (!data) return null;
  return (
    <picture key={`${area.id}:${name}:${state.attempt}`}>
      <source type="image/avif" srcSet={data.avif} sizes={SIZES} />
      <source type="image/webp" srcSet={data.webp} sizes={SIZES} />
      <img
        className="tms-map__img"
        src={data.fallback}
        alt={layerAlt(area, name)}
        draggable={false}
        decoding="async"
        width={data.width}
        height={data.width}
        /**
         * `fetchpriority` בכתיב קטן ולא `fetchPriority`: React 18 אינו מכיר את
         * הצורה ה-camelCase, זורק אזהרה, ו**אינו כותב את התכונה בכלל**. כלומר
         * רמז ה-LCP שכביכול קיים מאז אופטימיזציית הנכסים מעולם לא הגיע לדפדפן.
         */
        {...({ fetchpriority: priority ? 'high' : 'auto' } as Record<string, string>)}
        style={style}
        onLoad={() => state.markLoaded(name)}
        onError={() => state.markFailed(name)}
      />
    </picture>
  );
}

/** שלד הטעינה, הודעת האיטיות ומסך השגיאה — הכול מחוץ לאזור המותמר. */
export function LayerStatus({ area, state }: { area: TerrainArea; state: LayersState }) {
  if (state.anyFailed) {
    return (
      <div className="tms-map__error" role="alert">
        <p>לא הצלחנו לטעון את שכבות המפה של {area.name}.</p>
        <small>ייתכן שאין חיבור לרשת, או שהנכסים לא הועלו לשרת הקורס.</small>
        <button type="button" className="tms-btn tms-btn--primary" onClick={state.retry}>
          נסו שוב
        </button>
      </div>
    );
  }
  if (state.ready) return null;
  return (
    <>
      <img className="tms-map__lqip" src={area.layers.aerial.lqip} alt="" aria-hidden="true" />
      <div className="tms-map__skeleton" aria-hidden="true" />
      {state.slow && (
        <p className="tms-map__error" role="status" style={{ background: 'transparent' }}>
          <span>הטעינה איטית מהרגיל — ממשיכים לנסות…</span>
        </p>
      )}
    </>
  );
}
