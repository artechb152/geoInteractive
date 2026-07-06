'use client';

/**
 * LessonTabs — שורת טאבים רכה בשפת Design 1: מיכל לבן מוגבה, הטאב
 * הפעיל מודגש בטקסט כהה + קו כתום דק מתחתיו שזז בעדינות (layoutId, §25).
 */
import { BookOpen, Crosshair, ListChecks } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type LessonTab = 'learn' | 'practice' | 'check';

const TABS: { key: LessonTab; label: string; Icon: typeof BookOpen }[] = [
  { key: 'learn', label: 'לימוד', Icon: BookOpen },
  { key: 'practice', label: 'תרגול', Icon: Crosshair },
  { key: 'check', label: 'בדיקת ידע', Icon: ListChecks },
];

export function LessonTabs({
  tab,
  onChange,
  layoutIdSuffix,
  className,
}: {
  tab: LessonTab;
  onChange: (tab: LessonTab) => void;
  /** namespace ל-layoutId של הקו הכתום כשכמה LessonTabs חיים בדף בו-זמנית */
  layoutIdSuffix?: string;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <nav
      className={cn(
        'flex items-center gap-1 rounded-2xl border border-brand/15 bg-bg-elevated p-1.5 shadow-elevated',
        className,
      )}
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
            onClick={() => onChange(key)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-display transition-colors sm:flex-none sm:px-7',
              active ? 'font-extrabold text-fg' : 'font-semibold text-fg-muted hover:bg-bg-accent hover:text-fg',
            )}
          >
            {/* רקע רך שזז בעדינות מתחת לטאב הפעיל (§25) */}
            {active && (
              <motion.span
                aria-hidden
                layoutId={`lesson-tab-bg-${layoutIdSuffix ?? 'default'}`}
                className="absolute inset-0 rounded-xl bg-bg-accent"
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <Icon
              className={cn('relative size-4 shrink-0', active ? 'text-accent' : 'text-fg-dim')}
              aria-hidden
            />
            <span className="relative whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
