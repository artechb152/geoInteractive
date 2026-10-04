'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic06/scene-hook/TOPIC06-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      startLabel="לתחילת השיעור"
      title={
        <>
          ניווט בשטח:
          <br />
          <span className="text-ember">תכנון, התמצאות ובקרה</span>
        </>
      }
      body={
        <>
          ניווט משלב תכנון מסלול, קביעת כיוון ובדיקת המיקום לאורך הדרך.
          בשיעור זה נלמד להיעזר במפה, במצפן ובסימני השטח כדי לתכנן תנועה
          ולוודא שאנו מתקדמים ליעד, גם כשאין אפשרות להסתמך על GPS.
        </>
      }
    />
  );
}
