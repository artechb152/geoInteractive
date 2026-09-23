/**
 * build-lib.mjs — בניית הרכיב כספרייה.
 *
 * סקריפט ולא ‎`LIB=1 vite build`‎ ישירות ב-package.json: התחביר הזה אינו עובד
 * ב-cmd.exe וב-PowerShell, וזו סביבת הפיתוח בפועל כאן. `cross-env` היה פותר
 * את זה במחיר תלות נוספת עבור שורה אחת.
 */
import { spawnSync } from 'node:child_process';
import { log } from './lib/geo.mjs';

const run = (cmd, args, env) => {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

log('[lib] בונה ESM + CJS…');
run('npx', ['vite', 'build'], { LIB: '1' });

log('[lib] מייצר הצהרות טיפוסים…');
run('npx', ['tsc', '-p', 'tsconfig.lib.json']);

log('[lib] הושלם → dist-lib/');
