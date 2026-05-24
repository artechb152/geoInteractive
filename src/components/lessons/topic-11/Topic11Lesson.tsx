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
  { id: 'onboarding', label: 'לפני שמתחילים',     Comp: OnboardingScene },
  { id: 'depth',      label: 'עומק אסטרטגי',      Comp: DepthScene },
  { id: 'buffer',     label: 'אזורי חיץ',         Comp: BufferScene },
  { id: 'borders',    label: 'טיפולוגיית גבולות', Comp: BordersScene },
  { id: 'recap',      label: 'סיכום',             Comp: RecapScene },
];

export function Topic11Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
