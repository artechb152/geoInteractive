import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerrainMapSimulator from '../src/components/TerrainMapSimulator/TerrainMapSimulator';
import { getAreaById } from '../src/data/areas';

const gilboa = getAreaById('gilboa');

/**
 * הבדיקות מדלגות על ההכוונה הראשונה: היא מודאלית ונשמרת ב-localStorage,
 * ואחרת כל בדיקה הייתה מתחילה בלחיצה על "דילוג" — כלומר בודקת את ההכוונה
 * שוב ושוב במקום את מה שבאה לבדוק.
 */
function setup(props: Partial<Parameters<typeof TerrainMapSimulator>[0]> = {}) {
  window.localStorage.setItem('tms:v1:tour', 'true');
  const user = userEvent.setup();
  const utils = render(<TerrainMapSimulator deepLink={false} {...props} />);
  return { user, ...utils };
}

/**
 * שבב במקרא, ולא "כפתור עם השם הזה": לאותה צורה יש גם שבב במקרא וגם אזור
 * לחיצה נגיש על המפה — וזה בדיוק מה ש-L-04 בא להשיג. חיפוש גלובלי לפי שם
 * מוצא את שניהם, ובדיקה שנופלת על כך בודקת את עצמה ולא את הרכיב.
 */
const legendChip = (name: string) =>
  within(screen.getByRole('region', { name: /מקרא צורות השטח|תשובות אפשריות/ })).getByRole(
    'button',
    { name: new RegExp(`^${name}`) },
  );

describe('בחירת צורה', () => {
  it('לחיצה על שבב במקרא פותחת את כרטיס המידע', async () => {
    const { user } = setup();
    const dome = gilboa.features.find((f) => f.id === 'dome')!;
    await user.click(legendChip(dome.name));
    expect(screen.getByRole('region', { name: `מידע על ${dome.name}` })).toBeInTheDocument();
  });

  it('לחיצה חוזרת מבטלת את הבחירה', async () => {
    const { user } = setup();
    const dome = gilboa.features.find((f) => f.id === 'dome')!;
    await user.click(legendChip(dome.name));
    await user.click(legendChip(dome.name));
    expect(screen.queryByRole('region', { name: `מידע על ${dome.name}` })).toBeNull();
  });

  it('Esc סוגר את הכרטיס', async () => {
    const { user } = setup();
    const dome = gilboa.features.find((f) => f.id === 'dome')!;
    await user.click(legendChip(dome.name));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: `מידע על ${dome.name}` })).toBeNull();
  });

  it('כפתור "נקו בחירה" מופיע רק כשיש בחירה', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'נקו בחירה' })).toBeNull();
    await user.click(legendChip(gilboa.features[1].name));
    expect(screen.getByRole('button', { name: 'נקו בחירה' })).toBeInTheDocument();
  });
});

describe('נגישות המפה', () => {
  it('לכל צורה אזור לחיצה שהוא כפתור עם תווית מתארת', () => {
    setup();
    const map = screen.getByRole('group', { name: /מפת/ });
    const hits = within(map).getAllByRole('button');
    expect(hits.length).toBe(gilboa.features.length);
    for (const hit of hits) {
      expect(hit.getAttribute('aria-label')!.length).toBeGreaterThan(10);
      expect(hit).toHaveAttribute('tabindex', '0');
    }
  });

  it('Enter על אזור הלחיצה בוחר את הצורה', async () => {
    const { user } = setup();
    const map = screen.getByRole('group', { name: /מפת/ });
    const first = within(map).getAllByRole('button')[0];
    first.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('region', { name: /מידע על/ })).toBeInTheDocument();
  });

  it('לשתי שכבות התמונה טקסט חלופי אמיתי — לא alt ריק', () => {
    setup();
    const imgs = screen.getAllByRole('img', { hidden: true });
    const alts = imgs.map((i) => i.getAttribute('alt')).filter((a) => a !== null && a !== '');
    expect(alts.length).toBeGreaterThanOrEqual(2);
  });

  it('לרכיב כותרת נגישה ברמה שהוגדרה', () => {
    setup({ headingLevel: 3 });
    expect(
      screen.getByRole('heading', { level: 3, name: /סימולטור צורות שטח/ }),
    ).toBeInTheDocument();
  });
});

