// Unify heading sizes by ROLE across every lesson scene.
//
// The base layer already applies `font-display tracking-tight` to all
// h1-h6, so what matters in className is: size, weight, leading,
// margin, and text-balance. We define ONE canonical class per role
// and rewrite every existing heading to match.
//
// ──────────────────────────────────────────────────────────────────
// Heading roles in the course
// ──────────────────────────────────────────────────────────────────
//
//   H1 — Lesson hero (HookScene only)
//     Already uniform across all 12 lessons (same `text-[clamp(...)]`
//     responsive clamp). LEFT ALONE.
//
//   H3 / Role A — Section group title
//     Introduces a labelled grid or list below. Example:
//       "3 עמודי האסטרטגיה של הצד החלש"
//       "5 טקטיקות של הצד החלש"
//       "2 כוחות שמעצבים כל הר בכוכב הזה"
//     Canonical: `font-display font-bold text-xl leading-tight mb-1`
//
//   H3 / Role B — Insight callout headline
//     Sits inside an info card with an icon + small eyebrow tag.
//     Example:
//       "השורה התחתונה: …" / "קו הנראות ההדדית"
//     Canonical: `font-display font-bold text-lg leading-tight mb-2`
//
//   H3 / Role C — Active selected-option title
//     The large color-tinted title shown for the currently selected
//     item in a tab-style selector (mountain type, scene of kill
//     chain, etc.). Always paired with `meta.color` via cn().
//     Canonical: `font-display font-bold text-2xl leading-tight`
//
//   H4 — Card / popup title
//     The bold lead inside any card content (onboarding popup,
//     pillar tile, engineering insight, etc.).
//     Canonical:
//       `font-display font-bold text-base sm:text-lg leading-tight
//        text-balance mb-2`
//
// ──────────────────────────────────────────────────────────────────
// What this codemod LEAVES alone
// ──────────────────────────────────────────────────────────────────
//   - The HookScene h1 (already uniform, very specific responsive clamp)
//   - PrinciplesScene's intentional small list-item h4
//     (`text-sm font-semibold mb-0.5`) — that's a deliberately
//     downscaled item title, not a card lead.
//   - RecapScene's CompletionBanner h3 (its own banner-scale headline).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

// Each replacement is [oldExact, newExact]. Order matters — more
// specific patterns first, so a generic "text-xl font-bold" doesn't
// swallow a more specific variant.
const REPLACEMENTS = [

  // ── Role A — Section group title ────────────────────────────────
  [
    'className="text-xl font-bold mb-1"',
    'className="font-display font-bold text-xl leading-tight mb-1"',
  ],
  [
    'className="text-xl font-bold mb-2"',
    'className="font-display font-bold text-xl leading-tight mb-2"',
  ],
  [
    'className="text-xl font-bold mb-4 text-center"',
    'className="font-display font-bold text-xl leading-tight mb-4 text-center"',
  ],
  // LevelsScene + EngineeringScene used the text-lg variant for this
  // same role — promote them to Role A's text-xl.
  [
    'className="font-display font-bold text-lg leading-tight mb-1.5"',
    'className="font-display font-bold text-xl leading-tight mb-1"',
  ],
  [
    'className="font-display font-bold text-lg leading-tight mb-1"',
    'className="font-display font-bold text-xl leading-tight mb-1"',
  ],
  // ContoursScene has a bare `text-xl font-bold` on a shape label.
  // It reads as a small section group title; promote to canonical
  // (preserves visual weight, adds the missing leading-tight).
  [
    'className="text-xl font-bold"',
    'className="font-display font-bold text-xl leading-tight"',
  ],

  // ── Role B — Insight callout headline ───────────────────────────
  // 10 instances already use this — normalize the class string so it
  // reads in the same order everywhere (size before mb / leading).
  [
    'className="font-display font-bold text-lg mb-2 leading-tight"',
    'className="font-display font-bold text-lg leading-tight mb-2"',
  ],
  // Topic-06 KillChainScene's "headline" variant uses mb-3 — keep
  // its bottom space but normalize the class order.
  [
    'className="font-display font-bold text-xl mb-3 leading-tight"',
    'className="font-display font-bold text-xl leading-tight mb-3"',
  ],

  // ── Role C — Active selected-option title (with meta.color) ─────
  // The "selected item" headline in tab-style scenes. Three files
  // already use text-2xl; promote the text-xl variants to match.
  [
    "className={cn('font-display font-bold text-xl leading-tight', meta.color)}",
    "className={cn('font-display font-bold text-2xl leading-tight', meta.color)}",
  ],
  [
    "className={cn('font-display font-bold text-xl leading-tight mb-1', meta.color)}",
    "className={cn('font-display font-bold text-2xl leading-tight mb-1', meta.color)}",
  ],
  // TacticalTerrainScene used a plain `text-2xl font-bold` —
  // normalize to the canonical with leading-tight.
  [
    "className={cn('text-2xl font-bold', meta.color)}",
    "className={cn('font-display font-bold text-2xl leading-tight', meta.color)}",
  ],

  // ── Role D — Card / popup title (h4) ────────────────────────────
  // AsymmetricScene pillar tile
  [
    'className="font-display font-bold leading-tight text-lg"',
    'className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2"',
  ],
  // MDOScene callout
  [
    'className="font-display font-bold text-base leading-tight"',
    'className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2"',
  ],
  // EngineeringScene popup (was missing text-balance)
  [
    'className="font-display font-bold text-base sm:text-lg leading-tight mb-2"',
    'className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2"',
  ],
  // TacticalTerrainScene step-selector item title (was text-lg)
  [
    "className={cn('font-display font-bold text-lg leading-tight', isActive && 'text-accent')}",
    "className={cn('font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2', isActive && 'text-accent')}",
  ],
  // VegetationScene selected-item title (h3 with text-xl + color
  // wrapped without mb) — same as Role C but no mb.
  [
    "className=\"font-display font-bold text-xl leading-tight\"",
    "className=\"font-display font-bold text-2xl leading-tight\"",
  ],
];

let totalChanges = 0;
let filesChanged = 0;
for (const topic of fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'))) {
  const dir = path.join(lessonsDir, topic);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    const p = path.join(dir, file);
    const orig = fs.readFileSync(p, 'utf8');
    let next = orig;
    let changes = 0;
    for (const [a, b] of REPLACEMENTS) {
      const before = next;
      next = next.split(a).join(b);
      if (next !== before) changes += (before.length - next.length === 0 ? 1 : 1);
    }
    if (next !== orig) {
      fs.writeFileSync(p, next, 'utf8');
      filesChanged++;
      totalChanges += changes;
      console.log(`  unified: ${topic}/${file}`);
    }
  }
}
console.log(`\n${filesChanged} file(s) updated.`);
