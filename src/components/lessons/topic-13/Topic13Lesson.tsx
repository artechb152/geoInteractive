'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { BasicsScene } from './BasicsScene';
import { CostSurfaceScene } from './CostSurfaceScene';
import { NetworkScene } from './NetworkScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic13Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="13.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="13.1 · שכבות וסוגי נתונים" />
        <BasicsScene />
        <SceneDivider next="13.2 · משטח עלות" />
        <CostSurfaceScene />
        <SceneDivider next="13.3 · רשתות ו-Buffers" />
        <NetworkScene />
        <SceneDivider next="13.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
