// Replace the inline "עכשיו אתם מוכנים" motion.div callout in all 13
// OnboardingScene files with the new shared <ReadyCallout> component.
//
// Extracts the original eyebrow text → passes as `title` prop.
// Extracts the original <p> body text → passes as children.
import fs from 'node:fs';

const TOPICS = ['01','02','03','04','05','06','07','08','09','10','11','12','13'];
const IMPORT_LINE = "import { ReadyCallout } from '@/components/lesson/ReadyCallout';";

// Matches the entire callout block, identified by its distinct initial+y:14 reveal.
const calloutRe = /<motion\.div\s+initial=\{\{ opacity: 0, y: 14 \}\}[\s\S]*?<\/motion\.div>/g;

// Eyebrow text inside the inner div.
const eyebrowRe = /<div className="text-xs font-mono text-accent (?:mb-1\.5|mt-3 mb-2) tracking-widest uppercase">([\s\S]*?)<\/div>/;

// Body text inside the <p> element.
const bodyRe = /<p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">([\s\S]*?)<\/p>/;

let totalUpdated = 0;
let totalSkipped = 0;

for (const t of TOPICS) {
  const fp = `src/components/lessons/topic-${t}/OnboardingScene.tsx`;
  if (!fs.existsSync(fp)) continue;
  let s = fs.readFileSync(fp, 'utf8');
  const before = s;

  s = s.replace(calloutRe, (match) => {
    const em = match.match(eyebrowRe);
    const bm = match.match(bodyRe);
    if (!em || !bm) {
      console.log(`topic-${t}: pattern partial match — skipping`);
      totalSkipped++;
      return match;
    }
    const title = em[1].trim();
    const body = bm[1].trim();

    return `<ReadyCallout title=${JSON.stringify(title)}>\n        <p>${body}</p>\n      </ReadyCallout>`;
  });

  if (s !== before) {
    if (s.includes('<ReadyCallout') && !s.includes(IMPORT_LINE)) {
      s = s.replace(/(import \{ SceneHeader \} from '\.\/SceneHeader';\n)/, `$1${IMPORT_LINE}\n`);
    }
    fs.writeFileSync(fp, s);
    totalUpdated++;
    console.log(`topic-${t}: replaced`);
  } else {
    console.log(`topic-${t}: no match`);
  }
}

console.log('---');
console.log(`Updated: ${totalUpdated}, skipped: ${totalSkipped}`);
