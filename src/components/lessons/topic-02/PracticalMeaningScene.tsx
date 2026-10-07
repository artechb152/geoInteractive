'use client';

import { HistoricalCasesPanel } from './HistoricalCasesPanel';

// Split out of OnboardingScene: the four practical examples (grid, scale,
// contours, projection) rely on material taught during the lesson, so they
// sit right before the recap instead of at the start.
export function PracticalMeaningScene() {
  return (
    <section id="scene-practice" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <HistoricalCasesPanel />
    </section>
  );
}
