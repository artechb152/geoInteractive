'use client';

import { motion } from 'framer-motion';

/**
 * SceneHeader — כותרת הסצנה בראש כרטיס הסצנה (Design 1, §13).
 * מקור אמת יחיד — כל `./SceneHeader.tsx` של topic מייצא-מחדש מכאן.
 *
 * כותרת כבדה, ממורכזת, ברוחב מצומצם לקריאות נוחה.
 * `step`/`eyebrow` נשמרים אופציונליים לתאימות לאחור עם כל הקריאות הקיימות, אך אינם מוצגים עוד.
 */
export function SceneHeader({
  title,
  intro,
}: {
  step?: string;
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8"
    >
      <h2 className="mx-auto max-w-3xl text-center font-display font-extrabold tracking-tight text-balance leading-[1.1] text-black text-[clamp(1.875rem,3.8vw,2.875rem)]">
        {title}
      </h2>
      {intro && (
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-black sm:text-xl text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
