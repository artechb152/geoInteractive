import { BrandEmblem } from '@/components/ui/BrandEmblem';

/**
 * HomeHeader — כותרת פנימית של דף הבית (design/mockup.png, פס עליון).
 * מותג + לוגו האתר (BrandEmblem) בימין (inline-start).
 */
export function HomeHeader() {
  return (
    <header className="relative z-10 flex items-start justify-between">
      {/* מותג — ילד ראשון = ימין ויזואלי ב-RTL */}
      <div className="flex items-center gap-4">
        <BrandEmblem className="size-16 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] font-extrabold leading-none text-olive-ink">
            גיאוגרפיה צבאית
          </span>
        </div>
      </div>
    </header>
  );
}
