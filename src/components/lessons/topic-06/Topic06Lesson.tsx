'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LOSScene } from './LOSScene';
import { ViewshedScene } from './ViewshedScene';
import { KillChainScene } from './KillChainScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic06Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="06.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="06.1 · קו ראייה" />
        <LOSScene />
        <SceneDivider next="06.2 · Viewshed" />
        <ViewshedScene />
        <SceneDivider next="06.3 · Kill Chain" />
        <KillChainScene />
        <SceneDivider next="06.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
