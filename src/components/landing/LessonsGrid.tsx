import { lessons } from '@/lib/lessons';
import { LessonCard } from '@/components/LessonCard';
import { ContinueLearningButton } from './ContinueLearningButton';

/**
 * "תכנית הלימודים" — גריד 12 השיעורים (design-system §22.2).
 * כרטיסים לבנים אחידים, מספר שיעור כתום, asset קטן לכל שיעור,
 * CTA להמשך מהנקודה האחרונה.
 */
export function LessonsGrid() {
  return (
    <section
      id="syllabus"
      className="mx-auto w-full max-w-[1400px] scroll-mt-[calc(var(--header-h)+1rem)] px-4 py-14 sm:px-6 lg:px-8 md:py-20"
      aria-labelledby="syllabus-heading"
    >
      <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-eyebrow">מסלול הקורס · 12 שיעורים ברצף אחד</p>
          <h2
            id="syllabus-heading"
            className="mt-2 font-display text-3xl font-extrabold tracking-tight text-balance leading-tight md:text-4xl"
          >
            תכנית הלימודים
          </h2>
          <span aria-hidden className="mt-3 flex items-center gap-1.5">
            <span className="block h-1.5 w-16 bg-accent" />
            <span className="block size-1.5 rotate-45 bg-brand-dark" />
          </span>
          <p className="mt-3 max-w-3xl text-base text-fg-muted md:text-lg">
            מסע של 12 שלבים — מקריאת מפה בסיסית ועד GEOINT מבצעי. כל שיעור עומד
            לבדו אבל בנוי על קודמו.
          </p>
        </div>
        <div className="shrink-0">
          <ContinueLearningButton />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </section>
  );
}
