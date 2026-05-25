'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import { getLastVisit, type LastVisit } from '@/lib/last-visit';

/**
 * Renders only when the user has a recorded last-visit. Goes to that
 * exact sub-topic (last *visited*, not furthest reached — so jumping
 * back from 5.1 to 3.2 and returning to the landing page brings them
 * back to 3.2, by design).
 *
 * Visual treatment intentionally differs from the main CTA buttons in
 * the hero: two-line layout with a sage/brand-dark chip on the start
 * side. Keeps the shared px-4 py-2 / rounded-md rhythm so it still
 * reads as part of the same button family.
 */
export function ContinueLearningButton() {
  const [visit, setVisit] = useState<LastVisit | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisit(getLastVisit());
  }, []);

  // Avoid SSR/CSR mismatch — server renders nothing for this button.
  if (!mounted || !visit) return null;

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
      className="group relative inline-flex items-center gap-2.5 ps-2 pe-3.5 py-1.5 rounded-md font-medium bg-bg-elevated border border-brand-dark/35 hover:border-brand-dark hover:bg-brand/5 transition-all duration-300 shadow-elevated"
      aria-label={`המשך מהמקום שעצרת: ${subPart}`}
    >
      <span
        className="relative flex size-7 items-center justify-center rounded-md bg-brand/12 text-brand-dark shrink-0"
        aria-hidden
      >
        <History className="size-3.5" />
        <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-accent ring-2 ring-bg-elevated animate-pulse" />
      </span>

      <span className="flex flex-col items-start text-right leading-tight min-w-0">
        <span className="text-[10px] font-display font-semibold tracking-[0.16em] uppercase text-fg-muted">
          המשך מהמקום שעצרת
        </span>
        <span className="text-sm font-display font-bold text-fg truncate max-w-[14rem] sm:max-w-[18rem]">
          {subPart}
        </span>
      </span>

      <ArrowLeft
        className="size-4 text-brand-dark transition-transform duration-300 group-hover:-translate-x-1 shrink-0"
        aria-hidden
      />
    </Link>
  );
}
