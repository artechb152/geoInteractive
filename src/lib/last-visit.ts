'use client';

/**
 * Tracks the user's *last visited* location in the course — explicitly
 * NOT the furthest-progress point. If the user jumps backwards from
 * 5.1 to 3.2, the next "continue" should go to 3.2.
 *
 * Stored in localStorage so it survives reloads but stays per-device.
 * Read by ContinueLearningButton on the landing page.
 */

const KEY = 'geo-course:last-visit:v1';

export type LastVisit = {
  topicId: string;
  topicNumber: number;
  topicShortTitle: string;
  sceneId?: string;
  sceneLabel?: string;
  sceneIdx?: number;   // 0-based within the lesson
  sceneTotal?: number;
  ts: number;
};

export function getLastVisit(): LastVisit | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastVisit;
    if (!parsed?.topicId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function recordLessonVisit(input: {
  topicId: string;
  topicNumber: number;
  topicShortTitle: string;
}) {
  if (typeof window === 'undefined') return;
  const prev = getLastVisit();
  const sameTopic = prev?.topicId === input.topicId;
  const next: LastVisit = {
    topicId: input.topicId,
    topicNumber: input.topicNumber,
    topicShortTitle: input.topicShortTitle,
    sceneId: sameTopic ? prev?.sceneId : undefined,
    sceneLabel: sameTopic ? prev?.sceneLabel : undefined,
    sceneIdx: sameTopic ? prev?.sceneIdx : undefined,
    sceneTotal: sameTopic ? prev?.sceneTotal : undefined,
    ts: Date.now(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — silently ignore
  }
}

export function recordSceneVisit(input: {
  topicId: string;
  sceneId: string;
  sceneLabel: string;
  sceneIdx: number;
  sceneTotal: number;
}) {
  if (typeof window === 'undefined') return;
  const prev = getLastVisit();
  if (!prev || prev.topicId !== input.topicId) return;
  const next: LastVisit = {
    ...prev,
    sceneId: input.sceneId,
    sceneLabel: input.sceneLabel,
    sceneIdx: input.sceneIdx,
    sceneTotal: input.sceneTotal,
    ts: Date.now(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearLastVisit() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
