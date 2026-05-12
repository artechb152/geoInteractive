// Unify SVG <text> label styling across all lesson visualizations to match
// topic-05's pattern:
//   - font-mono → font-display font-bold (Rubik bold, readable Hebrew)
//   - Drop opacity-X (the white stroke outline below does the readability work)
//   - Add paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round"
//     to give each label a crisp white halo that lifts it off any busy background.
//
// Only affects <text> elements that currently contain font-mono — leaves
// non-label SVG text untouched.
import fs from 'node:fs';
import path from 'node:path';

const TOPICS = ['01','02','03','04','05','06','07','08','09','10','11','12','13'];

const files = [];
for (const t of TOPICS) {
  const dir = 'src/components/lessons/topic-' + t;
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.tsx')) files.push(path.join(dir, entry).replace(/\\/g, '/'));
  }
}

const TEXT_OPEN = /<text\b([\s\S]*?)(\/?>)/g;

let totalFiles = 0;
let totalLabels = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  let count = 0;

  s = s.replace(TEXT_OPEN, (match, attrs, close) => {
    // Only target labels — i.e. <text> tags that currently use font-mono
    if (!/font-mono/.test(attrs)) return match;

    let newAttrs = attrs;

    // font-mono → font-display font-bold
    newAttrs = newAttrs.replace(/\bfont-mono\b/g, 'font-display font-bold');

    // Drop opacity-N (white outline replaces it for readability)
    newAttrs = newAttrs.replace(/\s+opacity-\d+/g, '');

    // Add paintOrder + white stroke if not already present
    if (!/paintOrder/.test(newAttrs)) {
      // Strip trailing whitespace before injecting
      newAttrs = newAttrs.replace(/\s*$/, '');
      newAttrs +=
        '\n        paintOrder="stroke"\n        stroke="#ffffff"\n        strokeWidth="0.9"\n        strokeLinejoin="round"\n      ';
    }

    count++;
    return '<text' + newAttrs + close;
  });

  if (s !== before) {
    fs.writeFileSync(f, s);
    totalFiles++;
    totalLabels += count;
    console.log(f + ': ' + count + ' SVG labels unified');
  }
}

console.log('---');
console.log('Total: ' + totalLabels + ' SVG labels unified across ' + totalFiles + ' files');
