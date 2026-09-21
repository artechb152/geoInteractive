'use client';

import { createContext } from 'react';
import type { SceneMeta } from '@/lib/lesson-scenes';

/**
 * Lesson-level navigation contexts, kept in their own module so both
 * `LessonShell` (which owns the state) and the components that consume it
 * (`LessonSidebar`, `PagedLearn`) can import them without a cycle.
 */

/**
 * Carries the prev/next lesson info AND the current lesson down the tree.
 * `current` headlines the side nav; `next` is used by the recap sub-topic's
 * "next lesson" link inside PagedLearn.
 */
export type LessonNavInfo = {
  current?: { number: number; shortTitle: string };
  prev?: { id: string; shortTitle: string };
  next?: { id: string; shortTitle: string };
};

export const LessonNavContext = createContext<LessonNavInfo>({});

/** The three lesson modes. Rendered as the side nav's primary rows. */
export type LessonTab = 'learn' | 'practice' | 'check';

/**
 * The single sub-topic state machine for a lesson.
 *
 * It lives in `LessonShell` — NOT in `PagedLearn` — because the side nav
 * that renders the sub-topic list has to outlive the `learn` panel: it stays
 * mounted on `practice` / `check` too (it just hides the sub-topic section),
 * and the active sub-topic has to survive a round trip through those modes.
 *
 * `LessonShell` seeds it from `lib/lesson-scenes.ts` so the list is complete
 * in the server-rendered HTML; `PagedLearn` — which holds the real scene
 * components — re-publishes its own list on mount, so a drift between the two
 * self-heals on the client instead of silently breaking navigation.
 */
export type LessonSceneNav = {
  scenes: SceneMeta[];
  activeId: string | null;
  activeIdx: number;
  /** Navigate to a sub-topic by id. No-op for an id that isn't in `scenes`. */
  goto: (id: string) => void;
  /** Lets the owner of the real scene list correct a stale seed. */
  publishScenes: (scenes: SceneMeta[]) => void;
};

export const LessonSceneNavContext = createContext<LessonSceneNav | null>(null);

/** Payload of the `learn:scene-change` CustomEvent fired on every navigation. */
export type SceneChangeDetail = {
  id: string;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  total: number;
};
