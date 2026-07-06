/**
 * SceneCard — הכרטיס הלבן הגדול שכל סצנה יושבת בתוכו (Design 1, §13).
 * רדיוס גדול (rounded-3xl), מסגרת מרווה עדינה, צל רך.
 *
 * `flush` — לסצנת ה-Hook (מסך אטמוספרי כמעט מלא): בלי padding, רקע קרם —
 * הרקע של הסצנה ממלא את הכרטיס מקצה לקצה.
 */
import { cn } from '@/lib/utils';

export function SceneCard({
  children,
  flush = false,
  className,
}: {
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl',
        flush
          ? 'bg-bg p-0'
          : 'border border-brand/15 bg-bg-card p-4 py-8 shadow-elevated sm:p-6 sm:py-10 lg:p-8 lg:py-12',
        className,
      )}
    >
      {children}
    </section>
  );
}
