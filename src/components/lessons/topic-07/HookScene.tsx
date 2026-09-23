'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic07/scene-hook/TOPIC07-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          הטנק <span className="text-ember">נעלם</span>
          <br />
          מהמסך התרמי.
        </>
      }
      body={
        <>
          לילה קר. גשם. הטנק שעקבת אחריו 6 שעות פתאום מתמזג עם הרקע. זה לא כשל סנסור —
          זה Thermal Crossover. בשיעור הזה נלמד איך מזג האוויר משנה את כללי המשחק.
        </>
      }
    />
  );
}
