'use client';

/**
 * PagedLearn — renders the `learn` mode one sub-topic at a time.
 *
 *   - One sub-topic is rendered at a time. Scrolling stays *inside* the
 *     active sub-topic; users move between them with Next/Prev buttons at
 *     the bottom or from the lesson's side nav.
 *   - The sub-topic state machine itself (active sub-topic, `#scene-<id>`
 *     hash sync, `learn:next` / `learn:prev`, progress persistence) lives in
 *     `LessonShell` and reaches this component through
 *     `LessonSceneNavContext`. It has to sit above `learn` so the side nav
 *     survives a trip through תרגול / בדיקת ידע and comes back to the
 *     sub-topic the user left. This component only holds the scene
 *     *components*, which the shell has no access to.
 *   - On mount it republishes its own (id, label) list to the shell, which
 *     seeds the same list from `lib/lesson-scenes.ts` for SSR — so if that
 *     static mirror ever drifts from the real SCENES array, the client
 *     corrects it instead of navigating to the wrong sub-topic.
 *
 * Props:
 *   scenes — ordered list (id = URL-hash slug, label = side-nav text).
 */

import { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LessonNavContext, LessonSceneNavContext } from './lesson-nav-context';
import type { LessonNavInfo } from './lesson-nav-context';
import { SceneStepContext } from './scene-context';
import { cn } from '@/lib/utils';

export type { SceneChangeDetail } from './lesson-nav-context';

export type PagedScene = {
  id: string;
  label: string;
  Comp: React.ComponentType;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

export function PagedLearn({ scenes }: { scenes: PagedScene[] }) {
  const reduce = useReducedMotion();
  // Pulled from LessonShell so the recap can replace its "next sub-topic"
  // slot with a real "next lesson" link (or "סיום הקורס" on the final
  // lesson), and so the mobile strip can headline the lesson.
  const { current: currentLesson, next: nextLesson } = useContext(LessonNavContext);
  const nav = useContext(LessonSceneNavContext);

  // Standalone fallback (no shell above us) — keeps this component usable on
  // its own; inside a lesson the shell is always the source of truth.
  const [localIdx, setLocalIdx] = useState(0);
  const fromNav = nav ? scenes.findIndex((s) => s.id === nav.activeId) : -1;
  const idx = nav ? Math.max(0, fromNav) : localIdx;

  const publishScenes = nav?.publishScenes;
  useEffect(() => {
    publishScenes?.(scenes.map(({ id, label }) => ({ id, label })));
  }, [scenes, publishScenes]);

  const navGoto = nav?.goto;
  const goto = useCallback(
    (i: number) => {
      if (i < 0 || i >= scenes.length) return;
      if (navGoto) navGoto(scenes[i].id);
      else setLocalIdx(i);
    },
    [navGoto, scenes],
  );

  const ActiveScene = scenes[idx].Comp;
  const isFirst = idx === 0;
  const isLast = idx === scenes.length - 1;
  // The hook sub-topic ships its own large CTA ("לחץ כדי להתחיל") that fires
  // `learn:next`, so the bottom prev/next pair would just duplicate it.
  const isHook = scenes[idx].id === 'hook';

  return (
    <div className="relative">
      {/* Mobile / tablet sub-topic strip (everything below xl gets this;
          at xl+ the side nav in LessonShell owns this navigation). */}
      <ScenePagerMobile scenes={scenes} active={idx} onGoto={goto} lesson={currentLesson} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scenes[idx].id}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: easeSnap }}
        >
          {/* SceneStepContext — נשאר זמין ל-SceneHeader המשותף לתאימות לאחור. */}
          <SceneStepContext.Provider value={{ idx, total: scenes.length }}>
            <ActiveScene />
          </SceneStepContext.Provider>
        </motion.div>
      </AnimatePresence>

      {/* Sub-topic prev/next.
          - Hidden entirely on the hook (it has its own primary CTA).
          - On the recap (`isLast`), the "next sub-topic" slot is replaced
            with a real "next LESSON" link (or "סיום הקורס" on the last
            lesson), because there's no further sub-topic in this lesson. */}
      {!isHook && (
        <div className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PrevButton
            disabled={isFirst}
            label={isFirst ? '— תחילת השיעור —' : scenes[idx - 1].label}
            onClick={() => goto(idx - 1)}
          />
          {isLast ? (
            <NextLessonLink next={nextLesson} />
          ) : (
            <NextButton label={scenes[idx + 1].label} onClick={() => goto(idx + 1)} />
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
      className={cn('btn-secondary', disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer')}
      aria-label="תת הנושא הקודם"
    >
      <span className="truncate max-w-[18rem]">{disabled ? label : `הקודם · ${label}`}</span>
    </button>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary cursor-pointer" aria-label="תת הנושא הבא">
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
      <Link href={`/lessons/${next.id}/`} className="btn-primary cursor-pointer" aria-label="לשיעור הבא">
        <span className="truncate max-w-[22rem]">השיעור הבא · {next.shortTitle}</span>
      </Link>
    );
  }
  return (
    <Link href="/" className="btn-primary cursor-pointer" aria-label="סיום הקורס">
      <span>סיום הקורס · חזרה לסילבוס</span>
    </Link>
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
    <div className="xl:hidden max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 mb-6">
      {lesson && (
        <div className="mb-4 pb-3 border-b border-border-subtle">
          <div className="text-sm font-display font-semibold tracking-wider text-fg-muted mb-0.5">
            שיעור {lesson.number}
          </div>
          <h1 className="font-display font-bold text-lg sm:text-xl text-fg leading-tight text-balance">
            {lesson.shortTitle}
          </h1>
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="ניווט תתי-נושא">
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
                'chip whitespace-nowrap transition-all duration-300 ease-snap',
                isActive
                  ? 'bg-accent text-white border-accent font-bold'
                  : isPassed
                    ? 'bg-bg-accent text-fg-muted border-border'
                    : 'bg-bg-elevated text-fg-dim border-border hover:border-brand/30 hover:bg-brand/[0.03]',
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