describe('מצבי השוואה (L-07)', () => {
  it('ברירת המחדל היא וילון ולא שקיפות', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'וילון' })).toBeChecked();
  });

  it('מעבר ל"זה לצד זה" מסתיר את המחוון — הוא חסר משמעות שם', async () => {
    const { user } = setup();
    expect(screen.getByRole('slider', { name: /וילון|מעבר/ })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'זה לצד זה' }));
    expect(screen.queryByRole('slider', { name: /וילון|מעבר/ })).toBeNull();
  });

  it('מצב ההצללה מוצע כשלאזור יש שכבת הצללה', () => {
    setup();
    const expected = Boolean(gilboa.layers.hillshade);
    expect(Boolean(screen.queryByRole('radio', { name: 'הצללה' }))).toBe(expected);
  });

  /** ההפרדה בין ערך הווילון לערך השקיפות היא כל הפואנטה של L-07. */
  it('השקיפות נפתחת ב-0 ולא ב-50%, גם אחרי שהווילון הוזז', async () => {
    const { user } = setup();
    const wipe = screen.getByRole('slider');
    expect(Number((wipe as HTMLInputElement).value)).toBe(50);
    await user.click(screen.getByRole('radio', { name: 'שקיפות' }));
    expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(0);
  });
});

describe('התקדמות (L-06)', () => {
  it('המונה מתחיל באפס ועולה אחרי צפייה בצורה', async () => {
    const { user } = setup();
    const bar = screen.getByRole('progressbar', { name: 'התקדמות בלמידה' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    await user.click(legendChip(gilboa.features[1].name));
    expect(bar).toHaveAttribute('aria-valuenow', '1');
  });

  it('`onProgress` מדווח על צפייה בצורה', async () => {
    const onProgress = vi.fn();
    const { user } = setup({ onProgress });
    await user.click(legendChip(gilboa.features[1].name));
    expect(onProgress).toHaveBeenCalled();
    const last = onProgress.mock.calls.at(-1)![0];
    expect(last.reason).toBe('feature-seen');
    expect(last.areaId).toBe('gilboa');
    expect(last.total).toBe(gilboa.features.length);
  });

  it('`onEvent` מדווח זמן שהייה על הצורה שננטשה', async () => {
    const onEvent = vi.fn();
    const { user } = setup({ onEvent });
    await user.click(legendChip(gilboa.features[1].name));
    await user.click(legendChip(gilboa.features[2].name));
    const views = onEvent.mock.calls.map((c) => c[0]).filter((e) => e.type === 'feature-view');
    expect(views.length).toBeGreaterThan(0);
    expect(views[0].ms).toBeGreaterThanOrEqual(0);
  });

  it('המצב שורד רינדור מחדש — הוא נשמר ב-localStorage', async () => {
    const { user, unmount } = setup();
    await user.click(legendChip(gilboa.features[1].name));
    unmount();
    setup();
    expect(screen.getByRole('progressbar', { name: 'התקדמות בלמידה' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });
});

describe('קישור עמוק (L-06)', () => {
  it('`areaId` כ-prop גובר על המצב השמור', () => {
    window.localStorage.setItem('tms:v1:area', '"gilboa"');
    setup({ areaId: 'meron' });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
      getAreaById('meron').name,
    );
  });
});

describe('תרגול (L-02)', () => {
  it('כניסה לתרגול מציגה שאלה ומסתירה את כרטיס המידע', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'תרגול' }));
    expect(screen.queryByRole('region', { name: /מידע על/ })).toBeNull();
    expect(screen.getByText(/^שאלה \d+ מתוך/)).toBeInTheDocument();
  });

  it('יציאה מהתרגול מחזירה למצב חקירה', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'תרגול' }));
    await user.click(screen.getByRole('button', { name: 'חקירה' }));
    expect(screen.getByRole('button', { name: 'חקירה' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('שיעור (L-10)', () => {
  it('מסך הפתיחה מציג מטרות למידה', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'שיעור' }));
    const dialog = screen.getByRole('dialog', { name: 'שיעור' });
    expect(within(dialog).getByText('מה תדעו בסוף')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  });

  it('התחלת השיעור בוחרת אוטומטית את הצורה הראשונה בסיור', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'שיעור' }));
    await user.click(screen.getByRole('button', { name: 'התחלת השיעור' }));
    expect(screen.getByRole('region', { name: /מידע על/ })).toBeInTheDocument();
    expect(screen.getByText(/צורה 1 מתוך/)).toBeInTheDocument();
  });
});

describe('i18n (L-09)', () => {
  it('שפת ברירת המחדל היא עברית בכיוון ימין-לשמאל', () => {
    const { container } = setup();
    const root = container.querySelector('.tms')!;
    expect(root).toHaveAttribute('dir', 'rtl');
    expect(root).toHaveAttribute('lang', 'he');
  });

  it('`locale="en"` מחליף גם את השפה וגם את כיוון הכתיבה', () => {
    const { container } = setup({ locale: 'en' });
    const root = container.querySelector('.tms')!;
    expect(root).toHaveAttribute('dir', 'ltr');
    expect(root).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('button', { name: 'Explore' })).toBeInTheDocument();
  });

  it('`showLegend={false}` מסיר את המקרא', () => {
    setup({ showLegend: false });
    expect(screen.queryByRole('button', { name: /^נקו בחירה/ })).toBeNull();
  });
});
