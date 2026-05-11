'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LOCScene } from './LOCScene';
import { TailScene } from './TailScene';
import { InfrastructureScene } from './InfrastructureScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic08Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="08.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="08.1 · MSR / ASR" />
        <LOCScene />
        <SceneDivider next="08.2 · בטן לוגיסטית" />
        <TailScene />
        <SceneDivider next="08.3 · נמלים ומסופים" />
        <InfrastructureScene />
        <SceneDivider next="08.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
