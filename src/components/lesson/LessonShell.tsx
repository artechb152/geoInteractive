'use client';

/**
 * LessonShell — מעטפת השיעור האחידה (design-system §6, §22.4).
 *
 * מבנה:
 *   Breadcrumb → Lesson Hero (+ כרטיס התקדמות) → Lesson stats card →
 *   Tabs (לימוד/תרגול/בדיקת ידע) → תוכן → Sticky utility bar.
 *
 * ההתקדמות מגיעה מ-PagedLearn דרך אירוע `learn:scene-change` — המעטפת
 * מאזינה ומעדכנת את ה-Hero, שורת הסטטים וה-Utility bar בלי לגעת
 * ב-state הפנימי של הדפדוף.
 */

import Link from 'next/link';
import { createContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import { lessonScenes } from '@/lib/lesson-scenes';
import { recordLessonVisit } from '@/lib/last-visit';
import type { SceneChangeDetail } from '@/components/lesson/PagedLearn';
import { LessonBreadcrumb, LessonHero } from '@/components/lesson/LessonHero';
import { LessonStatsBar } from '@/components/lesson/LessonStatsBar';
import { LessonTabs, type LessonTab } from '@/components/lesson/LessonTabs';
import { LessonUtilityBar } from '@/components/lesson/LessonUtilityBar';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopoField } from '@/components/ui/TopoField';
import { cn } from '@/lib/utils';

/**
 * מעביר את פרטי השיעור הנוכחי/הקודם/הבא אל PagedLearn — ה-TOC מציג את
 * כותרת השיעור, וסצנת הסיכום מרנדרת קישור "השיעור הבא".
 */
export type LessonNavInfo = {
  current?: { number: number; shortTitle: string };
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
};

export const LessonNavContext = createContext<LessonNavInfo>({});

const easeSnap = [0.22, 1, 0.36, 1] as const;

export function LessonShell({
  lesson,
  prev,
  next,
  learn,
  practice,
  check,
}: {
  lesson: Lesson;
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
  learn: React.ReactNode;
  practice: React.ReactNode;
  check: React.ReactNode;
}) {
  const [tab, setTab] = useState<LessonTab>('learn');
  const [scene, setScene] = useState<SceneChangeDetail | null>(null);
  const reduce = useReducedMotion();

  const sceneTotal = scene?.total ?? lessonScenes[lesson.id]?.length ?? 0;
  const sceneIdx = scene?.idx ?? 0;
  const isHook = (scene?.id ?? 'hook') === 'hook';

  // רישום הביקור עבור כפתור "המשך" בדף הבית.
  useEffect(() => {
    recordLessonVisit({
      topicId: lesson.id,
      topicNumber: lesson.number,
      topicShortTitle: lesson.shortTitle,
    });
  }, [lesson.id, lesson.number, lesson.shortTitle]);

  // האזנה להתקדמות הסצנות מ-PagedLearn.
  useEffect(() => {
    const onChange = (e: Event) => {
      setScene((e as CustomEvent<SceneChangeDetail>).detail);
    };
    window.addEventListener('learn:scene-change', onChange);
    return () => window.removeEventListener('learn:scene-change', onChange);
  }, []);

  const content = tab === 'learn' ? learn : tab === 'practice' ? practice : check;
  // ה-Utility bar חי רק בטאב הלימוד, ולא על סצנת הפתיחה (יש לה CTA משלה).
  const showUtilityBar = tab === 'learn' && !isHook && sceneTotal > 0;

  return (
    <div className={cn('min-h-screen', showUtilityBar && 'pb-20')}>
      {/* ── רצועת התדריך: breadcrumb, כותרת, סטטים ולשוניות-תיקייה ── */}
      <div className="relative overflow-hidden">
        <TopoField className="opacity-80" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-topo-fade" />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8">
          <LessonBreadcrumb lesson={lesson} />
          <LessonHero lesson={lesson} sceneIdx={sceneIdx} sceneTotal={sceneTotal} />
          <LessonStatsBar
            lesson={lesson}
            sceneTotal={sceneTotal}
            sceneIdx={sceneIdx}
            className="mt-6"
          />
          <LessonTabs tab={tab} onChange={setTab} layoutIdSuffix={lesson.id} className="mt-7" />
        </div>
      </div>

      {/* ── תוכן הטאב הפעיל ── */}
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        <LessonNavContext.Provider
          value={{ current: { number: lesson.number, shortTitle: lesson.shortTitle }, prev, next }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              id={`lesson-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`lesson-tab-${tab}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: easeSnap }}
            >
              {tab === 'learn' ? (
                content
              ) : (
                <div className="mx-auto max-w-4xl">
                  <SurfaceCard className="p-4 sm:p-6 lg:p-8">{content}</SurfaceCard>
                  <LessonFooterNav prev={prev} next={next} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </LessonNavContext.Provider>
      </main>

      {/* ── Utility bar דביק (design-system §15) ── */}
      {showUtilityBar && (
        <LessonUtilityBar
          sceneIdx={sceneIdx}
          sceneTotal={sceneTotal}
          sceneLabel={scene?.label}
          isLast={scene?.isLast ?? false}
          nextLesson={next}
        />
      )}
    </div>
  );
}

/**
 * ניווט שיעור-קודם/הבא בתחתית הטאבים תרגול/בדיקת ידע (בטאב הלימוד
 * סצנת הסיכום כבר מציגה קישור לשיעור הבא).
 */
function LessonFooterNav({
  prev,
  next,
}: {
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/lessons/${prev.id}/`}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-3.5 text-right transition-all duration-200 ease-snap hover:border-brand/40 hover:shadow-elevated"
        >
          <ArrowRight
            className="size-5 shrink-0 text-fg-dim transition-all group-hover:translate-x-0.5 group-hover:text-brand-dark"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-fg-dim">
              השיעור הקודם
            </div>
            <div className="truncate font-display text-sm font-semibold text-fg transition-colors group-hover:text-brand-dark md:text-[15px]">
              {prev.shortTitle}
            </div>
          </div>
        </Link>
      ) : (
        <span aria-hidden />
      )}

      {next ? (
        <Link
          href={`/lessons/${next.id}/`}
          className="group flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3.5 transition-all duration-200 ease-snap hover:border-accent hover:bg-accent/20"
        >
          <div className="min-w-0 flex-1 text-right">
            <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-accent">
              השיעור הבא
            </div>
            <div className="truncate font-display text-sm font-semibold text-fg md:text-[15px]">
              {next.shortTitle}
            </div>
          </div>
          <ArrowLeft
            className="size-5 shrink-0 text-accent transition-all group-hover:-translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : (
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-3.5 transition-all duration-200 ease-snap hover:border-brand-dark hover:bg-brand/20"
        >
          <Check className="size-5 shrink-0 text-brand-dark" aria-hidden />
          <div className="min-w-0 flex-1 text-right">
            <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-brand-dark">
              סיום הקורס
            </div>
            <div className="truncate font-display text-sm font-semibold text-fg md:text-[15px]">
              חזרה לסילבוס
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
