/**
 * HomeMock — גוף מוקאפ הבית של /design-approval/home (design-lock §2.1–§2.2).
 *
 * מבנה: פאנל-מסך "מסך הקורס" ובתוכו —
 *   1. הירו: עמודת טקסט RTL (ימין) + לוח טרֵיין HOME-01 (שמאל, AssetSlot).
 *   2. שורת סטטים (StatsRow) מופרדת ב-border-t.
 *   3. מסילת 12 כרטיסי שיעור (RTL: 01 בימין), נקודות עימוד + חץ "הבא" לוגי (←).
 *
 * הכול סטטי (תואם output: 'export'); רק AssetSlot הוא client. עברית = HTML אמיתי,
 * כותרות שיעור מ-lessons.ts. חריצי נכס חסרים ⇒ MissingAssetPlaceholder (רועש).
 */
import {
  Globe,
  Globe2,
  Map,
  Compass,
  Mountain,
  Route,
  Eye,
  Cloud,
  Truck,
  Building2,
  Milestone,
  Layers,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { lessons } from '@/lib/lessons';
import { MockScreenPanel } from './MockScreenPanel';
import { CompassEmblem } from './motifs';
import { AssetSlot } from './AssetSlot';
import { InertLink } from './InertLink';
import { StatsRow } from './StatsRow';
import { LessonRailCard, type LessonCardState } from './LessonRailCard';
import { LESSON_CARD_SLOTS } from './placeholders';

/* תבניות הכפתורים הקיימות (§3.3) — נעולות, לא ממציאים וריאנט חדש. */
const PRIMARY_CTA =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-colors duration-300';
const GHOST_CTA =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-accent border border-accent/40 hover:border-accent hover:bg-accent/10 transition-colors duration-300';

/* מיפוי אייקון נושאי מ-lesson.hero.icon אל lucide (אין המצאת אייקונים — §1.2 R22). */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  globe: Globe,
  map: Map,
  compass: Compass,
  mountain: Mountain,
  route: Route,
  eye: Eye,
  cloud: Cloud,
  truck: Truck,
  world: Globe2,
  building: Building2,
  border: Milestone,
  layers: Layers,
};

/**
 * מצב הדמו (נעול, §3.5): שיעורים 01–02 הושלמו במלואם, שיעור 03 פעיל ("3/6"),
 * 04–12 עתידיים. totals = מספר הסצנות האמיתי של כל topic (מתוך SCENES).
 */
const ACTIVE_LESSON = 3;
const SCENE_TOTALS: Record<number, number> = {
  1: 6, 2: 7, 3: 6, 4: 6, 5: 7, 6: 6, 7: 6, 8: 6, 9: 6, 10: 6, 11: 6, 12: 6,
};
const SCENES_DONE: Record<number, number> = { 1: 6, 2: 7, 3: 3 };

function cardState(n: number): LessonCardState {
  if (n === ACTIVE_LESSON) return 'active';
  const total = SCENE_TOTALS[n] ?? 0;
  return (SCENES_DONE[n] ?? 0) >= total && total > 0 ? 'completed' : 'future';
}

export function HomeMock() {
  return (
    <MockScreenPanel label="מסך הקורס">
      <div className="flex flex-col gap-10 md:gap-12">
        {/* ── 1. הירו ─────────────────────────────── */}
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* עמודת טקסט — ילד ראשון ⇒ ימין ב-RTL */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-3">
              <CompassEmblem className="size-14 md:size-16" />
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                קורס
              </p>
            </div>
            <h1 className="mt-4 font-display font-bold tracking-tight text-balance text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.05]">
              גיאוגרפיה צבאית
            </h1>
            <p className="mt-3 font-display text-xl font-semibold text-fg-muted md:text-2xl">
              המרחב שמכתיב החלטות
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
              קורס אינטראקטיבי ללימוד קריאת מפה, ניתוח שטח וקבלת החלטות
              גיאוגרפיות־מבצעיות.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <InertLink className={PRIMARY_CTA}>
                המשך לימוד
                <ArrowLeft className="size-4" aria-hidden />
              </InertLink>
              <InertLink className={GHOST_CTA}>התחל מהתחלה</InertLink>
            </div>
          </div>

          {/* לוח טרֵיין ההירו — חריץ HOME-01 (§3.2) */}
          <figure className="relative overflow-hidden rounded-2xl border border-border">
            <AssetSlot
              assetId="HOME-01"
              src="/assets/isometric/home-hero-terrain.png"
              alt="לוח טרֵיין פייפרקאט איזומטרי — הרים, נחל ודגלוני ניווט"
              aspect="16/9"
            />
          </figure>
        </div>

        {/* ── 2. שורת סטטים ───────────────────────── */}
        <div className="border-t border-border-subtle pt-8 md:pt-10">
          <StatsRow />
        </div>

        {/* ── 3. מסילת השיעורים ────────────────────── */}
        <div className="border-t border-border-subtle pt-8 md:pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                מסלול הקורס
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                12 שיעורים ברצף אחד
              </h2>
            </div>
            {/* חץ "הבא" לוגי — מצביע שמאלה ב-RTL (§2.2) */}
            <button
              type="button"
              aria-label="השיעורים הבאים"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-elevated text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          </div>

          {/* מסילה אופקית עם scroll-snap; RTL ⇒ 01 בקצה הימני */}
          <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
            {lessons.map((lesson) => {
              const slot = LESSON_CARD_SLOTS[lesson.number - 1];
              return (
                <li key={lesson.id} className="snap-start">
                  <LessonRailCard
                    number={lesson.number}
                    shortTitle={lesson.shortTitle}
                    Icon={ICON_BY_KEY[lesson.hero.icon] ?? Compass}
                    state={cardState(lesson.number)}
                    done={SCENES_DONE[lesson.number] ?? 0}
                    total={SCENE_TOTALS[lesson.number] ?? 0}
                    assetId={slot.assetId}
                    src={slot.src}
                    alt={slot.alt}
                  />
                </li>
              );
            })}
          </ul>

          {/* נקודות עימוד — פעיל = השיעור הנוכחי (03); הושלם = מרווה (§3.11) */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {lessons.map((lesson) => {
              const state = cardState(lesson.number);
              return (
                <span
                  key={lesson.id}
                  aria-hidden
                  className={
                    state === 'active'
                      ? 'h-1.5 w-4 rounded-full bg-accent'
                      : state === 'completed'
                        ? 'size-1.5 rounded-full bg-brand'
                        : 'size-1.5 rounded-full bg-border-strong'
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </MockScreenPanel>
  );
}
