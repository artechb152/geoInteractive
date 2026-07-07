'use client';

/**
 * התקדמות הקורס כפי שדף הבית מציג אותה — נגזרת מחנות ה-last-visit הקיימת
 * (אין עדיין חנות השלמה אמיתית): שיעורים *לפני* השיעור האחרון שביקרו בו
 * נספרים כ"הושלמו". 4 מתוך 12 ⇒ 33% — מקור אמת אחד, פותר את אי-ההתאמה
 * 35%-מול-4/12 שסומנה ב-design-spec §7.
 *
 * SSR-safe: לפני mount מוחזר מצב "טרם התחיל" (percent 0, שיעור 01 פעיל) —
 * זהה למצב מכשיר טרי, כך שאין hydration mismatch.
 */

import { useEffect, useState } from 'react';
import { lessons } from '@/lib/lessons';
import { clearLastVisit, getLastVisit, type LastVisit } from '@/lib/last-visit';

const CHANGE_EVENT = 'geo-course:progress-changed';

export type CourseProgress = {
  /** false עד הקריאה הראשונה בצד הלקוח */
  ready: boolean;
  visit: LastVisit | null;
  started: boolean;
  /** שיעורים שלפני השיעור האחרון שביקרו בו */
  completedCount: number;
  totalCount: number;
  /** completedCount / totalCount, מעוגל */
  percent: number;
  /** השיעור המודגש בקרוסלה — האחרון שביקרו בו, ברירת מחדל topic-01 */
  activeTopicId: string;
  /** יעד "המשך ללמוד" / "המשך לשיעור הבא" */
  continueHref: string;
};

function compute(ready: boolean): CourseProgress {
  const visit = ready ? getLastVisit() : null;
  const total = lessons.length;
  const completed = visit ? Math.min(total, Math.max(0, visit.topicNumber - 1)) : 0;
  const activeTopicId = visit?.topicId ?? lessons[0].id;
  return {
    ready,
    visit,
    started: visit !== null,
    completedCount: completed,
    totalCount: total,
    percent: Math.round((completed / total) * 100),
    activeTopicId,
    continueHref: `/lessons/${activeTopicId}/`,
  };
}

/** מצב ההתקדמות, מתעדכן חי על איפוס (resetCourseProgress) ועל שינוי מטאב אחר. */
export function useCourseProgress(): CourseProgress {
  const [progress, setProgress] = useState<CourseProgress>(() => compute(false));

  useEffect(() => {
    const update = () => setProgress(compute(true));
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return progress;
}

/** מוחק את ה-last-visit ומודיע לכל הרכיבים המאזינים באותו עמוד. */
export function resetCourseProgress() {
  clearLastVisit();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
