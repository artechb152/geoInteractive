'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { GEOINTScene } from './GEOINTScene';
import { PlatformsScene } from './PlatformsScene';
import { DeceptionScene } from './DeceptionScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic12Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="12.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="12.1 · GEOINT" />
        <GEOINTScene />
        <SceneDivider next="12.2 · פלטפורמות" />
        <PlatformsScene />
        <SceneDivider next="12.3 · OSINT והונאה" />
        <DeceptionScene />
        <SceneDivider next="12.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
