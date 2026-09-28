'use client';

import { SceneHeader } from './SceneHeader';

const TERMS = [
  // תבליט ותכסית → תבניות נוף → גיאולוגיה (אוחדו משיעור 3) → מפות
  { term: 'תבליט',               def: 'מבנה פני הקרקע — הצורה של השטח: איפה הקרקע עולה ואיפה היא יורדת.' },
  { term: 'תכסית',               def: 'כל מה שנמצא על פני הקרקע: טבעית (עצים, שיחים, עשב) או מלאכותית (בתים, כבישים, שדות, גדרות).' },
  { term: 'כיפה',                def: 'התרוממות טופוגרפית בולטת של פני השטח.' },
  { term: 'שלוחה',               def: 'שטח גבוה יחסית ובעל צורה ארוכה וצרה, היורד בשיפוע הדרגתי מטה מאזור של פסגה או כיפה מרכזית.' },
  { term: 'גיא / ואדי',          def: 'שטח נמוך הכלוא בין שתי שלוחות.' },
  { term: 'אוכף',                def: 'נקודת השפל הנמוכה ביותר על גבי קו רכס ארוך, הממוקמת בין שתי כיפות טופוגרפיות סמוכות.' },
  { term: 'מכתש',                def: 'אזור טופוגרפי סגור ונמוך יותר מכל סביבתו הקרובה.' },
  { term: 'מסלע',                def: 'החומר המוצק שמרכיב את קרום כדור הארץ. סוג הסלע משפיע על אופי הנוף.' },
  { term: 'סלעי יסוד',           def: 'נוצרו ממאגמה. קשים מאוד (גרניט, בזלת). מבסיסים מבוצרים מצוינים.' },
  { term: 'סלעי משקע',           def: 'משכבות שנדחסו (גיר, אבן חול). רכים יותר. קל לחפור בהם מנהרות.' },
  { term: 'כוחות אנדוגניים',     def: 'כוחות מבפנים — טקטוניים. יוצרים הרים שלמים (מקרו-טופוגרפיה).' },
  { term: 'כוחות אקסוגניים',     def: 'כוחות מבחוץ — מים, רוח. מעצבים תוואי קטן (מיקרו-טופוגרפיה).' },
  { term: 'טופוגרפיה',         def: 'חקר צורת פני הקרקע — איפה יש הרים, גבעות, עמקים.' },
  { term: 'מפה טופוגרפית',     def: 'מפה מיוחדת שמראה את צורת השטח באמצעות קווים וסמלים.' },
  { term: 'תצ"א',              def: 'תצלום אווירי — תמונה רגילה שצולמה ממטוס. רואים את המציאות אבל לא את הגובה.' },
  { term: 'קנה מידה',          def: 'יחס בין מפה למציאות. דוגמה: 1:50,000 אומר שכל ס"מ במפה = 500 מ\' בשטח.' },
  { term: 'היטל קרטוגרפי',     def: 'שיטה לשטח את כדור הארץ על דף — תמיד דורשת פשרה (משהו יתעוות).' },
  { term: 'רשת ITM',           def: 'השפה הקואורדינטית של הצבא בישראל. מספרים קצרים במטרים.' },
  { term: 'WGS84',             def: 'השפה הקואורדינטית של GPS ושל כל העולם. מעלות עם שברים.' },
  { term: 'נ"צ (נקודת ציון)',  def: 'שני מספרים שמגדירים מיקום מדויק. כמו כתובת, רק במספרים.' },
  { term: 'Datum Shift',       def: 'בלבול בין שתי רשתות שונות — מוביל לפגיעה ב-100 מ\' מהמטרה.' },
  { term: 'דו"צ',              def: 'אסון: כוח שלנו פוגע בטעות בכוח שלנו. רוב המקרים בגלל נ"צ שגוי.' },
  { term: 'קווי גובה',         def: 'קווים על המפה שמחברים נקודות באותו גובה. "פרוסות" של ההר.' },
  { term: 'רווח אנכי',         def: 'הפרש הגובה בין שני קווים סמוכים. בדרך כלל 10 מ\' בישראל.' },
];

export function RecapScene() {
  return (
    <section id="scene-recap" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.5"
        eyebrow="סיכום"
        title={
          <>
            {TERMS.length} מושגים, דקה אחת
          </>
        }
        intro="כל המושגים שעברנו בשיעור — בהגדרה אחת קצרה לכל אחד."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t, i) => (
          <div key={t.term} className="surface p-5">
            <div className="flex items-baseline gap-3">
              <span className="shrink-0 font-display text-base font-medium text-fg-muted">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 font-display text-lg font-bold leading-snug text-fg md:text-xl">{t.term}</div>
                <div className="text-base leading-relaxed text-fg-muted text-pretty">
                  {t.def}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="text-sm font-display font-semibold text-fg-muted">מוכן להמשיך?</div>
        <div className="mt-1.5 font-display text-lg font-medium leading-snug text-fg text-pretty md:text-xl">
          עבור לטאב <strong className="font-bold">תרגול</strong> כדי לתרגל את המושגים, ואז ל
          <strong className="font-bold">בדיקת ידע</strong> כדי לוודא שהפנמת.
        </div>
      </div>
    </section>
  );
}
