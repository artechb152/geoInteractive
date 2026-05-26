import Link from 'next/link';
import { lessons } from '@/lib/lessons';

/**
 * "מה לומדים בקורס" — landing-page directory of all 12 lessons.
 *
 * Layout: a strict 3-column × 4-row grid. The page direction is RTL,
 * so grid items naturally flow right-to-left: row 1 holds lessons
 * 1·2·3 from right to left, row 2 holds 4·5·6, etc.
 *
 * Each cell is a small "magazine" card — a coloured orange banner at
 * the top stamped with the lesson number, then the short title and
 * subtitle. The whole card is a Link to the lesson page.
 */
export function LessonsGrid() {
  return (
    <section
      id="lessons"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
      aria-labelledby="lessons-heading"
    >
      <div className="mb-10 md:mb-12">
        <div className="text-[11px] font-display font-semibold tracking-wider text-accent uppercase mb-2">
          תוכנית הקורס · 12 שיעורים
        </div>
        <h2
          id="lessons-heading"
          className="font-display font-bold text-2xl md:text-4xl text-balance leading-tight mb-2"
        >
          מה לומדים <span className="text-accent-hover">בקורס</span>
        </h2>
        <p className="text-fg-muted text-base md:text-lg max-w-3xl">
          מסע של 12 שלבים — מקריאת מפה בסיסית ועד GEOINT מבצעי. כל שיעור עומד
          לבדו אבל בנוי על קודמו.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}/`}
            className="group flex flex-col rounded-md overflow-hidden border border-border bg-bg-elevated hover:border-accent transition-colors"
          >
            {/* Banner — orange masthead with the lesson number */}
            <div className="bg-accent text-bg-elevated px-3 py-1.5 text-xs sm:text-sm font-display font-bold">
              <span>שיעור {lesson.number}</span>
            </div>

            {/* Body — short title + one-line subtitle */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              <h3 className="font-display font-bold text-sm sm:text-base leading-snug text-balance text-fg group-hover:text-accent-hover transition-colors">
                {lesson.shortTitle}
              </h3>
              <p className="mt-1 text-[11px] sm:text-xs text-fg-muted leading-snug line-clamp-2 text-pretty">
                {lesson.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
