'use client';

import { motion } from 'framer-motion';

/**
 * Section header used at the top of each Scene inside a lesson.
 * Single source of truth — every topic's local `./SceneHeader.tsx` re-exports this.
 *
 * The small "01.0 · eyebrow" strip above the title was removed per a
 * site-wide design pass: the chapter h2 is the actual chapter heading,
 * so the smaller line was duplicate noise. `step` and `eyebrow` props
 * are kept (optional) so every existing caller continues to compile.
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-[67.2rem] mb-10"
    >
      <h2 className="font-display font-bold tracking-tight text-balance leading-[1.05] text-[clamp(1.75rem,4.5vw,3.5rem)]">
        {title}
      </h2>
      {intro && (
        <p className="mt-5 text-fg-muted text-base sm:text-lg lg:text-xl leading-relaxed text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
