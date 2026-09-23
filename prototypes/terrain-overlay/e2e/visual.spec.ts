import { test, expect, type Page } from '@playwright/test';

/**
 * רגרסיה חזותית (L-08).
 *
 * הבעיה שהיא פותרת: הגאומטריה והפריסה הם נתונים שקטים. נתיב SVG שנשבר,
 * תווית שזזה, או וילון שמפסיק להתיישר — כל אלה עוברים גם קומפילציה וגם
 * בדיקות יחידה, ונראים רק בעין. כאן העין מוחלפת ב-snapshot.
 *
 * הרצה ראשונה יוצרת את התמונות המצופות; ‎`--update-snapshots`‎ מעדכן אותן
 * אחרי שינוי מכוון.
 */

async function ready(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'דילוג' });
  if (await skip.count()) await skip.first().click();
  // ממתינים לשתי השכבות: צילום באמצע הטעינה משתנה בכל הרצה
  await page.waitForFunction(() => !document.querySelector('.tms-map__skeleton'), null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(700);
}

const frame = (page: Page) => page.locator('.tms__frame');

test.describe('רגרסיה חזותית', () => {
  test('מצב פתיחה — וילון', async ({ page }) => {
    await ready(page);
    await expect(frame(page)).toHaveScreenshot('compare-wipe.png');
  });

  test('שקיפות', async ({ page }) => {
    await ready(page);
    await page.getByRole('radio', { name: 'שקיפות' }).click();
    await page.waitForTimeout(400);
    await expect(frame(page)).toHaveScreenshot('compare-fade.png');
  });

  test('זה לצד זה', async ({ page }) => {
    await ready(page);
    await page.getByRole('radio', { name: 'זה לצד זה' }).click();
    await page.waitForTimeout(600);
    await expect(frame(page)).toHaveScreenshot('compare-split.png');
  });

  test('הצללה', async ({ page }) => {
    await ready(page);
    const hillshade = page.getByRole('radio', { name: 'הצללה' });
    test.skip((await hillshade.count()) === 0, 'לאזור אין שכבת הצללה');
    await hillshade.click();
    await page.waitForTimeout(900);
    await expect(frame(page)).toHaveScreenshot('compare-hillshade.png');
  });

  test('הצג הכול — תוויות שאינן מתנגשות', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'הצג הכול' }).click();
    await page.waitForTimeout(500);
    await expect(frame(page)).toHaveScreenshot('show-all.png');
  });

  test('כרטיס צורה', async ({ page }) => {
    await ready(page);
    await page.getByRole('region', { name: 'מקרא צורות השטח' }).getByRole('button').nth(1).click();
    await page.waitForTimeout(700);
    await expect(frame(page)).toHaveScreenshot('feature-card.png');
  });
});

test.describe('קישור עמוק (L-06)', () => {
  test('קישור פותח את האזור, הצורה והמצב הנכונים', async ({ page }) => {
    await page.goto('/#area=meron&feature=saddle&compare=fade&blend=100');
    const skip = page.getByRole('button', { name: 'דילוג' });
    if (await skip.count()) await skip.first().click();
    await page.waitForTimeout(1200);

    await expect(page.getByRole('heading', { level: 2 })).toContainText('מירון');
    await expect(page.getByRole('radio', { name: 'שקיפות' })).toBeChecked();
    await expect(page.getByRole('region', { name: /מידע על/ })).toBeVisible();
  });

  test('הכתובת מתעדכנת עם הבחירה', async ({ page }) => {
    await ready(page);
    await page.getByRole('region', { name: 'מקרא צורות השטח' }).getByRole('button').first().click();
    await page.waitForTimeout(300);
    expect(page.url()).toMatch(/#.*feature=/);
  });
});

test.describe('התקדמות נשמרת (L-06)', () => {
  test('רענון דף משמר את מה שנצפה', async ({ page }) => {
    await ready(page);
    await page.getByRole('region', { name: 'מקרא צורות השטח' }).getByRole('button').first().click();
    await page.waitForTimeout(300);
    const before = await page
      .getByRole('progressbar', { name: 'התקדמות בלמידה' })
      .getAttribute('aria-valuenow');
    expect(Number(before)).toBeGreaterThan(0);

    await page.reload();
    await page.waitForTimeout(1200);
    const after = await page
      .getByRole('progressbar', { name: 'התקדמות בלמידה' })
      .getAttribute('aria-valuenow');
    expect(after).toBe(before);
  });
});
