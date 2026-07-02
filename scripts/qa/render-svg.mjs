#!/usr/bin/env node
/**
 * QA render check — turns the "render scene SVGs with sharp" habit into a
 * committed, repeatable check.
 *
 * Extracts the first <svg>…</svg> block from a scene .tsx (or reads a raw
 * .svg file), best-effort normalizes JSX → SVG, and rasterizes it to PNG at
 * mobile (375px) and desktop (1280px) widths under qa-output/.
 *
 * Use it to confirm a diagram READS even without its labels and that labels
 * aren't overlapping or sub-legible.
 *
 * Usage:
 *   node scripts/qa/render-svg.mjs src/components/lessons/topic-03/CombatNavScene.tsx
 *   node scripts/qa/render-svg.mjs path/to/diagram.svg
 *
 * NOTE: This is a smell-test, not a pixel-perfect render. JSX scenes use
 * {expressions}, className, and React components that a static extractor
 * cannot resolve — dynamic parts are dropped. If extraction looks wrong,
 * fall back to the Playwright MCP page screenshot (see visual-qa-reviewer).
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { basename, extname } from 'node:path';

const WIDTHS = [375, 1280];
const OUT_DIR = 'qa-output';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/qa/render-svg.mjs <scene.tsx | diagram.svg>');
  process.exit(1);
}

const raw = readFileSync(input, 'utf8');
const isSvgFile = extname(input).toLowerCase() === '.svg';

/** Pull the first top-level <svg …>…</svg> out of a source file. */
function extractSvg(src) {
  const open = src.search(/<svg[\s>]/i);
  const close = src.lastIndexOf('</svg>');
  if (open === -1 || close === -1 || close < open) return null;
  return src.slice(open, close + '</svg>'.length);
}

/** Best-effort JSX → SVG so sharp/librsvg can parse it. */
function jsxToSvg(svg) {
  return svg
    // strip JSX comments {/* … */}
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    // attr={"literal"} or attr={'literal'} → attr="literal"
    .replace(/=\{\s*(['"])([\s\S]*?)\1\s*\}/g, '=$1$2$1')
    // drop remaining dynamic attrs attr={…}
    .replace(/\s[\w:-]+=\{[^}]*\}/g, '')
    // drop {expression} children (labels/values we can't resolve)
    .replace(/\{[^{}]*\}/g, '')
    // React prop names → SVG/HTML attrs
    .replace(/\bclassName=/g, 'class=')
    .replace(/\bxmlnsXlink=/g, 'xmlns:xlink=')
    .replace(/\bxlinkHref=/g, 'xlink:href=')
    // camelCase presentation attrs that are actually valid SVG in kebab —
    // keep the common ones librsvg understands; leave others as-is.
    .trim();
}

let svg = isSvgFile ? raw : extractSvg(raw);
if (!svg) {
  console.error(`No <svg> block found in ${input}`);
  process.exit(2);
}
if (!isSvgFile) svg = jsxToSvg(svg);

// Ensure the root <svg> declares a namespace so librsvg accepts it.
if (!/xmlns=/.test(svg)) {
  svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

mkdirSync(OUT_DIR, { recursive: true });
const stem = basename(input).replace(/\.(tsx|jsx|svg)$/i, '');
const buf = Buffer.from(svg);

for (const width of WIDTHS) {
  const out = `${OUT_DIR}/${stem}@${width}.png`;
  try {
    await sharp(buf).resize({ width }).png().toFile(out);
    console.log(`✓ ${out}`);
  } catch (err) {
    console.error(`✗ ${width}px — sharp could not render (${err.message}).`);
    console.error('  Extraction may have produced invalid SVG; use Playwright MCP instead.');
    process.exitCode = 3;
  }
}
