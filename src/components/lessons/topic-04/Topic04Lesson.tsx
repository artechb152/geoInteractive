'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { GeologyScene } from './GeologyScene';
import { LandformsScene } from './LandformsScene';
import { TacticalTerrainScene } from './TacticalTerrainScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',            label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',      label: '04.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'geology',         label: '04.1 · גיאולוגיה',     Comp: GeologyScene },
  { id: 'landforms',       label: '04.2 · תבניות נוף',    Comp: LandformsScene },
  { id: 'tacticalterrain', label: '04.3 · שטח טקטי',      Comp: TacticalTerrainScene },
  { id: 'recap',           label: '04.4 · סיכום',         Comp: RecapScene },
];

export function Topic04Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
