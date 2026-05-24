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
  { id: 'onboarding',  label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'waterenergy', label: 'מים ואנרגיה',   Comp: WaterEnergyScene },
  { id: 'chokepoints', label: 'נקודות חנק',    Comp: ChokepointsScene },
  { id: 'mahan',       label: 'דוקטרינת מהן',  Comp: MahanScene },
  { id: 'recap',       label: 'סיכום',         Comp: RecapScene },
];

export function Topic09Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
