// Global label legibility fix across all lessons except topic-05 (already done).
// Same transformation as fix-labels-topic05.mjs:
//   text-[10px] | text-xs    →  text-sm
//   font-mono                →  font-display font-semibold
//   tracking-widest uppercase →  tracking-wider
//   text-fg-dim (in label ctx) → text-fg-muted
//   text-accent (in label ctx) → text-accent-hover
import fs from 'node:fs';
import path from 'node:path';

const TOPICS = ['01','02','03','04','06','07','08','09','10','11','12','13'];

const files = [];
for (const t of TOPICS) {
  const dir = 'src/components/lessons/topic-' + t;
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.tsx')) files.push(path.join(dir, entry).replace(/\\/g, '/'));
  }
}

let totalFiles = 0;
let totalChanges = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // Step 1 — collapse the eyebrow signature into the new style
  s = s.replace(
    /text-(?:\[10px\]|xs)\s+font-mono([^"]*?)tracking-widest\s+uppercase/g,
    (match, middle) => 'text-sm font-display font-semibold' + middle + 'tracking-wider',
  );

  // Step 2 — bump dim colors to readable equivalents in label contexts
  s = s.split('\n').map((line) => {
    if (!line.includes('font-display font-semibold') || !line.includes('tracking-wider')) {
      return line;
    }
    return line
      .replace(/\btext-fg-dim\b/g, 'text-fg-muted')
      .replace(/\btext-accent\b(?!-)/g, 'text-accent-hover');
  }).join('\n');

  if (s !== before) {
    const removed = (before.match(/font-mono/g) || []).length - (s.match(/font-mono/g) || []).length;
    fs.writeFileSync(f, s);
    totalFiles++;
    totalChanges += removed;
    console.log(f + ': ' + removed + ' labels upgraded');
  }
}

console.log('---');
console.log('Total: ' + totalChanges + ' labels upgraded across ' + totalFiles + ' files');
