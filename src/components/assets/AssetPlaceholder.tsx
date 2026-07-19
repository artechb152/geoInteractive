import { cn } from '@/lib/utils';

/**
 * AssetPlaceholder — placeholder רועש ומכוון לנכס Magnific חסר
 * (lesson-shell-design-system §19).
 *
 * חייב להיראות בבירור לא-סופי: רקע מג'נטה חזק, טקסט "PLACEHOLDER",
 * מזהה הנכס והנתיב הצפוי. לעולם לא איור מלוטש שנראה כעיצוב גמור.
 *
 * שני מצבים:
 *   רגיל  — כל פרטי האבחון גלויים (חריצי hero/hook גדולים).
 *   compact — לחריצים קטנים (thumb בכרטיס שיעור): מזהה בלבד, פרטים ב-title.
 */
export function AssetPlaceholder({
  assetId,
  targetPath,
  note,
  compact = false,
  className,
}: {
  /** מזהה נכס, למשל "LESSON-03-HOOK" */
  assetId: string;
  /** הנתיב שבו הקובץ אמור לשבת, למשל "public/assets/isometric/lesson-03-navigation-hook.webp" */
  targetPath: string;
  note?: string;
  compact?: boolean;
  className?: string;
}) {
  const fullNote = `PLACEHOLDER — צריך להפיק asset ב-Magnific · ${assetId} · ${targetPath}${note ? ` · ${note}` : ''}`;
  return (
    <div
      role="img"
      aria-label={fullNote}
      title={fullNote}
      data-asset-placeholder={assetId}
      data-asset-target={targetPath}
      className={cn(
        'absolute inset-0 flex size-full select-none flex-col items-center justify-center gap-1 overflow-hidden p-2 text-center',
        className,
      )}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #FF00E5 0px 14px, #C4009F 14px 28px)',
      }}
    >
      {compact ? (
        <span className="rounded-sm bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white">
          {assetId}
        </span>
      ) : (
        <>
          <span className="rounded-sm bg-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-white">
            PLACEHOLDER
          </span>
          <span className="max-w-[94%] rounded-sm bg-black/85 px-2 py-1 text-xs font-bold leading-tight text-white sm:text-sm">
            צריך להפיק asset ב-Magnific
          </span>
          <span className="max-w-[94%] truncate rounded-sm bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black">
            {assetId}
          </span>
          <span className="max-w-[94%] truncate rounded-sm bg-white/90 px-2 py-0.5 font-mono text-[9px] text-black" dir="ltr">
            {targetPath}
          </span>
          {note && (
            <span className="max-w-[94%] truncate rounded-sm bg-black/70 px-2 py-0.5 text-[10px] text-white">
              {note}
            </span>
          )}
        </>
      )}
    </div>
  );
}
