import { cn } from '@/lib/utils';

/**
 * SceneMetricCard — כרטיס מדד קטן בתוך סצנה (ניקוד, ערך, ספירה):
 * כרטיס לבן שטוח, ערך גדול ב-font-display, תווית קטנה בדיו מעומעם.
 * כתום (ember) שמור לערך שדורש את תשומת הלב — לא לקישוט.
 */
export function SceneMetricCard({
  value,
  label,
  tone = 'ink',
  className,
}: {
  /** הערך הבולט — מספר/אחוז/יחס */
  value: React.ReactNode;
  label: React.ReactNode;
  /** ink — דיו זית (ברירת מחדל) · accent — ember להדגשה · brand — מרווה לחיוב */
  tone?: 'ink' | 'accent' | 'brand';
  className?: string;
}) {
  return (
    <div className={cn('surface p-4 text-center', className)}>
      <div
        className={cn(
          'font-display text-2xl font-extrabold leading-none',
          tone === 'ink' && 'text-fg',
          tone === 'accent' && 'text-accent',
          tone === 'brand' && 'text-brand-dark',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs leading-snug text-fg-muted">{label}</div>
    </div>
  );
}
