import { cn } from '@/lib/utils';

/**
 * StatusChip — פלולה (pill) סטטוס רכה בשפת Design 1.
 *
 * tones:
 *   accent  — פעיל / בתהליך (כתום)
 *   brand   — הושלם / חיובי (מרווה)
 *   neutral — מטא ניטרלי (משך, סוג)
 *   badge   — תג-מוקאפ (design lock): מסגרת tanline, קרם בהיר, חום חם —
 *             כמו "קורס דיגיטלי אינטראקטיבי" בהירו של דף הבית
 *   dim     — נעול / עתידי
 *   command — היפוך: מרווה כהה מלא (תאימות אחורה — מסכים מחוץ להיקף)
 */
export function StatusChip({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: 'accent' | 'brand' | 'neutral' | 'badge' | 'dim' | 'command';
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold tracking-wide whitespace-nowrap',
        tone === 'accent' && 'bg-accent/15 text-accent',
        tone === 'brand' && 'bg-brand/15 text-brand-dark',
        tone === 'neutral' && 'bg-bg-accent text-fg-muted',
        tone === 'badge' && 'border border-border bg-paper-bright/50 text-tanline-badge',
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
