'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic03/scene-hook/TOPIC03-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          אותו <span className="text-ember">הר</span>.
          <br />
          שני צדדים <span className="text-ember">שונים לחלוטין</span>.
        </>
      }
      body={
        <>
          בקרב, צורת ההר היא לא רקע. היא הכלי הכי חזק שיש לך —
          או הכי מסוכן. בשיעור הזה תלמד לקרוא נוף כמו שמפקדים קוראים שדה קרב.
        </>
      }
    />
  );
}
