'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Crosshair, ListChecks, Check } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import { cn } from '@/lib/utils';

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

  const content = tab === 'learn' ? learn : tab === 'practice' ? practice : check;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1 flex items-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand-dark transition-colors shrink-0"
          >
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
            <span className="hidden sm:inline">חזרה לסילבוס</span>
            <span className="sm:hidden">סילבוס</span>
          </Link>

          <span className="h-5 w-px bg-border-subtle" aria-hidden />

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2.5 text-xs font-display font-semibold tracking-wider text-fg-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              שיעור {String(lesson.number).padStart(2, '0')}
              <span className="text-fg-dim/60">·</span>
              <span className="text-fg-dim">{lesson.duration} דק'</span>
            </div>
            <h1 className="font-display font-bold tracking-tight truncate text-base md:text-lg text-fg">
              {lesson.shortTitle}
            </h1>
          </div>
        </div>

        {/* Tab nav — sage-dark indicator with framer-motion layout animation */}
        <LayoutGroup id={`lesson-tabs-${lesson.id}`}>
          <nav
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 relative"
            role="tablist"
            aria-label="חלקי השיעור"
          >
            {TABS.map(({ key, label, Icon }) => {
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
                    'relative inline-flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'text-brand-dark'
                      : 'text-fg-muted hover:text-fg',
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
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
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

      {/* ── Main content with cross-fade between tabs ────────────────── */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              id={`lesson-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`lesson-tab-${tab}`}
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

      {/* ── Footer prev/next nav as cards ─────────────────────────────── */}
      <footer className="border-t border-border-subtle bg-bg-elevated/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prev ? (
            <Link
              href={`/lessons/${prev.id}/`}
              className="group rounded-xl border border-border bg-bg-elevated p-4 hover:border-brand/40 hover:shadow-elevated transition-all duration-200 ease-snap flex items-center gap-3 text-right"
            >
              <ArrowRight
                className="size-5 shrink-0 text-fg-dim group-hover:text-brand-dark group-hover:translate-x-0.5 transition-all"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-display font-semibold tracking-wider text-fg-dim uppercase">
                  השיעור הקודם
                </div>
                <div className="text-sm md:text-[15px] font-display font-semibold text-fg truncate group-hover:text-brand-dark transition-colors">
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
              className="group rounded-xl border border-accent/40 bg-accent/10 p-4 hover:bg-accent hover:border-accent shadow-glow transition-all duration-200 ease-snap flex items-center gap-3 sm:text-left flex-row-reverse sm:flex-row"
            >
              <ArrowLeft
                className="size-5 shrink-0 text-accent-hover group-hover:text-fg group-hover:-translate-x-0.5 transition-all"
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-right sm:text-left">
                <div className="text-[11px] font-display font-semibold tracking-wider text-accent-hover group-hover:text-fg/80 transition-colors uppercase">
                  השיעור הבא
                </div>
                <div className="text-sm md:text-[15px] font-display font-semibold text-fg truncate">
                  {next.shortTitle}
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/"
              className="group rounded-xl border border-brand/40 bg-brand/10 p-4 hover:bg-brand hover:border-brand-dark transition-all duration-200 ease-snap flex items-center gap-3"
            >
              <Check
                className="size-5 shrink-0 text-brand-dark group-hover:text-bg-elevated transition-colors"
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-right">
                <div className="text-[11px] font-display font-semibold tracking-wider text-brand-dark group-hover:text-bg-elevated/80 transition-colors uppercase">
                  סיום הקורס
                </div>
                <div className="text-sm md:text-[15px] font-display font-semibold text-fg group-hover:text-bg-elevated truncate transition-colors">
                  חזרה לסילבוס
                </div>
              </div>
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
