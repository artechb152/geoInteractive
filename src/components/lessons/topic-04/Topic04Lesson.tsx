'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { GeologyScene } from './GeologyScene';
import { LandformsScene } from './LandformsScene';
import { TacticalTerrainScene } from './TacticalTerrainScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic04Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="04.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="04.1 · גיאולוגיה" />
        <GeologyScene />
        <SceneDivider next="04.2 · תבניות נוף" />
        <LandformsScene />
        <SceneDivider next="04.3 · שטח טקטי" />
        <TacticalTerrainScene />
        <SceneDivider next="04.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
