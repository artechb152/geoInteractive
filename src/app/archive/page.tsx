import type { Metadata } from 'next';
import { ArchiveGate } from '@/components/archive/ArchiveGate';
import { ArchiveLessonGrid } from '@/components/archive/ArchiveLessonGrid';

/**
 * ארכיון השיעורים — נושאים שהוצאו מהמסלול הציבורי (ARCHIVED_TOPIC_IDS).
 * מוגן בסיסמה בצד הלקוח (ArchiveGate) ומסומן noindex.
 * הרוחב והריפוד תואמים ל-PageShell של דף הבית, כך שהרשת זהה לרשת הפתוחה שם.
 */
export const metadata: Metadata = {
  title: 'ארכיון השיעורים · גיאוגרפיה צבאית',
  robots: { index: false, follow: false },
};

export default function ArchivePage() {
  return (
    <ArchiveGate>
      <main className="relative mx-auto w-full max-w-[1800px] px-12 py-10 xl:px-20 2xl:px-28">
        <ArchiveLessonGrid />
      </main>
    </ArchiveGate>
  );
}
