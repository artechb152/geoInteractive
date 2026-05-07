'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { PrinciplesScene } from './PrinciplesScene';
import { PlanningScene } from './PlanningScene';
import { CombatNavScene } from './CombatNavScene';
import { RecapScene } from './RecapScene';
import { SceneProgress } from './SceneProgress';
import { SceneDivider } from './SceneDivider';

export function Topic03Lesson() {
  return (
    <>
      <SceneProgress />
      <div className="space-y-20 md:space-y-28 pb-12">
        <HookScene />
        <SceneDivider next="03.0 · לפני שמתחילים" />
        <OnboardingScene />
        <SceneDivider next="03.1 · עקרונות הניווט" />
        <PrinciplesScene />
        <SceneDivider next="03.2 · תכנון ציר" />
        <PlanningScene />
        <SceneDivider next="03.3 · ניווט קרבי" />
        <CombatNavScene />
        <SceneDivider next="03.4 · סיכום" />
        <RecapScene />
      </div>
    </>
  );
}
