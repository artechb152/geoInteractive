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
  { id: 'onboarding', label: 'לפני שמתחילים',  Comp: OnboardingScene },
  { id: 'principles', label: 'עקרונות הניווט', Comp: PrinciplesScene },
  { id: 'planning',   label: 'תכנון ציר',      Comp: PlanningScene },
  { id: 'combatnav',  label: 'ניווט קרבי',     Comp: CombatNavScene },
  { id: 'recap',      label: 'סיכום',          Comp: RecapScene },
];

export function Topic03Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
