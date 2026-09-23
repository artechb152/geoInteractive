import type { Metadata } from 'next';
import { TrafficabilityDriveLab } from '@/components/lessons/topic-04/drive/TrafficabilityDriveLab';

/**
 * Standalone review page for the trafficability driving simulation prototype
 * (topic-04, "עבירות וניידות"). Not linked from the lesson yet — the lesson's
 * own TrafficabilityScene.tsx stays untouched until this is reviewed and
 * approved for integration.
 */
export const metadata: Metadata = {
  title: 'הדמיית נהיגת שטח · מעבדה · גיאוגרפיה צבאית',
  description: 'פרוטוטייפ לבדיקה: הדמיית נהיגה תלת-ממדית להשוואת עבירות בין ארבעה סוגי קרקע.',
  robots: { index: false, follow: false },
};

export default function TrafficabilityDrivePage() {
  return <TrafficabilityDriveLab />;
}
