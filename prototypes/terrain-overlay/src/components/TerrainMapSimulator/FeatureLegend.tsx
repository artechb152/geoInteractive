import { useMemo, useRef } from 'react';
import type { SelectedFeatureId, TerrainFeature } from '../../data/types';
import { FAMILIES, FAMILY_ORDER } from '../../data/content';
import ContourSignature from './ContourSignature';

interface FeatureLegendProps {
  features: TerrainFeature[];
  selectedId: SelectedFeatureId;
  seenIds: string[];
  /** במצב תרגול המקרא הופך לרשימת התשובות האפשריות. */
  answerMode?: boolean;
  disabledIds?: string[];
  onSelect: (id: string) => void;
  onPreview: (id: SelectedFeatureId) => void;
  onClear: () => void;
}

/**
 * FeatureLegend — אינדקס הצורות.
 *
 * שלושה שינויים שהופכים אותו מרשימת שבבים אחידה לכלי לימודי: אייקון חתימת
 * הקונטור מלמד את הדפוס עוד לפני הלחיצה, הקיבוץ למשפחות מלמד את היחס בין
 * הצורות, וסימון ה"נצפו" מראה ללומד מה נשאר. הכפתורים הם `<button>` אמיתיים
 * עם roving tabindex, ולכן זהו גם מסלול מקלדת מלא.
 */
export default function FeatureLegend({
  features,
  selectedId,
  seenIds,
  answerMode = false,
  disabledIds = [],
  onSelect,
  onPreview,
  onClear,
}: FeatureLegendProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const groups = useMemo(() => {
    const byFamily = new Map<string, TerrainFeature[]>();
    for (const f of features) {
      const list = byFamily.get(f.family) ?? [];
      list.push(f);
      byFamily.set(f.family, list);
    }
    const ordered: { family: string; items: TerrainFeature[] }[] = [];
    for (const fam of FAMILY_ORDER) {
      const items = byFamily.get(fam);
      if (items?.length) ordered.push({ family: fam, items });
    }
    // משפחה שאינה ברשימת הסדר (למשל צורה חדשה) לא תיעלם מהמקרא
    for (const [fam, items] of byFamily) {
      if (!FAMILY_ORDER.includes(fam as never)) ordered.push({ family: fam, items });
    }
    return ordered;
  }, [features]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = Math.max(
    0,
    flat.findIndex((f) => f.id === selectedId),
  );

  const focusAt = (i: number) => {
    const n = flat.length;
    const idx = ((i % n) + n) % n;
    refs.current[idx]?.focus();
    onPreview(flat[idx].id);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    // RTL: חץ ימינה = הקודם, חץ שמאלה = הבא
    const map: Record<string, number> = {
      ArrowRight: i - 1,
      ArrowUp: i - 1,
      ArrowLeft: i + 1,
      ArrowDown: i + 1,
      Home: 0,
      End: flat.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    focusAt(map[e.key]);
  };

  const seenCount = features.filter((f) => seenIds.includes(f.id)).length;
  const pct = features.length ? Math.round((seenCount / features.length) * 100) : 0;

  return (
    <section
      className="tms-legend"
      aria-label={answerMode ? 'תשובות אפשריות' : 'מקרא צורות השטח'}
      onMouseLeave={() => onPreview(null)}
    >
      <div className="tms-legend__top">
        <p className="tms-legend__progress">
          {answerMode ? (
            <span>בחרו את הצורה הנכונה:</span>
          ) : (
            <>
              <span>
                נצפו {seenCount} מתוך {features.length} צורות
              </span>
              <span className="tms-legend__meter" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
            </>
          )}
        </p>
        {/* ביטול בחירה היה אפשרי רק ב-Esc או בלחיצה חוזרת — שתי פעולות סמויות */}
        {selectedId && !answerMode && (
          <button type="button" className="tms-btn tms-btn--sm tms-btn--quiet" onClick={onClear}>
            נקו בחירה
          </button>
        )}
      </div>

      {groups.map((group) => {
        const info = FAMILIES[group.family as keyof typeof FAMILIES];
        return (
          <div className="tms-legend__family" key={group.family}>
            <h3 className="tms-legend__family-name" title={info?.description}>
              {info?.name ?? group.family}
            </h3>
            <div className="tms-legend__chips" role="group" aria-label={info?.name}>
              {group.items.map((feature) => {
                const i = flat.indexOf(feature);
                const isSelected = feature.id === selectedId;
                const seen = seenIds.includes(feature.id);
                return (
                  <button
                    key={feature.id}
                    type="button"
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    data-id={feature.id}
                    className={'tms-legend__chip' + (isSelected ? ' tms-legend__chip--active' : '')}
                    tabIndex={i === activeIndex ? 0 : -1}
                    aria-pressed={answerMode ? undefined : isSelected}
                    disabled={disabledIds.includes(feature.id)}
                    onClick={() => onSelect(feature.id)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    onMouseEnter={() => onPreview(feature.id)}
                    onFocus={() => onPreview(feature.id)}
                    onBlur={() => onPreview(null)}
                  >
                    <ContourSignature kind={feature.signature} compact />
                    {feature.name}
                    {seen && !answerMode && (
                      <span className="tms-legend__seen" aria-label="נצפתה">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
