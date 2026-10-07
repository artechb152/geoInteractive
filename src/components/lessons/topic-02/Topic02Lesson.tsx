'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { ReliefCoverIntroScene } from './ReliefCoverIntroScene';
import { LandformsScene } from './LandformsScene';
import { GeologyScene } from './GeologyScene';
import { LandCoverScene } from './LandCoverScene';
import { TopographyScene } from './TopographyScene';
import { ScaleScene } from './ScaleScene';
import { CoordinatesScene } from './CoordinatesScene';
import { CoordinatesPart2Scene } from './CoordinatesPart2Scene';
import { ContoursScene } from './ContoursScene';
import { PracticalMeaningScene } from './PracticalMeaningScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',        label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',  label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'relief-cover', label: 'תבליט ותכסית', Comp: ReliefCoverIntroScene },
  { id: 'landforms',   label: 'תבניות נוף',    Comp: LandformsScene },
  { id: 'geology',     label: 'גיאולוגיה',     Comp: GeologyScene },
  { id: 'landcover',   label: 'תכסית',         Comp: LandCoverScene },
  { id: 'topography',  label: 'טופוגרפיה',     Comp: TopographyScene },
  { id: 'scale',       label: 'קנה מידה',      Comp: ScaleScene },
  { id: 'coordinates', label: 'קואורדינטות 1', Comp: CoordinatesScene },
  { id: 'coordinates-2', label: 'קואורדינטות 2', Comp: CoordinatesPart2Scene },
  { id: 'contours',    label: 'קווי גובה',     Comp: ContoursScene },
  { id: 'practice',    label: 'משמעות מעשית',  Comp: PracticalMeaningScene },
  { id: 'recap',      label: 'סיכום',         Comp: RecapScene },
];

export function Topic02Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
