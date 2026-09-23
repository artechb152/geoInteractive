'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic05/scene-hook/TOPIC05-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="40%"
      title={
        <>
          מי שרואה <span className="text-ember">ראשון</span>,
          <br />
          יורה ראשון.
        </>
      }
      body={
        <>
          שני חיילים. 300 מטר אחד מהשני. אותו גובה. אחד רואה את חברו, השני לא רואה כלום.
          ההבדל? קו ישר אחד שעובר מעל גבעה אחת. בשיעור הזה נלמד איך לקרוא את הקו הזה.
        </>
      }
    />
  );
}
