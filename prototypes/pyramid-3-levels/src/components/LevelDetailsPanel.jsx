import { useState } from 'react'
import { answerOptions, wrongAnswerPrefix } from '../data/levels.js'

/**
 * LevelDetailsPanel — פאנל הפרטים של הרמה הנבחרת בפירמידה,
 * כולל סעיף "בדיקת הבנה".
 *
 * props:
 *  - level: אובייקט הרמה מתוך levels.js
 *
 * הרכיב נטען מחדש (key=level.id ב-InteractivePyramid) בכל החלפת רמה,
 * כך שאנימציית הכניסה רצה מחדש ותשובת הבוחן מתאפסת לרמה החדשה.
 */
const META_ROWS = [
  { key: 'spatialScale', label: 'קנה מידה מרחבי', icon: 'scale' },
  { key: 'timeScale', label: 'אופק זמן', icon: 'time' },
  { key: 'commandLevel', label: 'דרג החלטה', icon: 'command' },
  { key: 'geographicFocus', label: 'מוקד גיאוגרפי', icon: 'focus' },
]

export default function LevelDetailsPanel({ level }) {
  const [answer, setAnswer] = useState(null)

  // נופל בחזרה לערך בטוח אם עורך תוכן הקליד correctAnswer שאינו אחד ממזהי הרמות
  const correctOption =
    answerOptions.find((o) => o.id === level.correctAnswer) || {
      shortLabel: level.nameHe,
    }
  const isAnswered = answer !== null
  const isCorrect = isAnswered && answer === level.correctAnswer

  const themeStyle = {
    '--level-main': level.color.main,
    '--level-strong': level.color.strong,
    '--level-tint': level.color.tint,
    '--level-on-tint': level.color.onTint,
  }

  return (
    <article
      className="details-panel"
      id="level-details-panel"
      style={themeStyle}
    >
      <span className="details-panel__corner details-panel__corner--tr" aria-hidden="true" />
      <span className="details-panel__corner details-panel__corner--bl" aria-hidden="true" />

      <header className="details-panel__head">
        <span className="details-panel__en">{level.nameEn}</span>
        <h2 className="details-panel__he">{level.nameHe}</h2>
        <span className="details-panel__title-chip">{level.shortTitle}</span>
      </header>

      <p className="details-panel__lead">{level.shortDescription}</p>
      <p className="details-panel__body">{level.expandedExplanation}</p>

      <dl className="meta-grid">
        {META_ROWS.map((row) => (
          <div className="meta-grid__item" key={row.key}>
            <dt className="meta-grid__label">
              <MetaIcon name={row.icon} />
              {row.label}
            </dt>
            <dd className="meta-grid__value">{level[row.key]}</dd>
          </div>
        ))}
      </dl>

      <div className="details-section">
        <h3 className="details-section__title">דוגמאות להחלטות</h3>
        <ul className="decision-list">
          {level.exampleDecisions.map((decision, i) => (
            <li key={i} className="decision-list__item">
              {decision}
            </li>
          ))}
        </ul>
      </div>

      <blockquote className="key-sentence">
        <span className="key-sentence__mark" aria-hidden="true">
          ״
        </span>
        {level.keySentence}
      </blockquote>

      {/* ----------------- בדיקת הבנה ----------------- */}
      <section className="quiz" aria-label="בדיקת הבנה">
        <h3 className="quiz__title">
          <CheckBadgeIcon />
          בדיקת הבנה
        </h3>
        <p className="quiz__question">{level.quizQuestion}</p>

        <div className="quiz__options" role="group" aria-label="בחרו את הרמה המתאימה">
          {answerOptions.map((option) => {
            const chosen = answer === option.id
            const showAsCorrect = isAnswered && option.id === level.correctAnswer
            return (
              <button
                key={option.id}
                type="button"
                className={`quiz-option${chosen ? ' quiz-option--chosen' : ''}${
                  showAsCorrect ? ' quiz-option--correct' : ''
                }`}
                style={{
                  '--opt-main': option.color.main,
                  '--opt-tint': option.color.tint,
                }}
                aria-pressed={chosen}
                onClick={() => setAnswer(option.id)}
              >
                {option.shortLabel}
                {showAsCorrect && (
                  <span className="quiz-option__flag" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <div
            className={`quiz-feedback quiz-feedback--${
              isCorrect ? 'correct' : 'wrong'
            }`}
            role="status"
          >
            <span className="quiz-feedback__icon" aria-hidden="true">
              {isCorrect ? '✓' : '!'}
            </span>
            <p className="quiz-feedback__text">
              {isCorrect
                ? level.feedback
                : `${wrongAnswerPrefix} ${correctOption.shortLabel}.`}
            </p>
          </div>
        )}
      </section>
    </article>
  )
}

/* ---------- אייקונים קטנים לשורות המטא ---------- */
function MetaIcon({ name }) {
  const paths = {
    scale: 'M3 7h18M3 12h18M3 17h18',
    time: 'M12 7v5l3 2',
    command: 'M4 18V9l8-5 8 5v9',
    focus: 'M12 3v3M12 18v3M3 12h3M18 12h3',
  }
  return (
    <svg viewBox="0 0 24 24" className="meta-grid__icon" aria-hidden="true">
      {name === 'time' || name === 'focus' ? (
        <>
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d={paths[name]}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d={paths[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="quiz__title-icon" aria-hidden="true">
      <path
        d="M12 2.5 4 6v5.5c0 4.7 3.2 8.3 8 9.9 4.8-1.6 8-5.2 8-9.9V6l-8-3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12 2.3 2.3 4.4-4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
