'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordLessonVisit, recordSceneVisit } from '@/lib/last-visit';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import type { SceneMeta } from '@/lib/lesson-scenes';
import { LessonSidebar, LESSON_TABS } from './LessonSidebar';
import {
  LessonNavContext,
  LessonSceneNavContext,
  type LessonTab,
  type SceneChangeDetail,
} from './lesson-nav-context';
import { cn } from '@/lib/utils';

// Re-exported so the handful of modules that still import these from here
// (LessonToc / LessonUtilityBar / SceneNavigation) keep working; new code
// should import from './lesson-nav-context' directly.
export { LessonNavContext } from './lesson-nav-context';
export type { LessonNavInfo } from './lesson-nav-context';

const easeSnap = [0.22, 1, 0.36, 1] as const;

function emitSceneChange(scenes: SceneMeta[], idx: number) {
  const detail: SceneChangeDetail = {
    id: scenes[idx].id,
    idx,
    isFirst: idx === 0,
    isLast: idx === scenes.length - 1,
    total: scenes.length,
  };
  window.dispatchEvent(new CustomEvent<SceneChangeDetail>('learn:scene-change', { detail }));
}

/**
 * LessonShell owns everything that has to outlive a single lesson mode:
 * the active mode itself, and the sub-topic state machine (active sub-topic,
 * `#scene-…` hash sync, `learn:next` / `learn:prev`, progress persistence).
 *
 * The sub-topic machine used to live in `PagedLearn`, which only exists on
 * the `learn` mode — so the side nav died whenever you opened תרגול or
 * בדיקת ידע. Hoisting it here gives one shared nav shell that stays mounted
 * across all three modes, and makes "go to תרגול and come back" land on the
 * sub-topic you left rather than on the hook.
 *
 * `scenes` seeds that machine from `lib/lesson-scenes.ts` so the list is
 * already complete in the server-rendered HTML; `PagedLearn` republishes the
 * list it actually renders, so a drift between the two self-heals.
 */
