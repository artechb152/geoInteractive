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

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { LessonNavContext } from '@/components/lesson/LessonShell';
import type { LessonNavInfo } from '@/components/lesson/LessonShell';
import { recordSceneVisit } from '@/lib/last-visit';
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

/**
 * Pulls the current `topic-XX` from the URL so PagedLearn can persist
 * the active sub-topic without prop-drilling the lesson id through
 * every topic component.
 */
function currentTopicIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/\/lessons\/([^/]+)/);
  return m?.[1] ?? null;
}

function persistScene(scenes: PagedScene[], i: number) {
  const topicId = currentTopicIdFromUrl();
  if (!topicId) return;
  recordSceneVisit({
    topicId,
    sceneId: scenes[i].id,
    sceneLabel: scenes[i].label,
    sceneIdx: i,
    sceneTotal: scenes.length,
  });
}

export function PagedLearn({ scenes }: { scenes: PagedScene[] }) {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  // Pulled from LessonShell so the recap can replace its "next sub-
  // topic" slot with a real "next lesson" link (or "סיום הקורס" on
  // the final lesson). `current` headlines the TOC sidebar since the
  // lesson title was removed from the secondary header.
  const { current: currentLesson, next: nextLesson } = useContext(LessonNavContext);

  // Sync from hash on mount + on hashchange (browser back/forward).
  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace('#scene-', '');
      if (!raw) {
        setIdx(0);
        emitChange({ id: scenes[0].id, idx: 0, isFirst: true, isLast: scenes.length === 1, total: scenes.length });
        persistScene(scenes, 0);
        return;
      }
      const i = scenes.findIndex((s) => s.id === raw);
      if (i >= 0) {
        setIdx(i);
        emitChange({ id: scenes[i].id, idx: i, isFirst: i === 0, isLast: i === scenes.length - 1, total: scenes.length });
        persistScene(scenes, i);
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
      persistScene(scenes, i);
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
  // The hook sub-topic ships its own large CTA ("לחץ כדי להתחיל")
  // that fires `learn:next`, so the bottom prev/next pair would just
  // duplicate it. Hide them on the hook only.
  const isHook = scenes[idx].id === 'hook';

  return (
    // xl+: the TOC is now a full-height drawer flush to the viewport
    // start (right in RTL). Width is 160px, so 180px of padding-start
    // leaves a clear 20px gap between the TOC's inner edge and the
    // first column of lesson content.
    <div className="relative scroll-mt-28 xl:ps-[180px]" ref={rootRef}>
      {/* Mobile / tablet sub-topic strip (everything below xl gets this) */}
      <ScenePagerMobile scenes={scenes} active={idx} onGoto={goto} lesson={currentLesson} />

      {/* Desktop TOC — fixed to the viewport's right edge, always
          visible on xl+. Doesn't scroll with the content. The ps-[210px]
          above guarantees zero overlap with the active sub-topic. */}
      <ScenePagerDesktop scenes={scenes} active={idx} onGoto={goto} lesson={currentLesson} />

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

      {/* Sub-topic prev/next.
          - Hidden entirely on the hook (it has its own primary CTA).
          - On the recap (`isLast`), the "next sub-topic" slot is
            replaced with a real "next LESSON" link (or "סיום הקורס"
            on the last lesson), because there's no further sub-topic
            in this lesson. */}
      {!isHook && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PrevButton
            disabled={isFirst}
            label={isFirst ? '— תחילת השיעור —' : scenes[idx - 1].label}
            onClick={() => goto(idx - 1)}
          />
          {isLast ? (
            <NextLessonLink next={nextLesson} />
          ) : (
            <NextButton
              label={scenes[idx + 1].label}
              onClick={() => goto(idx + 1)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Prev/Next pair at the bottom of every sub-topic. Both follow the site's
 * "regular button" pattern: pill-shaped, accent fill on primary (Next),
 * outline on ghost (Prev). No eyebrow, no card — just a clean button row.
 */
function PrevButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] transition-colors',
        disabled
          ? 'border border-border-subtle text-fg-dim opacity-40 cursor-not-allowed'
          : 'border border-accent/40 text-accent hover:bg-accent/10 cursor-pointer',
      )}
      aria-label="תת הנושא הקודם"
    >
      <span className="truncate max-w-[18rem]">{disabled ? label : `הקודם · ${label}`}</span>
    </button>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] bg-accent text-bg-elevated hover:bg-accent-hover transition-colors cursor-pointer"
      aria-label="תת הנושא הבא"
    >
      <span className="truncate max-w-[20rem]">הבא · {label}</span>
    </button>
  );
}

/**
 * Renders in the recap's "next sub-topic" slot. Either:
 *   - a primary orange button linking to the next lesson, OR
 *   - a primary orange button back to the syllabus marked "סיום הקורס"
 *     (last lesson of the course).
 *
 * Visual treatment matches NextButton so the row reads the same way
 * regardless of whether it's a sub-topic next or a lesson next.
 */
function NextLessonLink({ next }: { next?: { id: string; shortTitle: string } }) {
  if (next) {
    return (
      <Link
        href={`/lessons/${next.id}/`}
        className="inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] bg-accent text-bg-elevated hover:bg-accent-hover transition-colors cursor-pointer"
        aria-label="לשיעור הבא"
      >
        <span className="truncate max-w-[22rem]">השיעור הבא · {next.shortTitle}</span>
      </Link>
    );
  }
  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] bg-accent text-bg-elevated hover:bg-accent-hover transition-colors cursor-pointer"
      aria-label="סיום הקורס"
    >
      <span>סיום הקורס · חזרה לסילבוס</span>
    </Link>
  );
}

