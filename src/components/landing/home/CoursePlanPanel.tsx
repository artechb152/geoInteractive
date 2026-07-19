'use client';

import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { lessons, lessonDioramaSrc } from '@/lib/lessons';

/**
 * CoursePlanPanel — פאנל "פרקי הקורס" (design/carouselMockUpHomePage.png).
 * מחובר לנתוני הקורס האמיתיים (@/lib/lessons) וכולל גרירה/גלילה אמיתית
 * של השורה, שגולל לנצח (01→12→01…) על ידי שכפול הרשימה פי 3 וקפיצה
 * שקטה בין העותקים. "צפייה בכל השיעורים" פורש (עם אנימציה) רשת של כל
 * 12 השיעורים בתוך הפאנל.
 */

type LessonItem = {
  id: string;
  num: string;
  title: string;
  img: string;
};

/** תוויות מאושרות במוקאפ ל-01–07; 08–12 נופלים חזרה ל-shortTitle */
const APPROVED_TITLES: Record<string, string> = {
  'topic-01': 'מבוא',
  'topic-02': 'קרטוגרפיה קריאת מפות',
  'topic-03': 'ניווטים',
  'topic-04': 'טופוגרפיה\nומורפולוגיית שטח',
  'topic-05': 'ניידות ותמרון',
  'topic-06': 'קווי ראייה',
  'topic-07': 'אקלים ומזג אוויר',
};

/** סדר עולה 01→12 — תחת dir="rtl" הילד הראשון ב-DOM מוצג ימני ביותר */
const ALL_LESSONS: LessonItem[] = lessons.map((l) => ({
  id: l.id,
  num: String(l.number).padStart(2, '0'),
  title: APPROVED_TITLES[l.id] ?? l.shortTitle,
  img: lessonDioramaSrc(l.number),
}));

/** שכפול הרשימה פי 3 כדי לאפשר גלילה אינסופית עם קפיצה בלתי מורגשת בין העותקים */
const LOOP_COPIES = 3;
const LOOPED_LESSONS: (LessonItem & { copyKey: string })[] = Array.from(
  { length: LOOP_COPIES },
  (_, copyIndex) => ALL_LESSONS.map((lesson) => ({ ...lesson, copyKey: `${copyIndex}-${lesson.id}` })),
).flat();

/** מרחק גרירה מינימלי (px) שמעליו קליק בסיום הגרירה נחשב גרירה ולא בחירה בשיעור */
const DRAG_CLICK_THRESHOLD = 4;

