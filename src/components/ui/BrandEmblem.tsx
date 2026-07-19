import { cn } from '@/lib/utils';

/**
 * BrandEmblem — לוגו האתר: שושנת מצפן זהובה-זיתית (design/mockup.png).
 * נכס SVG אחיד המשמש בכל מקום שנדרש בו לוגו (כותרת דף הבית, AppHeader
 * גלובלי וכו'). לא מתהפך ב-RTL.
 */
export function BrandEmblem({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
    <img
      src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/brand/compass-logo.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={cn('size-10 shrink-0', className)}
    />
  );
}
