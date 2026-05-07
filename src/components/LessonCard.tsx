import Link from 'next/link';
import type { Lesson } from '@/lib/lessons';
import { cn } from '@/lib/utils';

const difficultyLabel: Record<Lesson['difficulty'], string> = {
  foundation: 'יסוד',
  intermediate: 'בינוני',
  advanced: 'מתקדם',
};

const difficultyClass: Record<Lesson['difficulty'], string> = {
  foundation: 'border-status-ok/40 bg-status-ok/10 text-status-ok',
  intermediate: 'border-status-warn/40 bg-status-warn/10 text-status-warn',
  advanced: 'border-status-danger/40 bg-status-danger/10 text-status-danger',
};

export function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      className="group surface relative overflow-hidden p-5 transition-all duration-300 ease-snap hover:border-accent/50 hover:shadow-glow hover:-translate-y-0.5"
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-24 -z-0 bg-gradient-to-b opacity-60 group-hover:opacity-100 transition-opacity',
          lesson.hero.color
        )}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-fg-dim">
            שיעור {String(lesson.number).padStart(2, '0')}
          </span>
          <span className={cn('chip', difficultyClass[lesson.difficulty])}>
            {difficultyLabel[lesson.difficulty]}
          </span>
        </div>

        <h3 className="font-display font-semibold text-lg leading-snug text-balance group-hover:text-accent transition-colors">
          {lesson.shortTitle}
        </h3>

        <p className="text-sm text-fg-muted mt-2 leading-relaxed line-clamp-2 text-pretty">
          {lesson.subtitle}
        </p>

        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-fg-dim">
          <span>{lesson.duration} דק'</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">
            כניסה ←
          </span>
        </div>
      </div>
    </Link>
  );
}
