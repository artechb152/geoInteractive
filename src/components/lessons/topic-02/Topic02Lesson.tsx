'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { ReliefCoverIntroScene } from './ReliefCoverIntroScene';
import { LandformsScene } from './LandformsScene';
import { LandCoverScene } from './LandCoverScene';
import { TopographyScene } from './TopographyScene';
import { ScaleScene } from './ScaleScene';
import { CoordinatesScene } from './CoordinatesScene';
import { CoordinatesPart2Scene } from './CoordinatesPart2Scene';
import { ContoursScene } from './ContoursScene';
import { PracticalMeaningScene } from './PracticalMeaningScene';
import { MapReadingRecapScene, RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';
import { LessonFitUniform } from '@/components/lesson/LessonViewportFit';

// The original lesson 2 is split in two public lessons: topic-02 (this one) runs
// from the hook to topography; topic-02b (Topic02bLesson) from scale to practical meaning.
const SCENES: PagedScene[] = [
  { id: 'hook',        label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding',  label: 'לפני שמתחילים', Comp: OnboardingScene },
  { id: 'relief-cover', label: 'תבליט ותכסית', Comp: ReliefCoverIntroScene },
  { id: 'landforms',   label: 'תבניות נוף',    Comp: LandformsScene },
  { id: 'landcover',   label: 'תכסית',         Comp: LandCoverScene },
  { id: 'topography',  label: 'טופוגרפיה',     Comp: TopographyScene },
  { id: 'recap',      label: 'סיכום',         Comp: RecapScene },
];

const MAP_READING_SCENES: PagedScene[] = [
  { id: 'scale',       label: 'קנה מידה',      Comp: ScaleScene },
  { id: 'coordinates', label: 'קואורדינטות 1', Comp: CoordinatesScene },
  { id: 'coordinates-2', label: 'קואורדינטות 2', Comp: CoordinatesPart2Scene },
  { id: 'contours',    label: 'קווי גובה',     Comp: ContoursScene },
  { id: 'practice',    label: 'משמעות מעשית',  Comp: PracticalMeaningScene },
  { id: 'recap',      label: 'סיכום',         Comp: MapReadingRecapScene },
];

export function Topic02Lesson() {
  // One content width for every sub-topic: all screens shrink by the same scale on a laptop.
  return (
    <LessonFitUniform>
      <PagedLearn scenes={SCENES} />
    </LessonFitUniform>
  );
}

export function Topic02bLesson() {
  return (
    <LessonFitUniform>
      <PagedLearn scenes={MAP_READING_SCENES} />
    </LessonFitUniform>
  );
}
