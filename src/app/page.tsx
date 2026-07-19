'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/landing/home/PageShell';
import { HomeHeader } from '@/components/landing/home/HomeHeader';
import { HomeHero } from '@/components/landing/home/HomeHero';
import { FeaturesRow } from '@/components/landing/home/FeaturesRow';
import { CoursePlanPanel } from '@/components/landing/home/CoursePlanPanel';
import { ProgressCard } from '@/components/landing/home/ProgressCard';
import { PrototypesSection } from '@/components/landing/home/PrototypesSection';

/**
 * דף הבית — מימוש סטטי pixel-accurate של design/mockup.png (1440px).
 * רכיבי V2 הישנים (landing/Hero וכו') נשארים על הדיסק אך אינם מיובאים יותר.
 */
export default function HomePage() {
  const [coursePlanExpanded, setCoursePlanExpanded] = useState(false);

  return (
    <PageShell>
      <HomeHeader />
      <HomeHero />
      <FeaturesRow />
      {/* פס תחתון: ProgressCard ראשון ב-DOM = ימין ויזואלי ב-RTL, כמו במוקאפ.
          כשפרקי הקורס נפתחים לרשת המלאה, הם דורסים גם את מקום ProgressCard. */}
      <div
        className={cn(
          'mb-4 mt-10 grid items-stretch gap-4 pb-4 transition-[grid-template-columns] duration-[350ms] ease-snap',
          coursePlanExpanded ? 'grid-cols-1' : 'grid-cols-[370px_minmax(0,1fr)]',
        )}
      >
        <AnimatePresence initial={false}>
          {!coursePlanExpanded && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: 'opacity' }}
            >
              <ProgressCard />
            </motion.div>
          )}
        </AnimatePresence>
        <CoursePlanPanel expanded={coursePlanExpanded} onExpandedChange={setCoursePlanExpanded} />
      </div>
      <PrototypesSection />
    </PageShell>
  );
}
