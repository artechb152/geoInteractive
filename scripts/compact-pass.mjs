// One-shot compact pass: reduce padding, clamps, gaps, font sizes across
// the design-system files so the site fits a typical laptop without zoom-out.
// Surgical string replacements — never touches interactive scene logic.
import fs from 'node:fs';

const PLAN = {
  'src/components/landing/Hero.tsx': [
    ['pt-24 pb-16 md:pt-28 md:pb-24', 'pt-20 pb-10 md:pt-24 md:pb-16'],
    ['gap-10 lg:gap-16', 'gap-8 lg:gap-12'],
    ['mb-6 inline-flex items-center gap-3 flex-wrap', 'mb-5 inline-flex items-center gap-3 flex-wrap'],
    ['text-[clamp(1.25rem,2.4vw,2rem)] font-medium text-fg-muted mb-2 tracking-[0.04em]', 'text-[clamp(1rem,2vw,1.5rem)] font-medium text-fg-muted mb-2 tracking-[0.04em]'],
    [`fontSize: 'clamp(3rem, 10vw, 8rem)',`, `fontSize: 'clamp(2.25rem, 7vw, 5rem)',`],
    ['text-[clamp(1.125rem,2.4vw,2.25rem)] font-medium text-fg-muted tracking-[0.02em]', 'text-[clamp(1rem,2vw,1.625rem)] font-medium text-fg-muted tracking-[0.02em]'],
    ['mt-7 max-w-xl text-base md:text-lg text-fg-muted', 'mt-5 max-w-xl text-sm md:text-base text-fg-muted'],
    ['mt-8 flex flex-wrap gap-3', 'mt-6 flex flex-wrap gap-3'],
    ['mt-10 grid grid-cols-3 max-w-lg gap-3 sm:gap-4', 'mt-8 grid grid-cols-3 max-w-md gap-3 sm:gap-4'],
    ['font-display font-bold text-xl sm:text-2xl text-fg', 'font-display font-bold text-lg sm:text-xl text-fg'],
    ['aspect-square w-full max-w-[460px] sm:max-w-[520px]', 'aspect-square w-full max-w-[320px] sm:max-w-[380px]'],
  ],

  'src/components/landing/Features.tsx': [
    ['py-20 md:py-28', 'py-14 md:py-20'],
    ['text-[clamp(1.875rem,4vw,3rem)]', 'text-[clamp(1.5rem,3vw,2.25rem)]'],
    ['mt-5 text-base md:text-lg text-fg-muted', 'mt-4 text-sm md:text-base text-fg-muted'],
    ['mt-12 grid gap-5 md:gap-6', 'mt-10 grid gap-4 md:gap-5'],
    ['p-6 md:p-7', 'p-5 md:p-6'],
  ],

  'src/components/landing/FAQ.tsx': [
    ['py-20 md:py-28', 'py-14 md:py-20'],
    ['text-[clamp(1.875rem,4vw,3rem)]', 'text-[clamp(1.5rem,3vw,2.25rem)]'],
    ['mt-5 text-base md:text-lg text-fg-muted', 'mt-4 text-sm md:text-base text-fg-muted'],
    ['px-5 py-5 md:px-6 md:py-6', 'px-4 py-4 md:px-5 md:py-5'],
    ['flex-1 min-w-0 font-display font-semibold text-base md:text-lg', 'flex-1 min-w-0 font-display font-semibold text-[15px] md:text-base'],
    ['px-5 md:px-6 pb-5 md:pb-6 pt-1', 'px-4 md:px-5 pb-4 md:pb-5 pt-1'],
    ['mt-12 flex flex-col gap-3', 'mt-10 flex flex-col gap-2.5'],
  ],

  'src/components/landing/Navbar.tsx': [
    ['h-16 flex items-center', 'h-14 flex items-center'],
  ],

  'src/components/lesson/LessonShell.tsx': [
    ['py-3 text-sm font-medium', 'py-2.5 text-sm font-medium'],
    ['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-8'],
    ['py-6 grid grid-cols-1', 'py-5 grid grid-cols-1'],
    ['bg-bg-elevated/40 mt-12', 'bg-bg-elevated/40 mt-10'],
  ],

  'src/components/lesson/LessonContent.tsx': [
    ['space-y-14', 'space-y-10'],
    ['<header className="space-y-5">', '<header className="space-y-4">'],
    ['text-[clamp(2rem,4.5vw,3.25rem)]', 'text-[clamp(1.625rem,3.5vw,2.5rem)]'],
    ['text-base md:text-lg text-fg-muted text-pretty leading-relaxed max-w-3xl', 'text-sm md:text-base text-fg-muted text-pretty leading-relaxed max-w-3xl'],
    ['p-6 md:p-7', 'p-5 md:p-6'],
    ['space-y-3.5', 'space-y-3'],
    ['size-7 shrink-0 mt-0.5 rounded-full bg-brand/12 border border-brand/30 text-brand-dark font-display font-bold text-sm', 'size-6 shrink-0 mt-0.5 rounded-full bg-brand/12 border border-brand/30 text-brand-dark font-display font-bold text-xs'],
    ['text-fg leading-relaxed text-[15px] md:text-base text-pretty', 'text-fg leading-relaxed text-sm md:text-[15px] text-pretty'],
    ['text-[clamp(1.5rem,2.6vw,2rem)]', 'text-[clamp(1.25rem,2.2vw,1.625rem)]'],
    ['prose-content space-y-4 text-fg leading-relaxed text-[17px]', 'prose-content space-y-3.5 text-fg leading-relaxed text-[15px]'],
    ['<section key={i} className="space-y-5">', '<section key={i} className="space-y-4">'],
  ],

  'src/components/lesson/SceneHeader.tsx': [
    ['max-w-4xl mb-10', 'max-w-4xl mb-8'],
    ['text-sm md:text-[15px] font-display font-semibold tracking-wider mb-5', 'text-sm md:text-[15px] font-display font-semibold tracking-wider mb-4'],
    ['text-[clamp(1.75rem,4.5vw,3.5rem)]', 'text-[clamp(1.375rem,3vw,2.375rem)]'],
    ['mt-5 text-fg-muted text-base sm:text-lg lg:text-xl leading-relaxed text-pretty', 'mt-4 text-fg-muted text-sm sm:text-base lg:text-lg leading-relaxed text-pretty'],
  ],

  'src/components/interactive/Quiz.tsx': [
    ['space-y-7', 'space-y-5'],
    ['text-[clamp(1.5rem,2.6vw,2rem)]', 'text-[clamp(1.25rem,2.2vw,1.625rem)]'],
    ['p-5 md:p-6 transition-colors duration-300', 'p-4 md:p-5 transition-colors duration-300'],
    ['size-8 shrink-0 rounded-full font-display font-bold text-sm', 'size-7 shrink-0 rounded-full font-display font-bold text-xs'],
    ['font-display font-semibold text-[15px] md:text-base leading-snug text-fg pt-0.5 text-balance', 'font-display font-semibold text-sm md:text-[15px] leading-snug text-fg pt-0.5 text-balance'],
    ['p-5 md:p-6 flex flex-wrap items-center justify-between', 'p-4 md:p-5 flex flex-wrap items-center justify-between'],
    ['size-12 rounded-full', 'size-10 rounded-full'],
    ['font-display font-bold text-2xl text-fg leading-tight', 'font-display font-bold text-xl text-fg leading-tight'],
  ],

  'src/components/interactive/InteractionPlaceholder.tsx': [
    ['space-y-6', 'space-y-5'],
    ['text-3xl font-bold', 'text-2xl font-bold'],
    ['p-10 text-center', 'p-8 text-center'],
    ['text-7xl mb-4', 'text-6xl mb-3'],
  ],

  'src/components/lesson/IntelCard.tsx': [
    ['p-5 md:p-6', 'p-4 md:p-5'],
    ['text-base md:text-lg leading-snug text-balance text-fg', 'text-[15px] md:text-base leading-snug text-balance text-fg'],
    ['mt-3 mb-3.5 inline-block h-[3px] w-9', 'mt-2.5 mb-3 inline-block h-[3px] w-8'],
    ['mt-5 flex items-center gap-1.5', 'mt-4 flex items-center gap-1.5'],
  ],
};

let totalFiles = 0;
let totalReps = 0;
const missing = [];

for (const [file, pairs] of Object.entries(PLAN)) {
  if (!fs.existsSync(file)) {
    console.log('SKIP (not found): ' + file);
    continue;
  }
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [oldStr, newStr] of pairs) {
    if (s.includes(oldStr)) {
      s = s.split(oldStr).join(newStr);
      n++;
    } else {
      missing.push(file + ' :: ' + oldStr.slice(0, 70));
    }
  }
  if (n > 0) {
    fs.writeFileSync(file, s);
    console.log(file + ': ' + n + '/' + pairs.length + ' replacements');
    totalFiles++;
    totalReps += n;
  }
}

console.log('---');
console.log('Total: ' + totalReps + ' replacements across ' + totalFiles + ' files');
if (missing.length > 0) {
  console.log('Missed patterns (' + missing.length + '):');
  missing.forEach((m) => console.log('  ' + m));
}
