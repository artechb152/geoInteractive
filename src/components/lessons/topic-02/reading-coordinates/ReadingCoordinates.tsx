'use client';
import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { useRovingKeys } from '../scale/controls';
import { BODY, CHOICE, Feedback, HEADING, LABEL, VALUE, choiceTone } from '../utm-atlas/atlasControls';
import {
  DONE_TEXT, GEO, GEO_TOKENS, QUESTIONS, REFERENCE, UTM, UTM_TOKENS, canReveal, checkReducer, closed, initialCheck, solution,
  type Excerpt, type KeyRow, type PartId, type Question, type Token,
} from './readingModel';

/* ─────────── כיצד מפרשים קואורדינטות? ───────────
   One screen of קואורדינטות 2, after the reference-systems map: the bridge's reading (point A there)
   taken apart in the geographic system and in UTM, the datum and the reference system in one short
   note, then a three-question check. One white card (title, examples, note, check).

   The link between a part of the reading and its explanation is drawn three ways: each key row opens
   with the exact glyphs it explains; pointing at, focusing or pressing a row marks those glyphs in the
   written reading (the rest fades); the datum chip of the note marks WGS84 in both examples.
   The readings are dir="ltr" and never mirrored; their gaps are physical margins (the RTL plugin's
   logical utilities misbehave inside a nested LTR box). Copy and logic: ./readingModel.ts. */

// the activity's heading and lead, at the top of its own card (CoordinatesPart2Scene CARD_H3 / CARD_LEAD)
const CARD_H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
const CARD_LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl';
/** A written run of a reading, in the key or in the note: the reading's own type at chip size. */
const CHIP = 'inline-flex items-center rounded-md border px-2 py-0.5 font-display text-lg font-bold leading-snug tabular-nums text-black whitespace-nowrap';

/** Copy with [[…]] runs: each run in its own LTR isolate. */
function Rich({ c }: { c: string }) {
  return <>{c.split(/\[\[(.*?)\]\]/).map((part, i) => (i % 2 ? <L key={i}>{part}</L> : part))}</>;
}

type Mark = {
  active: PartId | null;
  pinned: PartId | null;
  hover: (p: PartId | null) => void;
  pin: (p: PartId) => void;
};

