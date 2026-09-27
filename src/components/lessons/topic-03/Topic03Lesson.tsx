'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',            label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',      label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'recap',           label: 'סיכום',         Comp: RecapScene },
];

export function Topic03Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
