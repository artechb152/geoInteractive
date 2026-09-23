'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import type { DriveStatus } from './vehicleController';

const STATUS_COPY: Partial<Record<DriveStatus, { text: string; tone: 'warn' | 'danger' }>> = {
  slipping: { text: 'איבוד אחיזה — הגלגלים מחליקים', tone: 'warn' },
  sinking: { text: 'הרכב שוקע בקרקע', tone: 'warn' },
  stuck: { text: 'תקועים! לחצו על "חילוץ" כדי לחזור לנקודת ההתחלה', tone: 'danger' },
  flipped: { text: 'הרכב התהפך! לחצו על "חילוץ" כדי לחזור לנקודת ההתחלה', tone: 'danger' },
};

export function DriveHUD({
  status,
  speedKph,
  onRecover,
  onExit,
}: {
  status: DriveStatus;
  speedKph: number;
  onRecover: () => void;
  onExit: () => void;
}) {
  const copy = STATUS_COPY[status];
  const isBlocked = status === 'stuck' || status === 'flipped';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-4">
      {/* top row: status toast (start) + exit (end) */}
      <div className="flex items-start justify-between gap-2">
        <AnimatePresence mode="wait">
          {copy && (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-center gap-2 rounded-[3px] border-2 px-3 py-2 text-sm font-display font-semibold shadow-elevated backdrop-blur-sm',
                copy.tone === 'warn' && 'border-status-warn/50 bg-status-warn/15 text-status-warn',
                copy.tone === 'danger' && 'border-status-danger/50 bg-status-danger/15 text-status-danger',
              )}
            >
              <Icon name={copy.tone === 'danger' ? 'shield' : 'spark'} size={16} strokeWidth={2.5} />
              {copy.text}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-1.5 rounded-[3px] border-2 border-border bg-bg-elevated/90 px-3 py-2 text-sm font-display font-semibold text-fg-muted shadow-elevated backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-fg"
        >
          <Icon name="x" size={14} strokeWidth={2.5} />
          יציאה
        </button>
      </div>

      {/* bottom row: speed (start) + recover (center-ish) + legend (end) */}
      <div className="flex items-end justify-between gap-2">
        <div className="pointer-events-auto rounded-[3px] border-2 border-border bg-bg-elevated/90 px-3 py-2 text-sm font-display font-semibold text-fg-muted shadow-elevated backdrop-blur-sm tabular-nums">
          {Math.round(speedKph)} קמ״ש
        </div>

        {isBlocked && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onRecover}
            className="pointer-events-auto flex items-center gap-2 rounded-[3px] border-2 border-accent bg-accent px-4 py-2.5 text-sm font-display font-bold text-bg-elevated shadow-cta-ember transition-transform hover:scale-105"
          >
            <Icon name="refresh" size={16} strokeWidth={2.5} />
            חילוץ — חזרה לנקודת ההתחלה
          </motion.button>
        )}

        <div className="pointer-events-auto hidden md:flex items-center gap-1.5 rounded-[3px] border-2 border-border bg-bg-elevated/90 px-3 py-2 text-xs font-display font-medium text-fg-dim shadow-elevated backdrop-blur-sm">
          <Icon name="chevrons-down" size={13} className="-rotate-90" />
          נהיגה: חצים · אחורה: חץ מטה
        </div>
      </div>
    </div>
  );
}
