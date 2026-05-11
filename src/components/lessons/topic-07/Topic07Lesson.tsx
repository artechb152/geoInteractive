'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { ClimateScene } from './ClimateScene';
import { SensorsScene } from './SensorsScene';
import { PlatformsScene } from './PlatformsScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic07Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="07.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="07.1 · מיקרו-אקלים" />
        <ClimateScene />
        <SceneDivider next="07.2 · בליעה ו-IR" />
        <SensorsScene />
        <SceneDivider next="07.3 · תקרת ענן" />
        <PlatformsScene />
        <SceneDivider next="07.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
