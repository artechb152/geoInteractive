'use client';

import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { SceneHeader } from './SceneHeader';
import { ScaleLab } from './scale/ScaleLab';

// Laptop fit: the screen (header + lab) is laid out as at 1920×1080 and shrunk uniformly to the room left
// under the site header and beside the side nav. Reference = the section's content box at 1920 (max-w-6xl
// minus lg:px-8) and the composition's initial height there. Taller states (calc details) grow the page at
// the same scale. The 12 px bottom reserve leaves a gap at the viewport edge on laptops and still keeps
// 1920×1080 at scale 1 (the lab ends 13 px above the fold there).
const FIT_WIDTH = 1088;
const FIT_HEIGHT = 916;
const FIT_RESERVE_BOTTOM = 12;

/** "קנה מידה" — one free-exploration map lab: explore and measure on one map (task 10, 2026-10-08). */
export function ScaleScene() {
  return (
    <section id="scene-scale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <LessonViewportFit referenceWidth={FIT_WIDTH} referenceHeight={FIT_HEIGHT} reserveBottom={FIT_RESERVE_BOTTOM}>
        <SceneHeader
          step="02.2"
          eyebrow="קנה מידה"
          title={<>קנה מידה: הקשר בין המרחק במפה למרחק בשטח</>}
          intro="קנה מידה הוא היחס בין מרחק על המפה למרחק האופקי בשטח. עברו בין המפות, השוו ומדדו."
        />
        <ScaleLab />
      </LessonViewportFit>
    </section>
  );
}
