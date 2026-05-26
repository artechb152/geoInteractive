'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { lessons } from '@/lib/lessons';
import { getLastVisit, type LastVisit } from '@/lib/last-visit';

/**
 * The primary CTA in the hero. Renders ONE of:
 *   - "התחלת הקורס" when the user has no recorded last-visit (first
 *     time, fresh device, or after clearing storage).
 *   - "המשך · NN.M · sub-topic" when a last-visit exists — links to
 *     that exact sub-topic (last *visited*, not furthest reached).
 *
 * Both states share the same visual treatment as the site's primary
 * button — solid orange fill, white text — so the hero only ever
 * shows one CTA and it always reads the same way.
 *
 * SSR-safe: server renders the "start" variant so the page has a CTA
 * on first paint; on hydration we swap to "continue" if a visit exists.
 */

const PRIMARY_CTA_CLASS =
  'group inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-colors duration-300';

const FIRST_LESSON_HREF = `/lessons/${lessons[0].id}/`;

export function ContinueLearningButton() {
  const [visit, setVisit] = useState<LastVisit | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisit(getLastVisit());
  }, []);

  if (!mounted || !visit) {
    return (
      <Link href={FIRST_LESSON_HREF} className={PRIMARY_CTA_CLASS}>
        <span>התחלת הקורס</span>
      </Link>
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
    <Link
      href={href}
      className={PRIMARY_CTA_CLASS}
      aria-label={`המשך מהמקום שעצרת: ${subPart}`}
    >
      <span className="truncate max-w-[22rem]">המשך · {subPart}</span>
    </Link>
  );
}
