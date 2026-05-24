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
  { id: 'onboarding',      label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'geology',         label: 'גיאולוגיה',     Comp: GeologyScene },
  { id: 'landforms',       label: 'תבניות נוף',    Comp: LandformsScene },
  { id: 'tacticalterrain', label: 'שטח טקטי',      Comp: TacticalTerrainScene },
  { id: 'recap',           label: 'סיכום',         Comp: RecapScene },
];

export function Topic04Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
