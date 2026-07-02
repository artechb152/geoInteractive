'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Category = 'cover-only' | 'concealment-only' | 'both' | 'neither';

type Item = {
  id: string;
  label: string;
  icon: IconName;
  correct: Category;
  hint: string;
};

const ITEMS: Item[] = [
  { id: 'boulder',   label: 'סלע בולדר ענק',         icon: 'mountain', correct: 'both',             hint: 'מסת אבן גדולה ועבה — עוצרת אש וגם מסתירה.' },
  { id: 'bush',      label: 'שיח עבות',              icon: 'wave',     correct: 'concealment-only', hint: 'מסתיר היטב מהעין — אבל ענפים לא עוצרים כדור.' },
  { id: 'wall',      label: 'קיר בטון מבוצר',        icon: 'shield',   correct: 'both',             hint: 'הבטון מספק הגנה מלאה שעוצרת קליעים וגם חוסם לחלוטין את הראייה של האויב.' },
  { id: 'fence',     label: 'גדר תיל רגילה',               icon: 'flag',     correct: 'neither',          hint: 'היא שקופה – גם רואים דרכה וגם קליעים עוברים דרכה חלק. היא נועדה רק לסמן גבול, ולא מגינה או מסתירה.' },
  { id: 'log',       label: 'גזע עץ עבה',            icon: 'mountain', correct: 'cover-only',       hint: 'מסת עץ עוצרת כדורים, אבל קל לראות את החייל מסביב.' },
  { id: 'smoke',     label: 'מסך עשן',              icon: 'wave',     correct: 'concealment-only', hint: 'עיוורון לסנסור האופטי — אבל עשן לא בולם רסיס.' },
  { id: 'grass',     label: 'עשב גבוה / חורש סבוך', icon: 'layers',   correct: 'concealment-only', hint: 'מסתיר חזותית ותרמית — אש לא נעצרת.' },
  { id: 'car',       label: 'רכב אזרחי רגיל',        icon: 'truck',    correct: 'concealment-only', hint: 'פח דק — מסתיר חזותית, כדורים חודרים בקלות.' },
  { id: 'fold',      label: 'קפל קרקע עמוק',         icon: 'mountain', correct: 'both',             hint: 'אדמה דחוסה = מחסה. נמוך מקו הראייה = הסתרה.' },
];

