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
  { id: 'onboarding', label: '01.0 · לפני שמתחילים',  Comp: OnboardingScene },
  { id: 'levels',     label: '01.1 · רמות מלחמה',     Comp: LevelsScene },
  { id: 'mdo',        label: '01.2 · MDO',            Comp: MDOScene },
  { id: 'asymmetric', label: '01.3 · לחימה אסימטרית', Comp: AsymmetricScene },
  { id: 'recap',      label: '01.4 · סיכום',          Comp: RecapScene },
];

export function Topic01Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
