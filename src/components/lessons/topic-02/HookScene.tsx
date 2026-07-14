'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[calc(100dvh-var(--header-h)-5rem)] relative flex items-center overflow-hidden bg-bg"
    >
      {/* Subtle warm wash — reuses the existing `topo-fade` token, contained to
          this section (not a full-viewport backdrop). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-topo-fade" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.05fr_1fr] items-center gap-10 xl:gap-16"
      >
        {/* Text column — first in DOM so it lands at the inline-start (right)
            edge under the page's RTL direction; same convention already used
            by OnboardingScene's list/diagram grid. */}
        <div className="text-end">
          {/* Lesson numeral + divider — a centered ornament, independent of
              the end-aligned paragraph column around it (matches mockup). */}
          <div className="text-center mb-6">
            <div className="font-display font-black leading-none text-fg text-[clamp(4.5rem,9vw,9rem)]">
              02
            </div>
            <DividerStar />
          </div>

          {/* Impact Title */}
          <h1 className="text-[clamp(1.85rem,2.7vw,2.5rem)] font-bold tracking-tight text-balance leading-[1.18] text-fg">
            טעות של <span className="text-accent">מילימטר</span> במפה.
            <br />
            יכולה לעלות בחיי אדם בשטח.
          </h1>

          {/* Small centered accent rule under the headline only. */}
          <div aria-hidden className="mx-auto my-5 h-0.5 w-20 rounded-full bg-accent/60" />

          {/* Narrative Copy */}
          <p className="text-fg-muted text-base sm:text-lg max-w-xl ms-auto leading-relaxed text-pretty font-medium">
            מפה צבאית היא לא ציור — היא תרגום מתמטי של העולם לדף.
            לקרוא אותה לא נכון זה להפציץ את המקום הלא נכון. בשיעור הזה נלמד
            את <span className="text-accent">שפת המפה</span> מהבסיס, כדי להפוך דף שטוח לתמונה מבצעית חדה.
          </p>

          {/* CTA — plain text link + arrow, no button chrome (matches mockup). */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-9"
          >
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
              className="inline-flex items-center gap-3 font-display font-semibold text-base text-accent hover:text-accent-hover transition-colors duration-200"
              aria-label="התחל את השיעור"
            >
              <ForwardArrow />
              <span>לחץ כדי להתחיל</span>
            </button>
          </motion.div>
        </div>

        {/* Illustration column — renders at the inline-end (left) edge under
            RTL. Bounded to its own column (aspect-square + max-width) rather
            than spanning the section as a full backdrop — this is a small
            technical survey-grid diagram, not a landing-page hero graphic. */}
        <div className="mx-auto w-full max-w-[460px] lg:max-w-[560px] aspect-square">
          <SurveyGridIllustration />
        </div>
      </motion.div>
    </section>
  );
}

/** Thin divider line with a small centered compass/star glyph, echoing the
 * site's compass motif without pulling in the full brand emblem. */
function DividerStar() {
  return (
    <div aria-hidden className="mt-3 flex items-center justify-center gap-3">
      <span className="h-px w-16 sm:w-24 bg-fg-dim/25" />
      <svg width="18" height="18" viewBox="0 0 24 24" className="text-fg shrink-0">
        <path
          d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z"
          fill="currentColor"
        />
      </svg>
      <span className="h-px w-16 sm:w-24 bg-fg-dim/25" />
    </div>
  );
}

/** Plain long arrow (line + open arrowhead), matching the custom glyph drawn
 * in the mockup — not a lucide chevron, so it is reproduced exactly as
 * authored (pointing right) rather than flipped for RTL. */
function ForwardArrow() {
  return (
    <svg width="30" height="14" viewBox="0 0 30 14" fill="none" aria-hidden className="shrink-0">
      <line x1="1" y1="7" x2="23" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M17 1.5 L24 7 L17 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Technical survey/coordinate-grid illustration: a tilted dashed reference
 * grid, a full-bleed crosshair with ruler ticks, and a pair of center dots
 * (true point vs. the millimeter-off measured point) — pairs visually with
 * the "טעות של מילימטר במפה" headline. Faint background contour lines reuse
 * the same idea as the previous BackdropMap, just contained to this column. */
function SurveyGridIllustration() {
  const gridLines = [16, 24, 32, 40, 48, 56, 64, 72, 80, 88];
  const ticks = [10, 20, 30, 40, 60, 70, 80, 90];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      {/* Faint background contours */}
      <g className="text-fg-dim" opacity={0.07}>
        {[0, 1, 2, 3].map((i) => (
          <motion.path
            key={i}
            d={`M -5 ${18 + i * 9} C 20 ${10 + i * 7}, 55 ${26 - i * 4}, 105 ${14 + i * 6}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.15, ease: 'easeOut' }}
          />
        ))}
      </g>

      {/* Tilted survey grid */}
      <g transform="rotate(-8 50 50)" className="text-accent" opacity={0.55}>
        {gridLines.map((p) => (
          <line key={`v${p}`} x1={p} y1={12} x2={p} y2={88} stroke="currentColor" strokeWidth="0.25" strokeDasharray="1.2 1" />
        ))}
        {gridLines.map((p) => (
          <line key={`h${p}`} x1={12} y1={p} x2={88} y2={p} stroke="currentColor" strokeWidth="0.25" strokeDasharray="1.2 1" />
        ))}
        <rect x="12" y="12" width="76" height="76" fill="none" stroke="currentColor" strokeWidth="0.5" />
        {/* survey-marker ticks along the frame, echoing the mockup's ruled edge */}
        {gridLines.map((p) => (
          <g key={`tick${p}`}>
            <line x1={p} y1="10.5" x2={p} y2="13.5" stroke="currentColor" strokeWidth="0.35" />
            <line x1={p} y1="86.5" x2={p} y2="89.5" stroke="currentColor" strokeWidth="0.35" />
            <line x1="10.5" y1={p} x2="13.5" y2={p} stroke="currentColor" strokeWidth="0.35" />
            <line x1="86.5" y1={p} x2="89.5" y2={p} stroke="currentColor" strokeWidth="0.35" />
          </g>
        ))}
      </g>

      {/* Full-bleed crosshair with ruler ticks + center ring */}
      <g className="text-fg-dim" opacity={0.55}>
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.3" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.3" />
        {ticks.map((p) => (
          <g key={p}>
            <line x1={p} y1="48.6" x2={p} y2="51.4" stroke="currentColor" strokeWidth="0.3" />
            <line x1="48.6" y1={p} x2="51.4" y2={p} stroke="currentColor" strokeWidth="0.3" />
          </g>
        ))}
        <circle cx="50" cy="50" r="9" fill="none" stroke="currentColor" strokeWidth="0.3" opacity={0.6} />
      </g>

      {/* Center pair — the "millimeter" true-vs-measured point */}
      <circle cx="48.6" cy="50" r="1.6" className="fill-fg" />
      <motion.circle
        cx="51.4"
        cy="50"
        r="1.6"
        className="fill-accent"
        animate={{ opacity: [1, 0.55, 1] }}
        transition={{ repeat: Infinity, duration: 2.2 }}
      />
    </svg>
  );
}
