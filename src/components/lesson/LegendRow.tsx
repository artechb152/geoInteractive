import { cn } from '@/lib/utils';

/**
 * LegendRow — שורת מקרא אחידה לדיאגרמות (הדפוס המשוכפל בכל סצנות המפה).
 *
 * ⚠️ צבעי ה-swatch מגיעים מהקורא כמחלקות-טוקן (למשל `bg-status-ok`) —
 * מקרא חייב להתאים 1:1 לצבעים הסמנטיים שבתוך הדיאגרמה החיה, ולכן
 * הקומפוננטה לא כופה פלטה משלה.
 */
export type LegendItem = {
  label: React.ReactNode;
  /** מחלקת טוקן לצבע — חייבת להתאים לצבע בדיאגרמה, למשל "bg-status-ok" */
  swatchClassName: string;
  shape?: 'dot' | 'square' | 'line';
};

export function LegendRow({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <span
            aria-hidden
            className={cn(
              'inline-block shrink-0',
              (item.shape ?? 'dot') === 'dot' && 'size-2 rounded-full',
              item.shape === 'square' && 'size-2 rounded-sm',
              item.shape === 'line' && 'h-0.5 w-4 rounded-full',
              item.swatchClassName,
            )}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
