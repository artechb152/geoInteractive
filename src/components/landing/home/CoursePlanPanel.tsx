'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { lessons } from '@/lib/lessons';
import { useCourseProgress } from '@/lib/course-progress';

/**
 * CoursePlanPanel — פאנל "תכנית הקורס" (design/mockup.png, פס תחתון-שמאלי).
 * קרוסלה אמיתית על כל 12 השיעורים: חלון של 5 כרטיסים, החץ בקצה השמאלי
 * (inline-end) מתקדם עמוק יותר ברשימה (RTL), חץ חזרה מופיע בקצה הימני.
 * כל כרטיס הוא קישור ל-/lessons/topic-XX/; הכרטיס הפעיל (כתום) נגזר
 * מה-last-visit, ברירת מחדל 01 כמו במוקאפ. "צפייה בכל השיעורים" פורש
 * את כל ה-12 ברשת בתוך הפאנל.
 * טקסטים לשיעורים 01–05 נשמרים כפי שאושרו במוקאפ ("ניווטים",
 * "מורפולוגיית" — לא שגיאות ה-AI שבתמונה).
 */

type LessonItem = {
  id: string;
  num: string;
  img: string;
  title: string;
  sub?: string;
};

/** תצוגת 01–05 — מחרוזות מדויקות כפי שאושרו במוקאפ */
const MOCKUP_FIVE: LessonItem[] = [
  {
    id: 'topic-01',
    num: '01',
    img: '/assets/isometric/lesson-01-strategy-terrain.png',
    title: 'מבוא',
    sub: 'מרחב, כוח, אסטרטגיה',
  },
  {
    id: 'topic-02',
    num: '02',
    img: '/assets/isometric/lesson-02-map-reading.png',
    title: 'קרטוגרפיה וקריאת מפות',
  },
  {
    id: 'topic-03',
    num: '03',
    img: '/assets/isometric/lesson-03-navigation.png',
    title: 'ניווטים',
    sub: 'אזימוט ותכנון ציר',
  },
  {
    id: 'topic-04',
    num: '04',
    img: '/assets/isometric/lesson-04-landforms.png',
    title: 'טופוגרפיה\nומורפולוגיית שטח',
  },
  {
    id: 'topic-05',
    num: '05',
    img: '/assets/isometric/lesson-05-mobility.png',
    title: 'ניידות ותמרון',
    sub: 'עבירות, כיסוי, תכסית',
  },
];

/** מיני-דיורמות לשיעורים 06–12 — לפי שמות הקבצים ב-public/assets/isometric */
const ASSET_SLUGS: Record<number, string> = {
  6: 'los',
  7: 'weather',
  8: 'logistics',
  9: 'chokepoints',
  10: 'urban',
  11: 'borders',
  12: 'gis-layers',
};

const ALL_LESSONS: LessonItem[] = [
  ...MOCKUP_FIVE,
  ...lessons.slice(5).map((l) => ({
    id: l.id,
    num: String(l.number).padStart(2, '0'),
    img: `/assets/isometric/lesson-${String(l.number).padStart(2, '0')}-${ASSET_SLUGS[l.number]}.png`,
    title: l.shortTitle,
  })),
];

const WINDOW = 5;
const LAST_PAGE = Math.ceil(ALL_LESSONS.length / WINDOW) - 1;

export function CoursePlanPanel() {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { activeTopicId } = useCourseProgress();

  const visible = expanded
    ? ALL_LESSONS
    : ALL_LESSONS.slice(page * WINDOW, page * WINDOW + WINDOW);

  return (
    <section
      id="syllabus"
      className="relative scroll-mt-6 rounded-3xl bg-paper-panel p-6 shadow-panel-soft"
    >
      {/* כותרת — מיושרת ל-inline-start (ימין); האייקון ימני לטקסט כמו במוקאפ */}
      <div className="flex items-center justify-start gap-2.5 px-2">
        <BookOpen className="size-6 text-olive-ink" strokeWidth={1.8} />
        <span className="text-[22px] font-bold text-olive-ink">תכנית הקורס</span>
      </div>

      {/* קרוסלת שיעורים — הראשון ב-DOM = ימני ויזואלית */}
      <div
        className={cn(
          'mt-4 grid grid-cols-5 gap-3.5 pe-1 ps-8',
          expanded ? 'items-stretch gap-y-4' : 'items-center',
        )}
      >
        {visible.map((l) => (
          <LessonCard key={l.id} lesson={l} active={l.id === activeTopicId} />
        ))}
      </div>

      {/* חיצי קרוסלה — מוסתרים במצב פרוש. ב-RTL החץ השמאלי (inline-end)
          מתקדם עמוק יותר ברשימה; חץ חזרה מופיע בקצה הימני רק כשיש לאן לחזור */}
      {!expanded && (
        <>
          <button
            type="button"
            aria-label="שיעורים נוספים"
            disabled={page >= LAST_PAGE}
            onClick={() => setPage((p) => Math.min(LAST_PAGE, p + 1))}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-olive-muted transition duration-150 ease-snap hover:text-olive-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft disabled:cursor-default disabled:opacity-35 disabled:hover:text-olive-muted"
          >
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </button>
          {page > 0 && (
            <button
              type="button"
              aria-label="שיעורים קודמים"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-olive-muted transition duration-150 ease-snap hover:text-olive-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft"
            >
              <ChevronRight className="size-6" strokeWidth={2.2} />
            </button>
          )}
        </>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((e) => !e);
            setPage(0);
          }}
          className="flex h-10 items-center gap-2 rounded-full border border-tanline bg-paper-bright/70 px-8 text-[15px] font-bold text-olive-ink transition duration-150 ease-snap hover:bg-paper-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft"
        >
          <span>{expanded ? 'הצגה מצומצמת' : 'צפייה בכל השיעורים'}</span>
          <ChevronLeft
            className={cn('size-4 transition-transform duration-150', expanded && '-rotate-90')}
            strokeWidth={2.4}
          />
        </button>
      </div>
    </section>
  );
}

function LessonCard({ lesson, active }: { lesson: LessonItem; active: boolean }) {
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      aria-label={`שיעור ${lesson.num} — ${lesson.title.replace('\n', ' ')}`}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex flex-col items-center rounded-2xl bg-paper-card px-3 text-center shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 hover:shadow-panel-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-panel',
        active ? 'border-2 border-ember-soft bg-paper-bright py-5' : 'py-3',
      )}
    >
      <span
        dir="ltr"
        className={cn(
          'text-2xl font-bold leading-none',
          active ? 'text-ember' : 'text-olive-ink',
        )}
      >
        {lesson.num}
      </span>
      <IsometricAsset
        assetId={`HOME-LESSON-${lesson.num}`}
        src={lesson.img}
        alt=""
        aspect="1/1"
        fit="contain"
        compactPlaceholder
        className="mt-1 w-[86px] bg-transparent mix-blend-multiply [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_50%,transparent_78%)]"
      />
      <h3
        className={cn(
          'mt-1 whitespace-pre-line text-[15px] font-bold leading-snug',
          active ? 'text-ember' : 'text-olive-ink',
        )}
      >
        {lesson.title}
      </h3>
      {lesson.sub && (
        <p className="mt-0.5 text-[13px] leading-snug text-olive-muted">{lesson.sub}</p>
      )}
    </Link>
  );
}
