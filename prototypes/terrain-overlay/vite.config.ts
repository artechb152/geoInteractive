import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * שתי מטרות בנייה מאותו מקור:
 *
 *   `npm run build`      — דף ההדגמה (harness), אתר סטטי שאפשר לפרוס.
 *   `npm run build:lib`  — הרכיב כספרייה.
 *
 * `LIB=1` ולא שני קבצי תצורה: התצורה זהה למעט המטרה, וקובץ שני היה נדרש
 * להישאר מסונכרן ידנית עם הראשון — כלומר להתפצל ממנו בשקט.
 */
const lib = process.env.LIB === '1';

const ASSET_RE = /\.(avif|webp|png|jpe?g|svg|gif)(\?.*)?$/;

/**
 * מיפוי הנכסים החיצוניים אל מיקומם בחבילה.
 *
 * הייבוא במקור הוא ‎`../../assets/areas/...`‎ — יחסית ל-`src/data/areas/`.
 * rollup משאיר את המחרוזת כפי שהיא כשהיא חיצונית, ולכן מתוך
 * ‎`dist-lib/terrain-map-simulator.mjs`‎ היא מצביעה אל מחוץ לחבילה כולה.
 * `output.paths` הוא המנגנון הייעודי לתיקון הזה, במקום ניתוח מחרוזות על הפלט.
 *
 * הנכסים **אינם מועתקים** אל `dist-lib`: הם שוקלים 21MB, והעתקתם הייתה
 * מכפילה את גודל החבילה כדי להחזיק פעמיים את אותם קבצים בדיוק. במקום זאת
 * `src/assets/` נשלח בחבילה (ראו `files` ב-package.json), והפלט מצביע אליו.
 */
const rebaseAsset = (id: string) => {
  const m = id.replace(/\\/g, '/').match(/assets\/areas\/.*$/);
  return m ? `../src/${m[0]}` : id;
};

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5191 },
  build: lib
    ? {
        /**
         * ESM בלבד.
         *
         * הרכיב נצרך מתוך אפליקציית React עם בנדלר (Vite / Next / webpack 5),
         * וכולם טוענים ESM. פלט CJS נוסף היה מוסיף את "סכנת החבילה הכפולה" —
         * שני עותקים של אותו מודול־מצב באותו דף — בתמורה לתאימות שאיש כאן
         * אינו צריך.
         */
        lib: {
          entry: resolve(__dirname, 'src/components/TerrainMapSimulator/index.ts'),
          name: 'TerrainMapSimulator',
          formats: ['es'],
          fileName: () => 'terrain-map-simulator.mjs',
        },
        rollupOptions: {
          /**
           * הנכסים מסומנים חיצוניים — וזו הנקודה הקריטית באריזה הזו.
           *
           * במצב ספרייה Vite מטביע **כל** נכס כ-data URI ומתעלם מ-
           * `assetsInlineLimit`, גם בצורתו הפונקציונלית. עם שבעה אזורים של
           * תמונות זה מייצר חבילת JS של 28MB — אומת במדידה. סימון הנכסים
           * כחיצוניים מוציא אותם מצינור הנכסים לגמרי: הם נשארים ייבואים
           * אמיתיים, ו-rollup מרבס את הנתיבים היחסיים אל תיקיית הפלט.
           *
           * React חיצוני מסיבה אחרת לגמרי: שני עותקים של React בדף אינם
           * משקל כפול אלא hooks שבורים.
           */
          external: (id) =>
            /^react(\/|$)/.test(id) || /^react-dom(\/|$)/.test(id) || ASSET_RE.test(id),
          output: {
            exports: 'named',
            globals: { react: 'React', 'react-dom': 'ReactDOM' },
            paths: rebaseAsset,
            assetFileNames: (info) =>
              info.name?.endsWith('.css') ? 'style.css' : 'assets/[name][extname]',
          },
        },
        sourcemap: true,
        emptyOutDir: true,
        outDir: 'dist-lib',
        /* הגיליון נטען ע"י הרכיב עצמו; חילוץ לקובץ אחד מאפשר לצרכן לייבא
           `terrain-map-simulator/style.css` במפורש. */
        cssCodeSplit: false,
      }
    : { outDir: 'dist' },
});
