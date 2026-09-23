import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * דפדפן המערכת ולא הורדה של Playwright.
 *
 * ‎`npx playwright install`‎ מוריד כ-150MB לכל דפדפן. הריפו כבר מריץ את רתמת
 * האימות החזותי מול Edge/Chrome המותקן, ואין סיבה לשתי מערכות דפדפן. ב-CI
 * מגדירים ‎BROWSER_PATH‎ או מריצים ‎playwright install‎ פעם אחת.
 */
const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

const executablePath = CANDIDATES.find((p) => existsSync(p));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,

  use: {
    baseURL: process.env.E2E_BASE ?? 'http://localhost:4173/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* עברית: בלי זה ההשוואה החזותית נופלת על גופן חלופי במכונה אחרת */
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  },

  /* סף רגרסיה חזותית: אנטי-אליאסינג של גופנים משתנה בין מכונות, ואפס סובלנות
     היה הופך כל הרצה בסביבה אחרת לכישלון. */
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1180, height: 1000 },
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],

  webServer: process.env.E2E_BASE
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
