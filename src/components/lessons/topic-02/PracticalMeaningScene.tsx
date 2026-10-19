'use client';

import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { LESSON_FIT_MAX_HEIGHT, LessonViewportFit } from '@/components/lesson/LessonViewportFit';

// Reference composition = the panel as laid out at 1920 × 1080: the section's
// content column (88rem − 2 × 32 px padding) and the tallest of the four case
// states (cases 1, 2 and 4: 832 px; case 3 is 806 px). Laptops get this same layout
// shrunk uniformly; at 1920 × 1080 the scale is 1. It is fitted as LESSON_FIT_MAX_HEIGHT,
// so a laptop shrinks it to the same width as the other topic-02 screens (not a
// narrower, height-bound one) and the panel's foot scrolls. Like the topography
// screen it keeps 24 px clear below; the pager row is reached by scrolling.
const PANEL_REFERENCE_WIDTH = 1344;
const PANEL_REFERENCE_HEIGHT = Math.min(832, LESSON_FIT_MAX_HEIGHT);
const PANEL_RESERVE_BOTTOM = 24;

// Split out of OnboardingScene: the four practical examples (grid, scale,
// contours, projection) rely on material taught during the lesson, so they
// sit right before the recap instead of at the start.
export function PracticalMeaningScene() {
  return (
    <section id="scene-practice" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <LessonViewportFit referenceWidth={PANEL_REFERENCE_WIDTH} referenceHeight={PANEL_REFERENCE_HEIGHT} reserveBottom={PANEL_RESERVE_BOTTOM}>
        <HistoricalCasesPanel />
      </LessonViewportFit>
    </section>
  );
}
