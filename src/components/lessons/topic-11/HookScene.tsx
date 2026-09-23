'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic11/scene-hook/TOPIC11-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="40%"
      title={
        <>
          14 קילומטרים.
          <br />
          כל ההגנה <span className="text-ember">של מדינה</span>.
        </>
      }
      body={
        <>
          רוסיה איבדה את מוסקבה — וזכתה בזמן. ישראל לא יכולה לאבד שום עיר.
          העומק האסטרטגי קובע איך מדינה <strong>בכלל יכולה</strong> להגן על עצמה.
          בוא נראה איך.
        </>
      }
    />
  );
}
