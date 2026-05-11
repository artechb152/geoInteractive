'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { WaterEnergyScene } from './WaterEnergyScene';
import { ChokepointsScene } from './ChokepointsScene';
import { MahanScene } from './MahanScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic09Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="09.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="09.1 · מים ואנרגיה" />
        <WaterEnergyScene />
        <SceneDivider next="09.2 · נקודות חנק" />
        <ChokepointsScene />
        <SceneDivider next="09.3 · דוקטרינת מהן" />
        <MahanScene />
        <SceneDivider next="09.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
