'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Local topic-03 SceneHeader. The shared `@/components/lesson/SceneHeader`
 * stopped rendering `step`/`eyebrow` site-wide (kept only for backward
 * compatibility — see its own doc comment); topic-03's mockups need the
 * eyebrow line back, so this local implementation restores it without
 * touching the shared component other topics rely on. Same call signature
 * as the shared one, so none of the 4 existing `<SceneHeader .../>` call
 * sites in this topic need prop changes beyond the new optional
 * `eyebrowTone`. See design-work/topic-03/shared-component-candidates.md.
 */
export function SceneHeader({
  eyebrow,
  eyebrowTone = 'muted',
  title,
  intro,
}: {
  step?: string;
  eyebrow?: string;
  /** 'muted' (default) = quiet gray label; 'accent' = orange tracked-caps. */
  eyebrowTone?: 'muted' | 'accent';
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
      {eyebrow && (
        <div
          className={cn(
            'mb-2.5 text-center font-display font-semibold',
            eyebrowTone === 'accent'
              ? 'text-[11px] uppercase tracking-[0.2em] text-accent-hover'
              : 'text-sm text-fg-dim'
          )}
        >
          {eyebrow}
        </div>
      )}
      <h2 className="mx-auto max-w-3xl text-center font-display font-extrabold tracking-tight text-balance leading-[1.1] text-fg text-[clamp(1.875rem,3.8vw,2.875rem)]">
        {title}
      </h2>
      {intro && (
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-fg-muted sm:text-xl text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
