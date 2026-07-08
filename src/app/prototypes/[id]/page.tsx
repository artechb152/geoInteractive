import { notFound } from 'next/navigation';
import { PrototypeViewer } from './PrototypeViewer';

/**
 * Dedicated page per prototype. The actual prototype is a pre-built
 * SPA under `public/embeds/<id>/`. The iframe points at the directory
 * path (not `index.html` — Vercel's clean-URL routing 404s literal
 * `*.html` requests in production). This page just
 * wraps it in our site's chrome (the global Navbar comes from
 * `app/layout.tsx`), adds a back-to-home link, and gives the iframe
 * the full remaining viewport.
 *
 * Static-generated for both prototypes via `generateStaticParams`.
 */

type Prototype = {
  id: string;
  title: string;
  tagline: string;
  embedPath: string;
};

const PROTOTYPES: Prototype[] = [
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    embedPath: '/embeds/terrain-3d/',
  },
  {
    id: 'terrain-overlay',
    title: 'שכבות מידע על מפת שטח',
    tagline: 'הלבשת שכבות גיאו־מידע על מפה',
    embedPath: '/embeds/terrain-overlay/',
  },
  {
    id: 'valley-crossing-3d',
    title: 'סימולטור ניתוח שטח — מעבר גיא',
    tagline: 'תרחיש מודרך: קרקע גבוהה, תצפית אויב, צוואר בקבוק וגשר',
    embedPath: '/embeds/valley-crossing-3d/',
  },
];

export function generateStaticParams() {
  return PROTOTYPES.map((p) => ({ id: p.id }));
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = PROTOTYPES.find((x) => x.id === id);
  if (!p) notFound();

  return <PrototypeViewer title={p.title} tagline={p.tagline} embedPath={p.embedPath} />;
}
