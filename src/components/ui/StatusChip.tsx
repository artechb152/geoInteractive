import { cn } from '@/lib/utils';

/**
 * StatusChip — "חותמת" סטטוס בשפת V2: פלטה קטומת-פינות, אותיות מרווחות.
 *
 * tones:
 *   accent  — פעיל / בתהליך (כתום)
 *   brand   — הושלם / חיובי (מרווה)
 *   neutral — מטא ניטרלי (משך, סוג)
 *   dim     — נעול / עתידי
 *   command — היפוך: מרווה כהה מלא (לפסי פיקוד)
 */
export function StatusChip({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: 'accent' | 'brand' | 'neutral' | 'dim' | 'command';
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'oct-sm inline-flex items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold tracking-wide whitespace-nowrap',
        tone === 'accent' && 'bg-accent/15 text-accent',
        tone === 'brand' && 'bg-brand/15 text-brand-dark',
        tone === 'neutral' && 'bg-bg-accent text-fg-muted',
        tone === 'dim' && 'bg-bg-accent/60 text-fg-dim',
        tone === 'command' && 'bg-brand-dark text-bg',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
