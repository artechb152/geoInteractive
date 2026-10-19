import { cn } from '@/lib/utils';

/**
 * ModelLoading — the one loading indicator of every 3-D model in the lessons
 * (CLAUDE.md, "3D models"): a "טוען …" line over a thin bar, centred on the
 * model's frame. Shown from the moment the model is asked for (the lazy
 * chunk's `loading` too) until its first frame is drawn — never an empty or
 * frozen frame.
 *
 * - The bar always runs the site's loading sheen (animate-asset-sheen, static
 *   under reduced motion), so it never looks stuck — drei counts whole files,
 *   and one big file holds the count at 0 until it lands.
 * - `progress` (0–100): a fill over the sheen, when the loads can be counted
 *   (drei `useProgress` inside the 3-D chunk — pass it only while `active`).
 * - `className` on the overlay: a backdrop that hides a half-built canvas
 *   (e.g. the frame's own bg colour), or a different placement.
 * - `card`: over a still or a picture that stands in for the model, the line
 *   and bar sit on a small card so they read on any image.
 *
 * No three.js here — the wrappers that hold the lazy 3-D chunk can use it.
 */
export function ModelLoading({
  label,
  progress,
  card = false,
  className,
}: {
  label: string;
  progress?: number;
  card?: boolean;
  className?: string;
}) {
  return (
    <div role="status" className={cn('pointer-events-none absolute inset-0 flex flex-col items-center justify-center', className)} data-loading>
      <div className={cn('flex flex-col items-center gap-2', card && 'rounded-lg bg-bg-elevated/90 px-4 py-2.5 shadow-sm')}>
        <div className="font-display text-base font-bold text-black">{label}</div>
        <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-border/60" dir="ltr">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-accent to-transparent motion-safe:animate-asset-sheen" />
          {progress !== undefined && (
            <div className="relative h-full bg-accent motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${Math.round(Math.min(100, Math.max(0, progress)))}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}
