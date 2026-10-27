'use client';

import { useEffect, useId, useRef, type Dispatch, type ReactNode } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { RadioRow } from '../terrain-nav/RadioRow';
import {
  AZ_OPTIONS,
  END_LABEL,
  END_OPTIONS,
  FEEDBACK,
  LEGS,
  M_OPTIONS,
  POINTS,
  QUESTION_LEG,
  STOPS,
  TOTAL_M,
  deg,
  isComplete,
  legEnd,
  metres,
  verdict,
  type Action,
  type EndOption,
  type Field,
  type State,
} from './routeStoryModel';

/**
 * The panel under the route-story list and map: the explanation of the
 * selected point or leg in three columns, or — on leg ד׳ — the same three
 * columns as the learner's entry for that leg (azimuth · distance · sign at
 * the end), each with its own feedback under its control. Every point and
 * leg view shares one height (the min-h), so stepping between them never moves
 * the card; only leg ד׳, the panel's tallest view, grows it downward.
 */

const COL_LABEL = 'text-base font-display font-bold text-fg';
const BODY = 'mt-1 text-base leading-relaxed text-fg';

function Col({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <div className="min-w-0">
      <div id={id} className={COL_LABEL}>
        {label}
      </div>
      {children}
    </div>
  );
}

function legLine(i: number, done: boolean) {
  const leg = LEGS[i];
  const hidden = i === QUESTION_LEG && !done;
  return (
    <p className={BODY}>
      <span className="font-display font-bold">קטע {leg.letter}</span>
      {' · '}
      {hidden ? (
        <span className="text-ember-deep">להשלמה</span>
      ) : (
        <>
          <bdi className="font-display font-bold tabular-nums">{deg(leg.az)}</bdi> · כ־{metres(leg.m)}
        </>
      )}
      {' · '}
      <span className="text-fg-muted">
        מנקודה {leg.from + 1} אל נקודה {leg.to + 1}
      </span>
    </p>
  );
}

