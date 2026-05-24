'use client';

import { HookScene } from './HookScene';
import { OnboardingScene } from './OnboardingScene';
import { ClimateScene } from './ClimateScene';
import { SensorsScene } from './SensorsScene';
import { PlatformsScene } from './PlatformsScene';
import { RecapScene } from './RecapScene';
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
  { id: 'hook',       label: 'פתיחה',                Comp: HookScene },
  { id: 'onboarding', label: '07.0 · לפני שמתחילים', Comp: OnboardingScene },
  { id: 'climate',    label: '07.1 · מיקרו-אקלים',   Comp: ClimateScene },
  { id: 'sensors',    label: '07.2 · בליעה ו-IR',    Comp: SensorsScene },
  { id: 'platforms',  label: '07.3 · תקרת ענן',      Comp: PlatformsScene },
  { id: 'recap',      label: '07.4 · סיכום',         Comp: RecapScene },
];

export function Topic07Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
