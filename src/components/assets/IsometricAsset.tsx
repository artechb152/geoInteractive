'use client';

/**
 * IsometricAsset — עטיפה בטוחה לנכסי Magnific בסגנון isometric papercut
 * (lesson-shell-design-system §18–§20).
 *
 * שלושה מצבים:
 * - pending — התמונה גלויה מההתחלה (גם ב-HTML הסטטי, לפני hydration), כך
 *   שתמונה זמינה — מטמון / טעינה מהירה — מוצגת מיד, בלי השהיה ובלי fade.
 *   מאחוריה משטח נייר חם עם ברק רך שמופיע רק אחרי ~250ms (סטטי תחת
 *   prefers-reduced-motion). רק תמונה שעדיין בדרך אחרי hydration מוסתרת
 *   ונחשפת ב-fade קצר כשהיא מגיעה.
 * - ready   — התמונה עצמה.
 * - missing — נכס שעוד צריך להפיק:
 *     • `next dev` — ה-AssetPlaceholder האבחוני (מזהה, נתיב, prompt), כדי
 *       לראות מה חסר ואיפה. כיבוי: NEXT_PUBLIC_ASSET_DIAGNOSTICS=0.
 *     • build / export ללומדים — משטח נייר שקט עם קווי-גובה (ואייקון נוף
 *       לתמונה אינפורמטיבית), בלי שום פרט פיתוח.
 *   לעולם לא תמונה שבורה (ראו asset-img-error-script.ts), לעולם לא טעינה
 *   אינסופית.
 * - יחס גובה-רוחב קבוע דרך המיכל ⇒ אפס CLS בכל מעבר בין המצבים.
 * - data-asset-* על המיכל + console.warn ב-dev — לאיתור חובות נכסים.
 * - לעולם לא URL חיצוני — static export ל-LMS/SCORM חייב לעבוד offline.
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AssetPlaceholder } from './AssetPlaceholder';

type AssetAspect = '16/9' | '21/9' | '1/1' | '4/3';
type AssetStatus = 'pending' | 'ready' | 'missing';

const ASPECT_CLASS: Record<AssetAspect, string> = {
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
};

/** בלוק האבחון לנכס חסר — פעיל כברירת מחדל ב-dev, כבוי תמיד בבנייה לפרודקשן. */
const SHOW_DIAGNOSTIC_PLACEHOLDER =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ASSET_DIAGNOSTICS !== '0';

/** אזהרה אחת לכל נכס חסר בסשן — כדי שרינדורים חוזרים לא יציפו את הקונסול. */
const warnedMissing = new Set<string>();

function reportMissing(assetId: string, src: string, prompt?: string) {
  if (process.env.NODE_ENV !== 'development') return;
  const key = `${assetId}|${src}`;
  if (warnedMissing.has(key)) return;
  warnedMissing.add(key);
  console.warn(
    `[IsometricAsset] missing asset ${assetId} → public${src || ' (empty src)'}` +
      (prompt ? `\nprompt: ${prompt}` : ''),
  );
}

