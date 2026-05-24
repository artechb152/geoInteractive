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
  { id: 'onboarding',  label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'topography',  label: 'טופוגרפיה',     Comp: TopographyScene },
  { id: 'scale',       label: 'קנה מידה',      Comp: ScaleScene },
  { id: 'coordinates', label: 'קואורדינטות',   Comp: CoordinatesScene },
  { id: 'contours',    label: 'קווי גובה',     Comp: ContoursScene },
  { id: 'recap',       label: 'סיכום',         Comp: RecapScene },
];

export function Topic02Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
