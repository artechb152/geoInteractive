'use client';

import { cn } from '@/lib/utils';

/**
 * SceneOptionCard — כרטיס-בחירה של סצנת הוראה (הדפוס המשוכפל בכמעט כל
 * סצנה): כרטיס לבן, באדג' עגול שמתהפך למרווה-כהה במצב פעיל, ופס-פעיל
 * מרווה בקצה ה-inline-end (RTL-safe). כרום בלבד — ה-state וה-handlers
 * נשארים אצל הסצנה.
 *
 * `layoutId` משותף לקבוצת כרטיסים ⇒ הפס הפעיל "זולג" בין כרטיסים
 * באנימציית layout (כמו בסצנות הקיימות).
 */
export function SceneOptionCard({
  active,
  onClick,
  badge,
  title,
  description,
  layoutId,
  className,
  'aria-controls': ariaControls,
}: {
  active: boolean;
  onClick: () => void;
  /** תוכן הבאדג' העגול — מספר או אייקון */
  badge?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** layoutId משותף לפס-הפעיל הנודד; בלעדיו הפס סטטי */
  layoutId?: string;
  className?: string;
  'aria-controls'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-controls={ariaControls}
      className={cn(
        'surface relative w-full overflow-hidden p-4 text-start transition-colors duration-200 ease-snap',
        active ? 'border-brand/40' : 'hover:bg-bg-accent/40',
        className,
      )}
    >
      <span className="flex items-start gap-3">
        {badge !== undefined && (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold transition-colors duration-200',
              active ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted',
            )}
          >
            {badge}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold leading-snug text-fg">{title}</span>
          {description && (
            <span className="mt-0.5 block text-sm leading-relaxed text-fg-muted">
              {description}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
