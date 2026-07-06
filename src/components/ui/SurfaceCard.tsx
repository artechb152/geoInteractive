import { cn } from '@/lib/utils';
import { FrameCorners } from './FrameCorners';

/**
 * SurfaceCard — "גיליון מפה" בשפת V2: פאנל לבן חד (radius 3px),
 * מסגרת מרווה, צל נייר, ואופציונלית סוגריים-מסגרת בפינות.
 */
export function SurfaceCard({
  children,
  className,
  flat = false,
  frame = false,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  /** בלי צל — לאזורים צפופים */
  flat?: boolean;
  /** סוגריים-מסגרת בפינות (לוחות מרכזיים) */
  frame?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'relative bg-bg-card border border-brand-dark/20 rounded-[3px]',
        !flat && 'shadow-paper',
        className,
      )}
    >
      {frame && <FrameCorners />}
      {children}
    </Tag>
  );
}
