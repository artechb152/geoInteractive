import type { Metadata } from 'next';
import { PrtGate } from '@/components/prt/PrtGate';
import { PrtShowcase } from '@/components/prt/PrtShowcase';

/**
 * Secret prototype-review page. Reachable only by typing /prt directly —
 * it is linked from nowhere on the site and marked noindex so it won't be
 * crawled. Content is behind a client-side password gate (PrtGate); a
 * floating notes button (NotesWidget, mounted by the gate) lets visitors
 * send feedback straight to the owner.
 */
export const metadata: Metadata = {
  title: 'פרוטוטייפים לבדיקה',
  robots: { index: false, follow: false },
};

export default function PrtPage() {
  return (
    <PrtGate>
      <PrtShowcase />
    </PrtGate>
  );
}
