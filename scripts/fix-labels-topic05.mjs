// Fix legibility of small uppercase mono labels across topic-05.
// Targets section headers, control labels, and metadata that currently render
// in `text-[10px] font-mono ... tracking-widest uppercase` (the old eyebrow
// style) — these are nearly invisible on the cream page.
//
// Transformation:
//   text-[10px] | text-xs   →  text-sm
//   font-mono                →  font-display font-semibold
//   tracking-widest uppercase →  tracking-wider
//   text-fg-dim (in label ctx) → text-fg-muted
//   text-accent (in label ctx) → text-accent-hover
//
// All text content untouched. Only Tailwind class strings are rewritten.
import fs from 'node:fs';

const FILES = [
  'src/components/lessons/topic-05/HookScene.tsx',
  'src/components/lessons/topic-05/OnboardingScene.tsx',
  'src/components/lessons/topic-05/TrafficabilityScene.tsx',
  'src/components/lessons/topic-05/EngineeringScene.tsx',
  'src/components/lessons/topic-05/CoverScene.tsx',
  'src/components/lessons/topic-05/VegetationScene.tsx',
  'src/components/lessons/topic-05/RecapScene.tsx',
];

let totalFiles = 0;
let totalChanges = 0;

for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // Step 1 — collapse the whole eyebrow signature into the new readable style.
  // Captures middle content (margins, color classes) and preserves them.
  s = s.replace(
    /text-(?:\[10px\]|xs)\s+font-mono([^"]*?)tracking-widest\s+uppercase/g,
    (match, middle) => 'text-sm font-display font-semibold' + middle + 'tracking-wider',
  );

  // Step 2 — line-by-line: any line that now contains the new signature,
  // bump dim colors to readable equivalents.
  s = s.split('\n').map((line) => {
    if (!line.includes('font-display font-semibold') || !line.includes('tracking-wider')) {
      return line;
    }
    return line
      .replace(/\btext-fg-dim\b/g, 'text-fg-muted')
      .replace(/\btext-accent\b(?!-)/g, 'text-accent-hover');
  }).join('\n');

  if (s !== before) {
    // Rough count: each `font-mono` removed = one label fixed
    const removed = (before.match(/font-mono/g) || []).length - (s.match(/font-mono/g) || []).length;
    fs.writeFileSync(f, s);
    totalFiles++;
    totalChanges += removed;
    console.log(f + ': ' + removed + ' labels upgraded');
  }
}

console.log('---');
console.log('Total: ' + totalChanges + ' labels upgraded across ' + totalFiles + ' files');
