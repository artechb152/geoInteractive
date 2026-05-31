'use client';

import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';

const TERMS = [
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
            12 מושגים, <span className="gradient-text">דקה אחת</span>
          </>
        }
        intro="כל המושגים שעברנו בשיעור — בהגדרה אחת קצרה לכל אחד."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {TERMS.map((t, i) => (
          <motion.div
            key={t.term}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="surface p-5"
          >
            <div className="flex items-start gap-3">
              <span className="font-display font-medium tracking-wide text-xs text-accent mt-1">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <div className="font-display font-bold mb-1">{t.term}</div>
                <div className="text-sm text-fg-muted">
                  {t.def}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-10 surface-elevated p-6 text-center"
      >
        <div className="text-sm text-fg-muted mb-2">מוכן להמשיך?</div>
        <div className="text-lg font-medium">
          עבור לטאב <strong className="text-accent">תרגול</strong> כדי לתרגל את המושגים, ואז ל
          <strong className="text-accent">בדיקת ידע</strong> כדי לוודא שהפנמת.
        </div>
      </motion.div>
    </section>
  );
}
