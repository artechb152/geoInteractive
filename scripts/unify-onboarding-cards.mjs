// Two related fixes for every OnboardingScene.tsx:
//
//  A. Diagram card background  (all 12 files, including topic-01)
//     The `surface-elevated` class on the diagram card uses
//     `bg-bg-elevated` (#FFFFFF — pure white). After we switched the
//     SVG to `preserveAspectRatio="xMidYMid meet"`, the letterbox bars
//     (the space above/below a diagram that's shorter than its card)
//     read as a white band against the cream page. Add `bg-bg`
//     (#FFFBF7) so the bars blend into the page background.
//
//  B. Accordion card styling  (the 11 non-topic-01 files)
//     Topic-01's OnboardingScene uses the shared `<Accordion>` from
//     `@/components/ui/accordion`, so its cards inherit the sage /
//     brand colour scheme: sage active border + drop-shadow,
//     brand-dark stripe, brand-dark active icon, brand-dark "למה זה
//     משנה" label with an accent bullet, font-display number, and a
//     proper bordered number badge.
//
//     The other 11 lessons were built earlier with raw <button> +
//     AnimatePresence and inherited an older, orange-saturated palette
//     (`bg-accent/5` active card, `shadow-glow`, accent-coloured
//     stripe, accent icon, mono-font number, "למה זה משנה" with no
//     dot). This pass aligns the styling without changing the
//     accordion's underlying structure (still a button, still
//     AnimatePresence) — only the Tailwind class strings.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

// Applied to every OnboardingScene (topic-01 included).
const SHARED = [
  [
    'surface-elevated relative overflow-hidden min-h-[280px]',
    'surface-elevated bg-bg relative overflow-hidden min-h-[280px]',
  ],
];

// Applied only to the 11 non-topic-01 files (topic-01 already uses
// the shared <Accordion> component which carries these classes by
// default).
const RESTYLE = [
  // Outer card wrapper: keep `surface overflow-hidden` but switch to
  // a longer transition so the colour/shadow swap matches topic-01's
  // ease.
  [
    'surface overflow-hidden transition-colors',
    'surface overflow-hidden transition-all duration-300 ease-snap',
  ],
  // Active / default card classes
  [
    "'border-accent shadow-glow bg-accent/5'",
    "'border-brand/45 bg-bg-elevated shadow-elevated'",
  ],
  [
    "'hover:border-border-strong'",
    "'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]'",
  ],
  // Number badge wrapper — needs a border + smoother transition
  [
    "'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',",
    "'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',",
  ],
  // Number badge state colours
  [
    "active ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'",
    "active ? 'bg-accent text-fg border-accent shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok border-status-ok/30' : 'bg-bg-accent text-fg-muted border-border'",
  ],
  // Number font — display (geometric) instead of mono
  ['font-mono text-sm font-bold', 'font-display text-sm font-bold'],
  // Active stripe — sage (brand-dark) instead of orange (accent)
  ['w-1 bg-accent rounded-l-full', 'w-1 bg-brand-dark rounded-l-full'],
  // Step label — display weight + drop orange-on-active
  [
    "'font-medium leading-tight', active && 'text-accent'",
    "'font-display font-semibold leading-tight transition-colors text-fg'",
  ],
  // Active icon + chevron colours — sage instead of orange
  [
    "active ? 'text-accent' : 'text-fg-dim'",
    "active ? 'text-brand-dark' : 'text-fg-dim'",
  ],
  [
    "expanded ? 'text-accent' : 'text-fg-dim'",
    "expanded ? 'text-brand-dark' : 'text-fg-dim'",
  ],
  // Content top border — sage tint to match the active card border
  ['border-t border-accent/20', 'border-t border-brand/20'],
  // "למה זה משנה" eyebrow — sage label + a small accent bullet
  [
    `<div className="text-sm font-display font-semibold text-accent-hover mt-3 mb-2 tracking-wider">
                          למה זה משנה
                        </div>`,
    `<div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                          למה זה משנה
                        </div>`,
  ],
];

let updated = 0;
for (const topic of fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'))) {
  const file = path.join(lessonsDir, topic, 'OnboardingScene.tsx');
  if (!fs.existsSync(file)) continue;

  const orig = fs.readFileSync(file, 'utf8');
  let next = orig;

  for (const [a, b] of SHARED) {
    if (next.includes(a)) next = next.split(a).join(b);
  }

  if (topic !== 'topic-01') {
    for (const [a, b] of RESTYLE) {
      if (next.includes(a)) next = next.split(a).join(b);
    }
  }

  if (next !== orig) {
    fs.writeFileSync(file, next, 'utf8');
    updated++;
    console.log(`  unified: ${topic}/OnboardingScene.tsx`);
  } else {
    console.log(`  skip:    ${topic}/OnboardingScene.tsx (no patterns matched)`);
  }
}
console.log(`\n${updated} OnboardingScene file(s) updated.`);
