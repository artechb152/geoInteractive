'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Calculator as CalcIcon, Delete, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CALC_CHARS, evaluate, showNumber } from './calc';

/* מחשבון — so the × 60 / ÷ 60 work is done on the page, not on a phone. Docked in the work area,
   under the number track and its note: the toggle at the row's inline start (visual right, by the
   steps), the calculator opening beside it, inside the card. It covers nothing, and nothing above it
   moves, so the numbers, the active step, its feedback and the answer's field stay in view while it is
   open. In the tab order it follows the track: the answer's field is one Shift+Tab from the toggle,
   two from the calculator's line. It only calculates: which operation to use is still the learner's call. */

// Button secondary · md (components/ui/Button), as a plain <button> for its ref and aria-expanded
const TOGGLE =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 font-display text-[15px] font-semibold text-fg transition-all duration-200 ease-snap select-none active:translate-y-px';
const KEY =
  'h-10 rounded-xl border font-display text-lg font-bold tabular-nums transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const DIGIT = 'border-border bg-bg-elevated text-fg hover:bg-bg-accent/60';
const OPER = 'border-border bg-bg-accent text-fg hover:border-brand/30';

type Key = { k: string; label?: string; aria?: string; cls?: string };
// left to right like the expression itself; four rows so the open calculator stays low
const KEYS: Key[] = [
  { k: '7' }, { k: '8' }, { k: '9' },
  { k: '÷', aria: 'חילוק', cls: OPER },
  { k: 'C', aria: 'ניקוי', cls: OPER },
  { k: '4' }, { k: '5' }, { k: '6' },
  { k: '×', aria: 'כפל', cls: OPER },
  { k: '(', cls: OPER },
  { k: '1' }, { k: '2' }, { k: '3' },
  { k: '−', aria: 'חיסור', cls: OPER },
  { k: ')', cls: OPER },
  { k: '0' },
  { k: '.', aria: 'נקודה עשרונית' },
  { k: '⌫', aria: 'מחיקת התו האחרון', cls: OPER },
  { k: '+', aria: 'חיבור', cls: OPER },
  { k: '=', aria: 'חישוב', cls: 'border-accent bg-accent text-white hover:brightness-105' },
];
const OPERATORS = '+−×÷';

export function Calculator() {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  // the last result; `fresh` while it is still on show, so a digit starts anew and an operator goes on from it
  const [res, setRes] = useState<{ text: string; ok: boolean; fresh: boolean } | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    lineRef.current?.focus({ preventScroll: true });
    // on a short screen, only as far as it takes to show the whole calculator
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const calc = () => {
    if (!expr.trim()) return;
    const v = evaluate(expr);
    setRes(v === null ? { text: 'לא ניתן לחשב: בדקו את התרגיל', ok: false, fresh: false } : { text: showNumber(v), ok: true, fresh: true });
  };

  const press = (k: string) => {
    if (k === '=') return calc();
    if (k === 'C') {
      setExpr('');
      setRes(null);
      return;
    }
    if (k === '⌫') {
      setExpr((e) => e.slice(0, -1));
      setRes(null);
      return;
    }
    if (res?.fresh && res.ok) setExpr(OPERATORS.includes(k) ? `${res.text} ${k} ` : k);
    else setExpr((e) => (OPERATORS.includes(k) ? `${e.trimEnd()} ${k} ` : e + k));
    setRes(null);
  };

  return (
    <div className="mt-3 flex items-start gap-3" data-calc-dock="">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? `${uid}-calc` : undefined}
        data-calc-toggle=""
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(TOGGLE, open ? 'border-accent bg-accent/10' : 'border-border bg-paper-bright/70 hover:bg-paper-bright')}
      >
        {/* open, the toggle is the calculator's close */}
        {open ? <X className="size-4" strokeWidth={2} aria-hidden /> : <CalcIcon className="size-4" strokeWidth={2} aria-hidden />}
        מחשבון
      </button>

      {open && (
        <div
          ref={panelRef}
          id={`${uid}-calc`}
          role="group"
          aria-label="מחשבון"
          data-calc=""
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            close();
          }}
          className="flex min-w-0 flex-1 flex-wrap items-stretch gap-3 rounded-xl border border-border p-3"
        >
          <div
            dir="ltr"
            className="flex min-w-[12rem] flex-1 flex-col justify-between rounded-xl border border-border bg-bg-accent px-3 py-2"
          >
            <input
              ref={lineRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-label="התרגיל"
              data-calc-line=""
              value={expr}
              placeholder="0"
              onChange={(e) => {
                setExpr(e.target.value.replace(CALC_CHARS, '').replace(/[*xX]/g, '×').replace(/[/:]/g, '÷').replace(/-/g, '−'));
                setRes(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== '=') return;
                e.preventDefault();
                calc();
              }}
              className="w-full bg-transparent text-right font-display text-lg font-bold tabular-nums text-fg outline-none placeholder:font-normal placeholder:text-fg-dim"
            />
            <output
              aria-live="polite"
              data-calc-result=""
              className={cn('block min-h-8 text-right font-display font-bold tabular-nums', res?.ok ? 'text-2xl text-black' : 'text-base text-fg-muted')}
            >
              {res && (res.ok ? `= ${res.text}` : <span dir="rtl">{res.text}</span>)}
            </output>
          </div>

          <div dir="ltr" className="grid shrink-0 grid-cols-[repeat(5,3.5rem)] gap-2">
            {KEYS.map(({ k, aria, cls }) => (
              <button key={k} type="button" aria-label={aria} data-calc-key={k} onClick={() => press(k)} className={cn(KEY, cls ?? DIGIT)}>
                {k === '⌫' ? <Delete className="mx-auto size-5" strokeWidth={2} aria-hidden /> : k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
