import { useEffect, useRef } from 'react';
import type { TerrainArea, TerrainFeature } from '../../data/types';
import { useI18n } from '../../i18n';
import {
  LESSON_STAGES,
  estimateMinutes,
  goalsFor,
  stageIndex,
  type LessonStage,
  type LessonState,
} from './lib/lesson';

/**
 * LessonIntro — מסך הפתיחה של השיעור.
 *
 * מטרות למידה מפורשות לפני ההתחלה הן מה שמפריד בין "שיחקתי עם מפה" לבין
 * "למדתי לזהות שבע צורות שטח". הן גם מה שמאפשר למדריך לשבץ את המקטע
 * במסלול מחייב.
 */
export function LessonIntro({
  area,
  onStart,
  onSkip,
}: {
  area: TerrainArea;
  onStart: () => void;
  onSkip: () => void;
}) {
  const t = useI18n();
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startRef.current?.focus();
  }, []);

  return (
    <div className="tms-sheet" role="dialog" aria-modal="true" aria-label={t.modeLesson}>
      <div className="tms-lesson-intro">
        <p className="tms-lesson-intro__eyebrow">
          {area.name} · {area.region}
        </p>
        <h2 className="tms-lesson-intro__title">{t.lessonGoalsTitle}</h2>
        <ul className="tms-lesson-intro__goals">
          {goalsFor(area).map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="tms-lesson-intro__time">{t.lessonEstimate(estimateMinutes(area))}</p>
        <div className="tms-lesson-intro__actions">
          <button type="button" className="tms-btn tms-btn--sm tms-btn--quiet" onClick={onSkip}>
            {t.lessonSkipToExplore}
          </button>
          <button
            type="button"
            ref={startRef}
            className="tms-btn tms-btn--primary"
            onClick={onStart}
          >
            {t.lessonStart}
          </button>
        </div>
      </div>
    </div>
  );
}

const STAGE_LABEL: Record<LessonStage, keyof ReturnType<typeof useI18n>> = {
  intro: 'lessonStageIntro',
  explore: 'lessonStageExplore',
  practice: 'lessonStagePractice',
  test: 'lessonStageTest',
  summary: 'lessonStageSummary',
};

/**
 * LessonBar — סרגל השלבים והניווט המודרך.
 *
 * ההתקדמות גלויה תמיד: לומד שלא יודע כמה נשאר לו נוטש. הכפתור "דילוג לשלב
 * הבא" קיים בכוונה — מי שכבר יודע לזהות שלוחה לא צריך לעבור שוב שבעה
 * מסכים כדי להגיע למבחן.
 */
export function LessonBar({
  state,
  feature,
  onPrev,
  onNext,
  onSkipStage,
  onExit,
}: {
  state: LessonState;
  feature?: TerrainFeature;
  onPrev: () => void;
  onNext: () => void;
  onSkipStage: () => void;
  onExit: () => void;
}) {
  const t = useI18n();
  const idx = stageIndex(state.stage);
  const guided = state.stage === 'explore';

  return (
    <div className="tms-lesson-bar">
      <ol
        className="tms-lesson-bar__stages"
        aria-label={t.lessonStageOf(idx + 1, LESSON_STAGES.length)}
      >
        {LESSON_STAGES.map((s, i) => (
          <li
            key={s}
            className={
              'tms-lesson-bar__stage' +
              (i === idx ? ' tms-lesson-bar__stage--on' : '') +
              (i < idx ? ' tms-lesson-bar__stage--done' : '')
            }
            aria-current={i === idx ? 'step' : undefined}
          >
            <span className="tms-lesson-bar__num" aria-hidden="true">
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="tms-lesson-bar__label">{t[STAGE_LABEL[s]] as string}</span>
          </li>
        ))}
      </ol>

      <div className="tms-lesson-bar__nav">
        {guided && (
          <>
            <span className="tms-lesson-bar__count">
              {t.lessonOf(state.step + 1, state.order.length)}
              {feature ? ` · ${feature.name}` : ''}
            </span>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-tap"
              onClick={onPrev}
              disabled={state.step === 0}
            >
              {t.lessonPrevFeature}
            </button>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-btn--primary tms-tap"
              onClick={onNext}
            >
              {state.step + 1 < state.order.length ? t.lessonNextFeature : t.lessonToPractice}
            </button>
          </>
        )}
        {!guided && state.stage !== 'summary' && (
          <button type="button" className="tms-btn tms-btn--sm tms-tap" onClick={onSkipStage}>
            {t.skip}
          </button>
        )}
        <button
          type="button"
          className="tms-btn tms-btn--sm tms-btn--quiet tms-tap"
          onClick={onExit}
        >
          {t.modeExplore}
        </button>
      </div>
    </div>
  );
}
