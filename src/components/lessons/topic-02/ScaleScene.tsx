'use client';

import { SceneHeader } from './SceneHeader';
import { ScaleLab } from './scale/ScaleLab';

/** "קנה מידה" — one free-exploration map lab: explore and measure on one map (task 10, 2026-10-08). */
export function ScaleScene() {
  return (
    <section id="scene-scale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.2"
        eyebrow="קנה מידה"
        title={<>קנה מידה: הקשר בין המרחק במפה למרחק בשטח</>}
        intro="קנה מידה הוא היחס בין מרחק על המפה למרחק האופקי בשטח. עברו בין המפות, השוו ומדדו."
      />
      <ScaleLab />
    </section>
  );
}