export function CoursePlanPanel({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number; pointerId: number; captured: boolean } | null>(
    null,
  );
  const draggedRef = useRef(false);
  const setWidthRef = useRef(0);

  const recalcSetWidth = useCallback(() => {
    const el = rowRef.current;
    if (!el) return 0;
    const width = el.scrollWidth / LOOP_COPIES;
    setWidthRef.current = width;
    return width;
  }, []);

  const wrapIfNeeded = useCallback(() => {
    const el = rowRef.current;
    const w = setWidthRef.current;
    if (!el || !w) return;
    if (el.scrollLeft > -w) {
      el.scrollLeft -= w;
      if (dragRef.current) dragRef.current.scrollLeft -= w;
    } else if (el.scrollLeft < -2 * w) {
      el.scrollLeft += w;
      if (dragRef.current) dragRef.current.scrollLeft += w;
    }
  }, []);

  useEffect(() => {
    if (expanded) return;
    const el = rowRef.current;
    if (!el) return;
    const w = recalcSetWidth();
    el.scrollLeft = -w;
    const onScroll = () => wrapIfNeeded();
    const onResize = () => recalcSetWidth();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [expanded, recalcSetWidth, wrapIfNeeded]);

  const handleRowPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (expanded || e.pointerType !== 'mouse') return;
    const el = rowRef.current;
    if (!el) return;
    draggedRef.current = false;
    // אין תפיסת pointer כאן בכוונה: תפיסה מיידית מסיטה גם את אירוע ה-click
    // מה-Link אל השורה, וקליק רגיל (בלי גרירה) לא היה פותח את השיעור.
    dragRef.current = { x: e.clientX, scrollLeft: el.scrollLeft, pointerId: e.pointerId, captured: false };
  };

  const handleRowPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el || !dragRef.current) return;
    const delta = e.clientX - dragRef.current.x;
    if (!dragRef.current.captured && Math.abs(delta) > DRAG_CLICK_THRESHOLD) {
      draggedRef.current = true;
      dragRef.current.captured = true;
      el.setPointerCapture(dragRef.current.pointerId);
    }
    el.scrollLeft = dragRef.current.scrollLeft - delta;
    wrapIfNeeded();
  };

  const endRowDrag = () => {
    if (dragRef.current?.captured) {
      rowRef.current?.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current = null;
  };

  /** בולם קליק/ניווט בטעות בסיום גרירה עם העכבר */
  const handleRowClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  };

  return (
    <section
      id="syllabus"
      className="relative scroll-mt-6 rounded-[28px] bg-paper-panel p-8 shadow-panel-soft"
    >
      {/* כותרת — מיושרת למרכז, עם קו מפריד קישוטי */}
      <div className="flex flex-col items-center gap-2 px-2 text-center">
        <span className="text-[26px] font-extrabold text-olive-ink">פרקי הקורס</span>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-px w-8 bg-tanline" />
          <span className="size-1.5 rotate-45 bg-ember" />
          <span className="h-px w-8 bg-tanline" />
        </div>
      </div>

      {/* שורת כרטיסים — 01→12 (ימין לשמאל), גלילה אינסופית; גרירה אמיתית בעכבר, גלילת מגע טבעית */}
      <AnimatePresence mode="popLayout" initial={false}>
        {expanded ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'opacity, transform' }}
            className="mt-10 grid grid-cols-6 items-stretch gap-3.5 gap-y-4 pb-2"
          >
            {ALL_LESSONS.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} compact={false} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'opacity' }}
          >
            <div
              ref={rowRef}
              onPointerDown={handleRowPointerDown}
              onPointerMove={handleRowPointerMove}
              onPointerUp={endRowDrag}
              onPointerCancel={endRowDrag}
              onClickCapture={handleRowClickCapture}
              className="mt-10 flex cursor-grab select-none items-start gap-4 overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {LOOPED_LESSONS.map((lesson) => (
                <LessonCard key={lesson.copyKey} lesson={lesson} compact />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* כפתור ghost */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          className="flex h-11 items-center gap-2 rounded-full border border-tanline bg-paper-bright/70 px-8 text-[16px] font-bold text-olive-ink transition duration-150 ease-snap hover:bg-paper-bright active:translate-y-px"
        >
          <span>{expanded ? 'הצגה מצומצמת' : 'צפייה בכל השיעורים'}</span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex"
          >
            <ChevronDown className="size-4" strokeWidth={2.2} />
          </motion.span>
        </button>
      </div>
    </section>
  );
}

function LessonCard({ lesson, compact }: { lesson: LessonItem; compact: boolean }) {
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      aria-label={`שיעור ${lesson.num} — ${lesson.title.replace('\n', ' ')}`}
      draggable={false}
      className={cn(
        'relative flex flex-col items-center rounded-2xl bg-paper-card px-[18px] pb-[28px] pt-[28px] text-center shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-panel',
        compact ? 'shrink-0' : 'w-full',
        compact && 'h-[437px] w-[225px]',
      )}
    >
      <span dir="ltr" className="text-[44px] font-extrabold leading-none text-olive-ink">
        {lesson.num}
      </span>
      <IsometricAsset
        assetId={`HOME-CAROUSEL-LESSON-${lesson.num}`}
        src={lesson.img}
        alt=""
        aspect="1/1"
        fit="contain"
        compactPlaceholder
        eager
        className="mt-[23px] h-[219px] w-full bg-transparent mix-blend-multiply [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_50%,transparent_78%)]"
      />
      <h3 className="mt-[23px] whitespace-pre-line text-[20px] font-bold leading-snug text-olive-ink">
        {lesson.title}
      </h3>
    </Link>
  );
}
