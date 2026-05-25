'use client';

/**
 * PagedLearn — replaces the long-scroll lesson layout with a paged one.
 *
 *   - One sub-topic is rendered at a time. Scrolling stays *inside* the
 *     active sub-topic; users move between them with Next/Prev buttons
 *     at the bottom or by clicking the side TOC.
 *   - Active sub-topic is persisted in `window.location.hash`
 *     (`#scene-<id>`) so a refresh keeps the user on the same one and
 *     links can deep-link into a specific sub-topic.
 *   - Fires a `learn:scene-change` CustomEvent on mount and on every
 *     navigation. LessonShell listens to this to decide when to show
 *     the move-to-next-lesson footer (only on the recap).
 *   - Any descendant can advance/rewind by dispatching `learn:next` /
 *     `learn:prev` on `window`. Used by the hook scene's
 *     "לחץ כדי להתחיל" button without prop drilling.
 *
 * Props:
 *   scenes — ordered list (id = URL-hash slug, label = TOC text).
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

export type SceneChangeDetail = {
  id: string;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  total: number;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

function emitChange(detail: SceneChangeDetail) {
  window.dispatchEvent(new CustomEvent<SceneChangeDetail>('learn:scene-change', { detail }));
}

export function PagedLearn({ scenes }: { scenes: PagedScene[] }) {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync from hash on mount + on hashchange (browser back/forward).
  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace('#scene-', '');
      if (!raw) {
        setIdx(0);
        emitChange({ id: scenes[0].id, idx: 0, isFirst: true, isLast: scenes.length === 1, total: scenes.length });
        return;
      }
      const i = scenes.findIndex((s) => s.id === raw);
      if (i >= 0) {
        setIdx(i);
        emitChange({ id: scenes[i].id, idx: i, isFirst: i === 0, isLast: i === scenes.length - 1, total: scenes.length });
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [scenes]);

  const goto = useCallback(
    (i: number) => {
      if (i < 0 || i >= scenes.length) return;
      setIdx(i);
      const { pathname, search } = window.location;
      history.replaceState(null, '', `${pathname}${search}#scene-${scenes[i].id}`);
      emitChange({ id: scenes[i].id, idx: i, isFirst: i === 0, isLast: i === scenes.length - 1, total: scenes.length });
      setTimeout(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    [scenes],
  );

  // Allow any child to trigger nav via custom events (no prop drilling).
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
    // xl+: reserve 210px on the right (start-side in RTL) for the fixed
    // TOC. Content shifts slightly left to make room; the TOC stays
    // pinned to the viewport so it never overlaps the reading column.
    <div className="relative scroll-mt-28 xl:ps-[210px]" ref={rootRef}>
      {/* Mobile / tablet sub-topic strip (everything below xl gets this) */}
      <ScenePagerMobile scenes={scenes} active={idx} onGoto={goto} />

      {/* Desktop TOC — fixed to the viewport's right edge, always
          visible on xl+. Doesn't scroll with the content. The ps-[210px]
          above guarantees zero overlap with the active sub-topic. */}
      <ScenePagerDesktop scenes={scenes} active={idx} onGoto={goto} />

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

      {/* Sub-topic prev/next. The page-level (lesson→lesson) nav lives
          in LessonShell's footer and is shown only on the recap. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PrevButton
          disabled={isFirst}
          label={isFirst ? '— תחילת השיעור —' : scenes[idx - 1].label}
          onClick={() => goto(idx - 1)}
        />
        <NextButton
          disabled={isLast}
          label={isLast ? '— סיום השיעור —' : scenes[idx + 1].label}
          onClick={() => goto(idx + 1)}
        />
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
      aria-label="תת הנושא הקודם"
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
          תת הנושא הקודם
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
      aria-label="תת הנושא הבא"
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
          תת הנושא הבא
        </div>
        <div className="text-sm md:text-[15px] font-display font-semibold text-fg truncate">
          {label}
        </div>
      </div>
    </button>
  );
}

/* ────── Desktop TOC — fixed to viewport's right edge ──────────────
   Shown at xl+ (≥1280px). The PagedLearn root adds `xl:ps-[210px]` so
   the active sub-topic shifts left by exactly the column the TOC
   occupies — no overlap. `start-3` in RTL = 12px from the right edge
   of the viewport. The panel is `position: fixed` so it doesn't move
   with the page scroll; its own card has bg+border for separation. */
function ScenePagerDesktop({
  scenes,
  active,
  onGoto,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
}) {
  return (
    <aside
      className="hidden xl:block fixed start-3 top-32 z-20 w-[190px] max-h-[calc(100vh-160px)] overflow-y-auto"
      aria-label="ניווט תתי-נושא"
    >
      <div className="rounded-xl border border-border bg-bg-elevated/95 backdrop-blur-md shadow-elevated p-3">
        <div className="text-[10px] font-display font-semibold text-fg-muted tracking-[0.2em] uppercase px-1.5 mb-2">
          תוכן השיעור
        </div>
        <div className="flex flex-col gap-0.5">
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
                  'group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-right',
                  isActive
                    ? 'bg-accent/15 text-fg'
                    : 'hover:bg-bg-accent text-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full shrink-0 transition-colors',
                    isActive ? 'bg-accent shadow-glow' : isPassed ? 'bg-fg-muted' : 'bg-border-strong',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-[12.5px] leading-snug transition-colors truncate',
                    isActive && 'font-semibold',
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-border-subtle px-1.5">
          <div className="h-1 rounded-full bg-bg-accent overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-accent to-accent-cool"
              animate={{ width: `${((active + 1) / scenes.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ────── Mobile / tablet — horizontal scrollable pill strip ───────── */
function ScenePagerMobile({
  scenes,
  active,
  onGoto,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
}) {
  return (
    <div className="xl:hidden max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 pb-2 overflow-x-auto">
      <div className="flex gap-1.5 min-w-max" role="tablist" aria-label="ניווט תתי-נושא">
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
              aria-label={`תת נושא: ${s.label}`}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-accent text-bg font-bold border-accent shadow-glow'
                  : isPassed
                    ? 'bg-bg-accent text-fg-muted border-border'
                    : 'bg-bg-elevated text-fg-dim border-border hover:text-fg',
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
