'use client';

import { useContext } from 'react';
import { motion } from 'framer-motion';
import { SceneStepContext } from './scene-context';

/**
 * SceneHeader V2 — כותרת הסצנה בראש גיליון המפה (design-system §13, שפת V2).
 * מקור אמת יחיד — כל `./SceneHeader.tsx` של topic מייצא-מחדש מכאן.
 *
 * שורת חותמות: מעוין + "נקודת ציון X/Y" (מ-SceneStepContext, בלי props) +
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
            <span className="oct-sm inline-flex items-center gap-2 bg-brand-dark px-2.5 py-1 font-display text-xs font-bold text-bg">
              <span aria-hidden className="size-1.5 rotate-45 bg-accent" />
              נקודת ציון {String(step.idx + 1).padStart(2, '0')}/{String(step.total).padStart(2, '0')}
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
      <span aria-hidden className="mt-4 flex items-center gap-1.5">
        <span className="block h-1.5 w-14 bg-accent" />
        <span className="block size-1.5 rotate-45 bg-brand-dark" />
      </span>
      {intro && (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-muted sm:text-lg text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
