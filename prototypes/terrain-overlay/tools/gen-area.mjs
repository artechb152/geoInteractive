/**
 * gen-area.mjs — מרכיב את מודול הנתונים של אזור מתוך שלושה מקורות:
 *   1. tools/areas.config.json      — גאוגרפיה
 *   2. tools/.cache/features/<id>   — גאומטריה שחולצה מה-DEM
 *   3. content/terrain.he.json      — כל הטקסט (מקור יחיד; אין שכפול בקוד)
 * ומייצר src/data/areas/<id>.ts + index.ts + src/data/content.ts.
 *
 *   node tools/gen-area.mjs --area=gilboa
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, areasFromArgv, loadConfig, groundWidthM, log, isMain } from './lib/geo.mjs';

const FEATURES = resolve(ROOT, 'tools', '.cache', 'features');
const ASSETS = resolve(ROOT, 'src', 'assets', 'areas');
const DATA = resolve(ROOT, 'src', 'data');
const CONTENT = resolve(ROOT, 'content', 'terrain.he.json');

const NICE_BARS = [50, 100, 200, 250, 500, 1000, 2000];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** מציב ערכים בתבנית. מחזיר null אם חסר ערך — עדיף להשמיט מאשר להציג "{x}". */
function fill(text, facts) {
  if (!text) return null;
  let missing = false;
  const out = text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = facts[k];
    if (v === undefined || v === null) {
      missing = true;
      return '';
    }
    return String(v);
  });
  return missing ? null : out;
}

function scaleBarFor(gw) {
  const target = gw / 4.7;
  return NICE_BARS.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

function layerObject(manifestLayer, tokens) {
  const set = (fmt) =>
    manifestLayer.sources[fmt].map(({ w, file }) => `${tokens.ref(file)} ${w}w`).join(', ');
  return {
    avif: set('avif'),
    webp: set('webp'),
    fallback: tokens.ref(manifestLayer.fallback),
    lqip: manifestLayer.lqip,
    width: Math.max(...manifestLayer.widths),
    widths: manifestLayer.widths,
  };
}

export function genArea(areaCfg) {
  const content = readJson(CONTENT);
  const extracted = readJson(resolve(FEATURES, `${areaCfg.id}.json`));
  const manifest = readJson(resolve(ASSETS, areaCfg.id, 'manifest.json'));
  const meta = content.areas[areaCfg.id];
  if (!meta) {
    throw new Error(
      `אין טקסטים לאזור "${areaCfg.id}" ב-content/terrain.he.json (מפתח areas.${areaCfg.id})`,
    );
  }

  const gw = groundWidthM(areaCfg);
  const scaleBarM = scaleBarFor(gw);
  const facts = { ...extracted.facts, scaleM: scaleBarM, groundWidthM: gw };

  // אסימוני ייבוא — כתובות התמונות מוחלפות במזהי import אחרי הסריאליזציה
  const imports = [];
  const tokens = {
    ref(file) {
      const ident = 'img_' + file.replace(/[^a-zA-Z0-9]/g, '_');
      const from = `../../assets/areas/${areaCfg.id}/${file}`;
      if (!imports.some((i) => i.ident === ident)) imports.push({ ident, from });
      return `@@${ident}@@`;
    },
  };

  /**
   * הצורות שקיימות בפועל באזור הזה.
   *
   * דרוש כדי לסנן `confusedWith` שמצביע לצורה שאינה קיימת כאן: הקישור
   * "השוו מול גיא" בכרטיס היה מוביל לצורה שאין לה מופע באזור, והמנוע
   * מונחה-הנתונים היה מציג כפתור שאינו עושה דבר. הזוג המבלבל נכון תמיד
   * ברמת המילון, אבל לא תמיד ברמת השטח.
   */
  const present = new Set(
    extracted.features.filter((geo) => content.kinds[geo.id]).map((geo) => geo.id),
  );

  const features = extracted.features
    .map((geo) => {
      const kind = content.kinds[geo.id];
      if (!kind) {
        log(`[gen] ${areaCfg.id}: אין תוכן לצורה "${geo.id}" — מדולגת`);
        return null;
      }
      const localNote = meta.localNotes?.[geo.id] ?? fill(kind.localNote, facts);
      const challenge = kind.challenge
        ? (() => {
            const answer = fill(kind.challenge.answer, facts);
            return answer ? { prompt: kind.challenge.prompt, answer } : null;
          })()
        : null;
      return {
        id: geo.id,
        name: kind.name,
        family: kind.family,
        signature: kind.signature,
        ...(kind.isConcept ? { isConcept: true } : {}),
        definition: kind.definition,
        ...(localNote ? { localNote } : {}),
        shortDescription: [kind.definition, localNote].filter(Boolean).join(' '),
        aerialExplanation: kind.aerial,
        mapExplanation: kind.map,
        whyItMatters: kind.why,
        ...(kind.contrast ? { contrastNote: kind.contrast } : {}),
        ...(kind.confusedWith && present.has(kind.confusedWith)
          ? { confusedWith: kind.confusedWith }
          : {}),
        ...(challenge ? { challenge } : {}),
        ...(kind.terms ? { terms: kind.terms } : {}),
        ...(geo.elevation !== undefined ? { elevation: geo.elevation } : {}),
        ...(geo.flowArrow ? { flowArrow: geo.flowArrow } : {}),
        hitPath: geo.hitPath,
        ...(geo.hitArea !== undefined ? { hitArea: geo.hitArea } : {}),
        ...(geo.accentPaths ? { accentPaths: geo.accentPaths } : {}),
        ...(geo.showOutline === false ? { showOutline: false } : {}),
        labelPoint: geo.labelPoint,
      };
    })
    .filter(Boolean);

  const area = {
    id: areaCfg.id,
    name: meta.name,
    region: meta.region,
    difficulty: meta.difficulty,
    teaches: meta.teaches,
    intro: meta.intro,
    order: areaCfg.order ?? 99,
    groundWidthM: gw,
    scaleBarM,
    viewBox: { width: 1000, height: 1000 },
    thumbnail: tokens.ref(manifest.thumb ?? 'thumb.webp'),
    layers: {
      aerial: layerObject(manifest.layers.aerial, tokens),
      topo: layerObject(manifest.layers.topo, tokens),
      ...(manifest.layers.hillshade
        ? { hillshade: layerObject(manifest.layers.hillshade, tokens) }
        : {}),
    },
    attribution: areaCfg.attribution,
    stats: {
      min: extracted.stats.min,
      max: extracted.stats.max,
      relief: extracted.stats.relief,
      interval: extracted.stats.interval,
      indexInterval: extracted.stats.interval * 5,
      peakCount: extracted.stats.peaks.length,
      saddleCount: extracted.stats.saddles.length,
    },
    features,
  };

  /* אסימוני התמונות חוזרים להיות מזהי import: ערך בודד הופך לזיהוי ישיר,
     ומחרוזת srcset שמכילה כמה אסימונים הופכת ל-template literal. */
  const body = JSON.stringify(area, null, 2)
    .replace(/"@@(\w+)@@"/g, '$1')
    .replace(
      /"([^"\\]*@@[^"\\]*)"/g,
      (_, inner) => '`' + inner.replace(/@@(\w+)@@/g, '${$1}') + '`',
    );
  const head =
    `/* eslint-disable */\n` +
    `/**\n * ${meta.name} — נוצר אוטומטית ע"י tools/gen-area.mjs. אין לערוך ידנית.\n` +
    ` * גאומטריה: ${extracted.generatedFrom}\n` +
    ` * טקסט: content/terrain.he.json · גאוגרפיה: tools/areas.config.json\n */\n` +
    `import type { TerrainArea } from '../types';\n` +
    imports.map((i) => `import ${i.ident} from '${i.from}';`).join('\n') +
    '\n\n';

  mkdirSync(resolve(DATA, 'areas'), { recursive: true });
  writeFileSync(
    resolve(DATA, 'areas', `${areaCfg.id}.ts`),
    `${head}const area: TerrainArea = ${body};\n\nexport default area;\n`,
    'utf8',
  );
  log(`[gen] ${areaCfg.id}: ${features.length} צורות → src/data/areas/${areaCfg.id}.ts`);
  return area;
}

/** בונה מחדש את index.ts לפי הקבצים שקיימים בפועל. */
export function genIndex() {
  const dir = resolve(DATA, 'areas');
  mkdirSync(dir, { recursive: true });
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''));
  const cfgOrder = loadConfig().areas.map((a) => a.id);
  ids.sort((a, b) => cfgOrder.indexOf(a) - cfgOrder.indexOf(b));

  const src =
    `/**\n * נוצר אוטומטית ע"י tools/gen-area.mjs — אין לערוך ידנית.\n */\n` +
    `import type { TerrainArea } from '../types';\n` +
    ids.map((id) => `import ${ident(id)} from './${id}';`).join('\n') +
    `\n\nexport const TERRAIN_AREAS: TerrainArea[] = [\n` +
    ids.map((id) => `  ${ident(id)},`).join('\n') +
    `\n].sort((a, b) => a.order - b.order);\n\n` +
    `export const DEFAULT_AREA_ID = TERRAIN_AREAS[0].id;\n\n` +
    `export function getAreaById(id: string | null | undefined): TerrainArea {\n` +
    `  return TERRAIN_AREAS.find((a) => a.id === id) ?? TERRAIN_AREAS[0];\n` +
    `}\n`;
  writeFileSync(resolve(dir, 'index.ts'), src, 'utf8');
  log(`[gen] index: ${ids.join(', ')}`);
}

