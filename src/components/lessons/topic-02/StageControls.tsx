'use client';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * The view controls beside the figures' captions (the landscape, the ellipsoid
 * and the enlargement), in the tabs' own button style, one size smaller. A
 * button that stands for a state is pressed while it is on — marked by the
 * station buttons' selected ring and a check, not by colour alone; one whose
 * label names the next action ("חשיפת משטחי הייחוס" ↔ "החזרת פני השטח") is a
 * plain action. "מבט התחלתי" goes back to the view's opening angle — the view
 * only, never the task — and rests quieter once the view is there.
 */
export function ViewButton({
  pressed,
  onClick,
  buttonRef,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  /** For a button that moves within its caption when its state flips (focus follows it there). */
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-xl border px-3 font-display text-sm font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        pressed ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
      )}
    >
      {pressed && <Icon name="check" size={14} strokeWidth={3} className="-ms-0.5 text-accent" />}
      {children}
    </button>
  );
}

export function ResetViewButton({ atStart, onReset }: { atStart: boolean; onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className={cn(
        'h-8 rounded-xl border border-border bg-bg-elevated px-3 font-display text-sm font-semibold text-fg-muted cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none hover:border-brand/30 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        atStart && 'opacity-70',
      )}
    >
      מבט התחלתי
    </button>
  );
}

/**
 * What to do now, said right beside the control that does it: one short line at the caption's start, an
 * orange arrow pointing on to the control(s) that follow it (RTL: to their left). Each view has one, and it
 * changes with the step (the geoid view: reveal first, then pick a station).
 */
export function ActionLine({ text, children }: { text: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2" data-action-line>
      <p className="flex items-center gap-1.5 whitespace-nowrap text-base font-display font-bold text-black" aria-live="polite">
        {text}
        <Icon name="arrow-left" size={16} strokeWidth={2.5} className="text-accent" />
      </p>
      {children}
    </div>
  );
}
