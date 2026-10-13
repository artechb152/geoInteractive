'use client';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';

/* ─────────── קואורדינטות 1 — מסכי לפטופ ───────────
   Each learning screen of the part shrinks on its own, uniformly, like a slide (LessonViewportFit),
   so a laptop shows it whole: same columns, line breaks, map and model ratios, numbers and controls.
   Reference = 1920 × 1080: the section's content column is 1088px (max-w-6xl less its lg padding),
   and under the 80px site header (--header-h from md up) 1000px of the view are free; the side nav
   is already taken off by the measured width. `height` is the screen's tallest laid-out height there,
   so the 1920 × 1080 view stays at scale 1 and the scale holds steady while the reader moves between
   the screen's states. Used only by CoordinatesScene and its private blocks (not by קואורדינטות 2). */
const FIT_WIDTH = 1088;
const FIT_HEADER = 80;
const FIT_VIEW_HEIGHT = 1080 - FIT_HEADER;

export function FitScreen({
  name,
  height,
  fitTallerStates = false,
  className = 'my-10',
  children,
}: {
  name: string;
  /** Laid-out height at 1920 × 1080, px. */
  height: number;
  /** A rarer, taller state (e.g. an optional experiment) shrinks further instead of running off the view. */
  fitTallerStates?: boolean;
  /** Margins of the screen in the sequence (the wrapped root's own margins are moved here). */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-coordinates1-screen={name} className={className}>
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={Math.min(height, FIT_VIEW_HEIGHT)}
        reserveTop={FIT_HEADER}
        reserveBottom={0}
        fitTallerStates={fitTallerStates}
        contentClassName="[&>*]:!my-0"
      >
        {children}
      </LessonViewportFit>
    </div>
  );
}
