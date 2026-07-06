import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Crosshair,
  Flag,
  ListChecks,
  Play,
  Target,
} from 'lucide-react';
import { lessons, getLesson, nextLesson, prevLesson } from '@/lib/lessons';
import { lessonScenes, lessonAssets, interactionLabels } from '@/lib/lesson-scenes';
import { LessonStatsBar } from '@/components/lesson/LessonStatsBar';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { PageShell } from '@/components/ui/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { IconBadge } from '@/components/ui/IconBadge';
import { Button } from '@/components/ui/Button';
import { FrameCorners } from '@/components/ui/FrameCorners';
import { TopoField } from '@/components/ui/TopoField';
import { cn } from '@/lib/utils';

/**
 * Lesson Overview — דף הכניסה לשיעור (design-system §22.3).
 * Hero דו-עמודי (טקסט + asset) → CTA התחלה → stats bar → מטרות →
 * מבנה השיעור → דרישות קדם → שיעורים קשורים.
 */

export function generateStaticParams() {
  return lessons.map((l) => ({ topicId: l.id }));
}

const SCENE_KIND_ICON: Record<string, typeof BookOpen> = {
  hook: Play,
  onboarding: Flag,
  recap: ListChecks,
};

export default async function LessonOverviewPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const lesson = getLesson(topicId);
  if (!lesson) notFound();

  const scenes = lessonScenes[topicId] ?? [];
  const assets = lessonAssets[topicId];
  const prev = prevLesson(topicId);
  const next = nextLesson(topicId);
  const num = String(lesson.number).padStart(2, '0');

  return (
    <main className="relative">
      {/* ── תדריך: Hero דו-עמודי על שולחן המפות ── */}
      <div className="relative overflow-hidden border-b-2 border-brand-dark/20">
        <TopoField className="opacity-80" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-topo-fade" />
        <PageShell className="relative py-7 lg:py-10">
          <nav aria-label="פירורי לחם" className="flex items-center gap-2 text-xs font-display font-semibold text-fg-dim">
            <Link href="/" className="transition-colors hover:text-brand-dark">
              הקורס שלי
            </Link>
            <span aria-hidden className="size-1 rotate-45 bg-brand-dark/40" />
            <Link href="/#syllabus" className="transition-colors hover:text-brand-dark">
              שיעורים
            </Link>
            <span aria-hidden className="size-1 rotate-45 bg-brand-dark/40" />
            <span className="text-brand-dark" aria-current="page">
              שיעור {num} · תדריך
            </span>
          </nav>

          <div className="relative mt-4 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            {/* מספר-מתאר ענק — חותם התדריך */}
            <span
              aria-hidden
              className="outline-numeral pointer-events-none absolute -top-8 -start-3 text-[9rem] leading-none opacity-60 lg:-top-12 lg:text-[13rem]"
            >
              {num}
            </span>

            {/* עמודת טקסט — ימין ב-RTL */}
            <div className="relative min-w-0 pt-8 lg:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone="command">תדריך שיעור {num}/12</StatusChip>
                <StatusChip tone="neutral">{interactionLabels[lesson.interactions[0]]}</StatusChip>
              </div>
              <h1 className="mt-4 font-display font-extrabold tracking-tight text-balance leading-[1.08] text-[clamp(1.875rem,4.2vw,3.25rem)]">
                {lesson.title}
              </h1>
              <span aria-hidden className="mt-4 flex items-center gap-1.5">
                <span className="block h-1.5 w-20 bg-accent" />
                <span className="block size-1.5 rotate-45 bg-brand-dark" />
                <span className="block h-0.5 w-8 bg-brand-dark/40" />
              </span>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg text-pretty">
                {lesson.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href={`/lessons/${lesson.id}/`} size="lg">
                  <Play className="size-5" aria-hidden />
                  <span>התחל שיעור</span>
                </Button>
                <Button href="/#syllabus" variant="secondary" size="lg">
                  חזרה לסילבוס
                </Button>
              </div>
            </div>

            {/* asset — גיליון מפה ממוסגר, שמאל ב-RTL */}
            <figure className="relative border border-brand-dark/30 bg-bg-elevated p-2.5 shadow-paper sm:p-3">
              <FrameCorners />
              <IsometricAsset
                assetId={`LESSON-${num}-HOOK`}
                src={assets?.hook ?? ''}
                alt={`איור איזומטרי בסגנון papercut לשיעור ${lesson.shortTitle}`}
                aspect="16/9"
                className="rounded-[2px]"
              />
              <div className="mt-2.5 flex items-center justify-between bg-brand-dark px-3 py-1.5 text-bg">
                <span className="font-mono text-[10px] tracking-[0.25em]" dir="ltr">
                  GEO-9900 · {num}
                </span>
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span className="size-1.5 rotate-45 bg-accent" />
                  <span className="h-px w-10 bg-bg/40" />
                  <span className="size-1.5 rotate-45 bg-bg/50" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.25em]" dir="ltr">
                  {lesson.duration}:00
                </span>
              </div>
            </figure>
          </div>

          <LessonStatsBar lesson={lesson} sceneTotal={scenes.length} className="mt-9" />
        </PageShell>
      </div>

      <PageShell className="py-10 md:py-12">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          {/* ── מטרות השיעור ── */}
          <section aria-labelledby="objectives-heading">
            <p className="section-eyebrow">מה יוצאים איתו</p>
            <h2
              id="objectives-heading"
              className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl"
            >
              מטרות השיעור
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              {lesson.objectives.map((obj, i) => (
                <SurfaceCard as="div" flat key={i} className="flex items-start gap-3.5 p-4">
                  <IconBadge tone="brand" size="md">
                    <Target className="size-4" />
                  </IconBadge>
                  <p className="pt-1 text-sm leading-relaxed text-fg md:text-[15px] text-pretty">
                    {obj}
                  </p>
                </SurfaceCard>
              ))}
            </div>
          </section>

          {/* ── מבנה השיעור ── */}
          <section aria-labelledby="structure-heading">
            <p className="section-eyebrow">מפת דרך</p>
            <h2
              id="structure-heading"
              className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl"
            >
              מבנה השיעור
            </h2>
            <SurfaceCard frame className="mt-5 p-5">
              <ol className="relative flex list-none flex-col">
                {/* ציר מקווקו — כמו ציר מתוכנן על מפה */}
                <span
                  aria-hidden
                  className="absolute bottom-6 top-4 start-[15px] w-px border-s-2 border-dashed border-brand-dark/25"
                />
                {scenes.map((s, i) => {
                  const Icon = SCENE_KIND_ICON[s.id] ?? BookOpen;
                  return (
                    <li key={s.id} className="relative flex items-center gap-3.5 pb-5 last:pb-0">
                      <span
                        aria-hidden
                        className={cn(
                          'relative z-10 grid size-8 shrink-0 rotate-45 place-items-center border',
                          i === 0
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-brand-dark/40 bg-bg-card text-brand-dark',
                        )}
                      >
                        <Icon className="size-3.5 -rotate-45" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[11px] text-fg-dim" dir="ltr">
                            {num}.{i + 1}
                          </span>
                          <span className="font-display text-sm font-extrabold text-fg">
                            {s.label}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 border-t-2 border-dashed border-brand-dark/20 pt-4">
                <Button href={`/lessons/${lesson.id}/`} className="w-full">
                  <Play className="size-4" aria-hidden />
                  <span>התחל שיעור</span>
                </Button>
              </div>
            </SurfaceCard>

            {/* ── דרישות קדם ── */}
            <div className="mt-8">
              <p className="section-eyebrow">לפני שמתחילים</p>
              <h3 className="mt-1 font-display text-xl font-bold tracking-tight">דרישות קדם</h3>
              {prev ? (
                <Link
                  href={`/lessons/${prev.id}/overview/`}
                  className="group mt-3 flex items-center gap-3 rounded-[3px] border border-border bg-bg-elevated p-4 transition-all duration-200 ease-snap hover:border-brand/40 hover:shadow-elevated"
                >
                  <IconBadge tone="brand">
                    <Crosshair className="size-4" />
                  </IconBadge>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-fg-dim">מומלץ להשלים קודם</div>
                    <div className="truncate font-display text-sm font-bold text-fg transition-colors group-hover:text-brand-dark">
                      שיעור {String(prev.number).padStart(2, '0')} · {prev.shortTitle}
                    </div>
                  </div>
                  <ArrowLeft className="size-4 shrink-0 text-fg-dim" aria-hidden />
                </Link>
              ) : (
                <p className="mt-3 text-sm text-fg-muted">
                  זהו שיעור הפתיחה של הקורס — אפשר להתחיל ישר.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── שיעורים קשורים ── */}
        <section aria-labelledby="related-heading" className="mt-12 border-t border-border-subtle pt-8">
          <p className="section-eyebrow">המשך המסלול</p>
          <h2
            id="related-heading"
            className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl"
          >
            שיעורים קשורים
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {prev && (
              <Link
                href={`/lessons/${prev.id}/overview/`}
                className="group flex items-center gap-3 rounded-[3px] border border-border bg-bg-elevated p-4 transition-all duration-200 ease-snap hover:border-brand/40 hover:shadow-elevated"
              >
                <ArrowRight className="size-5 shrink-0 text-fg-dim transition-colors group-hover:text-brand-dark" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-fg-dim">
                    השיעור הקודם
                  </div>
                  <div className="truncate font-display text-sm font-semibold text-fg md:text-[15px]">
                    {prev.shortTitle}
                  </div>
                </div>
              </Link>
            )}
            {next && (
              <Link
                href={`/lessons/${next.id}/overview/`}
                className="group flex items-center gap-3 rounded-[3px] border border-accent/40 bg-accent/10 p-4 transition-all duration-200 ease-snap hover:border-accent hover:bg-accent/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-accent">
                    השיעור הבא
                  </div>
                  <div className="truncate font-display text-sm font-semibold text-fg md:text-[15px]">
                    {next.shortTitle}
                  </div>
                </div>
                <ArrowLeft className="size-5 shrink-0 text-accent" aria-hidden />
              </Link>
            )}
          </div>
        </section>
      </PageShell>
    </main>
  );
}
