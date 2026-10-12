'use client';

/* One coordinate in "בונים מיקום": its name, its value large (the number itself is
   the accessible number field), a slider with −/+ buttons for the number of
   degrees, the direction as a two-way choice, and where that puts the point in
   words. Magnitude and direction are separate controls on purpose: the activity
   is about telling the number from its direction. The value, slider and choice
   rows are dir="ltr" (numbers grow to the right; W sits west of E). */

import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DirOption<D extends string> = { id: D; name: string };

const STEP_BTN =
  'grid size-9 shrink-0 place-items-center rounded-full border border-border bg-bg-elevated text-fg transition-colors duration-200 ease-snap motion-reduce:transition-none hover:bg-bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function CoordinateControl<D extends string>({
  name,
  mag,
  max,
  dir,
  dirs,
  letter,
  caption,
  onMag,
  onStep,
  onDir,
  compact = false,
}: {
  /** "רוחב" / "אורך" */
  name: string;
  mag: number;
  max: number;
  dir: D;
  /** in map order: N then S (north on the left as on a compass row), W then E */
  dirs: [DirOption<D>, DirOption<D>];
  /** the direction letter shown after the number ('' at 0° and at 180° of longitude) */
  letter: string;
  caption: string;
  onMag: (v: number) => void;
  onStep: (d: number) => void;
  onDir: (d: D) => void;
  /** one row (name · value · direction) over the slider, the caption for screen readers only —
      for the practice panel, where the question and the feedback share the column */
  compact?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [mag]);
  const pct = (mag / max) * 100;
  const valueText = mag === 0 ? `0 מעלות, ${caption}` : `${mag} מעלות, ${caption}`;
  // at 0° the choice is only where the number will grow toward: outlined, not filled
  const pending = mag === 0;

  const commit = (raw: string) => {
    if (raw === '') return setDraft('');
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const v = Math.min(max, Math.max(0, Math.round(n)));
    setDraft(String(v) === raw ? null : raw);
    onMag(v);
  };

  const nameEl = (
    <div id={`${id}-name`} className="text-base font-display font-bold text-black">
      {name}
    </div>
  );
  const valueEl = (
      <div dir="ltr" className={cn('flex items-baseline justify-center font-display font-bold leading-none tabular-nums text-black', compact ? 'text-2xl' : 'mt-1.5 text-4xl')}>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={draft ?? String(mag)}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setDraft(null)}
          aria-label={`${name}: מספר המעלות`}
          aria-describedby={`${id}-caption`}
          style={{ width: `${Math.max(1, (draft ?? String(mag)).length) + 0.08}ch`, textAlign: 'right' }}
          className="rounded-md border-b-2 border-transparent bg-transparent p-0 [appearance:textfield] hover:border-border focus:border-accent focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span aria-hidden>°</span>
        {letter && <span aria-hidden>{letter}</span>}
      </div>
  );
  const sliderEl = (
      <div dir="ltr" className={cn('flex items-center gap-2.5', compact ? 'mt-2' : 'mt-3.5')}>
        <button type="button" className={STEP_BTN} onClick={() => onStep(-1)} disabled={mag <= 0} aria-label={`הקטנת ה${name} במעלה אחת`}>
          <Minus size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <span className="relative block h-9 flex-1">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
          {/* physical left inside this dir="ltr" row (a logical start-0 would also set right: 0 here) */}
          <span aria-hidden className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-dark" style={{ left: 0, width: `calc(11px + ${pct / 100} * (100% - 22px))` }} />
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={mag}
            onChange={(e) => onMag(Number(e.target.value))}
            aria-label={`${name}: מעלות`}
            aria-valuetext={valueText}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none',
              '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:mt-[7px] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-dark [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(40,50,35,0.4)]',
              '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-[22px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-dark',
              '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)] [&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            )}
          />
        </span>
        <button type="button" className={STEP_BTN} onClick={() => onStep(1)} disabled={mag >= max} aria-label={`הגדלת ה${name} במעלה אחת`}>
          <Plus size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
  );
  const dirEl = (
      <div
        dir="ltr"
        role="radiogroup"
        aria-label={`כיוון ה${name}`}
        aria-describedby={`${id}-caption`}
        className={cn('inline-grid shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-border bg-bg-elevated', !compact && 'mt-3.5')}
        onKeyDown={(e) => {
          const k = e.key;
          const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          const i = dirs.findIndex((x) => x.id === dir);
          const next = dirs[(i + d + 2) % 2];
          onDir(next.id);
          (e.currentTarget.querySelector(`[data-dir="${next.id}"]`) as HTMLElement | null)?.focus();
        }}
      >
        {dirs.map((d, i) => {
          const on = d.id === dir;
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${d.name} (${d.id})`}
              tabIndex={on ? 0 : -1}
              data-dir={d.id}
              onClick={() => onDir(d.id)}
              className={cn(
                compact ? 'h-9 w-14' : 'h-9 w-[76px]',
                'font-display text-base font-bold transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                i === 0 && 'border-r border-border', // between the two, in this dir="ltr" row
                on && !pending && 'bg-brand-dark text-bg-elevated',
                on && pending && 'text-brand-dark ring-2 ring-inset ring-brand-dark/70',
                !on && 'text-fg hover:bg-brand/[0.08]',
              )}
            >
              {d.id}
            </button>
          );
        })}
      </div>
  );
  const captionEl = (
    <p id={`${id}-caption`} className={compact ? 'sr-only' : 'mt-2 text-base leading-relaxed text-black'} data-caption>
      {caption}
    </p>
  );

  if (compact)
    return (
      <div role="group" aria-labelledby={`${id}-name`} className="rounded-xl bg-bg-accent/60 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {nameEl}
          {valueEl}
          {dirEl}
        </div>
        {sliderEl}
        {captionEl}
      </div>
    );
  return (
    <div role="group" aria-labelledby={`${id}-name`} className="rounded-xl bg-bg-accent/60 px-4 pb-3.5 pt-4 text-center">
      {nameEl}
      {valueEl}
      {sliderEl}
      {dirEl}
      {captionEl}
    </div>
  );
}
