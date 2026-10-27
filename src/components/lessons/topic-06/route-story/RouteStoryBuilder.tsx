'use client';

import { useId, useReducer, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { RouteMap } from '../PlanningRouteMap';
import { RouteStoryPanel } from './RouteStoryPanel';
import {
  INITIAL_STATE,
  LEGS,
  POINTS,
  STOPS,
  deg,
  describe,
  isHidden,
  legStates,
  metres,
  pointStates,
  reducer,
  type Stop,
} from './routeStoryModel';

/**
 * „סיפור דרך: חמש נקודות וארבעה קטעים” — the route-story activity of lesson
 * 6, one card: the story as a list that alternates the five points and the
 * four legs between them, the map beside it (drawn from the same data), and
 * under both a panel for the selected stop — what to see on the way and which
 * sign checks the position at the end — or, on leg ד׳, the learner's own
 * entry for that leg, read from the map.
 */

const ROW =
  'group relative isolate flex w-full items-center gap-3 rounded-xl border px-3 text-start cursor-pointer transition-colors duration-200 ease-snap before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function stopLabel(s: Stop) {
  if (s.kind === 'leg') {
    const leg = LEGS[s.i];
    return `קטע ${leg.letter} · מנקודה ${leg.from + 1} אל נקודה ${leg.to + 1}`;
  }
  const p = POINTS[s.i];
  return `נקודה ${p.n} · ${p.name}${p.abbr ? ` (${p.abbr})` : ''}`;
}

