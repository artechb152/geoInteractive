'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { TopographyScene } from './TopographyScene';
import { ScaleScene } from './ScaleScene';
import { CoordinatesScene } from './CoordinatesScene';
import { ContoursScene } from './ContoursScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic02Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="02.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="02.1 · טופוגרפיה" />
        <TopographyScene />
        <SceneDivider next="02.2 · קנה מידה" />
        <ScaleScene />
        <SceneDivider next="02.3 · קואורדינטות" />
        <CoordinatesScene />
        <SceneDivider next="02.4 · קווי גובה" />
        <ContoursScene />
        <SceneDivider next="02.5 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
