'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { LOCScene } from './LOCScene';
import { TailScene } from './TailScene';
import { InfrastructureScene } from './InfrastructureScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',           label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',     label: '08.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'loc',            label: '08.1 · MSR / ASR',     Comp: LOCScene },
  { id: 'tail',           label: '08.2 · בטן לוגיסטית',  Comp: TailScene },
  { id: 'infrastructure', label: '08.3 · נמלים ומסופים', Comp: InfrastructureScene },
  { id: 'recap',          label: '08.4 · סיכום',         Comp: RecapScene },
];

export function Topic08Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
