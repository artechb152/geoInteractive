#!/usr/bin/env node
/**
 * RTL / legibility static smell-test — zero deps.
 *
 * Scans lesson scene files for:
 *   - absolute `right-` / `left-` Tailwind classes (should be start-/end-)
 *   - `text-left` / `text-right` (should be text-start / text-end)
 *   - `text-[Npx]` where N < MIN_FONT_PX (sub-legible labels)
 *
 * Overlap detection for hand-placed SVG is intentionally NOT attempted here —
 * rely on scripts/qa/render-svg.mjs + Playwright screenshots for that.
 *
 * Usage: node scripts/qa/rtl-audit.mjs
 * Exit code 1 if any offender is found (handy for a pre-commit / CI gate).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/components/lessons';
const MIN_FONT_PX = 4;

// className="…" or class="…" — but NOT logical props we accept.
const ABS_LR = /\b(?:right|left)-(?:\[?[\w./%-]+\]?)/g;      // right-0, left-[3px], -left-2 handled below
const NEG_ABS_LR = /-\b(?:right|left)-/g;
const TEXT_LR = /\btext-(?:left|right)\b/g;
const TINY_FONT = /text-\[(\d+(?:\.\d+)?)px\]/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const offenders = [];
let files;
try {
  files = walk(ROOT);
} catch {
  console.error(`Could not read ${ROOT} — run from the repo root.`);
  process.exit(2);
}

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const ln = i + 1;
    if (ABS_LR.test(line) || NEG_ABS_LR.test(line)) {
      offenders.push([file, ln, 'absolute right-/left- → use start-/end-', line.trim()]);
    }
    if (TEXT_LR.test(line)) {
      offenders.push([file, ln, 'text-left/right → use text-start/end', line.trim()]);
    }
    let m;
    TINY_FONT.lastIndex = 0;
    while ((m = TINY_FONT.exec(line))) {
      if (parseFloat(m[1]) < MIN_FONT_PX) {
        offenders.push([file, ln, `sub-legible font ${m[1]}px (< ${MIN_FONT_PX}px)`, line.trim()]);
      }
    }
    // reset stateful regexes
    ABS_LR.lastIndex = 0; NEG_ABS_LR.lastIndex = 0; TEXT_LR.lastIndex = 0;
  });
}

if (!offenders.length) {
  console.log('✓ RTL audit clean — no absolute right-/left-, text-left/right, or sub-legible fonts.');
  process.exit(0);
}

for (const [file, ln, issue, src] of offenders) {
  console.log(`${file}:${ln} — ${issue}`);
  console.log(`    ${src.slice(0, 120)}`);
}
console.log(`\n${offenders.length} offender(s) found.`);
process.exit(1);
