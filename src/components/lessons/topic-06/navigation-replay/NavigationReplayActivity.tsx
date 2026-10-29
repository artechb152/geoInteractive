'use client';
/**
 * „מתי עוצרים לבדוק?” — the navigation replay (lesson 6, „דגשים לתכנון
 * ולניווט”, screen 2). The learner steps through four moments of one
 * navigation, compares the route story with the view from the field and the
 * movement data, and decides when to go on and when to stop and check. Each
 * moment keeps its own answer; any moment can be revisited; nothing is timed.
 *
 *   ReplayView   the live 3D view from the moment's station (right)
 *   ReplayMap    the planning map: what the navigator knows (left)
 *   story/field  the route story and the movement data for the moment
 *   timeline     the four moments, RTL, with previous / next
 *   decision     continue or check → reason → feedback; the guided opening;
 *                the moment-4 debrief; the closing summary
 *
 * Layout is fixed at the lesson's reference width (1344) and keeps one height
 * in every state (the decision area reserves its tallest state), so the laptop
 * fit never rescales between moments.
 */
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOMENTS, PRINCIPLES, momentById, type EvidenceOption, type Moment, type MomentId } from './replayScenario';
import { initialReplayState, isDone, replayReducer, type ReplayState } from './replayState';
import { createViewStore } from './replayViewStore';
import { toWorld, type W2 } from './replayWorld';
import { ReplayView } from './ReplayView';
import { ReplayMap } from './ReplayMap';
import { TipsLegendGlyph } from '../NavTipsMap';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Width of the 3D panel at the reference width; the map takes the rest. */
const VIEW_W = 690;
const PANEL_H = 452;
/** The decision area's height: its tallest state (evidence + feedback, the debrief, the summary). */
const DECISION_H = 160;

export function NavigationReplayScreen() {
  return (
    <div data-tips-screen="nav">
      {/* The screen's title and instruction, as in the approved mockup: centred above the activity card. */}
      <header className="mb-5 text-center">
        <h3 className="font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-black">במהלך הניווט: מה צריך לבדוק?</h3>
        <p className="mt-1.5 text-xl leading-snug text-black">השוו בין סיפור הדרך למה שנראה בשטח, והחליטו מתי נדרשת בדיקה.</p>
      </header>
      <NavigationReplayActivity />
    </div>
  );
}

