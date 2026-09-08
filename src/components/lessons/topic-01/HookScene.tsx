'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic01/scene-hook/TOPIC01-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          המרחב איננו רק זירת הפעולה.
          <br />
          הוא המימד המערכתי <span className="text-ember">שמכריע אותה.</span>
        </>
      }
      body={
        <>
          המלחמה המודרנית לא מוכרעת ביחס כוחות — היא מוכרעת ב-5 ממדים,
          3 רמות פיקוד, ובתלות במימד הזמן והמרחב. בשיעור הזה תבין
          איך המרחב הופך לשחקן הראשי, ולמה רחפן של 300 דולר מפיל מטוס של 80 מיליון.
        </>
      }
    />
  );
}
