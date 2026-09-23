import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * בדיקות נגישות אוטומטיות (L-04 · L-08).
 *
 * הגדרת הסיום של L-04 היא **אפס ממצאים ברמת serious/critical**. עד לבדיקה
 * הזו הקביעה הזו הייתה הצהרה; כאן היא נאכפת בכל הרצה, על כל מסך מרכזי.
 */

const SEVERE = ['serious', 'critical'];

async function ready(page: Page) {
  await page.goto('/');
  // ההכוונה מודאלית וחוסמת את שאר המסך — מדלגים עליה כדי לבדוק את מה שמאחוריה
  const skip = page.getByRole('button', { name: 'דילוג' });
  if (await skip.count()) await skip.first().click();
  await page.waitForTimeout(700);
}

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const severe = results.violations.filter((v) => SEVERE.includes(v.impact ?? ''));
  const report = severe
    .map((v) => `${v.impact} · ${v.id} · ${v.help}\n    ${v.nodes[0]?.html?.slice(0, 160)}`)
    .join('\n  ');
  expect(severe, `${label}:\n  ${report}`).toEqual([]);
}

test.describe('נגישות', () => {
  test('מסך החקירה', async ({ page }) => {
    await ready(page);
    await scan(page, 'חקירה');
  });

  test('כרטיס צורה פתוח', async ({ page }) => {
    await ready(page);
    await page.getByRole('region', { name: 'מקרא צורות השטח' }).getByRole('button').first().click();
    await page.waitForTimeout(400);
    await scan(page, 'כרטיס');
  });

  test('מצב תרגול', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'תרגול', exact: true }).click();
    await page.waitForTimeout(600);
    await scan(page, 'תרגול');
  });

  test('מסך פתיחת השיעור', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'שיעור', exact: true }).click();
    await page.waitForTimeout(400);
    await scan(page, 'שיעור');
  });

  test('מילון מונחים', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'מילון', exact: true }).click();
    await page.waitForTimeout(400);
    await scan(page, 'מילון');
  });

  test('חלונית קיצורי המקלדת', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'קיצורי מקלדת ועזרה' }).click();
    await page.waitForTimeout(400);
    await scan(page, 'עזרה');
  });

  test('ההכוונה הראשונה עצמה', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(900);
    await scan(page, 'הכוונה');
  });
});

test.describe('ניווט מקלדת בלבד', () => {
  /**
   * הבדיקה המהותית של L-04: משתמש שאינו נוגע בעכבר צריך להגיע אל המפה,
   * לבחור צורה, ולקרוא את הכרטיס.
   */
  test('אפשר להגיע לאזור לחיצה על המפה ולבחור בו', async ({ page }) => {
    await ready(page);
    const hit = page.locator('.tms-feature').first();
    await hit.focus();
    await expect(hit).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: /מידע על/ })).toBeVisible();
  });

  test('חיצים מנווטים בין הצורות על המפה', async ({ page }) => {
    await ready(page);
    const first = page.locator('.tms-feature').first();
    await first.focus();
    const before = await first.getAttribute('data-hit');
    await page.keyboard.press('ArrowLeft');
    const after = await page.evaluate(() => document.activeElement?.getAttribute('data-hit'));
    expect(after).not.toBe(before);
  });

  test('Esc סוגר את הכרטיס ומחזיר פוקוס למקרא', async ({ page }) => {
    await ready(page);
    await page.getByRole('region', { name: 'מקרא צורות השטח' }).getByRole('button').first().click();
    await expect(page.getByRole('region', { name: /מידע על/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('region', { name: /מידע על/ })).toHaveCount(0);
  });
});
