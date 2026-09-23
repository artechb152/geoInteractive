'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic04/scene-hook/TOPIC04-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="50%"
      title={
        <>
          שיח <span className="text-ember">לא עוצר</span>
          <br />
          כדור.
        </>
      }
      body={
        <>
          שני חיילים תופסים מחסה. אחד מאחורי סלע — השני מאחורי שיח עבות.
          מבחוץ הם נראים זהים. רק אחד מהם יחיה. בשיעור הזה נלמד למה.
        </>
      }
    />
  );
}
