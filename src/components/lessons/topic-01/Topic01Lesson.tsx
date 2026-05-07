'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LevelsScene } from './LevelsScene';
import { MDOScene } from './MDOScene';
import { AsymmetricScene } from './AsymmetricScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic01Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="01.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="01.1 · רמות מלחמה" />
        <LevelsScene />
        <SceneDivider next="01.2 · MDO" />
        <MDOScene />
        <SceneDivider next="01.3 · לחימה אסימטרית" />
        <AsymmetricScene />
        <SceneDivider next="01.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
