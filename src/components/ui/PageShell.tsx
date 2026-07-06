import { cn } from '@/lib/utils';

/**
 * PageShell — מיכל הרוחב האחיד של כל המסכים (design-system §11, §23).
 * max-width 1400px, padding אופקי רספונסיבי.
 */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
