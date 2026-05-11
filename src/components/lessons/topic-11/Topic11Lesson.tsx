'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { DepthScene } from './DepthScene';
import { BufferScene } from './BufferScene';
import { BordersScene } from './BordersScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic11Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="11.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="11.1 · עומק אסטרטגי" />
        <DepthScene />
        <SceneDivider next="11.2 · אזורי חיץ" />
        <BufferScene />
        <SceneDivider next="11.3 · טיפולוגיית גבולות" />
        <BordersScene />
        <SceneDivider next="11.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
