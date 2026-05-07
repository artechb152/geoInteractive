import Link from 'next/link';
import { lessons, totalDuration } from '@/lib/lessons';
import { LessonCard } from '@/components/LessonCard';
import { TopoBackdrop } from '@/components/TopoBackdrop';

export default function HomePage() {
  return (
    <main className="relative">
      <TopoBackdrop />

      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-6">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          קורס דיגיטלי · {lessons.length} שיעורים · {Math.round(totalDuration / 60)} שעות
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] text-balance">
          <span className="gradient-text">גיאוגרפיה צבאית</span>
          <br />
          <span className="text-fg-muted text-3xl md:text-4xl font-medium">
            GEOINT וניתוח מערכות שטח
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-fg-muted text-pretty leading-relaxed">
          קורס אינטראקטיבי שמלמד איך המרחב הפיזי מעצב אסטרטגיה, תמרון ואיסוף מודיעין.
          כל שיעור משלב לימוד, סימולציה ותרגול — מהבסיס ועד GEOINT מתקדם.
        </p>

        <div className="mt-8 flex gap-3 flex-wrap">
          <Link href={`/lessons/${lessons[0].id}/`} className="btn-primary">
            התחלת הקורס
            <span aria-hidden>←</span>
          </Link>
          <a href="#syllabus" className="btn-ghost">לסילבוס המלא</a>
        </div>
      </section>

      <section id="syllabus" className="relative max-w-6xl mx-auto px-6 pb-24">
        <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">סילבוס</h2>
            <p className="text-fg-muted mt-1">13 שיעורים מובנים מהיסוד עד היישום המבצעי</p>
          </div>
          <div className="text-sm text-fg-dim">
            הערכת זמן: {totalDuration} דקות סה"כ
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      </section>
    </main>
  );
}
