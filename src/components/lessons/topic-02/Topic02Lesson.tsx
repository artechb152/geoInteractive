'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { TopographyScene } from './TopographyScene';
import { ScaleScene } from './ScaleScene';
import { CoordinatesScene } from './CoordinatesScene';
import { ContoursScene } from './ContoursScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',        label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',  label: '02.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'topography',  label: '02.1 · טופוגרפיה',     Comp: TopographyScene },
  { id: 'scale',       label: '02.2 · קנה מידה',      Comp: ScaleScene },
  { id: 'coordinates', label: '02.3 · קואורדינטות',   Comp: CoordinatesScene },
  { id: 'contours',    label: '02.4 · קווי גובה',     Comp: ContoursScene },
  { id: 'recap',       label: '02.5 · סיכום',         Comp: RecapScene },
];

export function Topic02Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
