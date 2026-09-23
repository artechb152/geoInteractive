import { useEffect, useRef } from 'react';
import type { TerrainArea } from '../../../data/types';
import { PASS_PERCENT, summarize, type QuizState } from './quizEngine';

interface QuizSummaryProps {
  state: QuizState;
  area: TerrainArea;
  onRetryMissed: () => void;
  onRestart: () => void;
  onClose: () => void;
  onPrint: () => void;
}

/**
 * QuizSummary — מסך הסיכום.
 *
 * מציג לא רק ציון אלא **מה** לתקן: אילו צורות נפלו, וכפתור שמתחיל סבב חוזר
 * רק עליהן. ציון בלי הפירוט הזה אינו ניתן לפעולה.
 */
export default function QuizSummary({
  state,
  area,
  onRetryMissed,
  onRestart,
  onClose,
  onPrint,
}: QuizSummaryProps) {
  const s = summarize(state);
  const passed = s.percent >= PASS_PERCENT;
  const focusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    focusRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="tms-sheet" role="dialog" aria-modal="true" aria-label="סיכום התרגול">
      <div className="tms-sheet__panel tms-summary">
        <div className="tms-sheet__head">
          <h2 className="tms-sheet__title">סיכום התרגול — {area.name}</h2>
          <button type="button" ref={focusRef} className="tms-btn tms-btn--sm" onClick={onClose}>
            סגירה
          </button>
        </div>

        <p className="tms-summary__score">
          <span className="tms-summary__points">{s.score}</span>
          <span>
            נקודות · {s.correct} מתוך {s.total} תשובות נכונות ({s.percent}%) · רצף שיא{' '}
            {s.bestStreak}
          </span>
        </p>
        <p style={{ marginTop: 0, color: passed ? 'var(--tms-ok)' : 'var(--tms-warn)' }}>
          {passed
            ? `עברתם את סף ה-${PASS_PERCENT}%. אתם מזהים את הצורות באזור הזה — נסו אזור בדרגת קושי גבוהה יותר.`
            : `סף המעבר הוא ${PASS_PERCENT}%. חזרו על הצורות שנפלו ונסו שוב — זו בדיוק הנקודה שבה נרכשת ההבחנה.`}
        </p>

        <ul className="tms-summary__list">
          {area.features
            .filter((f) => s.byFeature.has(f.id))
            .map((f) => {
              const rec = s.byFeature.get(f.id)!;
              const miss = rec.wrong > 0;
              return (
                <li
                  key={f.id}
                  className={
                    'tms-summary__row ' +
                    (miss ? 'tms-summary__row--miss' : 'tms-summary__row--hit')
                  }
                >
                  <span className="tms-summary__mark" aria-hidden="true">
                    {miss ? '✗' : '✓'}
                  </span>
                  <span>{f.name}</span>
                  <span style={{ marginInlineStart: 'auto' }}>
                    {rec.right} נכון · {rec.wrong} שגוי
                  </span>
                </li>
              );
            })}
        </ul>

        <div className="tms-quiz__actions" style={{ marginTop: 'var(--tms-sp-4)' }}>
          {s.missed.length > 0 && (
            <button type="button" className="tms-btn tms-btn--primary" onClick={onRetryMissed}>
              תרגלו שוב את מה שפספסתי ({s.missed.length})
            </button>
          )}
          <button type="button" className="tms-btn" onClick={onRestart}>
            סבב חדש
          </button>
          <button type="button" className="tms-btn" onClick={onPrint}>
            הדפסה / שמירה כ-PDF
          </button>
        </div>
      </div>
    </div>
  );
}
