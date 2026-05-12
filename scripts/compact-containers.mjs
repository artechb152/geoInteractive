// Second compact pass: scale containers/spacing to ~80% while leaving
// font sizes, line-heights, and text-* classes untouched.
//
// Only touches the design-system files I own (landing + lesson chrome).
// Does NOT touch interactive scenes or topic-specific layouts.
import fs from 'node:fs';

const PLAN = {
  'src/components/landing/Hero.tsx': [
    ['pt-20 pb-10 md:pt-24 md:pb-16', 'pt-16 pb-8 md:pt-20 md:pb-12'],
    ['max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.05fr_1fr] items-center gap-8 lg:gap-12', 'max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.05fr_1fr] items-center gap-6 lg:gap-10'],
    ['mb-5 inline-flex items-center gap-3 flex-wrap', 'mb-4 inline-flex items-center gap-3 flex-wrap'],
    ['mt-5 max-w-xl text-sm md:text-base text-fg-muted', 'mt-4 max-w-xl text-sm md:text-base text-fg-muted'],
    ['mt-6 flex flex-wrap gap-3', 'mt-5 flex flex-wrap gap-2.5'],
    ['px-5 py-2.5 rounded-md font-medium text-fg bg-accent', 'px-4 py-2 rounded-md font-medium text-fg bg-accent'],
    ['px-5 py-2.5 rounded-md font-medium text-brand-dark', 'px-4 py-2 rounded-md font-medium text-brand-dark'],
    ['mt-8 grid grid-cols-3 max-w-md gap-3 sm:gap-4', 'mt-6 grid grid-cols-3 max-w-sm gap-2.5 sm:gap-3'],
    ['px-3 py-3 sm:px-4 sm:py-4', 'px-3 py-2.5 sm:px-3.5 sm:py-3'],
    ['aspect-square w-full max-w-[320px] sm:max-w-[380px]', 'aspect-square w-full max-w-[260px] sm:max-w-[310px]'],
  ],

  'src/components/landing/Features.tsx': [
    ['py-14 md:py-20', 'py-10 md:py-14'],
    ['max-w-6xl mx-auto px-6', 'max-w-5xl mx-auto px-6'],
    ['mt-4 text-sm md:text-base text-fg-muted', 'mt-3 text-sm md:text-base text-fg-muted'],
    ['mt-10 grid gap-4 md:gap-5', 'mt-8 grid gap-3.5 md:gap-4'],
    ['p-5 md:p-6', 'p-4 md:p-5'],
    ['mb-4', 'mb-3'],
  ],

  'src/components/landing/FAQ.tsx': [
    ['py-14 md:py-20', 'py-10 md:py-14'],
    ['max-w-4xl mx-auto px-6', 'max-w-3xl mx-auto px-6'],
    ['mt-4 text-sm md:text-base text-fg-muted', 'mt-3 text-sm md:text-base text-fg-muted'],
    ['mt-10 flex flex-col gap-2.5', 'mt-8 flex flex-col gap-2'],
    ['px-4 py-4 md:px-5 md:py-5', 'px-4 py-3.5 md:px-5 md:py-4'],
    ['px-4 md:px-5 pb-4 md:pb-5 pt-1', 'px-4 md:px-5 pb-3.5 md:pb-4 pt-1'],
  ],

  'src/components/lesson/LessonShell.tsx': [
    ['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1', 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1'],
    ['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 relative', 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 relative'],
    ['px-3 sm:px-4 py-2.5 text-sm font-medium', 'px-3 sm:px-4 py-2 text-sm font-medium'],
    ['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-8', 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6'],
    ['bg-bg-elevated/40 mt-10', 'bg-bg-elevated/40 mt-8'],
    ['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3', 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5'],
    ['p-4 hover:border-brand/40', 'p-3.5 hover:border-brand/40'],
    ['p-4 hover:bg-accent', 'p-3.5 hover:bg-accent'],
    ['p-4 hover:bg-brand', 'p-3.5 hover:bg-brand'],
  ],

  'src/components/lesson/LessonContent.tsx': [
    ['space-y-10', 'space-y-8'],
    ['header className="space-y-4"', 'header className="space-y-3.5"'],
    ['p-5 md:p-6', 'p-4 md:p-5'],
    ['space-y-3', 'space-y-2.5'],
    ['<section key={i} className="space-y-4">', '<section key={i} className="space-y-3.5">'],
    ['prose-content space-y-3.5', 'prose-content space-y-3'],
  ],

  'src/components/lesson/SceneHeader.tsx': [
    ['max-w-4xl mb-8', 'max-w-3xl mb-6'],
    ['text-sm md:text-[15px] font-display font-semibold tracking-wider mb-4', 'text-sm md:text-[15px] font-display font-semibold tracking-wider mb-3'],
    ['mt-4 text-fg-muted text-sm sm:text-base lg:text-lg leading-relaxed text-pretty', 'mt-3 text-fg-muted text-sm sm:text-base lg:text-lg leading-relaxed text-pretty'],
  ],

  'src/components/interactive/Quiz.tsx': [
    ['space-y-5', 'space-y-4'],
    ['<ol className="space-y-4">', '<ol className="space-y-3">'],
    ['p-4 md:p-5 transition-colors duration-300', 'p-3.5 md:p-4 transition-colors duration-300'],
    ['gap-3.5 items-start mb-4', 'gap-3 items-start mb-3.5'],
    ['space-y-2 pr-[3rem] md:pr-[3.5rem]', 'space-y-1.5 pr-[2.75rem] md:pr-[3.25rem]'],
    ['w-full text-right px-4 py-3 rounded-xl', 'w-full text-right px-3.5 py-2.5 rounded-xl'],
    ['p-3.5 rounded-xl text-sm md:text-[15px]', 'p-3 rounded-xl text-sm md:text-[15px]'],
    ['rounded-2xl border border-border bg-bg-elevated p-4 md:p-5 flex flex-wrap', 'rounded-2xl border border-border bg-bg-elevated p-3.5 md:p-4 flex flex-wrap'],
  ],

  'src/components/lesson/IntelCard.tsx': [
    ['p-4 md:p-5', 'p-3.5 md:p-4'],
    ['mt-2.5 mb-3 inline-block h-[3px] w-8', 'mt-2 mb-2.5 inline-block h-[3px] w-8'],
    ['mt-4 flex items-center gap-1.5', 'mt-3.5 flex items-center gap-1.5'],
  ],

  'src/components/interactive/InteractionPlaceholder.tsx': [
    ['space-y-5', 'space-y-4'],
    ['p-8 text-center', 'p-6 text-center'],
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
