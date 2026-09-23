/**
 * optimize-assets.mjs — הופך את שני קבצי ה-PNG הגולמיים של אזור לסט נכסים
 * שאפשר להגיש ברשת סלולרית: AVIF + WebP בשלושה רוחבים, fallback יחיד,
 * ו-LQIP (תמונה זעירה מוטבעת) שמוצגת עד שהשכבה האמיתית נטענת.
 *
 * תקציב: עד 400KB לאזור לשתי השכבות יחד ברוחב שנבחר — ראו tools/check-budget.mjs.
 *
 *   node tools/optimize-assets.mjs --area=gilboa
 */
import { mkdirSync, writeFileSync, statSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { ROOT, areasFromArgv, flag, log, isMain } from './lib/geo.mjs';

const RAW = resolve(ROOT, 'tools', '.cache', 'raw');
const ASSETS = resolve(ROOT, 'src', 'assets', 'areas');

/**
 * איכויות פתיחה: התצ״א צילומית וסובלת דחיסה; המפה היא קווים ודורשת יותר;
 * ההצללה היא מדרג רציף של אפור בלי קצוות חדים ולכן היא הזולה מכולן.
 */
const Q = {
  aerial: { avif: 50, webp: 72 },
  topo: { avif: 58, webp: 80 },
  hillshade: { avif: 46, webp: 70 },
};

/** תקציב הגשה לאזור (כל השכבות יחד) ברוחב הייחוס — זהה ל-check-budget.mjs. */
const BUDGET_BYTES = 400 * 1024;
const TARGET_WIDTH = 1200;
const MIN_QUALITY = 30;

async function lqip(input) {
  const buf = await sharp(input)
    .resize(24, 24, { fit: 'fill' })
    .webp({ quality: 40, alphaQuality: 0 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

/**
 * מוצא את איכות ה-AVIF הגבוהה ביותר שעדיין נכנסת לתקציב ברוחב הייחוס.
 * אזור עירוני צפוף (מישור החוף) שוקל הרבה יותר מאזור מדברי באותה איכות,
 * ולכן איכות קבועה לכל האזורים או חורגת מהתקציב או פוגעת בכולם ללא צורך.
 */
async function calibrateQuality(area, layers) {
  /* ההצללה מקבלת רבע-מנה: היא נדחסת לכעשירית ממשקל התצ״א ואין טעם לקנס
     את שתי השכבות העיקריות בגללה. */
  const weights = { aerial: 1, topo: 1, hillshade: 0.5 };
  const totalWeight = layers.reduce((s, l) => s + weights[l], 0);
  const quality = {};
  for (const layer of layers) {
    const budgetPerLayer = (BUDGET_BYTES * weights[layer]) / totalWeight;
    const src = resolve(RAW, `${area.id}-${layer}.png`);
    let q = Q[layer].avif;
    for (; q >= MIN_QUALITY; q -= 6) {
      const buf = await sharp(src)
        .resize(TARGET_WIDTH, TARGET_WIDTH, { fit: 'fill', kernel: 'lanczos3' })
        .avif({ quality: q, effort: 4 })
        .toBuffer();
      if (buf.length <= budgetPerLayer) break;
    }
    quality[layer] = Math.max(MIN_QUALITY, q);
    if (quality[layer] !== Q[layer].avif) {
      log(`[assets] ${area.id}/${layer}: איכות AVIF כוילה ל-${quality[layer]} לעמידה בתקציב`);
    }
  }
  return quality;
}

export async function optimizeArea(area, { force = Boolean(flag('force', false)) } = {}) {
  const dir = resolve(ASSETS, area.id);
  mkdirSync(dir, { recursive: true });
  const manifestPath = resolve(dir, 'manifest.json');
  const previous =
    !force && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  const manifest = { id: area.id, layers: {} };

  /* ההצללה אופציונלית: אזור שנוצר לפני שהשכבה נוספה עדיין תקף, והרכיב
     פשוט לא יציג את מצב התצוגה הזה. מונחה-נתונים, לא מונחה-הנחות. */
  const layers = ['aerial', 'topo'].concat(
    existsSync(resolve(RAW, `${area.id}-hillshade.png`)) ? ['hillshade'] : [],
  );

  /* קידוד מחדש רק כשצריך — הרצה חוזרת של ה-pipeline לא משלמת שוב על AVIF. */
  const stale = (file) => force || !existsSync(resolve(dir, file));
  const avifQuality =
    previous?.quality && layers.every((l) => previous.quality[l] !== undefined)
      ? previous.quality
      : await calibrateQuality(area, layers);
  manifest.quality = avifQuality;

  for (const layer of layers) {
    const src = resolve(RAW, `${area.id}-${layer}.png`);
    const meta = await sharp(src).metadata();
    const widths = area.widths.filter((w) => w <= meta.width);
    if (!widths.length) widths.push(meta.width);

    const sources = { avif: [], webp: [] };
    let bytes = 0;
    for (const w of widths) {
      const base = sharp(src).resize(w, w, { fit: 'fill', kernel: 'lanczos3' });
      const avifName = `${layer}-${w}.avif`;
      const webpName = `${layer}-${w}.webp`;
      if (stale(avifName)) {
        await base
          .clone()
          .avif({ quality: avifQuality[layer], effort: 4 })
          .toFile(resolve(dir, avifName));
      }
      if (stale(webpName)) {
        await base
          .clone()
          .webp({ quality: Q[layer].webp, effort: 5 })
          .toFile(resolve(dir, webpName));
      }
      sources.avif.push({ w, file: avifName });
      sources.webp.push({ w, file: webpName });
      bytes += statSync(resolve(dir, avifName)).size;
    }

    // fallback יחיד לדפדפנים ללא AVIF/WebP — JPEG לתמונות רציפות, PNG לקווי המפה
    const smallest = widths[0];
    const photographic = layer !== 'topo';
    const fbName = `${layer}-${smallest}.${photographic ? 'jpg' : 'png'}`;
    if (stale(fbName)) {
      const fb = sharp(src).resize(smallest, smallest, { fit: 'fill', kernel: 'lanczos3' });
      if (photographic) await fb.jpeg({ quality: 76, mozjpeg: true }).toFile(resolve(dir, fbName));
      else
        await fb
          .png({ compressionLevel: 9, palette: true, colors: 128 })
          .toFile(resolve(dir, fbName));
    }

    manifest.layers[layer] = {
      widths,
      sources,
      fallback: fbName,
      lqip: await lqip(src),
      avifBytes: bytes,
    };
    log(
      `[assets] ${area.id}/${layer}: ${widths.join(',')} · AVIF סה"כ ${(bytes / 1024).toFixed(0)}KB`,
    );
  }

  /* תמונה ממוזערת אמיתית לבורר האזורים — ה-LQIP מטושטש מכדי לזהות בו שטח,
     והגשת התמונה המלאה של שבעה אזורים רק בשביל בורר סותרת את תקציב הנכסים. */
  if (stale('thumb.webp')) {
    await sharp(resolve(RAW, `${area.id}-aerial.png`))
      .resize(220, 220, { fit: 'cover', kernel: 'lanczos3' })
      .webp({ quality: 66 })
      .toFile(resolve(dir, 'thumb.webp'));
  }
  manifest.thumb = 'thumb.webp';

  manifest.totalAvifBytes = layers.reduce((s, l) => s + manifest.layers[l].avifBytes, 0);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

if (isMain(import.meta.url)) {
  for (const area of areasFromArgv()) await optimizeArea(area);
}
