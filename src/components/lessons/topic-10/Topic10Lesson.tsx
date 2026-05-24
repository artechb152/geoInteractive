'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { UrbanMorphologyScene } from './UrbanMorphologyScene';
import { ThreeDimScene } from './ThreeDimScene';
import { CivilianScene } from './CivilianScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',            label: 'פתיחה',                    Comp: HookScene },
  { id: 'onboarding',      label: '10.0 · לפני שמתחילים',     Comp: OnboardingScene },
  { id: 'urbanmorphology', label: '10.1 · גריד וקסבה',        Comp: UrbanMorphologyScene },
  { id: 'threedim',        label: '10.2 · ממד אנכי ותת-קרקע', Comp: ThreeDimScene },
  { id: 'civilian',        label: '10.3 · אזרחים ומשפט',      Comp: CivilianScene },
  { id: 'recap',           label: '10.4 · סיכום',             Comp: RecapScene },
];

export function Topic10Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
