'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { PrinciplesScene } from './PrinciplesScene';
import { PlanningScene } from './PlanningScene';
import { CombatNavScene } from './CombatNavScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                 Comp: HookScene },
  { id: 'onboarding', label: '03.0 · לפני שמתחילים',  Comp: OnboardingScene },
  { id: 'principles', label: '03.1 · עקרונות הניווט', Comp: PrinciplesScene },
  { id: 'planning',   label: '03.2 · תכנון ציר',      Comp: PlanningScene },
  { id: 'combatnav',  label: '03.3 · ניווט קרבי',     Comp: CombatNavScene },
  { id: 'recap',      label: '03.4 · סיכום',          Comp: RecapScene },
];

export function Topic03Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
