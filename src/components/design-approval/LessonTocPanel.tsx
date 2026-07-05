/**
 * LessonTocPanel — סרגל תוכן העניינים של מוקאפ מסך השיעור (design-lock §3.6.1).
 *
 * משדרג את ה-TOC הקיים של PagedLearn לשלושה מצבים (הושלם ✓ / פעיל / עתידי) —
 * הצעה לאישור בלבד; בפרודקשן היום יש רק נקודות כתומות/שחורות (ראו §1.9, §3.11).
 * מצב הדמו נעול לפי design-lock §1.8: שלוש הסצנות הראשונות של topic-03 הושלמו,
 * "תכנון ציר" (הרביעית) פעילה, "התקדמות 4/6".
 * שני ה-exports (דסקטופ ומובייל) חולקים את אותו מקור נתונים — לא להעתיק-להדביק.
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type TocState = 'done' | 'active' | 'future';
type TocItem = { label: string; state: TocState };

const TOC_ITEMS: TocItem[] = [
  { label: 'פתיחה', state: 'done' },
  { label: 'לפני שמתחילים', state: 'done' },
  { label: 'עקרונות הניווט', state: 'done' },
  { label: 'תכנון ציר', state: 'active' },
  { label: 'ניווט קרבי', state: 'future' },
  { label: 'סיכום', state: 'future' },
];

/** נגזר מ-TOC_ITEMS כדי שלא ילכו מחוץ-סנכרון אם מצב הדמו ישתנה. */
const ACTIVE_INDEX = TOC_ITEMS.findIndex((item) => item.state === 'active');
const DONE_COUNT = ACTIVE_INDEX + 1;
const PROGRESS_LABEL = `התקדמות ${DONE_COUNT}/${TOC_ITEMS.length}`;
const PROGRESS_PCT = (DONE_COUNT / TOC_ITEMS.length) * 100;

function TocDot({ state }: { state: TocState }) {
  if (state === 'done') {
    return (
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-dark/15 text-brand-dark"
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />;
  }
  return <span className="size-3 shrink-0 rounded-full border border-border-strong" aria-hidden />;
}

function ProgressTrack() {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[11px] text-fg-dim">{PROGRESS_LABEL}</div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-accent">
        <div className="h-full rounded-full bg-accent" style={{ width: `${PROGRESS_PCT}%` }} />
      </div>
    </div>
  );
}

/** עמודת ה-TOC בדסקטופ (xl+) — יושבת בקצה ה-inline-start (ימין ב-RTL) של גוף הפאנל. */
export function LessonTocPanel({ className }: { className?: string }) {
  return (
    <aside className={cn('flex w-[220px] shrink-0 flex-col gap-3', className)} aria-label="תוכן השיעור">
      <div className="px-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-fg-muted">
        תוכן השיעור
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        {TOC_ITEMS.map((item) => {
          const isActive = item.state === 'active';
          return (
            <div
              key={item.label}
              className={cn(
                'relative flex items-center gap-2 rounded-md px-2 py-1.5 text-end',
                isActive && 'bg-accent/15',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {isActive && (
                <span className="absolute inset-y-0 start-0 w-1 rounded-full bg-accent" aria-hidden />
              )}
              <TocDot state={item.state} />
              <span
                className={cn(
                  'text-[12.5px] leading-snug',
                  isActive ? 'font-semibold text-fg' : item.state === 'done' ? 'text-fg-muted' : 'text-fg-dim',
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-border-subtle px-1.5 pt-3">
        <ProgressTrack />
      </div>
    </aside>
  );
}

/**
 * רצועת גלולות אופקית — מתחת ל-xl (הדפוס הקיים של ScenePagerMobile ב-PagedLearn,
 * משודרג לתלת-מצב). תצוגה בלבד — מצב הדמו נעול, אין ניווט אמיתי במוקאפ.
 */
export function LessonTocMobile({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-label="תוכן השיעור">
      <ul className="flex list-none gap-1.5 overflow-x-auto pb-1">
        {TOC_ITEMS.map((item) => {
          const isActive = item.state === 'active';
          const isDone = item.state === 'done';
          return (
            <li key={item.label}>
              <span
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'border-accent bg-accent font-bold text-bg-elevated'
                    : isDone
                      ? 'border-border bg-bg-accent text-fg-muted'
                      : 'border-border bg-bg-elevated text-fg-dim',
                )}
              >
                {isDone && <Check className="size-3" strokeWidth={3} aria-hidden />}
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="px-0.5">
        <ProgressTrack />
      </div>
    </div>
  );
}
