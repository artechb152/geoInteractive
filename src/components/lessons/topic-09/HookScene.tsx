'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic09/scene-hook/TOPIC09-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      bgPositionX="35%"
      title={
        <>
          סכר אחד.
          <br />
          מיצר אחד. <span className="text-ember">העולם רוטט.</span>
        </>
      }
      body={
        <>
          אתיופיה בונה סכר. 100 מיליון מצרים חוששים. החות'ים יורים על מיצר אחד —
          7% מסחר העולם עוצר. במאה ה-21, מים, נפט וגז הם נשק אסטרטגי. בוא נראה למה.
        </>
      }
    />
  );
}
