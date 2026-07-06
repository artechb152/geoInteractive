import { cn } from '@/lib/utils';

/**
 * ProgressBar — "ציר התקדמות" בשפת V2: מסילה עם שנתות מדידה,
 * מילוי חד וראש-מעוין בקצה ההתקדמות.
 * כתום = התקדמות פעילה; מרווה = השלמה/סטטוס חיובי.
 */
export function ProgressBar({
  value,
  tone = 'accent',
  className,
  label,
}: {
  /** 0–100 */
  value: number;
  tone?: 'accent' | 'brand';
  className?: string;
  /** aria-label לנגישות; אם חסר — הפס דקורטיבי */
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = tone === 'accent' ? 'bg-accent' : 'bg-brand';
  return (
    <div
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(clamped) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={cn('relative h-2 overflow-visible', className)}
    >
      {/* מסילה עם שנתות */}
      <div
        className="absolute inset-0 rounded-[1px] bg-bg-accent"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to left, rgba(91,124,92,0.22) 0 1px, transparent 1px 12px)',
        }}
      />
      {/* מילוי */}
      <div
        className={cn('absolute inset-y-0 start-0 rounded-[1px] transition-[width] duration-500 ease-snap', fill)}
        style={{ width: `${clamped}%` }}
      />
      {/* ראש מעוין */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 size-2.5 -translate-y-1/2 rotate-45 border border-bg transition-[inset-inline-start] duration-500 ease-snap',
          fill,
        )}
        style={{ insetInlineStart: `calc(${clamped}% - 5px)` }}
      />
    </div>
  );
}
