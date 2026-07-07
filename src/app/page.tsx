import { PageShell } from '@/components/landing/home/PageShell';
import { HomeHeader } from '@/components/landing/home/HomeHeader';
import { HomeHero } from '@/components/landing/home/HomeHero';
import { FeaturesRow } from '@/components/landing/home/FeaturesRow';
import { CoursePlanPanel } from '@/components/landing/home/CoursePlanPanel';
import { ProgressCard } from '@/components/landing/home/ProgressCard';

/**
 * דף הבית — מימוש סטטי pixel-accurate של design/mockup.png (1440px).
 * ללא פונקציונליות בשלב זה; רכיבי V2 הישנים (landing/Hero וכו') נשארים
 * על הדיסק אך אינם מיובאים יותר.
 */
export default function HomePage() {
  return (
    <PageShell>
      <HomeHeader />
      <HomeHero />
      <FeaturesRow />
      {/* פס תחתון: ProgressCard ראשון ב-DOM = ימין ויזואלי ב-RTL, כמו במוקאפ */}
      <div className="mb-4 mt-10 grid grid-cols-[370px_minmax(0,1fr)] items-stretch gap-4 pb-4">
        <ProgressCard />
        <CoursePlanPanel />
      </div>
    </PageShell>
  );
}