export function RouteStoryBuilder() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const titleId = useId();
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const last = STOPS.length - 1;
  const stop = STOPS[state.stop];
  const legsState = legStates(stop);
  const pointsState = pointStates(stop);

  const go = (i: number, focus = false) => {
    const next = Math.max(0, Math.min(last, i));
    dispatch({ type: 'select', stop: next });
    if (focus) btnRefs.current[next]?.focus();
  };

  // ↓ / ← (forward in RTL) → next stop · ↑ / → → previous · Home / End
  const onListKey = (e: ReactKeyboardEvent<HTMLOListElement>) => {
    const from = btnRefs.current.indexOf(e.target as HTMLButtonElement);
    if (from < 0) return;
    const target: Record<string, number> = {
      ArrowDown: from + 1,
      ArrowLeft: from + 1,
      ArrowUp: from - 1,
      ArrowRight: from - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in target)) return;
    e.preventDefault();
    go(target[e.key], true);
  };

  return (
    <div data-qa="route-builder" data-done={state.done || undefined} className="surface-elevated p-6 lg:p-8">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6 items-start">
        <div>
          <h3 id={titleId} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
            סיפור דרך: חמש נקודות וארבעה קטעים
          </h3>
          <p className="mt-2 mb-4 text-base text-fg-muted leading-relaxed">
            כל <strong className="text-fg">קטע דרך</strong> מחבר שתי נקודות. בחרו נקודה או קטע, ברשימה או במפה. את <strong className="text-fg">קטע ד׳</strong> משלימים בעצמכם מהמפה. הנתונים לדוגמה בלבד.
          </p>
          <ol aria-labelledby={titleId} onKeyDown={onListKey} className="space-y-1">
            {STOPS.map((s, k) => {
              const selected = state.stop === k;
              const common = {
                ref: (el: HTMLButtonElement | null) => {
                  btnRefs.current[k] = el;
                },
                type: 'button' as const,
                tabIndex: selected ? 0 : -1,
                onClick: () => go(k),
                'aria-current': selected ? ('step' as const) : undefined,
              };
              if (s.kind === 'point') {
                const p = POINTS[s.i];
                const st = pointsState[s.i];
                return (
                  <li key={k}>
                    <button
                      {...common}
                      data-stop-row={`point:${s.i}`}
                      className={cn(ROW, 'py-1.5', selected ? 'border-accent before:bg-accent/10' : 'border-transparent hover:before:bg-brand/[0.04]')}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'size-8 shrink-0 rounded-full grid place-items-center font-display text-sm font-bold tabular-nums transition-colors duration-200',
                          st === 'focus'
                            ? 'bg-accent text-white'
                            : st === 'passed' || st === 'from'
                              ? 'bg-brand/15 text-brand-dark'
                              : st === 'to'
                                ? 'border-2 border-accent bg-bg-elevated text-ember-deep'
                                : 'border border-border-strong/60 bg-bg-elevated text-fg-muted'
                        )}
                      >
                        {p.n}
                      </span>
                      <span className="flex-1 min-w-0 font-display text-base font-bold leading-tight text-fg">
                        <span className="sr-only">נקודה {p.n}: </span>
                        {p.name}
                        {p.abbr && <span className="font-medium text-fg-muted"> ({p.abbr})</span>}
                      </span>
                    </button>
                  </li>
                );
              }
              const leg = LEGS[s.i];
              const st = legsState[s.i];
              const hidden = isHidden(s.i, state.done);
              return (
                <li key={k}>
                  <button
                    {...common}
                    data-stop-row={`leg:${s.i}`}
                    className={cn(
                      ROW,
                      'py-2 bg-bg-elevated',
                      selected ? 'border-accent before:bg-accent/10' : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]'
                    )}
                  >
                    {/* the leg as a stretch of route between two point badges: solid = selected / walked, dashed = leaving the selected point / ahead */}
                    <span aria-hidden className="w-8 shrink-0 flex justify-center">
                      <span
                        className={cn(
                          'h-8 border-s-[3px] transition-colors duration-200',
                          st === 'focus' ? 'border-solid border-accent' : st === 'next' ? 'border-dashed border-accent' : st === 'walked' ? 'border-solid border-brand' : 'border-dashed border-border-strong/70'
                        )}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display text-base font-bold leading-tight text-fg">קטע {leg.letter}</span>
                      <span className="block text-sm leading-snug text-fg-muted">
                        מנקודה {leg.from + 1} אל נקודה {leg.to + 1}
                        {hidden && ' · להשלמה'}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        dir="ltr"
                        className={cn(
                          'inline-flex h-7 items-center rounded-full px-2.5 font-display text-sm font-bold tabular-nums',
                          hidden ? 'border border-dashed border-accent text-ember-deep' : 'bg-bg-accent text-fg'
                        )}
                      >
                        {hidden ? '?°' : deg(leg.az)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex h-7 items-center rounded-full px-2.5 font-display text-sm font-bold tabular-nums',
                          hidden ? 'border border-dashed border-accent text-ember-deep' : 'bg-bg-accent text-fg'
                        )}
                      >
                        {hidden ? '? מ׳' : metres(leg.m)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-display font-semibold text-fg-muted" aria-hidden data-stop-label>
              {stopLabel(stop)}
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => go(state.stop - 1)}
                disabled={state.stop === 0}
                aria-label="לנקודה או לקטע הקודם"
                className="size-9 rounded-xl border border-border bg-bg-elevated grid place-items-center text-fg-muted transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] hover:text-fg disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon name="arrow-right" size={16} strokeWidth={2} />
              </button>
              {/* the route in miniature: dots = points, bars = legs */}
              <div className="flex items-center gap-1" aria-hidden data-stop-dots>
                {STOPS.map((s, k) => (
                  <span
                    key={k}
                    className={cn(
                      'rounded-full transition-colors duration-300 ease-snap motion-reduce:transition-none',
                      s.kind === 'point' ? 'size-2.5' : 'h-1 w-4',
                      k === state.stop ? 'bg-accent' : k < state.stop ? 'bg-brand' : 'bg-border'
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(state.stop + 1)}
                disabled={state.stop === last}
                aria-label="לנקודה או לקטע הבא"
                className="size-9 rounded-xl border border-border bg-bg-elevated grid place-items-center text-fg-muted transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] hover:text-fg disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon name="arrow-left" size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70">
            <RouteMap stop={state.stop} done={state.done} onSelect={(i) => go(i)} ariaLabel={`מפת סיפור הדרך. ${describe(stop, state.done)}`} />
          </div>
        </div>
      </div>

      <RouteStoryPanel state={state} dispatch={dispatch} />

      <p className="sr-only" aria-live="polite" data-live>
        {describe(stop, state.done)}
      </p>
    </div>
  );
}
