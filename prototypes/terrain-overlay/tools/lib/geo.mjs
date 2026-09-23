/**
 * geo.mjs — הבסיס המשותף לכל סקריפטי ה-pipeline: הטלת מרקטור, חשבון אריחים,
 * קריאת התצורה מ-tools/areas.config.json, ואיתור דפדפן להרצת headless.
 *
 * למה קובץ אחד: לפני הריפקטור הקבועים LAT/LON/HALF היו משוכפלים בארבעה
 * סקריפטים; כל שינוי חייב עדכון בארבעה מקומות, ואי-התאמה ביניהם מייצרת
 * שתי שכבות שאינן חופפות — באג שקט שלא מתגלה בקומפילציה.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * האם המודול הורץ ישירות (ולא יובא).
 * הרכבה ידנית של ‎`file://` + נתיב‎ אינה עובדת בחלונות ובנתיבים עם תווים
 * שאינם ASCII: ‎import.meta.url‎ מכיל שלוש לוכסנים וקידוד אחוזים, וההשוואה
 * נכשלת בשקט — הסקריפט פשוט לא עושה כלום.
 */
export const isMain = (importMetaUrl) =>
  Boolean(process.argv[1]) && importMetaUrl === pathToFileURL(process.argv[1]).href;

/* ------------------------------- מרקטור ------------------------------- */

export const R = 6378137;
export const ORIGIN = Math.PI * R;

export const toMerc = (lat, lon) => [
  (R * lon * Math.PI) / 180,
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

/** תיבת התחום (EPSG:3857) של אזור — ריבועית ביחידות מרקטור. */
export function bboxOf(area) {
  const [cx, cy] = toMerc(area.lat, area.lon);
  const h = area.halfMeters;
  return { xmin: cx - h, ymin: cy - h, xmax: cx + h, ymax: cy + h };
}

/**
 * רוחב התחום בקרקע במטרים. תיבה ריבועית ביחידות מרקטור אינה ריבועית בקרקע:
 * מקדם הסקאלה הוא 1/cos(lat), ולכן המרחק האמיתי קטן מ-2·half.
 */
export const groundWidthM = (area) =>
  Math.round(2 * area.halfMeters * Math.cos((area.lat * Math.PI) / 180));

/** המרת מרקטור לפיקסלי-עולם ברמת זום נתונה. */
export const mercToPixel = (mx, my, z) => {
  const worldPx = 256 * 2 ** z;
  return [((mx + ORIGIN) / (2 * ORIGIN)) * worldPx, ((ORIGIN - my) / (2 * ORIGIN)) * worldPx];
};

/** טווח האריחים המכסה את התחום + היסט החיתוך בתוך המוזאיקה. */
export function tileRange(box, z) {
  const [pxMin, pyMax] = mercToPixel(box.xmin, box.ymin, z);
  const [pxMax, pyMin] = mercToPixel(box.xmax, box.ymax, z);
  const tileXmin = Math.floor(pxMin / 256);
  const tileXmax = Math.floor((pxMax - 1e-6) / 256);
  const tileYmin = Math.floor(pyMin / 256);
  const tileYmax = Math.floor((pyMax - 1e-6) / 256);
  return {
    tileXmin,
    tileXmax,
    tileYmin,
    tileYmax,
    cropW: pxMax - pxMin,
    cropH: pyMax - pyMin,
    offX: pxMin - tileXmin * 256,
    offY: pyMin - tileYmin * 256,
    count: (tileXmax - tileXmin + 1) * (tileYmax - tileYmin + 1),
  };
}

/* ------------------------------- תצורה ------------------------------- */

const CONFIG_PATH = resolve(ROOT, 'tools', 'areas.config.json');

let cachedConfig = null;
export function loadConfig() {
  if (!cachedConfig) {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    cachedConfig = {
      ...raw,
      areas: raw.areas.map((a) => ({ ...raw.defaults, ...a })),
    };
  }
  return cachedConfig;
}

export function getArea(id) {
  const area = loadConfig().areas.find((a) => a.id === id);
  if (!area) {
    const ids = loadConfig()
      .areas.map((a) => a.id)
      .join(', ');
    throw new Error(`אזור לא מוכר: "${id}". אזורים זמינים: ${ids}`);
  }
  return area;
}

/** פענוח `--area=<id>` / `--area <id>` / `--all`. מחזיר מערך אזורים. */
export function areasFromArgv(argv = process.argv.slice(2)) {
  const cfg = loadConfig();
  if (argv.includes('--all')) return cfg.areas;
  const ids = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--area=')) ids.push(...a.slice(7).split(','));
    else if (a === '--area' && argv[i + 1]) ids.push(...argv[++i].split(','));
  }
  if (!ids.length) {
    throw new Error('חסר ‎--area=<id>‎ (או ‎--all‎). ראו tools/areas.config.json לרשימת האזורים.');
  }
  return ids.map(getArea);
}

/** פענוח דגל ערך כללי: `--flag=value`. */
export function flag(name, fallback = undefined, argv = process.argv.slice(2)) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return argv.includes(`--${name}`) ? true : fallback;
}

/* ------------------------------- דפדפן ------------------------------- */

const BROWSER_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/**
 * נתיב לדפדפן Chromium להרצת playwright-core.
 * קודם `BROWSER_PATH` מהסביבה, אחר כך זיהוי אוטומטי לפי מערכת ההפעלה.
 */
export function resolveBrowser() {
  const fromEnv = process.env.BROWSER_PATH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(`BROWSER_PATH מצביע לנתיב שאינו קיים: ${fromEnv}`);
    }
    return fromEnv;
  }
  const found = BROWSER_CANDIDATES.find((p) => existsSync(p));
  if (found) return found;
  throw new Error(
    'לא נמצא דפדפן Chromium להרצה. הגדירו משתנה סביבה BROWSER_PATH לנתיב\n' +
      'המלא של msedge.exe / chrome.exe, למשל:\n' +
      '  BROWSER_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
  );
}

/* ------------------------------- כללי ------------------------------- */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch עם ניסיונות חוזרים — אריחי DEM/מפה נכשלים מדי פעם ברשת עמוסה. */
export async function fetchRetry(url, { tries = 3, delay = 400, ...init } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': 'terrain-map-simulator-edu/1.0', ...init.headers },
      });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} ${url}`);
    } catch (e) {
      last = e;
    }
    await sleep(delay * (i + 1));
  }
  throw last;
}

export const log = (...a) => console.log(...a);
