'use client';

/**
 * IsometricAsset — עטיפה בטוחה לנכסי Magnific בסגנון isometric papercut
 * (lesson-shell-design-system §18–§20).
 *
 * - כל עוד הקובץ לא קיים ב-public/assets/isometric/ — מוצג AssetPlaceholder
 *   רועש (לעולם לא תמונה שבורה: onError ⇒ חזרה ל-placeholder).
 * - יחס גובה-רוחב קבוע דרך המיכל ⇒ אפס CLS ברגע שהנכס יופק ויוחלף.
 * - data-asset-id + data-asset-src על המיכל — grep אחד מוצא את כל חובות הנכסים.
 * - לעולם לא URL חיצוני — static export ל-LMS/SCORM חייב לעבוד offline.
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AssetPlaceholder } from './AssetPlaceholder';

type AssetAspect = '16/9' | '21/9' | '1/1' | '4/3';

const ASPECT_CLASS: Record<AssetAspect, string> = {
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
};

export function IsometricAsset({
  assetId,
  src,
  alt,
  aspect = '16/9',
  fit = 'cover',
  compactPlaceholder = false,
  className,
}: {
  /** מזהה נכס מטבלת §20, למשל "LESSON-03-HOOK" */
  assetId: string;
  /** נתיב קנוני, למשל "/assets/isometric/lesson-03-navigation-hook.webp" */
  src: string;
  /** alt עברי חובה */
  alt: string;
  aspect?: AssetAspect;
  fit?: 'cover' | 'contain';
  compactPlaceholder?: boolean;
  className?: string;
}) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'missing'>('pending');
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // תמונה יכולה להיטען (מהמטמון או מכיוון שהיא כבר בתצוגה) לפני ש-React
    // מספיק לחבר את מאזין onLoad — אירוע ה-load מוחמץ ו-status נתקע ב-pending.
    setStatus(imgRef.current?.complete && imgRef.current.naturalWidth > 0 ? 'ready' : 'pending');
  }, [src]);

  const resolvedSrc = src.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${src}`
    : src;

  return (
    <div
      data-asset-id={assetId}
      data-asset-src={src}
      data-asset-status={status}
      className={cn('relative overflow-hidden bg-bg', ASPECT_CLASS[aspect], className)}
    >
      {status !== 'ready' && (
        <AssetPlaceholder
          assetId={assetId}
          targetPath={`public${src}`}
          note="להפיק ב-Magnific לפי prompt"
          compact={compactPlaceholder}
        />
      )}
      {status !== 'missing' && src.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          aria-hidden={status !== 'ready'}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('missing')}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-300',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            status === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
