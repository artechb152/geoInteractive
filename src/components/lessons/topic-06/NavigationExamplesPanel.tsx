'use client';

import { HistoricalCasesPanel, type HistoricalCase } from '../topic-02/HistoricalCasesPanel';

// Sources and full generation prompts: design/docs/topic06-navigation-images-2026-10-27.md.
// Images are generated reconstructions, not documentary photographs of these events.
const ASSETS = '/assets/lessons/topic06/navigation-examples';
const examples = [
  {
    id: 'stars', number: '01', headline: 'ניווט לפי כוכבים',
    place: 'ספנות ערבית · המאות ה־15–16',
    teaser: 'היכרות עם השמיים מאפשרת להשתמש בכוכבים כסימני כיוון.',
    lesson: 'ספנים ערבים באוקיינוס ההודי חילקו את האופק ל־32 כיוונים לפי נקודות הזריחה והשקיעה של כוכבים מסוימים, כפי שמתועד במדריכי הניווט של התקופה. בקו רוחב נתון, נקודות אלה מאפשרות לקבוע כיוון.',
    stat: 'סימנים טבעיים מועילים כאשר מכירים את משמעותם ואת מגבלותיהם.',
    why: 'לומדים מראש אילו סימני כיוון זמינים באזור ובתנאי התצפית הצפויים.',
    mapBadge: 'ניווט לפי כוכבים',
    assetAlt: 'מנווט בספינת מפרש ערבית מביט באופק ובכוכבים',
  },
  {
    id: 'forest', number: '02', headline: 'ניווט ביער צפוף',
    place: 'יער הירטגן, גרמניה · 1944',
    teaser: 'כשאי אפשר לראות רחוק, סימנים קרובים מסייעים לזהות מיקום.',
    lesson: 'ביער הירטגן העצים הסתירו את הסביבה. לפי ההיסטוריה הרשמית של צבא ארה״ב, מפה וסימוני מדידה ממוספרים בהצטלבויות שבילים סייעו לקבוע מיקום, והמצפן עזר לשמור על הכיוון.',
    stat: 'כיוון התנועה וזיהוי המיקום הם שתי בדיקות משלימות.',
    why: 'בוחרים מראש נקודות שאפשר לזהות מקרוב, כמו הצטלבות שבילים או ערוץ, ובודקים את סדר הופעתן.',
    mapBadge: 'מפה, מצפן וסימן בשטח',
    assetAlt: 'מפה ומצפן ליד סימון מדידה בהצטלבות שבילים ביער',
  },
  {
    id: 'gnss', number: '03', headline: 'ניווט בתנאי שיבוש',
    place: 'סביבת המלחמה באוקראינה · 2022',
    teaser: 'מיקום שמוצג במכשיר דורש בדיקה מול מקורות נוספים.',
    lesson: 'במרץ 2022 הזהירה הסוכנות האירופית לבטיחות תעופה (EASA) מפני התגברות שיבוש והטעיה של ניווט לווייני סביב אזור הלחימה באוקראינה. שיבוש עלול למנוע קביעת מיקום, והטעיה עלולה להציג מיקום שגוי שנראה אמין.',
    stat: 'אין להסתמך על תצוגת המכשיר בלבד כאשר יש חשד לשיבוש.',
    why: 'מכינים מפה ומצפן, עוקבים במפה אחר ההתקדמות וזוכרים את הנקודה האחרונה שאומתה בשטח.',
    mapBadge: 'בדיקת מקורות מיקום',
    assetAlt: 'השוואה בין מקלט ניווט לווייני, מפת נייר ומצפן בשטח',
  },
  {
    id: 'junctions', number: '04', headline: 'שני צמתים דומים',
    place: 'ניווט לילה · דוגמה מומצאת',
    teaser: 'מראה דומה אינו מספיק כדי לקבוע שהגענו ליעד.',
    lesson: 'ציר לילה עובר בשני צמתים דומים, והיעד בצומת השני. מי שמזהה לפי מראה הצומת בלבד עלול לעצור מוקדם. הגשר שבדרך והגבעה ליד היעד מבדילים בין הצמתים.',
    stat: 'מאמתים את היעד באמצעות כמה סימנים שמתאימים זה לזה.',
    why: 'בודקים יחד את המרחק מנקודת המוצא, את סדר הסימנים בדרך ואת סביבת היעד.',
    mapBadge: 'אימות יעד בלילה · דוגמה מומצאת',
    assetAlt: 'דוגמה מומצאת: שני צומתי דרכי עפר, גשר וגבעה באור ירח',
  },
];

const CASES: HistoricalCase[] = examples.map((example) => ({
  ...example,
  assetId: `TOPIC06-NAV-${example.id.toUpperCase()}`,
  assetSrc: `${ASSETS}/${example.id}-main.png`,
  previewAssetId: `TOPIC06-NAV-${example.id.toUpperCase()}-PREVIEW`,
  previewSrc: `${ASSETS}/${example.id}-preview.png`,
  assetPrompt: 'Generated illustrative reconstruction; see design/docs/topic06-navigation-images-2026-10-27.md.',
}));

export function NavigationExamplesPanel() {
  return (
    <HistoricalCasesPanel
      cases={CASES}
      title="מדוע מיומנויות ניווט חשובות?"
      intro="שלוש דוגמאות מהמציאות ודוגמה מומצאת: כיוון, זיהוי מיקום ואימות היעד."
      panelId="navigation-history-detail-panel"
    />
  );
}
