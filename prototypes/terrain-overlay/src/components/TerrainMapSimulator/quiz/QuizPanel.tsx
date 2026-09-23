import type { TerrainFeature } from '../../../data/types';
import ContourSignature from '../ContourSignature';
import type { QuizQuestion, QuizState } from './quizEngine';

interface QuizPanelProps {
  state: QuizState;
  question: QuizQuestion;
  features: TerrainFeature[];
  phase: 'asking' | 'feedback';
  chosenId: string | null;
  nudge: string | null;
  hint: string | null;
  seconds: number;
  onAnswer: (featureId: string) => void;
  onHint: () => void;
  onNext: () => void;
  onExit: () => void;
}

const byId = (features: TerrainFeature[], id: string | null | undefined) =>
  features.find((f) => f.id === id);

/**
 * QuizPanel — ראש מסך התרגול: השאלה, הניקוד, הרמז והמשוב.
 *
 * המשוב ניתן **גם בתשובה נכונה**: "צדקת" בלי הסבר משאיר את הלומד עם ניחוש
 * מוצלח במקום עם כלל זיהוי. בתשובה שגויה מוצג משפט ההבחנה בין הצורה
 * שנבחרה לבין הנכונה — שם נמצאת הטעות האמיתית.
 */
export default function QuizPanel({
  state,
  question,
  features,
  phase,
  chosenId,
  nudge,
  hint,
  seconds,
  onAnswer,
  onHint,
  onNext,
  onExit,
}: QuizPanelProps) {
  const target = byId(features, question.featureId);
  const chosen = byId(features, chosenId);
  const correct = phase === 'feedback' && chosenId === question.featureId;
  const answered = state.answers.length;

  const explain = () => {
    if (!target) return '';
    if (correct) return `${target.mapExplanation} ${target.whyItMatters}`;
    if (chosen && (chosen.id === target.confusedWith || target.id === chosen.confusedWith)) {
      return target.contrastNote ?? `${target.name}: ${target.mapExplanation}`;
    }
    if (chosen) {
      return `${chosen.name} — ${chosen.mapExplanation} לעומת זאת ${target.name} — ${target.mapExplanation}`;
    }
    return `${target.name}: ${target.mapExplanation}`;
  };

  return (
    <section className="tms-quiz" aria-label="מצב תרגול">
      <div className="tms-quiz__bar">
        <div className="tms-quiz__stats">
          <span>
            שאלה {Math.min(answered + (phase === 'feedback' ? 0 : 1), state.queue.length)} מתוך{' '}
            {state.queue.length}
          </span>
          <span>ניקוד {state.score}</span>
          {state.streak > 1 && <span className="tms-quiz__streak">רצף ×{state.streak}</span>}
          {state.timed && (
            <span className="tms-quiz__timer">{String(seconds).padStart(2, '0')} שנ׳</span>
          )}
        </div>
        <button type="button" className="tms-btn tms-btn--sm tms-btn--quiet" onClick={onExit}>
          יציאה מהתרגול
        </button>
      </div>

      <p className="tms-quiz__question" aria-live="polite">
        {question.prompt}
      </p>

      {question.mode === 'signature' && target && (
        <div className="tms-quiz__sig">
          <ContourSignature kind={target.signature} label="חתימת קווי הגובה של הצורה המבוקשת" />
          <span>זו החתימה. איפה היא מופיעה במפה?</span>
        </div>
      )}

      {question.mode === 'identify' && (
        <div className="tms-quiz__options" role="group" aria-label="תשובות אפשריות">
          {question.options.map((id) => {
            const f = byId(features, id);
            if (!f) return null;
            const isCorrect = phase === 'feedback' && id === question.featureId;
            const isWrong = phase === 'feedback' && id === chosenId && !correct;
            return (
              <button
                key={id}
                type="button"
                className={
                  'tms-quiz__option' +
                  (isCorrect ? ' tms-quiz__option--correct' : '') +
                  (isWrong ? ' tms-quiz__option--wrong' : '')
                }
                disabled={phase === 'feedback'}
                onClick={() => onAnswer(id)}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      )}

      {hint && phase === 'asking' && <p className="tms-quiz__hint">{hint}</p>}
      {nudge && phase === 'asking' && (
        <p className="tms-quiz__hint" role="status">
          {nudge}
        </p>
      )}

      {phase === 'feedback' && (
        <div className="tms-quiz__feedback" role="status">
          <span
            className={
              'tms-quiz__verdict ' + (correct ? 'tms-quiz__verdict--ok' : 'tms-quiz__verdict--no')
            }
          >
            {correct ? 'נכון' : `לא נכון — התשובה היא ${target?.name}`}
          </span>
          {explain()}
        </div>
      )}

      <div className="tms-quiz__actions">
        {phase === 'asking' && !hint && (
          <button type="button" className="tms-btn tms-btn--sm" onClick={onHint}>
            רמז (עולה 40 נקודות)
          </button>
        )}
        {phase === 'feedback' && (
          <button type="button" className="tms-btn tms-btn--sm tms-btn--primary" onClick={onNext}>
            לשאלה הבאה
          </button>
        )}
      </div>
    </section>
  );
}
