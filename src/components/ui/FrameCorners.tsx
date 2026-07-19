import { cn } from '@/lib/utils';

/**
 * FrameCorners — סוגריים-מסגרת בארבע פינות, כמו מסגרת גיליון מפה.
 * חתימה ויזואלית של שפת V2. ההורה חייב להיות relative.
 */
export function FrameCorners({
  className,
  tone = 'sage',
  size = 'md',
}: {
  className?: string;
  tone?: 'sage' | 'accent' | 'paper';
  size?: 'sm' | 'md';
}) {
  const border =
    tone === 'accent'
      ? 'border-accent'
      : tone === 'paper'
        ? 'border-bg/80'
        : 'border-brand-dark/50';
  const box = size === 'sm' ? 'size-2.5' : 'size-3.5';
  const w = 'border-[1.5px]';
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-1.5', className)}>
      <span className={cn('absolute start-0 top-0 border-e-0 border-b-0', box, w, border)} />
      <span className={cn('absolute end-0 top-0 border-s-0 border-b-0', box, w, border)} />
      <span className={cn('absolute start-0 bottom-0 border-e-0 border-t-0', box, w, border)} />
      <span className={cn('absolute end-0 bottom-0 border-s-0 border-t-0', box, w, border)} />
    </span>
  );
}
