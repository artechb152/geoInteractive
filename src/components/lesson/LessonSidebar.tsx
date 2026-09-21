'use client';

/**
 * LessonSidebar — the lesson's single navigation surface on desktop (xl+).
 *
 * It replaces the old split where the three lesson modes lived in a sticky
 * strip above the content and the sub-topic list lived inside `PagedLearn`
 * (i.e. only in `learn`). Everything is now one continuous column that runs
 * from under the global AppHeader to the bottom of the window:
 *
 *   שיעור N + title            - always
 *   -------------------------
 *   sub-topic list + progress   - `learn` only
 *   -------------------------
 *   לימוד / תרגול / בדיקת ידע   - always, below the table of contents
 *
 * The mode rows are plain text rows at the sub-topic rows' own size, with no
 * icons — they read as one quiet list rather than a competing toolbar. The
 * only thing that separates the two lists is colour: the active MODE is sage
 * green (tint + bold green label), the active SUB-TOPIC a warm paper tint.
 * Orange stays reserved for identity/progress (the lesson number, the
 * progress dots and bar), never for selection.
 *
 * Width and the matching content inset both come from `--lesson-nav-w` /
 * `--lesson-content-inset` in globals.css — never hard-code either here.
 */

import type { BookOpen } from 'lucide-react';
import { BookOpen as BookOpenIcon, Crosshair, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SceneMeta } from '@/lib/lesson-scenes';
import type { LessonTab, LessonNavInfo } from './lesson-nav-context';
import { cn } from '@/lib/utils';

/**
 * `Icon` is still carried here because the sub-desktop strip in LessonShell
 * renders it; this sidebar deliberately doesn't.
 */
export const LESSON_TABS: { key: LessonTab; label: string; Icon: typeof BookOpen }[] = [
  { key: 'learn', label: 'לימוד', Icon: BookOpenIcon },
  { key: 'practice', label: 'תרגול', Icon: Crosshair },
  { key: 'check', label: 'בדיקת ידע', Icon: ListChecks },
];

export function LessonSidebar({
  lesson,
  tab,
  onTabChange,
  scenes,
  activeIdx,
  onGotoScene,
}: {
  lesson?: LessonNavInfo['current'];
  tab: LessonTab;
  onTabChange: (tab: LessonTab) => void;
  scenes: SceneMeta[];
  activeIdx: number;
  onGotoScene: (id: string) => void;
}) {
  // Vertical tablist keys per the ARIA tabs pattern. Up/Down only — Left/Right
  // would be ambiguous under RTL, and this list runs vertically anyway.
  const onTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order = LESSON_TABS.map((t) => t.key);
    const i = order.indexOf(tab);
    let target: number | null = null;
    if (e.key === 'ArrowDown') target = (i + 1) % order.length;
    else if (e.key === 'ArrowUp') target = (i - 1 + order.length) % order.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = order.length - 1;
    if (target === null) return;
    e.preventDefault();
    const key = order[target];
    onTabChange(key);
    requestAnimationFrame(() => document.getElementById(`lesson-tab-${key}`)?.focus());
  };

  const showScenes = tab === 'learn' && scenes.length > 0;
  const pct = scenes.length > 0 ? Math.round(((activeIdx + 1) / scenes.length) * 100) : 0;

  return (
    <aside
      className={cn(
        'hidden xl:flex flex-col fixed start-0 top-[var(--header-h)] bottom-0 z-30',
        'w-[var(--lesson-nav-w)] overflow-y-auto overscroll-contain',
        'bg-bg-elevated border-e border-border',
      )}
      aria-label="ניווט השיעור"
    >
      <div className="flex flex-col p-4">
        {/* 1. Lesson identity — unchanged from the old TOC drawer head. */}
        {lesson && (
          <div className="px-2 pb-4 border-b border-border-subtle">
            <div className="font-display font-bold text-accent text-xl mb-1.5">
              שיעור {lesson.number}
            </div>
            <div className="font-display font-bold text-lg text-fg leading-tight text-balance">
              {lesson.shortTitle}
            </div>
          </div>
        )}

        {/* 2. Table of contents + progress — `learn` only. Hidden (not just
               emptied) on practice / check. */}
        {showScenes && (
          <div className="pt-4">
            <div className="text-sm font-display font-semibold tracking-wider text-fg-muted px-2 mb-2">
              תוכן השיעור
            </div>

            <nav aria-label="ניווט תתי-נושא" className="flex flex-col gap-0.5">
              {scenes.map((s, i) => {
                const isActive = i === activeIdx;
                // Dot colour: orange for everything already reached
                // (current + passed), ink for what is still ahead.
                const reached = i <= activeIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onGotoScene(s.id)}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'flex items-start gap-2.5 rounded-md px-3 py-2 text-start transition-colors cursor-pointer',
                      isActive ? 'bg-bg-accent text-fg' : 'text-fg-muted hover:bg-bg-accent/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-[7px] size-2 rounded-full shrink-0 transition-colors',
                        reached ? 'bg-accent' : 'bg-fg',
                      )}
                      aria-hidden
                    />
                    {/* No truncation: a long sub-topic name wraps instead. */}
                    <span className={cn('text-sm leading-snug', isActive && 'font-semibold')}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 pt-4 border-t border-border-subtle px-2">
              <div
                className="h-1.5 rounded-full bg-bg-accent overflow-hidden"
                role="progressbar"
                aria-label="התקדמות בשיעור"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <motion.div
                  className="h-full rounded-full bg-accent"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. The three modes — always rendered, below the table of contents.
               Same row size as the sub-topic rows above, no icons; green is
               what marks the active one. The leading rule is only needed
               when the TOC is above; on practice / check the lesson header's
               own bottom rule already separates them. */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="חלקי השיעור"
          onKeyDown={onTablistKeyDown}
          className={cn(
            'flex flex-col gap-0.5 pt-4',
            showScenes && 'mt-4 border-t border-border-subtle',
          )}
        >
          {LESSON_TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                id={`lesson-tab-${key}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`lesson-panel-${key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onTabChange(key)}
                className={cn(
                  'rounded-md px-3 py-2 text-start text-sm leading-snug transition-colors cursor-pointer',
                  active
                    ? 'bg-brand/10 text-brand-dark font-semibold'
                    : 'text-fg-muted hover:bg-bg-accent/60',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
