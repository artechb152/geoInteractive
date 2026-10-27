'use client';
/* Controls of the UTM zone atlas, in the lesson's existing vocabulary:
   - choice buttons: the scene's CHOICE / choiceTone (CoordinatesPart2Scene, ReferenceSystemsLinkedComparison)
   - two-way switch: the segmented radio group of datum/DatumGuided.tsx and DatumFieldChallenge.tsx
   - feedback: DatumFieldChallenge's Feedback inset (✓ / ✕ only on a verdict) */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { useRovingKeys } from '../scale/controls';
import { wrapZone } from './utmAtlas';

export const HEADING = 'font-display font-bold leading-tight text-black text-base md:text-lg';
export const LABEL = 'text-base font-display font-bold text-black';
export const BODY = 'text-base leading-relaxed text-black';
export const VALUE = 'font-display text-xl font-bold leading-tight tabular-nums text-black';

export const CHOICE =
  'rounded-xl border cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
export const choiceTone = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]');

const ARROW =
  'grid h-11 w-9 shrink-0 place-items-center rounded-xl border border-border bg-bg-elevated text-fg-muted hover:border-brand/30 hover:text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** The point's zone between two arrows that carry it to the neighbour zone (map order: west on the left, never mirrored). */
export function ZoneStepper({ zone, onStep, reduce }: { zone: number; onStep: (dz: -1 | 1) => void; reduce: boolean }) {
  return (
    <div role="group" aria-label={`פלח ${zone}: מעבר לפלח סמוך`} dir="ltr" className="flex items-center gap-1.5" data-zone-stepper>
      <button type="button" className={ARROW} onClick={() => onStep(-1)} aria-label={`לפלח ${wrapZone(zone - 1)}, מערבה`} data-zone-step={wrapZone(zone - 1)}>
        <Icon name="arrow-left" size={16} />
      </button>
      <span className={cn(VALUE, 'min-w-[3.5rem] rounded-lg bg-bg-accent px-2 py-1.5 text-center')} data-value="zone">
        <Changing value={String(zone)} reduce={reduce}>
          {zone}
        </Changing>
      </span>
      <button type="button" className={ARROW} onClick={() => onStep(1)} aria-label={`לפלח ${wrapZone(zone + 1)}, מזרחה`} data-zone-step={wrapZone(zone + 1)}>
        <Icon name="arrow-right" size={16} />
      </button>
    </div>
  );
}

/** ✓ / ✕ on a checked choice: the verdict of the last check, never a preview. Its parent is `relative`. */
export function VerdictMark({ verdict }: { verdict: 'right' | 'wrong' }) {
  return (
    <span
      aria-hidden
      data-verdict-mark={verdict}
      className={cn(
        'absolute -top-2 -end-2 grid size-5 place-items-center rounded-full',
        verdict === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong bg-bg-elevated text-fg',
      )}
    >
      <Icon name={verdict === 'right' ? 'check' : 'x'} size={11} strokeWidth={3} />
    </span>
  );
}

/** The lesson's two-way segmented radio group. `value` may be null (nothing chosen yet). */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  labelledBy,
  className,
}: {
  items: readonly { id: T; label: ReactNode; aria?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
  labelledBy?: string;
  className?: string;
}) {
  const ids = items.map((x) => x.id);
  const { onKeyDown, register } = useRovingKeys(ids, value ?? ids[0], onChange);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn('grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg-accent p-1', className)}
      onKeyDown={onKeyDown}
    >
      {items.map((x, i) => {
        const on = value === x.id;
        return (
          <button
            key={x.id}
            ref={register(x.id)}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={x.aria}
            tabIndex={on || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(x.id)}
            className={cn(
              'h-9 rounded-lg px-3 font-display text-base font-bold whitespace-nowrap transition-colors duration-200 ease-snap motion-reduce:transition-none cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'bg-brand-dark text-bg-elevated' : 'text-fg hover:bg-brand/[0.08]',
            )}
          >
            {x.label}
          </button>
        );
      })}
    </div>
  );
}

/** One labelled reading in the data rows. */
export function Cell({ label, children, className, id }: { label: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center gap-2 px-4 py-3 text-center', className)}>
      <div id={id} className={LABEL}>
        {label}
      </div>
      {children}
    </div>
  );
}

/** A value that blinks a soft tint when it changes (never when motion is reduced). */
export function Changing({ value, children, reduce, className }: { value: string; children: ReactNode; reduce: boolean; className?: string }) {
  const first = useRef(true);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [value, reduce]);
  return (
    <span
      data-changed={flash || undefined}
      className={cn('rounded-md px-1.5 transition-colors duration-500 ease-snap motion-reduce:transition-none', flash ? 'bg-accent/15' : 'bg-transparent', className)}
    >
      {children}
    </span>
  );
}

/** DatumFieldChallenge's feedback inset: tinted by meaning; ✓ / ✕ glyph only on a verdict. */
export function Feedback({ tone, children, className }: { tone: 'info' | 'wrong' | 'right'; children: ReactNode; className?: string }) {
  return (
    <div data-feedback={tone} className={cn('rounded-xl p-3.5', tone === 'right' ? 'bg-brand/[0.08]' : tone === 'wrong' ? 'bg-bg-accent' : 'bg-bg-accent/60', className)}>
      <div className="flex gap-3">
        {tone !== 'info' && (
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
              tone === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong text-fg',
            )}
          >
            <Icon name={tone === 'right' ? 'check' : 'x'} size={15} strokeWidth={2.5} />
          </span>
        )}
        <div className={cn('min-w-0 flex-1', BODY)}>{children}</div>
      </div>
    </div>
  );
}
