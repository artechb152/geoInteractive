'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic08/scene-hook/TOPIC08-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="35%"
      title={
        <>
          20% <span className="text-ember">נלחמים</span>.
          <br />
          80% מאכילים אותם.
        </>
      }
      body={
        <>
          רומל דרס את חיל המשוריינים הבריטי בצפון אפריקה במשך שנתיים. אבל כשחתכו לו את קווי האספקה
          דרך הים התיכון, הוא נסוג 1,500 קילומטרים תוך מספר חודשים. בשיעור הזה נלמד למה קווי האספקה,
          ולא כמות הטנקים, קובעים מי ממשיך להילחם.
        </>
      }
    />
  );
}
