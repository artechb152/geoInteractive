'use client';

import { useContext } from 'react';
import { motion } from 'framer-motion';
import { SceneStepContext } from './scene-context';

/**
 * SceneHeader — כותרת הסצנה בראש כרטיס הסצנה (Design 1, §13).
 * מקור אמת יחיד — כל `./SceneHeader.tsx` של topic מייצא-מחדש מכאן.
 *
 * שורת חותמות: צ'יפ רך "סצנה X מתוך Y" (מ-SceneStepContext, בלי props) +
 * eyebrow אופציונלי. כותרת כבדה עם קו-פעולה כתום.
 * `step`/`eyebrow` נשמרים אופציונליים לתאימות לאחור עם כל הקריאות הקיימות.
 */
export function SceneHeader({
  eyebrow,
  title,
  intro,
}: {
  step?: string;
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
}) {
  const step = useContext(SceneStepContext);
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8"
    >
      {(step || eyebrow) && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
          {step && (
            <span className="inline-flex items-center gap-2 rounded-full bg-bg-accent px-3 py-1 font-display text-xs font-bold text-brand-dark">
              סצנה {step.idx + 1} מתוך {step.total}
            </span>
          )}
          {eyebrow && (
            <span className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-brand-dark">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      <h2 className="max-w-4xl font-display font-extrabold tracking-tight text-balance leading-[1.1] text-[clamp(1.625rem,3.4vw,2.625rem)]">
        {title}
      </h2>
      <span aria-hidden className="mt-4 block h-1.5 w-14 rounded-full bg-accent" />
      {intro && (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-muted sm:text-lg text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
