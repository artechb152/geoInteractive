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
  { id: 'onboarding',  label: '12.0 · לפני שמתחילים',      Comp: OnboardingScene },
  { id: 'basics',      label: '12.1 · שכבות וסוגי נתונים', Comp: BasicsScene },
  { id: 'costsurface', label: '12.2 · משטח עלות',          Comp: CostSurfaceScene },
  { id: 'network',     label: '12.3 · רשתות ו-Buffers',    Comp: NetworkScene },
  { id: 'recap',       label: '12.4 · סיכום',              Comp: RecapScene },
];

export function Topic12Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
