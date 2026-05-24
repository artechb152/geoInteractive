'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { WaterEnergyScene } from './WaterEnergyScene';
import { ChokepointsScene } from './ChokepointsScene';
import { MahanScene } from './MahanScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',        label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',  label: '09.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'waterenergy', label: '09.1 · מים ואנרגיה',   Comp: WaterEnergyScene },
  { id: 'chokepoints', label: '09.2 · נקודות חנק',    Comp: ChokepointsScene },
  { id: 'mahan',       label: '09.3 · דוקטרינת מהן',  Comp: MahanScene },
  { id: 'recap',       label: '09.4 · סיכום',         Comp: RecapScene },
];

export function Topic09Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
