/* The three projection surfaces as line icons — one size, one stroke, for the method tabs
   and the practice's choices (after the reference's tab icons). currentColor throughout. */

import type { Method } from './projectionsModel';

export function SurfaceIcon({ m, size = 36, className }: { m: Method; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {m === 'cyl' && (
        <>
          <ellipse cx="18" cy="8" rx="9" ry="3.2" />
          <path d="M9 8v20c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2V8" />
        </>
      )}
      {m === 'cone' && (
        <>
          <path d="M18 4 7.5 27.5M18 4l10.5 23.5" />
          <ellipse cx="18" cy="27.8" rx="10.5" ry="3.4" />
        </>
      )}
      {m === 'az' && (
        <>
          <ellipse cx="18" cy="18" rx="14" ry="7.5" />
          <path d="M4 18h28M18 10.5v15M8.1 12.7l19.8 10.6M27.9 12.7 8.1 23.3" strokeWidth={1.2} />
          <ellipse cx="18" cy="18" rx="7" ry="3.75" strokeWidth={1.2} />
        </>
      )}
    </svg>
  );
}