export function ReadingCoordinates() {
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [pinned, setPinned] = useState<PartId | null>(null);
  const mark: Mark = {
    active: hovered ?? pinned,
    pinned,
    hover: setHovered,
    pin: (p) => setPinned((x) => (x === p ? null : p)),
  };
  return (
    <div className="my-10" data-screen="reading-coordinates">
      <div className="surface-elevated p-6 lg:p-8" data-reading-card>
        <h3 className={CARD_H3}>כיצד מפרשים קואורדינטות?</h3>
        <p className={CARD_LEAD}>
          כך נכתב מיקום הגשר מהמפה שלמעלה בשתי המערכות. בחרו רכיב כדי לסמן אותו בדוגמה.
        </p>

        {/* geographic at inline start (right), UTM at inline end — the maps' order on the screen before */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
          <Example
            id="geo"
            title={GEO.title}
            system="גיאוגרפית"
            tokens={GEO_TOKENS}
            note={GEO.orderNote}
            rows={GEO.rows}
            mark={mark}
            className="lg:pe-8"
          />
          <Example
            id="utm"
            title={UTM.title}
            system="UTM"
            tokens={UTM_TOKENS}
            note={UTM.orderNote}
            rows={UTM.rows}
            mark={mark}
            className="lg:border-s lg:border-border/60 lg:ps-8"
          />
        </div>

        <ReferenceNote mark={mark} />
        <Check />
      </div>
    </div>
  );
}

/* ── one decomposed example ──────────────────────────────────────────────── */

function Example<P extends PartId>({
  id,
  title,
  system,
  tokens,
  note,
  rows,
  mark,
  className,
}: {
  id: 'geo' | 'utm';
  title: string;
  system: string;
  tokens: Token[];
  note: string;
  rows: KeyRow<P>[];
  mark: Mark;
  className?: string;
}) {
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-t`} className={cn('min-w-0', className)} data-example={id}>
      <h4 id={`${uid}-t`} className={HEADING}>
        {title}
      </h4>

      <figure className="mt-3 rounded-xl border border-border/70 bg-bg-accent/60 px-5 pb-4 pt-3" data-specimen={id}>
        <figcaption className={cn(BODY, 'flex flex-wrap items-center gap-x-2')}>
          מערכת ייחוס:
          <span
            className={cn(
              'rounded-md px-1 font-display font-bold transition-[background-color,opacity] duration-200 ease-snap motion-reduce:transition-none',
              mark.active === 'datum' ? 'bg-accent/15 underline decoration-accent decoration-2 underline-offset-[5px]' : mark.active && 'opacity-40',
            )}
            data-glyph-part="datum"
          >
            <L>{REFERENCE.datum}</L>
          </span>
          <span aria-hidden>·</span>
          <span className="font-display font-bold">{system === 'UTM' ? <L>UTM</L> : system}</span>
        </figcaption>
        <Reading tokens={tokens} active={mark.active} />
      </figure>

      <p className={cn(BODY, 'mt-3 text-pretty')} data-order-note>
        {note}
      </p>

      <ul className="mt-3 space-y-0.5" aria-label={`רכיבי הקריאה: ${title}`}>
        {rows.map((r) => (
          <li key={r.id}>
            <KeyButton row={r} mark={mark} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The written reading, glyph runs as written. A marked part is tinted and underlined; the rest fades. */
function Reading({ tokens, active }: { tokens: Token[]; active: PartId | null }) {
  // read as one value by assistive tech (the glyph runs are hidden); the key below explains it part by part
  const label = tokens.map((t) => (t.gap ? ` ${t.text}` : t.text)).join('');
  return (
    <p dir="ltr" className={cn(VALUE, 'mt-2 text-center text-2xl leading-normal whitespace-nowrap')} data-reading>
      <span className="sr-only">{label}</span>
      {tokens.map((t, i) => {
        const on = active !== null && t.parts.includes(active);
        return (
          <span
            key={i}
            aria-hidden
            style={t.gap ? { marginLeft: '0.45em' } : undefined}
            className={cn(
              'rounded-[4px] transition-[background-color,opacity] duration-200 ease-snap motion-reduce:transition-none',
              on && 'bg-accent/15 underline decoration-accent decoration-2 underline-offset-[6px]',
              active !== null && !on && 'opacity-40',
            )}
            data-glyph-part={t.parts.join(' ') || undefined}
            data-on={on || undefined}
          >
            {t.text}
          </span>
        );
      })}
    </p>
  );
}

/** One key row: the glyphs it explains, its name and its meaning. Points at its glyphs on hover and
    focus; a press keeps them marked until it is pressed again (or another row is). */
function KeyButton<P extends PartId>({ row, mark }: { row: KeyRow<P>; mark: Mark }) {
  const on = mark.active === row.id;
  return (
    <button
      type="button"
      aria-pressed={mark.pinned === row.id}
      onClick={() => mark.pin(row.id)}
      onMouseEnter={() => mark.hover(row.id)}
      onMouseLeave={() => mark.hover(null)}
      onFocus={() => mark.hover(row.id)}
      onBlur={() => mark.hover(null)}
      className={cn(
        'grid w-full grid-cols-[11rem_minmax(0,1fr)] items-start gap-4 rounded-lg px-3 py-1.5 text-start cursor-pointer',
        'transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        on ? 'bg-accent/10' : 'hover:bg-brand/[0.04]',
      )}
      data-key={row.id}
      data-on={on || undefined}
    >
      <ExcerptChips excerpt={row.excerpt} on={on} />
      <span className="min-w-0">
        <span className={cn(LABEL, 'block')}>
          <Rich c={row.name} />
        </span>
        <span className={cn(BODY, 'block text-pretty')}>
          <Rich c={row.body} />
        </span>
      </span>
    </button>
  );
}

function ExcerptChips({ excerpt, on }: { excerpt: Excerpt; on: boolean }) {
  const tone = on ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated';
  if ('implied' in excerpt)
    return (
      <span className="flex flex-wrap gap-1.5 pt-0.5" aria-hidden>
        {/* a sign the reading does not write: dashed, in the muted ink */}
        <span className={cn(CHIP, 'border-dashed text-fg-muted', on ? 'border-accent bg-bg-elevated' : 'border-border-strong bg-transparent')}>{excerpt.implied}</span>
      </span>
    );
  return (
    <span dir="ltr" className="flex flex-wrap justify-end gap-1.5 pt-0.5" aria-hidden>
      {excerpt.runs.map((r) => (
        <span key={r} className={cn(CHIP, tone)}>
          {r}
        </span>
      ))}
    </span>
  );
}

/* ── the datum and the reference system ─────────────────────────────────── */

function ReferenceNote({ mark }: { mark: Mark }) {
  const on = mark.active === 'datum';
  return (
    <div className="mt-5 rounded-xl bg-bg-accent/60 p-4 lg:px-5" data-reference-note>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className={HEADING}>{REFERENCE.heading}</h4>
        <button
          type="button"
          aria-pressed={mark.pinned === 'datum'}
          aria-label={`סימון הדאטום ${REFERENCE.datum} בשתי הדוגמאות`}
          onClick={() => mark.pin('datum')}
          onMouseEnter={() => mark.hover('datum')}
          onMouseLeave={() => mark.hover(null)}
          onFocus={() => mark.hover('datum')}
          onBlur={() => mark.hover(null)}
          className={cn(
            CHIP,
            'cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30',
          )}
          data-key="datum"
          data-on={on || undefined}
        >
          <span dir="ltr">{REFERENCE.datum}</span>
        </button>
      </div>
      <p className={cn(BODY, 'mt-2 text-pretty')}>
        <Rich c={REFERENCE.body} />
      </p>
    </div>
  );
}

/* ── the check ───────────────────────────────────────────────────────────── */

function Check() {
  const [s, dispatch] = useReducer(checkReducer, initialCheck);
  const uid = useId();
  const q = QUESTIONS[s.index];
  const isClosed = closed(s);
  const rootRef = useRef<HTMLElement>(null);
  const focusNext = useRef<'next' | 'option' | 'restart' | null>(null);

  // a short verdict for screen readers; the explanation stays readable text, not a live region
  const [status, setStatus] = useState('');
  useEffect(() => {
    const text = s.done ? 'סיימתם את הבדיקה.' : s.revealed ? 'הפתרון מוצג.' : s.verdict ? (s.verdict.right ? 'נכון.' : 'לא נכון. ההסבר מופיע מתחת לתשובות.') : '';
    setStatus((x) => (x === text && text ? `${text}​` : text));
  }, [s.verdict, s.revealed, s.done]);

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-focus="${target}"]`);
    el?.focus();
  });

  const act = (a: Parameters<typeof dispatch>[0], focus?: typeof focusNext.current) => {
    if (focus) focusNext.current = focus;
    dispatch(a);
  };

  const verdictOf = (id: string): 'right' | 'wrong' | null => {
    const picked = s.pick.includes(id);
    const opt = q.options.find((o) => o.id === id)!;
    if (s.revealed) return opt.right ? 'right' : null;
    if (!s.verdict || !picked) return null;
    // after a wrong check only the wrong picks are marked: the explanations below say why
    if (s.verdict.right) return 'right';
    return opt.right ? null : 'wrong';
  };

  return (
    <section ref={rootRef} aria-labelledby={`${uid}-h`} className="mt-6 border-t border-border/60 pt-5" data-check={s.done ? 'done' : q.id}>
      <p role="status" className="sr-only" data-verdict>
        {status}
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 id={`${uid}-h`} className={HEADING}>
          בדיקת הבנה
        </h4>
        {!s.done && (
          <p className="font-display text-base font-semibold text-fg-muted" data-progress>
            שאלה <L>{s.index + 1}</L> מתוך <L>{QUESTIONS.length}</L>
          </p>
        )}
      </div>

      {s.done ? (
        <div className="mt-3 space-y-3">
          <Feedback tone="right">
            <p>
              <Rich c={DONE_TEXT} />
            </p>
          </Feedback>
          <Button variant="secondary" size="md" onClick={() => act({ type: 'restart' }, 'option')} data-focus="restart">
            בדיקה מחדש
          </Button>
        </div>
      ) : (
        <div className="mt-2 grid gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <p id={`${uid}-q`} className={cn(BODY, 'font-semibold text-pretty')}>
              <Rich c={q.ask} />
              {q.hint && <> {q.hint}</>}
            </p>
            <Options key={q.id} q={q} pick={s.pick} locked={isClosed} verdictOf={verdictOf} labelledBy={`${uid}-q`} onPick={(id) => act({ type: 'pick', id })} />
            <div className="flex flex-wrap items-center gap-3">
              {isClosed ? (
                <Button variant="primary" size="md" className="min-w-[12rem]" onClick={() => act({ type: 'next' }, s.index + 1 < QUESTIONS.length ? 'option' : 'restart')} data-focus="next" data-action="next">
                  {s.index + 1 < QUESTIONS.length ? 'לשאלה הבאה' : 'לסיום הבדיקה'}
                  <Icon name="arrow-left" size={16} strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="min-w-[12rem]"
                  disabled={s.pick.length === 0}
                  onClick={() => act({ type: 'check' })}
                  data-action="check"
                >
                  בדיקת התשובה
                </Button>
              )}
              {canReveal(s) && (
                <Button variant="secondary" size="md" onClick={() => act({ type: 'reveal' }, 'next')} data-action="reveal">
                  הצגת הפתרון
                </Button>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <CheckFeedback q={q} s={s} />
          </div>
        </div>
      )}
    </section>
  );
}

function Options({
  q,
  pick,
  locked,
  verdictOf,
  labelledBy,
  onPick,
}: {
  q: Question;
  pick: string[];
  locked: boolean;
  verdictOf: (id: string) => 'right' | 'wrong' | null;
  labelledBy: string;
  onPick: (id: string) => void;
}) {
  const ids = q.options.map((o) => o.id);
  const one = q.kind === 'one';
  const { onKeyDown, register } = useRovingKeys(ids, pick[0] ?? ids[0], (id) => !locked && onPick(id));
  return (
    <div
      role={one ? 'radiogroup' : 'group'}
      aria-labelledby={labelledBy}
      className={cn('grid gap-2', one ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3')}
      onKeyDown={one ? onKeyDown : undefined}
      data-options={q.kind}
    >
      {q.options.map((o, i) => {
        const on = pick.includes(o.id);
        const v = verdictOf(o.id);
        return (
          <button
            key={o.id}
            ref={one ? register(o.id) : undefined}
            type="button"
            role={one ? 'radio' : 'checkbox'}
            aria-checked={on}
            aria-disabled={locked || undefined}
            tabIndex={one ? (on || (pick.length === 0 && i === 0) ? 0 : -1) : 0}
            onClick={() => !locked && onPick(o.id)}
            className={cn(
              CHOICE,
              choiceTone(on),
              'relative flex min-h-11 items-center gap-3 px-4 py-2 text-start',
              locked && 'cursor-default hover:border-border hover:bg-bg-elevated',
              locked && on && 'hover:border-accent hover:bg-accent/10',
            )}
            data-option={o.id}
            data-verdict={v || undefined}
            data-focus={i === 0 ? 'option' : undefined}
          >
            {/* the box / dot says "one" or "many" before any text does */}
            <span
              aria-hidden
              className={cn(
                'grid size-5 shrink-0 place-items-center border-2 transition-colors duration-200 motion-reduce:transition-none',
                one ? 'rounded-full' : 'rounded-[5px]',
                on ? 'border-accent bg-accent text-white' : 'border-border-strong bg-bg-elevated',
              )}
            >
              {on && (one ? <span className="size-2 rounded-full bg-white" /> : <Icon name="check" size={12} strokeWidth={3} />)}
            </span>
            <span className={cn(BODY, 'min-w-0 flex-1')}>
              <Rich c={o.label} />
            </span>
            {v && (
              <span
                aria-hidden
                className={cn('grid size-6 shrink-0 place-items-center rounded-full', v === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong bg-bg-elevated text-fg')}
              >
                <Icon name={v === 'right' ? 'check' : 'x'} size={13} strokeWidth={3} />
              </span>
            )}
            {v && <span className="sr-only">{v === 'right' ? '(נכון)' : '(לא נכון)'}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CheckFeedback({ q, s }: { q: Question; s: ReturnType<typeof checkReducer> }) {
  if (s.revealed)
    return (
      <Feedback tone="info">
        <p className={LABEL}>הפתרון</p>
        <p>
          <Rich c={q.explain} />
        </p>
      </Feedback>
    );
  if (!s.verdict)
    // before a verdict: how the check works (an explanation first, the solution only after it)
    return (
      <Feedback tone="info">
        <p>{s.tries ? 'בדקו את הבחירה החדשה, או הציגו את הפתרון.' : 'בחרו תשובה ובדקו אותה. תשובה שגויה תקבל כאן הסבר, ואחריו אפשר יהיה להציג את הפתרון.'}</p>
      </Feedback>
    );
  if (s.verdict.right)
    return (
      <Feedback tone="right">
        <p>
          נכון. <Rich c={q.explain} />
        </p>
      </Feedback>
    );
  return (
    <Feedback tone="wrong">
      <ul className="space-y-1.5">
        {s.verdict.notes.map((n) => (
          <li key={n}>
            <Rich c={n} />
          </li>
        ))}
      </ul>
      <p className="mt-1.5">{solution(q).length > 1 ? 'שנו את הבחירה ונסו שוב, או הציגו את הפתרון.' : 'בחרו תשובה אחרת ונסו שוב, או הציגו את הפתרון.'}</p>
    </Feedback>
  );
}
