/**
 * SceneCard V2 — "גיליון מפה" שכל סצנה יושבת בתוכו (design-system §13, שפת V2).
 * פאנל לבן חד עם סוגריים-מסגרת בפינות וצל נייר.
 *
 * `flush` — לסצנת ה-Hook (מסך אטמוספרי כמעט מלא): בלי padding, רקע קרם,
 * בלי סוגריים — הרקע של הסצנה ממלא את הגיליון מקצה לקצה.
 */
import { SurfaceCard } from '@/components/ui/SurfaceCard';
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
    <SurfaceCard
      as="section"
      frame={!flush}
      className={cn(
        'overflow-hidden',
        flush ? 'bg-bg p-0' : 'p-4 py-8 sm:p-6 sm:py-10 lg:p-8 lg:py-12',
        className,
      )}
    >
      {children}
    </SurfaceCard>
  );
}
