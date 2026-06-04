import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrtGate } from '@/components/prt/PrtGate';
import { PrtPrototypeView } from '@/components/prt/PrtPrototypeView';
import { PRT_PROTOTYPES, getPrototype } from '@/lib/prt-prototypes';

/**
 * Per-prototype viewer inside the secret area. Static-generated for every
 * prototype via generateStaticParams, gated by the same client-side
 * password as /prt, and noindex so it stays unlisted.
 */
export const metadata: Metadata = {
  title: 'פרוטוטייפ',
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return PRT_PROTOTYPES.map((p) => ({ id: p.id }));
}

export default async function PrtPrototypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = getPrototype(id);
  if (!p) notFound();

  return (
    <PrtGate>
      <PrtPrototypeView p={p} />
    </PrtGate>
  );
}
