'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic12/scene-hook/TOPIC12-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          המפה שמסבירה
          <br />
          איזה גשר <span className="text-ember">תפוצץ</span>.
        </>
      }
      body={
        <>
          לחיצה אחת על "Show Layers". בחירה שנייה: "Cost Surface". המפה מחזירה מסלול
          שעוקף 3 מארבים, חוסך 12 ק"מ דלק, ומגיע ליעד שעה לפני האויב. זה לא קסם —
          זה GIS מבצעי.
        </>
      }
    />
  );
}
