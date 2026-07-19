/**
 * StatsRow — שורת 4 הסטטים של מוקאפ הבית (design-lock §3.4).
 *
 * ערכים דינמיים מ-src/lib/lessons.ts (קריאה בלבד):
 *   - lessons.length            → "12" / "שיעורים"
 *   - totalDuration / 60         → "כ־8.5" / "שעות לימוד"  (עיגול לחצי שעה, לא Math.round)
 *   - מספר רמות הקושי הייחודיות  → "3" / "רמות קושי"
 *   - קבוע                       → "GEOINT" / "דגש מבצעי"
 *
 * הרפרנס מציג "מתקדם / רמת קושי" ו"יכולת מבצעית / הדגש" — הוחלף בערכי אמת (§1.9):
 * הקורס מתחיל ב-foundation, לכן "מתקדם" אינו מדויק.
 */
import { BookOpen, Clock, Layers, Crosshair } from 'lucide-react';
import { lessons, totalDuration } from '@/lib/lessons';

/** עיגול לחצי שעה הקרובה — 510 דק' → 8.5 (Math.round היה מעגל ל-9). */
function toHoursLabel(minutes: number): string {
  const halves = Math.round(minutes / 30); // מספר חצאי-שעות
  const hours = halves / 2;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `כ־${text}`;
}

type Stat = {
  Icon: typeof BookOpen;
  value: string;
  label: string;
  /** ערכים מספריים גרידא — מונו לקריאה טכנית. */
  mono?: boolean;
};

const difficultyLevels = new Set(lessons.map((l) => l.difficulty)).size;

const STATS: Stat[] = [
  { Icon: BookOpen, value: String(lessons.length), label: 'שיעורים', mono: true },
  { Icon: Clock, value: toHoursLabel(totalDuration), label: 'שעות לימוד', mono: true },
  { Icon: Layers, value: String(difficultyLevels), label: 'רמות קושי', mono: true },
  { Icon: Crosshair, value: 'GEOINT', label: 'דגש מבצעי' },
];

export function StatsRow() {
  return (
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {STATS.map(({ Icon, value, label, mono }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border-subtle bg-bg px-3 py-5 text-center"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <dd
            className={`font-display text-2xl font-bold leading-none text-fg md:text-3xl ${
              mono ? 'font-mono' : ''
            }`}
          >
            {value}
          </dd>
          <dt className="text-xs text-fg-dim">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
