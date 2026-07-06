import { cn } from '@/lib/utils';

/**
 * ProgressBar — מסילה רכה עם מילוי מעוגל (Design 1).
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
      className={cn('relative h-1.5 overflow-visible rounded-full bg-bg-accent', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-snap', fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
