'use client';

/**
 * LessonTabs V2 — לשוניות תיקייה (design-system §10, שפת V2).
 * טרפזים קטומים שיושבים על קו-מדף מרווה; הפעילה לבנה עם פס כתום עליון.
 */
import { BookOpen, Crosshair, ListChecks } from 'lucide-react';
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
  className,
}: {
  tab: LessonTab;
  onChange: (tab: LessonTab) => void;
  /** נשמר לתאימות קריאה קיימת */
  layoutIdSuffix?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <nav
        className="flex items-end gap-1.5 px-1 sm:gap-2"
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
                'tab-folder relative flex flex-1 items-center justify-center gap-2 px-3 pb-2.5 text-sm font-display transition-all sm:flex-none sm:px-8',
                active
                  ? 'bg-bg-card pt-3.5 font-extrabold text-fg shadow-paper'
                  : 'bg-brand-dark/10 pt-2.5 font-semibold text-fg-muted hover:bg-brand-dark/20 hover:text-fg',
              )}
            >
              {/* פס כתום עליון — הלשונית הפעילה */}
              {active && (
                <span aria-hidden className="absolute inset-x-5 top-0 h-1 bg-accent" />
              )}
              <Icon
                className={cn('size-4 shrink-0', active ? 'text-accent' : 'text-fg-dim')}
                aria-hidden
              />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>
      {/* קו-המדף שהלשוניות יושבות עליו */}
      <div aria-hidden className="h-[3px] bg-brand-dark/30" />
    </div>
  );
}
