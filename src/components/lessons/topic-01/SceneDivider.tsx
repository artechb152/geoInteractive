'use client';

import { motion } from 'framer-motion';

export function SceneDivider({ next }: { next?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-6"
      aria-hidden
    >
      <div className="relative h-16 w-px overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/40 to-transparent"
          initial={{ y: '-100%' }}
          whileInView={{ y: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-border-strong/50 to-transparent" />
      </div>
      {next && (
        <div className="mt-4 px-4 py-1.5 rounded-full border border-border-subtle bg-bg-card/50 backdrop-blur text-xs font-mono text-fg-dim tracking-widest uppercase">
          {next}
        </div>
      )}
    </motion.div>
  );
}
