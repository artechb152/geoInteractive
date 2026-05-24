'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { DepthScene } from './DepthScene';
import { BufferScene } from './BufferScene';
import { BordersScene } from './BordersScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                    Comp: HookScene },
  { id: 'onboarding', label: '11.0 · לפני שמתחילים',     Comp: OnboardingScene },
  { id: 'depth',      label: '11.1 · עומק אסטרטגי',      Comp: DepthScene },
  { id: 'buffer',     label: '11.2 · אזורי חיץ',         Comp: BufferScene },
  { id: 'borders',    label: '11.3 · טיפולוגיית גבולות', Comp: BordersScene },
  { id: 'recap',      label: '11.4 · סיכום',             Comp: RecapScene },
];

export function Topic11Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
