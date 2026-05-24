'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { TrafficabilityScene } from './TrafficabilityScene';
import { EngineeringScene } from './EngineeringScene';
import { CoverScene } from './CoverScene';
import { VegetationScene } from './VegetationScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',           label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',     label: '05.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'trafficability', label: '05.1 · עבירות',        Comp: TrafficabilityScene },
  { id: 'engineering',    label: '05.2 · הנדסה',         Comp: EngineeringScene },
  { id: 'cover',          label: '05.3 · מחסה והסתרה',   Comp: CoverScene },
  { id: 'vegetation',     label: '05.4 · תכסית וצומח',   Comp: VegetationScene },
  { id: 'recap',          label: '05.5 · סיכום',         Comp: RecapScene },
];

export function Topic05Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
