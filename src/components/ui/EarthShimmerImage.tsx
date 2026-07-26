'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { ShimmerOverlay } from '@/components/shimmer-demos/ShimmerVariants';

type EarthShimmerImageProps = Omit<ImageProps, 'onLoad'> & {
  wrapperClassName?: string;
};

/**
 * תמונה עם shimmer טעינה בסגנון "גלובוס וויירפריים" (אופציה 3 שנבחרה ב-/shimmer-demos).
 * השימר מוצג ברירת מחדל ברגע העלייה לאוויר — עוד לפני שהתמונה האמיתית התחילה
 * להיטען מהרשת — ונעלם רק כש-onLoad של Image יורה.
 */
export function EarthShimmerImage({
  wrapperClassName,
  className,
  alt,
  ...imageProps
}: EarthShimmerImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      <Image
        {...imageProps}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          'object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          loaded ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <ShimmerOverlay variant={3} />
      </div>
    </div>
  );
}
