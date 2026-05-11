'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
  { id: 'wall',      label: 'קיר בטון מבוצר',        icon: 'shield',   correct: 'both',             hint: 'מסת בטון = מחסה מלא + עוצר קו ראייה.' },
  { id: 'fence',     label: 'גדר חוט',               icon: 'flag',     correct: 'neither',          hint: 'שקוף לעין ולכדור. רק סמן.' },
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
    feature: 'נקודת חנק (Chokepoint)',
    what: 'הצרה טבעית או מלאכותית של חזית התנועה — מעבר צר בין הרים, צומת יחיד, ערוץ נחל סגור.',
    defender: 'יכולת השמדת כוח גדול באמצעות כוח קטן וחוסם. שילוב מיקוש ואש.',
    attacker: 'חיסרון מוחלט: כפייה של תנועה בטור, עיכוב לוגיסטי וחשיפה ארטילרית.',
  },
  {
    feature: 'קו רכס / שטח שולט',
    what: 'השטח המוגבה והמרכזי, שולט בתצפית ובאש על סביבתו הקרובה.',
    defender: 'תצפית מעולה, ניהול אש לטווח ארוך, תנאי הגנה טבעיים.',
    attacker: 'יתרון אם נכבש — אבל שחיקת כוח כבדה בטיפוס מול אש יורדת.',
  },
  {
    feature: 'עמק מוקף / גיא',
    what: 'שטח נמוך הכלוא בין שלוחות שולטות.',
    defender: 'קופסת הריגה אידיאלית. תצפית שולטת מהשלוחות לעבר מרכז הגיא.',
    attacker: 'יתרון: התגנבות והסתרה מהשמיים. חיסרון: מלכודת אש מאגפת.',
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
        eyebrow="כיסוי והסתרה"
        title={
          <>
            <span className="gradient-text">Cover ≠ Concealment</span>. ההבדל הוא חיים.
          </>
        }
        intro="זה ההבדל שמשנה הכל: הסתרה מונעת *גילוי*. מחסה עוצר *פגיעה*. כשמערבבים בין השניים — חוזרים בארון אלומיניום."
      />

      {/* Comparison cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="surface-elevated p-5 sm:p-6 border-r-4 border-r-status-warn rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-xl bg-status-warn/15 border border-status-warn/40 flex items-center justify-center shrink-0">
              <Icon name="shield" size={22} className="text-status-warn" />
            </div>
            <div>
              <div className="font-display font-bold text-xl text-status-warn">מחסה (Cover)</div>
              <div className="text-[10px] font-mono text-fg-dim">הגנה פיזית מאש</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            הגנה פיזית ממשית וקשיחה: תבליט הררי עבה, סלעי בולדרים, קירות מבוצרים, קפלי קרקע קשיחים.
            <strong className="block mt-2 text-status-warn">בולם בפועל אש נשק קל, רסיסי ארטילריה, הדף קינטי.</strong>
          </p>
          <div className="text-[11px] text-fg-muted bg-bg-accent/40 border border-border rounded-lg p-2.5">
            <strong className="text-fg">כלל אצבע:</strong> אם זה לא יעצור כדור — זה לא מחסה. נקודה.
          </div>
        </div>

        <div className="surface-elevated p-5 sm:p-6 border-r-4 border-r-terrain-sky rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-xl bg-terrain-sky/15 border border-terrain-sky/40 flex items-center justify-center shrink-0">
              <Icon name="eye" size={22} className="text-terrain-sky" />
            </div>
            <div>
              <div className="font-display font-bold text-xl text-terrain-sky">הסתרה (Concealment)</div>
              <div className="text-[10px] font-mono text-fg-dim">מניעת גילוי חזותי/תרמי</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            שימוש בתכסית טבעית או סביבה אזרחית — יערות מחט, מבנים נטושים, עשב גבוה, צללי עננים — למניעת חשיפה לעין, לתרמית או לרדאר.
            <strong className="block mt-2 text-terrain-sky">לא מספקת הגנה בליסטית. כדור חודר שיח בקלות.</strong>
          </p>
          <div className="text-[11px] text-fg-muted bg-bg-accent/40 border border-border rounded-lg p-2.5">
            <strong className="text-fg">כלל אצבע:</strong> מה שמסתיר אותך לא בהכרח יציל אותך. תכננו על שניהם.
          </div>
        </div>
      </div>

      {/* Drag-and-drop classification exercise */}
      <SoftDivider text="תרגול · סווגו את החפצים לקטגוריה הנכונה" />

      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-bold mb-1">תרגול גרירה</h3>
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
            <span className="font-mono">{correctCount}/{ITEMS.length} נכון</span>
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
              ? 'bg-accent text-bg shadow-glow hover:scale-105 active:scale-95'
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
      <SoftDivider text="3 תצורות שטח שמשפיעות על מחסה והסתרה" />

      <div className="space-y-3">
        {TERRAIN_FEATURES.map((tf, i) => (
          <motion.div
            key={tf.feature}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 rounded-xl"
          >
            <div className="grid md:grid-cols-[1fr_1fr_1fr] gap-4">
              <div>
                <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">תצורה</div>
                <h4 className="font-display font-bold mb-2 leading-tight">{tf.feature}</h4>
                <p className="text-xs text-fg-muted leading-relaxed">{tf.what}</p>
              </div>
              <div>
                <div className="text-[10px] font-mono text-status-ok mb-1 tracking-widest uppercase">יתרון למגן</div>
                <p className="text-sm text-fg leading-relaxed">{tf.defender}</p>
              </div>
              <div>
                <div className="text-[10px] font-mono text-status-warn mb-1 tracking-widest uppercase">יתרון/חיסרון לתוקף</div>
                <p className="text-sm text-fg-muted leading-relaxed">{tf.attacker}</p>
              </div>
            </div>
          </motion.div>
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
        'surface-elevated p-4 mb-6 rounded-2xl border-2 border-dashed transition-all',
        isOver ? 'border-accent shadow-glow bg-accent/5' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs font-mono text-fg-dim tracking-widest uppercase">
          {pool.length > 0 ? `חפצים למיון (${pool.length})` : '✓ כל החפצים מוינו'}
        </div>
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
        if (id) onAssign(id);
        setIsOver(false);
      }}
      onClick={() => {
        if (selected) onAssign(selected);
      }}
      className={cn(
        'surface-elevated rounded-2xl border-2 transition-all flex flex-col',
        category.border,
        isOver && 'shadow-glow scale-[1.01]',
        selected != null && 'cursor-pointer hover:shadow-glow'
      )}
    >
      <div className={cn('p-3 border-b-2', category.border, category.bg)}>
        <div className={cn('font-display font-bold leading-tight', category.color)}>
          {category.label}
        </div>
        <div className="text-[10px] font-mono text-fg-dim mt-0.5 flex items-center justify-between">
          <span>{category.english}</span>
          <span>{items.length}</span>
        </div>
      </div>
      <div className="p-3 min-h-[120px]">
        {items.length === 0 ? (
          <div className={cn(
            'h-full min-h-[100px] rounded-lg border-2 border-dashed flex items-center justify-center text-center px-3 transition-colors',
            isOver
              ? 'border-accent bg-accent/10'
              : selected != null
              ? 'border-accent/40 text-accent'
              : 'border-border text-fg-dim'
          )}>
            <span className="text-xs font-mono tracking-widest uppercase">
              {isOver ? 'שחרר כאן' : selected ? 'הקש כדי לשבץ' : 'גרור חפץ לכאן'}
            </span>
          </div>
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
    </div>
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
        isSelected && 'border-accent shadow-glow ring-2 ring-accent/40',
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
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
