import { cn } from '@/lib/utils';

/**
 * AssetFrame — מסגרת אחידה לנכסי Magnific (design lock): כרטיס לבן מוגבה,
 * רדיוס גדול, קו-שיער tanline, צל card-soft. עוטף IsometricAsset (או כל
 * מדיה) כך שהטיפול בנכסים זהה בכל האתר. ה-placeholder הרועש של נכס חסר
 * נשאר כפי שהוא — בתוך המסגרת.
 */
export function AssetFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-border/60 bg-bg-card shadow-elevated',
        className,
      )}
    >
      {children}
    </div>
  );
}
