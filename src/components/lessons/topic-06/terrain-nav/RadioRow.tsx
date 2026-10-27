'use client';

import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * A labelled radio group (roving tab stop; arrow keys move and select) — the
 * choice control of lesson 6's navigation activities. `stacked` lays sentence
 * answers out one per row, full width.
 *
 * The selection is neutral — a thicker orange border, a tint and bold, never a
 * ✓: whether a choice is right is said only by the feedback after a check. The
 * keyboard focus ring stands off the border (ring offset), so a focused option
 * never looks chosen.
 */
export function RadioRow<T extends string | number>({
  labelledBy,
  options,
  value,
  onChange,
  disabled,
  stacked,
  className,
  data,
}: {
  labelledBy: string;
  options: readonly { id: T; label: string; aria?: string }[];
  value: T | null;
  onChange: (id: T) => void;
  disabled?: boolean;
  stacked?: boolean;
  className?: string;
  data?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIdx = Math.max(0, options.findIndex((o) => o.id === value));
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = -1;
    // RTL: the next option sits to the left (or below, when stacked).
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = (i + 1) % options.length;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = (i + options.length - 1) % options.length;
    if (n < 0) return;
    e.preventDefault();
    if (!disabled) onChange(options[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-disabled={disabled} className={cn(stacked ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2', className)} data-radio={data}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === focusIdx ? 0 : -1}
            onClick={() => !disabled && onChange(o.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative flex cursor-pointer items-center rounded-xl font-display text-base text-black transition-colors duration-200 ease-snap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              stacked ? 'min-h-10 w-full justify-start px-3.5 py-2 text-start leading-snug' : 'h-10 min-w-12 justify-center whitespace-nowrap px-3.5 leading-none',
              on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-fg-dim/60 bg-bg-elevated font-semibold hover:border-accent/60 hover:bg-accent/[0.04]',
              disabled && !on && 'cursor-not-allowed opacity-60',
            )}
            data-option={o.id}
            aria-label={o.aria}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
