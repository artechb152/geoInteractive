'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic02/scene-hook/TOPIC02-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      startLabel="לתחילת השיעור"
      title={
        <>
          קריאת <span className="text-ember">מפה</span>
          <br />
          להבנת השטח ולתכנון תנועה
        </>
      }
      body={
        <>
          קריאת מפה מאפשרת לזהות תוואי שטח, להעריך מרחקים ולציין מיקומים.
          בשיעור זה נלמד את <span className="text-ember">שפת המפה</span> מהבסיס:
          נכיר את התבליט והתכסית, ונלמד להשתמש בקנה מידה, בקואורדינטות ובקווי גובה
          כדי להבין את השטח ולתכנן תנועה.
        </>
      }
    />
  );
}
