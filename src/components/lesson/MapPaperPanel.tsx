import { cn } from '@/lib/utils';

/**
 * MapPaperPanel — "מפה על נייר": הפאנל הלבן המוגבה שכל דיאגרמה/סימולטור
 * בסצנת הוראה יושבים בתוכו (שפת דף הבית). מאחד את הדפוס המשוכפל
 * `.surface-elevated relative overflow-hidden` + שכבת topo-bg + wash עדין
 * + צ'יפ כיתוב צף.
 *
 * הפאנל הוא כרום בלבד — הדיאגרמה שבפנים (children) לא נגועה: אין כאן
 * שינוי צבעים סמנטיים, אין מירור, אין לוגיקה.
 */
export function MapPaperPanel({
  children,
  caption,
  topo = true,
  wash = true,
  padded = true,
  className,
}: {
  children: React.ReactNode;
  /** צ'יפ כיתוב צף בפינת ההתחלה (RTL-safe) */
  caption?: React.ReactNode;
  /** רשת מדידה מרווה עדינה ברקע */
  topo?: boolean;
  /** שטיפת גרדיאנט חמימה עדינה (ember→מרווה, 5%) */
  wash?: boolean;
  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'surface-elevated relative overflow-hidden',
        padded && 'p-6 sm:p-8',
        className,
      )}
    >
      {topo && (
        <div aria-hidden className="pointer-events-none absolute inset-0 topo-bg opacity-20" />
      )}
      {wash && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-brand/5"
        />
      )}
      {caption && (
        <div className="chip absolute start-3 top-3 z-10 border-accent/30 bg-bg/60 text-fg-muted backdrop-blur">
          {caption}
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
