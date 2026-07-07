import { cn } from '@/lib/utils';
import { FrameCorners } from './FrameCorners';

/**
 * SurfaceCard — כרטיס בשפת דף הבית (design lock).
 *
 * tone:
 *   light (ברירת מחדל) — כרטיס לבן מוגבה על הקרם: רדיוס גדול, קו-שיער
 *                        tanline עדין, צל card-soft חם.
 *   pine              — פאנל מרווה כהה (כמו "התקדמות שלך" בדף הבית):
 *                        גרדיאנט pine, טקסט קרם, צל pine-card.
 *
 * `frame` נשמר לתאימות אחורה עם מסכים ישנים שעדיין מציגים סוגריים-מסגרת
 * בפינות — השפה החדשה לא מפעילה את ה-prop הזה.
 */
export function SurfaceCard({
  children,
  className,
  flat = false,
  frame = false,
  tone = 'light',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  /** בלי צל — לאזורים צפופים */
  flat?: boolean;
  /** סוגריים-מסגרת בפינות (תאימות אחורה — לא בשימוש בשפה החדשה) */
  frame?: boolean;
  tone?: 'light' | 'pine';
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'relative rounded-2xl',
        tone === 'light' && 'bg-bg-card border border-border/60',
        tone === 'light' && !flat && 'shadow-elevated',
        tone === 'pine' && 'bg-pine-grad text-paper-bright',
        tone === 'pine' && !flat && 'shadow-pine-card',
        className,
      )}
    >
      {frame && <FrameCorners />}
      {children}
    </Tag>
  );
}
