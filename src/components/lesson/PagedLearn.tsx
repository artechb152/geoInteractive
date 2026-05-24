'use client';

/**
 * PagedLearn — replaces the long-scroll lesson layout with a paged one.
 *
 *   - One sub-scene is rendered at a time. Scrolling stays *inside* the
 *     active scene; users move between sub-topics with Next/Prev buttons
 *     at the bottom or by clicking the side scene-pager.
 *   - Active scene is persisted in `window.location.hash` (`#scene-<id>`)
 *     so a refresh keeps the user on the same sub-topic and links can
 *     deep-link into a specific scene.
 *   - Any descendant can advance/rewind the lesson by dispatching a
 *     `learn:next` / `learn:prev` custom event on `window`. Useful for
 *     the hook scene's "click to start" affordance.
 *
 * Props:
 *   scenes — ordered list of sub-scenes (id is used for the URL hash,
 *            label appears in the side pager + bottom nav cards).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PagedScene = {
  id: string;
  label: string;
  Comp: React.ComponentType;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

export function PagedLearn({ scenes }: { scenes: PagedScene[] }) {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync from hash on mount + on hashchange (browser back/forward).
  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace('#scene-', '');
      if (!raw) return;
      const i = scenes.findIndex((s) => s.id === raw);
      if (i >= 0) setIdx(i);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [scenes]);

  const goto = useCallback(
    (i: number) => {
      if (i < 0 || i >= scenes.length) return;
      setIdx(i);
      // Update the hash silently (no history entry, no jump-scroll).
      const { pathname, search } = window.location;
      history.replaceState(null, '', `${pathname}${search}#scene-${scenes[i].id}`);
      // After the new scene mounts, scroll its container into view so the
      // user lands at the top of the sub-topic rather than mid-scroll.
      setTimeout(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    [scenes],
  );

  // Bridge: let any child trigger nav via custom events without prop drilling.
  useEffect(() => {
    const next = () => goto(idx + 1);
    const prev = () => goto(idx - 1);
    window.addEventListener('learn:next', next);
    window.addEventListener('learn:prev', prev);
    return () => {
      window.removeEventListener('learn:next', next);
      window.removeEventListener('learn:prev', prev);
    };
  }, [idx, goto]);

  const ActiveScene = scenes[idx].Comp;
  const isFirst = idx === 0;
  const isLast = idx === scenes.length - 1;

  return (
    <div ref={rootRef} className="relative scroll-mt-28">
      <ScenePager scenes={scenes} active={idx} onGoto={goto} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scenes[idx].id}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: easeSnap }}
        >
          <ActiveScene />
        </motion.div>
      </AnimatePresence>

      {/* Scene-level prev/next — these advance between sub-scenes of THIS
          lesson. The page-level prev/next (in LessonShell footer) moves
          between *lessons*, and renders below this block. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PrevButton disabled={isFirst} label={isFirst ? '— תחילת השיעור —' : scenes[idx - 1].label} onClick={() => goto(idx - 1)} />
        <NextButton disabled={isLast} label={isLast ? '— סיום השיעור —' : scenes[idx + 1].label} onClick={() => goto(idx + 1)} />
      </div>
    </div>
  );
}

function PrevButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group rounded-xl border p-3.5 text-right transition-all flex items-center gap-3',
        disabled
          ? 'border-border-subtle bg-bg-elevated/30 opacity-40 cursor-not-allowed'
          : 'border-border bg-bg-elevated hover:border-brand/40 hover:shadow-elevated cursor-pointer',
      )}
      aria-label="הסצנה הקודמת"
    >
      <ArrowRight
        className={cn(
          'size-5 shrink-0 text-fg-dim',
          !disabled && 'group-hover:text-brand-dark group-hover:translate-x-0.5 transition-all',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-right">
        <div className="text-[11px] font-display font-semibold tracking-wider text-fg-dim uppercase">
          הסצנה הקודמת
        </div>
        <div className="text-sm md:text-[15px] font-display font-semibold text-fg truncate">
          {label}
        </div>
      </div>
    </button>
  );
}

function NextButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group rounded-xl border p-3.5 transition-all flex items-center gap-3 flex-row-reverse',
        disabled
          ? 'border-border-subtle bg-bg-elevated/30 opacity-40 cursor-not-allowed'
          : 'border-accent/40 bg-accent/10 hover:bg-accent hover:border-accent shadow-glow cursor-pointer',
      )}
      aria-label="הסצנה הבאה"
    >
      <ArrowLeft
        className={cn(
          'size-5 shrink-0',
          disabled
            ? 'text-fg-dim'
            : 'text-accent-hover group-hover:text-fg group-hover:-translate-x-0.5 transition-all',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-left">
        <div
          className={cn(
            'text-[11px] font-display font-semibold tracking-wider uppercase transition-colors',
            disabled ? 'text-fg-dim' : 'text-accent-hover group-hover:text-fg/80',
          )}
        >
          הסצנה הבאה
        </div>
        <div className="text-sm md:text-[15px] font-display font-semibold text-fg truncate">
          {label}
        </div>
      </div>
    </button>
  );
}

/**
 * ScenePager — the persistent scene-list nav.
 * - xl+ : vertical column docked to the page edge, labels always visible.
 * - <xl : horizontal scrollable strip of pills rendered just above the
 *         active scene's content so it stays inside the readable column.
 */
function ScenePager({
  scenes,
  active,
  onGoto,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden xl:flex fixed start-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-0.5 pointer-events-auto max-w-[220px]"
        aria-label="ניווט סצנות בשיעור"
      >
        <div className="mb-3 ps-2">
          <div className="text-[10px] font-display font-semibold text-fg-muted tracking-[0.2em] mb-1 uppercase">
            סצנה
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl text-accent tabular-nums leading-none">
              {String(active + 1).padStart(2, '0')}
            </span>
            <span className="text-fg-dim text-sm">
              / {String(scenes.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 bg-bg/60 backdrop-blur-sm rounded-lg p-1.5 border border-border-subtle">
          {scenes.map((s, i) => {
            const isActive = i === active;
            const isPassed = i < active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onGoto(i)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group flex items-start gap-2.5 px-2 py-1.5 rounded-md transition-all cursor-pointer text-right',
                  isActive ? 'bg-accent/12' : 'hover:bg-bg-accent',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10px] mt-1 w-4 text-end shrink-0 transition-colors',
                    isActive
                      ? 'text-accent font-bold'
                      : isPassed
                        ? 'text-fg-muted'
                        : 'text-fg-dim',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'text-xs leading-snug transition-colors',
                    isActive
                      ? 'text-fg font-semibold'
                      : isPassed
                        ? 'text-fg-muted'
                        : 'text-fg-dim group-hover:text-fg-muted',
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile / tablet */}
      <div className="xl:hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6 pb-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max" role="tablist" aria-label="ניווט סצנות">
          {scenes.map((s, i) => {
            const isActive = i === active;
            const isPassed = i < active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                onClick={() => onGoto(i)}
                aria-selected={isActive}
                aria-label={`סצנה ${i + 1}: ${s.label}`}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border',
                  isActive
                    ? 'bg-accent text-bg font-bold border-accent shadow-glow'
                    : isPassed
                      ? 'bg-bg-accent text-fg-muted border-border'
                      : 'bg-bg-elevated text-fg-dim border-border hover:text-fg',
                )}
              >
                <span className="font-mono text-[10px] opacity-70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
