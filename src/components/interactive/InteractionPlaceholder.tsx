import type { InteractionKind } from '@/lib/lessons';

const META: Record<
  InteractionKind,
  { title: string; description: string; preview: string }
> = {
  'concept-cards': {
    title: 'כרטיסי מושג מתהפכים',
    description:
      'מעבר על מושגי יסוד (דטרמיניזם, מרכז כובד, חיכוך מרחבי, MDO) באמצעות כרטיסים מתהפכים — מצד אחד מושג, בצד השני הגדרה ודוגמה.',
    preview: '🎴 כרטיסים אינטראקטיביים',
  },
  'map-explorer': {
    title: 'חוקר מפה אינטראקטיבי',
    description:
      'מפה טופוגרפית ניתנת ללחיצה: זיהוי קווי גובה, מדידת מרחקים, המרת קואורדינטות בין רשתות, וזיהוי תבליט (כיפה, אוכף, גיא).',
    preview: '🗺️ מפה אינטראקטיבית + כלי מדידה',
  },
  'navigation-sim': {
    title: 'סימולטור ניווט באזימוט',
    description:
      'תרגול חיתוך לאחור על מפה: בחירת נקודות בולטות, חישוב אזימוט חוזר, סימון קווים — ובדיקה של דיוק האיכון מול תשובה.',
    preview: '🧭 חישוב אזימוט וחיתוך לאחור',
  },
  'terrain-classifier': {
    title: 'מסווג צורות נוף',
    description:
      'הצגת מקטעי מפה ושאלה: מה זה? כיפה / אוכף / שלוחה / גיא / שקע. מקבלים פידבק על הפענוח של קווי הגובה.',
    preview: '⛰️ זיהוי תבניות נוף ממפה',
  },
  'mobility-grid': {
    title: 'גריד עבירות',
    description:
      'גריד שטח עם נתוני שיפוע, מסלע ולחות. בוחרים נתיב מ-A ל-B עבור כלי גלגלי או זחלילי, ורואים אם עבר.',
    preview: '🚜 בחירת ציר תמרון',
  },
  'los-simulator': {
    title: 'סימולטור קווי ראייה',
    description:
      'מציבים תצפיתן על מפה תלת־ממדית, רואים בזמן אמת את ה-Viewshed — אילו אזורים נצפים ואילו "שטחים מתים".',
    preview: '👁️ Viewshed דינמי',
  },
  'weather-impact': {
    title: 'השפעת מזג אוויר על מערכות',
    description:
      'בוחרים תרחיש (גשם כבד / ערפל / לילה קר). רואים איך משתנה ביצועי SAR, אופטיקה, IR וטילים מונחי לייזר.',
    preview: '🌧️ השפעת אטמוספירה על סנסורים',
  },
  'supply-chain': {
    title: 'משחק שרשרת אספקה',
    description:
      'מנהלים LOC לאוגדה. בוחרים MSR ו-ASR, מתמודדים עם אירועים (מארב, הצפה, פיצוץ גשר) — ומחלצים ניקוד עמידות.',
    preview: '🚛 ניהול MSR/ASR בזמן אמת',
  },
  'chokepoint-map': {
    title: 'מפת נקודות חנק עולמיות',
    description:
      'מפת עולם אינטראקטיבית של נקודות חנק (הורמוז, באב אל־מנדב, מלאקה...). לחיצה חושפת השפעת חסימה על שרשרת האנרגיה.',
    preview: '🌐 מיצרים אסטרטגיים',
  },
  'urban-3d': {
    title: 'ניווט תלת־ממדי בעיר',
    description:
      'מודל עירוני פשוט (גריד מול קסבה). רואים איך משתנים קווי ראייה, איומי ממד אנכי וריבוי כיוונים — ומסמנים אתרים רגישים.',
    preview: '🏙️ MOUT תלת־ממדי',
  },
  'border-strategy': {
    title: 'משחק עומק אסטרטגי',
    description:
      'בוחרים מדינה (עומק רחב / עומק צר), בוחרים אסטרטגיה — ורואים תוצאה מול תרחיש פלישה.',
    preview: '🗺️ אסטרטגיית הגנה לפי עומק',
  },
  'sensor-fusion': {
    title: 'חמ"ל מיזוג סנסורים',
    description:
      'מקבלים תמונת מטרה ממקורות שונים (אופטי, SAR, IR, OSINT). הצלבת המקורות חושפת אם זו מטרה אמיתית או הונאה.',
    preview: '🛰️ הצלבת סנסורי GEOINT',
  },
  'gis-layers': {
    title: 'משחק שכבות GIS',
    description:
      'בוחרים אילו שכבות להפעיל (תבליט, איומים, צירים, יישובים). רואים איך המידע מתחבר ובונים Cost Surface ידנית.',
    preview: '🗂️ הרכבת שכבות GIS',
  },
};

export function InteractionPlaceholder({ kind }: { kind: InteractionKind }) {
  const m = META[kind];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="text-sm font-mono text-accent">תרגול אינטראקטיבי</div>
        <h2 className="text-3xl font-bold text-balance">{m.title}</h2>
        <p className="text-fg-muted text-pretty leading-relaxed">{m.description}</p>
      </header>

      <div className="surface-elevated relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="relative aspect-[16/9] flex flex-col items-center justify-center p-10 text-center">
          <div className="text-7xl mb-4 opacity-80">{m.preview.split(' ')[0]}</div>
          <div className="text-fg-muted text-sm max-w-md">
            {m.preview.split(' ').slice(1).join(' ')}
          </div>
          <div className="mt-6 chip border-accent/40 bg-accent/10 text-accent">
            רכיב יפותח בעיון לעומק בשיעור
          </div>
        </div>
      </div>
    </div>
  );
}
