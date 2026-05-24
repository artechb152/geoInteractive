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
  { id: 'onboarding', label: '06.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'los',        label: '06.1 · קו ראייה',      Comp: LOSScene },
  { id: 'viewshed',   label: '06.2 · Viewshed',      Comp: ViewshedScene },
  { id: 'killchain',  label: '06.3 · Kill Chain',    Comp: KillChainScene },
  { id: 'recap',      label: '06.4 · סיכום',         Comp: RecapScene },
];

export function Topic06Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
