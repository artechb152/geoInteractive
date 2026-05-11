'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { UrbanMorphologyScene } from './UrbanMorphologyScene';
import { ThreeDimScene } from './ThreeDimScene';
import { CivilianScene } from './CivilianScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic10Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="10.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="10.1 · גריד וקסבה" />
        <UrbanMorphologyScene />
        <SceneDivider next="10.2 · ממד אנכי ותת-קרקע" />
        <ThreeDimScene />
        <SceneDivider next="10.3 · אזרחים ומשפט" />
        <CivilianScene />
        <SceneDivider next="10.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
