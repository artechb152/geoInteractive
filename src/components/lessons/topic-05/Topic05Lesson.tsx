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
  { id: 'onboarding',     label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'trafficability', label: 'עבירות',        Comp: TrafficabilityScene },
  { id: 'engineering',    label: 'הנדסה',         Comp: EngineeringScene },
  { id: 'cover',          label: 'מחסה והסתרה',   Comp: CoverScene },
  { id: 'vegetation',     label: 'תכסית וצומח',   Comp: VegetationScene },
  { id: 'recap',          label: 'סיכום',         Comp: RecapScene },
];

export function Topic05Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
