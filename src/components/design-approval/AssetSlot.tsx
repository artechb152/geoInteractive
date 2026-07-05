'use client';

/**
 * AssetSlot — עטיפה בטוחה לנכסי Magnific עתידיים (design-lock §6.1).
 *
 * החוזה:
 * - כל עוד הקובץ לא קיים ב-public/assets/isometric/ — מוצג ה-placeholder
 *   המלוטש; לעולם לא תמונה שבורה (onError ⇒ חזרה ל-placeholder).
 * - יחס גובה-רוחב קבוע דרך המיכל ⇒ אפס CLS ברגע ההחלפה.
 * - data-asset-id + data-asset-src על המיכל — grep אחד מוצא את כל חובות הנכסים.
 * - הרקע הוא צלחת bg (#FFFBF7) — זהה לרקע הקרם האפוי של הנכסים
 *   (תהליך no-transparent-bg), כך שההחלפה לא משנה שוליים.
 * - לעולם לא URL חיצוני/CDN — static export ל-LMS/SCORM חייב לעבוד offline.
 * - alt עברי חובה.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

type AssetSlotAspect = '16/9' | '21/9' | '1/1' | '4/3';

const ASPECT_CLASS: Record<AssetSlotAspect, string> = {
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
};

type AssetSlotProps = {
  /** מזהה מרישום הנכסים, למשל "HOME-01" / "LESSON-03-CARD". */
  assetId: string;
  /** הנתיב הסופי המדויק, למשל "/assets/isometric/home-hero-terrain.png". */
  src: string;
  /** alt עברי מלא — אותו טקסט שמתאר גם את ה-placeholder. */
  alt: string;
  /** יחס המיכל — חייב להתאים ליחס הנכס העתידי (ברירת מחדל 16/9). */
  aspect?: AssetSlotAspect;
  /** contain (ברירת מחדל). cover רק כשהחיתוך מוצהר בטבלת ה-slots. */
  fit?: 'contain' | 'cover';
  /** ה-placeholder המלוטש שמוצג עד שהנכס קיים. */
  placeholder: React.ReactNode;
  className?: string;
};

export function AssetSlot({
  assetId,
  src,
  alt,
  aspect = '16/9',
  fit = 'contain',
  placeholder,
  className,
}: AssetSlotProps) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'missing'>('pending');
  // תמיכה ב-basePath של הייצוא הסטטי; data-asset-src נשאר הנתיב הקנוני.
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
      {status !== 'ready' && <div className="absolute inset-0">{placeholder}</div>}
      {status !== 'missing' && src.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
        <img
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