/* ────── Desktop TOC — full-height drawer flush to the viewport edge.
   Shown at xl+ (≥1280px). Sits below the global Navbar (top-12 ≈ 48px)
   and the secondary lesson tabs strip, extending to the bottom of the
   viewport. Rectangular (no rounded corners), with a single inner
   border that separates it from the lesson content column. The
   PagedLearn root adds `xl:ps-[180px]` so content sits clear of the
   drawer. The top of the drawer now headlines the active lesson
   (number + short title), since both were removed from the secondary
   header. */
function ScenePagerDesktop({
  scenes,
  active,
  onGoto,
  lesson,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
  lesson?: LessonNavInfo['current'];
}) {
  return (
    <aside
      className="hidden xl:flex flex-col fixed start-0 top-12 bottom-0 z-20 w-[160px] overflow-y-auto bg-bg-elevated border-e border-border"
      aria-label="ניווט תתי-נושא"
    >
      <div className="p-3 pt-3 flex-1 flex flex-col">
        {lesson && (
          <div className="px-1.5 mb-4 pb-1.5 border-b border-border-subtle">
            <div className="font-display font-bold text-accent text-base mb-1.5">
              שיעור {lesson.number}
            </div>
            <div className="font-display font-bold text-sm text-fg leading-tight text-balance">
              {lesson.shortTitle}
            </div>
          </div>
        )}
        <div className="text-[10px] font-display font-semibold text-fg-muted tracking-[0.2em] uppercase px-1.5 mb-2">
          תוכן השיעור
        </div>
        <div className="flex flex-col gap-0.5">
          {scenes.map((s, i) => {
            const isActive = i === active;
            const isPassed = i < active;
            // Dot colour: orange for everything you've already reached
            // (current + passed) → black for what's still ahead.
            const reached = isActive || isPassed;
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
                    reached ? 'bg-accent' : 'bg-fg',
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
              className="h-full rounded-full bg-accent"
              animate={{ width: `${((active + 1) / scenes.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ────── Mobile / tablet — lesson title + horizontal scrollable pill strip ───────── */
function ScenePagerMobile({
  scenes,
  active,
  onGoto,
  lesson,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
  lesson?: LessonNavInfo['current'];
}) {
  return (
    <div className="xl:hidden max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
      {lesson && (
        <div className="mb-4 pb-3 border-b border-border-subtle">
          <div className="text-[10px] font-display font-semibold text-accent tracking-[0.2em] uppercase mb-0.5">
            שיעור {lesson.number}
          </div>
          <h1 className="font-display font-bold text-lg sm:text-xl text-fg leading-tight text-balance">
            {lesson.shortTitle}
          </h1>
        </div>
      )}
      <div className="flex gap-1.5 min-w-max overflow-x-auto pb-2" role="tablist" aria-label="ניווט תתי-נושא">
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
                  ? 'bg-accent text-bg-elevated font-bold border-accent'
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
