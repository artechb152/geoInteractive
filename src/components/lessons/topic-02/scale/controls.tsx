'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, formatRatio } from './geo';
import { SHEETS, SHEET_IDS, type SheetId } from './scaleSheets.data';
import { asset } from './layers';

// Text tiers (design/docs/lessons-02-06-ui-cleanup-spec.md §3).
export const T1 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';
export const T1_INTRO = 'mt-2 text-base leading-relaxed text-fg-muted';
export const T3 = 'text-base font-display font-bold text-fg';
export const T5 = 'text-sm font-display font-semibold text-fg-muted';
export const T6 = 'text-sm text-fg-muted leading-snug';
export const INSET = 'rounded-xl bg-bg-accent/60 p-4';

// Option recipe (GeologyScene.tsx): tint on a ::before layer over a solid base.
export const OPTION_BASE =
  'relative isolate rounded-xl border bg-bg-elevated text-start cursor-pointer transition-colors duration-200 ease-snap before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap';
export const OPTION_ACTIVE = 'border-accent before:bg-accent/10';
export const OPTION_IDLE = 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]';
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated';

/** Roving focus for a row of options (copied from GeologyScene's useTabKeys; RTL-aware ←/→). */
export function useRovingKeys<T extends string>(ids: readonly T[], value: T, onSelect: (id: T) => void) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Alt+← / Ctrl+… / ⌘+… belong to the browser and assistive tech (history, word navigation).
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const i = ids.indexOf(value);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let next: number;
    switch (e.key) {
      case 'ArrowLeft':
        next = i + (rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        next = i + (rtl ? -1 : 1);
        break;
      case 'ArrowDown':
        next = i + 1;
        break;
      case 'ArrowUp':
        next = i - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const id = ids[(next + ids.length) % ids.length];
    onSelect(id);
    refs.current.get(id)?.focus();
  };
  const register = (id: T) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };
  return { onKeyDown, register };
}

export type ViewMode = 'map' | 'ortho' | 'compare';
const MODES: { id: ViewMode; label: string }[] = [
  { id: 'map', label: 'מפה טופוגרפית' },
  { id: 'ortho', label: 'תצ״א' },
  { id: 'compare', label: 'השוואה' },
];
const MODE_IDS = MODES.map((m) => m.id);

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const keys = useRovingKeys(MODE_IDS, value, onChange);
  return (
    <div role="radiogroup" aria-label="סוג הייצוג" onKeyDown={keys.onKeyDown} className="inline-flex gap-1 rounded-xl border border-border bg-bg-elevated p-1">
      {MODES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            ref={keys.register(m.id)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(m.id)}
            className={cn(
              'h-9 rounded-lg border px-3.5 text-sm font-display font-bold transition-colors duration-200 ease-snap',
              FOCUS_RING,
              on ? 'border-accent bg-accent/10 text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Scale picker: three sheet thumbnails, each outlining the next more detailed sheet. A radio group (it
 * selects a value; no tabpanel exists); `label` gives each instance on the page its own accessible name.
 */
export function SheetPicker({
  value,
  onChange,
  label = 'קנה מידה',
}: {
  value: SheetId;
  onChange: (id: SheetId) => void;
  label?: string;
}) {
  const keys = useRovingKeys(SHEET_IDS, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown} className="grid grid-cols-3 gap-2">
      {SHEET_IDS.map((id, i) => {
        const s = SHEETS[id];
        const on = id === value;
        const km = formatNumber(s.groundWidthM / 1000, 1);
        const child = i > 0 ? SHEETS[SHEET_IDS[i - 1]] : null;
        const inset = child ? ((1 - child.groundWidthM / s.groundWidthM) / 2) * 100 : 0;
        return (
          <button
            key={id}
            ref={keys.register(id)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex flex-col items-center gap-1.5 p-2.5 text-center')}
          >
            <span className="relative block size-16 overflow-hidden rounded-lg border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of a georeferenced raster */}
              <img src={asset(s.map.src)} alt="" draggable={false} className="size-full" />
              {child && <span aria-hidden className="absolute border-2 border-dashed border-accent" style={{ inset: `${inset}%` }} />}
            </span>
            <span className="font-display text-base font-bold tabular-nums text-fg">{formatRatio(s.denominator)}</span>
            {/* The product is an LTR isolate (a × b never reverses); the unit stays in the RTL run. */}
            <span className="text-[13px] leading-tight text-fg-muted">
              <bdi dir="ltr">{`${km} × ${km}`}</bdi> ק״מ
            </span>
          </button>
        );
      })}
    </div>
  );
}
