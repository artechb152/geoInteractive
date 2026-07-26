'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * שלוש חלופות ל-shimmer של טעינת תמונות — כולן בפלטת האתר (paper/olive/ember/pine/tanline)
 * עם מוטיב "כדור הארץ": לוויין חג, פעימת קווי גובה, גלובוס וויירפריים מסתובב.
 * ראו src/app/shimmer-demos לתצוגה המשווה.
 */

export type ShimmerVariant = 1 | 2 | 3;

// ── 1. מעקב לוויין — פס אור אלכסוני + נקודת לוויין שחגה סביב כדור הארץ ──
function SatelliteSweepShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-pine-grad">
      {/* טבעת כדור הארץ במרכז, כמו נראה מהמסלול */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-olive-ring/35"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-olive-ring/25"
      />

      {/* לוויין שחג במסלול אליפטי סביב המרכז */}
      <div
        aria-hidden
        className="absolute inset-[14%] animate-satellite-orbit"
        style={{ animationDuration: '5s' }}
      >
        <span className="absolute start-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-ember shadow-[0_0_10px_2px_rgba(217,126,43,0.65)]" />
      </div>

      {/* פס שימר אלכסוני */}
      <div
        aria-hidden
        className="absolute inset-0 animate-shimmer-sweep bg-[length:200%_100%]"
        style={{
          backgroundImage:
            'linear-gradient(75deg, transparent 40%, rgba(220,205,178,0.28) 50%, transparent 60%)',
        }}
      />
    </div>
  );
}

// ── 2. פעימת קווי גובה — טבעות מתרחבות בסגנון המפה הטופוגרפית ──
function ContourPulseShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-paper-grad">
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 0.8, 1.6].map((delayS) => (
          <span
            key={delayS}
            aria-hidden
            className="absolute size-[30%] rounded-full border-2 border-olive-ring/60 animate-contour-ping"
            style={{ animationDelay: `-${delayS}s` }}
          />
        ))}
        <span className="relative size-2.5 rounded-full bg-ember" aria-hidden />
      </div>

      {/* קו משווה עדין — רמז לכדור הארץ */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-tanline-contour/40"
      />
    </div>
  );
}

// ── 3. גלובוס וויירפריים מסתובב — עם שכבת שימר קלאסית מעליו ──
function GlobeWireframeShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-pine-grad">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="size-[62%] text-tanline/70" aria-hidden>
          <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* קווי אורך (meridians) — scaleX מדמה סיבוב סביב הציר */}
          {[0, -1.35, -2.7].map((delay, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx={34 - i * 11}
              ry="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="origin-center animate-globe-meridian"
              style={{ animationDelay: `${delay}s`, transformBox: 'fill-box' }}
            />
          ))}
          {/* קווי רוחב (latitudes) — סטטיים */}
          <ellipse cx="50" cy="50" rx="34" ry="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <ellipse cx="50" cy="50" rx="34" ry="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        </svg>
      </div>

      {/* שכבת שימר קלאסית מעל הגלובוס */}
      <div
        aria-hidden
        className="absolute inset-0 animate-shimmer-sweep bg-[length:200%_100%]"
        style={{
          backgroundImage:
            'linear-gradient(75deg, transparent 35%, rgba(253,251,243,0.22) 50%, transparent 65%)',
        }}
      />
    </div>
  );
}

const SHIMMERS: Record<ShimmerVariant, () => React.JSX.Element> = {
  1: SatelliteSweepShimmer,
  2: ContourPulseShimmer,
  3: GlobeWireframeShimmer,
};

export function ShimmerOverlay({ variant }: { variant: ShimmerVariant }) {
  const Comp = SHIMMERS[variant];
  return <Comp />;
}

// ── עטיפת דמו: מדמה טעינת תמונה אמיתית מהשרת עם עיכוב, כדי לראות את
//    השימר בפעולה, כולל כפתור "הפעל שוב". ──
export function LoadingImageDemo({
  variant,
  src,
  alt,
  className,
  delayMs = 2200,
}: {
  variant: ShimmerVariant;
  src: string;
  alt: string;
  className?: string;
  delayMs?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), delayMs);
    return () => clearTimeout(t);
  }, [replayKey, delayMs]);

  return (
    <div className={cn('group relative overflow-hidden rounded-2xl border border-border/60', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 320px, 45vw"
        className={cn(
          'object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          loaded ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <ShimmerOverlay variant={variant} />
      </div>

      <button
        type="button"
        onClick={() => setReplayKey((k) => k + 1)}
        className="absolute bottom-2 start-2 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        הפעל שוב
      </button>
    </div>
  );
}
