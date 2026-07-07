import { AssetFrame } from '@/components/ui/AssetFrame';
import { IsometricAsset } from '@/components/assets/IsometricAsset';

/**
 * SceneAssetSlot — חריץ נכס Magnific בתוך סצנה: מסגרת AssetFrame אחידה
 * (כרטיס לבן, קו-שיער tanline, צל card-soft) סביב IsometricAsset.
 * נכס חסר ⇒ ה-placeholder המג'נטה הרועש של IsometricAsset נשאר גלוי
 * בכוונה — לעולם לא אמנות-זמנית מלוטשת.
 */
export function SceneAssetSlot({
  assetId,
  src,
  alt,
  aspect = '16/9',
  caption,
  className,
}: {
  /** מזהה נכס מטבלת החובות, למשל "LESSON-01-MDO" */
  assetId: string;
  /** נתיב קנוני תחת public/, למשל "/assets/isometric/…" */
  src: string;
  alt: string;
  aspect?: '16/9' | '21/9' | '1/1' | '4/3';
  caption?: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <AssetFrame>
        <IsometricAsset assetId={assetId} src={src} alt={alt} aspect={aspect} />
      </AssetFrame>
      {caption && (
        <figcaption className="mt-2 text-xs leading-relaxed text-fg-dim">{caption}</figcaption>
      )}
    </figure>
  );
}
