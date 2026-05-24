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
  { id: 'onboarding',      label: 'לפני שמתחילים',     Comp: OnboardingScene },
  { id: 'urbanmorphology', label: 'גריד וקסבה',        Comp: UrbanMorphologyScene },
  { id: 'threedim',        label: 'ממד אנכי ותת-קרקע', Comp: ThreeDimScene },
  { id: 'civilian',        label: 'אזרחים ומשפט',      Comp: CivilianScene },
  { id: 'recap',           label: 'סיכום',             Comp: RecapScene },
];

export function Topic10Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
