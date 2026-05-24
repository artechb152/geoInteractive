'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LOSScene } from './LOSScene';
import { ViewshedScene } from './ViewshedScene';
import { KillChainScene } from './KillChainScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding', label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'los',        label: 'קו ראייה',      Comp: LOSScene },
  { id: 'viewshed',   label: 'Viewshed',      Comp: ViewshedScene },
  { id: 'killchain',  label: 'Kill Chain',    Comp: KillChainScene },
  { id: 'recap',      label: 'סיכום',         Comp: RecapScene },
];

export function Topic06Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
