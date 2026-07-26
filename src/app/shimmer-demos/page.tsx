import Link from 'next/link';
import { LoadingImageDemo } from '@/components/shimmer-demos/ShimmerVariants';
import { EarthShimmerImage } from '@/components/ui/EarthShimmerImage';

export const metadata = {
  title: 'דמו · אפקט Shimmer לטעינת תמונות · גיאוגרפיה צבאית',
  robots: { index: false, follow: false },
};

const DEMO_TILES = [
  { src: '/assets/isometric/lesson-02-map-reading.png', alt: 'תצוגה מקדימה — קריאת מפה', delayMs: 2400 },
  { src: '/assets/isometric/lesson-05-mobility.png', alt: 'תצוגה מקדימה — ניידות', delayMs: 1800 },
];

const LIVE_TILES = [
  { src: '/assets/isometric/lesson-04-landforms.png', alt: 'תצוגה מקדימה — תבליט קרקע' },
  { src: '/assets/isometric/lesson-09-chokepoints.png', alt: 'תצוגה מקדימה — צווארי בקבוק' },
];

export default function ShimmerDemosPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0 text-sm text-fg-muted transition-colors hover:text-accent">
            חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:py-16 lg:px-8">
        <div className="mb-3 text-[11px] font-display font-semibold uppercase tracking-wider text-accent">
          דמו · אפקט טעינת תמונות
        </div>
        <h1 className="mb-3 text-balance font-display text-3xl font-bold leading-tight text-fg md:text-5xl">
          Shimmer &quot;גלובוס וויירפריים&quot; לטעינת תמונות
        </h1>
        <p className="mb-10 max-w-3xl text-base leading-relaxed text-fg-muted md:text-lg">
          האופציה שנבחרה: גלובוס קווי-מתאר במרכז כרטיס pine כהה, עם שכבת שימר עדינה
          שעוברת מעליו. בטוקנים הקיימים של האתר (pine-grad · tanline).
        </p>

        <section className="surface-elevated mb-10 flex flex-col gap-5 p-5 md:p-6">
          <div>
            <h2 className="font-display text-xl font-bold text-fg md:text-2xl">1. הדמיה עם עיכוב מכוון</h2>
            <p className="mt-1 text-sm text-fg-muted md:text-base">
              עיכוב מלאכותי כדי לראות את האפקט בפעולה בלי תלות במהירות הרשת האמיתית.
              ריחוף על אריח מציג כפתור &quot;הפעל שוב&quot;.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            {DEMO_TILES.map((tile) => (
              <LoadingImageDemo
                key={tile.src}
                variant={3}
                src={tile.src}
                alt={tile.alt}
                delayMs={tile.delayMs}
                className="aspect-[4/3]"
              />
            ))}
          </div>
        </section>

        <section className="surface-elevated flex flex-col gap-5 p-5 md:p-6">
          <div>
            <h2 className="font-display text-xl font-bold text-fg md:text-2xl">
              2. הקומפוננטה האמיתית — <code className="text-base font-mono text-accent">EarthShimmerImage</code>
            </h2>
            <p className="mt-1 text-sm text-fg-muted md:text-base">
              ללא עיכוב מדומה: השימר מוצג ברירת מחדל מרגע העלייה לאוויר — עוד לפני
              שהתמונה האמיתית סיימה להיטען מהרשת — ונעלם רק כשה-<code className="font-mono">onLoad</code> של
              התמונה יורה בפועל. רענון הדף (Ctrl/Cmd+Shift+R לעקיפת cache) יראה זאת בבירור.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            {LIVE_TILES.map((tile) => (
              <EarthShimmerImage
                key={tile.src}
                src={tile.src}
                alt={tile.alt}
                fill
                sizes="(min-width: 1024px) 320px, 45vw"
                wrapperClassName="aspect-[4/3] rounded-2xl border border-border/60"
              />
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-fg-dim">
          עמוד דמו פנימי · הקומפוננטה לשימוש בפרודקשן נמצאת ב-src/components/ui/EarthShimmerImage.tsx
        </p>
      </main>
    </div>
  );
}
