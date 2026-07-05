/**
 * MockScreenPanel — פאנל-המסך הגדול של מוקאפי האישור (design-lock §3.1).
 *
 * "לוח מסך" לבן מוגבה על שולחן המפות: rounded-4xl (2rem), צל elevated,
 * צ'יפ תג-מסך כהה ("מסך הקורס" / "מסך השיעור") ורקע קונטור פנימי עדין —
 * בדיוק כמו שני הלוחות הגדולים בתמונת הרפרנס.
 * הצ'יפ נשאר במוקאפ כסימון "זה מוקאפ" — הוא לא רכיב פרודקשן.
 */
import { cn } from '@/lib/utils';
import { ContourBackdrop } from './motifs';

type MockScreenPanelProps = {
  /** טקסט צ'יפ תג-המסך, למשל "מסך הקורס" / "מסך השיעור". */
  label: string;
  children: React.ReactNode;
  /** רקע קונטור פנימי עדין (ברירת מחדל: פעיל, כמו ברפרנס). */
  contour?: boolean;
  className?: string;
  /** שליטה בריפוד הפנימי (ברירת מחדל p-6 md:p-10 לפי §1.6). */
  contentClassName?: string;
};

export function MockScreenPanel({
  label,
  children,
  contour = true,
  className,
  contentClassName,
}: MockScreenPanelProps) {
  return (
    <section className={cn('relative rounded-4xl border border-border bg-bg-elevated shadow-elevated', className)}>
      {contour && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-4xl">
          <ContourBackdrop tone="inner" />
        </div>
      )}
      {/* צ'יפ תג-מסך: צל "ללא" לפי סקאלת §1.4 (צ'יפים בלי צל) — הפאנל נושא את ההגבהה. */}
      <span className="chip absolute top-0 start-8 z-10 -translate-y-1/2 border-transparent bg-brand-dark font-display text-bg-elevated">
        {label}
      </span>
      <div className={cn('relative p-6 md:p-10', contentClassName)}>{children}</div>
    </section>
  );
}
