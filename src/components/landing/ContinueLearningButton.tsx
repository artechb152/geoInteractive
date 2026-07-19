'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { lessons } from '@/lib/lessons';
import { getLastVisit, type LastVisit } from '@/lib/last-visit';
import { Button } from '@/components/ui/Button';

/**
 * ה-CTA הראשי של הקורס. מרנדר אחד מהשניים:
 *   - "התחלת הקורס" כשאין ביקור מוקלט (פעם ראשונה / מכשיר חדש).
 *   - "המשך · NN.M · תת-נושא" כשקיים ביקור — קישור לתת-הנושא המדויק
 *     (האחרון שביקרו בו, לא הכי מתקדם).
 *
 * שני המצבים חולקים את אותו Button primary כתום (design-system §16).
 *
 * SSR-safe: השרת מרנדר את מצב ה"התחלה"; בהידרציה עוברים ל"המשך" אם צריך.
 */
export function ContinueLearningButton({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [visit, setVisit] = useState<LastVisit | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisit(getLastVisit());
  }, []);

  if (!mounted || !visit) {
    return (
      <Button href={`/lessons/${lessons[0].id}/`} size={size} className={className}>
        <Play className="size-4" aria-hidden />
        <span>התחלת הקורס</span>
      </Button>
    );
  }

  const href = visit.sceneId
    ? `/lessons/${visit.topicId}/#scene-${visit.sceneId}`
    : `/lessons/${visit.topicId}/`;

  const lessonNum = String(visit.topicNumber).padStart(2, '0');
  const subPart =
    visit.sceneIdx !== undefined && visit.sceneLabel
      ? `${lessonNum}.${visit.sceneIdx + 1} · ${visit.sceneLabel}`
      : `שיעור ${lessonNum} · ${visit.topicShortTitle}`;

  return (
    <Button
      href={href}
      size={size}
      className={className}
      aria-label={`המשך מהמקום שעצרת: ${subPart}`}
    >
      <span className="max-w-[20rem] truncate">המשך · {subPart}</span>
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
    </Button>
  );
}
