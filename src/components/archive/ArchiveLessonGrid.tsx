'use client';

import Link from 'next/link';
import { archivedLessons, getLesson } from '@/lib/lessons';
import { archivedScenes } from '@/lib/lesson-scenes';
import {
  LESSON_GRID_CLASS,
  LessonCard,
  LessonGridTitle,
  toLessonItem,
} from '@/components/landing/home/CoursePlanPanel';

const ARCHIVED_ITEMS = archivedLessons.map(toLessonItem);

const ARCHIVED_SCENE_ITEMS = archivedScenes.map((s) => ({ ...s, lesson: getLesson(s.topicId) }));

/**
 * רשימת הארכיון — אותו פאנל, כותרת, רשת וכרטיס של "פרקי הקורס" בדף
 * הבית במצב הפתוח ("צפייה בכל השיעורים"), רק עם השיעורים הארכיוניים.
 * מתחתיה — תתי-נושאים שהוצאו משיעורים פעילים (archivedScenes).
 */
export function ArchiveLessonGrid() {
  return (
    <section className="relative rounded-[28px] bg-paper-panel p-8 shadow-panel-soft">
      <LessonGridTitle as="h1">ארכיון השיעורים</LessonGridTitle>
      <div className={LESSON_GRID_CLASS}>
        {ARCHIVED_ITEMS.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} compact={false} />
        ))}
      </div>

      {ARCHIVED_SCENE_ITEMS.length > 0 && (
        <div className="mt-14">
          <LessonGridTitle>תתי-נושאים בארכיון</LessonGridTitle>
          <div className="mt-8 grid grid-cols-6 gap-3.5">
            {ARCHIVED_SCENE_ITEMS.map((s) => (
              <Link
                key={`${s.topicId}/${s.id}`}
                href={`/archive/${s.topicId}/${s.id}/`}
                className="flex flex-col items-center gap-2 rounded-2xl bg-paper-card px-[18px] py-6 text-center shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-panel"
              >
                <span className="text-[20px] font-extrabold text-olive-ink">{s.label}</span>
                {s.lesson && (
                  <span className="text-[14px] leading-[1.45] text-olive-muted">
                    מתוך שיעור {s.lesson.number}
                    <br />
                    {s.lesson.shortTitle}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
