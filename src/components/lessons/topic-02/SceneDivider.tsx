'use client';

import { motion } from 'framer-motion';

export function SceneDivider({ next }: { next?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-4"
      aria-hidden
    >
      <div className="h-12 w-px bg-gradient-to-b from-transparent via-border-strong to-transparent" />
      {next && (
        <div className="mt-3 text-[10px] font-mono text-fg-dim tracking-widest uppercase">
          {next}
        </div>
      )}
    </motion.div>
  );
}
