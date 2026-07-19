/**
 * TacticalInfoCard — כרטיס מידע טקטי (design-lock §3.8).
 *
 * דוגמת "סיפור דרך" A→B האמיתית מ-PlanningScene.tsx (topic-03).
 * בלוק הנתונים הכהה הוא המקסימום המותר לכהות במוקאפ (§7 כלל 7) — עם ניגודיות AA+.
 * כפתור "פתח תרגול" ויזואלי בלבד (אין תרגול אמיתי במוקאפ).
 */
import { Compass, MapPinned, Route, Ruler, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const DATA_ROWS: { icon: typeof Compass; label: string; value: string }[] = [
  { icon: Compass, label: 'אזימוט', value: '062°' },
  { icon: Ruler, label: 'מרחק', value: "1,200 מ'" },
  { icon: MapPinned, label: 'נקודות עצירה', value: '3' },
];

export function TacticalInfoCard({ className }: { className?: string }) {
  return (
    <div className={cn('surface-elevated flex flex-col gap-3 p-4', className)}>
      <div className="flex items-center gap-2.5">
        <span className="chip border-accent/40 bg-accent/10 text-accent">דוגמה</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Route className="size-3.5" aria-hidden />
        </span>
        <h3 className="font-display text-sm font-bold leading-snug text-fg">
          דוגמת סיפור דרך מנקודה A ל-B
        </h3>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-brand-dark p-3 text-bg-elevated">
        {DATA_ROWS.map(({ icon: RowIcon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs">
              <RowIcon className="size-3.5 opacity-80" aria-hidden />
              {label}:
            </span>
            <span className="font-mono text-sm" dir="ltr">
              {value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-disabled="true"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 px-4 py-2 font-medium text-accent transition-colors duration-300 hover:border-accent hover:bg-accent/10"
      >
        <Target className="size-4" aria-hidden />
        פתח תרגול
      </button>
    </div>
  );
}
