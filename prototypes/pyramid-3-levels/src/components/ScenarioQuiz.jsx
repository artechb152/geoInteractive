import { useState } from 'react'
import { scenarios } from '../data/scenarios.js'
import { answerOptions } from '../data/levels.js'

/**
 * ScenarioQuiz — בוחן תרחישים מתחת למפה.
 * מציג תרחיש אחד בכל פעם, מקבל בחירת רמה, מציג משוב מיידי ומתקדם הלאה.
 *
 * props:
 *  - onPickLevel: (levelId) => void  — מסנכרן את הזום/הרמה הפעילה עם הבחירה.
 */
export default function ScenarioQuiz({ onPickLevel }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const total = scenarios.length
  const scenario = scenarios[index]
  const isAnswered = answer !== null
  const isCorrect = isAnswered && answer === scenario.correct
  // נופל בחזרה לערך בטוח אם עורך תוכן הקליד מזהה רמה שגוי ב-scenario.correct
  const correctOption =
    answerOptions.find((o) => o.id === scenario.correct) || {
      shortLabel: scenario.correct,
    }

  function handleAnswer(optId) {
    if (isAnswered) return
    setAnswer(optId)
    if (optId === scenario.correct) setScore((s) => s + 1)
    // מסנכרנים את המפה לרמה הנכונה (לא לניחוש) כדי שהוויזואליה תחזק את התשובה הנכונה
    if (onPickLevel) onPickLevel(scenario.correct)
  }

  function handleNext() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      setAnswer(null)
    } else {
      setFinished(true)
    }
  }

  function handleRestart() {
    setIndex(0)
    setAnswer(null)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <section className="scenario" aria-label="בוחן תרחישים — סיכום">
        <div className="scenario__done">
          <span className="scenario__done-icon" aria-hidden="true">
            ✓
          </span>
          <h3 className="scenario__done-title">סיימת את התרחישים</h3>
          <p className="scenario__done-score">
            תשובות נכונות: <strong>{score}</strong> מתוך {total}
          </p>
          <button type="button" className="solid-button" onClick={handleRestart}>
            התחל מחדש
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="scenario" aria-label="בוחן תרחישים">
      <div className="scenario__head">
        <h3 className="scenario__title">תרגול: באיזו רמה מדובר?</h3>
        <span className="scenario__progress" aria-live="polite">
          {index + 1}/{total}
        </span>
      </div>

      <div className="scenario__bar" aria-hidden="true">
        <span
          className="scenario__bar-fill"
          style={{ width: `${((index + (isAnswered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <p className="scenario__text">״{scenario.text}״</p>

      <div
        className="scenario__options"
        role="group"
        aria-label="בחרו את הרמה המתאימה לתרחיש"
      >
        {answerOptions.map((option) => {
          const chosen = answer === option.id
          const showAsCorrect = isAnswered && option.id === scenario.correct
          return (
            <button
              key={option.id}
              type="button"
              className={`scenario-option${chosen ? ' scenario-option--chosen' : ''}${
                showAsCorrect ? ' scenario-option--correct' : ''
              }`}
              style={{
                '--opt-main': option.color.main,
                '--opt-tint': option.color.tint,
              }}
              aria-pressed={chosen}
              disabled={isAnswered}
              onClick={() => handleAnswer(option.id)}
            >
              {option.shortLabel}
              {showAsCorrect && (
                <span className="scenario-option__flag" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div
          className={`scenario-feedback scenario-feedback--${
            isCorrect ? 'correct' : 'wrong'
          }`}
          role="status"
        >
          <span className="scenario-feedback__icon" aria-hidden="true">
            {isCorrect ? '✓' : '!'}
          </span>
          <p className="scenario-feedback__text">
            {isCorrect
              ? scenario.feedback
              : `לא בדיוק — התשובה המתאימה היא ${correctOption.shortLabel}. ${scenario.feedback}`}
          </p>
        </div>
      )}

      <div className="scenario__footer">
        <span className="scenario__hint">
          {isAnswered
            ? `דוגמה לרמה ${correctOption.shortLabel}`
            : 'בחרו רמה כדי לקבל משוב'}
        </span>
        <button
          type="button"
          className="solid-button"
          onClick={handleNext}
          disabled={!isAnswered}
        >
          {index < total - 1 ? 'תרחיש הבא' : 'סיום'}
        </button>
      </div>
    </section>
  )
}
