/**
 * MissingAssetPlaceholder — בלוק אבחוני רועש למקום שבו נכס Magnific עתידי חסר.
 *
 * מקור סמכות: docs/design-approval/diagnostic-asset-placeholder-policy.md.
 * זהו לא איור-לקוח (בניגוד למדיניות הקודמת) — הוא מכוון להיראות **בבירור לא-סופי**:
 * מגנטה/צהוב/שחור, פסים אלכסוניים, טקסט גדול, assetId ונתיב הקובץ הצפוי גלויים.
 * מותר ורק מותר מתחת ל-/design-approval — לעולם לא ברכיבי פרודקשן.
 */
import { cn } from '@/lib/utils';

type MissingAssetPlaceholderProps = {
  /** מזהה מרישום הנכסים, למשל "HOME-01" / "LESSON-03-CARD". */
  assetId: string;
  /** הנתיב הסופי הצפוי, למשל "/assets/isometric/home-hero-terrain.png". */
  expectedSrc: string;
  className?: string;
};

export function MissingAssetPlaceholder({
  assetId,
  expectedSrc,
  className,
}: MissingAssetPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`נכס חסר: מזהה ${assetId}, נתיב צפוי ${expectedSrc}. זהו placeholder אבחוני של מוקאפ האישור בלבד — הוא אינו חלק מהעיצוב הסופי ואינו נכס Magnific אמיתי.`}
      data-missing-asset-id={assetId}
      data-missing-asset-src={expectedSrc}
      className={cn(
        'absolute inset-0 flex size-full select-none flex-col items-center justify-center gap-1.5 overflow-hidden border-[3px] border-black p-3 text-center',
        className,
      )}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #FFE600 0px 18px, #000000 18px 22px, #FF00E5 22px 40px, #000000 40px 44px)',
      }}
    >
      <span className="rounded-sm bg-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-[#FFE600] shadow-[0_0_0_2px_#fff]">
        MISSING ASSET
      </span>
      <span className="max-w-[92%] rounded-sm bg-black px-2 py-1 text-xs font-bold leading-tight text-white shadow-[0_0_0_2px_#fff] sm:text-sm">
        נדרש Asset מ-Magnific
      </span>
      <span className="max-w-[92%] truncate rounded-sm bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black shadow-[0_0_0_2px_#000]">
        {assetId}
      </span>
      <span className="max-w-[92%] truncate rounded-sm bg-white px-2 py-0.5 font-mono text-[9px] text-black shadow-[0_0_0_2px_#000]">
        {expectedSrc}
      </span>
    </div>
  );
}
