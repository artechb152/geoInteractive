import { parseTopic } from '@/lib/content';
import type { Lesson } from '@/lib/lessons';

export function LessonContent({
  raw,
  lesson,
}: {
  raw: string;
  lesson: Lesson;
}) {
  const sections = parseTopic(raw);

  return (
    <article className="space-y-12">
      <header className="space-y-4">
        <div className="text-sm font-mono text-accent">
          שיעור {String(lesson.number).padStart(2, '0')} · {lesson.tags.join(' · ')}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-balance leading-tight">
          {lesson.title}
        </h1>
        <p className="text-lg text-fg-muted text-pretty leading-relaxed max-w-3xl">
          {lesson.subtitle}
        </p>
      </header>

      <section className="surface p-6">
        <h2 className="text-sm font-mono text-fg-dim mb-3">מטרות הלמידה</h2>
        <ul className="space-y-2">
          {lesson.objectives.map((o, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="size-5 rounded-full bg-accent/15 text-accent text-xs font-mono flex items-center justify-center mt-0.5 shrink-0">
                {i + 1}
              </span>
              <span className="text-fg leading-relaxed">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      {sections.map((s, i) => (
        <section key={i} className="space-y-4">
          {s.heading && (
            <h2 className="text-2xl font-display font-semibold text-balance">
              <span className="text-accent font-mono text-sm me-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.heading}
            </h2>
          )}
          <div className="prose-content space-y-4 text-fg leading-relaxed text-[17px]">
            {s.body
              .join('\n')
              .split(/\n\s*\n/)
              .map((p, j) =>
                p.trim() ? (
                  <p key={j} className="text-pretty">
                    {p.trim()}
                  </p>
                ) : null
              )}
          </div>
        </section>
      ))}
    </article>
  );
}