export function NavigationReplayActivity() {
  const reduce = !!useReducedMotion();
  const uid = useId();
  const [state, dispatch] = useReducer(replayReducer, undefined, initialReplayState);
  const moment = momentById(state.active);
  const ms = state.moments[state.active];
  const view = useMemo(() => createViewStore(MOMENTS[0].view), []);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  /** Focus to place once the decision area's new content has mounted (it fades in after the old one leaves). */
  const pendingFocus = useRef<'action' | 'prompt' | null>(null);
  const [announce, setAnnounce] = useState('');

  // a new moment: its station's opening look
  useEffect(() => view.setHome(moment.view), [moment, view]);
  // read and driven by the QA scripts (fallback capture, keyboard checks)
  useEffect(() => {
    (window as unknown as { __replayView?: typeof view }).__replayView = view;
  }, [view]);
  const station = useMemo(() => toWorld(moment.truth.at), [moment]);
  const prefetch = useMemo(() => MOMENTS.map((m) => [m.id, toWorld(m.truth.at)] as [string, W2]), []);

  const goTo = useCallback(
    (id: MomentId) => {
      dispatch({ type: 'goto', id });
      const m = momentById(id);
      setAnnounce(`רגע ${m.n} מתוך ${MOMENTS.length}: ${m.label}`);
    },
    [],
  );
  const step = (dir: 1 | -1) => {
    const i = MOMENTS.findIndex((m) => m.id === state.active) + dir;
    if (i >= 0 && i < MOMENTS.length) goTo(MOMENTS[i].id);
  };
  const reset = () => {
    dispatch({ type: 'reset' });
    view.setHome(MOMENTS[0].view);
    setAnnounce('הפעילות התחילה מחדש: רגע 1 מתוך 4, יציאה');
    pendingFocus.current = 'action';
  };
  // after moving to a moment from the decision area, focus its prompt (not on a plain timeline click)
  const advance = (to: MomentId | 'summary') => {
    if (to === 'summary') dispatch({ type: 'summary', open: true });
    else goTo(to);
    pendingFocus.current = 'prompt';
  };

  const saddleFixed = isDone(state, 'saddle');
  const revealTruth = state.active === 'after' && isDone(state, 'after');

  return (
    <div role="group" aria-labelledby={`${uid}-title`} className="surface-elevated px-7 pb-6 pt-5" data-activity="navigation-replay" data-active={state.active} data-phase={ms.phase}>
      {/* header row: title (start), position in the replay and a quiet reset (end) */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <h4 id={`${uid}-title`} className="font-display text-3xl font-bold leading-tight text-black">
          מתי עוצרים לבדוק?
        </h4>
        <div className="flex items-center gap-5">
          <span className="text-base text-fg-muted" data-counter>
            רגע {moment.n} מתוך {MOMENTS.length}
          </span>
          <button type="button" onClick={reset} className="btn-secondary h-10 gap-2 px-4 text-base" data-reset>
            <RotateCcw className="size-4" aria-hidden />
            התחלה מחדש
          </button>
        </div>
      </div>

      {/* the field (right) and the planning map (left) */}
      <div className="grid gap-5" style={{ gridTemplateColumns: `${VIEW_W}px minmax(0, 1fr)`, height: PANEL_H }}>
        <ReplayView
          stationKey={moment.id}
          station={station}
          momentIndex={moment.n - 1}
          view={view}
          description={moment.viewText}
          reduce={reduce}
          prefetch={prefetch}
          className="h-full"
        />
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-bg-elevated" data-panel="map">
          <div className="flex h-10 shrink-0 items-center justify-between gap-3 px-4">
            <h5 className="font-display text-lg font-bold leading-none text-black">מפת התכנון</h5>
            <ul className="flex items-center gap-3 text-[13px] text-fg-muted" aria-hidden data-map-legend>
              <li className="flex items-center gap-1.5">
                <TipsLegendGlyph kind="walked" />
                אומת
              </li>
              <li className="flex items-center gap-1.5">
                <TipsLegendGlyph kind="ahead" />
                מתוכנן
              </li>
              <li className="flex items-center gap-1.5">
                <EstimateGlyph />
                אומדן
              </li>
            </ul>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-b-xl">
            <ReplayMap state={{ moment, saddleFixed, revealTruth }} />
          </div>
        </div>
      </div>

      {/* the route story and the movement data for this moment */}
      <div className="mt-3 grid grid-cols-2 gap-4" data-info>
        <InfoCard title="סיפור הדרך" text={moment.story} data="story" />
        <InfoCard title="הנתון מהשטח" text={moment.field} data="field" />
      </div>

      <Timeline state={state} onGo={goTo} onStep={step} />

      <div className="mt-2.5 border-t border-border/80 pt-4">
        <DecisionArea
          state={state}
          moment={moment}
          reduce={reduce}
          promptRef={promptRef}
          firstActionRef={firstActionRef}
          pendingFocus={pendingFocus}
          onDecide={(choice) => dispatch({ type: 'decide', choice })}
          onRetry={() => dispatch({ type: 'retry' })}
          onEvidence={(option) => dispatch({ type: 'evidence', option })}
          onComplete={() => {
            dispatch({ type: 'complete' });
            advance('enroute');
          }}
          onAdvance={advance}
          onLook={(yawDeg) => view.goTo({ ...view.get(), yawDeg, pitchDeg: -5 }, reduce)}
        />
      </div>

      {/* moment changes and resets, announced once */}
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
    </div>
  );
}

function EstimateGlyph() {
  return (
    <svg viewBox="0 0 20 12" className="h-3.5 w-6 shrink-0 overflow-visible" aria-hidden>
      <circle cx="10" cy="6" r="4.6" fill="#D97E2B" fillOpacity="0.1" stroke="#D97E2B" strokeWidth="1" strokeDasharray="2 1.4" />
      <circle cx="10" cy="6" r="1.1" fill="#D97E2B" />
    </svg>
  );
}

function InfoCard({ title, text, data }: { title: string; text: string; data: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-bg-accent/50 px-5 py-3" data-info-card={data}>
      <h5 className="font-display text-lg font-bold leading-snug text-black">{title}</h5>
      <p className="mt-1 min-h-[1.625rem] text-base leading-relaxed text-black">{text}</p>
    </div>
  );
}

// ───────────────────────────────────────────── timeline

function Timeline({ state, onGo, onStep }: { state: ReplayState; onGo: (id: MomentId) => void; onStep: (d: 1 | -1) => void }) {
  const i = MOMENTS.findIndex((m) => m.id === state.active);
  return (
    <nav aria-label="רגעי השחזור" className="mt-4" data-timeline>
      <div className="flex items-center gap-6">
        {/* RTL: previous on the right, next on the left */}
        <button type="button" onClick={() => onStep(-1)} disabled={i === 0} aria-label="לרגע הקודם" className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-bg-elevated text-black shadow-sm transition-colors hover:bg-bg-accent disabled:opacity-35 disabled:shadow-none" data-prev>
          <ChevronRight className="size-6" aria-hidden />
        </button>
        <ol className="relative flex flex-1 items-start justify-between">
          {/* the connecting line, behind the steps */}
          <span aria-hidden className="absolute inset-x-[12.5%] top-[15px] h-px bg-brand-dark/50" />
          {MOMENTS.map((m) => {
            const active = m.id === state.active;
            const done = isDone(state, m.id);
            return (
              <li key={m.id} className="relative z-[1] flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => onGo(m.id)}
                  aria-current={active ? 'step' : undefined}
                  className="group flex flex-col items-center gap-1.5 rounded-lg px-2 pb-1"
                  data-moment={m.id}
                  data-done={done || undefined}
                >
                  <span
                    className={cn(
                      'grid size-[30px] place-items-center rounded-full font-display text-[15px] font-bold transition-colors duration-200',
                      active && 'bg-bg-elevated text-accent ring-[3px] ring-accent ring-offset-2 ring-offset-bg-elevated',
                      !active && done && 'bg-brand-dark text-white',
                      !active && !done && 'border-[1.5px] border-brand-dark bg-bg-elevated text-brand-dark group-hover:bg-bg-accent',
                    )}
                  >
                    {m.n}
                  </span>
                  <span className={cn('font-display text-lg leading-tight', active ? 'font-bold text-accent' : 'font-medium text-black')}>{m.label}</span>
                  <span className="sr-only">{done ? ' — הושלם' : ' — טרם הושלם'}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => onStep(1)} disabled={i === MOMENTS.length - 1} aria-label="לרגע הבא" className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-bg-elevated text-black shadow-sm transition-colors hover:bg-bg-accent disabled:opacity-35 disabled:shadow-none" data-next>
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      </div>
      <p className="mt-0.5 text-center text-base leading-snug text-fg-muted">אפשר לחזור לכל רגע ולבדוק שוב.</p>
    </nav>
  );
}

// ───────────────────────────────────────────── decision area

type DecisionProps = {
  state: ReplayState;
  moment: Moment;
  reduce: boolean;
  promptRef: React.RefObject<HTMLHeadingElement | null>;
  firstActionRef: React.RefObject<HTMLButtonElement | null>;
  pendingFocus: React.RefObject<'action' | 'prompt' | null>;
  onDecide: (c: 'check' | 'continue') => void;
  onRetry: () => void;
  onEvidence: (id: string) => void;
  onComplete: () => void;
  onAdvance: (to: MomentId | 'summary') => void;
  /** Turn the view towards a heading (the guided opening's "show in the field"). */
  onLook: (yawDeg: number) => void;
};

const nextOf = (id: MomentId): MomentId | 'summary' => {
  const i = MOMENTS.findIndex((m) => m.id === id);
  return i < MOMENTS.length - 1 ? MOMENTS[i + 1].id : 'summary';
};

function DecisionArea(p: DecisionProps) {
  const { state, moment: m, reduce } = p;
  const ms = state.moments[m.id];
  const key = state.summary ? 'summary' : `${m.id}-${ms.phase}-${ms.choice ?? ''}-${ms.evidence ?? ''}`;
  return (
    <div style={{ minHeight: DECISION_H }} data-decision={state.summary ? 'summary' : ms.phase}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <FocusOnMount {...p} />
          {state.summary ? <Summary {...p} /> : m.kind === 'guided' ? <Guided {...p} /> : <Decision {...p} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Places a requested focus once the new content is in the document. */
function FocusOnMount({ pendingFocus, promptRef, firstActionRef }: DecisionProps) {
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    (target === 'action' ? firstActionRef : promptRef).current?.focus({ preventScroll: true });
  }, [pendingFocus, promptRef, firstActionRef]);
  return null;
}

/** Two columns: the text (start / right) and the actions (end / left). */
function Row({ text, actions }: { text: ReactNode; actions: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_440px] items-start gap-8">
      <div className="min-w-0">{text}</div>
      <div className="flex flex-col items-stretch gap-2.5">{actions}</div>
    </div>
  );
}

function Prompt({ promptRef, children, sub }: { promptRef: DecisionProps['promptRef']; children: ReactNode; sub?: ReactNode }) {
  return (
    <>
      <h5 ref={promptRef} tabIndex={-1} className="font-display text-2xl font-bold leading-snug text-black outline-none" data-prompt>
        {children}
      </h5>
      {sub && <p className="mt-1.5 text-base leading-relaxed text-black">{sub}</p>}
    </>
  );
}

function Guided({ moment: m, state, promptRef, firstActionRef, onComplete, onAdvance, onLook }: DecisionProps) {
  const done = isDone(state, m.id);
  const checks = [
    { key: 'place', label: 'המקום:', text: 'ערוץ הנחל היבש משנה כאן כיוון, כמו בעיקול שבמפה — זו נקודה מזוהה.', yaw: m.lookAt?.place },
    { key: 'direction', label: 'הכיוון:', text: 'הקטע הבא מוביל אל האוכף, השקע שבין שתי הפסגות; במפה החץ מראה אותו.', yaw: m.lookAt?.direction },
  ];
  return (
    <Row
      text={
        <>
          <Prompt promptRef={promptRef}>{m.title}</Prompt>
          <ul className="mt-2 space-y-2 text-base leading-relaxed text-black" data-guided>
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <Check className="mt-1 size-4 shrink-0 text-brand-dark" strokeWidth={3} aria-hidden />
                <span className="flex-1">
                  <strong className="font-bold">{c.label}</strong> {c.text}
                </span>
                {c.yaw !== undefined && (
                  <button type="button" onClick={() => onLook(c.yaw!)} className="btn-ghost h-8 shrink-0 px-3 text-sm" data-look={c.key}>
                    הראו בשטח
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      }
      actions={
        done ? (
          <>
            <p className="text-base leading-relaxed text-black">יצאתם מכאן אחרי שאימתתם מקום וכיוון.</p>
            <button ref={firstActionRef} type="button" className="btn-primary h-14 text-lg" onClick={() => onAdvance('enroute')}>
              לרגע הבא
            </button>
          </>
        ) : (
          <button ref={firstActionRef} type="button" className="btn-primary h-14 text-lg" onClick={onComplete} data-action="depart">
            {m.continueLabel}
          </button>
        )
      }
    />
  );
}

function Decision(p: DecisionProps) {
  const { moment: m, state, promptRef, firstActionRef, onDecide, onRetry, onEvidence, onAdvance } = p;
  const ms = state.moments[m.id];
  const choiceFb = ms.choice ? m.onChoice![ms.choice] : null;
  const picked = m.evidence?.options.find((o) => o.id === ms.evidence) ?? null;

  if (ms.phase === 'viewing') {
    return (
      <Row
        text={<Prompt promptRef={promptRef} sub="בחרו פעולה לפי המידע שיש לכם עכשיו.">אפשר להמשיך, או שצריך לבדוק?</Prompt>}
        actions={
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="ההחלטה">
            {/* RTL: the first button sits on the right */}
            <button ref={firstActionRef} type="button" className="btn-primary h-14 text-lg" onClick={() => onDecide('check')} data-choice="check">
              עוצרים לבדיקה
            </button>
            <button type="button" className="btn-secondary h-14 text-lg" onClick={() => onDecide('continue')} data-choice="continue">
              ממשיכים
            </button>
          </div>
        }
      />
    );
  }

  const choiceLabel = ms.choice === 'check' ? 'עוצרים לבדיקה' : 'ממשיכים';
  // the reason step: the choice fitted and asks for evidence
  const askEvidence = choiceFb?.next === 'evidence' && picked?.verdict !== 'right';
  const settled = ms.phase === 'done';
  const verdictTone = (v: EvidenceOption['verdict'] | 'retry' | 'ok') => (v === 'right' || v === 'ok' ? 'ok' : v === 'partial' ? 'partial' : 'wrong');

  return (
    <Row
      text={
        <div role="status" aria-live="polite" aria-atomic="true" data-feedback={settled ? 'done' : choiceFb?.next}>
          <p className="text-base text-fg-muted">
            בחרתם: <strong className="font-bold text-black">{choiceLabel}</strong>
          </p>
          {/* the choice's own feedback (retry / caution explained / a request for the reason) */}
          {!(choiceFb?.next === 'evidence') && choiceFb && (
            <Feedback tone={choiceFb.next === 'retry' ? 'wrong' : 'ok'} lead={choiceFb.lead} body={choiceFb.body} />
          )}
          {choiceFb?.next === 'evidence' && !picked && <Feedback tone="ok" lead={choiceFb.lead} body={null} />}
          {picked && <Feedback tone={verdictTone(picked.verdict)} lead={picked.verdict === 'right' ? null : picked.verdict === 'partial' ? 'חלקית.' : 'עוד לא.'} body={picked.feedback} />}
          {settled && m.debrief && <p className="mt-2 text-base leading-relaxed text-black" data-debrief>{m.debrief}</p>}
        </div>
      }
      actions={
        <>
          {choiceFb?.next === 'retry' && ms.phase === 'decided' && (
            <button ref={firstActionRef} type="button" className="btn-secondary h-12 text-base" onClick={onRetry} data-action="retry">
              ניסיון נוסף
            </button>
          )}
          {askEvidence && (
            <div role="group" aria-labelledby="replay-evidence-q" className="flex flex-col gap-1.5" data-evidence>
              <p id="replay-evidence-q" className="font-display text-lg font-bold leading-snug text-black">
                {m.evidence!.question}
              </p>
              {m.evidence!.options.map((o) => {
                const isPicked = o.id === ms.evidence;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onEvidence(o.id)}
                    aria-pressed={isPicked}
                    data-option={o.id}
                    className={cn(
                      'w-full rounded-xl border px-4 py-[7px] text-start text-base leading-snug text-black transition-colors duration-200',
                      !isPicked && 'border-border bg-bg-elevated hover:border-brand/40 hover:bg-brand/[0.04]',
                      isPicked && o.verdict === 'partial' && 'border-status-warn/70 bg-status-warn/10',
                      isPicked && o.verdict === 'wrong' && 'border-status-danger/50 bg-status-danger/10',
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          {settled && (
            <>
              {m.outcome && <p className="text-base leading-relaxed text-black" data-outcome><strong className="font-bold">עכשיו: </strong>{m.outcome}</p>}
              <button ref={firstActionRef} type="button" className="btn-primary h-14 text-lg" onClick={() => onAdvance(nextOf(m.id))} data-action="next">
                {m.continueLabel}
              </button>
            </>
          )}
        </>
      }
    />
  );
}

function Feedback({ tone, lead, body }: { tone: 'ok' | 'partial' | 'wrong'; lead: string | null; body: string | null }) {
  return (
    <div className="mt-2 flex items-start gap-2.5" data-tone={tone}>
      <span
        aria-hidden
        className={cn(
          'mt-1 grid size-5 shrink-0 place-items-center rounded-full text-white',
          tone === 'ok' && 'bg-brand-dark',
          tone === 'partial' && 'bg-accent',
          tone === 'wrong' && 'bg-status-danger',
        )}
      >
        {tone === 'wrong' ? <X className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </span>
      <p className="text-base leading-relaxed text-black">
        {lead && <strong className="me-1 font-bold">{lead}</strong>}
        {body}
      </p>
    </div>
  );
}

function Summary({ promptRef, onAdvance }: DecisionProps) {
  const scrollToQuestion = () => {
    const q = document.querySelector('[data-tips-screen="question"]') as HTMLElement | null;
    q?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (q?.querySelector('[data-option]') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  return (
    <div data-summary>
      <div className="flex items-start justify-between gap-6">
        <Prompt promptRef={promptRef}>מה בודקים במהלך הניווט — ומתי</Prompt>
        <div className="flex shrink-0 gap-3">
          <button type="button" className="btn-secondary h-12 text-base" onClick={() => onAdvance('after')}>
            חזרה לרגע 4
          </button>
          <button type="button" className="btn-primary h-12 text-base" onClick={scrollToQuestion} data-action="to-question">
            להמשך: שאלת יישום
          </button>
        </div>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2.5">
        {PRINCIPLES.map((pr, i) => (
          <li key={pr.title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-dark font-display text-sm font-bold text-white">{i + 1}</span>
            <span className="text-base leading-snug text-black">
              <strong className="font-bold">{pr.title}. </strong>
              {pr.line}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
