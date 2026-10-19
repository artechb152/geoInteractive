'use client';

import { LESSON_FIT_MAX_HEIGHT, LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { SceneHeader } from './SceneHeader';
import { ScaleLab } from './scale/ScaleLab';

// Laptop fit: the lab is laid out as at 1920×1080 and shrunk uniformly to the room left under the site
// header and beside the side nav. Reference width = the section's content box at 1920 (max-w-lesson minus
// lg:px-8). The scene header stays outside the fit, as in the topography screen: with it inside, the
// composition was 1069 px tall and height-bound on laptops, so it came out narrower than the screens before
// it. The lab reserves the sticky site header (--header-h, 5rem from lg) plus a 24 px gap above, and 24 px
// below, like the sibling topic-02 screens. The lab is laid out to stay within LESSON_FIT_MAX_HEIGHT at that
// width (702 px: its map column is narrowed for it), so a laptop shrinks it to the same width as the other
// topic-02 screens and the whole lab still fits one screen. Taller states (calc details) grow the page at the
// same scale.
const FIT_WIDTH = 1344;
const FIT_HEIGHT = LESSON_FIT_MAX_HEIGHT;
const FIT_TOP = 80 + 24;
const FIT_BOTTOM = 24;

/** "קנה מידה" — one free-exploration map lab: explore and measure on one map (task 10, 2026-10-08). */
export function ScaleScene() {
  return (
    <section id="scene-scale" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.2"
        eyebrow="קנה מידה"
        title={<>קנה מידה: הקשר בין המרחק במפה למרחק בשטח</>}
        intro="קנה מידה הוא היחס בין מרחק על המפה למרחק האופקי בשטח. עברו בין המפות, השוו ומדדו."
      />
      <LessonViewportFit referenceWidth={FIT_WIDTH} referenceHeight={FIT_HEIGHT} reserveTop={FIT_TOP} reserveBottom={FIT_BOTTOM}>
        <ScaleLab />
      </LessonViewportFit>
    </section>
  );
}
