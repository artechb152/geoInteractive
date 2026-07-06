import { cn } from '@/lib/utils';
import { FrameCorners } from './FrameCorners';

/**
 * SurfaceCard — כרטיס לבן מוגבה בשפת Design 1: רדיוס גדול, מסגרת מרווה
 * עדינה, צל רך. `frame` נשמר לתאימות אחורה עם מסכים מחוץ להיקף ה-pass
 * הנוכחי (overview/home) שעדיין מציגים סוגריים-מסגרת בפינות — הכרטיסים
 * החדשים (lesson shell / topic-03) לא מפעילים את ה-prop הזה.
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
  /** סוגריים-מסגרת בפינות (תאימות אחורה — לא בשימוש בשפה החדשה) */
  frame?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'relative bg-bg-card border border-brand/15 rounded-2xl',
        !flat && 'shadow-elevated',
        className,
      )}
    >
      {frame && <FrameCorners />}
      {children}
    </Tag>
  );
}
