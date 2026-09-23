import { useEffect, useMemo, useRef } from 'react';
import type { TerrainArea } from '../../data/types';
import ContourSignature from './ContourSignature';

interface CrossAreaCompareProps {
  areas: TerrainArea[];
  featureId: string;
  activeAreaId: string;
  onClose: () => void;
  onGoToArea: (areaId: string) => void;
}

/**
 * CrossAreaCompare — "אותה צורה, שטח אחר".
 *
 * זהו כלי ההכללה: אוכף בגלבוע, אוכף במירון ואוכף בגולן נראים שונה לגמרי
 * בתצ״א, אבל נושאים את אותה חתימת קווי גובה בדיוק. הצגתם זה לצד זה היא מה
 * שהופך זיהוי של מקרה בודד ליכולת שמועברת לשטח לא מוכר.
 */
export default function CrossAreaCompare({
  areas,
  featureId,
  activeAreaId,
  onClose,
  onGoToArea,
}: CrossAreaCompareProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const matches = useMemo(
    () =>
      areas
        .map((area) => ({ area, feature: area.features.find((f) => f.id === featureId) }))
        .filter((m): m is { area: TerrainArea; feature: NonNullable<typeof m.feature> } =>
          Boolean(m.feature),
        )
        // האזור הפעיל ראשון — ממנו הלומד הגיע
        .sort((a, b) =>
          a.area.id === activeAreaId
            ? -1
            : b.area.id === activeAreaId
              ? 1
              : a.area.order - b.area.order,
        )
        .slice(0, 6),
    [areas, featureId, activeAreaId],
  );

  const name = matches[0]?.feature.name ?? 'הצורה';

  return (
    <div
      className="tms-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} בשטחים שונים`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tms-sheet__panel tms-compare-areas">
        <div className="tms-sheet__head">
          <h2 className="tms-sheet__title">{name} — אותה צורה, שטח אחר</h2>
          <button type="button" ref={closeRef} className="tms-btn tms-btn--sm" onClick={onClose}>
            סגירה
          </button>
        </div>

        {matches.length < 2 ? (
          <p>הצורה הזו קיימת כרגע רק באזור אחד, ולכן אין מה להשוות.</p>
        ) : (
          <>
            <p style={{ marginTop: 0, fontSize: 'var(--tms-fs-sm)', color: 'var(--tms-ink-soft)' }}>
              שלושת השטחים נראים שונה לגמרי, אבל חתימת קווי הגובה זהה. זו החתימה שמזהים בשטח לא
              מוכר:
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 'var(--tms-sp-3)',
              }}
            >
              <ContourSignature
                kind={matches[0].feature.signature}
                label={`חתימת קווי הגובה של ${name}`}
              />
            </div>
            <div className="tms-compare-areas__grid">
              {matches.map(({ area, feature }) => (
                <div className="tms-compare-areas__cell" key={area.id}>
                  <figure>
                    <div className="tms-compare-areas__frame">
                      <img src={area.thumbnail} alt="" aria-hidden="true" loading="lazy" />
                      <svg viewBox="0 0 1000 1000" aria-hidden="true">
                        <path className="tms-all__casing" d={feature.hitPath} />
                        <path className="tms-all__outline" d={feature.hitPath} />
                        {feature.accentPaths?.map((d, i) => (
                          <path key={i} className="tms-all__outline" d={d} fill="none" />
                        ))}
                      </svg>
                    </div>
                    <figcaption className="tms-compare-areas__cap">
                      <b>{area.name}</b>
                      {feature.elevation !== undefined ? `${feature.elevation} מ׳ · ` : ''}
                      הפרש גובה {area.stats.interval} מ׳
                    </figcaption>
                  </figure>
                  {area.id !== activeAreaId && (
                    <button
                      type="button"
                      className="tms-btn tms-btn--sm"
                      style={{ marginTop: 'var(--tms-sp-1)' }}
                      onClick={() => onGoToArea(area.id)}
                    >
                      פתחו אזור זה
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