const CATEGORIES: { id: Category; label: string; english: string; color: string; bg: string; border: string }[] = [
  { id: 'cover-only',       label: 'רק מחסה',       english: 'Cover only',       color: 'text-status-warn', bg: 'bg-status-warn/10', border: 'border-status-warn/40' },
  { id: 'concealment-only', label: 'רק הסתרה',      english: 'Concealment only', color: 'text-terrain-sky', bg: 'bg-terrain-sky/10', border: 'border-terrain-sky/40' },
  { id: 'both',             label: 'שניהם',         english: 'Both',             color: 'text-status-ok',   bg: 'bg-status-ok/10',   border: 'border-status-ok/40' },
  { id: 'neither',          label: 'אף אחד',        english: 'Neither',          color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/40' },
];

const TERRAIN_FEATURES: { feature: string; what: string; defender: string; attacker: string }[] = [
  {
    feature: 'נקודת חנק (צוואר בקבוק)',
    what: 'מקום שבו הדרך הופכת לפתע לצרה מאוד וכולם חייבים לעבור דרכו – כמו ואדי צר בין הרים, צומת יחיד, או גשר.',
    defender: 'חלום למגן (מי שמחכה): בגלל שהמקום צר, מספיק כוח קטן עם מוקשים וירי ממוקד כדי לעצור ולהשמיד צבא שלם שנתקע שם בפקק.',
    attacker: 'סיוט לתוקף (הצד שמנסה לעבור): הרכבים נדחפים לטור ארוך אחד אחרי השני, נוצר פקק שמעכב הכל, וכולם הופכים למטרה קלה להפצצות מבלי שיוכלו לברוח הצידה.',
  },
  {
    feature: 'פסגת הר (שטח שולט)',
    what: 'הנקודה הגבוהה ביותר באזור. מי שנמצא למעלה רואה הכל ויכול לירות על כולם למטה.',
    defender: 'שליטה מוחלטת: אפשר לראות רחוק, לירות למרחקים בבטחה, ומאוד קשה לאויב לטפס אליכם ולהחזיר אש.',
    attacker: 'לכבוש את הפסגה זה כמובן פרס עצום, אבל לטפס למעלה בעלייה תלולה כשמישהו יורֶה עליכם מלמעלה – יעלה בהמון נפגעים.',
  },
  {
    feature: 'עמק סגור שמוקף בהרים',
    what: 'אזור נמוך שמוקף מכל עבר בהרים או גבעות גבוהות שצופים עליו.',
    defender: 'המלכודת המושלמת (נקראת בצבא "קופסת הריגה"). מי שיושב בטוח למעלה על ההרים פשוט צופה על כל מרכז העמק ויכול לירות מכל כיוון על מי שלמטה.',
    attacker: 'היתרון היחיד: קשה יותר לראות אתכם ממטוסים ורחפנים. החיסרון: אם האויב מחכה לכם למעלה – אתם לכודים באש מכל הכיוונים ואין לאן לברוח.',
  },
];

export function CoverScene() {
  const [selected, setSelected] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Category>>({});
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === ITEMS.length;
  const correctCount = ITEMS.filter((it) => assignments[it.id] === it.correct).length;

  const moveItem = (itemId: string, cat: Category | null) => {
    setAssignments((prev) => {
      if (cat) return { ...prev, [itemId]: cat };
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelected(null);
  };

  const reset = () => {
    setAssignments({});
    setSubmitted(false);
    setSelected(null);
  };

  const pool = ITEMS.filter((it) => !assignments[it.id]);
  const inCategory = (cat: Category) => ITEMS.filter((it) => assignments[it.id] === cat);

  return (
    <section id="scene-cover" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.3"
        eyebrow="מחסה והסתרה"
 title = {
  <>
    <span className="gradient-text">להסתתר זה לא מספיק</span>: מה באמת מגן עליכם בשטח?
  </>
}
        intro='זה ההבדל הכי חשוב שתלמדו: הסתרה רק מונעת מהאויב לראות אתכם. מחסה עוצר את הפגיעה. מי שמתבלבל בין השניים בשטח ומתחבא מאחורי שיח בזמן ירי — מסכן את החיים שלו.'
      />

      {/* Comparison cards */}
      <div className="grid md:grid-cols-2 gap-3 mb-10">
        <InsightCard tone="warn" icon="shield" label="הגנה פיזית מפגיעה" title="מחסה (Cover)">
          עצם קשיח וחזק שאתם מתמגנים מאחוריו: צלע של הר, סלעי ענק, קירות בטון עבים או שקעים עמוקים באדמה.
          <strong className="block mt-2 text-status-warn">זה מה שבאמת מסוגל לעצור בגופו כדורי רובה, רסיסים של פצצות ואפילו להגן עליכם מהדף של פיצוץ קרוב.</strong>
          <span className="block mt-3 text-[12px] text-fg-muted">
            <strong className="text-fg">כלל ברזל:</strong> אם זה לא קשיח ועבה מספיק כדי לעצור כדור — זה לא מחסה. אל תסמכו על זה.
          </span>
        </InsightCard>

        <InsightCard tone="sky" icon="eye" label="להיעלם מעיני האויב והמצלמות" title="הסתרה (Concealment)">
          שימוש חכם במה שהסביבה מציעה — יערות, מבנים נטושים, עשב גבוה או אפילו אזורים מוצלים — כדי שמצלמות החום, הרחפנים והעיניים של האויב לא יוכלו לגלות אתכם.
          <strong className="block mt-2 text-terrain-sky">חשוב מאוד: הסתרה לא מגינה עליכם מנשק! אם יירו עליכם, הכדור יעבור דרך השיח בקלות ויפגע בכם.</strong>
          <span className="block mt-3 text-[12px] text-fg-muted">
            <strong className="text-fg">כלל ברזל:</strong> מה שמסתיר אתכם לא יציל אתכם אם מתחילים לירות. המטרה בשטח היא תמיד לחפש מקום שמספק גם וגם.
          </span>
        </InsightCard>
      </div>

      {/* Drag-and-drop classification exercise */}
      <SoftDivider text="תרגול: מה נותן מחסה ומה רק הסתרה?" />

      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-xl leading-tight mb-1">תרגול גרירה</h3>
          <p className="text-fg-muted text-sm">
            גרור (או הקש בנייד) כל חפץ לקטגוריה הנכונה. אחרי שכל ה־{ITEMS.length} ימוינו — לחץ "בדוק תשובות".
          </p>
        </div>
        {submitted && (
          <div className={cn(
            'chip',
            correctCount === ITEMS.length
              ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
              : 'border-status-warn/40 bg-status-warn/10 text-status-warn'
          )}>
            <Icon name={correctCount === ITEMS.length ? 'check' : 'spark'} size={14} strokeWidth={2.5} />
            <span className="font-display font-medium tracking-wide">{correctCount}/{ITEMS.length} נכון</span>
          </div>
        )}
      </div>

      {/* Pool */}
      <ItemPool
        pool={pool}
        selected={selected}
        submitted={submitted}
        onSelect={(id) => setSelected(selected === id ? null : id)}
        onDropToPool={(id) => moveItem(id, null)}
        dragging={dragging}
        onDragStart={setDragging}
        onDragEnd={() => setDragging(null)}
      />

      {/* 4 Category bins */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <CategoryBin
            key={cat.id}
            category={cat}
            items={inCategory(cat.id)}
            selected={selected}
            submitted={submitted}
            onSelect={(id) => setSelected(selected === id ? null : id)}
            onAssign={(id) => moveItem(id, cat.id)}
            dragging={dragging}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center items-center mb-12">
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAssigned}
          className={cn(
            'px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2',
            allAssigned
              ? 'bg-accent text-bg-elevated hover:scale-105 active:scale-95'
              : 'bg-bg-accent text-fg-dim border border-border cursor-not-allowed'
          )}
        >
          <Icon name="check" size={16} strokeWidth={2.5} />
          {allAssigned ? 'בדוק תשובות' : `נותרו ${ITEMS.length - assignedCount} למיון`}
        </button>
        {(assignedCount > 0 || submitted) && (
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl border border-border hover:border-border-strong font-medium text-sm flex items-center gap-2"
          >
            <Icon name="spark" size={14} />
            אפס הכל
          </button>
        )}
      </div>

      {/* Terrain features that affect cover/concealment */}
      <SoftDivider text="3 צורות שטח שמשנות את חוקי המשחק" />

      <div className="space-y-3">
        {TERRAIN_FEATURES.map((tf) => (
          <div key={tf.feature} className="grid md:grid-cols-[1fr_1fr_1fr] gap-3">
            <InsightCard tone="accent" label="איך השטח נראה?" title={tf.feature}>
              {tf.what}
            </InsightCard>
            <InsightCard tone="ok" label="למה זה מעולה למי שמתגונן?">
              {tf.defender}
            </InsightCard>
            <InsightCard tone="warn" label="הסיוט (או היתרון) של התוקף">
              {tf.attacker}
            </InsightCard>
          </div>
        ))}
      </div>
    </section>
  );
}

function ItemPool({
  pool,
  selected,
  submitted,
  onSelect,
  onDropToPool,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  pool: Item[];
  selected: string | null;
  submitted: boolean;
  onSelect: (id: string) => void;
  onDropToPool: (id: string) => void;
  dragging: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/item');
        if (id) onDropToPool(id);
        setIsOver(false);
        onDragEnd();
      }}
      className={cn(
        'bg-bg-elevated p-4 mb-6 rounded-xl border transition-colors duration-200',
        isOver ? 'border-brand' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-display font-semibold text-fg tracking-wider">
          {pool.length > 0 ? `חפצים למיון · ${pool.length}` : '✓ כל החפצים מוינו'}
        </div>
        {pool.length > 0 && (
          <div className="text-xs text-fg-muted">גרור חפץ לאחת מהקטגוריות למטה</div>
        )}
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-2 text-sm text-fg-muted">
          לחץ "בדוק תשובות", או גרור חזרה לכאן כדי לסווג מחדש.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {pool.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              isSelected={selected === it.id}
              isDragging={dragging === it.id}
              submitted={submitted}
              onSelect={() => onSelect(it.id)}
              onDragStart={() => onDragStart(it.id)}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBin({
  category,
  items,
  selected,
  submitted,
  onSelect,
  onAssign,
  dragging,
}: {
  category: typeof CATEGORIES[number];
  items: Item[];
  selected: string | null;
  submitted: boolean;
  onSelect: (id: string) => void;
  onAssign: (id: string) => void;
  dragging: string | null;
}) {
  const [isOver, setIsOver] = useState(false);

  const isWaitingForTap = selected != null && items.length === 0;

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/item');
        if (id) onAssign(id);
        setIsOver(false);
      }}
      onClick={() => {
        if (selected) onAssign(selected);
      }}
      animate={{ scale: isOver ? 1.015 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'relative bg-bg-elevated rounded-xl overflow-hidden flex flex-col transition-colors duration-200',
        'border',
        isOver
          ? category.border
          : isWaitingForTap
            ? cn(category.border, 'cursor-pointer')
            : 'border-border',
      )}
    >
      <div className="flex items-center gap-3 p-3 pr-4">
        <Icon
          name={
            category.id === 'cover-only'
              ? 'shield'
              : category.id === 'concealment-only'
                ? 'eye'
                : category.id === 'both'
                  ? 'check'
                  : 'flag'
          }
          size={28}
          className={cn('shrink-0', category.color)}
        />
        <div className="flex-1 min-w-0">
          <div className={cn('font-display font-bold leading-tight', category.color)}>
            {category.label}
          </div>
          <div className="text-[11px] text-fg-muted mt-0.5">
            {items.length === 0
              ? 'ריק · מחכה למיון'
              : `${items.length} ${items.length === 1 ? 'חפץ' : 'חפצים'}`}
          </div>
        </div>
      </div>
      <div className="p-3 pt-0 min-h-[120px]">
        {items.length === 0 ? (
          <motion.div
            animate={{
              backgroundColor: isOver
                ? 'rgba(116, 156, 117, 0.10)'
                : isWaitingForTap
                  ? 'rgba(235, 158, 72, 0.06)'
                  : 'rgba(0, 0, 0, 0.015)',
            }}
            className="h-full min-h-[100px] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
          >
            {isOver && (
              <motion.span
                animate={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={cn('inline-flex', category.color)}
              >
                <Icon name="check" size={18} strokeWidth={2.5} />
              </motion.span>
            )}
            <span
              className={cn(
                'text-sm font-display font-semibold tracking-wider',
                isOver ? category.color : isWaitingForTap ? 'text-accent' : 'text-fg-muted',
              )}
            >
              {isOver ? 'שחרר כאן' : isWaitingForTap ? 'הקש לשבץ כאן' : 'גרור לכאן'}
            </span>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const isCorrect = submitted && it.correct === category.id;
              const isWrong = submitted && it.correct !== category.id;
              return (
                <ItemChip
                  key={it.id}
                  item={it}
                  isSelected={selected === it.id}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                  submitted={submitted}
                  onSelect={() => onSelect(it.id)}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  compact
                  isDragging={dragging === it.id}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ItemChip({
  item,
  isSelected,
  isCorrect = false,
  isWrong = false,
  submitted,
  onSelect,
  onDragStart,
  onDragEnd,
  compact = false,
  isDragging,
}: {
  item: Item;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  submitted: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  compact?: boolean;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/item', item.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'surface cursor-grab active:cursor-grabbing transition-all',
        compact ? 'p-2' : 'p-3',
        isDragging && 'opacity-50',
        isSelected && 'border-accent ring-2 ring-accent/40',
        isCorrect && !isSelected && 'border-status-ok/50 bg-status-ok/5',
        isWrong && !isSelected && 'border-status-danger/50 bg-status-danger/5',
        !isSelected && !isCorrect && !isWrong && 'hover:border-border-strong'
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          'rounded-md flex items-center justify-center shrink-0',
          compact ? 'size-6' : 'size-7',
          isCorrect ? 'bg-status-ok/15 text-status-ok' :
          isWrong ? 'bg-status-danger/15 text-status-danger' :
          'bg-bg-accent text-fg-muted'
        )}>
          <Icon name={item.icon} size={compact ? 12 : 14} />
        </div>
        <span className={cn('flex-1 leading-snug', compact ? 'text-xs' : 'text-sm')}>
          {item.label}
        </span>
      </div>
      {submitted && isWrong && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-1.5 text-[11px] text-status-danger leading-snug"
          >
            <strong>{CATEGORIES.find((c) => c.id === item.correct)?.label}:</strong> {item.hint}
          </motion.div>
        </AnimatePresence>
      )}
      {submitted && isCorrect && !compact && (
        <div className="mt-1.5 text-[11px] text-status-ok leading-snug">
          {item.hint}
        </div>
      )}
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
