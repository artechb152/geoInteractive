'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Lesson } from '@/lib/lessons';
import { cn } from '@/lib/utils';

type Tab = 'learn' | 'practice' | 'check';

const TAB_LABEL: Record<Tab, string> = {
  learn: 'לימוד',
  practice: 'תרגול',
  check: 'בדיקת ידע',
};

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-bg/80 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="text-fg-muted hover:text-fg text-sm flex items-center gap-1"
          >
            <span aria-hidden>→</span> סילבוס
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-fg-dim">
              <span className="font-mono">שיעור {String(lesson.number).padStart(2, '0')}</span>
              <span>·</span>
              <span>{lesson.duration} דק'</span>
            </div>
            <h1 className="font-display font-semibold truncate text-base">{lesson.shortTitle}</h1>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1" role="tablist">
          {(['learn', 'practice', 'check'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'border-accent text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10', tab !== 'learn' && 'hidden')}>
          {learn}
        </div>
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10', tab !== 'practice' && 'hidden')}>
          {practice}
        </div>
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10', tab !== 'check' && 'hidden')}>
          {check}
        </div>
      </main>

      <footer className="border-t border-border-subtle mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
          {prev ? (
            <Link href={`/lessons/${prev.id}/`} className="btn-ghost flex-row-reverse">
              <span aria-hidden>→</span>
              <div className="text-right">
                <div className="text-xs text-fg-dim">הקודם</div>
                <div className="text-sm">{prev.shortTitle}</div>
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/lessons/${next.id}/`} className="btn-primary">
              <div className="text-right">
                <div className="text-xs opacity-80">הבא</div>
                <div className="text-sm">{next.shortTitle}</div>
              </div>
              <span aria-hidden>←</span>
            </Link>
          ) : (
            <Link href="/" className="btn-primary">
              סיום הקורס <span aria-hidden>✓</span>
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
