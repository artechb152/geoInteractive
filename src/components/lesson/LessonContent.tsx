import { parseTopic } from '@/lib/content';
import type { Lesson } from '@/lib/lessons';
import { Target } from 'lucide-react';

export function LessonContent({
  raw,
  lesson,
}: {
  raw: string;
  lesson: Lesson;
}) {
  const sections = parseTopic(raw);

  return (
    <article className="space-y-8">
      {/* ── Lesson header ─────────────────────────────────────────────── */}
      <header className="space-y-2.5.5">
        <div className="inline-flex flex-wrap items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-fg-muted">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          <span>שיעור {String(lesson.number).padStart(2, '0')}</span>
          {lesson.tags.length > 0 && <span className="text-fg-dim/60" aria-hidden>·</span>}
          {lesson.tags.map((t, i) => (
            <span key={t} className="text-fg-dim">
              {t}
              {i < lesson.tags.length - 1 && (
                <span className="mx-1.5 text-fg-dim/60" aria-hidden>·</span>
              )}
            </span>
          ))}
        </div>

        <h1 className="font-display font-bold tracking-tight text-balance leading-[1.05] text-[clamp(1.625rem,3.5vw,2.5rem)]">
          {lesson.title}
        </h1>

        <p className="text-sm md:text-base text-fg-muted text-pretty leading-relaxed max-w-3xl">
          {lesson.subtitle}
        </p>
      </header>

      {/* ── Objectives card ──────────────────────────────────────────── */}
      <section className="relative rounded-2xl border border-brand/25 bg-bg-elevated p-4 md:p-5">
        <div className="inline-flex items-center gap-2.5 text-sm font-display font-semibold tracking-wider text-brand-dark mb-5">
          <Target className="size-4" aria-hidden />
          מטרות הלמידה
        </div>
        <ul className="space-y-2.5">
          {lesson.objectives.map((o, i) => (
            <li key={i} className="flex gap-3.5 items-start">
              <span
                className="grid place-items-center size-6 shrink-0 mt-0.5 rounded-full bg-brand/12 border border-brand/30 text-brand-dark font-display font-bold text-xs"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="text-fg leading-relaxed text-sm md:text-[15px] text-pretty">
                {o}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Body sections (parsed from markdown) ─────────────────────── */}
      {sections.map((s, i) => (
        <section key={i} className="space-y-3.5">
          {s.heading && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2.5 text-xs md:text-sm font-display font-semibold tracking-wider text-fg-dim">
                <span className="font-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-px w-6 bg-border" aria-hidden />
              </div>
              <h2 className="font-display font-bold tracking-tight text-balance leading-tight text-[clamp(1.25rem,2.2vw,1.625rem)]">
                {s.heading}
              </h2>
            </div>
          )}
          <div className="prose-content space-y-2.5.5 text-fg leading-relaxed text-[15px]">
            {s.body
              .join('\n')
              .split(/\n\s*\n/)
              .map((p, j) =>
                p.trim() ? (
                  <p key={j} className="text-pretty">
                    {p.trim()}
                  </p>
                ) : null,
              )}
          </div>
        </section>
      ))}
    </article>
  );
}
