'use client';

/**
 * PagedLearn — טאב הלימוד המדופדף של מעטפת השיעור (design-system §11–§14).
 *
 *   - סצנה אחת מרונדרת בכל רגע, בתוך SceneCard לבן מרכזי.
 *   - TOC ("תוכן השיעור") יושב בעמודה הימנית של ה-grid בדסקטופ (RTL —
 *     הצד המוביל), והופך לרצועת גלולות במובייל.
 *   - הסצנה הפעילה נשמרת ב-`window.location.hash` (`#scene-<id>`) —
 *     ריענון/דיפ-לינק חוזרים לאותה סצנה.
 *   - משדר `learn:scene-change` (CustomEvent) בכל ניווט; LessonShell מאזין
 *     כדי לעדכן את כרטיס ההתקדמות, שורת הסטטים וה-Utility bar.
 *   - כל צאצא יכול לנווט דרך `learn:next` / `learn:prev` על window
 *     (כפתור "לחץ כדי להתחיל" בסצנת הפתיחה).
 *
 * Props:
 *   scenes — רשימה סדורה (id = slug ל-hash, label = טקסט ל-TOC).
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LessonNavContext } from '@/components/lesson/LessonShell';
import { LessonToc, LessonTocMobile } from '@/components/lesson/LessonToc';
import { SceneCard } from '@/components/lesson/SceneCard';
import { SceneNavigation } from '@/components/lesson/SceneNavigation';
import { SceneStepContext } from '@/components/lesson/scene-context';
import { recordSceneVisit } from '@/lib/last-visit';

export type PagedScene = {
  id: string;
  label: string;
  Comp: React.ComponentType;
};

export type SceneChangeDetail = {
  id: string;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  total: number;
  label: string;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

function emitChange(detail: SceneChangeDetail) {
  window.dispatchEvent(new CustomEvent<SceneChangeDetail>('learn:scene-change', { detail }));
}

/** שולף את `topic-XX` מה-URL כדי לשמור את הסצנה הפעילה בלי prop-drilling. */
function currentTopicIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/\/lessons\/([^/]+)/);
  return m?.[1] ?? null;
}

function persistScene(scenes: PagedScene[], i: number) {
  const topicId = currentTopicIdFromUrl();
  if (!topicId) return;
  recordSceneVisit({
    topicId,
    sceneId: scenes[i].id,
    sceneLabel: scenes[i].label,
    sceneIdx: i,
    sceneTotal: scenes.length,
  });
}

function detailAt(scenes: PagedScene[], i: number): SceneChangeDetail {
  return {
    id: scenes[i].id,
    idx: i,
    isFirst: i === 0,
    isLast: i === scenes.length - 1,
    total: scenes.length,
    label: scenes[i].label,
  };
}

export function PagedLearn({ scenes }: { scenes: PagedScene[] }) {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const { current: currentLesson, next: nextLesson } = useContext(LessonNavContext);

  // סנכרון מה-hash בטעינה + hashchange (אחורה/קדימה בדפדפן).
  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace('#scene-', '');
      if (!raw) {
        setIdx(0);
        emitChange(detailAt(scenes, 0));
        persistScene(scenes, 0);
        return;
      }
      const i = scenes.findIndex((s) => s.id === raw);
      if (i >= 0) {
        setIdx(i);
        emitChange(detailAt(scenes, i));
        persistScene(scenes, i);
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [scenes]);

  const goto = useCallback(
    (i: number) => {
      if (i < 0 || i >= scenes.length) return;
      setIdx(i);
      const { pathname, search } = window.location;
      history.replaceState(null, '', `${pathname}${search}#scene-${scenes[i].id}`);
      emitChange(detailAt(scenes, i));
      persistScene(scenes, i);
      setTimeout(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    [scenes],
  );

  // ניווט מכל צאצא דרך custom events (בלי prop drilling).
  useEffect(() => {
    const next = () => goto(idx + 1);
    const prev = () => goto(idx - 1);
    window.addEventListener('learn:next', next);
    window.addEventListener('learn:prev', prev);
    return () => {
      window.removeEventListener('learn:next', next);
      window.removeEventListener('learn:prev', prev);
    };
  }, [idx, goto]);

  const ActiveScene = scenes[idx].Comp;
  // סצנת הפתיחה היא מסך אטמוספרי עם CTA משלה — הכרטיס flush
  // וניווט הסצנות מוסתר (design-system §22.5).
  const isHook = scenes[idx].id === 'hook';

  return (
    <div className="scroll-mt-[calc(var(--header-h)+0.75rem)]" ref={rootRef}>
      {/* TOC מובייל/טאבלט — מתחת ל-lg */}
      <LessonTocMobile
        scenes={scenes}
        active={idx}
        onGoto={goto}
        lesson={currentLesson}
        className="mb-5 lg:hidden"
      />

      {/* ── Main layout: TOC ימין (RTL start) · כרטיס תוכן שמאל ── */}
      <div className="items-start gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <LessonToc
          scenes={scenes}
          active={idx}
          onGoto={goto}
          lesson={currentLesson}
          className="hidden lg:block"
        />

        <div className="min-w-0">
          <SceneCard flush={isHook}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={scenes[idx].id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: easeSnap }}
              >
                <SceneStepContext.Provider value={{ idx, total: scenes.length }}>
                  <ActiveScene />
                </SceneStepContext.Provider>
              </motion.div>
            </AnimatePresence>

            {!isHook && (
              <SceneNavigation
                scenes={scenes}
                active={idx}
                onGoto={goto}
                nextLesson={nextLesson}
              />
            )}
          </SceneCard>
        </div>
      </div>
    </div>
  );
}