export function IsometricAsset({
  assetId,
  src,
  alt,
  aspect = '16/9',
  fit = 'cover',
  position = 'center',
  compactPlaceholder = false,
  eager = false,
  prompt,
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
  /** נקודת עיגון ל-object-position כש-fit="cover" — לשליטה איזה חלק מהתמונה נחתך */
  position?: 'center' | 'top' | 'bottom';
  /** צורת בלוק האבחון לנכס חסר (dev בלבד) */
  compactPlaceholder?: boolean;
  /** טעינה מיידית — למשל תוכן שדורש גלילה אופקית פנימית שבה loading="lazy" לא מזהה נכון */
  eager?: boolean;
  /** בריף יצירה ל-AI — למפתחים בלבד (בלוק האבחון / console), לעולם לא מוצג ללומד. */
  prompt?: string;
  className?: string;
}) {
  const hasSrc = src.length > 0;
  const [status, setStatus] = useState<AssetStatus>(hasSrc ? 'pending' : 'missing');
  // true רק כשאחרי hydration התמונה עדיין לא הגיעה — אז (ורק אז) היא מוסתרת
  // ונחשפת ב-fade. תמונה שכבר זמינה לא עוברת דרך המסלול הזה בכלל.
  const [revealOnLoad, setRevealOnLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!hasSrc) {
      setStatus('missing');
      return;
    }
    // אירועי load/error יכולים לקרות (מהמטמון, או ב-HTML הסטטי לפני hydration)
    // לפני ש-React מחבר את המאזינים — ואז הם מוחמצים. complete=true עם
    // naturalWidth=0 פירושו טעינה שנכשלה; complete=false — עדיין בדרך
    // (כולל lazy מחוץ למסך), ו-onLoad/onError יכריעו.
    const img = imgRef.current;
    // סימוני ה-<head> script שייכים ל-src הקודם — מתחילים נקי (הוא יסמן שוב).
    if (img && !img.complete) {
      img.removeAttribute('data-asset-loaded');
      img.removeAttribute('data-asset-failed');
    }
    if (img?.complete) {
      setStatus(img.naturalWidth > 0 ? 'ready' : 'missing');
      setRevealOnLoad(false);
    } else {
      setStatus('pending');
      setRevealOnLoad(true);
    }

    // דפדפנים דוחים את הפענוח (decode) בפועל של תמונה עד לרגע שבו היא באמת
    // מצוירת — גם אם eager, ואפילו עם decoding="async" — ולכן תמונה שמתחילה
    // ב-opacity:0 (למשל בקרוסלה) גורמת לפריים "תקוע" בפעם הראשונה שהיא הופכת
    // גלויה. decode() יזום מכריח פענוח א-סינכרוני מראש, מחוץ לנתיב הציור.
    if (eager) {
      img?.decode?.().catch(() => {});
    }
  }, [src, hasSrc, eager]);

  useEffect(() => {
    if (status === 'missing') reportMissing(assetId, src, prompt);
  }, [status, assetId, src, prompt]);

  const resolvedSrc = src.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${src}`
    : src;

  const decorative = alt.trim().length === 0;

  return (
    <div
      data-asset-id={assetId}
      data-asset-src={src}
      data-asset-status={status}
      aria-busy={status === 'pending' || undefined}
      className={cn(
        'relative overflow-hidden bg-bg',
        // תמונה שכבר נטענה (מסומנת ע"י ה-<head> script, גם לפני hydration) —
        // משטח הטעינה שמאחוריה לא מוצג בכלל. במסלול ה-fade הוא דוהה יחד איתה.
        !revealOnLoad && '[&:has(>img[data-asset-loaded])>[data-asset-surface]]:hidden',
        ASPECT_CLASS[aspect],
        className,
      )}
    >
      <AssetLoadingSurface active={status === 'pending'} fade={revealOnLoad} />

      {status === 'missing' &&
        (SHOW_DIAGNOSTIC_PLACEHOLDER ? (
          <AssetPlaceholder
            assetId={assetId}
            targetPath={`public${src}`}
            note="להפיק ב-Magnific לפי prompt"
            prompt={prompt}
            compact={compactPlaceholder}
          />
        ) : (
          <AssetMissingSurface alt={alt} decorative={decorative} />
        ))}

      {status !== 'missing' && hasSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          // מסומן data-asset-loaded / data-asset-failed ע"י ASSET_IMG_ERROR_SCRIPT
          // (layout) גם לפני hydration — failed ⇒ מוסתר, בלי אייקון תמונה-שבורה.
          // הסימונים האלה לא קיימים ב-props, ולכן suppressHydrationWarning
          // (חל על המאפיינים של האלמנט הזה בלבד).
          data-asset-img=""
          suppressHydrationWarning
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('missing')}
          className={cn(
            'absolute inset-0 size-full [&[data-asset-failed]]:invisible',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            fit === 'cover' && position === 'top' && 'object-top',
            fit === 'cover' && position === 'bottom' && 'object-bottom',
            revealOnLoad && 'transition-opacity duration-300 ease-out motion-reduce:transition-none',
            revealOnLoad && status !== 'ready' && 'opacity-0',
          )}
        />
      )}
    </div>
  );
}

/**
 * משטח הטעינה — גוון tanline חם + ברק paper-bright רך שחוצה מימין לשמאל.
 * יושב מאחורי התמונה, מופיע רק אחרי השהיה קצרה (animate-asset-surface-in)
 * ומוסתר ברגע שהתמונה נטענה (data-asset-loaded) — תמונה זמינה לא חושפת
 * אותו אף פעם. כשהתמונה נחשפת ב-fade הוא דוהה
 * יחד איתה, כדי שלא ייחתך בבת אחת מאחורי PNG שקוף (fit="contain");
 * אחרת הוא נעלם מיד.
 */
function AssetLoadingSurface({ active, fade }: { active: boolean; fade: boolean }) {
  return (
    <div
      aria-hidden
      data-asset-surface=""
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        fade && 'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      {active && (
        <div className="absolute inset-0 animate-asset-surface-in bg-tanline/35 motion-reduce:[animation-duration:0s]">
          <div className="absolute inset-0 hidden bg-gradient-to-l from-transparent via-paper-bright/70 to-transparent motion-safe:block motion-safe:animate-asset-sheen" />
        </div>
      )}
    </div>
  );
}

/**
 * חלופה שקטה לנכס חסר (build ללומדים) — קווי-גובה tan עדינים (מוטיב המפה של
 * האתר) על משטח נייר; לתמונה אינפורמטיבית גם אייקון נוף קטן ו-role="img" עם
 * ה-alt העברי של הלומד (לא פרטי פיתוח). תמונה דקורטיבית (alt="") — מוסתרת
 * מקוראי מסך.
 */
function AssetMissingSurface({ alt, decorative }: { alt: string; decorative: boolean }) {
  return (
    <div
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': alt })}
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-tanline/35"
    >
      <svg
        aria-hidden
        className="absolute inset-0 size-full text-tanline-contour opacity-40"
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M-10 92 C 30 78, 58 100, 96 86 S 160 62, 210 78" vectorEffect="non-scaling-stroke" />
        <path d="M-10 70 C 26 58, 60 78, 100 64 S 158 40, 210 52" vectorEffect="non-scaling-stroke" />
        <path d="M-10 46 C 34 38, 62 54, 104 42 S 162 20, 210 28" vectorEffect="non-scaling-stroke" />
        <path d="M-10 22 C 30 16, 66 30, 108 20 S 166 0, 210 6" vectorEffect="non-scaling-stroke" />
      </svg>
      {!decorative && (
        <svg
          aria-hidden
          className="relative w-[min(18%,44px)] text-fg-dim opacity-60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 19 9.5 9l4 6 2.5-3.5L21 19Z" />
          <circle cx="16.5" cy="6.5" r="1.8" />
        </svg>
      )}
    </div>
  );
}
