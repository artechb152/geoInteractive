'use client';
import { cn } from '@/lib/utils';

/**
 * The turnable stages' two quiet controls (the landscape and the ellipsoid):
 * "מבט התחלתי" back to the opening view — the view only, never the task — in
 * the datum block's "החזרת המבט" style, and the drag hint across from it.
 */
export function StageControls({ atStart, onReset, hint }: { atStart: boolean; onReset: () => void; hint: string }) {
  return (
    <>
      <button
        type="button"
        onClick={onReset}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'absolute bottom-1 start-1 h-9 rounded-xl border border-border bg-bg-elevated/95 px-3 font-display text-sm font-semibold text-fg-muted transition-colors hover:border-brand/30 hover:text-fg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          atStart && 'opacity-70',
        )}
      >
        מבט התחלתי
      </button>
      <span aria-hidden className="pointer-events-none absolute bottom-2 end-1 rounded bg-paper-card/85 px-1.5 text-[13px] font-medium text-fg-muted">
        {hint}
      </span>
    </>
  );
}
