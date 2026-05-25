/**
 * Static metadata for the 4 recap-format demos. Lives in its own
 * module (not `DemoShell.tsx`) so it can be safely imported from
 * server components — DemoShell is a client component, and Next.js
 * App Router rejects non-component value imports from
 * `'use client'` modules when read from the server side.
 */

export type DemoId = 'match' | 'flashcards' | 'sort' | 'quiz';

export const DEMOS: { id: DemoId; href: string; title: string; tagline: string }[] = [
  {
    id: 'match',
    href: '/recap-demos/match',
    title: 'חיבור בקו',
    tagline: 'מתח קו בין הגדרה למושג המתאים.',
  },
  {
    id: 'flashcards',
    href: '/recap-demos/flashcards',
    title: 'כרטיסי זיכרון',
    tagline: 'הפוך כרטיס, סמן "ידעתי" או "צריך לחזור".',
  },
  {
    id: 'sort',
    href: '/recap-demos/sort',
    title: 'סידור לקטגוריות',
    tagline: 'גרור כל מושג לדלי-התוכן שלו.',
  },
  {
    id: 'quiz',
    href: '/recap-demos/quiz',
    title: 'חידון מהיר',
    tagline: 'לכל הגדרה — בחר את המושג הנכון.',
  },
];
