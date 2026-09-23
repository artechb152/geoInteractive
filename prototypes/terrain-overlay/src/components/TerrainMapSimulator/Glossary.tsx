import { useEffect, useMemo, useRef } from 'react';
import type { TerrainArea } from '../../data/types';
import { GLOSSARY } from '../../data/content';
import { areaVars, fillTemplate, segmentWithTerms } from './lib/text';

/* --------------------------- טקסט עם מונחים --------------------------- */

interface TermTextProps {
  children: string;
  area: TerrainArea;
  onOpenTerm: (id: string) => void;
  /** כבה כשהטקסט קצר או כשהקישורים יתחרו בתוכן (למשל בכותרת). */
  enabled?: boolean;
}

/**
 * TermText — טקסט רגיל שבו מונחים מקצועיים הופכים לחיצים.
 * הלומד נתקל ב"קו מדד" או ב"הפרש גובה" בתוך המשפט שבו הם רלוונטיים, ולא
 * צריך לעזוב את המפה כדי לברר מה הם.
 */
export function TermText({ children, area, onOpenTerm, enabled = true }: TermTextProps) {
  const vars = useMemo(() => areaVars(area), [area]);
  const segments = useMemo(
    () => (enabled ? segmentWithTerms(children, GLOSSARY) : [{ text: children }]),
    [children, enabled],
  );
  return (
    <>
      {segments.map((seg, i) =>
        seg.termId ? (
          <button
            key={i}
            type="button"
            className="tms-term"
            onClick={() => onOpenTerm(seg.termId!)}
            aria-label={`${seg.text} — הצג הסבר`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{fillTemplate(seg.text, vars)}</span>
        ),
      )}
    </>
  );
}

/* ------------------------------ המילון ------------------------------ */

interface GlossarySheetProps {
  area: TerrainArea;
  /** מונח שיש לגלול אליו בפתיחה. */
  focusId?: string | null;
  onClose: () => void;
}

export function GlossarySheet({ area, focusId, onClose }: GlossarySheetProps) {
  const vars = useMemo(() => areaVars(area), [area]);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!focusId) return;
    panelRef.current?.querySelector(`#tms-term-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  return (
    <div
      className="tms-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="מילון מונחים"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tms-sheet__panel" ref={panelRef}>
        <div className="tms-sheet__head">
          <h2 className="tms-sheet__title">מילון מונחים</h2>
          <button type="button" ref={closeRef} className="tms-btn tms-btn--sm" onClick={onClose}>
            סגירה
          </button>
        </div>
        <dl>
          {GLOSSARY.map((t) => (
            <div key={t.id} id={`tms-term-${t.id}`}>
              <dt style={focusId === t.id ? { color: 'var(--tms-accent)' } : undefined}>
                {t.term}
              </dt>
              <dd>{fillTemplate(t.definition, vars)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
