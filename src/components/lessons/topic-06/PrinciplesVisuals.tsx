'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Illustration pieces for PrinciplesScene (topic-06 · עקרונות הניווט).
 * Pure SVG, no raster assets. Instruments/maps are never mirrored for RTL —
 * a compass is N-up / E-right regardless of page direction.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export type NorthGlyphId = 'magnetic' | 'grid' | 'true';

/**
 * One purpose-drawn glyph per north type, tinted via `currentColor`:
 *  - magnetic → a compass needle, slightly tilted (it drifts off true north)
 *  - grid     → a map sheet with printed grid lines + an arrow along one line
 *  - true     → the North Star above a fixed pole
 */
export function NorthGlyph({ id, className }: { id: NorthGlyphId; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      {id === 'magnetic' && (
        <>
          <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
          <g transform="rotate(-16 16 16)">
            <path d="M16 4.5 19.2 16h-6.4L16 4.5Z" fill="currentColor" />
            <path d="M12.8 16h6.4L16 27.5 12.8 16Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </g>
          <circle cx="16" cy="16" r="1.7" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
        </>
      )}
      {id === 'grid' && (
        <>
          <rect x="5" y="7" width="22" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
          <path d="M5 13.7h22M5 20.3h22M10.5 7v20M21.5 7v20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M16 27.5V4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.2 8.6 16 4.3l3.8 4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {id === 'true' && (
        <>
          <path
            d="M16 2.8 17.5 7.5 22.2 9 17.5 10.5 16 15.2 14.5 10.5 9.8 9 14.5 7.5 16 2.8Z"
            fill="currentColor"
          />
          <path d="M16 17.5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 28h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
          <circle cx="7" cy="5" r="0.9" fill="currentColor" opacity="0.4" />
          <circle cx="25.5" cy="14" r="0.9" fill="currentColor" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

/**
 * GPS-Denied at a glance: the satellite signal is jammed before it reaches the
 * receiver → the navigator falls back to the three "old-school" tools named in
 * the card's copy (מפה, מצפן, ספירת צעדים). Reads right→left like the page:
 * cause on the right, fallback on the left. Labels reuse terms from the copy.
 */
export function GpsDeniedIllustration({ className }: { className?: string }) {
  const reduce = !!useReducedMotion();
  // One in-view observer on the <svg>; every piece below is a variant child with
  // its own delay, so the little story plays in order: jam → arrow → tools.
  // Under reduced motion nothing is animated at all: no variants, no observer.
  const reveal = (delay: number) =>
    reduce
      ? {}
      : {
          variants: {
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0, transition: { duration: 0.4, delay, ease: EASE } },
          },
        };
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          variants: {
            hidden: { pathLength: 0, opacity: 0 },
            show: { pathLength: 1, opacity: 1, transition: { duration: 0.5, delay, ease: EASE } },
          },
        };
  const observe = reduce
    ? {}
    : { initial: 'hidden' as const, whileInView: 'show' as const, viewport: { once: true, amount: 0.35 } };

  return (
    <motion.svg
      viewBox="0 0 480 176"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="כאשר GPS אינו זמין, נעזרים במפה, במצפן ובספירת צעדים"
      {...observe}
    >
      {/* ground line — soft papercut shelf the tools sit on */}
      <path d="M8 146h464" className="stroke-border-subtle" strokeWidth="2" strokeLinecap="round" />

      {/* ── Cause (right): satellite → jammed signal → dead receiver ── */}
      <motion.g {...reveal(0)}>
        {/* satellite */}
        <g transform="translate(428 30) rotate(-28)">
          <rect x="-26" y="-6" width="17" height="12" rx="1.5" fill="#E8DCC4" className="stroke-fg-muted" strokeWidth="1.2" />
          <path d="M-20.3 -6v12M-14.6 -6v12" className="stroke-fg-muted" strokeWidth="0.8" opacity="0.6" />
          <rect x="9" y="-6" width="17" height="12" rx="1.5" fill="#E8DCC4" className="stroke-fg-muted" strokeWidth="1.2" />
          <path d="M14.7 -6v12M20.4 -6v12" className="stroke-fg-muted" strokeWidth="0.8" opacity="0.6" />
          <path d="M-9 0h18" className="stroke-fg-muted" strokeWidth="1.2" />
          <rect x="-6" y="-8" width="12" height="16" rx="2.5" fill="#FFFFFF" className="stroke-fg" strokeWidth="1.3" />
          <path d="M0 8v4.5" className="stroke-fg" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M-4 14.5a4 4 0 0 0 8 0Z" className="fill-fg" />
        </g>
      </motion.g>

      {/* signal waves heading down-left toward the receiver */}
      <g className="stroke-accent-cool" fill="none" strokeWidth="1.8" strokeLinecap="round">
        <motion.path d="M404 58a16 16 0 0 1-12 6" strokeOpacity="0.9" {...draw(0.1)} />
        <motion.path d="M410 66a26 26 0 0 1-22 10" strokeOpacity="0.7" {...draw(0.16)} />
        <motion.path d="M416 74a36 36 0 0 1-31 14" strokeOpacity="0.5" {...draw(0.22)} />
      </g>

      {/* jamming: a zig-zag interference band + ✕ cutting the signal */}
      <motion.g {...reveal(0.3)}>
        <path
          d="M352 70l10 8-8 5 11 9-7 5 10 8"
          fill="none"
          className="stroke-status-danger"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="383" cy="96" r="9" className="fill-status-danger" />
        <path d="M379 92l8 8M387 92l-8 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </motion.g>

      {/* handheld GPS receiver — screen dark, bars empty */}
      <motion.g {...reveal(0.05)}>
        <rect x="392" y="104" width="30" height="42" rx="6" fill="#FFFFFF" className="stroke-fg-muted" strokeWidth="1.4" />
        <rect x="397" y="110" width="20" height="16" rx="2" className="fill-fg-muted" opacity="0.8" />
        <path d="M400 122v-2M404 122v-4M408 122v-6M412 122v-8" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
        <circle cx="407" cy="136" r="3.2" className="stroke-fg-dim" strokeWidth="1.2" fill="none" />
        <text x="407" y="166" textAnchor="middle" className="fill-fg-dim font-display text-[14px] font-semibold" style={{ textDecoration: 'line-through' }}>
          GPS
        </text>
      </motion.g>

      {/* ── Transition arrow (right → left) ── */}
      <motion.path
        d="M340 118 C 318 96, 298 96, 280 112"
        fill="none"
        className="stroke-brand-dark"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.1 6"
        {...draw(0.45)}
      />
      <motion.path
        d="M288 104 279 113l12 3"
        fill="none"
        className="stroke-brand-dark"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...reveal(0.65)}
      />

      {/* ── Fallback (left): map · compass · pace count, as papercut tiles ── */}
      {/* map — rightmost, first in reading order */}
      <motion.g {...reveal(0.6)}>
        <path d="M188 136 L206 128 L226 136 L246 128 L258 132 L258 142 L240 150 L220 142 L200 150 L188 146Z" fill="#C9B892" />
        <path d="M188 126 L206 118 L226 126 L246 118 L258 122 L258 132 L240 140 L220 132 L200 140 L188 136Z" fill="#E8DCC4" />
        <path
          d="M188 72 L208 64 L228 72 L248 64 L262 70 L262 124 L242 132 L222 124 L202 132 L188 126Z"
          fill="#FFFFFF"
          className="stroke-border-strong"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M208 64v60M228 72v52M248 64v60" className="stroke-border" strokeWidth="1" />
        <g fill="none" strokeWidth="1.2" strokeLinecap="round">
          <path d="M194 96c10-8 18-4 26-10s18-6 36-2" stroke="#8A9163" />
          <path d="M196 108c12-6 22 0 32-6s16-4 28 0" stroke="#6E7A4E" opacity="0.8" />
          <path d="M200 84c8-5 16-3 22-7" stroke="#8A9163" opacity="0.7" />
        </g>
        <path d="M200 118 C 214 110, 226 100, 246 90" fill="none" className="stroke-fg" strokeWidth="1.6" strokeDasharray="4 3" strokeLinecap="round" />
        <circle cx="246" cy="90" r="3" className="fill-fg" />
        <text x="225" y="168" textAnchor="middle" className="fill-fg font-display text-[14px] font-semibold">
          מפה
        </text>
      </motion.g>

      {/* compass */}
      <motion.g {...reveal(0.7)}>
        <ellipse cx="136" cy="138" rx="30" ry="8" fill="#C9B892" opacity="0.7" />
        <circle cx="136" cy="100" r="31" fill="#C9B892" />
        <circle cx="136" cy="98" r="31" fill="#E8DCC4" className="stroke-border-strong" strokeWidth="1.2" />
        <circle cx="136" cy="98" r="24" fill="#FFFFFF" className="stroke-border" strokeWidth="1" />
        {[0, 90, 180, 270].map((d) => {
          const a = ((d - 90) * Math.PI) / 180;
          return (
            <line
              key={d}
              x1={136 + Math.cos(a) * 19}
              y1={98 + Math.sin(a) * 19}
              x2={136 + Math.cos(a) * 23}
              y2={98 + Math.sin(a) * 23}
              className="stroke-fg-muted"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          );
        })}
        <g transform="rotate(24 136 98)">
          <path d="M136 79 140 98h-8l4-19Z" className="fill-accent-hot" />
          <path d="M132 98h8l-4 19-4-19Z" className="fill-fg-dim" opacity="0.55" />
        </g>
        <circle cx="136" cy="98" r="2.4" fill="#FFFFFF" className="stroke-fg" strokeWidth="1.2" />
        <text x="136" y="168" textAnchor="middle" className="fill-fg font-display text-[14px] font-semibold">
          מצפן
        </text>
      </motion.g>

      {/* pace count — footprints + tally */}
      <motion.g {...reveal(0.8)}>
        <g className="fill-fg-muted" opacity="0.85">
          <g transform="translate(48 118) rotate(-10)">
            <ellipse cx="0" cy="0" rx="6" ry="10" />
            <ellipse cx="0" cy="14" rx="4.2" ry="4.6" />
          </g>
          <g transform="translate(66 88) rotate(-10)">
            <ellipse cx="0" cy="0" rx="6" ry="10" />
            <ellipse cx="0" cy="14" rx="4.2" ry="4.6" />
          </g>
          <g transform="translate(40 60) rotate(-10)" opacity="0.6">
            <ellipse cx="0" cy="0" rx="6" ry="10" />
            <ellipse cx="0" cy="14" rx="4.2" ry="4.6" />
          </g>
        </g>
        <g className="stroke-brand-dark" strokeWidth="2" strokeLinecap="round">
          <path d="M84 116v18M90 116v18M96 116v18M102 116v18" />
          <path d="M80 131l26-12" />
        </g>
        <text x="62" y="168" textAnchor="middle" className="fill-fg font-display text-[14px] font-semibold">
          ספירת צעדים
        </text>
      </motion.g>
    </motion.svg>
  );
}