function PointView({ i, done }: { i: number; done: boolean }) {
  const p = POINTS[i];
  const incoming = i > 0 ? i - 1 : null;
  const outgoing = i < LEGS.length ? i : null;
  const signHidden = i === LEGS[QUESTION_LEG].to && !done;
  return (
    <div data-panel="point" data-point={i}>
      <div className="font-display text-lg font-bold leading-snug text-fg">
        נקודה {p.n} · {p.name}
        {p.abbr && <span className="font-medium text-fg-muted"> ({p.abbr})</span>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-6">
        <Col label="מה מזהים כאן">
          <p className={BODY}>{signHidden ? <span className="text-ember-deep">את הסימן שמאשר הגעה לכאן משלימים בקטע ד׳.</span> : p.identify}</p>
        </Col>
        <Col label="הקטע הנכנס">{incoming === null ? <p className={BODY}>כאן מתחיל הציר. אין קטע נכנס.</p> : legLine(incoming, done)}</Col>
        <Col label="הקטע היוצא">
          {outgoing === null ? <p className={BODY}>כאן מסתיים הציר. אין קטע יוצא.</p> : legLine(outgoing, done)}
          {outgoing !== null && (
            <p className="mt-1 text-sm leading-snug text-fg-muted">
              {i === 0 ? 'הכיוון והמרחק האלה שייכים לקטע שמתחיל כאן.' : 'יוצאים לקטע הזה רק אחרי שהסימן בנקודה תואם למפה.'}
            </p>
          )}
        </Col>
      </div>
    </div>
  );
}

function LegView({ i }: { i: number }) {
  const leg = LEGS[i];
  const end = legEnd(leg);
  return (
    <div data-panel="leg" data-leg={i}>
      <div className="font-display text-lg font-bold leading-snug text-fg">
        קטע {leg.letter} · מנקודה {leg.from + 1} ({POINTS[leg.from].name}) אל נקודה {leg.to + 1} ({end.name})
      </div>
      <div className="mt-3 grid grid-cols-3 gap-6">
        <Col label="כיוון ומרחק">
          <p className="mt-1 font-display text-2xl font-bold leading-tight text-fg tabular-nums">
            <bdi>{deg(leg.az)}</bdi> · כ־{metres(leg.m)}
          </p>
        </Col>
        <Col label="מה רואים בדרך">
          <p className={BODY}>{leg.along}</p>
        </Col>
        <Col label="בדיקת המיקום בסוף הקטע">
          <p className={BODY}>{end.identify}</p>
        </Col>
      </div>
    </div>
  );
}

const FIELD_LABEL: Record<Field, string> = { az: 'אזימוט', m: 'מרחק', end: 'סימן בסוף הקטע' };

function FieldFeedback({ state, field }: { state: State; field: Field }) {
  const v = verdict(state, field);
  if (!v) return null;
  const value = state.answer[field];
  const text = field === 'end' ? FEEDBACK.end[value as EndOption] : FEEDBACK[field][value as number];
  return (
    <div
      data-feedback={field}
      data-verdict={v}
      className={cn('mt-2.5 flex items-start gap-2 rounded-xl border px-3 py-2 text-base leading-snug text-fg', v === 'right' ? 'border-brand bg-brand/10' : 'border-accent-hot/60 bg-bg-accent')}
    >
      {v === 'right' ? <Check className="mt-0.5 size-4 shrink-0 text-brand-dark" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0 text-accent-hot" aria-hidden />}
      <span>{text}</span>
    </div>
  );
}

function QuestionView({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const uid = useId();
  const leg = LEGS[QUESTION_LEG];
  const statusRef = useRef<HTMLParagraphElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const wasDone = useRef(state.done);
  useEffect(() => {
    // done → the check button is gone: move focus to the result. Reset → back to the first choice.
    if (state.done && !wasDone.current) statusRef.current?.focus();
    if (!state.done && wasDone.current) rootRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    wasDone.current = state.done;
  }, [state.done]);

  const checked = state.checked !== null && state.attempts > 0;
  const fields: Field[] = ['az', 'm', 'end'];
  const rightNow = fields.filter((f) => verdict(state, f) === 'right').length;
  const shownVerdicts = fields.filter((f) => verdict(state, f) !== null).length;
  let status: string;
  if (state.done) status = `סיפור הדרך הושלם: ${LEGS.length} קטעים ו־${metres(TOTAL_M)} מנ.ה עד נ.ס`;
  else if (checked && shownVerdicts === 3) status = `${rightNow} מתוך 3 תשובות תואמות למפה. תקנו את מה שלא תאם ובדקו שוב.`;
  else if (checked) status = 'שיניתם תשובה. לחצו „בדיקה” שוב.';
  else status = isComplete(state.answer) ? 'לחצו „בדיקה”.' : 'בחרו תשובה בכל אחת משלוש העמודות.';

  return (
    <div ref={rootRef} data-panel="question" data-attempts={state.attempts}>
      <div className="font-display text-lg font-bold leading-snug text-fg">
        קטע {leg.letter} · מנקודה {leg.from + 1} ({POINTS[leg.from].name}) אל נקודה {leg.to + 1} ({POINTS[leg.to].name})
      </div>
      <p className="mt-1 text-sm leading-snug text-fg-muted">
        קראו את הקטע המודגש במפה: את הכיוון לפי הצפון, את המרחק מול סרגל קנה המידה, ואת הסימן לפי מה שמצויר בסוף הקטע.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-6">
        <Col label={FIELD_LABEL.az} id={`${uid}-az`}>
          <RadioRow
            labelledBy={`${uid}-az`}
            options={AZ_OPTIONS.map((v) => ({ id: v, label: deg(v) }))}
            value={state.answer.az}
            disabled={state.done}
            onChange={(value) => dispatch({ type: 'choose', field: 'az', value })}
            className="mt-2"
            data="az"
          />
          <FieldFeedback state={state} field="az" />
        </Col>
        <Col label={FIELD_LABEL.m} id={`${uid}-m`}>
          <RadioRow
            labelledBy={`${uid}-m`}
            options={M_OPTIONS.map((v) => ({ id: v, label: metres(v) }))}
            value={state.answer.m}
            disabled={state.done}
            onChange={(value) => dispatch({ type: 'choose', field: 'm', value })}
            className="mt-2"
            data="m"
          />
          <FieldFeedback state={state} field="m" />
        </Col>
        <Col label={FIELD_LABEL.end} id={`${uid}-end`}>
          <RadioRow
            labelledBy={`${uid}-end`}
            options={END_OPTIONS.map((v) => ({ id: v, label: END_LABEL[v] }))}
            value={state.answer.end}
            disabled={state.done}
            onChange={(value) => dispatch({ type: 'choose', field: 'end', value })}
            className="mt-2"
            data="end"
          />
          <FieldFeedback state={state} field="end" />
        </Col>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          data-status={state.done ? 'done' : checked ? 'checked' : 'open'}
          className={cn('flex-1 min-w-0 text-base leading-snug focus-visible:outline-none', state.done ? 'font-display font-bold text-fg' : 'text-fg-muted')}
        >
          {state.done && <Check className="me-1.5 inline size-5 align-[-4px] text-brand-dark" aria-hidden />}
          {status}
        </p>
        {state.done ? (
          <Button variant="secondary" size="md" onClick={() => dispatch({ type: 'reset' })}>
            <RotateCcw className="size-4" aria-hidden />
            איפוס
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'check' })} disabled={!isComplete(state.answer)}>
            בדיקה
          </Button>
        )}
      </div>
    </div>
  );
}

export function RouteStoryPanel({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const stop = STOPS[state.stop];
  return (
    // A divider, not an inset: the per-answer feedback below is the inset (page → card → inset, no deeper).
    <div className="mt-6 border-t border-border/70 pt-5 min-h-[140px]" data-qa="route-panel">
      {stop.kind === 'leg' && stop.i === QUESTION_LEG ? (
        <QuestionView state={state} dispatch={dispatch} />
      ) : stop.kind === 'leg' ? (
        <LegView i={stop.i} />
      ) : (
        <PointView i={stop.i} done={state.done} />
      )}
    </div>
  );
}
