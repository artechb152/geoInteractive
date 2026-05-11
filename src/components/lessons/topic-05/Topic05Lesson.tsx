'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { TrafficabilityScene } from './TrafficabilityScene';
import { EngineeringScene } from './EngineeringScene';
import { CoverScene } from './CoverScene';
import { VegetationScene } from './VegetationScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic05Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="05.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="05.1 · עבירות" />
        <TrafficabilityScene />
        <SceneDivider next="05.2 · הנדסה" />
        <EngineeringScene />
        <SceneDivider next="05.3 · מחסה והסתרה" />
        <CoverScene />
        <SceneDivider next="05.4 · תכסית וצומח" />
        <VegetationScene />
        <SceneDivider next="05.5 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
