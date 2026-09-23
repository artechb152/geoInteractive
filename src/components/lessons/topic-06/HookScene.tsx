'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic06/scene-hook/TOPIC06-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          להגיע ליעד בדיוק מושלם,
          <br />
          <span className="text-ember">גם כשהטכנולוגיה מפסיקה לעבוד.</span>
        </>
      }
      body={
        <>
          לוויינים נופלים. רחפנים מאבדים אות. האויב משבש את ה-GPS.
          ניווט הוא לא רק טכניקה — זאת היכולת שמחזירה את הכוח שלך הביתה.
        </>
      }
    />
  );
}
