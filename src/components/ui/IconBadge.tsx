import { cn } from '@/lib/utils';

/**
 * IconBadge — משבצת אייקון עגולה בשפת Design 1.
 * משמש בכרטיסי מטרות, שורות דוסייה ושדות מטא.
 */
export function IconBadge({
  children,
  tone = 'brand',
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  tone?: 'brand' | 'accent' | 'neutral' | 'command';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full',
        size === 'sm' && 'size-8',
        size === 'md' && 'size-10',
        size === 'lg' && 'size-12',
        tone === 'brand' && 'bg-brand/15 text-brand-dark',
        tone === 'accent' && 'bg-accent/15 text-accent',
        tone === 'neutral' && 'bg-bg-accent text-fg-muted',
        tone === 'command' && 'bg-brand-dark text-bg',
        className,
      )}
    >
      {children}
    </span>
  );
}
