import { useRef } from 'react';
import type { AreaDifficulty, TerrainArea } from '../../data/types';

interface AreaPickerProps {
  areas: TerrainArea[];
  activeId: string;
  onSelect: (id: string) => void;
}

const LEVEL: Record<AreaDifficulty, { pips: number; label: string }> = {
  easy: { pips: 1, label: 'קל' },
  medium: { pips: 2, label: 'בינוני' },
  hard: { pips: 3, label: 'קשה' },
};

/**
 * AreaPicker — בורר אזור הלימוד.
 *
 * מגוון אזורים הוא כל העניין: לומד שרואה את אותו רכס שוב ושוב משנן תמונה
 * במקום לרכוש יכולת זיהוי בשטח לא מוכר. לכן הבורר מציג לכל אזור גם את סוג
 * השטח, גם את רמת הקושי וגם מה הוא מלמד — ולא רק שם.
 */
export default function AreaPicker({ areas, activeId, onSelect }: AreaPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(
    0,
    areas.findIndex((a) => a.id === activeId),
  );

  const focusAt = (i: number) => {
    const n = areas.length;
    const idx = ((i % n) + n) % n;
    refs.current[idx]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    // RTL: חץ ימינה = הקודם, חץ שמאלה = הבא
    const map: Record<string, number> = {
      ArrowRight: i - 1,
      ArrowLeft: i + 1,
      Home: 0,
      End: areas.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    focusAt(map[e.key]);
  };

  return (
    <nav className="tms-areas" aria-label="בחירת אזור לימוד">
      <div className="tms-areas__list" role="tablist" aria-label="אזורי לימוד">
        {areas.map((area, i) => {
          const level = LEVEL[area.difficulty];
          const selected = area.id === activeId;
          return (
            <button
              key={area.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={i === activeIndex ? 0 : -1}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="tms-areas__item"
              onClick={() => onSelect(area.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <img
                className="tms-areas__thumb"
                src={area.thumbnail}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
              />
              <span className="tms-areas__name">{area.name}</span>
              <span className="tms-areas__meta">
                <span>{area.region}</span>
                <span className="tms-areas__level">
                  <span className="tms-sr-only">רמת קושי: {level.label}</span>
                  {[0, 1, 2].map((p) => (
                    <i
                      key={p}
                      aria-hidden="true"
                      className={'tms-areas__pip' + (p < level.pips ? ' tms-areas__pip--on' : '')}
                    />
                  ))}
                </span>
              </span>
              <span className="tms-areas__teaches">{area.teaches}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