export function LessonShell({
  lesson,
  scenes = [],
  prev,
  next,
  learn,
  practice,
  check,
}: {
  lesson: Lesson;
  scenes?: SceneMeta[];
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
  learn: React.ReactNode;
  practice: React.ReactNode;
  check: React.ReactNode;
}) {
  const [tab, setTab] = useState<LessonTab>('learn');
  const reduce = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  const [sceneList, setSceneList] = useState<SceneMeta[]>(scenes);
  const [activeId, setActiveId] = useState<string | null>(scenes[0]?.id ?? null);

  const foundIdx = sceneList.findIndex((s) => s.id === activeId);
  const activeIdx = foundIdx >= 0 ? foundIdx : 0;

  // Record the visit so the landing page's "continue" button can return the
  // user here. The sub-topic is refined by the two effects below.
  useEffect(() => {
    recordLessonVisit({
      topicId: lesson.id,
      topicNumber: lesson.number,
      topicShortTitle: lesson.shortTitle,
    });
  }, [lesson.id, lesson.number, lesson.shortTitle]);

  /** Called by PagedLearn with the list it really renders. */
  const publishScenes = useCallback((incoming: SceneMeta[]) => {
    setSceneList((current) =>
      current.length === incoming.length &&
      current.every((s, i) => s.id === incoming[i].id && s.label === incoming[i].label)
        ? current
        : incoming,
    );
  }, []);

  const persist = useCallback(
    (list: SceneMeta[], i: number) => {
      recordSceneVisit({
        topicId: lesson.id,
        sceneId: list[i].id,
        sceneLabel: list[i].label,
        sceneIdx: i,
        sceneTotal: list.length,
      });
    },
    [lesson.id],
  );

  // Sync from the hash on mount, on hashchange (browser back/forward), and
  // again if PagedLearn corrects the scene list under us.
  useEffect(() => {
    if (sceneList.length === 0) return;
    const fromHash = () => {
      const raw = window.location.hash.replace('#scene-', '');
      const hit = sceneList.findIndex((s) => s.id === raw);
      const i = hit >= 0 ? hit : 0;
      setActiveId(sceneList[i].id);
      emitSceneChange(sceneList, i);
      persist(sceneList, i);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [sceneList, persist]);

  const gotoScene = useCallback(
    (id: string) => {
      const i = sceneList.findIndex((s) => s.id === id);
      if (i < 0) return;
      setActiveId(id);
      const { pathname, search } = window.location;
      history.replaceState(null, '', `${pathname}${search}#scene-${id}`);
      emitSceneChange(sceneList, i);
      persist(sceneList, i);
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    [sceneList, persist],
  );

  // Any descendant can advance/rewind without prop drilling — used by the
  // hook scene's "לחץ כדי להתחיל" CTA.
  useEffect(() => {
    const step = (delta: number) => () => {
      const from = sceneList.findIndex((s) => s.id === activeId);
      const target = (from >= 0 ? from : 0) + delta;
      if (target < 0 || target >= sceneList.length) return;
      gotoScene(sceneList[target].id);
    };
    const onNext = step(1);
    const onPrev = step(-1);
    window.addEventListener('learn:next', onNext);
    window.addEventListener('learn:prev', onPrev);
    return () => {
      window.removeEventListener('learn:next', onNext);
      window.removeEventListener('learn:prev', onPrev);
    };
  }, [sceneList, activeId, gotoScene]);

  // On `learn` the recap sub-topic renders its own "next lesson" link via
  // PagedLearn, so this footer would duplicate it. It only earns its place
  // on practice / check (which aren't paged).
  const showLessonNav = tab !== 'learn';
  const content = tab === 'learn' ? learn : tab === 'practice' ? practice : check;
  const current = { number: lesson.number, shortTitle: lesson.shortTitle };

  return (
    <LessonNavContext.Provider value={{ current, prev, next }}>
      <LessonSceneNavContext.Provider
        value={{ scenes: sceneList, activeId, activeIdx, goto: gotoScene, publishScenes }}
      >
        {/* Desktop (xl+): the one navigation surface — modes + sub-topics.
            Rendered outside the mode cross-fade below so it never animates,
            never remounts, and never loses keyboard focus on a mode switch. */}
        <LessonSidebar
          lesson={current}
          tab={tab}
          onTabChange={setTab}
          scenes={sceneList}
          activeIdx={activeIdx}
          onGotoScene={gotoScene}
        />

        {/* `--lesson-content-inset` is 0 below xl, so this single padding is
            the only place the content column is moved aside for the nav. */}
        <div className="min-h-[calc(100dvh-var(--header-h))] flex flex-col ps-[var(--lesson-content-inset)]">
          {/* Below xl the modes stay in the old sticky strip (a separate
              mobile pass will fold them in). `data-lesson-tabs-header` is
              still read by HookSceneLayout to drop this strip's fill over a
              hook backdrop — a no-op on desktop, where it isn't rendered. */}
          <header
            data-lesson-tabs-header
            className="xl:hidden sticky top-[var(--header-h)] z-30 bg-[#EBE9E4]"
          >
            <LayoutGroup id={`lesson-tabs-${lesson.id}`}>
              <nav
                className="me-auto pe-4 sm:pe-6 lg:pe-8 ps-0 flex gap-1 relative"
                role="tablist"
                aria-label="חלקי השיעור"
              >
                {LESSON_TABS.map(({ key, label, Icon }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      id={`lesson-tab-bar-${key}`}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      aria-controls={`lesson-panel-${key}`}
                      onClick={() => setTab(key)}
                      className={cn(
                        'relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-display font-semibold transition-colors',
                        active ? 'text-brand-dark' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 transition-colors',
                          active ? 'text-brand-dark' : 'text-fg-dim',
                        )}
                        aria-hidden
                      />
                      <span>{label}</span>
                      {active && (
                        <motion.span
                          layoutId={`lesson-tab-indicator-${lesson.id}`}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-dark rounded-full"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>
          </header>

          {/* Main content with cross-fade between modes. */}
          <main className="flex-1">
            <div
              ref={contentRef}
              className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 scroll-mt-24"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  id={`lesson-panel-${tab}`}
                  role="tabpanel"
                  aria-labelledby={`lesson-tab-${tab}`}
                  className={tab === 'learn' ? undefined : 'max-w-lesson mx-auto px-4 sm:px-6 lg:px-8'}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: easeSnap }}
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Footer prev/next lesson cards — practice / check only. */}
          {showLessonNav && (
            <footer className="border-t border-border-subtle bg-bg-elevated/40 mt-8">
              <div className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prev ? (
                  <Link
                    href={`/lessons/${prev.id}/`}
                    className="group surface p-4 hover:border-brand/30 hover:bg-brand/[0.03] hover:shadow-elevated transition-all duration-200 ease-snap flex items-center gap-3 text-start"
                  >
                    <ArrowRight
                      className="size-5 shrink-0 text-fg-dim group-hover:text-brand-dark group-hover:translate-x-0.5 transition-all"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
                        השיעור הקודם
                      </div>
                      <div className="font-display font-bold leading-tight text-black text-lg md:text-xl truncate">
                        {prev.shortTitle}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <span aria-hidden />
                )}

                {next ? (
                  <Link
                    href={`/lessons/${next.id}/`}
                    className="group surface p-4 border-accent bg-accent/10 hover:shadow-elevated transition-all duration-200 ease-snap flex items-center gap-3 sm:text-end flex-row-reverse sm:flex-row"
                  >
                    <ArrowLeft
                      className="size-5 shrink-0 text-accent group-hover:-translate-x-0.5 transition-all"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 text-start sm:text-end">
                      <div className="text-sm font-display font-semibold tracking-wider text-accent">
                        השיעור הבא
                      </div>
                      <div className="font-display font-bold leading-tight text-black text-lg md:text-xl truncate">
                        {next.shortTitle}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="group surface p-4 border-accent bg-accent/10 hover:shadow-elevated transition-all duration-200 ease-snap flex items-center gap-3 text-start"
                  >
                    <Check className="size-5 shrink-0 text-accent" aria-hidden />
                    <div className="min-w-0 flex-1 text-start">
                      <div className="text-sm font-display font-semibold tracking-wider text-accent">
                        סיום הקורס
                      </div>
                      <div className="font-display font-bold leading-tight text-black text-lg md:text-xl truncate">
                        חזרה לסילבוס
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </footer>
          )}
        </div>
      </LessonSceneNavContext.Provider>
    </LessonNavContext.Provider>
  );
}
