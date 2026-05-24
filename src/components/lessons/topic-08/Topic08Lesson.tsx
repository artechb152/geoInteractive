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
  { id: 'onboarding',     label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'loc',            label: 'MSR / ASR',     Comp: LOCScene },
  { id: 'tail',           label: 'בטן לוגיסטית',  Comp: TailScene },
  { id: 'infrastructure', label: 'נמלים ומסופים', Comp: InfrastructureScene },
  { id: 'recap',          label: 'סיכום',         Comp: RecapScene },
];

export function Topic08Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
