'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LevelsScene } from './LevelsScene';
import { MDOScene } from './MDOScene';
import { AsymmetricScene } from './AsymmetricScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                 Comp: HookScene },
  { id: 'onboarding', label: 'לפני שמתחילים',  Comp: OnboardingScene },
  { id: 'levels',     label: 'רמות מלחמה',     Comp: LevelsScene },
  { id: 'mdo',        label: 'MDO',            Comp: MDOScene },
  { id: 'asymmetric', label: 'לחימה אסימטרית', Comp: AsymmetricScene },
  { id: 'recap',      label: 'סיכום',          Comp: RecapScene },
];

export function Topic01Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
