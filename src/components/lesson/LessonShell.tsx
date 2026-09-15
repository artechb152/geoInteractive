'use client';

import Link from 'next/link';
import { createContext, useEffect, useState } from 'react';
import { recordLessonVisit } from '@/lib/last-visit';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Crosshair, ListChecks, Check } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import { cn } from '@/lib/utils';

/**
 * Carries the prev/next lesson info AND the current lesson down to
 * PagedLearn. PagedLearn uses `current` to render the lesson header at
 * the top of its TOC sidebar (since the lesson title was removed from
 * the secondary header per a site-wide design pass) and `next` to
 * render the recap sub-topic's "next lesson" link.
 */
export type LessonNavInfo = {
  current?: { number: number; shortTitle: string };
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
};

export const LessonNavContext = createContext<LessonNavInfo>({});

type Tab = 'learn' | 'practice' | 'check';

const TABS: { key: Tab; label: string; Icon: typeof BookOpen }[] = [
  { key: 'learn', label: 'לימוד', Icon: BookOpen },
  { key: 'practice', label: 'תרגול', Icon: Crosshair },
  { key: 'check', label: 'בדיקת ידע', Icon: ListChecks },
];

const easeSnap = [0.22, 1, 0.36, 1] as const;

export function LessonShell({
  lesson,
  prev,
  next,
  learn,
  practice,
  check,
}: {
  lesson: Lesson;
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
  learn: React.ReactNode;
  practice: React.ReactNode;
  check: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('learn');
  const reduce = useReducedMotion();

  // Record the visit so the landing page's "continue" button can return
  // the user here. PagedLearn refines this with the active sub-topic.
  useEffect(() => {
    recordLessonVisit({
      topicId: lesson.id,
      topicNumber: lesson.number,
      topicShortTitle: lesson.shortTitle,
    });
  }, [lesson.id, lesson.number, lesson.shortTitle]);

  // On the `learn` tab the recap sub-topic now renders a "next lesson"
  // link inline via PagedLearn (consuming LessonNavContext), so the
  // footer below would be a duplicate. It's only useful on the
  // practice / check tabs (which aren't paged).
  const showLessonNav = tab !== 'learn';

  const content = tab === 'learn' ? learn : tab === 'practice' ? practice : check;

  return (
    <div className="min-h-[calc(100dvh-var(--header-h))] flex flex-col">
      {/* ── Sticky secondary header — just the three tabs.
              On xl+ the header is shifted left by the TOC drawer's
              width (7vw, matching ScenePagerDesktop in PagedLearn.tsx)
              so it never crosses the white TOC strip, giving the
              impression that the tabs sit ABOVE the lesson content
              column only. The bg is a flat `#EBE9E4` so it blends
              with the lesson content behind it, and there is no
              border / underline between the tabs and the lesson
              content below. ─────────────────────────── */}
      <header data-lesson-tabs-header className="sticky top-[var(--header-h)] z-30 bg-[#EBE9E4] xl:ms-[13vw]">
        <LayoutGroup id={`lesson-tabs-${lesson.id}`}>
          <nav
            className="me-auto pe-4 sm:pe-6 lg:pe-8 ps-0 flex gap-1 relative"
            role="tablist"
            aria-label="חלקי השיעור"
          >
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  aria-controls={`lesson-panel-${key}`}
                  id={`lesson-tab-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-display font-semibold transition-colors',
                    active
                      ? 'text-accent'
                      : 'text-fg-muted hover:text-brand-dark',
                  )}
                >
                  <span>{label}</span>
                  {active && (
                    <motion.span
                      layoutId={`lesson-tab-indicator-${lesson.id}`}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                      className="absolute inset-x-2 -bottom-px h-1 bg-accent rounded-full"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </header>

      {/* ── Main content with cross-fade between tabs ────────────────── */}
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6">
          <LessonNavContext.Provider value={{ current: { number: lesson.number, shortTitle: lesson.shortTitle }, prev, next }}>
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
          </LessonNavContext.Provider>
        </div>
      </main>

      {/* ── Footer prev/next nav as cards — only shown on the recap
              sub-topic of `learn`, or on `practice` / `check` tabs ──── */}
      {showLessonNav && (
      <footer className="border-t border-border-subtle bg-bg-elevated/40 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Check
                className="size-5 shrink-0 text-accent"
                aria-hidden
              />
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
  );
}
