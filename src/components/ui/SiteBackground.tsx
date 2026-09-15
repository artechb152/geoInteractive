'use client';

/**
 * SiteBackground — מרקם קווי-הגובה הדק שמופיע ברקע דף הבית (design/mockups/mockup.png),
 * מוחל כאן ברמת ה-layout הגלובלי כך שהוא עקבי בכל מסכי האתר.
 * fixed מאחורי כל התוכן, aria-hidden, לא נוגע בעכבר.
 * דף הבית (/) מוציא את עצמו — יש לו כבר את אותו מרקם, מכויל ידנית למוקאפ.
 * דפי השיעורים (/lessons/*) מקבלים במקום ה-SVG את רקע הפרקמנט הייעודי
 * לסצינות השיעור — תמונה כפולת-גובה (מקור + עותק הפוך אנכית) כך ש-
 * repeat-y נראה רציף גם במסכים ארוכים, בלי תפר גלוי באמצע.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** רקע השיעורים זז יחד עם הגלילה אך באיטיות — שמינית (1/8) ממהירות התוכן — לאפקט פרלקסה עדין. */
const LESSON_BG_PARALLAX_FACTOR = 1 / 8;

export function SiteBackground() {
  const pathname = usePathname();
  const lessonBgRef = useRef<HTMLDivElement>(null);
  const isLessonPage = pathname?.startsWith('/lessons/') ?? false;

  useEffect(() => {
    if (!isLessonPage) return;
    const el = lessonBgRef.current;
    if (!el) return;

    let ticking = false;
    const applyOffset = () => {
      el.style.backgroundPositionY = `${-(window.scrollY * LESSON_BG_PARALLAX_FACTOR)}px`;
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyOffset);
    };

    applyOffset();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLessonPage]);

  if (pathname === '/') return null;

  if (isLessonPage) {
    return (
      <div
        ref={lessonBgRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 select-none bg-top bg-repeat-y bg-[length:100%_auto]"
        style={{ backgroundImage: "url('/assets/lessons/shared/scene-background/LESSON-SCENE-BG-TILE.png')" }}
      />
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 1024"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 -z-10 size-full select-none"
      fill="none"
    >
      <g className="stroke-border-strong" strokeWidth="1.2" opacity="0.2">
        <path d="M-40 60 C 120 20, 220 110, 380 80 S 640 10, 780 70" />
        <path d="M-40 120 C 140 80, 240 170, 400 140 S 660 70, 820 130" />
        <path d="M-40 180 C 160 140, 260 230, 420 200 S 680 130, 860 190" />
        <path d="M880 40 C 1000 10, 1100 90, 1240 60 S 1400 20, 1480 50" />
        <path d="M920 100 C 1040 70, 1140 150, 1280 120 S 1440 80, 1500 110" />
        <path d="M960 160 C 1080 130, 1180 210, 1320 180 S 1460 140, 1520 170" />
        <path d="M-40 280 C 100 250, 220 320, 380 290 S 620 240, 760 290" />
        <path d="M520 350 C 660 320, 780 390, 940 360 S 1200 310, 1340 360" />
        <path d="M900 250 C 1020 220, 1120 300, 1260 270 S 1420 230, 1500 260" />
        <path d="M-40 460 C 120 420, 220 510, 380 480 S 640 410, 780 470" />
        <path d="M-40 560 C 160 520, 260 610, 420 580 S 680 510, 860 570" />
        <path d="M880 500 C 1000 470, 1100 550, 1240 520 S 1400 480, 1480 510" />
        <path d="M-40 700 C 140 660, 240 750, 400 720 S 660 650, 820 710" />
        <path d="M900 660 C 1020 630, 1120 710, 1260 680 S 1420 640, 1500 670" />
        <path d="M-40 840 C 160 800, 260 890, 420 860 S 680 790, 860 850" />
        <path d="M880 820 C 1000 790, 1100 870, 1240 840 S 1400 800, 1480 830" />
        <path d="M-40 960 C 120 920, 220 1010, 380 980 S 640 910, 780 970" />
        <path d="M900 940 C 1020 910, 1120 990, 1260 960 S 1420 920, 1500 950" />
      </g>
    </svg>
  );
}
