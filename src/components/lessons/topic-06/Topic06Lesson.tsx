'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { PrinciplesScene } from './PrinciplesScene';
import { PlanningScene } from './PlanningScene';
import { CombatNavScene } from './CombatNavScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';
import { LessonFitUniform } from '@/components/lesson/LessonViewportFit';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                 Comp: HookScene },
  { id: 'onboarding', label: 'לפני שמתחילים',  Comp: OnboardingScene },
  { id: 'combatnav',  label: 'טכניקות ניווט',  Comp: CombatNavScene },
  { id: 'principles', label: 'עקרונות הניווט', Comp: PrinciplesScene },
  { id: 'planning',   label: 'תכנון ציר',      Comp: PlanningScene },
  { id: 'recap',      label: 'סיכום',          Comp: RecapScene },
];

export function Topic06Lesson() {
  // One content width for every sub-topic: all screens shrink by the same scale on a laptop.
  return (
    <LessonFitUniform>
      <PagedLearn scenes={SCENES} />
    </LessonFitUniform>
  );
}
