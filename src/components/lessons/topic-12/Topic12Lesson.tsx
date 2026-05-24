'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { BasicsScene } from './BasicsScene';
import { CostSurfaceScene } from './CostSurfaceScene';
import { NetworkScene } from './NetworkScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',        label: 'פתיחה',                     Comp: HookScene },
  { id: 'onboarding',  label: 'לפני שמתחילים',      Comp: OnboardingScene },
  { id: 'basics',      label: 'שכבות וסוגי נתונים', Comp: BasicsScene },
  { id: 'costsurface', label: 'משטח עלות',          Comp: CostSurfaceScene },
  { id: 'network',     label: 'רשתות ו-Buffers',    Comp: NetworkScene },
  { id: 'recap',       label: 'סיכום',              Comp: RecapScene },
];

export function Topic12Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
