'use client';

import { HookSceneLayout } from '@/components/lesson/HookSceneLayout';

const HOOK_BG_SRC = '/assets/lessons/topic02/scene-hook/TOPIC02-HOOK-BG.png';

export function HookScene() {
  return (
    <HookSceneLayout
      bgSrc={HOOK_BG_SRC}
      title={
        <>
          טעות של <span className="text-ember">מילימטר</span> במפה.
          <br />
          יכולה לעלות בחיי אדם בשטח.
        </>
      }
      body={
        <>
          מפה צבאית היא לא ציור — היא תרגום מתמטי של העולם לדף. 
          לקרוא אותה לא נכון זה להפציץ את המקום הלא נכון. בשיעור הזה נלמד 
          את <span className="text-ember">שפת המפה</span> מהבסיס, כדי להפוך דף שטוח לתמונה מבצעית חדה.
        </>
      }
    />
  );
}
