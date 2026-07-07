import type { ReactNode } from 'react';

/**
 * PageShell — יריעת הקרם של דף הבית החדש (design/mockup.png).
 * קנבס paper-grad עם מרקם קווי גובה עדין + ציר מקווקו דקורטיבי.
 * מבטל את ה-padding הגלובלי של ה-AppHeader (שמוסתר ב-/).
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="relative -mt-[var(--header-h)] min-h-screen overflow-hidden bg-paper-grad">
        <ContourField />
        <div className="relative mx-auto max-w-[1440px] px-12 pt-8">{children}</div>
      </main>
    </>
  );
}

/** שכבת רקע דקורטיבית — קווי גובה + ציר מקווקו עם סימון ✕ (ללא טקסט, aria-hidden). */
function ContourField() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 1150"
      preserveAspectRatio="xMidYMin slice"
      fill="none"
    >
      {/* קווי גובה — ריכוז משמאל-למטה של אזור ההירו, כמו במוקאפ */}
      <g stroke="#C9A56B" strokeWidth="1.2" opacity="0.22">
        <path d="M-40 380 C 120 340, 220 430, 380 400 S 640 330, 780 390" />
        <path d="M-40 440 C 140 400, 240 490, 400 460 S 660 390, 820 450" />
        <path d="M-40 500 C 160 460, 260 550, 420 520 S 680 450, 860 510" />
        <path d="M-40 560 C 180 520, 280 600, 440 575 S 700 505, 900 565" />
        <path d="M880 120 C 1000 90, 1100 170, 1240 140 S 1400 100, 1480 130" />
        <path d="M920 180 C 1040 150, 1140 230, 1280 200 S 1440 160, 1500 190" />
        <path d="M60 80 C 180 50, 280 130, 420 100 S 620 60, 720 100" />
        <path d="M20 140 C 140 110, 240 190, 380 160 S 580 120, 700 160" />
        {/* המשך המרקם לאמצע ולתחתית העמוד, כמו במוקאפ */}
        <path d="M900 320 C 1020 290, 1120 370, 1260 340 S 1420 300, 1500 330" />
        <path d="M940 620 C 1060 590, 1160 660, 1300 630 S 1460 590, 1520 620" />
        <path d="M-40 660 C 100 630, 220 700, 380 670 S 620 620, 760 670" />
        <path d="M-40 900 C 120 870, 240 940, 400 910 S 660 860, 800 910" />
        <path d="M520 1060 C 660 1030, 780 1100, 940 1070 S 1200 1020, 1340 1070" />
        <path d="M-40 1120 C 120 1090, 260 1150, 420 1125 S 700 1070, 860 1120" />
      </g>
      {/* המשך הציר המקווקו — ה-✕ ותחילת הציר אפויים בנכס הדיורמה (נחתך מהמוקאפ);
          כאן רק ההמשך מעבר לקצה התמונה, לכיוון עמודת ה-CTA */}
      <g stroke="#D97E2B" opacity="0.75">
        <path
          d="M700 463 C 780 440, 860 435, 940 425 S 1050 388, 1072 395"
          strokeWidth="2"
          strokeDasharray="7 8"
        />
      </g>
    </svg>
  );
}
