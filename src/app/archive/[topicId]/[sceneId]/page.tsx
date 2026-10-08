import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArchiveGate } from '@/components/archive/ArchiveGate';
import { getLesson } from '@/lib/lessons';
import { archivedScenes } from '@/lib/lesson-scenes';
import { TacticalTerrainScene } from '@/components/lessons/topic-03/TacticalTerrainScene';
import { GeologyScene } from '@/components/lessons/topic-02/GeologyScene';
import { TopographySceneV1 } from '@/components/lessons/topic-02/TopographySceneV1';

/**
 * תת-נושא בארכיון — סצנה שהוצאה מרצף השיעור הציבורי ומוצגת כאן לבדה,
 * מאחורי אותו שער סיסמה של /archive/. הרשימה עצמה ב-archivedScenes.
 */
const SCENE_COMPONENTS: Record<string, ComponentType> = {
  'topic-03/tacticalterrain': TacticalTerrainScene,
  'topic-02/topography-v1': TopographySceneV1,
  'topic-02/geology': GeologyScene,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return archivedScenes.map((s) => ({ topicId: s.topicId, sceneId: s.id }));
}

type Params = Promise<{ topicId: string; sceneId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { topicId, sceneId } = await params;
  const scene = archivedScenes.find((s) => s.topicId === topicId && s.id === sceneId);
  return {
    title: scene ? `${scene.label} · ארכיון · גיאוגרפיה צבאית` : 'ארכיון · גיאוגרפיה צבאית',
    robots: { index: false, follow: false },
  };
}

export default async function ArchivedScenePage({ params }: { params: Params }) {
  const { topicId, sceneId } = await params;
  const scene = archivedScenes.find((s) => s.topicId === topicId && s.id === sceneId);
  const Scene = SCENE_COMPONENTS[`${topicId}/${sceneId}`];
  const lesson = getLesson(topicId);
  if (!scene || !Scene || !lesson) notFound();

  return (
    <ArchiveGate>
      <main className="min-h-[calc(100dvh-var(--header-h))] pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between gap-4 text-sm">
          <span className="text-fg-muted">
            ארכיון · שיעור {lesson.number} · {lesson.shortTitle}
          </span>
          <Link href="/archive/" className="font-semibold text-accent-hover hover:underline">
            חזרה לארכיון
          </Link>
        </div>
        <Scene />
      </main>
    </ArchiveGate>
  );
}
