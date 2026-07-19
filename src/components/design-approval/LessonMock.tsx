/**
 * LessonMock — הרכבת מוקאפ מסך השיעור (design-lock §2.3): topic-03 "ניווטים",
 * סצנת "תכנון ציר" (step 03.2). מרכיב את כל רכיבי §3.6–§3.8 בפריסה אחת.
 *
 * רצועת הלשוניות (לימוד/תרגול/בדיקת ידע) מוצגת סטטית מעל הפאנל — הלשונית
 * הפעילה "לימוד" נשארת בקו-תחתון brand-dark ירוק, כמו LessonShell.tsx בפרודקשן
 * (§2.3: "לא לתקן לכתום"). אין החלפת לשונית אמיתית במוקאפ — מצב דמו נעול.
 */
import { BookOpen, Crosshair, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompassEmblem } from './motifs';
import { LessonContentBoard } from './LessonContentBoard';
import { LessonTocMobile, LessonTocPanel } from './LessonTocPanel';
import { MapBoardMock } from './MapBoardMock';
import { MockScreenPanel } from './MockScreenPanel';
import { TacticalInfoCard } from './TacticalInfoCard';

const GHOST_NAV_CLASS =
  'inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] border border-accent/40 text-accent hover:border-accent hover:bg-accent/10 transition-colors duration-300';

const PRIMARY_NAV_CLASS =
  'inline-flex items-center justify-center px-4 py-2.5 rounded-md font-medium text-sm md:text-[15px] bg-accent text-bg-elevated hover:bg-accent-hover transition-colors duration-300';

const TABS = [
  { key: 'learn', label: 'לימוד', Icon: BookOpen },
  { key: 'practice', label: 'תרגול', Icon: Crosshair },
  { key: 'check', label: 'בדיקת ידע', Icon: ListChecks },
] as const;

function LessonTabsStrip() {
  return (
    <nav className="flex gap-1 px-1" aria-label="חלקי השיעור (מוקאפ לתצוגה בלבד)">
      {TABS.map(({ key, label, Icon }) => {
        const active = key === 'learn';
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? 'true' : undefined}
            aria-disabled={active ? undefined : 'true'}
            className={cn(
              'relative inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
              active ? 'text-brand-dark' : 'text-fg-muted',
            )}
          >
            <Icon className={cn('size-4', active ? 'text-brand-dark' : 'text-fg-dim')} aria-hidden />
            <span>{label}</span>
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-dark" aria-hidden />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function LessonMock() {
  return (
    <div className="flex flex-col gap-4">
      <LessonTabsStrip />

      <MockScreenPanel label="מסך השיעור">
        <div className="flex flex-col gap-8">
          {/* כותרת-על: ימין = מצפן + eyebrow + כותרת · שמאל = "הקודם" */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CompassEmblem className="size-9" />
              <div>
                <p className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-accent">
                  שיעור 03
                </p>
                <h1 className="font-display text-xl font-bold leading-tight text-balance sm:text-2xl">
                  ניווטים: התמצאות, אזימוט ותכנון ציר
                </h1>
              </div>
            </div>
            <button type="button" aria-disabled="true" className={cn(GHOST_NAV_CLASS, 'self-start sm:self-auto')}>
              <span className="max-w-[16rem] truncate">הקודם · עקרונות הניווט</span>
            </button>
          </div>

          {/* TOC — רצועת גלולות במובייל, מוסתרת מ-xl ומעלה */}
          <LessonTocMobile className="xl:hidden" />

          {/* גוף הפאנל: TOC ימין (desktop) ← תוכן שמאל */}
          <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
            <LessonTocPanel className="hidden xl:flex" />

            <div className="flex min-w-0 flex-col gap-6">
              <LessonContentBoard />

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <MapBoardMock />
                <TacticalInfoCard />
              </div>
            </div>
          </div>

          {/* ניווט תחתון — "הקודם" ימין, "הבא" שמאל */}
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" aria-disabled="true" className={GHOST_NAV_CLASS}>
              <span className="max-w-[18rem] truncate">הקודם · עקרונות הניווט</span>
            </button>
            <button type="button" aria-disabled="true" className={PRIMARY_NAV_CLASS}>
              <span className="max-w-[20rem] truncate">הבא · ניווט קרבי</span>
            </button>
          </div>
        </div>
      </MockScreenPanel>
    </div>
  );
}