const ident = (id) => 'area_' + id.replace(/[^a-zA-Z0-9]/g, '_');

/** מייצא את הטקסט שאינו תלוי-אזור (ממשק, משפחות, מילון). */
export function genContent() {
  const c = readJson(CONTENT);
  const src =
    `/**\n * נוצר אוטומטית מ-content/terrain.he.json — אין לערוך ידנית.\n */\n` +
    `import type { FamilyInfo, FeatureFamily, GlossaryTerm } from './types';\n\n` +
    `export const UI = ${JSON.stringify(c.ui, null, 2)} as const;\n\n` +
    `export const FAMILIES: Record<FeatureFamily, FamilyInfo> = ${JSON.stringify(
      c.families,
      null,
      2,
    )};\n\n` +
    `/** סדר התצוגה של המשפחות במקרא — המושג קודם לצורות. */\n` +
    `export const FAMILY_ORDER: FeatureFamily[] = ['concept', 'convex', 'pass', 'concave', 'surface', 'scarp'];\n\n` +
    `export const GLOSSARY: GlossaryTerm[] = ${JSON.stringify(c.glossary, null, 2)};\n`;
  writeFileSync(resolve(DATA, 'content.ts'), src, 'utf8');
  log(`[gen] content.ts: ${c.glossary.length} מונחים`);
}

if (isMain(import.meta.url)) {
  for (const area of areasFromArgv()) {
    if (!existsSync(resolve(FEATURES, `${area.id}.json`))) {
      throw new Error(
        `חסר חילוץ ל-${area.id}. הריצו: node tools/extract-features.mjs --area=${area.id}`,
      );
    }
    genArea(area);
  }
  genIndex();
  genContent();
}
