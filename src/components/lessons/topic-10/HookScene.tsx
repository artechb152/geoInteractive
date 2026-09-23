'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic10/scene-hook/TOPIC10-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="70%"
      title={
        <>
          10 מ׳ בסמטה.
          <br />
          30 קומות <span className="text-ember">מעל</span>.
          <br />
          20 מ׳ <span className="text-ember">מתחת</span>.
        </>
      }
      body={
        <>
          בעיר, היתרון של טנק מצטמצם למטרים. הצלף בקומה ה-15 רואה אותך לפני שאתה רואה אותו.
          מתחת לרגליך — רשת מנהרות שלמה. בשיעור הזה נלמד את הקרב הכי מורכב שיש.
        </>
      }
    />
  );
}
