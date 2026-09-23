/**
 * install-hooks.mjs — מתקין hook של pre-commit שמריץ lint-staged.
 *
 * ידני ולא husky: husky מוסיף תלות, ספריית ‎.husky/‎ וקובץ תצורה — הכול כדי
 * לכתוב קובץ אחד בן שתי שורות. הסקריפט הזה מדלג בשקט כשאין ריפו גיט (למשל
 * כשהחבילה מותקנת כתלות אצל מישהו אחר), כי `prepare` רץ גם שם.
 */
import { existsSync, writeFileSync, chmodSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/geo.mjs';

const git = resolve(ROOT, '.git');
if (!existsSync(git)) {
  process.exit(0);
}

const hooksDir = resolve(git, 'hooks');
mkdirSync(hooksDir, { recursive: true });

const hook = resolve(hooksDir, 'pre-commit');
const body = `#!/bin/sh
# נוצר ע"י tools/install-hooks.mjs — אין לערוך ידנית.
npx --no-install lint-staged
`;

writeFileSync(hook, body, 'utf8');
try {
  chmodSync(hook, 0o755);
} catch {
  /* חלונות מתעלמת מהרשאות ההרצה; גיט שם מריץ את ה-hook דרך sh בכל מקרה */
}
console.log('[hooks] pre-commit הותקן (lint-staged)');
